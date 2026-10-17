"""Usage: python tools/shot.py page.html [more.html ...] [--w 1440] [--h 900] [--full] [--wait 900]
Loads each page from the local server, reports console errors/overflow, saves screenshots."""
import sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
w, h, full, wait = 1440, 900, False, 900
pages = []
i = 0
while i < len(args):
    a = args[i]
    if a == '--w': w = int(args[i + 1]); i += 2
    elif a == '--h': h = int(args[i + 1]); i += 2
    elif a == '--wait': wait = int(args[i + 1]); i += 2
    elif a == '--full': full = True; i += 1
    else: pages.append(a); i += 1

out = Path(os.environ['TEMP']) / 'amanda-shots'
out.mkdir(exist_ok=True)
chrome = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=chrome, headless=True, args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
    for pg in pages:
        page = b.new_page(viewport={'width': w, 'height': h})
        errs = []
        page.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        page.on('console', lambda m: errs.append('CONSOLE.' + m.type + ' ' + m.text) if m.type in ('error',) else None)
        page.on('requestfailed', lambda r: errs.append('REQFAIL ' + r.url))
        page.goto('http://localhost:8765/' + pg, wait_until='load')
        page.wait_for_timeout(wait)
        # trigger reveals for full-page shots
        if full:
            page.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))")
            page.wait_for_timeout(900)
        ov = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        height = page.evaluate('document.documentElement.scrollHeight')
        name = pg.replace('.html', '') + (f'_{w}' if w != 1440 else '') + ('_full' if full else '') + '.png'
        page.screenshot(path=str(out / name), full_page=full)
        print(f'{pg}: overflowX={ov} height={height} errors={len([e for e in errs if "fonts.g" not in e])} -> {out / name}')
        for e in errs:
            if 'fonts.g' not in e: print('   ', e[:300])
        page.close()
    b.close()
