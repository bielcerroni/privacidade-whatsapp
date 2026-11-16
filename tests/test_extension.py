"""Testes locais para os alvos de privacidade (sem WhatsApp real)."""
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


def setup_wa(page):
    page.set_content(MOCK.read_text(encoding='utf-8'))
    page.add_script_tag(content=MOCK_STORAGE)
    page.add_style_tag(path=str(ROOT/'src'/'blur.css'))
    page.add_script_tag(path=str(ROOT/'shared'/'config.js'))
    page.add_script_tag(path=str(ROOT/'src'/'content.js'))
    page.wait_for_function("document.querySelector('#mock-name')?.dataset.nbNameText === 'true'")
    page.wait_for_function("document.querySelector('#participant-frame')?.dataset.nbAvatarFrame === 'true'")


def test_manifest_and_assets():
    m = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    assert m['manifest_version'] == 3
    assert m['version'].startswith('0.1.')
    assert m['permissions'] == ['storage']
    assert m['content_scripts'][0]['matches'] == ['https://web.whatsapp.com/*']
    files = [m['background']['service_worker'], m['action']['default_popup']]
    files += m['content_scripts'][0]['js'] + m['content_scripts'][0]['css']
    files += list(m['icons'].values())
    assert all((ROOT / file).is_file() for file in files)


