// Reglas comerciales de la plataforma GCOIN.

/** Monto mínimo por operación, en dólares. */
export const MIN_TX_USD = 6;

/** Comisión administrativa de plataforma. */
export const PLATFORM_FEE_RATE = 0.025;

/** Billetera maestra: destino de pagos directos y depósitos en SOL. */
export const MASTER_WALLET = "GhxXDcvtUoBZfoxumMqUiUg9hXbi3W5rcC9ViskzGrdx";

/** Costo de despliegue de un token nuevo, en dólares. */
export const TOKEN_DEPLOY_COST_USD = 6;

export function platformFeeUsd(usd: number) {
  return usd * PLATFORM_FEE_RATE;
}

export function meetsMinimum(usd: number) {
  return usd >= MIN_TX_USD;
}

/** Genera un código de verificación de 6 dígitos. */
export function generateSecurityCode() {
  const bytes = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 1e9);
  }
  return String(100000 + ((bytes[0] ?? 0) % 900000));
}
