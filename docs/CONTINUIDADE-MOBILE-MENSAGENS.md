# Mobile, mensagens e dados do planejamento

## Configurações por usuário

O painel usa uma lista pesquisável da equipe e um editor para a pessoa selecionada. As quatro permissões foram agrupadas em Planejamentos e Visitas e rota, com descrições, estados explícitos, indicação de alterações pendentes e ações de salvar/descartar. Trocar de usuário com um rascunho aberto oferece salvar, descartar ou continuar editando; falhas no salvamento preservam as alterações. A preferência de aprovação de novos cadastros fica separada como configuração da sede.

## Navegação mobile

As abas seguem a ordem Visão geral, Planejamentos e Mensagens, com margens e altura ajustadas à área segura e tamanho de fonte. O cadastro de planejamento usa um título contextual no cabeçalho. A emissão do boletim tem cabeçalho próprio e não repete o botão de voltar no conteúdo. A revisão de pendências também usa o cabeçalho existente. As etapas mantêm validação e acesso sequencial, com menos repetição de títulos e margens horizontais alinhadas. O botão de criar planejamento continua flutuante e respeita a permissão individual.

## Mensagens

O campo de composição fica fora da lista de mensagens, com altura limitada para várias linhas e tratamento do teclado com compensação do cabeçalho. A identidade vem da sessão ativa, sem a consulta síncrona antiga ao SQLite. A conexão não é reiniciada por uma simples atualização das permissões do perfil. O envio aguarda confirmação; falhas mantêm o texto e o anexo. O identificador de mensagem evita duplicação ao repetir uma tentativa já recebida pelo servidor.

O mobile permite selecionar emojis, escolher imagens e gravar áudio com prévia, cancelar, ouvir e enviar. A permissão de microfone é solicitada ao gravar. A configuração do Expo e o AndroidManifest permitem a gravação. O áudio usa [expo-audio para SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/audio/); as imagens são convertidas em JPEG e redimensionadas antes do envio. O painel web também envia e recebe imagens, arquivos de áudio e emojis.

Anexos são enviados por HTTP autenticado e referenciados nas mensagens. O servidor valida participantes da mesma sede, tipo de arquivo e tamanho. Só os participantes podem baixar o arquivo; URLs não carregam tokens. Limites: 8 MB por imagem, 12 MB por áudio e 3 minutos na gravação do aplicativo. A migração V43 adiciona os metadados dos anexos e o identificador idempotente da mensagem. Arquivos ficam em `data/chat-media`, ou em `CHAT_UPLOAD_DIR` quando configurado. O runtime local usa polling compatível com Waitress, sem anunciar uma atualização WebSocket que esse servidor não suporta.

## Planejamento e PDF

O código da localidade foi movido para os dados da localidade. Município, categoria, atividade e tipo usam a classificação existente; não há seção separada “Dados para o boletim PDF”, supervisor digitável ou chave manual de conclusão.

O servidor registra nome e ID do criador ao cadastrar o planejamento, tanto na API web como no upload do aplicativo. O supervisor é esse nome, preservado nas edições e protegido contra valores enviados pelo cliente. O cadastro offline também guarda o nome da sessão; o servidor confirma a identidade autenticada na sincronização. Nos registros antigos, foi recuperado o criador quando havia uma mutação de criação identificável. Nos demais registros da sede de teste, o supervisor foi definido como Administrador Web, conforme escolha do usuário; isso é registrado como responsabilidade legada, sem inventar um criador histórico. A auditoria está em `.local/planning-supervisors-backfill.json`.

O PDF calcula a conclusão sobre todas as visitas ativas do planejamento, incluindo imóveis ainda não atendidos: deve haver pelo menos uma visita e todas devem estar realizadas (situação 3). Imóveis fechados, recusados ou ainda abertos mantêm a localidade não concluída. Visitas excluídas não entram nessa conta. O filtro de data e agente utilizado para paginar as folhas não altera esse cálculo. Supervisor e conclusão não aceitam sobrescrita manual na emissão. Frente, verso, laboratório e demais campos foram preservados.

## Verificação

- `tests/permission-settings-browser.mjs`: seleção individual, busca, estados pendentes, descartar, salvar ao trocar, recuperação de erro, preservação de outros usuários e responsividade.
- `tests/test_chat_service.py` e `tests/test_chat_media.py`: transporte, sessão, autorização dos anexos, limites, download com Range, emojis, histórico e repetição de envio.
- `tests/chat-media-browser.mjs`: upload, recebimento e abertura autenticada de imagem/áudio entre dois navegadores, emojis e histórico após recarregar.
- `tests/mobile-chat-browser.mjs`: componentes reais em React Native Web, composição ao digitar e reduzir a janela, emojis, envio confirmado, permissão negada, gravar/cancelar/prévia e imagem. Os serviços nativos são simulados nessa prévia.
- `tests/planning-automatic-report.mjs`: criador autenticado nas duas APIs, supervisor imutável, replay, conclusão derivada de todas as visitas e contexto do município no PDF.
- Regressões de planejamento/visitas, etapas mobile, laboratório, reordenação, PDF, testes offline, TypeScript e exportação Android.

A gravação/reprodução no microfone e o comportamento do teclado físico do sistema precisam de conferência no aparelho. A prévia com janela reduzida e a exportação Android não equivalem a esse teste.
