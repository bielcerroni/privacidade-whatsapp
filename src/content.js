/* Injetado exclusivamente em https://web.whatsapp.com/. Não lê mensagens nem usa rede. */
(() => {
  'use strict';
  const {KEY, normalize, DEFAULT_SETTINGS} = NEBLINA;
  const root = document.documentElement;
  if (!root) return;
  root.dataset.nbActive = 'true';
  for (const category of NEBLINA.CATEGORIES) root.dataset[`nb${category[0].toUpperCase()}${category.slice(1)}`] = 'true';
  root.style.setProperty('--nb-blur', `${DEFAULT_SETTINGS.blur}px`);

  let current = normalize(DEFAULT_SETTINGS);
  let lastOriginalTitle = document.title || 'WhatsApp';
  const protectedTitle = 'WhatsApp Web • Neblina';
  let titleObserver;
  let domObserver;
  let scanScheduled = false;

  function protectTitle() {
    if (!current.enabled || !current.hideTabTitle) return;
    if (document.title !== protectedTitle) {
      lastOriginalTitle = document.title || lastOriginalTitle;
      document.title = protectedTitle;
    }
  }

  function manageTitle() {
    if (!document.head) return;
    if (!titleObserver) {
      titleObserver = new MutationObserver(() => {
        if (current.enabled && current.hideTabTitle) protectTitle();
      });
      titleObserver.observe(document.head, {childList:true, subtree:true, characterData:true});
    }
    if (current.enabled && current.hideTabTitle) protectTitle();
    else if (document.title === protectedTitle) document.title = lastOriginalTitle;
  }

  function createShield() {
    let shield = document.getElementById('nb-privacy-shield');
    if (!document.body) return;
    if (!shield) {
      shield = document.createElement('div');
      shield.id = 'nb-privacy-shield';
      shield.setAttribute('role', 'dialog');
      shield.setAttribute('aria-label', 'Modo escudo de privacidade');
      const content = document.createElement('div');
      content.className = 'nb-shield-card';
      content.innerHTML = '<span class="nb-shield-mark" aria-hidden="true">✦</span><div class="nb-shield-eyebrow">NEBLINA</div><h1>Suas conversas estão protegidas</h1><p>O WhatsApp Web está temporariamente oculto neste navegador.</p><button type="button" id="nb-unlock">Revelar WhatsApp</button><small>Atalho: Alt + Shift + B para ligar/desligar a proteção</small>';
      shield.append(content);
      content.querySelector('button').addEventListener('click', () => {
        chrome.storage.local.get(KEY, (result) => {
          const next = normalize(result[KEY]);
          next.shield = false;
          chrome.storage.local.set({[KEY]: next});
        });
      });
      document.body.append(shield);
    }
    shield.hidden = !(current.enabled && current.shield);
  }

  // Aplica a máscara ao contêiner do nome (não só ao primeiro span):
  // nomes compostos, emojis e sufixos ficam ocultos como uma única unidade.
  function markNameNode(element, width = '128px') {
    if (!(element instanceof HTMLElement) || element.dataset.nbNameMask === 'true') return;
    const ink = getComputedStyle(element).color;
    element.style.setProperty('--nb-mask-ink', ink);
    element.style.setProperty('--nb-mask-surface', findSurfaceColor(element));
    element.style.setProperty('--nb-mask-width', width);
    element.dataset.nbNameMask = 'true';
    element.dataset.nbNameText = 'true'; // compatibilidade com marcadores anteriores
  }

  function findSurfaceColor(element) {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const value = getComputedStyle(node).backgroundColor;
      const rgba = value.match(/[\d.]+/g)?.map(Number) || [];
      if (value.startsWith('rgb(') || (value.startsWith('rgba(') && rgba[3] >= .85)) return value;
    }
    return 'rgb(20, 25, 28)';
  }

  function firstTextNode(container) {
    if (!container) return null;
    const options = container.matches('span, strong, b, h1, h2, p')
      ? [container, ...container.querySelectorAll('span, strong, b, h1, h2, p')]
      : [...container.querySelectorAll('span, strong, b, h1, h2, p')];
    return options.find(node => Array.from(node.childNodes).some(child =>
      child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0));
  }

  function markNames() {
    const list = document.getElementById('pane-side');
    if (list) {
      for (const container of list.querySelectorAll('[data-testid="cell-frame-title"], ._ak8q, [data-testid="chatlist-row"] span[title], [role="gridcell"] span[title]')) {
        const title = container.matches('[data-testid="cell-frame-title"], ._ak8q')
          ? container : container.closest('[data-testid="cell-frame-title"], ._ak8q') || container;
        if (!firstTextNode(title)) continue;
        const row = title.closest('[role="row"], [role="gridcell"], [data-testid="chatlist-row"]');
        markNameNode(title, '118px');
      }
    }

    const header = document.querySelector('#main header');
    if (header) {
      const button = header.querySelector('[data-testid="conversation-info-header-button"]');
      const title = header.querySelector('[data-testid="conversation-info-header-chat-title"], [data-testid="conversation-title"], [data-testid="contact-name"], span[title]')
        || (button && firstTextNode(button));
      if (title) {
        markNameNode(title, '148px');
        (button || title).dataset.nbNameZone = 'true';
      }
    }
    const contact = document.querySelector('#side [data-testid="contact-name"]');
    if (contact) {
      markNameNode(contact, '148px');
      contact.dataset.nbNameZone = 'true';
    }
  }

  function markSidebarTimes() {
    const list = document.getElementById('pane-side');
    if (!list) return;
    const timePattern = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;
    const datePattern = /^\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4})$/;
    for (const node of list.querySelectorAll('span, time, div')) {
      if (node.dataset.nbSidebarTime === 'true') continue;
      if (node.children.length > 2) continue;
      const direct = Array.from(node.childNodes)
        .filter(child => child.nodeType === Node.TEXT_NODE)
        .map(child => child.textContent.trim()).filter(Boolean).join('');
      if (timePattern.test(direct) || datePattern.test(direct) || direct === 'Ontem') {
        node.dataset.nbSidebarTime = 'true';
      }
    }
  }

  function isCircular(element) {
    if (!element) return false;
    const radius = getComputedStyle(element).borderTopLeftRadius;
    if (radius.includes('%')) return parseFloat(radius) >= 35;
    const px = parseFloat(radius) || 0;
    const size = element.getBoundingClientRect();
    return size.width > 0 && px >= Math.min(size.width, size.height) * .38;
  }

  function tagAvatar(image) {
    const preferred = image.closest('[data-testid="avatar"], [data-testid="default-user"], [data-testid="default-group"], [data-testid="group-avatar"]');
    const candidates = [preferred, image.parentElement, image.parentElement?.parentElement].filter(Boolean);
    const rect = image.getBoundingClientRect();
    const frame = candidates.find((node) => {
      const box = node.getBoundingClientRect();
      return box.width >= rect.width * .8 && box.height >= rect.height * .8 &&
        box.width <= Math.max(84, rect.width * 1.7) && box.height <= Math.max(84, rect.height * 1.7) &&
        (isCircular(node) || node === preferred);
    });
    if (frame) {
      frame.dataset.nbAvatarFrame = 'true';
      frame.dataset.nbAvatarKind = 'image';
      if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
      frame.style.overflow = 'hidden';
      frame.style.borderRadius = '50%';
    }
    image.dataset.nbAvatarImage = 'true';
  }

  function markAvatars() {
    const photos = document.querySelectorAll('#pane-side img, #main img, #side img, [data-testid="avatar"] img, [data-testid="group-avatar"] img');
    for (const img of photos) {
      if (img.dataset.nbAvatarImage) continue;
      const inList = Boolean(img.closest('#pane-side [role="row"], #pane-side [role="gridcell"], #pane-side [data-testid="chatlist-row"]'));
      const inHeader = Boolean(img.closest('#main header, #side header'));
      const semantic = Boolean(img.closest('[data-testid*="avatar"], [data-testid*="profile"], [data-testid*="participant"]'));
      const inMain = Boolean(img.closest('#main'));
      const insideMessage = Boolean(img.closest('[data-testid="msg-container"], [data-testid="media-viewer"]'));
      const rect = img.getBoundingClientRect();
      const smallRound = inMain && !insideMessage && rect.width >= 22 && rect.height >= 22 &&
        rect.width <= 72 && rect.height <= 72 &&
        (isCircular(img) || isCircular(img.parentElement) || isCircular(img.parentElement?.parentElement));
      if (inList || inHeader || semantic || smallRound) tagAvatar(img);
    }

    for (const avatar of document.querySelectorAll('#main [style*="background-image"], #main [role="img"], #pane-side [style*="background-image"], #pane-side [role="img"]')) {
      if (avatar.dataset.nbAvatarFrame || avatar.closest('[data-nb-avatar-frame]')) continue;
      if (avatar.closest('[data-testid="msg-container"], [data-testid="media-viewer"]')) continue;
      const rect = avatar.getBoundingClientRect();
      if (rect.width < 22 || rect.height < 22 || rect.width > 72 || rect.height > 72) continue;
      if (!isCircular(avatar) && !isCircular(avatar.parentElement)) continue;
      avatar.dataset.nbAvatarFrame = 'true';
      avatar.dataset.nbAvatarKind = 'background';
      if (getComputedStyle(avatar).position === 'static') avatar.style.position = 'relative';
      avatar.style.overflow = 'hidden';
      avatar.style.borderRadius = '50%';
    }

    for (const avatar of document.querySelectorAll('#pane-side [data-testid="avatar"], #main [data-testid="avatar"], #main [data-testid="default-group"]')) {
      if (avatar.dataset.nbAvatarFrame || avatar.closest('[data-nb-avatar-frame]')) continue;
      const size = avatar.getBoundingClientRect();
      if (size.width < 20 || size.height < 20 || size.width > 100) continue;
      avatar.dataset.nbAvatarFrame = 'true';
      avatar.dataset.nbAvatarKind = 'background';
      if (getComputedStyle(avatar).position === 'static') avatar.style.position = 'relative';
      avatar.style.overflow = 'hidden';
      avatar.style.borderRadius = '50%';
    }
  }

  let hoveredAvatar = null;
  let hoveredHeaderName = null;
  let pendingPointer = null;
  let pointerScheduled = false;

  function setHoveredHeaderName(next) {
    if (hoveredHeaderName === next) return;
    if (hoveredHeaderName) delete hoveredHeaderName.dataset.nbNameHover;
    hoveredHeaderName = next;
    if (hoveredHeaderName) hoveredHeaderName.dataset.nbNameHover = 'true';
  }

  // O WhatsApp pode posicionar uma camada transparente sobre o nome; por isso
  // :hover do span/botão não é confiável. Detectamos apenas a área do título,
  // sem alterar ou ler o texto mostrado pelo contato.
  function updateHeaderNameHover(x, y) {
    if (!current.enabled || !current.revealOnHover || !current.categories.names) {
      setHoveredHeaderName(null);
      return;
    }
    const header = document.querySelector('#main header');
    if (!header) { setHoveredHeaderName(null); return; }
    let next = null;
    for (const name of header.querySelectorAll('[data-nb-name-mask]')) {
      const rect = name.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      // Pequena margem cobre as camadas de clique, mas não os botões de chamada.
      if (x >= rect.left - 8 && x <= rect.right + 8 &&
          y >= rect.top - 8 && y <= rect.bottom + 8) {
        next = name;
        break;
      }
    }
    setHoveredHeaderName(next);
  }

  function setHoveredAvatar(next) {
    if (hoveredAvatar === next) return;
    if (hoveredAvatar) delete hoveredAvatar.dataset.nbAvatarHover;
    hoveredAvatar = next;
    if (hoveredAvatar) hoveredAvatar.dataset.nbAvatarHover = 'true';
  }

  // Em algumas versões um botão cobre a imagem e impede :hover no <img>.
  // A posição do ponteiro no círculo resolve sem clicar, sem ler conteúdo.
  function updateAvatarHover(x, y) {
    if (!current.enabled || !current.revealOnHover || !current.categories.avatars) {
      setHoveredAvatar(null);
      return;
    }
    let match = null;
    let area = Infinity;
    for (const element of document.querySelectorAll('[data-nb-avatar-frame], [data-nb-avatar-image]')) {
      if (element.matches('[data-nb-avatar-image]') && element.closest('[data-nb-avatar-frame]')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 16 || rect.height < 16 || rect.width > 110 || rect.height > 110) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (x - cx) / (rect.width / 2);
      const dy = (y - cy) / (rect.height / 2);
      if (dx * dx + dy * dy <= 1 && rect.width * rect.height < area) {
        match = element;
        area = rect.width * rect.height;
      }
    }
    setHoveredAvatar(match);
  }

  document.addEventListener('pointermove', event => {
    pendingPointer = [event.clientX, event.clientY];
    if (pointerScheduled) return;
    pointerScheduled = true;
    requestAnimationFrame(() => {
      pointerScheduled = false;
      if (pendingPointer) {
        updateAvatarHover(...pendingPointer);
        updateHeaderNameHover(...pendingPointer);
      }
    });
  }, {passive:true, capture:true});
  document.addEventListener('pointerleave', () => {
    setHoveredAvatar(null);
    setHoveredHeaderName(null);
  });

  /* O WhatsApp monta o preview da resposta fora do editor, às vezes sem data-testid.
     Só marcamos a região de texto junto ao compositor e nunca o botão de cancelar. */
  function markReplyPreviews() {
    const main = document.getElementById('main');
    if (!main) return;
    const composer = main.querySelector('footer [contenteditable="true"], footer [role="textbox"], [data-testid="conversation-compose-box-input"]');
    const footer = composer?.closest('footer') || main.querySelector('footer');
    if (!footer) return;
    const editor = composer || footer;
    const editBox = editor.getBoundingClientRect();
    if (editBox.width < 40) return;

    const isNearEditor = (element) => {
      if (!(element instanceof HTMLElement) || element.contains(editor)) return false;
      if (element.closest('[data-testid="msg-container"], [data-testid="media-viewer"]')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width >= 80 && rect.height >= 18 && rect.height <= 155 &&
        rect.bottom > editBox.top - 170 && rect.top <= editBox.top + 12 &&
        rect.left < editBox.right && rect.right > editBox.left;
    };

    const semantic = '[data-testid="quoted-message-preview"], [data-testid="reply-preview"], [data-testid="composer-reply-preview"], [data-testid="reply-quoted-message"], [data-testid="reply-preview-container"], [data-testid="quoted-message-container"]';
    for (const candidate of main.querySelectorAll(semantic)) {
      if (!isNearEditor(candidate)) continue;
      candidate.dataset.nbReplyPreview = 'true';
    }

    // Fallback da interface atual: resposta no bloco imediatamente acima do campo.
    // Limitado aos ancestrais próximos do footer, evitando mensagens do histórico.
    const roots = [footer, footer.parentElement, footer.parentElement?.parentElement].filter(Boolean);
    for (const scope of roots) {
      for (const candidate of scope.querySelectorAll('div, section, article')) {
        if (candidate.dataset.nbReplyPreview === 'true' || !isNearEditor(candidate)) continue;
        if (candidate.matches('button, [role="button"]') || candidate.closest('[data-nb-reply-preview]')) continue;
        const controls = candidate.querySelectorAll('button, [role="button"], [data-icon="x"], [data-icon="close"], [data-testid*="cancel-reply"]');
        const closers = [...controls].filter(node =>
          /cancel|close|fechar|descartar|resposta|reply/i.test(node.getAttribute('aria-label') || node.getAttribute('data-testid') || '') ||
          node.matches('[data-icon="x"], [data-icon="close"]')
        );
        // A barra de resposta tem o X fora da área citada. Ao encontrar a barra,
        // protegemos o filho de conteúdo sem mascarar o controle de fechar.
        if (closers.length === 0) continue;
        const possible = [...candidate.children].filter(node =>
          node instanceof HTMLElement && isNearEditor(node) &&
          !closers.some(close => node === close || node.contains(close))
        );
        const content = possible.sort((a,b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
        if (content) content.dataset.nbReplyPreview = 'true';
      }
    }
  }

  function scanDom() {
    scanScheduled = false;
    markNames();
    markSidebarTimes();
    markAvatars();
    markReplyPreviews();
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(scanDom);
  }

  function watchDom() {
    if (!document.body || domObserver) return;
    scanDom();
    domObserver = new MutationObserver((records) => {
      const relevant = records.some(record => {
        if (record.type === 'childList' || record.type === 'characterData') return true;
        // Fotos podem aparecer ao trocar somente src/srcset (sem novo nó).
        // Não observamos data-* nem estilos escritos pela própria extensão.
        return record.type === 'attributes' &&
          record.target instanceof HTMLImageElement &&
          (record.attributeName === 'src' || record.attributeName === 'srcset');
      });
      if (relevant) scheduleScan();
    });
    domObserver.observe(document.body, {
      childList:true, subtree:true, characterData:true,
      attributes:true, attributeFilter:['src','srcset']
    });
  }

  function apply(settings) {
    current = normalize(settings);
    root.dataset.nbActive = String(current.enabled);
    root.dataset.nbReveal = current.revealOnHover ? 'hover' : 'never';
    root.dataset.nbShield = String(current.shield);
    root.style.setProperty('--nb-blur', `${current.blur}px`);
    for (const category of NEBLINA.CATEGORIES) {
      root.dataset[`nb${category[0].toUpperCase()}${category.slice(1)}`] = String(current.categories[category]);
    }
    manageTitle();
    createShield();
    if (!current.enabled || !current.revealOnHover || !current.categories.avatars) setHoveredAvatar(null);
    if (!current.enabled || !current.revealOnHover || !current.categories.names) setHoveredHeaderName(null);
    scheduleScan();
  }

  chrome.storage.local.get(KEY, (result) => apply(result[KEY]));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) apply(changes[KEY].newValue);
  });
  document.addEventListener('DOMContentLoaded', () => {
    manageTitle();
    createShield();
    watchDom();
  }, {once:true});
  if (document.readyState !== 'loading') watchDom();
})();
