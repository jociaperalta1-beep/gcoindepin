import { GRADUATION_MCAP_USD, formatUsd, type MarketSnapshot } from "@/lib/gcoin";

export function BondingCurve({ market }: { market: MarketSnapshot | null }) {
  const progress = market?.bondingProgress ?? 0;
  const remaining = Math.max(0, GRADUATION_MCAP_USD - (market?.marketCapUsd ?? 0));

  return (
    <section className="panel-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Bonding curve
        </h2>
        <span className="font-display text-lg font-bold tabular-nums text-foreground">
          {progress.toFixed(1)}%
        </span>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-border bg-background">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-bull transition-[width] duration-700"
          style={{ width: `${Math.max(1.5, Math.min(100, progress))}%` }}
          role="progressbar"
          aria-valuenow={Number(progress.toFixed(1))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de la bonding curve"
        />
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {market?.graduated ? (
          <>
            GCOIN ya graduó de la curva y cotiza en{" "}
            <span className="uppercase text-foreground">{market.dexId}</span> con liquidez de{" "}
            {formatUsd(market.liquidityUsd)}.
          </>
        ) : (
          <>
            Faltan <span className="text-foreground">{formatUsd(remaining)}</span> de capitalización
            para graduar a un exchange descentralizado (meta {formatUsd(GRADUATION_MCAP_USD)}).
          </>
        )}
      </p>
    </section>
  );
}
