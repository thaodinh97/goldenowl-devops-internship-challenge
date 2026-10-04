terraform {
  required_version = ">= 1.10.0, < 2.0.0"

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
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "project_name" {
  type    = string
  default = "goldenowl-devops"
}

variable "image_uri" {
  description = "ECR image URI pinned to a digest"
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-f]{64}$", var.image_uri))
    error_message = "Provide an ECR image URI ending in @sha256:<64 hexadecimal characters>."
  }
}

variable "requests_per_target" {
  description = "Demo target: requests per target per minute"
  type        = number
  default     = 1000
}

data "aws_availability_zones" "available" {
  state = "available"
}