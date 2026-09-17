import { createServerFn } from "@tanstack/react-start";

import {
  GCOIN_MINT,
  GCOIN_DECIMALS,
  GRADUATION_MCAP_USD,
  WSOL_DECIMALS,
  WSOL_MINT,
  type Candle,
  type MarketSnapshot,
  type TradeRow,
  type Timeframe,
  type JupiterQuote,
} from "./gcoin";

type DexPair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  priceUsd?: string;
  priceNative?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number; m5?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

async function loadBestPair(): Promise<DexPair | null> {
  // 1) DexScreener (cuando indexe el token)
  try {
    const data = await fetchJson<{ pairs?: DexPair[] | null }>(
      `https://api.dexscreener.com/latest/dex/tokens/${GCOIN_MINT}`,
    );
    const pairs = (data.pairs ?? []).filter((p) => p.chainId === "solana");
    if (pairs.length > 0) {
      return pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null;
    }
  } catch {
    /* pasa a GeckoTerminal */
  }

  // 2) GeckoTerminal (indexa pump.fun antes que DexScreener)
  const json = await fetchJson<{
    data?: Array<{
      attributes?: {
        address?: string;
        name?: string;
        base_token_price_usd?: string;
        base_token_price_native_currency?: string;
        fdv_usd?: string;
        market_cap_usd?: string | null;
        reserve_in_usd?: string;
        volume_usd?: { h24?: string };
        price_change_percentage?: { h24?: string; m5?: string };
        transactions?: { h24?: { buys?: number; sells?: number } };
      };
    }>;
  }>(
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${GCOIN_MINT}/pools?page=1`,
  );
  const pools = (json.data ?? []).map((pool) => {
    const a = pool.attributes ?? {};
    return {
      chainId: "solana",
      dexId: "pumpfun",
      pairAddress: a.address,
      priceUsd: a.base_token_price_usd,
      priceNative: a.base_token_price_native_currency,
      marketCap: a.market_cap_usd
        ? Number(a.market_cap_usd)
        : a.fdv_usd
          ? Number(a.fdv_usd)
          : undefined,
      fdv: a.fdv_usd ? Number(a.fdv_usd) : undefined,
      liquidity: { usd: a.reserve_in_usd ? Number(a.reserve_in_usd) : 0 },
      volume: { h24: a.volume_usd?.h24 ? Number(a.volume_usd.h24) : 0 },
      priceChange: {
        h24: a.price_change_percentage?.h24 ? Number(a.price_change_percentage.h24) : 0,
        m5: a.price_change_percentage?.m5 ? Number(a.price_change_percentage.m5) : 0,
      },
      txns: {
        h24: {
          buys: a.transactions?.h24?.buys ?? 0,
          sells: a.transactions?.h24?.sells ?? 0,
        },
      },
    } as DexPair;
  });
  if (pools.length === 0) return null;
  return pools.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null;
}

// ============= Demo data (fallback while the token has no public pairs) =============

const DEMO_BASE_PRICE = 0.000042; // USD por GCOIN
const DEMO_POOL = "DemoPoolGcoinGuarani111111111111111111111";

function demoMarketCap() {
  return GRADUATION_MCAP_USD * 0.42;
}

function demoSnapshot(): MarketSnapshot {
  const marketCapUsd = demoMarketCap();
  return {
    priceUsd: DEMO_BASE_PRICE,
    priceSol: DEMO_BASE_PRICE / 210,
    marketCapUsd,
    liquidityUsd: 18_450,
    volume24hUsd: 7_230,
    change24h: 12.4,
    change5m: 0.8,
    buys24h: 184,
    sells24h: 96,
    pairAddress: DEMO_POOL,
    dexId: "pumpfun",
    graduated: false,
    bondingProgress: Math.min(100, (marketCapUsd / GRADUATION_MCAP_USD) * 100),
    updatedAt: Date.now(),
    simulated: true,
  };
}

let demoSeed = 1337;
function demoRandom() {
  // PRNG determinístico (mulberry32) para datos de ejemplo estables
  demoSeed = (demoSeed + 0x6d2b79f5) | 0;
  let t = demoSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function demoCandles(timeframe: Timeframe): Candle[] {
  const stepMs = timeframe === "1m" ? 60_000 : timeframe === "5m" ? 300_000 : 3_600_000;
  const count = 120;
  const now = Date.now();
  const start = now - count * stepMs;
  const candles: Candle[] = [];
  let price = DEMO_BASE_PRICE * 0.72;
  for (let i = 0; i < count; i++) {
    const drift = 0.0012;
    const wave = Math.sin(i / 9) * 0.004;
    const noise = (demoRandom() - 0.48) * 0.02;
    const open = price;
    const close = Math.max(open * (1 + drift + wave + noise), DEMO_BASE_PRICE * 0.2);
    const high = Math.max(open, close) * (1 + demoRandom() * 0.006);
    const low = Math.min(open, close) * (1 - demoRandom() * 0.006);
    const volume = 150 + demoRandom() * 2200;
    candles.push({ time: start + i * stepMs, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

const DEMO_WALLETS = [
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWb",
  "7nYBq2kB3bZdEVLBN8CmUQyhFJrTPQ",
  "4sMMC5sKZAwaV8vB2mH4tFvPrKqJw",
  "GThUP1Kz8qJm4RkYYkN3xPQrJdEwVb",
  "6BgsbHMKzRMnKRjcxNTvWJfYRqDeQm",
  "Hv8hGRFBBMZ5MpzfkVyEK3bTQwJsLp",
];

function demoTrades(): TradeRow[] {
  const rows: TradeRow[] = [];
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    const kind = demoRandom() > 0.38 ? "buy" : "sell";
    const amountUsd = 8 + demoRandom() * 640;
    const priceUsd = DEMO_BASE_PRICE * (0.94 + demoRandom() * 0.12);
    const fakeHash = Array.from({ length: 64 }, () =>
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".charAt(
        Math.floor(demoRandom() * 58),
      ),
    ).join("");
    rows.push({
      id: `demo-${i}`,
      kind,
      amountToken: amountUsd / priceUsd,
      amountUsd,
      priceUsd,
      wallet: DEMO_WALLETS[Math.floor(demoRandom() * DEMO_WALLETS.length)] ?? DEMO_WALLETS[0]!,
      txHash: fakeHash,
      timestamp: now - i * (45_000 + Math.floor(demoRandom() * 180_000)),
    });
  }
  return rows;
}

export const getMarketSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketSnapshot | null> => {
    const pair = await loadBestPair().catch(() => null);
    if (!pair) return demoSnapshot();

    const priceUsd = Number(pair.priceUsd ?? 0);
    const priceSol = pair.priceNative ? Number(pair.priceNative) : null;
    const marketCapUsd = pair.marketCap ?? pair.fdv ?? 0;
    const dexId = pair.dexId ?? null;
    const graduated = dexId !== null && dexId !== "pumpfun";
    const bondingProgress = graduated
      ? 100
      : Math.max(0, Math.min(100, (marketCapUsd / GRADUATION_MCAP_USD) * 100));

    return {
      priceUsd,
      priceSol,
      marketCapUsd,
      liquidityUsd: pair.liquidity?.usd ?? 0,
      volume24hUsd: pair.volume?.h24 ?? 0,
      change24h: pair.priceChange?.h24 ?? 0,
      change5m: pair.priceChange?.m5 ?? 0,
      buys24h: pair.txns?.h24?.buys ?? 0,
      sells24h: pair.txns?.h24?.sells ?? 0,
      pairAddress: pair.pairAddress ?? null,
      dexId,
      graduated,
      bondingProgress,
      updatedAt: Date.now(),
    };
  },
);

const TIMEFRAME_MAP: Record<Timeframe, { path: string; aggregate: string }> = {
  "1m": { path: "minute", aggregate: "1" },
  "5m": { path: "minute", aggregate: "5" },
  "1h": { path: "hour", aggregate: "1" },
};

export const getCandles = createServerFn({ method: "GET" })
  .inputValidator((input: { timeframe: Timeframe; pairAddress?: string | null }) => input)
  .handler(async ({ data }): Promise<Candle[]> => {
    const pool =
      data.pairAddress && data.pairAddress !== DEMO_POOL
        ? data.pairAddress
        : (await loadBestPair().catch(() => null))?.pairAddress;
    if (!pool) return demoCandles(data.timeframe);
    const tf = TIMEFRAME_MAP[data.timeframe] ?? TIMEFRAME_MAP["5m"];
    try {
      const json = await fetchJson<{
        data?: { attributes?: { ohlcv_list?: number[][] } };
      }>(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${tf.path}?aggregate=${tf.aggregate}&limit=120&currency=usd`,
      );
      const list = json.data?.attributes?.ohlcv_list ?? [];
      const candles = list
        .map((row) => ({
          time: (row[0] ?? 0) * 1000,
          open: row[1] ?? 0,
          high: row[2] ?? 0,
          low: row[3] ?? 0,
          close: row[4] ?? 0,
          volume: row[5] ?? 0,
        }))
        .filter((c) => c.time > 0 && c.close > 0)
        .sort((a, b) => a.time - b.time);
      return candles.length > 0 ? candles : demoCandles(data.timeframe);
    } catch {
      return demoCandles(data.timeframe);
    }
  });

