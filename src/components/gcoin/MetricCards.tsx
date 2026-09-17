import { formatNumber, formatPercent, formatUsd, type MarketSnapshot } from "@/lib/gcoin";
import { cn } from "@/lib/utils";

export function MetricCards({ market }: { market: MarketSnapshot | null }) {
  const items = [
    { label: "Market cap", value: formatUsd(market?.marketCapUsd), accent: "text-foreground" },
    {
      label: "Precio",
      value: market?.priceUsd ? `$${market.priceUsd.toPrecision(5)}` : "—",
      accent: "text-foreground",
    },
    { label: "Liquidez", value: formatUsd(market?.liquidityUsd), accent: "text-foreground" },
    { label: "Volumen 24h", value: formatUsd(market?.volume24hUsd), accent: "text-foreground" },
    {
      label: "Variación 24h",
      value: formatPercent(market?.change24h),
      accent: (market?.change24h ?? 0) >= 0 ? "text-bull" : "text-bear",
    },
    {
      label: "Compras / ventas 24h",
      value: `${formatNumber(market?.buys24h ?? 0, 0)} / ${formatNumber(market?.sells24h ?? 0, 0)}`,
      accent: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="panel-surface p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {item.label}
          </p>
          <p className={cn("mt-1 font-display text-xl font-bold tabular-nums", item.accent)}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
