# Limites de escala e divisão dos serviços

Avaliação local de 29/10/2026. O ambiente usa uma instância de cada serviço e MySQL isolado na porta 3308. `python benchmark_runtime.py` mede pequenas amostras dos endpoints e grava `.local/benchmark.json`; os números são uma referência desta máquina, não uma capacidade de produção.

| Endpoint local | Amostras | p50 | p95 observado |
|---|---:|---:|---:|
| Auth `/actuator/health` | 8 | 20,3 ms | 32,0 ms |
| Operações `/api/planejamento-list` | 8 | 26,8 ms | 31,2 ms |
| Sincronização, primeira página | 4 | 45,4 ms | 63,3 ms |
| Chat `/users` | 8 | 31,0 ms | 33,7 ms |
| Painel `/` | 8 | 15,3 ms | 28,6 ms |

As consultas de primeira página da sincronização custaram mais que as outras leituras nesta amostra; são cinco tabelas por pedido. A amostra é pequena e sequencial, portanto não revela saturação sob concorrência. O benchmark desativa o proxy do ambiente para medir os processos locais diretamente.

| Projeto | Caminho crítico e decisão |
|---|---|
| `auth` | BCrypt e consultas de identidade continuam no pedido. Cadastro e recuperação só gravam o código e uma linha na `email_outbox`; o SMTP é entregue por worker agendado fora da transação HTTP, com claim atômico, lease, até cinco tentativas e expiração. Isso evita ocupar threads HTTP durante a espera de até cinco segundos do SMTP. A fila já é durável no banco e não exige outro microserviço para esta carga. |
| `main-server` | Escritas e leituras de planejamento/visita continuam síncronas para devolver resultado transacional. O cálculo de rota é separado em `RouteOptimizationService`, tem limite de 200 visitas, matriz de distância calculada uma vez, tempo de solver de dois segundos e semáforo de duas execuções. A terceira requisição recebe 503 com `Retry-After`; ela não ocupa um trabalhador esperando a rota. Se houver demanda sustentada de rotas grandes, mover apenas esse caso de uso para um worker com status de tarefa. |
| `load-server` | Upload, versões e reconhecimento precisam de resposta síncrona para a outbox local manter atomicidade e idempotência. `SyncService` cuida da escrita e `SyncDownloadService` da leitura. O download é paginado em até 500 linhas por tabela e as consultas têm índices de sede/atualização. O estado de snapshot ainda reside em memória, com validade de cinco minutos e teto de 1000 sessões: múltiplas réplicas exigem armazenar cursores em uma tabela/Redis compartilhado ou afinidade de sessão. Uma fila não substitui esse estado. |
| `chat` | Mensagem é persistida antes do ACK; o histórico usa limite de 100 por página. A instância local usa oito threads Waitress e pool de cinco conexões MySQL. O envio a salas Socket.IO é assíncrono em relação ao cliente. Para múltiplas réplicas é necessário um gerenciador compartilhado de salas, por exemplo Redis, e limites distribuídos. Enfileirar a gravação antes do ACK permitiria perda ou duplicação sem protocolo adicional. |
| `webapp` | Build estático Vite com divisão de código por rota. A navegação não mantém conexões de banco. Escala por servidor de arquivos/CDN; nenhum serviço adicional. |
| `app` | Escrita local e outbox no mesmo commit SQLite; sincronização é agendada após salvar e no retorno da rede/primeiro plano. Os uploads usam lotes e backoff persistido. Um broker remoto não melhora o funcionamento sem conexão. |
| `migration` | Processo Flyway finito, executado antes dos serviços. Não atende tráfego nem precisa de fila. |

## Decisão de fragmentação

As responsabilidades já estão distribuídas entre autenticação, operações, sincronização, chat e migração. O código agora separa explicitamente downloads de uploads e cálculo de rota da API de visitas. Criar novos processos agora aumentaria latência, implantação e transações distribuídas sem evidência de saturação. A primeira extração futura seria o cálculo de rota **somente** se a fila de espera por CPU se tornar frequente. Para escalar o download e o chat horizontalmente, os estados compartilhados acima precisam ser resolvidos antes da replicação.

## Verificações

- Java: 9 testes de autenticação, 4 de operações e 5 de sincronização, incluindo fila de email, concorrência da rota e cursor de download.
- Python: 11 testes de integração e chat com MySQL/SMTP locais.
- Mobile: 25 testes SQLite, incluindo esquema gerado, outbox, reinício, conflito e migração de conta.
- A medição HTTP cobre saúde de auth, lista de planejamentos, primeira página de sync, usuários do chat e raiz do painel. Para decidir capacidade de produção, repetir com carga concorrente e dados representativos, observando p95, pool de conexões, CPU, memória e tempo de fila.
