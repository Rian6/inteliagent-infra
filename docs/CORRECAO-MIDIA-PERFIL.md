# Envio de mídia e fotos de perfil — 02/11/2026

O Expo instalado substitui o `fetch` global pelo transporte do Expo. Seu
serializador multipart rejeita objetos React Native `{ uri, name, type }` com
`Unsupported FormDataPart implementation`, antes de fazer a requisição HTTP.
O chat utilizava esse formato para imagens e gravações, bloqueando os dois tipos
de anexo. O envio agora usa o cliente autenticado existente com o adaptador XHR,
que lê arquivos locais e define o boundary multipart. Mantém cancelamento,
limite de tempo, renovação de token e preservação do anexo em caso de falha.

O perfil no cabeçalho web era carregado somente ao iniciar a sessão. Agora ele
é atualizado ao voltar à janela/aba e a cada 30 segundos enquanto visível.
Os avatares do chat usavam somente iniciais. A lista de contatos agora fornece
uma referência versionada à foto; o painel busca os bytes com autenticação e
revoga as URLs temporárias ao substituir a imagem ou desmontar o componente.
Lista, cabeçalho da conversa e detalhes mostram a foto quando disponível.

`GET /users/{id}/photo` permite somente usuários ativos e aprovados da mesma
sede da sessão autenticada. Respostas são privadas, sem cache compartilhado e
sem tokens na URL. O provisionamento inclui leitura da tabela de imagens e da
coluna de referência para o serviço de chat. Essas permissões foram aplicadas
ao MySQL local isolado da porta 3308 e apenas o chat foi reiniciado.

Validações concluídas:

- Reprodução do erro com o serializador real do Expo instalado.
- TypeScript do mobile e build de produção web.
- Exportação Android em `.local/media-fix-android-export`.
- Quatro testes de API/chat, incluindo isolamento das fotos entre sedes.
- Envio e recebimento reais de imagens/áudios entre dois navegadores,
  download autenticado e recuperação do histórico.
- Atualização da foto sem recarga e imagens autenticadas dos contatos,
  incluindo remoção, em `tests/profile-refresh-browser.mjs`.
- Interface mobile de mensagens no navegador, com serviços nativos simulados.

O teste de envio no celular físico continua pendente: nenhum dispositivo estava
conectado ao ADB. A exportação não instala um APK. No desenvolvimento com Metro,
recarregue o aplicativo para obter o código corrigido.
