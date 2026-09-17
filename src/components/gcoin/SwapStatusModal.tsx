import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, PenLine, Send, X } from "lucide-react";

import { shortAddress } from "@/lib/gcoin";

export type SwapStatus =
  | "idle"
  | "quoting"
  | "signing"
  | "sent"
  | "confirming"
  | "success"
  | "error";

export type SwapDetails = {
  inputLabel: string;
  outputLabel: string;
  route: string;
  slippage: number;
  networkFeeSol: number | null;
  priceImpact: number;
  signature: string | null;
  error: string | null;
};

const STEPS: Array<{ key: SwapStatus; label: string }> = [
  { key: "signing", label: "Esperando firma en la billetera" },
  { key: "sent", label: "Transacción enviada" },
  { key: "confirming", label: "Confirmando en Solana…" },
  { key: "success", label: "Completada con éxito" },
];

const ORDER: SwapStatus[] = ["quoting", "signing", "sent", "confirming", "success"];

export function SwapStatusModal({
  status,
  details,
  onClose,
  onRetry,
  retryDisabled = false,
}: {
  status: SwapStatus;
  details: SwapDetails;
  onClose: () => void;
  onRetry?: () => void;
  retryDisabled?: boolean;
}) {
  if (status === "idle") return null;
  const currentIndex = ORDER.indexOf(status);
  const failed = status === "error";
  const closable = failed || status === "success";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Estado del swap"
    >
      <div className="panel-surface w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {failed ? (
              <AlertTriangle className="size-6 text-destructive" />
            ) : status === "success" ? (
              <CheckCircle2 className="size-6 text-bull" />
            ) : status === "signing" ? (
              <PenLine className="size-6 text-primary" />
            ) : status === "sent" ? (
              <Send className="size-6 text-primary" />
            ) : (
              <Loader2 className="size-6 animate-spin text-primary" />
            )}
            <h3 className="font-display text-base font-bold text-foreground">
              {failed
                ? "Error / Cancelada"
                : status === "success"
                  ? "Completada con éxito"
                  : status === "quoting"
                    ? "Preparando transacción…"
                    : (STEPS.find((step) => step.key === status)?.label ?? "Procesando…")}
            </h3>
          </div>
          {closable ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <ol className="mt-4 space-y-2">
          {STEPS.map((step) => {
            const index = ORDER.indexOf(step.key);
            const done = !failed && currentIndex > index;
            const active = !failed && currentIndex === index;
            return (
              <li
                key={step.key}
                className={
                  "flex items-center gap-2 text-[11px] " +
                  (done
                    ? "text-bull"
                    : active
                      ? "text-foreground"
                      : "text-muted-foreground opacity-60")
                }
              >
                {done ? (
                  <CheckCircle2 className="size-3.5" />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span className="size-3.5 rounded-full border border-border" />
                )}
                {step.label}
              </li>
            );
          })}
        </ol>

        <dl className="mt-4 space-y-1.5 rounded-md border border-border bg-background/40 p-3 text-[11px]">
          <Row label="Enviás" value={details.inputLabel} />
          <Row label="Recibís aprox." value={details.outputLabel} />
          <Row label="Ruta" value={details.route} />
          <Row label="Slippage" value={`${details.slippage}%`} />
          <Row label="Impacto de precio" value={`${details.priceImpact.toFixed(3)}%`} />
          <Row
            label="Costo de red"
            value={
              details.networkFeeSol !== null ? `≈ ◎${details.networkFeeSol.toFixed(6)}` : "≈ ◎0.00001"
            }
          />
          {details.signature ? (
            <Row label="Firma" value={shortAddress(details.signature, 6)} />
          ) : null}
        </dl>

        {failed && details.error ? (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[11px] leading-5 text-destructive">
            {details.error}
          </p>
        ) : null}

        {status === "success" && details.signature ? (
          <a
            href={`https://solscan.io/tx/${details.signature}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-bull py-3 text-xs font-bold uppercase tracking-widest text-background"
          >
            Ver en Solscan <ExternalLink className="size-3.5" />
          </a>
        ) : null}

        {failed && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="mt-4 w-full rounded-md bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {retryDisabled ? "Operación en curso…" : "Reintentar con la misma configuración"}
          </button>
        ) : null}

        {closable ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-md border border-border py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </button>
        ) : (
          <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
            No cierres esta ventana hasta que la red confirme la operación.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
