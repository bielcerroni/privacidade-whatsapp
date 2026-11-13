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
  }

  chrome.storage.local.get(KEY, (result) => apply(result[KEY]));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) apply(changes[KEY].newValue);
  });
  document.addEventListener('DOMContentLoaded', () => {
    manageTitle();
    createShield();
  }, {once:true});
})();
