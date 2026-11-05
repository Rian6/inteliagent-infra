# Emojis e teclado no chat mobile

O seletor inclui 1.528 emojis distintos em 11 categorias: populares, rostos,
pessoas, tons de pele, natureza, comidas, atividades, lugares, objetos, símbolos
e bandeiras. O catálogo é local e usa a fonte de emojis do sistema. A aparência
e o suporte a símbolos mais recentes dependem da versão do Android/iOS.

As categorias têm rolagem horizontal; a grade tem rolagem vertical e quantidade
de colunas adaptada à largura disponível. O painel tem altura limitada para
preservar o campo de mensagem. A inserção mantém o texto e permite selecionar
vários emojis sem fechar o painel. Ao tocar no texto, o painel fecha.

A tela deixou de calcular manualmente um `maxHeight` usando coordenadas do
teclado. O `KeyboardAvoidingView` agora aplica compensação de espaço no Android
e iOS, com o deslocamento do cabeçalho da navegação. O Android continua usando
`adjustResize`, já configurado no manifesto e no Expo. A lista de mensagens
ocupa o espaço restante, enquanto o compositor preserva sua altura.

O teste `tests/mobile-chat-browser.mjs` verifica categorias, tons de pele,
bandeiras, rolagem até o fim de uma categoria, inserção sem perda de texto,
larguras de 320/390/768 e o compositor após redimensionar a janela.
O navegador usa serviços nativos simulados e não substitui o teste do teclado
Android.

Validação nativa concluída no emulador Android API 34 com fonte padrão (1,0):
texto com quebra automática e texto com seis linhas mantiveram o campo e o
botão de envio terminando em y=1413, antes do início do teclado em y=1431.
Também foram verificadas a categoria Natureza, a inserção de emoji e a volta
ao teclado. Os rascunhos de teste foram apagados, sem enviar mensagens.
Evidências ficam em `.local/chat-keyboard-native-results.json`,
`.local/mobile-chat-keyboard-native.png`,
`.local/mobile-chat-keyboard-multiline-native.png` e
`.local/mobile-large-emoji-picker-native.png`.

Passaram a checagem TypeScript, os testes da interface e a compilação de um
APK x86_64 atualizado para o emulador. O APK de teste está em
`.local/apk/emoji-keyboard-x86_64.apk`; o APK anterior na pasta de saída foi
preservado. A instalação foi feita somente no emulador.
