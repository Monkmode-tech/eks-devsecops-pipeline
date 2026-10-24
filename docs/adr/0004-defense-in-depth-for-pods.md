# ADR 0004: Layered pod security (PSA + Kyverno + NetworkPolicy + IMDS)

**Status:** Accepted

| Layer | Control | Stops |
|-------|---------|-------|
| Image | Non-root UID 10001, no package manager use at runtime, minimal base | Many container-escape and persistence techniques |
| Pod spec | `runAsNonRoot`, `readOnlyRootFilesystem`, drop ALL capabilities, seccomp `RuntimeDefault`, no service-account token | Privilege escalation, writing tools to disk, API access from a compromised pod |
| Admission | Pod Security Admission `restricted` (built-in) | Any pod that weakens the above, even from a mistaken manifest |
| Admission | Kyverno | Unapproved registries, mutable tags, missing limits, unsigned images |
| Network | Default-deny NetworkPolicy; only orders → catalog on 8080, DNS, and Prometheus scrapes | Lateral movement between pods |
| Node | IMDSv2 with hop limit 1 | Pods stealing the node's IAM credentials from instance metadata |
| Cluster | KMS secrets encryption, audit logs, API endpoint limited to an admin IP | Secret exposure from etcd backups; unobserved or internet-wide API access |

**Why both PSA and Kyverno?** PSA is built in, cannot be removed by a bad Helm
chart, and covers pod hardening. Kyverno covers organisation-specific rules PSA
can't express (registries, tags, signatures). Neither alone is enough.
