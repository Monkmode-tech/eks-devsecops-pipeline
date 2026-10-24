import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp, type Order, validateOrderInput } from "../src/app.ts";
import { createCatalogClient, type CatalogClient, type LookupResult } from "../src/catalog-client.ts";

const products: Record<string, LookupResult> = {
  "p-100": { kind: "found", product: { id: "p-100", name: "Keyboard", priceCents: 4999, inStock: true } },
  "p-200": { kind: "found", product: { id: "p-200", name: "Monitor", priceCents: 18999, inStock: false } },
};

const fakeCatalog: CatalogClient = {
  async getProduct(id) {
    if (id === "p-down") return { kind: "unavailable", reason: "catalog timed out" };
    return products[id] ?? { kind: "not_found" };
  },
};

let server: Server;
let base: string;

before(async () => {
  server = createServer(createApp({ catalog: fakeCatalog, maxBodyBytes: 256, log: () => {} }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

function post(body: unknown, contentType = "application/json") {
  return fetch(`${base}/orders`, {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("health and metrics", () => {
  it("liveness and readiness return 200", async () => {
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    assert.equal((await fetch(`${base}/readyz`)).status, 200);
  });

  it("exposes Prometheus metrics including request counters", async () => {
    await fetch(`${base}/orders`);
    const text = await (await fetch(`${base}/metrics`)).text();
    assert.match(text, /# TYPE http_requests_total counter/);
    assert.match(text, /http_requests_total\{method="GET",route="\/orders",status="200"\} \d+/);
    assert.match(text, /http_request_duration_seconds_bucket\{.*le="\+Inf"\}/);
  });

  it("sets security headers on every response", async () => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.match(res.headers.get("content-security-policy") ?? "", /default-src 'none'/);
  });
});

describe("POST /orders", () => {
  it("creates an order priced from the catalog", async () => {
    const res = await post({ productId: "p-100", quantity: 3 });
    assert.equal(res.status, 201);
    const order = (await res.json()) as Order;
    assert.equal(order.unitPriceCents, 4999);
    assert.equal(order.totalCents, 14997);
    assert.match(order.id, /^[0-9a-f-]{36}$/);

    const list = (await (await fetch(`${base}/orders`)).json()) as { orders: Order[] };
    assert.ok(list.orders.some((o) => o.id === order.id));
  });

  it("returns 404 for unknown products", async () => {
    assert.equal((await post({ productId: "p-999", quantity: 1 })).status, 404);
  });

  it("returns 409 when the product is out of stock", async () => {
    assert.equal((await post({ productId: "p-200", quantity: 1 })).status, 409);
  });

  it("returns 502 (not a hang) when the catalog is unavailable", async () => {
    const res = await post({ productId: "p-down", quantity: 1 });
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: "catalog timed out" });
  });

  it("rejects invalid input with 400 and no internal details", async () => {
    for (const bad of [{ productId: "P_100", quantity: 1 }, { productId: "p-100", quantity: 0 }, { quantity: 2 }, [1, 2]]) {
      const res = await post(bad);
      assert.equal(res.status, 400, JSON.stringify(bad));
      const body = (await res.json()) as Record<string, unknown>;
      assert.ok(!("stack" in body));
    }
  });

  it("rejects malformed JSON, wrong content type and oversized bodies", async () => {
    assert.equal((await post("{not json")).status, 400);
    assert.equal((await post({ productId: "p-100", quantity: 1 }, "text/plain")).status, 415);
    assert.equal((await post({ productId: "p-100", quantity: 1, pad: "x".repeat(500) })).status, 413);
  });

  it("returns 405 for unsupported methods and 404 for unknown paths", async () => {
    assert.equal((await fetch(`${base}/orders`, { method: "DELETE" })).status, 405);
    assert.equal((await fetch(`${base}/admin`)).status, 404);
  });
});

describe("validateOrderInput", () => {
  it("accepts a valid order", () => {
    assert.deepEqual(validateOrderInput({ productId: "p-1", quantity: 100 }), { productId: "p-1", quantity: 100 });
  });

  it("rejects quantities above the limit", () => {
    assert.throws(() => validateOrderInput({ productId: "p-1", quantity: 101 }));
  });
});

describe("catalog client", () => {
  it("maps 404, 5xx, bad payloads and timeouts", async () => {
    const respond = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });
    const notFound = createCatalogClient("http://x", 50, respond(404, {}));
    assert.deepEqual(await notFound.getProduct("a"), { kind: "not_found" });

    const broken = createCatalogClient("http://x", 50, respond(500, {}));
    assert.equal((await broken.getProduct("a")).kind, "unavailable");

    const weird = createCatalogClient("http://x", 50, respond(200, { nope: true }));
    assert.equal((await weird.getProduct("a")).kind, "unavailable");

    const slow = createCatalogClient("http://x", 20, (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init?.signal?.reason));
      }));
    assert.deepEqual(await slow.getProduct("a"), { kind: "unavailable", reason: "catalog timed out" });
  });

  it("parses a valid product and URL-encodes the id", async () => {
    let seen = "";
    const client = createCatalogClient("http://catalog", 50, async (url) => {
      seen = String(url);
      return new Response(JSON.stringify({ id: "p-1", name: "Mouse", priceCents: 1999, inStock: true }));
    });
    const result = await client.getProduct("p 1");
    assert.equal(seen, "http://catalog/products/p%201");
    assert.equal(result.kind, "found");
  });
});
