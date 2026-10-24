// HTTP routing and business rules for orders-api.
//
//   GET  /healthz   liveness  (process is up)
//   GET  /readyz    readiness (ready to take traffic)
//   GET  /metrics   Prometheus metrics
//   GET  /orders    list orders created by this replica
//   POST /orders    {"productId": "p-100", "quantity": 2} -> 201 with total
//
// Defensive defaults: body size limit, strict JSON + schema checks, security
// headers on every response, and no stack traces in error responses.

import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { CatalogClient } from "./catalog-client.ts";
import { Metrics } from "./metrics.ts";

export interface Order {
  id: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  createdAt: string;
}

export interface AppDeps {
  catalog: CatalogClient;
  maxBodyBytes: number;
  metrics?: Metrics;
  log?: (entry: Record<string, unknown>) => void;
}

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
};

function send(res: ServerResponse, status: number, body: unknown, contentType = "application/json"): void {
  const payload = contentType === "application/json" ? JSON.stringify(body) : String(body);
  res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": contentType });
  res.end(payload);
}

async function readJson(req: IncomingMessage, limit: number): Promise<unknown> {
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) {
    throw new HttpError(415, "content-type must be application/json");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new HttpError(413, `body exceeds ${limit} bytes`);
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "body is not valid JSON");
  }
}

export function validateOrderInput(input: unknown): { productId: string; quantity: number } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new HttpError(400, "body must be a JSON object");
  }
  const { productId, quantity } = input as Record<string, unknown>;
  if (typeof productId !== "string" || !/^[a-z0-9-]{1,40}$/.test(productId)) {
    throw new HttpError(400, "productId must be 1-40 chars of a-z, 0-9 or '-'");
  }
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new HttpError(400, "quantity must be an integer from 1 to 100");
  }
  return { productId, quantity };
}

export function createApp(deps: AppDeps): (req: IncomingMessage, res: ServerResponse) => void {
  const metrics = deps.metrics ?? new Metrics();
  const log = deps.log ?? ((entry) => console.log(JSON.stringify(entry)));
  const orders: Order[] = [];

  async function route(req: IncomingMessage, res: ServerResponse): Promise<string> {
    const path = (req.url ?? "/").split("?")[0];
    const method = req.method ?? "GET";

    if (method === "GET" && path === "/healthz") {
      send(res, 200, { status: "ok" });
      return path;
    }
    if (method === "GET" && path === "/readyz") {
      send(res, 200, { status: "ready" });
      return path;
    }
    if (method === "GET" && path === "/metrics") {
      send(res, 200, metrics.render(), "text/plain; version=0.0.4");
      return path;
    }
    if (path === "/orders" && method === "GET") {
      send(res, 200, { orders });
      return path;
    }
    if (path === "/orders" && method === "POST") {
      const { productId, quantity } = validateOrderInput(await readJson(req, deps.maxBodyBytes));
      const lookup = await deps.catalog.getProduct(productId);
      if (lookup.kind === "not_found") throw new HttpError(404, `unknown product ${productId}`);
      if (lookup.kind === "unavailable") throw new HttpError(502, lookup.reason);
      if (!lookup.product.inStock) throw new HttpError(409, `${productId} is out of stock`);

      const order: Order = {
        id: randomUUID(),
        productId,
        quantity,
        unitPriceCents: lookup.product.priceCents,
        totalCents: lookup.product.priceCents * quantity,
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      metrics.orderCreated();
      send(res, 201, order);
      return path;
    }
    if (path === "/orders") throw new HttpError(405, "method not allowed");
    throw new HttpError(404, "not found");
  }

  return (req, res) => {
    const started = process.hrtime.bigint();
    route(req, res)
      .catch((err: unknown) => {
        const status = err instanceof HttpError ? err.status : 500;
        const message = err instanceof HttpError ? err.message : "internal error";
        if (status >= 500) log({ level: "error", msg: "request failed", path: req.url, error: String(err) });
        send(res, status, { error: message });
        return (req.url ?? "/").split("?")[0];
      })
      .then((path) => {
        const seconds = Number(process.hrtime.bigint() - started) / 1e9;
        const knownRoute = ["/healthz", "/readyz", "/metrics", "/orders"].includes(path) ? path : "other";
        metrics.observe(req.method ?? "GET", knownRoute, res.statusCode, seconds);
        if (knownRoute !== "/healthz" && knownRoute !== "/readyz" && knownRoute !== "/metrics") {
          log({ level: "info", method: req.method, path, status: res.statusCode, ms: Math.round(seconds * 1000) });
        }
      });
  };
}
