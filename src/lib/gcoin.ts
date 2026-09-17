export const GCOIN_MINT = "8kVkSHDkRN3MTZHLBmkGNHzSix7FR7BEWBBKyvjspump";
export const GCOIN_SYMBOL = "GCOIN";
export const GCOIN_NAME = "GCOIN (GUARANI COIN)";
export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const GCOIN_DECIMALS = 6;
export const WSOL_DECIMALS = 9;
export const SOLSCAN_TOKEN_URL = `https://solscan.io/token/${GCOIN_MINT}`;
export const PUMPFUN_URL = `https://pump.fun/coin/${GCOIN_MINT}`;
export const DEXSCREENER_URL = `https://dexscreener.com/solana/${GCOIN_MINT}`;
export const GRADUATION_MCAP_USD = 69_000;
export const SOLANA_RPC_URL =
  (import.meta.env["VITE_SOLANA_RPC_URL"] as string | undefined) ??
  "https://api.mainnet-beta.solana.com";

/** Endpoints de respaldo públicos usados si el principal falla. */
export const RPC_FALLBACKS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
];

export type Timeframe = "1m" | "5m" | "1h";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketSnapshot = {
  priceUsd: number;
  priceSol: number | null;
  marketCapUsd: number;
  liquidityUsd: number;
  volume24hUsd: number;
  change24h: number;
  change5m: number;
  buys24h: number;
  sells24h: number;
  pairAddress: string | null;
  dexId: string | null;
  graduated: boolean;
  bondingProgress: number;
  updatedAt: number;
  simulated?: boolean;
};

export type TradeRow = {
  id: string;
  kind: "buy" | "sell";
  amountToken: number;
  amountUsd: number;
  priceUsd: number;
  wallet: string;
  txHash: string;
  timestamp: number;
};

export type JupiterQuote = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  routePlan: Array<{
    percent: number;
    swapInfo: {
      label?: string;
      feeAmount?: string;
      feeMint?: string;
    };
  }>;
  simulated: boolean;
};

export function shortAddress(value: string, size = 4) {
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export function formatUsd(value: number | null | undefined, digits?: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (digits !== undefined) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  }
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(4)}`;
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
