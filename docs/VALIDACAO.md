# Validação local e pontos de atenção

Verificações executadas em 29/10/2026, no workspace `D:\inteliagent`, sem commits, push ou publicação.

## Evidências

| Verificação | Resultado |
|---|---|
| Descoberta no GitHub | Sete repositórios `Rian6/inteliagent-*`, clonados localmente |
| Java | Builds de auth, main-server e load-server concluídos; 18 testes passando (9 + 4 + 5) |
| Migrações | 35 migrações Flyway aplicadas no MySQL isolado da porta 3308; esquema SQLite gerado a partir de entidades Drizzle |
| Integração HTTP e Socket.IO | 11 testes Python passando, incluindo dois testes próprios do chat |
| Navegador | Login, navegação, planejamento responsivo, chat entre dois usuários e logout; sem exceções JavaScript não tratadas |
| Painel | Build Vite de produção concluído |
| Aplicativo | `expo install --check`, TypeScript 6 `tsc --noEmit`, `drizzle-kit check` e exportação Android Hermes passaram |
| Offline first | 25 testes com SQLite real, incluindo migração de entidades gerada, mais round trip Java/MySQL |
| Android nativo | APK debug arm64 compilado com sucesso; `inteliagent-app/android/app/build/outputs/apk/debug/app-debug.apk` (requer Metro); log `inteliagent-app/native-build-short.log` |
| Dependências Maven | 101 coordenadas verificadas no OSV, sem avisos retornados |
| Dependências Python | 19 dependências de runtime verificadas pelo pip-audit, sem vulnerabilidades conhecidas reportadas |
| Dependências web | `npm audit`: zero vulnerabilidades reportadas |
| Dependências mobile | Auditoria de produção: 8 avisos baixos com backport local; auditoria incluindo ferramentas de desenvolvimento: 4 moderados herdados de `drizzle-kit`/`esbuild` antigo |
| Git | Nenhum arquivo staged; os HEADs dos sete repositórios permanecem nas revisões clonadas |
| Credenciais antigas | Os três literais expostos identificados na revisão não aparecem mais nos arquivos ativos dos repositórios |

Logs, relatórios JSON e capturas de tela ficam em `.local/`. Essa pasta tem permissões locais restritas ao usuário atual e ao sistema, além de estar ignorada pelo Git. Não publique seu conteúdo: há credenciais de teste, tokens em logs de falhas históricas e emails de desenvolvimento.

## Cobertura dos testes de integração

- Rejeição de requisições sem autenticação e de tokens falsificados.
- Conversão de senha legada para BCrypt após login correto, sem senha/hash na resposta.
- Isolamento de sede em leitura e escrita; agente não ganha permissão de administrador.
- Rejeição do protocolo antigo de SQL e de tabelas/colunas não autorizadas.
- Reenvio idempotente, confirmação por tabela/ID, rollback de lote e snapshot controlado pelo servidor.
- Indicadores e otimização de rota, incluindo coordenadas inválidas.
- Remetente derivado do token e entrega restrita aos dois participantes do chat.
- Cadastro com email verificado, aprovação administrativa e impossibilidade de cadastrar o próprio papel como administrador.
- Recuperação de senha com SMTP local e rejeição do token antigo em todos os serviços.

O teste de navegador também envia uma mensagem entre duas sessões reais do painel, exercitando o transporte Socket.IO disponível no runtime Windows.

## Backport de deepmerge

O Expo atual ainda depende de `deepmerge@4.3.1`, apontado por [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). O `postinstall` do aplicativo aplica um filtro de chaves de protótipo e verifica os casos com objetos comuns e sem protótipo. O patch é mantido em `inteliagent-app/scripts/harden-deepmerge.cjs` e falha explicitamente se o código upstream mudar.

O auditor verifica a versão declarada e continua mostrando oito apontamentos de baixa severidade, incluindo sua propagação aos consumidores. Portanto, não foi registrado como “audit zerado”. O CLI, a checagem de dependências, o prebuild e a exportação Android foram executados com o backport. Quando o upstream disponibilizar uma correção compatível, substitua o backport pela versão corrigida e repita essas verificações.

O gerador `drizzle-kit` ainda inclui `@esbuild-kit/core-utils` com `esbuild@0.18.20`, sinalizado com severidade moderada para servidor de desenvolvimento. O pacote é dependência de desenvolvimento e não entra no bundle Android; `npm audit --omit=dev` mostra apenas os oito avisos baixos acima. Uma tentativa de substituir só o `esbuild` transitivo gerou uma árvore de dependências inválida, então a substituição foi revertida. Atualize o gerador quando ele remover essa cadeia e repita `drizzle-kit check`, `typecheck` e a exportação.

## Limites e ações externas

- **Revogue no provedor as credenciais que já estiveram expostas**, especialmente a senha de aplicativo SMTP e a senha antiga de banco caso tenham sido reutilizadas. A remoção dos arquivos não revoga credenciais nem elimina o histórico remoto. Nenhuma conta externa foi alterada nesta tarefa.
- Uma chave de mapas é opcional. Configure-a por ambiente e restrinja origem e APIs no provedor. Planejamento e cadastro manual de visitas funcionam sem ela.
- O ambiente local usa o MySQL 8.0 já instalado, em datadir separado. Não substituiu a instalação existente. Preserve `lower_case_table_names=1` no ambiente compatível, pois o histórico original mistura capitalização de tabelas.
- Os testes Python foram executados com o Python 3.10.1 disponível na máquina. A auditoria de pacotes não é uma auditoria de segurança do interpretador ou do sistema operacional.
- O app foi empacotado para Android; interações em dispositivo físico e build iOS não foram validados neste Windows.
- O SMTP de desenvolvimento não entrega emails externos. Para uso fora desse ambiente, configure SMTP autenticado com TLS.
- HTTPS, origem real, backups, gestão de segredos e observabilidade de infraestrutura precisam ser configurados no ambiente de implantação. O runtime desta tarefa escuta somente em loopback.
- O modelo atual usa um banco compartilhado, uma instância por serviço, limites em memória e snapshots de sincronização em memória. Escalar horizontalmente exige compartilhar esses estados e o gerenciador de salas do Socket.IO.
- A sincronização detecta conflitos por versão e exige uma escolha explícita do usuário. Não implementa fusão automática de campos nem CDC; veja [SINCRONIZACAO.md](SINCRONIZACAO.md).
- O trabalho offline exige uma primeira autenticação online e planejamentos previamente baixados. A autorização local dura até sete dias; a sincronização requer token válido e ocorre com o app aberto. Revogação remota só pode ser detectada quando houver comunicação.
- O chat e os mapas online requerem conexão. O upload de imagens de amostra não existia no fluxo original e não foi habilitado; imagens presentes em rascunhos antigos impedem a finalização, preservando o rascunho para não descartar anexos silenciosamente.

As auditorias registram o que as bases consultadas reportaram no momento da execução. Não substituem revisão de implantação ou uma avaliação independente de segurança.

