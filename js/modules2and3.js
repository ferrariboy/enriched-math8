/*!
 * modules2and3.js  v1.0.0
 * Extension for mathEngine.js (v1.1.0 or newer).
 * Adds Module 2 (Proportional Reasoning & Extreme Percentages) and
 * Module 3 (Algebraic Foundations & Discrete Relations).
 *
 * Load order in index.html:
 *   <script src="mathEngine.js"></script>
 *   <script src="modules2and3.js"></script>
 *
 * Nothing else to wire up. The file registers itself with
 * MathEngine.registerModule(), so these calls now work for m2 and m3:
 *   MathEngine.generateQuestion('m2', 'm2t1', 3)
 *   MathEngine.generateWorksheet({ moduleId: 'm3', tier: 2, count: 10 })
 *   MathEngine.renderLesson('m3t1')
 *
 * Topic ids:
 *   m2t0 scaling and rates          m3t0 expressions, evaluation, coordinates
 *   m2t1 relative speed             m3t1 linear equations and systems
 *   m2t2 percentages                m3t2 arithmetic sequences
 *   m2t3 discounts, tax, interest   m3t3 visual pattern growth
 *   m2t4 mixtures                   m3t4 substitution and balance puzzles
 */
(function (root) {
  'use strict';
  var E = root.MathEngine;
  if (!E || !E.registerModule || !E.moduleOfTopic) {
    throw new Error('modules2and3.js: load mathEngine.js (v1.1.0 or newer) before this file.');
  }
  var gcd = E.math.gcd, lcm = E.math.lcm, fmt = E.format.fmt, V = E.visuals, MINUS = '−';

  /* ------------------------------------------------------------------
     Helpers. Same spec shape as the engine:
     { q, steps[], ans, kind, value, wrong?, options?, check?, visual? }
     kind 'dec' is used for decimal answers (money, percents). It carries its
     own list of wrong answers, which are built from common mistakes.
  ------------------------------------------------------------------ */
  function fr(n, d) { return '{{' + n + '|' + d + '}}'; }
  function Fq(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  function fstr(f) { return f.d === 1 ? fmt(f.n) : (f.n < 0 ? MINUS : '') + Math.abs(f.n) + '/' + f.d; }
  function fmk(f) { return f.d === 1 ? fmt(f.n) : (f.n < 0 ? MINUS : '') + '{{' + Math.abs(f.n) + '|' + f.d + '}}'; }
  function rd(x, dp) { var p = Math.pow(10, dp); return Math.round(x * p) / p; }
  function nf(v, dp, trim) {
    var s = rd(v, dp).toFixed(dp);
    if (trim && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('-', MINUS);
  }
  // Removes clumsy coefficients such as 1x and 1(x + 2).
  function tidy(s) { return String(s).replace(/-/g, MINUS).replace(/\+ \u2212(?=\d)/g, '\u2212 ').replace(/\u2212 \u2212(?=\d)/g, '+ ').replace(/(^|[^\d\w.])1(?=[a-z](?![a-z])|\()/g, '$1'); }
  function tidyAll(a) { return a.map(tidy); }
  function ord(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
  function I(q, steps, value, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: fmt(value), kind: 'int', value: value }, extra || {}); }
  function FR(q, steps, f, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: fstr(f), kind: 'frac', value: f }, extra || {}); }
  function TX(q, steps, ans, extra) { return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: ans, kind: 'text' }, extra || {}); }
  // Decimal answer. dp = decimal places, trim = drop trailing zeros (percents), wrong = mistake values.
  function D(q, steps, value, dp, trim, wrong, extra) {
    var v = rd(value, dp), ans = nf(v, dp, trim), list = [], seen = {}; seen[ans] = 1;
    function add(x) {
      if (x == null || !isFinite(x)) return; x = rd(x, dp);
      if (v > 0 && x <= 0) return;
      var s = nf(x, dp, trim); if (!seen[s]) { seen[s] = 1; list.push(s); }
    }
    (wrong || []).forEach(add);
    [1.1, 0.9, 1.25, 0.8, 1.5, 0.5, 2, 1.05, 0.95].forEach(function (k) { add(v * k); });
    var unit = Math.max(Math.abs(v) * 0.02, Math.pow(10, -dp));
    for (var i = 1; i <= 8; i++) add(v + unit * i);
    return Object.assign({ q: tidy(q), steps: tidyAll(steps), ans: ans, kind: 'dec', value: v, wrong: list }, extra || {});
  }
  function money(x) { return '$' + nf(x, 2, false); }
  function pick2(r, lo, hi) { var a = r.int(lo, hi), b = r.int(lo, hi); while (b === a) b = r.int(lo, hi); return [a, b]; }
  function sg(n) { return n < 0 ? MINUS + ' ' + Math.abs(n) : '+ ' + n; }          // "+ 3" or "− 3"
  function lin(a, b) { return (a === 1 ? '' : a === -1 ? MINUS : a) + 'x' + (b === 0 ? '' : ' ' + sg(b)); } // "3x − 4"
  function lst(a) { return a.join(', '); }

  /* ------------------------------------------------------------------
     Extra visuals (added to MathEngine.visuals, so Markdown lessons can use
     them with lines such as  :::visual tapeDiagram 3 2 )
  ------------------------------------------------------------------ */
  (function () {
    if (typeof document !== 'undefined' && !document.getElementById('me-styles2')) {
      var st = document.createElement('style'); st.id = 'me-styles2';
      st.textContent = '.me-gl{stroke:var(--line,#D6CEB8);stroke-width:1}.me-dash{stroke-dasharray:6 4}.me-sm{font-size:11px;font-weight:600}';
      (document.head || document.documentElement).appendChild(st);
    }
    var uid = 0;
    function svg(w, h, label, inner) { return '<svg class="me-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>'; }
    function fig(inner, cap) { return '<figure class="me-fig">' + inner + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>'; }
    function ln(x1, y1, x2, y2, c) { return '<line class="' + (c || 'me-ln') + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>'; }
    function tx(x, y, t, c, a) { return '<text class="' + (c || 'me-tx') + '" x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '">' + t + '</text>'; }

    // Coordinate plane. Pass pairs of numbers, or an array of [x, y].
    V.coordinatePlane = function () {
      var a = [].slice.call(arguments), pts = [], i;
      if (Array.isArray(a[0])) pts = a[0]; else for (i = 0; i + 1 < a.length; i += 2) pts.push([a[i], a[i + 1]]);
      var R = 5; pts.forEach(function (p) { R = Math.max(R, Math.ceil(Math.max(Math.abs(p[0]), Math.abs(p[1])))); }); R = Math.min(R, 12);
      var c = Math.floor(280 / (2 * R)), size = 2 * R * c, pad = 28, W = size + 2 * pad, cx = pad + R * c, cy = pad + R * c, g = '', step = R > 8 ? 2 : 1;
      for (i = -R; i <= R; i++) { g += ln(cx + i * c, pad, cx + i * c, pad + size, 'me-gl') + ln(pad, cy + i * c, pad + size, cy + i * c, 'me-gl'); }
      g += ln(pad, cy, pad + size, cy, 'me-ln me-thick') + ln(cx, pad, cx, pad + size, 'me-ln me-thick');
      for (i = -R; i <= R; i += step) if (i !== 0) { g += tx(cx + i * c, cy + 14, String(i).replace('-', MINUS), 'me-tx me-sm') + tx(cx - 6, cy - i * c + 4, String(i).replace('-', MINUS), 'me-tx me-sm', 'end'); }
      var qo = R * c * 0.5; g += tx(cx + qo, cy - qo, 'I', 'me-tx me-bold') + tx(cx - qo, cy - qo, 'II', 'me-tx me-bold') + tx(cx - qo, cy + qo, 'III', 'me-tx me-bold') + tx(cx + qo, cy + qo, 'IV', 'me-tx me-bold');
      pts.forEach(function (p, k) { g += '<circle class="me-fb" cx="' + (cx + p[0] * c) + '" cy="' + (cy - p[1] * c) + '" r="5"/>' + tx(cx + p[0] * c + 9, cy - p[1] * c - 8, String.fromCharCode(65 + k), 'me-tx me-bold'); });
      return fig(svg(W, W, 'Coordinate plane', g));
    };

    // Tape diagram: bars in the given ratio.
    V.tapeDiagram = function () {
      var parts = [].slice.call(arguments).map(Number).filter(function (n) { return n > 0; }), tot = parts.reduce(function (x, y) { return x + y; }, 0), x = 10, g = '';
      parts.forEach(function (p, i) { var w = 300 * p / tot; g += '<rect class="' + (i % 2 ? 'me-fa' : 'me-fb') + '" x="' + x.toFixed(1) + '" y="12" width="' + (w - 3).toFixed(1) + '" height="38" rx="5"/>' + tx((x + w / 2).toFixed(1), 36, String(p), 'me-tx me-bold' + (i % 2 ? '' : ' me-on')); x += w; });
      return fig(svg(320, 66, 'Tape diagram of the ratio ' + parts.join(' to '), g), 'Ratio ' + parts.join(' : ') + ', ' + tot + ' equal parts in all.');
    };

    // Motion picture: 'toward', 'apart' or 'chase'.
    V.motionDiagram = function (mode, v1, v2) {
      var id = 'me-mo' + (++uid), g = '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="me-ar" d="M0 0 L10 5 L0 10 z"/></marker></defs>';
      g += ln(20, 60, 320, 60, 'me-ln me-thick');
      function dot(x, lab, sp, dir) { return '<circle class="me-fb" cx="' + x + '" cy="60" r="8"/>' + tx(x, 40, lab, 'me-tx me-bold') + '<line class="me-ln me-thick" x1="' + x + '" y1="84" x2="' + (x + dir * 46) + '" y2="84" marker-end="url(#' + id + ')"/>' + tx(x + dir * 23, 102, sp, 'me-tx me-sm'); }
      var s1 = v1 ? v1 + ' per unit time' : '', s2 = v2 ? v2 + ' per unit time' : '';
      if (mode === 'apart') g += dot(150, 'A', s1, -1) + dot(190, 'B', s2, 1);
      else if (mode === 'chase') g += dot(60, 'B', s2, 1) + dot(230, 'A', s1, 1);
      else g += dot(60, 'A', s1, 1) + dot(280, 'B', s2, -1);
      return fig(svg(340, 112, 'Two objects moving ' + (mode || 'toward each other'), g));
    };

    // Matchstick rows: 'square' or 'triangle', n shapes.
    V.matchRow = function (shape, n) {
      n = Math.max(1, Math.min(5, Math.round(n) || 3)); var L = 40, g = '', k;
      if (shape === 'triangle') {
        var nodes = []; for (k = 0; k < n + 2; k++) nodes.push([12 + k * L / 2, k % 2 === 0 ? 62 : 26]);
        for (k = 0; k + 1 < nodes.length; k++) g += ln(nodes[k][0], nodes[k][1], nodes[k + 1][0], nodes[k + 1][1], 'me-ln me-thick');
        for (k = 0; k + 2 < nodes.length; k++) g += ln(nodes[k][0], nodes[k][1], nodes[k + 2][0], nodes[k + 2][1], 'me-ln me-thick');
        return fig(svg(24 + (n + 1) * L / 2 + 10, 80, n + ' triangles made of matchsticks', g), n + ' triangles use ' + (2 * n + 1) + ' sticks.');
      }
      for (k = 0; k < n; k++) { var x = 12 + k * L; g += ln(x, 20, x + L, 20, 'me-ln me-thick') + ln(x, 20 + L, x + L, 20 + L, 'me-ln me-thick') + ln(x + L, 20, x + L, 20 + L, 'me-ln me-thick'); if (k === 0) g += ln(x, 20, x, 20 + L, 'me-ln me-thick'); }
      return fig(svg(24 + n * L + 4, 74, n + ' squares made of matchsticks', g), n + ' squares use ' + (3 * n + 1) + ' sticks.');
    };

    // A pool of n by n with a one tile border.
    V.borderTiles = function (n) {
      n = Math.max(1, Math.min(6, Math.round(n) || 3)); var c = 26, m = n + 2, g = '';
      for (var i = 0; i < m; i++) for (var j = 0; j < m; j++) { var edge = i === 0 || j === 0 || i === m - 1 || j === m - 1; g += '<rect class="' + (edge ? 'me-fb' : 'me-fa') + '" x="' + (10 + j * c) + '" y="' + (10 + i * c) + '" width="' + (c - 2) + '" height="' + (c - 2) + '" rx="3"/>'; }
      return fig(svg(m * c + 20, m * c + 20, n + ' by ' + n + ' pool with a border of tiles', g), 'Border tiles for an ' + n + ' by ' + n + ' pool: ' + (4 * n + 4) + '.');
    };
  })();

  /* ==================================================================
     MODULE 2 GENERATORS
  ================================================================== */
  var M2 = [0, 1, 2, 3, 4].map(function () { return { 1: [], 2: [], 3: [] }; });

  // ---------- m2t0: Multi step scaling and rates ----------
  M2[0][1].push(function (r) { // recipe scaling with cost
    var d = r.pick([2, 3, 4, 5]), i = r.int(2, 5), j = r.int(3, 12); if (j === i) j++;
    var s = d * i, n = d * j, t = r.int(1, 4), a = i * t, need = a * j / i, price = r.pick([1.2, 1.5, 1.75, 2, 2.4]), cost = need * price;
    return D('A recipe for ' + s + ' pancakes uses ' + a + ' cups of milk. Milk costs $' + nf(price, 2, false) + ' per cup. What is the cost of the milk for ' + n + ' pancakes?', [
      'Find the scale factor: ' + n + ' ÷ ' + s + ' = ' + fr(j, i) + ' (both numbers share a factor of ' + d + ').',
      'Milk needed: ' + a + ' × ' + fr(j, i) + ' = ' + need + ' cups. Divide by ' + i + ' first, then multiply by ' + j + ' to keep the numbers small.',
      'Cost: ' + need + ' × $' + nf(price, 2, false) + ' = ' + money(cost) + '.'], cost, 2, false, [a * price, need + price, (a + need) * price], { check: rd((a * n / s) * price, 2) });
  });
  M2[0][1].push(function (r) { // fuel cost
    var L = r.int(5, 12), k = r.int(4, 20), Dk = 50 * k, c = r.int(60, 105), p = 2 * c / 100, litres = L * Dk / 100, cost = litres * p;
    return D('A car uses ' + L + ' litres of fuel for every 100 km. Fuel costs $' + nf(p, 2, false) + ' per litre. What is the fuel cost for a ' + Dk + ' km trip?', [
      Dk + ' km is ' + Dk + ' ÷ 100 = ' + nf(Dk / 100, 1, false) + ' of a 100 km block.',
      'Litres used: ' + L + ' × ' + nf(Dk / 100, 1, false) + ' = ' + nf(litres, 1, false) + ' litres.',
      'Cost: ' + nf(litres, 1, false) + ' × $' + nf(p, 2, false) + ' = ' + money(cost) + '.'], cost, 2, false, [L * Dk * p / 100 * 2, L * p, litres + p], { check: rd(L * Dk * p / 100, 2) });
  });
  M2[0][1].push(function (r) { // km/h to metres in minutes
    var w = r.int(4, 12), v = 3 * w, t = r.int(5, 40), m = 50 * w * t;
    return I('A cyclist rides at a steady ' + v + ' km/h. How many metres does she travel in ' + t + ' minutes?', [
      v + ' km/h = ' + v + ' × 1000 ÷ 60 metres per minute. Since ' + v + ' = 3 × ' + w + ', this simplifies to ' + w + ' × 50 = ' + 50 * w + ' metres per minute.',
      'Shortcut to remember: 3 km/h is exactly 50 metres per minute.',
      'Distance: ' + 50 * w + ' × ' + t + ' = ' + fmt(m) + ' metres.'], m, { check: v * 1000 / 60 * t });
  });

  var BASE_PAIRS = [[12, 6], [15, 10], [20, 30], [6, 3], [12, 4], [10, 40], [18, 9], [24, 8], [20, 5], [30, 15], [12, 12], [60, 20]];
  M2[0][2].push(function (r) { // work together
    var bp = r.pick(BASE_PAIRS), k = r.int(1, 3), a = bp[0] * k, b = bp[1] * k, T = a * b / (a + b), L = lcm(a, b);
    return I('Machine A can finish a job alone in ' + a + ' hours. Machine B can finish the same job alone in ' + b + ' hours. Working together, how many hours do they need?', [
      'Let the whole job be ' + L + ' units (the LCM of ' + a + ' and ' + b + ').',
      'A does ' + L + ' ÷ ' + a + ' = ' + L / a + ' units per hour. B does ' + L + ' ÷ ' + b + ' = ' + L / b + ' units per hour. Together: ' + (L / a + L / b) + ' units per hour.',
      'Time = ' + L + ' ÷ ' + (L / a + L / b) + ' = ' + T + ' hours.'], T, { check: 1 / (1 / a + 1 / b) });
  });
  M2[0][2].push(function (r) { // tank dimensions and flow rate
    var t, rate, Vl, x, y, z, tries = 0;
    do { t = r.int(5, 40); rate = r.int(2, 12); Vl = rate * t; x = r.pick([20, 25, 40, 50]); y = r.pick([20, 25, 40, 50]); z = 1000 * Vl / (x * y); tries++; } while ((!Number.isInteger(z) || z < 10 || z > 100) && tries < 2000);
    if (!Number.isInteger(z)) { x = 50; y = 40; z = 30; Vl = 60; rate = 5; t = 12; }
    return I('An empty tank measures ' + x + ' cm by ' + y + ' cm by ' + z + ' cm. A tap fills it at ' + rate + ' litres per minute. (1 litre = 1000 cm³.) How many minutes does it take to fill the tank?', [
      'Volume: ' + x + ' × ' + y + ' × ' + z + ' = ' + fmt(x * y * z) + ' cm³.',
      'Convert to litres: ' + fmt(x * y * z) + ' ÷ 1000 = ' + Vl + ' litres.',
      'Time: ' + Vl + ' ÷ ' + rate + ' = ' + t + ' minutes.'], t, { check: (x * y * z / 1000) / rate });
  });
  M2[0][2].push(function (r) { // map scale and travel time
    var s = r.pick([2, 2.5, 4, 5]), v, x, dist, mins, tries = 0;
    do { v = r.pick([30, 40, 45, 60, 80, 90]); x = r.int(3, 30); dist = s * x; tries++; } while (((s * x * 60) % v !== 0) && tries < 3000);
    if ((s * x * 60) % v !== 0) { s = 2; v = 60; x = 15; dist = 30; }
    mins = dist * 60 / v;
    return I('On a map, 1 cm stands for ' + nf(s, 1, true) + ' km. Two towns are ' + x + ' cm apart on the map. A bus travels between them at ' + v + ' km/h. How many minutes does the trip take?', [
      'Real distance: ' + x + ' × ' + nf(s, 1, true) + ' = ' + nf(dist, 1, true) + ' km.',
      'Time in hours: ' + nf(dist, 1, true) + ' ÷ ' + v + '. Multiply by 60 to get minutes.',
      nf(dist, 1, true) + ' × 60 ÷ ' + v + ' = ' + mins + ' minutes.'], mins, { check: (s * x) / v * 60 });
  });

  M2[0][3].push(function (r) { // average speed of a round trip
    var v1, v2, tries = 0;
    do { v1 = 5 * r.int(4, 18); v2 = 5 * r.int(4, 18); tries++; } while ((v1 === v2 || (2 * v1 * v2) % (v1 + v2) !== 0) && tries < 3000);
    if (v1 === v2 || (2 * v1 * v2) % (v1 + v2) !== 0) { v1 = 60; v2 = 40; }
    var d = lcm(v1, v2), t1 = d / v1, t2 = d / v2, avg = 2 * d / (t1 + t2);
    return I('A driver goes from town A to town B at ' + v1 + ' km/h and returns along the same road at ' + v2 + ' km/h. What is her average speed for the whole round trip, in km/h?', [
      'Average speed is total distance ÷ total time, not the average of the two speeds.',
      'Pick a convenient one way distance, the LCM of the speeds: ' + d + ' km. Going takes ' + d + ' ÷ ' + v1 + ' = ' + t1 + ' h. Returning takes ' + d + ' ÷ ' + v2 + ' = ' + t2 + ' h.',
      'Total distance ' + 2 * d + ' km in ' + (t1 + t2) + ' h gives ' + 2 * d + ' ÷ ' + (t1 + t2) + ' = ' + avg + ' km/h.',
      'Shortcut: for equal distances the average is 2 × ' + v1 + ' × ' + v2 + ' ÷ (' + v1 + ' + ' + v2 + ').'], avg, { check: 2 * v1 * v2 / (v1 + v2) });
  });
  var PIPES = null;
  M2[0][3].push(function (r) { // filling with a drain
    if (!PIPES) { PIPES = []; for (var a = 2; a <= 24; a++) for (var b = a; b <= 24; b++) for (var c = 2; c <= 40; c++) { var den = b * c + a * c - a * b; if (den > 0 && (a * b * c) % den === 0) { var T = a * b * c / den; if (T >= 2 && T <= 48 && c > T) PIPES.push([a, b, c, T]); } } }
    var p = r.pick(PIPES), a = p[0], b = p[1], c = p[2], T = p[3], L = lcm(lcm(a, b), c);
    return I('Pipe A alone can fill a pool in ' + a + ' hours and pipe B alone in ' + b + ' hours. A drain C alone can empty a full pool in ' + c + ' hours. The pool starts empty and all three are opened together. How many hours until the pool is full?', [
      'Let the pool hold ' + L + ' units, the LCM of ' + a + ', ' + b + ' and ' + c + '.',
      'A adds ' + L / a + ' units per hour, B adds ' + L / b + ', and C removes ' + L / c + '. Net: ' + L / a + ' + ' + L / b + ' ' + MINUS + ' ' + L / c + ' = ' + (L / a + L / b - L / c) + ' units per hour.',
      'Time = ' + L + ' ÷ ' + (L / a + L / b - L / c) + ' = ' + T + ' hours.'], T, { check: 1 / (1 / a + 1 / b - 1 / c) });
  });
  M2[0][3].push(function (r) { // tank with two flow phases and a leak
    var l = r.int(2, 5), r1 = l + r.int(3, 9), r2 = r1 + r.int(2, 8), t1 = r.int(5, 20), t2 = r.int(5, 30), Vt = (r1 - l) * t1 + (r2 - l) * t2;
    return I('A tank holds ' + fmt(Vt) + ' litres and starts empty. For the first ' + t1 + ' minutes water flows in at ' + r1 + ' L/min. After that it flows in at ' + r2 + ' L/min. Throughout, a leak drains ' + l + ' L/min. How many minutes in total until the tank is full?', [
      'The leak simply lowers each rate: first phase net ' + r1 + ' ' + MINUS + ' ' + l + ' = ' + (r1 - l) + ' L/min, second phase net ' + r2 + ' ' + MINUS + ' ' + l + ' = ' + (r2 - l) + ' L/min.',
      'After ' + t1 + ' minutes: ' + (r1 - l) + ' × ' + t1 + ' = ' + (r1 - l) * t1 + ' litres. Still to fill: ' + fmt(Vt) + ' ' + MINUS + ' ' + (r1 - l) * t1 + ' = ' + (r2 - l) * t2 + ' litres.',
      'Second phase time: ' + (r2 - l) * t2 + ' ÷ ' + (r2 - l) + ' = ' + t2 + ' minutes.', 'Total: ' + t1 + ' + ' + t2 + ' = ' + (t1 + t2) + ' minutes.'], t1 + t2, { check: t1 + (Vt - (r1 - l) * t1) / (r2 - l) });
  });

  // ---------- m2t1: Relative speed ----------
  M2[1][1].push(function (r) { // average speed over two legs
    var v1, v2, t1, t2, tries = 0;
    do { v1 = r.int(40, 90); v2 = r.int(40, 90); t1 = r.int(1, 5); t2 = r.int(1, 5); tries++; } while ((v1 === v2 || (v1 * t1 + v2 * t2) % (t1 + t2) !== 0) && tries < 3000);
    var tot = v1 * t1 + v2 * t2, avg = tot / (t1 + t2);
    return I('A train travels at ' + v1 + ' km/h for ' + t1 + ' hours and then at ' + v2 + ' km/h for ' + t2 + ' hours. What is its average speed for the whole journey, in km/h?', [
      'Distance in the first part: ' + v1 + ' × ' + t1 + ' = ' + v1 * t1 + ' km. Second part: ' + v2 + ' × ' + t2 + ' = ' + v2 * t2 + ' km.',
      'Total distance ' + tot + ' km, total time ' + (t1 + t2) + ' h.', 'Average speed = ' + tot + ' ÷ ' + (t1 + t2) + ' = ' + avg + ' km/h.'], avg, { check: (v1 * t1 + v2 * t2) / (t1 + t2) });
  });
  M2[1][1].push(function (r) { // meeting time
    var p = pick2(r, 40, 90), t = r.int(2, 6), Dk = (p[0] + p[1]) * t;
    return I('Two cyclists start ' + Dk + ' km apart and ride toward each other at ' + p[0] + ' km/h and ' + p[1] + ' km/h. How many hours until they meet?', [
      'Toward each other, the gap closes at the sum of the speeds: ' + p[0] + ' + ' + p[1] + ' = ' + (p[0] + p[1]) + ' km/h.',
      'Time = ' + Dk + ' ÷ ' + (p[0] + p[1]) + ' = ' + t + ' hours.'], t, { check: Dk / (p[0] + p[1]), visual: V.motionDiagram('toward', p[0], p[1]) });
  });
  M2[1][1].push(function (r) { // catch up in the same direction
    var v1 = r.int(30, 70), dd = r.int(5, 25), t = r.int(2, 8), gap = dd * t;
    return I('A truck is ' + gap + ' km ahead of a car. Both drive in the same direction. The truck goes ' + v1 + ' km/h and the car goes ' + (v1 + dd) + ' km/h. How many hours until the car catches the truck?', [
      'In the same direction, the gap closes at the difference of the speeds: ' + (v1 + dd) + ' ' + MINUS + ' ' + v1 + ' = ' + dd + ' km/h.', 'Time = ' + gap + ' ÷ ' + dd + ' = ' + t + ' hours.'], t, { check: gap / ((v1 + dd) - v1), visual: V.motionDiagram('chase', v1, v1 + dd) });
  });

  M2[1][2].push(function (r) { // head start
    var dd = r.int(4, 15), m = r.int(2, 5), h = r.int(1, 3), v1 = dd * m, v2 = v1 + dd, t = h * m;
    return I('Alex cycles at ' + v1 + ' km/h. Blake leaves the same spot ' + h + ' hour(s) later and follows the same road at ' + v2 + ' km/h. How many hours after Blake leaves does Blake catch Alex?', [
      'Alex\'s head start: ' + v1 + ' × ' + h + ' = ' + v1 * h + ' km.', 'Blake gains ' + v2 + ' ' + MINUS + ' ' + v1 + ' = ' + dd + ' km every hour.',
      'Time to close the gap: ' + v1 * h + ' ÷ ' + dd + ' = ' + t + ' hours.'], t, { check: v1 * h / (v2 - v1), visual: V.motionDiagram('chase', v1, v2) });
  });
  M2[1][2].push(function (r) { // toward each other with a late start, distance from A
    var p = pick2(r, 30, 80), h = r.int(1, 3), t = r.int(1, 5), Dk = p[0] * h + (p[0] + p[1]) * t, fromA = p[0] * (h + t);
    return I('Towns A and B are ' + Dk + ' km apart. A car leaves A for B at ' + p[0] + ' km/h. ' + h + ' hour(s) later a second car leaves B for A at ' + p[1] + ' km/h. How far from A do the cars meet, in km?', [
      'In ' + h + ' hour(s) the first car covers ' + p[0] * h + ' km, so the gap is ' + Dk + ' ' + MINUS + ' ' + p[0] * h + ' = ' + (Dk - p[0] * h) + ' km.',
      'From then on the gap closes at ' + p[0] + ' + ' + p[1] + ' = ' + (p[0] + p[1]) + ' km/h, which takes ' + (Dk - p[0] * h) + ' ÷ ' + (p[0] + p[1]) + ' = ' + t + ' hours.',
      'The first car has driven ' + (h + t) + ' hours in all: ' + p[0] + ' × ' + (h + t) + ' = ' + fromA + ' km from A.'], fromA, { check: p[0] * (h + (Dk - p[0] * h) / (p[0] + p[1])) });
  });
  M2[1][2].push(function (r) { // speed of the current
    var b, c, d, t1, t2, tries = 0;
    do { b = r.int(10, 30); c = r.int(1, 6); tries++; } while ((c >= b || (b + c) === (b - c)) && tries < 100);
    d = lcm(b + c, b - c) * r.int(1, 2); if (d > 400) d = lcm(b + c, b - c);
    t1 = d / (b + c); t2 = d / (b - c);
    return I('A boat travels ' + d + ' km downstream in ' + t1 + ' hours and takes ' + t2 + ' hours to return upstream. What is the speed of the current, in km/h?', [
      'Downstream speed: ' + d + ' ÷ ' + t1 + ' = ' + d / t1 + ' km/h. Upstream speed: ' + d + ' ÷ ' + t2 + ' = ' + d / t2 + ' km/h.',
      'Downstream is boat + current and upstream is boat ' + MINUS + ' current, so the difference of the two speeds is twice the current.',
      'Current = (' + d / t1 + ' ' + MINUS + ' ' + d / t2 + ') ÷ 2 = ' + c + ' km/h.'], c, { check: c });
  });

  M2[1][3].push(function (r) { // the bird between two trains
    var p = pick2(r, 30, 80), t = r.int(2, 6), vb = r.int(90, 160), Dk = (p[0] + p[1]) * t;
    return I('Two trains are ' + Dk + ' km apart on the same track and drive toward each other at ' + p[0] + ' km/h and ' + p[1] + ' km/h. A bird flies back and forth between them at ' + vb + ' km/h, starting when the trains start, until the trains meet. How far does the bird fly, in km?', [
      'Do not track each back and forth trip. Find how long the bird flies.',
      'The trains close the gap at ' + p[0] + ' + ' + p[1] + ' = ' + (p[0] + p[1]) + ' km/h, so they meet after ' + Dk + ' ÷ ' + (p[0] + p[1]) + ' = ' + t + ' hours.',
      'The bird flies that whole time: ' + vb + ' × ' + t + ' = ' + fmt(vb * t) + ' km.'], vb * t, { check: vb * Dk / (p[0] + p[1]) });
  });
  M2[1][3].push(function (r) { // flying apart
    var trip = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]), m = trip[2] > 20 ? 1 : r.int(1, 4), t = r.int(2, 6);
    if (r.chance()) {
      var s1 = trip[0] * m, s2 = trip[1] * m, dist = trip[2] * m * t;
      return I('Two ships leave the same port at the same time. One sails north at ' + s1 + ' km/h and the other sails east at ' + s2 + ' km/h. How far apart are they after ' + t + ' hours, in km?', [
        'After ' + t + ' hours they have gone ' + s1 * t + ' km north and ' + s2 * t + ' km east. These are the legs of a right triangle.',
        'The legs ' + s1 * t + ' and ' + s2 * t + ' are in the ratio ' + trip[0] + ' : ' + trip[1] + ', the ' + trip.join(', ') + ' triangle, scaled by ' + m * t + '.',
        'Distance apart = ' + trip[2] + ' × ' + m * t + ' = ' + dist + ' km.'], dist, { check: Math.round(Math.sqrt(Math.pow(s1 * t, 2) + Math.pow(s2 * t, 2))) });
    }
    var a = r.int(300, 800), b = r.int(300, 800), tt = r.int(2, 6), va = r.int(40, 90), vb2 = r.int(40, 90), tot = (va + vb2) * tt;
    return I('Two planes take off from the same airport at the same time and fly in opposite directions along a straight line, at ' + va + ' km/h and ' + vb2 + ' km/h. After ' + tt + ' hours, how far apart are they, in km?', [
      'Flying in opposite directions, the gap grows at the sum of the speeds: ' + va + ' + ' + vb2 + ' = ' + (va + vb2) + ' km/h.',
      'Distance apart = ' + (va + vb2) + ' × ' + tt + ' = ' + tot + ' km.'], tot, { check: va * tt + vb2 * tt, visual: V.motionDiagram('apart', va, vb2) });
  });
  M2[1][3].push(function (r) { // variable start times, meeting minute
    var p = pick2(r, 40, 120), h = r.int(3, 15), t = r.int(4, 25), Dm = p[0] * (h + t) + p[1] * t, meet = h + t;
    return I('Ana and Ben live ' + fmt(Dm) + ' m apart on a straight path. Ana starts walking toward Ben\'s house at ' + p[0] + ' m/min. Ben starts walking toward Ana\'s house at ' + p[1] + ' m/min, but ' + h + ' minutes after Ana. How many minutes after Ana starts do they meet?', [
      'In Ben\'s ' + h + ' minute delay Ana walks ' + p[0] + ' × ' + h + ' = ' + p[0] * h + ' m, leaving a gap of ' + fmt(Dm) + ' ' + MINUS + ' ' + p[0] * h + ' = ' + fmt(Dm - p[0] * h) + ' m.',
      'Now both walk and the gap closes at ' + p[0] + ' + ' + p[1] + ' = ' + (p[0] + p[1]) + ' m/min: ' + fmt(Dm - p[0] * h) + ' ÷ ' + (p[0] + p[1]) + ' = ' + t + ' minutes.',
      'Measured from Ana\'s start: ' + h + ' + ' + t + ' = ' + meet + ' minutes.'], meet, { check: h + (Dm - p[0] * h) / (p[0] + p[1]), visual: V.motionDiagram('toward', p[0], p[1]) });
  });
  M2[1][3].push(function (r) { // laps on a circular track
    var v2 = r.int(150, 250), dv = r.int(20, 60), v1 = v2 + dv, Lp = r.pick([300, 400, 500, 600]), T = r.int(20, 60);
    if (r.chance()) {
      var n = Math.floor(T * dv / Lp);
      return I('Two runners start together on a circular track ' + Lp + ' m around and run the same way at ' + v1 + ' m/min and ' + v2 + ' m/min. In ' + T + ' minutes, how many times does the faster runner overtake the slower runner? (Do not count the start.)', [
        'Each minute the faster runner gains ' + v1 + ' ' + MINUS + ' ' + v2 + ' = ' + dv + ' m.', 'An overtake happens each time the gain reaches one full lap, ' + Lp + ' m.',
        'Total gain in ' + T + ' minutes: ' + dv + ' × ' + T + ' = ' + dv * T + ' m. ' + dv * T + ' ÷ ' + Lp + ' = ' + nf(dv * T / Lp, 2, false) + ', so ' + n + ' full laps gained.'], n, { check: Math.floor((v1 * T - v2 * T) / Lp) });
    }
    var m2 = Math.floor(T * (v1 + v2) / Lp);
    return I('Two runners start together on a circular track ' + Lp + ' m around and run in opposite directions at ' + v1 + ' m/min and ' + v2 + ' m/min. In ' + T + ' minutes, how many times do they pass each other? (Do not count the start.)', [
      'Running in opposite directions, they separate along the track at ' + v1 + ' + ' + v2 + ' = ' + (v1 + v2) + ' m/min, and they pass each time their combined distance grows by one lap, ' + Lp + ' m.',
      'Combined distance in ' + T + ' minutes: ' + (v1 + v2) + ' × ' + T + ' = ' + fmt((v1 + v2) * T) + ' m.', fmt((v1 + v2) * T) + ' ÷ ' + Lp + ' = ' + nf((v1 + v2) * T / Lp, 2, false) + ', so they pass ' + m2 + ' times.'], m2, { check: Math.floor(((v1 * T) + (v2 * T)) / Lp) });
  });

  // ---------- m2t2: Percentages from 0.01% to 500% ----------
  var HP = [1, 2, 4, 5, 8, 10, 25, 50, 12500, 15000, 20000, 25000, 30000, 37500, 50000]; // hundredths of a percent
  function bigBase(r, hp) { // base so that hp% of base is a whole number
    var unit = 10000 / gcd(hp, 10000), lo = Math.max(1, Math.ceil(40 / unit));
    return unit * r.int(lo, lo * 4);
  }

  M2[2][1].push(function (r) { // extreme percent of a number
    var hp = r.pick(HP), base = bigBase(r, hp), res = hp * base / 10000, ps = nf(hp / 100, 2, true), dec = nf(hp / 10000, 4, true);
    return I('What is ' + ps + '% of ' + fmt(base) + '?', [
      'Change the percent to a decimal by dividing by 100: ' + ps + '% = ' + dec + '.',
      'Multiply: ' + dec + ' × ' + fmt(base) + ' = ' + fmt(res) + '.',
      'Check the size: ' + (hp < 10000 ? 'less than 1% of the number, so the answer must be tiny compared with ' + fmt(base) + '.' : 'more than 100%, so the answer must be bigger than ' + fmt(base) + '.')], res, { check: base * hp / 10000 });
  });
  M2[2][1].push(function (r) { // what percent is a of b
    var p = r.pick([0.05, 0.2, 0.4, 2.5, 12.5, 37.5, 125, 240, 350, 450]), hp = Math.round(p * 100), b = bigBase(r, hp), a = hp * b / 10000;
    return D('What percent of ' + fmt(b) + ' is ' + fmt(a) + '? Give the number only, without the % sign.', [
      'Write the part over the whole: ' + fmt(a) + ' ÷ ' + fmt(b) + ' = ' + nf(a / b, 5, true) + '.',
      'Multiply by 100 to turn the ratio into a percent: ' + nf(a / b, 5, true) + ' × 100 = ' + nf(p, 2, true) + '.',
      'Size check: ' + (a > b ? 'the part is bigger than the whole, so the percent must be over 100.' : 'the part is much smaller than the whole, so the percent should be small.')], p, 2, true, [a / b, 100 * b / a, p * 10, p / 10], { check: rd(a / b * 100, 2) });
  });
  M2[2][1].push(function (r) { // decimals and fractions to percent
    if (r.chance()) {
      var k = r.int(1, 999), dcm = k / 10000;
      return D('Write ' + nf(dcm, 4, false) + ' as a percent. Give the number only, without the % sign.', ['A percent is a number out of 100, so multiply by 100, which moves the decimal point 2 places right.', nf(dcm, 4, false) + ' × 100 = ' + nf(k / 100, 2, true) + '.'], k / 100, 2, true, [k / 10, k / 1000, k], { check: rd(k / 100, 2) });
    }
    var d = r.pick([8, 16, 20, 25, 40, 50, 80, 200]), n = r.int(1, 3 * d - 1); while (gcd(n, d) !== 1 && n < 3 * d - 1) n++;
    var p = 100 * n / d;
    return D('Write ' + fr(n, d) + ' as a percent. Give the number only, without the % sign.', [
      'Divide: ' + n + ' ÷ ' + d + ' = ' + nf(n / d, 5, true) + '.', 'Multiply by 100: ' + nf(n / d, 5, true) + ' × 100 = ' + nf(p, 2, true) + '.',
      'Shortcut: 100 ÷ ' + d + ' = ' + nf(100 / d, 3, true) + ' percent per ' + fr(1, d) + ', so ' + n + ' × ' + nf(100 / d, 3, true) + ' = ' + nf(p, 2, true) + '.'], p, 2, true, [n / d, p / 10, 100 * d / n], { check: rd(100 * n / d, 2) });
  });

  M2[2][2].push(function (r) { // reverse percentage
    var p = 5 * r.int(2, 14), orig = 20 * r.int(2, 40), up = r.chance(), X = up ? orig * (100 + p) / 100 : orig * (100 - p) / 100;
    return D('After a ' + p + '% ' + (up ? 'increase' : 'decrease') + ', the price of a bike is $' + nf(X, 2, false) + '. What was the price before the change?', [
      'The new price is ' + (100 + (up ? p : -p)) + '% of the old price, so ' + (100 + (up ? p : -p)) + '% × old = ' + nf(X, 2, false) + '.',
      'Divide by the multiplier: old = ' + nf(X, 2, false) + ' ÷ ' + nf((100 + (up ? p : -p)) / 100, 2, false) + '.', 'old = ' + money(orig) + '.',
      'Common trap: taking ' + p + '% of the new price and undoing it gives the wrong answer, because the ' + p + '% was of the old price.'], orig, 2, false, [up ? X * (100 - p) / 100 : X * (100 + p) / 100, up ? X - X * p / 100 : X + X * p / 100], { check: rd(X / ((100 + (up ? p : -p)) / 100), 2) });
  });
  M2[2][2].push(function (r) { // percent of a percent
    var g = r.pick([20, 30, 40, 60]), cg = r.pick([10, 20, 25, 50]), cb = r.pick([10, 20, 25, 40]), N = 100 * r.int(1, 6), girls = N * g / 100, boys = N - girls, tot = girls * cg / 100 + boys * cb / 100;
    return I('A school has ' + N + ' students. ' + g + '% are girls. ' + cg + '% of the girls and ' + cb + '% of the boys play chess. How many students play chess?', [
      'Girls: ' + g + '% of ' + N + ' = ' + girls + '. Boys: ' + N + ' ' + MINUS + ' ' + girls + ' = ' + boys + '.',
      'Girls who play chess: ' + cg + '% of ' + girls + ' = ' + girls * cg / 100 + '. Boys who play chess: ' + cb + '% of ' + boys + ' = ' + boys * cb / 100 + '.',
      'Total: ' + girls * cg / 100 + ' + ' + boys * cb / 100 + ' = ' + tot + '.'], tot, { check: N * g / 100 * cg / 100 + N * (100 - g) / 100 * cb / 100 });
  });
  M2[2][2].push(function (r) { // percent more or less
    var b = r.pick([8, 16, 20, 25, 40, 50, 80]), a; do { a = r.int(Math.ceil(b / 2), 3 * b); } while (a === b);
    var more = a > b, pct = 100 * Math.abs(a - b) / b;
    return D('By what percent is ' + a + ' ' + (more ? 'greater' : 'less') + ' than ' + b + '? Give the number only, without the % sign.', [
      'The comparison is against ' + b + ', so ' + b + ' is the 100% base.', 'Difference: ' + Math.abs(a - b) + '.',
      'Percent = ' + Math.abs(a - b) + ' ÷ ' + b + ' × 100 = ' + nf(pct, 2, true) + '.', 'A frequent mistake is dividing by ' + a + ' instead of ' + b + '.'], pct, 2, true, [100 * Math.abs(a - b) / a, 100 * a / b, pct / 10], { check: rd(Math.abs(a - b) / b * 100, 2) });
  });
  M2[2][2].push(function (r) { // find the whole from a tiny or huge percent
    var hp = r.pick([2, 4, 5, 8, 20, 40, 250, 12500, 25000]), N = bigBase(r, hp), k = hp * N / 10000, ps = nf(hp / 100, 2, true);
    return I('If ' + ps + '% of a number is ' + fmt(k) + ', what is the number?', [
      ps + '% of the number is ' + fmt(k) + ', so 1% of the number is ' + fmt(k) + ' ÷ ' + ps + ' = ' + nf(k / (hp / 100), 4, true) + '.', 'The whole number is 100% of it: ' + nf(k / (hp / 100), 4, true) + ' × 100 = ' + fmt(N) + '.'], N, { check: Math.round(k * 10000 / hp) });
  });

  M2[2][3].push(function (r) { // up p% then down q% back to the start
    var up = [25, 60, 100, 150, 300, 400, 900], p = r.pick(up), q = 100 * p / (100 + p);
    if (r.chance()) {
      return D('A price is increased by ' + p + '% and then decreased by a certain percent, which returns it exactly to the original price. By what percent was it decreased? Give the number only.', [
        'Increasing by ' + p + '% multiplies by ' + nf(1 + p / 100, 2, true) + '. To get back to 1, the second multiplier must be 1 ÷ ' + nf(1 + p / 100, 2, true) + ' = ' + nf(1 / (1 + p / 100), 4, true) + '.',
        'That multiplier is ' + nf(100 - q, 2, true) + '% of the new price, so the decrease is 100 ' + MINUS + ' ' + nf(100 - q, 2, true) + ' = ' + nf(q, 2, true) + '%.',
        'Shortcut: q = 100p ÷ (100 + p) = ' + 100 * p + ' ÷ ' + (100 + p) + ' = ' + nf(q, 2, true) + '. Note it is not ' + p + '.'], q, 2, true, [p, 100 - p, p / 2], { check: rd(100 * p / (100 + p), 2) });
    }
    return D('A price is decreased by ' + nf(q, 2, true) + '% and then increased by a certain percent, which returns it exactly to the original price. By what percent was it increased? Give the number only.', [
      'Decreasing by ' + nf(q, 2, true) + '% multiplies by ' + nf(1 - q / 100, 4, true) + '. The increase must multiply by the reciprocal, 1 ÷ ' + nf(1 - q / 100, 4, true) + ' = ' + nf(1 + p / 100, 2, true) + '.',
      'A multiplier of ' + nf(1 + p / 100, 2, true) + ' is an increase of ' + p + '%.', 'Shortcut: p = 100q ÷ (100 ' + MINUS + ' q) = ' + nf(100 * q, 2, true) + ' ÷ ' + nf(100 - q, 2, true) + ' = ' + p + '.'], p, 2, true, [q, 100 - q, q / 2], { check: p });
  });
  M2[2][3].push(function (r) { // area after length up, width down
    var a = r.int(10, 200), b = r.int(5, 60), val = (100 + a) * (100 - b) / 100;
    return D('The length of a rectangle is increased by ' + a + '% and its width is decreased by ' + b + '%. The new area is what percent of the original area? Give the number only.', [
      'Use multipliers. Length: ' + nf(1 + a / 100, 2, true) + '. Width: ' + nf(1 - b / 100, 2, true) + '.', 'Area multiplier: ' + nf(1 + a / 100, 2, true) + ' × ' + nf(1 - b / 100, 2, true) + ' = ' + nf(val / 100, 4, true) + '.',
      'As a percent: ' + nf(val, 2, true) + '% of the original. The changes do not simply add or cancel.'], val, 2, true, [100 + a - b, 100 - b + a / 2, (100 + a) * (100 + b) / 100], { check: rd((1 + a / 100) * (1 - b / 100) * 100, 2) });
  });
  var PCS = [4, 5, 8, 10, 20, 25, 40, 50];
  M2[2][3].push(function (r) { // marbles: add blue until red is q%
    var pq = pick2(r, 0, PCS.length - 1), p = Math.max(PCS[pq[0]], PCS[pq[1]]), q = Math.min(PCS[pq[0]], PCS[pq[1]]);
    var pR = p / gcd(p, 100), qR = q / gcd(q, 100), R = lcm(pR, qR) * r.int(1, 6), T1 = 100 * R / p, T2 = 100 * R / q;
    return I('A jar has red and blue marbles. ' + p + '% of the marbles are red, and there are ' + R + ' red marbles. How many blue marbles must be added so that red marbles are ' + q + '% of all the marbles?', [
      'The number of red marbles stays ' + R + '. Currently ' + R + ' is ' + p + '% of the total, so the total is ' + R + ' ÷ ' + fr(p, 100) + ' = ' + T1 + '.',
      'After adding blue marbles, ' + R + ' must be ' + q + '% of the new total, so the new total is ' + R + ' ÷ ' + fr(q, 100) + ' = ' + T2 + '.',
      'Blue marbles added = new total ' + MINUS + ' old total = ' + T2 + ' ' + MINUS + ' ' + T1 + ' = ' + (T2 - T1) + '.'], T2 - T1, { check: 100 * R / q - 100 * R / p });
  });

  // ---------- m2t3: Successive markdowns, taxes and interest ----------
  M2[3][1].push(function (r) { // sale price
    var P = r.int(20, 300), x = 5 * r.int(2, 12), sale = P * (100 - x) / 100;
    return D('A jacket costs $' + P + '. It is on sale for ' + x + '% off. What is the sale price?', [
      'Discount: ' + x + '% of ' + P + ' = ' + nf(P * x / 100, 2, false) + '.', 'Sale price = ' + P + ' ' + MINUS + ' ' + nf(P * x / 100, 2, false) + ' = ' + money(sale) + '.',
      'Shortcut: pay ' + (100 - x) + '% directly, ' + P + ' × ' + nf((100 - x) / 100, 2, false) + ' = ' + money(sale) + '.'], sale, 2, false, [P - x, P * x / 100, P * (100 + x) / 100], { check: rd(P * (1 - x / 100), 2) });
  });
  M2[3][1].push(function (r) { // GST and PST
    var P = r.int(20, 400), tot = P * 112 / 100;
    return D('A game costs $' + P + ' before tax. In British Columbia, GST is 5% and PST is 7%, and both are calculated on the price before tax. What is the total price including both taxes?', [
      'Both taxes use the same base, so add the rates: 5% + 7% = 12%.', 'Tax: 12% of ' + P + ' = ' + nf(P * 0.12, 2, false) + '.', 'Total: ' + P + ' + ' + nf(P * 0.12, 2, false) + ' = ' + money(tot) + '.'], tot, 2, false, [P * 1.05 * 1.07, P * 1.12 + 5, P * 1.07], { check: rd(P * 1.05 + P * 0.07, 2) });
  });
  M2[3][1].push(function (r) { // simple interest
    var P = 200 * r.int(1, 25), rate = r.pick([2.5, 3, 4, 4.5, 5, 6]), t = r.int(2, 6), it = P * rate * t / 100;
    return D('$' + fmt(P) + ' is invested at ' + nf(rate, 1, true) + '% simple interest per year for ' + t + ' years. How much interest is earned?', [
      'Simple interest is the same amount each year: ' + nf(rate, 1, true) + '% of ' + fmt(P) + ' = ' + money(P * rate / 100) + ' per year.', 'Over ' + t + ' years: ' + money(P * rate / 100) + ' × ' + t + ' = ' + money(it) + '.'], it, 2, false, [P * rate / 100, P + it, P * rate * t], { check: rd(P * (rate / 100) * t, 2) });
  });

  M2[3][2].push(function (r) { // up a% then down b%
    var k = r.int(1, 9), P = 100 * k, a = r.int(5, 60), b = r.int(5, 50), fin = P * (100 + a) * (100 - b) / 10000, mid = P * (100 + a) / 100;
    return D('A price of $' + P + ' is increased by ' + a + '% and then the new price is decreased by ' + b + '%. What is the final price?', [
      'After the increase: ' + P + ' × ' + nf(1 + a / 100, 2, true) + ' = ' + money(mid) + '.', 'After the decrease of ' + b + '% (the base is now ' + money(mid) + '): ' + money(mid) + ' × ' + nf(1 - b / 100, 2, true) + ' = ' + money(fin) + '.',
      'Shortcut: multiply the two multipliers, ' + nf(1 + a / 100, 2, true) + ' × ' + nf(1 - b / 100, 2, true) + ' = ' + nf((1 + a / 100) * (1 - b / 100), 4, true) + ', then apply it to ' + P + '.'], fin, 2, false, [P * (1 + (a - b) / 100), P, mid - P * b / 100 * 1], { check: rd(P * (1 + a / 100) * (1 - b / 100), 2) });
  });
  M2[3][2].push(function (r) { // single equivalent discount
    var p = pick2(r, 5, 60), x = p[0], y = p[1], eq = 100 - (100 - x) * (100 - y) / 100;
    return D('A store takes ' + x + '% off every item, and then takes a further ' + y + '% off the reduced price. This is the same as a single discount of what percent? Give the number only.', [
      'Multipliers: ' + nf(1 - x / 100, 2, true) + ' for the first discount and ' + nf(1 - y / 100, 2, true) + ' for the second.', 'Together: ' + nf(1 - x / 100, 2, true) + ' × ' + nf(1 - y / 100, 2, true) + ' = ' + nf((100 - x) * (100 - y) / 10000, 4, true) + '.',
      'The customer pays ' + nf((100 - x) * (100 - y) / 100, 2, true) + '% of the original, so the single discount is 100 ' + MINUS + ' ' + nf((100 - x) * (100 - y) / 100, 2, true) + ' = ' + nf(eq, 2, true) + '%.', 'It is less than ' + (x + y) + ' because the second discount applies to a smaller price.'], eq, 2, true, [x + y, (x + y) / 2, Math.abs(x - y)], { check: rd(100 * (1 - (1 - x / 100) * (1 - y / 100)), 2) });
  });
  M2[3][2].push(function (r) { // compound interest
    var P, rate, n, tries = 0;
    do { P = r.pick([500, 1000, 2000, 2500, 4000, 5000]); rate = r.pick([2, 3, 4, 5, 6, 8, 10]); n = r.pick([2, 3]); tries++; } while (((P * 100 * Math.pow(100 + rate, n)) % Math.pow(10, 2 * n) !== 0) && tries < 500);
    var A = P * Math.pow(1 + rate / 100, n), y1 = P * (100 + rate) / 100, y2 = y1 * (100 + rate) / 100, steps = ['Each year multiply by ' + nf(1 + rate / 100, 2, false) + '.', 'After year 1: $' + nf(y1, 4, true) + '. After year 2: $' + nf(y2, 4, true) + '.'];
    if (n === 3) steps.push('After year 3: $' + nf(A, 4, true) + '.'); steps.push('Amount = ' + money(A) + ', so the interest is more than simple interest, which would give ' + money(P * (1 + rate * n / 100)) + '.');
    return D('$' + fmt(P) + ' is invested at ' + rate + '% interest per year, compounded annually. What is the amount after ' + n + ' years?', steps, A, 2, false, [P * (1 + rate * n / 100), P * (1 + rate / 100), P * Math.pow(1 + rate / 100, n + 1)], { check: rd(P * Math.pow((100 + rate) / 100, n), 2) });
  });
  M2[3][2].push(function (r) { // savings from a sale price
    var x = r.pick([10, 20, 25, 30, 40, 50, 60, 75]), orig = 20 * r.int(3, 30), sale = orig * (100 - x) / 100, saved = orig - sale;
    return D('A pair of shoes is on sale for $' + nf(sale, 2, false) + ' after a ' + x + '% discount. How many dollars does the discount save?', [
      'The sale price is ' + (100 - x) + '% of the original, so ' + nf(sale, 2, false) + ' ÷ ' + nf((100 - x) / 100, 2, false) + ' = ' + money(orig) + ' was the original price.', 'Savings: ' + money(orig) + ' ' + MINUS + ' ' + money(sale) + ' = ' + money(saved) + '.',
      'Shortcut: savings = sale × ' + fr(x, 100 - x) + ' = ' + money(saved) + '.'], saved, 2, false, [sale * x / 100, orig, sale + saved * 0.5], { check: rd(orig * x / 100, 2) });
  });

  M2[3][3].push(function (r) { // profit after markup and discount
    var p, q; do { p = r.pick([40, 50, 60, 80, 100]); q = r.pick([10, 20, 25, 30]); } while ((100 + p) * (100 - q) <= 10000);
    var prof = (100 + p) * (100 - q) / 100 - 100;
    return D('A shop marks up the cost of a coat by ' + p + '% to get the tag price. In a sale it sells the coat at ' + q + '% off the tag price. What is the shop\'s profit as a percent of its cost? Give the number only.', [
      'Let the cost be 100. Tag price: 100 × ' + nf(1 + p / 100, 2, true) + ' = ' + (100 + p) + '.', 'Sale price: ' + (100 + p) + ' × ' + nf(1 - q / 100, 2, true) + ' = ' + nf((100 + p) * (100 - q) / 100, 2, true) + '.',
      'Profit = ' + nf((100 + p) * (100 - q) / 100, 2, true) + ' ' + MINUS + ' 100 = ' + nf(prof, 2, true) + ', which is ' + nf(prof, 2, true) + '% of the cost.', 'Trap: ' + p + ' ' + MINUS + ' ' + q + ' = ' + (p - q) + ' is wrong because the two percents have different bases.'], prof, 2, true, [p - q, p - q / 2, q], { check: rd(100 * ((1 + p / 100) * (1 - q / 100) - 1), 2) });
  });
  M2[3][3].push(function (r) { // years to reach a multiple
    var rate = r.pick([10, 15, 20, 25, 30, 50]), m = r.pick([2, 3]), n = 0, f = 1, tbl = [];
    while (f <= m) { f *= 1 + rate / 100; n++; tbl.push(n + ': ' + nf(f, 3, true)); if (n > 30) break; }
    return I('A town\'s population grows by ' + rate + '% each year. After how many whole years will it first be more than ' + m + ' times today\'s population?', [
      'Each year multiplies the population by ' + nf(1 + rate / 100, 2, true) + '.', 'Compute the growth factor year by year (year: factor): ' + tbl.join(', ') + '.',
      'The factor first passes ' + m + ' in year ' + n + '.', 'Percent growth compounds, so it takes fewer years than ' + nf(100 * (m - 1) / rate, 1, true) + ', which is what simple (non compounding) growth would need.'], n, { check: (function () { var k = 0, g = 1; while (g <= m) { g *= 1 + rate / 100; k++; } return k; })() });
  });
  M2[3][3].push(function (r) { // undo a markup and a discount
    var P = 100 * r.int(1, 8), p = r.pick([10, 20, 25, 30, 40, 50]), d = r.pick([10, 20, 25, 30, 40]), fin = P * (100 + p) * (100 - d) / 10000;
    return D('A store raises the price of a jacket by ' + p + '%, and later discounts the new price by ' + d + '%. The final price is $' + nf(fin, 2, false) + '. What was the price before the increase?', [
      'Total multiplier: ' + nf(1 + p / 100, 2, true) + ' × ' + nf(1 - d / 100, 2, true) + ' = ' + nf((100 + p) * (100 - d) / 10000, 4, true) + '.', 'Original = final ÷ multiplier = ' + nf(fin, 2, false) + ' ÷ ' + nf((100 + p) * (100 - d) / 10000, 4, true) + ' = ' + money(P) + '.',
      'Check: ' + money(P) + ' → ' + money(P * (100 + p) / 100) + ' → ' + money(fin) + '.'], P, 2, false, [fin * (1 - p / 100 + d / 100), fin / (1 + p / 100), fin / (1 - d / 100)], { check: rd(fin / ((1 + p / 100) * (1 - d / 100)), 2) });
  });

  // ---------- m2t4: Mixture and solution puzzles ----------
  M2[4][1].push(function (r) { // cost of a mixture
    var a, b, x, y, tries = 0;
    do { a = r.int(1, 8); b = r.int(1, 8); x = 5 * r.int(40, 300); y = 5 * r.int(40, 300); tries++; } while ((x === y || (a * x + b * y) % (a + b) !== 0) && tries < 5000);
    var c = (a * x + b * y) / (a + b) / 100;
    return D('A shop mixes ' + a + ' kg of nuts costing $' + nf(x / 100, 2, false) + ' per kg with ' + b + ' kg of nuts costing $' + nf(y / 100, 2, false) + ' per kg. What is the cost per kg of the mixture?', [
      'Total cost: ' + a + ' × ' + nf(x / 100, 2, false) + ' + ' + b + ' × ' + nf(y / 100, 2, false) + ' = ' + money((a * x + b * y) / 100) + '.', 'Total mass: ' + a + ' + ' + b + ' = ' + (a + b) + ' kg.',
      'Cost per kg = ' + money((a * x + b * y) / 100) + ' ÷ ' + (a + b) + ' = ' + money(c) + '.', 'The answer must sit between the two prices, closer to the one with more kilograms.'], c, 2, false, [(x + y) / 200, (x / 100 * a + y / 100 * b) / 2, (x / 100 + y / 100) * (a + b) / 2], { check: rd((a * x + b * y) / (a + b) / 100, 2) });
  });
  M2[4][1].push(function (r) { // water in a solution
    var m = 20 * r.int(3, 30), p = 5 * r.int(2, 16), water = m * (100 - p) / 100;
    return I('A ' + m + ' g solution is ' + p + '% salt by mass and the rest is water. How many grams of water are in it?', [
      'The water is ' + (100 - p) + '% of the solution.', (100 - p) + '% of ' + m + ' = ' + m + ' × ' + nf((100 - p) / 100, 2, false) + ' = ' + water + ' g.', 'Check: salt is ' + m * p / 100 + ' g, and ' + m * p / 100 + ' + ' + water + ' = ' + m + '.'], water, { check: m - m * p / 100 });
  });
  M2[4][1].push(function (r) { // concentrate to water ratio
    var a = r.int(1, 5), b = r.int(2, 9), tot = (a + b) * r.int(2, 9);
    return I('Juice concentrate and water are mixed in the ratio ' + a + ' : ' + b + '. How many litres of concentrate are needed to make ' + tot + ' litres of juice?', [
      'The ratio ' + a + ' : ' + b + ' has ' + a + ' + ' + b + ' = ' + (a + b) + ' equal parts.', 'One part is ' + tot + ' ÷ ' + (a + b) + ' = ' + tot / (a + b) + ' litres.', 'Concentrate: ' + a + ' × ' + tot / (a + b) + ' = ' + a * tot / (a + b) + ' litres.'], a * tot / (a + b), { check: tot * a / (a + b), visual: V.tapeDiagram(a, b) });
  });

  M2[4][2].push(function (r) { // milk in the combined mixture
    var a = r.int(1, 5), b = r.int(1, 5), c = r.int(1, 5), d = r.int(1, 5), _fix = (function () { while (a * d === b * c) { c = r.int(1, 5); } })(), x = (a + b) * r.int(1, 6), y = (c + d) * r.int(1, 6), milk = x * a / (a + b) + y * c / (c + d);
    return I('Container A holds milk and water in the ratio ' + a + ' : ' + b + '. Container B holds milk and water in the ratio ' + c + ' : ' + d + '. A chef pours ' + x + ' litres from A and ' + y + ' litres from B into a bowl. How many litres of milk are in the bowl?', [
      'Milk fraction in A: ' + fr(a, a + b) + '. Milk from A: ' + x + ' × ' + fr(a, a + b) + ' = ' + x * a / (a + b) + ' L.', 'Milk fraction in B: ' + fr(c, c + d) + '. Milk from B: ' + y + ' × ' + fr(c, c + d) + ' = ' + y * c / (c + d) + ' L.',
      'Total milk: ' + x * a / (a + b) + ' + ' + y * c / (c + d) + ' = ' + milk + ' L. Do not add the ratios directly.'], milk, { check: (x * a) / (a + b) + (y * c) / (c + d) });
  });
  M2[4][2].push(function (r) { // ratio of the combined mixture
    var a = r.int(1, 5), b = r.int(1, 5), c = r.int(1, 5), d = r.int(1, 5), _fix = (function () { while (a * d === b * c) { c = r.int(1, 5); } })(), x = (a + b) * r.int(1, 6), y = (c + d) * r.int(1, 6);
    var M = x * a / (a + b) + y * c / (c + d), W = x + y - M, g = gcd(M, W), ans = (M / g) + ' : ' + (W / g);
    var opts = [ans, (W / g) + ' : ' + (M / g), (a + c) + ' : ' + (b + d), x + ' : ' + y, M + ' : ' + (x + y)].filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    var extra = 1; while (opts.length < 4) opts.push((M / g + extra) + ' : ' + (W / g)), extra++;
    return TX('Container A holds milk and water in the ratio ' + a + ' : ' + b + '. Container B holds milk and water in the ratio ' + c + ' : ' + d + '. ' + x + ' litres from A and ' + y + ' litres from B are poured into one bowl. What is the ratio of milk to water in the bowl?', [
      'Milk from A: ' + x + ' × ' + fr(a, a + b) + ' = ' + x * a / (a + b) + ' L. Milk from B: ' + y + ' × ' + fr(c, c + d) + ' = ' + y * c / (c + d) + ' L. Milk total: ' + M + ' L.', 'The bowl holds ' + (x + y) + ' L, so water is ' + (x + y) + ' ' + MINUS + ' ' + M + ' = ' + W + ' L.', 'Ratio milk : water = ' + M + ' : ' + W + ' = ' + ans + ' in lowest terms.'], ans, { options: r.shuffle(opts.slice(0, 5)), check: ans });
  });
  M2[4][2].push(function (r) { // alligation: how much of the weaker solution
    var trip, tries = 0, p1, pt, p2, V2, x;
    do { p1 = 5 * r.int(1, 10); pt = p1 + 5 * r.int(1, 8); p2 = pt + 5 * r.int(1, 8); tries++; } while ((p2 > 95 || pt >= p2) && tries < 500);
    var g = gcd(pt - p1, p2 - pt); V2 = (pt - p1) / g * r.int(1, 5) * 2; x = V2 * (p2 - pt) / (pt - p1);
    return I('How many litres of a ' + p1 + '% acid solution must be added to ' + V2 + ' litres of a ' + p2 + '% acid solution to make a ' + pt + '% acid solution?', [
      'Compare each solution with the target ' + pt + '%. The weaker solution is ' + (pt - p1) + ' points below, and the stronger one is ' + (p2 - pt) + ' points above.',
      'The amounts must balance the points, so amount of ' + p1 + '% : amount of ' + p2 + '% = ' + (p2 - pt) + ' : ' + (pt - p1) + '.', 'The ' + p2 + '% solution is ' + V2 + ' L, so the ' + p1 + '% amount is ' + V2 + ' × ' + fr(p2 - pt, pt - p1) + ' = ' + x + ' L.',
      'Check the acid: ' + x + ' × ' + nf(p1 / 100, 2, true) + ' + ' + V2 + ' × ' + nf(p2 / 100, 2, true) + ' = ' + nf(x * p1 / 100 + V2 * p2 / 100, 2, true) + ' L in ' + (x + V2) + ' L, which is ' + pt + '%.'], x, { check: V2 * (p2 - pt) / (pt - p1) });
  });
  M2[4][2].push(function (r) { // ratio changes when more is added
    var a, b, c, d, k, n, tries = 0;
    do { a = r.int(1, 6); b = r.int(1, 6); c = r.int(1, 8); d = r.int(1, 8); k = r.int(2, 20); n = k * (c * b - d * a) / d; tries++; } while ((gcd(a, b) !== 1 || gcd(c, d) !== 1 || c * b <= d * a || !Number.isInteger(n) || n <= 0) && tries < 20000);
    if (!(Number.isInteger(n) && n > 0)) { a = 2; b = 3; c = 1; d = 1; k = 4; n = 4; }
    var tot = (a + b) * k;
    return I('A bag has red and blue counters in the ratio ' + a + ' : ' + b + '. After ' + n + ' more red counters are added, the ratio of red to blue is ' + c + ' : ' + d + '. How many counters were in the bag at the start?', [
      'Blue counters do not change. Write red = ' + a + 'k and blue = ' + b + 'k.', 'After adding ' + n + ' red: (' + a + 'k + ' + n + ') ÷ ' + b + 'k = ' + fr(c, d) + '.',
      'Cross multiply: ' + d + '(' + a + 'k + ' + n + ') = ' + c + ' × ' + b + 'k, so ' + d * a + 'k + ' + d * n + ' = ' + c * b + 'k.', (c * b - d * a) + 'k = ' + d * n + ', so k = ' + k + '.', 'Start total = (' + a + ' + ' + b + ') × ' + k + ' = ' + tot + ' counters.'], tot, { check: (a + b) * (d * n / (c * b - d * a)) });
  });

  M2[4][3].push(function (r) { // dilute or evaporate to reach a concentration
    var i = pick2(r, 0, PCS.length - 1), p = PCS[i[0]], q = PCS[i[1]], pR = p / gcd(p, 100), qR = q / gcd(q, 100), A = lcm(pR, qR) * r.int(1, 8), T1 = 100 * A / p, T2 = 100 * A / q;
    if (q < p) {
      return I('A ' + T1 + ' litre mixture of acid and water is ' + p + '% acid. How many litres of water must be added to make it ' + q + '% acid?', [
        'Adding water changes the total, but not the amount of acid. Acid now: ' + p + '% of ' + T1 + ' = ' + A + ' L.', 'That acid must be ' + q + '% of the new total: new total = ' + A + ' ÷ ' + nf(q / 100, 2, true) + ' = ' + T2 + ' L.', 'Water added = ' + T2 + ' ' + MINUS + ' ' + T1 + ' = ' + (T2 - T1) + ' L.'], T2 - T1, { check: 100 * A / q - 100 * A / p });
    }
    return I('A ' + T1 + ' litre mixture of salt and water is ' + p + '% salt. How many litres of water must evaporate to make it ' + q + '% salt?', [
      'Evaporation removes only water, so the salt stays. Salt now: ' + p + '% of ' + T1 + ' = ' + A + ' L.', 'That salt must be ' + q + '% of the new total: new total = ' + A + ' ÷ ' + nf(q / 100, 2, true) + ' = ' + T2 + ' L.', 'Water evaporated = ' + T1 + ' ' + MINUS + ' ' + T2 + ' = ' + (T1 - T2) + ' L.'], T1 - T2, { check: 100 * A / p - 100 * A / q });
  });
  M2[4][3].push(function (r) { // repeated replacement with water
    var k = r.pick([4, 5, 10]), m = r.int(1, 6), Vt = k * k * m, x = Vt / k, juice = m * (k - 1) * (k - 1);
    return I('A tank holds ' + Vt + ' litres of pure juice. ' + x + ' litres are drained and replaced with water. Then ' + x + ' litres of the mixture are drained and replaced with water again. How many litres of juice remain in the tank?', [
      'Each draining removes the same fraction of whatever juice is there: ' + x + ' ÷ ' + Vt + ' = ' + fr(1, k) + '. So the juice left after each step is ' + fr(k - 1, k) + ' of what it was.',
      'After two steps: ' + Vt + ' × ' + fr(k - 1, k) + ' × ' + fr(k - 1, k) + '.', 'Cancel early: ' + Vt + ' ÷ ' + k * k + ' = ' + m + ', then ' + m + ' × ' + (k - 1) + ' × ' + (k - 1) + ' = ' + juice + ' litres.', 'Not ' + (Vt - 2 * x) + ', because the second draining also removes some water.'], juice, { check: Vt * Math.pow((k - 1) / k, 2) });
  });
  M2[4][3].push(function (r) { // adding pure acid
    var T, p, x, A, tries = 0;
    do { T = 10 * r.int(2, 12); p = 5 * r.int(1, 10); x = 5 * r.int(1, 12); A = T * p / 100; tries++; } while (((A + x) * 10000) % (T + x) !== 0 && tries < 5000);
    var pct = (A + x) * 100 / (T + x);
    return D('A ' + T + ' litre mixture is ' + p + '% acid. Then ' + x + ' litres of pure acid are added. What percent acid is the new mixture? Give the number only.', [
      'Acid at the start: ' + p + '% of ' + T + ' = ' + A + ' L.', 'After adding pure acid, both the acid and the total go up by ' + x + ': acid ' + (A + x) + ' L in a total of ' + (T + x) + ' L.',
      'Percent acid = ' + (A + x) + ' ÷ ' + (T + x) + ' × 100 = ' + nf(pct, 2, true) + '.'], pct, 2, true, [p + x, (p + pct) / 2, x * 100 / (T + x)], { check: rd((T * p / 100 + x) / (T + x) * 100, 2) });
  });

  /* ==================================================================
     MODULE 3 GENERATORS
  ================================================================== */
  var M3 = [0, 1, 2, 3, 4].map(function () { return { 1: [], 2: [], 3: [] }; });
  function pt(x, y) { return '(' + fmt(x) + ', ' + fmt(y) + ')'; }
  function nz(r, lo, hi) { var v; do { v = r.int(lo, hi); } while (v === 0); return v; }
  function sgn(n) { return n < 0 ? MINUS + ' ' + Math.abs(n) : '+ ' + n; }

  // ---------- m3t0: Expressions, evaluation and coordinates ----------
  M3[0][1].push(function (r) { // writing an expression
    var fee = r.int(2, 9), rate = r.pick([1.5, 2, 2.5, 3, 4]); while (fee === rate) fee = r.int(2, 9); var rs = nf(rate, 1, true), ans = fee + ' + ' + rs + 'n';
    var opts = [ans, rs + ' + ' + fee + 'n', (fee + rate) + 'n', fee + ' × ' + rs + 'n'];
    return TX('A taxi charges $' + fee + ' to start and $' + rs + ' for each kilometre. Which expression gives the cost, in dollars, of a trip of n kilometres?', [
      'The starting fee is paid once, so it is a constant term: ' + fee + '.', 'The per kilometre charge depends on n: ' + rs + ' dollars times n kilometres = ' + rs + 'n.', 'Add the two parts: ' + ans + '. Test with n = 2: ' + fee + ' + ' + nf(rate * 2, 1, true) + ' = ' + nf(fee + rate * 2, 1, true) + ', which matches a 2 km trip.'], ans, { options: r.shuffle(opts), check: ans });
  });
  M3[0][1].push(function (r) { // solving a phone plan
    var a = r.int(10, 30), b = r.int(2, 9), g = r.int(3, 25), T = a + b * g;
    return I('A phone plan costs $' + a + ' per month plus $' + b + ' for each GB of data. Mia\'s bill was $' + T + '. How many GB did she use?', [
      'Write the bill as an expression: ' + a + ' + ' + b + 'g = ' + T + '.', 'Subtract the fixed fee: ' + b + 'g = ' + T + ' ' + MINUS + ' ' + a + ' = ' + (T - a) + '.', 'Divide: g = ' + (T - a) + ' ÷ ' + b + ' = ' + g + ' GB.'], g, { check: (T - a) / b });
  });
  M3[0][1].push(function (r) { // transformations of a point
    var a = nz(r, -8, 8), b = nz(r, -8, 8); while (Math.abs(a) === Math.abs(b)) b = nz(r, -8, 8);
    var kind = r.pick(['x', 'y', 'o']), res = kind === 'x' ? [a, -b] : kind === 'y' ? [-a, b] : [-a, -b];
    var words = { x: 'reflected in the x axis', y: 'reflected in the y axis', o: 'rotated 180° about the origin' };
    var all = [[a, -b], [-a, b], [-a, -b], [b, a]], ans = pt(res[0], res[1]), opts = all.map(function (p) { return pt(p[0], p[1]); });
    var how = { x: 'The x coordinate stays the same and the y coordinate changes sign.', y: 'The y coordinate stays the same and the x coordinate changes sign.', o: 'Both coordinates change sign.' };
    return TX('The point P ' + pt(a, b) + ' is ' + words[kind] + '. What are the coordinates of its image?', ['Reflection or rotation rules: ' + how[kind], 'Apply it to ' + pt(a, b) + ': the image is ' + ans + '.'], ans, { options: r.shuffle(opts), check: ans, visual: V.coordinatePlane([[a, b]]) });
  });
  M3[0][1].push(function (r) { // which quadrant
    var a = nz(r, -9, 9), b = nz(r, -9, 9), q = a > 0 && b > 0 ? 'Quadrant I' : a < 0 && b > 0 ? 'Quadrant II' : a < 0 && b < 0 ? 'Quadrant III' : 'Quadrant IV';
    return TX('In which quadrant is the point ' + pt(a, b) + '?', ['The first number is the x coordinate: ' + fmt(a) + ' means ' + (a > 0 ? 'right' : 'left') + ' of the y axis. The second is the y coordinate: ' + fmt(b) + ' means ' + (b > 0 ? 'above' : 'below') + ' the x axis.', 'Right and above is Quadrant I, left and above is II, left and below is III, right and below is IV. So the point is in ' + q + '.'], q, { options: ['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV'], check: q, visual: V.coordinatePlane([[a, b]]) });
  });
  M3[0][1].push(function (r) { // rectangle on the grid
    var x1 = r.int(-9, -1), x2 = r.int(1, 9), y1 = r.int(-8, -1), y2 = r.int(1, 8), w = x2 - x1, h = y2 - y1;
    return I('A rectangle has vertices ' + pt(x1, y1) + ', ' + pt(x2, y1) + ', ' + pt(x2, y2) + ' and ' + pt(x1, y2) + '. What is its area in square units?', [
      'The bottom side runs from x = ' + fmt(x1) + ' to x = ' + x2 + '. Its length is ' + x2 + ' ' + MINUS + ' (' + fmt(x1) + ') = ' + w + '. Crossing an axis means the distances add.',
      'The vertical side runs from y = ' + fmt(y1) + ' to y = ' + y2 + ', so its length is ' + y2 + ' ' + MINUS + ' (' + fmt(y1) + ') = ' + h + '.', 'Area = ' + w + ' × ' + h + ' = ' + w * h + '.'], w * h, { check: Math.abs(x2 - x1) * Math.abs(y2 - y1), visual: V.coordinatePlane([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]) });
  });
  M3[0][1].push(function (r) { // evaluate a two variable expression
    var a = nz(r, -5, 6), b = nz(r, -5, 6), p = r.int(1, 5), q = r.int(1, 5), s = r.int(1, 5), val = p * a * a - q * a * b + s * b;
    return I('If a = ' + fmt(a) + ' and b = ' + fmt(b) + ', evaluate ' + p + 'a^{2} ' + MINUS + ' ' + q + 'ab + ' + s + 'b.', [
      'Substitute with brackets: ' + p + '(' + fmt(a) + ')^{2} ' + MINUS + ' ' + q + '(' + fmt(a) + ')(' + fmt(b) + ') + ' + s + '(' + fmt(b) + ').',
      'Powers first: (' + fmt(a) + ')^{2} = ' + a * a + ', so the first term is ' + p * a * a + '. Second term: ' + q + ' × ' + fmt(a * b) + ' = ' + fmt(q * a * b) + ', and it is subtracted. Third term: ' + fmt(s * b) + '.',
      fmt(p * a * a) + ' ' + MINUS + ' (' + fmt(q * a * b) + ') + (' + fmt(s * b) + ') = ' + fmt(val) + '.'], val, { check: p * Math.pow(a, 2) - q * a * b + s * b });
  });

  M3[0][2].push(function (r) { // fraction from a two variable expression
    var x, y, p, q, s, den, tries = 0;
    do { x = nz(r, -6, 8); y = nz(r, -6, 8); p = r.int(1, 5); q = r.int(1, 5); s = r.int(1, 4); den = x + s * y; tries++; } while ((den === 0 || x === y) && tries < 200);
    var res = Fq(p * x - q * y, den);
    return FR('Evaluate ' + fr(p + 'x ' + MINUS + ' ' + q + 'y', 'x + ' + (s === 1 ? '' : s) + 'y') + ' when x = ' + fmt(x) + ' and y = ' + fmt(y) + '. Give the answer in lowest terms.', [
      'Top: ' + p + '(' + fmt(x) + ') ' + MINUS + ' ' + q + '(' + fmt(y) + ') = ' + fmt(p * x) + ' ' + MINUS + ' (' + fmt(q * y) + ') = ' + fmt(p * x - q * y) + '.', 'Bottom: ' + fmt(x) + ' + ' + (s === 1 ? '' : s + '(') + fmt(y) + (s === 1 ? '' : ')') + ' = ' + fmt(den) + '.',
      'Fraction: ' + fr(fmt(p * x - q * y), fmt(den)) + ' = ' + fmk(res) + ' in lowest terms.'], res, { check: (p * x - q * y) / den });
  });
  M3[0][2].push(function (r) { // ratio relations
    var p = r.int(2, 5), q = r.int(2, 6); while (q === p) q = r.int(2, 6);
    var res = Fq(p * p + q * q, p * q);
    return FR('If a = ' + p + 'b and c = ' + q + 'b, and b is not 0, find the value of ' + fr('a^{2} + c^{2}', 'ac') + ' in lowest terms.', [
      'Replace a and c using b: a^{2} = ' + p * p + 'b^{2} and c^{2} = ' + q * q + 'b^{2}, and ac = ' + p * q + 'b^{2}.', 'The fraction becomes ' + fr((p * p + q * q) + 'b^{2}', (p * q) + 'b^{2}') + '. The b^{2} cancels, so the answer does not depend on b.',
      'Answer: ' + fmk(res) + '.'], res, { check: (p * p + q * q) / (p * q) });
  });
  M3[0][2].push(function (r) { // brackets and negative values
    var x = nz(r, -4, 4), y = nz(r, -4, 5), z = nz(r, -4, 4), p = r.int(1, 4), q = r.int(1, 4), val = p * x * Math.pow(y - z, 2) - q * y * z;
    return I('Evaluate ' + p + 'x(y ' + MINUS + ' z)^{2} ' + MINUS + ' ' + q + 'yz when x = ' + fmt(x) + ', y = ' + fmt(y) + ' and z = ' + fmt(z) + '.', [
      'Brackets first: y ' + MINUS + ' z = ' + fmt(y) + ' ' + MINUS + ' (' + fmt(z) + ') = ' + fmt(y - z) + '. Square it: ' + Math.pow(y - z, 2) + '.',
      'First term: ' + p + ' × (' + fmt(x) + ') × ' + Math.pow(y - z, 2) + ' = ' + fmt(p * x * Math.pow(y - z, 2)) + '.', 'Second term: ' + q + ' × (' + fmt(y) + ') × (' + fmt(z) + ') = ' + fmt(q * y * z) + ', and it is subtracted.',
      fmt(p * x * Math.pow(y - z, 2)) + ' ' + MINUS + ' (' + fmt(q * y * z) + ') = ' + fmt(val) + '.'], val, { check: p * x * (y - z) * (y - z) - q * y * z });
  });
  M3[0][2].push(function (r) { // midpoint
    var x1 = 2 * r.int(-6, 6), y1 = 2 * r.int(-6, 6), x2 = 2 * r.int(-6, 6), y2 = 2 * r.int(-6, 6);
    if (x1 === x2 && y1 === y2) x2 += 4;
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ans = pt(mx, my), opts = [ans, pt(x1 + x2, y1 + y2), pt(mx, my + 2), pt((x1 - x2) / 2, (y1 - y2) / 2), pt(my, mx)].filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 5);
    return TX('What is the midpoint of the segment joining ' + pt(x1, y1) + ' and ' + pt(x2, y2) + '?', ['The midpoint is the average of the coordinates.', 'x: (' + fmt(x1) + ' + ' + fmt(x2) + ') ÷ 2 = ' + fmt(mx) + '. y: (' + fmt(y1) + ' + ' + fmt(y2) + ') ÷ 2 = ' + fmt(my) + '.', 'Midpoint ' + ans + '.'], ans, { options: r.shuffle(opts), check: ans, visual: V.coordinatePlane([[x1, y1], [x2, y2]]) });
  });

  M3[0][3].push(function (r) { // x + y and xy given
    var x = nz(r, -9, 12), y = nz(r, -9, 12), S = x + y, P = x * y;
    if (r.chance()) return I('If x + y = ' + fmt(S) + ' and xy = ' + fmt(P) + ', what is the value of x^{2} + y^{2}?', ['Do not solve for x and y. Square the sum: (x + y)^{2} = x^{2} + 2xy + y^{2}.', 'So x^{2} + y^{2} = (x + y)^{2} ' + MINUS + ' 2xy = ' + fmt(S) + '^{2} ' + MINUS + ' 2(' + fmt(P) + ').', S * S + ' ' + MINUS + ' (' + fmt(2 * P) + ') = ' + fmt(S * S - 2 * P) + '.'], S * S - 2 * P, { check: x * x + y * y });
    return I('If x + y = ' + fmt(S) + ' and xy = ' + fmt(P) + ', what is the value of (x ' + MINUS + ' y)^{2}?', ['Expand: (x ' + MINUS + ' y)^{2} = x^{2} ' + MINUS + ' 2xy + y^{2} = (x + y)^{2} ' + MINUS + ' 4xy.', 'Substitute: ' + fmt(S) + '^{2} ' + MINUS + ' 4(' + fmt(P) + ') = ' + S * S + ' ' + MINUS + ' (' + fmt(4 * P) + ') = ' + fmt(S * S - 4 * P) + '.'], S * S - 4 * P, { check: (x - y) * (x - y) });
  });
  M3[0][3].push(function (r) { // x + 1/x
    var k = r.int(3, 9);
    if (r.chance()) return I('If x + ' + fr(1, 'x') + ' = ' + k + ', what is the value of x^{2} + ' + fr(1, 'x^{2}') + '?', ['Square both sides: (x + ' + fr(1, 'x') + ')^{2} = x^{2} + 2 + ' + fr(1, 'x^{2}') + ' = ' + k * k + '.', 'The middle term 2 × x × ' + fr(1, 'x') + ' is exactly 2. So x^{2} + ' + fr(1, 'x^{2}') + ' = ' + k * k + ' ' + MINUS + ' 2 = ' + (k * k - 2) + '.'], k * k - 2, { check: k * k - 2 });
    return I('If x + ' + fr(1, 'x') + ' = ' + k + ', what is the value of x^{3} + ' + fr(1, 'x^{3}') + '?', ['Cube both sides: (x + ' + fr(1, 'x') + ')^{3} = x^{3} + 3(x + ' + fr(1, 'x') + ') + ' + fr(1, 'x^{3}') + '.', k + '^{3} = ' + k * k * k + ' = x^{3} + ' + fr(1, 'x^{3}') + ' + 3 × ' + k + '.', 'So x^{3} + ' + fr(1, 'x^{3}') + ' = ' + k * k * k + ' ' + MINUS + ' ' + 3 * k + ' = ' + (k * k * k - 3 * k) + '.'], k * k * k - 3 * k, { check: k * k * k - 3 * k });
  });
  M3[0][3].push(function (r) { // invented operation
    var p = r.int(1, 4), q = r.int(1, 4), s = r.int(1, 3), u = nz(r, -3, 5), v = nz(r, -3, 5), w = nz(r, -3, 5);
    function op(a, b) { return p * a + q * b - s * a * b; }
    var m = op(u, v), res = op(m, w);
    return I('Define a ★ b = ' + p + 'a + ' + q + 'b ' + MINUS + ' ' + s + 'ab. What is the value of (' + fmt(u) + ' ★ ' + fmt(v) + ') ★ ' + fmt(w) + '?', [
      'Do the bracket first: ' + fmt(u) + ' ★ ' + fmt(v) + ' = ' + p + '(' + fmt(u) + ') + ' + q + '(' + fmt(v) + ') ' + MINUS + ' ' + s + '(' + fmt(u) + ')(' + fmt(v) + ') = ' + fmt(p * u) + ' + (' + fmt(q * v) + ') ' + MINUS + ' (' + fmt(s * u * v) + ') = ' + fmt(m) + '.',
      'Now ' + fmt(m) + ' ★ ' + fmt(w) + ' = ' + p + '(' + fmt(m) + ') + ' + q + '(' + fmt(w) + ') ' + MINUS + ' ' + s + '(' + fmt(m) + ')(' + fmt(w) + ') = ' + fmt(p * m) + ' + (' + fmt(q * w) + ') ' + MINUS + ' (' + fmt(s * m * w) + ') = ' + fmt(res) + '.'], res, { check: op(op(u, v), w) });
  });

  // ---------- m3t1: Linear equations and systems ----------
  M3[1][1].push(function (r) { // brackets and collecting like terms
    var x0 = r.int(-9, 12), p = r.int(2, 6), q = nz(r, -3, 4), a = nz(r, -7, 7); while (p + q === 0) q = nz(r, -3, 4);
    var rhs = p * (x0 + a) + q * x0;
    return I('Solve ' + p + '(x ' + sgn(a) + ') ' + (q < 0 ? MINUS : '+') + ' ' + Math.abs(q) + 'x = ' + fmt(rhs) + '.', [
      'Expand the bracket: ' + p + 'x ' + sgn(p * a) + ' ' + (q < 0 ? MINUS : '+') + ' ' + Math.abs(q) + 'x = ' + fmt(rhs) + '.', 'Collect the x terms: ' + (p + q) + 'x ' + sgn(p * a) + ' = ' + fmt(rhs) + '.',
      'Move the number across: ' + (p + q) + 'x = ' + fmt(rhs) + ' ' + sgn(-p * a) + ' = ' + fmt(rhs - p * a) + '.', 'x = ' + fmt(rhs - p * a) + ' ÷ ' + fmt(p + q) + ' = ' + fmt(x0) + '.'], x0, { check: (rhs - p * a) / (p + q) });
  });
  M3[1][1].push(function (r) { // variable on both sides
    var x0 = r.int(-8, 12), a = r.int(3, 9), c = r.int(1, a - 1), b = nz(r, -12, 12), d = a * x0 + b - c * x0;
    return I('Solve ' + a + 'x ' + sgn(b) + ' = ' + c + 'x ' + sgn(d) + '.', ['Collect x terms on the side with the bigger coefficient. Subtract ' + c + 'x from both sides: ' + (a - c) + 'x ' + sgn(b) + ' = ' + fmt(d) + '.', 'Subtract the number: ' + (a - c) + 'x = ' + fmt(d) + ' ' + sgn(-b) + ' = ' + fmt(d - b) + '.', 'x = ' + fmt(d - b) + ' ÷ ' + (a - c) + ' = ' + fmt(x0) + '.'], x0, { check: (d - b) / (a - c) });
  });
  M3[1][1].push(function (r) { // one fraction
    var a = r.int(2, 9), t = nz(r, -6, 9), b = nz(r, -9, 9), c = t + b, x0 = a * t;
    return I('Solve ' + fr('x', a) + ' ' + sgn(b) + ' = ' + fmt(c) + '.', ['Get the fraction alone: ' + fr('x', a) + ' = ' + fmt(c) + ' ' + sgn(-b) + ' = ' + fmt(t) + '.', 'Multiply both sides by ' + a + ': x = ' + fmt(t) + ' × ' + a + ' = ' + fmt(x0) + '.'], x0, { check: a * (c - b) });
  });

  M3[1][2].push(function (r) { // a(x+b)/c = d(x+e)/f
    var a, b, c, d, e, f, x0 = 0, A, Dd, L, tries = 0, ok = false;
    while (!ok && tries++ < 20000) {
      a = r.int(1, 6); c = r.int(2, 9); d = r.int(1, 6); f = r.int(2, 9); b = nz(r, -9, 9); e = nz(r, -9, 9);
      L = lcm(c, f); A = a * L / c; Dd = d * L / f;
      if (c !== f && A !== Dd && (Dd * e - A * b) % (A - Dd) === 0) { x0 = (Dd * e - A * b) / (A - Dd); ok = true; }
    }
    if (!ok) { a = 2; b = 1; c = 3; d = 1; e = 5; f = 2; L = 6; A = 4; Dd = 3; x0 = (3 * 5 - 4 * 1) / (4 - 3); }
    var lhs = Fq(a * (x0 + b), c), rhs = Fq(d * (x0 + e), f);
    return I('Solve ' + fr(a === 1 ? 'x ' + sgn(b) : a + '(x ' + sgn(b) + ')', c) + ' = ' + fr(d === 1 ? 'x ' + sgn(e) : d + '(x ' + sgn(e) + ')', f) + '.', [
      'Clear the fractions by multiplying both sides by the LCM of ' + c + ' and ' + f + ', which is ' + L + ': ' + A + '(x ' + sgn(b) + ') = ' + Dd + '(x ' + sgn(e) + ').',
      'Expand both brackets: ' + A + 'x ' + sgn(A * b) + ' = ' + Dd + 'x ' + sgn(Dd * e) + '.', 'Gather x terms on the left and numbers on the right: ' + (A - Dd) + 'x = ' + fmt(Dd * e) + ' ' + sgn(-A * b) + ' = ' + fmt(Dd * e - A * b) + '.',
      'x = ' + fmt(Dd * e - A * b) + ' ÷ ' + fmt(A - Dd) + ' = ' + fmt(x0) + '.', 'Check: left side ' + fmk(lhs) + ' and right side ' + fmk(rhs) + ' are equal.'], x0, { check: x0 });
  });
  M3[1][2].push(function (r) { // sum of two fractions equals a whole number
    var b = r.int(2, 7), d = r.int(2, 7); while (d === b) d = r.int(2, 7);
    var x0 = r.int(-6, 14), a = b * r.int(-3, 4) - x0, c = d * r.int(-3, 4) - x0, e = (x0 + a) / b + (x0 + c) / d, L = lcm(b, d);
    return I('Solve ' + fr('x ' + sgn(a), b) + ' + ' + fr('x ' + sgn(c), d) + ' = ' + fmt(e) + '.', [
      'Multiply every term by the LCM of ' + b + ' and ' + d + ', which is ' + L + ', so both fractions disappear: ' + (L / b) + '(x ' + sgn(a) + ') + ' + (L / d) + '(x ' + sgn(c) + ') = ' + L + ' × ' + fmt(e) + '.',
      'Expand: ' + (L / b) + 'x ' + sgn(L / b * a) + ' + ' + (L / d) + 'x ' + sgn(L / d * c) + ' = ' + fmt(L * e) + '.', 'Combine: ' + (L / b + L / d) + 'x ' + sgn(L / b * a + L / d * c) + ' = ' + fmt(L * e) + ', so ' + (L / b + L / d) + 'x = ' + fmt(L * e - L / b * a - L / d * c) + '.',
      'x = ' + fmt(x0) + '.'], x0, { check: (L * e - L / b * a - L / d * c) / (L / b + L / d) });
  });
  M3[1][2].push(function (r) { // two equations, one with fractions and one with brackets
    var a, b, x0, y0, p, q, s = 0, c, R, tries = 0, det;
    do { a = r.int(2, 6); b = r.int(2, 6); p = r.int(1, 6); q = r.int(1, 6); det = b * (p + q) - a * (p - q); tries++; } while ((det === 0 || a === b || p === q) && tries < 200);
    x0 = a * nz(r, -4, 6); y0 = b * nz(r, -4, 6); c = x0 / a + y0 / b; R = (p - q) * x0 + (p + q) * y0;
    var X = (a * b * c * (p + q) - a * R) / det, Y = (a * b * c - b * x0) / a;
    return I('The numbers x and y satisfy ' + fr('x', a) + ' + ' + fr('y', b) + ' = ' + fmt(c) + ' and ' + p + '(x + y) ' + MINUS + ' ' + q + '(x ' + MINUS + ' y) = ' + fmt(R) + '. What is x + y?', [
      'Clear the fractions in the first equation by multiplying by ' + a * b + ': ' + b + 'x + ' + a + 'y = ' + fmt(a * b * c) + '.',
      'Expand the second: ' + p + 'x + ' + p + 'y ' + MINUS + ' ' + q + 'x + ' + q + 'y = ' + fmt(R) + ', which is ' + (p - q) + 'x + ' + (p + q) + 'y = ' + fmt(R) + '.',
      'Eliminate y: multiply the first by ' + (p + q) + ' and the second by ' + a + ', then subtract. You get ' + fmt(det) + 'x = ' + fmt(a * b * c * (p + q) - a * R) + ', so x = ' + fmt(x0) + '.',
      'Put x back into the first equation: ' + b + '(' + fmt(x0) + ') + ' + a + 'y = ' + fmt(a * b * c) + ', so y = ' + fmt(y0) + '.', 'x + y = ' + fmt(x0) + ' + (' + fmt(y0) + ') = ' + fmt(x0 + y0) + '.'], x0 + y0, { check: X + Y });
  });
  M3[1][2].push(function (r) { // brackets on both sides
    var x0 = r.int(-7, 10), p = r.int(2, 7), s = r.int(1, p - 1), a = nz(r, -6, 6), b = nz(r, -6, 6), q = nz(r, -8, 8), t = p * (x0 + a) - q - s * (x0 - b);
    return I('Solve ' + p + '(x ' + sgn(a) + ') ' + MINUS + ' ' + (q < 0 ? '(' + MINUS + Math.abs(q) + ')' : q) + ' = ' + s + '(x ' + sgn(-b) + ') ' + sgn(t) + '.', [
      'Expand: ' + p + 'x ' + sgn(p * a) + ' ' + MINUS + ' ' + (q < 0 ? '(' + MINUS + Math.abs(q) + ')' : q) + ' = ' + s + 'x ' + sgn(-s * b) + ' ' + sgn(t) + '.', 'Tidy each side: ' + p + 'x ' + sgn(p * a - q) + ' = ' + s + 'x ' + sgn(t - s * b) + '.',
      'Collect: ' + (p - s) + 'x = ' + fmt(t - s * b) + ' ' + sgn(-(p * a - q)) + ' = ' + fmt(t - s * b - (p * a - q)) + '.', 'x = ' + fmt(t - s * b - (p * a - q)) + ' ÷ ' + (p - s) + ' = ' + fmt(x0) + '.'], x0, { check: (t - s * b - (p * a - q)) / (p - s) });
  });

  M3[1][3].push(function (r) { // shortcut: no need to find x
    var a = r.int(2, 6), k = r.int(2, 4), b = r.int(1, 15), c = b + r.int(3, 30), n = nz(r, -9, 12), m = a * k, val = k * (c - b) + n;
    return I('If ' + a + 'x + ' + b + ' = ' + c + ', what is the value of ' + m + 'x ' + sgn(n) + '?', [
      'You do not need x itself. From the equation, ' + a + 'x = ' + c + ' ' + MINUS + ' ' + b + ' = ' + (c - b) + '.', m + 'x is ' + k + ' times ' + a + 'x, so ' + m + 'x = ' + k + ' × ' + (c - b) + ' = ' + k * (c - b) + '.',
      m + 'x ' + sgn(n) + ' = ' + k * (c - b) + ' ' + sgn(n) + ' = ' + fmt(val) + '.'], val, { check: m * ((c - b) / a) + n });
  });
  M3[1][3].push(function (r) { // consecutive multiples
    var s = r.pick([1, 2, 3, 5, 7]), n = r.pick([3, 4, 5, 6]), t = s * r.int(3, 20) + (s === 2 ? 1 : 0) * (r.chance() ? 1 : 0), tot = 0, i;
    for (i = 0; i < n; i++) tot += t + i * s;
    var name = s === 1 ? 'consecutive integers' : s === 2 && t % 2 !== 0 ? 'consecutive odd integers' : s === 2 ? 'consecutive even integers' : 'consecutive multiples of ' + s, largest = t + (n - 1) * s;
    return I('The sum of ' + n + ' ' + name + ' is ' + fmt(tot) + '. What is the largest of them?', [
      'The average of evenly spaced numbers is the middle value: ' + fmt(tot) + ' ÷ ' + n + ' = ' + nf(tot / n, 1, true) + '.', 'The largest is half the total spread above the middle. The spread from smallest to largest is ' + (n - 1) + ' × ' + s + ' = ' + (n - 1) * s + ', so the largest is ' + nf(tot / n, 1, true) + ' + ' + nf((n - 1) * s / 2, 1, true) + ' = ' + fmt(largest) + '.',
      'Check: the numbers ' + fmt(t) + ' to ' + fmt(largest) + ' in steps of ' + s + ' add to ' + fmt(tot) + '.'], largest, { check: t + (n - 1) * s });
  });
  M3[1][3].push(function (r) { // ages
    var m, k, n, b, tries = 0;
    do { m = r.int(4, 9); k = r.int(2, m - 1); n = r.int(1, 12); b = n * (k - 1) / (m - k); tries++; } while ((!Number.isInteger(b) || b < 2 || m * b > 60) && tries < 5000);
    if (!(Number.isInteger(b) && b >= 2)) { m = 5; k = 3; n = 4; b = 4; }
    var ann = m * b;
    return I('Ann is ' + m + ' times as old as Ben. In ' + n + ' years Ann will be ' + k + ' times as old as Ben. How old is Ann now?', [
      'Let Ben be b years old now. Then Ann is ' + m + 'b.', 'In ' + n + ' years: ' + m + 'b + ' + n + ' = ' + k + '(b + ' + n + ').', 'Expand: ' + m + 'b + ' + n + ' = ' + k + 'b + ' + k * n + ', so ' + (m - k) + 'b = ' + (k * n - n) + ' and b = ' + b + '.',
      'Ann is ' + m + ' × ' + b + ' = ' + ann + '. Check: in ' + n + ' years Ann is ' + (ann + n) + ' and Ben is ' + (b + n) + ', and ' + (ann + n) + ' ÷ ' + (b + n) + ' = ' + k + '.'], ann, { check: m * (n * (k - 1) / (m - k)) });
  });

  // ---------- m3t2: Arithmetic sequences ----------
  function seqStr(a, d, n) { var o = []; for (var i = 0; i < n; i++) o.push(fmt(a + i * d)); return o.join(', '); }

  M3[2][1].push(function (r) { // nth term
    var a = nz(r, -15, 30), d = nz(r, -9, 12), n = r.int(15, 60), val = a + (n - 1) * d;
    return I('Find the ' + ord(n) + ' term of the sequence ' + seqStr(a, d, 4) + ', ...', [
      'Common difference: ' + fmt(a + d) + ' ' + MINUS + ' (' + fmt(a) + ') = ' + fmt(d) + '.', 'To reach the ' + ord(n) + ' term from the 1st, add the difference ' + (n - 1) + ' times: term n = first + (n ' + MINUS + ' 1) × d.',
      fmt(a) + ' + ' + (n - 1) + ' × (' + fmt(d) + ') = ' + fmt(a) + ' + (' + fmt((n - 1) * d) + ') = ' + fmt(val) + '.', 'Common slip: using ' + n + ' differences instead of ' + (n - 1) + '.'], val, { check: a + d * (n - 1) });
  });
  M3[2][1].push(function (r) { // first term from two terms
    var a = nz(r, -10, 20), d = nz(r, -6, 9), p = r.int(3, 8), q = p + r.int(2, 6), tp = a + (p - 1) * d, tq = a + (q - 1) * d;
    return I('In an arithmetic sequence the ' + ord(p) + ' term is ' + fmt(tp) + ' and the ' + ord(q) + ' term is ' + fmt(tq) + '. What is the first term?', [
      'Going from term ' + p + ' to term ' + q + ' takes ' + (q - p) + ' steps and changes the value by ' + fmt(tq) + ' ' + MINUS + ' (' + fmt(tp) + ') = ' + fmt(tq - tp) + '.', 'Common difference d = ' + fmt(tq - tp) + ' ÷ ' + (q - p) + ' = ' + fmt(d) + '.',
      'Go back ' + (p - 1) + ' steps from term ' + p + ': first term = ' + fmt(tp) + ' ' + MINUS + ' ' + (p - 1) + ' × (' + fmt(d) + ') = ' + fmt(a) + '.'], a, { check: tp - (p - 1) * ((tq - tp) / (q - p)) });
  });
  M3[2][1].push(function (r) { // which term is it
    var a = r.int(2, 15), d = r.int(2, 9), n = r.int(20, 90), N = a + (n - 1) * d;
    return I('Which term of the sequence ' + seqStr(a, d, 4) + ', ... is equal to ' + fmt(N) + '?', ['Term n equals ' + a + ' + (n ' + MINUS + ' 1) × ' + d + '. Set it equal to ' + fmt(N) + '.', (n - 1) + ' comes from (' + fmt(N) + ' ' + MINUS + ' ' + a + ') ÷ ' + d + ' = ' + fmt(N - a) + ' ÷ ' + d + ' = ' + (n - 1) + '.', 'So n ' + MINUS + ' 1 = ' + (n - 1) + ' and n = ' + n + '. It is the ' + ord(n) + ' term.'], n, { check: (N - a) / d + 1 });
  });

  M3[2][2].push(function (r) { // sum of the first n terms
    var a = nz(r, -8, 20), d = nz(r, -5, 9), n = r.int(12, 50), last = a + (n - 1) * d, S = n * (a + last) / 2;
    return I('Find the sum of the first ' + n + ' terms of the sequence ' + seqStr(a, d, 4) + ', ...', [
      'The last term is ' + fmt(a) + ' + ' + (n - 1) + ' × (' + fmt(d) + ') = ' + fmt(last) + '.', 'Pair the first term with the last, the second with the second last, and so on. Every pair adds to the same number: ' + fmt(a) + ' + (' + fmt(last) + ') = ' + fmt(a + last) + '.',
      'Sum = ' + n + ' terms × average of first and last = ' + n + ' × ' + fmt(a + last) + ' ÷ 2 = ' + fmt(S) + '.'], S, { check: (function () { var s = 0; for (var i = 0; i < n; i++) s += a + i * d; return s; })() });
  });
  M3[2][2].push(function (r) { // how many terms in the list
    var a = nz(r, -20, 30), d = r.pick([2, 3, 4, 5, 6, 7, 9]), n = r.int(15, 80), L = a + (n - 1) * d;
    return I('How many numbers are in the list ' + seqStr(a, d, 3) + ', ..., ' + fmt(L - d) + ', ' + fmt(L) + '?', ['The list goes up by ' + d + ' each time.', 'The gap from the first to the last is ' + fmt(L) + ' ' + MINUS + ' (' + fmt(a) + ') = ' + fmt(L - a) + ', and that holds ' + fmt(L - a) + ' ÷ ' + d + ' = ' + (n - 1) + ' steps.', 'Number of terms = steps + 1 = ' + n + ' (a list needs one more number than it has steps).'], n, { check: (L - a) / d + 1 });
  });
  M3[2][2].push(function (r) { // sum from two given terms
    var a = nz(r, -6, 15), d = nz(r, 2, 8), p = r.int(2, 5), q = p + r.int(4, 9), n = r.int(10, 30), tp = a + (p - 1) * d, tq = a + (q - 1) * d, S = n * (2 * a + (n - 1) * d) / 2;
    return I('An arithmetic sequence has ' + ord(p) + ' term ' + fmt(tp) + ' and ' + ord(q) + ' term ' + fmt(tq) + '. What is the sum of its first ' + n + ' terms?', [
      'Difference: (' + fmt(tq) + ' ' + MINUS + ' ' + fmt(tp) + ') ÷ ' + (q - p) + ' = ' + fmt(d) + '.', 'First term: ' + fmt(tp) + ' ' + MINUS + ' ' + (p - 1) + ' × ' + fmt(d) + ' = ' + fmt(a) + '.',
      'Term ' + n + ' = ' + fmt(a) + ' + ' + (n - 1) + ' × ' + fmt(d) + ' = ' + fmt(a + (n - 1) * d) + '.', 'Sum = ' + n + ' × (' + fmt(a) + ' + ' + fmt(a + (n - 1) * d) + ') ÷ 2 = ' + fmt(S) + '.'], S, { check: (function () { var s = 0; for (var i = 0; i < n; i++) s += a + i * d; return s; })() });
  });

  M3[2][3].push(function (r) { // terms common to two sequences
    var a1, d1, n1, a2, d2, n2, L1, L2, common, tries = 0;
    do {
      d1 = r.pick([3, 4, 5, 6, 7]); d2 = r.pick([4, 5, 6, 7, 8, 9]); a1 = r.int(1, 9); a2 = r.int(1, 9); n1 = r.int(30, 70); n2 = r.int(25, 70); L1 = a1 + (n1 - 1) * d1; L2 = a2 + (n2 - 1) * d2; common = [];
      for (var t = Math.max(a1, a2); t <= Math.min(L1, L2); t++) if ((t - a1) % d1 === 0 && (t - a2) % d2 === 0) common.push(t);
      tries++;
    } while ((d1 === d2 || common.length < 3 || common.length > 14) && tries < 500);
    var F = common[0], Dd = lcm(d1, d2), U = Math.min(L1, L2), lastc = F + Dd * Math.floor((U - F) / Dd);
    return I('The list ' + seqStr(a1, d1, 3) + ', ..., ' + L1 + ' goes up in equal steps. The list ' + seqStr(a2, d2, 3) + ', ..., ' + L2 + ' also goes up in equal steps. How many numbers appear in both lists?', [
      'Numbers in both lists must fit both patterns. Test terms of the first list until one is in the second: the first shared number is ' + F + '.',
      'After that, shared numbers repeat every lcm(' + d1 + ', ' + d2 + ') = ' + Dd + ', so the shared numbers are ' + F + ', ' + (F + Dd) + ', ' + (F + 2 * Dd) + ', ...',
      'Both lists stop at ' + U + ' or below, so the last shared number is ' + lastc + '.', 'Count: (' + lastc + ' ' + MINUS + ' ' + F + ') ÷ ' + Dd + ' + 1 = ' + common.length + '.'], common.length, { check: common.length });
  });
  M3[2][3].push(function (r) { // sum of multiples in a range
    var k = r.int(3, 13), A = r.int(50, 400), B = A + r.int(150, 700), first = Math.ceil(A / k) * k, last = Math.floor(B / k) * k, n = (last - first) / k + 1, S = 0;
    for (var i = first; i <= last; i += k) S += i;
    return I('What is the sum of all the multiples of ' + k + ' from ' + A + ' to ' + B + ', including both ends if they qualify?', [
      'The smallest multiple of ' + k + ' that is at least ' + A + ' is ' + first + '. The largest that is at most ' + B + ' is ' + last + '.', 'They step by ' + k + ', so there are (' + last + ' ' + MINUS + ' ' + first + ') ÷ ' + k + ' + 1 = ' + n + ' of them.',
      'Sum = number of terms × (first + last) ÷ 2 = ' + n + ' × ' + (first + last) + ' ÷ 2 = ' + fmt(S) + '.'], S, { check: S });
  });
  M3[2][3].push(function (r) { // first n where the running total passes a target
    var a = r.int(1, 9), d = r.int(1, 7), T = r.int(500, 3000), n = 1, S = a, prev = 0;
    while (S <= T) { prev = S; n++; S = n * (2 * a + (n - 1) * d) / 2; }
    return I('The sequence ' + seqStr(a, d, 4) + ', ... continues in the same pattern. What is the smallest number of terms whose sum is greater than ' + fmt(T) + '?', [
      'The sum of the first n terms is n(2 × ' + a + ' + (n ' + MINUS + ' 1) × ' + d + ') ÷ 2.', 'Estimate: the sum grows like ' + fr(d, 2) + ' n^{2}, so n is about ' + Math.round(Math.sqrt(2 * T / d)) + '. Test values around that.',
      'For n = ' + (n - 1) + ' the sum is ' + fmt(prev) + ', which is not more than ' + fmt(T) + '. For n = ' + n + ' the sum is ' + fmt(S) + ', which is more.', 'The smallest number of terms is ' + n + '.'], n, { check: n });
  });

  // ---------- m3t3: Visual pattern growth ----------
  M3[3][1].push(function (r) { // matchstick shapes in a row
    var names = { 3: ['triangle', 'triangles'], 4: ['square', 'squares'], 5: ['pentagon', 'pentagons'], 6: ['hexagon', 'hexagons'] }, s = r.pick([3, 4, 5, 6]), k = r.int(15, 60), total = (s - 1) * k + 1;
    return I('Matchsticks make ' + names[s][1] + ' in a row, sharing sides. One ' + names[s][0] + ' needs ' + s + ' sticks, and each new ' + names[s][0] + ' added shares one side with the last. How many sticks are needed for ' + k + ' ' + names[s][1] + '?', [
      'The first ' + names[s][0] + ' uses ' + s + ' sticks. Each new one adds ' + s + ' ' + MINUS + ' 1 = ' + (s - 1) + ' sticks because one side is shared.', 'For ' + k + ' shapes: ' + s + ' + ' + (k - 1) + ' × ' + (s - 1) + ' = ' + total + '.',
      'Rule: sticks = ' + (s - 1) + 'n + 1. Check with n = 1: ' + (s - 1) + ' + 1 = ' + s + '.'], total, { check: s + (s - 1) * (k - 1), visual: s === 3 ? V.matchRow('triangle', 3) : s === 4 ? V.matchRow('square', 3) : '' });
  });
  M3[3][1].push(function (r) { // border tiles around a square pool
    var n = r.int(10, 60), tiles = 4 * n + 4;
    return I('A square pool is ' + n + ' tiles long and ' + n + ' tiles wide. It is surrounded by a border that is exactly one tile wide. How many border tiles are needed?', [
      'The pool plus border is a square of side ' + n + ' + 2 = ' + (n + 2) + ' tiles. Its area is ' + (n + 2) + '^{2} = ' + (n + 2) * (n + 2) + ' tiles.', 'The pool itself uses ' + n + '^{2} = ' + n * n + ' tiles, so the border is ' + (n + 2) * (n + 2) + ' ' + MINUS + ' ' + n * n + ' = ' + tiles + '.',
      'Shortcut: 4 sides of ' + n + ' tiles plus 4 corner tiles, 4n + 4 = ' + tiles + '.'], tiles, { check: 4 * n + 4, visual: V.borderTiles(3) });
  });
  M3[3][1].push(function (r) { // linear dot pattern
    var a = r.int(3, 9), d = r.int(2, 6), k = r.int(15, 60), val = a + (k - 1) * d;
    return I('A pattern of dots has ' + seqStr(a, d, 4) + ' dots in Steps 1, 2, 3 and 4. How many dots are in Step ' + k + '?', ['Each step adds ' + d + ' dots, so the rule has the form ' + d + 'n + something.', 'Step 1 has ' + a + ' dots, and ' + d + ' × 1 = ' + d + ', so the something is ' + a + ' ' + MINUS + ' ' + d + ' = ' + (a - d) + '. The rule is ' + d + 'n ' + sgn(a - d) + '.', 'Step ' + k + ': ' + d + ' × ' + k + ' ' + sgn(a - d) + ' = ' + val + '.'], val, { check: d * k + (a - d) });
  });

  M3[3][2].push(function (r) { // rectangles n by n+1
    var k = r.int(10, 40);
    if (r.chance()) return I('Step n of a pattern is a rectangle of tiles that is n tiles wide and n + 1 tiles tall. How many tiles are in Step ' + k + '?', ['Step ' + k + ' is ' + k + ' tiles by ' + (k + 1) + ' tiles.', k + ' × ' + (k + 1) + ' = ' + k * (k + 1) + '.', 'Rule: tiles = n(n + 1) = n^{2} + n.'], k * (k + 1), { check: k * (k + 1) });
    var T = k * (k + 1);
    return I('Step n of a pattern is a rectangle of tiles that is n tiles wide and n + 1 tiles tall. Which step uses exactly ' + fmt(T) + ' tiles?', ['We need n(n + 1) = ' + fmt(T) + '. The two factors are consecutive, so n is just below the square root of ' + fmt(T) + '.', '√' + fmt(T) + ' is a little more than ' + Math.floor(Math.sqrt(T)) + '. Try n = ' + k + ': ' + k + ' × ' + (k + 1) + ' = ' + fmt(T) + '.', 'It is Step ' + k + '.'], k, { check: k });
  });
  M3[3][2].push(function (r) { // rectangular pool border, solve for a side
    var a = r.int(8, 40), b = r.int(5, 30), tiles = 2 * a + 2 * b + 4;
    return I('A rectangular pool is ' + a + ' tiles long and w tiles wide. A border one tile wide surrounds it and uses ' + tiles + ' tiles. What is w?', [
      'Border tiles = 2 × length + 2 × width + 4 corners = 2 × ' + a + ' + 2w + 4.', tiles + ' = ' + (2 * a + 4) + ' + 2w, so 2w = ' + (tiles - 2 * a - 4) + '.', 'w = ' + b + '.'], b, { check: (tiles - 2 * a - 4) / 2 });
  });
  M3[3][2].push(function (r) { // triangular numbers
    var k = r.int(15, 80), T = k * (k + 1) / 2;
    return I('Step 1 of a pattern has 1 dot, Step 2 has 3 dots, Step 3 has 6 dots and Step 4 has 10 dots. Each step adds one more row than the last. How many dots are in Step ' + k + '?', [
      'Step n adds a row of n dots, so Step ' + k + ' has 1 + 2 + 3 + ... + ' + k + ' dots.', 'Pair the ends: 1 + ' + k + ' = ' + (k + 1) + ', 2 + ' + (k - 1) + ' = ' + (k + 1) + ', and so on. There are ' + k + ' ÷ 2 pairs.', 'Dots = ' + k + ' × ' + (k + 1) + ' ÷ 2 = ' + fmt(T) + '.'], T, { check: (function () { var s = 0; for (var i = 1; i <= k; i++) s += i; return s; })() });
  });
  M3[3][2].push(function (r) { // growth from step to step in squares
    var k = r.int(20, 80);
    return I('Step n of a pattern is an n by n square of tiles, so it has n^{2} tiles. How many more tiles does Step ' + k + ' have than Step ' + (k - 1) + '?', ['Step ' + k + ' has ' + k + '^{2} = ' + k * k + ' tiles and Step ' + (k - 1) + ' has ' + (k - 1) + '^{2} = ' + (k - 1) * (k - 1) + ' tiles.', 'The difference is ' + (k * k - (k - 1) * (k - 1)) + '.', 'Shortcut: growing an (n ' + MINUS + ' 1) square to an n square adds an L shape of 2n ' + MINUS + ' 1 tiles, and 2 × ' + k + ' ' + MINUS + ' 1 = ' + (2 * k - 1) + '.'], 2 * k - 1, { check: k * k - (k - 1) * (k - 1), visual: V.squareGrid(5) });
  });

  M3[3][3].push(function (r) { // quadratic rule from three terms
    var A, B, C, t1, t2, t3, tries = 0;
    do { A = r.int(1, 4); B = r.int(-2, 5); C = r.int(-3, 6); t1 = A + B + C; t2 = 4 * A + 2 * B + C; t3 = 9 * A + 3 * B + C; tries++; } while ((t1 < 1 || t2 < 1) && tries < 100);
    var k = r.int(10, 30), val = A * k * k + B * k + C, d1 = t2 - t1, d2 = t3 - t2, s2 = d2 - d1;
    return I('The number of tiles in Steps 1, 2 and 3 of a pattern is ' + t1 + ', ' + t2 + ' and ' + t3 + '. The number of tiles in Step n follows a rule of the form An^{2} + Bn + C. How many tiles are in Step ' + k + '?', [
      'First differences: ' + t2 + ' ' + MINUS + ' ' + t1 + ' = ' + d1 + ' and ' + t3 + ' ' + MINUS + ' ' + t2 + ' = ' + d2 + '. Second difference: ' + d2 + ' ' + MINUS + ' ' + d1 + ' = ' + s2 + '.', 'For An^{2} + Bn + C the second difference is 2A, so A = ' + s2 + ' ÷ 2 = ' + A + '.',
      'The first difference from Step 1 to 2 is 3A + B, so ' + d1 + ' = ' + 3 * A + ' + B and B = ' + B + '. Then C = ' + t1 + ' ' + MINUS + ' ' + A + ' ' + MINUS + ' (' + B + ') = ' + C + '.', 'Rule: ' + A + 'n^{2} ' + sgn(B) + 'n ' + sgn(C) + '. Step ' + k + ': ' + A + ' × ' + k * k + ' ' + sgn(B * k) + ' ' + sgn(C) + ' = ' + fmt(val) + '.'], val, { check: A * k * k + B * k + C });
  });
  M3[3][3].push(function (r) { // total of a linear pattern over many steps
    var p = r.int(2, 6), q = r.int(1, 5), k = r.int(10, 40), S = p * k * (k + 1) / 2 + q * k, tot = 0;
    for (var n = 1; n <= k; n++) tot += p * n + q;
    return I('Step n of a pattern uses ' + p + 'n + ' + q + ' matchsticks. How many matchsticks are used altogether to build Steps 1 to ' + k + '?', ['Step 1 uses ' + (p + q) + ' sticks, Step 2 uses ' + (2 * p + q) + ', Step 3 uses ' + (3 * p + q) + '. These form an arithmetic sequence with difference ' + p + '.', 'Step ' + k + ' uses ' + p + ' × ' + k + ' + ' + q + ' = ' + (p * k + q) + ' sticks.', 'Total = ' + k + ' × (' + (p + q) + ' + ' + (p * k + q) + ') ÷ 2 = ' + fmt(S) + '.'], S, { check: tot });
  });
  M3[3][3].push(function (r) { // first step with more than N tiles
    var b = r.int(1, 6), c = r.int(0, 8), N = r.int(300, 3000), n = 1;
    while (n * n + b * n + c <= N) n++;
    return I('Step n of a pattern has n^{2} + ' + b + 'n + ' + c + ' tiles. What is the first step that has more than ' + fmt(N) + ' tiles?', ['Estimate with n^{2} ≈ ' + fmt(N) + ': n is a little under √' + fmt(N) + ' ≈ ' + nf(Math.sqrt(N), 1, false) + '.', 'Test Step ' + (n - 1) + ': ' + (n - 1) * (n - 1) + ' + ' + b * (n - 1) + ' + ' + c + ' = ' + ((n - 1) * (n - 1) + b * (n - 1) + c) + ', which is not more than ' + fmt(N) + '.', 'Test Step ' + n + ': ' + n * n + ' + ' + b * n + ' + ' + c + ' = ' + (n * n + b * n + c) + ', which is more.', 'The first step is ' + n + '.'], n, { check: n });
  });

  // ---------- m3t4: Substitution and balance puzzles ----------
  M3[4][1].push(function (r) { // A+B, B+C, A+C
    var A = r.int(1, 15), B = r.int(1, 15), C = r.int(1, 15), pick = r.pick(['A', 'B', 'C']), v = { A: A, B: B, C: C }[pick], tot = A + B + C;
    return I('A + B = ' + (A + B) + ', B + C = ' + (B + C) + ' and A + C = ' + (A + C) + '. What is ' + pick + '?', ['Add all three equations. Each letter appears twice: 2(A + B + C) = ' + (A + B) + ' + ' + (B + C) + ' + ' + (A + C) + ' = ' + 2 * tot + '.', 'So A + B + C = ' + tot + '.',
      pick === 'A' ? 'A = ' + tot + ' ' + MINUS + ' (B + C) = ' + tot + ' ' + MINUS + ' ' + (B + C) + ' = ' + A + '.' : pick === 'B' ? 'B = ' + tot + ' ' + MINUS + ' (A + C) = ' + tot + ' ' + MINUS + ' ' + (A + C) + ' = ' + B + '.' : 'C = ' + tot + ' ' + MINUS + ' (A + B) = ' + tot + ' ' + MINUS + ' ' + (A + B) + ' = ' + C + '.'], v, { check: v });
  });
  M3[4][1].push(function (r) { // chain of multiples
    var p = r.int(2, 5), q = r.int(2, 5), t = r.int(2, 12), z = t, y = q * t, x = p * q * t, N = x + y + z;
    return I('x = ' + p + 'y and y = ' + q + 'z. Also x + y + z = ' + N + '. What is x?', ['Write everything in terms of z: y = ' + q + 'z and x = ' + p + 'y = ' + p + ' × ' + q + 'z = ' + p * q + 'z.', 'Then x + y + z = ' + p * q + 'z + ' + q + 'z + z = ' + (p * q + q + 1) + 'z = ' + N + ', so z = ' + t + '.', 'x = ' + p * q + ' × ' + t + ' = ' + x + '.'], x, { check: p * q * (N / (p * q + q + 1)) });
  });

  M3[4][2].push(function (r) { // two item costs
    var a0 = r.int(1, 9), b0 = r.int(1, 9), p, q, s, u, det, tries = 0;
    do { p = r.int(1, 5); q = r.int(1, 5); u = r.int(1, 5); s = r.int(1, 5); det = p * s - q * u; tries++; } while ((det === 0) && tries < 100);
    var T1 = p * a0 + q * b0, T2 = u * a0 + s * b0;
    return I('Ravi buys ' + p + ' apples and ' + q + ' bananas for $' + T1 + '. Sam buys ' + u + ' apples and ' + s + ' bananas for $' + T2 + '. How many dollars does one apple cost? (Prices are whole dollars.)', [
      'Let an apple cost a and a banana cost b: ' + p + 'a + ' + q + 'b = ' + T1 + ' and ' + u + 'a + ' + s + 'b = ' + T2 + '.', 'Make the b terms match: multiply the first by ' + s + ' and the second by ' + q + ': ' + p * s + 'a + ' + q * s + 'b = ' + s * T1 + ' and ' + u * q + 'a + ' + q * s + 'b = ' + q * T2 + '.',
      'Subtract: ' + (p * s - u * q) + 'a = ' + (s * T1 - q * T2) + ', so a = ' + a0 + '.', 'Check in the first: ' + p + ' × ' + a0 + ' + ' + q + ' × ' + b0 + ' = ' + T1 + '.'], a0, { check: (s * T1 - q * T2) / (p * s - u * q) });
  });
  M3[4][2].push(function (r) { // chained relations
    var C = r.int(3, 15), q = r.int(2, 4), sft = r.int(1, 5), p = r.int(2, 9), B = q * C - sft, A = B + p, N = A + B + C;
    return I('A = B + ' + p + ' and B = ' + q + 'C ' + MINUS + ' ' + sft + '. Also A + B + C = ' + N + '. What is A?', ['Substitute to get everything in C: B = ' + q + 'C ' + MINUS + ' ' + sft + ', and A = B + ' + p + ' = ' + q + 'C ' + MINUS + ' ' + sft + ' + ' + p + ' = ' + q + 'C + ' + (p - sft) + '.',
      'A + B + C = (' + q + 'C + ' + (p - sft) + ') + (' + q + 'C ' + MINUS + ' ' + sft + ') + C = ' + (2 * q + 1) + 'C + ' + (p - 2 * sft) + ' = ' + N + '.', (2 * q + 1) + 'C = ' + (N - p + 2 * sft) + ', so C = ' + C + '.', 'B = ' + q + ' × ' + C + ' ' + MINUS + ' ' + sft + ' = ' + B + ', and A = ' + B + ' + ' + p + ' = ' + A + '.'], A, { check: A });
  });

  M3[4][3].push(function (r) { // balance scale
    var wc, ws, wt, kk, u, v, x1, y1, found = false, tries = 0, n, g, per;
    while (!found && tries++ < 5000) {
      wc = r.int(2, 12); ws = r.int(2, 12); wt = r.int(3, 16); if (wc === ws) continue;
      g = gcd(wc, ws); x1 = ws / g; y1 = wc / g;
      outer: for (kk = 1; kk <= 3; kk++) for (u = 1; u <= 6; u++) for (v = 1; v <= 6; v++) { if (kk * wt === u * ws + v * wc) { found = true; break outer; } }
    }
    if (!found) { wc = 3; ws = 2; wt = 5; x1 = 2; y1 = 3; kk = 1; u = 1; v = 1; }
    per = Fq(u * x1 + v * y1, kk * x1);
    var m = r.int(1, 3); n = per.d * m;
    var ans = per.n * m;
    return I('On a balance, ' + x1 + ' circles have the same mass as ' + y1 + ' squares. Also ' + kk + ' triangle' + (kk > 1 ? 's' : '') + ' balance ' + u + ' square' + (u > 1 ? 's' : '') + ' and ' + v + ' circle' + (v > 1 ? 's' : '') + '. How many squares balance ' + n + ' triangles?', [
      'From the first balance, ' + x1 + ' circles = ' + y1 + ' squares, so 1 circle = ' + fr(y1, x1) + ' squares.', 'Replace circles in the second balance: ' + kk + ' triangle' + (kk > 1 ? 's' : '') + ' = ' + u + ' + ' + v + ' × ' + fr(y1, x1) + ' = ' + fmk(Fq(u * x1 + v * y1, x1)) + ' squares.',
      '1 triangle = ' + fmk(per) + ' squares.', n + ' triangles = ' + n + ' × ' + fmk(per) + ' = ' + ans + ' squares.'], ans, { check: n * wt / ws });
  });
  M3[4][3].push(function (r) { // x+y, y+z, z+x
    var x = r.int(1, 12), y = r.int(1, 12), z = r.int(1, 12), prod = r.chance();
    var val = prod ? x * y * z : x * x + y * y + z * z, tot = x + y + z;
    return I('x + y = ' + (x + y) + ', y + z = ' + (y + z) + ' and z + x = ' + (z + x) + '. What is ' + (prod ? 'the product xyz' : 'x^{2} + y^{2} + z^{2}') + '?', [
      'Add the three equations: 2(x + y + z) = ' + 2 * tot + ', so x + y + z = ' + tot + '.', 'Then z = ' + tot + ' ' + MINUS + ' ' + (x + y) + ' = ' + z + ', x = ' + tot + ' ' + MINUS + ' ' + (y + z) + ' = ' + x + ' and y = ' + tot + ' ' + MINUS + ' ' + (z + x) + ' = ' + y + '.',
      prod ? 'xyz = ' + x + ' × ' + y + ' × ' + z + ' = ' + val + '.' : x + '^{2} + ' + y + '^{2} + ' + z + '^{2} = ' + x * x + ' + ' + y * y + ' + ' + z * z + ' = ' + val + '.'], val, { check: prod ? x * y * z : x * x + y * y + z * z });
  });
  M3[4][3].push(function (r) { // sums of four of five numbers
    var nums = []; while (nums.length < 5) { var v = r.int(5, 30); if (nums.indexOf(v) < 0) nums.push(v); }
    var tot = nums.reduce(function (a, b) { return a + b; }, 0), sums = nums.map(function (v) { return tot - v; }).sort(function (a, b) { return a - b; }), big = Math.max.apply(null, nums), sm = sums.reduce(function (a, b) { return a + b; }, 0);
    return I('Five different whole numbers are added four at a time in every possible way, leaving out a different number each time. The five sums are ' + sums.join(', ') + '. What is the largest of the five numbers?', [
      'Each of the five sums leaves out exactly one number. Adding all five sums counts every number 4 times: ' + sums.join(' + ') + ' = ' + sm + '.', 'So the total of the five numbers is ' + sm + ' ÷ 4 = ' + tot + '.',
      'The largest number is left out in the smallest sum, ' + sums[0] + '. So the largest number = ' + tot + ' ' + MINUS + ' ' + sums[0] + ' = ' + big + '.'], big, { check: big });
  });

  /* ==================================================================
     LESSONS (Markdown plus :::visual and :::worked directives)
  ================================================================== */
  var L = {
    m2t0: '## Scaling and rates\nA **rate** compares two quantities, like litres per minute. A **scale factor** tells you how many times bigger a recipe or a plan is.\n:::visual tapeDiagram 3 5\nWhen the numbers are awkward, find the scale factor first and simplify it. Scaling 6 pancakes to 20 uses the factor {{20|6}} = {{10|3}}, so divide by 3 before you multiply by 10.\n> Convert units at the start. 1 litre = 1000 cm³, 1 km/h = {{50|3}} metres per minute.\n### Average speed and shared jobs\nAverage speed is total distance ÷ total time. Two people working together add their **rates**, not their times.\n### Worked example\n:::worked m2t0 2',
    m2t1: '## Closing and opening gaps\nTwo objects moving **toward** each other close the gap at the **sum** of their speeds. Moving in the **same direction**, the faster one gains at the **difference**.\n:::visual motionDiagram toward 60 40\n:::visual motionDiagram chase 50 70\nMoving **apart** in opposite directions, the gap grows at the sum of the speeds. At right angles, use the Pythagorean theorem on the two distances.\n:::visual motionDiagram apart 50 70\n> Head starts: compute the gap first, then divide it by the closing speed.\n### Worked example\n:::worked m2t1 2',
    m2t2: '## Percent means per hundred\nTo find a percent of a number, turn the percent into a decimal multiplier: 250% = 2.5, 0.05% = 0.0005.\nBefore you calculate, guess the size. A percent over 100 makes a number bigger. A percent under 1 makes it tiny.\n> Percent change always compares with the **starting** value. Going up 25% and then down 25% does not return to the start.\nTo undo a percent change, **divide** by the multiplier. If a price rose 35% to $270, the old price was 270 ÷ 1.35 = $200.\n### Worked example\n:::worked m2t2 2',
    m2t3: '## Multipliers for money\nA discount of 30% means you pay 70%, so multiply by 0.70. A 12% tax multiplies by 1.12. GST 5% and PST 7% in British Columbia are both worked out on the pre tax price, so together they add 12%.\nSuccessive changes **multiply**: up 20% then down 20% is 1.20 × 0.80 = 0.96, a 4% drop overall.\n> Compound interest uses the multiplier once per year: $1000 at 5% for 3 years is 1000 × 1.05^{3}.\nSimple interest adds the same amount every year: interest = principal × rate × time.\n### Worked example\n:::worked m2t3 2',
    m2t4: '## Mixtures\nWhen you mix things, the **amounts** add. Percents and prices do not. Work with the actual quantity of the ingredient.\n:::visual tapeDiagram 2 3\nFor a ratio 2 : 3 of concentrate to water, there are 5 equal parts. In 20 litres each part is 4 litres.\n> Alligation shortcut: to reach a target strength, the amounts you mix are in the **reverse** ratio of the distances from the target.\nWhen you add pure water or let water evaporate, the amount of the other ingredient stays fixed. Solve for the new total.\n### Worked example\n:::worked m2t4 2',
    m3t0: '## Expressions and the coordinate plane\nAn **expression** turns a situation into symbols. A fixed fee is a constant. A charge per unit multiplies the variable: $5 plus $2 per km is 5 + 2n.\nTo **evaluate**, replace each letter with its value inside brackets, then follow the order of operations.\n:::visual coordinatePlane 3 2 -4 3 -2 -5 5 -3\nThe plane has four quadrants. A is in I, B is in II, C is in III and D is in IV. Reflecting in the x axis flips the sign of y. Reflecting in the y axis flips the sign of x.\n> Contest trick: you can often find x² + y² from x + y and xy without finding x and y.\n### Worked example\n:::worked m3t0 2',
    m3t1: '## Linear equations\nAn equation is a balance. Whatever you do to one side you must do to the other. The goal is to get the variable alone.\nFor brackets, **expand first**, then collect the x terms on one side and the numbers on the other.\nFor fractions, multiply both sides by the LCM of the denominators. The fractions vanish.\n> Always check your answer by substituting it back into the original equation.\nA system of two equations needs two steps: eliminate one variable, solve, then back substitute.\n### Worked example\n:::worked m3t1 2',
    m3t2: '## Arithmetic sequences\nAn **arithmetic sequence** goes up or down by the same **common difference** d each time.\nThe nth term is a + (n ' + MINUS + ' 1)d, where a is the first term. The number of steps from the 1st to the nth term is n ' + MINUS + ' 1.\n> To count terms in a list, use (last ' + MINUS + ' first) ÷ d + 1.\nTo add the terms, pair the first with the last. Every pair has the same total, so sum = number of terms × (first + last) ÷ 2.\n### Worked example\n:::worked m3t2 2',
    m3t3: '## Growing patterns\nFor each pattern ask two questions: what does Step 1 have, and what changes from one step to the next?\n:::visual matchRow square 3\nThree squares in a row use 10 sticks. The first square needs 4 and each new square adds 3, so the rule is 3n + 1.\n:::visual borderTiles 3\nA border around an n by n pool needs 4n + 4 tiles. If the changes between steps are constant, the rule is linear. If the changes themselves grow by a constant amount, the rule involves n².\n> Check your rule on Steps 1, 2 and 3 before you trust it for Step 50.\n### Worked example\n:::worked m3t3 2',
    m3t4: '## Substitution and balance\nWhen letters depend on each other, express everything in terms of one letter and solve for it.\nIf you have symmetrical equations like A + B = 12, B + C = 15, A + C = 11, add them all. You get 2(A + B + C) = 38, so A + B + C = 19, and each letter follows by subtraction.\n> Balance puzzles are equations in disguise. Convert every shape into the same unit, such as squares.\nWhen a puzzle gives sums of all groups but one, add every sum. Each item was counted the same number of times, so you can recover the total.\n### Worked example\n:::worked m3t4 2'
  };

  /* ==================================================================
     REGISTRATION
  ================================================================== */
  E.registerModule({
    id: 'm2', title: 'Proportional Reasoning & Extreme Percentages',
    topics: [
      { id: 'm2t0', title: 'Multi step scaling and rates', gens: M2[0], lesson: L.m2t0, summary: 'Scaling, unit rates, unit conversion, shared jobs, average speed and tank problems.' },
      { id: 'm2t1', title: 'Relative speed problems', gens: M2[1], lesson: L.m2t1, summary: 'Closing gaps, catching up, head starts, right angle separation, laps and timelines.' },
      { id: 'm2t2', title: 'Percentages from 0.01% to 500%', gens: M2[2], lesson: L.m2t2, summary: 'Extreme percents, percent change, reversing changes, and percent logic puzzles.' },
      { id: 'm2t3', title: 'Successive markdowns, taxes and interest', gens: M2[3], lesson: L.m2t3, summary: 'Discounts, GST and PST, successive changes, simple and compound interest, profit.' },
      { id: 'm2t4', title: 'Mixture and solution puzzles', gens: M2[4], lesson: L.m2t4, summary: 'Mixture cost, ratio balance, alligation, dilution and repeated replacement.' }
    ]
  });
  E.registerModule({
    id: 'm3', title: 'Algebraic Foundations & Discrete Relations',
    topics: [
      { id: 'm3t0', title: 'Expressions, evaluation and coordinates', gens: M3[0], lesson: L.m3t0, summary: 'Writing expressions, four quadrant coordinates, multivariable evaluation, identities.' },
      { id: 'm3t1', title: 'Linear equations and systems', gens: M3[1], lesson: L.m3t1, summary: 'Brackets, fractional coefficients, a(x + b) ÷ c = d(x + e) ÷ f, systems and word puzzles.' },
      { id: 'm3t2', title: 'Arithmetic sequences and the nth term', gens: M3[2], lesson: L.m3t2, summary: 'nth term, counting terms, sums, shared terms of two sequences.' },
      { id: 'm3t3', title: 'Visual pattern growth', gens: M3[3], lesson: L.m3t3, summary: 'Matchstick and tile patterns, linear and quadratic rules, totals and thresholds.' },
      { id: 'm3t4', title: 'Substitution and balance puzzles', gens: M3[4], lesson: L.m3t4, summary: 'Symmetric sums, chained relations, cost puzzles and balance scales.' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
