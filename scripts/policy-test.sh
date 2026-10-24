#!/usr/bin/env bash
#
# policy-test.sh - prove the admission guardrails reject unsafe workloads.
#
# Each case submits a deliberately bad Pod to the shop namespace with
# --dry-run=server (the API server runs all admission checks but stores
# nothing) and expects it to be rejected.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/docs/evidence}"
REPORT="$OUT_DIR/policy-test-$(date -u +%Y%m%dT%H%M%SZ).txt"
REGISTRY="${ECR_REGISTRY:-123456789012.dkr.ecr.us-east-2.amazonaws.com}"

mkdir -p "$OUT_DIR"
exec > >(tee "$REPORT") 2>&1

PASS=0
FAIL=0

# pod_yaml <name> <image> <runAsNonRoot> <add-resources:true|false>
pod_yaml() {
  local resources=""
  if [[ "$4" == "true" ]]; then
    resources='
      resources:
        requests: {cpu: 10m, memory: 16Mi}
        limits: {memory: 32Mi}'
  fi
  cat <<YAML
apiVersion: v1
kind: Pod
metadata:
  name: $1
  namespace: shop
spec:
  securityContext:
    runAsNonRoot: $3
    seccompProfile: {type: RuntimeDefault}
  containers:
    - name: c
      image: $2
      securityContext:
        allowPrivilegeEscalation: false
        capabilities: {drop: ["ALL"]}$resources
YAML
}

expect_rejected() {
  local description="$1" yaml="$2" output
  if output="$(kubectl apply --dry-run=server -f - <<<"$yaml" 2>&1)"; then
    printf 'FAIL  %s (was admitted)\n' "$description"; FAIL=$((FAIL + 1))
  else
    printf 'PASS  %s\n      -> %s\n' "$description" "$(head -c 220 <<<"$output" | tr '\n' ' ')"
    PASS=$((PASS + 1))
  fi
}

echo "Admission policy test - $(date -u '+%Y-%m-%d %H:%M:%SZ')"
echo "------------------------------------------------------------------------"
expect_rejected "image with :latest tag (Kyverno disallow-latest-tag)" \
  "$(pod_yaml bad-latest "$REGISTRY/devsecops/orders-api:latest" true true)"
expect_rejected "image from Docker Hub (Kyverno restrict-image-registries)" \
  "$(pod_yaml bad-registry "docker.io/library/nginx:1.27" true true)"
expect_rejected "container without resource requests (Kyverno require-requests-limits)" \
  "$(pod_yaml bad-resources "$REGISTRY/devsecops/orders-api:1.0.0" true false)"
expect_rejected "container allowed to run as root (Pod Security Admission: restricted)" \
  "$(pod_yaml bad-root "$REGISTRY/devsecops/orders-api:1.0.0" false true)"
echo "------------------------------------------------------------------------"
echo "Result: $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]]
