import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type DrawTool = "cursor" | "select" | "trend" | "horizontal" | "arrow-up" | "arrow-down";

export type Point = { x: number; y: number };

export type Drawing =
  | { id: string; type: "trend"; from: Point; to: Point }
  | { id: string; type: "horizontal"; from: Point; to: Point }
  | { id: string; type: "arrow"; direction: "up" | "down"; from: Point; to: Point };

/**
 * Capa de dibujo real en <canvas> sobre el gráfico de velas.
 * Las coordenadas se guardan normalizadas (0..1) para que los trazos
 * sigan al gráfico cuando cambia el tamaño del contenedor.
 */
export function DrawingCanvas({
  tool,
  drawings,
  selectedId,
  onSelect,
  onCommit,
  priceAt,
  snap,
}: {
  tool: DrawTool;
  drawings: Drawing[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCommit: (drawing: Drawing) => void;
  priceAt: (ratioY: number) => number | null;
  snap?: ((point: Point) => Point) | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const styles = getComputedStyle(canvas);
    const colors = {
      trend: styles.getPropertyValue("--primary").trim() || "#39ff88",
      level: styles.getPropertyValue("--accent").trim() || "#ffd166",
      up: styles.getPropertyValue("--bull").trim() || "#26d07c",
      down: styles.getPropertyValue("--bear").trim() || "#ff4d5e",
      text: styles.getPropertyValue("--muted-foreground").trim() || "#8aa",
    };

    const px = (p: Point) => ({ x: p.x * size.width, y: p.y * size.height });

    function paint(drawing: Drawing, ghost: boolean) {
      if (!ctx) return;
      const a = px(drawing.from);
      const b = px(drawing.to);
      const selected = !ghost && drawing.id === selectedId;
      ctx.save();
      ctx.lineWidth = selected ? 3 : 2;
      ctx.setLineDash(ghost ? [5, 5] : []);
      if (drawing.type === "trend") {
        ctx.strokeStyle = colors.trend;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (drawing.type === "horizontal") {
        ctx.strokeStyle = colors.level;
        ctx.setLineDash(ghost ? [5, 5] : [7, 5]);
        ctx.beginPath();
        ctx.moveTo(0, b.y);
        ctx.lineTo(size.width, b.y);
        ctx.stroke();
        const price = priceAt(drawing.to.y);
        if (price !== null) {
          ctx.setLineDash([]);
          ctx.fillStyle = colors.level;
          ctx.font = "700 10px ui-monospace, monospace";
          ctx.fillText(`$${price.toPrecision(4)}`, 8, b.y - 6);
        }
      } else {
        const color = drawing.direction === "up" ? colors.up : colors.down;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        const tipY = b.y;
        const tailY = drawing.direction === "up" ? tipY + 30 : tipY - 30;
        ctx.beginPath();
        ctx.moveTo(b.x, tailY);
        ctx.lineTo(b.x, tipY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        const dir = drawing.direction === "up" ? 1 : -1;
        ctx.moveTo(b.x, tipY);
        ctx.lineTo(b.x - 6, tipY + 9 * dir);
        ctx.lineTo(b.x + 6, tipY + 9 * dir);
        ctx.closePath();
        ctx.fill();
      }
      if (selected) {
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.text;
        const x = Math.min(a.x, b.x) - 8;
        const y = Math.min(a.y, b.y) - 8;
        ctx.strokeRect(x, y, Math.abs(b.x - a.x) + 16, Math.abs(b.y - a.y) + 16);
      }
      ctx.restore();
    }

    for (const drawing of drawings) paint(drawing, false);
    if (start && current && tool !== "cursor" && tool !== "select") {
      paint(makeDrawing(tool, start, current, "ghost"), true);
    }
  }, [drawings, size, start, current, tool, priceAt, selectedId]);

  function relative(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    return snap ? snap(point) : point;
  }

  function handleDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool === "cursor") return;
    const point = relative(event);
    if (tool === "select") {
      onSelect(hitTest(drawings, point));
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setStart(point);
    setCurrent(point);
  }

  function handleMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!start) return;
    setCurrent(relative(event));
  }

  function handleUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!start || tool === "cursor" || tool === "select") return;
    const end = relative(event);
    onCommit(makeDrawing(tool, start, end, `${Date.now()}`));
    setStart(null);
    setCurrent(null);
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label="Capa de dibujo del gráfico"
      className="absolute inset-0 size-full"
      style={{
        pointerEvents: tool === "cursor" ? "none" : "auto",
        cursor: tool === "select" ? "pointer" : "crosshair",
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => {
        setStart(null);
        setCurrent(null);
      }}
    />
  );
}

function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

/** Devuelve el id del trazo más cercano al punto (o null si ninguno está cerca). */
export function hitTest(drawings: Drawing[], point: Point): string | null {
  let best: { id: string; distance: number } | null = null;
  for (const drawing of drawings) {
    const distance =
      drawing.type === "horizontal"
        ? Math.abs(point.y - drawing.to.y)
        : drawing.type === "arrow"
          ? Math.hypot(point.x - drawing.to.x, point.y - drawing.to.y)
          : distanceToSegment(point, drawing.from, drawing.to);
    if (!best || distance < best.distance) best = { id: drawing.id, distance };
  }
  return best && best.distance < 0.035 ? best.id : null;
}

function makeDrawing(tool: DrawTool, from: Point, to: Point, id: string): Drawing {
  if (tool === "horizontal") return { id, type: "horizontal", from, to };
  if (tool === "arrow-up") return { id, type: "arrow", direction: "up", from, to };
  if (tool === "arrow-down") return { id, type: "arrow", direction: "down", from, to };
  return { id, type: "trend", from, to };
}
