# Restauração dos fluxos de planejamento e visitas

Complemento desta revisão: [comparação efetiva com o Figma](REVISAO-FIGMA.md), com quantidades por inspeção, fotos de amostras, tipo normal/retorno, dados do imóvel, configuração de aprovação e pendências de negócio. A observação histórica abaixo sobre ausência de envio de fotos foi superada pela migração V37 e pelo novo contrato de amostras.

Revisão de 30/10/2026. Comparação feita com os arquivos originais no Git local: mobile `2743c0d` e web `ea647f8`. As mudanças de interface anteriores não preservaram toda a experiência desses arquivos; esta revisão recupera os fluxos abaixo sem remover a persistência e sincronização offline atuais.

## Comparação e correções

| Fluxo original | Correção aplicada |
| --- | --- |
| Criar/abrir/editar um planejamento pelo mobile | Editor com nome, zona, ano, data e situação; ações para salvar e abrir visitas; entrada pelo item da lista e atalho para visitas |
| Criar uma visita vinculada ao planejamento | Corrigida a leitura dos parâmetros no layout das abas: os parâmetros do índice aninhado precisam ser lidos pelo contexto global e capturados na inicialização |
| Consulta automática do endereço por CEP | Consulta ao completar oito dígitos, botão para repetir, máscara, estados de carregamento/erro, preenchimento manual e proteção contra respostas antigas sobrescreverem a edição |
| Situações Normal/Recusado/Fechado | Seleção explícita, compatibilidade com os valores antigos N/R/F e finalização direta para imóvel fechado/visita recusada |
| Datas da visita e do retorno | Campos controlados que também exibem os valores de registros reabertos; cancelamento do seletor não altera a data |
| Inspeção A1/A2/B/C/D1/D2/E | Recuperadas as sete imagens originais, descrições e seleção, com layout flexível |
| Coleta de amostras | Número inicial/final e quantidade, com estado de coleta e reabertura dos valores persistidos |
| Tratamento focal e perifocal | Campos independentes para tipo, carga e depósitos tratados; ambos podem coexistir e voltar preenchidos após reabrir a visita |
| Editar uma visita | Reabertura do registro/rascunho, preservação do ID, datas, sequência e coordenadas; atualização sem duplicar filhos |
| Visualizar a rota | Mapa com marcadores numerados, sequência, lista e abertura da visita/navegação externa; mapa web e mobile usam OpenStreetMap/Leaflet sem exigir a chave Google embutida no original |
| Buscar, incluir, editar, ordenar e salvar visitas no web | Busca por rua/cidade/UF, consulta de CEP, edição dos itens, mapa para ajustar o ponto, ordenação por setas/arraste e proximidade |
| Criar visitas pelo endereço HTTP da rede | Geração de UUID compatível com o acesso HTTP LAN, que não disponibiliza `crypto.randomUUID` em todos os navegadores |

A pesquisa de rua/CEP identifica o endereço. As coordenadas retornadas por um provedor de CEP representam uma referência geográfica e podem não estar disponíveis; o formulário web permite confirmar/ajustar o ponto no mapa. A linha do mapa e a ordenação por proximidade representam a sequência geográfica, sem prometer um trajeto calculado pelas ruas.

O código original da amostra tinha funções auxiliares de seleção de fotos, mas não renderizava os controles de anexos nesse fluxo. Esta revisão não adiciona um botão que anuncie envio de fotos sem suporte correspondente no contrato de sincronização.

## Conta usada e integridade

Os testes nativos usaram `teste.mobile@inteliagent.local`, a mesma conta fornecida para o telefone. Ela passou de AGENT para ADMIN para poder criar e editar planejamentos. Email, senha e sede foram preservados. Os dados continuam no MySQL isolado da porta 3308. Outras contas mantêm suas permissões.

Os tratamentos focal e perifocal usam linhas distintas em `TRATAMENTO`, identificadas em `TIPO` por `FOCAL:` e `PERIFOCAL:`. O carregamento mantém compatibilidade com o tipo de tratamento legado. Atualizações reutilizam IDs e inativam modalidades removidas; os totais gerais são gravados uma única vez.

## Verificação nativa

Executado no app Android instalado no emulador API 34, com ADB/UIAutomator, resolução 1080 × 2340 e densidade 480 dpi. Essa configuração exercita uma largura de 360 dp e foi verificada com fontes em 100% e 130%; não equivale a um teste físico em um Samsung S23/One UI.

Percurso realizado com a conta mobile:

1. Login, criação de planejamento, preenchimento de nome/zona/ano/data/situação e abertura da lista de visitas.
2. Criação de visita, consulta real do CEP `01001-000` e preenchimento automático de Praça da Sé.
3. Número do imóvel/quartos, duas inspeções, amostra com numeração e quantidade, tratamentos focal e perifocal, gravação e retorno à lista.
4. Confirmação no MySQL: um registro de visita, duas inspeções ativas, uma amostra e dois tratamentos.
5. Reabertura e edição do número 123 → 321 e quartos 2 → 4. O ID da visita e a quantidade de registros associados foram preservados.
6. Edição do mesmo planejamento: nome, ano 2027 e situação Em andamento, com confirmação no servidor.
7. Nova visita com situação Fechado, finalizada diretamente pela primeira etapa.

O componente de formulário agora considera a área segura e a posição real do teclado, limita a área visível sem descontar duas vezes um teclado já tratado pelo Android e desloca o campo em foco. A medição usa coordenadas da janela, somente na tela ativa; formulários mantêm suas subviews para não cortar campos durante a rolagem.

Capturas em `.local/`: `native-s23-visit-postal.png`, `native-s23-keyboard-visible.png`, `native-s23-font130-keyboard.png`, `native-s23-font130-bottom.png`, `native-s23-visit-edited.png` e `native-s23-closed-visit.png`.

## Verificação automatizada

- `npm --prefix inteliagent-app run test:offline`: 30 testes, incluindo CEP, estados legados, datas/coordenadas/sequência, marcadores da rota e os dois tratamentos.
- `npm --prefix inteliagent-app run typecheck` e `npm --prefix inteliagent-app run export:android`.
- `node tests/planning-browser.mjs`: criação real de planejamento/visita, edição, gravação, recarga, mapa e layout em 360/390/768/1440 px. Os provedores externos de endereço são simulados nesse teste; os serviços e a persistência são reais.
- `npm run test:ui` e `npm run test:browser`: páginas principais, teclado/foco web, tamanhos de toque, navegação, login/logout e chat entre contas.
- `npm --prefix inteliagent-webapp run build`.

O utilitário `tests/mobile_ui.py` limita os comandos ao emulador `emulator-5554` e mantém capturas/dumps em `.local/`; não seleciona automaticamente um telefone físico.
