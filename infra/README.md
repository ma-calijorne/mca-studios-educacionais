# Deploy local com Terraform

O Terraform habilita as APIs necessárias, cria o Artifact Registry, constrói e envia uma imagem `linux/amd64` a partir deste Mac e publica um serviço público no Cloud Run. O estado fica local na pasta `infra/`.

Além da aplicação, a infraestrutura cria:

- um bucket privado e versionado para `students.json`;
- uma conta de serviço com acesso apenas aos objetos desse bucket;
- uma chave administrativa e uma chave de sessão geradas automaticamente;
- dois secrets no Secret Manager, consumidos pela revisão do Cloud Run.

Pré-requisitos: Docker Desktop em execução, Google Cloud CLI, Terraform e permissão de administrador no projeto `prj-box-crossfit`.

Os caminhos padrão usam instalações Homebrew e Docker Desktop no Apple Silicon. Se necessário, sobrescreva `gcloud_bin`, `docker_bin` ou `docker_buildx_bin` no Terraform.

```bash
gcloud auth application-default login

cd infra
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Após a aplicação, `terraform output -raw application_url` mostra a URL `run.app`.

A área de administração fica em `terraform output -raw admin_url`. Para consultar a chave inicial sem registrá-la no histórico do terminal:

```bash
printf '%s\n' "$(terraform output -raw admin_access_key)"
```

O serviço usa escala de 0 a 3 instâncias, 1 vCPU e 512 MiB. O progresso pedagógico continua salvo no navegador; apenas o cadastro e o estado ativo/inativo dos alunos ficam no Cloud Storage.
