# Revisão de UI/UX — 30/10/2026

A revisão atual do painel está em [WEB-UX.md](WEB-UX.md); o texto abaixo registra a avaliação anterior.

Revisão do painel React/MUI e do aplicativo Expo/React Native Paper, com referência no Material Design 3. As alterações permanecem locais.

Esta avaliação inicial foi complementada pela [restauração e validação dos fluxos de planejamento e visitas](FLUXO-PLANEJAMENTO-VISITAS.md), que inclui testes na interface Android em emulador e correções de regressões funcionais.

## Problemas encontrados e correções

| Área | Problema | Alteração |
| --- | --- | --- |
| Cores | Paletas parcialmente definidas, cores de erro e sucesso inconsistentes | Tema semântico mobile e paleta web com a mesma marca magenta, superfícies claras, texto escuro e cores de estado |
| Forma | `sx.borderRadius` multiplicava o raio do tema, produzindo curvas excessivas | Web com raios explícitos: campos 8 px, cartões 16 px, botões 24 px; navegação lateral 28 px |
| Espaçamento | Margens arbitrárias e formulários de largura irregular | Base de 8 pontos, margens responsivas, formulários mobile limitados a 480 dp e indicadores mobile a 840 dp |
| Toque | Botões de reenvio de 30 dp e ações com área pequena | Botões compartilhados e ações Paper com altura mínima de 48 dp; botões web de pelo menos 48 px |
| Mobile | Telas sem proteção para teclado, navegação com altura fixa e edição escondida no toque longo | Componente de formulário com rolagem e teclado, áreas seguras, navegação com insets e botão visível para editar planejamento |
| Login | Sem estado de envio no mobile e sem opção de revelar senha | Validação de campos vazios, bloqueio durante envio, feedback de carregamento e opção de mostrar/ocultar senha nos dois apps |
| Código | Seis campos estreitos, múltiplas paradas de foco | Campo único com teclado numérico, colagem, preenchimento automático e limite de dígitos |
| Listas | Contatos mobile sem mensagem de erro ou carregamento | Estado vazio, indicador de carregamento, atualização por gesto e ação de tentar novamente |
| Tabelas | Colunas comprimidas em telas estreitas | Identificador secundário oculto no planejamento em telas pequenas; zona sem quebra; paginação com quebra de linha e textos em português |
| Chat web | Colunas apertadas e composição horizontal em telas pequenas | Contatos acima da conversa em larguras menores, rolagem própria, campo multilinha e envio abaixo do campo no celular |
| Acessibilidade web | Sem atalho para conteúdo e hierarquia de título incompleta | Link para pular navegação, título principal h1, foco visível e respeito à preferência por menos movimento |
| Conteúdo | Texto com codificação incorreta na tela de agentes | Acentos corrigidos |

## Contraste calculado

Razões calculadas por luminância relativa sRGB. Todos os pares abaixo superam 4,5:1 para texto normal. Isso verifica estes pares de cores, sem equivaler a uma auditoria completa de acessibilidade.

| Texto / fundo | Contraste |
| --- | --- |
| Branco / primária `#A9007A` | 7,08:1 |
| Texto principal `#281923` / fundo `#FFF8FC` | 16,02:1 |
| Texto secundário `#665560` / fundo `#FFF8FC` | 6,62:1 |
| Texto selecionado `#780055` / contêiner `#FAD9EC` | 8,40:1 |
| Erro `#B3261E` / branco | 6,54:1 |

## Verificação

- `node tests/ui.mjs`: login, opção de mostrar senha, páginas principais, formulário de planejamento e composição do chat em 320, 390, 768 e 1440 px; ausência de rolagem horizontal na página, botões visíveis com pelo menos 48 px, link de teclado para o conteúdo e ausência de exceções no navegador.
- `npm run test:browser`: login real, navegação, layout responsivo, entrega de mensagem entre duas contas e logout.
- `npm --prefix inteliagent-app run test:offline`: 25 testes de persistência e sincronização.
- Compilação web, checagem TypeScript mobile e exportação do bundle Android.
- Inspeção visual das capturas web: `.local/ui-1440.png`, `.local/ui-390.png`, `.local/ui-chat-390.png` e `.local/ui-login-320.png`.

Não havia dispositivo Android, emulador ou ambiente iOS disponível para inspeção interativa nativa. Teclado nativo, TalkBack/VoiceOver, fontes ampliadas e áreas seguras precisam ser conferidos em dispositivo; o bundle Android não substitui essa verificação. Os testes automatizados e a inspeção técnica não substituem testes de usabilidade com agentes em campo.

## Referências

- [Material Design 3](https://m3.material.io/)
- [Material: acessibilidade e alvos de toque](https://m1.material.io/usability/accessibility.html)
- [Material: espaçamento](https://m2.material.io/design/layout/spacing-methods.html)
- [Android: tamanho de alvos de toque](https://support.google.com/accessibility/android/answer/7101858)

