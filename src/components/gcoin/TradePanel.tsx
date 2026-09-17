import "@/lib/buffer-polyfill";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowDownUp,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PaymentReceipt, type ReceiptData } from "./PaymentReceipt";
import { SecurityCodeModal } from "./SecurityCodeModal";
import { SwapStatusModal, type SwapDetails, type SwapStatus } from "./SwapStatusModal";
import { useWalletBalances } from "./useWalletBalances";
import {
  GCOIN_DECIMALS,
  GCOIN_SYMBOL,
  PUMPFUN_URL,
  WSOL_DECIMALS,
  formatNumber,
  formatUsd,
  type JupiterQuote,
} from "@/lib/gcoin";
import { buildJupiterSwap, getJupiterQuote } from "@/lib/gcoin.functions";
import { addSwapRecord } from "@/lib/swapHistory";
import { setSwapBusy } from "@/lib/adsense";
import {
  MASTER_WALLET,
  MIN_TX_USD,
  PLATFORM_FEE_RATE,
  meetsMinimum,
  platformFeeUsd,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

type Side = "buy" | "sell";
type Status = "idle" | "preparing" | "confirming" | "done";
type PayCurrency = "SOL" | "PYG" | "USD";
const SLIPPAGE_OPTIONS = [0.5, 1, 2.5] as const;

// Tasas base de mercado para la conversión fiat → cripto
const PYG_RATE_OPTIONS = [7600, 8000] as const; // 1 USD en guaraníes (configurable)
const SOL_USD_RATE = 97; // 1 SOL = 97 USD
const FIAT_GATEWAY_FEE = 0.015; // Comisión de pasarela fiat 1.5%

const PAY_CURRENCIES: Array<{ code: PayCurrency; label: string; symbol: string }> = [
  { code: "SOL", label: "Solana", symbol: "◎" },
  { code: "PYG", label: "Guaraní", symbol: "₲" },
  { code: "USD", label: "Dólar", symbol: "$" },
];

export function TradePanel({
  priceUsd,
  solPriceUsd,
  onConnect,
}: {
  priceUsd: number;
  solPriceUsd: number;
  onConnect: () => void;
}) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const requestQuote = useServerFn(getJupiterQuote);
  const requestSwap = useServerFn(buildJupiterSwap);
  const [swapStatus, setSwapStatusRaw] = useState<SwapStatus>("idle");
  const setSwapStatus = (next: SwapStatus) => {
    // Bloquea anuncios mientras hay una operación o firma en curso.
    setSwapBusy(next !== "idle" && next !== "success" && next !== "error");
    setSwapStatusRaw(next);
  };
  const [swapDetails, setSwapDetails] = useState<SwapDetails>({
    inputLabel: "",
    outputLabel: "",
    route: "Jupiter Aggregator",
    slippage: 0.5,
    networkFeeSol: null,
    priceImpact: 0,
    signature: null,
    error: null,
  });
  const { data: balances } = useWalletBalances();
  const [side, setSide] = useState<Side>("buy");
  const [payCurrency, setPayCurrency] = useState<PayCurrency>("SOL");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [slippage, setSlippage] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState("");
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [walletNotice, setWalletNotice] = useState(false);
  const [pygRate, setPygRate] = useState<number>(PYG_RATE_OPTIONS[0]);
  const [customRate, setCustomRate] = useState("");
  const [askCode, setAskCode] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  // Candado de idempotencia: impide dobles envíos mientras hay una operación en vuelo.
  const inFlight = useRef(false);

  const isFiat = side === "buy" && payCurrency !== "SOL";

  useEffect(() => {
    setStatus("idle");
  }, [side, amount, slippage, payCurrency]);

  const value = Number(amount.replace(",", ".")) || 0;
  const tokensPerSol = priceUsd > 0 ? solPriceUsd / priceUsd : 0;

  // Conversión fiat → cripto: moneda → USD → SOL → GCOIN
  const usdGross = isFiat
    ? payCurrency === "USD"
      ? value
      : value / pygRate
    : 0;
  const fiatFeeUsd = isFiat ? usdGross * FIAT_GATEWAY_FEE : 0;
  const usdNet = usdGross - fiatFeeUsd;
  const solEquivalent = isFiat ? usdNet / SOL_USD_RATE : value;
  const fiatEstimate = priceUsd > 0 ? usdNet / priceUsd : 0;

  const estimate =
    side === "buy"
      ? isFiat
        ? fiatEstimate
        : value * tokensPerSol
      : tokensPerSol > 0
        ? value / tokensPerSol
        : 0;
  const estimateAfterSlippage = estimate * (1 - slippage / 100);
  const usdValue = isFiat
    ? usdNet
    : side === "buy"
      ? value * solPriceUsd
      : value * priceUsd;

  const platformFee = platformFeeUsd(usdValue);
  const belowMinimum = value > 0 && !meetsMinimum(usdValue);

  const inputSymbol = side === "buy" ? payCurrency : GCOIN_SYMBOL;
  const outputSymbol = side === "buy" ? GCOIN_SYMBOL : "SOL";
  const available =
    side === "buy" ? (isFiat ? null : (balances?.sol ?? 0)) : (balances?.gcoin ?? 0);

  useEffect(() => {
    if (value <= 0 || isFiat) {
      // Con fiat la cotización se calcula localmente con la tasa asegurada
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const result = await requestQuote({
          data: { side, amount: value, slippageBps: Math.round(slippage * 100) },
        });
        if (active) setQuote(result);
      } catch {
        if (active) setQuote(null);
      } finally {
        if (active) setQuoteLoading(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [requestQuote, side, slippage, value, isFiat]);

  const quotedOutput = useMemo(() => {
    if (isFiat || !quote) return estimate;
    const decimals = side === "buy" ? GCOIN_DECIMALS : WSOL_DECIMALS;
    return Number(quote.outAmount) / 10 ** decimals;
  }, [estimate, isFiat, quote, side]);

  const routeLabel = quote?.routePlan
    .map((leg) => leg.swapInfo.label)
    .filter((label): label is string => Boolean(label))
    .join(" + ") || "Jupiter Aggregator";
  const impact = quote ? Number(quote.priceImpactPct || 0) : Math.min(slippage * 0.18, 0.45);
  const fee = quotedOutput * 0.0025;

  function baseDetails(): SwapDetails {
    return {
      inputLabel: `${formatNumber(value, side === "buy" && payCurrency !== "SOL" ? 0 : 4)} ${inputSymbol}`,
      outputLabel: `${formatNumber(quotedOutput, 4)} ${outputSymbol}`,
      route: routeLabel,
      slippage,
      networkFeeSol: null,
      priceImpact: impact,
      signature: null,
      error: null,
    };
  }

  function recordHistory(
    outcome: "success" | "error",
    extra: { signature?: string | null; error?: string | null },
  ) {
    addSwapRecord({
      pair: `${inputSymbol} → ${outputSymbol}`,
      amountIn: value,
      symbolIn: inputSymbol,
      amountOut: quotedOutput,
      symbolOut: outputSymbol,
      route: routeLabel,
      slippage,
      status: outcome,
      signature: extra.signature ?? null,
      error: extra.error ?? null,
    });
  }

  function requestAction() {
    if (inFlight.current) return;
    if (!connected || !publicKey) {
      setWalletNotice(true);
      return;
    }
    if (value <= 0 || belowMinimum) return;
    setAskCode(true);
  }

  function buildReceipt(signature: string | null): ReceiptData {
    return {
      signature,
      paidLabel: `${formatNumber(value, isFiat ? 0 : 4)} ${inputSymbol}`,
      totalUsd: usdValue,
      feeUsd: platformFee,
      gcoinAmount: side === "buy" ? quotedOutput : 0,
      route: routeLabel,
      date: Date.now(),
    };
  }

  async function handleAction() {
    // Idempotencia: bloquea envíos duplicados mientras hay una firma o
    // confirmación en vuelo, incluso si la red responde tarde.
    if (inFlight.current) return;
    if (!connected || !publicKey) {
      setWalletNotice(true);
      return;
    }
    if (value <= 0 || belowMinimum) return;
    inFlight.current = true;
    try {
      await runSwap();
    } finally {
      inFlight.current = false;
    }
  }

  async function runSwap() {
    if (!publicKey) return;

    // Fiat: la liquidación pasa por la pasarela, no hay firma on-chain todavía.
    if (isFiat) {
      setStatus("preparing");
      await new Promise((resolve) => setTimeout(resolve, 900));
      setStatus("confirming");
      await new Promise((resolve) => setTimeout(resolve, 1100));
      setStatus("done");
      setReceipt(buildReceipt(null));
      return;
    }

    setSwapDetails(baseDetails());
    setSwapStatus("quoting");
    setStatus("preparing");
    let sentSignature: string | null = null;
    try {
      const fresh = await requestQuote({
        data: { side, amount: value, slippageBps: Math.round(slippage * 100) },
      });
      if (!fresh) throw new Error("Jupiter no encontró una ruta disponible para este monto.");

      const { simulated: _simulated, ...quoteResponse } = fresh;
      const built = await requestSwap({
        data: { quoteResponse, userPublicKey: publicKey.toBase58() },
      });

      const raw = Uint8Array.from(atob(built.swapTransaction), (char) => char.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(raw);

      setSwapDetails((prev) => ({
        ...prev,
        networkFeeSol:
          typeof built.prioritizationFeeLamports === "number"
            ? (built.prioritizationFeeLamports + 5000) / 1e9
            : 0.00001,
      }));
      setSwapStatus("signing");

      const signature = await sendTransaction(transaction, connection, { maxRetries: 3 });
      sentSignature = signature;
      setSwapDetails((prev) => ({ ...prev, signature }));
      setSwapStatus("sent");

      const latest = await connection.getLatestBlockhash();
      setSwapStatus("confirming");
      setStatus("confirming");
      const result = await connection.confirmTransaction(
        {
          signature,
          blockhash: latest.blockhash,
          lastValidBlockHeight: built.lastValidBlockHeight ?? latest.lastValidBlockHeight,
        },
        "confirmed",
      );
      if (result.value.err) {
        throw new Error("La red rechazó la transacción. Revisá tu saldo y volvé a intentar.");
      }
      setSwapStatus("success");
      setStatus("done");
      recordHistory("success", { signature: sentSignature });
      setReceipt(buildReceipt(sentSignature));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const friendly = /user rejected|rechaz|denied|cancel/i.test(message)
        ? "Cancelaste la firma en la billetera."
        : /insufficient|0x1\b|not enough/i.test(message)
          ? "Fondos insuficientes: necesitás más saldo (incluí SOL para las comisiones de red)."
          : /block height exceeded|timeout|expired/i.test(message)
            ? "Se agotó el tiempo de confirmación. Verificá en Solscan antes de reintentar."
            : message;
      setSwapDetails((prev) => ({ ...prev, error: friendly }));
      setSwapStatus("error");
      setStatus("idle");
      recordHistory("error", { signature: sentSignature, error: friendly });
    }
  }

  return (
    <section className="panel-surface overflow-hidden">
      <div className="grid grid-cols-2">
        {(["buy", "sell"] as Side[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSide(tab)}
            className={cn(
              "py-3 text-xs font-bold uppercase tracking-[0.25em] transition-colors",
              side === tab
                ? tab === "buy"
                  ? "bg-bull/15 text-bull"
                  : "bg-bear/15 text-bear"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "buy" ? "Comprar" : "Vender"}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Pagás con</span>
            {available !== null ? (
              <span>
                Disponible: {formatNumber(available, side === "buy" ? 3 : 0)} {inputSymbol}
              </span>
            ) : (
              <span>Pago en moneda local</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2.5">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.,]/g, ""))}
              inputMode="decimal"
              placeholder="0.00"
              aria-label={`Monto en ${inputSymbol}`}
              className="w-full bg-transparent text-lg font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground"
            />
            {side === "buy" ? (
              <div className="flex gap-1">
                {PAY_CURRENCIES.map((currency) => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => {
                      setPayCurrency(currency.code);
                      setAmount("");
                    }}
                    title={currency.label}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-bold transition-colors",
                      payCurrency === currency.code
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {currency.code}
                  </button>
                ))}
              </div>
            ) : (
              <span className="rounded bg-background px-2 py-1 text-xs font-bold text-foreground">
                {inputSymbol}
              </span>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            {(side === "buy"
              ? payCurrency === "PYG"
                ? [100_000, 300_000, 595_000, 1_190_000]
                : payCurrency === "USD"
                  ? [10, 50, 100, 200]
                  : [0.1, 0.5, 1, 2]
              : [25, 50, 75, 100]
            ).map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() =>
                  setAmount(
                    side === "buy"
                      ? String(quick)
                      : String(Number((((available ?? 0) * quick) / 100).toFixed(4))),
                  )
                }
                className="flex-1 rounded border border-border bg-background/50 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {side === "buy"
                  ? payCurrency === "PYG"
                    ? `₲${formatNumber(quick, 0)}`
                    : payCurrency === "USD"
                      ? `$${quick}`
                      : `${quick} SOL`
                  : `${quick}%`}
              </button>
            ))}
          </div>

          {isFiat ? (
            <div className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Building2 className="size-3.5" /> Cómo pagar
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                Depósito Bancario Local (Paraguay) / Transferencia SIPAP. Los fondos se liquidan en
                la billetera maestra <span className="font-mono text-foreground">{MASTER_WALLET.slice(0, 6)}…{MASTER_WALLET.slice(-6)}</span> y
                luego los {GCOIN_SYMBOL} se liberan a tu billetera conectada.
              </p>
              {payCurrency === "PYG" ? (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Tasa USD/PYG
                  </p>
                  <div className="mt-1 grid grid-cols-3 gap-1.5">
                    {PYG_RATE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setPygRate(option);
                          setCustomRate("");
                        }}
                        className={cn(
                          "rounded border py-1.5 text-[11px] font-semibold",
                          pygRate === option && !customRate
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        ₲{formatNumber(option, 0)}
                      </button>
                    ))}
                    <input
                      value={customRate}
                      onChange={(event) => {
                        const next = event.target.value.replace(/[^0-9]/g, "");
                        setCustomRate(next);
                        const parsed = Number(next);
                        if (parsed >= 1000 && parsed <= 50_000) setPygRate(parsed);
                      }}
                      placeholder="Otra"
                      aria-label="Tasa USD/PYG personalizada"
                      className="min-w-0 rounded border border-border bg-background/40 px-2 text-center text-[11px] text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-center">
          <span className="rounded-full border border-border bg-background p-1.5 text-muted-foreground">
            <ArrowDownUp className="size-3.5" />
          </span>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recibís aprox.</p>
          <div className="mt-1 flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2.5">
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {quoteLoading ? "Cotizando…" : quotedOutput > 0 ? formatNumber(quotedOutput, 4) : "0.00"}
            </span>
            <span className="rounded bg-secondary px-2 py-1 text-xs font-bold text-foreground">
              {outputSymbol}
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Slippage tolerance</p>
            <span className="text-[11px] font-bold text-primary">{slippage.toFixed(2)}%</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SLIPPAGE_OPTIONS.map((option) => (
              <button key={option} type="button" onClick={() => { setSlippage(option); setCustomSlippage(""); }} className={cn("rounded border py-1.5 text-[11px] font-semibold", slippage === option && !customSlippage ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
                {option}%
              </button>
            ))}
            <input
              value={customSlippage}
              onChange={(event) => {
                const next = event.target.value.replace(/[^0-9.,]/g, "");
                setCustomSlippage(next);
                const parsed = Number(next.replace(",", "."));
                if (parsed > 0 && parsed <= 50) setSlippage(parsed);
              }}
              placeholder="Otro"
              aria-label="Slippage personalizado"
              className="min-w-0 rounded border border-border bg-background/40 px-2 text-center text-[11px] text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
            {isFiat ? <Lock className="size-3.5" /> : <Route className="size-3.5" />}
            {isFiat ? "Conversión fiat con tasa asegurada" : "Ruta óptima calculada por JUPITER"}
          </div>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            {isFiat
              ? `${payCurrency} → USD → SOL → ${GCOIN_SYMBOL} · liquidación vía Jupiter`
              : `${routeLabel}${quote ? "" : " · fallback simulado"}`}
          </p>
        </div>

        <dl className="space-y-1.5 rounded-md border border-border bg-background/30 p-3 text-[11px]">
          <Row label="Precio GCOIN" value={priceUsd ? `$${priceUsd.toPrecision(5)}` : "—"} />
          <Row label="Precio SOL" value={formatUsd(solPriceUsd)} />
          {isFiat ? (
            <>
              <Row
                label="Tasa de cambio asegurada"
                value={
                  payCurrency === "PYG"
                    ? `1 USD = ₲${formatNumber(pygRate, 0)} · 1 SOL = $${SOL_USD_RATE}`
                    : `1 SOL = $${SOL_USD_RATE}`
                }
              />
              <Row label="Equivale en USD" value={formatUsd(usdGross)} />
              <Row label="Equivale en SOL" value={`◎ ${formatNumber(solEquivalent, 4)}`} />
              <Row
                label="Comisión de pasarela fiat (1.5%)"
                value={`-${formatUsd(fiatFeeUsd)}`}
              />
            </>
          ) : null}
          <Row label="Valor de la orden" value={formatUsd(usdValue)} />
          <Row
            label={`Comisión administrativa (${(PLATFORM_FEE_RATE * 100).toFixed(1)}%)`}
            value={formatUsd(platformFee)}
          />
          <Row label="Mínimo por operación" value={formatUsd(MIN_TX_USD)} />
          <Row label="Impacto de precio" value={`${impact.toFixed(3)}%`} />
          <Row label="Comisión estimada" value={`${formatNumber(fee, 5)} ${outputSymbol}`} />
          <Row label={`Mínimo (slippage ${slippage}%)`} value={`${formatNumber(quote && !isFiat ? Number(quote.otherAmountThreshold) / 10 ** (side === "buy" ? GCOIN_DECIMALS : WSOL_DECIMALS) : estimateAfterSlippage, 4)} ${outputSymbol}`} />
        </dl>

        {belowMinimum ? (
          <p className="flex items-center gap-2 rounded-md border border-bear bg-bear/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-bear">
            <AlertTriangle className="size-4" />
            Mínimo {formatUsd(MIN_TX_USD)} por operación · actual {formatUsd(usdValue)}
          </p>
        ) : null}

        <button
          type="button"
          onClick={requestAction}
          disabled={
            (status !== "idle" && status !== "done") ||
            (swapStatus !== "idle" && swapStatus !== "error" && swapStatus !== "success") ||
            (connected && (value <= 0 || belowMinimum))
          }
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md py-3 text-xs font-bold uppercase tracking-[0.25em] transition-transform disabled:cursor-not-allowed disabled:opacity-50",
            !connected
              ? "bg-primary text-primary-foreground hover:scale-[1.01]"
              : side === "buy"
                ? "bg-bull text-background hover:scale-[1.01]"
                : "bg-bear text-background hover:scale-[1.01]",
          )}
        >
          {status === "preparing" || status === "confirming" ? <Loader2 className="size-4 animate-spin" /> : null}
          {status === "done" ? <CheckCircle2 className="size-4" /> : null}
          {!connected
              ? "Swap con Jupiter"
              : status === "preparing"
               ? "Preparando transacción…"
               : status === "confirming"
                 ? "Confirmando en Solana…"
              : status === "done"
                ? isFiat
                  ? "Depósito simulado"
                  : "Operación completada"
                : side === "buy"
                  ? `Comprar ${GCOIN_SYMBOL}`
                  : `Vender ${GCOIN_SYMBOL}`}
        </button>

        {isFiat ? (
          status === "done" ? (
            <p className="rounded-md border border-bull/40 bg-bull/10 p-3 text-[11px] leading-5 text-bull">
              Depósito simulado por {formatNumber(value, 0)} {inputSymbol}. La liberación de{" "}
              {formatNumber(quotedOutput, 4)} {outputSymbol} se hará al confirmarse la transferencia
              bancaria; también podés comprar directo en{" "}
              <a href={PUMPFUN_URL} target="_blank" rel="noreferrer" className="underline">
                pump.fun
              </a>
              .
            </p>
          ) : (
            <p className="text-[10px] leading-4 text-muted-foreground">
              Los pagos en guaraníes o dólares son una simulación de pasarela: no se mueve dinero
              real.
            </p>
          )
        ) : (
          <p className="text-[10px] leading-4 text-muted-foreground">
            Operación real en Solana mainnet: firmás en tu billetera y la transacción se envía a la
            red vía Jupiter.
          </p>
        )}

        <SecurityCodeModal
          open={askCode}
          title="Confirmar operación"
          summary={`Vas a operar ${formatNumber(value, isFiat ? 0 : 4)} ${inputSymbol} (${formatUsd(usdValue)}). Comisión de plataforma ${(PLATFORM_FEE_RATE * 100).toFixed(1)}%.`}
          onCancel={() => setAskCode(false)}
          onVerified={() => {
            setAskCode(false);
            void handleAction();
          }}
        />

        <PaymentReceipt receipt={receipt} onClose={() => setReceipt(null)} />

        <SwapStatusModal
          status={swapStatus}
          details={swapDetails}
          onClose={() => setSwapStatus("idle")}
          onRetry={() => void handleAction()}
          retryDisabled={inFlight.current}
        />
      </div>

      {walletNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Conectar Phantom">
          <div className="panel-surface w-full max-w-md p-5">
            <div className="flex items-start justify-between gap-4">
              <ShieldCheck className="size-8 text-primary" />
              <button type="button" onClick={() => setWalletNotice(false)} aria-label="Cerrar aviso" className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">Firma segura con Phantom</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Por favor, conecta tu billetera Phantom de Solana para firmar la transacción a través de Jupiter.</p>
            <button type="button" onClick={() => { setWalletNotice(false); onConnect(); }} className="mt-5 w-full rounded-md bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">Conectar Phantom / Solflare</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
