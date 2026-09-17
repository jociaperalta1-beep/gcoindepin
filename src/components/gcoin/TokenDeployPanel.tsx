import "@/lib/buffer-polyfill";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AlertTriangle, Coins, Loader2, Rocket } from "lucide-react";
import { useState } from "react";

import { PaymentReceipt, type ReceiptData } from "./PaymentReceipt";
import { SecurityCodeModal } from "./SecurityCodeModal";
import { formatNumber, formatUsd } from "@/lib/gcoin";
import { MASTER_WALLET, TOKEN_DEPLOY_COST_USD, platformFeeUsd } from "@/lib/platform";

/** Herramienta "Deploy Your Token": crea un token en Solana por $6 USD. */
export function TokenDeployPanel({ solPriceUsd }: { solPriceUsd: number }) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("1000000000");
  const [askCode, setAskCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const costSol = solPriceUsd > 0 ? TOKEN_DEPLOY_COST_USD / solPriceUsd : 0;
  const feeUsd = platformFeeUsd(TOKEN_DEPLOY_COST_USD);
  const valid = name.trim().length >= 2 && symbol.trim().length >= 2 && Number(supply) > 0;

  async function pay() {
    if (!publicKey || costSol <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(MASTER_WALLET),
          lamports: Math.round(costSol * LAMPORTS_PER_SOL),
        }),
      );
      const latest = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latest.blockhash;
      transaction.feePayer = publicKey;
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      setReceipt({
        signature,
        paidLabel: `◎ ${formatNumber(costSol, 4)} SOL`,
        totalUsd: TOKEN_DEPLOY_COST_USD,
        feeUsd,
        gcoinAmount: 0,
        route: `Despliegue de token ${symbol.toUpperCase()} · ${formatNumber(Number(supply), 0)} unidades`,
        date: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        /reject|denied|cancel/i.test(message)
          ? "Cancelaste la firma en la billetera."
          : /insufficient|0x1\b/i.test(message)
            ? "Fondos insuficientes en SOL para cubrir el despliegue."
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-surface p-4">
      <div className="flex items-center gap-2 text-primary">
        <Rocket className="size-4" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.25em]">Deploy Your Token</h2>
      </div>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
        Creá tu propio token en Solana. Costo de despliegue: {formatUsd(TOKEN_DEPLOY_COST_USD)} (≈ ◎
        {formatNumber(costSol, 4)} SOL) pagados a la billetera maestra.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Nombre del token">
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 32))}
            placeholder="Guarani Energy"
            aria-label="Nombre del token"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="Símbolo">
          <input
            value={symbol}
            onChange={(event) =>
              setSymbol(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))
            }
            placeholder="GNRG"
            aria-label="Símbolo del token"
            className="w-full bg-transparent text-sm font-bold tracking-widest text-foreground outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="Suministro total">
          <input
            value={supply}
            onChange={(event) => setSupply(event.target.value.replace(/\D/g, "").slice(0, 15))}
            inputMode="numeric"
            aria-label="Suministro total"
            className="w-full bg-transparent text-sm tabular-nums text-foreground outline-none"
          />
        </Field>
      </div>

      <dl className="mt-4 space-y-1.5 rounded-md border border-border bg-background/30 p-3 text-[11px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Costo de despliegue</dt>
          <dd className="tabular-nums text-foreground">{formatUsd(TOKEN_DEPLOY_COST_USD)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Comisión de plataforma (2.5%)</dt>
          <dd className="tabular-nums text-foreground">{formatUsd(feeUsd)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Destino</dt>
          <dd className="truncate tabular-nums text-foreground">
            {MASTER_WALLET.slice(0, 6)}…{MASTER_WALLET.slice(-6)}
          </dd>
        </div>
      </dl>

      {error ? (
        <p className="mt-3 flex items-center gap-2 rounded border border-bear/50 bg-bear/10 px-2 py-1.5 text-[11px] font-semibold text-bear">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!valid || busy || !connected}
        onClick={() => setAskCode(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
        {connected ? "Desplegar token" : "Conectá tu billetera"}
      </button>

      <SecurityCodeModal
        open={askCode}
        title="Confirmar despliegue de token"
        summary={`Vas a pagar ${formatUsd(TOKEN_DEPLOY_COST_USD)} (≈ ◎${formatNumber(costSol, 4)} SOL) para crear ${symbol || "tu token"}.`}
        onCancel={() => setAskCode(false)}
        onVerified={() => {
          setAskCode(false);
          void pay();
        }}
      />
      <PaymentReceipt receipt={receipt} onClose={() => setReceipt(null)} />
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1 rounded-md border border-border bg-secondary/40 px-3 py-2.5">
        {children}
      </div>
    </label>
  );
}
