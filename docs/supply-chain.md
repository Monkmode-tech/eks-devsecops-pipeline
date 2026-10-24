# Software supply chain

**Goal:** the cluster runs exactly the code that passed review and scanning,
and can prove it.

## Chain of custody

1. **Source:** a merged commit on `main` (branch protection + required CI).
2. **Build:** GitHub-hosted runner builds the image from that commit.
3. **Identity:** the workflow requests a short-lived OIDC token. AWS exchanges
   it for a role that can push to *only* this project's two ECR repositories.
4. **Immutable storage:** ECR tag immutability means `:<sha>` can never be
   repointed. Everything downstream uses the **digest** anyway.
5. **Scan:** Trivy re-scans the pushed digest.
6. **Sign:** `cosign sign` with **keyless** Sigstore signing. The certificate
   binds the signature to the identity
   `https://github.com/Monkmode-tech/eks-devsecops-pipeline/.github/workflows/release.yml@refs/heads/main`,
   recorded in the public Rekor transparency log. There are no signing keys to steal or rotate.
7. **SBOM:** an SPDX SBOM is attached to the image as a signed attestation.
8. **Promote:** the digest is pinned in `k8s/overlays/dev/kustomization.yaml`.
9. **Verify:** Kyverno's `verify-image-signatures` policy checks the
   signature and identity at admission, using a Pod Identity role to read ECR.

## Verify an image yourself

```bash
cosign verify \
  --certificate-identity "https://github.com/Monkmode-tech/eks-devsecops-pipeline/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  <account>.dkr.ecr.us-east-2.amazonaws.com/devsecops/orders-api@sha256:<digest>

cosign verify-attestation --type spdxjson \
  --certificate-identity-regexp "https://github.com/Monkmode-tech/eks-devsecops-pipeline/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  <image>@sha256:<digest> | jq -r '.payload' | base64 -d | jq '.predicate.packages | length'
```

## Rolling out signature enforcement

The policy ships in **Audit** mode so the very first deployment (before any
signed image exists) isn't blocked. After the first release:

1. `kubectl get policyreport -n shop` shows the signature checks passing.
2. Change `validationFailureAction: Audit` to `Enforce` in
   `gitops/policies/kyverno-policies.yaml` and merge.
3. Prove it: try to run an unsigned image with the same name pattern; it is rejected.

## Minimal attack surface by design

- **orders-api has zero third-party runtime dependencies.** TypeScript runs
  natively on Node.js 24 (type stripping), so there's no `node_modules` in the
  image to carry vulnerabilities ([ADR 0001](adr/0001-zero-dependency-typescript-service.md)).
- **catalog-service** ships a JRE-only runtime image; Maven and the JDK stay in the build stage.
- Both run as UID 10001 with a read-only root filesystem and no Linux capabilities.
