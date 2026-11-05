# Visitas mobile com gluestack v5

A linguagem visual atual acompanha a referência SnowUI enviada no Figma. Consulte também [DESIGN-REFERENCE.md](DESIGN-REFERENCE.md).

## Fluxo

Imóvel aberto: **Imóvel → Inspeção → Amostras → Tratamento → Revisão**. Imóvel fechado ou visita recusada: **Imóvel → Revisão**. As respostas de inspeção, coleta e tratamento revelam apenas os campos pertinentes. Responder Não permite continuar sem remover a funcionalidade de registrar esses dados.

A próxima etapa depende da confirmação e da validação das anteriores. A regra também vale para navegação pelo indicador, links internos, retomada de formulário e conclusão. Voltar é permitido. Alterar dados anteriores invalida as confirmações seguintes, mantendo os valores e as fotos já preenchidos. O formulário retoma a primeira etapa ainda válida quando necessário.

Os metadados `__page`, `__completed` e as confirmações das perguntas ficam no JSON do rascunho. Os repositórios continuam gravando os mesmos campos de atendimento, inspeção, amostra e tratamento; esses metadados não entram no contrato de sincronização.

## Funcionalidades preservadas

| Recurso | Local |
|---|---|
| Situação, endereço e número | Imóvel |
| CEP e reaproveitamento de imóvel anterior | Buscar endereço |
| Tipo, complemento, lado e quartos | Detalhes do imóvel |
| Sete tipos de depósito, quantidades e imagens de referência | Inspeção |
| Coleta, numeração, tubitos, duas fotos e remoção | Amostras |
| Totais, focal, perifocal e tratamento legado | Tratamento |
| Datas, visita normal/retorno e agendamento | Revisão → Data da visita e retorno |
| Busca, filtros, mapa e ordem da rota | Lista de visitas |
| Recuperação de preenchimento, fila transacional e conflitos | Mesmos repositórios e motor offline |

O preenchimento incompleto permanece separado de uma visita concluída. A sincronização continua automática, sem avisos de rotina ou ação manual para o usuário.

## Componentes e validação

As factories de Button, Input, Switch e Accordion do `@gluestack-ui/core` continuam integradas aos estilos nativos. Os campos mostram erros junto ao preenchimento. Se um erro estiver em uma seção recolhida, ela abre automaticamente. Números respeitam os limites do contrato existente; amostras conferem a ordem dos números inicial e final; modalidades ativas de tratamento exigem o produto.

## Verificação

- `npm --prefix inteliagent-app run typecheck`.
- `npm --prefix inteliagent-app run test:offline`: 52 testes, incluindo SQLite, sincronização e bloqueio das etapas.
- `npm run test:mobile-ui`: componentes reais, gluestack e Zustand em React Native Web. Exercita login/cadastro, validação, avanço sequencial, invalidação ao editar, retenção dos dados e ramo fechado em 320, 390 e 768 px. Os serviços de dispositivo e rede são substituídos nessa prévia.
- `npm --prefix inteliagent-app run export:android`.

A prévia não substitui teste em aparelho Android. Teclado nativo, galeria, botão físico Voltar e permissões ainda precisam de conferência em dispositivo. O emulador desta máquina apresentou falhas de System UI na rodada anterior e não foi usado como evidência de validação visual nativa.
