/*!
 * modules4and5.js  v1.0.0
 * Extension for mathEngine.js (v1.1.0 or newer).
 * Adds Module 4 (Spatial Sense, Geometry & Measurement) and
 * Module 5 (Data Literacy, Permutations & Probability).
 *
 * Load order in index.html:
 *   <script src="mathEngine.js"></script>
 *   <script src="modules2and3.js"></script>   (optional, independent of this file)
 *   <script src="modules4and5.js"></script>
 *
 * Topic ids:
 *   m4t0 Pythagorean theorem            m5t0 mean, median, mode
 *   m4t1 3D solids and space diagonals  m5t1 fundamental counting rule
 *   m4t2 composite shapes and scaling   m5t2 permutations and combinations
 *   m4t3 angles, parallel lines, polygons  m5t3 grid path counting
 *   m4t4 shaded areas                   m5t4 probability, with and without replacement
 *
 * Answers that involve pi are written exactly, for example "64 − 16π", and are
 * always multiple choice (the engine adds the options automatically).
 */
(function (root) {
  'use strict';
  var E = root.MathEngine;
  if (!E || !E.registerModule || !E.moduleOfTopic) {
    throw new Error('modules4and5.js: load mathEngine.js (v1.1.0 or newer) before this file.');
  }
  var gcd = E.math.gcd, lcm = E.math.lcm, fmt = E.format.fmt, V = E.visuals, MINUS = '−';

  /* ------------------------------------------------------------------
     Helpers (same spec shape as the engine and modules2and3.js)
  ------------------------------------------------------------------ */
  function fr(n, d) { return '{{' + n + '|' + d + '}}'; }
  function Fq(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  function fstr(f) { return f.d === 1 ? fmt(f.n) : (f.n < 0 ? MINUS : '') + Math.abs(f.n) + '/' + f.d; }
  function fmk(f) { return f.d === 1 ? fmt(f.n) : (f.n < 0 ? MINUS : '') + '{{' + Math.abs(f.n) + '|' + f.d + '}}'; }
  function rd(x, dp) { var p = Math.pow(10, dp); return Math.round(x * p) / p; }
  function nf(v, dp, trim) { var s = rd(v, dp).toFixed(dp); if (trim && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s.replace('-', MINUS); }
  function tidy(s) { return String(s).replace(/-/g, MINUS).replace(/\+ −(?=\d)/g, '− ').replace(/− −(?=\d)/g, '+ ').replace(/(^|[^\d\w.])1(?=[a-z](?![a-z])|\()/g, '$1'); }
  function tidyAll(a) { return a.map(tidy); }
  function I(q, steps, value, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: fmt(value), kind: 'int', value: value }, extra || {}); }
  function FR(q, steps, f, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: fstr(f), kind: 'frac', value: f }, extra || {}); }
  function TX(q, steps, ans, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: ans, kind: 'text' }, extra || {}); }
  function D(q, steps, value, dp, trim, wrong, extra) {
    var v = rd(value, dp), ans = nf(v, dp, trim), list = [], seen = {}; seen[ans] = 1;
    function add(x) { if (x == null || !isFinite(x)) return; x = rd(x, dp); if (v > 0 && x <= 0) return; var s = nf(x, dp, trim); if (!seen[s]) { seen[s] = 1; list.push(s); } }
    (wrong || []).forEach(add);
    [1.1, 0.9, 1.25, 0.8, 1.5, 0.5, 2, 1.05, 0.95].forEach(function (k) { add(v * k); });
    var unit = Math.max(Math.abs(v) * 0.02, Math.pow(10, -dp)); for (var i = 1; i <= 8; i++) add(v + unit * i);
    var sp = Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: ans, kind: 'dec', value: v, wrong: list }, extra || {}); if (typeof sp.check === 'number') sp.check = rd(sp.check, dp); return sp;
  }
  function fact(n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
  function Pm(n, k) { var r = 1; for (var i = 0; i < k; i++) r *= n - i; return r; }
  function C(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
  function nz(r, lo, hi) { var v; do { v = r.int(lo, hi); } while (v === 0); return v; }
  function ord(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }

  // Exact answers with pi.  pie(c, k) writes c + kπ.
  function pi(k) { return k === 1 ? 'π' : k + 'π'; }
  function pie(c, k) {
    if (k === 0) return fmt(c);
    if (c === 0) return k < 0 ? MINUS + pi(-k) : pi(k);
    if (k > 0 && c < 0) return pi(k) + ' ' + MINUS + ' ' + fmt(-c);
    if (k > 0) return fmt(c) + ' + ' + pi(k);
    return fmt(c) + ' ' + MINUS + ' ' + pi(-k);
  }
  // Multiple choice spec for a pi answer. wrong = [[c, k], ...] common mistakes.
  function PI(q, steps, c, k, wrong, extra) {
    var ans = pie(c, k), list = [], seen = {}; seen[ans] = 1;
    function add(cc, kk) { if (cc === 0 && kk === 0) return; var s = pie(cc, kk); if (!seen[s]) { seen[s] = 1; list.push(s); } }
    (wrong || []).forEach(function (w) { add(w[0], w[1]); });
    var step = Math.max(1, Math.round(Math.abs(k) / 2));
    for (var i = 1; list.length < 5 && i < 40; i++) { add(c, k + (i % 2 ? i : -i) * step); if (list.length < 5) add(c + i * Math.max(1, Math.round(Math.abs(c) / 8)), k); }
    return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: ans, kind: 'text', options: list.slice(0, 4).concat([ans]), check: ans }, extra || {});
  }
  function shuffleOpts(spec, r) { spec.options = r.shuffle(spec.options); return spec; }

  /* ------------------------------------------------------------------
     Visuals added to MathEngine.visuals. Colors come from the engine CSS
     classes, so they follow the light and dark theme. Lessons can use them
     with lines such as   :::visual box3d 3 4 12 1
  ------------------------------------------------------------------ */
  (function () {
    var uid = 0;
    function svg(w, h, label, inner) { return '<svg class="me-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>'; }
    function fig(inner, cap) { return '<figure class="me-fig">' + inner + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>'; }
    function ln(x1, y1, x2, y2, c) { return '<line class="' + (c || 'me-ln') + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>'; }
    function tx(x, y, t, c, a) { return '<text class="' + (c || 'me-tx') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (a || 'middle') + '">' + t + '</text>'; }
    function poly(pts, c) { return '<polygon class="' + c + '" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>'; }
    var extra = '.me-sh{fill:var(--accent,#2450E0);fill-opacity:.45;stroke:var(--ink,#14213D);stroke-width:1.6}.me-ol{fill:none;stroke:var(--ink,#14213D);stroke-width:1.6}.me-ds{stroke-dasharray:6 4}';
    if (typeof document !== 'undefined' && !document.getElementById('me-styles4')) { var st = document.createElement('style'); st.id = 'me-styles4'; st.textContent = extra; (document.head || document.documentElement).appendChild(st); }

    // Right triangle with edge labels. Optional drawn leg sizes.
    V.rightTriangle = function (a, b, c, da, db) {
      var x0 = 30, y0 = 130, W = da && db ? da : 4, H = da && db ? db : 3, k = Math.min(200 / W, 100 / H), w = W * k, h = H * k;
      y0 = 20 + h + 10;
      var g = poly([[x0, y0], [x0 + w, y0], [x0, y0 - h]], 'me-sh') + '<rect class="me-ol" x="' + x0 + '" y="' + (y0 - 12) + '" width="12" height="12"/>';
      g += tx(x0 + w / 2, y0 + 20, String(a), 'me-tx me-bold') + tx(x0 - 10, y0 - h / 2 + 5, String(b), 'me-tx me-bold', 'end') + tx(x0 + w / 2 + 14, y0 - h / 2 - 6, String(c), 'me-tx me-bold', 'start');
      return fig(svg(x0 + w + 60, y0 + 30, 'Right triangle', g));
    };

    // Isometric box with optional space diagonal.
    V.box3d = function (l, w, h, diag) {
      var s = 95 / Math.max(l, w, h), c30 = 0.866, ox = 12 + w * s * c30, oy = 12 + h * s;
      function P(X, Y, Z) { return [ox + (X - Y) * c30 * s, oy + (X + Y) * 0.5 * s - Z * s]; }
      var g = poly([P(0, 0, h), P(l, 0, h), P(l, w, h), P(0, w, h)], 'me-fa') + poly([P(l, 0, 0), P(l, w, 0), P(l, w, h), P(l, 0, h)], 'me-fc') + poly([P(0, w, 0), P(l, w, 0), P(l, w, h), P(0, w, h)], 'me-fb');
      var A = P(l / 2, w, 0), B = P(l, w / 2, 0), Cc = P(l, w, h / 2);
      g += tx(A[0] - 10, A[1] + 16, 'l = ' + l, 'me-tx me-sm', 'end') + tx(B[0] + 10, B[1] + 16, 'w = ' + w, 'me-tx me-sm', 'start') + tx(Cc[0] + 8, Cc[1], 'h = ' + h, 'me-tx me-sm', 'start');
      if (diag) { var a = P(0, 0, 0), b = P(l, w, h); g += '<line class="me-ln me-thick me-ds" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>'; }
      var W0 = 24 + (l + w) * c30 * s + 60, W = Math.max(W0, 240), H = 30 + (l + w) * 0.5 * s + h * s + 6;
      return fig(svg(W, H, 'Box ' + l + ' by ' + w + ' by ' + h, '<g transform="translate(' + ((W - W0) / 2).toFixed(1) + ',0)">' + g + '</g>'));
    };

    // Two parallel lines and a transversal. Corner numbering: 1 upper left, 2 upper right, 3 lower right, 4 lower left at the top crossing; 5 to 8 the same at the bottom.
    V.parallelTransversal = function (p1, l1, p2, l2) {
      var T = [170, 45], B = [110, 115], g = ln(20, 45, 300, 45) + ln(20, 115, 300, 115) + ln(B[0] - 34, B[1] + 58 * 0.6 + 20, T[0] + 34, T[1] - 58 * 0.6 - 10);
      g += '<polygon class="me-ar" points="150,38 160,45 150,52" transform="translate(8,0)"/><polygon class="me-ar" points="150,108 160,115 150,122" transform="translate(8,0)"/>';
      var off = [[-28, -8], [24, -12], [30, 20], [-24, 22]];
      function put(p, l) { if (!p) return ''; var base = p <= 4 ? T : B, o = off[(p - 1) % 4]; return tx(base[0] + o[0], base[1] + o[1], String(l), 'me-tx me-bold'); }
      g += put(p1, l1) + put(p2, l2);
      return fig(svg(320, 160, 'Parallel lines cut by a transversal', g));
    };

    // Broken line between parallel lines: angle at A is a, angle at C is c, find the angle at E.
    V.bentLine = function (a, c, showE) {
      var ex = 200, ey = 80, top = 40, bot = 120, d1 = (ey - top) / Math.tan(a * Math.PI / 180), d2 = (bot - ey) / Math.tan(c * Math.PI / 180);
      d1 = Math.min(d1, 170); d2 = Math.min(d2, 170);
      var Ax = ex - d1, Cx = ex - d2, g = ln(10, top, 300, top) + ln(10, bot, 300, bot) + ln(Ax, top, ex, ey, 'me-ln me-thick') + ln(Cx, bot, ex, ey, 'me-ln me-thick');
      g += tx(Ax - 6, top - 8, 'A', 'me-tx me-bold') + tx(Cx - 6, bot + 18, 'C', 'me-tx me-bold') + tx(ex + 10, ey + 5, 'E', 'me-tx me-bold', 'start') + tx(Ax + 34, top + 16, a + '°', 'me-tx me-sm') + tx(Cx + 34, bot - 8, c + '°', 'me-tx me-sm') + tx(ex - 34, ey + 4, showE ? String(showE) : '?', 'me-tx me-bold');
      g += tx(290, top - 8, 'B', 'me-tx me-bold') + tx(290, bot + 18, 'D', 'me-tx me-bold');
      return fig(svg(320, 150, 'Angle between two parallel lines', g), 'AB is parallel to CD.');
    };

    // Regular polygon outline.
    V.polygonAngles = function (n) {
      n = Math.max(3, Math.min(20, Math.round(n))); var cx = 90, cy = 80, R = 62, pts = [];
      for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
      var g = poly(pts, 'me-sh') + tx(cx, cy + 5, n + ' sides', 'me-tx me-bold');
      return fig(svg(180, 160, 'Regular polygon with ' + n + ' sides', g), 'Interior angle sum: ' + (n - 2) * 180 + '°.');
    };

    // Shaded region diagrams. mode: inscribed | quarter | lens | four | nested | ring
    V.shaded = function (mode, s) {
      var u = 130, x0 = 15, y0 = 15, id = 'me-cp' + (++uid), g = '', cx = x0 + u / 2, cy = y0 + u / 2, lab = s ? String(s) : '';
      var sq = 'M' + x0 + ' ' + y0 + 'h' + u + 'v' + u + 'h' + (-u) + 'z';
      function circ(x, y, r) { return 'M' + (x - r) + ' ' + y + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0z'; }
      if (mode === 'inscribed') g = '<path class="me-sh" fill-rule="evenodd" d="' + sq + circ(cx, cy, u / 2) + '"/>';
      else if (mode === 'quarter') g = '<path class="me-sh" fill-rule="evenodd" d="' + sq + 'M' + x0 + ' ' + (y0 + u) + 'L' + (x0 + u) + ' ' + (y0 + u) + 'A' + u + ' ' + u + ' 0 0 0 ' + x0 + ' ' + y0 + 'z"/><path class="me-ol" d="' + sq + '"/>';
      else if (mode === 'lens') g = '<defs><clipPath id="' + id + '"><circle cx="' + x0 + '" cy="' + (y0 + u) + '" r="' + u + '"/></clipPath></defs><path class="me-fa" d="' + sq + '"/><circle class="me-sh" cx="' + (x0 + u) + '" cy="' + y0 + '" r="' + u + '" clip-path="url(#' + id + ')"/><path class="me-ol" d="' + sq + '"/><path class="me-ol" d="M' + x0 + ' ' + y0 + 'A' + u + ' ' + u + ' 0 0 0 ' + (x0 + u) + ' ' + (y0 + u) + 'M' + (x0 + u) + ' ' + y0 + 'A' + u + ' ' + u + ' 0 0 1 ' + x0 + ' ' + (y0 + u) + '"/>';
      else if (mode === 'four') { var q = u / 4; g = '<path class="me-sh" fill-rule="evenodd" d="' + sq + circ(x0 + q, y0 + q, q) + circ(x0 + 3 * q, y0 + q, q) + circ(x0 + q, y0 + 3 * q, q) + circ(x0 + 3 * q, y0 + 3 * q, q) + '"/>'; }
      else if (mode === 'nested') { var h = u / 2; g = '<path class="me-ol" d="' + sq + '"/><path class="me-sh" fill-rule="evenodd" d="' + circ(cx, cy, h) + 'M' + cx + ' ' + y0 + 'L' + (x0 + u) + ' ' + cy + 'L' + cx + ' ' + (y0 + u) + 'L' + x0 + ' ' + cy + 'z"/>'; }
      else g = '<path class="me-sh" fill-rule="evenodd" d="' + circ(cx, cy, u / 2) + circ(cx, cy, u / 4) + '"/>';
      if (lab) g += tx(x0 + u / 2, y0 + u + 20, lab, 'me-tx me-sm');
      return fig(svg(u + 30, u + 34, 'Shaded region', g));
    };

    // Probability tree for two draws from a bag with r red (R) and b blue (B).
    V.treeDiagram = function (r, b, mode) {
      var n = r + b, wo = mode === 'without', g = '', ys = [30, 70, 110, 150], L1 = [[120, 50, 'R', r + '/' + n], [120, 130, 'B', b + '/' + n]];
      L1.forEach(function (p, i) { g += ln(20, 90, p[0], p[1], 'me-ln me-thick') + tx(70, (90 + p[1]) / 2 + (i ? 14 : -6), p[3], 'me-tx me-sm') + tx(p[0] + 12, p[1] + 5, p[2], 'me-tx me-bold', 'start'); });
      var d = wo ? n - 1 : n, lab = [[wo ? r - 1 : r, 'R'], [b, 'B'], [r, 'R'], [wo ? b - 1 : b, 'B']];
      lab.forEach(function (l, i) { var from = i < 2 ? L1[0] : L1[1]; g += ln(from[0] + 30, from[1], 250, ys[i], 'me-ln') + tx(190, (from[1] + ys[i]) / 2 + (i % 2 ? 12 : -4), l[0] + '/' + d, 'me-tx me-sm') + tx(262, ys[i] + 5, l[1], 'me-tx me-bold', 'start'); });
      return fig(svg(300, 180, 'Tree diagram for two draws', g), wo ? 'Second draw without replacement.' : 'Second draw with replacement.');
    };

    V.barChart = function () {
      var v = [].slice.call(arguments).map(Number), mx = Math.max.apply(null, v), w = 300 / v.length, g = '';
      v.forEach(function (x, i) { var h = 100 * x / mx; g += '<rect class="me-fb" x="' + (14 + i * w + 4).toFixed(1) + '" y="' + (120 - h).toFixed(1) + '" width="' + (w - 8).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"/>' + tx(14 + i * w + w / 2, 116 - h, String(x), 'me-tx me-sm') + tx(14 + i * w + w / 2, 138, String(i + 1), 'me-tx me-sm'); });
      return fig(svg(330, 148, 'Bar chart', ln(10, 120, 320, 120, 'me-ln me-thick') + g));
    };

    // Lattice grid: a columns by b rows of blocks, A bottom left, B top right, optional blocked point (i, j).
    V.pathGrid = function (a, b, bi, bj) {
      var s = Math.min(38, Math.floor(260 / Math.max(a, b))), x0 = 24, y0 = 16, g = '', i, j;
      for (i = 0; i <= a; i++) g += ln(x0 + i * s, y0, x0 + i * s, y0 + b * s, 'me-gl');
      for (j = 0; j <= b; j++) g += ln(x0, y0 + j * s, x0 + a * s, y0 + j * s, 'me-gl');
      for (i = 0; i <= a; i++) for (j = 0; j <= b; j++) g += '<circle class="me-fa" cx="' + (x0 + i * s) + '" cy="' + (y0 + (b - j) * s) + '" r="3"/>';
      g += '<circle class="me-fb" cx="' + x0 + '" cy="' + (y0 + b * s) + '" r="6"/>' + tx(x0 - 12, y0 + b * s + 18, 'A', 'me-tx me-bold') + '<circle class="me-fb" cx="' + (x0 + a * s) + '" cy="' + y0 + '" r="6"/>' + tx(x0 + a * s + 12, y0 - 4, 'B', 'me-tx me-bold');
      if (bi != null) g += tx(x0 + bi * s, y0 + (b - bj) * s + 6, '✕', 'me-tx me-bold');
      return fig(svg(x0 + a * s + 34, y0 + b * s + 34, a + ' by ' + b + ' grid of blocks', g), 'Move only right or up.');
    };
  })();

  /* ==================================================================
     MODULE 4 GENERATORS
     M4[topicIndex][tier] = [generator, ...]
  ================================================================== */
  var M4 = [0, 1, 2, 3, 4].map(function () { return { 1: [], 2: [], 3: [] }; });
  var TR = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 35, 37]];
  function trip(r, n, kmax) { var t = r.pick(TR.slice(0, n || 4)), k = r.int(1, kmax || 4); return { a: t[0] * k, b: t[1] * k, c: t[2] * k, k: k, t: t }; }
  function isq(n) { var s = Math.round(Math.sqrt(n)); return s * s === n ? s : -1; }
  function tripNote(t) { return t.k > 1 ? t.a + ', ' + t.b + ', ' + t.c + ' is the triple ' + t.t.join(', ') + ' multiplied by ' + t.k + '.' : t.a + ', ' + t.b + ', ' + t.c + ' is one of the famous Pythagorean triples.'; }
  // All whole number legs that pair with hypotenuse c.
  function legsFor(c) { var out = []; for (var a = 1; a < c; a++) { var b = isq(c * c - a * a); if (b > 0) out.push(a); } return out; }
  // Exposed face count of a voxel solid (used only to double check formulas).
  function voxelSA(n, m, p, has) {
    var cnt = 0, d = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (var x = 0; x < n; x++) for (var y = 0; y < m; y++) for (var z = 0; z < p; z++) { if (!has(x, y, z)) continue; d.forEach(function (v) { if (!has(x + v[0], y + v[1], z + v[2])) cnt++; }); }
    return cnt;
  }

  // ---------- m4t0: Pythagorean theorem ----------
  M4[0][1].push(function (r) { // hypotenuse
    var t = trip(r, 4, 4), a = t.a, b = t.b, c = t.c;
    return I('A right triangle has legs of ' + a + ' cm and ' + b + ' cm. How long is the hypotenuse, in cm?', [
      'The hypotenuse is the side opposite the right angle. Pythagoras says a^{2} + b^{2} = c^{2}.',
      a + '^{2} + ' + b + '^{2} = ' + a * a + ' + ' + b * b + ' = ' + (a * a + b * b) + '.',
      'c = √{' + (a * a + b * b) + '} = ' + c + ' cm, because ' + c + ' × ' + c + ' = ' + c * c + '.',
      'Shortcut: ' + tripNote(t) + ' Learn the triples 3, 4, 5 and 5, 12, 13 and 8, 15, 17 and 7, 24, 25 and you can skip the squaring.'], c, { check: Math.sqrt(a * a + b * b), visual: V.rightTriangle(a, b, '?', a, b) });
  });
  M4[0][1].push(function (r) { // missing leg
    var t = trip(r, 4, 4), a = t.a, b = t.b, c = t.c;
    return I('A right triangle has a hypotenuse of ' + c + ' cm and one leg of ' + a + ' cm. Find the other leg, in cm.', [
      'Rearrange Pythagoras: b^{2} = c^{2} ' + MINUS + ' a^{2}.',
      'b^{2} = ' + c + '^{2} ' + MINUS + ' ' + a + '^{2} = ' + c * c + ' ' + MINUS + ' ' + a * a + ' = ' + b * b + '.',
      'b = √{' + b * b + '} = ' + b + ' cm.',
      'Shortcut: ' + tripNote(t) + ' The hypotenuse is always the biggest number, so the missing side here is a leg.'], b, { check: Math.sqrt(c * c - a * a), visual: V.rightTriangle(a, '?', c, a, b) });
  });
  M4[0][1].push(function (r) { // ladder
    var t = trip(r, 4, 3), a = t.a, b = t.b, c = t.c, ask = r.pick(['height', 'distance']);
    if (ask === 'height') return I('A ' + c + ' m ladder leans against a vertical wall. Its foot is ' + a + ' m from the wall. How high up the wall does it reach, in metres?', [
      'The wall, the ground and the ladder form a right triangle. The ladder is the hypotenuse (' + c + ' m).',
      'Height^{2} = ' + c + '^{2} ' + MINUS + ' ' + a + '^{2} = ' + c * c + ' ' + MINUS + ' ' + a * a + ' = ' + b * b + '.',
      'Height = √{' + b * b + '} = ' + b + ' m.'], b, { check: Math.sqrt(c * c - a * a), visual: V.rightTriangle(a, '?', c, a, b) });
    return I('A ' + c + ' m ladder leans against a vertical wall and reaches ' + b + ' m up the wall. How far is its foot from the wall, in metres?', [
      'The ladder is the hypotenuse (' + c + ' m) and the height is one leg (' + b + ' m).',
      'Distance^{2} = ' + c + '^{2} ' + MINUS + ' ' + b + '^{2} = ' + c * c + ' ' + MINUS + ' ' + b * b + ' = ' + a * a + '.',
      'Distance = √{' + a * a + '} = ' + a + ' m.'], a, { check: Math.sqrt(c * c - b * b), visual: V.rightTriangle(a, b, c, a, b) });
  });
  M4[0][1].push(function (r) { // screen diagonal to area
    var t = trip(r, 4, 4), a = t.a, b = t.b, c = t.c;
    return I('A rectangular screen is ' + a + ' cm wide and has a diagonal of ' + c + ' cm. What is its area, in cm^{2}?', [
      'The diagonal cuts the rectangle into two right triangles. The diagonal is the hypotenuse.',
      'Height^{2} = ' + c + '^{2} ' + MINUS + ' ' + a + '^{2} = ' + c * c + ' ' + MINUS + ' ' + a * a + ' = ' + b * b + ', so the height is ' + b + ' cm.',
      'Area = ' + a + ' × ' + b + ' = ' + a * b + ' cm^{2}.'], a * b, { check: a * Math.sqrt(c * c - a * a) });
  });
  M4[0][1].push(function (r) { // walk
    var t = trip(r, 4, 5), a = t.a, b = t.b, c = t.c, d1 = r.pick(['north', 'south']), d2 = r.pick(['east', 'west']);
    return I('Mia walks ' + a + ' km ' + d1 + ' and then ' + b + ' km ' + d2 + '. How far is she from her starting point in a straight line, in km?', [
      'North or south is at a right angle to east or west, so her path and the straight line back form a right triangle.',
      'Distance^{2} = ' + a + '^{2} + ' + b + '^{2} = ' + a * a + ' + ' + b * b + ' = ' + c * c + '.',
      'Distance = ' + c + ' km. (' + tripNote(t) + ')'], c, { check: Math.hypot(a, b) });
  });
  M4[0][1].push(function (r) { // converse
    var t = trip(r, 4, 3), right = r.chance(0.5), a = t.a, b = t.b, c = t.c;
    if (!right) { var w = r.pick([-2, -1, 1, 2]); if (r.chance(0.5)) c += w; else b += w; }
    var s = [a, b, c].sort(function (x, y) { return x - y; }), ok = s[0] * s[0] + s[1] * s[1] === s[2] * s[2], ans = ok ? 'Yes, it is a right triangle' : 'No, it is not a right triangle';
    return TX('A triangle has sides ' + s.join(' cm, ') + ' cm. Is it a right triangle?', [
      'If a triangle is a right triangle, the two shorter sides squared add to the longest side squared. This test also works in reverse.',
      s[0] + '^{2} + ' + s[1] + '^{2} = ' + s[0] * s[0] + ' + ' + s[1] * s[1] + ' = ' + (s[0] * s[0] + s[1] * s[1]) + '.',
      s[2] + '^{2} = ' + s[2] * s[2] + '.',
      ok ? 'The two sides match, so the triangle has a right angle.' : 'The two numbers are different, so there is no right angle.'], ans, { options: ['Yes, it is a right triangle', 'No, it is not a right triangle'], check: ans });
  });

  M4[0][2].push(function (r) { // chain of two right triangles
    var ch = r.pick([[3, 4, 5, 12, 13], [9, 12, 15, 8, 17], [12, 16, 20, 21, 29], [6, 8, 10, 24, 26]]), k = r.pick([1, 1, 2]);
    var ab = ch[0] * k, bc = ch[1] * k, ac = ch[2] * k, cd = ch[3] * k, ad = ch[4] * k, ask = r.pick(['AD', 'perimeter']);
    var steps = ['Triangle ABC has a right angle at B. AC^{2} = ' + ab + '^{2} + ' + bc + '^{2} = ' + ab * ab + ' + ' + bc * bc + ' = ' + ac * ac + ', so AC = ' + ac + '.',
      'Triangle ACD has a right angle at C. AD^{2} = ' + ac + '^{2} + ' + cd + '^{2} = ' + ac * ac + ' + ' + cd * cd + ' = ' + ad * ad + ', so AD = ' + ad + '.'];
    if (ask === 'AD') return I('In quadrilateral ABCD, angle ABC and angle ACD are both right angles. AB = ' + ab + ', BC = ' + bc + ' and CD = ' + cd + '. Find AD.', steps.concat(['Answer: AD = ' + ad + '.', 'Tip: you never need the shape of the whole quadrilateral. Break it into two right triangles and use the diagonal AC as the bridge.']), ad, { check: Math.sqrt(ab * ab + bc * bc + cd * cd) });
    return I('In quadrilateral ABCD, angle ABC and angle ACD are both right angles. AB = ' + ab + ', BC = ' + bc + ', CD = ' + cd + ' and the fourth side is AD. Find the perimeter.', steps.concat(['Perimeter = ' + ab + ' + ' + bc + ' + ' + cd + ' + ' + ad + ' = ' + (ab + bc + cd + ad) + '.']), ab + bc + cd + ad, { check: ab + bc + cd + Math.sqrt(ab * ab + bc * bc + cd * cd) });
  });
  M4[0][2].push(function (r) { // spiral of triangles
    var m = r.int(3, 9), k = m * m - 1;
    return I('A spiral is built from right triangles. The first has two legs of length 1. Each new triangle has one leg of length 1 and its other leg is the hypotenuse of the triangle before it. The first hypotenuse is √2. Which triangle in the spiral is the first (counting the first one as number 1) whose hypotenuse equals ' + m + '?', [
      'Triangle 1 has hypotenuse √{1 + 1} = √2. Triangle 2 has hypotenuse √{2 + 1} = √3.',
      'Each step adds 1 to the number under the root, so triangle n has hypotenuse √{n + 1}.',
      'We need √{n + 1} = ' + m + ', so n + 1 = ' + m + '^{2} = ' + m * m + '.',
      'n = ' + m * m + ' ' + MINUS + ' 1 = ' + k + '.'], k, { check: m * m - 1 });
  });
  M4[0][2].push(function (r) { // isosceles triangle area
    var t = trip(r, 4, 4), a = t.a, b = t.b, c = t.c;
    return I('An isosceles triangle has two equal sides of ' + c + ' cm and a base of ' + 2 * a + ' cm. What is its area, in cm^{2}?', [
      'Draw the height from the top to the base. It splits the triangle into two identical right triangles.',
      'Each right triangle has hypotenuse ' + c + ' and a base leg of ' + 2 * a + ' ÷ 2 = ' + a + '.',
      'Height^{2} = ' + c + '^{2} ' + MINUS + ' ' + a + '^{2} = ' + c * c + ' ' + MINUS + ' ' + a * a + ' = ' + b * b + ', so the height is ' + b + ' cm.',
      'Area = {{1|2}} × ' + 2 * a + ' × ' + b + ' = ' + a * b + ' cm^{2}.'], a * b, { check: 0.5 * 2 * a * Math.sqrt(c * c - a * a) });
  });
  M4[0][2].push(function (r) { // coordinate distance
    var t = trip(r, 4, 4), x1 = r.int(-9, 9), y1 = r.int(-9, 9), sx = r.chance(0.5) ? 1 : -1, sy = r.chance(0.5) ? 1 : -1, x2 = x1 + sx * t.a, y2 = y1 + sy * t.b;
    function p(x, y) { return '(' + fmt(x) + ', ' + fmt(y) + ')'; }
    return I('What is the distance between the points ' + p(x1, y1) + ' and ' + p(x2, y2) + ' on the coordinate plane?', [
      'Draw a right triangle with the two points at the ends of the hypotenuse.',
      'Horizontal leg: |' + fmt(x2) + ' ' + MINUS + ' (' + fmt(x1) + ')| = ' + t.a + '. Vertical leg: |' + fmt(y2) + ' ' + MINUS + ' (' + fmt(y1) + ')| = ' + t.b + '.',
      'Distance = √{' + t.a + '^{2} + ' + t.b + '^{2}} = √{' + (t.a * t.a + t.b * t.b) + '} = ' + t.c + '. (' + tripNote(t) + ')'], t.c, { check: Math.hypot(x2 - x1, y2 - y1), visual: V.coordinatePlane ? V.coordinatePlane([[x1, y1], [x2, y2]]) : '' });
  });
  M4[0][2].push(function (r) { // sliding ladder
    var cs = [13, 17, 25, 26, 29, 34, 37, 39, 41], c = r.pick(cs), L = legsFor(c), h1 = r.pick(L), h2; do { h2 = r.pick(L); } while (h2 === h1);
    var f1 = Math.sqrt(c * c - h1 * h1), f2 = Math.sqrt(c * c - h2 * h2), down = h1 > h2, diff = Math.abs(f2 - f1), sd = Math.abs(h1 - h2);
    return I('A ' + c + ' m ladder stands against a wall with its top ' + h1 + ' m above the ground. The top ' + (down ? 'slides down' : 'is pushed up') + ' by ' + sd + ' m. How many metres does the foot of the ladder move along the ground?', [
      'The ladder length never changes, so both positions are right triangles with hypotenuse ' + c + '.',
      'Start: foot distance = √{' + c + '^{2} ' + MINUS + ' ' + h1 + '^{2}} = √{' + (c * c - h1 * h1) + '} = ' + f1 + ' m.',
      'New height ' + h2 + ' m: foot distance = √{' + c + '^{2} ' + MINUS + ' ' + h2 + '^{2}} = √{' + (c * c - h2 * h2) + '} = ' + f2 + ' m.',
      'The foot moves ' + Math.max(f1, f2) + ' ' + MINUS + ' ' + Math.min(f1, f2) + ' = ' + diff + ' m. Notice the foot moves a different amount than the top.'], diff, { check: Math.abs(Math.sqrt(c * c - h1 * h1) - Math.sqrt(c * c - h2 * h2)) });
  });
  M4[0][2].push(function (r) { // two poles
    var t = trip(r, 3, 4), h1 = r.int(3, 9) * 2, dh = t.b, d = t.a, h2 = h1 + dh;
    return I('Two vertical poles stand ' + d + ' m apart on level ground. One is ' + h1 + ' m tall and the other is ' + h2 + ' m tall. A wire is stretched straight from the top of one pole to the top of the other. How long is the wire, in metres?', [
      'Only the height difference matters. Draw a horizontal line from the top of the shorter pole to the taller pole.',
      'That makes a right triangle with legs ' + d + ' m (across) and ' + h2 + ' ' + MINUS + ' ' + h1 + ' = ' + dh + ' m (up).',
      'Wire^{2} = ' + d + '^{2} + ' + dh + '^{2} = ' + (d * d + dh * dh) + ', so the wire is ' + t.c + ' m long. (' + tripNote(t) + ')'], t.c, { check: Math.hypot(d, h2 - h1) });
  });
  M4[0][2].push(function (r) { // diagonal walk combine
    var t = trip(r, 4, 4), a = t.a, b = t.b, s1 = r.int(1, a - 1), s2 = r.int(1, b - 1);
    var seg = [[s1, 'north', s2, 'east'], [a - s1, 'north', b - s2, 'east']];
    return I('A hiker walks ' + seg[0][0] + ' km north, then ' + seg[0][2] + ' km east, then ' + seg[1][0] + ' km north and finally ' + seg[1][2] + ' km east. How far is she from the start, in a straight line, in km?', [
      'All the north moves add: ' + seg[0][0] + ' + ' + seg[1][0] + ' = ' + a + ' km. All the east moves add: ' + seg[0][2] + ' + ' + seg[1][2] + ' = ' + b + ' km.',
      'Combine the moves first. One big right triangle has legs ' + a + ' and ' + b + '.',
      'Distance = √{' + a + '^{2} + ' + b + '^{2}} = √{' + (a * a + b * b) + '} = ' + t.c + ' km. (' + tripNote(t) + ')'], t.c, { check: Math.hypot(s1 + a - s1, s2 + b - s2) });
  });

  M4[0][3].push(function (r) { // squares on the sides
    var t = trip(r, 4, 5), a = t.a, b = t.b, c = t.c;
    return I('Squares are drawn on the sides of a right triangle. Two of the squares have areas ' + a * a + ' cm^{2} and ' + b * b + ' cm^{2}, and they sit on the two shorter sides. What is the perimeter of the triangle, in cm?', [
      'A square on a side of length s has area s^{2}, so the sides are √{' + a * a + '} = ' + a + ' and √{' + b * b + '} = ' + b + '.',
      'The square on the hypotenuse has area ' + a * a + ' + ' + b * b + ' = ' + c * c + ' (the areas add, that is Pythagoras in picture form), so the hypotenuse is ' + c + '.',
      'Perimeter = ' + a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c) + ' cm.'], a + b + c, { check: Math.sqrt(a * a) + Math.sqrt(b * b) + Math.sqrt(a * a + b * b) });
  });
  M4[0][3].push(function (r) { // altitude to hypotenuse
    var k = r.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), a = 3 * k, b = 4 * k, c = 5 * k, h = a * b / c;
    return D('A right triangle has legs ' + a + ' and ' + b + '. What is the length of the altitude drawn to the hypotenuse?', [
      'Find the hypotenuse: √{' + a + '^{2} + ' + b + '^{2}} = ' + c + '.',
      'Compute the area two ways. Using the legs: {{1|2}} × ' + a + ' × ' + b + ' = ' + a * b / 2 + '.',
      'Using the hypotenuse as the base: {{1|2}} × ' + c + ' × h = ' + a * b / 2 + ', so h = ' + a * b + ' ÷ ' + c + ' = ' + nf(h, 1, true) + '.',
      'The "area two ways" trick avoids similar triangles and works every time.'], h, 1, true, [a * b / 2 / c, a * b / c / 2, c / 2, a * b / (a + b)], { check: a * b / c });
  });
  M4[0][3].push(function (r) { // trapezoid
    var t = trip(r, 4, 3), s = r.int(4, 14), a = t.a, b = t.b, c = t.c;
    return I('An isosceles trapezoid has parallel sides of ' + s + ' cm and ' + (s + 2 * a) + ' cm, and each slanted side is ' + c + ' cm. What is its area, in cm^{2}?', [
      'Drop two perpendicular heights from the ends of the short base. They cut off two identical right triangles.',
      'The bases differ by ' + (s + 2 * a) + ' ' + MINUS + ' ' + s + ' = ' + 2 * a + ', so each right triangle has a base of ' + a + '.',
      'Height^{2} = ' + c + '^{2} ' + MINUS + ' ' + a + '^{2} = ' + b * b + ', so the height is ' + b + ' cm.',
      'Area = {{1|2}}(' + s + ' + ' + (s + 2 * a) + ') × ' + b + ' = ' + (s + a) + ' × ' + b + ' = ' + (s + a) * b + ' cm^{2}.'], (s + a) * b, { check: (s + s + 2 * a) / 2 * Math.sqrt(c * c - a * a) });
  });
  M4[0][3].push(function (r) { // incircle radius
    var t = trip(r, 5, 3), a = t.a, b = t.b, c = t.c, rad = (a + b - c) / 2;
    return I('A circle is drawn inside a right triangle so that it touches all three sides. The legs are ' + a + ' cm and ' + b + ' cm. What is the radius of the circle, in cm?', [
      'The hypotenuse is √{' + a + '^{2} + ' + b + '^{2}} = ' + c + '.',
      'Area of the triangle = {{1|2}} × ' + a + ' × ' + b + ' = ' + a * b / 2 + '. Splitting the triangle into three pieces from the centre gives area = r × (perimeter ÷ 2).',
      'Semi perimeter = (' + a + ' + ' + b + ' + ' + c + ') ÷ 2 = ' + (a + b + c) / 2 + '. So r = ' + a * b / 2 + ' ÷ ' + (a + b + c) / 2 + ' = ' + rad + '.',
      'Shortcut for any right triangle: r = (a + b ' + MINUS + ' c) ÷ 2 = (' + a + ' + ' + b + ' ' + MINUS + ' ' + c + ') ÷ 2 = ' + rad + '.'], rad, { check: (a * b / 2) / ((a + b + Math.hypot(a, b)) / 2) });
  });
  M4[0][3].push(function (r) { // ratio legs to perimeter
    var t = trip(r, 4, 1), k = r.int(2, 9), a = t.a * k, b = t.b * k, c = t.c * k, P = a + b + c;
    return I('The two legs of a right triangle are in the ratio ' + t.a + ' : ' + t.b + '. The hypotenuse is ' + c + ' cm. What is the perimeter of the triangle, in cm?', [
      'Write the legs as ' + t.a + 'k and ' + t.b + 'k. Then ' + t.a + '^{2}k^{2} + ' + t.b + '^{2}k^{2} = ' + c + '^{2}.',
      (t.a * t.a + t.b * t.b) + 'k^{2} = ' + c * c + ', so k^{2} = ' + c * c / (t.a * t.a + t.b * t.b) + ' and k = ' + k + '.',
      'Legs: ' + a + ' and ' + b + '. Perimeter = ' + a + ' + ' + b + ' + ' + c + ' = ' + P + ' cm.',
      'Shortcut: the ratio ' + t.a + ' : ' + t.b + ' hides the triple ' + t.t.join(', ') + ', so the hypotenuse ' + c + ' = ' + t.t[2] + ' × ' + k + ' and the perimeter is ' + (t.t[0] + t.t[1] + t.t[2]) + ' × ' + k + '.'], P, { check: (t.a + t.b + Math.sqrt(t.a * t.a + t.b * t.b)) * c / Math.sqrt(t.a * t.a + t.b * t.b) });
  });

  // ---------- m4t1: 3D solids, surface area and space diagonals ----------
  var QUADS = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 10, 11, 15], [4, 8, 8, 12], [1, 6, 18, 19], [8, 9, 12, 17], [6, 6, 17, 19]];
  function quad(r, kmax) { var q = r.pick(QUADS), k = r.int(1, kmax || 2), e = r.shuffle([q[0] * k, q[1] * k, q[2] * k]); return { l: e[0], w: e[1], h: e[2], d: q[3] * k }; }

  M4[1][1].push(function (r) { // rectangular prism SA
    var l = r.int(3, 12), w = r.int(2, 10), h = r.int(2, 9), sa = 2 * (l * w + l * h + w * h);
    return I('A rectangular prism measures ' + l + ' cm by ' + w + ' cm by ' + h + ' cm. What is its surface area, in cm^{2}?', [
      'A prism has three pairs of matching faces. Find each pair.',
      'Top and bottom: 2 × ' + l + ' × ' + w + ' = ' + 2 * l * w + '. Front and back: 2 × ' + l + ' × ' + h + ' = ' + 2 * l * h + '. Two sides: 2 × ' + w + ' × ' + h + ' = ' + 2 * w * h + '.',
      'Total = ' + 2 * l * w + ' + ' + 2 * l * h + ' + ' + 2 * w * h + ' = ' + sa + ' cm^{2}.',
      'Formula: SA = 2(lw + lh + wh).'], sa, { check: 2 * l * w + 2 * l * h + 2 * w * h, visual: V.box3d(l, w, h) });
  });
  M4[1][1].push(function (r) { // cube SA and reverse
    var a = r.int(2, 15);
    if (r.chance(0.5)) return I('What is the surface area of a cube with edge ' + a + ' cm, in cm^{2}?', ['A cube has 6 identical square faces.', 'One face: ' + a + ' × ' + a + ' = ' + a * a + '.', 'Total = 6 × ' + a * a + ' = ' + 6 * a * a + ' cm^{2}.'], 6 * a * a, { check: 6 * a * a });
    return I('A cube has a surface area of ' + 6 * a * a + ' cm^{2}. What is the length of one edge, in cm?', ['Six equal faces, so one face is ' + 6 * a * a + ' ÷ 6 = ' + a * a + ' cm^{2}.', 'The edge is √{' + a * a + '} = ' + a + ' cm.'], a, { check: Math.sqrt(6 * a * a / 6) });
  });
  M4[1][1].push(function (r) { // square base prism
    var a = r.int(3, 12), h = r.int(2, 14), sa = 2 * a * a + 4 * a * h;
    return I('A prism has a regular square base with side ' + a + ' cm and a height of ' + h + ' cm. Find its surface area, in cm^{2}.', [
      'Two square bases: 2 × ' + a + '^{2} = ' + 2 * a * a + '.',
      'Four identical rectangular sides, each ' + a + ' by ' + h + ': 4 × ' + a + ' × ' + h + ' = ' + 4 * a * h + '.',
      'Total = ' + 2 * a * a + ' + ' + 4 * a * h + ' = ' + sa + ' cm^{2}.',
      'Idea: SA = 2 × (base area) + (base perimeter) × height. This works for every prism.'], sa, { check: 2 * a * a + (4 * a) * h, visual: V.box3d(a, a, h) });
  });
  M4[1][1].push(function (r) { // right triangular prism
    var t = trip(r, 3, 2), L = r.int(4, 15), a = t.a, b = t.b, c = t.c, sa = a * b + (a + b + c) * L;
    return I('A prism has a right triangle as its base, with legs ' + a + ' cm and ' + b + ' cm. The prism is ' + L + ' cm long. What is its total surface area, in cm^{2}?', [
      'Missing side of the triangle: c = √{' + a + '^{2} + ' + b + '^{2}} = ' + c + ' cm.',
      'Two triangle ends: 2 × {{1|2}} × ' + a + ' × ' + b + ' = ' + a * b + '.',
      'Three rectangles share the triangle perimeter, so together they give (' + a + ' + ' + b + ' + ' + c + ') × ' + L + ' = ' + (a + b + c) + ' × ' + L + ' = ' + (a + b + c) * L + '.',
      'Total = ' + a * b + ' + ' + (a + b + c) * L + ' = ' + sa + ' cm^{2}.'], sa, { check: 2 * (a * b / 2) + (a + b + Math.hypot(a, b)) * L });
  });
  M4[1][1].push(function (r) { // volume gives height then SA
    var l = r.int(3, 10), w = r.int(2, 8), h = r.int(2, 9), V0 = l * w * h, sa = 2 * (l * w + l * h + w * h);
    return I('A box has a base of ' + l + ' cm by ' + w + ' cm and a volume of ' + V0 + ' cm^{3}. What is its surface area, in cm^{2}?', [
      'Volume = length × width × height, so height = ' + V0 + ' ÷ (' + l + ' × ' + w + ') = ' + V0 + ' ÷ ' + l * w + ' = ' + h + ' cm.',
      'SA = 2(lw + lh + wh) = 2(' + l * w + ' + ' + l * h + ' + ' + w * h + ').',
      '= 2 × ' + (l * w + l * h + w * h) + ' = ' + sa + ' cm^{2}.'], sa, { check: 2 * (l * w + l * (V0 / (l * w)) + w * (V0 / (l * w))) });
  });
  M4[1][1].push(function (r) { // open top box
    var l = r.int(4, 14), w = r.int(3, 10), h = r.int(2, 8), sa = l * w + 2 * l * h + 2 * w * h;
    return I('An open topped box (no lid) is ' + l + ' cm long, ' + w + ' cm wide and ' + h + ' cm tall. How much cardboard is needed to make it, in cm^{2}?', [
      'Count the faces that exist: one bottom and four sides. There is no top.',
      'Bottom: ' + l + ' × ' + w + ' = ' + l * w + '. Long sides: 2 × ' + l + ' × ' + h + ' = ' + 2 * l * h + '. Short sides: 2 × ' + w + ' × ' + h + ' = ' + 2 * w * h + '.',
      'Total = ' + l * w + ' + ' + 2 * l * h + ' + ' + 2 * w * h + ' = ' + sa + ' cm^{2}.'], sa, { check: l * w + 2 * (l * h + w * h) });
  });

  M4[1][2].push(function (r) { // space diagonal
    var q = quad(r, 2);
    return I('What is the length of the space diagonal of a box measuring ' + q.l + ' by ' + q.w + ' by ' + q.h + '?', [
      'The space diagonal runs from one corner to the opposite corner through the inside. Use Pythagoras twice.',
      'Floor diagonal: √{' + q.l + '^{2} + ' + q.w + '^{2}} = √{' + (q.l * q.l + q.w * q.w) + '}. Then the space diagonal is √{(floor diagonal)^{2} + ' + q.h + '^{2}}.',
      'Shortcut: D^{2} = l^{2} + w^{2} + h^{2} = ' + q.l * q.l + ' + ' + q.w * q.w + ' + ' + q.h * q.h + ' = ' + q.d * q.d + '.',
      'D = √{' + q.d * q.d + '} = ' + q.d + '.'], q.d, { check: Math.sqrt(q.l * q.l + q.w * q.w + q.h * q.h), visual: V.box3d(q.l, q.w, q.h, true) });
  });
  M4[1][2].push(function (r) { // longest rod
    var q = quad(r, 3);
    return I('A closed box inside measures ' + q.l + ' cm by ' + q.w + ' cm by ' + q.h + ' cm. What is the longest straight rod, in cm, that can fit inside it?', [
      'The longest straight line inside a box is the space diagonal.',
      'D^{2} = ' + q.l + '^{2} + ' + q.w + '^{2} + ' + q.h + '^{2} = ' + q.l * q.l + ' + ' + q.w * q.w + ' + ' + q.h * q.h + ' = ' + q.d * q.d + '.',
      'D = ' + q.d + ' cm.'], q.d, { check: Math.sqrt(q.l * q.l + q.w * q.w + q.h * q.h) });
  });
  M4[1][2].push(function (r) { // missing edge from diagonal
    var q = quad(r, 2);
    return I('A box has a length of ' + q.l + ', a width of ' + q.w + ' and a space diagonal of ' + q.d + '. What is its height?', [
      'Rearrange D^{2} = l^{2} + w^{2} + h^{2}.',
      'h^{2} = ' + q.d + '^{2} ' + MINUS + ' ' + q.l + '^{2} ' + MINUS + ' ' + q.w + '^{2} = ' + q.d * q.d + ' ' + MINUS + ' ' + q.l * q.l + ' ' + MINUS + ' ' + q.w * q.w + ' = ' + q.h * q.h + '.',
      'h = ' + q.h + '.'], q.h, { check: Math.sqrt(q.d * q.d - q.l * q.l - q.w * q.w), visual: V.box3d(q.l, q.w, q.h, true) });
  });
  M4[1][2].push(function (r) { // 3D coordinates distance
    var q = quad(r, 2), sg = function () { return r.chance(0.5) ? 1 : -1; }, x1 = r.int(-6, 6), y1 = r.int(-6, 6), z1 = r.int(-6, 6), x2 = x1 + sg() * q.l, y2 = y1 + sg() * q.w, z2 = z1 + sg() * q.h;
    function p(x, y, z) { return '(' + fmt(x) + ', ' + fmt(y) + ', ' + fmt(z) + ')'; }
    return I('In three dimensions, what is the distance between P' + p(x1, y1, z1) + ' and Q' + p(x2, y2, z2) + '?', [
      'Imagine a box with P and Q at opposite corners. Its edges are the coordinate differences.',
      'Differences: |' + fmt(x2) + ' ' + MINUS + ' ' + fmt(x1) + '| = ' + q.l + ', |' + fmt(y2) + ' ' + MINUS + ' ' + fmt(y1) + '| = ' + q.w + ', |' + fmt(z2) + ' ' + MINUS + ' ' + fmt(z1) + '| = ' + q.h + '.',
      'Distance^{2} = ' + q.l * q.l + ' + ' + q.w * q.w + ' + ' + q.h * q.h + ' = ' + q.d * q.d + ', so the distance is ' + q.d + '.'], q.d, { check: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)) });
  });
  M4[1][2].push(function (r) { // base diagonal and height
    var q = r.pick([[3, 4, 12, 13], [9, 12, 8, 17], [12, 16, 21, 29]]), k = r.int(1, 2), l = q[0] * k, w = q[1] * k, h = q[2] * k, D0 = q[3] * k, bd = Math.hypot(l, w);
    return I('The floor of a rectangular room has a diagonal of ' + bd + ' m and the room is ' + h + ' m high. What is the distance from a floor corner to the opposite ceiling corner, in metres?', [
      'The floor diagonal (' + bd + ') and the height (' + h + ') are two legs of a right triangle. The needed distance is its hypotenuse.',
      'D^{2} = ' + bd + '^{2} + ' + h + '^{2} = ' + bd * bd + ' + ' + h * h + ' = ' + D0 * D0 + '.',
      'D = ' + D0 + ' m. You never needed the room length and width.'], D0, { check: Math.sqrt(bd * bd + h * h) });
  });
  M4[1][2].push(function (r) { // cube diagonal
    var a = r.int(2, 12);
    return I('The space diagonal of a cube is ' + a + '√3 cm. What is the surface area of the cube, in cm^{2}?', [
      'A cube with edge e has D^{2} = e^{2} + e^{2} + e^{2} = 3e^{2}, so D = e√3.',
      'Here e√3 = ' + a + '√3, so e = ' + a + ' cm.',
      'Surface area = 6e^{2} = 6 × ' + a * a + ' = ' + 6 * a * a + ' cm^{2}.'], 6 * a * a, { check: 6 * a * a });
  });

  M4[1][3].push(function (r) { // painted cube counts
    var n = r.int(3, 10), what = r.pick([1, 2, 0]);
    var cnt = 0, has = function (x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < n && y < n && z < n; };
    for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) for (var z = 0; z < n; z++) { var f = (x === 0 || x === n - 1) + (y === 0 || y === n - 1) + (z === 0 || z === n - 1); if (f === what) cnt++; }
    var m = n - 2, ans = what === 1 ? 6 * m * m : what === 2 ? 12 * m : m * m * m, wd = what === 1 ? 'exactly one face' : what === 2 ? 'exactly two faces' : 'no faces';
    var st = what === 1 ? ['Cubes with one painted face sit in the middle of a face, away from the edges. On each face that is a (' + n + ' ' + MINUS + ' 2) by (' + n + ' ' + MINUS + ' 2) square = ' + m + ' × ' + m + ' = ' + m * m + '.', 'There are 6 faces: 6 × ' + m * m + ' = ' + ans + '.']
      : what === 2 ? ['Cubes with two painted faces run along the edges but are not corners. Each edge has ' + n + ' ' + MINUS + ' 2 = ' + m + ' of them.', 'A cube has 12 edges: 12 × ' + m + ' = ' + ans + '.']
        : ['Cubes with no paint form a smaller solid cube hidden inside. Remove one layer from every side: ' + n + ' ' + MINUS + ' 2 = ' + m + ' cubes along each edge.', m + '^{3} = ' + ans + '.'];
    return I('A ' + n + ' by ' + n + ' by ' + n + ' cube is painted on all six outside faces and then cut into ' + n * n * n + ' small unit cubes. How many small cubes have paint on ' + wd + '?', st.concat(['Check: the corners (8) have three painted faces, so all types add to 8 + 12 × ' + m + ' + 6 × ' + m * m + ' + ' + m * m * m + ' = ' + n * n * n + '.']), ans, { check: cnt });
  });
  M4[1][3].push(function (r) { // painted block a b c
    var a = r.int(3, 7), b = r.int(3, 8), c = r.int(3, 9), what = r.pick([1, 0, 2]);
    var cnt = 0; for (var x = 0; x < a; x++) for (var y = 0; y < b; y++) for (var z = 0; z < c; z++) { var f = (x === 0 || x === a - 1) + (y === 0 || y === b - 1) + (z === 0 || z === c - 1); if (f === what) cnt++; }
    var A = a - 2, B = b - 2, Cc = c - 2, ans = what === 1 ? 2 * (A * B + B * Cc + A * Cc) : what === 2 ? 4 * (A + B + Cc) : A * B * Cc;
    var wd = what === 1 ? 'exactly one face' : what === 2 ? 'exactly two faces' : 'no faces';
    var st = what === 1 ? ['Take away the edge layer on each side: the middle of each face is a rectangle of (length ' + MINUS + ' 2) by (other ' + MINUS + ' 2).', 'Faces come in three matching pairs: 2 × (' + A + '×' + B + ' + ' + B + '×' + Cc + ' + ' + A + '×' + Cc + ') = 2 × ' + (A * B + B * Cc + A * Cc) + ' = ' + ans + '.']
      : what === 2 ? ['Two painted faces means a cube on an edge but not at a corner. Each edge of length n has n ' + MINUS + ' 2 such cubes.', 'The block has 4 edges in each of the three directions: 4 × (' + A + ' + ' + B + ' + ' + Cc + ') = 4 × ' + (A + B + Cc) + ' = ' + ans + '.']
        : ['The unpainted cubes form the inner block one layer smaller on every side: ' + A + ' by ' + B + ' by ' + Cc + '.', 'Count = ' + A + ' × ' + B + ' × ' + Cc + ' = ' + ans + '.'];
    return I('A ' + a + ' by ' + b + ' by ' + c + ' block made of unit cubes is painted on the outside and taken apart. How many unit cubes have paint on ' + wd + '?', st, ans, { check: cnt });
  });
  M4[1][3].push(function (r) { // shortest path across surface
    var t = r.pick([[5, 12], [8, 15], [12, 16], [9, 12], [6, 8], [15, 20], [12, 35]]), k = r.pick([1, 1, 2]), a = t[0] * k, h = t[1] * k, c = Math.hypot(a, h);
    var l = r.int(Math.ceil(a / 3), Math.floor(a / 2)), w = a - l;
    if (l < 1) { l = 1; w = a - 1; }
    if (l > h || w > h) return M4[1][3][2](r);
    var d1 = Math.hypot(l + w, h), d2 = Math.hypot(l + h, w), d3 = Math.hypot(w + h, l), best = Math.min(d1, d2, d3);
    if (Math.abs(best - Math.round(best)) > 1e-9) return M4[1][3][2](r);
    return I('An ant walks on the outside of a closed box that is ' + l + ' cm by ' + w + ' cm by ' + h + ' cm. It goes from one bottom corner to the opposite top corner, and it must stay on the surface. What is the length of the shortest route, in cm?', [
      'Unfold the box so the route becomes a straight line. Two faces are laid flat side by side.',
      'Unfolding the floor and a wall that both touch the route gives a flat rectangle (' + l + ' + ' + w + ') by ' + h + '. The straight line across it is √{(' + l + ' + ' + w + ')^{2} + ' + h + '^{2}} = √{' + (a * a + h * h) + '} = ' + c + '.',
      'The other two unfoldings give √{' + (l + h) + '^{2} + ' + w + '^{2}} ≈ ' + nf(d2, 2, true) + ' and √{' + (w + h) + '^{2} + ' + l + '^{2}} ≈ ' + nf(d3, 2, true) + ', which are longer.',
      'Rule: add the two smaller edges inside the bracket and keep the largest edge alone. The shortest route is ' + c + ' cm.'], c, { check: best, visual: V.box3d(l, w, h) });
  });
  M4[1][3].push(function (r) { // stepped pyramid SA
    var n = r.int(3, 7), e = r.pick([1, 2, 3]), sa = (4 * n * n + 2 * n) * e * e;
    var heights = [], cnt = 0;
    var has = function (x, y, z) { return z >= 0 && z < n && x >= 0 && y >= 0 && x < n - z && y < n - z; };
    cnt = voxelSA(n, n, n, has);
    return I('A stepped solid is built from cubes of edge ' + e + ' cm. The bottom layer is a ' + n + ' by ' + n + ' square of cubes, the next layer is ' + (n - 1) + ' by ' + (n - 1) + ', and so on up to a single cube on top. Each layer sits completely on the one below. What is the total surface area, including the bottom, in cm^{2}?', [
      'Look from above and below. The top view shows a ' + n + ' by ' + n + ' square, and so does the bottom view. Together they give 2 × ' + n * n + ' = ' + 2 * n * n + ' unit faces.',
      'The steps add no extra flat area to the top, because the exposed tops of all layers together still make a ' + n + ' by ' + n + ' square.',
      'Now count the sides. Each layer of k by k cubes contributes a perimeter of 4k faces. For k = 1 to ' + n + ' the total is 4 × (1 + 2 + ... + ' + n + ') = 4 × ' + n * (n + 1) / 2 + ' = ' + 2 * n * (n + 1) + ' unit faces.',
      'Total unit faces = ' + 2 * n * n + ' + ' + 2 * n * (n + 1) + ' = ' + (4 * n * n + 2 * n) + '. Each unit face has area ' + e + ' × ' + e + ' = ' + e * e + ' cm^{2}.',
      'Surface area = ' + (4 * n * n + 2 * n) + ' × ' + e * e + ' = ' + sa + ' cm^{2}.'], sa, { check: cnt * e * e });
  });
  M4[1][3].push(function (r) { // tunnel through a cube
    var m = r.int(1, 3), c = r.pick([1, 2, 3]) , a = c + 2 * m;
    if (a > 9) { a = c + 2; m = 1; }
    var sa = 6 * a * a - 2 * c * c + 4 * c * a;
    var has = function (x, y, z) { if (x < 0 || y < 0 || z < 0 || x >= a || y >= a || z >= a) return false; var mm = (a - c) / 2; return !(x >= mm && x < mm + c && y >= mm && y < mm + c); };
    return I('A solid cube with edge ' + a + ' cm has a square hole of ' + c + ' cm by ' + c + ' cm drilled straight through the centre, from the middle of one face to the middle of the opposite face. What is the total surface area of the solid, including the inside of the hole, in cm^{2}?', [
      'Start with the uncut cube: 6 × ' + a + '^{2} = ' + 6 * a * a + ' cm^{2}.',
      'The hole removes a ' + c + ' by ' + c + ' square from two faces: ' + MINUS + ' 2 × ' + c * c + ' = ' + MINUS + (2 * c * c) + '.',
      'Inside the hole are four walls, each ' + c + ' by ' + a + ': + 4 × ' + c + ' × ' + a + ' = + ' + 4 * c * a + '.',
      'Total = ' + 6 * a * a + ' ' + MINUS + ' ' + 2 * c * c + ' + ' + 4 * c * a + ' = ' + sa + ' cm^{2}.'], sa, { check: voxelSA(a, a, a, has) });
  });
  M4[1][3].push(function (r) { // corner cubes removed
    var a = r.pick([4, 6, 8, 10, 12]), c = r.int(1, a / 2 - 1), n = r.pick([1, 2, 4, 8]);
    return I('A cube of edge ' + a + ' cm has a small cube of edge ' + c + ' cm cut from ' + (n === 1 ? 'one corner' : n + ' of its corners') + '. What is the surface area of the remaining solid, in cm^{2}?', [
      'Cutting a small cube from a corner removes 3 squares of area ' + c + '^{2} from the surface.',
      'But it also exposes 3 new inner faces, each ' + c + ' by ' + c + '. The new area exactly replaces the lost area.',
      'So the surface area does not change: 6 × ' + a + '^{2} = ' + 6 * a * a + ' cm^{2}.',
      'This is a classic Gauss trap. Do not subtract anything unless the cut is on an edge or in the middle of a face.'], 6 * a * a, { check: 6 * a * a });
  });

  // ---------- m4t2: composite shapes and scaling laws ----------
  M4[2][1].push(function (r) { // L shape
    var W = r.int(8, 20), H = r.int(6, 16), w = r.int(2, W - 3), h = r.int(2, H - 3), ask = r.pick(['area', 'perimeter']);
    var st = ['The L shape is a big ' + W + ' by ' + H + ' rectangle with a ' + w + ' by ' + h + ' corner cut out.'];
    if (ask === 'area') return I('An L shaped garden is made by cutting a ' + w + ' m by ' + h + ' m rectangle out of one corner of a ' + W + ' m by ' + H + ' m rectangle. What is its area, in m^{2}?', st.concat(['Big rectangle: ' + W + ' × ' + H + ' = ' + W * H + '. Cut out: ' + w + ' × ' + h + ' = ' + w * h + '.', 'Area = ' + W * H + ' ' + MINUS + ' ' + w * h + ' = ' + (W * H - w * h) + ' m^{2}.']), W * H - w * h, { check: W * H - w * h });
    return I('An L shaped garden is made by cutting a ' + w + ' m by ' + h + ' m rectangle out of one corner of a ' + W + ' m by ' + H + ' m rectangle. What is its perimeter, in metres?', st.concat(['Slide the cut edges outward: the two edges of the notch add up to exactly the two edges they replaced. So the perimeter equals that of the big rectangle.', 'Perimeter = 2 × (' + W + ' + ' + H + ') = ' + 2 * (W + H) + ' m.', 'Shortcut: a notch in a corner never changes the perimeter.']), 2 * (W + H), { check: 2 * (W + H) });
  });
  M4[2][1].push(function (r) { // house shape
    var b = r.int(6, 16), h = r.int(4, 12), t = r.int(3, 9), A = b * h + b * t / 2;
    return D('A house shaped figure is a rectangle ' + b + ' cm wide and ' + h + ' cm tall with a triangle on top. The triangle has the top of the rectangle as its base and a height of ' + t + ' cm. Find the total area, in cm^{2}.', [
      'Rectangle: ' + b + ' × ' + h + ' = ' + b * h + '.', 'Triangle: {{1|2}} × ' + b + ' × ' + t + ' = ' + nf(b * t / 2, 1, true) + '.', 'Total = ' + b * h + ' + ' + nf(b * t / 2, 1, true) + ' = ' + nf(A, 1, true) + ' cm^{2}.'], A, 1, true, [b * h + b * t, b * h - b * t / 2, b * h], { check: b * h + b * t / 2 });
  });
  M4[2][1].push(function (r) { // trapezoid
    var a = r.int(4, 12), b = a + r.int(2, 8), h = r.int(3, 10), A = (a + b) * h / 2;
    return D('A trapezoid has parallel sides of ' + a + ' cm and ' + b + ' cm, and they are ' + h + ' cm apart. What is its area, in cm^{2}?', [
      'Area of a trapezoid = average of the parallel sides × the distance between them.', 'Average = (' + a + ' + ' + b + ') ÷ 2 = ' + (a + b) / 2 + '.', 'Area = ' + (a + b) / 2 + ' × ' + h + ' = ' + A + ' cm^{2}.'], A, 1, true, [a * h, b * h, (a + b) * h], { check: (a + b) / 2 * h });
  });
  M4[2][1].push(function (r) { // semicircle on rectangle (pi)
    var rr = r.pick([2, 4, 6]), h = r.int(3, 9), w = 2 * rr;
    return PI('A window is a rectangle ' + w + ' m wide and ' + h + ' m tall with a semicircle on top. The diameter of the semicircle is the top side of the rectangle. What is the total area, in m^{2}?', [
      'Rectangle: ' + w + ' × ' + h + ' = ' + w * h + '.', 'The semicircle has radius ' + w + ' ÷ 2 = ' + rr + '. Its area is {{1|2}} × π × ' + rr + '^{2} = {{1|2}} × ' + rr * rr + 'π = ' + rr * rr / 2 + 'π.', 'Total = ' + pie(w * h, rr * rr / 2) + ' m^{2}.', 'Leave the answer with π in it. That is the exact answer.'], w * h, rr * rr / 2, [[w * h, rr * rr], [w * h, rr * rr / 4], [w * h + rr * rr, 0]]);
  });
  M4[2][1].push(function (r) { // ring area (pi)
    var rr = r.int(2, 9), R = 2 * rr;
    return PI('A circular track has an outer radius of ' + R + ' m and an inner radius of ' + rr + ' m. What is the area of the track itself, in m^{2}?', [
      'Track area = big circle ' + MINUS + ' small circle.', 'Big circle: π × ' + R + '^{2} = ' + R * R + 'π. Small circle: π × ' + rr + '^{2} = ' + rr * rr + 'π.', 'Track = ' + R * R + 'π ' + MINUS + ' ' + rr * rr + 'π = ' + 3 * rr * rr + 'π m^{2}.', 'Factor tip: π(R^{2} ' + MINUS + ' r^{2}) means you subtract the squares, not square the difference.'], 0, 3 * rr * rr, [[0, (R - rr) * (R - rr)], [0, R * R + rr * rr], [0, 2 * rr * rr]], { visual: V.shaded('ring') });
  });

  M4[2][2].push(function (r) { // scale factor area
    var p = r.pick([[2, 1], [3, 1], [3, 2], [4, 1], [5, 2], [5, 3], [4, 3]]), m = r.int(1, 9), A = p[1] * p[1] * m, ans = p[0] * p[0] * m;
    return I('A triangle has an area of ' + A + ' cm^{2}. Every side of a similar triangle is ' + fr(p[0], p[1]) + ' times as long as the matching side of the first. What is the area of the new triangle, in cm^{2}?', [
      'Lengths scale by k = ' + fr(p[0], p[1]) + '. Areas scale by k^{2}, because area has two dimensions.',
      'k^{2} = ' + fr(p[0] * p[0], p[1] * p[1]) + '.', 'New area = ' + A + ' × ' + fr(p[0] * p[0], p[1] * p[1]) + ' = ' + ans + ' cm^{2}.', 'Divide first to keep numbers small: ' + A + ' ÷ ' + p[1] * p[1] + ' = ' + m + ', then × ' + p[0] * p[0] + '.'], ans, { check: A * p[0] * p[0] / (p[1] * p[1]) });
  });
  M4[2][2].push(function (r) { // volume scale
    var k = r.pick([2, 3, 4, 5]), v = r.int(2, 12) * 5, ans = v * k * k * k;
    return I('A model has a volume of ' + v + ' cm^{3}. A larger similar model has every length ' + k + ' times as big. What is the volume of the larger model, in cm^{3}?', [
      'For similar solids, lengths scale by k, areas by k^{2}, and volumes by k^{3}.', 'k^{3} = ' + k + ' × ' + k + ' × ' + k + ' = ' + k * k * k + '.', 'New volume = ' + v + ' × ' + k * k * k + ' = ' + ans + ' cm^{3}.'], ans, { check: v * Math.pow(k, 3) });
  });
  M4[2][2].push(function (r) { // percent increase of sides
    var p = r.pick([10, 20, 30, 40, 50, 60, 80, 100]), kind = r.pick(['area', 'volume']), f = 1 + p / 100;
    if (kind === 'area') { var ans = Math.round((f * f - 1) * 100); return I('Every side of a square is made ' + p + '% longer. By what percent does its area increase?', ['The new side is ' + f + ' times the old side, so the new area is ' + f + '^{2} = ' + nf(f * f, 2, true) + ' times the old area.', 'An area of ' + nf(f * f, 2, true) + ' times is an increase of ' + nf(f * f, 2, true) + ' ' + MINUS + ' 1 = ' + nf(f * f - 1, 2, true) + ', which is ' + ans + '%.', 'Warning: the area does not go up by ' + p + '%. Percent changes on lengths square when they become areas.'], ans, { check: Math.round((f * f - 1) * 100) }); }
    var v = rd((f * f * f - 1) * 100, 1);
    return D('Every edge of a cube is made ' + p + '% longer. By what percent does its volume increase?', ['The new edge is ' + f + ' times the old edge, so the volume is ' + f + '^{3} = ' + nf(f * f * f, 3, true) + ' times the old volume.', 'The increase is ' + nf(f * f * f, 3, true) + ' ' + MINUS + ' 1 = ' + nf(f * f * f - 1, 3, true) + ', which is ' + nf(v, 1, true) + '%.'], v, 1, true, [p * 3, (f * f - 1) * 100, f * f * f * 100], { check: v });
  });
  M4[2][2].push(function (r) { // ratio perimeter to area
    var p = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [1, 4]]), m = r.int(1, 8), A = p[0] * p[0] * m, ans = p[1] * p[1] * m;
    return I('Two similar figures have perimeters in the ratio ' + p[0] + ' : ' + p[1] + '. The smaller has area ' + A + ' cm^{2}. What is the area of the larger, in cm^{2}?', [
      'Perimeters are lengths, so the scale factor from small to large is ' + fr(p[1], p[0]) + '.', 'Areas scale by the square: ' + fr(p[1] * p[1], p[0] * p[0]) + '.', 'Larger area = ' + A + ' × ' + fr(p[1] * p[1], p[0] * p[0]) + ' = ' + m + ' × ' + p[1] * p[1] + ' = ' + ans + ' cm^{2}.'], ans, { check: A / (p[0] * p[0]) * p[1] * p[1] });
  });
  M4[2][2].push(function (r) { // paint
    var k = r.pick([2, 3, 4, 5]), litres = r.int(2, 9), A = r.int(3, 9) * 4, ans = litres * k * k;
    return I('It takes ' + litres + ' litres of paint to cover a wall of area ' + A + ' m^{2}. A similar wall is ' + k + ' times as wide and ' + k + ' times as tall. How many litres are needed for it?', [
      'Width and height are both multiplied by ' + k + ', so the area is multiplied by ' + k + ' × ' + k + ' = ' + k * k + '.', 'Paint is proportional to area: ' + litres + ' × ' + k * k + ' = ' + ans + ' litres.', 'The ' + A + ' m^{2} figure is a distraction. Only the scale factor matters.'], ans, { check: litres * k * k });
  });
  M4[2][2].push(function (r) { // statue weight
    var h1 = r.pick([10, 20, 30, 40]), k = r.pick([2, 3, 4, 5]), w = r.int(2, 9), ans = w * k * k * k;
    return I('A model statue is ' + h1 + ' cm tall and has a mass of ' + w + ' kg. A statue made of the same material and with the same shape is ' + h1 * k + ' cm tall. What is its mass, in kg?', [
      'Height scale factor: ' + h1 * k + ' ÷ ' + h1 + ' = ' + k + '.', 'Mass depends on volume, so it scales by k^{3} = ' + k * k * k + '.', 'New mass = ' + w + ' × ' + k * k * k + ' = ' + ans + ' kg.'], ans, { check: w * Math.pow(k * h1 / h1, 3) });
  });
  M4[2][2].push(function (r) { // map scale
    var s = r.pick([[50000, 0.5], [100000, 1], [200000, 2], [25000, 0.25]]), A = r.pick([4, 8, 12, 16, 20, 24]), ans = A * s[1] * s[1];
    return D('On a map with scale 1 : ' + fmt(s[0]) + ', a lake covers ' + A + ' cm^{2}. What is the real area of the lake, in km^{2}?', [
      '1 cm on the map is ' + fmt(s[0]) + ' cm in real life, which is ' + s[1] + ' km.', 'Area scales by the square: 1 cm^{2} on the map is ' + s[1] + ' × ' + s[1] + ' = ' + nf(s[1] * s[1], 4, true) + ' km^{2}.', 'Real area = ' + A + ' × ' + nf(s[1] * s[1], 4, true) + ' = ' + nf(ans, 2, true) + ' km^{2}.'], ans, 2, true, [A * s[1], A * s[1] * s[1] * 10, A / (s[1] * s[1])], { check: A * s[1] * s[1] });
  });

  M4[2][3].push(function (r) { // cut cube into small cubes: SA
    var n = r.int(2, 6), a = n * r.int(1, 3), e = a / n;
    return I('A cube with edge ' + a + ' cm is cut into ' + n * n * n + ' identical small cubes. What is the total surface area of all the small cubes, in cm^{2}?', [
      'Each small cube has edge ' + a + ' ÷ ' + n + ' = ' + e + ' cm, so one small cube has surface area 6 × ' + e + '^{2} = ' + 6 * e * e + ' cm^{2}.', 'Total = ' + n * n * n + ' × ' + 6 * e * e + ' = ' + n * n * n * 6 * e * e + ' cm^{2}.', 'Quick check: the original cube has SA ' + 6 * a * a + '. Cutting into n^{3} cubes multiplies the total surface area by n = ' + n + '. And ' + 6 * a * a + ' × ' + n + ' = ' + 6 * a * a * n + '.'], 6 * a * a * n, { check: n * n * n * 6 * e * e });
  });
  M4[2][3].push(function (r) { // pyramid frustum
    var n = r.pick([2, 3, 4, 5]), m = r.int(2, 9), Vw = n * n * n * m, top = m, ans = Vw - top;
    return I('A pyramid has volume ' + Vw + ' cm^{3}. A slice parallel to the base is cut off at ' + fr(1, n) + ' of the height measured from the top point, leaving a small pyramid on top and a flat topped piece below. What is the volume of the bottom piece, in cm^{3}?', [
      'The small pyramid is similar to the whole one, with scale factor ' + fr(1, n) + '.', 'Volumes scale by ' + '(1 ÷ ' + n + ')^{3} = ' + fr(1, n * n * n) + ', so the small pyramid has volume ' + Vw + ' ÷ ' + n * n * n + ' = ' + top + ' cm^{3}.', 'Bottom piece = ' + Vw + ' ' + MINUS + ' ' + top + ' = ' + ans + ' cm^{3}.'], ans, { check: Vw * (1 - 1 / (n * n * n)) });
  });
  M4[2][3].push(function (r) { // reverse percent area to side
    var p = r.pick([[10, 21], [20, 44], [30, 69], [40, 96], [50, 125], [60, 156], [100, 300]]);
    return I('When every side of a square is made longer by the same percent, the area of the square increases by ' + p[1] + '%. By what percent did each side increase?', [
      'An increase of ' + p[1] + '% means the new area is ' + (100 + p[1]) + '% = ' + nf(1 + p[1] / 100, 2, true) + ' times the old area.', 'The side scale factor k satisfies k^{2} = ' + nf(1 + p[1] / 100, 2, true) + ', so k = √{' + nf(1 + p[1] / 100, 2, true) + '} = ' + nf(1 + p[0] / 100, 1, true) + '.', 'A factor of ' + nf(1 + p[0] / 100, 1, true) + ' is an increase of ' + p[0] + '%.'], p[0], { check: Math.round((Math.sqrt(1 + p[1] / 100) - 1) * 100) });
  });
  M4[2][3].push(function (r) { // rectangle length up width down
    var p = r.pick([10, 20, 30, 40, 50]), q = r.pick([10, 20, 30, 40, 50]), f = (100 + p) * (100 - q) / 100 - 100;
    return I('The length of a rectangle is increased by ' + p + '% and its width is decreased by ' + q + '%. By what percent does the area change? (Give a negative answer for a decrease.)', [
      'New length = ' + (100 + p) + '% = ' + nf(1 + p / 100, 2, true) + ' of the old. New width = ' + (100 - q) + '% = ' + nf(1 - q / 100, 2, true) + ' of the old.', 'The area is multiplied by ' + nf(1 + p / 100, 2, true) + ' × ' + nf(1 - q / 100, 2, true) + ' = ' + nf((1 + p / 100) * (1 - q / 100), 4, true) + '.', 'Change = ' + nf((1 + p / 100) * (1 - q / 100), 4, true) + ' ' + MINUS + ' 1 = ' + nf(f / 100, 4, true) + ', which is ' + nf(f, 0, true) + '%.'], Math.round(f), { check: Math.round(f) });
  });
  M4[2][3].push(function (r) { // three face areas to volume
    var l = r.int(2, 9), w = r.int(2, 9), h = r.int(2, 9), A = l * w, B = w * h, Cc = l * h, v = l * w * h;
    return I('A rectangular box has faces with areas ' + A + ' cm^{2}, ' + B + ' cm^{2} and ' + Cc + ' cm^{2} (one from each of the three different kinds of face). What is the volume of the box, in cm^{3}?', [
      'Call the edges l, w, h. Then lw = ' + A + ', wh = ' + B + ' and lh = ' + Cc + '.', 'Multiply all three: (lw)(wh)(lh) = (lwh)^{2} = ' + A + ' × ' + B + ' × ' + Cc + ' = ' + A * B * Cc + '.', 'So lwh = √{' + A * B * Cc + '} = ' + v + ' cm^{3}.', 'No need to find the individual edges.'], v, { check: Math.sqrt(A * B * Cc) });
  });

  // ---------- m4t3: angles, parallel lines and polygons ----------
  // Diagram positions: 1 to 4 at the top crossing, 5 to 8 at the bottom crossing. Positions 2, 4, 6, 8 are acute, the others obtuse.
  var PAIRS = [[3, 5, 'alternate interior angles', 'equal'], [4, 6, 'alternate interior angles', 'equal'], [3, 6, 'co-interior angles (same side interior)', 'sum'], [4, 5, 'co-interior angles (same side interior)', 'sum'],
    [1, 5, 'corresponding angles', 'equal'], [2, 6, 'corresponding angles', 'equal'], [3, 7, 'corresponding angles', 'equal'], [4, 8, 'corresponding angles', 'equal'],
    [1, 7, 'alternate exterior angles', 'equal'], [2, 8, 'alternate exterior angles', 'equal'], [1, 3, 'vertically opposite angles', 'equal'], [2, 4, 'vertically opposite angles', 'equal'],
    [1, 2, 'angles on a straight line', 'sum'], [2, 3, 'angles on a straight line', 'sum'], [1, 4, 'angles on a straight line', 'sum']];
  function posVal(p, alpha) { return p % 2 === 0 ? alpha : 180 - alpha; }

  M4[3][1].push(function (r) { // parallel line angle relations
    var alpha = r.int(35, 80), pr = r.pick(PAIRS), sw = r.chance(0.5), p1 = sw ? pr[1] : pr[0], p2 = sw ? pr[0] : pr[1], g = posVal(p1, alpha), ans = posVal(p2, alpha);
    return I('The two horizontal lines in the diagram are parallel. The angle at position ' + p1 + ' is ' + g + '°. Find the angle marked with a question mark at position ' + p2 + '.', [
      'The positions ' + p1 + ' and ' + p2 + ' are ' + pr[2] + '.',
      pr[3] === 'equal' ? 'These angles are equal, so the answer is ' + g + '°.' : 'These angles add up to 180°, so the answer is 180° ' + MINUS + ' ' + g + '° = ' + ans + '°.',
      ans === g && pr[3] !== 'equal' ? '' : 'Look at the diagram: acute angles match acute angles, and obtuse match obtuse. Only a pair of an acute and an obtuse angle adds to 180°.'].filter(Boolean), ans, { check: ans, visual: V.parallelTransversal(p1, g + '°', p2, '?') });
  });
  M4[3][1].push(function (r) { // triangle with algebra
    var k = r.pick([[1, 2, 3], [1, 2, 6], [2, 3, 4], [1, 3, 5], [2, 3, 7], [1, 4, 7]]), s = k[0] + k[1] + k[2], x = 180 / s;
    if (x !== Math.round(x)) return M4[3][1][1](r);
    var big = Math.max.apply(null, k) * x;
    return I('The three angles of a triangle are in the ratio ' + k.join(' : ') + '. What is the size of the largest angle, in degrees?', [
      'Angles in a triangle add up to 180°. There are ' + k.join(' + ') + ' = ' + s + ' equal parts.', 'One part = 180° ÷ ' + s + ' = ' + x + '°.', 'Largest angle = ' + Math.max.apply(null, k) + ' × ' + x + '° = ' + big + '°.'], big, { check: 180 * Math.max.apply(null, k) / s });
  });
  M4[3][1].push(function (r) { // regular polygon interior
    var n = r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20]), ext = 360 / n, inn = 180 - ext, ask = r.pick(['interior', 'sum']);
    if (ask === 'interior') return I('What is the size of one interior angle of a regular polygon with ' + n + ' sides, in degrees?', ['Every exterior angle of a regular polygon is 360° ÷ ' + n + ' = ' + ext + '°.', 'The interior and exterior angles at a vertex make a straight line: 180° ' + MINUS + ' ' + ext + '° = ' + inn + '°.', 'Check with the sum formula: (' + n + ' ' + MINUS + ' 2) × 180 ÷ ' + n + ' = ' + (n - 2) * 180 + ' ÷ ' + n + ' = ' + inn + '°.'], inn, { check: (n - 2) * 180 / n, visual: n <= 12 ? V.polygonAngles(n) : '' });
    return I('What is the sum of the interior angles of a polygon with ' + n + ' sides, in degrees?', ['Split the polygon into triangles from one corner. That makes ' + n + ' ' + MINUS + ' 2 = ' + (n - 2) + ' triangles.', 'Each triangle adds 180°: ' + (n - 2) + ' × 180° = ' + (n - 2) * 180 + '°.'], (n - 2) * 180, { check: (n - 2) * 180, visual: n <= 12 ? V.polygonAngles(n) : '' });
  });
  M4[3][1].push(function (r) { // exterior angle of triangle algebra
    var a = r.int(20, 60), b = r.int(25, 70), ext = a + b;
    return I('In triangle ABC, angle A = ' + a + '° and angle B = ' + b + '°. Side BC is extended past C to a point D. What is the exterior angle ACD, in degrees?', ['An exterior angle equals the sum of the two opposite interior angles.', 'ACD = ' + a + '° + ' + b + '° = ' + ext + '°.', 'Check the long way: angle C = 180° ' + MINUS + ' ' + a + '° ' + MINUS + ' ' + b + '° = ' + (180 - ext) + '°, and 180° ' + MINUS + ' ' + (180 - ext) + '° = ' + ext + '°.'], ext, { check: 180 - (180 - a - b) });
  });
  M4[3][1].push(function (r) { // polygon missing angle
    var n = r.pick([4, 5, 6]), sum = (n - 2) * 180, angs = [], rem = sum, i;
    for (i = 0; i < n - 1; i++) { var lo = 60, hi = Math.min(170, rem - 60 * (n - 1 - i) - 30); var v = r.int(lo, Math.max(lo, hi)); angs.push(v); rem -= v; }
    if (rem < 30 || rem > 178) return M4[3][1][4](r);
    return I('A ' + ['', '', '', '', 'quadrilateral', 'pentagon', 'hexagon'][n] + ' has ' + (n - 1) + ' angles measuring ' + angs.map(function (a) { return a + '°'; }).join(', ') + '. What is the size of the last angle, in degrees?', ['A polygon with ' + n + ' sides has an angle sum of (' + n + ' ' + MINUS + ' 2) × 180° = ' + sum + '°.', 'The known angles add to ' + angs.join(' + ') + ' = ' + (sum - rem) + '°.', 'Last angle = ' + sum + '° ' + MINUS + ' ' + (sum - rem) + '° = ' + rem + '°.'], rem, { check: sum - angs.reduce(function (s, a) { return s + a; }, 0) });
  });

  M4[3][2].push(function (r) { // bent line
    var a = r.int(25, 75), c = r.int(25, 75);
    return I('In the diagram AB is parallel to CD. Angle BAE = ' + a + '° and angle DCE = ' + c + '°. What is angle AEC, in degrees?', [
      'Draw a line through E parallel to AB and CD. Now the bend at E is split into two angles.',
      'The upper part equals angle BAE = ' + a + '° (alternate angles). The lower part equals angle DCE = ' + c + '° (alternate angles).',
      'Angle AEC = ' + a + '° + ' + c + '° = ' + (a + c) + '°.', 'General rule: a bent line between two parallel lines has a bend angle equal to the sum of the two outer angles.'], a + c, { check: a + c, visual: V.bentLine(a, c) });
  });
  M4[3][2].push(function (r) { // number of sides from interior angle
    var n = r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]), inn = 180 - 360 / n;
    return I('Each interior angle of a regular polygon is ' + inn + '°. How many sides does the polygon have?', ['The exterior angle is 180° ' + MINUS + ' ' + inn + '° = ' + (180 - inn) + '°.', 'The exterior angles of any polygon add to 360°, so the number of sides is 360 ÷ ' + (180 - inn) + ' = ' + n + '.', 'This is much faster than solving (n ' + MINUS + ' 2) × 180 = ' + inn + 'n.'], n, { check: 360 / (180 - inn) });
  });
  M4[3][2].push(function (r) { // solve angle with x
    var n = r.pick([5, 6]), sum = (n - 2) * 180, x = r.int(10, 30), co = r.shuffle(n === 5 ? [1, 2, 3, 2, 2] : [1, 2, 2, 3, 2, 2]).slice(0, n), tot = co.reduce(function (s, v) { return s + v; }, 0);
    x = sum / tot; if (x !== Math.round(x)) { co = n === 5 ? [1, 2, 3, 3, 3] : [2, 2, 2, 3, 3, 4]; tot = co.reduce(function (s, v) { return s + v; }, 0); x = sum / tot; }
    if (x !== Math.round(x)) return M4[3][2][0](r);
    var mx = Math.max.apply(null, co) * x;
    return I('The angles of a ' + (n === 5 ? 'pentagon' : 'hexagon') + ' are ' + co.map(function (c) { return c === 1 ? 'x' : c + 'x'; }).join(', ') + ' (in degrees). What is the size of the largest angle?', ['Angle sum of a ' + (n === 5 ? 'pentagon' : 'hexagon') + ' = (' + n + ' ' + MINUS + ' 2) × 180° = ' + sum + '°.', 'Add up the x terms: ' + co.map(function (c) { return c === 1 ? 'x' : c + 'x'; }).join(' + ') + ' = ' + tot + 'x.', tot + 'x = ' + sum + ', so x = ' + x + '.', 'Largest angle = ' + Math.max.apply(null, co) + ' × ' + x + ' = ' + mx + '°.'], mx, { check: sum / tot * Math.max.apply(null, co) });
  });
  M4[3][2].push(function (r) { // isosceles chain
    var th = r.pick([20, 24, 28, 30, 32, 36, 40, 44, 48, 50, 52, 56]), base = (180 - th) / 2, ans = base - th;
    return I('In triangle ABC, AB = AC and angle BAC = ' + th + '°. Point D lies on side AC so that BD = BC. What is angle ABD, in degrees?', [
      'AB = AC, so the base angles are equal: angle ABC = angle ACB = (180° ' + MINUS + ' ' + th + '°) ÷ 2 = ' + base + '°.',
      'In triangle BDC, BD = BC, so angle BDC = angle BCD = ' + base + '°. Then angle DBC = 180° ' + MINUS + ' 2 × ' + base + '° = ' + (180 - 2 * base) + '°.',
      'Angle ABD = angle ABC ' + MINUS + ' angle DBC = ' + base + '° ' + MINUS + ' ' + (180 - 2 * base) + '° = ' + ans + '°.'], ans, { check: (180 - th) / 2 - (180 - 2 * ((180 - th) / 2)) });
  });
  M4[3][2].push(function (r) { // exterior angle sides to interior sum
    var n = r.pick([5, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40]), ext = 360 / n, sum = (n - 2) * 180;
    return I('One exterior angle of a regular polygon is ' + ext + '°. What is the sum of all its interior angles, in degrees?', ['Number of sides = 360 ÷ ' + ext + ' = ' + n + '.', 'Interior angle sum = (' + n + ' ' + MINUS + ' 2) × 180° = ' + (n - 2) + ' × 180° = ' + sum + '°.'], sum, { check: (360 / ext - 2) * 180 });
  });

  M4[3][3].push(function (r) { // star tips
    var tips = [r.int(20, 50), r.int(20, 50), r.int(20, 50), r.int(15, 40)], s = tips.reduce(function (a, b) { return a + b; }, 0), last = 180 - s;
    return I('A five pointed star is made by extending the sides of a pentagon. Four of the tip angles are ' + tips.map(function (t) { return t + '°'; }).join(', ') + '. What is the fifth tip angle, in degrees?', [
      'The five tip angles of any star like this add up to 180°. (Each tip is a triangle. The sum of the tips comes from the exterior angle rule applied around the star.)',
      'Known tips: ' + tips.join(' + ') + ' = ' + s + '°.', 'Fifth tip = 180° ' + MINUS + ' ' + s + '° = ' + last + '°.'], last, { check: 180 - tips.reduce(function (a, b) { return a + b; }, 0) });
  });
  M4[3][3].push(function (r) { // clock angle
    var h = r.int(1, 12), m = r.pick([10, 15, 20, 24, 30, 36, 40, 42, 48, 50]), ang = Math.abs(30 * (h % 12) - 5.5 * m); if (ang > 180) ang = 360 - ang;
    return D('What is the smaller angle between the hour hand and the minute hand of a clock at ' + h + ':' + (m < 10 ? '0' : '') + m + '? Give the answer in degrees.', [
      'The minute hand moves 360° in 60 minutes, which is 6° per minute. At ' + m + ' minutes it is at ' + 6 * m + '°.',
      'The hour hand moves 30° per hour, which is 0.5° per minute. At ' + h + ':' + (m < 10 ? '0' : '') + m + ' it is at ' + 30 * (h % 12) + '° + ' + m + ' × 0.5° = ' + nf(30 * (h % 12) + 0.5 * m, 1, true) + '°.',
      'The difference is |' + nf(30 * (h % 12) + 0.5 * m, 1, true) + ' ' + MINUS + ' ' + 6 * m + '| = ' + nf(Math.abs(30 * (h % 12) + 0.5 * m - 6 * m), 1, true) + '°' + (Math.abs(30 * (h % 12) + 0.5 * m - 6 * m) > 180 ? ', which is over 180°, so take 360° minus it.' : '.'),
      'Smaller angle = ' + nf(ang, 1, true) + '°.'], ang, 1, true, [Math.abs(30 * h - 6 * m), 360 - ang, Math.abs(30 * h - 5 * m)], { check: ang });
  });
  M4[3][3].push(function (r) { // polygon diagonal angle
    var n = r.pick([5, 6, 9, 10, 12, 15, 18, 20]), ans = 180 - 540 / n, inn = 180 - 360 / n, small = 180 / n;
    return I('ABCDE... is a regular polygon with ' + n + ' sides, labelled in order around it. What is angle ACD, in degrees?', [
      'Each interior angle is 180° ' + MINUS + ' 360° ÷ ' + n + ' = ' + inn + '°, so angle BCD = ' + inn + '°.',
      'Triangle ABC is isosceles with AB = BC and apex angle ' + inn + '°. So angle ACB = (180° ' + MINUS + ' ' + inn + '°) ÷ 2 = ' + small + '°.',
      'Angle ACD = angle BCD ' + MINUS + ' angle ACB = ' + inn + '° ' + MINUS + ' ' + small + '° = ' + ans + '°.'], ans, { check: (n - 2) * 180 / n - (180 - (n - 2) * 180 / n) / 2 });
  });
  M4[3][3].push(function (r) { // incentre angle
    var A = r.pick([20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]), ans = 90 + A / 2;
    return I('In triangle ABC, angle A = ' + A + '°. The bisectors of angles B and C meet at point I. What is angle BIC, in degrees?', [
      'Let angle B = 2x and angle C = 2y, so the bisectors make angles x and y. Then 2x + 2y + ' + A + '° = 180°, so x + y = ' + (180 - A) / 2 + '°.',
      'In triangle BIC, angle BIC = 180° ' + MINUS + ' x ' + MINUS + ' y = 180° ' + MINUS + ' ' + (180 - A) / 2 + '° = ' + ans + '°.', 'Formula: angle BIC = 90° + A ÷ 2 = 90° + ' + A / 2 + '° = ' + ans + '°.'], ans, { check: 180 - (180 - A) / 2 });
  });
  M4[3][3].push(function (r) { // external bisectors
    var A = r.pick([20, 30, 40, 50, 60, 70, 80, 100, 120]), ans = 90 - A / 2;
    return I('In triangle ABC, angle A = ' + A + '°. The bisectors of the exterior angles at B and at C meet at point E. What is angle BEC, in degrees?', [
      'Let angle B = b and angle C = c, with b + c = 180° ' + MINUS + ' ' + A + '° = ' + (180 - A) + '°.',
      'The exterior angle at B is 180° ' + MINUS + ' b, so its bisector makes an angle of 90° ' + MINUS + ' b/2 with side BC. Similarly at C it is 90° ' + MINUS + ' c/2.',
      'In triangle BEC, angle BEC = 180° ' + MINUS + ' (90° ' + MINUS + ' b/2) ' + MINUS + ' (90° ' + MINUS + ' c/2) = (b + c)/2 = ' + (180 - A) / 2 + '°.',
      'That is 90° ' + MINUS + ' A/2 = 90° ' + MINUS + ' ' + A / 2 + '° = ' + ans + '°.'], ans, { check: (180 - A) / 2 });
  });

  // ---------- m4t4: shaded areas ----------
  M4[4][1].push(function (r) { // square minus inscribed circle
    var rr = r.int(2, 9), s = 2 * rr;
    return PI('A circle fits exactly inside a square of side ' + s + ' cm, touching all four sides. What is the shaded area (the square outside the circle), in cm^{2}?', ['The circle touches all four sides, so its diameter is ' + s + ' and its radius is ' + rr + '.', 'Square area = ' + s + ' × ' + s + ' = ' + s * s + '. Circle area = π × ' + rr + '^{2} = ' + rr * rr + 'π.', 'Shaded = ' + s * s + ' ' + MINUS + ' ' + rr * rr + 'π = ' + pie(s * s, -rr * rr) + '.', 'A quick sanity check: π is about 3.14, so the circle covers about 78.5% of the square. The shaded part is about 21.5%.'], s * s, -rr * rr, [[s * s, -s * s], [rr * rr, -s * s], [s * s, -2 * rr]], { visual: V.shaded('inscribed') });
  });
  M4[4][1].push(function (r) { // quarter circle
    var s = 2 * r.int(2, 9);
    return PI('The square has side ' + s + ' cm. A quarter circle of radius ' + s + ' cm is drawn with its centre at one corner of the square, so the arc joins the two neighbouring corners. What is the shaded area outside the quarter circle, in cm^{2}?', ['Square = ' + s + ' × ' + s + ' = ' + s * s + '.', 'Quarter circle = {{1|4}} × π × ' + s + '^{2} = ' + s * s / 4 + 'π.', 'Shaded = ' + s * s + ' ' + MINUS + ' ' + s * s / 4 + 'π = ' + pie(s * s, -s * s / 4) + '.'], s * s, -s * s / 4, [[s * s, -s * s / 2], [s * s, -s * s], [s * s / 4, -s * s]], { visual: V.shaded('quarter') });
  });
  M4[4][1].push(function (r) { // rectangle minus triangle
    var w = r.int(6, 16), h = r.int(4, 12), tri = w * h / 2, A = w * h - tri;
    return D('A rectangle is ' + w + ' cm by ' + h + ' cm. A triangle is drawn inside it using one whole side as its base and the opposite side for its top point. What is the area of the rectangle that is not part of the triangle, in cm^{2}?', ['Triangle area = {{1|2}} × base × height = {{1|2}} × ' + w + ' × ' + h + ' = ' + nf(tri, 1, true) + '.', 'Rectangle area = ' + w * h + '.', 'Not in the triangle = ' + w * h + ' ' + MINUS + ' ' + nf(tri, 1, true) + ' = ' + nf(A, 1, true) + ' cm^{2}.', 'Idea: any triangle that shares a full side of a rectangle and reaches the opposite side takes up exactly half of it.'], A, 1, true, [w * h, tri / 2, w * h - w], { check: w * h / 2 });
  });
  M4[4][1].push(function (r) { // ring, radius double
    var rr = r.int(2, 8);
    return PI('Two circles share a centre. The inner one has radius ' + rr + ' cm and the outer one has radius ' + 2 * rr + ' cm. What is the shaded area between them, in cm^{2}?', ['Outer circle = π × ' + 2 * rr + '^{2} = ' + 4 * rr * rr + 'π. Inner circle = π × ' + rr + '^{2} = ' + rr * rr + 'π.', 'Shaded = ' + 4 * rr * rr + 'π ' + MINUS + ' ' + rr * rr + 'π = ' + 3 * rr * rr + 'π.', 'Notice: doubling the radius multiplies the area by 4, so the ring is 3 times the inner circle.'], 0, 3 * rr * rr, [[0, rr * rr], [0, 2 * rr * rr], [0, 5 * rr * rr]], { visual: V.shaded('ring') });
  });

  M4[4][2].push(function (r) { // four circles in square
    var rr = r.int(1, 6), s = 4 * rr;
    return PI('Four identical circles fit inside a square of side ' + s + ' cm, each touching two sides of the square and two of the other circles. What is the area of the square not covered by the circles, in cm^{2}?', ['Two circles fit across the side, so each diameter is ' + s + ' ÷ 2 = ' + 2 * rr + ' and each radius is ' + rr + '.', 'Four circles: 4 × π × ' + rr + '^{2} = ' + 4 * rr * rr + 'π.', 'Square: ' + s + '^{2} = ' + s * s + '. Shaded = ' + pie(s * s, -4 * rr * rr) + '.'], s * s, -4 * rr * rr, [[s * s, -2 * rr * rr], [s * s, -rr * rr], [s * s, -8 * rr * rr]], { visual: V.shaded('four') });
  });
  M4[4][2].push(function (r) { // circle minus inscribed square (nested)
    var h = r.int(2, 9);
    return PI('A square has side ' + 2 * h + ' cm and a circle is drawn inside it touching all four sides. A second square is then drawn inside the circle with its four corners on the circle. What is the shaded area between the circle and the inner square, in cm^{2}?', ['The circle has radius ' + h + ', so its area is ' + h * h + 'π.', 'The inner square has its diagonal equal to the circle diameter ' + 2 * h + '. A square with diagonal d has area d^{2} ÷ 2 = ' + 4 * h * h + ' ÷ 2 = ' + 2 * h * h + '.', 'Shaded = ' + h * h + 'π ' + MINUS + ' ' + 2 * h * h + ' = ' + pie(-2 * h * h, h * h) + '.'], -2 * h * h, h * h, [[-h * h, 2 * h * h], [-4 * h * h, h * h], [-2 * h * h, 2 * h * h]], { visual: V.shaded('nested') });
  });
  M4[4][2].push(function (r) { // lens
    var s = 2 * r.int(2, 8);
    return PI('Square ABCD has side ' + s + ' cm. One quarter circle of radius ' + s + ' cm is drawn with centre A, and another quarter circle of radius ' + s + ' cm with centre C, both inside the square. What is the area of the shaded region where the two quarter circles overlap, in cm^{2}?', ['Add the areas of the two quarter circles: 2 × {{1|4}}π × ' + s + '^{2} = ' + s * s / 2 + 'π.', 'The quarter circles together cover the whole square, and the overlap is counted twice. So sum ' + MINUS + ' square = overlap.', 'Overlap = ' + s * s / 2 + 'π ' + MINUS + ' ' + s * s + ' = ' + pie(-s * s, s * s / 2) + '.', 'This add then subtract the whole trick is the standard way to find an overlap.'], -s * s, s * s / 2, [[-s * s, s * s / 4], [s * s, s * s / 2], [-s * s / 2, s * s / 2]], { visual: V.shaded('lens') });
  });
  M4[4][2].push(function (r) { // midpoints diamond
    var w = r.int(3, 12) * 2, h = r.int(3, 10) * 2, ans = w * h / 2;
    return I('The midpoints of the four sides of a ' + w + ' cm by ' + h + ' cm rectangle are joined in order to make a diamond. What is the area of the diamond, in cm^{2}?', ['Joining the midpoints cuts off four right triangles from the corners.', 'Each has legs ' + w / 2 + ' and ' + h / 2 + ', so area {{1|2}} × ' + w / 2 + ' × ' + h / 2 + ' = ' + w * h / 8 + '. Four of them: ' + w * h / 2 + '.', 'Diamond = ' + w * h + ' ' + MINUS + ' ' + w * h / 2 + ' = ' + ans + ' cm^{2}. The diamond is always exactly half of the rectangle.'], ans, { check: w * h - 4 * (0.5 * (w / 2) * (h / 2)) });
  });

  M4[4][3].push(function (r) { // chord tangent to inner circle
    var x = r.int(2, 12);
    return PI('Two circles share the same centre. A chord of the larger circle is ' + 2 * x + ' cm long and just touches the smaller circle. What is the area of the ring between the circles, in cm^{2}?', ['Let R and r be the two radii. The chord touches the small circle at its midpoint, and that radius r is perpendicular to the chord.', 'That gives a right triangle with legs r and ' + x + ' (half the chord) and hypotenuse R. So R^{2} = r^{2} + ' + x + '^{2}.', 'Ring area = π R^{2} ' + MINUS + ' π r^{2} = π(R^{2} ' + MINUS + ' r^{2}) = π × ' + x + '^{2} = ' + x * x + 'π.', 'You never need R or r separately. The ring area only depends on half the chord.'], 0, x * x, [[0, 2 * x], [0, 4 * x * x], [0, x]], {});
  });
  M4[4][3].push(function (r) { // lunes
    var t = trip(r, 4, 2), a = t.a, b = t.b;
    return I('A right triangle has legs ' + a + ' cm and ' + b + ' cm. A semicircle is drawn on the hypotenuse so that it passes through the right angle corner. Semicircles are also drawn outward on each leg. The two crescents that lie inside the leg semicircles but outside the hypotenuse semicircle are shaded. What is the total shaded area, in cm^{2}?', [
      'Semicircle areas are proportional to the squares of their diameters. So the semicircle on the hypotenuse equals the two leg semicircles added together (Pythagoras again).',
      'Shaded crescents = (two leg semicircles + triangle) ' + MINUS + ' hypotenuse semicircle. The semicircles cancel, leaving only the triangle.',
      'Area = {{1|2}} × ' + a + ' × ' + b + ' = ' + a * b / 2 + ' cm^{2}. This is the famous lunes of Hippocrates result.'], a * b / 2, { check: a * b / 2 });
  });
  M4[4][3].push(function (r) { // repeated midpoint squares
    var n = r.int(2, 5), s = Math.pow(2, Math.ceil(n / 2)) * r.int(1, 3), area = s * s, ans = area / Math.pow(2, n);
    return I('A square has side ' + s + ' cm. The midpoints of its sides are joined to make a second square. The midpoints of that square are joined to make a third square, and so on. What is the area of square number ' + (n + 1) + ' (the ' + ord(n + 1) + ' square), in cm^{2}?', ['Joining midpoints of a square always makes a new square with exactly half the area.', 'The first square has area ' + s + '^{2} = ' + area + '.', 'Each step halves the area, so after ' + n + ' steps the area is ' + area + ' ÷ 2^{' + n + '} = ' + area + ' ÷ ' + Math.pow(2, n) + ' = ' + ans + ' cm^{2}.'], ans, { check: s * s * Math.pow(0.5, n) });
  });
  M4[4][3].push(function (r) { // arbelos
    var a = r.int(2, 9), b = r.int(2, 9), R = a + b;
    return PI('A large semicircle has diameter AB. A point C is placed on AB so that AC = ' + 2 * a + ' cm and CB = ' + 2 * b + ' cm. Two smaller semicircles are drawn on AC and CB as diameters, on the same side as the large one. What is the area inside the large semicircle but outside both small ones, in cm^{2}?', ['Radii: large = ' + R + ' (since AB = ' + 2 * R + '), small ones = ' + a + ' and ' + b + '.', 'Shaded = {{1|2}}π(' + R + '^{2} ' + MINUS + ' ' + a + '^{2} ' + MINUS + ' ' + b + '^{2}) = {{1|2}}π(' + (R * R - a * a - b * b) + ') = ' + (R * R - a * a - b * b) / 2 + 'π.', 'Shortcut: R^{2} ' + MINUS + ' a^{2} ' + MINUS + ' b^{2} = (a + b)^{2} ' + MINUS + ' a^{2} ' + MINUS + ' b^{2} = 2ab, so the shaded area is π × a × b = ' + a * b + 'π.'], 0, a * b, [[0, 2 * a * b], [0, a * b / 2], [0, R * R - a * a - b * b + 1]], {});
  });
  M4[4][3].push(function (r) { // rectangle in circle
    var t = trip(r, 3, 2), k = t.k % 2 === 0 ? t.k : t.k * 2, sc = k / t.k, a = t.t[0] * k, b = t.t[1] * k, c = t.t[2] * k, rr = c / 2;
    return PI('A rectangle measuring ' + a + ' cm by ' + b + ' cm is drawn inside a circle so that all four corners are on the circle. What is the area inside the circle but outside the rectangle, in cm^{2}?', ['The rectangle has a right angle at every corner, so its diagonal is a diameter of the circle.', 'Diagonal = √{' + a + '^{2} + ' + b + '^{2}} = ' + c + ', so the radius is ' + rr + '.', 'Circle = π × ' + rr + '^{2} = ' + rr * rr + 'π. Rectangle = ' + a + ' × ' + b + ' = ' + a * b + '.', 'Shaded = ' + rr * rr + 'π ' + MINUS + ' ' + a * b + ' = ' + pie(-a * b, rr * rr) + '.'], -a * b, rr * rr, [[-a * b, c * c], [-a * b / 2, rr * rr], [-a * b, rr]], {});
  });

  /* ==================================================================
     MODULE 5 GENERATORS
  ================================================================== */
  var M5 = [0, 1, 2, 3, 4].map(function () { return { 1: [], 2: [], 3: [] }; });
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function asc(a) { return a.slice().sort(function (x, y) { return x - y; }); }
  function median(a) { var s = asc(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  // List of n integers in [lo, hi] whose sum is a multiple of n (so the mean is a whole number).
  function listWithMean(r, n, lo, hi) {
    for (var t = 0; t < 200; t++) { var a = []; for (var i = 0; i < n; i++) a.push(r.int(lo, hi)); if (sum(a) % n === 0) return a; }
    var b = []; for (var j = 0; j < n; j++) b.push(r.int(lo, hi)); var m = Math.round(sum(b) / n) * n - sum(b); b[0] = Math.min(hi, Math.max(lo, b[0] + m)); return b;
  }
  function yesno(r) { return r.chance(0.5); }

  // ---------- m5t0: mean, median and mode ----------
  M5[0][1].push(function (r) { // mean
    var n = r.int(5, 8), a = listWithMean(r, n, 4, 40), m = sum(a) / n;
    return D('Find the mean of these numbers: ' + a.join(', ') + '.', ['The mean is the total divided by how many numbers there are.', 'Total = ' + a.join(' + ') + ' = ' + sum(a) + '.', 'Mean = ' + sum(a) + ' ÷ ' + n + ' = ' + nf(m, 2, true) + '.', 'Shortcut: pick a guess near the middle, say ' + Math.round(m) + ', and add up how far each number is above or below it. The mean is the guess plus the average of those differences.'], m, 2, true, [median(a), sum(a) / (n + 1), sum(a) / (n - 1)], { check: sum(a) / n });
  });
  M5[0][1].push(function (r) { // median
    var n = r.pick([7, 8, 9, 10]), a = []; for (var i = 0; i < n; i++) a.push(r.int(3, 60)); var s = asc(a), m = median(a);
    return D('What is the median of ' + a.join(', ') + '?', ['Put the numbers in order first: ' + s.join(', ') + '.', n % 2 ? 'There are ' + n + ' numbers, an odd count, so the median is the middle one, number ' + (n + 1) / 2 + ' in the list: ' + m + '.' : 'There are ' + n + ' numbers, an even count, so the median is the mean of the two middle ones (numbers ' + n / 2 + ' and ' + (n / 2 + 1) + '): (' + s[n / 2 - 1] + ' + ' + s[n / 2] + ') ÷ 2 = ' + nf(m, 1, true) + '.', 'Do not skip the sorting. The median of the list as it was given is not the median.'], m, 1, true, [a[Math.floor(n / 2)], s[n / 2 - 1], s[Math.floor(n / 2)]], { check: m });
  });
  M5[0][1].push(function (r) { // mode and range
    var n = r.int(8, 12), md = r.int(5, 30), a = [], ask = r.pick(['mode', 'range']), i;
    for (i = 0; i < 3; i++) a.push(md); for (i = 0; i < n - 3; i++) { var v; do { v = r.int(3, 40); } while (v === md); a.push(v); }
    // make sure the mode is unique
    var cnt = {}; a.forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; }); Object.keys(cnt).forEach(function (k) { if (+k !== md && cnt[k] >= 3) { var idx = a.lastIndexOf(+k); a[idx] = a[idx] + 1 + (a[idx] + 1 === md ? 1 : 0); } });
    a = r.shuffle(a); var mx = Math.max.apply(null, a), mn = Math.min.apply(null, a), c = a.filter(function (v) { return v === md; }).length;
    var freq = {}; a.forEach(function (v) { freq[v] = (freq[v] || 0) + 1; }); var best = 0, bv = 0, uniq = true; Object.keys(freq).forEach(function (k) { if (freq[k] > best) { best = freq[k]; bv = +k; uniq = true; } else if (freq[k] === best) uniq = false; });
    if (!uniq) return M5[0][1][2](r);
    if (ask === 'mode') return I('What is the mode of ' + a.join(', ') + '?', ['The mode is the number that appears most often.', 'Sort or tally: the number ' + bv + ' appears ' + best + ' times, more than any other number.', 'Mode = ' + bv + '.'], bv, { check: bv });
    return I('What is the range of ' + a.join(', ') + '?', ['The range is the biggest number minus the smallest number.', 'Biggest = ' + mx + ', smallest = ' + mn + '.', 'Range = ' + mx + ' ' + MINUS + ' ' + mn + ' = ' + (mx - mn) + '.'], mx - mn, { check: mx - mn });
  });
  M5[0][1].push(function (r) { // moving average
    var n = r.pick([6, 7, 8]), w = r.pick([3, 3, 4]), a = []; for (var i = 0; i < n; i++) a.push(r.int(8, 40));
    var pos = r.int(0, n - w), win = a.slice(pos, pos + w), m = sum(win) / w, kind = r.pick(['mean', 'median']), ans = kind === 'mean' ? m : median(win);
    return D('A shop recorded its daily sales (in hundreds of dollars) for ' + n + ' days: ' + a.join(', ') + '. A ' + w + ' day moving ' + kind + ' takes the ' + kind + ' of each block of ' + w + ' days in a row. What is the ' + w + ' day moving ' + kind + ' for the block that starts on day ' + (pos + 1) + '?', [
      'The block starting on day ' + (pos + 1) + ' has ' + w + ' days: ' + win.join(', ') + '.', kind === 'mean' ? 'Mean = (' + win.join(' + ') + ') ÷ ' + w + ' = ' + sum(win) + ' ÷ ' + w + ' = ' + nf(m, 2, true) + '.' : 'Sorted: ' + asc(win).join(', ') + '. ' + (w % 2 ? 'The middle value is ' + median(win) + '.' : 'The median is the mean of the middle two: ' + nf(median(win), 1, true) + '.'), 'Then slide the window one day along to get the next value. Moving averages smooth out spikes in the data.'], ans, 2, true, [sum(a) / n, kind === 'mean' ? median(win) : sum(win) / w, a[pos]], { check: ans });
  });
  M5[0][1].push(function (r) { // missing number for mean
    var n = r.int(4, 6), m = r.int(60, 85), t = r.int(m + 2, m + 12), a = []; for (var i = 0; i < n; i++) a.push(m + r.int(-8, 8));
    var need = t * (n + 1) - sum(a);
    if (need > 100 || need < 0) return M5[0][1][4](r);
    return I('Marc scored ' + a.join(', ') + ' on his first ' + n + ' tests. What must he score on test ' + (n + 1) + ' to have a mean of ' + t + ' over all ' + (n + 1) + ' tests?', ['The total needed for ' + (n + 1) + ' tests = ' + (n + 1) + ' × ' + t + ' = ' + t * (n + 1) + '.', 'The total so far = ' + a.join(' + ') + ' = ' + sum(a) + '.', 'Needed on the last test = ' + t * (n + 1) + ' ' + MINUS + ' ' + sum(a) + ' = ' + need + '.', 'Always convert a mean into a total. Totals can be added and subtracted, means cannot.'], need, { check: t * (n + 1) - sum(a) });
  });
  M5[0][1].push(function (r) { // bar chart frequencies
    var k = r.int(4, 6), f = []; for (var i = 0; i < k; i++) f.push(r.int(1, 9));
    var tot = sum(f), s = 0; f.forEach(function (x, i) { s += x * (i + 1); });
    return D('The bar chart shows how many students gave each rating from 1 to ' + k + ': ' + f.map(function (x, i) { return 'rating ' + (i + 1) + ' had ' + x; }).join(', ') + '. What is the mean rating?', [
      'Multiply each rating by its frequency: ' + f.map(function (x, i) { return (i + 1) + ' × ' + x; }).join(' + ') + ' = ' + s + '.', 'Number of students = ' + f.join(' + ') + ' = ' + tot + '.', 'Mean = ' + s + ' ÷ ' + tot + ' = ' + nf(s / tot, 2, true) + '.'], s / tot, 2, true, [(k + 1) / 2, f.indexOf(Math.max.apply(null, f)) + 1, s / k], { check: s / tot, visual: V.barChart.apply(null, f) });
  });

  M5[0][2].push(function (r) { // grouped data estimated mean
    var w = r.pick([10, 5, 20]), k = r.int(4, 5), f = [], i; for (i = 0; i < k; i++) f.push(r.int(2, 12));
    var tot = sum(f), s = 0, rows = []; f.forEach(function (x, i) { var lo = i * w, mid = lo + w / 2; s += x * mid; rows.push(lo + ' up to ' + (lo + w) + ': ' + x + ' students'); });
    return D('The times (in minutes) that students spent on homework were grouped: ' + rows.join('; ') + '. Estimate the mean time by using the midpoint of each group.', [
      'We do not know the exact times, so treat every student in a group as if they were at the midpoint of the group.', 'Midpoints: ' + f.map(function (x, i) { return i * w + w / 2; }).join(', ') + '.', 'Sum of (midpoint × frequency) = ' + f.map(function (x, i) { return (i * w + w / 2) + ' × ' + x; }).join(' + ') + ' = ' + nf(s, 1, true) + '.', 'Total students = ' + tot + ', so the estimated mean = ' + nf(s, 1, true) + ' ÷ ' + tot + ' = ' + nf(s / tot, 2, true) + ' minutes.'], s / tot, 2, true, [(k * w) / 2, s / k / (w / 2), (s - tot * w / 2) / tot], { check: s / tot });
  });
  M5[0][2].push(function (r) { // combine two group means
    var n1 = r.int(4, 20), n2 = r.int(4, 20), m1 = r.int(50, 80), m2 = r.int(60, 95), s = n1 * m1 + n2 * m2, tot = n1 + n2;
    return D('Class A has ' + n1 + ' students with a mean mark of ' + m1 + '. Class B has ' + n2 + ' students with a mean mark of ' + m2 + '. What is the mean mark of all ' + tot + ' students together?', ['Do not average the two means. The classes are different sizes.', 'Total marks for A = ' + n1 + ' × ' + m1 + ' = ' + n1 * m1 + '. Total marks for B = ' + n2 + ' × ' + m2 + ' = ' + n2 * m2 + '.', 'Combined mean = (' + n1 * m1 + ' + ' + n2 * m2 + ') ÷ ' + tot + ' = ' + s + ' ÷ ' + tot + ' = ' + nf(s / tot, 2, true) + '.'], s / tot, 2, true, [(m1 + m2) / 2, (n1 * m1 + n2 * m2) / (tot + 1)], { check: (n1 * m1 + n2 * m2) / (n1 + n2) });
  });
  M5[0][2].push(function (r) { // remove a value
    var n = r.int(6, 12), m = r.int(15, 40), m2 = m - r.int(1, 3), x = m * n - m2 * (n - 1);
    return I('The mean of ' + n + ' numbers is ' + m + '. When one of the numbers is removed, the mean of the remaining ' + (n - 1) + ' numbers is ' + m2 + '. What number was removed?', ['Original total = ' + n + ' × ' + m + ' = ' + m * n + '.', 'New total = ' + (n - 1) + ' × ' + m2 + ' = ' + m2 * (n - 1) + '.', 'Removed number = ' + m * n + ' ' + MINUS + ' ' + m2 * (n - 1) + ' = ' + x + '.'], x, { check: m * n - m2 * (n - 1) });
  });
  M5[0][2].push(function (r) { // transform data
    var m = r.int(6, 30), md = m + r.int(-3, 3), R = r.int(8, 30), a = r.int(2, 5), b = r.int(1, 12), what = r.pick(['mean', 'median', 'range']);
    var val = { mean: m, median: md, range: R }[what], ans = what === 'range' ? a * R : a * val + b;
    return I('A data set has mean ' + m + ', median ' + md + ' and range ' + R + '. Every number in the set is multiplied by ' + a + ' and then ' + b + ' is added. What is the new ' + what + '?', [what === 'range' ? 'The range is a difference. Multiplying by ' + a + ' multiplies the difference by ' + a + ', but adding ' + b + ' to every number shifts both ends equally and cancels out.' : 'The ' + what + ' follows the same operations as each number: multiply by ' + a + ', then add ' + b + '.', what === 'range' ? 'New range = ' + a + ' × ' + R + ' = ' + ans + '.' : 'New ' + what + ' = ' + a + ' × ' + val + ' + ' + b + ' = ' + a * val + ' + ' + b + ' = ' + ans + '.'], ans, { check: what === 'range' ? a * R : a * val + b });
  });
  M5[0][2].push(function (r) { // median from frequency table
    var sizes = r.pick([[5, 6, 7, 8, 9], [3, 4, 5, 6, 7], [10, 11, 12, 13, 14]]), f = sizes.map(function () { return r.int(2, 9); }), tot = sum(f);
    var all = []; sizes.forEach(function (sz, i) { for (var j = 0; j < f[i]; j++) all.push(sz); }); var med = median(all);
    var pos = tot % 2 ? 'number ' + (tot + 1) / 2 : 'numbers ' + tot / 2 + ' and ' + (tot / 2 + 1), run = 0, where = '';
    sizes.forEach(function (sz, i) { run += f[i]; where += (i ? ', ' : '') + 'up to size ' + sz + ': ' + run; });
    return D('The table shows how many students wear each shoe size: ' + sizes.map(function (sz, i) { return 'size ' + sz + ': ' + f[i]; }).join(', ') + '. What is the median shoe size?', ['Total students = ' + f.join(' + ') + ' = ' + tot + '.', 'The median is at position ' + pos + ' when the sizes are lined up in order.', 'Running totals: ' + where + '.', 'The middle position falls in size ' + nf(med, 1, true) + ', so the median is ' + nf(med, 1, true) + '.'], med, 1, true, [sizes[2], sum(sizes) / sizes.length], { check: med });
  });

  M5[0][3].push(function (r) { // largest possible number
    var m = r.int(4, 9), M = r.int(m + 2, m + 6), ans = 5 * M - 2 * m - 4, best = 0, a, b, d, e;
    for (a = 1; a < m; a++) for (b = a + 1; b < m; b++) for (d = m + 1; d < 5 * M; d++) { e = 5 * M - a - b - m - d; if (e > d && e > best) best = e; }
    return I('Five different positive integers have a mean of ' + M + ' and a median of ' + m + '. What is the largest possible value of the biggest of the five numbers?', ['Write the numbers in order a < b < ' + m + ' < d < e. The total is 5 × ' + M + ' = ' + 5 * M + '.', 'To make e as large as possible, make all the others as small as possible. The smallest choices are a = 1, b = 2, and d = ' + (m + 1) + ' (it must be more than the median).', 'e = ' + 5 * M + ' ' + MINUS + ' (1 + 2 + ' + m + ' + ' + (m + 1) + ') = ' + 5 * M + ' ' + MINUS + ' ' + (2 * m + 4) + ' = ' + ans + '.'], ans, { check: best });
  });
  M5[0][3].push(function (r) { // weighted ratio
    var p, q, B, G, Mv, found = false, t = 0;
    while (!found && t++ < 400) { p = r.int(1, 5); q = r.int(1, 5); if (p === q) continue; B = r.int(50, 75); G = B + r.int(4, 20); Mv = (p * B + q * G) / (p + q); if (Mv === Math.round(Mv)) found = true; }
    if (!found) { p = 2; q = 3; B = 60; G = 80; Mv = 72; }
    var k = r.int(3, 8), N = (p + q) * k, boys = p * k;
    return I('In a class the girls have a mean mark of ' + G + ' and the boys have a mean mark of ' + B + '. The mean mark of the whole class is ' + Mv + '. There are ' + N + ' students in the class. How many are boys?', [
      'Look at how far each group mean is from the class mean. Boys: ' + Mv + ' ' + MINUS + ' ' + B + ' = ' + (Mv - B) + ' below. Girls: ' + G + ' ' + MINUS + ' ' + Mv + ' = ' + (G - Mv) + ' above.', 'The class mean sits closer to the bigger group, so boys : girls = ' + (G - Mv) + ' : ' + (Mv - B) + '.', 'Simplify: ' + (G - Mv) / gcd(G - Mv, Mv - B) + ' : ' + (Mv - B) / gcd(G - Mv, Mv - B) + '. Total parts = ' + (G - Mv) / gcd(G - Mv, Mv - B) + (Mv - B) / gcd(G - Mv, Mv - B) + '.', 'Boys = ' + N + ' × ' + fr((G - Mv) / gcd(G - Mv, Mv - B), ((G - Mv) + (Mv - B)) / gcd(G - Mv, Mv - B)) + ' = ' + N * (G - Mv) / (G - B) + '.'], N * (G - Mv) / (G - B), { check: (function () { for (var bb = 0; bb <= N; bb++) if (Math.abs((bb * B + (N - bb) * G) / N - Mv) < 1e-9) return bb; return -1; })() });
  });
  M5[0][3].push(function (r) { // consecutive evens
    var m = 2 * r.int(4, 30), sm = 2 * m, S = 5 * m;
    return I('Five consecutive even integers have a median of ' + m + '. What is their sum?', ['For a list of consecutive numbers, the median equals the mean because they are evenly spaced.', 'So the sum = 5 × ' + m + ' = ' + S + '.', 'Check: ' + (m - 4) + ' + ' + (m - 2) + ' + ' + m + ' + ' + (m + 2) + ' + ' + (m + 4) + ' = ' + S + '.'], S, { check: (m - 4) + (m - 2) + m + (m + 2) + (m + 4) });
  });
  M5[0][3].push(function (r) { // team with coach or replaced player
    var n = r.int(6, 12), A = r.int(20, 30), x = r.int(A + 4, A + 15), delta = r.int(1, 3), y = x - delta * n;
    if (y < 8) return M5[0][3][3](r);
    return I('A team of ' + n + ' players has a mean age of ' + A + '. A player aged ' + x + ' leaves and a new player joins. The mean age of the team becomes ' + (A - delta) + '. How old is the new player?', ['Total age before = ' + n + ' × ' + A + ' = ' + n * A + '.', 'Total age after = ' + n + ' × ' + (A - delta) + ' = ' + n * (A - delta) + '. The total dropped by ' + n * delta + '.', 'The new player is ' + n * delta + ' years younger than the one who left: ' + x + ' ' + MINUS + ' ' + n * delta + ' = ' + y + '.'], y, { check: x - (n * A - n * (A - delta)) });
  });

  // ---------- m5t1: the fundamental counting rule ----------
  M5[1][1].push(function (r) { // outfits
    var a = r.int(3, 8), b = r.int(2, 6), c = r.int(2, 5), item = r.pick([['shirts', 'pairs of pants', 'pairs of shoes'], ['hats', 'jackets', 'scarves']]);
    return I('Jo has ' + a + ' ' + item[0] + ', ' + b + ' ' + item[1] + ' and ' + c + ' ' + item[2] + '. An outfit uses one of each. How many different outfits can Jo make?', ['Each choice is independent of the others.', 'Multiply the number of options at each step: ' + a + ' × ' + b + ' × ' + c + ' = ' + a * b * c + '.', 'This is the fundamental counting rule: if a job is done in stages with m, n, p ways, the total is m × n × p.'], a * b * c, { check: a * b * c });
  });
  M5[1][1].push(function (r) { // menu
    var a = r.int(3, 6), b = r.int(4, 8), c = r.int(2, 5);
    return I('A lunch special lets you pick one of ' + a + ' starters, one of ' + b + ' main dishes and one of ' + c + ' desserts. How many different lunches are possible?', [a + ' choices, then ' + b + ' choices, then ' + c + ' choices.', a + ' × ' + b + ' × ' + c + ' = ' + a * b * c + '.'], a * b * c, { check: a * b * c });
  });
  M5[1][1].push(function (r) { // license plate
    var L = r.int(2, 3), D0 = r.int(2, 4), ans = Math.pow(26, L) * Math.pow(10, D0);
    return I('A licence plate has ' + L + ' letters followed by ' + D0 + ' digits. Letters and digits may repeat. How many different plates are possible?', ['Each of the ' + L + ' letter positions has 26 choices, and each of the ' + D0 + ' digit positions has 10 choices.', '26^{' + L + '} × 10^{' + D0 + '} = ' + Math.pow(26, L) + ' × ' + Math.pow(10, D0) + ' = ' + fmt(ans) + '.'], ans, { check: Math.pow(26, L) * Math.pow(10, D0) });
  });
  M5[1][1].push(function (r) { // binary and true false
    var n = r.int(4, 10), ans = Math.pow(2, n);
    return I('A quiz has ' + n + ' true or false questions. In how many different ways can a student fill in the whole answer sheet?', ['Each question has 2 possible answers, and the answers are independent.', '2 × 2 × ... × 2 (' + n + ' times) = 2^{' + n + '} = ' + fmt(ans) + '.', 'Doubling ' + n + ' times: 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024.'], ans, { check: Math.pow(2, n) });
  });
  M5[1][1].push(function (r) { // dice pairs
    var n = r.int(2, 4), s = r.pick([6, 6, 8]), ans = Math.pow(s, n);
    return I('A ' + s + ' sided die is rolled ' + n + ' times and the results are recorded in order. How many different sequences of results are possible?', ['Each roll has ' + s + ' outcomes, independent of the others.', s + '^{' + n + '} = ' + fmt(ans) + '.'], ans, { check: Math.pow(s, n) });
  });

  M5[1][2].push(function (r) { // PIN no repeat
    var k = r.int(3, 5), ans = Pm(10, k);
    var st = []; for (var i = 0; i < k; i++) st.push(10 - i);
    return I('A ' + k + ' digit code uses the digits 0 to 9, and no digit may be used twice. How many codes are possible?', ['First digit: 10 choices. After using one, the next digit has 9 choices, then 8, and so on.', 'Count = ' + st.join(' × ') + ' = ' + fmt(ans) + '.', 'This is the number of ordered selections, written P(10, ' + k + ').'], ans, { check: (function () { var c = 0, lim = Math.pow(10, k); for (var x = 0; x < lim; x++) { var s = String(x); while (s.length < k) s = '0' + s; if (new Set(s.split('')).size === k) c++; } return c; })() });
  });
  M5[1][2].push(function (r) { // even numbers from digit set
    var digs = r.pick([[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7], [2, 3, 4, 5, 6, 7, 8]]), k = 3, ev = digs.filter(function (d) { return d % 2 === 0; }).length, n = digs.length, ans = ev * (n - 1) * (n - 2);
    var cnt = 0; digs.forEach(function (a) { digs.forEach(function (b) { digs.forEach(function (c) { if (a !== b && b !== c && a !== c && c % 2 === 0) cnt++; }); }); });
    return I('How many 3 digit even numbers can be made using the digits ' + digs.join(', ') + ', if no digit is used more than once?', ['The last digit decides whether the number is even, so fill that place first. There are ' + ev + ' even digits available.', 'Then the hundreds digit can be any of the remaining ' + (n - 1) + ' digits, and the tens digit any of the remaining ' + (n - 2) + '.', 'Count = ' + ev + ' × ' + (n - 1) + ' × ' + (n - 2) + ' = ' + ans + '.', 'Rule of thumb: fill the most restricted place first.'], ans, { check: cnt });
  });
  M5[1][2].push(function (r) { // divisors
    var ps = r.pick([[2, 3], [2, 5], [3, 5], [2, 7], [3, 7]]), a = r.int(1, 5), b = r.int(1, 4), N = Math.pow(ps[0], a) * Math.pow(ps[1], b), c = 0;
    for (var d = 1; d <= N; d++) if (N % d === 0) c++;
    return I('How many positive divisors does ' + fmt(N) + ' have?', ['Write ' + fmt(N) + ' as a product of primes: ' + ps[0] + '^{' + a + '} × ' + ps[1] + '^{' + b + '}.', 'A divisor uses the prime ' + ps[0] + ' zero to ' + a + ' times (' + (a + 1) + ' choices) and the prime ' + ps[1] + ' zero to ' + b + ' times (' + (b + 1) + ' choices).', 'By the counting rule the number of divisors = ' + (a + 1) + ' × ' + (b + 1) + ' = ' + (a + 1) * (b + 1) + '.'], (a + 1) * (b + 1), { check: c });
  });
  M5[1][2].push(function (r) { // handshake/shirts with restrictions
    var a = r.int(4, 7), b = r.int(3, 6), c = r.int(3, 5), bad = r.int(1, 3);
    return I('A restaurant offers ' + a + ' burgers, ' + b + ' sides and ' + c + ' drinks. A meal is one of each. This week the manager removes ' + bad + ' of the ' + a + ' burgers from any meal that includes the cheapest drink (the other ' + (c - 1) + ' drinks work with all burgers). How many different meals are available?', ['Split into two groups by drink.', 'Cheapest drink: ' + (a - bad) + ' burgers × ' + b + ' sides × 1 drink = ' + (a - bad) * b + '.', 'Other drinks: ' + a + ' × ' + b + ' × ' + (c - 1) + ' = ' + a * b * (c - 1) + '.', 'Total = ' + (a - bad) * b + ' + ' + a * b * (c - 1) + ' = ' + ((a - bad) * b + a * b * (c - 1)) + '.'], (a - bad) * b + a * b * (c - 1), { check: (function () { var t = 0; for (var i = 0; i < a; i++) for (var j = 0; j < b; j++) for (var k = 0; k < c; k++) if (!(k === 0 && i < bad)) t++; return t; })() });
  });
  M5[1][2].push(function (r) { // digits count
    var k = r.int(3, 5), what = r.pick(['all different', 'odd']), lim = Math.pow(10, k), lo = Math.pow(10, k - 1), c = 0, ans;
    for (var x = lo; x < lim; x++) { if (what === 'odd') { if (x % 2) c++; } else if (new Set(String(x).split('')).size === k) c++; }
    if (what === 'odd') { ans = 9 * Math.pow(10, k - 2) * 5; return I('How many ' + k + ' digit numbers are odd?', ['The first digit cannot be 0, so it has 9 choices. The middle digits have 10 choices each. The last digit must be odd: 5 choices.', '9 × ' + (k - 2 > 0 ? '10^{' + (k - 2) + '}' : '1') + ' × 5 = ' + ans + '.', 'Quick check: half of all ' + k + ' digit numbers are odd, and there are 9 × 10^{' + (k - 1) + '} of those, so half is ' + ans + '.'], ans, { check: c }); }
    var arr = [9]; for (var i = 1; i < k; i++) arr.push(10 - i); ans = arr.reduce(function (a, b) { return a * b; }, 1);
    return I('How many ' + k + ' digit numbers have all their digits different?', ['The first digit cannot be 0 and can be any of 1 to 9: 9 choices.', 'The second digit can be 0, but not the first digit: 9 choices. The third: 8 choices, and so on.', 'Count = ' + arr.join(' × ') + ' = ' + ans + '.'], ans, { check: c });
  });

  M5[1][3].push(function (r) { // no adjacent equal digits
    var k = r.int(3, 5), ans = 9 * Math.pow(9, k - 1), c = 0, lim = Math.pow(10, k);
    for (var x = Math.pow(10, k - 1); x < lim; x++) { var s = String(x), ok = true; for (var i = 1; i < s.length; i++) if (s[i] === s[i - 1]) ok = false; if (ok) c++; }
    return I('How many ' + k + ' digit numbers have no two neighbouring digits equal? (For example 1213 counts, but 1223 does not.)', ['The first digit has 9 choices (1 to 9).', 'Every later digit can be any of the 10 digits except the one just before it: 9 choices each time, including 0.', 'Count = 9^{' + k + '} = ' + fmt(ans) + '.', 'Trick: do not try to subtract bad numbers from the total. Build the good ones step by step.'], ans, { check: c });
  });
  M5[1][3].push(function (r) { // palindromes
    var k = r.pick([3, 4, 5, 6, 7]), half = Math.ceil(k / 2), ans = 9 * Math.pow(10, half - 1), c = 0, lim = Math.pow(10, k);
    for (var x = Math.pow(10, k - 1); x < lim; x++) { var s = String(x); if (s === s.split('').reverse().join('')) c++; }
    return I('A palindrome reads the same forwards and backwards, like 4114 or 83738. How many ' + k + ' digit palindromes are there?', ['The first ' + half + ' digits decide the whole number, because the rest mirror them.', 'The first digit has 9 choices (not 0). The other ' + (half - 1) + ' free digit' + (half - 1 === 1 ? ' has' : 's have') + ' 10 choices ' + (half - 1 === 1 ? '' : 'each ') + '.', 'Count = 9 × ' + (half - 1 > 0 ? '10^{' + (half - 1) + '}' : '1') + ' = ' + ans + '.'], ans, { check: c });
  });
  M5[1][3].push(function (r) { // divisor variants
    var e = r.pick([[2, 3, 5], [2, 3, 7], [2, 5, 7]]), a = r.int(2, 6), b = r.int(1, 3), c3 = r.int(1, 2), N = Math.pow(e[0], a) * Math.pow(e[1], b) * Math.pow(e[2], c3), kind = r.pick(['odd', 'squares', 'total']), cnt = 0;
    for (var d = 1; d <= N; d++) if (N % d === 0) { if (kind === 'total' || (kind === 'odd' && d % 2 === 1 && e[0] === 2) || (kind === 'squares' && Math.sqrt(d) === Math.floor(Math.sqrt(d)))) cnt++; }
    var pf = e[0] + '^{' + a + '} × ' + e[1] + '^{' + b + '} × ' + e[2] + '^{' + c3 + '}';
    if (kind === 'odd') return I('How many positive divisors of ' + fmt(N) + ' are odd?', ['Prime factorisation: ' + fmt(N) + ' = ' + pf + '.', 'An odd divisor cannot use the prime 2 at all. So the power of 2 has exactly 1 choice (zero of them).', 'The other primes have ' + (b + 1) + ' and ' + (c3 + 1) + ' choices, so odd divisors = 1 × ' + (b + 1) + ' × ' + (c3 + 1) + ' = ' + (b + 1) * (c3 + 1) + '.'], (b + 1) * (c3 + 1), { check: cnt });
    if (kind === 'squares') { var ea = Math.floor(a / 2) + 1, eb = Math.floor(b / 2) + 1, ec = Math.floor(c3 / 2) + 1; return I('How many positive divisors of ' + fmt(N) + ' are perfect squares?', ['Prime factorisation: ' + fmt(N) + ' = ' + pf + '.', 'A perfect square has an even power of every prime. For ' + e[0] + ' the allowed powers are the even numbers from 0 to ' + a + ': ' + ea + ' choices. For ' + e[1] + ': ' + eb + ' choices. For ' + e[2] + ': ' + ec + ' choices.', 'Count = ' + ea + ' × ' + eb + ' × ' + ec + ' = ' + ea * eb * ec + '.'], ea * eb * ec, { check: cnt }); }
    return I('How many positive divisors does ' + fmt(N) + ' have?', ['Prime factorisation: ' + fmt(N) + ' = ' + pf + '.', 'Add 1 to each power and multiply: (' + a + ' + 1)(' + b + ' + 1)(' + c3 + ' + 1) = ' + (a + 1) + ' × ' + (b + 1) + ' × ' + (c3 + 1) + ' = ' + (a + 1) * (b + 1) * (c3 + 1) + '.'], (a + 1) * (b + 1) * (c3 + 1), { check: cnt });
  });
  M5[1][3].push(function (r) { // digits no digit equals d
    var bad = r.int(1, 9), k = r.int(3, 4), lo = Math.pow(10, k - 1), hi = Math.pow(10, k), c = 0;
    for (var x = lo; x < hi; x++) if (String(x).indexOf(String(bad)) < 0) c++;
    var first = 8, rest = 9, ans = first * Math.pow(rest, k - 1);
    return I('How many ' + k + ' digit numbers do not contain the digit ' + bad + ' anywhere?', ['The first digit can be any of 1 to 9 except ' + bad + ': 8 choices.', 'Each other digit can be any of 0 to 9 except ' + bad + ': 9 choices.', 'Count = 8 × 9^{' + (k - 1) + '} = ' + ans + '.', 'Complement check: total ' + 9 * Math.pow(10, k - 1) + ' minus the ones with a ' + bad + ' gives the same number.'], ans, { check: c });
  });

  // ---------- m5t2: permutations and combinations ----------
  // Independent counting helpers used only by the checks.
  function arrCount(counts) { // distinct arrangements of a multiset, counted by recursion (not by the factorial formula)
    var memo = {};
    function go(c) { var key = c.join(','), tot = sum(c); if (tot === 0) return 1; if (memo[key] !== undefined) return memo[key]; var t = 0; for (var i = 0; i < c.length; i++) if (c[i] > 0) { c[i]--; t += go(c); c[i]++; } return memo[key] = t; }
    return go(counts.slice());
  }
  function permCount(n, pred) { // number of permutations of 0..n-1 that satisfy pred
    var a = [], used = [], cnt = 0;
    function go(k) { if (k === n) { if (pred(a)) cnt++; return; } for (var i = 0; i < n; i++) if (!used[i]) { used[i] = true; a.push(i); go(k + 1); a.pop(); used[i] = false; } }
    go(0); return cnt;
  }
  function combCount(n, k, pred) { var cnt = 0, pick = []; function go(s) { if (pick.length === k) { if (!pred || pred(pick)) cnt++; return; } for (var i = s; i < n; i++) { pick.push(i); go(i + 1); pick.pop(); } } go(0); return cnt; }
  function factLine(n) { var p = []; for (var i = n; i >= 1; i--) p.push(i); return p.join(' × '); }

  M5[2][1].push(function (r) { // arrange n books
    var n = r.int(4, 8), what = r.pick(['books on a shelf', 'runners in a line', 'photos in a row']);
    return I('In how many different orders can ' + n + ' different ' + what + ' be arranged?', ['The first place can be filled ' + n + ' ways, the second ' + (n - 1) + ' ways, and so on down to 1 way for the last.', 'Total = ' + factLine(n) + ' = ' + fact(n) + '.', 'This product is written ' + n + '! and read "' + n + ' factorial".'], fact(n), { check: (function () { var c = 1; for (var i = 2; i <= n; i++) c *= i; return c; })() });
  });
  M5[2][1].push(function (r) { // podium
    var n = r.int(6, 12), k = 3;
    return I('There are ' + n + ' runners in a race. In how many ways can gold, silver and bronze medals be given out?', ['The order matters, because gold is different from silver.', 'Gold: ' + n + ' choices. Silver: ' + (n - 1) + ' choices. Bronze: ' + (n - 2) + ' choices.', 'Total = ' + n + ' × ' + (n - 1) + ' × ' + (n - 2) + ' = ' + Pm(n, 3) + '.'], Pm(n, 3), { check: n * (n - 1) * (n - 2) });
  });
  M5[2][1].push(function (r) { // committee
    var n = r.int(6, 12), k = r.int(2, 4);
    return I('A class has ' + n + ' students. A group of ' + k + ' students will be chosen to clean the classroom, and there are no special roles. How many different groups are possible?', ['Order does not matter, since a group of A, B, C is the same as C, B, A.', 'First count as if order mattered: ' + Pm(n, k) + '. Then divide by the ' + fact(k) + ' ways to order each group of ' + k + '.', 'Groups = ' + Pm(n, k) + ' ÷ ' + fact(k) + ' = ' + C(n, k) + '.'], C(n, k), { check: combCount(n, k) });
  });
  M5[2][1].push(function (r) { // handshakes
    var n = r.int(5, 20);
    return I(n + ' people meet and every person shakes hands once with every other person. How many handshakes are there?', ['Each of the ' + n + ' people shakes ' + (n - 1) + ' hands, giving ' + n + ' × ' + (n - 1) + ' = ' + n * (n - 1) + '.', 'But each handshake has been counted twice (once by each person), so divide by 2: ' + n * (n - 1) + ' ÷ 2 = ' + n * (n - 1) / 2 + '.'], n * (n - 1) / 2, { check: combCount(n, 2) });
  });
  M5[2][1].push(function (r) { // word distinct letters
    var w = r.pick(['MATH', 'PLANET', 'CHAIR', 'FROGS', 'LEMON', 'PIRATE']), n = w.length;
    return I('How many different arrangements are there of all the letters of the word ' + w + '? (All its letters are different, and the arrangements do not have to be real words.)', ['The word has ' + n + ' different letters.', 'Arrangements = ' + n + '! = ' + factLine(n) + ' = ' + fact(n) + '.'], fact(n), { check: arrCount(w.split('').map(function () { return 1; })) });
  });

  M5[2][2].push(function (r) { // repeated letters
    var w = r.pick(['LETTER', 'BANANA', 'APPLE', 'COOKIE', 'MAMMAL', 'PEPPER', 'SEVEN', 'TOMORROW', 'BALLOON', 'RADAR', 'SUCCESS']), cnt = {}, den = 1;
    w.split('').forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; }); var reps = Object.keys(cnt).filter(function (c) { return cnt[c] > 1; });
    reps.forEach(function (c) { den *= fact(cnt[c]); });
    var ans = fact(w.length) / den;
    return I('How many different arrangements are there of the letters of the word ' + w + '?', ['The word has ' + w.length + ' letters, so if every letter were different there would be ' + w.length + '! = ' + fact(w.length) + ' arrangements.', reps.map(function (c) { return 'The letter ' + c + ' appears ' + cnt[c] + ' times. Swapping those copies changes nothing, so divide by ' + cnt[c] + '! = ' + fact(cnt[c]) + '.'; }).join(' '), 'Arrangements = ' + fact(w.length) + ' ÷ ' + den + ' = ' + ans + '.'], ans, { check: arrCount(Object.keys(cnt).map(function (c) { return cnt[c]; })) });
  });
  M5[2][2].push(function (r) { // two together
    var n = r.int(4, 7), ans = 2 * fact(n - 1);
    return I(n + ' people stand in a line. Two of them, Ava and Ben, insist on standing next to each other. In how many ways can the line be formed?', ['Glue Ava and Ben into one block. Now there are ' + (n - 1) + ' things to arrange: ' + (n - 2) + ' people and the block.', 'Arrangements of ' + (n - 1) + ' things = ' + (n - 1) + '! = ' + fact(n - 1) + '.', 'Inside the block, Ava and Ben can swap: × 2. Total = ' + fact(n - 1) + ' × 2 = ' + ans + '.'], ans, { check: permCount(n, function (a) { return Math.abs(a.indexOf(0) - a.indexOf(1)) === 1; }) });
  });
  M5[2][2].push(function (r) { // two not together
    var n = r.int(4, 7), ans = fact(n) - 2 * fact(n - 1);
    return I(n + ' people stand in a line. Two of them, Ava and Ben, refuse to stand next to each other. In how many ways can the line be formed?', ['Count everything, then subtract the bad arrangements. All arrangements: ' + n + '! = ' + fact(n) + '.', 'Bad arrangements have Ava and Ben together: 2 × ' + (n - 1) + '! = ' + 2 * fact(n - 1) + '.', 'Good = ' + fact(n) + ' ' + MINUS + ' ' + 2 * fact(n - 1) + ' = ' + ans + '.'], ans, { check: permCount(n, function (a) { return Math.abs(a.indexOf(0) - a.indexOf(1)) !== 1; }) });
  });
  M5[2][2].push(function (r) { // at least one girl
    var b = r.int(3, 7), g = r.int(2, 5), k = r.int(2, Math.min(4, b)), tot = b + g, ans = C(tot, k) - C(b, k);
    return I('A club has ' + b + ' boys and ' + g + ' girls. A team of ' + k + ' is chosen. How many teams have at least one girl?', ['Use the complement. All teams: C(' + tot + ', ' + k + ') = ' + C(tot, k) + '.', 'Teams with no girl (all boys): C(' + b + ', ' + k + ') = ' + C(b, k) + '.', 'At least one girl = ' + C(tot, k) + ' ' + MINUS + ' ' + C(b, k) + ' = ' + ans + '.'], ans, { check: combCount(tot, k, function (p) { return p.some(function (x) { return x >= b; }); }) });
  });
  M5[2][2].push(function (r) { // diagonals
    var n = r.int(5, 14), ans = n * (n - 3) / 2;
    return I('How many diagonals does a polygon with ' + n + ' sides have?', ['Any two vertices can be joined by a line: C(' + n + ', 2) = ' + n * (n - 1) / 2 + ' lines.', 'But ' + n + ' of those lines are sides, not diagonals.', 'Diagonals = ' + n * (n - 1) / 2 + ' ' + MINUS + ' ' + n + ' = ' + ans + '.', 'Formula: n(n ' + MINUS + ' 3) ÷ 2.'], ans, { check: combCount(n, 2, function (p) { var d = Math.abs(p[0] - p[1]); return d !== 1 && d !== n - 1; }) });
  });
  M5[2][2].push(function (r) { // triangles with collinear points
    var n = r.int(6, 10), k = r.int(3, Math.min(5, n - 2)), ans = C(n, 3) - C(k, 3);
    return I(n + ' points are drawn. ' + k + ' of them lie on one straight line, and no other three points are in a line. How many triangles can be drawn using three of the points as corners?', ['Any 3 points make a triangle unless they are on a line. Choose 3 from ' + n + ': C(' + n + ', 3) = ' + C(n, 3) + '.', 'Triples from the ' + k + ' collinear points make no triangle: C(' + k + ', 3) = ' + C(k, 3) + '.', 'Triangles = ' + C(n, 3) + ' ' + MINUS + ' ' + C(k, 3) + ' = ' + ans + '.'], ans, { check: combCount(n, 3, function (p) { return !(p[0] < k && p[1] < k && p[2] < k); }) });
  });
  M5[2][2].push(function (r) { // round table
    var n = r.int(4, 8), ans = fact(n - 1);
    return I(n + ' friends sit around a round table. Two seatings are the same if everyone has the same neighbours on the left and the right (rotating everyone counts as the same seating). How many different seatings are there?', ['If the seats were numbered there would be ' + n + '! ways. But each real seating appears ' + n + ' times, once for each rotation.', 'Seatings = ' + n + '! ÷ ' + n + ' = ' + (n - 1) + '! = ' + ans + '.', 'Quick way: fix one person in place, then arrange the other ' + (n - 1) + ' in ' + (n - 1) + '! ways.'], ans, { check: permCount(n, function (a) { return a[0] === 0; }) });
  });

  M5[2][3].push(function (r) { // vowels together
    var w = r.pick([['STREAM', 'EA'], ['MARKET', 'AE'], ['ROCKET', 'OE'], ['POINTS', 'OI'], ['CHAIRS', 'AI'], ['SPRING', 'I'], ['PLANET', 'AE']]), n = w[0].length, v = w[1].length;
    if (v === 1) return M5[2][3][0](r);
    var ans = fact(n - v + 1) * fact(v), L = w[0].split('');
    return I('How many arrangements of the letters of ' + w[0] + ' have all the vowels next to each other? (The vowels are ' + w[1].split('').join(' and ') + '.)', ['Glue the ' + v + ' vowels into one block. That leaves ' + (n - v) + ' consonants plus 1 block = ' + (n - v + 1) + ' objects to arrange: ' + (n - v + 1) + '! = ' + fact(n - v + 1) + '.', 'Inside the block the ' + v + ' vowels can be ordered in ' + v + '! = ' + fact(v) + ' ways.', 'Total = ' + fact(n - v + 1) + ' × ' + fact(v) + ' = ' + ans + '.'], ans, { check: permCount(n, function (a) { var idx = []; a.forEach(function (x, p) { if ('AEIOU'.indexOf(L[x]) >= 0) idx.push(p); }); return Math.max.apply(null, idx) - Math.min.apply(null, idx) === idx.length - 1; }) });
  });
  M5[2][3].push(function (r) { // no two vowels adjacent
    var w = r.pick([['STREAM', 'EA'], ['MARKET', 'AE'], ['ROCKET', 'OE'], ['POINTS', 'OI'], ['CHAIRS', 'AI'], ['PLANET', 'AE']]), n = w[0].length, v = w[1].length, c = n - v, ans = fact(c) * Pm(c + 1, v), L = w[0].split('');
    return I('How many arrangements of the letters of ' + w[0] + ' have no two vowels next to each other?', ['There are ' + c + ' consonants. Arrange them first: ' + c + '! = ' + fact(c) + ' ways. They create ' + (c + 1) + ' gaps (before, between and after them).', 'The ' + v + ' vowels must go into different gaps. The first vowel has ' + (c + 1) + ' gaps to choose from, the second has ' + c + '. That gives ' + Pm(c + 1, v) + ' ways.', 'Total = ' + fact(c) + ' × ' + Pm(c + 1, v) + ' = ' + ans + '.'], ans, { check: permCount(n, function (a) { for (var i = 1; i < n; i++) if ('AEIOU'.indexOf(L[a[i]]) >= 0 && 'AEIOU'.indexOf(L[a[i - 1]]) >= 0) return false; return true; }) });
  });
  M5[2][3].push(function (r) { // alternate boys girls
    var k = r.pick([2, 3]), ans = 2 * fact(k) * fact(k);
    return I(k + ' boys and ' + k + ' girls stand in a line so that boys and girls alternate (no two boys are together and no two girls are together). In how many ways can they line up?', ['The line either starts with a boy or starts with a girl: 2 patterns.', 'In each pattern, the boys can be ordered in ' + k + '! = ' + fact(k) + ' ways and the girls in ' + k + '! = ' + fact(k) + ' ways.', 'Total = 2 × ' + fact(k) + ' × ' + fact(k) + ' = ' + ans + '.'], ans, { check: permCount(2 * k, function (a) { for (var i = 1; i < 2 * k; i++) if ((a[i] < k) === (a[i - 1] < k)) return false; return true; }) });
  });
  M5[2][3].push(function (r) { // both A and B
    var n = r.int(6, 10), k = r.int(3, 5), what = r.pick(['both', 'exactly one']), ans = what === 'both' ? C(n - 2, k - 2) : 2 * C(n - 2, k - 1);
    return I('A team of ' + k + ' is picked from ' + n + ' players, including two friends, Dee and Eli. How many teams include ' + (what === 'both' ? 'both' : 'exactly one of') + ' Dee and Eli?', what === 'both' ? ['If both are on the team, they fill 2 of the ' + k + ' places.', 'Choose the other ' + (k - 2) + ' players from the remaining ' + (n - 2) + ': C(' + (n - 2) + ', ' + (k - 2) + ') = ' + ans + '.'] : ['Pick which friend is on the team: 2 ways.', 'That friend fills 1 place, and the other ' + (k - 1) + ' players come from the ' + (n - 2) + ' who are not friends: C(' + (n - 2) + ', ' + (k - 1) + ') = ' + C(n - 2, k - 1) + '.', 'Total = 2 × ' + C(n - 2, k - 1) + ' = ' + ans + '.'], ans, { check: combCount(n, k, function (p) { var c = (p.indexOf(0) >= 0) + (p.indexOf(1) >= 0); return what === 'both' ? c === 2 : c === 1; }) });
  });
  M5[2][3].push(function (r) { // stars and bars
    var k = r.int(3, 4), n = r.int(k + 2, k + 7), zero = r.chance(0.4), tot = zero ? n : n - k, cnt = 0, ans = zero ? C(n + k - 1, k - 1) : C(n - 1, k - 1);
    function go(left, kids) { if (kids === 1) return 1; var t = 0, lo = zero ? 0 : 1; for (var x = lo; x <= left - (zero ? 0 : kids - 1); x++) t += go(left - x, kids - 1); return t; }
    return I('In how many ways can ' + n + ' identical candies be given to ' + k + ' children' + (zero ? ' (some children may get none)' : ', if every child gets at least one candy') + '?', zero ? ['Line up ' + n + ' candies and ' + (k - 1) + ' dividers. The dividers cut the row into ' + k + ' piles, and a pile can be empty.', 'Choose which ' + (k - 1) + ' of the ' + (n + k - 1) + ' positions are dividers: C(' + (n + k - 1) + ', ' + (k - 1) + ') = ' + ans + '.'] : ['Give every child 1 candy first. That uses ' + k + ' candies and leaves ' + (n - k) + ' to give out freely.', 'Now candies and ' + (k - 1) + ' dividers make a row of ' + (n - k + k - 1) + ' positions. Choose the divider places: C(' + (n - 1) + ', ' + (k - 1) + ') = ' + ans + '.'], ans, { check: (function () { function g(left, kids) { if (kids === 1) return (zero || left >= 1) ? 1 : 0; var t = 0; for (var x = (zero ? 0 : 1); x <= left; x++) t += g(left - x, kids - 1); return t; } return g(n, k); })() });
  });
  M5[2][3].push(function (r) { // rectangles in a grid
    var a = r.int(2, 6), b = r.int(2, 6), ans = C(a + 1, 2) * C(b + 1, 2), cnt = 0;
    for (var x1 = 0; x1 <= a; x1++) for (var x2 = x1 + 1; x2 <= a; x2++) for (var y1 = 0; y1 <= b; y1++) for (var y2 = y1 + 1; y2 <= b; y2++) cnt++;
    return I('A rectangle is divided into a grid of ' + a + ' columns and ' + b + ' rows of small squares. How many rectangles of any size (including squares) can be found by following the grid lines?', ['A rectangle is decided by choosing 2 of the ' + (a + 1) + ' vertical lines and 2 of the ' + (b + 1) + ' horizontal lines.', 'Vertical pairs: C(' + (a + 1) + ', 2) = ' + C(a + 1, 2) + '. Horizontal pairs: C(' + (b + 1) + ', 2) = ' + C(b + 1, 2) + '.', 'Rectangles = ' + C(a + 1, 2) + ' × ' + C(b + 1, 2) + ' = ' + ans + '.'], ans, { check: cnt });
  });

  // ---------- m5t3: grid path counting ----------
  // Paths from (0,0) to (a,b) moving right or up. blocked = set of "i,j" points to avoid. diag = allow diagonal steps too.
  function gridPaths(a, b, blocked, diag, edge) {
    var g = []; for (var i = 0; i <= a; i++) { g[i] = []; for (var j = 0; j <= b; j++) { if (blocked && blocked['' + i + ',' + j]) { g[i][j] = 0; continue; } if (i === 0 && j === 0) { g[i][j] = 1; continue; } var v = (i > 0 ? g[i - 1][j] : 0) + (j > 0 ? g[i][j - 1] : 0) + (diag && i > 0 && j > 0 ? g[i - 1][j - 1] : 0); g[i][j] = v; } }
    return g[a][b];
  }

  M5[3][1].push(function (r) { // plain grid
    var a = r.int(2, 5), b = r.int(2, 4);
    return I('On the grid, you walk from A (bottom left) to B (top right), moving only right or up along the lines. The grid is ' + a + ' blocks wide and ' + b + ' blocks tall. How many different shortest routes are there?', ['Every shortest route has exactly ' + a + ' steps right (R) and ' + b + ' steps up (U), ' + (a + b) + ' steps in all.', 'A route is decided by which ' + a + ' of the ' + (a + b) + ' steps are R. That is C(' + (a + b) + ', ' + a + ') = ' + C(a + b, a) + '.', 'Or add numbers on the grid: each corner gets the sum of the number to its left and the number below it. The number at B is ' + C(a + b, a) + '.'], C(a + b, a), { check: gridPaths(a, b), visual: V.pathGrid(a, b) });
  });
  M5[3][1].push(function (r) { // square grid
    var n = r.int(2, 5);
    return I('A square town has a grid of streets with ' + n + ' blocks in each direction. Mia walks from the south west corner to the north east corner using only north and east moves. How many routes can she take?', ['She takes ' + n + ' steps east and ' + n + ' steps north, ' + 2 * n + ' steps in total.', 'Choose the ' + n + ' positions for the east steps: C(' + 2 * n + ', ' + n + ') = ' + C(2 * n, n) + '.'], C(2 * n, n), { check: gridPaths(n, n), visual: V.pathGrid(n, n) });
  });
  M5[3][1].push(function (r) { // stairs 1 or 2 steps
    var n = r.int(4, 9), f = [1, 1]; for (var i = 2; i <= n; i++) f[i] = f[i - 1] + f[i - 2];
    return I('A staircase has ' + n + ' steps. Sam climbs it taking either 1 step or 2 steps at a time. In how many different ways can he reach the top?', ['Work upward. Let W(k) be the number of ways to reach step k. The last move was either 1 step from step k ' + MINUS + ' 1 or 2 steps from step k ' + MINUS + ' 2, so W(k) = W(k ' + MINUS + ' 1) + W(k ' + MINUS + ' 2).', 'W(1) = 1, W(2) = 2. Then ' + f.slice(1, n + 1).map(function (v, i) { return 'W(' + (i + 1) + ') = ' + v; }).join(', ') + '.', 'The answer is W(' + n + ') = ' + f[n] + '. These are Fibonacci numbers.'], f[n], { check: (function () { function w(k) { return k < 0 ? 0 : k === 0 ? 1 : w(k - 1) + w(k - 2); } return w(n); })() });
  });

  M5[3][2].push(function (r) { // through a point
    var a = r.int(4, 6), b = r.int(3, 5), i = r.int(1, a - 1), j = r.int(1, b - 1), p1 = C(i + j, i), p2 = C(a - i + b - j, a - i);
    return I('On a ' + a + ' by ' + b + ' grid (' + a + ' blocks across and ' + b + ' blocks up), you walk from A at the bottom left to B at the top right using only right and up moves. How many shortest routes pass through the point ' + i + ' blocks right and ' + j + ' blocks up from A?', ['Split the trip at the point. From A to the point: ' + i + ' right and ' + j + ' up, C(' + (i + j) + ', ' + i + ') = ' + p1 + ' routes.', 'From the point to B: ' + (a - i) + ' right and ' + (b - j) + ' up, C(' + (a - i + b - j) + ', ' + (a - i) + ') = ' + p2 + ' routes.', 'Each first half combines with each second half: ' + p1 + ' × ' + p2 + ' = ' + p1 * p2 + '.'], p1 * p2, { check: gridPaths(i, j) * gridPaths(a - i, b - j), visual: V.pathGrid(a, b, i, j) });
  });
  M5[3][2].push(function (r) { // blocked intersection
    var a = r.int(4, 6), b = r.int(3, 5), i = r.int(1, a - 1), j = r.int(1, b - 1), tot = C(a + b, a), bad = C(i + j, i) * C(a - i + b - j, a - i), bl = {}; bl[i + ',' + j] = 1;
    return I('On a ' + a + ' by ' + b + ' grid you walk from A (bottom left) to B (top right) using right and up moves. The intersection ' + i + ' right and ' + j + ' up from A is closed for roadworks and marked with an X. How many shortest routes avoid it?', ['All routes: C(' + (a + b) + ', ' + a + ') = ' + tot + '.', 'Routes through the closed point: C(' + (i + j) + ', ' + i + ') × C(' + (a - i + b - j) + ', ' + (a - i) + ') = ' + C(i + j, i) + ' × ' + C(a - i + b - j, a - i) + ' = ' + bad + '.', 'Good routes = ' + tot + ' ' + MINUS + ' ' + bad + ' = ' + (tot - bad) + '.', 'Subtracting the bad routes is much quicker than trying to count the good ones directly.'], tot - bad, { check: gridPaths(a, b, bl), visual: V.pathGrid(a, b, i, j) });
  });
  M5[3][2].push(function (r) { // closed street segment
    var a = r.int(4, 6), b = r.int(3, 5), i = r.int(1, a - 1), j = r.int(0, b), tot = C(a + b, a), bad = C(i - 1 + j, j) * C(a - i + b - j, a - i);
    var g = gridPaths(a, b), ok = 0; // brute: count routes not using the edge (i-1,j)->(i,j)
    (function () { var cnt = 0; function go(x, y, used) { if (x === a && y === b) { if (!used) cnt++; return; } if (x < a) go(x + 1, y, used || (x === i - 1 && y === j)); if (y < b) go(x, y + 1, used); } go(0, 0, false); ok = cnt; })();
    return I('On a grid ' + a + ' blocks across and ' + b + ' blocks up, you walk from A (bottom left) to B (top right) with right and up moves. The street segment that runs from the point (' + (i - 1) + ' right, ' + j + ' up) to the point (' + i + ' right, ' + j + ' up) is closed. How many shortest routes are still possible?', ['All routes: C(' + (a + b) + ', ' + a + ') = ' + tot + '.', 'Routes that use the closed segment: get to its start (' + (i - 1) + ' right, ' + j + ' up) in C(' + (i - 1 + j) + ', ' + j + ') = ' + C(i - 1 + j, j) + ' ways, take the segment, then from (' + i + ', ' + j + ') to B in C(' + (a - i + b - j) + ', ' + (a - i) + ') = ' + C(a - i + b - j, a - i) + ' ways. That is ' + bad + ' routes.', 'Remaining = ' + tot + ' ' + MINUS + ' ' + bad + ' = ' + (tot - bad) + '.'], tot - bad, { check: ok });
  });

  M5[3][3].push(function (r) { // two blocked points
    var a = r.int(4, 6), b = r.int(4, 5), i1 = r.int(1, a - 2), j1 = r.int(1, b - 1), i2 = r.int(i1 + 1, a - 1), j2 = r.int(1, b - 1);
    var bl = {}; bl[i1 + ',' + j1] = 1; bl[i2 + ',' + j2] = 1;
    var tot = C(a + b, a), P = C(i1 + j1, i1) * C(a - i1 + b - j1, a - i1), Q = C(i2 + j2, i2) * C(a - i2 + b - j2, a - i2), both = (j2 >= j1) ? gridPaths(i1, j1) * gridPaths(i2 - i1, j2 - j1) * gridPaths(a - i2, b - j2) : 0;
    return I('On a ' + a + ' by ' + b + ' grid you walk from A (bottom left) to B (top right) using right and up moves. Two intersections are closed: P at (' + i1 + ', ' + j1 + ') and Q at (' + i2 + ', ' + j2 + '), measured as blocks right and up from A. How many shortest routes avoid both?', ['Use inclusion and exclusion. All routes: ' + tot + '.', 'Routes through P: ' + C(i1 + j1, i1) + ' × ' + C(a - i1 + b - j1, a - i1) + ' = ' + P + '. Routes through Q: ' + C(i2 + j2, i2) + ' × ' + C(a - i2 + b - j2, a - i2) + ' = ' + Q + '.', j2 >= j1 ? 'Some routes go through both P and then Q: (A to P) × (P to Q) × (Q to B) = ' + gridPaths(i1, j1) + ' × ' + gridPaths(i2 - i1, j2 - j1) + ' × ' + gridPaths(a - i2, b - j2) + ' = ' + both + '. They were subtracted twice, so add them back once.' : 'No route can go through both points, because Q is lower than P and routes never move down. So there is no overlap to correct.', 'Good routes = ' + tot + ' ' + MINUS + ' ' + P + ' ' + MINUS + ' ' + Q + (both ? ' + ' + both : '') + ' = ' + (tot - P - Q + both) + '.'], tot - P - Q + both, { check: gridPaths(a, b, bl), visual: V.pathGrid(a, b, i1, j1) });
  });
  M5[3][3].push(function (r) { // Catalan
    var n = r.int(3, 5), cat = [1, 1, 2, 5, 14, 42][n];
    var cnt = (function () { var t = 0; function go(x, y) { if (x === n && y === n) { t++; return; } if (x < n) go(x + 1, y); if (y < x) go(x, y + 1); } go(0, 0); return t; })();
    return I('A robot walks on a square grid from (0, 0) to (' + n + ', ' + n + '), moving one unit right or one unit up at a time. It must never go above the diagonal line y = x (touching the line is allowed). How many different routes can it take?', ['Count the routes to each point that stays legal. A point (x, y) can only be reached if y ≤ x. Its count is the number to its left plus the number below it.', 'Build the table row by row from (0, 0). The counts along the diagonal are 1, 1, 2, 5, 14, 42 for n = 0, 1, 2, 3, 4, 5.', 'For n = ' + n + ' the answer is ' + cat + '. (These are the Catalan numbers.)'], cat, { check: cnt });
  });
  M5[3][3].push(function (r) { // diagonal steps allowed
    var a = r.int(2, 4), b = r.int(2, 3), ans = gridPaths(a, b, null, true), rows = [];
    var g = []; for (var i = 0; i <= a; i++) { g[i] = []; for (var j = 0; j <= b; j++) g[i][j] = gridPaths(i, j, null, true); }
    return I('A token moves from the bottom left corner to the top right corner of a ' + a + ' by ' + b + ' grid of points. Each move is one step right, one step up, or one step diagonally up and to the right. How many different paths are there?', ['Count paths to each point. A point can be reached from the left, from below, or from the diagonal down left. So its count is the sum of those three counts.', 'Start with 1 at the corner. Along the bottom row the counts are all 1. Fill row by row.', 'Row by row from the bottom: ' + [0, 1, 2, 3].slice(0, b + 1).map(function (j) { var row = []; for (var i = 0; i <= a; i++) row.push(g[i][j]); return row.join(', '); }).join('  |  ') + '.', 'The number at the top right corner is ' + ans + '.'], ans, { check: (function () { var cnt = 0; function go(x, y) { if (x === a && y === b) { cnt++; return; } if (x < a) go(x + 1, y); if (y < b) go(x, y + 1); if (x < a && y < b) go(x + 1, y + 1); } go(0, 0); return cnt; })() });
  });
  M5[3][3].push(function (r) { // either of two points
    var a = r.int(4, 6), b = r.int(4, 6), i1 = r.int(1, 2), j1 = r.int(b - 2, b - 1), i2 = r.int(i1 + 1, a - 1), j2 = r.int(1, Math.max(1, j1 - 1));
    if (!(i1 < i2 && j1 > j2)) return M5[3][3][3](r);
    var P = C(i1 + j1, i1) * C(a - i1 + b - j1, a - i1), Q = C(i2 + j2, i2) * C(a - i2 + b - j2, a - i2), cnt = 0;
    (function () { function go(x, y, hit) { if (x === a && y === b) { if (hit) cnt++; return; } var h = hit || (x === i1 && y === j1) || (x === i2 && y === j2); if (x < a) go(x + 1, y, h); if (y < b) go(x, y + 1, h); } go(0, 0, (i1 === 0 && j1 === 0)); })();
    return I('On a ' + a + ' by ' + b + ' grid you walk from A (bottom left) to B (top right) using right and up moves. How many shortest routes pass through the point (' + i1 + ', ' + j1 + ') or the point (' + i2 + ', ' + j2 + ') (or both), where the numbers are blocks right and up from A?', ['Look at the two points. The second is to the right of the first but lower, so a route that moves only right and up cannot visit both. No overlap to worry about.', 'Through the first: C(' + (i1 + j1) + ', ' + i1 + ') × C(' + (a - i1 + b - j1) + ', ' + (a - i1) + ') = ' + P + '.', 'Through the second: C(' + (i2 + j2) + ', ' + i2 + ') × C(' + (a - i2 + b - j2) + ', ' + (a - i2) + ') = ' + Q + '.', 'Total = ' + P + ' + ' + Q + ' = ' + (P + Q) + '.'], P + Q, { check: cnt, visual: V.pathGrid(a, b, i1, j1) });
  });

  // ---------- m5t4: probability, with and without replacement ----------
  function PF(fav, tot) { return Fq(fav, tot); }
  function pval(f) { return f.n / f.d; }
  function bag(r0, b0, g0) { var a = []; for (var i = 0; i < r0; i++) a.push('R'); for (i = 0; i < b0; i++) a.push('B'); for (i = 0; i < (g0 || 0); i++) a.push('G'); return a; }
  // Exact probability by enumerating ordered draws of size k from an array (with or without replacement).
  function enumP(arr, k, repl, pred) {
    var fav = 0, tot = 0, cur = [], used = [];
    (function go() { if (cur.length === k) { tot++; if (pred(cur)) fav++; return; } for (var i = 0; i < arr.length; i++) { if (!repl && used[i]) continue; used[i] = true; cur.push(arr[i]); go(); cur.pop(); used[i] = false; } })();
    return fav / tot;
  }
  var CNAME = { R: 'red', B: 'blue', G: 'green' };
  function isPrime(n) { if (n < 2) return false; for (var i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }

  M5[4][1].push(function (r) { // with replacement RR
    var a = r.int(2, 7), b = r.int(2, 7), n = a + b, f = PF(a * a, n * n);
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. A marble is drawn, its colour is noted, and it is put back. Then a second marble is drawn. What is the probability that both are red?', ['Because the first marble is put back, the bag is the same for the second draw. The draws are independent.', 'P(red) = ' + fr(a, n) + ' each time.', 'P(both red) = ' + fr(a, n) + ' × ' + fr(a, n) + ' = ' + fr(a * a, n * n) + (f.d !== n * n ? ' = ' + fmk(f) : '') + '.', 'Follow the top branch of the tree diagram and multiply along it.'], f, { check: a * a / (n * n), visual: V.treeDiagram(a, b, 'with') });
  });
  M5[4][1].push(function (r) { // one of each
    var a = r.int(2, 7), b = r.int(2, 7), n = a + b, f = PF(2 * a * b, n * n);
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. One marble is drawn and replaced, then a second is drawn. What is the probability that the two marbles are different colours?', ['There are two ways to get one of each: red then blue, or blue then red.', 'P(red then blue) = ' + fr(a, n) + ' × ' + fr(b, n) + ' = ' + fr(a * b, n * n) + '. P(blue then red) is the same.', 'Add the two branches: ' + fr(2 * a * b, n * n) + (f.d !== n * n ? ' = ' + fmk(f) : '') + '.'], f, { check: 2 * a * b / (n * n), visual: V.treeDiagram(a, b, 'with') });
  });
  M5[4][1].push(function (r) { // at least one red
    var a = r.int(2, 6), b = r.int(2, 6), n = a + b, f = PF(n * n - b * b, n * n);
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. Two marbles are drawn one at a time, with replacement. What is the probability that at least one is red?', ['"At least one red" is the opposite of "no red at all", so use the complement.', 'P(both blue) = ' + fr(b, n) + ' × ' + fr(b, n) + ' = ' + fr(b * b, n * n) + '.', 'P(at least one red) = 1 ' + MINUS + ' ' + fr(b * b, n * n) + ' = ' + fr(n * n - b * b, n * n) + (f.d !== n * n ? ' = ' + fmk(f) : '') + '.'], f, { check: 1 - b * b / (n * n), visual: V.treeDiagram(a, b, 'with') });
  });
  M5[4][1].push(function (r) { // coins
    var n = r.int(3, 4), k = r.int(1, n - 1), fav = C(n, k), f = PF(fav, Math.pow(2, n));
    var chk = enumP(['H', 'T'], n, true, function (c) { return c.filter(function (x) { return x === 'H'; }).length === k; });
    return FR('A fair coin is flipped ' + n + ' times. What is the probability of getting exactly ' + k + ' head' + (k > 1 ? 's' : '') + '?', ['Each flip has 2 outcomes, so there are 2^{' + n + '} = ' + Math.pow(2, n) + ' equally likely sequences.', 'The sequences with exactly ' + k + ' head' + (k > 1 ? 's' : '') + ' are found by choosing which flips are heads: C(' + n + ', ' + k + ') = ' + fav + '.', 'Probability = ' + fr(fav, Math.pow(2, n)) + (f.d !== Math.pow(2, n) ? ' = ' + fmk(f) : '') + '.'], f, { check: chk });
  });
  M5[4][1].push(function (r) { // dice sum
    var s = r.int(3, 11), ways = 6 - Math.abs(s - 7), f = PF(ways, 36), list = [];
    for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) if (a + b === s) list.push('(' + a + ',' + b + ')');
    return FR('Two fair six sided dice are rolled. What is the probability that the sum is ' + s + '?', ['There are 6 × 6 = 36 equally likely outcomes.', 'The outcomes with sum ' + s + ' are ' + list.join(', ') + ', which is ' + ways + ' outcomes.', 'Probability = ' + fr(ways, 36) + (f.d !== 36 ? ' = ' + fmk(f) : '') + '.'], f, { check: enumP([1, 2, 3, 4, 5, 6], 2, true, function (c) { return c[0] + c[1] === s; }) });
  });

  M5[4][2].push(function (r) { // both red without replacement
    var a = r.int(3, 7), b = r.int(2, 6), n = a + b, f = PF(a * (a - 1), n * (n - 1));
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. Two marbles are drawn one after the other and NOT put back. What is the probability that both are red?', ['After a red marble is removed the bag has ' + (n - 1) + ' marbles, and only ' + (a - 1) + ' of them are red.', 'P(first red) = ' + fr(a, n) + '. P(second red given first red) = ' + fr(a - 1, n - 1) + '.', 'Multiply along the branch: ' + fr(a, n) + ' × ' + fr(a - 1, n - 1) + ' = ' + fr(a * (a - 1), n * (n - 1)) + (f.d !== n * (n - 1) ? ' = ' + fmk(f) : '') + '.'], f, { check: enumP(bag(a, b), 2, false, function (c) { return c[0] === 'R' && c[1] === 'R'; }), visual: V.treeDiagram(a, b, 'without') });
  });
  M5[4][2].push(function (r) { // different colours without replacement
    var a = r.int(2, 7), b = r.int(2, 7), n = a + b, f = PF(2 * a * b, n * (n - 1));
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. Two marbles are drawn without replacement. What is the probability that they are different colours?', ['Red then blue: ' + fr(a, n) + ' × ' + fr(b, n - 1) + ' = ' + fr(a * b, n * (n - 1)) + '. Blue then red: ' + fr(b, n) + ' × ' + fr(a, n - 1) + ' = ' + fr(a * b, n * (n - 1)) + '.', 'Add the two branches: ' + fr(2 * a * b, n * (n - 1)) + (f.d !== n * (n - 1) ? ' = ' + fmk(f) : '') + '.'], f, { check: enumP(bag(a, b), 2, false, function (c) { return c[0] !== c[1]; }), visual: V.treeDiagram(a, b, 'without') });
  });
  M5[4][2].push(function (r) { // one of each of three colours
    var a = r.int(2, 4), b = r.int(2, 4), g = r.int(2, 4), n = a + b + g, f = PF(6 * a * b * g, n * (n - 1) * (n - 2));
    return FR('A bag holds ' + a + ' red, ' + b + ' blue and ' + g + ' green marbles. Three marbles are drawn without replacement. What is the probability that there is one of each colour?', ['There are 3! = 6 orders in which the three colours can appear, for example red, blue, green.', 'One order: ' + fr(a, n) + ' × ' + fr(b, n - 1) + ' × ' + fr(g, n - 2) + ' = ' + fr(a * b * g, n * (n - 1) * (n - 2)) + '.', 'All 6 orders have the same probability, so multiply by 6: ' + fr(6 * a * b * g, n * (n - 1) * (n - 2)) + (f.d !== n * (n - 1) * (n - 2) ? ' = ' + fmk(f) : '') + '.'], f, { check: enumP(bag(a, b, g), 3, false, function (c) { return new Set(c).size === 3; }) });
  });
  M5[4][2].push(function (r) { // second is red
    var a = r.int(2, 8), b = r.int(2, 8), n = a + b, f = PF(a, n);
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. Two marbles are drawn without replacement. You are not told the colour of the first. What is the probability that the second marble is red?', ['Split by what the first marble was. First red then second red: ' + fr(a, n) + ' × ' + fr(a - 1, n - 1) + '. First blue then second red: ' + fr(b, n) + ' × ' + fr(a, n - 1) + '.', 'Add: ' + fr(a * (a - 1) + a * b, n * (n - 1)) + ' = ' + fr(a * (a + b - 1), n * (n - 1)) + ' = ' + fr(a, n) + '.', 'Symmetry shortcut: with no information, the second marble is as likely to be red as the first, ' + fr(a, n) + (f.d !== n ? ' = ' + fmk(f) : '') + '.'], f, { check: enumP(bag(a, b), 2, false, function (c) { return c[1] === 'R'; }) });
  });
  M5[4][2].push(function (r) { // at least one red without replacement
    var a = r.int(2, 6), b = r.int(3, 7), n = a + b, f = PF(n * (n - 1) - b * (b - 1), n * (n - 1));
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. Two are drawn without replacement. What is the probability that at least one is red?', ['Use the complement: 1 ' + MINUS + ' P(no red).', 'P(both blue) = ' + fr(b, n) + ' × ' + fr(b - 1, n - 1) + ' = ' + fr(b * (b - 1), n * (n - 1)) + '.', 'Answer = 1 ' + MINUS + ' ' + fr(b * (b - 1), n * (n - 1)) + ' = ' + fr(n * (n - 1) - b * (b - 1), n * (n - 1)) + (f.d !== n * (n - 1) ? ' = ' + fmk(f) : '') + '.'], f, { check: enumP(bag(a, b), 2, false, function (c) { return c.indexOf('R') >= 0; }) });
  });
  M5[4][2].push(function (r) { // first red on draw k
    var a = r.int(2, 4), b = r.int(3, 5), n = a + b, k = r.int(2, 3), num = 1, den = 1, terms = [];
    for (var i = 0; i < k - 1; i++) { terms.push(fr(b - i, n - i)); num *= b - i; den *= n - i; } terms.push(fr(a, n - (k - 1))); num *= a; den *= n - (k - 1);
    var f = PF(num, den);
    var chk = enumP(bag(a, b), k, false, function (c) { for (var i = 0; i < k - 1; i++) if (c[i] !== 'B') return false; return c[k - 1] === 'R'; });
    return FR('A bag holds ' + a + ' red and ' + b + ' blue marbles. Marbles are drawn one at a time without replacement. What is the probability that the first red marble appears on draw number ' + k + '?', ['That means the first ' + (k - 1) + ' draw' + (k > 2 ? 's are' : ' is') + ' blue and draw ' + k + ' is red.', 'Multiply the chances, remembering the bag shrinks: ' + terms.join(' × ') + ' = ' + fr(num, den) + (f.d !== den ? ' = ' + fmk(f) : '') + '.'], f, { check: chk });
  });
  M5[4][2].push(function (r) { // cards
    var q = r.pick([['both cards are aces', 4, 4, 3], ['both cards are hearts', 13, 13, 12], ['both cards are red', 26, 26, 25], ['both cards are face cards (jack, queen or king)', 12, 12, 11]]), f = PF(q[2] * q[3], 52 * 51);
    var chk = q[2] * q[3] / (52 * 51);
    return FR('Two cards are dealt from a standard deck of 52 cards without replacement. What is the probability that ' + q[0] + '?', ['There are ' + q[1] + ' such cards. The chance the first is one of them is ' + fr(q[2], 52) + '.', 'Now one has been removed, leaving ' + q[3] + ' of them among the remaining 51 cards: ' + fr(q[3], 51) + '.', 'Multiply: ' + fr(q[2], 52) + ' × ' + fr(q[3], 51) + ' = ' + fr(q[2] * q[3], 52 * 51) + ' = ' + fmk(f) + '.'], f, { check: chk });
  });

  M5[4][3].push(function (r) { // find r from P(both red)
    var n = r.int(6, 12), a = r.int(2, n - 2), num = a * (a - 1), den = n * (n - 1), f = PF(num, den);
    return I('A bag has ' + n + ' marbles, some red and the rest blue. Two marbles are drawn without replacement and the probability that both are red is ' + fmk(f) + '. How many red marbles are in the bag?', ['If there are r red marbles, P(both red) = ' + fr('r', n) + ' × ' + fr('r' + ' ' + MINUS + ' 1', n - 1) + ' = ' + fr('r(r ' + MINUS + ' 1)', n * (n - 1)) + '.', 'Set this equal to ' + fmk(f) + ': r(r ' + MINUS + ' 1) ÷ ' + n * (n - 1) + ' = ' + fmk(f) + ', so r(r ' + MINUS + ' 1) = ' + n * (n - 1) + ' × ' + fmk(f) + ' = ' + num + '.', 'Look for two consecutive whole numbers with product ' + num + ': ' + a + ' × ' + (a - 1) + ' = ' + num + '. So r = ' + a + '.'], a, { check: (function () { for (var x = 0; x <= n; x++) if (x * (x - 1) * f.d === f.n * n * (n - 1)) return x; return -1; })() });
  });
  M5[4][3].push(function (r) { // dice conditions
    var kind = r.pick(['prime', 'atleast', 'even', 'differ']), s = r.int(8, 10), d = r.int(1, 3), pred, txt, exp;
    if (kind === 'prime') { pred = function (a, b) { return isPrime(a + b); }; txt = 'the sum is a prime number'; exp = 'Prime sums are 2, 3, 5, 7, 11. Ways: sum 2 has 1, sum 3 has 2, sum 5 has 4, sum 7 has 6, sum 11 has 2. Total = 1 + 2 + 4 + 6 + 2 = 15.'; }
    else if (kind === 'atleast') { pred = function (a, b) { return a + b >= s; }; txt = 'the sum is at least ' + s; exp = 'Ways to get each sum from ' + s + ' to 12: ' + (function () { var t = []; for (var x = s; x <= 12; x++) t.push('sum ' + x + ' has ' + (6 - Math.abs(x - 7))); return t.join(', '); })() + '.'; }
    else if (kind === 'even') { pred = function (a, b) { return (a * b) % 2 === 0; }; txt = 'the product of the two numbers is even'; exp = 'The product is odd only when both dice show odd numbers: 3 × 3 = 9 outcomes. So the product is even in 36 ' + MINUS + ' 9 = 27 outcomes.'; }
    else { pred = function (a, b) { return Math.abs(a - b) === d; }; txt = 'the two numbers differ by exactly ' + d; exp = 'For a difference of ' + d + ', the smaller number can be 1 to ' + (6 - d) + ', which is ' + (6 - d) + ' pairs. Each pair can appear in 2 orders: 2 × ' + (6 - d) + ' = ' + 2 * (6 - d) + ' outcomes.'; }
    var fav = 0; for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) if (pred(a, b)) fav++;
    var f = PF(fav, 36);
    return FR('Two fair six sided dice are rolled. What is the probability that ' + txt + '?', ['There are 36 equally likely outcomes.', exp, 'Probability = ' + fr(fav, 36) + (f.d !== 36 ? ' = ' + fmk(f) : '') + '.'], f, { check: enumP([1, 2, 3, 4, 5, 6], 2, true, function (c) { return pred(c[0], c[1]); }) });
  });
  M5[4][3].push(function (r) { // pick two numbers
    var N = r.int(6, 12), kind = r.pick(['sumEven', 'prodEven', 'prime']), nums = []; for (var i = 1; i <= N; i++) nums.push(i);
    var pred = kind === 'sumEven' ? function (c) { return (c[0] + c[1]) % 2 === 0; } : kind === 'prodEven' ? function (c) { return (c[0] * c[1]) % 2 === 0; } : function (c) { return isPrime(c[0]) && isPrime(c[1]); };
    var fav = 0, tot = N * (N - 1); for (var x = 1; x <= N; x++) for (var y = 1; y <= N; y++) if (x !== y && pred([x, y])) fav++;
    var ev = Math.floor(N / 2), od = N - ev, pr = nums.filter(isPrime).length, f = PF(fav, tot);
    var txt = kind === 'sumEven' ? 'the sum is even' : kind === 'prodEven' ? 'the product is even' : 'both numbers are prime';
    var st = kind === 'sumEven' ? ['The sum is even when both numbers have the same parity. There are ' + ev + ' even and ' + od + ' odd numbers.', 'Same parity pairs (ordered): ' + ev + ' × ' + (ev - 1) + ' + ' + od + ' × ' + (od - 1) + ' = ' + (ev * (ev - 1) + od * (od - 1)) + '.']
      : kind === 'prodEven' ? ['The product is odd only when both numbers are odd: ' + od + ' × ' + (od - 1) + ' = ' + od * (od - 1) + ' ordered pairs.', 'Even products: ' + tot + ' ' + MINUS + ' ' + od * (od - 1) + ' = ' + fav + ' ordered pairs.']
        : ['The primes from 1 to ' + N + ' are ' + nums.filter(isPrime).join(', ') + ', which is ' + pr + ' numbers.', 'Ordered pairs of two different primes: ' + pr + ' × ' + (pr - 1) + ' = ' + fav + '.'];
    return FR('The numbers 1 to ' + N + ' are written on ' + N + ' cards. Two different cards are drawn at random. What is the probability that ' + txt + '?', ['There are ' + N + ' × ' + (N - 1) + ' = ' + tot + ' ordered pairs of different cards, all equally likely.'].concat(st, ['Probability = ' + fr(fav, tot) + (f.d !== tot ? ' = ' + fmk(f) : '') + '.']), f, { check: fav / tot });
  });
  M5[4][3].push(function (r) { // 3 digit numbers
    var kind = r.pick(['diff', 'nozero', 'evendiff']), pred, txt, st;
    if (kind === 'diff') { pred = function (s) { return new Set(s.split('')).size === 3; }; txt = 'all three digits are different'; st = ['Numbers with all digits different: 9 × 9 × 8 = 648.']; }
    else if (kind === 'nozero') { pred = function (s) { return s.indexOf('0') < 0; }; txt = 'none of the digits is 0'; st = ['Each digit can be 1 to 9: 9 × 9 × 9 = 729.']; }
    else { pred = function (s) { return new Set(s.split('')).size === 3 && +s % 2 === 0; }; txt = 'all three digits are different and the number is even'; st = ['Split by the last digit. If it is 0: 9 × 8 = 72 numbers. If it is 2, 4, 6 or 8 (4 choices): the first digit has 8 choices (not 0, not the last), the middle has 8 choices, so 4 × 8 × 8 = 256.', 'Total = 72 + 256 = 328.']; }
    var fav = 0; for (var x = 100; x <= 999; x++) if (pred(String(x))) fav++;
    var f = PF(fav, 900);
    return FR('A three digit number from 100 to 999 is chosen at random. What is the probability that ' + txt + '?', ['There are 900 three digit numbers.'].concat(st, ['Probability = ' + fr(fav, 900) + (f.d !== 900 ? ' = ' + fmk(f) : '') + '.']), f, { check: fav / 900 });
  });
  M5[4][3].push(function (r) { // at least one success
    var p = r.pick([[1, 2], [1, 3], [1, 4], [2, 3], [1, 5], [3, 4]]), n = r.int(2, 4), q = Fq(p[1] - p[0], p[1]), fail = { n: Math.pow(q.n, n), d: Math.pow(q.d, n) }, f = PF(fail.d - fail.n, fail.d);
    return FR('Each of ' + n + ' independent security cameras catches an intruder with probability ' + fr(p[0], p[1]) + '. What is the probability that at least one camera catches the intruder?', ['"At least one" is easiest through its opposite: no camera catches the intruder.', 'One camera misses with probability 1 ' + MINUS + ' ' + fr(p[0], p[1]) + ' = ' + fr(p[1] - p[0], p[1]) + '. All ' + n + ' miss: (' + fr(p[1] - p[0], p[1]) + ')^{' + n + '} = ' + fr(Math.pow(p[1] - p[0], n), Math.pow(p[1], n)) + '.', 'At least one catches = 1 ' + MINUS + ' ' + fr(Math.pow(p[1] - p[0], n), Math.pow(p[1], n)) + ' = ' + fmk(f) + '.'], f, { check: 1 - Math.pow((p[1] - p[0]) / p[1], n) });
  });
  M5[4][3].push(function (r) { // all reds first
    var a = r.int(2, 4), b = r.int(2, 4), n = a + b, f = PF(1, C(n, a));
    var chk = (function () { function go(x, y) { if (x === 0) return 1; return (x / (x + y)) * go(x - 1, y); } return go(a, b); })();
    return FR('A bag has ' + a + ' red and ' + b + ' blue marbles. All the marbles are drawn out one at a time without replacement. What is the probability that all ' + a + ' red marbles come out before any blue marble?', ['Imagine the whole sequence of ' + n + ' draws. The red marbles must fill the first ' + a + ' places.', 'Every way of choosing which ' + a + ' of the ' + n + ' places hold the reds is equally likely. There are C(' + n + ', ' + a + ') = ' + C(n, a) + ' choices, and only one of them puts the reds first.', 'Probability = ' + fr(1, C(n, a)) + '.', 'Check by multiplying: ' + fr(a, n) + ' × ' + fr(a - 1, n - 1) + (a > 2 ? ' × ...' : '') + ' with the blue never appearing gives the same value.'], f, { check: chk });
  });

  /* ==================================================================
     LESSONS (Markdown plus :::visual and :::worked directives)
  ================================================================== */
  var L = {
    m4t0: '## Pythagoras and the right triangle\nIn a right triangle the two **legs** meet at the right angle. The side opposite it is the **hypotenuse**, always the longest. The rule is a^{2} + b^{2} = c^{2}.\n:::visual rightTriangle 3 4 5 3 4\nLearn the triples 3, 4, 5 and 5, 12, 13 and 8, 15, 17 and 7, 24, 25. Any multiple of a triple is a triple too, so 9, 12, 15 works.\nWhen a figure looks complicated, hunt for right angles and split it into right triangles. Use the shared side as a bridge from one triangle to the next.\n> Area two ways: the altitude to the hypotenuse is (leg × leg) ÷ hypotenuse.\n### Worked example\n:::worked m4t0 2',
    m4t1: '## Solids, surface area and space diagonals\n**Surface area** is the total area of all the faces. For any prism: SA = 2 × (base area) + (base perimeter) × height.\n:::visual box3d 3 4 12 1\nThe **space diagonal** of a box joins opposite corners through the inside. Use Pythagoras twice, or jump straight to D^{2} = l^{2} + w^{2} + h^{2}. This box has D^{2} = 9 + 16 + 144 = 169, so D = 13.\nFor painted cube puzzles, remove one layer from every side to find the unpainted core. Corners have 3 painted faces, edges 2, face centres 1.\n> An ant on the outside of a box takes the shortest route by unfolding two faces flat and drawing a straight line.\n### Worked example\n:::worked m4t1 3',
    m4t2: '## Composite shapes and scaling\nSplit a complicated shape into rectangles, triangles and circles, or subtract a cut out piece from a big shape. A notch cut out of a corner never changes the perimeter.\n:::visual shaded ring\nWhen every length is multiplied by k: lengths scale by **k**, areas by **k^{2}**, and volumes by **k^{3}**. Doubling the sides of a square makes the area 4 times as big. Doubling the edges of a cube makes the volume 8 times as big.\nPercent changes behave the same way. Sides 20% longer means area 1.2 × 1.2 = 1.44 times, an increase of 44%.\n> Always decide first: is the quantity a length, an area or a volume?\n### Worked example\n:::worked m4t2 2',
    m4t3: '## Angles, parallel lines and polygons\nAngles on a straight line add to 180°. Angles around a point add to 360°. Angles in a triangle add to 180°.\n:::visual parallelTransversal 4 65° 6 ?\nHere the marked angles are alternate angles, so they are equal. When a line crosses two **parallel** lines: corresponding angles are equal, alternate angles are equal, and co-interior angles add to 180°. Acute angles match acute angles.\n:::visual bentLine 40 35 ?\nA bend between two parallel lines equals the sum of the two outer angles. Draw a helper line through the bend parallel to the others.\nFor a polygon with n sides the interior angles add to (n ' + MINUS + ' 2) × 180°. Exterior angles of any polygon add to 360°, so a regular polygon has exterior angles of 360° ÷ n.\n:::visual polygonAngles 6\n### Worked example\n:::worked m4t3 2',
    m4t4: '## Shaded areas\nShaded area problems are mostly **subtraction**: whole shape minus the pieces you do not want. Or **addition**: shaded pieces that add up to a simple shape.\n:::visual shaded inscribed\nA circle inside a square touching all four sides has radius half the side, so the shaded corners have area s^{2} ' + MINUS + ' π(s/2)^{2}.\n:::visual shaded lens\nFor an overlap, add the two pieces then subtract the whole. That is the lens trick: two quarter circles minus the square.\nLook for symmetry, pieces you can slide to a new place, and shapes that cancel. Leave π in the answer.\n> Joining the midpoints of any quadrilateral shape that is a rectangle or square gives a shape of exactly half the area.\n### Worked example\n:::worked m4t4 2',
    m5t0: '## Mean, median and mode\nThe **mean** is the total divided by the count. The **median** is the middle value of the sorted list. The **mode** is the most common value.\n:::visual barChart 3 5 4 6 2\nTurn means into totals. If a mean of 80 over 5 tests changes to 82 over 6 tests, the totals go from 400 to 492, so the new test was 92.\nFor two groups, use a weighted mean: total of everyone divided by the number of everyone. The class mean sits closer to the bigger group.\nAdding a constant shifts the mean and median but not the range. Multiplying changes all three.\n> A moving average slides a window along the data to smooth out spikes.\n### Worked example\n:::worked m5t0 2',
    m5t1: '## The fundamental counting rule\nIf a job has stages and stage 1 can be done in m ways, stage 2 in n ways, and so on, the whole job can be done in **m × n × ...** ways, as long as the stage choices do not depend on each other.\nA licence plate with 3 letters and 3 digits has 26 × 26 × 26 × 10 × 10 × 10 possibilities.\nIf there is a restriction, fill the **most restricted place first**. For an even 3 digit number, choose the last digit first.\nTo count divisors, write the number as primes. 360 = 2^{3} × 3^{2} × 5 has (3 + 1)(2 + 1)(1 + 1) = 24 divisors.\n> Building the good objects step by step is usually faster than counting all objects and subtracting the bad ones.\n### Worked example\n:::worked m5t1 2',
    m5t2: '## Permutations and combinations\nA **permutation** is an arrangement where order matters. n different objects can be lined up in n! = n × (n ' + MINUS + ' 1) × ... × 1 ways.\nChoosing k objects in order from n: n × (n ' + MINUS + ' 1) × ... for k terms.\nA **combination** is a selection where order does not matter. Divide the ordered count by k!, so C(n, k) = n(n ' + MINUS + ' 1)... ÷ k!.\nRepeated letters: divide by the factorial of each repeat count. BANANA has 6! ÷ (3! × 2!) = 60 arrangements.\nFor "must be together" glue them into a block. For "must not be together" take everything minus together. For "at least one" take everything minus none.\n> Ask yourself: does the order of my choices change the outcome?\n### Worked example\n:::worked m5t2 2',
    m5t3: '## Counting paths on a grid\nTo go from the bottom left corner to the top right corner using only right and up steps on an a by b grid, you need a rights and b ups. Choose which of the a + b steps are rights: C(a + b, a).\n:::visual pathGrid 4 3\nYou can also write numbers on the grid. Every corner gets the **sum** of the number to its left and the number below it.\nTo pass through a point, multiply the paths to the point by the paths from the point. To avoid a point, subtract the paths through it from the total.\nStaircases where you climb 1 or 2 steps at a time follow the same add the two before it pattern (Fibonacci).\n> Movement rules change the counting rule. Allow a diagonal and each corner adds three numbers.\n### Worked example\n:::worked m5t3 2',
    m5t4: '## Probability with and without replacement\nProbability = favourable outcomes ÷ total outcomes, when every outcome is equally likely.\n:::visual treeDiagram 3 2 with\nWith replacement the bag is the same for every draw, so multiply the same fractions along a branch.\n:::visual treeDiagram 3 2 without\nWithout replacement the bag shrinks. After a red marble is taken, the next draw has one fewer marble and one fewer red.\nUse **complements** for "at least one": 1 ' + MINUS + ' P(none). Add the branches that give the same result, for example red then blue plus blue then red.\n> With no information about the first draw, the second draw has the same chances as the first (symmetry).\n### Worked example\n:::worked m5t4 2'
  };

  /* ==================================================================
     REGISTRATION
  ================================================================== */
  E.registerModule({
    id: 'm4', title: 'Spatial Sense, Geometry & Measurement',
    topics: [
      { id: 'm4t0', title: 'Pythagorean theorem in multi triangle figures', gens: M4[0], lesson: L.m4t0, summary: 'Hypotenuse and legs, ladders, distance, chains of triangles, altitudes, incircles and trapezoids.' },
      { id: 'm4t1', title: 'Space diagonals, surface area and 3D solids', gens: M4[1], lesson: L.m4t1, summary: 'Prism surface area, space diagonals, 3D distance, painted cubes, unfolding routes and tunnels.' },
      { id: 'm4t2', title: 'Composite shapes and scaling laws', gens: M4[2], lesson: L.m4t2, summary: 'L shapes, semicircles, rings, and the k, k squared and k cubed scaling laws.' },
      { id: 'm4t3', title: 'Parallel lines and polygon angles', gens: M4[3], lesson: L.m4t3, summary: 'Transversals, bent lines, interior and exterior angles, isosceles chasing and bisectors.' },
      { id: 'm4t4', title: 'Shaded areas inside squares and circles', gens: M4[4], lesson: L.m4t4, summary: 'Circles in squares, lenses, rings, chords, lunes and midpoint squares, with exact answers in π.' }
    ]
  });
  E.registerModule({
    id: 'm5', title: 'Data Literacy, Permutations & Probability',
    topics: [
      { id: 'm5t0', title: 'Mean, median and mode with shifting data', gens: M5[0], lesson: L.m5t0, summary: 'Moving averages, grouped data, weighted means, changed data sets and extreme value puzzles.' },
      { id: 'm5t1', title: 'Fundamental counting rule', gens: M5[1], lesson: L.m5t1, summary: 'Multiplying choices, restricted digits, palindromes, divisors and adjacent digit rules.' },
      { id: 'm5t2', title: 'Permutations and combinations', gens: M5[2], lesson: L.m5t2, summary: 'Arrangements, repeated letters, committees, together and apart, stars and bars, rectangles in grids.' },
      { id: 'm5t3', title: 'Grid path counting', gens: M5[3], lesson: L.m5t3, summary: 'Shortest routes, through a point, blocked points and streets, diagonal steps and staircases.' },
      { id: 'm5t4', title: 'Probability without replacement', gens: M5[4], lesson: L.m5t4, summary: 'Tree diagrams, dependent draws, complements, dice, cards and Gauss style probability puzzles.' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
