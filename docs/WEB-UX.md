# Painel web — revisão de 01/11/2026

O painel aplica a linguagem visual do kit SnowUI enviado pelo usuário: Inter, base neutra, ações escuras e cartões azuis/lavanda. A referência e os limites de acesso estão em [DESIGN-REFERENCE.md](DESIGN-REFERENCE.md). A navegação permanece compacta e a lista de visitas é o ponto de partida. O ambiente permanece local.

## Organização

- Planejamentos apresentam situação e ações explícitas de consulta e edição. O nome abre as visitas; editar abre os dados gerais.
- O cadastro separa localidade, período e andamento. A classificação PNCD fica em uma seção expansível, com os mesmos códigos e campos existentes.
- Após criar um planejamento, o painel abre a aba Visitas. A aba selecionada permanece na URL e os dois painéis conservam o estado ao alternar.
- As visitas começam pela lista pesquisável. Adicionar e editar abrem um diálogo com endereço e número. Busca por CEP/endereço, complemento, tipo de visita, coordenadas e mapa estão em seções expansíveis.
- Fechar o diálogo permite continuar o cadastro. Cancelar edição descarta a alteração desse formulário. Salvar visitas continua sendo a confirmação das alterações na lista.
- Mapa, ficha clínica, exclusão com confirmação, arrastar para ordenar, setas de ordenação e otimização por proximidade permanecem disponíveis.
- Indicadores, agentes, aprovações, mensagens, configuração, permissões e autenticação mantêm os fluxos existentes.

A visão geral alterna entre Resumo e Visitas recentes, conservando os gráficos e a tabela com menos conteúdo simultâneo.

## Componentes

Os botões de ação e as seções expansíveis usam os factories de Button e Accordion do `@gluestack-ui/core`, com primitivas do React Native Web. Tabelas, diálogos e campos existentes do MUI permanecem integrados ao mesmo tema para preservar seu comportamento. O Vite resolve `react-native` para `react-native-web`.

## Verificação

- `node tests/planning-browser.mjs`: criação, classificação, ciclo zero, retomada do formulário, endereço, coordenadas, inclusão, edição, persistência após recarregar, ficha, mapa, ordenação manual e por proximidade, cancelamento, exclusão e demais rotas. As consultas externas de endereço usam respostas controladas; as gravações usam os serviços locais.
- `node tests/planning-catalog-browser.mjs`: catálogo local de municípios, classificação PNCD, ciclos 1 e 0 e persistência após recarregar.
- `node tests/ui.mjs`: rotas principais e formulário nas larguras 320, 390, 768 e 1440 px, sem transbordamento horizontal; botões de pelo menos 48 px, composição de mensagem, senha visível e atalho de teclado.
- `node tests/sessions-browser.mjs`: restauração da sessão, renovação automática, falha temporária e saída entre abas.
- `node tests/browser.mjs`: login, navegação, layout responsivo, entrega de mensagem privada entre contas locais de teste e saída.
- `npm --prefix inteliagent-webapp run build`: compilação de produção.

Capturas de conferência ficam em `.local/web-green-dashboard.png`, `.local/web-green-planning.png`, `.local/web-green-visits.png` e `.local/web-green-editor-390.png`. Os testes automatizados e a inspeção visual não substituem avaliação com agentes em campo.


### Indicadores ampliados na home

A visão geral exibe visitas cadastradas e realizadas, realizadas hoje e nos últimos 7 dias, taxa de realização, visitas a realizar, imóveis fechados, recusas, coleta, tratamento, percentual de coleta, regiões com visitas, cadastros em 90 dias e planejamentos por situação. Os períodos estão identificados nos rótulos; os demais totais são acumulados da sede. A taxa de realização usa realizadas / visitas cadastradas, e a taxa de coleta usa visitas realizadas com coleta / realizadas. Com denominador zero, o indicador apresenta zero.

A API de indicadores respeita a sede do usuário e exclui planejamentos e visitas removidos. Coleta e tratamento consideram atendimentos realizados. A consulta retorna zero nos conjuntos vazios. O botão Atualizar busca todos os conjuntos em paralelo e mostra o horário da última atualização bem-sucedida. Gráficos e visitas recentes continuam disponíveis.

Validação: `tests/home-metrics.mjs` verifica alterações controladas nos totais e exclusão de visitas removidas; `tests/home-metrics-browser.mjs` verifica os valores reais, percentual, atualização, alternância das visualizações e larguras de 320, 390, 768 e 1440 px. Build web, testes Maven e regressão geral de UI passaram.