def test_chromium_privacy_and_hover():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1024,'height':900})
        try:
            wa = context.new_page()
            setup_wa(wa)
            assert 'Neblina' not in wa.title()
            assert wa.locator('#message').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            assert wa.locator('#message-meta').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            assert wa.locator('#preview').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            assert wa.locator('#media').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            assert wa.locator('[data-testid="conversation-info-header-button"]').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            assert wa.locator('#mock-name').evaluate('(el)=>getComputedStyle(el).color') == 'rgba(0, 0, 0, 0)'
            assert wa.locator('#mock-name').evaluate('(el)=>getComputedStyle(el,"::after").filter').startswith('blur(')
            assert wa.locator('#mock-name').evaluate("(el)=>el.style.getPropertyValue('--nb-mask-width') === '148px'")
            assert wa.locator('#mock-name').evaluate("(el)=>!!el.style.getPropertyValue('--nb-mask-surface')")
            assert wa.locator('._ak8q').evaluate("(el)=>el.style.getPropertyValue('--nb-mask-width') === '118px'")
            assert wa.locator('._ak8q').evaluate("(el)=>el.dataset.nbNameMask === 'true'")
            assert wa.locator('#name-suffix').evaluate("(el)=>getComputedStyle(el).opacity === '0'")
            assert wa.locator('#sidebar-time').evaluate("(el)=>el.dataset.nbSidebarTime === 'true'")
            assert wa.locator('#sidebar-time').evaluate("(el)=>getComputedStyle(el).filter.startsWith('blur(')")
            assert wa.locator('#participant-avatar').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            assert wa.locator('#header-avatar').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            assert wa.locator('#editor').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')

            wa.locator('[data-testid="conversation-info-header-button"]').hover(position={'x':5,'y':6})
            wa.wait_for_function("getComputedStyle(document.querySelector('#mock-name')).color !== 'rgba(0, 0, 0, 0)'")
            wa.mouse.move(800,500)
            wa.wait_for_function("getComputedStyle(document.querySelector('#mock-name')).color === 'rgba(0, 0, 0, 0)'")

            wa.locator('#avatar-overlay').hover()
            wa.wait_for_function("document.querySelector('#header-avatar-frame').dataset.nbAvatarHover === 'true'")
            wa.wait_for_function("getComputedStyle(document.querySelector('#header-avatar')).filter === 'none'")
            wa.mouse.move(800,500)
            wa.wait_for_function("getComputedStyle(document.querySelector('#header-avatar')).filter.startsWith('blur(')")

            wa.locator('._ak8q').hover()
            wa.wait_for_function("getComputedStyle(document.querySelector('#name-suffix')).opacity === '1'")
            wa.mouse.move(800,500)
            wa.wait_for_function("getComputedStyle(document.querySelector('#name-suffix')).opacity === '0'")

            wa.locator('#sidebar-time').hover()
            wa.wait_for_function("getComputedStyle(document.querySelector('#sidebar-time')).filter === 'none'")
            wa.mouse.move(800,500)
            wa.wait_for_function("getComputedStyle(document.querySelector('#sidebar-time')).filter.startsWith('blur(')")

            wa.locator('#participant-frame').hover()
            wa.wait_for_function("getComputedStyle(document.querySelector('#participant-avatar')).filter === 'none'")
            wa.mouse.move(800,500)
            wa.wait_for_function("getComputedStyle(document.querySelector('#participant-avatar')).filter.startsWith('blur(')")

            wa.locator('#message').hover()
            wa.wait_for_function("getComputedStyle(document.querySelector('#message')).filter === 'none'")
            wa.mouse.move(800,500)
            wa.wait_for_function("getComputedStyle(document.querySelector('#message')).filter.startsWith('blur(')")

            wa.locator('#editor').focus()
            assert wa.locator('#editor').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            wa.locator('#editor').hover()
            wa.wait_for_function("getComputedStyle(document.querySelector('#editor')).filter === 'none'")

            wa.evaluate("chrome.storage.local.set({neblinaSettings:{categories:{previews:false},blur:18}})")
            wa.wait_for_function("document.documentElement.dataset.nbPreviews === 'false'")
            assert wa.locator('#preview').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            assert wa.locator('#sidebar-time').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            wa.evaluate("chrome.storage.local.set({neblinaSettings:{blur:24}})")
            wa.wait_for_function("document.documentElement.style.getPropertyValue('--nb-blur') === '24px'")
            blur_amount = wa.locator('#header-avatar').evaluate(r"(el)=>parseFloat(getComputedStyle(el).filter.match(/blur\(([\d.]+)px\)/)[1])")
            wa.wait_for_function(r"parseFloat(getComputedStyle(document.querySelector('#header-avatar')).filter.match(/blur\(([\d.]+)px\)/)[1]) > 15")
            blur_amount = wa.locator('#header-avatar').evaluate(r"(el)=>parseFloat(getComputedStyle(el).filter.match(/blur\(([\d.]+)px\)/)[1])")
            assert blur_amount > 15, 'A intensidade máxima deve afetar as fotos de perfil' 
            assert wa.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--nb-blur').trim()") == '24px'
            wa.evaluate("chrome.storage.local.set({neblinaSettings:{hideTabTitle:true}})")
            wa.wait_for_function("document.title.includes('Neblina')")

            wa.evaluate('chrome.storage.local.set({neblinaSettings:{shield:true}})')
            wa.locator('#nb-privacy-shield').wait_for(state='visible')
            wa.locator('#nb-unlock').click()
            wa.locator('#nb-privacy-shield').wait_for(state='hidden')
            wa.evaluate('chrome.storage.local.set({neblinaSettings:{enabled:false}})')
            assert wa.locator('#media').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            assert 'Neblina' not in wa.title()
        finally:
            context.close(); browser.close()


def test_dynamic_group_avatar_and_popup():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1024,'height':900})
        try:
            wa = context.new_page()
            setup_wa(wa)
            wa.evaluate("""() => {
              const frame = document.createElement('div');
              frame.id = 'new-group-frame';
              frame.style.cssText = 'width:40px;height:40px;border-radius:50%;overflow:hidden';
              const img = document.createElement('img');
              img.id='new-group-img';
              img.width=40; img.height=40;
              img.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
              frame.append(img);
              document.querySelector('#main').append(frame);
            }""")
            wa.wait_for_function("document.querySelector('#new-group-frame')?.dataset.nbAvatarFrame === 'true'")
            assert wa.locator('#new-group-img').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')

            popup = context.new_page()
            popup.set_content((ROOT/'popup'/'index.html').read_text(encoding='utf-8'))
            popup.add_style_tag(path=str(ROOT/'popup'/'style.css'))
            popup.add_script_tag(content=MOCK_STORAGE)
            popup.add_script_tag(path=str(ROOT/'shared'/'config.js'))
            popup.add_script_tag(path=str(ROOT/'popup'/'popup.js'))
            popup.wait_for_function("document.querySelector('#status').textContent.includes('Ativa')")
            assert popup.locator('#hideTabTitle').is_checked() is False
            popup.locator('[data-category="composer"]').uncheck(force=True)
            assert popup.evaluate("chrome.storage.local.get('neblinaSettings',r=>window.__state=r.neblinaSettings);window.__state.categories.composer") is False
            popup.locator('#shield-action').click()
            assert popup.evaluate("chrome.storage.local.get('neblinaSettings',r=>window.__state=r.neblinaSettings);window.__state.shield") is True
        finally:
            context.close(); browser.close()


