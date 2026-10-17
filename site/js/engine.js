/* Math engine: the prize-line game is a "subtraction game".
   A position is r = number of prizes still in the line. A move removes k from the end, k in S.
   Normal play: whoever removes the last prize (which includes the book) wins the book. */
window.AM = window.AM || {};
(function (AM) {
  AM.M = 6;                                  // max take in the assignment
  AM.isTrap = (r, m = AM.M) => r % (m + 1) === 0;
  AM.bestTake = (r, m = AM.M) => (r <= 0 || r % (m + 1) === 0) ? null : r % (m + 1);
  AM.optimalStarter = (n, m = AM.M) => (n % (m + 1) === 0 ? 'bodil' : 'amanda');
  AM.other = (w) => (w === 'amanda' ? 'bodil' : 'amanda');
  AM.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* Solve a subtraction game by backward induction.
     S: allowed takes (array of ints, sorted), N: largest position, misere: last mover loses.
     win[r]  = true if the player to move from r can force a win
     good[r] = list of winning takes from r
     grundy[r] = Sprague-Grundy value (normal play only) */
  AM.solve = function (S, N, misere = false) {
    const win = new Array(N + 1), good = new Array(N + 1), grundy = new Array(N + 1);
    win[0] = misere; good[0] = []; grundy[0] = 0;
    for (let r = 1; r <= N; r++) {
      const g = [], seen = new Set();
      for (const k of S) {
        if (k > r) break;
        if (!win[r - k]) g.push(k);
        seen.add(grundy[r - k]);
      }
      good[r] = g; win[r] = g.length > 0;
      let x = 0; while (seen.has(x)) x++;
      grundy[r] = x;
    }
    return { win, good, grundy };
  };
  AM.range = (m) => Array.from({ length: m }, (_, i) => i + 1);

  /* Find eventual period of a boolean sequence. Returns {pre, period} */
  AM.period = function (seq) {
    const N = seq.length;
    for (let p = 1; p <= Math.floor(N / 3); p++) {
      let ok = true;
      for (let i = Math.floor(N / 3); i + p < N; i++) if (seq[i] !== seq[i + p]) { ok = false; break; }
      if (!ok) continue;
      let pre = Math.floor(N / 3);
      while (pre > 0 && seq[pre - 1] === seq[pre - 1 + p]) pre--;
      return { pre, period: p };
    }
    return null;
  };

  /* Play out a "perfect" game: both sides use the mod rule; trapped player takes `trapTake` */
  AM.playout = function (n, starter, m = AM.M, trapTake = 1) {
    const steps = []; let r = n, turn = starter;
    while (r > 0) {
      let k = AM.bestTake(r, m); if (k == null) k = Math.min(trapTake, r);
      steps.push({ who: turn, k, from: r, to: r - k });
      r -= k; turn = AM.other(turn);
    }
    return steps;
  };

  /* Brute-force minimax WITHOUT using the mod formula (for the proof page) */
  AM.bruteWin = function (N, m = AM.M) {
    const win = new Uint8Array(N + 1);
    for (let r = 1; r <= N; r++) {
      let w = 0;
      for (let k = 1; k <= m && k <= r; k++) if (!win[r - k]) { w = 1; break; }
      win[r] = w;
    }
    return win;
  };

  /* persistent n shared across pages */
  AM.getN = (d = 10) => { const v = parseInt(localStorage.getItem('amanda.n'), 10); return Number.isFinite(v) && v >= 1 ? v : d; };
  AM.setN = (n) => { try { localStorage.setItem('amanda.n', String(n)); } catch (e) {} };

  AM.EMOJI = ['🍬', '🧸', '🎈', '🍪', '🪁', '🧁', '🎨', '🧩', '🍭', '🪀', '🎀', '🧶', '🍫', '🎲', '🪅', '🧿'];
  AM.emojiFor = (pos) => AM.EMOJI[(pos * 7 + 3) % AM.EMOJI.length];

  AM.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  AM.pick = (a) => a[Math.floor(Math.random() * a.length)];
  AM.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  AM.$ = (s, r = document) => r.querySelector(s);
  AM.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
})(window.AM);
