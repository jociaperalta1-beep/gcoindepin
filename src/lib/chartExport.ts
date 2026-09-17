import type { Drawing } from "@/components/gcoin/DrawingCanvas";

/** Versión del esquema de trazados exportado (permite migrar en el futuro). */
export const DRAWINGS_SCHEMA_VERSION = 1;

export type DrawingsFile = {
  version: number;
  app: "gcoin-terminal";
  createdAt: string;
  timeframe?: string;
  drawings: Drawing[];
};

const TOKENS = [
  "--grid",
  "--bull",
  "--bear",
  "--primary",
  "--primary-foreground",
  "--accent",
  "--foreground",
  "--muted-foreground",
  "--border",
  "--panel",
  "--background",
] as const;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDrawingsJson(drawings: Drawing[], timeframe?: string) {
  const payload: DrawingsFile = {
    version: DRAWINGS_SCHEMA_VERSION,
    app: "gcoin-terminal",
    createdAt: new Date().toISOString(),
    ...(timeframe ? { timeframe } : {}),
    drawings,
  };
  download(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `gcoin-analisis-${Date.now()}.json`,
  );
}

/** Acepta el formato versionado y también archivos antiguos (array plano). */
export function parseDrawingsFile(text: string): Drawing[] {
  const parsed = JSON.parse(text) as DrawingsFile | Drawing[];
  const list = Array.isArray(parsed) ? parsed : (parsed?.drawings ?? []);
  if (!Array.isArray(list)) throw new Error("Archivo de trazados inválido");
  return list.filter((item) => item && typeof item === "object" && "tool" in item) as Drawing[];
}

/** Serializa el SVG con los colores del tema resueltos para que se vea igual fuera de la app. */
export function serializeChartSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const root = getComputedStyle(document.documentElement);
  const vars = TOKENS.map((token) => `${token}:${root.getPropertyValue(token).trim()};`).join("");
  const fg = root.getPropertyValue("--foreground").trim();
  const muted = root.getPropertyValue("--muted-foreground").trim();
  const bg = root.getPropertyValue("--background").trim();

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `svg{${vars}background:${bg};font-family:ui-monospace,monospace}
    .fill-muted-foreground{fill:${muted}}
    .fill-foreground{fill:${fg}}`;

  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("width", "100%");
  bgRect.setAttribute("height", "100%");
  bgRect.setAttribute("fill", bg);

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.insertBefore(bgRect, clone.firstChild);
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

export function downloadChartSvg(svg: SVGSVGElement) {
  download(
    new Blob([serializeChartSvg(svg)], { type: "image/svg+xml" }),
    `gcoin-grafico-${Date.now()}.svg`,
  );
}

/** Exporta el gráfico completo (velas, ejes, niveles y trazos) como PNG. */
export async function downloadChartPng(
  svg: SVGSVGElement,
  overlay: HTMLCanvasElement | null,
  scale = 2,
) {
  const viewBox = svg.viewBox.baseVal;
  const width = viewBox.width || svg.clientWidth || 900;
  const height = viewBox.height || svg.clientHeight || 440;
  const source = serializeChartSvg(svg);

  const image = new Image();
  image.crossOrigin = "anonymous";
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("No se pudo rasterizar el gráfico"));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.scale(scale, scale);
  ctx.drawImage(image, 0, 0, width, height);
  if (overlay && overlay.width > 0) {
    ctx.drawImage(overlay, 0, 0, width, height);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) download(blob, `gcoin-analisis-${Date.now()}.png`);
}
