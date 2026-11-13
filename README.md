# Neblina — Privacidade no WhatsApp Web

Extensão **independente e gratuita** para Google Chrome (Manifest V3) que desfoca partes sensíveis do WhatsApp Web. Feita com JavaScript e CSS puros, sem dependências, sem analytics, sem acesso a outros sites.

![Captura da interface](docs/popup-preview.webp)

## Funcionalidades

- **Proteção por categoria:** mensagens, últimas mensagens, nomes/grupos, fotos de perfil, mídias e campo de digitação.
- **Três perfis:** Total, Equilibrado e Lista. É possível personalizar qualquer configuração.
- **Controle de intensidade:** desfoque de 4 até 24 pixels.
- **Revelação ao passar o mouse:** somente o elemento sob o ponteiro fica legível (opcional).
- **Modo escudo:** overlay na página para ocultar tudo com um clique.
- **Título neutro da aba:** evita exibir contatos no título do navegador.
- **Atalho de teclado:** `Alt + Shift + B` ativa/desativa a proteção.
- **Configurações locais:** somente `chrome.storage.local`; mensagens não são armazenadas ou transmitidas pela extensão.

## Instalação (sem publicar na Web Store)

1. Baixe e extraia o arquivo `privacidade-whatsapp.zip`.
2. Abra `chrome://extensions` no Chrome.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta extraída, a que contém `manifest.json`.
5. Abra ou atualize `https://web.whatsapp.com/`.
6. Clique no ícone **Neblina** ao lado da barra de endereços.

> Desative a extensão de privacidade anterior para evitar regras CSS conflitantes. Ao desenvolver, alterações nos arquivos exigem clicar no botão de recarregar a extensão e atualizar a guia do WhatsApp.

## Desenvolvimento

Nenhum `npm install` é necessário. O Chrome executa os arquivos diretamente. Estrutura:

```
manifest.json           # Manifest V3 / acesso restrito ao WhatsApp Web
background.js           # Atalho e estado do ícone
shared/config.js        # Configuração, defaults e validação
src/content.js          # Aplica opções, título da aba, modo escudo
src/blur.css            # Desfoque por categoria
popup/index.html        # Interface
popup/style.css         # Design
popup/popup.js          # Controles
icons/                  # Ícones originais
```

Teste rápido: `python -m pytest tests/` (requer `pytest` e `playwright`); navegador Chromium em execução de testes.

## Repositório e versionamento

Código-fonte: **https://github.com/bielcerroni/privacidade-whatsapp**.

A branch principal é `main`. Alterações podem ser revisadas por pull request antes de serem incorporadas.

Para clonar e contribuir:

```powershell
git clone https://github.com/bielcerroni/privacidade-whatsapp.git
cd privacidade-whatsapp
```

## Compatibilidade e limitações

O WhatsApp Web altera seu HTML frequentemente. Os estilos usam seletores semânticos e fallbacks; novas versões podem exigir ajustes. A proteção **oculta visualmente** informações na tela e não substitui o bloqueio de sessão, criptografia ou cuidados com o dispositivo. O modo escudo reduz a chance de exposição por omissões de seletores.

## Privacidade e permissões

- `storage`: guarda preferências **locais** da extensão.
- `https://web.whatsapp.com/*`: injeta estilos e controles **somente** nesse endereço.
- Sem requisições a serviços próprios, sem coleta de texto/mensagens, sem scripts remotos.

Consulte [PRIVACY.md](PRIVACY.md).

## Origem da ideia

Projeto independente inspirado funcionalmente na [Extensão de Privacidade para o WhatsApp Web](https://chromewebstore.google.com/detail/jbojhlhhggfmmkpefknmbdhlaghehini), disponibilizada sob licença MIT. O código, o visual e os ícones deste repositório foram escritos especificamente para o Neblina, sem copiar os arquivos da extensão fornecida.

**Aviso:** WhatsApp é uma marca de seus respectivos titulares. Neblina é um projeto independente e não tem vínculo com WhatsApp ou Meta.

## Licença

MIT — veja [LICENSE](LICENSE).
