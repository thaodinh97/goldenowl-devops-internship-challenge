output "application_url" {
  value = "http://${aws_lb.app.dns_name}"
}

output "cluster_name" {
  value = aws_ecs_cluster.app.name
}

output "service_name" {
  value = aws_ecs_service.app.name
}

output "target_group_arn" {
  value = aws_lb_target_group.app.arn
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.app.arn
}