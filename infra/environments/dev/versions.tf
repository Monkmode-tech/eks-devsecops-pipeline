terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project    = "eks-devsecops-pipeline"
      ManagedBy  = "terraform"
      Repository = "github.com/Monkmode-tech/eks-devsecops-pipeline"
      Owner      = var.owner
    }
  }
}
