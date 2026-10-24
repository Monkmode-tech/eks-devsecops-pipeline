// Client for catalog-service (Spring Boot). Every call has a hard timeout so a
// slow dependency degrades into a fast 502 instead of piling up requests.

export interface Product {
  id: string;
  name: string;
  priceCents: number;
  inStock: boolean;
}

export type LookupResult =
  | { kind: "found"; product: Product }
  | { kind: "not_found" }
  | { kind: "unavailable"; reason: string };

export interface CatalogClient {
  getProduct(id: string): Promise<LookupResult>;
}

type FetchFn = typeof fetch;

export function createCatalogClient(baseUrl: string, timeoutMs: number, fetchFn: FetchFn = fetch): CatalogClient {
  return {
    async getProduct(id: string): Promise<LookupResult> {
      const url = `${baseUrl}/products/${encodeURIComponent(id)}`;
      try {
        const res = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (res.status === 404) return { kind: "not_found" };
        if (!res.ok) return { kind: "unavailable", reason: `catalog responded ${res.status}` };
        const body = (await res.json()) as Partial<Product>;
        if (typeof body.id !== "string" || typeof body.priceCents !== "number") {
          return { kind: "unavailable", reason: "catalog returned an unexpected payload" };
        }
        return {
          kind: "found",
          product: {
            id: body.id,
            name: String(body.name ?? body.id),
            priceCents: body.priceCents,
            inStock: body.inStock !== false,
          },
        };
      } catch (err) {
        const reason = err instanceof Error && err.name === "TimeoutError" ? "catalog timed out" : "catalog unreachable";
        return { kind: "unavailable", reason };
      }
    },
  };
}
