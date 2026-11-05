# Push em desenvolvimento e fotos de usuários

## Fotos no mobile

O avatar dos contatos só desenhava iniciais. A lista e o cabeçalho da conversa
agora usam `photoUrl` devolvido pelo chat e baixam a imagem pelo cliente
autenticado, com renovação de token. No Android, a imagem é gravada em arquivo
temporário privado; no navegador de teste, em uma URL de objeto. A troca de
conta, remoção da foto e desmontagem descartam a imagem anterior.

A equipe e o cabeçalho consultam alterações a cada 30 segundos enquanto o app
está ativo e ao retornar do segundo plano. O perfil da própria conta também é
atualizado nesse retorno. O envio da foto de perfil usa o adaptador XHR, que
aceita arquivos nativos do React Native no FormData.

## Push

Projeto Expo criado e vinculado: `@rian123r/inteliagent-app`, ID
`15c0d89f-a3ef-4ea0-bb25-346c6f119af7`.

Ao abrir o app, o cliente solicita a permissão de exibir notificações,
independentemente do login, da configuração Firebase e da disponibilidade de
push remoto no ambiente. Após o login/restauração da sessão, registra o
dispositivo autenticado. Não há botão de ativação.
Permissão já concedida não abre outro diálogo. A tela de mensagens não exibe
avisos sobre permissão desativada, APK, Expo Go ou registro em andamento.
Em um Android API 36 conectado ao Metro, a criação do canal falhou com
`NullPointerException` antes da consulta da permissão. Essa falha agora é
isolada e não impede o pedido do sistema. Após recarregar, os logs de
desenvolvimento confirmaram `denied/canAskAgain=true`, pedido realizado e
retorno `granted=true`. O teste automatizado reproduz a falha do canal e
verifica que a permissão ainda é solicitada. Os diagnósticos não aparecem na UI.
Eventos simultâneos compartilham o mesmo
registro, e falhas de conexão são tentadas novamente após 30 segundos em
primeiro plano ou no retorno ao aplicativo. O status diferencia falhas de
permissão, Google/Expo e servidor, sem expor tokens.

A fila transacional do servidor
envia pelo Expo e verifica os recibos. Android usa o canal `messages` e prioridade
alta. A conversa aberta só suprime o aviso enquanto o app está em primeiro plano.
Tocar na notificação abre a conversa após validar a conta destinatária.

A abertura aguarda a restauração da sessão e a navegação inicial. A tela de
boas-vindas redireciona somente quando está em foco, evitando sobrescrever a
conversa ao atualizar o perfil. Respostas repetidas de uma mesma notificação
são ignoradas.

