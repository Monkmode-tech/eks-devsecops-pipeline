# Cost

> Approximate us-east-2 on-demand list prices for planning; confirm with the
> [AWS Pricing Calculator](https://calculator.aws/).

| Component | Approx. per hour |
|-----------|------------------|
| EKS control plane (standard support) | $0.10 |
| 2 x t4g.medium nodes (on-demand) | $0.07 |
| NAT gateway | $0.045 + data |
| Public IPv4 (NAT) | $0.005 |
| EBS (2 x 30 GB gp3), CloudWatch logs | a few cents |
| **Total** | **about $0.23 / hour** |

A session of deploy, release, verify, screenshots and destroy (about 3 hours)
costs **under $1**. Left running it would be roughly $170/month.

## Cost decisions

| Decision | Effect |
|----------|--------|
| `upgrade_policy = STANDARD` and a version in standard support | Avoids the much higher hourly price of EKS extended support |
| Graviton nodes and images | Lower price per vCPU than x86 |
| Single NAT gateway + S3 gateway endpoint | ECR layer downloads skip NAT data charges |
| No load balancer; port-forward for testing | No ALB/NLB hourly charge |
| `node_capacity_type = "SPOT"` (optional) | Cheaper nodes for a lab, may be reclaimed |
| CI runs on GitHub-hosted runners | Free for public repositories |
