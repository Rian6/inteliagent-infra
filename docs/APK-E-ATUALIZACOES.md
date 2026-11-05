# APK, GitHub Releases e verificação contínua

O app usa os serviços do PC em `http://SEU_IP_LOCAL:5173`. A API de versões é
independente do Expo e do servidor web, disponível na rede em
`http://SEU_IP_LOCAL:5174`. Não é necessário manter Metro para usar o APK.

## Regras de atualização

### Correção do leitor de versão nos APKs antigos

Os APKs até o build 6 liam `Constants.nativeBuildVersion`, propriedade ausente
no Expo instalado. O resultado era `NaN`, e a consulta terminava antes de
acessar a API. Por isso a resposta correta do servidor não produzia bloqueio
no celular. A verificação de API registrada abaixo não cobria essa falha.

O build 7 passa a usar `expo-application` para ler a versão e o build do
pacote Android, com fallback para a configuração embutida. A dependência é
declarada diretamente e os testes usam o formato real do Expo Constants,
sem propriedades fictícias. Os APKs antigos precisam receber esse APK
corrigido por instalação manual, por cima, mantendo conta e dados.

O teste completo usa a base corrigida 1.1.0/build 7 e a minor seguinte
1.2.0/build 8. O serviço registra `version-check` com versão, build e
severidade, permitindo confirmar que a consulta veio do APK.

Validação concluída no Android API 34 com APKs release: a base build 7
consultou a release real do GitHub, exibiu **Atualização obrigatória** para
1.2.0/build 8 e ocultou a interface anterior. O botão **Atualizar** abriu o
download no GitHub. Após instalar o build 8 por cima, a conta e os dados
foram preservados, o bloqueio desapareceu e o serviço registrou `none`.

