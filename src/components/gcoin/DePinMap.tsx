import { Activity, Globe2, Radio, Wifi } from "lucide-react";
import { useMemo, useState } from "react";

import { GCOIN_SYMBOL, formatNumber } from "@/lib/gcoin";
import { cn } from "@/lib/utils";

type Region = "Latinoamérica" | "Norteamérica" | "Europa" | "Asia" | "Oceanía";

type Node = {
  id: string;
  city: string;
  country: string;
  region: Region;
  lat: number;
  lng: number;
  genesis?: boolean;
  peers: number;
  latency: number;
  bandwidth: number; // Mbps compartidos
  sharedGb: number; // GB compartidos acumulados
  uptime: number;
  rewards: number; // GCOIN acumulados
};

export const DEPIN_NODES: Node[] = [
  { id: "asu", city: "Asunción", country: "Paraguay", region: "Latinoamérica", lat: -25.3, lng: -57.6, genesis: true, peers: 412, latency: 24, bandwidth: 320, sharedGb: 18420, uptime: 99.4, rewards: 184_200 },
  { id: "cde", city: "Ciudad del Este", country: "Paraguay", region: "Latinoamérica", lat: -25.5, lng: -54.6, genesis: true, peers: 268, latency: 31, bandwidth: 245, sharedGb: 12180, uptime: 98.7, rewards: 121_800 },
  { id: "chaco", city: "Chaco Central", country: "Paraguay", region: "Latinoamérica", lat: -22.3, lng: -60.0, genesis: true, peers: 96, latency: 58, bandwidth: 110, sharedGb: 4360, uptime: 96.2, rewards: 43_600 },
  { id: "sao", city: "São Paulo", country: "Brasil", region: "Latinoamérica", lat: -23.5, lng: -46.6, peers: 620, latency: 28, bandwidth: 540, sharedGb: 26800, uptime: 99.1, rewards: 268_000 },
  { id: "bue", city: "Buenos Aires", country: "Argentina", region: "Latinoamérica", lat: -34.6, lng: -58.4, peers: 388, latency: 33, bandwidth: 300, sharedGb: 15240, uptime: 98.5, rewards: 152_400 },
  { id: "mex", city: "Ciudad de México", country: "México", region: "Latinoamérica", lat: 19.4, lng: -99.1, peers: 455, latency: 41, bandwidth: 360, sharedGb: 17960, uptime: 98.9, rewards: 179_600 },
  { id: "mia", city: "Miami", country: "EE. UU.", region: "Norteamérica", lat: 25.8, lng: -80.2, peers: 720, latency: 18, bandwidth: 780, sharedGb: 34100, uptime: 99.6, rewards: 341_000 },
  { id: "tor", city: "Toronto", country: "Canadá", region: "Norteamérica", lat: 43.7, lng: -79.4, peers: 410, latency: 22, bandwidth: 420, sharedGb: 19800, uptime: 99.2, rewards: 198_000 },
  { id: "mad", city: "Madrid", country: "España", region: "Europa", lat: 40.4, lng: -3.7, peers: 505, latency: 26, bandwidth: 480, sharedGb: 22350, uptime: 99.3, rewards: 223_500 },
  { id: "fra", city: "Frankfurt", country: "Alemania", region: "Europa", lat: 50.1, lng: 8.7, peers: 860, latency: 14, bandwidth: 910, sharedGb: 41250, uptime: 99.8, rewards: 412_500 },
  { id: "sgp", city: "Singapur", country: "Singapur", region: "Asia", lat: 1.3, lng: 103.8, peers: 640, latency: 29, bandwidth: 660, sharedGb: 29400, uptime: 99.5, rewards: 294_000 },
  { id: "tok", city: "Tokio", country: "Japón", region: "Asia", lat: 35.7, lng: 139.7, peers: 580, latency: 25, bandwidth: 600, sharedGb: 26100, uptime: 99.4, rewards: 261_000 },
  { id: "syd", city: "Sídney", country: "Australia", region: "Oceanía", lat: -33.9, lng: 151.2, peers: 295, latency: 38, bandwidth: 280, sharedGb: 13050, uptime: 98.8, rewards: 130_500 },
];

const FILTERS: Array<{ id: "global" | Region; label: string }> = [
  { id: "global", label: "Global" },
  { id: "Latinoamérica", label: "Latam" },
  { id: "Norteamérica", label: "Norteamérica" },
  { id: "Europa", label: "Europa" },
  { id: "Asia", label: "Asia" },
  { id: "Oceanía", label: "Oceanía" },
];

// Proyección equirectangular sobre un lienzo de 360 x 180
const project = (lat: number, lng: number) => ({ x: lng + 180, y: 90 - lat });

