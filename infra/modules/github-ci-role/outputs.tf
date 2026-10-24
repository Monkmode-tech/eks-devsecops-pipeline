output "role_arn" {
  description = "Set as the AWS_ECR_PUSH_ROLE_ARN repository variable."
  value       = aws_iam_role.this.arn
}
