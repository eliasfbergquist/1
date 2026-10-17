import os, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
out = Path(os.environ['TEMP']) / 'amanda-shots'; out.mkdir(exist_ok=True)
chrome = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=chrome, headless=True, args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
    page = b.new_page(viewport={'width': 1440, 'height': 900})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://localhost:8765/play3d.html', wait_until='load')
    page.wait_for_timeout(1200)
    page.evaluate(f"() => {{ document.getElementById('mNn').value={n}; document.getElementById('mNn').dispatchEvent(new Event('change')); }}")
    page.locator('#mGo').click()
    page.wait_for_timeout(1500)
    info = page.evaluate("""() => { const g = window.__g3d; const out = {cam: g.camera.position.toArray(), prizes: []};
      g.G.prizes.forEach((v, k) => out.prizes.push([k, +v.getWorldPosition(new g.camera.position.constructor()).z.toFixed(2)]));
      return out; }""")
    print(json.dumps(info))
    page.evaluate("window.scrollTo(0, 260)")
    page.wait_for_timeout(400)
    page.screenshot(path=str(out / f'3d_dbg_{n}.png'))
    print('errors', errs)
    b.close()
