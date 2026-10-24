// Runtime configuration, read once from the environment (12-factor).

export interface Config {
  port: number;
  catalogUrl: string;
  catalogTimeoutMs: number;
  maxBodyBytes: number;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    port: intFromEnv("PORT", 3000),
    catalogUrl: (process.env.CATALOG_URL ?? "http://catalog-service:8080").replace(/\/+$/, ""),
    catalogTimeoutMs: intFromEnv("CATALOG_TIMEOUT_MS", 2000),
    maxBodyBytes: intFromEnv("MAX_BODY_BYTES", 10_240),
  };
}