def test_header_name_hover_through_overlay():
    """Uma camada clicável por cima do título não deve bloquear sua revelação."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1024,'height':900})
        try:
            wa = context.new_page()
            setup_wa(wa)
            wa.evaluate("""() => {
              const header = document.querySelector('#main header');
              const name = document.querySelector('#mock-name');
              const h = header.getBoundingClientRect();
              const n = name.getBoundingClientRect();
              const overlay = document.createElement('div');
              overlay.id = 'name-pointer-overlay';
              header.style.position = 'relative';
              overlay.style.cssText = `position:absolute;z-index:99;pointer-events:auto;background:transparent;left:${n.left-h.left}px;top:${n.top-h.top}px;width:${n.width}px;height:${n.height}px`;
              header.append(overlay);
            }""")
            wa.locator('#name-pointer-overlay').hover()
            wa.wait_for_function("document.querySelector('#mock-name').dataset.nbNameHover === 'true'")
            wa.wait_for_function("getComputedStyle(document.querySelector('#mock-name')).color !== 'rgba(0, 0, 0, 0)'")
            wa.wait_for_function("getComputedStyle(document.querySelector('#mock-name'), '::after').opacity === '0'")
            wa.mouse.move(850, 550)
            wa.wait_for_function("!document.querySelector('#mock-name').hasAttribute('data-nb-name-hover')")
            wa.wait_for_function("getComputedStyle(document.querySelector('#mock-name')).color === 'rgba(0, 0, 0, 0)'")
            wa.evaluate("chrome.storage.local.set({neblinaSettings:{revealOnHover:false}})")
            wa.locator('#name-pointer-overlay').hover()
            assert wa.locator('#mock-name').evaluate("el=>!el.hasAttribute('data-nb-name-hover')")
            assert wa.locator('#mock-name').evaluate("el=>getComputedStyle(el).color") == 'rgba(0, 0, 0, 0)'
        finally:
            context.close(); browser.close()


def test_reply_preview_inserted_after_composer_load():
    """O trecho de resposta deve ficar protegido, sem borrar o X de cancelar."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        try:
            page = browser.new_page(viewport={'width':1024,'height':900})
            setup_wa(page)
            page.evaluate("""() => {
              const footer = document.querySelector('#main footer');
              const reply = document.createElement('div');
              reply.id = 'reply-card';
              reply.style.cssText='display:flex;align-items:center;gap:9px;width:325px;height:65px;background:#202526;padding:8px';
              reply.innerHTML = `<div id="reply-body" style="width:265px;height:42px;display:flex;flex-direction:column;gap:2px">
                <strong id="quoted-sender">Contato do grupo</strong><span id="quoted-text">Mensagem com conteúdo particular</span>
                </div><button id="cancel-reply" type="button" aria-label="Cancelar resposta">✕</button>`;
              footer.insertBefore(reply, footer.firstChild);
            }""")
            page.wait_for_function("document.querySelector('#reply-body')?.dataset.nbReplyPreview === 'true'")
            assert page.locator('#reply-body').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            assert page.locator('#cancel-reply').evaluate('(el)=>getComputedStyle(el).filter') == 'none'
            page.locator('#reply-body').hover()
            page.wait_for_function("getComputedStyle(document.querySelector('#reply-body')).filter === 'none'")
            page.mouse.move(800,520)
            page.wait_for_function("getComputedStyle(document.querySelector('#reply-body')).filter.startsWith('blur(')")
            # O pré-visualizador também é protegido quando apenas Mensagens está ativo.
            page.evaluate("chrome.storage.local.set({neblinaSettings:{categories:{composer:false,messages:true},revealOnHover:false}})")
            page.wait_for_function("document.documentElement.dataset.nbComposer === 'false'")
            assert page.locator('#reply-body').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            page.evaluate("chrome.storage.local.set({neblinaSettings:{categories:{composer:false,messages:false}}})")
            page.wait_for_function("document.documentElement.dataset.nbMessages === 'false'")
            page.wait_for_function("getComputedStyle(document.querySelector('#reply-body')).filter === 'none'")
        finally:
            browser.close()


