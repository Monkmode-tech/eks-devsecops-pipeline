variable "github_repository" {
  description = "owner/repo whose main-branch workflows may assume the role."
  type        = string
}

variable "role_name" {
  description = "IAM role name."
  type        = string
}

variable "repository_arns" {
  description = "ECR repositories the role may push to."
  type        = list(string)
}

variable "create_oidc_provider" {
  description = "Create the account's GitHub OIDC provider (false if bootstrap/ in another repo already did)."
  type        = bool
  default     = false
}
