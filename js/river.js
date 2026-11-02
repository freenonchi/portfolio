(function () {
  'use strict';
  document.getElementById('year').textContent = new Date().getFullYear();

  var canvas = document.getElementById('river');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var wide = document.body.getAttribute('data-river') === 'wide';
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = mq.matches;

  var COLORS = ['#3f4b3d', '#5a6851', '#808c68', '#8a7a55', '#3e4a2b',
                '#5a6a3a', '#6e6c35', '#8f7f55', '#a9643f', '#cfae6c', '#2c3025', '#3f3e2d', '#716c52', '#b8ae88'];
  var WLO = 0, WMID = 1, WHI = 2, SAND = 3, MDARK = 4, MOSS = 5, OLIVE = 6, TAN = 7, CLAY = 8, FTAN = 9, DIM = 10, STAR1 = 11, STAR2 = 12, STAR3 = 13;

  function hash(x, y) {
    var n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function sm(t) { return t * t * (3 - 2 * t); }
  function vn2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var fx = sm(x - xi), fy = sm(y - yi);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function vn1(x) { return vn2(x, 7.5); }

  var ALT = { '"': "'", "'": '"', ';': ':', ':': ';', ',': '.', '.': ',', '|': '/', '/': '|' };
  var GRASS_NEAR = ['"', ';', '|', ',', '"'];
  var GRASS_MID = ['%', '&', '"', '#', ';'];
  var TREES = ['Y', 'T', '&', '%', '#'];

  var W = 0, H = 0, dpr = 1, fontPx = 13, cw = 8, chh = 15, cols = 0, rows = 0, xOff = 0;
  var chArr, clsArr, present, stars;
  var parts = [], wake = new Map(), lastT = 0, MAXP = 450;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fontPx = W < 600 ? 11 : 13;
    chh = Math.round(fontPx * 1.2);
    ctx.font = fontPx + 'px Consolas, "DejaVu Sans Mono", "Liberation Mono", Menlo, monospace';
    ctx.textBaseline = 'top';
    cw = ctx.measureText('M').width || fontPx * 0.6;
    cols = Math.ceil(W / cw) + 1;
    rows = Math.ceil(H / chh) + 2;
    xOff = 0;
    chArr = new Array(cols);
    clsArr = new Uint8Array(cols);
    present = new Uint16Array(COLORS.length);
    stars = new Uint8Array(rows * cols);
    dirty = true;
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var off = window.pageYOffset || 0;
    var first = Math.floor(off / chh);
    var yoff = -(off - first * chh);
    var hwBase = Math.max(3.5, Math.min(cols * 0.075, 12));
    var scale = Math.max(0.5, Math.min(cols / 110, 1.2));

    var dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    wake.clear();
    for (var k = parts.length - 1; k >= 0; k--) {
      var q = parts[k], age = t - q.t0;
      if (age > q.life) { parts[k] = parts[parts.length - 1]; parts.pop(); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.f = age / q.life;
      var qc = Math.floor(q.x / cw);
      if (qc >= 0 && qc < cols) wake.set(Math.floor(q.y / chh) * 4096 + qc, q);
    }
    var hasWake = wake.size > 0;

    stars.fill(0);
    for (var sr = first - 2; sr < first + rows + 2; sr++) {
      for (var sc0 = 0; sc0 < cols; sc0++) {
        if (hash(sc0 + 700, sr + 300) >= 0.016) continue;
        var ph = hash(sc0, sr + 9) * 6.283, wv = 0.5 + hash(sc0 + 5, sr);
        var sx = sc0 + Math.round(1.6 * Math.sin(t * 0.12 * wv + ph));
        var sy = sr + Math.round(1.6 * Math.cos(t * 0.1 * wv + ph * 1.7));
        if (sx < 0 || sx >= cols || sy < first || sy >= first + rows) continue;
        var sf = 0.5 + 0.5 * Math.sin(t * (0.7 + wv) + ph);
        stars[(sy - first) * cols + sx] = sf < 0.3 ? 1 : (sf < 0.6 ? 2 : (sf < 0.85 ? 3 : 4));
      }
    }

    for (var i = 0; i < rows; i++) {
      var wr = first + i;
      var cx = wide
        ? cols * (0.5 + 0.25 * Math.sin(wr * 0.017 + 0.6) + 0.09 * Math.sin(wr * 0.043 + 2.1) +
                  0.08 * Math.sin(wr * 0.0071 + 1.9) + 0.12 * (vn1(wr * 0.05) - 0.5))
        : cols * (0.5 + 0.2 * Math.sin(wr * 0.017 + 0.6) + 0.1 * Math.sin(wr * 0.043 + 2.1) +
                  0.12 * (vn1(wr * 0.05) - 0.5));
      var hw = hwBase * (0.85 + 0.5 * vn1(wr * 0.03 + 50));
      cx = Math.max(hw + 2, Math.min(cols - hw - 2, cx));
      var bankW = (10 + 22 * vn1(wr * 0.04 + 100)) * scale;

      present.fill(0);
      for (var x = 0; x < cols; x++) {
        var d = x - cx, ad = d < 0 ? -d : d;
        var ch = ' ', cl = DIM;
        var wq = hasWake ? wake.get(wr * 4096 + x) : undefined;

        if (ad < hw - 0.5) {
          var flow = vn2(x * 0.22 + wr * 0.05, wr * 0.3 - t * 1.4);
          var s2 = vn2(x * 0.6 + 10, wr * 0.9 - t * 2.6);
          if (s2 > 0.74) { ch = '~'; cl = WHI; }
          else if (flow > 0.62) { ch = '~'; cl = WMID; }
          else if (flow > 0.48) { ch = '-'; cl = WMID; }
          else if (flow > 0.38) { ch = ','; cl = WLO; }
          else if (hash(x, wr) > 0.93) { ch = '.'; cl = WLO; }
          if (wq) {
            ch = wq.g === 'c' ? (wq.f < 0.5 ? 'o' : '.') : wq.g;
            cl = wq.f < 0.4 ? WHI : (wq.f < 0.75 ? WMID : WLO);
          }
        } else if (ad < hw + 0.8) {
          var he = hash(x, wr);
          if (he > 0.82) { ch = '|'; cl = MOSS; }
          else if (he > 0.45) { ch = ':'; cl = SAND; }
          else { ch = '.'; cl = SAND; }
        } else {
          var dist = ad - hw;
          var p = 1 - dist / bankW;
          var h1 = hash(x * 3 + 1, wr), h2 = hash(x + 91, wr * 2 + 5), h3 = hash(x * 7 + 3, wr + 11);
          var hf = hash(x + 400, wr * 5 + 9);
          if (p > 0.1 && hf < 0.011) {
            ch = hf < 0.005 ? '*' : (hf < 0.008 ? '+' : '@');
            cl = hf < 0.005 ? CLAY : (hf < 0.008 ? FTAN : CLAY);
          } else if (p > 0) {
            var dens = 0.08 + 0.8 * p;
            if (h1 < dens) {
              var tree = vn2(x * 0.18 + (d < 0 ? 40 : 0), wr * 0.22) > 0.64 && p < 0.8 && p > 0.15;
              if (tree) {
                ch = TREES[Math.floor(h2 * TREES.length)];
                cl = h3 < 0.45 ? MDARK : (h3 < 0.8 ? MOSS : OLIVE);
              } else if (p > 0.55) {
                ch = GRASS_NEAR[Math.floor(h2 * GRASS_NEAR.length)];
                cl = h3 < 0.5 ? MOSS : (h3 < 0.85 ? OLIVE : TAN);
              } else {
                ch = GRASS_MID[Math.floor(h2 * GRASS_MID.length)];
                cl = h3 < 0.5 ? MDARK : (h3 < 0.85 ? MOSS : OLIVE);
              }
              var sw = vn2(x * 0.08 + t * 0.5, wr * 0.12);
              var swing = (!tree && ALT[ch]) && (sw > 0.66 || wq);
              if (swing) ch = ALT[ch];
            }
          }
          if (ch === ' ') {
            var sk = stars[i * cols + x];
            if (sk) {
              ch = sk === 3 ? '+' : (sk === 4 ? '*' : '.');
              cl = sk === 1 ? STAR1 : (sk === 4 ? STAR3 : STAR2);
            }
          }
        }
        chArr[x] = ch;
        clsArr[x] = cl;
        if (ch !== ' ') present[cl]++;
      }

      var y = i * chh + yoff;
      for (var c = 0; c < COLORS.length; c++) {
        if (!present[c]) continue;
        var s = '';
        for (var k = 0; k < cols; k++) s += clsArr[k] === c ? chArr[k] : ' ';
        ctx.fillStyle = COLORS[c];
        if (c === STAR3) { ctx.shadowColor = 'rgba(184,174,136,0.7)'; ctx.shadowBlur = 7; }
        ctx.fillText(s, xOff, y);
        if (c === STAR3) ctx.shadowBlur = 0;
      }
    }
  }

  var dirty = true, last = 0, raf = 0;
  function frame(now) {
    raf = 0;
    if (!reduced) {
      if (window.__smoothTick && window.__smoothTick(now)) dirty = true;
      if (dirty || now - last >= 33) {
        last = now; dirty = false;
        draw(now / 1000);
      }
      raf = requestAnimationFrame(frame);
    } else if (dirty) {
      dirty = false;
      draw(0);
    }
  }
  function kick() { dirty = true; if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('scroll', kick, { passive: true });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(function () { resize(); kick(); }, 80);
  });
  function glyphFor(ax, ay) {
    var a = Math.atan2(ay, ax);
    if (a < 0) a += Math.PI;
    if (a < Math.PI / 8 || a > 7 * Math.PI / 8) return '-';
    if (a < 3 * Math.PI / 8) return '\\';
    if (a < 5 * Math.PI / 8) return '|';
    return '/';
  }
  function spawn(x, y, ux, uy, sp, now) {
    var px = -uy, py = ux;
    var u = Math.min(160, 30 + 0.25 * sp);
    var ratio = Math.min(0.6, u / sp);
    parts.push({ x: x, y: y, vx: 0, vy: 0, t0: now, life: 0.9, f: 0, g: 'c' });
    for (var s = -1; s <= 1; s += 2) {
      parts.push({
        x: x, y: y, vx: px * u * s, vy: py * u * s, t0: now, life: 1.5, f: 0,
        g: glyphFor(-ux + s * px * ratio, -uy + s * py * ratio)
      });
    }
  }
  var lastP = null, accum = 0;
  window.addEventListener('pointermove', function (e) {
    if (reduced) return;
    var now = performance.now() / 1000;
    var wy = e.clientY + (window.pageYOffset || 0);
    if (lastP) {
      var dx = e.clientX - lastP.x, dy = wy - lastP.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var sp = dist / Math.max(0.008, now - lastP.t);
      if (dist > 0 && sp > 80) {
        var ux = dx / dist, uy = dy / dist, pos = 9 - accum;
        while (pos <= dist && parts.length < MAXP) {
          spawn(lastP.x + ux * pos, lastP.y + uy * pos, ux, uy, sp, now);
          pos += 9;
        }
        accum = Math.min(9, dist - (pos - 9));
      }
    }
    lastP = { x: e.clientX, y: wy, t: now };
    kick();
  }, { passive: true });
  window.addEventListener('pointerleave', function () { lastP = null; accum = 0; });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) kick();
  });
  var onMq = function () { reduced = mq.matches; if (reduced) { parts.length = 0; lastP = null; } kick(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);

  resize();
  kick();
})();
