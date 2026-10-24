variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "us-east-2"
}

variable "name" {
  description = "Cluster and resource name prefix."
  type        = string
  default     = "devsecops"
}

variable "owner" {
  description = "Owner tag value."
  type        = string
  default     = "caleb-tetteh"
}

variable "vpc_cidr" {
  description = "VPC CIDR."
  type        = string
  default     = "10.30.0.0/16"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version (keep it in standard support)."
  type        = string
  default     = "1.36"
}

variable "admin_cidrs" {
  description = "Your public IP as a /32 (curl -s https://checkip.amazonaws.com) - the only source allowed to reach the Kubernetes API."
  type        = list(string)
}

variable "admin_role_arns" {
  description = "Extra IAM roles to grant cluster-admin."
  type        = list(string)
  default     = []
}

variable "node_instance_types" {
  description = "Node instance types (Graviton)."
  type        = list(string)
  default     = ["t4g.medium"]
}

variable "node_capacity_type" {
  description = "ON_DEMAND or SPOT (SPOT is cheaper; fine for a lab)."
  type        = string
  default     = "ON_DEMAND"
}

variable "github_repository" {
  description = "Repository whose main-branch workflow may push images."
  type        = string
  default     = "Monkmode-tech/eks-devsecops-pipeline"
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub OIDC provider (false when the bootstrap from aws-secure-three-tier-platform already created it)."
  type        = bool
  default     = false
}
