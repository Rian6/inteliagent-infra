# Validação do deploy

Verificações realizadas em 4 de novembro de 2026:

- Build web de produção concluído.
- TypeScript do aplicativo validado e 85 testes offline aprovados.
- Workflows verificados com actionlint.
- Gitleaks não detectou credenciais na árvore atual preparada para publicação. O histórico antigo não foi reescrito; credenciais históricas e a assinatura Android legada exigem revogação ou migração própria.
- Dez APKs aprovados do catálogo local conferidos com os assets do GitHub por tamanho e SHA-256. O build histórico 3 foi arquivado, preservando o build 13 como release atual.
- MySQL, autenticação, API principal, sincronização, chat, serviço de versões e Nginx passaram nos healthchecks.
- Site e catálogo de versões retornaram HTTP 200 pelo proxy de produção.
- Login inválido e acesso sem autenticação às APIs principal, sincronização e chat retornaram HTTP 401.
- Atualização automática de um commit aprovado pelo CI concluída com backup anterior à migração e smoke tests após o deploy. Integridade do backup gzip conferida.
- Serviços e runners do ambiente antigo desativados, preservando arquivos e bancos.

Os testes internos não comprovam a configuração pública de DNS nem a entrega de emails. O domínio precisa apontar para o túnel e o provedor SMTP deve ser configurado e testado separadamente.
