"""Usage: python tools/el.py page.html "#selector" [--w 1440] [--wait 1200] [--js "code to run first"]"""
import sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright
a = sys.argv[1:]; page_name, sel = a[0], a[1]
w, wait, js = 1440, 1200, None
i = 2
while i < len(a):
    if a[i] == '--w': w = int(a[i + 1]); i += 2
    elif a[i] == '--wait': wait = int(a[i + 1]); i += 2
    elif a[i] == '--js': js = a[i + 1]; i += 2
    else: i += 1
out = Path(os.environ['TEMP']) / 'amanda-shots'; out.mkdir(exist_ok=True)
chrome = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=chrome, headless=True, args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': w, 'height': 900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/' + page_name, wait_until='load'); pg.wait_for_timeout(wait)
    pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))"); pg.wait_for_timeout(900)
    if js: pg.evaluate(js); pg.wait_for_timeout(700)
    name = page_name.replace('.html', '') + '_' + sel.strip('#.').replace(' ', '_').replace('>', '') + (f'_{w}' if w != 1440 else '') + '.png'
    pg.locator(sel).first.screenshot(path=str(out / name))
    print(out / name, 'errors:', errs)
    b.close()
