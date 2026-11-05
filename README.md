# Inteliagent

Plataforma de planejamento e visitas de campo com painel web, aplicativo Android offline, autenticação, sincronização e mensagens.

Domínio de produção: **https://inteliagent.com.br**. Este repositório reúne infraestrutura, documentação e ferramentas, com os sete projetos como submódulos Git.

| Projeto | Responsabilidade |
|---|---|
| inteliagent-webapp | Painel React e Nginx |
| inteliagent-app | Expo/React Native e SQLite offline |
| inteliagent-auth | Autenticação, sessões, aprovação e email |
| inteliagent-main-server | Planejamentos, visitas e rotas |
| inteliagent-load-server | Sincronização incremental |
| inteliagent-chat | Mensagens, mídia e notificações |
| inteliagent-migration | Migrações Flyway |

## Desenvolvimento

```sh
git clone --recurse-submodules https://github.com/Rian6/inteliagent-infra.git
cd inteliagent-infra
```

Copie os `.env.example` para arquivos `.env` privados e gere suas credenciais. No ambiente Windows existente, use `python runtime.py start` e `python runtime.py stop`; a configuração fica em `.local/runtime.json`.

```sh
npm --prefix inteliagent-webapp ci
npm --prefix inteliagent-webapp run build
npm --prefix inteliagent-app ci
npm --prefix inteliagent-app run test:offline
npm --prefix inteliagent-app run typecheck
```

## Produção e CI/CD

O Docker Compose executa MySQL, migrações, três APIs Java, chat Python, serviço de versões e Nginx. Somente o Nginx é publicado em loopback, na porta 8180. O Cloudflare Tunnel oferece HTTPS.

Cada projeto tem um workflow CI para pushes em master e pull requests. O servidor consulta os resultados a cada 30 minutos e aplica somente o commit atual de master aprovado pelo workflow. O deploy compila, executa migrações e verifica as APIs. Uma falha restaura o código anterior; alterações de schema exigem recuperação própria.

O pipeline Android gera APK independente e assinado nos artifacts. Tags `v<VERSÃO>+build.<CÓDIGO>` publicam APK, manifesto e SHA-256 nas [Releases do aplicativo](https://github.com/Rian6/inteliagent-app/releases). As versões existentes são preservadas. Aumente expo.android.versionCode antes de publicar outra versão.

Consulte [deploy e segurança](docs/DEPLOY.md), [arquitetura](docs/ARQUITETURA.md), [sincronização](docs/SINCRONIZACAO.md) e [validação](docs/VALIDACAO.md).

## Segredos

Use GitHub Secrets no CI e arquivos `.local/*.env` com permissão 600 no servidor. Senhas, tokens, contas de serviço, bancos, mídias e chaves privadas não pertencem ao repositório. Variáveis VITE_* e EXPO_PUBLIC_* são públicas e devem conter somente configuração pública.

A chave Android legada já esteve no histórico público. Sua remoção da árvore atual não revoga cópias; a substituição exige planejar a migração dos aparelhos. Credenciais antigas expostas devem ser revogadas no provedor.
