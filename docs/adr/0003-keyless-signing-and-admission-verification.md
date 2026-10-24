# ADR 0003: Keyless image signing, verified at admission

**Status:** Accepted

## Context

Scanning images proves they were safe when scanned. It doesn't prove the image
running in the cluster is the one that was scanned.

## Decision

- Sign every released image with **cosign keyless** (Sigstore Fulcio + Rekor),
  using the GitHub Actions OIDC identity of `release.yml` on `main`.
- Attach the SPDX SBOM as a signed attestation.
- **Kyverno** verifies the signature and the exact signer identity before a pod
  is admitted, authenticating to ECR with an EKS Pod Identity role.

## Why keyless

There are no private keys to store, rotate or leak. Trust is anchored to *which
workflow, in which repository, on which branch* produced the image, and every
signature is publicly recorded in a transparency log.

## Rollout

The policy starts in `Audit` and moves to `Enforce` after the first signed
release is verified (procedure in `docs/supply-chain.md`). This is the same
audit-then-enforce pattern used for the auto-remediations in
`aws-security-guardrails-detection`.
