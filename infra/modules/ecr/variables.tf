variable "prefix" {
  description = "Repository namespace (repositories become <prefix>/<service>)."
  type        = string
}

variable "repositories" {
  description = "Service names, one repository each."
  type        = list(string)
}

variable "kms_key_arn" {
  description = "KMS key for image encryption."
  type        = string
}

variable "force_delete" {
  description = "Allow destroy to delete repositories that still contain images (labs only)."
  type        = bool
  default     = true
}
