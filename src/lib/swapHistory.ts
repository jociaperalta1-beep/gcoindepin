import { useEffect, useState } from "react";

export type SwapRecord = {
  id: string;
  timestamp: number;
  pair: string;
  amountIn: number;
  symbolIn: string;
  amountOut: number;
  symbolOut: string;
  route: string;
  slippage: number;
  status: "success" | "error";
  signature: string | null;
  error: string | null;
};

const KEY = "gcoin-swap-history";
const EVENT = "gcoin-swap-history-change";
const LIMIT = 100;
export const SWAP_HISTORY_VERSION = 1;

type Envelope = { version: number; records: SwapRecord[] };

function normalize(record: Partial<SwapRecord>, index: number): SwapRecord {
  return {
    id: String(record.id ?? `legacy-${index}`),
    timestamp: Number(record.timestamp ?? Date.now()),
    pair: String(record.pair ?? "GCOIN/SOL"),
    amountIn: Number(record.amountIn ?? 0),
    symbolIn: String(record.symbolIn ?? ""),
    amountOut: Number(record.amountOut ?? 0),
    symbolOut: String(record.symbolOut ?? ""),
    route: String(record.route ?? "Jupiter Aggregator"),
    slippage: Number(record.slippage ?? 0),
    status: record.status === "error" ? "error" : "success",
    signature: record.signature ?? null,
    error: record.error ?? null,
  };
}

export function loadSwapHistory(): SwapRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Envelope | SwapRecord[];
    const list = Array.isArray(parsed) ? parsed : (parsed.records ?? []);
    return list.map(normalize).sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

function save(records: SwapRecord[]) {
  try {
    const envelope: Envelope = {
      version: SWAP_HISTORY_VERSION,
      records: records.slice(0, LIMIT),
    };
    window.localStorage.setItem(KEY, JSON.stringify(envelope));
  } catch {
    /* almacenamiento no disponible */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addSwapRecord(record: Omit<SwapRecord, "id" | "timestamp">) {
  const entry: SwapRecord = { ...record, id: `${Date.now()}`, timestamp: Date.now() };
  save([entry, ...loadSwapHistory()]);
  return entry;
}

export function clearSwapHistory() {
  save([]);
}

/** Historial reactivo compartido entre componentes de la terminal. */
export function useSwapHistory() {
  const [records, setRecords] = useState<SwapRecord[]>([]);

  useEffect(() => {
    const sync = () => setRecords(loadSwapHistory());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return records;
}
