variable "name" {
  description = "Cluster name."
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version. Pick one in EKS standard support to avoid extended-support pricing."
  type        = string
  default     = "1.36"
}

variable "private_subnet_ids" {
  description = "Private subnets for the control-plane ENIs and nodes."
  type        = list(string)
}

variable "admin_cidrs" {
  description = "CIDRs allowed to reach the public Kubernetes API endpoint (your IP /32)."
  type        = list(string)

  validation {
    condition     = length(var.admin_cidrs) > 0 && !contains(var.admin_cidrs, "0.0.0.0/0")
    error_message = "Restrict the API endpoint to specific CIDRs; 0.0.0.0/0 is not allowed."
  }
}

variable "admin_role_arns" {
  description = "Additional IAM role ARNs granted cluster-admin through access entries."
  type        = list(string)
  default     = []
}

variable "kms_key_arn" {
  description = "KMS key for secrets encryption and control-plane logs."
  type        = string
}

variable "node_instance_types" {
  description = "Graviton instance types for the managed node group."
  type        = list(string)
  default     = ["t4g.medium"]
}

variable "node_capacity_type" {
  description = "ON_DEMAND or SPOT."
  type        = string
  default     = "ON_DEMAND"

  validation {
    condition     = contains(["ON_DEMAND", "SPOT"], var.node_capacity_type)
    error_message = "node_capacity_type must be ON_DEMAND or SPOT."
  }
}

variable "node_min_size" {
  description = "Minimum (and initial) node count."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum node count."
  type        = number
  default     = 4
}

variable "log_retention_days" {
  description = "Control-plane log retention."
  type        = number
  default     = 30
}
