import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileJson,
  Image as ImageIcon,
  Magnet,
  Minus,
  MousePointer2,
  MousePointerClick,
  Redo2,
  Trash2,
  TrendingUp,
  Undo2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { DrawingCanvas, type Drawing, type DrawTool, type Point } from "./DrawingCanvas";
import {
  downloadChartPng,
  downloadChartSvg,
  downloadDrawingsJson,
  parseDrawingsFile,
} from "@/lib/chartExport";
import { formatNumber, formatUsd, type Candle, type Timeframe } from "@/lib/gcoin";
import { cn } from "@/lib/utils";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "1h"];

const W = 900;
const H = 440;
const PAD_L = 12;
const PAD_R = 76;
const PAD_T = 16;
const PRICE_H = 300;
const VOL_TOP = PAD_T + PRICE_H + 24;
const VOL_H = 70;

const STORAGE_KEY = "gcoin-chart-drawings";

const TOOLS: Array<{ id: DrawTool; label: string; icon: typeof Minus }> = [
  { id: "cursor", label: "Cursor", icon: MousePointer2 },
  { id: "select", label: "Seleccionar trazo (Supr para borrar)", icon: MousePointerClick },
  { id: "trend", label: "Línea de tendencia (clic y arrastrar)", icon: TrendingUp },
  { id: "horizontal", label: "Soporte / resistencia", icon: Minus },
  { id: "arrow-up", label: "Flecha alcista", icon: ArrowUpRight },
  { id: "arrow-down", label: "Flecha bajista", icon: ArrowDownRight },
];

