output "application_url" {
  description = "URL pública run.app."
  value       = google_cloud_run_v2_service.app.uri
}

output "admin_url" {
  description = "URL da administração de alunos."
  value       = "${google_cloud_run_v2_service.app.uri}/admin"
}

output "admin_access_key" {
  description = "Chave inicial da área administrativa. Guarde-a em local seguro."
  value       = random_password.admin_key.result
  sensitive   = true
}

output "students_bucket" {
  description = "Bucket privado que contém students.json."
  value       = google_storage_bucket.students.name
}

output "container_image" {
  description = "Imagem imutável implantada."
  value       = local.image_uri
}

output "region" {
  value = var.region
}
