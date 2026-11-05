# Sessões web e mobile

O JWT de acesso continua válido por 30 minutos. Cada login cria uma credencial de renovação com validade absoluta de 30 dias. A migração V36 armazena somente o hash SHA-256 dessa credencial em `auth_sessions`. A renovação verifica aprovação, situação, sede e versão de autenticação do usuário; a troca de senha invalida as sessões pela versão.

## Web

O login usa `/api/user/login/web`. A credencial persistente fica no cookie `inteliagent_session`, HttpOnly, SameSite Strict, limitado a `/api/user`. O JWT permanece na memória. A inicialização restaura a conta por `/api/user/refresh/web`; requisições protegidas renovam antes da expiração ou repetem uma única vez após 401. Chamadas simultâneas compartilham a renovação. Erros de rede não removem a sessão. Na restauração inicial, indisponibilidade mostra uma opção para tentar novamente.

O logout revoga a credencial no servidor, remove o cookie e avisa as outras abas. Um marcador local sem credenciais impede restauração indevida se a página fechar antes de concluir a revogação. O próximo login remove esse marcador. Respostas antigas não sobrescrevem uma conta recém-autenticada nem restauram uma sessão encerrada.

A proteção por IP mantém dez tentativas de login por minuto. Renovação e logout têm limite separado de 120 chamadas por minuto em cada rota, permitindo recargas e múltiplas abas sem consumir o limite de login.

No ambiente local, `runtime.py start --lan ...` habilita `VITE_USE_API_PROXY=true`; o navegador usa a mesma origem para site e APIs. Na implantação HTTPS, definir `AUTH_COOKIE_SECURE=true` e manter as rotas de autenticação na mesma origem do site. Cookies pertencem ao endereço utilizado: localhost e o IP da rede têm sessões independentes.

## Mobile

O login existente `/api/user/login` passa a fornecer `refreshToken`. JWT e credencial de renovação ficam no Expo SecureStore. O gerenciador `src/offline/credentials.ts` serializa gravações, compartilha renovações e protege contra respostas tardias após logout ou troca de conta. As requisições HTTP, a sincronização e a autenticação do chat usam credenciais atualizadas.

Uma falha de autorização não apaga perfil, visitas, planejamentos nem operações pendentes. Credencial revogada exige autenticação para sincronizar; o acesso offline continua obedecendo à janela existente de sete dias desde a última validação online. Uma renovação bem-sucedida atualiza o perfil e essa janela. O logout explícito remove as credenciais locais e solicita revogação ao servidor. Um JWT já emitido mantém sua validade curta; a revogação do dispositivo bloqueia novas renovações.

Contas autenticadas antes desta atualização precisam entrar novamente uma vez para receber a credencial de renovação.

## Verificação

- `npm run test:sessions`: navegador com perfil persistente, recarga, reinício do navegador, outra aba, cookie HttpOnly, repetição após 401, indisponibilidade e recuperação, logout entre abas; credenciais mobile recriadas, renovação concorrente e revogação contra o servidor real.
- `npm --prefix inteliagent-app run test:offline`: testes de credenciais, isolamento de contas, recuperação e preservação de trabalho offline.
- Testes Maven do auth: cookies, login inválido, status 401, senhas e validação de tokens.
- Testes de interface, planejamento e chat existentes; build web, TypeScript e exportação Android.

Os testes do gerenciador mobile usam o mesmo código do SecureStore com um adaptador de armazenamento em memória. Eles não substituem fechar e reabrir o aplicativo no telefone físico.
