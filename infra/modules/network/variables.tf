variable "name" {
  description = "Name prefix; also the EKS cluster name used in subnet discovery tags."
  type        = string
}

variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR (/16)."
  type        = string
  default     = "10.30.0.0/16"
}

variable "kms_key_arn" {
  description = "KMS key for the flow-log group."
  type        = string
}

variable "log_retention_days" {
  description = "Flow-log retention."
  type        = number
  default     = 30
}
