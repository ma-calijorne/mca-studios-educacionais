locals {
  app_root = abspath("${path.module}/..")
  source_files = sort(concat(
    tolist(fileset(local.app_root, "src/**")),
    tolist(fileset(local.app_root, "public/**")),
    tolist(fileset(local.app_root, "server/**")),
    [
      "package.json",
      "package-lock.json",
      "index.html",
      "tsconfig.json",
      "tsconfig.app.json",
      "tsconfig.node.json",
      "vite.config.ts",
      "Dockerfile",
    ],
  ))
  source_hash          = substr(sha256(join("", [for file in local.source_files : filesha256("${local.app_root}/${file}")])), 0, 12)
  registry_host        = "${var.region}-docker.pkg.dev"
  image_uri            = "${local.registry_host}/${var.project_id}/${var.repository_name}/${var.service_name}:${local.source_hash}"
  students_bucket_name = "${var.project_id}-${var.service_name}-users"
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "app" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repository_name
  description   = "Imagens da Matemática Computacional Interativa"
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "matematica-run"
  display_name = "Matemática Computacional — Cloud Run"

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket" "students" {
  project                     = var.project_id
  name                        = local.students_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  labels = {
    application = "matematica-computacional"
    managed-by  = "terraform"
    data        = "students"
  }

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_object" "students" {
  name         = "students.json"
  bucket       = google_storage_bucket.students.name
  content_type = "application/json; charset=utf-8"
  content = jsonencode({
    version   = 1
    updatedAt = null
    students  = []
  })

  lifecycle {
    # A aplicação passa a ser a única dona do conteúdo após a criação inicial.
    # Assim, um novo terraform apply nunca restaura o JSON vazio sobre a turma.
    ignore_changes = all
  }
}

resource "google_storage_bucket_iam_member" "runtime_students" {
  bucket = google_storage_bucket.students.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.runtime.email}"
}

resource "random_password" "admin_key" {
  length  = 24
  special = false
}

resource "random_password" "session_secret" {
  length  = 64
  special = false
}

resource "google_secret_manager_secret" "admin_key" {
  project   = var.project_id
  secret_id = "${var.service_name}-admin-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret" "session_secret" {
  project   = var.project_id
  secret_id = "${var.service_name}-session-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "admin_key" {
  secret      = google_secret_manager_secret.admin_key.id
  secret_data = random_password.admin_key.result
}

resource "google_secret_manager_secret_version" "session_secret" {
  secret      = google_secret_manager_secret.session_secret.id
  secret_data = random_password.session_secret.result
}

resource "google_secret_manager_secret_iam_member" "runtime_secrets" {
  for_each = {
    admin_key      = google_secret_manager_secret.admin_key.id
    session_secret = google_secret_manager_secret.session_secret.id
  }

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "terraform_data" "container_image" {
  triggers_replace = [local.source_hash]

  provisioner "local-exec" {
    working_dir = local.app_root
    interpreter = ["/bin/bash", "-c"]
    environment = {
      APP_ROOT      = local.app_root
      BUILDX_BIN    = var.docker_buildx_bin
      DOCKER_BIN    = var.docker_bin
      GCLOUD_BIN    = var.gcloud_bin
      IMAGE_URI     = local.image_uri
      REGISTRY_HOST = local.registry_host
    }
    command = <<-EOT
      set -euo pipefail
      DEPLOY_DOCKER_CONFIG="$(mktemp -d "$${TMPDIR:-/tmp}/matematica-docker.XXXXXX")"
      trap 'rm -rf "$DEPLOY_DOCKER_CONFIG"' EXIT
      mkdir -p "$DEPLOY_DOCKER_CONFIG/cli-plugins"
      ln -sfn "$BUILDX_BIN" "$DEPLOY_DOCKER_CONFIG/cli-plugins/docker-buildx"
      export PATH="$(dirname "$GCLOUD_BIN"):/usr/local/bin:$PATH"
      ACCESS_TOKEN="$("$GCLOUD_BIN" auth application-default print-access-token)"
      AUTH_VALUE="$(printf 'oauth2accesstoken:%s' "$ACCESS_TOKEN" | base64 | tr -d '\r\n')"
      umask 077
      printf '{"auths":{"%s":{"auth":"%s"}}}\n' "$REGISTRY_HOST" "$AUTH_VALUE" \
        > "$DEPLOY_DOCKER_CONFIG/config.json"
      unset ACCESS_TOKEN AUTH_VALUE
      DOCKER_CONFIG="$DEPLOY_DOCKER_CONFIG" \
        "$DOCKER_BIN" buildx build --platform linux/amd64 --tag "$IMAGE_URI" --push "$APP_ROOT"
    EOT
  }

  depends_on = [google_artifact_registry_repository.app]
}

resource "google_cloud_run_v2_service" "app" {
  project             = var.project_id
  name                = var.service_name
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = local.image_uri

      env {
        name  = "STUDENTS_BUCKET"
        value = google_storage_bucket.students.name
      }

      env {
        name = "ADMIN_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.admin_key.secret_id
            version = google_secret_manager_secret_version.admin_key.version
          }
        }
      }

      env {
        name = "SESSION_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.session_secret.secret_id
            version = google_secret_manager_secret_version.session_secret.version
          }
        }
      }

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 2
        period_seconds        = 3
        failure_threshold     = 10

        http_get {
          path = "/health"
          port = 8080
        }
      }

      liveness_probe {
        initial_delay_seconds = 5
        timeout_seconds       = 2
        period_seconds        = 30
        failure_threshold     = 3

        http_get {
          path = "/health"
          port = 8080
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = {
    application = "matematica-computacional"
    managed-by  = "terraform"
  }

  depends_on = [
    terraform_data.container_image,
    google_storage_bucket_iam_member.runtime_students,
    google_secret_manager_secret_iam_member.runtime_secrets,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
