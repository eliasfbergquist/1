import os, time
from pathlib import Path
from playwright.sync_api import sync_playwright
out = Path(os.environ['TEMP']) / 'amanda-shots'; out.mkdir(exist_ok=True)
chrome = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
errs = []; ok = True
def check(name, cond, extra=''):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ') + name, extra)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=chrome, headless=True, args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
    page = b.new_page(viewport={'width': 1440, 'height': 900})
    page.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: errs.append('CONSOLE.' + m.type + ' ' + m.text) if m.type == 'error' else None)
    page.goto('http://localhost:8765/play3d.html', wait_until='load'); page.wait_for_timeout(1200)
    page.locator('#mGo').click(); page.wait_for_timeout(1500)
    page.evaluate("window.scrollTo(0, 260)"); page.wait_for_timeout(300)
    bx = page.locator('#stage').bounding_box(); page.mouse.move(bx['x'] + bx['width']/2, bx['y'] + bx['height']/2)
    page.keyboard.press('f'); page.wait_for_timeout(300)
    check('gun equipped with F', page.evaluate("__g3d.gun.on"))
    page.screenshot(path=str(out / 'gun_equipped.png'))
    # aim at Bodil
    page.evaluate("(()=>{const g=__g3d; const v=g.camera.position.clone(); g.getKid().getWorldPosition(v); v.y+=1.0; g.aimAt(v);})()")
    page.wait_for_timeout(200)
    page.evaluate("__g3d.setFiring(true)"); page.wait_for_timeout(250); page.evaluate("__g3d.setFiring(false)")
    page.wait_for_timeout(1400)
    check('shooting Bodil starts the fight', page.evaluate("__g3d.F.active && __g3d.G.fight"))
    st = page.evaluate("({n: __g3d.F.clones.length, wave: __g3d.F.wave})"); print(st)
    page.wait_for_timeout(2600)
    st = page.evaluate("({n: __g3d.F.clones.filter(c=>c.state!=='dead').length, wave: __g3d.F.wave})"); check('7 clones in wave 1', st['n'] == 7, st)
    page.screenshot(path=str(out / 'gun_swarm.png'))
    # prizes blocked during fight
    check('prize moves blocked in fight', page.evaluate("(()=>{const n=__g3d.G.line.length; __g3d.take(1); return __g3d.G.line.length===n;})()"))
    # auto-aim bot
    t0 = time.time(); shot = False; hp_min = 100
    while time.time() - t0 < 120:
        s = page.evaluate("""(()=>{const g=__g3d; if(!g.F.active) return {done:true, won:g.F.kills};
          const cp=g.camera.position; let best=null,bd=1e9;
          for(const c of g.F.clones){ if(c.state==='dead'||c.state==='spawn') continue; const d=Math.hypot(c.g.position.x-cp.x,c.g.position.z-cp.z); if(d<bd){bd=d;best=c;} }
          if(best){ const v=best.g.position.clone(); v.y=1.75*best.scale; g.aimAt(v); g.setFiring(true);} else g.setFiring(false);
          return {done:false, hp:g.F.hp, wave:g.F.wave, left:g.F.clones.filter(c=>c.state!=='dead').length, ammo:g.gun.ammo};})()""")
        if s['done']: break
        hp_min = min(hp_min, s['hp'])
        if not shot and s['wave'] == 2: page.screenshot(path=str(out / 'gun_wave2.png')); shot = True
        page.wait_for_timeout(120)
    page.evaluate("__g3d.setFiring(false)")
    fin = page.evaluate("({active:__g3d.F.active, kills:__g3d.F.kills, hp:__g3d.F.hp, wave:__g3d.F.wave})"); print('fight end', fin, 'min hp', hp_min)
    check('fight ended', not fin['active'])
    page.wait_for_timeout(2500)
    check('game resumes after fight', page.evaluate("!__g3d.G.fight"))
    page.screenshot(path=str(out / 'gun_after.png'))
    # holster and take normally
    page.keyboard.press('f'); page.wait_for_timeout(200)
    check('holstered', not page.evaluate("__g3d.gun.on"))
    page.wait_for_timeout(3000)
    print('turn', page.evaluate("__g3d.G.turn"), 'busy', page.evaluate("__g3d.G.busy"))
    print('errors:', errs); check('no console errors', not errs)
    print('ALL OK' if ok else 'SOME FAILED'); b.close()