export const getRecentTrades = createServerFn({ method: "GET" })
  .inputValidator((input: { pairAddress?: string | null }) => input)
  .handler(async ({ data }): Promise<TradeRow[]> => {
    const pool =
      data.pairAddress && data.pairAddress !== DEMO_POOL
        ? data.pairAddress
        : (await loadBestPair().catch(() => null))?.pairAddress;
    if (!pool) return demoTrades();
    try {
      const json = await fetchJson<{
        data?: Array<{
          id?: string;
          attributes?: {
            block_timestamp?: string;
            tx_hash?: string;
            tx_from_address?: string;
            kind?: string;
            from_token_amount?: string;
            to_token_amount?: string;
            price_to_in_usd?: string;
            price_from_in_usd?: string;
            volume_in_usd?: string;
          };
        }>;
      }>(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/trades`);

      const trades = (json.data ?? [])
        .map((row, index) => {
          const a = row.attributes ?? {};
          const kind: "buy" | "sell" = a.kind === "sell" ? "sell" : "buy";
          const tokenAmount = Number(
            (kind === "buy" ? a.to_token_amount : a.from_token_amount) ?? 0,
          );
          const price = Number((kind === "buy" ? a.price_to_in_usd : a.price_from_in_usd) ?? 0);
          return {
            id: row.id ?? `${a.tx_hash ?? "tx"}-${index}`,
            kind,
            amountToken: tokenAmount,
            amountUsd: Number(a.volume_in_usd ?? 0),
            priceUsd: price,
            wallet: a.tx_from_address ?? "",
            txHash: a.tx_hash ?? "",
            timestamp: a.block_timestamp ? Date.parse(a.block_timestamp) : Date.now(),
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 40);
      return trades.length > 0 ? trades : demoTrades();
    } catch {
      return demoTrades();
    }
  });

export const getSolPrice = createServerFn({ method: "GET" }).handler(async (): Promise<number> => {
  try {
    const json = await fetchJson<{ pairs?: DexPair[] }>(
      "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
    );
    const pair = (json.pairs ?? [])
      .filter((p) => p.chainId === "solana")
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    return Number(pair?.priceUsd ?? 0);
  } catch {
    return 0;
  }
});

export const getJupiterQuote = createServerFn({ method: "GET" })
  .inputValidator((input: { side: "buy" | "sell"; amount: number; slippageBps: number }) => input)
  .handler(async ({ data }): Promise<JupiterQuote | null> => {
    if (!Number.isFinite(data.amount) || data.amount <= 0) return null;
    const buying = data.side === "buy";
    const inputMint = buying ? WSOL_MINT : GCOIN_MINT;
    const outputMint = buying ? GCOIN_MINT : WSOL_MINT;
    const decimals = buying ? WSOL_DECIMALS : GCOIN_DECIMALS;
    const amount = Math.floor(data.amount * 10 ** decimals).toString();
    const slippageBps = Math.max(1, Math.min(5000, Math.round(data.slippageBps)));
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount,
        slippageBps: String(slippageBps),
        restrictIntermediateTokens: "true",
      });
      const quote = await fetchJson<Omit<JupiterQuote, "simulated">>(
        `https://quote-api.jup.ag/v6/quote?${params.toString()}`,
      );
      return { ...quote, simulated: false };
    } catch {
      return null;
    }
  });

// ============= Ejecución real de swaps (Jupiter v6) =============

export const buildJupiterSwap = createServerFn({ method: "POST" })
  .inputValidator((input: { quoteResponse: unknown; userPublicKey: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ swapTransaction: string; lastValidBlockHeight?: number; prioritizationFeeLamports?: number }> => {
      const res = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          quoteResponse: data.quoteResponse,
          userPublicKey: data.userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: "auto",
        }),
      });
      if (!res.ok) {
        throw new Error(`Jupiter no pudo construir la transacción (${res.status})`);
      }
      return (await res.json()) as { swapTransaction: string; lastValidBlockHeight?: number };
    },
  );

/** Endpoint RPC resiliente: secreto RPC_URL en producción, público como respaldo. */
export const getRpcEndpoint = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  return (
    process.env["RPC_URL"] ??
    process.env["SOLANA_RPC_URL"] ??
    "https://api.mainnet-beta.solana.com"
  );
});
