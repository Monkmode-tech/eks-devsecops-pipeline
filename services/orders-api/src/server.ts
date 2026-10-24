// Entry point: wires config, the catalog client and the HTTP server, and shuts
// down gracefully on SIGTERM so Kubernetes rolling updates drop no requests.

import { createServer } from "node:http";
import { createApp } from "./app.ts";
import { createCatalogClient } from "./catalog-client.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const catalog = createCatalogClient(config.catalogUrl, config.catalogTimeoutMs);
const server = createServer(createApp({ catalog, maxBodyBytes: config.maxBodyBytes }));

server.headersTimeout = 10_000;
server.requestTimeout = 15_000;

server.listen(config.port, () => {
  console.log(JSON.stringify({ level: "info", msg: "orders-api listening", port: config.port, catalog: config.catalogUrl }));
});

function shutdown(signal: string): void {
  console.log(JSON.stringify({ level: "info", msg: "shutting down", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
