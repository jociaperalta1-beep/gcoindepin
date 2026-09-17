// Configuración de Google AdSense y control de anuncios del terminal GCOIN.

export const DEFAULT_ADSENSE_CLIENT = "ca-pub-7914447141570499";

const CLIENT_KEY = "gcoin-adsense-client";
const LAST_SHOWN_KEY = "gcoin-interstitial-last-shown";
export const INTERSTITIAL_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos

/** Acepta "ca-pub-" + 16 dígitos, o directamente los dígitos. */
export function normalizeClientId(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/^ca-pub-/i, "");
  if (!/^\d{10,16}$/.test(digits)) return null;
  return `ca-pub-${digits}`;
}

export function getAdsenseClient(): string {
  if (typeof window === "undefined") return DEFAULT_ADSENSE_CLIENT;
  const stored = window.localStorage.getItem(CLIENT_KEY);
  return (stored && normalizeClientId(stored)) || DEFAULT_ADSENSE_CLIENT;
}

export function setAdsenseClient(value: string): string | null {
  const normalized = normalizeClientId(value);
  if (!normalized || typeof window === "undefined") return null;
  window.localStorage.setItem(CLIENT_KEY, normalized);
  return normalized;
}

export function canShowInterstitial(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(LAST_SHOWN_KEY);
  const last = raw ? Number(raw) : 0;
  if (!Number.isFinite(last) || last <= 0) return true;
  return Date.now() - last > INTERSTITIAL_COOLDOWN_MS;
}

export function markInterstitialShown() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
}

/** Bloqueo de seguridad: nunca mostrar anuncios con un swap o firma en curso. */
let swapBusy = false;
const listeners = new Set<(busy: boolean) => void>();

export function setSwapBusy(busy: boolean) {
  swapBusy = busy;
  listeners.forEach((listener) => listener(busy));
}

export function isSwapBusy() {
  return swapBusy;
}

export function subscribeSwapBusy(listener: (busy: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type AdScriptState = "ready" | "blocked";

/**
 * Carga el script oficial de AdSense una sola vez y avisa si un adblocker lo bloquea,
 * para que la interfaz nunca quede trabada esperando el anuncio.
 */
export function loadAdsenseScript(client: string, onState?: (state: AdScriptState) => void) {
  if (typeof document === "undefined") return;
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  const w = window as unknown as { adsbygoogle?: unknown[] };

  if (existing) {
    if (w.adsbygoogle) onState?.("ready");
    else {
      existing.addEventListener("load", () => onState?.("ready"), { once: true });
      existing.addEventListener("error", () => onState?.("blocked"), { once: true });
    }
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.crossOrigin = "anonymous";
  script.addEventListener("load", () => onState?.("ready"), { once: true });
  script.addEventListener("error", () => {
    console.info("[GCOIN] AdSense bloqueado o no disponible; se continúa sin anuncios.");
    onState?.("blocked");
  }, { once: true });
  document.head.appendChild(script);
}

export function pushAd() {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] };
    w.adsbygoogle = w.adsbygoogle ?? [];
    w.adsbygoogle.push({});
  } catch {
    /* bloqueador de anuncios o script no disponible */
  }
}
