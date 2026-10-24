#!/usr/bin/env bash
#
# smoke-test.sh - end-to-end check through the real Kubernetes Services:
# create an order (orders-api -> catalog-service over a NetworkPolicy-allowed
# path) and read the metrics. Uses port-forward, so nothing is exposed publicly.
#
set -euo pipefail

NAMESPACE="${NAMESPACE:-shop}"
LOCAL_PORT="${LOCAL_PORT:-18080}"

kubectl -n "$NAMESPACE" rollout status deploy/catalog-service --timeout=180s
kubectl -n "$NAMESPACE" rollout status deploy/orders-api --timeout=180s

kubectl -n "$NAMESPACE" port-forward svc/orders-api "$LOCAL_PORT:80" >/dev/null 2>&1 &
PF_PID=$!
trap 'kill "$PF_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 20); do
  if curl -fs "http://127.0.0.1:$LOCAL_PORT/healthz" >/dev/null; then break; fi
  sleep 1
done

echo "==> POST /orders"
response="$(curl -fs -X POST "http://127.0.0.1:$LOCAL_PORT/orders" \
  -H 'content-type: application/json' -d '{"productId":"p-300","quantity":2}')"
echo "$response"
grep -q '"totalCents":17998' <<<"$response" || { echo "FAIL: unexpected order total" >&2; exit 1; }

echo "==> GET /metrics (excerpt)"
curl -fs "http://127.0.0.1:$LOCAL_PORT/metrics" | grep -E '^(orders_created_total|http_requests_total)' | head -5

echo "PASS: order priced by catalog-service and served through orders-api"
