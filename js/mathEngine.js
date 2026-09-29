/*!
 * mathEngine.js  v1.0.0
 * Content and question engine for Enriched Math 8.
 * Global: window.MathEngine (also module.exports in Node).
 *
 * Main calls:
 *   MathEngine.generateQuestion(moduleId, topicId, tier, opts)
 *   MathEngine.generateWorksheet({ moduleId, topicId, tier, count, mc })
 *   MathEngine.checkAnswer(question, userInput)
 *   MathEngine.renderContent(markdownOrHtml)      -> html string
 *   MathEngine.renderLesson(topicId)              -> html string
 *   MathEngine.renderQuestion(question, options)  -> html string
 *   MathEngine.mount(element, markdownOrHtml)
 *   MathEngine.registerModule(definition)         -> plug in Modules 2 to 6 later
 *
 * Math markup used inside questions and lessons:
 *   {{n|d}}  stacked fraction (may be nested)     x^{n}  superscript
 *   √{x}  square root with bar                    ∛{x}   cube root with bar
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  root.MathEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /* ================================================================
     1. Random numbers (seeded, so any question can be replayed)
  ================================================================ */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var masterRng = mulberry32((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
  function newSeed() { return Math.floor(masterRng() * 4294967296) >>> 0; }
  function makeR(seed) {
    var f = mulberry32(seed);
    return {
      next: f,
      int: function (a, b) { return a + Math.floor(f() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      chance: function (p) { return f() < (p == null ? 0.5 : p); },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }
    };
  }

  /* ================================================================
     2. Number helpers
  ================================================================ */
  var MINUS = '−';
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  function isPrime(n) { if (n < 2) return false; for (var i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
  function factorize(n) {
    var out = [];
    for (var p = 2; p * p <= n; p++) { var e = 0; while (n % p === 0) { n /= p; e++; } if (e) out.push([p, e]); }
    if (n > 1) out.push([n, 1]);
    return out;
  }
  function primeList(n) { var l = []; factorize(n).forEach(function (pe) { for (var i = 0; i < pe[1]; i++) l.push(pe[0]); }); return l; }
  function factorStr(n) { return factorize(n).map(function (pe) { return pe[1] > 1 ? pe[0] + '^{' + pe[1] + '}' : '' + pe[0]; }).join(' × '); }
  function countDivisors(n) { var c = 0; for (var i = 1; i * i <= n; i++) if (n % i === 0) c += (i * i === n) ? 1 : 2; return c; }
  function pow(b, e) { var x = 1; for (var i = 0; i < e; i++) x *= b; return x; }
  function modpow(b, e, m) { var res = 1 % m; b = b % m; while (e > 0) { if (e % 2 === 1) res = res * b % m; b = b * b % m; e = Math.floor(e / 2); } return res; }
  function isqrt(n) { var s = Math.floor(Math.sqrt(n)); while (s * s > n) s--; while ((s + 1) * (s + 1) <= n) s++; return s; }
  function digitSum(n) { return String(n).split('').reduce(function (a, c) { return a + (+c); }, 0); }

  // Integer formatting: real minus sign, commas only from 5 digits up
  function fmt(n) {
    var s = String(Math.abs(n));
    if (s.length > 4) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 ? MINUS : '') + s;
  }

  // Fractions
  function F(n, d) {
    if (d === undefined) d = 1;
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    return { n: n / g, d: d / g };
  }
  function fadd(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
  function fsub(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
  function fmul(a, b) { return F(a.n * b.n, a.d * b.d); }
  function fdiv(a, b) { return F(a.n * b.d, a.d * b.n); }
  function fpow(a, e) { return F(Math.pow(a.n, e), Math.pow(a.d, e)); }
  function fval(a) { return a.n / a.d; }
  function fstr(f) { return f.d === 1 ? fmt(f.n) : (f.n < 0 ? MINUS : '') + Math.abs(f.n) + '/' + f.d; }
  function fmk(f) { return f.d === 1 ? fmt(f.n) : (f.n < 0 ? MINUS : '') + '{{' + Math.abs(f.n) + '|' + f.d + '}}'; }
  function fr(n, d) { return '{{' + n + '|' + d + '}}'; }

  // Parse a typed or stored answer into a number when possible
  function parseAnswer(s) {
    s = String(s).trim().replace(/[−–—]/g, '-').replace(/[,\s$]/g, '');
    var m = /^(-?\d+)\/(\d+)$/.exec(s);
    if (m) return +m[1] / +m[2];
    if (/^-?\d+(\.\d+)?$/.test(s)) return +s;
    return NaN;
  }

  /* ================================================================
     3. Math markup to plain text and to HTML
  ================================================================ */
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '−': '⁻' };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function simple(x) { return /^[\d−.,a-z]+$/i.test(x); }

  function toPlain(s) {
    var prev;
    do {
      prev = s;
      s = s.replace(/\{\{([^{}|]*)\|([^{}]*)\}\}/g, function (_, n, d) { return (simple(n) ? n : '(' + n + ')') + '/' + (simple(d) ? d : '(' + d + ')'); });
      s = s.replace(/\^\{([^{}]*)\}/g, function (_, x) { return /^[\d−]+$/.test(x) ? x.replace(/./g, function (c) { return SUP[c]; }) : '^(' + x + ')'; });
      s = s.replace(/∛\{([^{}]*)\}/g, function (_, x) { return '∛' + (simple(x) ? x : '(' + x + ')'); });
      s = s.replace(/√\{([^{}]*)\}/g, function (_, x) { return '√' + (simple(x) ? x : '(' + x + ')'); });
    } while (s !== prev);
    return s;
  }

  function mathToHtml(s) {
    var prev;
    do {
      prev = s;
      s = s.replace(/\{\{([^{}|]*)\|([^{}]*)\}\}/g, '<span class="me-frac"><span class="me-n">$1</span><span class="me-d">$2</span></span>');
      s = s.replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>');
      s = s.replace(/∛\{([^{}]*)\}/g, '<span class="me-rad"><sup class="me-idx">3</sup>√<span class="me-vin">$1</span></span>');
      s = s.replace(/√\{([^{}]*)\}/g, '<span class="me-rad">√<span class="me-vin">$1</span></span>');
    } while (s !== prev);
    return s;
  }
  function toHtml(s) { return mathToHtml(esc(s)); }

  /* ================================================================
     4. Visuals: inline SVG and pure CSS frames
        Colors come from CSS classes, so they follow light and dark themes.
  ================================================================ */
  var V = {};
  var uid = 0;
  function svg(w, h, label, inner) {
    return '<svg class="me-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  function fig(inner, caption) {
    return '<figure class="me-fig">' + inner + (caption ? '<figcaption>' + caption + '</figcaption>' : '') + '</figure>';
  }
  function line(x1, y1, x2, y2, cls) { return '<line class="' + (cls || 'me-ln') + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>'; }
  function text(x, y, t, cls, anchor) { return '<text class="' + (cls || 'me-tx') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (anchor || 'middle') + '">' + esc(t) + '</text>'; }

  // n by n grid of tiles. The last row and column show the 2n - 1 growth.
  V.squareGrid = function (n) {
    n = Math.max(1, Math.min(15, Math.round(n)));
    var c = Math.max(14, Math.min(30, Math.floor(300 / n))), w = n * c + 20, h = n * c + 46, g = '';
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      g += '<rect class="' + ((i === n - 1 || j === n - 1) ? 'me-fb' : 'me-fa') + '" x="' + (10 + j * c) + '" y="' + (10 + i * c) + '" width="' + (c - 2) + '" height="' + (c - 2) + '" rx="3"/>';
    }
    g += text(w / 2, n * c + 34, n + ' × ' + n + ' = ' + n * n, 'me-tx me-bold');
    return fig(svg(Math.max(w, 150), h, n + ' by ' + n + ' square of tiles', g), 'Highlighted L shape: the ' + (2 * n - 1) + ' tiles added to grow an ' + (n - 1) + ' by ' + (n - 1) + ' square.');
  };

  // Isometric n by n by n cube.
  V.cubeStack = function (n) {
    n = Math.max(1, Math.min(6, Math.round(n)));
    var s = Math.min(26, Math.floor(150 / n)), ax = s * 0.866, ay = s * 0.5, ox = n * ax + 10, oy = 10, g = '';
    function P(x, y) { return x.toFixed(1) + ',' + y.toFixed(1); }
    var top = [P(ox, oy), P(ox + n * ax, oy + n * ay), P(ox, oy + n * s), P(ox - n * ax, oy + n * ay)].join(' ');
    var rx = ox + n * ax, ry = oy + n * ay;
    var right = [P(rx, ry), P(ox, oy + n * s), P(ox, oy + 2 * n * s), P(rx, ry + n * s)].join(' ');
    var lx = ox - n * ax;
    var left = [P(lx, ry), P(ox, oy + n * s), P(ox, oy + 2 * n * s), P(lx, ry + n * s)].join(' ');
    g += '<polygon class="me-fa" points="' + top + '"/><polygon class="me-fb" points="' + right + '"/><polygon class="me-fc" points="' + left + '"/>';
    for (var k = 0; k <= n; k++) {
      g += line(ox + k * ax, oy + k * ay, ox + k * ax - n * ax, oy + k * ay + n * ay);
      g += line(ox - k * ax, oy + k * ay, ox - k * ax + n * ax, oy + k * ay + n * ay);
      g += line(rx - k * ax, ry + k * ay, rx - k * ax, ry + k * ay + n * s);
      g += line(rx, ry + k * s, ox, oy + n * s + k * s);
      g += line(lx + k * ax, ry + k * ay, lx + k * ax, ry + k * ay + n * s);
      g += line(lx, ry + k * s, ox, oy + n * s + k * s);
    }
    var w = Math.max(2 * n * ax + 20, 150), h = 2 * n * s + 48;
    g += text(w / 2 + (w - (2 * n * ax + 20)) / 2 * 0, h - 8, n + ' × ' + n + ' × ' + n + ' = ' + n * n * n, 'me-tx me-bold');
    return fig(svg(w, h, n + ' by ' + n + ' by ' + n + ' cube', g));
  };

  // Number line locating the square root of n between two whole numbers.
  V.sqrtLine = function (n) {
    n = Math.max(2, Math.round(n));
    var k = isqrt(n), frac = Math.sqrt(n) - k, x0 = 40, x1 = 300, mx = x0 + frac * (x1 - x0);
    var g = line(x0, 50, x1, 50, 'me-ln me-thick') + line(x0, 42, x0, 58) + line(x1, 42, x1, 58);
    g += text(x0, 32, String(k), 'me-tx me-bold') + text(x1, 32, String(k + 1), 'me-tx me-bold');
    g += text(x0, 78, k + '² = ' + k * k) + text(x1, 78, (k + 1) + '² = ' + (k + 1) * (k + 1));
    g += '<circle class="me-fb" cx="' + mx.toFixed(1) + '" cy="50" r="7"/>';
    g += text(mx, 106, '√' + n + ' ≈ ' + Math.sqrt(n).toFixed(2), 'me-tx me-bold');
    return fig(svg(340, 118, 'Number line for the square root of ' + n, g));
  };

  // Factor tree drawn as a chain: a prime on the left, the remainder on the right.
  V.factorTree = function (n) {
    n = Math.max(4, Math.round(n));
    var cur = n, k = 0, nodes = [], g = '', x0 = 54, y0 = 30, r = 17;
    function node(x, y, label, prime) {
      return '<circle class="' + (prime ? 'me-fb' : 'me-ring') + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' + text(x, y + 5, label, prime ? 'me-tx me-bold me-on' : 'me-tx me-bold');
    }
    while (!isPrime(cur)) {
      var p = 2; while (cur % p !== 0) p++;
      var x = x0 + k * 48, y = y0 + k * 52, rest = cur / p;
      g += line(x, y, x - 36, y + 52) + line(x, y, x + 48, y + 52);
      nodes.push(node(x, y, cur, false), node(x - 36, y + 52, p, true));
      cur = rest; k++;
    }
    nodes.push(node(x0 + k * 48, y0 + k * 52, cur, true));
    var w = x0 + k * 48 + r + 14, h = y0 + k * 52 + r + 34;
    var caption = n + ' = ' + factorStr(n);
    return fig(svg(w, h - 22, 'Factor tree of ' + n, g + nodes.join('')), toHtml(caption));
  };

  // Venn diagram of prime factors for two numbers: overlap = GCF, everything = LCM.
  V.vennFactors = function (a, b) {
    var A = primeList(a), B = primeList(b), common = [], onlyA = A.slice(), onlyB = B.slice();
    A.forEach(function (p) { var i = onlyB.indexOf(p); if (i >= 0) { onlyB.splice(i, 1); common.push(p); onlyA.splice(onlyA.indexOf(p), 1); } });
    function col(list, cx) {
      var t = '', y0 = 96 - (list.length - 1) * 10;
      list.forEach(function (p, i) { t += text(cx, y0 + i * 20 + 5, String(p), 'me-tx me-bold'); });
      return t;
    }
    var g = '<circle class="me-vfa" cx="110" cy="96" r="76"/><circle class="me-vfb" cx="210" cy="96" r="76"/>';
    g += '<circle class="me-vsa" cx="110" cy="96" r="76"/><circle class="me-vsb" cx="210" cy="96" r="76"/>';
    g += text(72, 18, String(a), 'me-tx me-bold') + text(248, 18, String(b), 'me-tx me-bold');
    g += col(onlyA, 68) + col(common, 160) + col(onlyB, 252);
    var gc = common.reduce(function (x, y) { return x * y; }, 1), lc = a / gc * b;
    return fig(svg(320, 184, 'Venn diagram of prime factors of ' + a + ' and ' + b, g), 'GCF = ' + gc + ' (overlap). LCM = ' + lc + ' (all primes in the diagram).');
  };

  var CYCLES = { 0: [0], 1: [1], 2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 4: [4, 6], 5: [5], 6: [6], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6], 9: [9, 1] };

  // Units digit cycle drawn as a loop of digits with arrows.
  V.cycleWheel = function (d) {
    d = ((Math.round(d) % 10) + 10) % 10;
    var cyc = CYCLES[d], L = cyc.length, cx = 110, cy = 84, R = 52, id = 'me-ar' + (++uid), pts = [], g = '';
    g += '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="me-ar" d="M0 0 L10 5 L0 10 z"/></marker></defs>';
    if (L === 1) {
      g += '<circle class="me-fb" cx="' + cx + '" cy="' + cy + '" r="20"/>' + text(cx, cy + 6, String(cyc[0]), 'me-tx me-bold me-on');
      g += '<path class="me-ln me-thick" fill="none" d="M ' + (cx - 10) + ' ' + (cy - 20) + ' C ' + (cx - 30) + ' ' + (cy - 60) + ', ' + (cx + 30) + ' ' + (cy - 60) + ', ' + (cx + 10) + ' ' + (cy - 21) + '" marker-end="url(#' + id + ')"/>';
    } else {
      for (var i = 0; i < L; i++) { var ang = -Math.PI / 2 + i * 2 * Math.PI / L; pts.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]); }
      for (var j = 0; j < L; j++) {
        var p = pts[j], q = pts[(j + 1) % L], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
        var sx = p[0] + ux * 19, sy = p[1] + uy * 19, ex = q[0] - ux * 21, ey = q[1] - uy * 21;
        var nx = uy, ny = -ux, mx = (sx + ex) / 2, my = (sy + ey) / 2;
        if (L > 2 && (nx * (mx - cx) + ny * (my - cy)) < 0) { nx = -nx; ny = -ny; }
        var bend = L > 2 ? 14 : 26;
        g += '<path class="me-ln me-thick" fill="none" d="M ' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q ' + (mx + nx * bend).toFixed(1) + ' ' + (my + ny * bend).toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '" marker-end="url(#' + id + ')"/>';
      }
      pts.forEach(function (pt, k) { g += '<circle class="' + (k === 0 ? 'me-fb' : 'me-fa') + '" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="17"/>' + text(pt[0], pt[1] + 6, String(cyc[k]), 'me-tx me-bold' + (k === 0 ? ' me-on' : '')); });
    }
    g += text(250, 80, 'Powers of ' + d, 'me-tx me-bold', 'start') + text(250, 102, 'Cycle length ' + L, 'me-tx', 'start');
    return fig(svg(360, 168, 'Units digit cycle for powers of numbers ending in ' + d, g));
  };

  // Table of powers of a base, showing the sign pattern. Pure CSS grid.
  V.powerTable = function (base) {
    base = Math.round(base) || -2;
    var h = '<div class="me-grid me-pt">';
    for (var e = 1; e <= 6; e++) {
      var v = Math.pow(base, e);
      h += '<div class="me-cell ' + (v < 0 ? 'me-neg' : 'me-pos') + '"><span class="me-cap">(' + (base < 0 ? MINUS + Math.abs(base) : base) + ')<sup>' + e + '</sup></span><b>' + fmt(v) + '</b></div>';
    }
    return fig(h + '</div>', 'Even powers of a negative base are positive. Odd powers are negative.');
  };

  // Fraction bar: d equal parts, n shaded.
  V.fractionBar = function (n, d) {
    n = Math.round(n); d = Math.max(1, Math.round(d));
    var w = 300, cw = w / d, g = '';
    for (var i = 0; i < d; i++) g += '<rect class="' + (i < n ? 'me-fb' : 'me-fa') + '" x="' + (10 + i * cw).toFixed(1) + '" y="10" width="' + (cw - 3).toFixed(1) + '" height="34" rx="4"/>';
    g += text(160, 70, n + ' of ' + d + ' equal parts', 'me-tx me-bold');
    return fig(svg(320, 84, n + ' of ' + d + ' parts shaded', g));
  };

  // Divisibility rules as a CSS frame.
  V.divisibilityTable = function () {
    var rows = [['3', 'The digit sum is divisible by 3.'], ['4', 'The last two digits form a number divisible by 4.'], ['6', 'Divisible by both 2 and 3.'],
      ['8', 'The last three digits form a number divisible by 8.'], ['9', 'The digit sum is divisible by 9.'], ['11', 'Alternating digit sum (add, subtract, add, ...) is divisible by 11.']];
    return fig('<div class="me-rules">' + rows.map(function (r) { return '<div class="me-rule"><b>' + r[0] + '</b><span>' + esc(r[1]) + '</span></div>'; }).join('') + '</div>');
  };

  /* ================================================================
     5. Styles injected once (uses the app's CSS variables when present)
  ================================================================ */
  var CSS = [
    '.me-svg{max-width:100%;height:auto;display:block;margin:0 auto}',
    '.me-fig{margin:16px 0;text-align:center}.me-fig figcaption{font-size:14px;color:var(--muted,#4B5872);margin-top:6px}',
    '.me-fa{fill:var(--surface2,#EEE7D6);stroke:var(--line,#D6CEB8);stroke-width:1}',
    '.me-fb{fill:var(--accent,#2450E0)}.me-fc{fill:var(--line,#D6CEB8);stroke:var(--line,#D6CEB8)}',
    '.me-ring{fill:var(--surface,#fff);stroke:var(--ink,#14213D);stroke-width:2}',
    '.me-ln{stroke:var(--ink,#14213D);stroke-width:1.2;fill:none}.me-thick{stroke-width:2.2}',
    '.me-tx{fill:var(--ink,#14213D);font:600 14px Figtree,system-ui,sans-serif}.me-bold{font-weight:800;font-size:15px}',
    '.me-on{fill:var(--accent-ink,#fff)}.me-ar{fill:var(--ink,#14213D)}',
    '.me-vfa,.me-vfb{fill:var(--accent,#2450E0);fill-opacity:.22}.me-vsa,.me-vsb{fill:none;stroke:var(--ink,#14213D);stroke-width:2}',
    '.me-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .15em;line-height:1.15;font-size:.92em}',
    '.me-frac .me-n{padding:0 .25em;border-bottom:.09em solid currentColor}.me-frac .me-d{padding:0 .25em}',
    '.me-rad{white-space:nowrap}.me-vin{border-top:.09em solid currentColor;padding:0 .12em}.me-idx{font-size:.6em;vertical-align:super;margin-right:-.2em}',
    '.me-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px}',
    '.me-cell{display:flex;flex-direction:column;gap:4px;padding:10px;border-radius:12px;border:2px solid var(--line,#D6CEB8);background:var(--surface,#fff);text-align:center}',
    '.me-cell b{font-size:1.25em}.me-cap{font-size:.85em;color:var(--muted,#4B5872)}',
    '.me-neg{border-color:var(--warn,#8A5A00)}.me-pos{border-color:var(--ok,#0B7A53)}',
    '.me-rules{display:flex;flex-direction:column;gap:8px;text-align:left}',
    '.me-rule{display:flex;gap:14px;align-items:center;padding:10px 14px;border-radius:12px;background:var(--surface2,#EEE7D6)}',
    '.me-rule b{min-width:36px;height:36px;border-radius:10px;background:var(--accent,#2450E0);color:var(--accent-ink,#fff);display:flex;align-items:center;justify-content:center}',
    '.me-lesson h2,.me-lesson h3{font-family:"Bricolage Grotesque",Figtree,system-ui,sans-serif;margin:22px 0 8px}',
    '.me-lesson blockquote{margin:14px 0;padding:14px 16px;border-radius:12px;background:var(--surface2,#EEE7D6);border:2px solid var(--accent,#2450E0)}',
    '.me-worked,.me-qcard{margin:16px 0;padding:16px 18px;border-radius:16px;border:2px solid var(--line,#D6CEB8);background:var(--surface,#fff)}',
    '.me-q{font-size:1.15em;line-height:1.7}.me-steps{margin:10px 0 0;padding-left:1.4em;line-height:1.6}',
    '.me-ans{margin-top:10px;font-weight:800;color:var(--ok,#0B7A53)}',
    '.me-opts{list-style:upper-alpha;margin:10px 0 0;padding-left:1.6em;line-height:1.9}',
    '.me-tag{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:99px;background:var(--surface2,#EEE7D6);color:var(--muted,#4B5872);margin-bottom:6px}'
  ].join('\n');

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('me-styles')) return;
    var el = document.createElement('style'); el.id = 'me-styles'; el.textContent = CSS;
    (document.head || document.documentElement).appendChild(el);
  }

  /* ================================================================
     6. Generator spec helpers
        Every generator returns a spec:
        { q, steps[], ans, kind:'int'|'frac'|'text', value, wrong?, options?, check?, visual? }
        `check` is an independent calculation used by MathEngine.selfTest().
  ================================================================ */
  function I(q, steps, value, extra) { return Object.assign({ q: q, steps: steps, ans: fmt(value), kind: 'int', value: value }, extra || {}); }
  function FR(q, steps, f, extra) { return Object.assign({ q: q, steps: steps, ans: fstr(f), kind: 'frac', value: f }, extra || {}); }
  function TX(q, steps, ans, extra) { return Object.assign({ q: q, steps: steps, ans: ans, kind: 'text' }, extra || {}); }
  function distinctPair(r, lo, hi) { var a = r.int(lo, hi), b = r.int(lo, hi); while (b === a) b = r.int(lo, hi); return [a, b]; }

  /* ================================================================
     7. MODULE 1 GENERATORS
  ================================================================ */

  // ---------- m1t0: Perfect squares, cubes and roots ----------
  var G0 = { 1: [], 2: [], 3: [] };

  G0[1].push(function (r) { // square of a two digit number
    var n = r.int(12, 31), t = Math.floor(n / 10) * 10, u = n % 10;
    var steps = u === 0 ? [n + ' × ' + n + ' = ' + n * n + '.'] : [
      'Split ' + n + ' as ' + t + ' + ' + u + ', so ' + n + '^{2} = (' + t + ' + ' + u + ')^{2}.',
      'Expand: ' + t * t + ' + 2 × ' + t + ' × ' + u + ' + ' + u * u + ' = ' + t * t + ' + ' + 2 * t * u + ' + ' + u * u + '.',
      n + '^{2} = ' + n * n + '.'];
    return I('What is ' + n + '^{2}?', steps, n * n, { check: n * n, visual: n <= 15 ? V.squareGrid(n) : '' });
  });
  G0[1].push(function (r) { // cube
    var n = r.int(3, 12);
    return I('What is ' + n + '^{3}?', [n + ' × ' + n + ' = ' + n * n + '.', n * n + ' × ' + n + ' = ' + n * n * n + '.'], n * n * n, { check: n * n * n });
  });
  G0[1].push(function (r) { // square root
    var k = r.int(12, 31), n = k * k, lo = Math.floor(k / 10) * 10, hi = lo + 10;
    var cands = []; for (var x = lo + 1; x < hi; x++) if ((x * x) % 10 === n % 10) cands.push(x);
    return I('Find √{' + n + '}.', [
      lo + '^{2} = ' + lo * lo + ' and ' + hi + '^{2} = ' + hi * hi + ', so the root is between ' + lo + ' and ' + hi + '.',
      n + ' ends in ' + n % 10 + ', so the root can only be ' + cands.join(' or ') + '.',
      'Check: ' + k + ' × ' + k + ' = ' + n + '. So √{' + n + '} = ' + k + '.'], k, { check: Math.round(Math.sqrt(n)) });
  });
  G0[1].push(function (r) { // cube root
    var k = r.int(3, 10), n = k * k * k;
    return I('Find ∛{' + n + '}.', ['Cubes to remember: 8, 27, 64, 125, 216, 343, 512, 729, 1000.', k + ' × ' + k + ' × ' + k + ' = ' + n + ', so ∛{' + n + '} = ' + k + '.'], k, { check: Math.round(Math.cbrt(n)) });
  });

  G0[2].push(function (r) { // mixed expression with roots
    var a = r.int(8, 20), b = r.int(2, 9), c = r.int(2, 6), d = r.int(2, 9), val = a + b * c - d * d;
    return I('Evaluate √{' + a * a + '} + ∛{' + b * b * b + '} × ' + c + ' ' + MINUS + ' ' + d + '^{2}.', [
      'Roots and powers first: √{' + a * a + '} = ' + a + ', ∛{' + b * b * b + '} = ' + b + ', ' + d + '^{2} = ' + d * d + '.',
      'Multiply before adding: ' + b + ' × ' + c + ' = ' + b * c + '.',
      a + ' + ' + b * c + ' ' + MINUS + ' ' + d * d + ' = ' + fmt(val) + '.'], val, { check: Math.sqrt(a * a) + Math.cbrt(b * b * b) * c - d * d });
  });
  G0[2].push(function (r) { // smallest k so k*n is a perfect square
    var s = r.int(2, 9), m = r.pick([2, 3, 5, 6, 7, 10, 11, 13]), n = s * s * m, k = 0;
    for (var t = 1; t < 200; t++) { var q = isqrt(t * n); if (q * q === t * n) { k = t; break; } }
    return I('What is the smallest positive integer k so that k × ' + n + ' is a perfect square?', [
      'Factor: ' + n + ' = ' + factorStr(n) + '.',
      'A perfect square has every prime to an even power. The primes with an odd power are the ones that need help.',
      'Multiply by those primes once: k = ' + m + '. Then ' + m + ' × ' + n + ' = ' + m * n + ' = ' + Math.sqrt(m * n) + '^{2}.'], m, { check: k });
  });
  G0[2].push(function (r) { // smallest k so k*n is a perfect cube
    var c = r.int(2, 5), p = r.pick([2, 3, 5, 7]), e = r.pick([1, 2]), n = c * c * c * pow(p, e), k = 0;
    for (var t = 1; t < 1000; t++) { var q = Math.round(Math.cbrt(t * n)); if (q * q * q === t * n) { k = t; break; } }
    var need = pow(p, 3 - e);
    return I('What is the smallest positive integer k so that k × ' + n + ' is a perfect cube?', [
      'Factor: ' + n + ' = ' + factorStr(n) + '.',
      'A perfect cube has every prime to a power that is a multiple of 3.',
      'The prime ' + p + ' is off by ' + (3 - e) + ' step(s), so k = ' + p + '^{' + (3 - e) + '} = ' + need + '.'], need, { check: k });
  });
  G0[2].push(function (r) { // equation with a root
    if (r.chance()) {
      var b = r.int(4, 15), a = r.int(3, 40), x = b * b - a;
      return I('If √{x + ' + a + '} = ' + b + ', what is x?', ['Square both sides: x + ' + a + ' = ' + b + '^{2} = ' + b * b + '.', 'x = ' + b * b + ' ' + MINUS + ' ' + a + ' = ' + x + '.'], x, { check: b * b - a });
    }
    var b3 = r.int(2, 6), cb = b3 * b3 * b3, a3 = r.int(1, cb - 2); if ((cb - a3) % 2) a3++;
    var x3 = (cb - a3) / 2;
    return I('If ∛{2x + ' + a3 + '} = ' + b3 + ', what is x?', ['Cube both sides: 2x + ' + a3 + ' = ' + b3 + '^{3} = ' + cb + '.', '2x = ' + cb + ' ' + MINUS + ' ' + a3 + ' = ' + (cb - a3) + ', so x = ' + x3 + '.'], x3, { check: (cb - a3) / 2 });
  });
  G0[2].push(function (r) { // difference of squares
    var s = r.int(8, 30), t = r.int(2, s - 2); if ((s - t) % 2) t--; if (t < 2) t = 2; if ((s - t) % 2) t++;
    var P = s * t;
    return I('Two numbers x and y satisfy x^{2} ' + MINUS + ' y^{2} = ' + P + ' and x + y = ' + s + '. What is x ' + MINUS + ' y?', [
      'Use x^{2} ' + MINUS + ' y^{2} = (x ' + MINUS + ' y)(x + y).', 'So (x ' + MINUS + ' y) × ' + s + ' = ' + P + '.', 'x ' + MINUS + ' y = ' + P + ' ÷ ' + s + ' = ' + t + '.'], t, { check: P / s });
  });
  G0[2].push(function (r) { // consecutive squares
    var k = r.int(5, 20), S = k * k + (k + 1) * (k + 1);
    return I('The squares of two consecutive positive integers add to ' + S + '. What is the larger integer?', [
      'Let the integers be n and n + 1: n^{2} + (n + 1)^{2} = ' + S + '.',
      'Expand: 2n^{2} + 2n + 1 = ' + S + ', so n^{2} + n = ' + (S - 1) / 2 + '.',
      'Now n(n + 1) = ' + k * (k + 1) + ' means n = ' + k + '. The larger integer is ' + (k + 1) + '.'], k + 1, { check: (function () { for (var n = 1; n < 100; n++) if (n * n + (n + 1) * (n + 1) === S) return n + 1; })() });
  });

  G0[3].push(function (r) { // both a square and a cube
    var m = r.int(2, 6), lo = pow(m, 6), hi = pow(m + 1, 6), N = lo + r.int(1, hi - lo), cnt = 0;
    for (var k = 1; pow(k, 6) < N; k++) cnt++;
    return I('How many positive integers less than ' + fmt(N) + ' are both perfect squares and perfect cubes?', [
      'A number that is a square and a cube must be a perfect sixth power, k^{6}.',
      'List them: ' + [1, 2, 3, 4, 5, 6, 7].map(function (k) { return k + '^{6} = ' + fmt(pow(k, 6)); }).slice(0, m + 1).join(', ') + '.',
      'The ones below ' + fmt(N) + ' are k = 1 to ' + m + '. That is ' + m + ' numbers.'], m, { check: cnt });
  });
  G0[3].push(function (r) { // squares in a range
    var A = r.int(100, 900), B = A + r.int(200, 1600), lo = Math.ceil(Math.sqrt(A)), hi = isqrt(B), c = 0;
    for (var x = A; x <= B; x++) { var q = isqrt(x); if (q * q === x) c++; }
    return I('How many perfect squares are there from ' + A + ' to ' + B + ', including both ends?', [
      'Find the smallest square that is at least ' + A + ': ' + (lo - 1) + '^{2} = ' + (lo - 1) * (lo - 1) + ' is too small, ' + lo + '^{2} = ' + lo * lo + ' works.',
      'Find the largest square at most ' + B + ': ' + hi + '^{2} = ' + hi * hi + ' and ' + (hi + 1) + '^{2} = ' + (hi + 1) * (hi + 1) + ' is too big.',
      'The roots run from ' + lo + ' to ' + hi + ', which is ' + hi + ' ' + MINUS + ' ' + lo + ' + 1 = ' + (hi - lo + 1) + ' squares.'], hi - lo + 1, { check: c });
  });
  G0[3].push(function (r) { // smallest k making a*k a sixth power
    var a1, b1, p, q, k;
    for (;;) {
      var pq = r.pick([[2, 3], [2, 5], [3, 5]]); p = pq[0]; q = pq[1]; a1 = r.int(1, 5); b1 = r.int(1, 5);
      k = pow(p, 6 - a1) * pow(q, 6 - b1); if (k <= 100000) break;
    }
    var n = pow(p, a1) * pow(q, b1), found = false;
    var chk = (function () { var kk = 1; for (var i = 0; i < 6 - a1; i++) kk *= p; for (var j = 0; j < 6 - b1; j++) kk *= q; return kk; })();
    return I('What is the smallest positive integer k so that k × ' + fmt(n) + ' is both a perfect square and a perfect cube?', [
      'Factor: ' + fmt(n) + ' = ' + p + '^{' + a1 + '} × ' + q + '^{' + b1 + '}.',
      'Both a square and a cube means every exponent is a multiple of 6. The next multiple of 6 is 6 itself.',
      'k = ' + p + '^{' + (6 - a1) + '} × ' + q + '^{' + (6 - b1) + '} = ' + fmt(k) + '.'], k, { check: chk });
  });
  G0[3].push(function (r) { // sum of consecutive odd numbers
    var a = r.int(3, 12), b = a + r.int(6, 20), first = 2 * a + 1, last = 2 * b - 1, s = 0;
    for (var o = first; o <= last; o += 2) s += o;
    return I('Find the sum ' + first + ' + ' + (first + 2) + ' + ' + (first + 4) + ' + ⋯ + ' + last + ', where every odd number from ' + first + ' to ' + last + ' is added.', [
      'The sum of the first n odd numbers is n^{2}.',
      'Odd numbers up to ' + last + ' are the first ' + b + ' odd numbers, so their sum is ' + b + '^{2} = ' + b * b + '.',
      'Remove the odd numbers below ' + first + ' (the first ' + a + '): ' + a + '^{2} = ' + a * a + '.',
      b * b + ' ' + MINUS + ' ' + a * a + ' = ' + fmt(b * b - a * a) + '.'], b * b - a * a, { check: s });
  });

  // ---------- m1t1: Negative bases and nested fractions ----------
  var G1 = { 1: [], 2: [], 3: [] };

  G1[1].push(function (r) { // bracket versus no bracket
    var a = r.int(2, 7), n = r.int(2, a >= 5 ? 3 : 5), bracket = r.chance();
    var val = bracket ? Math.pow(-a, n) : -Math.pow(a, n);
    var steps = bracket ? ['The bracket makes ' + MINUS + a + ' the base, so multiply ' + MINUS + a + ' by itself ' + n + ' times.',
      (n % 2 === 0 ? 'An even number of negatives gives a positive.' : 'An odd number of negatives gives a negative.') + ' ' + a + '^{' + n + '} = ' + pow(a, n) + '.', 'Answer: ' + fmt(val) + '.'] :
      ['With no bracket the base is just ' + a + '. Find ' + a + '^{' + n + '} = ' + pow(a, n) + ' first.', 'Then apply the minus sign: ' + fmt(val) + '.'];
    return I('Evaluate ' + (bracket ? '(' + MINUS + a + ')' : MINUS + a) + '^{' + n + '}.', steps, val, { check: bracket ? Math.pow(-a, n) : -Math.pow(a, n), visual: '' });
  });
  G1[1].push(function (r) { // two fractions
    var b = r.int(2, 12), d = r.int(2, 12), a = r.int(1, b - 1 || 1), c = r.int(1, d - 1 || 1), op = r.pick(['+', MINUS, '×', '÷']);
    if (b === d && (op === '+' || op === MINUS)) d = b + 1;
    var A = F(a, b), C = F(c, d), res, steps;
    if (op === '+') { res = fadd(A, C); steps = ['Common denominator ' + lcm(b, d) + ': ' + fr(a * lcm(b, d) / b, lcm(b, d)) + ' + ' + fr(c * lcm(b, d) / d, lcm(b, d)) + '.', 'Add the numerators and reduce: ' + fmk(res) + '.']; }
    else if (op === MINUS) { res = fsub(A, C); steps = ['Common denominator ' + lcm(b, d) + ': ' + fr(a * lcm(b, d) / b, lcm(b, d)) + ' ' + MINUS + ' ' + fr(c * lcm(b, d) / d, lcm(b, d)) + '.', 'Subtract the numerators and reduce: ' + fmk(res) + '.']; }
    else if (op === '×') { res = fmul(A, C); steps = ['Multiply across: ' + fr(a * c, b * d) + '.', 'Reduce: ' + fmk(res) + '.']; }
    else { res = fdiv(A, C); steps = ['Dividing is multiplying by the flipped fraction: ' + fr(a, b) + ' × ' + fr(d, c) + '.', 'Multiply and reduce: ' + fmk(res) + '.']; }
    return FR('Calculate ' + fr(a, b) + ' ' + op + ' ' + fr(c, d) + '. Give the answer in lowest terms.', steps, res, { check: op === '+' ? (a * d + c * b) / (b * d) : op === MINUS ? (a * d - c * b) / (b * d) : op === '×' ? (a * c) / (b * d) : (a * d) / (b * c) });
  });
  G1[1].push(function (r) { // complex fraction
    var b = r.int(2, 9), d = r.int(2, 9), a = r.int(1, b), c = r.int(1, d), res = fdiv(F(a, b), F(c, d));
    return FR('Simplify {{' + fr(a, b) + '|' + fr(c, d) + '}} to lowest terms.', ['The big fraction bar means divide: ' + fr(a, b) + ' ÷ ' + fr(c, d) + '.', 'Flip and multiply: ' + fr(a, b) + ' × ' + fr(d, c) + ' = ' + fr(a * d, b * c) + '.', 'Reduce: ' + fmk(res) + '.'], res, { check: (a * d) / (b * c) });
  });

  G1[2].push(function (r) { // continued fraction, worked inside out
    var a = r.int(1, 3), b = r.int(1, 4), c = r.int(1, 4), d = r.int(1, 5), e = r.int(2, 6);
    var s1 = F(d, e), s2 = fadd(F(c, 1), s1), s3 = fdiv(F(b, 1), s2), s4 = fadd(F(a, 1), s3);
    return FR('Simplify ' + a + ' + ' + fr(b, c + ' + ' + fr(d, e)) + '.', [
      'Start with the deepest fraction: ' + fr(d, e) + '.',
      'Then ' + c + ' + ' + fr(d, e) + ' = ' + fmk(s2) + '.',
      'Then ' + b + ' ÷ ' + fmk(s2) + ' = ' + fmk(s3) + '.',
      'Finally ' + a + ' + ' + fmk(s3) + ' = ' + fmk(s4) + '.'], s4, { check: a + b / (c + d / e) });
  });
  G1[2].push(function (r) { // powers of negative fractions
    var a = r.int(1, 5), b = r.int(2, 6), c = r.int(1, 5), d = r.int(2, 6), p = r.int(2, 3), q = r.int(2, 3);
    var top = fpow(F(-a, b), p), bot = fpow(F(-c, d), q), res = fdiv(top, bot);
    return FR('Calculate (' + MINUS + fr(a, b) + ')^{' + p + '} ÷ (' + MINUS + fr(c, d) + ')^{' + q + '}. Give the answer in lowest terms.', [
      'Signs first: the first power is ' + (p % 2 ? 'negative' : 'positive') + ' and the second is ' + (q % 2 ? 'negative' : 'positive') + '.',
      'Powers: (' + fr(a, b) + ')^{' + p + '} = ' + fr(pow(a, p), pow(b, p)) + ' and (' + fr(c, d) + ')^{' + q + '} = ' + fr(pow(c, q), pow(d, q)) + '.',
      'Divide with the signs applied: ' + fmk(top) + ' ÷ ' + fmk(bot) + ' = ' + fmk(res) + '.'], res, { check: (Math.pow(-a / b, p)) / (Math.pow(-c / d, q)) });
  });
  G1[2].push(function (r) { // fraction with fraction sums on top and bottom
    var b = r.int(2, 6), d = r.int(2, 6), f = r.int(2, 6), h = r.int(2, 6), a = r.int(1, b), c = r.int(1, d), e = r.int(1, f), g = r.int(1, h);
    var lo = F(g, h), hi = F(e, f); if (fval(hi) <= fval(lo)) { var t = e; e = g; g = t; t = f; f = h; h = t; }
    var top = fadd(F(a, b), F(c, d)), bot = fsub(F(e, f), F(g, h)); if (bot.n === 0) { e += f; bot = fsub(F(e, f), F(g, h)); }
    var res = fdiv(top, bot);
    return FR('Simplify {{' + fr(a, b) + ' + ' + fr(c, d) + '|' + fr(e, f) + ' ' + MINUS + ' ' + fr(g, h) + '}} to lowest terms.', [
      'Top: ' + fr(a, b) + ' + ' + fr(c, d) + ' = ' + fmk(top) + '.', 'Bottom: ' + fr(e, f) + ' ' + MINUS + ' ' + fr(g, h) + ' = ' + fmk(bot) + '.',
      'Divide: ' + fmk(top) + ' ÷ ' + fmk(bot) + ' = ' + fmk(res) + '.'], res, { check: (a / b + c / d) / (e / f - g / h) });
  });

  G1[3].push(function (r) { // telescoping product
    var a = r.int(3, 6), n = r.int(30, 99), res = F(a - 1, n);
    return FR('Find the value of (1 ' + MINUS + ' ' + fr(1, a) + ')(1 ' + MINUS + ' ' + fr(1, a + 1) + ')(1 ' + MINUS + ' ' + fr(1, a + 2) + ') ⋯ (1 ' + MINUS + ' ' + fr(1, n) + '). Give the answer in lowest terms.', [
      'Rewrite each bracket: 1 ' + MINUS + ' ' + fr(1, 'k') + ' = ' + fr('k ' + MINUS + ' 1', 'k') + '.',
      'The product becomes ' + fr(a - 1, a) + ' × ' + fr(a, a + 1) + ' × ' + fr(a + 1, a + 2) + ' ⋯ ' + fr(n - 1, n) + '.',
      'Each numerator cancels the denominator before it. Only ' + (a - 1) + ' on top and ' + n + ' on the bottom survive.',
      'Answer: ' + fmk(res) + '.'], res, { check: (function () { var p = 1; for (var k = a; k <= n; k++) p *= (1 - 1 / k); return p; })() });
  });
  G1[3].push(function (r) { // telescoping sum
    var m = r.int(1, 4), n = m + r.int(8, 40), res = F(n + 1 - m, m * (n + 1));
    return FR('Find the value of ' + fr(1, m + ' × ' + (m + 1)) + ' + ' + fr(1, (m + 1) + ' × ' + (m + 2)) + ' + ' + fr(1, (m + 2) + ' × ' + (m + 3)) + ' + ⋯ + ' + fr(1, n + ' × ' + (n + 1)) + '. Give the answer in lowest terms.', [
      'Split each term: ' + fr(1, 'k × (k + 1)') + ' = ' + fr(1, 'k') + ' ' + MINUS + ' ' + fr(1, 'k + 1') + '.',
      'The sum becomes (' + fr(1, m) + ' ' + MINUS + ' ' + fr(1, m + 1) + ') + (' + fr(1, m + 1) + ' ' + MINUS + ' ' + fr(1, m + 2) + ') + ⋯ + (' + fr(1, n) + ' ' + MINUS + ' ' + fr(1, n + 1) + ').',
      'Middle terms cancel in pairs. Left: ' + fr(1, m) + ' ' + MINUS + ' ' + fr(1, n + 1) + '.',
      'Answer: ' + fmk(res) + '.'], res, { check: (function () { var s = 0; for (var k = m; k <= n; k++) s += 1 / (k * (k + 1)); return s; })() });
  });
  G1[3].push(function (r) { // alternating sum
    var a = r.int(2, 20), p = r.int(10, 60), odd = r.chance(), terms = odd ? 2 * p + 1 : 2 * p, last = a + terms - 1, s = 0;
    for (var i = 0; i < terms; i++) s += (i % 2 === 0 ? 1 : -1) * (a + i);
    var tail = odd ? '(' + (last - 2) + ') ' + MINUS + ' (' + (last - 1) + ') + ' + last : (last - 2) + ' ' + MINUS + ' ' + last;
    var head = a + ' ' + MINUS + ' ' + (a + 1) + ' + ' + (a + 2) + ' ' + MINUS + ' ' + (a + 3) + ' + ⋯ + ';
    var res = odd ? -p + last : -p;
    return I('Find the value of ' + head + (odd ? tail : (last - 1) + ' ' + MINUS + ' ' + last) + '.', [
      'There are ' + terms + ' terms, added and subtracted in turn.',
      'Pair them up: each pair is ' + a + ' ' + MINUS + ' ' + (a + 1) + ' = ' + MINUS + '1, and so on for every pair.',
      'There are ' + p + ' pairs giving ' + MINUS + p + (odd ? ', and one extra term ' + last + ' at the end.' : '.'),
      'Answer: ' + fmt(res) + '.'], res, { check: s });
  });

  // ---------- m1t2: Divisibility and prime factorization ----------
  var G2 = { 1: [], 2: [], 3: [] };
  var PRIMES = [2, 3, 5, 7, 11, 13];

  G2[1].push(function (r) { // divisibility test, Yes or No
    var d = r.pick([3, 4, 6, 8, 9, 11]), N;
    if (r.chance()) N = d * r.int(Math.ceil(1000 / d), Math.floor(99999 / d)); else { N = d * r.int(Math.ceil(1000 / d), Math.floor(99999 / d)) + r.int(1, d - 1); }
    var s = String(N), yes = N % d === 0, step;
    if (d === 3 || d === 9) step = 'Digit sum: ' + s.split('').join(' + ') + ' = ' + digitSum(N) + '. ' + digitSum(N) + (digitSum(N) % d === 0 ? ' is' : ' is not') + ' divisible by ' + d + '.';
    else if (d === 4) step = 'Last two digits: ' + s.slice(-2) + '. ' + (+s.slice(-2)) + (+s.slice(-2) % 4 === 0 ? ' is' : ' is not') + ' divisible by 4.';
    else if (d === 8) step = 'Last three digits: ' + s.slice(-3) + '. ' + (+s.slice(-3)) + (+s.slice(-3) % 8 === 0 ? ' is' : ' is not') + ' divisible by 8.';
    else if (d === 6) step = 'Need even and digit sum divisible by 3. Last digit ' + s.slice(-1) + ', digit sum ' + digitSum(N) + '.';
    else { var alt = 0; s.split('').reverse().forEach(function (c, i) { alt += (i % 2 ? -1 : 1) * (+c); }); step = 'Alternating sum from the right: ' + alt + '. ' + (alt % 11 === 0 ? 'That is' : 'That is not') + ' a multiple of 11.'; }
    return TX('Is ' + fmt(N) + ' divisible by ' + d + '?', [step, 'Answer: ' + (yes ? 'Yes' : 'No') + '.'], yes ? 'Yes' : 'No', { options: ['Yes', 'No'], check: yes ? 'Yes' : 'No' });
  });
  G2[1].push(function (r) { // largest prime factor
    var ps = [r.pick(PRIMES), r.pick(PRIMES), r.pick(PRIMES.slice(2))], N = ps[0] * ps[1] * ps[2] * r.pick([1, 2, 3, 4]), f = factorize(N), big = f[f.length - 1][0];
    return I('What is the largest prime factor of ' + N + '?', ['Factor: ' + N + ' = ' + factorStr(N) + '.', 'The largest prime in the list is ' + big + '.'], big, { check: primeList(N).reduce(function (a, b) { return Math.max(a, b); }, 0) });
  });
  G2[1].push(function (r) { // count prime factors with repeats
    var a = r.int(1, 4), b = r.int(0, 3), c = r.int(0, 2), N = pow(2, a) * pow(3, b) * pow(5, c) * r.pick([1, 7, 11]);
    return I('How many prime factors does ' + N + ' have when repeated primes are counted each time? (For example, 12 = 2 × 2 × 3 has 3.)', ['Factor: ' + N + ' = ' + factorStr(N) + '.', 'Add the exponents: ' + factorize(N).map(function (pe) { return pe[1]; }).join(' + ') + ' = ' + primeList(N).length + '.'], primeList(N).length, { check: primeList(N).length });
  });

  G2[2].push(function (r) { // missing digit
    var d = r.pick([9, 11]), digs, pos, hits, tries = 0;
    do {
      digs = []; for (var i = 0; i < 5; i++) digs.push(r.int(i === 0 ? 1 : 0, 9));
      pos = r.int(0, 4); hits = [];
      for (var x = 0; x <= 9; x++) { var t = digs.slice(); t[pos] = x; if (+t.join('') % d === 0) hits.push(x); }
    } while (hits.length !== 1 && ++tries < 500);
    var shown = digs.map(function (v, i) { return i === pos ? '□' : v; }).join(''), ans = hits[0];
    var step = d === 9 ? 'The digit sum must be a multiple of 9. The known digits add to ' + (digitSum(+digs.join('')) - digs[pos]) + ', so □ must make the total the next multiple of 9.' :
      'Alternating sum (add, subtract, add, ...) must be a multiple of 11. Solve for □ using the known digits.';
    return I('The digit □ makes the number ' + shown + ' divisible by ' + d + '. What is □?', [step, '□ = ' + ans + '. Check: ' + digs.map(function (v, i) { return i === pos ? ans : v; }).join('') + ' ÷ ' + d + ' = ' + (+digs.map(function (v, i) { return i === pos ? ans : v; }).join('') / d) + '.'], ans, { check: hits[0] });
  });
  G2[2].push(function (r) { // number of factors
    var a = r.int(1, 4), b = r.int(1, 3), c = r.int(0, 2), N = pow(2, a) * pow(3, b) * pow(5, c), fs = factorize(N);
    return I('How many positive factors does ' + fmt(N) + ' have?', ['Factor: ' + fmt(N) + ' = ' + factorStr(N) + '.', 'Add 1 to each exponent and multiply: ' + fs.map(function (pe) { return '(' + pe[1] + ' + 1)'; }).join(' × ') + ' = ' + fs.reduce(function (x, pe) { return x * (pe[1] + 1); }, 1) + '.'], fs.reduce(function (x, pe) { return x * (pe[1] + 1); }, 1), { check: countDivisors(N) });
  });
  G2[2].push(function (r) { // even factors
    var a = r.int(1, 4), b = r.int(1, 3), c = r.int(0, 2), N = pow(2, a) * pow(3, b) * pow(5, c), cnt = a * (b + 1) * (c + 1), chk = 0;
    for (var i = 1; i <= N; i++) if (N % i === 0 && i % 2 === 0) chk++;
    return I('How many of the positive factors of ' + fmt(N) + ' are even?', ['Factor: ' + fmt(N) + ' = ' + factorStr(N) + '.', 'An even factor needs at least one 2, so the power of 2 can be 1 to ' + a + ', which is ' + a + ' choices.', 'Other primes: ' + (b + 1) + ' choices for 3 and ' + (c + 1) + ' for 5. Multiply: ' + a + ' × ' + (b + 1) + ' × ' + (c + 1) + ' = ' + cnt + '.'], cnt, { check: chk });
  });
  G2[2].push(function (r) { // square factors
    var a = r.int(2, 6), b = r.int(1, 4), c = r.int(0, 2), N = pow(2, a) * pow(3, b) * pow(5, c), cnt = (Math.floor(a / 2) + 1) * (Math.floor(b / 2) + 1) * (Math.floor(c / 2) + 1), chk = 0;
    for (var i = 1; i * i <= N; i++) if (N % (i * i) === 0) chk++;
    return I('How many of the positive factors of ' + fmt(N) + ' are perfect squares?', ['Factor: ' + fmt(N) + ' = ' + factorStr(N) + '.', 'A square factor uses only even powers. Power of 2: 0 to ' + a + ' in even steps gives ' + (Math.floor(a / 2) + 1) + ' choices. Power of 3: ' + (Math.floor(b / 2) + 1) + ' choices. Power of 5: ' + (Math.floor(c / 2) + 1) + ' choices.', 'Multiply: ' + cnt + '.'], cnt, { check: chk });
  });

  G2[3].push(function (r) { // multiples of a or b but not both
    var p = distinctPair(r, 3, 12), a = p[0], b = p[1], N = r.int(100, 600), L = lcm(a, b), chk = 0;
    for (var i = 1; i <= N; i++) if ((i % a === 0) !== (i % b === 0)) chk++;
    var na = Math.floor(N / a), nb = Math.floor(N / b), nl = Math.floor(N / L);
    return I('How many integers from 1 to ' + N + ' are multiples of ' + a + ' or of ' + b + ', but not multiples of both?', [
      'Multiples of ' + a + ': ' + na + '. Multiples of ' + b + ': ' + nb + '.',
      'Multiples of both are multiples of lcm(' + a + ', ' + b + ') = ' + L + ': ' + nl + '.',
      'Adding ' + na + ' + ' + nb + ' counts the both group twice, and we want it zero times, so subtract it twice.',
      na + ' + ' + nb + ' ' + MINUS + ' 2 × ' + nl + ' = ' + (na + nb - 2 * nl) + '.'], na + nb - 2 * nl, { check: chk });
  });
  G2[3].push(function (r) { // factors that are multiples of m
    var a = r.int(2, 5), b = r.int(1, 4), c = r.int(1, 3), x = r.int(0, a), y = r.int(0, b), z = r.int(0, c);
    if (x + y + z === 0) x = 1;
    var N = pow(2, a) * pow(3, b) * pow(5, c), m = pow(2, x) * pow(3, y) * pow(5, z), cnt = (a - x + 1) * (b - y + 1) * (c - z + 1), chk = 0;
    for (var i = 1; i <= N; i++) if (N % i === 0 && i % m === 0) chk++;
    return I('How many positive factors of 2^{' + a + '} × 3^{' + b + '} × 5^{' + c + '} are multiples of ' + m + '?', [
      'Here ' + m + ' = 2^{' + x + '} × 3^{' + y + '} × 5^{' + z + '}. A multiple of ' + m + ' must contain at least those powers.',
      'Power of 2 can be ' + x + ' to ' + a + ': ' + (a - x + 1) + ' choices. Power of 3: ' + (b - y + 1) + ' choices. Power of 5: ' + (c - z + 1) + ' choices.',
      'Multiply: ' + (a - x + 1) + ' × ' + (b - y + 1) + ' × ' + (c - z + 1) + ' = ' + cnt + '.'], cnt, { check: chk });
  });
  G2[3].push(function (r) { // smallest number with exactly K factors
    var K = r.pick([6, 8, 9, 10, 12, 14, 15, 16, 18, 20]), ans = 0;
    for (var n = 1; ; n++) if (countDivisors(n) === K) { ans = n; break; }
    var table = { 6: '2^{2} × 3', 8: '2^{3} × 3', 9: '2^{2} × 3^{2}', 10: '2^{4} × 3', 12: '2^{2} × 3 × 5', 14: '2^{6} × 3', 15: '2^{4} × 3^{2}', 16: '2^{3} × 3 × 5', 18: '2^{2} × 3^{2} × 5', 20: '2^{3} × 3 × 5 × 1' };
    return I('What is the smallest positive integer with exactly ' + K + ' positive factors?', [
      'The factor count is the product of (exponent + 1) over the primes. Write ' + K + ' as a product to choose exponents.',
      'Give the biggest exponents to the smallest primes, since that keeps the number small.',
      'The best choice is ' + factorStr(ans) + ' = ' + ans + '.'], ans, { check: ans });
  });

  // ---------- m1t3: GCF and LCM applications ----------
  var G3 = { 1: [], 2: [], 3: [] };
  function coprimePair(r, lo, hi) { var a, b; do { a = r.int(lo, hi); b = r.int(lo, hi); } while (a === b || gcd(a, b) !== 1); return [a, b]; }

  G3[1].push(function (r) { // GCF of two
    var g = r.int(2, 15), m = coprimePair(r, 2, 12), a = g * m[0], b = g * m[1];
    return I('Find the GCF of ' + a + ' and ' + b + '.', [a + ' = ' + factorStr(a) + ' and ' + b + ' = ' + factorStr(b) + '.', 'Take each shared prime to its smaller power. The GCF is ' + g + '.'], g, { check: gcd(a, b) });
  });
  G3[1].push(function (r) { // LCM of two
    var g = r.int(2, 9), m = coprimePair(r, 2, 10), a = g * m[0], b = g * m[1], L = g * m[0] * m[1];
    return I('Find the LCM of ' + a + ' and ' + b + '.', [a + ' = ' + factorStr(a) + ' and ' + b + ' = ' + factorStr(b) + '.', 'Take every prime to its larger power. The LCM is ' + L + '.'], L, { check: lcm(a, b) });
  });
  G3[1].push(function (r) { // GCF of three
    var g = r.int(2, 12), m, tries = 0;
    do { m = [r.int(2, 9), r.int(2, 9), r.int(2, 9)]; } while ((gcd(gcd(m[0], m[1]), m[2]) !== 1 || m[0] === m[1] || m[1] === m[2] || m[0] === m[2]) && ++tries < 300);
    var n = m.map(function (x) { return x * g; });
    return I('Find the GCF of ' + n[0] + ', ' + n[1] + ' and ' + n[2] + '.', ['GCF of the first two: gcd(' + n[0] + ', ' + n[1] + ') = ' + gcd(n[0], n[1]) + '.', 'Then gcd(' + gcd(n[0], n[1]) + ', ' + n[2] + ') = ' + g + '.'], g, { check: gcd(gcd(n[0], n[1]), n[2]) });
  });
  G3[1].push(function (r) { // bus word problem
    var p = distinctPair(r, 4, 18), a = p[0], b = p[1], L = lcm(a, b);
    return I('Bus A leaves the station every ' + a + ' minutes and bus B leaves every ' + b + ' minutes. They leave together at 8:00. After how many minutes do they next leave together?', ['They leave together again at a common multiple of ' + a + ' and ' + b + '. We want the smallest, the LCM.', 'lcm(' + a + ', ' + b + ') = ' + L + ' minutes.'], L, { check: lcm(a, b) });
  });

  G3[2].push(function (r) { // find the other number from GCF and LCM
    var g = r.int(2, 9), m = coprimePair(r, 2, 9), a = g * m[0], b = g * m[1], L = g * m[0] * m[1];
    return I('Two positive integers have GCF ' + g + ' and LCM ' + L + '. One of them is ' + a + '. What is the other?', ['For two numbers, (number 1) × (number 2) = GCF × LCM.', a + ' × other = ' + g + ' × ' + L + ' = ' + g * L + '.', 'other = ' + g * L + ' ÷ ' + a + ' = ' + b + '.'], b, { check: b });
  });
  G3[2].push(function (r) { // smallest integer above r with remainder r
    var set, L, tries = 0;
    do { set = [r.int(4, 12), r.int(4, 12), r.int(4, 12)]; L = lcm(lcm(set[0], set[1]), set[2]); } while ((L > 400 || set[0] === set[1] || set[1] === set[2] || set[0] === set[2]) && ++tries < 500);
    var rem = r.int(1, Math.min.apply(null, set) - 1), ans = L + rem, chk = 0;
    for (var n = rem + 1; ; n++) if (set.every(function (x) { return n % x === rem; })) { chk = n; break; }
    return I('What is the smallest integer greater than ' + rem + ' that leaves a remainder of ' + rem + ' when divided by ' + set[0] + ', by ' + set[1] + ' and by ' + set[2] + '?', [
      'If n leaves remainder ' + rem + ' each time, then n ' + MINUS + ' ' + rem + ' is a multiple of ' + set[0] + ', ' + set[1] + ' and ' + set[2] + '.',
      'lcm(' + set[0] + ', ' + set[1] + ', ' + set[2] + ') = ' + L + '. The smallest positive multiple is ' + L + '.',
      'n = ' + L + ' + ' + rem + ' = ' + ans + '.'], ans, { check: chk });
  });
  G3[2].push(function (r) { // tiling a rectangle with squares
    var g = r.int(3, 12), m = coprimePair(r, 2, 9), w = g * m[0], h = g * m[1], cnt = m[0] * m[1];
    return I('A rectangle ' + w + ' cm by ' + h + ' cm is cut into identical squares with nothing left over. The squares are as large as possible. How many squares are there?', ['The side of the square must divide both ' + w + ' and ' + h + '. The largest is gcd(' + w + ', ' + h + ') = ' + gcd(w, h) + ' cm.', 'Across: ' + w + ' ÷ ' + gcd(w, h) + ' = ' + w / gcd(w, h) + ' squares. Down: ' + h + ' ÷ ' + gcd(w, h) + ' = ' + h / gcd(w, h) + ' squares.', 'Total: ' + w / gcd(w, h) + ' × ' + h / gcd(w, h) + ' = ' + cnt + '.'], cnt, { check: (w / gcd(w, h)) * (h / gcd(w, h)) });
  });
  G3[2].push(function (r) { // largest divisor giving same remainder
    var g = r.int(7, 20), rem = r.int(1, g - 2), m, tries = 0;
    do { m = [r.int(2, 9), r.int(2, 9), r.int(2, 9)]; } while ((gcd(gcd(m[0], m[1]), m[2]) !== 1 || m[0] === m[1] || m[1] === m[2] || m[0] === m[2]) && ++tries < 300);
    var X = m.map(function (x) { return g * x + rem; }), best = 0;
    for (var d = 2; d <= 400; d++) if (X.every(function (x) { return x % d === rem; })) best = d;
    return I('What is the largest integer that leaves a remainder of ' + rem + ' when it is divided into each of ' + X[0] + ', ' + X[1] + ' and ' + X[2] + '?', ['If d leaves remainder ' + rem + ', then d divides ' + X[0] + ' ' + MINUS + ' ' + rem + ' = ' + (X[0] - rem) + ', ' + (X[1] - rem) + ' and ' + (X[2] - rem) + '.', 'The largest such d is their GCF: ' + g + '.', 'Check that ' + g + ' is bigger than the remainder ' + rem + '. It is, so ' + g + ' works.'], g, { check: best });
  });

  G3[3].push(function (r) { // lights blinking together
    var set, L, tries = 0;
    do { set = [r.int(4, 20), r.int(4, 20), r.int(4, 20)]; L = lcm(lcm(set[0], set[1]), set[2]); } while ((L > 240 || set[0] === set[1] || set[1] === set[2] || set[0] === set[2]) && ++tries < 800);
    var T = L * r.int(4, 12) + r.int(0, L - 1), cnt = Math.floor(T / L) + 1, chk = 0;
    for (var t = 0; t <= T; t++) if (set.every(function (x) { return t % x === 0; })) chk++;
    return I('Three lights blink every ' + set[0] + ', ' + set[1] + ' and ' + set[2] + ' seconds. All three blink together at time 0. How many times do all three blink together from time 0 to time ' + T + ' seconds, counting time 0?', [
      'All three blink together when the time is a multiple of ' + set[0] + ', ' + set[1] + ' and ' + set[2] + '.',
      'lcm(' + set[0] + ', ' + set[1] + ', ' + set[2] + ') = ' + L + ', so they coincide at 0, ' + L + ', ' + 2 * L + ', ...',
      T + ' ÷ ' + L + ' = ' + Math.floor(T / L) + ' remainder ' + (T % L) + ', so there are ' + Math.floor(T / L) + ' coincidences after time 0.',
      'Counting time 0: ' + Math.floor(T / L) + ' + 1 = ' + cnt + '.'], cnt, { check: chk });
  });
  G3[3].push(function (r) { // ordered pairs with GCF g and given sum
    var mm = r.pick([8, 9, 10, 12, 14, 15, 18, 20]), g = r.int(2, 6), S = g * mm, cnt = 0, chk = 0;
    for (var u = 1; u < mm; u++) if (gcd(u, mm) === 1) cnt++;
    for (var x = g; x < S; x += g) if (gcd(x, S - x) === g) chk++;
    return I('How many ordered pairs (x, y) of positive integers have GCF ' + g + ' and satisfy x + y = ' + S + '?', [
      'Write x = ' + g + 'u and y = ' + g + 'v. Then u + v = ' + S + ' ÷ ' + g + ' = ' + mm + ', and u and v must share no common factor.',
      'gcd(u, v) = gcd(u, ' + mm + ' ' + MINUS + ' u) = gcd(u, ' + mm + '). So u must be coprime to ' + mm + '.',
      'Count u from 1 to ' + (mm - 1) + ' with no factor in common with ' + mm + ': there are ' + cnt + '.'], cnt, { check: chk });
  });
  G3[3].push(function (r) { // meshing gears
    var p = distinctPair(r, 8, 40), a = p[0], b = p[1], small = Math.min(a, b), L = lcm(a, b), ans = L / small, chk = 0;
    for (var t = 1; ; t++) if ((t * small) % a === 0 && (t * small) % b === 0) { chk = t; break; }
    return I('Two gears with ' + a + ' teeth and ' + b + ' teeth mesh. At the start, a marked tooth on each gear is at the contact point. How many full turns must the smaller gear make before both marked teeth are again at the contact point together?', [
      'Marked teeth return together after a number of teeth passing that is a multiple of both ' + a + ' and ' + b + '. The first time is lcm(' + a + ', ' + b + ') = ' + L + ' teeth.',
      'The smaller gear has ' + small + ' teeth, so it makes ' + L + ' ÷ ' + small + ' = ' + ans + ' turns.'], ans, { check: chk });
  });

  // ---------- m1t4: Units digit cycles and remainders ----------
  var G4 = { 1: [], 2: [], 3: [] };
  function unitsDigit(base, k) { return modpow(base % 10, k, 10); }
  function cycleStep(base, k) {
    var d = base % 10, cyc = CYCLES[d], L = cyc.length, idx = ((k - 1) % L) + 1;
    return 'The units digit of ' + base + '^{' + k + '} depends only on the last digit, ' + d + '. Powers of ' + d + ' end in ' + cyc.join(', ') + ' and repeat every ' + L + '. ' + k + ' ÷ ' + L + ' leaves remainder ' + (k % L) + ', so we use position ' + idx + ' in the cycle, which is ' + cyc[idx - 1] + '.';
  }

  G4[1].push(function (r) { // units digit of a^k
    var base = r.pick([2, 3, 4, 7, 8, 9, 12, 13, 17, 18, 23, 27, 29, 32, 34, 38]), k = r.int(10, 99);
    return I('What is the units digit of ' + base + '^{' + k + '}?', [cycleStep(base, k), 'Answer: ' + unitsDigit(base, k) + '.'], unitsDigit(base, k), { check: CYCLES[base % 10][(k - 1) % CYCLES[base % 10].length], visual: V.cycleWheel(base % 10), wrong: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  });
  G4[1].push(function (r) { // day of week
    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], N = r.int(20, 400), ans = days[N % 7];
    return TX('Today is Monday. What day of the week will it be in ' + N + ' days?', [N + ' ÷ 7 = ' + Math.floor(N / 7) + ' remainder ' + (N % 7) + '. Full weeks bring us back to Monday.', 'Count ' + (N % 7) + ' day(s) forward from Monday: ' + ans + '.'], ans, { wrong: days.filter(function (d) { return d !== ans; }), check: days[N % 7] });
  });
  G4[1].push(function (r) { // units digit of a product or square
    var a = r.int(11, 99), b = r.int(11, 99), ud = (a % 10) * (b % 10) % 10;
    return I('What is the units digit of ' + a + ' × ' + b + '?', ['Only the units digits matter: ' + a % 10 + ' × ' + b % 10 + ' = ' + (a % 10) * (b % 10) + '.', 'The units digit is ' + ud + '.'], ud, { check: (a * b) % 10, wrong: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  });

  G4[2].push(function (r) { // units digit of a sum of two powers
    var p = distinctPair(r, 2, 9), k = r.int(20, 100), m = r.int(20, 100), s = (unitsDigit(p[0], k) + unitsDigit(p[1], m)) % 10;
    return I('What is the units digit of ' + p[0] + '^{' + k + '} + ' + p[1] + '^{' + m + '}?', [cycleStep(p[0], k), cycleStep(p[1], m), unitsDigit(p[0], k) + ' + ' + unitsDigit(p[1], m) + ' = ' + (unitsDigit(p[0], k) + unitsDigit(p[1], m)) + ', so the units digit is ' + s + '.'], s, { check: (Math.pow(1, 1) * ((CYCLES[p[0]][(k - 1) % CYCLES[p[0]].length] + CYCLES[p[1]][(m - 1) % CYCLES[p[1]].length]) % 10)), wrong: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  });
  G4[2].push(function (r) { // units digit of a product of two powers
    var p = distinctPair(r, 2, 9), k = r.int(20, 100), m = r.int(20, 100), x = unitsDigit(p[0], k), y = unitsDigit(p[1], m), s = (x * y) % 10;
    return I('What is the units digit of ' + p[0] + '^{' + k + '} × ' + p[1] + '^{' + m + '}?', [cycleStep(p[0], k), cycleStep(p[1], m), x + ' × ' + y + ' = ' + x * y + ', so the units digit is ' + s + '.'], s, { check: (CYCLES[p[0]][(k - 1) % CYCLES[p[0]].length] * CYCLES[p[1]][(m - 1) % CYCLES[p[1]].length]) % 10, wrong: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  });
  G4[2].push(function (r) { // remainder of a power
    var m = r.pick([3, 4, 5, 7, 9, 11]), a, k = r.int(30, 200), tries = 0;
    do { a = r.int(2, 12); } while (gcd(a, m) !== 1 && ++tries < 200);
    var seq = [], seen = {}, x = a % m, i = 1;
    while (seen[x] === undefined) { seen[x] = i; seq.push(x); x = (x * a) % m; i++; }
    var start = seen[x], L = seq.length + 1 - start, val = modpow(a, k, m);
    var idx = k <= seq.length ? k : start + ((k - start) % L);
    return I('What is the remainder when ' + a + '^{' + k + '} is divided by ' + m + '?', [
      'List the remainders of ' + a + '^{1}, ' + a + '^{2}, ... divided by ' + m + ': ' + seq.concat([x]).join(', ') + '.',
      'The pattern repeats every ' + L + ' powers, starting from power ' + start + '.',
      k + ' matches position ' + idx + ' in the list, which gives ' + val + '.'], val, { check: seq[idx - 1], wrong: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(function (v) { return v < m; }) });
  });

  G4[3].push(function (r) { // units digit of a sum of three high powers
    var bases = r.shuffle([2, 3, 4, 6, 7, 8, 9]).slice(0, 3), N = r.int(1000, 3000), parts = bases.map(function (b) { return unitsDigit(b, N); }), s = parts.reduce(function (x, y) { return x + y; }, 0) % 10;
    return I('What is the units digit of ' + bases[0] + '^{' + fmt(N) + '} + ' + bases[1] + '^{' + fmt(N) + '} + ' + bases[2] + '^{' + fmt(N) + '}?', bases.map(function (b) { return cycleStep(b, N); }).concat(['Add the units digits: ' + parts.join(' + ') + ' = ' + parts.reduce(function (x, y) { return x + y; }, 0) + '. The units digit is ' + s + '.']), s, { check: bases.reduce(function (acc, b) { return acc + CYCLES[b][(N - 1) % CYCLES[b].length]; }, 0) % 10, wrong: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  });
  G4[3].push(function (r) { // power tower
    var a = r.pick([2, 3, 7, 8, 9, 4]), b = r.pick([2, 3, 4, 5]), c = r.int(3, 6), e = pow(b, c), ud = unitsDigit(a, e), L = CYCLES[a].length;
    return I('What is the units digit of ' + a + '^{' + b + '^{' + c + '}}? (The exponent is ' + b + '^{' + c + '}.)', [
      'First find the exponent: ' + b + '^{' + c + '} = ' + fmt(e) + '.',
      'Powers of ' + a + ' end in ' + CYCLES[a].join(', ') + ' and repeat every ' + L + '.',
      fmt(e) + ' ÷ ' + L + ' leaves remainder ' + (e % L) + ', so we use position ' + (((e - 1) % L) + 1) + ' in the cycle.',
      'The units digit is ' + ud + '.'], ud, { check: CYCLES[a][(e - 1) % L], wrong: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  });
  G4[3].push(function (r) { // count n with a given units digit
    var a = r.pick([2, 3, 4, 7, 8, 9]), cyc = CYCLES[a], d = r.pick(cyc), N = r.int(40, 200), L = cyc.length, chk = 0;
    for (var n = 1; n <= N; n++) if (unitsDigit(a, n) === d) chk++;
    var per = cyc.filter(function (x) { return x === d; }).length, q = Math.floor(N / L), rem = N % L, extra = cyc.slice(0, rem).filter(function (x) { return x === d; }).length;
    return I('For how many integers n from 1 to ' + N + ' does ' + a + '^{n} have a units digit of ' + d + '?', [
      'The units digits of ' + a + '^{1}, ' + a + '^{2}, ... go ' + cyc.join(', ') + ' and repeat every ' + L + '.',
      'In one full cycle the digit ' + d + ' appears ' + per + ' time(s).',
      N + ' ÷ ' + L + ' = ' + q + ' full cycles with ' + rem + ' left over. The left over start the cycle again and contain ' + d + ' ' + extra + ' time(s).',
      q + ' × ' + per + ' + ' + extra + ' = ' + (q * per + extra) + '.'], q * per + extra, { check: chk });
  });

  /* ================================================================
     8. Lessons (Markdown plus directives)
        :::visual name arg1 arg2      inserts a visual from MathEngine.visuals
        :::worked topicId tier        inserts a generated worked example
  ================================================================ */
  var LESSONS = {
    m1t0: '## Squares and cubes\nA **perfect square** is a whole number multiplied by itself. The picture shows why: 7 rows of 7 tiles.\n:::visual squareGrid 7\nThe highlighted L shape is the 13 extra tiles that grow a 6 by 6 square into a 7 by 7 square. That is why 7^{2} = 6^{2} + 13.\nA **perfect cube** is a number multiplied by itself three times. A 3 by 3 by 3 block holds 27 small cubes.\n:::visual cubeStack 3\n> Memorize squares up to 25^{2} and cubes up to 10^{3}. Contest speed comes from instant recall.\n### Roots undo powers\n√{144} = 12 because 12^{2} = 144. ∛{343} = 7 because 7^{3} = 343. A root asks: which number, used as a factor, builds this?\nFor a number that is not a perfect square, trap it between two neighbours.\n:::visual sqrtLine 200\nSince 14^{2} = 196 and 15^{2} = 225, √{200} sits just above 14.\n### Worked example\n:::worked m1t0 2',
    m1t1: '## Negative bases\nAn exponent belongs only to what sits directly under it. Brackets decide the base.\n:::visual powerTable -2\n(' + MINUS + '2)^{4} = 16 but ' + MINUS + '2^{4} = ' + MINUS + '16. The first raises the number including its sign. The second finds 2^{4} first and then applies the minus.\n> Even powers of a negative base are positive. Odd powers stay negative.\n## Fractions inside fractions\nWork from the inside out. Simplify the deepest fraction first, then move outward.\n:::visual fractionBar 3 4\nExample: 1 + {{1|1 + {{1|2}}}}. The inner part is 1 + {{1|2}} = {{3|2}}. Then 1 ÷ {{3|2}} = {{2|3}}. Finally 1 + {{2|3}} = {{5|3}}.\n### Worked example\n:::worked m1t1 2',
    m1t2: '## Divisibility rules\nThese quick tests save you from long division.\n:::visual divisibilityTable\n## Prime factorization\nEvery whole number above 1 is a product of primes in exactly one way. A factor tree finds it.\n:::visual factorTree 360\nTo count factors, add 1 to each exponent and multiply. For 360 = 2^{3} × 3^{2} × 5 that gives (3 + 1)(2 + 1)(1 + 1) = 24.\n> Each factor picks a power of each prime. That is where the multiplication comes from.\n### Worked example\n:::worked m1t2 2',
    m1t3: '## GCF and LCM from prime factors\nFactor both numbers and place the primes in a Venn diagram.\n:::visual vennFactors 48 36\nThe overlap holds the shared primes, and multiplying them gives the **GCF**. Multiplying every prime in the diagram gives the **LCM**.\n> For two numbers, GCF × LCM = product of the two numbers. Here 12 × 144 = 48 × 36.\nUse the GCF for splitting things into equal groups or tiles. Use the LCM for repeating events that must line up again.\n### Worked example\n:::worked m1t3 2',
    m1t4: '## Units digit cycles\nOnly the last digit of the base matters, and powers of a digit repeat in a short cycle.\n:::visual cycleWheel 7\nPowers of 7 end in 7, 9, 3, 1 and then repeat, so the cycle length is 4. To find the units digit of 7^{k}, divide k by 4 and use the remainder. A remainder of 0 means the last digit of the cycle.\n> The same idea finds remainders: list the remainders, spot the repeat, then jump ahead.\n### Worked example\n:::worked m1t4 2'
  };

  /* ================================================================
     9. Markdown and HTML rendering
  ================================================================ */
  function sanitizeHtml(html) {
    return String(html)
      .replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?(<\/\s*\1\s*>|>)/gi, '')
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
  }
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return mathToHtml(s);
  }
  function moduleOfTopic(id) { var m = /^(m\d+)t\d+$/.exec(String(id)); return m ? m[1] : 'm1'; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function renderContent(content) {
    injectStyles();
    content = String(content == null ? '' : content);
    if (/^\s*</.test(content)) return sanitizeHtml(content);
    var lines = content.split(/\r?\n/), out = [], para = [], list = null;
    function flushPara() { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } }
    function flushList() { if (list) { out.push('<' + list.t + '>' + list.items.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</' + list.t + '>'); list = null; } }
    lines.forEach(function (ln) {
      var m;
      if (!ln.trim()) { flushPara(); flushList(); return; }
      if ((m = /^:::visual\s+(\w+)\s*(.*)$/.exec(ln))) {
        flushPara(); flushList();
        var args = m[2].trim() ? m[2].trim().split(/\s+/).map(function (a) { return isNaN(+a) ? a : +a; }) : [];
        out.push(V[m[1]] ? V[m[1]].apply(null, args) : '<!-- unknown visual ' + esc(m[1]) + ' -->'); return;
      }
      if ((m = /^:::worked\s+(\w+)\s+([123])\s*$/.exec(ln))) {
        flushPara(); flushList();
        var q = generateQuestion(moduleOfTopic(m[1]), m[1], +m[2], { seed: hashStr(m[1] + m[2]) });
        out.push('<div class="me-worked"><div class="me-q">' + q.questionHtml + '</div>' + q.solutionHtml + '<div class="me-ans">Answer: ' + esc(q.correctAnswer) + '</div></div>'); return;
      }
      if (/^\s*</.test(ln)) { flushPara(); flushList(); out.push(sanitizeHtml(ln)); return; }
      if ((m = /^(#{1,4})\s+(.*)$/.exec(ln))) { flushPara(); flushList(); out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); return; }
      if ((m = /^>\s?(.*)$/.exec(ln))) { flushPara(); flushList(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); return; }
      if ((m = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(ln))) {
        flushPara(); var t = /\d/.test(m[1]) ? 'ol' : 'ul';
        if (!list || list.t !== t) { flushList(); list = { t: t, items: [] }; }
        list.items.push(m[2]); return;
      }
      flushList(); para.push(ln.trim());
    });
    flushPara(); flushList();
    return out.join('\n');
  }
  function mount(el, content) { if (el) el.innerHTML = renderContent(content); return el; }

  /* ================================================================
     10. Curriculum registry (Modules 2 to 6 plug in with registerModule)
  ================================================================ */
  var MODULES = {};
  function registerModule(def) {
    MODULES[def.id] = def;
    def.topics.forEach(function (t, i) { t.index = i; t.moduleId = def.id; });
    return def;
  }
  registerModule({
    id: 'm1', title: 'Advanced Number Sense & Number Theory',
    topics: [
      { id: 'm1t0', title: 'Perfect squares, cubes and roots', gens: G0, lesson: LESSONS.m1t0, summary: 'Squares and cubes, square and cube roots up to 3 digit radicands, smallest multipliers, counting squares and cubes.' },
      { id: 'm1t1', title: 'Negative bases and nested fractions', gens: G1, lesson: LESSONS.m1t1, summary: 'Brackets and signs with powers, complex fractions, telescoping products and sums.' },
      { id: 'm1t2', title: 'Divisibility and prime factorization', gens: G2, lesson: LESSONS.m1t2, summary: 'Divisibility rules for 3, 4, 6, 8, 9 and 11, counting factors, inclusion and exclusion.' },
      { id: 'm1t3', title: 'GCF and LCM applications', gens: G3, lesson: LESSONS.m1t3, summary: 'GCF and LCM from prime factors, remainder puzzles, tiling, blinking lights and gears.' },
      { id: 'm1t4', title: 'Units digit and remainder cycles', gens: G4, lesson: LESSONS.m1t4, summary: 'Units digit cycles of powers, sums and products, remainder patterns, power towers.' }
    ]
  });

  function getModule(id) { var m = MODULES[id]; if (!m) throw new Error('MathEngine: unknown module "' + id + '". Registered: ' + Object.keys(MODULES).join(', ')); return m; }
  function getTopic(moduleId, topicId) {
    var m = getModule(moduleId);
    if (typeof topicId === 'number') topicId = m.id + 't' + topicId;
    var t = m.topics.filter(function (x) { return x.id === topicId; })[0];
    if (!t) throw new Error('MathEngine: unknown topic "' + topicId + '" in ' + moduleId + '. Topics: ' + m.topics.map(function (x) { return x.id; }).join(', '));
    return t;
  }

  /* ================================================================
     11. Building a question object from a spec
  ================================================================ */
  var lastVariant = {};

  function makeOptions(spec, r) {
    if (spec.options) return finalize(spec.options.slice(), spec, r, true);
    var list = [], seen = {}; seen[spec.ans] = 1;
    function add(str) { if (str != null && !seen[str] && str !== '') { seen[str] = 1; list.push(str); } }
    function conv(w) { return typeof w === 'number' ? fmt(w) : (w && typeof w === 'object' && 'd' in w) ? fstr(w) : w; }
    var i;
    if (spec.wrong) r.shuffle(spec.wrong).forEach(function (w) { add(conv(w)); });
    if (spec.kind === 'int') {
      var v = spec.value, span = Math.max(3, Math.round(Math.abs(v) * 0.2)), fixed = [1, -1, 2, -2, 10, -10];
      if (list.length < 4) for (i = 0; i < fixed.length && list.length < 4; i++) { var c = v + fixed[i]; if (v >= 0 && c < 0) continue; add(fmt(c)); }
      for (i = 0; list.length < 4 && i < 200; i++) { var c2 = v + r.int(-span, span); if (v >= 0 && c2 < 0) continue; add(fmt(c2)); }
      if (list.length < 4) for (i = 1; list.length < 4; i++) add(fmt(v + 20 + i));
    } else if (spec.kind === 'frac') {
      var f = spec.value, n = f.n, d = f.d, cand = [F(n + 1, d), F(n, d + 1), F(n - 1, d), F(n + 1, d + 1), F(n + d, d + 1), F(n * 2, d + 1)];
      if (n !== 0) cand.push(F(d, n));
      cand.forEach(function (x) { if (x.d !== 0) add(fstr(x)); });
      for (i = 0; list.length < 4 && i < 200; i++) add(fstr(F(r.int(1, 12), r.int(2, 12))));
    }
    return finalize(r.shuffle(list).slice(0, 4).concat([spec.ans]), spec, r, false);
  }
  function finalize(opts, spec, r, keepOrder) {
    if (keepOrder) return opts;
    if (spec.kind === 'text') return r.shuffle(opts);
    return opts.slice().sort(function (a, b) { return parseAnswer(a) - parseAnswer(b); });
  }

  function build(topic, tier, seed, spec, opts) {
    var r = makeR(seed ^ 0x9e3779b9), options = null;
    if (spec.options || tier === 3 || opts.mc) options = makeOptions(spec, r);
    var steps = spec.steps.slice();
    return {
      id: topic.id + '-T' + tier + '-' + seed.toString(36),
      moduleId: topic.moduleId, topicId: topic.id, tier: tier, seed: seed,
      questionText: toPlain(spec.q),
      options: options,
      correctAnswer: spec.ans,
      correctIndex: options ? options.indexOf(spec.ans) : -1,
      stepByStepSolution: steps.map(function (s, i) { return 'Step ' + (i + 1) + ': ' + toPlain(s); }).join('\n'),
      questionMarkup: spec.q,
      questionHtml: toHtml(spec.q),
      optionsHtml: options ? options.map(function (o) { return esc(o); }) : null,
      solutionSteps: steps.map(toPlain),
      solutionHtml: '<ol class="me-steps">' + steps.map(function (s) { return '<li>' + toHtml(s) + '</li>'; }).join('') + '</ol>',
      visualHtml: spec.visual || '',
      answerKind: spec.kind
    };
  }

  /* ================================================================
     12. Public generators
  ================================================================ */
  function runVariant(topic, tier, index, seed) {
    var pool = topic.gens[tier], r = makeR(seed);
    return pool[index](r);
  }

  // moduleId, topicId (id, index, or 'mixed'), tier 1 to 3. opts: { mc, seed, variant }
  function generateQuestion(moduleId, topicId, tier, opts) {
    opts = opts || {}; tier = +tier;
    if (tier !== 1 && tier !== 2 && tier !== 3) throw new Error('MathEngine: tier must be 1, 2 or 3');
    var m = getModule(moduleId), topic;
    if (topicId == null || topicId === 'mixed') topic = m.topics[Math.floor(masterRng() * m.topics.length)];
    else topic = getTopic(moduleId, topicId);
    var pool = topic.gens[tier];
    if (!pool || !pool.length) throw new Error('MathEngine: no generators for ' + topic.id + ' tier ' + tier);
    var seed = opts.seed != null ? opts.seed >>> 0 : newSeed(), key = topic.id + tier, idx;
    if (opts.variant != null) idx = opts.variant % pool.length;
    else {
      idx = seed % pool.length;
      if (opts.seed == null && pool.length > 1 && idx === lastVariant[key]) idx = (idx + 1) % pool.length;
    }
    lastVariant[key] = idx;
    var spec = runVariant(topic, tier, idx, seed);
    var q = build(topic, tier, seed, spec, opts);
    q.variant = idx;
    return q;
  }

  // settings: { moduleId, topicId ('mixed' by default), tier, count, mc }
  function generateWorksheet(s) {
    s = s || {}; var count = Math.max(1, Math.min(50, s.count || 10)), out = [], seen = {}, guard = 0;
    while (out.length < count && guard++ < count * 25) {
      var q = generateQuestion(s.moduleId || 'm1', s.topicId || 'mixed', s.tier || 1, { mc: !!s.mc });
      if (!seen[q.questionText]) { seen[q.questionText] = 1; out.push(q); }
    }
    return out;
  }

  // Accepts typed numbers, fractions, option letters (A to E) and text answers.
  function checkAnswer(q, input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return false;
    if (q.options && /^[A-Ea-e]$/.test(raw)) return q.options.indexOf(q.correctAnswer) === raw.toUpperCase().charCodeAt(0) - 65;
    var a = parseAnswer(raw), b = parseAnswer(q.correctAnswer);
    if (!isNaN(a) && !isNaN(b)) return Math.abs(a - b) < 1e-9;
    return raw.toLowerCase().replace(/\s+/g, '') === String(q.correctAnswer).toLowerCase().replace(/\s+/g, '');
  }

  function renderQuestion(q, o) {
    injectStyles(); o = o || {};
    var h = '<div class="me-qcard"><span class="me-tag">Tier ' + q.tier + '</span>' + (o.index ? ' <b>' + o.index + '.</b>' : '') + '<div class="me-q">' + q.questionHtml + '</div>' + q.visualHtml;
    if (q.optionsHtml) h += '<ol class="me-opts">' + q.optionsHtml.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>';
    if (o.showSolution) h += q.solutionHtml + '<div class="me-ans">Answer: ' + esc(q.correctAnswer) + '</div>';
    return h + '</div>';
  }

  function getLesson(topicId) {
    var t = getTopic(moduleOfTopic(topicId), topicId);
    return { id: t.id, title: t.title, summary: t.summary, markdown: t.lesson };
  }
  function renderLesson(topicId) { var l = getLesson(topicId); return '<article class="me-lesson"><h1>' + esc(l.title) + '</h1>' + renderContent(l.markdown) + '</article>'; }

  function listModules() { return Object.keys(MODULES).map(function (id) { return { id: id, title: MODULES[id].title, topics: MODULES[id].topics.length }; }); }
  function listTopics(moduleId) { return getModule(moduleId).topics.map(function (t) { return { id: t.id, index: t.index, title: t.title, summary: t.summary, tiers: [1, 2, 3].map(function (n) { return (t.gens[n] || []).length; }) }; }); }

  /* Runs every generator variant many times and reports problems. */
  function selfTest(perVariant) {
    perVariant = perVariant || 60; var fails = [], total = 0;
    Object.keys(MODULES).forEach(function (mid) {
      MODULES[mid].topics.forEach(function (t) {
        [1, 2, 3].forEach(function (tier) {
          (t.gens[tier] || []).forEach(function (_, v) {
            for (var i = 0; i < perVariant; i++) {
              total++; var seed = newSeed(), tag = t.id + ' T' + tier + ' v' + v + ' seed ' + seed;
              try {
                var spec = runVariant(t, tier, v, seed), q = build(t, tier, seed, spec, { mc: true });
                if (spec.check !== undefined) {
                  var got = spec.kind === 'frac' ? fval(spec.value) : spec.value, want = typeof spec.check === 'string' ? spec.check : spec.check;
                  if (typeof want === 'string' ? want !== spec.ans : Math.abs(got - want) > 1e-9) fails.push(tag + ' answer mismatch: ' + spec.ans + ' vs check ' + want);
                }
                if (!q.options || q.options.indexOf(q.correctAnswer) < 0) fails.push(tag + ' correct answer missing from options');
                else if (new Set(q.options).size !== q.options.length) fails.push(tag + ' duplicate options');
                if (/undefined|NaN|Infinity/.test(q.questionText + q.stepByStepSolution + q.options.join(' '))) fails.push(tag + ' bad text: ' + q.questionText);
                if (!spec.options && q.options.length !== 5) fails.push(tag + ' option count ' + q.options.length);
              } catch (e) { fails.push(tag + ' threw ' + e.message); }
            }
          });
        });
      });
    });
    return { total: total, failures: fails.length, details: fails.slice(0, 20) };
  }

  injectStyles();

  return {
    version: '1.1.0',
    generateQuestion: generateQuestion, generateWorksheet: generateWorksheet, checkAnswer: checkAnswer,
    renderContent: renderContent, renderQuestion: renderQuestion, renderLesson: renderLesson, getLesson: getLesson, mount: mount,
    registerModule: registerModule, listModules: listModules, moduleOfTopic: moduleOfTopic, getModule: getModule, getTopic: getTopic, listTopics: listTopics,
    visuals: V, injectStyles: injectStyles, css: CSS, selfTest: selfTest,
    format: { toPlain: toPlain, toHtml: toHtml, fmt: fmt },
    math: { gcd: gcd, lcm: lcm, isPrime: isPrime, factorize: factorize, modpow: modpow, Fraction: F }
  };
});
