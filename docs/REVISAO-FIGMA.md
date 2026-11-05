# Revisão funcional dos protótipos e aplicativos

Revisão local de 30/10/2026. Alterações anteriores do workspace preservadas; nenhum commit, reset ou publicação. A comparação usa os HEADs originais dos repositórios mobile (`2743c0d`) e web (`ea647f8`), o código atual e o arquivo Figma `ekC56ODCTKxBsEmaYrh2ts`.

## Figma efetivamente acessado

As páginas Mobile (`0:1`) e Web (`1:2`) foram lidas pelo plugin Figma e visualizadas em capturas gerais. Foram inspecionados os conteúdos dos frames de planejamento mobile (`1:14053`), dados da visita (`1:14080`), quantidade por inspeção (`1:14193`), amostras (`1:14306`), tratamentos (`1:14282`), dashboard web (`1:5714`), agentes (`1:6013`), configuração (`1:6131`), planejamento web (`1:6179`) e inclusão de visitas (`1:6337`). Referências visuais locais: `.local/figma-mobile.png` e `.local/figma-web.png`.

O protótipo foi usado como referência de conteúdo e navegação, conforme solicitado. Foram mantidos os temas Material do workspace, componentes React Native Paper/MUI, imagens originais das sete inspeções, espaçamento flexível, contraste e controles com alvos de toque grandes.

## Comparação e alterações desta revisão

| Função no protótipo/original | Situação nesta revisão |
|---|---|
| Criar, consultar e editar planejamento mobile | Fluxo anterior preservado; exercitado no emulador com a conta mobile fornecida |
| Ano, ciclo e data do planejamento | Ciclo agora é independente do ano nos dois apps e backend; edição, ciclo zero e recarga preservados |
| Município, categoria, atividade e tipo do planejamento | Resolvido com base pública IBGE e PNCD/FAD; seletores nos dois apps, pesquisa offline e preservação dos códigos antigos. Ver [base adotada](BASE-PLANEJAMENTO.md) |
| CEP e endereço da visita | Consulta anterior preservada; consulta real de `01001-000` no emulador |
| Busca de imóvel já cadastrado | Sugestões a partir do banco da conta no aparelho, por CEP/endereço. Reutilizam somente dados do imóvel e coordenadas |
| Lado da rua e tipo do imóvel | Controles mobile recuperados, persistência SQLite/MySQL e sincronização adicionadas |
| Visita normal/retorno | Seletores mobile/web recuperados, leitura e gravação no backend, sem apagar o restante da ficha |
| Remover data de retorno | Correção: `null` agora remove a data; não restaura a data anterior durante o salvamento |
| Quantidade de depósitos por A1/A2/B/C/D1/D2/E | Campos recuperados, validados e persistidos em `INSPECAO.NUMERO_DEPOSITOS`; reabertura preserva quantidades |
| Inspeções com texto longo | Corrigida a largura do contêiner para manter texto e checkbox dentro do cartão em 360 dp |
| Número inicial/final e tubitos | Fluxo anterior preservado; intervalos inválidos continuam bloqueados |
| Fotos de amostras | Seleção/remoção/visualização mobile; armazenamento na amostra e na fila offline; sincronização e consulta web. Limite explícito: duas fotos JPEG de até 90 KB cada |
| Focal e perifocal independentes | Fluxo anterior preservado, inclusive reabertura e remoção de modalidades sem duplicar registros |
| Retornar entre etapas | Botões anteriores explícitos, além das abas; rascunho compartilhado entre etapas |
| Rótulos acessíveis dos formulários | Nomes explícitos nos campos de planejamento, visita, amostra e tratamento; as cargas focal/perifocal têm identificadores distintos |
| Rolagem com teclado Android | O teclado permanece aberto durante o arraste do formulário, evitando alterações simultâneas da área de rolagem. O botão inferior pode ser alcançado pela rolagem e o teclado pode ser fechado pelo controle do sistema |
| Web: Geral ↔ Visitas | Painéis permanecem montados para não perder os valores ao alternar abas |
| Web: consulta da visita | Nova ficha com situação, tipo, datas, imóvel, inspeções/quantidades, amostras/fotos e tratamentos; consulta limitada à sede |
| Web: exclusão da visita | Confirmação antes da exclusão; cancelar preserva a visita |
| Mapa sem coordenadas | Backend deixa de transformar coordenadas ausentes em `(0,0)` |
| Mapa de agentes | Fallback OpenStreetMap/Leaflet, sem exigir chave Google. Mostra a última localização informada, sem prometer rastreamento em tempo real |
| Aprovação automática de novos cadastros | Tela Configuração recuperada, opção por sede persistida, acesso apenas ADMIN. Padrão manual; ativação não altera solicitações antigas nem concede papel ADMIN |
| Confirmação do cadastro mobile | Local de trabalho mostra a sede; nome, CPF e telefone respondem à edição |
| Renovação de sessão | Correções anteriores preservadas: cookie HttpOnly web, SecureStore mobile, validade absoluta de 30 dias e preservação do trabalho offline |

