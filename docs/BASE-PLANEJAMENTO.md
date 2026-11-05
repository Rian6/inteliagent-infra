# Base inicial de classificação do planejamento

Pesquisa e inclusão em 30/10/2026, autorizadas pelo usuário. Os quatro campos do protótipo agora usam uma base de referência explícita e versionada: `PNCD-FAD-IBGE-v1`.

## Fontes públicas

- **Municípios:** [API de Localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades), [consulta utilizada](https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome). O snapshot contém 5.571 municípios com identificador IBGE, nome e UF.
- **Atividade e tipo:** [Registro Diário do Serviço Antivetorial PNCD publicado pela Prefeitura de Capanema/PR](https://www.capanema.pr.gov.br/attachments/article/12743/16.%20RESUMO%20DO%20BOLETIM%20DE%20CAMPO%20E%20LABORAT%C3%93RIO.pdf). O formulário corresponde à estrutura representada pelo Figma.
- **Categoria e ciclo/ano:** [Instrutivo dos boletins FAD, SES-RS, junho de 2013, páginas 6–8](https://saude.rs.gov.br/upload/arquivos/carga20190402/15170227-27095308-instrutivo-para-preenchimento-dos-boletins-de-campo.pdf). Essa referência descreve Bairro/Povoado e distingue a numeração dos ciclos do ano. A base foi escolhida como referência inicial; não representa uma tabela nacional atual e exaustiva de todas as categorias de localidades.

Existem adaptações estaduais com outros códigos de atividade. Por exemplo, o [manual DIVE-SC de 2026](https://dive.sc.gov.br/phocadownload/doencas-agravos/Dengue/Orientacoes/orientaes%20tcnicas%20para%20agentes%20de%20campo%202026%201.pdf) contém atividades adicionais e usa o código 1 de outra forma. Esses códigos não foram misturados ao catálogo PNCD/FAD adotado aqui.

## Valores disponíveis

| Campo | Base utilizada |
|---|---|
| Município | Nome e UF, com identificador oficial do IBGE; exemplo: Cascavel/PR, 4104808. Homônimos são diferenciados pela UF |
| Categoria da localidade | Bairro (BIR) e Povoado (PV), como base inicial documentada |
| Atividade | 1 LI, 2 LI+T, 3 PE, 4 T, 5 DF, 6 PVE, com descrição completa nos seletores |
| Tipo da localidade | 1 Sede; 2 Outros. Esse campo não é o tipo do imóvel visitado |
| Ciclo | Número separado do ano, conforme calendário operacional da equipe. Zero é preservado. O intervalo 0–99 é um limite da aplicação, não um calendário oficial imposto |

`ID_CATEGORIA=10001` e `10002` são identificadores **internos desta versão**, correspondentes a BIR e PV. Não são apresentados como códigos oficiais DATASUS. Não foi presumido que identificadores numéricos antigos de categorias já tivessem esses significados.

## Comportamento e compatibilidade

- Busca de município por nome/UF nos dois aplicativos; a normalização aceita pesquisa sem acentos. O catálogo é incluído no aplicativo e funciona sem consultar o IBGE durante o uso.
- A classificação é opcional. Ao iniciá-la, os quatro campos precisam ser preenchidos em conjunto, evitando registros classificados parcialmente.
- Um planejamento sem `CATALOGO_VERSAO` mantém seus valores antigos intactos. A interface não converte códigos desconhecidos em nomes por suposição. O administrador pode selecionar os quatro campos para adotar a nova base explicitamente.
- `CICLO` é nullable e independente de `ANO`. Um cliente antigo que omite ciclo ao editar não apaga o valor; um cliente novo pode enviar zero ou remover o ciclo explicitamente.
- Web, mobile e servidores principal/sincronização usam o mesmo snapshot. O backend valida município, categoria, atividade, tipo, versão e intervalo do ciclo.
- Migração MySQL V39 e migração SQLite/Drizzle `0002`: somente adicionam `CICLO` e `CATALOGO_VERSAO`; não reclassificam nem removem planejamentos antigos, rascunhos ou operações pendentes.

Isso não implementa importação/exportação homologada do SisPNCD nem substitui o reconhecimento geográfico e o calendário adotados pela sede.

## Manutenção e evidências

O arquivo canônico é `data/planning-catalog.json`. `scripts/update_planning_catalog.py` consulta o IBGE, verifica integridade/UFs/homônimos e atualiza as cópias incorporadas aos aplicativos e servidores. Mudanças nas definições de categorias, tipos ou atividades devem gerar uma nova versão, preservando a interpretação dos registros anteriores.

As verificações incluem igualdade dos snapshots, preservação dos códigos legados, ciclo zero, rejeição de referências inválidas, persistência e reabertura web/mobile e sincronização do planejamento completo. Capturas adicionais ficam em `.local/catalog-*.png`.

No emulador Android foi criado um planejamento com Wi-Fi e dados móveis desligados, reaberto e alterado de ciclo zero para um. Depois da reconexão, município, categoria, atividade, tipo, ciclo, ano e versão foram conferidos diretamente no MySQL. Isso não substitui a validação no S23 físico.

Também foi corrigida a retomada de bancos SQLite cujas colunas aditivas já estavam presentes, mas cujo histórico Drizzle ainda estava incompleto. A recuperação registra somente migrações conhecidas e integralmente aplicadas, preservando os registros e a fila offline; bancos com colunas incompletas não são considerados migrados.
