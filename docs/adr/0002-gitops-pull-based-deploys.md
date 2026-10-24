# ADR 0002: Pull-based GitOps deployments with Argo CD

**Status:** Accepted

## Context

A common pattern is `kubectl apply` or `helm upgrade` from CI, which requires
storing cluster-admin-capable credentials in the CI system. A compromised
workflow, dependency or action could then deploy anything.

## Decision

- CI's AWS role can push images to two ECR repositories and nothing else.
- CI promotes a release by committing an image **digest** to Git.
- Argo CD inside the cluster pulls and applies what is in Git, with
  `selfHeal` reverting manual drift and `prune` removing deleted resources.

## Consequences

- The cluster API endpoint never needs to be reachable from CI.
- Every production change is a reviewable, revertible commit (`git revert` = rollback).
- Bootstrapping Argo CD itself is a one-time manual step (`scripts/bootstrap-cluster.sh`).
- The release workflow pushes a commit to `main` as `github-actions[bot]`;
  branch protection must allow that bot, or the promotion can open a PR instead.
