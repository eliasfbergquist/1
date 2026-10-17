import os
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(os.environ['TEMP']) / 'amanda-shots'; out.mkdir(exist_ok=True)
chrome = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
errs = []
ok = True
def check(name, cond, extra=''):
    global ok
    ok &= bool(cond)
    print(('PASS ' if cond else 'FAIL ') + name, extra)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=chrome, headless=True, args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
    page = b.new_page(viewport={'width': 1440, 'height': 900})
    page.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: errs.append('CONSOLE.' + m.type + ' ' + m.text) if m.type == 'error' else None)
    page.goto('http://localhost:8765/play3d.html', wait_until='load')
    page.wait_for_timeout(1200)
    page.locator('#mGo').click()
    page.wait_for_timeout(1500)
    page.evaluate("window.scrollTo(0, 260)")
    page.wait_for_timeout(300)

    # --- real mouse hover/click on prize 10 (last prize) -> take 1? we need take 3 first. Hover prize 8 -> k=3
    box = page.locator('#stage').bounding_box()
    def screen_of(pos):
        return page.evaluate("""(pos) => { const g = window.__g3d; const v = g.camera.position.clone();
          g.G.prizes.get(pos).getWorldPosition(v); v.y += 0.35; v.project(g.camera); return [v.x, v.y]; }""", pos)
    nx, ny = screen_of(8)
    px = box['x'] + (nx + 1) / 2 * box['width']; py = box['y'] + (1 - ny) / 2 * box['height']
    page.mouse.move(px, py); page.wait_for_timeout(500)
    hv = page.evaluate("() => window.__g3d.G.hover")
    check('hover prize 8 -> take 3', hv and hv['pos'] == 8 and hv['k'] == 3, hv)
    page.screenshot(path=str(out / '3d_hover.png'))
    # hover prize 3 (k>6)
    nx, ny = screen_of(3)
    px2 = box['x'] + (nx + 1) / 2 * box['width']; py2 = box['y'] + (1 - ny) / 2 * box['height']
    page.mouse.move(px2, py2); page.wait_for_timeout(400)
    hv2 = page.evaluate("() => window.__g3d.G.hover")
    check('hover prize 3 -> k=8 (too many)', hv2 and hv2['k'] > 6, hv2)
    # click prize 8 for real
    page.mouse.move(px, py); page.wait_for_timeout(300)
    page.mouse.click(px, py)
    page.wait_for_timeout(300)
    st = page.evaluate("() => ({line: window.__g3d.G.line.length, you: window.__g3d.G.piles.you.length, turn: window.__g3d.G.turn})")
    check('click took 3 (10 -> 7)', st['line'] == 7 and st['you'] == 3, st)
    page.wait_for_timeout(1000)
    page.screenshot(path=str(out / '3d_mid.png'))

    # keyboard 1-6 and API: finish with optimal play
    steps = 0
    while steps < 20:
        phase = page.evaluate("() => window.__g3d.G.phase")
        if phase == 'over': break
        mine = page.evaluate("() => window.__g3d.G.phase==='play' && window.__g3d.G.turn===window.__g3d.G.humanSeat && !window.__g3d.G.busy")
        if mine:
            r = page.evaluate("() => window.__g3d.G.line.length")
            k = r if r <= 6 else (r % 7 or 1)
            page.keyboard.press(str(k)); steps += 1
        page.wait_for_timeout(300)
    page.wait_for_timeout(2600)
    fin = page.evaluate("() => ({phase: window.__g3d.G.phase, winner: window.__g3d.G.winner})")
    check('Amanda wins with optimal play', fin['winner'] == 'amanda', fin)
    page.screenshot(path=str(out / '3d_end.png'))

    # replay as Bodil vs sloppy: n=15, human Bodil
    page.locator('#eMenu').click(); page.wait_for_timeout(300)
    page.locator('#mSeat button[data-v=bodil]').click()
    page.evaluate("() => { const s=document.getElementById('mOpp'); s.value='random'; s.dispatchEvent(new Event('change')); }")
    page.locator('#mGo').click(); page.wait_for_timeout(2500)
    st = page.evaluate("() => ({seat: window.__g3d.G.humanSeat, starter: window.__g3d.G.starter, turn: window.__g3d.G.turn, line: window.__g3d.G.line.length})")
    check('as Bodil: game running', st['seat'] == 'bodil', st)
    page.screenshot(path=str(out / '3d_bodil.png'))
    # a trapped Bodil at n=10: Amanda started and took 3 -> 7 left (if she plays perfectly, random policy may err)
    print('errors:', [e for e in errs if 'fonts.g' not in e])
    check('no console errors', not [e for e in errs if 'fonts.g' not in e])
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
