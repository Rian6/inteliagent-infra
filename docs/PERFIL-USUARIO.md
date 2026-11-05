# Perfil do usuário

Web: avatar no cabeçalho → **Meu perfil** (`/perfil`). Mobile: avatar na tela inicial → **Meu perfil** (`/profile`).

As telas mostram nome, email, função, nome e código da sede e situação de aprovação. É possível escolher uma foto, conferir a prévia, cancelar, salvar, trocar e remover. A mudança fica vinculada à conta no servidor e aparece ao abrir o perfil em outro dispositivo.

A API autenticada usa `GET /api/user/me`, `PUT /api/user/me/photo` e `DELETE /api/user/me/photo`. A identidade vem da sessão; os endpoints não aceitam selecionar outro usuário. A foto é validada pelos bytes da imagem, recortada ao centro e armazenada como JPEG de 512 × 512, sem metadados do arquivo original. Usa a tabela de imagens já existente, com limpeza da imagem substituída quando não está mais referenciada.

O mobile permite ajustar o recorte no seletor de fotos e mantém uma cópia em arquivo local para exibição offline. A sessão criptografada guarda somente o caminho desse arquivo. Atualizar o cache do perfil preserva a validade original da sessão e as permissões. O salvamento da foto requer conexão; em caso de falha, a prévia continua disponível para tentar novamente.

O provisionamento do serviço de autenticação inclui DELETE em `imagem_perfil_usuario` para a limpeza. O filtro de tamanho de requisições deixa o processamento multipart para o servlet, mantendo os limites de upload configurados.

Validação: testes Maven do auth, API real para agente e administrador (autenticação, isolamento de contas, imagem inválida, tamanho, substituição e remoção), navegador web com upload real e recarga, tela mobile com serviços nativos simulados, cache offline e renovação de sessão, TypeScript, build web e exportação Android.

A seleção de fotos, o recorte e o cache em arquivo ainda precisam de validação em aparelho físico; os testes de navegador simulam esses serviços nativos.

Testes: `tests/test_profile.py`, `tests/profile-browser.mjs`, `tests/mobile-profile-browser.mjs`, `tests/profile-offline-session.mjs`.
