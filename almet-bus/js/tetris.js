// ===== Тетрис =====
(function () {
  var API = window.GameAPI;
  if (!API) return;

  var BEST_KEY = 'tetris_best_v1';
  var CFG_KEY = 'tetris_cfg_v1';
  var cfg = { level: 1 };
  try {
    var saved = JSON.parse(localStorage.getItem(CFG_KEY));
    if (saved && saved.level) cfg = saved;
  } catch (e) {}

  var el, tcv, tctx, tcell = 20;
  var tetBest = API.bestGet(BEST_KEY);
  var TCOLS = 10, TROWS = 20;
  var tgrid, tcur, tnext, tbag, tscore, tlines, tlevel;
  var tRunning = false, tDying = false, tPaused = false, mounted = false;
  var tacc = 0, lastTs = 0, raf = null, tdropMs = 700;
  var tnow = 0;

  // ——— анимации
  var clearing = false, clearRows = [], clearT0 = 0, CLEAR_MS = 340;
  var fall = null, FALL_MS = 260;
  var particles = [];
  var shake = 0;

  // ——— удержание клавиш: свой автоповтор вместо штатного
  var keys = { left: false, right: false, down: false };
  var dasT = 0, downT = 0;
  var DAS = 150, ARR = 55, DOWN_INT = 55;

  // ——— плавная визуальная позиция фигуры (догоняет логическую)
  var visX = 0, visY = 0;

  var TSHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[1, 1, 1], [0, 1, 0]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
  };
  var TCOLORS = {
    I: '#4dd0e1', O: '#ffd54f', T: '#ba68c8', S: '#66bb6a',
    Z: '#ef5350', J: '#5c9dff', L: '#ff9e40'
  };

  function isA11y() { return API.isA11y(); }
  function q(sel) { return el.querySelector(sel); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function saveTCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function tetResize() {
    var w = tcv.parentNode.clientWidth || 320;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    tcell = Math.round(w * dpr / TCOLS);
    tcv.width = tcell * TCOLS;
    tcv.height = tcell * TROWS;
  }

  function tdropSpeed() { return Math.max(110, 700 - (tlevel - 1) * 55); }

  function updateHUD() {
    q('#tetScore').textContent = tscore;
    q('#tetLines').textContent = tlines;
    q('#tetBest').textContent = tetBest;
  }

  function popScore() {
    var s = q('#tetScore');
    s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
  }

  function newBag() {
    var n = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (var i = n.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = n[i]; n[i] = n[j]; n[j] = tmp;
    }
    return n;
  }
  function fromBag() {
    if (!tbag || !tbag.length) tbag = newBag();
    var name = tbag.pop();
    var m = TSHAPES[name].map(function (r) { return r.slice(); });
    return { name: name, m: m, x: Math.floor((TCOLS - m[0].length) / 2), y: 0 };
  }

  function collide(m, px, py) {
    for (var i = 0; i < m.length; i++) {
      for (var j = 0; j < m[i].length; j++) {
        if (!m[i][j]) continue;
        var gx = px + j, gy = py + i;
        if (gx < 0 || gx >= TCOLS || gy >= TROWS) return true;
        if (gy >= 0 && tgrid[gy][gx]) return true;
      }
    }
    return false;
  }

  function reset() {
    tetResize();
    tgrid = [];
    for (var r = 0; r < TROWS; r++) tgrid.push(new Array(TCOLS).fill(null));
    tscore = 0; tlines = 0; tlevel = cfg.level;
    tdropMs = tdropSpeed(); tacc = 0;
    clearing = false; clearRows = []; fall = null; particles = []; shake = 0;
    keys.left = keys.right = keys.down = false;
    dasT = 0; downT = 0;
    tbag = null;
    tnext = fromBag();
    nextPiece();
    updateHUD();
  }

  function nextPiece() {
    tcur = tnext;
    tnext = fromBag();
    visX = tcur.x;
    visY = tcur.y;
    tacc = 0;
    if (collide(tcur.m, tcur.x, tcur.y)) end();
  }

  function start() {
    reset();
    tRunning = true; tDying = false; tPaused = false;
    q('#tetReady').style.display = 'none';
    q('#tetOver').style.display = 'none';
    q('#tetCfg').style.display = 'none';
  }

  function end() {
    tRunning = false; tDying = true; clearing = false; clearRows = [];
    keys.left = keys.right = keys.down = false;
    var record = '';
    if (tscore > tetBest) {
      tetBest = tscore;
      API.bestSet(BEST_KEY, tetBest);
      updateHUD();
      record = ' Новый рекорд!';
    }
    q('#tetOverText').textContent =
      'Линий убрано: ' + tlines + '. Очки: ' + tscore + '.' + record;
    setTimeout(function () {
      tDying = false;
      q('#tetOver').style.display = 'flex';
    }, 650);
  }

  // ——— искры из клетки
  function spark(cx, cy, col, n) {
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2;
      var v = tcell * 0.04 + Math.random() * tcell * 0.14;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - tcell * 0.1,
        g: tcell * 0.0022,
        life: 450 + Math.random() * 350, max: 800,
        size: tcell * (0.1 + Math.random() * 0.14),
        col: col, spin: Math.random() * Math.PI
      });
    }
  }

  function lock() {
    var topped = false;
    var bottomCells = [];
    for (var i = 0; i < tcur.m.length; i++) {
      for (var j = 0; j < tcur.m[i].length; j++) {
        if (!tcur.m[i][j]) continue;
        var gy = tcur.y + i, gx = tcur.x + j;
        if (gy < 0) { topped = true; continue; }
        tgrid[gy][gx] = TCOLORS[tcur.name];
        if (!tcur.m[i + 1] || !tcur.m[i + 1][j]) bottomCells.push({ x: gx, y: gy });
      }
    }
    if (topped) { end(); return; }

    bottomCells.forEach(function (c) {
      spark((c.x + 0.5) * tcell, (c.y + 0.85) * tcell, 'rgba(255,255,255,.9)', 2);
    });

    var full = [];
    for (var r = TROWS - 1; r >= 0; r--) {
      var ok = true;
      for (var c2 = 0; c2 < TCOLS; c2++) if (!tgrid[r][c2]) { ok = false; break; }
      if (ok) full.push(r);
    }

    if (full.length) {
      tscore += [0, 100, 300, 500, 800][full.length] * tlevel;
      tlines += full.length;
      tlevel = cfg.level + Math.floor(tlines / 10);
      tdropMs = tdropSpeed();
      updateHUD();
      popScore();
      full.forEach(function (rr) {
        for (var c3 = 0; c3 < TCOLS; c3++) {
          if (tgrid[rr][c3]) spark((c3 + 0.5) * tcell, (rr + 0.5) * tcell, tgrid[rr][c3], 3);
        }
      });
      shake = tcell * 0.35 * full.length;
      clearing = true;
      clearRows = full;
      clearT0 = tnow;
      tcur = null;
    } else {
      nextPiece();
    }
  }

  // удалить линии и запомнить, откуда какой ряд падает
  function finishClear() {
    var cleared = {};
    clearRows.forEach(function (r) { cleared[r] = true; });
    var map = [];
    var src = TROWS - 1;
    for (var dst = TROWS - 1; dst >= 0; dst--) {
      while (src >= 0 && cleared[src]) src--;
      map[dst] = src >= 0 ? src : -1;
      if (src >= 0) src--;
    }
    var newGrid = [];
    for (var r2 = TROWS - 1; r2 >= 0; r2--) {
      newGrid[r2] = map[r2] >= 0 ? tgrid[map[r2]] : new Array(TCOLS).fill(null);
    }
    tgrid = newGrid;
    fall = { map: map, t0: tnow, dur: FALL_MS };
    clearRows = [];
    clearing = false;
  }

  function step() {
    if (!tcur) return;
    if (!collide(tcur.m, tcur.x, tcur.y + 1)) tcur.y++;
    else lock();
  }

  function softDown() {
    if (!tcur || clearing) return;
    if (!collide(tcur.m, tcur.x, tcur.y + 1)) { tcur.y++; tacc = 0; }
    else lock();
  }

  function hard() {
    if (!tcur || clearing) return;
    while (!collide(tcur.m, tcur.x, tcur.y + 1)) tcur.y++;
    lock();
  }

  function move(dx) {
    if (!tcur || clearing) return;
    if (!collide(tcur.m, tcur.x + dx, tcur.y)) tcur.x += dx;
  }

  function rotate() {
    if (!tcur || clearing) return;
    if (tcur.name === 'O') return;
    var m = tcur.m, r = [];
    for (var i = 0; i < m[0].length; i++) {
      r.push([]);
      for (var j = m.length - 1; j >= 0; j--) r[i].push(m[j][i]);
    }
    var kicks = [0, -1, 1, -2, 2];
    for (var k = 0; k < kicks.length; k++) {
      if (!collide(r, tcur.x + kicks[k], tcur.y)) {
        tcur.m = r;
        tcur.x += kicks[k];
        return;
      }
    }
  }

  // ——— клавиатура: держим флаги, автоповтор делаем сами
  document.addEventListener('keydown', function (e) {
    if (!mounted) return;
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowUp' || k === ' ') e.preventDefault();
    if (!tRunning || e.repeat) return;
    if (k === 'ArrowLeft') { keys.left = true; move(-1); dasT = 0; }
    else if (k === 'ArrowRight') { keys.right = true; move(1); dasT = 0; }
    else if (k === 'ArrowDown') { keys.down = true; softDown(); downT = 0; }
    else if (k === 'ArrowUp') rotate();
    else if (k === ' ') hard();
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft') keys.left = false;
    else if (k === 'ArrowRight') keys.right = false;
    else if (k === 'ArrowDown') keys.down = false;
  });

  function syncCfgUI() {
    el.querySelectorAll('.gm-cfg-row').forEach(function (row) {
      row.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('active', String(cfg[row.dataset.cfg]) === b.dataset.v);
      });
    });
  }

  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    tctx.beginPath();
    tctx.moveTo(x + r, y);
    tctx.arcTo(x + w, y, x + w, y + h, r);
    tctx.arcTo(x + w, y + h, x, y + h, r);
    tctx.arcTo(x, y + h, x, y, r);
    tctx.arcTo(x, y, x + w, y, r);
    tctx.closePath();
  }

  function drawCellPx(x, y, color, alpha, scale) {
    var pad = tcell * 0.06;
    var s = (tcell - pad * 2) * (scale || 1);
    tctx.globalAlpha = alpha == null ? 1 : alpha;
    rr(x + (tcell - s) / 2, y + (tcell - s) / 2, s, s, tcell * 0.18 * (scale || 1));
    tctx.fillStyle = color;
    tctx.fill();
    if (isA11y()) {
      tctx.lineWidth = Math.max(2, tcell * 0.08);
      tctx.strokeStyle = '#000';
      tctx.stroke();
    }
    if (scale == null || scale > 0.5) {
      rr(x + pad * 2.4, y + pad * 2.4, s * 0.45, s * 0.28, tcell * 0.08);
      tctx.fillStyle = 'rgba(255,255,255,.3)';
      tctx.fill();
    }
    tctx.globalAlpha = 1;
  }

  function draw() {
    var w = tcv.width, h = tcv.height;
    tctx.save();
    if (shake > 0) tctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    var g = tctx.createLinearGradient(0, 0, 0, h);
    if (isA11y()) { g.addColorStop(0, '#000'); g.addColorStop(1, '#000'); }
    else { g.addColorStop(0, '#0e1626'); g.addColorStop(1, '#1b2a48'); }
    tctx.fillStyle = g;
    tctx.fillRect(-40, -40, w + 80, h + 80);

    tctx.strokeStyle = isA11y() ? 'rgba(255,221,0,.18)' : 'rgba(255,255,255,.05)';
    tctx.lineWidth = Math.max(1, tcell * 0.03);
    for (var gx = 1; gx < TCOLS; gx++) { tctx.beginPath(); tctx.moveTo(gx * tcell, 0); tctx.lineTo(gx * tcell, h); tctx.stroke(); }
    for (var gy = 1; gy < TROWS; gy++) { tctx.beginPath(); tctx.moveTo(0, gy * tcell); tctx.lineTo(w, gy * tcell); tctx.stroke(); }

    // уложенные клетки — с плавным оседанием после удаления линий
    var fe = 1;
    if (fall) {
      var p = Math.min(1, (tnow - fall.t0) / fall.dur);
      fe = easeOut(p);
    }
    for (var r = 0; r < TROWS; r++) {
      if (clearing && clearRows.indexOf(r) >= 0) continue;
      var off = 0;
      if (fall && fall.map[r] >= 0 && fall.map[r] !== r) off = (fall.map[r] - r) * (1 - fe);
      var rowY = (r + off) * tcell;
      for (var c = 0; c < TCOLS; c++) {
        if (tgrid[r][c]) drawCellPx(c * tcell, rowY, tgrid[r][c]);
      }
    }

    // сгорающие линии: клетки тают + белая вспышка
    if (clearing) {
      var cp = Math.min(1, (tnow - clearT0) / CLEAR_MS);
      clearRows.forEach(function (r2) {
        for (var c4 = 0; c4 < TCOLS; c4++) {
          if (!tgrid[r2][c4]) continue;
          drawCellPx(c4 * tcell, r2 * tcell, tgrid[r2][c4], 1 - cp, 1 - cp * 0.75);
        }
        var fl = Math.sin(cp * Math.PI);
        tctx.globalAlpha = fl * 0.75;
        var fg = tctx.createLinearGradient(0, r2 * tcell, 0, (r2 + 1) * tcell);
        fg.addColorStop(0, 'rgba(255,255,255,0)');
        fg.addColorStop(0.5, '#ffffff');
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        tctx.fillStyle = fg;
        tctx.fillRect(0, r2 * tcell - tcell * 0.2, w, tcell * 1.4);
        tctx.globalAlpha = 1;
      });
    }

    // текущая фигура — плавно догоняет логическую позицию
    if (tcur) {
      var resting = collide(tcur.m, tcur.x, tcur.y + 1);
      var kx = Math.min(1, 16 / 70);
      var ky = Math.min(1, 16 / (resting ? 45 : 85));
      visX += (tcur.x - visX) * kx;
      visY += (tcur.y - visY) * ky;
      if (resting && Math.abs(tcur.y - visY) < 0.02) visY = tcur.y;

      for (var i = 0; i < tcur.m.length; i++) {
        for (var j = 0; j < tcur.m[i].length; j++) {
          if (!tcur.m[i][j]) continue;
          if (visY + i >= -1) drawCellPx((visX + j) * tcell, (visY + i) * tcell, TCOLORS[tcur.name]);
        }
      }

      // панель «Далее»
      var pw = tcell * 3.4, ph = tcell * 2.4;
      var px2 = w - pw - tcell * 0.25, py2 = tcell * 0.25;
      rr(px2, py2, pw, ph, tcell * 0.3);
      tctx.fillStyle = 'rgba(255,255,255,.08)';
      tctx.fill();
      tctx.lineWidth = Math.max(1, tcell * 0.04);
      tctx.strokeStyle = 'rgba(255,255,255,.18)';
      tctx.stroke();
      var nm = tnext.m, mc = tcell * 0.5;
      var bw = nm[0].length * mc, bh = nm.length * mc;
      var ox = px2 + pw / 2 - bw / 2, oy = py2 + ph / 2 - bh / 2;
      for (var i3 = 0; i3 < nm.length; i3++) {
        for (var j3 = 0; j3 < nm[i3].length; j3++) {
          if (!nm[i3][j3]) continue;
          var pad2 = mc * 0.06;
          rr(ox + j3 * mc + pad2, oy + i3 * mc + pad2, mc - pad2 * 2, mc - pad2 * 2, mc * 0.2);
          tctx.fillStyle = TCOLORS[tnext.name];
          tctx.fill();
        }
      }
    }

    // искры
    particles.forEach(function (pc) {
      tctx.globalAlpha = Math.max(0, pc.life / pc.max);
      tctx.save();
      tctx.translate(pc.x, pc.y);
      tctx.rotate(pc.spin + (pc.life / pc.max) * 2);
      tctx.fillStyle = pc.col;
      var s2 = pc.size * (0.4 + 0.6 * pc.life / pc.max);
      tctx.fillRect(-s2 / 2, -s2 / 2, s2, s2);
      tctx.restore();
      tctx.globalAlpha = 1;
    });

    tctx.restore();
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(64, ts - lastTs); lastTs = ts;
    tnow = ts;

    if (shake > 0) shake = Math.max(0, shake - dt / 10);

    if (clearing) {
      if (tnow - clearT0 >= CLEAR_MS) finishClear();
    } else if (fall) {
      if (tnow - fall.t0 >= fall.dur) { fall = null; nextPiece(); }
    } else if (tRunning && tcur) {
      // свой автоповтор влево/вправо при удержании
      var dir = keys.left ? -1 : (keys.right ? 1 : 0);
      if (dir) {
        dasT += dt;
        if (dasT >= DAS) {
          move(dir);
          dasT = DAS - ARR;
        }
      } else {
        dasT = 0;
      }
      // свой автоповтор вниз при удержании — равномерный, без рывков
      if (keys.down) {
        downT += dt;
        while (downT >= DOWN_INT) {
          downT -= DOWN_INT;
          softDown();
          if (!tRunning) break;
        }
      }
      // обычная гравитация
      tacc += dt;
      while (tacc >= tdropMs) {
        tacc -= tdropMs;
        step();
        if (!tRunning) break;
      }
    }

    for (var i2 = particles.length - 1; i2 >= 0; i2--) {
      var pc2 = particles[i2];
      pc2.life -= dt;
      pc2.x += pc2.vx * dt / 16;
      pc2.y += pc2.vy * dt / 16;
      pc2.vy += pc2.g * dt;
      pc2.spin += dt / 300;
      if (pc2.life <= 0) particles.splice(i2, 1);
    }

    draw();
  }

  function onShow() {
    mounted = true;
    lastTs = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function onHide() {
    mounted = false;
    keys.left = keys.right = keys.down = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  API.register({
    id: 'tetris',
    name: 'Тетрис',
    icon: '🧱',
    bestKey: BEST_KEY,
    create: function (holder) {
      el = holder;
      el.innerHTML =
        '<div class="gm-top three">' +
          '<div class="gm-pill"><div class="cap">Очки</div><div class="val" id="tetScore">0</div></div>' +
          '<div class="gm-pill"><div class="cap">Линии</div><div class="val" id="tetLines">0</div></div>' +
          '<div class="gm-pill best"><div class="cap">Рекорд</div><div class="val" id="tetBest">0</div></div>' +
          '<button id="tetGear" class="gm-gear" aria-label="Настройки">⚙️</button>' +
        '</div>' +
        '<div class="gm-board">' +
          '<canvas id="tetCv"></canvas>' +
          '<div id="tetOver" class="gm-over" style="display:none">' +
            '<div class="t">🧱 Игра окончена</div>' +
            '<div class="s" id="tetOverText"></div>' +
            '<button id="tetAgain">Играть ещё</button>' +
          '</div>' +
          '<div id="tetReady" class="gm-over">' +
            '<div class="t">🧱 Тетрис</div>' +
            '<div class="s">Тап — повернуть, свайп влево/вправо — двигать, два быстрых свайпа вниз — сбросить. Клавиши: ←→ ↓ (удержание — ускоренное падение), ↑ — поворот, пробел — сброс.</div>' +
            '<button id="tetStart">▶ Начать</button>' +
          '</div>' +
          '<div id="tetCfg" class="gm-cfg" style="display:none">' +
            '<button id="tetCfgClose" class="gm-cfg-close">✕</button>' +
            '<div class="gm-cfg-row" data-cfg="level">' +
              '<button data-v="1">🌱 1</button><button data-v="3">⏱️ 3</button><button data-v="5">🔥 5</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      tcv = q('#tetCv');
      tctx = tcv.getContext('2d');
      reset();
      draw();

      q('#tetGear').addEventListener('click', function () {
        if (tRunning) { tRunning = false; tPaused = true; }
        keys.left = keys.right = keys.down = false;
        syncCfgUI();
        q('#tetCfg').style.display = 'flex';
      });
      q('#tetCfgClose').addEventListener('click', function () {
        q('#tetCfg').style.display = 'none';
        if (tPaused) { tRunning = true; tPaused = false; }
      });
      el.querySelectorAll('.gm-cfg-row').forEach(function (row) {
        row.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          cfg[row.dataset.cfg] = parseInt(b.dataset.v, 10);
          saveTCfg();
          syncCfgUI();
        });
      });
      window.addEventListener('resize', function () {
        if (!mounted) return;
        tetResize();
        draw();
      });

      var tdownX = 0, tdownY = 0;
      tcv.addEventListener('pointerdown', function (e) {
        tdownX = e.clientX; tdownY = e.clientY;
      });
      tcv.addEventListener('pointerup', function (e) {
        if (!tRunning) return;
        var dx = e.clientX - tdownX, dy = e.clientY - tdownY;
        if (Math.sqrt(dx * dx + dy * dy) < 14) { rotate(); return; }
        if (Math.abs(dx) > Math.abs(dy)) {
          move(dx > 0 ? 1 : -1);
        } else if (dy > 0) {
          var now = performance.now();
          if (now - lastDown < 260) { hard(); lastDown = 0; }
          else { softDown(); lastDown = now; }
        } else {
          rotate();
        }
      });

      q('#tetStart').addEventListener('click', start);
      q('#tetAgain').addEventListener('click', start);

      return { onShow: onShow, onHide: onHide };
    }
  });
})();