const CONTINENTS = [
  "M40,28 L118,24 L120,52 L96,74 L78,70 L58,54 L38,44 Z",
  "M104,104 L136,99 L141,126 L124,156 L111,149 L103,124 Z",
  "M168,30 L206,27 L211,54 L179,58 L166,44 Z",
  "M170,60 L206,57 L211,91 L190,126 L174,99 Z",
  "M212,24 L302,19 L312,60 L266,80 L231,70 L213,44 Z",
  "M289,114 L321,111 L326,136 L294,139 Z",
];

export function DePinMap() {
  const [filter, setFilter] = useState<"global" | Region>("global");
  const [activeId, setActiveId] = useState("asu");

  const nodes = useMemo(
    () => (filter === "global" ? DEPIN_NODES : DEPIN_NODES.filter((n) => n.region === filter)),
    [filter],
  );
  const active = nodes.find((node) => node.id === activeId) ?? nodes[0] ?? DEPIN_NODES[0]!;

  const totals = useMemo(() => {
    const totalGb = DEPIN_NODES.reduce((sum, node) => sum + node.sharedGb, 0);
    const byRegion = FILTERS.filter((f) => f.id !== "global").map((f) => {
      const list = DEPIN_NODES.filter((n) => n.region === f.id);
      return {
        label: f.label,
        nodes: list.length,
        share: (list.reduce((sum, n) => sum + n.sharedGb, 0) / totalGb) * 100,
      };
    });
    return {
      nodes: DEPIN_NODES.length,
      peers: DEPIN_NODES.reduce((sum, node) => sum + node.peers, 0),
      totalGb,
      byRegion,
    };
  }, []);

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors",
              filter === item.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric icon={Globe2} label="Nodos activos" value={String(totals.nodes)} />
        <Metric icon={Wifi} label="Ancho compartido" value={`${(totals.totalGb / 1000).toFixed(1)} TB`} />
        <Metric icon={Radio} label="Peers globales" value={formatNumber(totals.peers, 0)} />
      </div>

      <div className="relative overflow-hidden rounded-md border border-border bg-background/60">
        <svg viewBox="0 0 360 180" className="h-56 w-full" role="img" aria-label="Mapa global de nodos DePIN">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h${i}`} x1={0} x2={360} y1={i * 22.5} y2={i * 22.5} stroke="var(--grid)" strokeWidth="0.4" />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 30} x2={i * 30} y1={0} y2={180} stroke="var(--grid)" strokeWidth="0.4" />
          ))}
          {CONTINENTS.map((path) => (
            <path key={path} d={path} fill="var(--panel)" stroke="var(--border)" strokeWidth="0.6" />
          ))}

          {DEPIN_NODES.map((node) => {
            const { x, y } = project(node.lat, node.lng);
            const dimmed = filter !== "global" && node.region !== filter;
            const selected = node.id === active.id;
            return (
              <g
                key={node.id}
                onClick={() => setActiveId(node.id)}
                className="cursor-pointer"
                opacity={dimmed ? 0.25 : 1}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={selected ? 6 : 4}
                  fill="none"
                  stroke={node.genesis ? "var(--accent)" : "var(--bull)"}
                  strokeWidth="0.8"
                  className="animate-pulse"
                />
                <circle cx={x} cy={y} r={node.genesis ? 2.6 : 2} fill={node.genesis ? "var(--accent)" : "var(--bull)"} />
                {node.genesis ? (
                  <text x={x + 5} y={y + 2} style={{ fontSize: 5 }} className="fill-accent">
                    {node.city}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <p className="border-t border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          Nodos génesis fundacionales: Paraguay 🇵🇾
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => setActiveId(node.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-[11px] transition-colors",
                node.id === active.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-bold">
                {node.city}
                {node.genesis ? " ★" : ""}
              </span>
              <span className="tabular-nums">{node.latency} ms</span>
            </button>
          ))}
        </div>

        <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-[11px]">
          <p className="font-display text-sm font-bold text-foreground">
            {active.city}, {active.country}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {active.region}
            {active.genesis ? " · Nodo génesis" : ""}
          </p>
          <Telemetry label="Uptime" value={`${active.uptime}%`} />
          <Telemetry label="MB compartidos" value={`${formatNumber(active.sharedGb * 1024, 0)} MB`} />
          <Telemetry label="Ancho de banda" value={`${active.bandwidth} Mbps`} />
          <Telemetry label="Ping" value={`${active.latency} ms`} />
          <Telemetry label="Peers" value={String(active.peers)} />
          <Telemetry
            label={`Recompensas ${GCOIN_SYMBOL}`}
            value={formatNumber(active.rewards, 0)}
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-background/50 p-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Distribución del ancho de banda por región
        </p>
        <div className="mt-2 space-y-1.5">
          {totals.byRegion.map((region) => (
            <div key={region.label} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 text-muted-foreground">{region.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${region.share.toFixed(1)}%` }} />
              </div>
              <span className="w-20 text-right tabular-nums text-foreground">
                {region.share.toFixed(1)}% · {region.nodes}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-2.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-1 font-display text-base font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Activity className="size-3" /> {label}
      </span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
