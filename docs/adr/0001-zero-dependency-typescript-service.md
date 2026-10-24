# ADR 0001: orders-api in TypeScript with zero runtime dependencies

**Status:** Accepted

## Context

A typical Express + TypeScript service pulls in hundreds of transitive npm
packages, each one a potential vulnerability or supply-chain compromise, plus a
build step to compile TypeScript.

## Decision

- Node.js 24 runs `.ts` files directly (type stripping), so there is **no
  build step and no transpiled output**.
- Use only Node's standard library: `node:http`, `fetch`, `AbortSignal.timeout`,
  `node:crypto`, and the built-in test runner `node:test`.
- Expose Prometheus metrics with a ~60-line hand-written exporter instead of a client library.
- Type checking still runs in CI (`tsc --noEmit`, installed only in the CI job).

## Consequences

- The image is Node.js plus our source code. Trivy has nothing third-party to flag.
- Restricted to TypeScript syntax that can be erased (no enums or parameter
  properties); enforced with `erasableSyntaxOnly`.
- For a larger service I would add a framework, a lockfile and Dependabot for
  npm. The trade-off here is deliberate, to show supply-chain minimisation.
