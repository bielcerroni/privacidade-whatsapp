'use strict';
importScripts('shared/config.js');
const {KEY, normalize, DEFAULT_SETTINGS} = NEBLINA;

function setBadge(enabled) {
  chrome.action.setBadgeText({text: enabled ? '' : 'OFF'});
  chrome.action.setBadgeBackgroundColor({color: '#64748b'});
  chrome.action.setTitle({title: enabled ? 'Neblina — Proteção ativa' : 'Neblina — Proteção desativada'});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(KEY, (result) => {
    const existing = result[KEY];
    if (!existing) chrome.storage.local.set({[KEY]: DEFAULT_SETTINGS});
    setBadge(existing ? normalize(existing).enabled : true);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(KEY, (result) => setBadge(normalize(result[KEY]).enabled));
});

chrome.commands.onCommand.addListener((name) => {
  if (name !== 'toggle-privacy') return;
  chrome.storage.local.get(KEY, (result) => {
    const config = normalize(result[KEY]);
    config.enabled = !config.enabled;
    chrome.storage.local.set({[KEY]: config});
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[KEY]) setBadge(normalize(changes[KEY].newValue).enabled);
});
