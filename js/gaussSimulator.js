/*!
 * gaussSimulator.js  v1.0.0
 * Extension for mathEngine.js (v1.1.0 or newer).
 *
 * Part 1: Module 6 (Non Routine Logic). Topic ids:
 *   m6t0 Pigeonhole principle
 *   m6t1 Cryptarithms (alphametics)
 *   m6t2 Grid logic, elimination tables and knights and knaves
 *   m6t3 Parity and even odd constraints
 * Part 2: the Gauss Contest Simulator (global GaussSimulator).
 *   25 questions, 60 minutes: Part A 10 x 5 points, Part B 10 x 6 points, Part C 5 x 8 points (150 total).
 *
 * Load order in index.html:
 *   <script src="mathEngine.js"></script>
 *   <script src="modules2and3.js"></script>
 *   <script src="modules4and5.js"></script>
 *   <script src="gaussSimulator.js"></script>
 * Then, when the student opens the Gauss tab:
 *   GaussSimulator.mount(document.getElementById('app-content'), { appState: window.AppState });
 *
 * Every generator uses only the seeded generator r that the engine passes in, so a question can be
 * rebuilt exactly from its seed. That is how an unfinished contest survives a page refresh.
 */
(function (root) {
  'use strict';
  var E = root.MathEngine;
  if (!E || !E.registerModule || !E.moduleOfTopic) {
    throw new Error('gaussSimulator.js: load mathEngine.js (v1.1.0 or newer) before this file.');
  }
  var fmt = E.format.fmt, V = E.visuals, MINUS = '−';

  /* ------------------------------------------------------------------
     Helpers (same spec shape as the engine and the other extensions)
  ------------------------------------------------------------------ */
  function tidy(s) { return String(s).replace(/-/g, MINUS).replace(/\+ −(?=\d)/g, '− ').replace(/− −(?=\d)/g, '+ ').replace(/(^|[^\d\w.])1(?=[a-z](?![a-z])|\()/g, '$1'); }
  function tidyAll(a) { return a.map(tidy); }
  function I(q, steps, value, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: fmt(value), kind: 'int', value: value }, extra || {}); }
  function TX(q, steps, ans, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: ans, kind: 'text' }, extra || {}); }
  function ord(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function cdiv(a, b) { return Math.ceil(a / b); }

  /* ------------------------------------------------------------------
     Visuals: pigeonholes and logicGrid.  Lessons can use them with lines like
       :::visual pigeonholes 7 3
       :::visual logicGrid Ann,Ben,Cy Cat,Dog,Fish 0.1=✓;0.0=✗
  ------------------------------------------------------------------ */
  (function () {
    function svg(w, h, label, inner) { return '<svg class="me-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>'; }
    function fig(inner, cap) { return '<figure class="me-fig">' + inner + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>'; }
    function tx(x, y, t, c, a) { return '<text class="' + (c || 'me-tx') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (a || 'middle') + '">' + t + '</text>'; }

    // p pigeons spread as evenly as possible over h holes.
    V.pigeonholes = function (p, h) {
      p = Math.max(1, Math.min(60, Math.round(p))); h = Math.max(1, Math.min(12, Math.round(h)));
      var cnt = [], i, j, w = 58, g = '', maxc = Math.ceil(p / h);
      for (i = 0; i < h; i++) cnt.push(Math.floor(p / h) + (i < p % h ? 1 : 0));
      var H = 36 + Math.min(maxc, 6) * 14 + 30;
      for (i = 0; i < h; i++) {
        var x = 12 + i * w, top = 28;
        g += '<rect class="me-fa" x="' + x + '" y="' + top + '" width="' + (w - 10) + '" height="' + (H - top - 24) + '" rx="6"/>';
        for (j = 0; j < Math.min(cnt[i], 6); j++) g += '<circle class="me-fb" cx="' + (x + (w - 10) / 2) + '" cy="' + (H - 36 - j * 14) + '" r="5.5"/>';
        if (cnt[i] > 6) g += tx(x + (w - 10) / 2, top + 14, '+' + (cnt[i] - 6), 'me-tx me-sm');
        g += tx(x + (w - 10) / 2, H - 6, String(cnt[i]), 'me-tx me-bold');
      }
      g += tx(12, 16, p + ' pigeons, ' + h + ' holes', 'me-tx me-sm', 'start');
      return fig(svg(24 + h * w, H, p + ' pigeons in ' + h + ' holes', g), 'The fullest hole has ' + maxc + ' pigeon' + (maxc > 1 ? 's' : '') + '.');
    };

    // Elimination table. names: rows. cats: columns groups, each a list of labels. marks "r.c=✓;r.c=✗".
    V.logicGrid = function (names, cats, marks) {
      names = Array.isArray(names) ? names : String(names).split(',');
      var groups = (Array.isArray(cats) && Array.isArray(cats[0])) ? cats : String(cats || '').split('|').map(function (s) { return s.split(','); });
      var mk = {}; if (marks) String(marks).split(';').forEach(function (t) { var m = /^(\d+)\.(\d+)=(.+)$/.exec(t); if (m) mk[m[1] + '.' + m[2]] = m[3]; });
      var cell = 42, x0 = 70, y0 = 46, cols = [], g = '', i, j, c = 0;
      groups.forEach(function (gr) { gr.forEach(function (lab) { cols.push(lab); }); });
      var W = x0 + cols.length * cell + groups.length * 8 + 10, H = y0 + names.length * cell + 10, xs = [], xx = x0;
      groups.forEach(function (gr, gi) { gr.forEach(function () { xs.push(xx); xx += cell; }); xx += 8; });
      names.forEach(function (n, r) { g += tx(x0 - 8, y0 + r * cell + cell / 2 + 5, n, 'me-tx', 'end'); });
      cols.forEach(function (lab, ci) { g += '<text class="me-tx me-sm" transform="translate(' + (xs[ci] + cell / 2 + 4) + ',' + (y0 - 6) + ') rotate(-40)" text-anchor="start">' + lab + '</text>'; });
      for (i = 0; i < names.length; i++) for (j = 0; j < cols.length; j++) {
        g += '<rect class="me-fa" x="' + xs[j] + '" y="' + (y0 + i * cell) + '" width="' + cell + '" height="' + cell + '"/>';
        var v = mk[i + '.' + j]; if (v) g += tx(xs[j] + cell / 2, y0 + i * cell + cell / 2 + 7, v, 'me-tx me-bold');
      }
      return fig(svg(W, H, 'Logic elimination grid', g), 'Mark a cross for every impossible pair and a tick for every certain pair.');
    };
  })();

  /* ==================================================================
     MODULE 6 GENERATORS
  ================================================================== */
  var M6 = [0, 1, 2, 3].map(function () { return { 1: [], 2: [], 3: [] }; });

  // Smallest n such that every way of drawing n items from colour counts cnt has some colour with at least k items.
  function guaranteeK(cnt, k) {
    var total = sum(cnt);
    for (var n = 1; n <= total; n++) {
      var ok = true;
      (function go(i, left, mx) { if (!ok) return; if (i === cnt.length) { if (left === 0 && mx < k) ok = false; return; } for (var x = 0; x <= Math.min(cnt[i], left); x++) go(i + 1, left - x, Math.max(mx, x)); })(0, n, 0);
      if (ok) return n;
    }
    return total + 1;
  }
  // Smallest n such that every draw of n items contains at least one of every colour.
  function guaranteeAll(cnt) {
    var total = sum(cnt);
    for (var n = cnt.length; n <= total; n++) {
      var ok = true;
      (function go(i, left, mn) { if (!ok) return; if (i === cnt.length) { if (left === 0 && mn < 1) ok = false; return; } for (var x = 0; x <= Math.min(cnt[i], left); x++) go(i + 1, left - x, Math.min(mn, x)); })(0, n, 99);
      if (ok) return n;
    }
    return total;
  }
  // Largest subset of 1..N with no bad pair (bad(a, b) true), by backtracking.
  function maxGoodSubset(N, bad) {
    var best = 0, chosen = [];
    (function go(x) { if (chosen.length + (N - x + 1) <= best) return; if (x > N) { best = Math.max(best, chosen.length); return; }
      var ok = true; for (var i = 0; i < chosen.length; i++) if (bad(chosen[i], x)) { ok = false; break; }
      if (ok) { chosen.push(x); go(x + 1); chosen.pop(); }
      go(x + 1); })(1);
    return best;
  }
  function digitSum(n) { var s = 0; while (n) { s += n % 10; n = Math.floor(n / 10); } return s; }

  // ---------- m6t0: Pigeonhole principle ----------
  M6[0][1].push(function (r) { // socks: pair or k of a colour
    var c = r.int(2, 6), k = r.pick([2, 2, 3]), ans = c * (k - 1) + 1, col = ['red', 'blue', 'green', 'black', 'white', 'grey'].slice(0, c);
    return I('A drawer holds plenty of socks in ' + c + ' colours (' + col.join(', ') + '). You pick socks in the dark. What is the smallest number you must take to be sure of having ' + (k === 2 ? 'a matching pair' : k + ' socks of the same colour') + '?', [
      'Think of the colours as ' + c + ' boxes. The pigeonhole principle says: to force ' + k + ' items into one box you must beat the worst case.',
      'Worst case: you take ' + (k - 1) + ' sock' + (k > 2 ? 's' : '') + ' of every colour and still have no ' + (k === 2 ? 'pair' : k + ' of a kind') + '. That is ' + c + ' × ' + (k - 1) + ' = ' + c * (k - 1) + ' socks.',
      'The very next sock must complete a set. Answer = ' + c * (k - 1) + ' + 1 = ' + ans + '.'], ans, { check: guaranteeK(col.map(function () { return 12; }), k), visual: V.pigeonholes(ans, c) });
  });
  M6[0][1].push(function (r) { // birthdays and months
    var N = r.int(20, 80), ans = cdiv(N, 12), what = r.pick(['month', 'day of the week']), h = what === 'month' ? 12 : 7, a2 = cdiv(N, h);
    return I('In a group of ' + N + ' people, what is the largest number that you can be certain share the same ' + what + ' of birth? (Give the number that is guaranteed, at least this many.)', [
      'The ' + h + ' ' + (what === 'month' ? 'months' : 'days') + ' are the holes and the ' + N + ' people are the pigeons.',
      'Share the people out as evenly as possible: ' + N + ' ÷ ' + h + ' = ' + nfl(N / h) + '. Some hole must hold at least the rounded up value.',
      'Round up: at least ' + a2 + ' people share a ' + what + '. (With ' + (a2 - 1) * h + ' people you could avoid ' + a2 + ' in one hole, so this is the best guarantee.)'], a2, { check: (function () { var best = Math.ceil(N / h); return best; })(), visual: V.pigeonholes(Math.min(N, 40), h) });
  });
  function nfl(x) { return String(Math.round(x * 100) / 100); }
  M6[0][1].push(function (r) { // cards
    var q = r.pick([['cards must you take from a standard 52 card deck to be sure that at least 2 are of the same suit', 5], ['cards must you take from a standard 52 card deck to be sure that at least 3 are of the same suit', 9], ['cards must you take from a standard 52 card deck to be sure that at least 4 are of the same suit', 13], ['cards must you take from a standard 52 card deck to be sure that at least 2 have the same rank (A, 2 to 10, J, Q, K)', 14], ['cards must you take from a standard 52 card deck to be sure that at least 3 have the same rank (A, 2 to 10, J, Q, K)', 27]]);
    var hol = q[1] === 14 || q[1] === 27 ? 13 : 4, k = q[1] === 5 ? 2 : q[1] === 9 ? 3 : q[1] === 13 ? 4 : q[1] === 14 ? 2 : 3;
    return I('How many ' + q[0] + '?', ['There are ' + hol + ' ' + (hol === 4 ? 'suits' : 'ranks') + ' (the holes). We want ' + k + ' cards in one hole.', 'Worst case: ' + (k - 1) + ' card' + (k > 2 ? 's' : '') + ' from each of the ' + hol + ' holes, which is ' + hol + ' × ' + (k - 1) + ' = ' + hol * (k - 1) + ' cards, and still no hole has ' + k + '.', 'The next card must give ' + k + ' in one hole: ' + hol * (k - 1) + ' + 1 = ' + q[1] + '.'], q[1], { check: hol === 4 ? guaranteeK([13, 13, 13, 13], k) : 13 * (k - 1) + 1 });
  });

  M6[0][2].push(function (r) { // limited stock worst case
    var c = 3, cnt = [r.int(2, 7), r.int(2, 7), r.int(2, 7)], k = r.pick([2, 3, 3]), nm = ['red', 'blue', 'green'], caps = cnt.map(function (x) { return Math.min(x, k - 1); }), ans = sum(caps) + 1;
    if (ans > sum(cnt)) return M6[0][2][0](r);
    return I('A bag holds ' + cnt[0] + ' red, ' + cnt[1] + ' blue and ' + cnt[2] + ' green balls. Without looking, you take balls out one at a time. What is the smallest number you must take to be certain of having ' + k + ' balls of the same colour?', [
      'Build the worst case. From each colour you can take at most ' + (k - 1) + ' without reaching ' + k + ', but you cannot take more balls than the bag holds of that colour.',
      'Red: min(' + cnt[0] + ', ' + (k - 1) + ') = ' + caps[0] + '. Blue: min(' + cnt[1] + ', ' + (k - 1) + ') = ' + caps[1] + '. Green: min(' + cnt[2] + ', ' + (k - 1) + ') = ' + caps[2] + '.',
      'Worst case total = ' + caps.join(' + ') + ' = ' + sum(caps) + ' balls with no colour reaching ' + k + '.', 'One more ball settles it: ' + sum(caps) + ' + 1 = ' + ans + '.'], ans, { check: guaranteeK(cnt, k) });
  });
  M6[0][2].push(function (r) { // one of every colour
    var cnt = [r.int(2, 8), r.int(2, 8), r.int(2, 8)], mn = Math.min.apply(null, cnt), ans = sum(cnt) - mn + 1, cols = ['red', 'white', 'yellow'];
    return I('A jar contains ' + cnt[0] + ' red, ' + cnt[1] + ' white and ' + cnt[2] + ' yellow jellybeans. What is the smallest number you must take without looking to be certain of getting at least one of every colour?', [
      'Worst case for "one of every colour": you take every bean of two colours before you ever see the third.',
      'The unluckiest choice is to empty the two biggest groups first and leave the smallest colour (' + mn + ' beans) for last.', 'That takes ' + cnt.join(' + ') + ' ' + MINUS + ' ' + mn + ' = ' + (sum(cnt) - mn) + ' beans and you still lack a colour.',
      'The next bean must be the missing colour: ' + (sum(cnt) - mn) + ' + 1 = ' + ans + '.'], ans, { check: guaranteeAll(cnt) });
  });
  M6[0][2].push(function (r) { // unit squares
    var a = r.int(2, 6), b = r.int(2, 6), ans = a * b + 1;
    return I('A rectangle measures ' + a + ' cm by ' + b + ' cm and is divided into ' + a * b + ' unit squares. How many points must be placed inside it to be certain that two points lie in the same unit square (or on its boundary)?', ['The ' + a * b + ' unit squares are the holes.', 'With ' + a * b + ' points you could put exactly one in each square.', 'Point number ' + ans + ' must land in a square that already has a point: ' + a * b + ' + 1 = ' + ans + '.'], ans, { check: a * b + 1 });
  });
  M6[0][2].push(function (r) { // pairs summing to N+1
    var N = r.pick([8, 10, 12, 14, 16]), ans = N / 2 + 1;
    return I('How many numbers must be chosen from 1, 2, 3, ..., ' + N + ' to be certain that two of them add up to ' + (N + 1) + '?', ['Pair up the numbers so each pair adds to ' + (N + 1) + ': ' + (function () { var p = []; for (var i = 1; i <= N / 2; i++) p.push('(' + i + ', ' + (N + 1 - i) + ')'); return p.join(' '); })() + '.', 'There are ' + N / 2 + ' pairs (the holes). You can pick one number from each pair and never get a sum of ' + (N + 1) + '.', 'The next pick must be the partner of a number already chosen: ' + N / 2 + ' + 1 = ' + ans + '.'], ans, { check: maxGoodSubset(N, function (a, b) { return a + b === N + 1; }) + 1 });
  });

  M6[0][3].push(function (r) { // digit sums
    var d = r.pick([2, 3]), ans = d === 2 ? 19 : 28, lo = d === 2 ? 10 : 100, hi = d === 2 ? 99 : 999;
    var classes = new Set(); for (var x = lo; x <= hi; x++) classes.add(digitSum(x));
    return I('How many ' + d + ' digit numbers must be chosen to be certain that two of them have the same digit sum?', ['The digit sum of a ' + d + ' digit number ranges from 1 (for ' + (d === 2 ? '10' : '100') + ') up to ' + 9 * d + ' (for ' + (d === 2 ? '99' : '999') + '). Every whole value in between happens.', 'That gives ' + 9 * d + ' different digit sums, which are the holes.', 'Choose ' + 9 * d + ' numbers with all different sums and you have no match. One more forces a match: ' + 9 * d + ' + 1 = ' + ans + '.'], ans, { check: classes.size + 1 });
  });
  M6[0][3].push(function (r) { // divisibility
    var n = r.int(3, 8), ans = n + 1;
    return I('How many numbers must be chosen from 1, 2, 3, ..., ' + 2 * n + ' to be certain that one of the chosen numbers is a multiple of another chosen number?', ['Write every number as (odd number) × (power of 2). The odd part is the pigeonhole. From 1 to ' + 2 * n + ' the odd parts can only be ' + (function () { var o = []; for (var i = 1; i < 2 * n; i += 2) o.push(i); return o.join(', '); })() + ', which is ' + n + ' holes.', 'Choose ' + (n + 1) + ' numbers and two share the same odd part. Then one is the other multiplied by a power of 2, so the smaller divides the larger.', 'Can ' + n + ' numbers avoid this? Yes: take ' + (function () { var o = []; for (var i = n + 1; i <= 2 * n; i++) o.push(i); return o.join(', '); })() + '. None divides another (they are less than double each other).', 'So the answer is ' + n + ' + 1 = ' + ans + '.'], ans, { check: maxGoodSubset(2 * n, function (a, b) { return b % a === 0; }) + 1 });
  });
  M6[0][3].push(function (r) { // difference multiple of m
    var m = r.int(5, 12), ans = m + 1;
    return I('What is the least number of whole numbers you must choose to be certain that two of them have a difference that is a multiple of ' + m + '?', ['Sort the numbers by their remainder when divided by ' + m + '. There are ' + m + ' possible remainders (0 to ' + (m - 1) + '), the holes.', 'Two numbers with the same remainder have a difference that is a multiple of ' + m + '.', 'With ' + m + ' numbers you can have all different remainders. So you need ' + m + ' + 1 = ' + ans + ' numbers.'], ans, { check: m + 1 });
  });
  M6[0][3].push(function (r) { // consecutive numbers
    var N = r.pick([8, 10, 12, 14, 16]), ans = N / 2 + 1;
    return I('How many numbers must be chosen from 1, 2, ..., ' + N + ' to be certain that two of them are consecutive (they differ by exactly 1)?', ['Make ' + N / 2 + ' holes by pairing neighbours: ' + (function () { var p = []; for (var i = 1; i <= N; i += 2) p.push('(' + i + ',' + (i + 1) + ')'); return p.join(' '); })() + '.', 'Choosing one number from each pair gives ' + N / 2 + ' numbers, and it is possible that none of them are consecutive (for example all the odd numbers).', 'One more number lands in a pair that already has one chosen: ' + N / 2 + ' + 1 = ' + ans + '.'], ans, { check: maxGoodSubset(N, function (a, b) { return b - a === 1; }) + 1 });
  });

  // ---------- m6t1: cryptarithms (alphametics) ----------
  /* Column solver for additions such as SEND + MORE = MONEY. Returns up to `limit` solutions as {letter: digit}. */
  function solveAdd(words, result, limit) {
    limit = limit || 2;
    var cols = result.length, letters = [], order = [], lead = {}, colEnd = [], c, i;
    function colLetters(c) { var out = []; words.forEach(function (w) { if (c < w.length) out.push(w[w.length - 1 - c]); }); out.push(result[result.length - 1 - c]); return out; }
    for (c = 0; c < cols; c++) { colLetters(c).forEach(function (l) { if (order.indexOf(l) < 0) order.push(l); }); colEnd.push(order.length); }
    words.concat([result]).forEach(function (w) { lead[w[0]] = true; });
    var sols = [], digit = {}, used = [];
    function dfs(idx, v, carry) {
      if (sols.length >= limit) return;
      if (idx === order.length) { if (carry === 0) sols.push(Object.assign({}, digit)); return; }
      var L = order[idx];
      for (var d = 0; d <= 9; d++) {
        if (used[d] || (d === 0 && lead[L])) continue;
        used[d] = true; digit[L] = d;
        var vv = v, cr = carry, ok = true;
        while (vv < cols && colEnd[vv] <= idx + 1) {
          var s = cr; words.forEach(function (w) { if (vv < w.length) s += digit[w[w.length - 1 - vv]]; });
          if (s % 10 !== digit[result[result.length - 1 - vv]]) { ok = false; break; }
          cr = Math.floor(s / 10); vv++;
        }
        if (ok) dfs(idx + 1, vv, cr);
        used[d] = false; delete digit[L];
        if (sols.length >= limit) return;
      }
    }
    dfs(0, 0, 0);
    return sols;
  }
  /* Brute force solver for a product A x B = C, given as strings. */
  function solveMul(a, b, c, limit) {
    limit = limit || 2;
    var order = [], lead = {}; [a, b, c].forEach(function (w) { w.split('').forEach(function (l) { if (order.indexOf(l) < 0) order.push(l); }); lead[w[0]] = true; });
    var sols = [], digit = {}, used = [];
    function val(w) { var v = 0; for (var i = 0; i < w.length; i++) v = v * 10 + digit[w[i]]; return v; }
    function dfs(idx) {
      if (sols.length >= limit) return;
      if (idx === order.length) { if (val(a) * val(b) === val(c)) sols.push(Object.assign({}, digit)); return; }
      for (var d = 0; d <= 9; d++) { if (used[d] || (d === 0 && lead[order[idx]])) continue; used[d] = true; digit[order[idx]] = d; dfs(idx + 1); used[d] = false; delete digit[order[idx]]; if (sols.length >= limit) return; }
    }
    dfs(0); return sols;
  }
  var LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'.split('');
  function num(s, map) { var v = 0; for (var i = 0; i < s.length; i++) v = v * 10 + map[s[i]]; return v; }

  /* Puzzle banks. Each entry was generated offline and checked to have exactly one solution. Letters are
     relabelled at random for every question, and the solver below recomputes the digits. */
  var BANK = {"E":["AB+CC=ADA","AB+AC=BBD","AA+BA=BCD","AB+BB=ACD","AB+BB=BCD","AA+BA=ACD","AB+BC=ADD","AB+CB=ADC","AB+CC=CDA","AA+BC=BDD","AB+CB=CDA","AB+CB=BDC","AB+BC=BDA","AB+AC=CCD","AB+CB=ADD","AA+BC=BDB","AB+CA=CDC","AB+CB=CDD","AB+CC=CDD","AB+CA=ADC","AB+CA=CDD","AB+BC=ADA","AB+CA=ADD","AB+CC=ADD","AA+BC=ADD","AB+CB=BDA","AA+BC=ADB","AB+BC=BDD"],"M":["ABB+BC=DEDD","ABC+AB=DEDA","AAB+CC=BDBE","ABB+BA=CDEE","ABB+AC=CDEA","ABC+CD=DEDA","AAB+AB=BCDE","ABA+CB=DEEC","ABC+DC=BEEE","ABA+CD=BEEB","ABC+CA=BDDE","AAB+CB=BDEE","ABC+DB=CEEA","ABC+CD=BEEE","ABC+CD=DEDB","ABA+CC=DEEB","ABB+AC=DEDA","ABC+CC=DEEE","ABC+BD=DEEB","ABA+CC=DEED","ABB+CD=DEDC","ABA+CB=DEDD","ABC+BD=CEEB","ABC+BA=DEDB","ABA+BA=CDEB","AAB+CC=DEBA","ABC+BC=CDEE","ABC+DB=DEEE","ABC+AC=CDEE","ABC+AD=DEDA","ABC+CC=BDDE","ABB+CD=CEEE","ABB+BC=CDEA","ABC+DC=DEEE","ABC+DD=CECA","ABC+CA=DEDD","ABC+DB=CECA","ABC+AD=CECA","ABA+BB=CDCE","ABC+BC=CDDE","AAB+CD=DEDA","ABC+BC=DECE","ABC+AB=DECA","AAB+AC=CDEE","ABB+CD=DEDA","ABC+CA=DEED","ABB+CB=DEEE","ABB+CD=DEEA","AAB+CC=BDEA","ABB+CB=CDDE"],"H":["ABC+DBE=AFCF","ABC+DEE=AFCD","AAA+AAB=CDEF","ABC+DBE=FEED","ABC+DEB=AFCD","ABA+ACD=EFEC","ABA+ACD=BEFE","ABC+DBE=AFEF","AAB+CDB=CEEF","AAB+CDE=EBEF","ABC+ABD=EDDF","ABB+AAC=DEEF","ABC+DBE=DFEF","ABC+ADA=EFEB","AAA+BBC=DEFB","ABC+DAB=DEFA","ABC+DBB=DEAF","ABC+DBD=EBFB","ABB+CDB=CEFA","ABB+CBD=CEFF","ABC+AAB=DEEF","ABC+DCE=AFED","ABC+DDB=AEFD","ABC+DEB=DFCA","ABC+ADA=DEFE","AAB+CCA=DEFC","ABC+DBB=AEDF","ABC+ADA=BEFE","AAB+CDD=CEFA","ABC+BDE=ECEF","ABB+CDE=CFEA","ABB+CDB=AEFC","ABB+CBD=AECF","ABC+BAA=DEFB","ABC+DCC=DEFA","ABB+BAC=DEFA","ABC+DBC=DEFF","ABC+ADA=EFED","ABC+DBB=DEFF","ABC+BDD=AEFB","ABC+BAB=DEFA","ABC+DCE=DFEA","ABC+DBE=BEAF","ABA+CBD=EBFB","ABC+DBE=DFCF","ABC+BDE=CECF","ABB+ACD=EFAA","ABA+BAC=DEFB","ABC+DBE=FCCA","AAB+CCC=DEFA","AAB+CBD=CEFA","ABC+DBE=AFCD","ABC+DDE=ECEF","ABC+DAC=DEEF","ABC+DDC=AEEF","ABC+DAE=CECF","AAB+ACC=DEEF","ABB+CCD=AEFC","AAB+CDE=BEBF","ABC+DBE=DFEA","ABB+CBD=CEAF","ABC+DEE=DFCA","ABA+ACD=CEFE","ABC+ADC=EBFB"],"X":["AABC+BDE=FGCED","ABBC+BDB=DEFCG","ABCC+DEC=EFGDG","AABC+DBD=EFCGA","ABCD+DCD=EFGBG","ABCC+BCD=EFGEE","ABBC+ADD=EFGCG","ABCC+DEF=FGEFB","ABCD+CCD=EFGBB","ABCB+BDD=EFDGG","ABCD+EBF=CGDEA","ABCB+BDE=EFDGG","ABCC+DCE=EFGFD","ABCD+BDB=EFCGE","ABCB+DCE=FGCFC","ABCB+BCD=EFFBG","ABAB+CDE=FGGCC","ABCC+DCC=EFFDG","ABCD+DBB=EFCFG","ABCD+ADE=FGDEF","ABAC+CDE=FGEFA","ABCB+BCA=DEEFG","ABCB+DCE=FGEGC","ABCD+EEB=CFDFG","ABCD+CDE=FGDFF"],"MUL":["ABxC=DDA","ABxC=BAD","ABxC=BDA","ABxA=CAD","ABxB=CDC","ABxB=CCD"]};
  function fromBank(r, key) {
    var e = r.pick(BANK[key]), op = key === 'MUL' ? 'x' : '+', parts = e.split(/[x+=]/), used = [];
    parts.forEach(function (w) { w.split('').forEach(function (l) { if (used.indexOf(l) < 0) used.push(l); }); });
    var L = r.shuffle(LETTERS).slice(0, used.length), map = {}; used.forEach(function (l, i) { map[l] = L[i]; });
    var rn = function (w) { return w.split('').map(function (l) { return map[l]; }).join(''); };
    var words = [rn(parts[0]), rn(parts[1])], res = rn(parts[2]), sol = key === 'MUL' ? solveMul(words[0], words[1], res, 2) : solveAdd(words, res, 2);
    return { words: words, result: res, map: sol[0], op: key === 'MUL' ? '×' : '+', unique: sol.length === 1 };
  }
  function pz(p) { return p.words.join(' ' + p.op + ' ') + ' = ' + p.result; }
  function pzNum(p) { return p.words.map(function (x) { return num(x, p.map); }).join(' ' + p.op + ' ') + ' = ' + num(p.result, p.map); }
  function distinctLetters(p) { var s = []; p.words.concat([p.result]).forEach(function (w) { w.split('').forEach(function (l) { if (s.indexOf(l) < 0) s.push(l); }); }); return s.sort(); }

  // Narrated explanation for an addition puzzle. Uses the real solution to state each column.
  function addSteps(p, ask) {
    var st = [], ws = p.words, res = p.result, m = p.map, maxLen = Math.max.apply(null, ws.map(function (w) { return w.length; })), c, carry = 0;
    st.push('Set it out in columns: ' + ws.join(' + ') + ' = ' + res + '. Each letter is a different digit and no number starts with 0.');
    if (res.length > maxLen) st.push('Size check: two numbers with at most ' + maxLen + ' digits add to less than 2 × 10^{' + maxLen + '}, so the extra leading digit of the answer can only be 1. So ' + res[0] + ' = 1.');
    else st.push('The answer has the same number of digits as the longest addend, so no carry leaves the leading column.');
    var u = ws.map(function (w) { return w[w.length - 1]; });
    if (u[0] === u[1]) st.push('Units column: ' + u[0] + ' + ' + u[0] + ' is even, so the units digit of the answer, ' + res[res.length - 1] + ', is an even digit.');
    else st.push('Units column: ' + u.join(' + ') + ' gives ' + res[res.length - 1] + ', possibly with a carry. Start with letters that appear in more than one place and test the few digits left.');
    var lines = [];
    for (c = 0; c < res.length; c++) {
      var digs = [], labs = [], s = carry;
      ws.forEach(function (w) { if (c < w.length) { labs.push(w[w.length - 1 - c]); digs.push(m[w[w.length - 1 - c]]); s += m[w[w.length - 1 - c]]; } });
      var rl = res[res.length - 1 - c];
      lines.push((c === 0 ? 'Units' : ord(c + 1) + ' column') + ': ' + (digs.length ? digs.join(' + ') : '0') + (carry ? ' + carry ' + carry : '') + ' = ' + s + ', so ' + rl + ' = ' + (s % 10) + (s >= 10 ? ' and carry 1' : ' and no carry') + '.');
      carry = Math.floor(s / 10);
    }
    st.push('Working right to left with the digits that fit: ' + lines.join(' '));
    st.push('The only assignment that makes every column work is ' + distinctLetters(p).map(function (l) { return l + ' = ' + m[l]; }).join(', ') + '.');
    st.push('Check: ' + pzNum(p) + '.');
    return st;
  }
  function mulSteps(p) {
    var m = p.map, a = p.words[0], b = p.words[1], res = p.result;
    return ['Read it as a multiplication: ' + a + ' × ' + b + ' = ' + res + '. Each letter is a different digit and no number starts with 0.',
      'Size check: ' + b + ' is a single digit and ' + res + ' has 3 digits, so the two digit number times the single digit must reach 100 or more but stay under 1000.',
      'Use the units digit: the units digit of ' + a[1] + ' × ' + b + ' must equal ' + res[2] + '. That cuts the possibilities sharply.',
      'The only assignment that works for every digit is ' + distinctLetters(p).map(function (l) { return l + ' = ' + m[l]; }).join(', ') + '.', 'Check: ' + pzNum(p) + '.'];
  }

  function askAdd(r, p, tier) {
    var letters = distinctLetters(p), kind = r.pick(['letter', 'letter', 'value']), st = addSteps(p, kind);
    var lead = p.result[0], target = r.pick(letters.filter(function (l) { return l !== lead || tier === 1; }));
    if (kind === 'letter') return I('In the addition ' + pz(p) + ', each letter stands for a different digit and no number starts with 0. What digit does ' + target + ' stand for?', st.concat(['So ' + target + ' = ' + p.map[target] + '.']), p.map[target], { check: (num(p.words[0], p.map) + num(p.words[1], p.map) === num(p.result, p.map)) ? p.map[target] : -1 });
    var val = num(p.result, p.map);
    return I('In the addition ' + pz(p) + ', each letter stands for a different digit and no number starts with 0. What is the value of the number ' + p.result + '?', st.concat(['The answer ' + p.result + ' = ' + val + '.']), val, { check: num(p.words[0], p.map) + num(p.words[1], p.map) });
  }

  M6[1][1].push(function (r) { // missing digit in a sum
    var A = r.int(1, 8), t = r.int(1, 8), u = r.int(0, 9), N = (10 * t + A) + (10 * A + u);
    return I('The digit A makes this true: ' + t + 'A + A' + u + ' = ' + N + '. What is A?', ['Write each number with place values: ' + t + 'A = ' + 10 * t + ' + A and A' + u + ' = 10 × A + ' + u + '.', 'Add: ' + 10 * t + ' + A + 10A + ' + u + ' = ' + (10 * t + u) + ' + 11A = ' + N + '.', '11A = ' + N + ' ' + MINUS + ' ' + (10 * t + u) + ' = ' + 11 * A + ', so A = ' + A + '.', 'Check: ' + (10 * t + A) + ' + ' + (10 * A + u) + ' = ' + N + '.'], A, { check: (function () { for (var d = 0; d <= 9; d++) if ((10 * t + d) + (10 * d + u) === N) return d; return -1; })() });
  });
  M6[1][1].push(function (r) { // AB + BA
    var S = r.int(3, 17), N = 11 * S, ok = false, A, B;
    for (A = 1; A <= 9; A++) for (B = 1; B <= 9; B++) if (A !== B && A + B === S) ok = true;
    if (!ok) return M6[1][1][1](r);
    return I('A and B are different nonzero digits. The two digit numbers AB and BA add up to ' + N + '. What is A + B?', ['Write the numbers with place values: AB = 10A + B and BA = 10B + A.', 'Add: (10A + B) + (10B + A) = 11A + 11B = 11(A + B).', 'So 11(A + B) = ' + N + ', which means A + B = ' + N + ' ÷ 11 = ' + S + '.', 'The sum AB + BA is always a multiple of 11 and it tells you A + B directly. You do not need to find A and B separately.'], S, { check: (function () { for (var a = 1; a <= 9; a++) for (var b = 1; b <= 9; b++) if (a !== b && (10 * a + b) + (10 * b + a) === N) return a + b; return -1; })() });
  });
  M6[1][1].push(function (r) { // box makes multiple of 9
    var a, c, sols;
    do { a = r.int(1, 9); c = r.int(0, 9); sols = []; for (var d = 0; d <= 9; d++) if ((a + d + c) % 9 === 0) sols.push(d); } while (sols.length !== 1);
    var x = sols[0];
    return I('What digit must replace the box so that the three digit number ' + a + '□' + c + ' is a multiple of 9?', ['A number is a multiple of 9 exactly when its digit sum is a multiple of 9.', 'Known digits: ' + a + ' + ' + c + ' = ' + (a + c) + '. We need ' + (a + c) + ' + □ to be 0, 9, 18 or another multiple of 9.', 'The nearest multiple of 9 at or above ' + (a + c) + ' is ' + Math.ceil((a + c) / 9) * 9 + ', so □ = ' + Math.ceil((a + c) / 9) * 9 + ' ' + MINUS + ' ' + (a + c) + ' = ' + x + '.', 'Check: ' + a + x + c + ' ÷ 9 = ' + (+('' + a + x + c)) / 9 + '.'], x, { check: sols[0] });
  });

  M6[1][2].push(function (r) { return askAdd(r, fromBank(r, 'E'), 2); });
  M6[1][2].push(function (r) { return askAdd(r, fromBank(r, 'M'), 2); });
  M6[1][2].push(function (r) { // multiplication
    var p = fromBank(r, 'MUL');
    var letters = distinctLetters(p), kind = r.pick(['letter', 'value']), st = mulSteps(p);
    if (kind === 'letter') { var t = r.pick(letters); return I('In the multiplication ' + pz(p) + ', each letter stands for a different digit and no number starts with 0. What digit does ' + t + ' stand for?', st.concat(['So ' + t + ' = ' + p.map[t] + '.']), p.map[t], { check: p.map[t] }); }
    var v = num(p.result, p.map);
    return I('In the multiplication ' + pz(p) + ', each letter stands for a different digit and no number starts with 0. What is the value of the number ' + p.result + '?', st.concat(['The product ' + p.result + ' = ' + v + '.']), v, { check: num(p.result, p.map) });
  });
  M6[1][2].push(function (r) { // difference puzzle
    var A = r.int(2, 9), B = r.int(0, A - 1), D = (10 * A + B) - (10 * B + A);
    return I('A and B are digits with A greater than B. The number AB minus the number BA equals ' + D + '. What is A ' + MINUS + ' B?', ['AB = 10A + B and BA = 10B + A.', 'AB ' + MINUS + ' BA = (10A + B) ' + MINUS + ' (10B + A) = 9A ' + MINUS + ' 9B = 9(A ' + MINUS + ' B).', 'So 9(A ' + MINUS + ' B) = ' + D + ' and A ' + MINUS + ' B = ' + D + ' ÷ 9 = ' + (A - B) + '.'], A - B, { check: (function () { for (var a = 1; a <= 9; a++) for (var b = 0; b < a; b++) if ((10 * a + b) - (10 * b + a) === D) return a - b; return -1; })() });
  });

  M6[1][3].push(function (r) { return askAdd(r, fromBank(r, 'H'), 3); });
  M6[1][3].push(function (r) { return askAdd(r, fromBank(r, 'X'), 3); });
  var CLASSICS = [['SEND', 'MORE', 'MONEY'], ['CROSS', 'ROADS', 'DANGER'], ['EAT', 'THAT', 'APPLE'], ['BASE', 'BALL', 'GAMES'], ['SATURN', 'URANUS', 'PLANETS'], ['DONALD', 'GERALD', 'ROBERT']], goodClassics = null;
  M6[1][3].push(function (r) { // classic puzzles, verified unique at first use
    if (!goodClassics) { goodClassics = []; CLASSICS.forEach(function (c) { var s = solveAdd([c[0], c[1]], c[2], 2); if (s.length === 1) goodClassics.push({ words: [c[0], c[1]], result: c[2], map: s[0], op: '+' }); }); }
    if (!goodClassics.length) return M6[1][3][0](r);
    var p = r.pick(goodClassics), letters = distinctLetters(p), t = r.pick(letters);
    return I('This famous puzzle is ' + pz(p) + ', where each letter stands for a different digit and no number starts with 0. What digit does ' + t + ' stand for?', addSteps(p, 'letter').concat(['So ' + t + ' = ' + p.map[t] + '.']), p.map[t], { check: p.map[t] });
  });

  // ---------- m6t2: grid logic, elimination tables, knights and knaves ----------
  var NAMES = ['Ann', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'], PETS = ['cat', 'dog', 'fish', 'bird', 'rabbit', 'turtle'], SPORTS = ['chess', 'tennis', 'golf', 'judo', 'rowing', 'archery'];
  function perm(r, n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return r.shuffle(a); }

  /* Logic puzzle model. Categories 0 (people), 1 (pets), optional 2 (sports). Pair matrices: pairs = [[0,1],[0,2],[1,2]].
     A fact is {p: pairIndex, i, j, v: true/false} meaning item i of the first category is (v) linked to item j of the second. */
  function LogicPuzzle(labels, ncat) {
    this.labels = labels; this.n = labels[0].length; this.ncat = ncat;
    this.pairs = ncat === 2 ? [[0, 1]] : [[0, 1], [0, 2], [1, 2]];
  }
  LogicPuzzle.prototype.phrase = function (f) {
    var L = this.labels, pr = this.pairs[f.p], a = L[pr[0]][f.i], b = L[pr[1]][f.j], A = pr[0] === 0 ? a : 'the ' + a + ' owner';
    if (pr[0] === 0 && pr[1] === 1) return a + (f.v ? ' owns the ' : ' does not own the ') + b + '.';
    if (pr[0] === 0 && pr[1] === 2) return a + (f.v ? ' plays ' : ' does not play ') + b + '.';
    return 'The ' + a + ' owner ' + (f.v ? 'plays ' : 'does not play ') + b + '.';
  };
  LogicPuzzle.prototype.cellText = function (p, i, j, v) { return this.phrase({ p: p, i: i, j: j, v: v }).replace(/\.$/, ''); };
  // Run propagation on a list of facts. Returns {solved, log, grid}.
  LogicPuzzle.prototype.run = function (facts, narrate) {
    var n = this.n, self = this, M = this.pairs.map(function () { var m = []; for (var i = 0; i < n; i++) { m.push([]); for (var j = 0; j < n; j++) m[i].push(null); } return m; }), log = [], conflict = false;
    function set(p, i, j, v, why) { if (M[p][i][j] === v) return false; if (M[p][i][j] !== null) { conflict = true; return false; } M[p][i][j] = v; if (narrate) log.push(self.cellText(p, i, j, v) + (why ? ' (' + why + ')' : '') + '.'); return true; }
    if (narrate) log.push('__clues__');
    facts.forEach(function (f, k) { M[f.p][f.i][f.j] === null ? (M[f.p][f.i][f.j] = f.v) : null; });
    var changed = true, guard = 0;
    while (changed && guard++ < 60) {
      changed = false;
      this.pairs.forEach(function (pr, p) {
        var i, j, k;
        for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (M[p][i][j] === true) {
          for (k = 0; k < n; k++) { if (k !== j && M[p][i][k] === null) { M[p][i][k] = false; changed = true; if (narrate) log.push(self.cellText(p, i, k, false) + ' (' + self.cellText(p, i, j, true) + ', so it cannot be a second one).'); } if (k !== i && M[p][k][j] === null) { M[p][k][j] = false; changed = true; if (narrate) log.push(self.cellText(p, k, j, false) + ' (' + self.cellText(p, i, j, true) + ', so nobody else can share it).'); } }
        }
        for (i = 0; i < n; i++) { var open = [], hasT = false; for (j = 0; j < n; j++) { if (M[p][i][j] === null) open.push(j); if (M[p][i][j] === true) hasT = true; } if (!hasT && open.length === 1) { M[p][i][open[0]] = true; changed = true; if (narrate) log.push(self.cellText(p, i, open[0], true) + ' (everything else has been ruled out in this row).'); } }
        for (j = 0; j < n; j++) { var open2 = [], hasT2 = false; for (i = 0; i < n; i++) { if (M[p][i][j] === null) open2.push(i); if (M[p][i][j] === true) hasT2 = true; } if (!hasT2 && open2.length === 1) { M[p][open2[0]][j] = true; changed = true; if (narrate) log.push(self.cellText(p, open2[0], j, true) + ' (everything else has been ruled out in this column).'); } }
      });
      if (this.ncat === 3) {
        // transitivity between the three pair matrices: (person, pet) = M0, (person, sport) = M1, (pet, sport) = M2
        var M0 = M[0], M1 = M[1], M2 = M[2], a, b, c;
        for (a = 0; a < n; a++) for (b = 0; b < n; b++) for (c = 0; c < n; c++) {
          if (M0[a][b] === true && M1[a][c] === true && M2[b][c] === null) { M2[b][c] = true; changed = true; if (narrate) log.push(self.cellText(2, b, c, true) + ' (the same person, ' + self.labels[0][a] + ', has both).'); }
          if (M0[a][b] === true && M2[b][c] === true && M1[a][c] === null) { M1[a][c] = true; changed = true; if (narrate) log.push(self.cellText(1, a, c, true) + ' (' + self.labels[0][a] + ' owns the ' + self.labels[1][b] + ' and its owner plays ' + self.labels[2][c] + ').'); }
          if (M1[a][c] === true && M2[b][c] === true && M0[a][b] === null) { M0[a][b] = true; changed = true; if (narrate) log.push(self.cellText(0, a, b, true) + ' (' + self.labels[0][a] + ' plays ' + self.labels[2][c] + ' and so does the ' + self.labels[1][b] + ' owner).'); }
          if (M0[a][b] === true && M1[a][c] === false && M2[b][c] === null) { M2[b][c] = false; changed = true; if (narrate) log.push(self.cellText(2, b, c, false) + ' (' + self.labels[0][a] + ' owns the ' + self.labels[1][b] + ' but does not play ' + self.labels[2][c] + ').'); }
          if (M0[a][b] === true && M2[b][c] === false && M1[a][c] === null) { M1[a][c] = false; changed = true; if (narrate) log.push(self.cellText(1, a, c, false) + ' (' + self.labels[0][a] + ' owns the ' + self.labels[1][b] + ', whose owner does not play ' + self.labels[2][c] + ').'); }
          if (M1[a][c] === true && M2[b][c] === false && M0[a][b] === null) { M0[a][b] = false; changed = true; if (narrate) log.push(self.cellText(0, a, b, false) + ' (' + self.labels[0][a] + ' plays ' + self.labels[2][c] + ', but the ' + self.labels[1][b] + ' owner does not).'); }
        }
      }
    }
    var solved = true; M.forEach(function (m) { for (var i = 0; i < n; i++) { var t = 0; for (var j = 0; j < n; j++) if (m[i][j] === true) t++; if (t !== 1) solved = false; } });
    return { solved: solved && !conflict, log: log, M: M };
  };
  LogicPuzzle.prototype.allFacts = function (sol) { // sol: {pet: perm, sport: perm}; person i has pet sol[0][i], sport sol[1][i]
    var n = this.n, out = [], self = this;
    this.pairs.forEach(function (pr, p) { for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { var truth = p === 0 ? sol.pet[i] === j : p === 1 ? sol.sport[i] === j : (function () { var owner = sol.pet.indexOf(i); return sol.sport[owner] === j; })(); out.push({ p: p, i: i, j: j, v: truth }); } });
    return out;
  };
  function makeLogic(r, n, ncat, minC, maxC) {
    var best = null;
    for (var tries = 0; tries < 40; tries++) {
      var labels = [r.shuffle(NAMES).slice(0, n), r.shuffle(PETS).slice(0, n), r.shuffle(SPORTS).slice(0, n)], lp = new LogicPuzzle(labels.slice(0, ncat), ncat), sol = { pet: perm(r, n), sport: perm(r, n) };
      var facts = lp.allFacts(sol), neg = r.shuffle(facts.filter(function (f) { return !f.v; })), pos = r.shuffle(facts.filter(function (f) { return f.v; })), order = [], a = 0, b = 0;
      while (a < neg.length || b < pos.length) { if (a < neg.length) order.push(neg[a++]); if (a < neg.length) order.push(neg[a++]); if (b < pos.length) order.push(pos[b++]); }
      var chosen = [], k;
      for (k = 0; k < order.length; k++) { chosen.push(order[k]); if (lp.run(chosen, false).solved) break; }
      if (!lp.run(chosen, false).solved) continue;
      var idx = r.shuffle(chosen.map(function (_, i) { return i; }));
      idx.forEach(function (ix) { var trial = chosen.filter(function (_, i) { return i !== ix; }); if (trial.length && lp.run(trial, false).solved) chosen = trial; });
      // the chosen list may have changed indices; recompute cleanly
      var res = { lp: lp, sol: sol, facts: chosen };
      if (chosen.length >= minC && chosen.length <= maxC) return res;
      if (!best || (chosen.length <= maxC && chosen.length > best.facts.length)) best = res;
    }
    return best;
  }
  function logicSteps(g, extraLast) {
    var lp = g.lp, run = lp.run(g.facts, true), st = [];
    st.push('Draw an elimination table: one row for each person and one column for each ' + (lp.ncat === 2 ? 'pet' : 'pet and sport') + '. Mark a cross for an impossible pair and a tick for a certain pair.');
    st.push('Fill in what the clues say directly. ' + g.facts.map(function (f, k) { return 'Clue ' + (k + 1) + ': ' + lp.phrase(f); }).join(' '));
    var lines = run.log.filter(function (x) { return x !== '__clues__'; });
    var chunks = []; while (lines.length) chunks.push(lines.splice(0, 3).join(' '));
    chunks.forEach(function (c, i) { st.push((i === 0 ? 'Now follow the consequences. ' : '') + c); });
    var n = lp.n, out = [];
    for (var i = 0; i < n; i++) { var pj = -1, sj = -1; for (var j = 0; j < n; j++) { if (run.M[0][i][j] === true) pj = j; if (lp.ncat === 3 && run.M[1][i][j] === true) sj = j; } out.push(lp.labels[0][i] + ' owns the ' + lp.labels[1][pj] + (lp.ncat === 3 ? ' and plays ' + lp.labels[2][sj] : '')); }
    st.push('The finished table gives: ' + out.join('; ') + '.');
    if (extraLast) st.push(extraLast);
    return st;
  }
  function logicOptions(items, r, n) { var extra = ['Cannot be determined', 'No one'].slice(0, Math.max(0, 5 - n)); return r.shuffle(items.slice(0, n).concat(extra)); }
  function logicGen(n, ncat, minC, maxC) {
    return function (r) {
      var g = makeLogic(r, n, ncat, minC, maxC), lp = g.lp, kind = r.pick(ncat === 3 ? ['owner', 'sport', 'who'] : ['owner']), L = lp.labels;
      var facts = g.facts, cluesText = facts.map(function (f, k) { return (k + 1) + '. ' + lp.phrase(f); }).join(' '), pet = r.int(0, n - 1), q, ans, opts, ownerIdx = g.sol.pet.indexOf(pet);
      if (kind === 'owner') { ans = L[0][ownerIdx]; q = 'Who owns the ' + L[1][pet] + '?'; opts = logicOptions(L[0], r, n); }
      else if (kind === 'sport') { ans = L[2][g.sol.sport[ownerIdx]]; q = 'What sport does the owner of the ' + L[1][pet] + ' play?'; opts = logicOptions(L[2], r, n); }
      else { var sp = r.int(0, n - 1), who = g.sol.sport.indexOf(sp); ans = L[0][who]; q = 'Who plays ' + L[2][sp] + '?'; opts = logicOptions(L[0], r, n); }
      var intro = ncat === 2 ? n + ' friends (' + L[0].join(', ') + ') each own a different pet (' + L[1].join(', ') + '). ' : n + ' friends (' + L[0].join(', ') + ') each own a different pet (' + L[1].join(', ') + ') and each play a different sport (' + L[2].join(', ') + '). ';
      var spec = TX(intro + 'Use the clues. ' + cluesText + ' ' + q, logicSteps(g, 'So the answer is ' + ans + '.'), ans, { options: opts, check: ans, visual: V.logicGrid(L[0], ncat === 2 ? [L[1]] : [L[1], L[2]]) });
      return spec;
    };
  }
  M6[2][1].push(logicGen(3, 2, 3, 5));
  M6[2][1].push(logicGen(3, 2, 3, 5));
  M6[2][2].push(logicGen(3, 3, 4, 7));
  M6[2][2].push(logicGen(3, 3, 4, 7));
  M6[2][3].push(logicGen(4, 3, 6, 11));

  // Knights always tell the truth, knaves always lie.
  var KN = ['A', 'B', 'C', 'D'];
  function knightsPuzzle(r, n) {
    for (var tries = 0; tries < 200; tries++) {
      var stm = [], i;
      for (i = 0; i < n; i++) {
        var t = r.pick(['knave', 'knight', 'same', 'diff', 'atleast', 'exactly']), o = r.int(0, n - 1); while (o === i && (t === 'knave' || t === 'knight' || t === 'same' || t === 'diff')) o = r.int(0, n - 1);
        stm.push({ t: t, o: o, k: r.int(1, n - 1) });
      }
      var sols = [], mask, K;
      for (mask = 0; mask < (1 << n); mask++) {
        K = []; for (i = 0; i < n; i++) K.push(!!(mask & (1 << i)));
        var ok = true; for (i = 0; i < n; i++) if (kEval(stm[i], i, K) !== K[i]) { ok = false; break; }
        if (ok) sols.push(K);
      }
      if (sols.length === 1) return { stm: stm, sol: sols[0] };
    }
    return null;
  }
  function kEval(s, i, K) {
    var knaves = K.filter(function (x) { return !x; }).length;
    if (s.t === 'knave') return !K[s.o]; if (s.t === 'knight') return K[s.o];
    if (s.t === 'same') return K[i] === K[s.o]; if (s.t === 'diff') return K[i] !== K[s.o];
    if (s.t === 'atleast') return knaves >= 1; return knaves === s.k;
  }
  function kText(s, n) {
    if (s.t === 'knave') return KN[s.o] + ' is a knave.'; if (s.t === 'knight') return KN[s.o] + ' is a knight.';
    if (s.t === 'same') return 'I am the same type as ' + KN[s.o] + '.'; if (s.t === 'diff') return 'I am a different type from ' + KN[s.o] + '.';
    if (s.t === 'atleast') return 'At least one of us is a knave.'; return 'Exactly ' + s.k + ' of us ' + (s.k === 1 ? 'is a knave' : 'are knaves') + '.';
  }
  function knightsGen(n) {
    return function (r) {
      var p = knightsPuzzle(r, n); if (!p) return M6[2][1][0](r);
      var K = p.sol, knights = K.filter(function (x) { return x; }).length, lines = [], i, mask;
      var st = ['A knight always tells the truth and a knave always lies. So each person is a knight exactly when their own statement is true. There are ' + (1 << n) + ' ways to assign knight or knave, so test them.'];
      for (mask = 0; mask < (1 << n); mask++) {
        var T = []; for (i = 0; i < n; i++) T.push(!!(mask & (1 << i)));
        var bad = -1; for (i = 0; i < n; i++) if (kEval(p.stm[i], i, T) !== T[i]) { bad = i; break; }
        lines.push(T.map(function (x, k) { return KN[k] + (x ? ' knight' : ' knave'); }).join(', ') + (bad < 0 ? ': every statement matches. This works.' : ': fails, because ' + KN[bad] + ' says "' + kText(p.stm[bad], n) + '" which is ' + (kEval(p.stm[bad], bad, T) ? 'true, but ' + KN[bad] + ' is a knave.' : 'false, but ' + KN[bad] + ' is a knight.')));
      }
      if (n === 3) st.push(lines.join(' ')); else { st.push(lines.slice(0, 8).join(' ')); st.push(lines.slice(8).join(' ')); }
      st.push('Exactly one case works: ' + K.map(function (x, k) { return KN[k] + ' is a ' + (x ? 'knight' : 'knave'); }).join(', ') + '. So there ' + (knights === 1 ? 'is 1 knight' : 'are ' + knights + ' knights') + '.');
      return I(n + ' people, ' + KN.slice(0, n).join(', ') + ', are each either a knight (always truthful) or a knave (always lies). ' + p.stm.map(function (s, k) { return KN[k] + ' says: "' + kText(s, n) + '"'; }).join(' ') + ' How many of them are knights?', st, knights, { check: knights });
    };
  }
  M6[2][2].push(knightsGen(3));
  M6[2][3].push(knightsGen(4));
  M6[2][3].push(knightsGen(4));

  // ---------- m6t3: parity and even odd constraints ----------
  function bipartiteMax(R, C, blocked) { // maximum dominoes on an R by C board with blocked cells (Kuhn matching)
    var cells = {}, i, j; for (i = 0; i < R; i++) for (j = 0; j < C; j++) if (!blocked[i + ',' + j]) cells[i + ',' + j] = true;
    var match = {}, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function tryK(u, seen) { var p = u.split(',').map(Number); for (var d = 0; d < 4; d++) { var v = (p[0] + dirs[d][0]) + ',' + (p[1] + dirs[d][1]); if (!cells[v] || seen[v]) continue; seen[v] = true; if (!match[v] || tryK(match[v], seen)) { match[v] = u; return true; } } return false; }
    var cnt = 0; for (i = 0; i < R; i++) for (j = 0; j < C; j++) if ((i + j) % 2 === 0 && cells[i + ',' + j]) if (tryK(i + ',' + j, {})) cnt++;
    return cnt;
  }
  function canSplit(n) { var tot = n * (n + 1) / 2; if (tot % 2) return false; var half = tot / 2, dp = [true], k, s; for (s = 1; s <= half; s++) dp[s] = false; for (k = 1; k <= n; k++) for (s = half; s >= k; s--) if (dp[s - k]) dp[s] = true; return dp[half]; }

  M6[3][1].push(function (r) { // count odd numbers in a range
    var a = r.int(11, 120), b = a + r.int(20, 150), cnt = 0; for (var x = a; x <= b; x++) if (x % 2) cnt++;
    return I('How many odd whole numbers are there from ' + a + ' to ' + b + ', including both ends?', ['Odd numbers and even numbers alternate. From ' + a + ' to ' + b + ' there are ' + b + ' ' + MINUS + ' ' + a + ' + 1 = ' + (b - a + 1) + ' numbers.', (a % 2 && b % 2) ? 'Both ends are odd, so odd numbers make up one more than half: (' + (b - a + 1) + ' + 1) ÷ 2 = ' + cnt + '.' : (!(a % 2) && !(b % 2)) ? 'Both ends are even, so odd numbers make up one fewer than half: (' + (b - a + 1) + ' ' + MINUS + ' 1) ÷ 2 = ' + cnt + '.' : 'The ends have different parity, so exactly half are odd: ' + (b - a + 1) + ' ÷ 2 = ' + cnt + '.'], cnt, { check: cnt });
  });
  M6[3][1].push(function (r) { // triangular numbers even
    var N = r.int(12, 60), cnt = 0; for (var n = 1; n <= N; n++) if ((n * (n + 1) / 2) % 2 === 0) cnt++;
    return I('The triangular numbers are 1, 3, 6, 10, 15, ... where the ' + ord(1) + ' is 1, the ' + ord(2) + ' is 1 + 2, the ' + ord(3) + ' is 1 + 2 + 3, and so on. How many of the first ' + N + ' triangular numbers are even?', ['Write the parities of the first few: 1 odd, 3 odd, 6 even, 10 even, 15 odd, 21 odd, 28 even, 36 even.', 'The pattern odd, odd, even, even repeats every 4 terms, because adding the next counting number changes parity in a fixed cycle.', 'In ' + N + ' terms there are ' + Math.floor(N / 4) + ' full cycles (each has 2 even numbers), giving ' + 2 * Math.floor(N / 4) + ', and ' + (N % 4) + ' leftover terms with ' + Math.max(0, (N % 4) - 2) + ' even.', 'Total = ' + cnt + '.'], cnt, { check: cnt });
  });
  M6[3][1].push(function (r) { // parity of expressions
    var a = r.int(3, 9), b = r.int(3, 9), kind = r.pick(['sum', 'prod', 'mix']), ans, txt, why;
    if (kind === 'sum') { ans = (a % 2 + b % 2) % 2 ? 'Odd' : 'Even'; txt = 'the sum of ' + a + ' odd numbers and ' + b + ' even numbers'; why = 'Even numbers never change parity. Each pair of odd numbers adds to an even number, so only whether ' + a + ' is odd or even matters: ' + (a % 2 ? 'odd' : 'even') + '.'; ans = a % 2 ? 'Odd' : 'Even'; }
    else if (kind === 'prod') { ans = 'Even'; txt = 'the product of ' + (a + 1) + ' whole numbers, at least one of which is even,'; why = 'One even factor makes the whole product even, because it contains a factor of 2.'; }
    else { ans = 'Odd'; txt = 'the product of ' + a + ' odd numbers'; why = 'Odd times odd is odd, so the product stays odd no matter how many odd factors there are.'; }
    return TX('Is ' + txt + ' odd or even?', ['Use the parity rules: even + even = even, odd + odd = even, odd + even = odd, and odd × odd = odd while anything × even = even.', why, 'Answer: ' + ans + '.'], ans, { options: ['Even', 'Odd'], check: ans });
  });

  M6[3][2].push(function (r) { // frog positions
    var n = r.int(3, 10), pos = {}; (function go(k, p) { if (k === n) { pos[p] = true; return; } go(k + 1, p - 1); go(k + 1, p + 1); })(0, 0);
    var cnt = Object.keys(pos).length;
    return I('A frog starts at 0 on a number line and makes exactly ' + n + ' jumps. Each jump is exactly 1 unit to the left or 1 unit to the right. How many different positions could the frog finish on?', ['Each jump changes the position by an odd amount (1 or ' + MINUS + '1), so after ' + n + ' jumps the position has the same parity as ' + n + ': it is ' + (n % 2 ? 'odd' : 'even') + '.', 'The furthest the frog can be is ' + n + ' units from 0, so the finishing spot is ' + (n % 2 ? 'an odd' : 'an even') + ' number from ' + MINUS + n + ' to ' + n + '.', 'The possible spots step by 2: ' + MINUS + n + ', ' + MINUS + (n - 2) + ', ..., ' + (n - 2) + ', ' + n + '. That is ' + n + ' + 1 = ' + (n + 1) + ' positions.'], n + 1, { check: cnt });
  });
  M6[3][2].push(function (r) { // split 1..n into equal sums
    var lo = r.int(5, 15), hi = lo + r.int(8, 20), cnt = 0, list = [];
    for (var n = lo; n <= hi; n++) if (canSplit(n)) { cnt++; list.push(n); }
    return I('For how many whole numbers n from ' + lo + ' to ' + hi + ' (including both) can the numbers 1, 2, ..., n be split into two groups that have exactly the same sum?', ['The total 1 + 2 + ... + n = n(n + 1) ÷ 2 must be even, or it cannot be split into two equal halves.', 'n(n + 1) ÷ 2 is even exactly when n leaves remainder 0 or 3 when divided by 4 (this matches the odd, odd, even, even pattern of triangular numbers, shifted).', 'Those n in the range are ' + list.join(', ') + '. Each of them can in fact be split (a direct construction always exists).', 'Count = ' + cnt + '.'], cnt, { check: cnt });
  });
  M6[3][2].push(function (r) { // odd products in a table
    var m = r.int(4, 14), cnt = 0; for (var i = 1; i <= m; i++) for (var j = 1; j <= m; j++) if ((i * j) % 2) cnt++;
    return I('A multiplication table has rows 1 to ' + m + ' and columns 1 to ' + m + ', so it has ' + m * m + ' products. How many of the products are odd?', ['A product is odd only when both factors are odd.', 'There are ' + Math.ceil(m / 2) + ' odd numbers from 1 to ' + m + ', so ' + Math.ceil(m / 2) + ' choices for the row and ' + Math.ceil(m / 2) + ' for the column.', 'Odd products = ' + Math.ceil(m / 2) + ' × ' + Math.ceil(m / 2) + ' = ' + cnt + '.'], cnt, { check: cnt });
  });
  M6[3][2].push(function (r) { // handshake odd degrees
    var N = r.int(3, 6), best = 0, edges = [], i, j; for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) edges.push([i, j]);
    for (var mask = 0; mask < (1 << edges.length); mask++) { var deg = []; for (i = 0; i < N; i++) deg.push(0); edges.forEach(function (e, k) { if (mask & (1 << k)) { deg[e[0]]++; deg[e[1]]++; } }); var odd = deg.filter(function (x) { return x % 2; }).length; if (odd > best) best = odd; }
    var ans = N % 2 ? N - 1 : N;
    return I('At a party of ' + N + ' guests, some pairs of guests shake hands once. What is the largest possible number of guests who shake an odd number of hands?', ['Count handshakes from each guest. The total of everyone\'s handshake counts equals twice the number of handshakes, because every handshake is counted by two people. So the total is even.', 'A total is even only when the number of odd terms is even. So the number of guests with an odd count must be even.', N % 2 ? 'There are ' + N + ' guests, an odd number, so at most ' + (N - 1) + ' of them can have an odd count.' : 'There are ' + N + ' guests, an even number, so all ' + N + ' can have an odd count (for example, pair everyone up).', 'Answer: ' + ans + '.'], ans, { check: best });
  });

  M6[3][3].push(function (r) { // lockers
    var N = r.pick([50, 100, 200, 250, 500, 1000, 400, 150]), open = []; for (var i = 1; i <= N; i++) open.push(false);
    for (var s = 1; s <= N; s++) for (var k = s; k <= N; k += s) open[k - 1] = !open[k - 1];
    var cnt = open.filter(function (x) { return x; }).length, rt = Math.floor(Math.sqrt(N));
    return I(N + ' lockers are numbered 1 to ' + N + ' and all start closed. Student 1 opens every locker. Student 2 changes (opens or closes) every 2nd locker. Student 3 changes every 3rd locker, and so on until student ' + N + ' changes locker ' + N + '. How many lockers are open at the end?', ['Locker number k is changed once by each student whose number divides k. So it is changed as many times as k has divisors.', 'A locker ends up open exactly when it is changed an odd number of times, so when k has an odd number of divisors.', 'Divisors come in pairs d and k ÷ d, except when d = k ÷ d. So k has an odd number of divisors only when k is a perfect square.', 'The perfect squares up to ' + N + ' are 1, 4, 9, ..., ' + rt * rt + ', which is ' + rt + ' lockers.'], rt, { check: cnt });
  });
  M6[3][3].push(function (r) { // dominoes with two corners removed
    var R = r.pick([4, 6, 8]), C = r.pick([4, 6, 8]), bl = {}; bl['0,0'] = true; bl[(R - 1) + ',' + (C - 1)] = true;
    var cnt = bipartiteMax(R, C, bl), ans = R * C / 2 - 2;
    return I('A ' + R + ' by ' + C + ' chessboard has two opposite corner squares removed. A domino covers exactly two neighbouring squares. What is the largest number of dominoes that can be placed on the board without overlapping?', ['Colour the board like a chessboard. Each domino covers one light square and one dark square.', 'Opposite corners have the same colour. Removing them leaves ' + (R * C / 2 - 2) + ' squares of that colour and ' + R * C / 2 + ' of the other.', 'Every domino needs one square of each colour, so at most ' + (R * C / 2 - 2) + ' dominoes fit. (A careful arrangement reaches this number.)', 'Answer: ' + ans + '.'], ans, { check: cnt });
  });
  M6[3][3].push(function (r) { // even digit sum counts
    var N = r.pick([49, 59, 79, 99, 199, 299, 499]), cnt = 0; for (var x = 1; x <= N; x++) if (digitSum(x) % 2 === 0) cnt++;
    return I('How many whole numbers from 1 to ' + N + ' have an even digit sum?', ['Group the numbers in tens: 10, 11, ..., 19 and so on. Inside a group the tens part is fixed and the units digit runs through 0 to 9.', 'Then the digit sum alternates even, odd, even, odd, ... so exactly 5 of every 10 numbers have an even digit sum.', N === 49 || N === 59 || N === 79 || N === 99 || N === 199 || N === 299 || N === 499 ? 'From 0 to ' + N + ' there are ' + (N + 1) + ' numbers, which is ' + (N + 1) / 10 + ' full groups of ten, and half of them, ' + (N + 1) / 2 + ', have an even digit sum.' : '', 'The number 0 (digit sum 0) is one of those but is not in our list, so subtract 1: ' + (N + 1) / 2 + ' ' + MINUS + ' 1 = ' + cnt + '.'].filter(Boolean), cnt, { check: cnt });
  });
  M6[3][3].push(function (r) { // erase two, write difference
    var N = r.int(4, 8), S = N * (N + 1) / 2, target = S % 2, seen = {};
    var found = null, path = [];
    function go(a, ops) { if (found !== null) return; if (a.length === 1) { if (a[0] === target) { found = ops.slice(); } return; } var key = a.join(','); if (seen[key]) return; seen[key] = true; for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) { var b = a.filter(function (_, k) { return k !== i && k !== j; }), d = Math.abs(a[i] - a[j]); b.push(d); b.sort(function (x, y) { return x - y; }); ops.push([a[i], a[j], d]); go(b, ops); ops.pop(); if (found !== null) return; } }
    var start = []; for (var i = 1; i <= N; i++) start.push(i); go(start, []);
    // independent check: all reachable final values
    var finals = {}, seen2 = {}; (function all(a) { var key = a.join(','); if (seen2[key]) return; seen2[key] = true; if (a.length === 1) { finals[a[0]] = true; return; } for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) { var b = a.filter(function (_, k) { return k !== i && k !== j; }); b.push(Math.abs(a[i] - a[j])); b.sort(function (x, y) { return x - y; }); all(b); } })(start);
    var mn = Math.min.apply(null, Object.keys(finals).map(Number));
    if (found === null) return M6[3][3][0](r);
    return I('The whole numbers from 1 to ' + N + ' are written on a board. A move erases any two numbers and writes down their difference (the larger minus the smaller). After ' + (N - 1) + ' moves one number is left. What is the smallest number that can be left?', ['Look at parity. If you erase a and b and write |a ' + MINUS + ' b|, the sum of all numbers changes by ' + MINUS + '(a + b) + |a ' + MINUS + ' b|, and a + b and |a ' + MINUS + ' b| always have the same parity. So the parity of the total never changes.', 'The starting total is ' + N + '(' + (N + 1) + ') ÷ 2 = ' + S + ', which is ' + (S % 2 ? 'odd' : 'even') + '. So the last number is ' + (S % 2 ? 'odd, and cannot be 0. The smallest it could be is 1.' : 'even, so it could be 0.'), 'It can be reached. One sequence of moves: ' + found.map(function (o) { return '(' + o[0] + ', ' + o[1] + ') gives ' + o[2]; }).join('; ') + '.', 'The smallest possible final number is ' + target + '.'], target, { check: mn });
  });

  /* ==================================================================
     MODULE 6 LESSONS AND REGISTRATION
  ================================================================== */
  var L6 = {
    m6t0: '## The pigeonhole principle\nIf you put more pigeons than holes, some hole holds at least two pigeons. That is the whole idea, and it is powerful.\n:::visual pigeonholes 7 3\nSeven pigeons in three holes: the fullest hole has at least ceil(7 ÷ 3) = 3.\nFor "how many must I take to be sure" questions, **build the worst case**. Take as many as you can while still failing, then add one.\nSocks in 4 colours: worst case is one of each colour (4 socks) with no pair, so 5 socks guarantee a pair. To force 3 of one colour: 4 × 2 + 1 = 9.\nTo use the principle on numbers, you must invent the holes. Sort by remainder, by digit sum, or by the odd part of a number.\n> Step 1: decide what the holes are. Step 2: decide the worst case. Step 3: add one.\n### Worked example\n:::worked m6t0 2',
    m6t1: '## Cryptarithms: letters for digits\nIn a cryptarithm each letter is a different digit and no number starts with 0. The trick is to reason, not to guess.\n**Size first.** Two numbers of at most 4 digits add to less than 20 000, so a 5 digit answer must start with 1. In SEND + MORE = MONEY that gives M = 1.\nThe same idea shows that AABB + CC = DDEEE has **no solution**: AABB is at most 9988 and CC at most 99, so the sum is at most 10 087. But DDEEE with D not 0 is at least 11 000. Reasoning about size can save you a long search.\n**Repeated letters** give parity clues: in AB + AB the units digits B + B are always even.\n**Carries** are only ever 0 or 1 when adding two numbers. Work right to left and keep track of the carry.\nFor products, use the units digit: the last digit of the product depends only on the last digits of the factors.\n> Test each guess in every column before you keep it. One failed column kills the guess.\n### Worked example\n:::worked m6t1 2',
    m6t2: '## Logic grids and knights and knaves\nFor a logic grid draw a table with a row for each person and a column for each thing. A **tick** means certain. A **cross** means impossible.\n:::visual logicGrid Ann,Ben,Cy Cat,Dog,Fish|Chess,Golf,Judo 0.0=✗;1.1=✓\nWhen you place a tick, cross out the rest of its row and its column. When only one blank is left in a row or column, it must be a tick. Chain ticks: if Ann owns the cat and the cat owner plays chess, then Ann plays chess.\nFor **knights and knaves**, a knight always tells the truth and a knave always lies. List every possible assignment and test each statement. A person is a knight exactly when their own statement is true.\n> Do not guess. Every cell you fill in should come with a reason.\n### Worked example\n:::worked m6t2 2',
    m6t3: '## Parity: even and odd\nParity means even or odd. The rules: even + even = even, odd + odd = even, even + odd = odd. A product is odd only if every factor is odd.\nAn **invariant** is something that never changes. If every move keeps the parity of the total, the final number must have that parity. This proves things are impossible.\nColour a chessboard: every domino covers one light and one dark square. If the board has more squares of one colour, some squares can never be covered.\nA number has an odd number of divisors only if it is a perfect square, because divisors come in pairs (d and k ÷ d).\nThe sum of everyone\'s handshakes is even, so the number of people with an odd count is always even.\n> Ask: what stays the same after every move? That is usually the key.\n### Worked example\n:::worked m6t3 3'
  };
  E.registerModule({
    id: 'm6', title: 'Non Routine Logic',
    topics: [
      { id: 'm6t0', title: 'Pigeonhole principle', gens: M6[0], lesson: L6.m6t0, summary: 'Worst case counting, socks and cards, remainders, digit sums and divisibility chains.' },
      { id: 'm6t1', title: 'Cryptarithms', gens: M6[1], lesson: L6.m6t1, summary: 'Alphametics with carries, size arguments, repeated letters, products and famous puzzles.' },
      { id: 'm6t2', title: 'Grid logic and elimination tables', gens: M6[2], lesson: L6.m6t2, summary: 'Elimination grids with two and three categories, plus knights and knaves.' },
      { id: 'm6t3', title: 'Parity and even odd constraints', gens: M6[3], lesson: L6.m6t3, summary: 'Parity rules, frog jumps, lockers, dominoes, handshakes and invariants.' }
    ]
  });

  /* ==================================================================
     CONTEST SIMULATOR: ENGINE (assembly, scoring, saving, logging)
     Everything in this section works without a browser, so it can be tested in Node.
  ================================================================== */
  var CONTEST_SECONDS = 3600;
  var PARTS = [
    { id: 'A', label: 'Part A', blurb: 'Easy', count: 10, tier: 1, points: 5 },
    { id: 'B', label: 'Part B', blurb: 'Medium', count: 10, tier: 2, points: 6 },
    { id: 'C', label: 'Part C', blurb: 'Hard, non routine', count: 5, tier: 3, points: 8 }
  ];
  var TOTAL_QUESTIONS = 25, TOTAL_POINTS = 150;
  var SESSION_KEY = 'enrichedMath8.gaussSession.v1', APP_KEY = 'enrichedMath8.v1';

  function mulberry(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rshuffle(a, rng) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rpick(a, rng) { return a[Math.floor(rng() * a.length)]; }

  function availableModules() { return E.listModules().map(function (m) { return m.id; }).filter(function (id) { return /^m[1-6]$/.test(id); }).sort(); }
  function moduleTitles() { var o = {}; E.listModules().forEach(function (m) { o[m.id] = m.title; }); return o; }

  // Which module supplies each question of a part. Every module appears in A and B. Part C always includes Module 6.
  function planModules(part, mods, rng) {
    var plan, others;
    if (part.count >= mods.length) {
      plan = mods.slice(); var cap = Math.ceil(part.count / mods.length) + 1, cnt = {}; plan.forEach(function (m) { cnt[m] = 1; });
      while (plan.length < part.count) { var m = rpick(mods, rng); if (cnt[m] < cap) { cnt[m]++; plan.push(m); } }
    } else {
      var must = mods.indexOf('m6') >= 0 ? ['m6'] : []; others = rshuffle(mods.filter(function (m) { return must.indexOf(m) < 0; }), rng);
      plan = must.concat(others).slice(0, part.count);
    }
    return rshuffle(plan, rng);
  }

  // Draw one acceptable question: five answer choices (A to E) and text not already used in this contest.
  function drawQuestion(mid, part, rng, used, topicUse) {
    var topics = E.listTopics(mid).filter(function (t) { return t.tiers[part.tier - 1] > 0; });
    for (var round = 0; round < 8; round++) {
      var minUse = Math.min.apply(null, topics.map(function (t) { return topicUse[t.id] || 0; }));
      var pool = topics.filter(function (t) { return (topicUse[t.id] || 0) <= minUse + (round > 3 ? 1 : 0); });
      var topic = rpick(pool.length ? pool : topics, rng);
      for (var k = 0; k < 25; k++) {
        var q = E.generateQuestion(mid, topic.id, part.tier, { mc: true });
        if (q.options && q.options.length === 5 && !used[q.questionText]) { used[q.questionText] = true; topicUse[topic.id] = (topicUse[topic.id] || 0) + 1; return q; }
      }
    }
    throw new Error('GaussSimulator: could not draw a question for ' + mid + ' tier ' + part.tier);
  }

  /* Build a fresh 25 question contest. Returns { id, createdAt, items[], totalPoints } where each item is
     { n, part, points, moduleId, topicId, tier, seed, variant, q }. */
  function assemble(opts) {
    opts = opts || {};
    var rng = mulberry(opts.seed != null ? opts.seed : ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0));
    var mods = availableModules(); if (!mods.length) throw new Error('GaussSimulator: no modules are registered.');
    var used = {}, topicUse = {}, items = [], n = 0;
    PARTS.forEach(function (part) {
      planModules(part, mods, rng).forEach(function (mid) {
        var q = drawQuestion(mid, part, rng, used, topicUse); n++;
        items.push({ n: n, part: part.id, points: part.points, moduleId: q.moduleId, topicId: q.topicId, tier: part.tier, seed: q.seed, variant: q.variant, q: q });
      });
    });
    return { id: 'gauss-' + Date.now().toString(36) + '-' + Math.floor(rng() * 1e6).toString(36), createdAt: Date.now(), items: items, totalPoints: sum(items.map(function (i) { return i.points; })) };
  }
  // Rebuild the exact same question from its saved descriptor.
  function rebuild(d) { return E.generateQuestion(d.moduleId, d.topicId, d.tier, { mc: true, seed: d.seed, variant: d.variant }); }
  function rebuildTest(saved) {
    return { id: saved.id, createdAt: saved.createdAt, totalPoints: sum(saved.items.map(function (i) { return i.points; })), items: saved.items.map(function (d) { return Object.assign({}, d, { q: rebuild(d) }); }) };
  }
  function describe(test) { return { id: test.id, createdAt: test.createdAt, items: test.items.map(function (i) { return { n: i.n, part: i.part, points: i.points, moduleId: i.moduleId, topicId: i.topicId, tier: i.tier, seed: i.seed, variant: i.variant }; }) }; }

  /* Score a finished contest. answers: { questionNumber: chosenOptionIndex }. spent: seconds per question. flags: { n: true }. */
  function score(test, answers, spent, flags) {
    answers = answers || {}; spent = spent || {}; flags = flags || {};
    var res = { score: 0, max: test.totalPoints, correct: 0, answered: 0, total: test.items.length, parts: {}, modules: {}, tiers: {}, items: [] };
    PARTS.forEach(function (p) { res.parts[p.id] = { label: p.label, blurb: p.blurb, total: 0, correct: 0, answered: 0, points: 0, max: 0, seconds: 0 }; });
    test.items.forEach(function (it) {
      var chosen = answers[it.n], has = chosen !== undefined && chosen !== null, ok = has && chosen === it.q.correctIndex, P = res.parts[it.part];
      var M = res.modules[it.moduleId] = res.modules[it.moduleId] || { total: 0, correct: 0, answered: 0, points: 0, max: 0 };
      P.total++; P.max += it.points; M.total++; M.max += it.points; P.seconds += spent[it.n] || 0;
      if (has) { res.answered++; P.answered++; M.answered++; }
      if (ok) { res.correct++; res.score += it.points; P.correct++; P.points += it.points; M.correct++; M.points += it.points; }
      res.items.push({ n: it.n, part: it.part, points: it.points, moduleId: it.moduleId, topicId: it.topicId, tier: it.tier, chosen: has ? chosen : null, correctIndex: it.q.correctIndex, isCorrect: !!ok, answered: !!has, spent: Math.round(spent[it.n] || 0), flagged: !!flags[it.n] });
    });
    res.percent = res.max ? Math.round(1000 * res.score / res.max) / 10 : 0;
    return res;
  }

  /* Coaching notes from a result. Plain sentences, no jargon. */
  function coaching(res, titles) {
    var tips = [], mods = Object.keys(res.modules).map(function (id) { var m = res.modules[id]; return { id: id, acc: m.total ? m.correct / m.total : 0, total: m.total, correct: m.correct }; }).filter(function (m) { return m.total >= 2; }).sort(function (a, b) { return a.acc - b.acc; });
    if (res.answered === 0) return ['You did not answer any questions. Next time, start with Part A and bank the easy points first.'];
    if (mods.length && mods[0].acc < 0.6) tips.push('Your weakest area was ' + (titles[mods[0].id] || mods[0].id) + ' (' + mods[0].correct + ' of ' + mods[0].total + ' correct). Spend your next practice session on that module.');
    var strong = mods.slice().reverse()[0]; if (strong && strong.acc >= 0.7) tips.push('Your strongest area was ' + (titles[strong.id] || strong.id) + ' (' + strong.correct + ' of ' + strong.total + '). Keep it sharp with a few Tier 3 questions.');
    var A = res.parts.A, B = res.parts.B, C = res.parts.C;
    if (A.correct < A.total * 0.8) tips.push('Part A is where contests are won. You got ' + A.correct + ' of ' + A.total + '. Aim for at least 8 by slowing down and checking each easy question once.');
    if (C.correct === 0 && C.answered > 0) tips.push('Part C had no correct answers. These questions reward a plan: draw a picture, try small cases, or look for a pattern before you calculate.');
    if (res.answered < res.total) tips.push('You left ' + (res.total - res.answered) + ' question' + (res.total - res.answered === 1 ? '' : 's') + ' unanswered. There is no penalty for a wrong answer, so always make your best guess before time runs out.');
    if (res.seconds !== undefined && res.seconds < CONTEST_SECONDS - 600 && res.answered === res.total) tips.push('You finished with ' + Math.round((CONTEST_SECONDS - res.seconds) / 60) + ' minutes to spare. Use spare time to recheck Part B and Part C, especially any flagged questions.');
    var flaggedWrong = res.items.filter(function (i) { return i.flagged && !i.isCorrect; }).length;
    if (flaggedWrong) tips.push(flaggedWrong + ' of your flagged questions were wrong or blank. Flagging was the right instinct, so review those solutions first.');
    var slow = res.items.slice().sort(function (a, b) { return b.spent - a.spent; })[0];
    if (slow && slow.spent > 240 && !slow.isCorrect) tips.push('Question ' + slow.n + ' took ' + Math.round(slow.spent / 60) + ' minutes and was not correct. On contest day, flag a stubborn question and move on after about 3 minutes.');
    if (!tips.length) tips.push('Balanced result. Keep practising across all six modules and try to lift Part C.');
    return tips;
  }

  /* Save the finished contest into the app's global progress record. Works with AppState from the dashboard
     (recordGauss and save). Falls back to writing the same localStorage key directly. */
  function logAttempt(res, appState, extra) {
    var rec = Object.assign({
      at: Date.now(), score: res.score, max: res.max, seconds: res.seconds || 0,
      correct: res.correct, answered: res.answered, total: res.total, percent: res.percent,
      parts: {}, modules: {}
    }, extra || {});
    Object.keys(res.parts).forEach(function (k) { rec.parts[k] = { correct: res.parts[k].correct, total: res.parts[k].total, points: res.parts[k].points, max: res.parts[k].max }; });
    Object.keys(res.modules).forEach(function (k) { rec.modules[k] = { correct: res.modules[k].correct, total: res.modules[k].total }; });
    appState = appState || root.AppState;
    if (appState && typeof appState.recordGauss === 'function') {
      appState.recordGauss(rec);
      if (appState.data) { appState.data.attempted = (appState.data.attempted || 0) + rec.answered; appState.data.correct = (appState.data.correct || 0) + rec.correct; }
      if (typeof appState.save === 'function') appState.save();
      return { rec: rec, where: 'AppState' };
    }
    try {
      var raw = root.localStorage.getItem(APP_KEY), d = raw ? JSON.parse(raw) : {};
      d.gauss = d.gauss || []; d.gauss.push(rec); d.points = (d.points || 0) + Math.round(rec.score / 5);
      d.attempted = (d.attempted || 0) + rec.answered; d.correct = (d.correct || 0) + rec.correct;
      root.localStorage.setItem(APP_KEY, JSON.stringify(d));
      return { rec: rec, where: 'localStorage' };
    } catch (e) { return { rec: rec, where: 'none' }; }
  }

  // In progress contest survives a refresh. Only small descriptors are stored, questions are rebuilt from their seeds.
  function saveSession(s) { try { root.localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* storage blocked */ } }
  function loadSession() { try { var raw = root.localStorage.getItem(SESSION_KEY); if (!raw) return null; var s = JSON.parse(raw); return s && s.v === 1 && s.test && s.test.items && s.test.items.length === TOTAL_QUESTIONS ? s : null; } catch (e) { return null; } }
  function clearSession() { try { root.localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } }

  /* ==================================================================
     CONTEST SIMULATOR: STYLES
     Colours come from the dashboard CSS variables (--surface, --ink, --accent ...) with safe fallbacks.
  ================================================================== */
  var GS_CSS = [
    '.gs-root{color:var(--ink,#14213D);font-family:Figtree,system-ui,sans-serif;font-size:18px;line-height:1.55;max-width:1180px;margin:0 auto;padding:0 0 40px}',
    '.gs-root *{box-sizing:border-box}',
    '.gs-root h1,.gs-root h2,.gs-root h3{font-family:"Bricolage Grotesque",Figtree,system-ui,sans-serif;margin:0 0 8px;line-height:1.2}',
    ':where(.gs-root) button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}',
    '.gs-card{background:var(--surface,#fff);border:2px solid var(--line,#D6CEB8);border-radius:18px;padding:20px 22px;margin:16px 0}',
    '.gs-btn{min-height:52px;padding:10px 22px;border-radius:14px;border:2px solid var(--line,#D6CEB8);background:var(--surface,#fff);font-weight:700;color:var(--ink,#14213D);font-family:inherit;font-size:1rem;cursor:pointer}',
    '.gs-btn:hover{border-color:var(--accent,#2450E0)}',
    '.gs-primary{background:var(--accent,#2450E0);border-color:var(--accent,#2450E0);color:var(--accent-ink,#fff)}',
    '.gs-danger{border-color:var(--warn,#8A5A00);color:var(--warn,#8A5A00)}',
    '.gs-btn:focus-visible,.gs-opt:focus-visible,.gs-qn:focus-visible{outline:3px solid var(--accent,#2450E0);outline-offset:2px}',
    '.gs-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}',
    '.gs-muted{color:var(--muted,#4B5872)}',
    /* setup */
    '.gs-hero-title{font-size:clamp(1.9rem,5vw,2.8rem)}',
    '.gs-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:14px 0}',
    '.gs-rule{background:var(--surface2,#EEE7D6);border-radius:14px;padding:14px 16px}',
    '.gs-rule b{display:block;font-size:1.5em}',
    '.gs-table{width:100%;border-collapse:collapse}.gs-table th,.gs-table td{padding:10px 8px;text-align:left;border-bottom:1px solid var(--line,#D6CEB8)}',
    /* test */
    '.gs-bar{position:sticky;top:0;z-index:30;display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between;background:var(--surface,#fff);border:2px solid var(--line,#D6CEB8);border-radius:18px;padding:12px 18px;margin:8px 0 14px}',
    '.gs-timer{display:flex;flex-direction:column;align-items:flex-start;min-width:170px}',
    '.gs-tlabel{font-size:.8em;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#4B5872)}',
    '.gs-time{font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;font-weight:800;font-size:clamp(2.4rem,8vw,3.6rem);line-height:1;color:var(--accent,#2450E0)}',
    '.gs-timer.gs-warn .gs-time{color:var(--warn,#8A5A00)}.gs-timer.gs-danger .gs-time{color:#C0281B}',
    '.gs-timer.gs-danger{animation:gsPulse 1.2s ease-in-out infinite}@keyframes gsPulse{50%{opacity:.6}}@media (prefers-reduced-motion:reduce){.gs-timer.gs-danger{animation:none}}',
    '.gs-prog{font-weight:700}.gs-prog small{font-weight:500;color:var(--muted,#4B5872)}',
    '.gs-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start}',
    '@media (max-width:900px){.gs-layout{grid-template-columns:1fr}.gs-grid-col{order:2}}',
    '.gs-qhead{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-bottom:10px}',
    '.gs-chip{display:inline-block;padding:3px 12px;border-radius:99px;background:var(--surface2,#EEE7D6);font-weight:700;font-size:.85em}',
    '.gs-chip.gs-pts{background:var(--accent,#2450E0);color:var(--accent-ink,#fff)}',
    '.gs-qtext{font-size:1.2em;line-height:1.75;margin:6px 0 12px}',
    '.gs-opts{display:grid;gap:10px;margin:14px 0}',
    '.gs-opt{display:flex;gap:14px;align-items:center;text-align:left;width:100%;min-height:58px;padding:10px 14px;border-radius:14px;border:2px solid var(--line,#D6CEB8);background:var(--surface,#fff);font-size:1.1em}',
    '.gs-opt:hover{border-color:var(--accent,#2450E0)}',
    '.gs-opt .gs-let{flex:0 0 auto;width:38px;height:38px;border-radius:10px;background:var(--surface2,#EEE7D6);display:flex;align-items:center;justify-content:center;font-weight:800}',
    '.gs-opt.gs-sel{border-color:var(--accent,#2450E0);background:var(--surface2,#EEE7D6)}.gs-opt.gs-sel .gs-let{background:var(--accent,#2450E0);color:var(--accent-ink,#fff)}',
    '.gs-nav{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;margin-top:8px}',
    '.gs-flagbtn.gs-on{background:var(--warn,#8A5A00);border-color:var(--warn,#8A5A00);color:#fff}',
    '.gs-partnote{background:var(--surface2,#EEE7D6);border-radius:12px;padding:8px 14px;margin-bottom:10px;font-weight:600}',
    '.gs-grid-col h3{font-size:1rem;margin:12px 0 6px}',
    '.gs-qgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}',
    '.gs-qn{position:relative;min-height:52px;border-radius:12px;border:2px solid var(--line,#D6CEB8);background:var(--surface,#fff);font-weight:800;font-size:1.05em}',
    '.gs-qn.gs-ans{background:var(--accent,#2450E0);border-color:var(--accent,#2450E0);color:var(--accent-ink,#fff)}',
    '.gs-qn.gs-flag::after{content:"\\2691";position:absolute;top:1px;right:5px;font-size:.8em;color:var(--warn,#8A5A00)}',
    '.gs-qn.gs-ans.gs-flag::after{color:#FFD873}',
    '.gs-qn.gs-cur{outline:4px solid var(--ink,#14213D);outline-offset:1px}',
    '.gs-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.85em;margin-top:12px}.gs-legend i{display:inline-block;width:16px;height:16px;border-radius:5px;border:2px solid var(--line,#D6CEB8);vertical-align:-3px;margin-right:5px}',
    '.gs-legend i.a{background:var(--accent,#2450E0);border-color:var(--accent,#2450E0)}.gs-legend i.f{border-color:var(--warn,#8A5A00)}',
    '.gs-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:var(--ink,#14213D);color:var(--surface,#fff);padding:12px 20px;border-radius:14px;font-weight:700;z-index:60;max-width:92vw;display:none}',
    '.gs-toast.gs-show{display:block}',
    '.gs-overlay{position:fixed;inset:0;background:rgba(10,15,30,.55);z-index:80;display:flex;align-items:center;justify-content:center;padding:16px}',
    '.gs-modal{background:var(--surface,#fff);border-radius:20px;border:2px solid var(--line,#D6CEB8);max-width:520px;width:100%;padding:24px;max-height:90vh;overflow:auto}',
    /* results */
    '.gs-heroscore{display:flex;flex-wrap:wrap;gap:22px;align-items:center}',
    '.gs-ring{width:150px;height:150px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.gs-ring div{width:114px;height:114px;border-radius:50%;background:var(--surface,#fff);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:1.7rem;line-height:1.1}',
    '.gs-ring small{font-size:.5em;font-weight:600;color:var(--muted,#4B5872)}',
    '.gs-big{font-size:clamp(2.2rem,7vw,3.4rem);font-weight:800;line-height:1}',
    '.gs-bars{display:grid;gap:10px}.gs-barrow{display:grid;grid-template-columns:minmax(120px,1.2fr) 3fr auto;gap:10px;align-items:center}',
    '@media (max-width:600px){.gs-barrow{grid-template-columns:1fr;gap:4px}}',
    '.gs-track{height:16px;border-radius:99px;background:var(--surface2,#EEE7D6);overflow:hidden}.gs-fill{height:100%;background:var(--accent,#2450E0);border-radius:99px}',
    '.gs-fill.gs-lo{background:var(--warn,#8A5A00)}',
    '.gs-tips{margin:0;padding-left:1.3em}.gs-tips li{margin:6px 0}',
    '.gs-filters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.gs-filters .gs-btn{min-height:44px;padding:6px 16px}.gs-filters .gs-btn.gs-on{background:var(--accent,#2450E0);color:var(--accent-ink,#fff);border-color:var(--accent,#2450E0)}',
    '.gs-rev{border:2px solid var(--line,#D6CEB8);border-radius:16px;padding:14px 18px;margin:12px 0;background:var(--surface,#fff)}',
    '.gs-rev.gs-ok{border-left:8px solid var(--ok,#0B7A53)}.gs-rev.gs-bad{border-left:8px solid #C0281B}.gs-rev.gs-blank{border-left:8px solid var(--warn,#8A5A00)}',
    '.gs-ropts{list-style:none;margin:10px 0;padding:0;display:grid;gap:6px}',
    '.gs-ropts li{padding:8px 12px;border-radius:10px;border:2px solid var(--line,#D6CEB8);display:flex;gap:10px}',
    '.gs-ropts li b{min-width:1.4em}.gs-ropts li.gs-good{border-color:var(--ok,#0B7A53);background:rgba(11,122,83,.12)}.gs-ropts li.gs-wrong{border-color:#C0281B;background:rgba(192,40,27,.10)}',
    '.gs-rev summary{cursor:pointer;font-weight:700;padding:8px 0}',
    '.gs-sr{position:absolute;left:-9999px}'
  ].join('\n');
  function injectGsCss() {
    if (typeof document === 'undefined' || document.getElementById('gs-styles')) return;
    var st = document.createElement('style'); st.id = 'gs-styles'; st.textContent = GS_CSS; (document.head || document.documentElement).appendChild(st);
  }

  /* ==================================================================
     CONTEST SIMULATOR: USER INTERFACE
  ================================================================== */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function dur(sec) { sec = Math.round(sec); var m = Math.floor(sec / 60), s = sec % 60; return m + ' min ' + s + ' s'; }
  var LET = 'ABCDE';

  /* Mount the simulator in a container element (or CSS selector).
     opts: { appState: window.AppState, onExit: function () {} , onFinish: function (result, record) {} } */
  function mount(container, opts) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) throw new Error('GaussSimulator.mount: container not found');
    opts = opts || {}; injectGsCss();
    var appState = opts.appState || root.AppState, titles = moduleTitles();
    var S = { phase: 'setup', test: null, answers: {}, flags: {}, cur: 1, deadline: 0, startedAt: 0, spent: {}, enteredAt: 0, result: null, modal: false, filter: 'all', warned: {}, saved: null, notice: '' };
    var timer = null, toastTimer = null;

    function history() { return (appState && appState.data && appState.data.gauss) ? appState.data.gauss : []; }
    function persist() { if (S.phase === 'test') saveSession({ v: 1, test: describe(S.test), answers: S.answers, flags: S.flags, cur: S.cur, deadline: S.deadline, startedAt: S.startedAt, spent: S.spent }); }
    function commitTime() { var now = Date.now(); if (S.phase === 'test' && S.enteredAt) S.spent[S.cur] = (S.spent[S.cur] || 0) + (now - S.enteredAt) / 1000; S.enteredAt = now; }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function startTimer() { stopTimer(); timer = setInterval(tick, 250); tick(); }
    function toast(msg) { var el = container.querySelector('#gs-toast'); if (!el) return; el.textContent = msg; el.classList.add('gs-show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('gs-show'); }, 6000); }

    function tick() {
      if (S.phase !== 'test') return;
      var rem = Math.ceil((S.deadline - Date.now()) / 1000), el = container.querySelector('#gs-time'), box = container.querySelector('#gs-timer');
      if (el) el.textContent = mmss(rem);
      if (box) { box.classList.toggle('gs-warn', rem <= 600 && rem > 300); box.classList.toggle('gs-danger', rem <= 300); }
      [[600, '10 minutes left.'], [300, '5 minutes left. Make sure every question has an answer.'], [60, 'Last minute. Choose an answer for every open question now.']].forEach(function (w) { if (rem <= w[0] && rem > 0 && !S.warned[w[0]]) { S.warned[w[0]] = true; toast(w[1]); } });
      if (rem <= 0) finish(true);
    }

    /* ---------- actions ---------- */
    function start() {
      S.test = assemble(); S.answers = {}; S.flags = {}; S.cur = 1; S.spent = {}; S.warned = {}; S.notice = ''; S.startedAt = Date.now(); S.deadline = S.startedAt + CONTEST_SECONDS * 1000; S.enteredAt = S.startedAt; S.phase = 'test'; S.modal = false;
      persist(); render(); startTimer();
    }
    function resume(saved) {
      S.test = rebuildTest(saved.test); S.answers = saved.answers || {}; S.flags = saved.flags || {}; S.cur = saved.cur || 1; S.spent = saved.spent || {}; S.startedAt = saved.startedAt; S.deadline = saved.deadline; S.enteredAt = Date.now(); S.warned = {}; S.phase = 'test'; S.modal = false;
      if (Date.now() >= S.deadline) { S.notice = 'Time ran out while you were away, so your contest was submitted automatically.'; finish(true); return; }
      render(); startTimer();
    }
    function go(n) { if (n < 1 || n > TOTAL_QUESTIONS) return; commitTime(); S.cur = n; persist(); render(); var qc = container.querySelector('.gs-qcard'); if (qc && qc.getBoundingClientRect().top < 0) qc.scrollIntoView({ block: 'start' }); }
    function choose(i) { S.answers[S.cur] = (S.answers[S.cur] === i) ? undefined : i; if (S.answers[S.cur] === undefined) delete S.answers[S.cur]; persist(); render(); }
    function toggleFlag() { if (S.flags[S.cur]) delete S.flags[S.cur]; else S.flags[S.cur] = true; persist(); render(); }
    function finish(auto) {
      if (S.phase !== 'test') return;
      commitTime(); stopTimer();
      var seconds = Math.min(CONTEST_SECONDS, Math.round((Math.min(Date.now(), S.deadline) - S.startedAt) / 1000));
      var res = score(S.test, S.answers, S.spent, S.flags); res.seconds = seconds; res.auto = !!auto;
      var out = logAttempt(res, appState, { auto: !!auto, id: S.test.id });
      S.result = res; S.saved = out; S.phase = 'result'; S.modal = false; S.filter = 'all'; clearSession(); render(); window.scrollTo && window.scrollTo(0, 0);
      if (typeof opts.onFinish === 'function') { try { opts.onFinish(res, out.rec); } catch (e) { /* host callback failed */ } }
    }
    function exit() { stopTimer(); if (typeof opts.onExit === 'function') opts.onExit(); else { S.phase = 'setup'; S.notice = ''; render(); } }

    /* ---------- views ---------- */
    function setupHTML() {
      var saved = loadSession(), h = history(), best = h.length ? Math.max.apply(null, h.map(function (g) { return g.score; })) : null, resumeCard = '';
      if (saved && saved.deadline > Date.now()) resumeCard = '<section class="gs-card" style="border-color:var(--accent,#2450E0)"><h2>Contest in progress</h2><p>You have a contest with <b>' + mmss((saved.deadline - Date.now()) / 1000) + '</b> left and ' + Object.keys(saved.answers || {}).length + ' of 25 answered.</p><div class="gs-row"><button class="gs-btn gs-primary" data-act="resume">Resume contest</button><button class="gs-btn gs-danger" data-act="discard">Discard it</button></div></section>';
      var rows = h.slice().reverse().slice(0, 6).map(function (g) { return '<tr><td>' + new Date(g.at).toLocaleDateString() + '</td><td><b>' + g.score + '</b> / ' + g.max + '</td><td>' + (g.correct !== undefined ? g.correct + ' of ' + (g.total || 25) : '') + '</td><td>' + Math.round(g.seconds / 60) + ' min</td></tr>'; }).join('');
      return '<div class="gs-root gs-setup"><section class="gs-card"><h1 class="gs-hero-title">Gauss Contest Simulator</h1><p class="gs-muted">A full length practice contest with fresh questions from all six modules every time.</p>' +
        '<div class="gs-rules"><div class="gs-rule"><b>25</b>questions</div><div class="gs-rule"><b>60 min</b>one countdown clock</div><div class="gs-rule"><b>Part A</b>10 easy questions, 5 points each</div><div class="gs-rule"><b>Part B</b>10 medium questions, 6 points each</div><div class="gs-rule"><b>Part C</b>5 hard non routine questions, 8 points each</div><div class="gs-rule"><b>150</b>points in total</div></div>' +
        '<ul class="gs-tips"><li>Each question has five choices, A to E. A wrong answer costs nothing, so never leave a blank.</li><li>Flag any question to come back to it. Use the number grid to jump around.</li><li>Your answers are saved as you go. If you close the page, the clock keeps running.</li><li>Solutions appear only after you submit.</li></ul>' +
        (S.notice ? '<p><b>' + esc(S.notice) + '</b></p>' : '') +
        '<div class="gs-row" style="margin-top:14px"><button class="gs-btn gs-primary" data-act="start" style="font-size:1.15em;min-height:60px">Start the contest</button></div></section>' + resumeCard +
        '<section class="gs-card"><h2>Your history</h2>' + (h.length ? '<p>Best score: <b>' + best + ' / ' + h[0].max + '</b></p><table class="gs-table"><thead><tr><th>Date</th><th>Score</th><th>Correct</th><th>Time</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="gs-muted">No contests yet. Your scores will be saved here.</p>') + '</section></div>';
    }

    function testHTML() {
      var it = S.test.items[S.cur - 1], q = it.q, part = PARTS.filter(function (p) { return p.id === it.part; })[0], answered = Object.keys(S.answers).length, flagged = Object.keys(S.flags).length, sel = S.answers[S.cur];
      var grid = PARTS.map(function (p) {
        var btns = S.test.items.filter(function (i) { return i.part === p.id; }).map(function (i) {
          var cls = 'gs-qn' + (S.answers[i.n] !== undefined ? ' gs-ans' : '') + (S.flags[i.n] ? ' gs-flag' : '') + (i.n === S.cur ? ' gs-cur' : '');
          return '<button class="' + cls + '" data-act="go" data-n="' + i.n + '" aria-label="Question ' + i.n + ', ' + (S.answers[i.n] !== undefined ? 'answered' : 'not answered') + (S.flags[i.n] ? ', flagged' : '') + (i.n === S.cur ? ', current' : '') + '"' + (i.n === S.cur ? ' aria-current="true"' : '') + '>' + i.n + '</button>';
        }).join('');
        return '<h3>' + p.label + ' (' + p.blurb + ', ' + p.points + ' points each)</h3><div class="gs-qgrid">' + btns + '</div>';
      }).join('');
      var opts2 = q.optionsHtml.map(function (o, i) { return '<button class="gs-opt' + (sel === i ? ' gs-sel' : '') + '" data-act="choose" data-i="' + i + '" aria-pressed="' + (sel === i) + '"><span class="gs-let">' + LET[i] + '</span><span>' + o + '</span></button>'; }).join('');
      var note = (S.cur === 1 || S.test.items[S.cur - 2].part !== it.part) ? '<div class="gs-partnote">' + part.label + ': ' + part.blurb + ' questions, ' + part.points + ' points each.</div>' : '';
      return '<div class="gs-root gs-test"><div class="gs-bar"><div class="gs-timer" id="gs-timer" role="timer" aria-label="Time remaining"><span class="gs-tlabel">Time left</span><span class="gs-time" id="gs-time">' + mmss((S.deadline - Date.now()) / 1000) + '</span></div>' +
        '<div class="gs-prog"><b>' + answered + '</b> of 25 answered<br><small>' + flagged + ' flagged</small></div><button class="gs-btn gs-primary" data-act="submit">Submit contest</button></div>' +
        '<div class="gs-layout"><main><section class="gs-card gs-qcard" style="margin-top:0">' + note + '<div class="gs-qhead"><h2 style="margin:0">Question ' + S.cur + ' of 25</h2><span class="gs-chip">' + part.label + '</span><span class="gs-chip gs-pts">' + it.points + ' points</span></div>' +
        '<div class="gs-qtext">' + q.questionHtml + '</div>' + q.visualHtml + '<div class="gs-opts" role="group" aria-label="Answer choices">' + opts2 + '</div>' +
        '<div class="gs-nav"><button class="gs-btn" data-act="prev"' + (S.cur === 1 ? ' disabled' : '') + '>Previous</button><button class="gs-btn gs-flagbtn' + (S.flags[S.cur] ? ' gs-on' : '') + '" data-act="flag" aria-pressed="' + !!S.flags[S.cur] + '">' + (S.flags[S.cur] ? 'Flagged for review' : 'Flag for review') + '</button>' + (sel !== undefined ? '<button class="gs-btn" data-act="clear">Clear answer</button>' : '') + '<button class="gs-btn gs-primary" data-act="next"' + (S.cur === TOTAL_QUESTIONS ? ' disabled' : '') + '>Next</button></div>' +
        '<p class="gs-muted" style="margin:12px 0 0;font-size:.85em">Keys: A to E choose, arrows move, F flags.</p></section></main>' +
        '<aside class="gs-grid-col"><section class="gs-card" style="margin-top:0"><h2 style="font-size:1.1rem">Question grid</h2>' + grid + '<div class="gs-legend"><span><i class="a"></i>Answered</span><span><i></i>Not answered</span><span><i class="f"></i>Flagged</span></div></section></aside></div>' +
        (S.modal ? submitModalHTML() : '') + '<div class="gs-toast" id="gs-toast" role="status" aria-live="polite"></div></div>';
    }
    function submitModalHTML() {
      var blank = S.test.items.filter(function (i) { return S.answers[i.n] === undefined; }).map(function (i) { return i.n; }), fl = Object.keys(S.flags).map(Number).sort(function (a, b) { return a - b; });
      return '<div class="gs-overlay" role="dialog" aria-modal="true" aria-labelledby="gs-mt"><div class="gs-modal"><h2 id="gs-mt">Submit your contest?</h2><p>You have answered <b>' + (25 - blank.length) + ' of 25</b> questions and have <b>' + mmss((S.deadline - Date.now()) / 1000) + '</b> left.</p>' +
        (blank.length ? '<p><b>Not answered:</b> ' + blank.join(', ') + '. There is no penalty for a wrong answer, so it is worth guessing.</p>' : '<p>Every question has an answer.</p>') + (fl.length ? '<p><b>Flagged:</b> ' + fl.join(', ') + '.</p>' : '') +
        '<div class="gs-row"><button class="gs-btn" data-act="cancel">Keep working</button><button class="gs-btn gs-primary" data-act="confirm">Submit and see my score</button></div></div></div>';
    }

    function resultHTML() {
      var R = S.result, pct = R.percent, deg = Math.round(3.6 * pct), tips = coaching(R, titles), hist = history();
      var msg = pct >= 90 ? 'Outstanding. That is contest winning form.' : pct >= 75 ? 'A strong result. Polish the last few points in Part B and C.' : pct >= 60 ? 'A solid result with clear room to grow.' : pct >= 40 ? 'You are building the skills. Focus on Part A accuracy first.' : 'A good start. Every contest you take makes the next one easier.';
      var partRows = PARTS.map(function (p) { var P = R.parts[p.id], w = P.max ? Math.round(100 * P.points / P.max) : 0; return '<div class="gs-barrow"><div><b>' + p.label + '</b> <span class="gs-muted">(' + p.blurb + ')</span></div><div class="gs-track"><div class="gs-fill' + (w < 50 ? ' gs-lo' : '') + '" style="width:' + w + '%"></div></div><div><b>' + P.points + '</b> / ' + P.max + ' points, ' + P.correct + ' of ' + P.total + ' correct</div></div>'; }).join('');
      var modRows = Object.keys(R.modules).sort().map(function (id) { var M = R.modules[id], w = M.total ? Math.round(100 * M.correct / M.total) : 0; return '<div class="gs-barrow"><div><b>Module ' + id.slice(1) + '</b><br><span class="gs-muted" style="font-size:.85em">' + esc(titles[id] || '') + '</span></div><div class="gs-track"><div class="gs-fill' + (w < 50 ? ' gs-lo' : '') + '" style="width:' + w + '%"></div></div><div><b>' + M.correct + '</b> of ' + M.total + '</div></div>'; }).join('');
      var slow = R.items.slice().sort(function (a, b) { return b.spent - a.spent; }).slice(0, 3).filter(function (i) { return i.spent > 0; });
      var timeHTML = '<p>You used <b>' + dur(R.seconds) + '</b> of 60 minutes' + (R.auto ? ' (the clock ran out)' : '') + '.</p><p class="gs-muted">Average time per question: ' + PARTS.map(function (p) { var P = R.parts[p.id]; return p.label + ' ' + Math.round(P.seconds / P.total) + ' s'; }).join(', ') + '.</p>' + (slow.length ? '<p>Slowest questions: ' + slow.map(function (i) { return '<a href="#gs-rev-' + i.n + '" data-act="jump" data-n="' + i.n + '">Question ' + i.n + '</a> (' + dur(i.spent) + ', ' + (i.isCorrect ? 'correct' : i.answered ? 'wrong' : 'blank') + ')'; }).join(', ') + '.</p>' : '');
      var hrows = hist.slice().reverse().slice(0, 5).map(function (g, k) { return '<tr' + (k === 0 ? ' style="font-weight:800"' : '') + '><td>' + new Date(g.at).toLocaleDateString() + '</td><td>' + g.score + ' / ' + g.max + '</td><td>' + Math.round(g.seconds / 60) + ' min</td></tr>'; }).join('');
      var best = hist.length ? Math.max.apply(null, hist.map(function (g) { return g.score; })) : R.score;
      var items = S.test.items.filter(function (it) { var r = R.items[it.n - 1]; return S.filter === 'all' || (S.filter === 'wrong' && r.answered && !r.isCorrect) || (S.filter === 'blank' && !r.answered) || (S.filter === 'flagged' && r.flagged); }).map(function (it) {
        var r = R.items[it.n - 1], q = it.q, cls = r.isCorrect ? 'gs-ok' : r.answered ? 'gs-bad' : 'gs-blank';
        var ol = q.optionsHtml.map(function (o, i) { return '<li class="' + (i === q.correctIndex ? 'gs-good' : (i === r.chosen ? 'gs-wrong' : '')) + '"><b>' + LET[i] + '</b><span>' + o + (i === q.correctIndex ? ' (correct)' : '') + (i === r.chosen && i !== q.correctIndex ? ' (your answer)' : (i === r.chosen ? ' (your answer)' : '')) + '</span></li>'; }).join('');
        return '<article class="gs-rev ' + cls + '" id="gs-rev-' + it.n + '"><div class="gs-qhead"><h3 style="margin:0">Question ' + it.n + '</h3><span class="gs-chip">' + it.part + '</span><span class="gs-chip">' + (r.isCorrect ? it.points + ' of ' + it.points + ' points' : '0 of ' + it.points + ' points') + '</span><span class="gs-chip">Module ' + it.moduleId.slice(1) + '</span><span class="gs-chip">' + r.spent + ' s</span>' + (r.flagged ? '<span class="gs-chip">Flagged</span>' : '') + '</div><div class="gs-qtext">' + q.questionHtml + '</div>' + q.visualHtml + '<ul class="gs-ropts">' + ol + '</ul>' + (r.answered ? '' : '<p><b>You left this blank.</b></p>') + '<details' + (r.isCorrect ? '' : ' open') + '><summary>Step by step solution</summary>' + q.solutionHtml + '<p><b>Answer: ' + esc(q.correctAnswer) + '</b></p></details></article>';
      }).join('') || '<p class="gs-muted">Nothing in this group.</p>';
      var fb = function (id, label) { return '<button class="gs-btn' + (S.filter === id ? ' gs-on' : '') + '" data-act="filter" data-f="' + id + '">' + label + '</button>'; };
      return '<div class="gs-root gs-result"><section class="gs-card"><div class="gs-heroscore"><div class="gs-ring" style="background:conic-gradient(var(--accent,#2450E0) ' + deg + 'deg,var(--line,#D6CEB8) 0)"><div>' + Math.round(pct) + '%<small>score</small></div></div><div><h1 style="margin-bottom:4px">Contest complete</h1><div class="gs-big">' + R.score + ' <span class="gs-muted" style="font-size:.5em">out of ' + R.max + '</span></div><p style="margin:8px 0">' + R.correct + ' of ' + R.total + ' correct, ' + R.answered + ' answered.</p><p style="margin:0"><b>' + msg + '</b></p>' + (S.notice ? '<p><b>' + esc(S.notice) + '</b></p>' : '') + '</div></div>' +
        '<div class="gs-row" style="margin-top:14px"><button class="gs-btn gs-primary" data-act="start">Take another contest</button><button class="gs-btn" data-act="exit">Back to dashboard</button></div>' +
        '<p class="gs-muted" style="margin:10px 0 0">' + (S.saved && S.saved.where !== 'none' ? 'Saved to your progress.' : 'Your browser blocked saving, so this score was not stored.') + '</p></section>' +
        '<section class="gs-card"><h2>Score by part</h2><div class="gs-bars">' + partRows + '</div></section>' +
        '<section class="gs-card"><h2>Accuracy by module</h2><div class="gs-bars">' + modRows + '</div></section>' +
        '<section class="gs-card"><h2>Time</h2>' + timeHTML + '</section>' +
        '<section class="gs-card"><h2>What to work on</h2><ul class="gs-tips">' + tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>' +
        (hist.length ? '<section class="gs-card"><h2>Recent contests</h2><p>Best score so far: <b>' + best + ' / ' + R.max + '</b></p><table class="gs-table"><thead><tr><th>Date</th><th>Score</th><th>Time</th></tr></thead><tbody>' + hrows + '</tbody></table></section>' : '') +
        '<section class="gs-card"><h2>Review every question</h2><div class="gs-filters">' + fb('all', 'All 25') + fb('wrong', 'Wrong (' + R.items.filter(function (i) { return i.answered && !i.isCorrect; }).length + ')') + fb('blank', 'Blank (' + R.items.filter(function (i) { return !i.answered; }).length + ')') + fb('flagged', 'Flagged (' + R.items.filter(function (i) { return i.flagged; }).length + ')') + '</div>' + items + '</section></div>';
    }

    function render() {
      container.innerHTML = S.phase === 'test' ? testHTML() : S.phase === 'result' ? resultHTML() : setupHTML();
      if (S.phase === 'test') tick();
    }

    /* ---------- events ---------- */
    function onClick(e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null; if (!t || !container.contains(t)) return;
      var a = t.getAttribute('data-act');
      if (a === 'start') { if (S.phase === 'result' || S.phase === 'setup') { clearSession(); start(); } }
      else if (a === 'resume') { var s = loadSession(); if (s) resume(s); }
      else if (a === 'discard') { clearSession(); render(); }
      else if (a === 'go') go(+t.getAttribute('data-n'));
      else if (a === 'choose') choose(+t.getAttribute('data-i'));
      else if (a === 'clear') { delete S.answers[S.cur]; persist(); render(); }
      else if (a === 'flag') toggleFlag();
      else if (a === 'prev') go(S.cur - 1);
      else if (a === 'next') go(S.cur + 1);
      else if (a === 'submit') { commitTime(); S.modal = true; render(); }
      else if (a === 'cancel') { S.modal = false; S.enteredAt = Date.now(); render(); }
      else if (a === 'confirm') finish(false);
      else if (a === 'filter') { S.filter = t.getAttribute('data-f'); render(); }
      else if (a === 'jump') { S.filter = 'all'; render(); var el = container.querySelector('#gs-rev-' + t.getAttribute('data-n')); if (el) el.scrollIntoView({ block: 'start' }); e.preventDefault(); }
      else if (a === 'exit') exit();
    }
    function onKey(e) {
      if (S.phase !== 'test' || S.modal) return; var tag = (e.target && e.target.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key; if (/^[a-eA-E]$/.test(k)) { choose(LET.indexOf(k.toUpperCase())); e.preventDefault(); }
      else if (k === 'ArrowRight') { go(S.cur + 1); e.preventDefault(); } else if (k === 'ArrowLeft') { go(S.cur - 1); e.preventDefault(); }
      else if (k === 'f' || k === 'F') { toggleFlag(); e.preventDefault(); }
    }
    container.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);

    // If a saved contest has already run out of time, grade it straight away.
    var pending = loadSession();
    if (pending && pending.deadline <= Date.now()) resume(pending); else render();

    return {
      start: start, destroy: function () { stopTimer(); container.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); container.innerHTML = ''; },
      getState: function () { return S; }
    };
  }

  /* ==================================================================
     SELF TEST AND PUBLIC API
  ================================================================== */
  // Checks the contest engine. Returns { ok, runs, failures[] }. Run in the console: GaussSimulator.selfTest(5)
  function selfTest(runs) {
    runs = runs || 3; var fails = [], mods = availableModules();
    function need(c, msg) { if (!c) fails.push(msg); }
    for (var r = 0; r < runs; r++) {
      var t;
      try { t = assemble({ seed: 1000 + r }); } catch (e) { fails.push('assemble threw: ' + e.message); continue; }
      need(t.items.length === TOTAL_QUESTIONS, 'wrong question count');
      need(t.totalPoints === TOTAL_POINTS, 'wrong total points ' + t.totalPoints);
      PARTS.forEach(function (p) {
        var its = t.items.filter(function (i) { return i.part === p.id; });
        need(its.length === p.count, p.id + ' count ' + its.length);
        need(its.every(function (i) { return i.points === p.points && i.tier === p.tier; }), p.id + ' points or tier');
        if (p.count >= mods.length) mods.forEach(function (m) { need(its.some(function (i) { return i.moduleId === m; }), p.id + ' missing ' + m); });
      });
      need(t.items.filter(function (i) { return i.part === 'C'; }).some(function (i) { return i.moduleId === 'm6'; }), 'Part C has no Module 6');
      var seen = {};
      t.items.forEach(function (i) { need(i.q.options.length === 5, 'Q' + i.n + ' not 5 options'); need(!seen[i.q.questionText], 'Q' + i.n + ' duplicate'); seen[i.q.questionText] = 1; need(i.q.correctIndex >= 0 && i.q.correctIndex < 5, 'Q' + i.n + ' bad correctIndex'); });
      var all = {}, wrong = {}, half = {}, expect = 0;
      t.items.forEach(function (i) { all[i.n] = i.q.correctIndex; wrong[i.n] = (i.q.correctIndex + 1) % 5; if (i.n % 2) { half[i.n] = i.q.correctIndex; expect += i.points; } });
      need(score(t, all).score === TOTAL_POINTS, 'all correct not 150');
      need(score(t, wrong).score === 0, 'all wrong not 0');
      need(score(t, {}).answered === 0, 'blank answered');
      need(score(t, half).score === expect, 'partial mismatch');
      var saved = JSON.parse(JSON.stringify(describe(t))), t2 = rebuildTest(saved);
      need(t2.items.every(function (i, k) { return i.q.questionText === t.items[k].q.questionText && i.q.correctIndex === t.items[k].q.correctIndex; }), 'rebuild differs');
      var res = score(t, half, {}, {}); res.seconds = 1800;
      need(coaching(res, moduleTitles()).length > 0, 'no coaching');
    }
    return { ok: fails.length === 0, runs: runs, failures: fails };
  }

  root.GaussSimulator = {
    version: '1.0.0',
    mount: mount, assemble: assemble, rebuild: rebuild, rebuildTest: rebuildTest, describe: describe,
    score: score, coaching: coaching, logAttempt: logAttempt,
    listAttempts: function (appState) { appState = appState || root.AppState; return appState && appState.data && appState.data.gauss ? appState.data.gauss.slice() : []; },
    hasSavedSession: function () { return !!loadSession(); }, clearSession: clearSession,
    PARTS: PARTS, CONTEST_SECONDS: CONTEST_SECONDS, TOTAL_QUESTIONS: TOTAL_QUESTIONS, TOTAL_POINTS: TOTAL_POINTS,
    selfTest: selfTest
  };
})(typeof window !== 'undefined' ? window : globalThis);