Para migrar e testar um APK antigo, instalar primeiro o
[build 7 corrigido](https://github.com/Rian6/inteliagent-app/releases/download/v1.1.0%2Bbuild.7/inteliagent-7-24b9117b538f.apk),
por cima, sem desinstalar. Abrir na mesma rede do PC: a minor 1.2.0/build 8
será oferecida como obrigatória. Depois usar **Atualizar** para instalar.

Teste reproduzível com APK já instalado no emulador:

```powershell
python tests/update-apk-native.py mandatory --version 1.2.0 --build 8
# Após instalar o APK novo por cima:
python tests/update-apk-native.py current
```

O teste reinicia o processo pelo intent de launcher, lê a hierarquia nativa
da tela e não instala APKs nem apaga dados. O modo `current` pressupõe uma
sessão já autenticada na conta de teste.

Formato: `PRINCIPAL.SECUNDÁRIA.CORREÇÃO`, com `versionCode` Android separado
como build. Todos os APKs novos precisam aumentar o build.

| Diferença para a versão instalada | Comportamento |
|---|---|
| Primeiro número maior | Obrigatória: faixa no topo e bloqueio do aplicativo. |
| Segundo número maior, com primeiro igual | Obrigatória: faixa no topo e bloqueio do aplicativo. |
| Terceiro número maior | Aviso persistente no topo, sem botão de fechar; permite usar o app. |
| Mesmos três números, build maior | Aviso no topo que pode ser ocultado na sessão e volta no próximo login. |
| Versão/build igual ou anterior | Nenhum aviso; não oferece downgrade. |

Todas as faixas têm o botão **Atualizar**. O download vem do asset APK da
release no GitHub. O Android pede confirmação de instalação; mesmo pacote e
assinatura preservam os dados. A tela por baixo do bloqueio obrigatório
permanece montada, preservando estado e rascunhos.

O login sempre faz uma nova solicitação de validação, mesmo dentro do limite
de consultas periódicas. A restauração da conta e a abertura também verificam.
Enquanto o app está ativo, verifica a cada minuto e no retorno do segundo plano.
A ocultação do aviso de build só existe em memória: é limpa em cada login.
A última atualização conhecida é persistida; uma falha de conexão não remove
um bloqueio obrigatório já conhecido.

## Serviço ativo no PC

```powershell
& D:\inteliagent\scripts\install-version-service.ps1
```

Tarefa Windows: `Inteliagent-Version-Service`, executada como usuário atual,
com início no login do Windows, execução sem limite e supervisão do processo
Node. Se o Node terminar, o supervisor o reinicia. Não precisa de senha ou
serviço executado como administrador. Sem acesso ao Agendador, o instalador
usa a pasta de inicialização do próprio usuário.

```text
GET http://SEU_IP_LOCAL:5174/health
GET http://SEU_IP_LOCAL:5174/mobile/releases/check?version=1.0.3&build=4
GET http://SEU_IP_LOCAL:5174/mobile/releases/latest.json
```

A resposta de validação contém `available`, `required`, `severity`, `release`,
`source: "github"` e `stale`. Versão inválida retorna 400. Falha no GitHub sem
cache retorna 503; com cache, preserva a última release validada e marca
`stale`. Ausência de releases publicadas retorna `available: false`.

Fonte exclusiva das atualizações: **Rian6/inteliagent-app** no GitHub.
O servidor consulta a API a cada minuto, ignora drafts e pré-releases, valida
pacote/versão/tamanho/SHA-256 e usa somente assets do repositório configurado.
O token opcional `GITHUB_RELEASE_TOKEN`, ou a sessão local do `gh`, fica apenas
no servidor; não é enviado para o celular. Logs em `.local/version-service*.log`.
Catálogo em cache em `.local/version-service/github-cache.json`.

Referência: [API oficial de GitHub Releases](https://docs.github.com/en/rest/releases/releases).

## Compilar, revisar e publicar

Compilar e disponibilizar o APK para instalação inicial na rede:

```powershell
& D:\inteliagent\scripts\build-mobile-release.ps1 -Version 1.0.3 -Notes 'Melhorias e correções.'
```

O build é incrementado automaticamente. Para publicar **apenas um build**,
repita o mesmo `-Version`. Para mudar o tipo de aviso, altere os números da
versão conforme a tabela. A publicação local valida assinatura, pacote e build
e serve APK com nome `.apk`, MIME Android e suporte à retomada do download.

Download para instalar o cliente atual:
`http://SEU_IP_LOCAL:5173/mobile/releases/latest.apk`.
Esse arquivo local é a instalação inicial; não é a fonte de decisões do
atualizador, que consulta exclusivamente as releases publicadas no GitHub.

Criar um rascunho revisável com APK e metadados:

```powershell
& D:\inteliagent\scripts\publish-github-release.ps1
```

Depois de revisar, publicar:

```powershell
& D:\inteliagent\scripts\publish-github-release.ps1 -Publish
```

A tag é `vVERSAO+build.CODIGO`, permitindo várias releases de build da mesma
versão. São necessários dois assets: `inteliagent-CODIGO-HASH.apk` e
`latest.json`. O script usa o APK validado em `.local/mobile-releases`, não
sobrescreve uma release com arquivos diferentes e permite publicar um rascunho
já criado. Ao publicar, solicita atualização imediata ao serviço local; por
outros meios de publicação no GitHub, a detecção ocorre em até um minuto.

O repositório inicialmente não tinha releases publicadas. Rascunhos não
disparam avisos nos celulares.

Esta distribuição LAN mantém a assinatura do APK interno anterior. Antes de
distribuir publicamente uma nova linhagem, configurar chave de release
protegida e HTTPS; não trocar a assinatura entre atualizações existentes.

## Verificações

- `tests/visit-completion.mjs`: conclusão após salvar, proteção contra toque
  duplicado, recuperação de erro e retorno ao mesmo planejamento pelo botão
  e pelo Voltar do Android.
- `tests/visit-completion-browser.mjs`: tela de conclusão e botão visível,
  sem transbordamento em larguras de 320 e 390 px.
- `tests/github-updates.mjs`: regras nos três números/build, drafts,
  pré-releases, integridade dos assets, cache, consulta em cada login,
  ocultação por sessão e bloqueio obrigatório mantido offline.
- `tests/update-banner-browser.mjs`: faixa no topo a 320 e 390 px, botão
  Atualizar, ocultação de build, aviso persistente e bloqueio de interações.
- `tests/mobile-releases.mjs`: MIME/nome APK, link antigo, proxy da API,
  HEAD, download parcial e caminhos inválidos.
- TypeScript, compilação release e assinatura Android.

O plugin `withLanServer.cjs` permite HTTP no ambiente LAN e preserva os bancos
gerados do Room nas regras R8, necessários à inicialização Android.

## Teste da atualização minor 1.1.0

A versão 1.1.0 (build 6) adiciona a tela **Visita concluída!**. Ela aparece
somente depois de salvar; o botão **Voltar às visitas** e o Voltar do Android
retornam à lista do planejamento da visita, sem reabrir o formulário salvo.

Com a 1.0.3 (build 4) instalada, publicar a release 1.1.0 faz a API responder
`available: true`, `required: true`, `severity: "mandatory"`. Abrir o app ou
entrar na conta deve mostrar o bloqueio e o botão **Atualizar**. A verificação
periódica também detecta em até um minuto enquanto o app está ativo.
Após instalar a 1.1.0 sobre a versão anterior, a conta e os dados locais são
preservados e a API passa a responder `available: false` para o build 6.

Validado no Android API 34 com APK release: sessão e dados preservados na
instalação por cima, gravação de uma visita de teste, tela de conclusão e
retorno à lista do mesmo planejamento pelo botão e pelo Voltar do Android,
sem erros de inicialização. Após a publicação, a API real confirmou
`mandatory` para 1.0.3/build 4 e `none` para 1.1.0/build 6.
