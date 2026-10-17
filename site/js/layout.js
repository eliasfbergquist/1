/* Shared chrome: nav, footer, command palette, reveal, spotlight, confetti, toast */
(function (AM) {
  const PAGES = [
    { id: 'home', href: 'index.html', t: 'Home', g: '', ic: '🏠', d: 'The big picture and a live demo' },
    { id: 'problem', href: 'problem.html', t: 'The Problem', g: 'Solve', ic: '📜', d: 'The rules, retold step by step' },
    { id: 'play', href: 'play.html', t: 'Play the Game', g: 'Solve', ic: '🎮', d: 'Be Amanda or Bodil, with hints' },
    { id: 'play3d', href: 'play3d.html', t: 'Play in 3D', g: 'Solve', ic: '🕹️', d: 'First-person schoolyard, take the prizes yourself' },
    { id: 'strategy', href: 'strategy.html', t: 'The Strategy', g: 'Solve', ic: '🧭', d: 'Exactly what Amanda does' },
    { id: 'proof', href: 'proof.html', t: 'The Proof', g: 'Solve', ic: '🧮', d: 'Why it works, and a brute-force check' },
    { id: 'map', href: 'map.html', t: 'Position Map', g: 'Explore', ic: '🗺️', d: 'Every n at a glance, grids and spirals' },
    { id: 'tree', href: 'tree.html', t: 'Game Graph', g: 'Explore', ic: '🕸️', d: 'All moves as an arc diagram' },
    { id: 'generalize', href: 'generalize.html', t: 'Generalize', g: 'Explore', ic: '🔭', d: 'Any maximum take, not just 6' },
    { id: 'variants', href: 'variants.html', t: 'Variant Lab', g: 'Explore', ic: '🧪', d: 'Odd rules, moved book, misère' },
    { id: 'theory', href: 'theory.html', t: 'Theory & Glossary', g: 'Explore', ic: '📚', d: 'Backward induction, Grundy, terms' },
    { id: 'hakon', href: 'hakon.html', t: 'The Håkon Files', g: 'Håkon', ic: '🚨', d: 'Case file: the nemesis' },
    { id: 'hakon-charges', href: 'hakon-charges.html', t: 'Charges', g: 'Håkon', ic: '⚖️', d: 'An itemised list of offences' },
    { id: 'hakon-play', href: 'hakon-play.html', t: 'Beat Håkon', g: 'Håkon', ic: '🥊', d: 'He plays. He loses.' },
    { id: 'hakon-box', href: 'hakon-box.html', t: 'Boxing Ring', g: 'Håkon', ic: '🔔', d: 'Step into the ring and box Håkon' },
    { id: 'hakon-trial', href: 'hakon-trial.html', t: 'The Tribunal', g: 'Håkon', ic: '🔨', d: 'Spin the wheel of sentencing' },
    { id: 'hakon-theorem', href: 'hakon-theorem.html', t: 'Håkon Is a Trap', g: 'Håkon', ic: '🪤', d: 'A rigorous mock theorem' },
  ];
  AM.PAGES = PAGES;
  const page = document.body.dataset.page || 'home';
  const here = PAGES.findIndex((p) => p.id === page);
  const hakonSite = page.startsWith('hakon');
  if (hakonSite) document.body.dataset.theme = 'hakon';

  const groups = ['Solve', 'Explore', 'Håkon'];
  const menu = groups.map((g) => {
    const items = PAGES.filter((p) => p.g === g);
    const active = items.some((p) => p.id === page);
    return `<li class="menu-item"><button class="menu-btn ${active ? 'on' : ''}" aria-haspopup="true">${g === 'Håkon' ? '🚨 ' : ''}${g}<span class="car">▾</span></button>
      <div class="drop">${items.map((p) => `<a href="${p.href}" class="${p.id === page ? 'on' : ''}"><span class="ic">${p.ic}</span><div><b>${p.t}</b><span>${p.d}</span></div></a>`).join('')}</div></li>`;
  }).join('');

  if (!document.querySelector('link[rel=icon]')) {
    const ic = document.createElement('link'); ic.rel = 'icon';
    ic.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>" + (hakonSite ? '🚨' : '📖') + '</text></svg>';
    document.head.appendChild(ic);
  }
  const nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML = `<div class="nav-in">
    <a class="brand" href="index.html"><span class="brand-mark">${hakonSite ? '🚨' : '📖'}</span><span>Hjelp Amanda</span></a>
    <ul class="menu-list" id="menuList">${menu}</ul>
    <div class="nav-sp"></div>
    <button class="nav-btn" id="palBtn" aria-label="Search pages">🔎 <span class="lbl-t">Jump to…</span> <span class="kbd">Ctrl K</span></button>
    <button class="nav-btn burger" id="burger" aria-label="Menu">☰</button>
    <div class="progress" id="progress"></div></div>`;
  document.body.prepend(nav);
  AM.$('#burger').addEventListener('click', () => AM.$('#menuList').classList.toggle('open'));

  /* page nav (prev/next) */
  const pn = AM.$('#pagenav');
  if (pn && here >= 0) {
    const sameGroup = PAGES.filter((p) => (hakonSite ? p.id.startsWith('hakon') : !p.id.startsWith('hakon')));
    const i = sameGroup.findIndex((p) => p.id === page);
    const prev = sameGroup[i - 1], next = sameGroup[i + 1];
    pn.innerHTML = `<div class="pnav">${prev ? `<a href="${prev.href}"><small>← Previous</small><b>${prev.ic} ${prev.t}</b></a>` : '<span style="flex:1"></span>'}${next ? `<a class="next" href="${next.href}"><small>Next →</small><b>${next.t} ${next.ic}</b></a>` : `<a class="next" href="${hakonSite ? 'index.html' : 'hakon.html'}"><small>${hakonSite ? 'Back to safety' : 'Optional detour'}</small><b>${hakonSite ? 'Home 🏠' : 'The Håkon Files 🚨'}</b></a>`}</div>`;
  }

  /* footer */
  const foot = document.createElement('footer');
  foot.className = 'foot';
  foot.innerHTML = `<div class="container"><div class="foot-grid">
    <div><a class="brand" href="index.html" style="padding:0"><span class="brand-mark">📖</span><span>Hjelp Amanda</span></a>
    <p class="dim" style="margin-top:14px;max-width:34ch">An interactive companion to the MGMT4100 prize-line problem: take 1–6 from the end, and still walk away with the book.</p></div>
    ${groups.map((g) => `<div><h5>${g}</h5>${PAGES.filter((p) => p.g === g).map((p) => `<a href="${p.href}">${p.t}</a>`).join('')}</div>`).join('')}
    </div><small>The Håkon pages are fictional satire in good fun. Håkon here is a made-up nemesis; nothing on them is a claim about a real person. The maths pages are real and tested. Source problem: Arbeidskrav MGMT4100 Høst 2026.</small></div>`;
  document.body.appendChild(foot);

  /* scroll progress + reveal */
  const prog = AM.$('#progress');
  const onScroll = () => {
    const h = document.documentElement;
    prog.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
  AM.reveal = (root = document) => AM.$$('.reveal:not(.in)', root).forEach((el) => io.observe(el));
  AM.reveal();

  /* spotlight cards */
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.card');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  });

  /* TOC highlight */
  const toc = AM.$('.toc');
  if (toc) {
    const links = AM.$$('a', toc);
    const secs = links.map((a) => AM.$(a.getAttribute('href'))).filter(Boolean);
    const spy = () => {
      let cur = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
      links.forEach((a, i) => a.classList.toggle('on', i === cur));
    };
    addEventListener('scroll', spy, { passive: true }); spy();
  }

  /* command palette */
  const pal = document.createElement('div');
  pal.className = 'pal';
  pal.innerHTML = `<div class="pal-box"><input type="text" id="palIn" placeholder="Jump to a page…" autocomplete="off"><div class="pal-list" id="palList"></div><div class="pal-foot"><span>↑↓ navigate</span><span>Enter open</span><span>Esc close</span></div></div>`;
  document.body.appendChild(pal);
  let sel = 0, shown = PAGES;
  const palIn = AM.$('#palIn'), palList = AM.$('#palList');
  const draw = () => {
    palList.innerHTML = shown.map((p, i) => `<a href="${p.href}" class="${i === sel ? 'sel' : ''}"><span>${p.ic}</span><span>${p.t}</span><small>${p.g || 'Home'}</small></a>`).join('') || '<p class="mute" style="padding:14px">Nothing found.</p>';
  };
  const openPal = () => { pal.classList.add('open'); palIn.value = ''; shown = PAGES; sel = 0; draw(); setTimeout(() => palIn.focus(), 10); };
  const closePal = () => pal.classList.remove('open');
  AM.$('#palBtn').addEventListener('click', openPal);
  pal.addEventListener('mousedown', (e) => { if (e.target === pal) closePal(); });
  palIn.addEventListener('input', () => {
    const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = fold(palIn.value).trim();
    shown = PAGES.filter((p) => fold(p.t + ' ' + p.d + ' ' + p.g).includes(q)); sel = 0; draw();
  });
  palIn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    if (e.key === 'Enter' && shown[sel]) location.href = shown[sel].href;
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('open') ? closePal() : openPal(); }
    if (e.key === 'Escape') closePal();
  });

  /* toast */
  const toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast);
  let tt;
  AM.toast = (msg) => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2200); };

  /* tooltip */
  const tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip);
  AM.tip = (html, x, y) => {
    if (html == null) { tip.classList.remove('on'); return; }
    tip.innerHTML = html; tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, x + 14)) + 'px';
    tip.style.top = Math.min(innerHeight - h - 8, Math.max(8, y + 14)) + 'px';
  };

  /* confetti */
  AM.confetti = function (opts = {}) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cv = AM.$('#confetti');
    if (!cv) { cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv); }
    cv.width = innerWidth; cv.height = innerHeight;
    const ctx = cv.getContext('2d');
    const cols = opts.colors || ['#f2b84b', '#ee5a36', '#38b6c4', '#f4efe4', '#8a7bff'];
    const bits = Array.from({ length: opts.count || 150 }, () => ({
      x: innerWidth * (opts.x ?? 0.5), y: innerHeight * (opts.y ?? 0.35),
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 3, g: 0.34 + Math.random() * 0.2,
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: AM.pick(cols), e: opts.emoji && Math.random() < 0.35 ? AM.pick(opts.emoji) : null,
    }));
    let f = 0;
    (function step() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      bits.forEach((b) => {
        b.x += b.vx; b.y += b.vy; b.vy += b.g; b.vx *= 0.992; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        if (b.e) { ctx.font = '22px serif'; ctx.fillText(b.e, -11, 8); } else { ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); }
        ctx.restore();
      });
      if (++f < 200) requestAnimationFrame(step); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  };

  /* animated number counters */
  AM.count = function (el, to, ms = 1200, fmt = (v) => Math.round(v).toLocaleString()) {
    const t0 = performance.now();
    (function s(t) { const p = Math.min(1, (t - t0) / ms); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(s); })(t0);
  };
  /* auto counters: <b data-count="123"> */
  const cio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { AM.count(e.target, +e.target.dataset.count, 1300, (v) => Math.round(v).toLocaleString() + (e.target.dataset.suffix || '')); cio.unobserve(e.target); } }));
  AM.$$('[data-count]').forEach((el) => cio.observe(el));

  /* copy-on-click for [data-copy] */
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) { navigator.clipboard && navigator.clipboard.writeText(c.dataset.copy); AM.toast('Copied'); }
  });
})(window.AM);
