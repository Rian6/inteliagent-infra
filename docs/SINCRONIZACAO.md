# Contrato de sincronização v3 e funcionamento offline

App e load-server precisam ser atualizados juntos. Todas as chamadas exigem JWT válido. O servidor recusa SQL enviado pelo cliente e valida sede, permissões, UUIDs, parentesco, colunas e limites de tamanho.

## Escrita e envio

SQLite é a fonte imediata da interface. Cada conta e sede possui seu próprio arquivo. Uma visita e seus registros de inspeção, amostra e tratamento formam um agregado: dados e operações de envio são gravados na mesma transação. Não há acesso à rede nessa transação. Os rascunhos também persistem no SQLite e só são removidos quando a finalização local é confirmada.

`POST /api/sync` recebe até 500 operações, com limite de corpo de 2 MB:

```json
[{
  "mutationId": "6d46f197-30bc-42d2-91cc-e0c1b158559a",
  "baseVersion": 0,
  "id": "c456104c-8c8e-4b8f-a73f-543507147574",
  "tabela": "VISITA",
  "values": {
    "ID": "c456104c-8c8e-4b8f-a73f-543507147574",
    "ID_PLANEJAMENTO": "49ba2f43-1274-44da-9949-0cb1728b7f8a",
    "NOME": "Rua de exemplo",
    "SITUACAO": 1
  }
}]
```

O mobile envia lotes de até 100 operações e aproximadamente 512 KB; nunca divide um agregado. A versão inicial é zero e a primeira gravação aceita recebe versão 1. Atualizações precisam declarar a versão conhecida. A resposta inclui:

```json
{"applied":[{"mutationId":"6d46f197-30bc-42d2-91cc-e0c1b158559a","version":1}],"conflicts":[],"confirmedIds":["VISITA:c456104c-8c8e-4b8f-a73f-543507147574"]}
```

`sync_mutations` guarda a identidade da operação, usuário, registro, hash do conteúdo e versão aplicada, na mesma transação da escrita. Repetir a mesma operação retorna sua confirmação original; reutilizar o UUID com conteúdo ou usuário diferente é rejeitado. Assim, perder a resposta depois do commit não duplica dados. Esse ledger não deve ser eliminado sem uma política de retenção compatível com dispositivos desconectados.

Operações ainda não tentadas podem ser condensadas. A partir da primeira tentativa, UUID e conteúdo permanecem imutáveis. Uma edição durante o envio cria uma operação dependente e recebe a versão confirmada da anterior antes de ser transmitida. Somente os UUIDs efetivamente confirmados saem da fila. Estados em andamento são recuperados após reiniciar o processo.

Erros de rede usam retry persistente, backoff exponencial e jitter, limitado a cinco minutos. HTTP 429 respeita Retry-After dentro desse limite. Um único sincronizador controla o fluxo. Eventos de rede, retorno ao primeiro plano e um intervalo de um minuto retomam o envio com o app aberto. Não há promessa de execução com o aplicativo encerrado pelo sistema.

## Concorrência e rejeições

Versões divergentes retornam HTTP 409 com `conflicts`, contendo `mutationId`, `serverVersion` e `serverValues`. O lote inteiro é revertido; o cliente separa agregados independentes para que um conflito não bloqueie os demais. Todos os registros de um agregado conflitante ficam preservados para uma decisão explícita.

A tela “Rascunhos, conflitos e envio” permite manter o conjunto local, gerando novas operações com as versões atuais, ou substituir o conjunto local pelos dados do servidor. A segunda escolha pede confirmação e agenda reconciliação completa. Uma nova edição remota pode gerar outro conflito. Não há sobrescrita silenciosa nem fusão automática de campos.

Erros permanentes de validação/permissão ficam visíveis para revisão. Um novo login mantém os arquivos, rascunhos e fila da conta. Trocar de usuário não transmite dados da conta anterior com a identidade nova.

## Download e confirmação

`GET /api/consumer/{idUsuario}?clientId=<UUID-do-dispositivo>&isLoadFull=false&offset=0` inicia um download. O ID corresponde ao usuário autenticado; o watermark pertence ao par usuário/dispositivo. O cliente não determina o timestamp do watermark.

A resposta contém `downloadId`, `nextOffset` e `consumerLoadsList`. Cada item tem `tableName`, `rows` e `hasMore`; cada linha inclui `__version`. Há até 500 linhas por tabela/página. Continue com o mesmo `downloadId`, `clientId` e `nextOffset` enquanto houver páginas. O servidor usa cursores de ID por tabela: alterações nas páginas anteriores não deslocam os próximos registros, como ocorreria com OFFSET SQL.

O download usa um limite temporal do servidor. Há sobreposição de 30 segundos nos incrementais e timeout de 15 segundos nas escritas da aplicação. Uma linha alterada durante o download é recebida no incremental seguinte. Escritas externas e transações administrativas longas exigem reconciliação completa; este protocolo não substitui CDC.

Cada página e o progresso são aplicados na mesma transação SQLite. Versões antigas não regridem dados; registros com alterações locais ficam preservados, com a versão remota guardada separadamente. Um processo interrompido retoma o progresso. Um snapshot expirado/reinício do servidor reinicia o download sem apagar a fila.

Depois de persistir todas as páginas:

```text
POST /api/consumer-confirm/{idUsuario}?downloadId=<snapshot>
```

O corpo contém os nomes de todas as tabelas concluídas. Apenas downloads completos, pertencentes ao usuário e não expirados podem avançar o watermark. O estado do download expira após cinco minutos. Confirmações perdidas provocam repetição segura; o cliente não apaga operações locais para recuperar um download.

Exclusões são lógicas (`SITUACAO=0`). O download completo inclui tombstones e ignora registros de outras sedes.

## Sessão offline e migração

O primeiro uso exige autenticação online e os planejamentos necessários previamente baixados. SecureStore mantém o token e uma concessão local da conta, com validade de sete dias desde o login online e proteção contra retrocesso significativo do relógio. O token de acesso expira em 30 minutos: o trabalho local continua, mas um novo login é necessário para transmitir dados. Revogação no servidor só pode ser detectada quando há comunicação. Logout encerra o acesso à conta sem apagar seu arquivo SQLite.

O arquivo legado `database.db` é copiado somente quando sua conta e sede correspondem à identidade autenticada. A fila legada é convertida de forma transacional; o arquivo original é preservado. Registros legados sem versão são tratados como conflitos quando já existem no servidor, permitindo escolher a versão em vez de presumir que uma delas pode ser descartada.

Chat requer conexão. Imagens em rascunhos antigos são preservadas e bloqueiam a finalização até existir um transporte de anexos apropriado; o fluxo original não enviava essas imagens. Essa limitação é apresentada como erro e não provoca descarte silencioso.
