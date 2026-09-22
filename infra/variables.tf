variable "project_id" {
  description = "Projeto GCP que receberá a aplicação."
  type        = string
  default     = "prj-box-crossfit"
}

variable "region" {
  description = "Região do Artifact Registry e do Cloud Run."
  type        = string
  default     = "southamerica-east1"
}

variable "service_name" {
  description = "Nome do serviço Cloud Run."
  type        = string
  default     = "matematica-computacional"
}

variable "repository_name" {
  description = "Repositório Docker no Artifact Registry."
  type        = string
  default     = "matematica-computacional"
}

variable "min_instances" {
  description = "Instâncias mínimas do Cloud Run. Zero mantém o custo ocioso baixo."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Limite de escala para proteção de custo."
  type        = number
  default     = 3
}

variable "gcloud_bin" {
  description = "Executável local do Google Cloud CLI."
  type        = string
  default     = "/opt/homebrew/share/google-cloud-sdk/bin/gcloud"
}

variable "docker_bin" {
  description = "Executável local do Docker CLI."
  type        = string
  default     = "/usr/local/bin/docker"
}

variable "docker_buildx_bin" {
  description = "Plugin buildx fornecido pelo Docker Desktop."
  type        = string
  default     = "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-buildx"
}
