// Silueta simplificada del territorio paraguayo (coordenadas lon/lat proyectadas).
const BORDER: Array<[number, number]> = [
  [-62.64, -22.25],
  [-61.5, -19.65],
  [-59.95, -19.3],
  [-58.15, -19.8],
  [-57.8, -20.9],
  [-57.9, -22.1],
  [-56.5, -22.1],
  [-55.75, -22.3],
  [-55.0, -23.95],
  [-54.6, -25.6],
  [-54.26, -25.55],
  [-54.6, -26.0],
  [-54.65, -27.0],
  [-55.7, -27.4],
  [-56.4, -27.5],
  [-57.6, -27.4],
  [-58.6, -27.15],
  [-58.65, -25.9],
  [-57.9, -25.1],
  [-57.7, -23.0],
  [-59.0, -22.3],
  [-60.0, -21.9],
  [-61.0, -22.0],
];

const LON_MIN = -62.8;
const LON_MAX = -54.1;
const LAT_MAX = -19.1;
const LAT_MIN = -27.7;

const path = `${BORDER.map(([lon, lat], index) => {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 100;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
  return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
}).join(" ")} Z`;

export function ParaguayMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Mapa de Paraguay"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="py-flag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.58 0.21 25)" />
          <stop offset="50%" stopColor="oklch(0.97 0.005 250)" />
          <stop offset="100%" stopColor="oklch(0.52 0.19 258)" />
        </linearGradient>
      </defs>
      <path d={path} fill="url(#py-flag)" stroke="var(--foreground)" strokeWidth={0.8} />
      <circle cx="59" cy="72" r="2" fill="var(--background)" />
    </svg>
  );
}
