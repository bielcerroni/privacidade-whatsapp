/* Configuração compartilhada entre o popup, o service worker e o WhatsApp Web. */
(function (root) {
  'use strict';
  const KEY = 'neblinaSettings';
  const CATEGORIES = ['messages', 'previews', 'names', 'avatars', 'media', 'composer'];
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    shield: false,
    revealOnHover: true,
    hideTabTitle: false,
    blur: 11,
    categories: {
      messages: true,
      previews: true,
      names: true,
      avatars: true,
      media: true,
      composer: true
    }
  });
  const PRESETS = Object.freeze({
    full: {messages:true, previews:true, names:true, avatars:true, media:true, composer:true},
    balanced: {messages:true, previews:true, names:false, avatars:false, media:true, composer:true},
    sidebar: {messages:false, previews:true, names:true, avatars:true, media:false, composer:false}
  });
  function normalize(value) {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const incomingCategories = raw.categories && typeof raw.categories === 'object' ? raw.categories : {};
    const categories = {};
    for (const key of CATEGORIES) {
      categories[key] = typeof incomingCategories[key] === 'boolean'
        ? incomingCategories[key] : DEFAULT_SETTINGS.categories[key];
    }
    return {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_SETTINGS.enabled,
      shield: typeof raw.shield === 'boolean' ? raw.shield : DEFAULT_SETTINGS.shield,
      revealOnHover: typeof raw.revealOnHover === 'boolean' ? raw.revealOnHover : DEFAULT_SETTINGS.revealOnHover,
      hideTabTitle: typeof raw.hideTabTitle === 'boolean' ? raw.hideTabTitle : DEFAULT_SETTINGS.hideTabTitle,
      blur: Math.min(24, Math.max(4, Number.isFinite(Number(raw.blur)) ? Math.round(Number(raw.blur)) : DEFAULT_SETTINGS.blur)),
      categories
    };
  }
  root.NEBLINA = Object.freeze({KEY, CATEGORIES, DEFAULT_SETTINGS, PRESETS, normalize});
})(globalThis);
