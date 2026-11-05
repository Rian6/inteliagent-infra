# Referência visual aplicada ao Inteliagent

## Referências e limite de acesso

O usuário forneceu o [Dashboard UI Kit / SnowUI](https://www.figma.com/design/7af0aqEVZNBGdmXU7tVmLm/Dashboard-UI-Kit---Dashboard--Free-Admin-Dashboard--Community-?node-id=0-1) e o [Multi-Step Mobile Form](https://www.figma.com/make/fUTRqbh3yPCukIMG5B43IJ/Multi-Step-Mobile-Form--Copy---Community-).

A integração permitiu consultar o dashboard mobile, a estrutura do desktop, a barra lateral e um cartão de indicadores. Depois, atingiu o limite de consultas do plano Starter. O conteúdo do segundo arquivo Make não pôde ser lido; sua reprodução visual exata não foi verificada. A sequência de etapas foi implementada conforme o comportamento solicitado pelo usuário.

## Linguagem visual

| Elemento | Implementação |
|---|---|
| Texto e ação principal | `#1C1C1C` |
| Fundo | `#F5F5F7` |
| Superfície | Branco |
| Cartão azul | `#E6F1FD` |
| Cartão lavanda | `#EDE9FE` |
| Azul de apoio | `#8ABDF5` / `#0066D6` |
| Tipografia | Inter |
| Botões principais | Pelo menos 48 px/dp, raio 14–16 |
| Campos | Raio 14, rótulo e erro de preenchimento |
| Cartões | Raio 20–24 |

O web mantém os componentes MUI de tabelas, diálogos, campos e navegação e os componentes gluestack já integrados. O mobile usa gluestack nas visitas e autenticação, mantendo os controles nativos e componentes existentes nas demais funcionalidades.

A visão geral web alterna entre resumo e visitas recentes. No mobile, os gráficos são expansíveis. A classificação de planejamento e os detalhes complementares ficam recolhidos, conservando todos os campos. Login, recuperação de senha e cadastro mobile seguem a mesma base visual. O cadastro continua com sede, código de email, foto/dados pessoais e aprovação do gestor; a confirmação depende da validação do email.

O fluxo das visitas, as condições de avanço e o mapa de funcionalidades estão em [MOBILE-UX.md](MOBILE-UX.md). O comportamento do painel está em [WEB-UX.md](WEB-UX.md).

## Marca e ícone

O ícone próprio combina o “i” com pontos ligados por uma rota. O SVG fonte fica em `inteliagent-app/assets/icon.svg`, compartilhado com `inteliagent-webapp/public/brand/icon.svg`. `npm run brand:generate` gera o ícone Expo, o primeiro plano adaptativo, favicon, splash e recursos Android nas densidades existentes.

O nome, o ícone de instalação e os recursos nativos passam a aparecer após um novo build/instalação do Android. As mudanças de telas e o logo interno são carregados pelo Expo.

## Validação

Foram usados os testes de planejamento/visitas, catálogo, sessão e mensagens reais contra os serviços locais, além de testes responsivos web e da prévia dos componentes mobile. SQLite e sincronização têm testes próprios. Não houve mudança de contratos de API ou remoção de campos, modalidades de tratamento, fotos, mapas, aprovações, mensagens ou permissões.

A conferência mobile em navegador usa serviços simulados e não comprova comportamento de teclado, galeria ou sistema operacional. A exportação Android verifica o bundle; não equivale à execução em um aparelho.
