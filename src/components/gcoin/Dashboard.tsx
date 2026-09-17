import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, History } from "lucide-react";
import { useState } from "react";

import { AdminProfile } from "./AdminProfile";
import { BondingCurve } from "./BondingCurve";
import { CandleChart } from "./CandleChart";
import { CommunityChat } from "./CommunityChat";
import { DePinMap } from "./DePinMap";
import { ErrorBoundary } from "./ErrorBoundary";
import { TokenDeployPanel } from "./TokenDeployPanel";
import { WhitepaperPanel } from "./WhitepaperPanel";
import { MetricCards } from "./MetricCards";
import { RpcStatusBadge } from "./RpcHealth";
import { SwapHistoryModal } from "./SwapHistoryModal";
import { TradePanel } from "./TradePanel";
import { TradesTable } from "./TradesTable";
import { WalletButton } from "./WalletButton";
import officialCoin from "@/assets/gcoin-official-coin.jpeg.asset.json";
import {
  DEXSCREENER_URL,
  GCOIN_MINT,
  GCOIN_NAME,
  PUMPFUN_URL,
  SOLSCAN_TOKEN_URL,
  formatTime,
  shortAddress,
  type Timeframe,
} from "@/lib/gcoin";
import { getCandles, getMarketSnapshot, getRecentTrades, getSolPrice } from "@/lib/gcoin.functions";

export function Dashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sideTab, setSideTab] = useState<"depin" | "chat" | "paper" | "deploy">("depin");
  const [historyOpen, setHistoryOpen] = useState(false);

  const market = useQuery({
    queryKey: ["gcoin-market"],
    queryFn: () => getMarketSnapshot(),
    refetchInterval: 15_000,
  });

  const pairAddress = market.data?.pairAddress ?? null;

  const candles = useQuery({
    queryKey: ["gcoin-candles", timeframe, pairAddress],
    queryFn: () => getCandles({ data: { timeframe, pairAddress } }),
    refetchInterval: 20_000,
  });

  const trades = useQuery({
    queryKey: ["gcoin-trades", pairAddress],
    queryFn: () => getRecentTrades({ data: { pairAddress } }),
    refetchInterval: 15_000,
  });

  const solPrice = useQuery({
    queryKey: ["sol-price"],
    queryFn: () => getSolPrice(),
    refetchInterval: 60_000,
  });

  function copyMint() {
    navigator.clipboard?.writeText(GCOIN_MINT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={officialCoin.url}
              alt="Moneda oficial GCOIN con escudo de Paraguay"
              width={44}
              height={44}
              className="size-11 rounded-md border border-border object-cover"
            />
            <div>
              <h1 className="font-display text-lg font-bold leading-tight text-foreground">
                {GCOIN_NAME}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyMint}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {shortAddress(GCOIN_MINT, 6)} <Copy className="size-3" />
                  {copied ? <span className="text-bull">copiado</span> : null}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-2 md:flex">
              {[
                { label: "Pump.fun", href: PUMPFUN_URL },
                { label: "Solscan", href: SOLSCAN_TOKEN_URL },
                { label: "DexScreener", href: DEXSCREENER_URL },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-md border border-border bg-panel px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label} <ExternalLink className="size-3" />
                </a>
              ))}
            </nav>
            <RpcStatusBadge />
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border bg-panel px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <History className="size-3.5" /> Historial
            </button>
            <WalletButton open={walletOpen} onOpenChange={setWalletOpen} />
          </div>
        </div>
      </header>

      <SwapHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <ErrorBoundary label="AdminProfile">
            <AdminProfile />
          </ErrorBoundary>
          <ErrorBoundary label="BondingCurve">
            <BondingCurve market={market.data ?? null} />
          </ErrorBoundary>
          <section className="panel-surface overflow-hidden">
            <div className="grid grid-cols-4 border-b border-border">
              {(
                [
                  { id: "depin", label: "Mapa global" },
                  { id: "chat", label: "Chat" },
                  { id: "paper", label: "Whitepaper" },
                  { id: "deploy", label: "Deploy" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSideTab(tab.id)}
                  aria-pressed={sideTab === tab.id}
                  className={
                    "py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors " +
                    (sideTab === tab.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Las tres pestañas permanecen montadas para conservar su estado */}
            <div className={sideTab === "depin" ? "" : "hidden"}>
              <ErrorBoundary label="DePinMap">
                <DePinMap />
              </ErrorBoundary>
            </div>
            <div className={sideTab === "chat" ? "" : "hidden"}>
              <ErrorBoundary label="CommunityChat">
                <CommunityChat />
              </ErrorBoundary>
            </div>
            <div className={sideTab === "paper" ? "" : "hidden"}>
              <ErrorBoundary label="WhitepaperPanel">
                <WhitepaperPanel volume24hUsd={market.data?.volume24hUsd ?? 0} />
              </ErrorBoundary>
            </div>
            <div className={sideTab === "deploy" ? "" : "hidden"}>
              <ErrorBoundary label="TokenDeployPanel">
                <TokenDeployPanel solPriceUsd={solPrice.data ?? 0} />
              </ErrorBoundary>
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-8">
          <ErrorBoundary label="MetricCards">
            <MetricCards market={market.data ?? null} />
          </ErrorBoundary>
          <ErrorBoundary label="CandleChart">
            <CandleChart
              candles={candles.data ?? []}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              priceUsd={market.data?.priceUsd ?? 0}
              change24h={market.data?.change24h ?? 0}
              isLoading={candles.isPending}
            />
          </ErrorBoundary>
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <ErrorBoundary label="TradePanel">
                <TradePanel
                  priceUsd={market.data?.priceUsd ?? 0}
                  solPriceUsd={solPrice.data ?? 0}
                  onConnect={() => setWalletOpen(true)}
                />
              </ErrorBoundary>
            </div>
            <div className="xl:col-span-7">
              <ErrorBoundary label="TradesTable">
                <TradesTable trades={trades.data ?? []} isLoading={trades.isPending} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-8 text-[10px] uppercase tracking-widest text-muted-foreground">
        {market.data?.simulated
          ? "Datos de ejemplo hasta que el token registre pares públicos de trading"
          : "Datos on-chain de Solana mainnet"}{" "}
        · última actualización {market.data ? formatTime(market.data.updatedAt) : "—"} · GCOIN no
        es asesoramiento financiero
      </footer>
    </div>
  );
}
