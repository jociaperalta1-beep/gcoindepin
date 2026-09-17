import { ExternalLink } from "lucide-react";

import { formatNumber, formatTime, formatUsd, shortAddress, type TradeRow } from "@/lib/gcoin";
import { cn } from "@/lib/utils";

export function TradesTable({ trades, isLoading }: { trades: TradeRow[]; isLoading: boolean }) {
  return (
    <section className="panel-surface overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Historial de transacciones
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          últimas {trades.length}
        </span>
      </header>

      <div className="max-h-[340px] overflow-y-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-panel text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Hora</th>
              <th className="px-2 py-2 font-medium">Tipo</th>
              <th className="px-2 py-2 text-right font-medium">GCOIN</th>
              <th className="px-2 py-2 text-right font-medium">USD</th>
              <th className="px-2 py-2 font-medium">Billetera</th>
              <th className="px-4 py-2 text-right font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {isLoading ? "Cargando movimientos…" : "Sin movimientos recientes"}
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className="border-t border-border/60 hover:bg-secondary/30">
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">
                    {formatTime(trade.timestamp)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2 font-bold uppercase",
                      trade.kind === "buy" ? "text-bull" : "text-bear",
                    )}
                  >
                    {trade.kind === "buy" ? "compra" : "venta"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-foreground">
                    {formatNumber(trade.amountToken, 2)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-foreground">
                    {formatUsd(trade.amountUsd, 2)}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {trade.wallet ? shortAddress(trade.wallet) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {trade.txHash ? (
                      <a
                        href={`https://solscan.io/tx/${trade.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        ver <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
