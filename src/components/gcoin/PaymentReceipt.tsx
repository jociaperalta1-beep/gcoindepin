import { CheckCircle2, ExternalLink, Printer, X } from "lucide-react";

import { GCOIN_SYMBOL } from "@/lib/gcoin";
import { MASTER_WALLET, PLATFORM_FEE_RATE } from "@/lib/platform";
import { formatNumber, formatUsd } from "@/lib/gcoin";

export type ReceiptData = {
  signature: string | null;
  paidLabel: string;
  totalUsd: number;
  feeUsd: number;
  gcoinAmount: number;
  route: string;
  date: number;
};

/** Comprobante digital con los colores de la bandera de Paraguay. */
export function PaymentReceipt({
  receipt,
  onClose,
}: {
  receipt: ReceiptData | null;
  onClose: () => void;
}) {
  if (!receipt) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Recibo digital de pago"
    >
      <div className="panel-surface w-full max-w-md overflow-hidden">
        <div className="flex">
          <span className="h-1.5 flex-1 bg-[#d52b1e]" />
          <span className="h-1.5 flex-1 bg-white" />
          <span className="h-1.5 flex-1 bg-[#0038a8]" />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-center gap-2 text-bull">
              <CheckCircle2 className="size-6" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em]">
                Pago confirmado
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar recibo"
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <h3 className="mt-3 font-display text-lg font-bold text-foreground">
            Recibo digital · GCOIN (GUARANI COIN)
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {new Date(receipt.date).toLocaleString("es-PY")}
          </p>

          <dl className="mt-4 space-y-1.5 rounded-md border border-border bg-background/30 p-3 text-[11px]">
            <Row label="Total abonado" value={receipt.paidLabel} />
            <Row label="Valor en USD" value={formatUsd(receipt.totalUsd)} />
            <Row
              label={`Comisión de plataforma (${(PLATFORM_FEE_RATE * 100).toFixed(1)}%)`}
              value={formatUsd(receipt.feeUsd)}
            />
            <Row
              label={`${GCOIN_SYMBOL} asignados`}
              value={`${formatNumber(receipt.gcoinAmount, 4)} ${GCOIN_SYMBOL}`}
            />
            <Row label="Ruta" value={receipt.route} />
            <Row label="Billetera maestra" value={`${MASTER_WALLET.slice(0, 6)}…${MASTER_WALLET.slice(-6)}`} />
          </dl>

          <div className="mt-3 rounded-md border border-border bg-background/30 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Hash de la transacción
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-foreground">
              {receipt.signature ?? "Pendiente de confirmación bancaria"}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            {receipt.signature ? (
              <a
                href={`https://solscan.io/tx/${receipt.signature}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground"
              >
                <ExternalLink className="size-3.5" /> Ver en Solscan
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <Printer className="size-3.5" /> Imprimir
            </button>
          </div>
        </div>
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
