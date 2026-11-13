"""Smoke tests locais: validam manifest, seletores e interface no Chromium.

Ambiente de testes usa chrome.storage simulado: extensão precisa ser instalada no
Chrome do usuário para a validação fim-a-fim com o WhatsApp real.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MOCK = ROOT / 'tests' / 'mock-whatsapp.html'

MOCK_STORAGE = r"""
(() => {
  const listeners=[];
  let values={};
  globalThis.chrome={
    storage: {
      local:{
        get:(key,cb)=>cb({[key]:values[key]}),
        set:(updates)=>{
          const previous={...values};
          Object.assign(values,updates);
          const changed={};
          for(const [key,value] of Object.entries(updates))changed[key]={oldValue:previous[key],newValue:value};
          for(const fn of listeners)fn(changed,'local');
        }
      },
      onChanged:{addListener:(fn)=>listeners.push(fn)}
    }
  };
})();
"""


def test_manifest_and_assets():
    m = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    assert m['manifest_version'] == 3
    assert m['version'] == '0.1.0'
    assert m['permissions'] == ['storage']
    assert m['content_scripts'][0]['matches'] == ['https://web.whatsapp.com/*']
    files = [m['background']['service_worker'], m['action']['default_popup']]
    files += m['content_scripts'][0]['js'] + m['content_scripts'][0]['css']
    files += list(m['icons'].values())
    assert all((ROOT / file).is_file() for file in files)


def test_chromium_styles_content_and_popup():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1024,'height':900})

        try:
            wa = context.new_page()
            wa.set_content(MOCK.read_text(encoding='utf-8'))
            wa.add_script_tag(content=MOCK_STORAGE)
            wa.add_style_tag(path=str(ROOT/'src'/'blur.css'))
            wa.add_script_tag(path=str(ROOT/'shared'/'config.js'))
            wa.add_script_tag(path=str(ROOT/'src'/'content.js'))
            wa.wait_for_function("document.documentElement.dataset.nbActive === 'true'")
            assert 'Neblina' not in wa.title()
            assert 'blur' in wa.locator('#message').evaluate('(el)=>getComputedStyle(el).filter')
            assert 'blur' in wa.locator('#preview').evaluate('(el)=>getComputedStyle(el).filter')
            assert 'blur' in wa.locator('#avatar').evaluate('(el)=>getComputedStyle(el).filter')
            assert 'blur' in wa.locator('#editor').evaluate('(el)=>getComputedStyle(el).filter')
            assert 'blur' in wa.locator('#media').evaluate('(el)=>getComputedStyle(el).filter')
            assert 'blur' in wa.locator('[data-testid="conversation-info-header-button"]').evaluate('(el)=>getComputedStyle(el).filter')
            # O texto deve continuar borrado ao digitar, mesmo com hover e foco.
            editor = wa.locator('#editor')
            editor.hover()
            editor.click()
            editor.fill('Escrevendo uma mensagem sigilosa')
            assert 'blur' in editor.evaluate('(el)=>getComputedStyle(el).filter')

            # Mudanças se refletem na CSS da conversa.
            wa.evaluate("chrome.storage.local.set({neblinaSettings:{categories:{previews:false},blur:18}})")
            wa.wait_for_function("document.documentElement.dataset.nbPreviews === 'false'")
            assert wa.locator('#preview').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            assert 'blur' in wa.locator('#message').evaluate('(el)=>getComputedStyle(el).filter')
            assert wa.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--nb-blur').trim()") == '18px'

            wa.evaluate("chrome.storage.local.set({neblinaSettings:{hideTabTitle:true}})")
            wa.wait_for_function("document.title.includes('Neblina')")

            # Escudo torna o conteúdo inacessível enquanto ativo e possui saída.
            wa.evaluate('chrome.storage.local.set({neblinaSettings:{shield:true}})')
            wa.locator('#nb-privacy-shield').wait_for(state='visible')
            wa.locator('#nb-unlock').click()
            wa.locator('#nb-privacy-shield').wait_for(state='hidden')
            wa.evaluate('chrome.storage.local.set({neblinaSettings:{enabled:false}})')
            assert wa.locator('#message').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            assert 'Neblina' not in wa.title()

            popup = context.new_page()
            popup.set_content((ROOT/'popup'/'index.html').read_text(encoding='utf-8'))
            popup.add_style_tag(path=str(ROOT/'popup'/'style.css'))
            popup.add_script_tag(content=MOCK_STORAGE)
            popup.add_script_tag(path=str(ROOT/'shared'/'config.js'))
            popup.add_script_tag(path=str(ROOT/'popup'/'popup.js'))
            popup.wait_for_function("document.querySelector('#status').textContent.includes('Ativa')")
            assert popup.get_by_role('heading',name='O que proteger').count() == 1
            assert popup.locator('#hideTabTitle').is_checked() is False
            popup.locator('[data-category="previews"]').uncheck(force=True)
            assert popup.evaluate("chrome.storage.local.get('neblinaSettings',r=>window.__popupState=r.neblinaSettings);window.__popupState.categories.previews") is False
            popup.locator('#shield-action').click()
            assert popup.evaluate("chrome.storage.local.get('neblinaSettings',r=>window.__popupState=r.neblinaSettings);window.__popupState.shield") is True
            popup.locator('#blur').fill('18')
            popup.wait_for_timeout(160)
            assert popup.evaluate("chrome.storage.local.get('neblinaSettings',r=>window.__popupState=r.neblinaSettings);window.__popupState.blur") == 18
        finally:
            context.close();browser.close()
