/* Reusable 2D game component. AM.mountGame(el, options) -> controller */
(function (AM) {
  const M = 6;
  const POLICIES = {
    perfect: { label: 'Perfect Bodil', pick: (r) => { const b = AM.bestTake(r); return b || AM.rand(1, Math.min(M, r)); } },
    random: { label: 'Random Bodil', pick: (r) => AM.rand(1, Math.min(M, r)) },
    greedy: { label: 'Greedy Bodil (always 6)', pick: (r) => Math.min(M, r) },
    cautious: { label: 'Cautious Bodil (always 1)', pick: () => 1 },
    hakon: { label: 'Håkon', pick: (r) => {
      if (r <= M && Math.random() < 0.55) return AM.rand(1, Math.max(1, r - 1)) || 1; // "doesn't see" the finishing take
      const roll = Math.random();
      if (roll < 0.5) return Math.min(3, r);
      if (roll < 0.8) return Math.min(6, r);
      return AM.rand(1, Math.min(M, r));
    } },
  };
  AM.POLICIES = POLICIES;

  AM.mountGame = function (root, opts) {
    const o = Object.assign({ n: AM.getN(10), mode: 'amanda', opp: 'perfect', starter: null, hint: true, compact: false, controls: true, speed: 750, autoloop: false,
      names: { amanda: 'Amanda', bodil: 'Bodil' }, say: null, onEnd: null, persistN: true, maxN: 60, stats: true }, opts || {});
    let S = null, timer = null, epoch = 0, snaps = [];
    const stats = (() => { try { return JSON.parse(localStorage.getItem('amanda.stats')) || { w: 0, l: 0, streak: 0, best: 0 }; } catch (e) { return { w: 0, l: 0, streak: 0, best: 0 }; } })();

    root.classList.add('game'); if (o.compact) root.classList.add('compact');
    root.innerHTML = `
      <div class="g-top">
        <div class="g-tray amanda" data-who="amanda"><div class="g-name"><span class="nm"></span><span class="g-role"></span></div><div class="g-items"></div><div class="g-count"></div></div>
        <div class="g-ring"><div class="rw"><svg viewBox="0 0 220 220"></svg><div class="mid"><b>0</b><span></span></div></div><small></small></div>
        <div class="g-tray bodil" data-who="bodil"><div class="g-name"><span class="nm"></span><span class="g-role"></span></div><div class="g-items"></div><div class="g-count"></div></div>
      </div>
      <div class="yard"><div class="yard-top"><span>Book at the front · takes come off the right</span><span class="gy-n"></span></div>
        <div class="scroller"><div class="line"></div></div>
        <div class="yard-foot"><button type="button" class="to-front">⟵ the book</button><span>groups of 7, counted from the book</span><button type="button" class="to-end">take here ⟶</button></div></div>
      <div><div class="g-voice" aria-live="polite"></div><div class="g-detail"></div><div class="g-pv"></div></div>
      <div class="g-warn" hidden></div>
      <div class="g-moves" ${o.showMoves === false ? 'hidden' : ''} role="group" aria-label="Take from the end">${[1, 2, 3, 4, 5, 6].map((k) => `<button class="mv" data-k="${k}" type="button"><span class="k">${k}</span><small></small></button>`).join('')}</div>
      ${o.controls ? `<div class="g-ctl">
        <div class="field"><label>Prizes</label><div class="row" style="gap:10px"><input type="number" class="in-n" min="1" max="${o.maxN}"><input type="range" class="rg-n" min="1" max="${o.maxN}"></div></div>
        <div class="field"><label>Who starts</label><div class="seg st-seg"><button data-v="amanda" type="button">Amanda</button><button data-v="bodil" type="button">Bodil</button></div></div>
        <div class="field"><label>Your seat</label><div class="seg md-seg"><button data-v="amanda" type="button">Amanda</button><button data-v="bodil" type="button">Bodil</button><button data-v="watch" type="button">Watch</button></div></div>
        ${o.opp !== 'hakon' ? `<div class="field"><label>Opponent</label><select class="op-sel">${['perfect', 'random', 'greedy', 'cautious'].map((k) => `<option value="${k}">${POLICIES[k].label}</option>`).join('')}</select></div>` : ''}
        <div class="row"><button class="btn sm primary b-play" type="button">▶ Play</button><button class="btn sm b-step" type="button">Step</button><button class="btn sm b-undo" type="button">↶ Undo</button><button class="btn sm b-restart" type="button">Restart</button></div>
        <label class="check"><input type="checkbox" class="ck-hint"> Show winning take</label>
        ${o.stats ? '<div class="g-stats chip gold"></div>' : ''}
      </div>` : ''}
      ${o.controls ? '<ol class="g-log" aria-label="Move log"></ol>' : ''}`;

    const $ = (s) => root.querySelector(s), $$ = (s) => Array.from(root.querySelectorAll(s));
    const lineEl = $('.line'), scrollerEl = $('.scroller'), voiceEl = $('.g-voice'), detailEl = $('.g-detail'), pvEl = $('.g-pv'), warnEl = $('.g-warn');

    function humanSeat() { return (o.mode === 'watch' || o.mode === 'both') ? null : o.mode; }
    function isHuman() { return !!S && S.phase === 'play' && (o.mode === 'both' || humanSeat() === S.turn); }
    function name(w) { return o.names[w]; }

    function fresh(n) {
      n = Math.max(1, Math.min(o.maxN, Math.round(+n) || 10));
      S = { n, line: Array.from({ length: n }, (_, i) => i + 1), piles: { amanda: [], bodil: [] }, turn: null, starter: null, phase: 'play', winner: null, log: [], deal: true, last: null };
      S.starter = o.starter || AM.optimalStarter(n);
      S.turn = S.starter; snaps = [];
    }
    function setStarter(w) { o.starter = w; }

    /* ---------- rendering ---------- */
    function tokHTML(pos, cls, idx) {
      const book = pos === 1;
      const c = ['tok', book ? 'book' : '', pos % 7 === 0 && !cls.includes('mini') ? 'mark' : '', cls].filter(Boolean).join(' ');
      const delay = S.deal && !cls.includes('mini') ? ` style="animation-delay:${Math.min(idx, 30) * 18}ms"` : '';
      return `<div class="${c}" data-pos="${pos}"${delay} title="${book ? 'Prize 1 — the book' : 'Prize ' + pos}"><span class="em">${book ? '📖' : AM.emojiFor(pos)}</span><span class="n">${book ? 'book' : pos}</span></div>`;
    }
    function renderLine() {
      const r = S.line.length;
      if (!r) { lineEl.innerHTML = '<div class="cleared">The line is clear.</div>'; return; }
      let html = '';
      for (let i = 0; i < r; i += 7) {
        const grp = S.line.slice(i, i + 7), last = i + 7 >= r;
        let cls = 'chunk', tag = '';
        if (last && grp.length === 7) { cls += ' trap'; tag = 'trap'; }
        else if (last) { cls += ' open'; tag = r <= M ? 'take all → book' : 'take ' + grp.length; }
        html += `<div class="${cls}">${tag ? `<span class="ct">${tag}</span>` : ''}${grp.map((p, j) => tokHTML(p, isHuman() ? 'click' : '', i + j)).join('')}</div>`;
      }
      lineEl.innerHTML = html;
      scrollerEl.scrollLeft = scrollerEl.scrollWidth;
      const toks = $$('.line .tok');
      toks.forEach((t, i) => { if (r - i > M) { t.classList.remove('click'); t.classList.add('deny'); } });
    }
    function renderTray(w) {
      const tray = $(`.g-tray.${w}`), pile = S.piles[w];
      const has = pile.includes(1);
      tray.querySelector('.nm').textContent = name(w);
      const hs = humanSeat();
      tray.querySelector('.g-role').textContent = hs === w ? 'you' : (hs ? (w === 'amanda' ? 'wants the book' : 'would like the book') : (w === 'amanda' ? 'wants the book' : ''));
      tray.classList.toggle('turn', S.phase === 'play' && S.turn === w);
      const items = tray.querySelector('.g-items');
      items.innerHTML = pile.length ? [...pile].sort((a, b) => (a === 1 ? -1 : b === 1 ? 1 : a - b)).map((p) => tokHTML(p, 'mini' + (p === 1 && S.winner ? ' won' : ''), 0)).join('') : '<span class="none">Nothing yet.</span>';
      tray.querySelector('.g-count').textContent = pile.length ? `${pile.length} prize${pile.length === 1 ? '' : 's'}${has ? ' · with the book' : ''}` : '';
    }
    function renderRing() {
      const r = S.line.length, act = r ? r % 7 : -1, cx = 110, cy = 110;
      const sec = (a0, a1, r0, r1) => { const p = (rad, a) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)], f = (v) => v.toFixed(1); const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0); return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)}Z`; };
      let svg = '';
      for (let i = 0; i < 7; i++) {
        const a0 = -Math.PI / 2 + i * 2 * Math.PI / 7 + .04, a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / 7 - .04;
        const fill = i === act ? (i === 0 ? '#38b6c4' : '#ee5a36') : (i === 0 ? '#14434b' : '#262d48');
        svg += `<path d="${sec(a0, a1, 66, 96)}" fill="${fill}"/>`;
        const am = (a0 + a1) / 2;
        svg += `<text x="${(cx + 106 * Math.cos(am)).toFixed(1)}" y="${(cy + 106 * Math.sin(am)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#b9b4c6" font-size="13">${i}</text>`;
      }
      $('.g-ring svg').innerHTML = svg;
      $('.g-ring .mid b').textContent = r ? r % 7 : '—';
      $('.g-ring .mid span').textContent = !r ? 'clear' : (r % 7 === 0 ? 'trap' : (r <= M ? 'take all' : 'take ' + r % 7));
      $('.g-ring small').textContent = r ? `${r} left · n mod 7` : 'nothing left';
    }
    function voice() {
      const last = S.last, hs = humanSeat();
      if (S.phase === 'over') {
        const w = S.winner;
        if (hs) return w === hs ? 'You got the book.' : `${name(w)} got the book.`;
        return `${name(w)} takes the book.`;
      }
      if (!last) {
        const s = S.n % 7, opt = AM.optimalStarter(S.n);
        if (S.starter !== opt) return 'This start gives the book away.';
        if (S.n <= M) return 'The whole line is within reach.';
        return s === 0 ? `${name('bodil')} moves first — into the trap.` : `${name('amanda')} opens with ${s}.`;
      }
      if (last.to % 7 === 0) return 'The trap is set.';
      return 'The trap is open.';
    }
    function detail() {
      const r = S.line.length;
      if (S.phase === 'over') {
        return S.winner === 'amanda' ? 'The multiples of 7 were all left for the other side, so the final take was hers.' : 'The residue was left open at some point, and the other side finished the group of seven.';
      }
      if (!S.last) {
        const s = S.n % 7, q = Math.floor(S.n / 7);
        if (S.starter !== AM.optimalStarter(S.n)) return s === 0 ? `${S.n} = 7 × ${q}. Moving first from a multiple of 7 means every take leaves a winning position for the other side.` : `${S.n} = 7 × ${q} + ${s}. Whoever moves can take ${s} and leave a trap. That move has been handed to ${name(AM.other(S.starter))}.`;
        if (S.n <= M) return `${S.n} ≤ 6, so the first player simply clears the line.`;
        return s === 0 ? `${S.n} = 7 × ${q}. ${name('bodil')} must break the multiple; whatever she takes (k), ${name('amanda')} answers 7 − k.` : `${S.n} = 7 × ${q} + ${s}. Take ${s} from the end, leaving ${S.n - s}. After that, answer k with 7 − k.`;
      }
      const l = S.last, who = name(l.who);
      if (l.to % 7 === 0) return `${who} took ${l.k}, leaving ${l.to} = 7 × ${l.to / 7}. The end of the line is now prize ${l.to}.`;
      return `${who} took ${l.k}, leaving ${l.to}. Residue ${l.to % 7}: the winning reply is to take ${l.to % 7}.`;
    }
    function renderMoves() {
      const r = S.line.length, win = AM.bestTake(r);
      $$('.mv').forEach((b) => {
        const k = +b.dataset.k, ill = k > r || S.phase !== 'play';
        b.classList.toggle('off', ill || !isHuman());
        b.classList.toggle('best', !ill && o.hint && win === k && (isHuman() || o.mode === 'watch'));
        const sm = b.querySelector('small');
        if (ill) sm.textContent = '—'; else if (r - k === 0) sm.textContent = 'the book'; else sm.textContent = `leave ${r - k}`;
      });
    }
    function renderLog() {
      const el = $('.g-log'); if (!el) return;
      el.innerHTML = S.log.map((l) => `<li class="${l.who === 'amanda' ? 'a' : 'b'}">${name(l.who)} −${l.k} <span class="mute">(${l.from}→${l.to})</span></li>`).join('');
    }
    function renderControls() {
      const c = $('.g-ctl'); if (!c) return;
      c.querySelector('.in-n').value = S.n; c.querySelector('.rg-n').value = S.n;
      const opt = AM.optimalStarter(S.n);
      c.querySelectorAll('.st-seg button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.starter); b.classList.toggle('best', b.dataset.v === opt); });
      c.querySelectorAll('.md-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === o.mode));
      const sel = c.querySelector('.op-sel'); if (sel) sel.value = o.opp;
      c.querySelector('.ck-hint').checked = o.hint;
      c.querySelector('.b-play').textContent = S.phase === 'over' ? '↻ Replay' : (timer ? '⏸ Pause' : '▶ Play');
      c.querySelector('.b-play').style.display = o.mode === 'watch' ? '' : 'none';
      c.querySelector('.b-step').style.display = o.mode === 'watch' ? '' : 'none';
      c.querySelector('.b-undo').style.display = o.mode === 'watch' ? 'none' : '';
      const st = c.querySelector('.g-stats'); if (st) st.textContent = `Your record: ${stats.w} won · ${stats.l} lost · streak ${stats.streak} (best ${stats.best})`;
    }
    function render() {
      $('.gy-n').textContent = `n = ${S.n}`;
      renderLine(); renderTray('amanda'); renderTray('bodil'); renderRing(); renderMoves(); renderLog(); renderControls();
      voiceEl.textContent = voice(); detailEl.textContent = detail();
      const wrong = S.starter !== AM.optimalStarter(S.n) && S.phase === 'play' && !S.last;
      warnEl.hidden = !wrong;
      if (wrong) warnEl.textContent = 'With this opener the other side can use the plan against you. Amanda should pick the starter marked ★.';
      S.deal = false;
    }

    /* ---------- moves ---------- */
    function flyTokens(count, who, fromEls) {
      const tray = $(`.g-tray.${who} .g-items`).getBoundingClientRect();
      fromEls.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const f = document.createElement('div'); f.className = 'fly';
        f.textContent = el.querySelector('.em').textContent;
        f.style.left = r.left + r.width / 2 - 13 + 'px'; f.style.top = r.top + r.height / 2 - 15 + 'px';
        document.body.appendChild(f);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          f.style.transitionDelay = i * 40 + 'ms';
          f.style.transform = `translate(${tray.left + 20 + i * 8 - r.left - r.width / 2}px, ${tray.top + 30 - r.top - r.height / 2}px) scale(.7) rotate(${(i % 2 ? 1 : -1) * 20}deg)`;
        }));
        setTimeout(() => f.remove(), 900 + i * 40);
      });
    }
    function apply(k, byHuman) {
      if (S.phase !== 'play') return;
      const r = S.line.length; k = Math.max(1, Math.min(k, r, M));
      if (byHuman) snaps.push(JSON.stringify({ S: { ...S, last: S.last }, }));
      const toks = $$('.line .tok'), fly = toks.slice(toks.length - k);
      flyTokens(k, S.turn, fly);
      const taken = S.line.splice(r - k, k);
      S.piles[S.turn].push(...taken);
      S.last = { who: S.turn, k, from: r, to: r - k };
      S.log.push(S.last);
      if (r - k === 0) {
        S.phase = 'over'; S.winner = S.turn; stopClock();
        finish();
      } else S.turn = AM.other(S.turn);
      render();
      if (S.phase === 'play' && S.last && S.turn !== humanSeat() && o.say && S.last.who === humanSeat()) sayFor(S.turn, 'afterHuman');
    }
    function finish() {
      const hs = humanSeat();
      if (hs && o.stats) {
        if (S.winner === hs) { stats.w++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); } else { stats.l++; stats.streak = 0; }
        try { localStorage.setItem('amanda.stats', JSON.stringify(stats)); } catch (e) {}
      }
      if (S.winner === 'amanda' && (hs === 'amanda' || !hs)) AM.confetti({ emoji: ['📖', '🐟'], count: 110 });
      if (o.say) sayFor(hs ? AM.other(hs) : S.winner, S.winner === hs ? 'iWon' : 'iLost', true); /* speaker = the computer seat; 'iWon' means the human won */
      if (o.onEnd) o.onEnd({ winner: S.winner, humanSeat: hs, n: S.n, humanWon: hs ? S.winner === hs : null });
      if (o.autoloop) setTimeout(() => { if (root.isConnected) { o.n = AM.rand(2, 34); restart(); startClock(); } }, 2800);
    }
    function sayFor(who, ev, final) {
      if (!o.say) return;
      const line = o.say(who, ev, S);
      if (!line) return;
      const tray = $(`.g-tray.${who}`); tray.querySelector('.g-say')?.remove();
      const b = document.createElement('div'); b.className = 'g-say'; b.textContent = line; tray.appendChild(b);
      setTimeout(() => b.remove(), final ? 9000 : 3600);
    }
    function cpuTake() {
      const r = S.line.length;
      if (S.turn === 'amanda') return AM.bestTake(r) || AM.rand(1, Math.min(M, r));
      return POLICIES[o.opp].pick(r);
    }
    function stopClock() { epoch++; if (timer) clearTimeout(timer); timer = null; }
    function startClock() {
      if (timer) clearTimeout(timer); timer = null;
      if (!S || S.phase !== 'play' || isHuman()) { render(); return; }
      if (o.mode === 'watch' && o.paused) return;
      const my = epoch;
      timer = setTimeout(() => {
        if (my !== epoch) return; timer = null;
        if (!S || S.phase !== 'play') return;
        if (o.say && S.turn !== 'amanda') sayFor(S.turn, 'move');
        apply(cpuTake(), false);
        startClock();
      }, o.speed);
    }
    function restart() {
      stopClock();
      fresh(o.n);
      if (o.persistN && o.controls) AM.setN(S.n);
      render();
      if (o.say && humanSeat() && S.turn !== humanSeat()) sayFor(S.turn, 'start');
      if (o.mode !== 'watch' || !o.paused) startClock();
    }

    /* ---------- interactions ---------- */
    $('.to-front').onclick = () => scrollerEl.scrollTo({ left: 0, behavior: 'smooth' });
    $('.to-end').onclick = () => scrollerEl.scrollTo({ left: scrollerEl.scrollWidth, behavior: 'smooth' });
    function preview(k) {
      const toks = $$('.line .tok');
      toks.forEach((t, i) => t.classList.toggle('pv', !!k && i >= toks.length - k));
      if (!k || S.phase !== 'play') { pvEl.textContent = ''; return; }
      const to = S.line.length - k;
      pvEl.textContent = to === 0 ? `${name(S.turn)} takes ${k} — and the book.` : `${name(S.turn)} takes ${k} and leaves ${to}${to % 7 === 0 ? ' (a multiple of 7)' : ` (residue ${to % 7})`}.`;
    }
    $('.g-moves').addEventListener('mouseover', (e) => { const b = e.target.closest('.mv'); if (b && isHuman() && !b.classList.contains('off')) preview(+b.dataset.k); });
    $('.g-moves').addEventListener('mouseout', () => preview(0));
    $('.g-moves').addEventListener('click', (e) => { const b = e.target.closest('.mv'); if (!b || !isHuman() || b.classList.contains('off')) return; preview(0); apply(+b.dataset.k, true); startClock(); });
    lineEl.addEventListener('mouseover', (e) => {
      const t = e.target.closest('.tok'); if (!t || !isHuman()) return;
      const k = S.line.length - S.line.indexOf(+t.dataset.pos); if (k <= M) preview(k);
    });
    lineEl.addEventListener('mouseout', () => preview(0));
    lineEl.addEventListener('click', (e) => {
      const t = e.target.closest('.tok'); if (!t || !isHuman()) return;
      const k = S.line.length - S.line.indexOf(+t.dataset.pos); if (k > M) { AM.toast('You can only take 1–6 from the end'); return; }
      preview(0); apply(k, true); startClock();
    });
    root.addEventListener('keydown', () => {});
    root._key = (e) => {
      if (!isHuman() || e.target.closest('input,select,textarea')) return;
      const k = +e.key; if (k >= 1 && k <= M && k <= S.line.length) { apply(k, true); startClock(); }
    };
    document.addEventListener('keydown', root._key);

    const c = $('.g-ctl');
    if (c) {
      const setN = (v) => { o.n = Math.max(1, Math.min(o.maxN, Math.round(+v) || 10)); o.starter = null; restart(); };
      c.querySelector('.in-n').onchange = (e) => setN(e.target.value);
      c.querySelector('.rg-n').oninput = (e) => { c.querySelector('.in-n').value = e.target.value; };
      c.querySelector('.rg-n').onchange = (e) => setN(e.target.value);
      c.querySelector('.st-seg').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; o.starter = b.dataset.v; restart(); };
      c.querySelector('.md-seg').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; o.mode = b.dataset.v; o.paused = o.mode === 'watch'; restart(); };
      const sel = c.querySelector('.op-sel'); if (sel) sel.onchange = (e) => { o.opp = e.target.value; restart(); };
      c.querySelector('.ck-hint').onchange = (e) => { o.hint = e.target.checked; renderMoves(); };
      c.querySelector('.b-play').onclick = () => {
        if (S.phase === 'over') { o.paused = false; restart(); return; }
        if (timer) { o.paused = true; stopClock(); } else { o.paused = false; startClock(); }
        renderControls();
      };
      c.querySelector('.b-step').onclick = () => { if (S.phase !== 'play' || isHuman()) return; o.paused = true; stopClock(); apply(cpuTake(), false); };
      c.querySelector('.b-restart').onclick = () => { o.starter = o.starter; restart(); };
      c.querySelector('.b-undo').onclick = () => {
        if (!snaps.length) return; stopClock();
        const prev = JSON.parse(snaps.pop()).S; S = Object.assign(S, prev); S.deal = false; render(); startClock();
      };
    }

    o.paused = o.mode === 'watch' && !o.autoloop;
    restart();
    return {
      get state() { return S; }, restart, apply: (k) => apply(k, true), setOpts: (x) => { Object.assign(o, x); restart(); },
      play: () => { o.paused = false; startClock(); }, opts: o, destroy: () => { stopClock(); document.removeEventListener('keydown', root._key); },
    };
  };
})(window.AM);
