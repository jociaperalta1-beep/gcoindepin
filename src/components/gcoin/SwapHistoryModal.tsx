import { CheckCircle2, ExternalLink, Trash2, X, XCircle } from "lucide-react";

import { clearSwapHistory, useSwapHistory } from "@/lib/swapHistory";
import { formatNumber, formatTime } from "@/lib/gcoin";

export function SwapHistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const records = useSwapHistory();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Historial de swaps"
    >
      <div className="panel-surface flex max-h-[80vh] w-full max-w-2xl flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-base font-bold text-foreground">Mi historial de swaps</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSwapHistory}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" /> Vaciar
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar historial"
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {records.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">
              Todavía no hay operaciones registradas en este navegador.
            </p>
          ) : (
            <ul className="space-y-2">
              {records.map((record) => (
                <li
                  key={record.id}
                  className="rounded-md border border-border bg-background/40 p-3 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      {record.status === "success" ? (
                        <CheckCircle2 className="size-3.5 text-bull" />
                      ) : (
                        <XCircle className="size-3.5 text-bear" />
                      )}
                      {record.pair}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(record.timestamp).toLocaleDateString("es-PY")}{" "}
                      {formatTime(record.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 tabular-nums text-foreground">
                    {formatNumber(record.amountIn, 4)} {record.symbolIn} →{" "}
                    {formatNumber(record.amountOut, 4)} {record.symbolOut}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Ruta: {record.route} · Slippage {record.slippage}%
                  </p>
                  {record.error ? <p className="mt-1 text-bear">{record.error}</p> : null}
                  {record.signature ? (
                    <a
                      href={`https://solscan.io/tx/${record.signature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Ver en Solscan <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
