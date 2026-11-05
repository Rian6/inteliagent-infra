# Boletim PNCD, permissões e rotas

Atualização local: 01/11/2026. MySQL V40 e SQLite 0003 adicionam metadados de boletim e permissões sem remover registros ou filas existentes.

## Baixar o boletim

No painel web, clique em **Baixar PDF** no planejamento ou no ícone de PDF na listagem. A coluna **Visitas** mostra sempre a quantidade de registros ativos do planejamento, inclusive zero; visitas removidas e rascunhos locais não entram nessa contagem.

No mobile, abra as visitas do planejamento e escolha **Gerar boletim PDF**, depois **Gerar e compartilhar PDF**. O arquivo é gerado no aparelho com os atendimentos concluídos disponíveis no SQLite, inclusive os ainda não enviados ao servidor.

**Não há campos para preencher ao baixar.** Todos os dados vêm dos cadastros salvos. Se faltar informação, a interface explica o problema e oferece acesso ao planejamento ou às visitas para corrigir o cadastro.

Na criação de um planejamento, web e mobile exigem nome, zona, ano, município, categoria, atividade, tipo da localidade, ciclo (inclusive zero) e código oficial da localidade. Esses campos ficam visíveis e são validados antes de salvar. A data da visita já vem preenchida no formulário. Município/categoria/atividade/tipo são cadastrados uma única vez e usados pelo cabeçalho do PDF. O supervisor permanece opcional; dados coletados durante o atendimento continuam no cadastro da visita.

A mesma exigência é aplicada às duas APIs para registros novos. Edições de planejamentos antigos preservam a compatibilidade e os códigos anteriores. No mobile, a validação ocorre antes da transação que grava o planejamento e a fila offline.

No planejamento, cadastre município, classificação, ciclo e **Dados para o boletim PDF** (código da localidade e supervisor). Nas visitas, **Dados do boletim** reúne quarteirão, face, sequências, horário e agente. A inspeção inclui LI; o tratamento permite registrar gramas do larvicida L1 e um segundo produto L2. As quantidades antigas de carga permanecem preservadas. Registros antigos sem identificação exigem a confirmação do agente no cadastro da visita; não se inventa um código profissional a partir do ID interno.

Cada frente A4 em paisagem contém até 20 imóveis de um mesmo dia/agente e é seguida por um verso referente àquela frente. O verso contém:

- Resumo de campo: imóveis por tipo, focal/perifocal, inspeção, recuperados, tubitos, pendências, depósitos, larvicidas/adulticidas, imóveis informados e quarteirões trabalhados/concluídos.
- Resumo do laboratório: quarteirões positivos, depósitos e imóveis por espécie/tipo, larvas, pupas, exúvias, adultos, datas, laboratório e laboratorista.

Os totais são calculados a partir das visitas da frente correspondente. Marque **Morador orientado / imóvel informado** e **Quarteirão concluído nesta visita** no cadastro quando aplicável. Na etapa de amostras do mobile, ou em **Dados do boletim** no web, abra **Resultado do laboratório** somente após a análise. Confirme a conclusão e preencha datas, laboratório, laboratorista e quantidades por espécie. As seções por espécie ficam recolhidas. Datas, identificação e quantidades são validadas no cliente e nas duas APIs de gravação.

Sem resultados laboratoriais concluídos, o verso identifica essa situação e mantém os resultados em branco. Não é necessário inventar resultados para emitir. Assinaturas permanecem manuais. Textos extensos recebem referências e páginas de complemento para não ultrapassar as linhas. O município/UF vem do catálogo IBGE e deve corresponder ao planejamento quando já classificado; o cabeçalho municipal não usa a marca de outro estado.

