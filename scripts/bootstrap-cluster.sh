#!/usr/bin/env bash
#
# bootstrap-cluster.sh - one-time step after `terraform apply`:
#   1. point kubectl at the new cluster
#   2. install Argo CD (pinned chart version)
#   3. apply the root "app of apps" - from here on, Git is the source of truth
#
# Needs: aws (v2), kubectl, helm, terraform.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ENV_DIR:-$ROOT_DIR/infra/environments/dev}"
ARGOCD_CHART_VERSION="${ARGOCD_CHART_VERSION:-7.7.11}"

for bin in aws kubectl helm terraform; do
  command -v "$bin" >/dev/null || { echo "missing dependency: $bin" >&2; exit 2; }
done

REGION="$(terraform -chdir="$ENV_DIR" output -raw aws_region)"
CLUSTER="$(terraform -chdir="$ENV_DIR" output -raw cluster_name)"

echo "==> Configuring kubectl for $CLUSTER ($REGION)"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER" --alias "$CLUSTER"
kubectl get nodes -o wide

echo "==> Installing Argo CD chart $ARGOCD_CHART_VERSION"
helm repo add argo https://argoproj.github.io/argo-helm >/dev/null
helm repo update argo >/dev/null
helm upgrade --install argocd argo/argo-cd \
  --namespace argocd --create-namespace \
  --version "$ARGOCD_CHART_VERSION" \
  --wait --timeout 10m

echo "==> Applying the root application"
kubectl apply -f "$ROOT_DIR/gitops/argocd/root.yaml"

echo
echo "Argo CD is reconciling the platform and the shop app (5-10 minutes)."
echo "Watch:   kubectl -n argocd get applications -w"
echo "UI:      kubectl -n argocd port-forward svc/argocd-server 8443:443   ->  https://localhost:8443"
echo "Login:   admin / \$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"
echo
echo "The shop pods stay Pending/ImagePullBackOff until the first release workflow"
echo "pushes signed images and pins their digests in k8s/overlays/dev (docs/runbook.md)."
