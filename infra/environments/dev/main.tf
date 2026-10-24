###############################################################################
# dev: VPC + EKS + ECR + GitHub OIDC push role
#
# Everything that runs *inside* the cluster (apps, Kyverno, monitoring) is
# deployed by Argo CD from this repository - see gitops/ and scripts/.
###############################################################################

data "aws_caller_identity" "current" {}

locals {
  services = ["orders-api", "catalog-service"]
}

#------------------------------------------------------------------------------
# Customer-managed key: Kubernetes secrets, control-plane logs, flow logs, ECR
#------------------------------------------------------------------------------
data "aws_iam_policy_document" "kms" {
  statement {
    sid       = "EnableIAMPolicies"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  statement {
    sid       = "AllowCloudWatchLogs"
    actions   = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["logs.${var.aws_region}.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:*"]
    }
  }
}

resource "aws_kms_key" "this" {
  description             = "${var.name} - EKS secrets, logs, ECR"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms.json
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.name}"
  target_key_id = aws_kms_key.this.key_id
}

#------------------------------------------------------------------------------
# Modules
#------------------------------------------------------------------------------
module "network" {
  source = "../../modules/network"

  name        = var.name
  aws_region  = var.aws_region
  vpc_cidr    = var.vpc_cidr
  kms_key_arn = aws_kms_key.this.arn
}

module "eks" {
  source = "../../modules/eks"

  name                = var.name
  kubernetes_version  = var.kubernetes_version
  private_subnet_ids  = module.network.private_subnet_ids
  admin_cidrs         = var.admin_cidrs
  admin_role_arns     = var.admin_role_arns
  kms_key_arn         = aws_kms_key.this.arn
  node_instance_types = var.node_instance_types
  node_capacity_type  = var.node_capacity_type
}

module "ecr" {
  source = "../../modules/ecr"

  prefix       = var.name
  repositories = local.services
  kms_key_arn  = aws_kms_key.this.arn
}

module "github_ci_role" {
  source = "../../modules/github-ci-role"

  github_repository    = var.github_repository
  role_name            = "${var.name}-github-ecr-push"
  repository_arns      = module.ecr.repository_arns
  create_oidc_provider = var.create_github_oidc_provider
}