Referência de estrutura: [manual oficial do PNCD](https://saude.rs.gov.br/upload/arquivos/carga20190402/15170227-27095308-instrutivo-para-preenchimento-dos-boletins-de-campo.pdf) e imagem de frente/verso fornecida pelo usuário. O arquivo gerado não certifica homologação municipal.

## Permissões

**Configuração → Permissões de planejamentos** permite ao administrador da sede buscar usuários por nome/email e conceder separadamente cadastro e edição de planejamentos a qualquer usuário aprovado e ativo da mesma sede, incluindo administradores. O servidor valida a permissão atual no salvamento web e na sincronização, sem liberação automática pelo perfil ADMIN. A migração V41 preserva o acesso dos administradores existentes; depois disso, as duas opções são controladas por usuário. O acesso administrativo às configurações continua disponível mesmo quando o próprio administrador não tem permissão para planejar. Offline, o app mantém a última autorização recebida; uma revogação impede o envio ao reconectar sem apagar o trabalho local. Atualizar permissões não prolonga a sessão offline nem recria uma sessão encerrada.

A sede local de teste tem código **64003**. `python scripts/seed-permissions-fixture.py` prepara o agente sintético somente no MySQL isolado da porta 3308, usando a configuração local. O teste termina com criação ativada e edição desativada.

## Rotas

As configurações também oferecem **Adicionar visitas a planejamentos** e **Alterar a ordem das visitas**, independentes por usuário aprovado da sede. Valem para agentes e administradores no web e no mobile. Adicionar sem reordenar coloca a nova visita no fim da rota; retirar as duas permissões mantém o preenchimento das visitas existentes. Editar dados de imóveis pelo painel e excluir visitas continuam seguindo o acesso administrativo existente.

A migração V42 preserva a criação de visitas dos usuários existentes e a reordenação dos administradores existentes. Novos usuários começam sem essas duas permissões. Atualizações enviadas por versões antigas das configurações preservam os novos campos quando eles forem omitidos. Login, renovação de sessão e atualização periódica das permissões incluem os dois campos; o servidor consulta a concessão atual ao gravar.

No mobile, **Rota → Alterar ordem** apresenta setas de subir/descer, salvar e cancelar. A gravação usa a transação e a fila durável offline existentes. No painel, setas, arraste e ordenação por proximidade aparecem somente quando autorizados. O endpoint de reordenação exige a lista completa de visitas ativas do planejamento; uma lista desatualizada é recusada para evitar perder visitas adicionadas em outro dispositivo.

Web e mobile usam a geometria viária da [API Route do OSRM](https://project-osrm.org/docs/v5.24.0/api/#route-service), no perfil carro e na ordem das visitas. A ordenação manual e por proximidade continua disponível. Até 100 paradas por consulta; falhas e tempo limite mantêm os marcadores e informam a indisponibilidade, sem desenhar uma rota fictícia em linha reta. Mapas e cálculo viário precisam de internet; o ambiente usa o serviço público de demonstração.

## Validação

- Testes Maven e APIs reais: dados laboratoriais, datas e quantidades inválidas, preservação da situação da visita, permissões e contagem ativa de visitas 0/1/2.
- `node tests/reports.mjs`: paginação frente/verso, município, ciclo zero, agentes/datas, limites de todas as células, textos longos e resultados ausentes.
- `node tests/daily-summary.mjs`: agregação, espécies, quarteirões únicos e validação do laboratório.
- `node tests/duplex-api.mjs`: cadastro real, validação nas duas APIs, emissão com dados salvos e contagem de visitas. Grava registros sintéticos no runtime local.
- `node tests/reports-browser.mjs`: download direto no planejamento e na lista, ausência de formulário na emissão, contador, edição dos dados laboratoriais e tela estreita.
- `node tests/mobile-laboratory-browser.mjs`: seções recolhidas, validação, avanço entre etapas e retenção dos resultados no formulário real mobile em prévia React Native Web.
- Regressões de planejamento/visitas e responsividade do painel; TypeScript, 55 testes offline/lógica e exportação Android.

O compartilhamento/impressão nativos e a aparência em aparelho físico precisam de conferência no dispositivo. As prévias usam componentes reais, com serviços específicos do dispositivo simulados.

- `node tests/required-planning.mjs`: validação dos campos obrigatórios, persistência do código e ciclo zero, recusa de criações incompletas no web e na sincronização.

- `tests/user-planning-permissions.mjs` verifica administradores e agentes na lista, concessão/revogação e independência entre cadastrar e editar nas duas APIs.
- `tests/user-planning-permissions-browser.mjs` verifica busca, salvamento, botões e campos conforme permissão, acesso às configurações e responsividade. Os testes restauram as permissões originais ao terminar.

- `tests/visit-permissions.mjs`: permissões independentes, agentes e administradores, inclusão pelo web e sincronização, inclusão no fim da rota, repetição idempotente, atendimento existente, reordenação nas duas APIs e compatibilidade com clientes anteriores.
- `tests/visit-permissions-browser.mjs`: configurações, busca, concessão/revogação, inclusão sem reordenação e reordenação sem inclusão, ordem persistida e larguras 320/390/768/1440. Restaura permissões e a ordem ao terminar.
- `tests/mobile-visit-permissions-browser.mjs`: tela real de rota em prévia React Native Web, botões conforme permissão, mover, cancelar, salvar e agendar sincronização. Testes offline usam SQLite real para validar bloqueio de inclusão, manutenção do atendimento, integridade dos registros e fila durável da reordenação (57 testes no conjunto).