As páginas de download de amostras são limitadas a dez registros, para limitar a memória usada pelas fotos sem pular os registros seguintes. As migrações MySQL V37/V38/V39 são aditivas. As migrações Drizzle `0001` e `0002` e a atualização dos bancos legados adicionam os campos sem recriar o banco da conta. O servidor principal recebe SELECT somente nas três tabelas necessárias para consultar a ficha. O auth recebe UPDATE somente na coluna de configuração da sede.

## Limites encontrados: a revisão não equivale a 100% do protótipo

A pendência de catálogos e ciclo da revisão anterior foi resolvida nesta continuação com pesquisa em fontes oficiais, conforme [documentação da base](BASE-PLANEJAMENTO.md). Os quatro seletores e o ciclo estão implementados nos dois aplicativos. A categoria é uma base inicial Bairro/Povoado, não um catálogo nacional exaustivo.

1. **Vinculação de agente ao planejamento e rota por agente:** o Figma mostra esse seletor. O contrato atual não contém vínculo de responsável pelo planejamento/visita. O mapa implementado mostra localizações informadas; não implementa atribuição de roteiros individuais nem histórico de deslocamentos. Essa lacuna permanece explícita.
2. **Indicadores de endemias e produto por região:** os painéis atuais mostram visitas, regiões e evolução. O protótipo usa dados ilustrativos de endemias e produto. Inspecionar um depósito não comprova uma endemia; não foi criada uma contagem fictícia de resultados positivos. Falta definir o resultado epidemiológico e as unidades dos produtos para esses indicadores.
3. **Login Facebook/Google do protótipo:** não há provedores/credenciais configurados; permanece o login por email/senha com recuperação e aprovação. Os botões sociais não foram anunciados como funcionais.
4. As fotos têm limite de duas imagens pequenas para caberem no agregado transacional offline existente. Uma solução para fotos originais grandes exige armazenamento de objetos e sincronização de anexos separada; não foi implementada nesta revisão.

Esses itens não devem ser descritos como concluídos por builds ou testes de sessão aprovados.

## Evidências e testes

- Testes offline/credenciais: 40 aprovados, incluindo quantidades, fotos, retorno, dados do imóvel, remoção de data e atualização sem duplicar filhos.
- Testes Java dos serviços recompilados; migrações Flyway aplicadas no MySQL isolado da porta 3308.
- Integração Python: 14 aprovados, incluindo cadastro com aprovação manual/automática, isolamento por sede, rejeição de foto externa, consulta da ficha e sincronização SQLite → Java → MySQL.
- Testes web existentes: planejamento com persistência real, UI em 320/390/768/1440 px, navegação, chat e sessão. Provedores de CEP do teste de planejamento web são simulados; a consulta nativa de CEP foi real.
- `tests/review-browser.mjs`: percurso adicional de ano/data, normal/retorno, complemento, alternância de abas, coordenadas ausentes, ficha, cancelamento da exclusão, mapa de agentes e capturas finais.
- `tests/planning-catalog-browser.mjs`: seleção IBGE/PNCD, ciclo 1/0, persistência e larguras 360/390/768/1440. Inclui testes de migração para bancos novos, legados e colunas já aplicadas sem histórico atualizado.
- TypeScript, build web e exportação Android. A exportação Android não substitui um instalador/APK nem valida o aparelho físico.
- Catálogo no Android: criação com Wi-Fi e dados móveis desligados, reabertura, ciclo zero → um e sincronização conferida no MySQL com todos os campos da classificação.

Capturas finais reais ficam em `.local/final-web-*.png` e `.local/final-mobile-*.png`. O QR fica em `.local/expo-qr.png` e `.local/expo-connect.html`.

## Ambiente e validação física

- Web e APIs pelo proxy: **http://SEU_IP_LOCAL:5173**.
- Expo: **exp://SEU_IP_LOCAL:8081**.
- Os serviços permanecem no loopback e o proxy expõe as APIs ao telefone pela porta 5173; não é necessário abrir cada porta Java na rede.
- Os testes nativos usam exclusivamente `emulator-5554`, 1080 × 2340, 480 dpi (360 dp de largura). Também foi exercitada a fonte em 130%, reabertura/edição e a conferência do mesmo registro no MySQL e na ficha web. Foi necessário ampliar a RAM do emulador por instabilidade do System UI/automação; isso não comprova estabilidade em One UI.
- As duas contas fornecidas foram preservadas. É necessário entrar uma vez para obter a credencial de renovação se o login for anterior à correção de sessão.

No S23 físico, validar com teclado Samsung e Gboard, fonte/tamanho da tela padrão e ampliados: primeiro e último campos de cada etapa, botões após abrir/fechar teclado, pickers de lado/tipo, CEP lento/sem rede, galeria e recorte, reabertura das fotos, troca de etapas, app em segundo plano/encerrado, modo avião, retomada da sincronização e renovação da sessão. Também validar GPS/navegação externa e alcance/firewall do Wi-Fi. Nenhum S23 físico estava conectado ao ADB nesta execução.
