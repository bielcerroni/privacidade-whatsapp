<div align="center">
  <img src="icons/icon-128.png" alt="Ícone da extensão Neblina" width="88" height="88">

  # Neblina

  **Privacidade visual para o seu WhatsApp Web.**

  Oculte conversas, contatos e imagens sem atrapalhar o uso do WhatsApp.  
  Escolha o que desfocar, ajuste a intensidade e revele informações quando precisar.

  [![Versão](https://img.shields.io/badge/vers%C3%A3o-0.1.7-243a40?style=flat-square)](manifest.json)
  [![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-243a40?style=flat-square)](manifest.json)
  [![Validação](https://github.com/bielcerroni/privacidade-whatsapp/actions/workflows/validate.yml/badge.svg)](https://github.com/bielcerroni/privacidade-whatsapp/actions/workflows/validate.yml)
  [![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-243a40?style=flat-square)](LICENSE)
</div>

---

## Visão geral

A **Neblina** é uma extensão gratuita para Chrome que adiciona uma camada de privacidade visual ao [WhatsApp Web](https://web.whatsapp.com/).

O objetivo é simples: permitir que você continue utilizando suas conversas normalmente, mas sem deixar nomes, mensagens ou imagens expostos para quem estiver olhando sua tela.

<div align="center">
  <img src="docs/popup-preview.webp" alt="Painel de configurações da extensão Neblina" width="360">
  <br>
  <sub>Painel de controle da Neblina — configurações independentes e perfis de privacidade.</sub>
</div>

## O que você pode proteger

| Elemento | Comportamento |
| --- | --- |
| **Mensagens** | Desfoque das bolhas de conversa, incluindo conteúdo, horário e confirmações de leitura. |
| **Prévia das conversas** | Oculta o trecho da última mensagem na lista lateral. |
| **Nomes e grupos** | Protege nomes de contatos e grupos na lista e no cabeçalho da conversa. |
| **Fotos de perfil** | Desfoca avatares de contatos, grupos e participantes, inclusive quando carregados posteriormente. |
| **Imagens e vídeos** | Aplica desfoque às mídias exibidas nas conversas. |
| **Campo de digitação** | Protege o texto digitado e o trecho citado ao responder a uma mensagem. |
| **Horários e datas** | Desfoca informações de tempo na lista de conversas. |

### Controles de privacidade

- **Três perfis rápidos:** Total, Equilibrado e Lista.
- **Intensidade ajustável:** de 4 a 24 px.
- **Revelação ao passar o mouse:** veja um elemento temporariamente sem desativar a proteção do restante da página.
- **Modo escudo:** esconda a interface inteira quando precisar.
- **Título da aba:** ocultação opcional, **desativada por padrão**.
- **Atalho:** `Alt + X` para ligar ou desligar a proteção rapidamente.

Todas essas opções podem ser ajustadas pelo ícone da extensão no Chrome.

## Instalação

A extensão está em desenvolvimento e pode ser instalada diretamente pelo código do repositório.

1. Clique em **Code → Download ZIP** no topo desta página.
2. Extraia o ZIP para uma pasta do computador.
3. Acesse `chrome://extensions/` no Chrome.
4. Ative o **Modo do desenvolvedor**.
5. Clique em **Carregar sem compactação** e selecione a pasta extraída que contém `manifest.json`.
6. Abra ou atualize o [WhatsApp Web](https://web.whatsapp.com/) e clique no ícone da **Neblina** para configurar.

> **Para atualizar:** substitua os arquivos na pasta da extensão, clique em **Recarregar** em `chrome://extensions/` e atualize a guia do WhatsApp Web.

## Privacidade em primeiro lugar

A Neblina atua **localmente no navegador**:

- Não envia mensagens, contatos ou mídias a servidores.
- Não utiliza backend, serviços de analytics ou rastreadores.
- Salva somente as preferências da extensão em `chrome.storage.local`.
- Injeta seus estilos e scripts exclusivamente em `https://web.whatsapp.com/*`.
- Solicita apenas a permissão `storage` do Chrome.

Consulte a [Política de Privacidade](PRIVACY.md) para mais informações.

> **Importante:** o desfoque é uma proteção **visual**. Ele não altera as mensagens, não impede acesso à conta e não substitui os recursos de segurança do dispositivo.

## Desenvolvimento

A extensão utiliza **JavaScript e CSS puros**, com **Manifest V3**. Não é necessário instalar dependências para carregá-la no Chrome.

```text
privacidade-whatsapp/
├── manifest.json          # Definições e permissões da extensão
├── background.js          # Atalho de teclado e estado da proteção
├── shared/
│   └── config.js          # Preferências, valores padrão e perfis
├── src/
│   ├── content.js         # Integração visual com o WhatsApp Web
│   └── blur.css           # Regras de desfoque
├── popup/
│   ├── index.html         # Interface do painel
│   ├── style.css          # Estilos do painel
│   └── popup.js           # Interações e configuração
├── icons/                 # Ícones da extensão
├── docs/                  # Imagens de apresentação
└── tests/                 # Testes automatizados
```

Para clonar o projeto:

```bash
git clone https://github.com/bielcerroni/privacidade-whatsapp.git
cd privacidade-whatsapp
```

Os testes locais podem ser executados com `pytest` e `playwright` instalados:

```bash
python -m pytest tests/
```

O workflow em `.github/workflows/validate.yml` também verifica a sintaxe JavaScript e a estrutura do manifesto.

## Estado do projeto

**Versão atual: `0.1.7` — desenvolvimento.**

A Neblina está em uso e em refinamento contínuo. Novas alterações na estrutura do WhatsApp Web podem exigir ajustes nos seletores de interface e nos comportamentos de desfoque.

A versão **1.0** ainda não foi lançada. Por enquanto, o foco está na estabilidade dos efeitos, no comportamento de revelação e na compatibilidade com os elementos carregados dinamicamente.

Encontrou algum elemento que não ficou protegido ou não revela corretamente ao passar o mouse? [Abra uma issue](https://github.com/bielcerroni/privacidade-whatsapp/issues) com uma descrição do comportamento e, se possível, uma captura de tela sem dados sensíveis.

---

<div align="center">
  <sub>Projeto independente, sem vínculo com o WhatsApp ou a Meta. WhatsApp é marca de seus respectivos titulares.</sub>
  <br>
  <sub>Distribuído sob a <a href="LICENSE">licença MIT</a>.</sub>
</div>
