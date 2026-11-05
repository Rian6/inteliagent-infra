# Validação do deploy

Verificações realizadas em 4 de novembro de 2026:

- Build web de produção concluído.
- TypeScript do aplicativo validado e 85 testes offline aprovados.
- Workflows verificados com actionlint.
- Gitleaks não detectou credenciais na árvore atual preparada para publicação. O histórico antigo não foi reescrito; credenciais históricas e a assinatura Android legada exigem revogação ou migração própria.
- Dez APKs aprovados do catálogo local conferidos com os assets do GitHub por tamanho e SHA-256. O build histórico 3 foi arquivado. O build 14 passou no CI, teve assinatura e SHA-256 conferidos e foi publicado como release atual após a validação do domínio.
- MySQL, autenticação, API principal, sincronização, chat, serviço de versões e Nginx passaram nos healthchecks.
- Site e catálogo de versões retornaram HTTP 200 pelo proxy de produção.
- Login inválido e acesso sem autenticação às APIs principal, sincronização e chat retornaram HTTP 401.
- Atualização automática de um commit aprovado pelo CI concluída com backup anterior à migração e smoke tests após o deploy. Integridade do backup gzip conferida.
- Serviços e runners do ambiente antigo desativados, preservando arquivos e bancos.

Os domínios inteliagent.com.br e www.inteliagent.com.br foram validados por HTTPS. O catálogo público retorna o build 14 e as APIs rejeitam acessos sem autenticação. Requisições com o identificador do cliente Android também foram verificadas. O provedor SMTP ainda deve ser configurado e testado para cadastro e recuperação por email.
