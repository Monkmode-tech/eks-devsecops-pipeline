# Runbook

## 0. Try it locally first (no AWS)

```bash
docker compose up --build
curl -s -X POST localhost:3000/orders -H 'content-type: application/json' \
  -d '{"productId":"p-100","quantity":2}'
```

## 1. Infrastructure (about 15-20 minutes)

```bash
cd infra/environments/dev
cp backend.hcl.example backend.hcl            # bootstrap state bucket
cp terraform.tfvars.example terraform.tfvars  # admin_cidrs = your IP /32
terraform init -backend-config=backend.hcl
terraform apply
terraform output
```

## 2. Connect GitHub to AWS

In the repository: **Settings → Secrets and variables → Actions → Variables**

| Variable | Value |
|----------|-------|
| `AWS_ECR_PUSH_ROLE_ARN` | `terraform output -raw github_ecr_push_role_arn` |
| `AWS_REGION` | `us-east-2` |
| `ECR_REGISTRY` | `terraform output -raw ecr_registry` |

These are not secrets. The role can only be assumed by this repository's
`main` branch through OIDC.

## 3. First release

Actions → **release** → *Run workflow*. It builds, scans, signs and pushes both
images, then commits the digests to `k8s/overlays/dev/kustomization.yaml`.

## 4. Bootstrap GitOps

```bash
./scripts/bootstrap-cluster.sh
kubectl -n argocd get applications -w    # wait for all to be Synced/Healthy
```

## 5. Verify

```bash
./scripts/smoke-test.sh      # order created through both services
./scripts/policy-test.sh     # 4/4 unsafe pods rejected at admission
kubectl -n shop get pods,hpa,networkpolicy
kubectl get policyreport -n shop
```

Grafana:

```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3001:80
# admin password:
kubectl -n monitoring get secret kube-prometheus-stack-grafana -o jsonpath='{.data.admin-password}' | base64 -d
```

Open the **Shop - orders-api and catalog-service** dashboard. Generate traffic
with a loop of `curl` POSTs through a port-forward to watch request rate, p95
latency and the HPA.

## 6. Prove GitOps self-healing

```bash
kubectl -n shop scale deploy/orders-api --replicas=0   # simulate drift
kubectl -n argocd get application shop -w              # Argo CD reverts it
```

## 7. Tear down (do this every session)

```bash
kubectl delete -f gitops/argocd/root.yaml   # lets Argo CD remove its load balancers/volumes
terraform -chdir=infra/environments/dev destroy
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Pods `ImagePullBackOff` with `unreleased` tag | Run the release workflow (step 3) |
| Pods rejected by Kyverno | `kubectl describe` the ReplicaSet; read the policy message |
| orders-api 502 | `kubectl -n shop logs deploy/catalog-service`; NetworkPolicy `catalog-from-orders` |
| HPA shows `<unknown>` | metrics-server add-on: `kubectl top pods -n shop` |
| `kubectl` times out | Your IP changed; update `admin_cidrs` and apply |
