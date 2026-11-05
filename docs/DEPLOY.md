# Deploy do Inteliagent

## Rede e configuração

Origem do túnel: `http://127.0.0.1:8180`; domínios: `inteliagent.com.br` e `www.inteliagent.com.br`. O DNS deve apontar para o túnel com proxy habilitado. O token de execução não concede administração de DNS.

Servidor: `/opt/inteliagent`. Arquivos privados: `.local/` (diretório 700, arquivos 600). Token: `/etc/inteliagent/tunnel-token`. O serviço `inteliagent-tunnel` lê esse arquivo. APIs e MySQL ficam na rede Docker, sem portas publicadas.

Instale Docker e Compose e clone o repositório com submódulos. Gere credenciais próprias para cada serviço. Use `deploy/production.env.example` como referência. Crie `.local/database.env` com MYSQL_ROOT_PASSWORD e MYSQL_DATABASE, `.local/migration.env` com DB_URL/DB_USER/DB_PASSWORD e `.local/<serviço>.env` com DB_USER/DB_PASSWORD. `.local/init.sql` cria os usuários em bancos novos. Somente a conta de migração precisa de DDL.

Para gerar esses arquivos automaticamente, execute `sudo python3 deploy/init-env.py` uma única vez. O script recusa substituir configurações existentes. O arquivo init.sql pertence ao UID 999 do MySQL, com modo 400, dentro do diretório privado de root; os demais arquivos usam modo 600.

```sh
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up -d
docker compose -f deploy/compose.yaml ps
curl -f http://127.0.0.1:8180/healthz
```

A base de produção começa vazia; contas e dados locais de teste não são publicados.

## Atualizações

Instale `deploy/inteliagent-update.service` e `.timer` em `/etc/systemd/system/`. Execute `systemctl daemon-reload` e `systemctl enable --now inteliagent-update.timer`. O código administrativo deve pertencer a root. O timer consulta workflows CI de push em master e aplica somente commits aprovados. Pull requests são verificados em runners do GitHub.

```sh
systemctl start inteliagent-update.service
journalctl -u inteliagent-update.service --no-pager
systemctl status inteliagent-tunnel
```

A infraestrutura fica fixada ao commit instalado e deve ser atualizada explicitamente após revisão. Mudanças incompatíveis entre serviços exigem deploy coordenado. O rollback de código não desfaz migrações de banco.

## Android

Secrets: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD e GOOGLE_SERVICES_JSON. Pull requests não recebem secrets. Builds de master geram artifacts; tags versionadas publicam releases sem sobrescrever assets.

A assinatura histórica é preservada para atualizar os APKs existentes. A chave já foi pública e não oferece a proteção de uma chave nova. Sua substituição exige migração de assinatura ou reinstalação. Preserve os dados offline dos aparelhos durante essa migração.

## SMTP e bootstrap

Configure SMTP_HOST/PORT/USER/PASSWORD, SMTP_AUTH/TLS e MAIL_FROM em `.local/production.env` para cadastro e recuperação por email. O SMTP local de testes não entrega emails externos. O administrador inicial precisa de bootstrap controlado; não publique contas de demonstração.

Após configurar e testar o provedor, defina SMTP_HEALTH_ENABLED=true para incluir SMTP no healthcheck do auth. Enquanto não há provedor, o healthcheck cobre a API e o banco, e os fluxos de email permanecem indisponíveis.

## Recuperação

Faça backup criptografado do MySQL e das mídias antes das migrações, com cópia fora do servidor. Teste a restauração. Remover volumes apaga os dados. O rollback automático restaura código e não desfaz schema.

Os serviços do domínio antigo foram desativados, preservando seus arquivos. Inventário: `/var/backups/inteliagent/legacy-units.txt`.
