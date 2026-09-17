import "@/lib/buffer-polyfill";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, LogOut, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useWalletBalances } from "./useWalletBalances";
import { formatNumber, shortAddress } from "@/lib/gcoin";
import { cn } from "@/lib/utils";

export function WalletButton({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const { wallets, select, connect, connected, connecting, publicKey, disconnect } = useWallet();
  const { data: balances } = useWalletBalances();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (connected) onOpenChange(false);
  }, [connected, onOpenChange]);

  async function handleSelect(name: string) {
    setError(null);
    setPending(name);
    try {
      select(name as never);
      // El adaptador necesita un tick para quedar seleccionado antes de conectar.
      await new Promise((resolve) => setTimeout(resolve, 80));
      await connect();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo conectar con la billetera Solana.",
      );
    } finally {
      setPending(null);
    }
  }

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden rounded-md border border-border bg-panel px-3 py-1.5 text-right sm:block">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo</p>
          <p className="text-xs font-semibold text-foreground">
            {formatNumber(balances?.sol ?? 0, 3)} SOL
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(publicKey.toBase58())}
          className="flex items-center gap-2 rounded-md border border-bull/40 bg-bull/10 px-3 py-2 text-xs font-semibold text-bull transition-colors hover:bg-bull/20"
        >
          <span className="size-1.5 rounded-full bg-bull" />
          {shortAddress(publicKey.toBase58(), 4)}
          <Copy className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => void disconnect()}
          aria-label="Desconectar billetera"
          className="rounded-md border border-border bg-panel p-2 text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.02]"
      >
        <Wallet className="size-4" />
        {connecting ? "Conectando…" : "Conectar billetera"}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Seleccionar billetera Solana"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="panel-surface w-full max-w-sm p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
                  Billeteras Solana
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Red Solana mainnet. No se usan billeteras EVM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Cerrar"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="mt-4 space-y-2">
              {wallets.map((item) => (
                <li key={item.adapter.name}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(item.adapter.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 py-3 text-left transition-colors hover:border-primary hover:bg-secondary",
                      pending === item.adapter.name && "border-primary",
                    )}
                  >
                    <img
                      src={item.adapter.icon}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 rounded"
                    />
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {item.adapter.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {pending === item.adapter.name
                        ? "conectando…"
                        : item.readyState === "Installed"
                          ? "detectada"
                          : "instalar"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {wallets.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                No se detectaron billeteras Solana en este navegador. Instalá Phantom para operar.
              </p>
            ) : null}
            {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
