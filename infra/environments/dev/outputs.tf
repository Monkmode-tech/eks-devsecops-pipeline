output "aws_region" {
  description = "AWS region."
  value       = var.aws_region
}

output "cluster_name" {
  description = "EKS cluster name (aws eks update-kubeconfig --name <this>)."
  value       = module.eks.cluster_name
}

output "cluster_version" {
  description = "Kubernetes version."
  value       = module.eks.cluster_version
}

output "ecr_repository_urls" {
  description = "ECR repository URLs per service."
  value       = module.ecr.repository_urls
}

output "github_ecr_push_role_arn" {
  description = "Set as repository variable AWS_ECR_PUSH_ROLE_ARN to enable the release workflow."
  value       = module.github_ci_role.role_arn
}

output "ecr_registry" {
  description = "Registry host (set as repository variable ECR_REGISTRY)."
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}
