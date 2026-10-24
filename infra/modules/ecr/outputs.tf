output "repository_urls" {
  description = "Map of service name to repository URL."
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "repository_arns" {
  description = "Repository ARNs."
  value       = [for r in aws_ecr_repository.this : r.arn]
}
