(() => {
  'use strict';
  const {KEY, normalize, PRESETS, CATEGORIES} = NEBLINA;
  let settings;
  const byId = (id) => document.getElementById(id);
  const all = (selector) => [...document.querySelectorAll(selector)];

  function detectedPreset() {
    for (const [name, preset] of Object.entries(PRESETS)) {
      if (CATEGORIES.every((key) => preset[key] === settings.categories[key])) return name;
    }
    return null;
  }

  function render() {
    byId('enabled').checked = settings.enabled;
    byId('hero').classList.toggle('is-off', !settings.enabled);
    byId('status').innerHTML = settings.enabled ? '<i></i> Ativa' : '<i></i> Desativada';
    byId('hero-title').textContent = settings.enabled ? 'Seu WhatsApp, mais privado.' : 'Proteção desativada.';
    byId('hero-subtitle').textContent = settings.enabled ? 'Conversas e informações protegidas contra olhares curiosos.' : 'Ative a proteção para voltar a ocultar suas conversas.';
    all('[data-category]').forEach((input) => {input.checked = settings.categories[input.dataset.category];});
    for (const key of ['revealOnHover', 'hideTabTitle']) byId(key).checked = settings[key];
    byId('blur').value = String(settings.blur);
    byId('blur-value').textContent = `${settings.blur} px`;
    const preset = detectedPreset();
    all('[data-preset]').forEach((button) => {
      const selected = button.dataset.preset === preset;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    byId('shield-action').classList.toggle('shield-on', settings.enabled && settings.shield);
    byId('shield-action').querySelector('strong').textContent = settings.enabled && settings.shield ? 'Desativar modo escudo' : 'Ativar modo escudo';
    byId('shield-action').querySelector('small').textContent = settings.enabled && settings.shield ? 'Voltar ao desfoque configurado' : 'Oculta a tela inteira imediatamente';
  }

  function persist(next) {
    settings = normalize(next);
    render();
    chrome.storage.local.set({[KEY]:settings});
  }

  byId('enabled').addEventListener('change', (event) => persist({...settings, enabled:event.target.checked}));
  all('[data-category]').forEach((el) => el.addEventListener('change', () => {
    persist({...settings, categories:{...settings.categories, [el.dataset.category]:el.checked}});
  }));
  for (const key of ['revealOnHover', 'hideTabTitle']) {
    byId(key).addEventListener('change', (event) => persist({...settings,[key]:event.target.checked}));
  }
  byId('blur').addEventListener('input', (event) => {
    settings.blur = Number(event.target.value);
    byId('blur-value').textContent = `${settings.blur} px`;
    clearTimeout(byId('blur').saveTimer);
    byId('blur').saveTimer = setTimeout(() => persist(settings), 90);
  });
  all('[data-preset]').forEach((button) => button.addEventListener('click', () => {
    persist({...settings, categories:{...PRESETS[button.dataset.preset]}});
  }));
  byId('shield-action').addEventListener('click', () => persist({
    ...settings, enabled:true, shield: !(settings.enabled && settings.shield)
  }));
  chrome.storage.local.get(KEY, (result) => {settings = normalize(result[KEY]); render();});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) {settings = normalize(changes[KEY].newValue); render();}
  });
})();