No Android, `withReliableAndroidPush.cjs` registra um serviço derivado do Expo
que trata as mensagens identificadas como Expo pelo construtor de notificações
do próprio SDK, preservando os campos nativos de apresentação e o tratamento
JavaScript em primeiro plano. Isso evita a perda dos extras do toque quando Android encerra
o processo e mantém a tarefa `singleTask` nos recentes. O serviço mantém os
demais métodos do Expo e a versão FCM usada pelo SDK. Não modifica node_modules.
Referência do comportamento reproduzido:
[Expo #49254](https://github.com/expo/expo/issues/49254).

`expo-dev-client` e perfis EAS `development`/`preview` estão preparados para APK
de distribuição interna. O perfil de desenvolvimento não publica o aplicativo
em loja. O build verifica se o projeto EAS e a configuração Firebase existem.

O Firebase CLI global antigo falha com Node 25. O comando abaixo usa Firebase
CLI 15.34.2 e Node 22.23.4 locais, instalados em `.tools`, sem alterar o Node
global:

```powershell
& 'D:\inteliagent\scripts\firebase.ps1' login --reauth --no-localhost
```

O projeto Firebase `inteliagent-dev-15c0d89f` foi criado e o pacote
`com.rian3054.inteliagentapp` foi registrado. `google-services.json` está
configurado; FCM v1 e IAM foram habilitados. Uma conta de serviço exclusiva
de envio tem o papel `roles/firebasecloudmessaging.admin`, e sua credencial
foi cadastrada e vinculada ao aplicativo no EAS. A chave privada fica em
`.local/firebase-fcm-v1.json`, fora do Git. Não a inclua no APK.

O arquivo do SDK fica fora do Git;
`app.config.js` aceita o arquivo local ou `GOOGLE_SERVICES_FILE` e valida o
pacote. No build remoto, o arquivo está configurado como variável EAS
do tipo arquivo e visibilidade secreta nos ambientes `development` e `preview`.
O hook `eas-build-post-install` copia esse arquivo para o projeto Android;
`.gitignore` impede seu envio direto pelo Git.

O EAS CLI atualizado também está disponível sem modificar a instalação global:
`& 'D:\inteliagent\scripts\eas.ps1' build --platform android --profile development`.

Validação local: `npm run check:push`. O projeto nativo foi regenerado com
Firebase e expo-dev-client. Para desenvolver: compilar o APK e abrir Metro
com `npm run start:development`.
Expo Go continua disponível para testar as telas, mas não recebe push remoto
do Android. Para push, instalar o APK próprio de desenvolvimento.

## Instalação local

APK: `.local/apk/inteliagent-push-dev.apk`, também servido pelo Vite em
`http://SEU_IP_LOCAL:5173/inteliagent-push-dev.apk`.

No Android conectado à mesma rede, instalar o APK e abrir o servidor de
desenvolvimento `http://SEU_IP_LOCAL:8081`. Entrar na conta e permitir as
notificações no diálogo do Android. O computador deve manter Metro
e os serviços locais em execução durante os testes. Não é uma publicação em loja.

## Verificações executadas

- API: nove testes de perfil, mídia e push; seis testes de push repetidos após
  o ajuste da prioridade Android.
- `tests/mobile-contact-photo-browser.mjs`: foto decodificada, token renovado,
  atualização/remoção pelo web, origem permitida, logout e atualização da lista.
- `tests/mobile-push.mjs`: conversa aberta, segundo plano, isolamento de contas
  e comportamento no Expo Go, com serviços nativos simulados. Inclui pedido
  ao abrir o app sem sessão e no ambiente Expo Go, bloqueio definitivo, registro
  concorrente e recuperação de falhas separadas no provedor e no servidor.
  Solicitações simultâneas compartilham o diálogo, inclusive após recusa;
  permissão concedida não é solicitada novamente.
- Fluxo automático conferido no Android API 34 após revogar somente a
  permissão do app de teste: diálogo apareceu ao restaurar a sessão, sem tocar
  em botão, e a autorização registrou o dispositivo no servidor. Tela de
  mensagens sem botão de ativação e sem erro de registro. Evidências locais:
  `.local/push-permission-after-login.png` e `.local/push-automatic-registration.png`.
- `tests/mobile-chat-browser.mjs` e `tests/message-push-sw.mjs`.
- TypeScript, compatibilidade Expo e exportação Android em
  `.local/push-profile-android-export`.
- FCM HTTP v1: a conta de serviço autenticou no Google e a API retornou HTTP 200
  para `validate_only`, sem enviar notificações. Isso valida credenciais e
  permissões de envio; não equivale à entrega em um dispositivo.
- APK Android compilado com sucesso para arm64-v8a e x86_64.
- Entrega real Expo/FCM no emulador API 34, recibo `ok` e aviso visível em
  segundo plano. Toque após encerrar o processo abriu a conversa correta,
  mantendo a tarefa nos recentes. Toque com aplicativo ativo também validado.
- Em primeiro plano, aviso exibido fora da conversa e suprimido dentro dela.
- Foto autenticada do contato, cadastrada pelo web, decodificada na lista e
  no cabeçalho Android. Evidência local: `.local/push-native-cold-start-conversation.png`.
- Os envios reais foram direcionados exclusivamente ao dispositivo da conta
  de teste local; seu registro de push foi desativado ao terminar.

Referências: [configuração Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/)
e [credenciais FCM v1](https://docs.expo.dev/push-notifications/fcm-credentials/).
