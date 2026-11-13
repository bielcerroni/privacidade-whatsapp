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

  // Só marca o nó que desenha o nome, jamais o botão inteiro ou o status.
  function markNameNode(element, width = '128px') {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.nbNameText === 'true') return;
    const originalColor = getComputedStyle(element).color;
    const surface = findSurfaceColor(element);
    element.style.setProperty('--nb-mask-ink', originalColor);
    element.style.setProperty('--nb-mask-surface', surface);
    element.style.setProperty('--nb-mask-width', width);
    element.dataset.nbNameText = 'true';
  }

  function findSurfaceColor(element) {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const value = getComputedStyle(node).backgroundColor;
      if (/^rgba?\(/.test(value)) {
        const rgba = value.match(/[\d.]+/g)?.map(Number) || [];
        if (rgba.length === 3 || rgba[3] > .85) return value;
      }
    }
    return 'rgb(20, 25, 28)';
  }

  function firstTextNode(container) {
    if (!container) return null;
    const options = container.matches('span, strong, b, h1, h2, p')
      ? [container, ...container.querySelectorAll('span, strong, b, h1, h2, p')]
      : [...container.querySelectorAll('span, strong, b, h1, h2, p')];
    return options.find((node) => Array.from(node.childNodes).some((child) =>
      child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0
    ));
  }

  function markNames() {
    const list = document.getElementById('pane-side');
    if (list) {
      for (const container of list.querySelectorAll('[data-testid="cell-frame-title"], ._ak8q, [data-testid="chatlist-row"] span[title], [role="gridcell"] span[title]')) {
        const name = firstTextNode(container);
        if (!name) continue;
        const row = container.closest('[role="row"], [role="gridcell"], [data-testid="chatlist-row"]');
        if (row) row.dataset.nbNameZone = 'true';
        markNameNode(name,'118px');
      }
    }

    const header = document.querySelector('#main header');
    if (header) {
      const button = header.querySelector('[data-testid="conversation-info-header-button"]');
      const title = header.querySelector('[data-testid="conversation-info-header-chat-title"], [data-testid="conversation-title"], [data-testid="contact-name"], span[title]')
        || (button && firstTextNode(button));
      if (title) {
        const name = firstTextNode(title) || title;
        markNameNode(name,'148px');
        (button || name).dataset.nbNameZone = 'true';
      }
    }
    const contact = document.querySelector('#side [data-testid="contact-name"]');
    if (contact) {
      markNameNode(firstTextNode(contact) || contact, '148px');
      contact.dataset.nbNameZone = 'true';
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
