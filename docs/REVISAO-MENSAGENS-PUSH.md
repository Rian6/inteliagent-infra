# Revisão das mensagens — 02/11/2026

| Pedido | Resultado |
|---|---|
| Emojis no web | Mesmo catálogo do mobile: 1.528 emojis, 11 categorias, tons de pele, bandeiras e inserção no cursor. |
| Ícone do áudio web | Botões arredondados de reproduzir/pausar; o primeiro clique já busca e reproduz o áudio. |
| Fotos no web | Carregamento automático autenticado, ampliação e nova tentativa em caso de falha. |
| Fotos recebidas no mobile | Download pelo cliente autenticado, renovação de sessão após 401, arquivo temporário privado e ampliação local. |
| Espaço inferior no mobile | Margem de 6 dp; área segura aplicada pelo contêiner, sem somar manualmente o recuo do sistema. |
| Push | Implementação nativa Expo e Web Push, registro autenticado, fila transacional e abertura da conversa. Expo/FCM configurados e APK Android de desenvolvimento compilado. |

Imagens e áudios continuam restritos aos participantes da conversa. Os arquivos
temporários de imagem são removidos ao desmontar o componente. Algumas imagens
de teste antigas tinham CRC de PNG inválido; os novos testes usam PNG válido e
verificam a decodificação. Arquivos antigos inválidos precisam ser reenviados.

## Validações

- Dez testes de API/chat/push: privacidade, registros de dispositivos, transação,
  repetição idempotente, retomada de recibos, tokens inválidos e conta trocada.
- Navegadores: envio/recebimento real de imagem e áudio, imagem automática,
  botão de reprodução, 11 categorias de emojis e telas de 320 a 1280 px.
- Componentes mobile: erro 503 seguido de nova tentativa, erro 401 seguido de
  renovação, decodificação e ampliação da imagem; teclado/compositor e emojis.
- Emulador Android API 34: imagens enviadas pelo web apareceram e abriram
  ampliadas. Compositor com 18 px (6 dp na densidade testada) abaixo do campo;
  com teclado, campo terminando em y=1413 e teclado começando em y=1431.
  Rascunhos de teste foram apagados sem envio.
- Service worker: destinatário correto, clique em URL da mesma origem, troca de
  conta e logout, com provedor simulado.
- TypeScript, build web, compatibilidade das dependências Expo e exportação
  Android em `.local/chat-updates-android-export`.

A entrega externa de push não foi simulada como se fosse uma entrega real.
Os testes de provedor não enviam notificações para pessoas.

## Push no servidor e no navegador

A migração V44 cria `chat_push_devices` e `chat_push_outbox`. O registro da
notificação ocorre na mesma transação da mensagem; repetir o mesmo `clientId`
não cria um segundo envio. O worker usa reserva temporária dos trabalhos,
tentativas limitadas e recibos do Expo. Desativa dispositivos rejeitados como
`DeviceNotRegistered` e assinaturas web que retornam 404/410. Conta desativada,
token de sessão revogado e dispositivo transferido para outra conta impedem a
entrega do trabalho antigo.

As notificações exibem “Você recebeu uma nova mensagem.”. O toque abre a
conversa autenticada; mensagens, URLs de anexos e tokens de acesso não são
incluídos no conteúdo exibido.

No ambiente isolado da porta 3308, a migração e os privilégios do serviço chat
foram aplicados. As chaves Web Push ficam em `.local/runtime.json` e
`.local/vapid-private.pem`, fora dos repositórios. A rotina reproduzível é:

```powershell
inteliagent-chat/.venv/Scripts/python.exe scripts/setup-chat-push-local.py
python runtime.py restart-chat
```

Em outro ambiente, aplicar a migração, os privilégios de `provision_db.py` e
configurar `VAPID_PRIVATE_KEY` (caminho PEM), `VAPID_PUBLIC_KEY` (ponto público
P-256 em base64url) e `VAPID_SUBJECT` (contato válido). `EXPO_ACCESS_TOKEN` é
opcional, conforme a segurança configurada no projeto Expo.

O sino no cabeçalho permite ativar as notificações do navegador. Web Push
requer permissão e contexto seguro: HTTPS ou localhost. O endereço LAN em
HTTP não permite ativá-lo. O service worker limpa a identidade ao sair da
conta e valida o destinatário antes de exibir/abrir uma notificação.
Referência: [PushManager no MDN](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe).

## Configuração do Android

**Atualização:** a configuração externa foi concluída na mesma data: projeto
Expo vinculado, Firebase criado, aplicativo Android cadastrado e credencial
FCM v1 enviada ao EAS. Veja o estado atual em
[Push em desenvolvimento e fotos de usuários](PUSH-DESENVOLVIMENTO-PERFIL.md).
O texto abaixo registra a pendência encontrada na revisão inicial.

Não foram encontrados ID de projeto EAS, `google-services.json` ou credenciais
FCM v1 do aplicativo. O código aceita:

```dotenv
EXPO_PUBLIC_EAS_PROJECT_ID=UUID_DO_PROJETO_EXPO
GOOGLE_SERVICES_FILE=CAMINHO_LOCAL_DO_GOOGLE_SERVICES_JSON
```

O `app.config.js` aplica essas opções sem colocar credenciais no código.
Também é preciso configurar a credencial FCM v1 no projeto EAS, regenerar a
configuração nativa com o arquivo Firebase e compilar/instalar um novo APK.
A instalação deve incluir `expo-notifications`; apenas recarregar Metro não
adiciona um módulo nativo ao APK existente.

O aplicativo pede a permissão do sistema automaticamente ao abrir, antes do
login. O registro do dispositivo para push exige a sessão autenticada.
Ao entrar novamente ou voltar ao aplicativo, o token é atualizado se a
permissão já tiver sido concedida. Falhas de conexão têm nova tentativa
automática; o botão de ativação foi removido. O toque na notificação valida a conta e
abre a conversa. O logout tenta desativar o registro do dispositivo.

Sem a configuração externa, o aplicativo mantém as mensagens funcionando e
informa que notificações ainda não estão disponíveis nesta versão.
Referência: [configuração oficial do Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/).
