/* Injetado exclusivamente em https://web.whatsapp.com/. Não lê mensagens nem usa rede. */
(() => {
  'use strict';
  const {KEY, normalize, DEFAULT_SETTINGS} = NEBLINA;
  const root = document.documentElement;
  if (!root) return;
  // Postura conservadora: ativa o CSS antes do carregamento do WhatsApp para evitar flashes.
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


  // Nenhum nome ou conteúdo de mensagem é coletado. Os atributos só identificam
  // quais *elementos visuais* devem receber as máscaras de privacidade.
  function markTextLeaves(container) {
    if (!container) return;
    for (const element of container.querySelectorAll('span, div, strong, b, h1, h2, p')) {
      const directText = Array.from(element.childNodes).some((node) =>
        node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
      );
      if (directText) element.dataset.nbNameText = 'true';
    }
  }

  function markNames() {
    const list = document.getElementById('pane-side');
    if (list) {
      for (const container of list.querySelectorAll('[data-testid="cell-frame-title"], ._ak8q, [data-testid="chatlist-row"] span[title], [role="gridcell"] span[title]')) {
        const row = container.closest('[role="row"], [role="gridcell"], [data-testid="chatlist-row"]');
        if (row) row.dataset.nbNameZone = 'true';
        markTextLeaves(container);
        if (!container.querySelector('[data-nb-name-text]') && container.matches('span, strong, b')) {
          container.dataset.nbNameText = 'true';
        }
      }
    }
    for (const selector of ['#main header [data-testid="conversation-info-header-button"]', '#main header [data-testid="conversation-info-header-chat-title"]', '#main header [data-testid="conversation-title"]', '#side [data-testid="contact-name"]']) {
      for (const element of document.querySelectorAll(selector)) {
        element.dataset.nbNameZone = 'true';
        markTextLeaves(element);
      }
    }
    const header = document.querySelector('#main header');
    if (header) {
      for (const span of header.querySelectorAll('span[title], span[dir="auto"]')) {
        span.dataset.nbNameText = 'true';
        const zone = span.closest('[data-testid="conversation-info-header-button"]') || header;
        zone.dataset.nbNameZone = 'true';
      }
      // aria-labelledby é a forma acessível de identificar o nome, quando
      // o WhatsApp substitui os spans/classes do cabeçalho.
      for (const button of header.querySelectorAll('[data-testid="conversation-info-header-button"][aria-labelledby]')) {
        button.dataset.nbNameZone = 'true';
        for (const id of (button.getAttribute('aria-labelledby') || '').split(/\s+/)) {
          const target = id && document.getElementById(id);
          if (target && (button.contains(target) || header.contains(target))) {
            if (target.matches('span, strong, b')) target.dataset.nbNameText = 'true';
            else markTextLeaves(target);
          }
        }
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
    if (image.closest('[data-nb-avatar-frame]')) return;
    const preferred = image.closest('[data-testid="avatar"], [data-testid="default-user"], [data-testid="default-group"], [data-testid="group-avatar"]');
    const candidates = [preferred, image.parentElement, image.parentElement?.parentElement].filter(Boolean);
    const rect = image.getBoundingClientRect();
    const frame = candidates.find((node) => {
      const box = node.getBoundingClientRect();
      return box.width >= rect.width * .8 && box.height >= rect.height * .8 &&
        box.width <= Math.max(84, rect.width * 1.6) && box.height <= Math.max(84, rect.height * 1.6) &&
        (isCircular(node) || node === preferred);
    });
    if (frame) {
      frame.dataset.nbAvatarFrame = 'true';
      if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
      frame.style.overflow = 'hidden';
      frame.style.borderRadius = '50%';
    } else {
      image.dataset.nbAvatarImage = 'true';
    }
  }

  function markAvatars() {
    const photos = document.querySelectorAll('#pane-side img, #main img, #side img, [data-testid="avatar"] img, [data-testid="group-avatar"] img');
    for (const img of photos) {
      if (img.dataset.nbAvatarImage || img.closest('[data-nb-avatar-frame]')) continue;
      const inList = Boolean(img.closest('#pane-side [role="row"], #pane-side [role="gridcell"], #pane-side [data-testid="chatlist-row"]'));
      const inHeader = Boolean(img.closest('#main header, #side header'));
      const semantic = Boolean(img.closest('[data-testid*="avatar"], [data-testid*="profile"], [data-testid*="participant"]'));
      const inMain = Boolean(img.closest('#main'));
      const insideMessage = Boolean(img.closest('[data-testid="msg-container"], [data-testid="media-viewer"]'));
      const rect = img.getBoundingClientRect();
      const smallRound = inMain && !insideMessage && rect.width >= 22 && rect.height >= 22 &&
        rect.width <= 64 && rect.height <= 64 &&
        (isCircular(img) || isCircular(img.parentElement) || isCircular(img.parentElement?.parentElement));
      if (inList || inHeader || semantic || smallRound) tagAvatar(img);
    }
    // Fotos de grupo renderizadas como background-image ou role=img, sem tag <img>.
    for (const avatar of document.querySelectorAll('#main [style*="background-image"], #main [role="img"], #pane-side [style*="background-image"], #pane-side [role="img"]')) {
      if (avatar.dataset.nbAvatarFrame || avatar.closest('[data-nb-avatar-frame]')) continue;
      if (avatar.closest('[data-testid="msg-container"], [data-testid="media-viewer"]')) continue;
      const rect = avatar.getBoundingClientRect();
      if (rect.width < 22 || rect.height < 22 || rect.width > 72 || rect.height > 72) continue;
      if (!isCircular(avatar) && !isCircular(avatar.parentElement)) continue;
      avatar.dataset.nbAvatarFrame = 'true';
      if (getComputedStyle(avatar).position === 'static') avatar.style.position = 'relative';
      avatar.style.overflow = 'hidden';
      avatar.style.borderRadius = '50%';
    }
    // Avatares padrão (SVG sem imagem): aplica-se a máscara no próprio nó.
    for (const avatar of document.querySelectorAll('#pane-side [data-testid="avatar"], #main [data-testid="avatar"], #main [data-testid="default-group"]')) {
      if (avatar.dataset.nbAvatarFrame || avatar.closest('[data-nb-avatar-frame]')) continue;
      const size = avatar.getBoundingClientRect();
      if (size.width < 20 || size.height < 20 || size.width > 100) continue;
      avatar.dataset.nbAvatarFrame = 'true';
      if (getComputedStyle(avatar).position === 'static') avatar.style.position = 'relative';
      avatar.style.overflow = 'hidden';
      avatar.style.borderRadius = '50%';
    }
  }

  function scanDom() {
    scanScheduled = false;
    markNames();
    markAvatars();
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
      if (records.some((record) => record.type === 'childList')) scheduleScan();
    });
    domObserver.observe(document.body, {childList:true, subtree:true});
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