export function CandleChart({
  candles,
  timeframe,
  onTimeframeChange,
  priceUsd,
  change24h,
  isLoading,
}: {
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (value: Timeframe) => void;
  priceUsd: number;
  change24h: number;
  isLoading: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [tool, setTool] = useState<DrawTool>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [redoStack, setRedoStack] = useState<Drawing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [magnet, setMagnet] = useState(true);
  const [restored, setRestored] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const overlay = areaRef.current?.querySelector("canvas") ?? null;
    await downloadChartPng(svg, overlay as HTMLCanvasElement | null);
  }

  async function importDrawings(file: File) {
    try {
      const imported = parseDrawingsFile(await file.text());
      setDrawings(imported);
      setRedoStack([]);
      setSelectedId(null);
    } catch {
      /* archivo inválido: se ignora */
    }
  }

  // Persistencia local de los trazos del usuario
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDrawings(JSON.parse(raw) as Drawing[]);
    } catch {
      /* almacenamiento no disponible */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [drawings, restored]);

  const chart = useMemo(() => {
    if (candles.length === 0) return null;
    const min = Math.min(...candles.map((c) => c.low));
    const max = Math.max(...candles.map((c) => c.high));
    const span = max - min || max || 1;
    const lo = min - span * 0.08;
    const hi = max + span * 0.08;
    const innerW = W - PAD_L - PAD_R;
    const step = innerW / candles.length;
    const body = Math.max(1.5, Math.min(14, step * 0.62));
    const maxVol = Math.max(...candles.map((c) => c.volume), 1);
    return {
      lo,
      hi,
      step,
      body,
      maxVol,
      y: (value: number) => PAD_T + ((hi - value) / (hi - lo)) * PRICE_H,
      x: (index: number) => PAD_L + step * index + step / 2,
      priceAt: (y: number) => hi - ((y - PAD_T) / PRICE_H) * (hi - lo),
    };
  }, [candles]);

  const active = hover !== null ? candles[hover] : undefined;
  const last = candles.at(-1);
  const up = change24h >= 0;

  // Convierte la posición vertical normalizada del canvas (0..1) en precio.
  const priceAtRatio = useCallback(
    (ratioY: number) => (chart ? chart.priceAt(ratioY * H) : null),
    [chart],
  );

  const commitDrawing = useCallback((drawing: Drawing) => {
    setDrawings((prev) => [...prev, drawing]);
    setRedoStack([]);
    setSelectedId(drawing.id);
  }, []);

  const undo = useCallback(() => {
    const last = drawings.at(-1);
    if (!last) return;
    setDrawings(drawings.slice(0, -1));
    setRedoStack([...redoStack, last]);
    setSelectedId(null);
  }, [drawings, redoStack]);

  const redo = useCallback(() => {
    const item = redoStack.at(-1);
    if (!item) return;
    setRedoStack(redoStack.slice(0, -1));
    setDrawings([...drawings, item]);
  }, [drawings, redoStack]);

  const deleteSelected = useCallback(() => {
    setDrawings((prev) => prev.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Imán: ajusta el trazo al máximo, mínimo o cierre de la vela más cercana.
  const snapPoint = useCallback(
    (point: Point): Point => {
      if (!chart || candles.length === 0) return point;
      const index = Math.max(
        0,
        Math.min(candles.length - 1, Math.round((point.x * W - PAD_L - chart.step / 2) / chart.step)),
      );
      const candle = candles[index];
      if (!candle) return point;
      const targetY = point.y * H;
      const best = [candle.high, candle.low, candle.close]
        .map((price) => ({ price, y: chart.y(price) }))
        .sort((a, b) => Math.abs(a.y - targetY) - Math.abs(b.y - targetY))[0];
      if (!best || Math.abs(best.y - targetY) > 24) return point;
      return { x: chart.x(index) / W, y: best.y / H };
    },
    [chart, candles],
  );

  // Atajos de teclado: Ctrl+Z deshacer, Ctrl+Y rehacer, Supr borrar seleccionado.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (meta && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        redo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteSelected, selectedId]);

  function handleMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.floor(((x - PAD_L) / (W - PAD_L - PAD_R)) * candles.length);
    setHover(index >= 0 && index < candles.length ? index : null);
  }

  return (
    <section className="panel-surface flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            GCOIN / USD · gráfico en vivo
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">
              {priceUsd ? `$${priceUsd.toPrecision(6)}` : "—"}
            </span>
            <span className={cn("text-xs font-bold", up ? "text-bull" : "text-bear")}>
              {up ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}% 24h
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-secondary/40 p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={cn(
                "rounded px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors",
                tf === timeframe
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border bg-secondary/40 p-1">
          <button
            type="button"
            title="Exportar análisis a PNG"
            aria-label="Exportar análisis a PNG"
            onClick={() => void exportPng()}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ImageIcon className="size-4" />
          </button>
          <button
            type="button"
            title="Exportar gráfico a SVG"
            aria-label="Exportar gráfico a SVG"
            onClick={() => svgRef.current && downloadChartSvg(svgRef.current)}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            title="Descargar trazados en JSON"
            aria-label="Descargar trazados en JSON"
            onClick={() => downloadDrawingsJson(drawings, timeframe)}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <FileJson className="size-4" />
          </button>
          <button
            type="button"
            title="Importar trazados guardados"
            aria-label="Importar trazados guardados"
            onClick={() => fileRef.current?.click()}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Upload className="size-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importDrawings(file);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      <div className="relative flex">
        <div className="flex flex-col gap-1 border-r border-border bg-background/40 p-1.5">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={tool === item.id}
              onClick={() => setTool(item.id)}
              className={cn(
                "rounded p-2 transition-colors",
                tool === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
            </button>
          ))}
          <button
            type="button"
            title="Imán a máximos, mínimos y cierres"
            aria-label="Imán a máximos, mínimos y cierres"
            aria-pressed={magnet}
            onClick={() => setMagnet((value) => !value)}
            className={cn(
              "rounded p-2 transition-colors",
              magnet
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Magnet className="size-4" />
          </button>
          <button
            type="button"
            title="Deshacer (Ctrl+Z)"
            aria-label="Deshacer último trazo"
            onClick={undo}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            title="Rehacer (Ctrl+Y)"
            aria-label="Rehacer trazo"
            onClick={redo}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Redo2 className="size-4" />
          </button>
          <button
            type="button"
            title="Limpiar dibujos"
            aria-label="Limpiar dibujos"
            onClick={() => {
              setDrawings([]);
              setRedoStack([]);
              setSelectedId(null);
            }}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="relative flex-1 px-2 py-2">
          {chart === null ? (
            <div className="flex h-[380px] items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
              {isLoading ? "Cargando velas…" : "Sin datos de velas para esta temporalidad"}
            </div>
          ) : (
            <div className="relative h-[380px] w-full" ref={areaRef}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="h-full w-full"
                role="img"
                aria-label="Gráfico de velas de GCOIN"
                onMouseLeave={() => setHover(null)}
                onMouseMove={handleMove}
              >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const value = chart.hi - (chart.hi - chart.lo) * ratio;
                  const y = PAD_T + PRICE_H * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={PAD_L}
                        x2={W - PAD_R}
                        y1={y}
                        y2={y}
                        stroke="var(--grid)"
                        strokeDasharray="3 5"
                      />
                      <text
                        x={W - PAD_R + 8}
                        y={y + 4}
                        className="fill-muted-foreground"
                        style={{ fontSize: 11 }}
                      >
                        ${value.toPrecision(4)}
                      </text>
                    </g>
                  );
                })}

                {candles.map((candle, index) => {
                  const bull = candle.close >= candle.open;
                  const color = bull ? "var(--bull)" : "var(--bear)";
                  const cx = chart.x(index);
                  const yOpen = chart.y(candle.open);
                  const yClose = chart.y(candle.close);
                  const top = Math.min(yOpen, yClose);
                  const height = Math.max(1.5, Math.abs(yClose - yOpen));
                  const volH = (candle.volume / chart.maxVol) * VOL_H;
                  return (
                    <g key={candle.time}>
                      <line
                        x1={cx}
                        x2={cx}
                        y1={chart.y(candle.high)}
                        y2={chart.y(candle.low)}
                        stroke={color}
                        strokeWidth={1}
                      />
                      <rect
                        x={cx - chart.body / 2}
                        y={top}
                        width={chart.body}
                        height={height}
                        fill={color}
                        opacity={hover === null || hover === index ? 1 : 0.55}
                      />
                      <rect
                        x={cx - chart.body / 2}
                        y={VOL_TOP + (VOL_H - volH)}
                        width={chart.body}
                        height={volH}
                        fill={color}
                        opacity={0.35}
                      />
                    </g>
                  );
                })}

                {last ? (
                  <g>
                    <line
                      x1={PAD_L}
                      x2={W - PAD_R}
                      y1={chart.y(last.close)}
                      y2={chart.y(last.close)}
                      stroke="var(--primary)"
                      strokeDasharray="4 4"
                    />
                    <rect
                      x={W - PAD_R + 2}
                      y={chart.y(last.close) - 10}
                      width={70}
                      height={20}
                      rx={3}
                      fill="var(--primary)"
                    />
                    <text
                      x={W - PAD_R + 8}
                      y={chart.y(last.close) + 4}
                      className="fill-primary-foreground"
                      style={{ fontSize: 11, fontWeight: 700 }}
                    >
                      ${last.close.toPrecision(4)}
                    </text>
                  </g>
                ) : null}

                {hover !== null && active ? (
                  <line
                    x1={chart.x(hover)}
                    x2={chart.x(hover)}
                    y1={PAD_T}
                    y2={VOL_TOP + VOL_H}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="2 4"
                  />
                ) : null}

                <text
                  x={PAD_L}
                  y={VOL_TOP - 8}
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  VOLUMEN
                </text>
              </svg>

              <DrawingCanvas
                tool={tool}
                drawings={drawings}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCommit={commitDrawing}
                priceAt={priceAtRatio}
                snap={magnet ? snapPoint : undefined}
              />
            </div>
          )}

          {active ? (
            <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-background/90 px-3 py-2 text-[11px] leading-5">
              <p className="text-muted-foreground">
                {new Date(active.time).toLocaleString("es-PY", { hour12: false })}
              </p>
              <p>
                A <span className="text-foreground">{active.open.toPrecision(5)}</span> · M{" "}
                <span className="text-bull">{active.high.toPrecision(5)}</span> · m{" "}
                <span className="text-bear">{active.low.toPrecision(5)}</span> · C{" "}
                <span className="text-foreground">{active.close.toPrecision(5)}</span>
              </p>
              <p className="text-muted-foreground">Vol {formatUsd(active.volume)}</p>
            </div>
          ) : null}

          {tool !== "cursor" ? (
            <p className="pointer-events-none absolute bottom-3 left-4 text-[10px] uppercase tracking-widest text-muted-foreground">
              clic y arrastrá sobre el gráfico para trazar · {formatNumber(drawings.length, 0)}{" "}
              dibujos
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
