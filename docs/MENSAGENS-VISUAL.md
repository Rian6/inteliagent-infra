# Mensagens: visual web e mobile

As mensagens usam uma estrutura inspirada no WhatsApp, mantendo a paleta do Inteliagent: branco, cinza, azul claro nos balões enviados e botões principais escuros.

- Lista com avatares de iniciais, prévia privada da última mensagem, horário e busca.
- Web com lista lateral e conversa; em telas estreitas, navegação entre lista e conversa.
- Mobile com cabeçalho do contato, busca na conversa, balões com horários, separadores de data e barra compacta de digitação.
- Anexos, emojis, gravação de voz, prévia antes do envio, ampliação de imagens e reprodução de áudio mantidos. O web permite gravar pelo microfone em navegadores com suporte; quando a API não está disponível, abre a seleção de áudio.
- Áudio com controles compactos, progresso e duração reais. O indicador de envio é um check simples; não existe confirmação de leitura ou presença do contato.
- As prévias são consultadas somente entre o usuário autenticado e cada contato autorizado da sede. Teste de privacidade cobre outro membro da mesma sede.

Verificações executadas: build web, TypeScript mobile, exportação Android, manifesto e bundle no Expo; testes de serviço de chat e mídia; navegador com duas contas reais enviando imagem, áudio e emoji; busca e navegação responsiva; prévia das telas mobile com serviços nativos simulados.

A validação em aparelho físico do teclado, seletor de fotos e microfone permanece necessária. A prévia de navegador não substitui esse teste.

Scripts: `tests/chat-media-browser.mjs`, `tests/mobile-chat-browser.mjs`, `tests/chat-layout-browser.mjs`, `tests/test_chat_service.py`, `tests/test_chat_media.py`.