def test_new_and_replaced_contact_photo_protected_before_dom_scan():
    """A foto de um contato novo não pode aparecer nítida nem por um frame."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        try:
            page = browser.new_page(viewport={'width':1024,'height':900})
            setup_wa(page)
            initial = page.evaluate("""() => {
              const row = document.createElement('div');
              row.id='incoming-contact'; row.setAttribute('role','gridcell');
              row.style.cssText='display:flex;gap:12px;align-items:center;margin-top:20px';
              row.innerHTML=`<div style="width:42px;height:42px;border-radius:50%;overflow:hidden">
                <img id="incoming-avatar" width="42" height="42" alt="Foto do contato">
                </div><span>Contato recente</span>`;
              document.querySelector('#pane-side').append(row);
              const img = row.querySelector('img');
              img.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
              return getComputedStyle(img).filter;
            }""")
            assert initial.startswith('blur('), 'A proteção CSS deve vir antes do scanDom'
            page.wait_for_function("document.querySelector('#incoming-avatar')?.dataset.nbAvatarImage === 'true'")
            assert page.locator('#incoming-avatar').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            # Simula foto carregada após uma nova mensagem, reutilizando o mesmo IMG.
            page.evaluate("""() => {
              document.querySelector('#incoming-avatar').src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect width="1" height="1" fill="blue"/%3E%3C/svg%3E';
            }""")
            assert page.locator('#incoming-avatar').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            page.locator('#incoming-avatar').hover()
            page.wait_for_function("getComputedStyle(document.querySelector('#incoming-avatar')).filter === 'none'")
            page.mouse.move(850,580)
            page.wait_for_function("getComputedStyle(document.querySelector('#incoming-avatar')).filter.startsWith('blur(')")
        finally:
            browser.close()


def test_sticker_emoji_hover_clears_media_and_bubble_filters():
    """Hover da figurinha revela a imagem e a bolha, mesmo sob overlay."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        try:
            page = browser.new_page(viewport={'width':1024,'height':900})
            setup_wa(page)
            page.evaluate("""() => {
              const message = document.querySelector('#message');
              const wrap = document.createElement('div');
              wrap.id = 'emoji-frame';
              wrap.setAttribute('data-testid', 'sticker');
              wrap.style.cssText = 'position:relative;width:64px;height:64px;';
              wrap.innerHTML = '<img id="emoji-image" width="64" height="64" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=">' +
                '<span id="emoji-overlay" style="position:absolute;inset:0;z-index:5;background:transparent"></span>';
              message.prepend(wrap);
            }""")
            assert page.locator('#message').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            assert page.locator('#emoji-image').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
            page.locator('#emoji-overlay').hover()
            page.wait_for_function("getComputedStyle(document.querySelector('#message')).filter === 'none'")
            page.wait_for_function("getComputedStyle(document.querySelector('#emoji-image')).filter === 'none'")
            page.wait_for_function("document.querySelector('#message').dataset.nbMessageHover === 'true'")
            page.mouse.move(850, 560)
            page.wait_for_function("getComputedStyle(document.querySelector('#message')).filter.startsWith('blur(')")
            page.wait_for_function("getComputedStyle(document.querySelector('#emoji-image')).filter.startsWith('blur(')")
            page.evaluate("chrome.storage.local.set({neblinaSettings:{revealOnHover:false}})")
            page.locator('#emoji-overlay').hover()
            assert page.locator('#emoji-image').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
        finally:
            browser.close()
