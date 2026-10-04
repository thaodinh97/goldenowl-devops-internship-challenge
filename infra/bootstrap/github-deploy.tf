variable "app_project_name" {
  description = "Match project_name in infra/app"
  type        = string
  default     = "goldenowl-devops"
}

locals {
  app_account_id = data.aws_caller_identity.current.account_id

  app_execution_role_arn = "arn:aws:iam::${local.app_account_id}:role/${var.app_project_name}-ecs-execution"

  app_service_arn = "arn:aws:ecs:${var.aws_region}:${local.app_account_id}:service/${var.app_project_name}-cluster/${var.app_project_name}-service"

  app_task_definition_arn = "arn:aws:ecs:${var.aws_region}:${local.app_account_id}:task-definition/${var.app_project_name}:*"
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "deploy-project-application"
  role = aws_iam_role.github_ecr.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "ReadInfrastructure"
        Effect = "Allow"

        Action = [
          "ec2:Describe*",
          "elasticloadbalancing:Describe*",
          "application-autoscaling:Describe*",
          "application-autoscaling:ListTagsForResource",
          "ecs:DescribeClusters",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTagsForResource",
          "logs:DescribeLogGroups",
          "logs:ListTagsLogGroup",
          "logs:ListTagsForResource"
        ]

        Resource = "*"
      },
      {
        Sid    = "ReadExecutionRole"
        Effect = "Allow"

        Action = [
          "iam:GetRole",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies"
        ]

        Resource = local.app_execution_role_arn
      },
      {
        Sid      = "ListStateBucket"
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = aws_s3_bucket.terraform_state.arn
      },
      {
        Sid    = "ManageApplicationState"
        Effect = "Allow"

        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]

        Resource = "${aws_s3_bucket.terraform_state.arn}/app/terraform.tfstate"
      },
      {
        Sid    = "ManageApplicationStateLock"
        Effect = "Allow"

        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]

        Resource = "${aws_s3_bucket.terraform_state.arn}/app/terraform.tfstate.tflock"
      },
      {
        Sid      = "RegisterTaskDefinition"
        Effect   = "Allow"
        Action   = "ecs:RegisterTaskDefinition"
        Resource = "*"
      },
      {
        Sid    = "TagTaskDefinitions"
        Effect = "Allow"

        Action = [
          "ecs:TagResource",
          "ecs:UntagResource"
        ]

        Resource = local.app_task_definition_arn
      },
      {
        Sid      = "UpdateApplicationService"
        Effect   = "Allow"
        Action   = "ecs:UpdateService"
        Resource = local.app_service_arn
      },
      {
        Sid      = "PassExecutionRole"
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = local.app_execution_role_arn

        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
      {
        Sid    = "ReadApplicationDeployments"
        Effect = "Allow"

        Action = [
          "ecs:ListServiceDeployments",
          "ecs:DescribeServiceDeployments",
          "ecs:DescribeServiceRevisions"
        ]

        Resource = [
          "arn:aws:ecs:ap-southeast-1:448678332762:service/goldenowl-devops-cluster/goldenowl-devops-service",
          "arn:aws:ecs:ap-southeast-1:448678332762:service-deployment/goldenowl-devops-cluster/goldenowl-devops-service/*",
          "arn:aws:ecs:ap-southeast-1:448678332762:service-revision/goldenowl-devops-cluster/goldenowl-devops-service/*"
        ]
      },
      {
        Sid      = "DeregisterOldTaskDefinitions"
        Effect   = "Allow"
        Action   = "ecs:DeregisterTaskDefinition"
        Resource = "*"
      }
    ]
  })
}