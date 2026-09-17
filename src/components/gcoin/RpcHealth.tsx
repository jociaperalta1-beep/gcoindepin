import "@/lib/buffer-polyfill";
import { useConnection } from "@solana/wallet-adapter-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type RpcState = {
  endpoint: string;
  status: "connecting" | "connected" | "retrying" | "down";
  latency: number | null;
  attempts: number;
};

const RpcHealthContext = createContext<RpcState>({
  endpoint: "",
  status: "connecting",
  latency: null,
  attempts: 0,
});

export function useRpcHealth() {
  return useContext(RpcHealthContext);
}

const PING_INTERVAL = 15_000;
const MAX_ATTEMPTS_BEFORE_FAILOVER = 3;

/**
 * Monitorea el RPC activo: mide latencia, reintenta con backoff exponencial
 * y pide un cambio de endpoint cuando el nodo deja de responder.
 */
export function RpcHealthProvider({
  endpoint,
  onFailover,
  children,
}: {
  endpoint: string;
  onFailover: () => void;
  children: ReactNode;
}) {
  const { connection } = useConnection();
  const [state, setState] = useState<RpcState>({
    endpoint,
    status: "connecting",
    latency: null,
    attempts: 0,
  });
  const failoverRef = useRef(onFailover);
  failoverRef.current = onFailover;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function ping() {
      const started = performance.now();
      try {
        await connection.getLatestBlockhash("processed");
        if (cancelled) return;
        attempts = 0;
        setState({
          endpoint,
          status: "connected",
          latency: Math.round(performance.now() - started),
          attempts: 0,
        });
        timer = setTimeout(() => void ping(), PING_INTERVAL);
      } catch {
        if (cancelled) return;
        attempts += 1;
        setState((prev) => ({
          ...prev,
          endpoint,
          status: attempts >= MAX_ATTEMPTS_BEFORE_FAILOVER ? "down" : "retrying",
          latency: null,
          attempts,
        }));
        if (attempts >= MAX_ATTEMPTS_BEFORE_FAILOVER) {
          failoverRef.current();
          return;
        }
        // Backoff exponencial: 1s, 2s, 4s… hasta 30s
        timer = setTimeout(() => void ping(), Math.min(30_000, 1000 * 2 ** attempts));
      }
    }

    void ping();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [connection, endpoint]);

  return <RpcHealthContext.Provider value={state}>{children}</RpcHealthContext.Provider>;
}

export function RpcStatusBadge() {
  const { status, latency, endpoint, attempts } = useRpcHealth();
  const host = (() => {
    try {
      return new URL(endpoint).host;
    } catch {
      return endpoint;
    }
  })();

  const color =
    status === "connected"
      ? latency !== null && latency > 900
        ? "text-accent"
        : "text-bull"
      : status === "retrying"
        ? "text-accent"
        : status === "down"
          ? "text-bear"
          : "text-muted-foreground";

  return (
    <div
      title={`Nodo RPC: ${host}`}
      className="flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-2 text-[10px] uppercase tracking-widest"
      aria-live="polite"
    >
      <span className={`size-2 rounded-full bg-current ${color} ${status === "connected" ? "animate-pulse" : ""}`} />
      <span className={color}>
        {status === "connected"
          ? `RPC ${latency ?? "—"} ms`
          : status === "retrying"
            ? `Reintentando (${attempts})`
            : status === "down"
              ? "Cambiando de nodo"
              : "Conectando…"}
      </span>
    </div>
  );
}
