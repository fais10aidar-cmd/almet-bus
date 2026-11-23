// ===== Змейка =====
(function () {
  var API = window.GameAPI;
  if (!API) return;

  var BEST_KEY = 'snake_best_v1';
  var CFG_KEY = 'snake_cfg_v1';
  var cfg = { apples: 1, size: 'm', speed: 'm' };
  try {
    var saved = JSON.parse(localStorage.getItem(CFG_KEY));
    if (saved && saved.apples && saved.size && saved.speed) cfg = saved;
  } catch (e) {}

  var SIZE = { s: 11, m: 13, l: 15 };
  var START_SPEED = { s: 190, m: 140, f: 95 };

  var el, cv, ctx, COLS, ROWS, CELL = 20, BASE_SPEED;
  var best = API.bestGet(BEST_KEY);
  var snake, prevSnake, dir, dirQueue, foods, score;
  var running = false, moving = false, dying = false, paused = false;
  var acc = 0, lastTs = 0, raf = null, mounted = false;
  var particles = [], foodT = 0, shake = 0, dieFlash = 0;

  function isA11y() { return API.isA11y(); }
  function q(sel) { return el.querySelector(sel); }

  function updateBestUI() { q('#gmBest').textContent = best; }

  function popScore() {
    var s = q('#gmScore');
    s.textContent = score;
    s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
  }

  function syncCfgUI() {
    el.querySelectorAll('.gm-cfg-row').forEach(function (row) {
      var key = row.dataset.cfg;
      row.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('active', String(cfg[key]) === b.dataset.v);
      });
    });
  }

  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function resize() {
    var w = cv.parentNode.clientWidth || 360;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var px = Math.round(w * dpr);
    cv.width = px;
    cv.height = px;
    CELL = px / COLS;
  }

  function pushDir(d) {
    if (!running) return;
    if (!moving) {
      if (d.x === -dir.x && d.y === -dir.y) return;
      dir = d;
      moving = true;
      acc = 0;
      return;
    }
    var last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (last.x === -d.x && last.y === -d.y) return;
    if (last.x === d.x && last.y === d.y) return;
    if (dirQueue.length < 3) dirQueue.push(d);
  }

  var KEYMAP = {
    ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 }
  };
  document.addEventListener('keydown', function (e) {
    if (!mounted || !KEYMAP[e.code]) return;
    e.preventDefault();
    pushDir(KEYMAP[e.code]);
  });

  function freeCell() {
    var c;
    do {
      c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (
      snake.some(function (s) { return s.x === c.x && s.y === c.y; }) ||
      foods.some(function (f) { return f.x === c.x && f.y === c.y; })
    );
    return c;
  }

  function refillFoods() {
    while (foods.length < cfg.apples) foods.push(freeCell());
  }

  function burst(cell) {
    var cx = (cell.x + 0.5) * CELL, cy = (cell.y + 0.5) * CELL;
    var cols = ['#ff5252', '#ff8a80', '#ffd60a', '#ffffff'];
    for (var i = 0; i < 14; i++) {
      var a = Math.random() * Math.PI * 2, v = CELL * 0.05 + Math.random() * CELL * 0.1;
      particles.push({
        x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 420 + Math.random() * 260, max: 680,
        col: cols[Math.floor(Math.random() * cols.length)], r: CELL * 0.07 + Math.random() * CELL * 0.1
      });
    }
  }

  function resetField() {
    COLS = SIZE[cfg.size];
    ROWS = SIZE[cfg.size];
    BASE_SPEED = START_SPEED[cfg.speed];
    resize();
    var cx0 = Math.floor(COLS / 2);
    snake = [{ x: cx0, y: Math.floor(ROWS / 2) }, { x: cx0 - 1, y: Math.floor(ROWS / 2) }, { x: cx0 - 2, y: Math.floor(ROWS / 2) }];
    prevSnake = snake.map(function (s) { return { x: s.x, y: s.y }; });
    dir = { x: 1, y: 0 };
    dirQueue = [];
    moving = false;
    foods = [];
    score = 0; particles = []; acc = 0; shake = 0; dieFlash = 0;
    q('#gmScore').textContent = 0;
    refillFoods();
  }

  function start() {
    resetField();
    running = true; dying = false; paused = false;
    q('#gmReady').style.display = 'none';
    q('#gmOver').style.display = 'none';
    q('#gmCfg').style.display = 'none';
  }

  function endGame(isWin) {
    running = false; moving = false; dying = true;
    if (!isWin) shake = CELL * 0.6;
    var record = '';
    if (score > best) {
      best = score;
      API.bestSet(BEST_KEY, best);
      updateBestUI();
      record = ' Новый рекорд!';
    }
    q('#gmOverTitle').textContent = isWin ? '🏆 Победа!' : '🐍 Игра окончена';
    q('#gmOverText').textContent = isWin
      ? 'Поле заполнено! Съедено яблок: ' + score + '.' + record
      : 'Съедено яблок: ' + score + '.' + record;
    setTimeout(function () {
      dying = false;
      q('#gmOver').style.display = 'flex';
    }, 650);
  }

  function step() {
    if (dirQueue.length) dir = dirQueue.shift();
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    var hit = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ||
      snake.some(function (s) { return s.x === head.x && s.y === head.y; });
    prevSnake = snake.map(function (s) { return { x: s.x, y: s.y }; });
    if (hit) { endGame(false); return; }
    snake.unshift(head);
    var fi = -1;
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].x === head.x && foods[i].y === head.y) { fi = i; break; }
    }
    if (fi >= 0) {
      foods.splice(fi, 1);
      score++; popScore(); burst(head); refillFoods();
    } else {
      snake.pop();
    }
    if (snake.length >= COLS * ROWS) endGame(true);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function segPos(i, t) {
    var to = snake[i];
    var from = prevSnake[i] || to;
    return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
  }

  function bodyPoints(t) {
    var pts = [];
    for (var i = 0; i < snake.length; i++) {
      var p = segPos(i, t);
      pts.push({ x: (p.x + 0.5) * CELL, y: (p.y + 0.5) * CELL });
    }
    return pts;
  }

  function ribbon(pts, widthFn, offX, offY) {
    var n = pts.length - 1;
    if (n < 1) return;
    var L = [], R = [];
    for (var i = 0; i <= n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var w = widthFn(i / n) / 2;
      L.push({ x: pts[i].x + nx * w + offX, y: pts[i].y + ny * w + offY });
      R.push({ x: pts[i].x - nx * w + offX, y: pts[i].y - ny * w + offY });
    }
    var Ls = [], Rs = [];
    for (var j = 0; j < n; j++) {
      Ls.push({ x: (L[j].x + L[j + 1].x) / 2, y: (L[j].y + L[j + 1].y) / 2 });
      Rs.push({ x: (R[j].x + R[j + 1].x) / 2, y: (R[j].y + R[j + 1].y) / 2 });
    }
    ctx.beginPath();
    ctx.moveTo(L[n].x, L[n].y);
    for (var k = n - 1; k >= 0; k--) {
      ctx.quadraticCurveTo(L[k + 1].x, L[k + 1].y, Ls[k].x, Ls[k].y);
    }
    ctx.lineTo(L[0].x, L[0].y);
    var hw = widthFn(0) / 2;
    var a2 = pts[Math.min(1, n)];
    var fdx = pts[0].x - a2.x, fdy = pts[0].y - a2.y;
    var fl = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
    fdx /= fl; fdy /= fl;
    ctx.quadraticCurveTo(pts[0].x + fdx * hw * 1.3 + offX, pts[0].y + fdy * hw * 1.3 + offY, R[0].x, R[0].y);
    for (var m = 0; m < n; m++) {
      ctx.quadraticCurveTo(R[m].x, R[m].y, Rs[m].x, Rs[m].y);
    }
    ctx.lineTo(R[n].x, R[n].y);
    ctx.closePath();
    ctx.fill();
  }

  function drawApple(f) {
    var px = (f.x + 0.5) * CELL, py = (f.y + 0.5) * CELL;
    var bob = Math.sin(foodT * 3 + f.x * 1.7 + f.y) * CELL * 0.06;
    var pulse = 1 + 0.06 * Math.sin(foodT * 5 + f.y);
    ctx.save();
    ctx.translate(px, py + bob);
    ctx.scale(pulse, pulse);
    ctx.beginPath(); ctx.ellipse(0, CELL * 0.32, CELL * 0.3, CELL * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, CELL * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = isA11y() ? '#ffdd00' : '#e53935'; ctx.fill();
    ctx.beginPath(); ctx.arc(-CELL * 0.12, -CELL * 0.12, CELL * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
    ctx.strokeStyle = isA11y() ? '#ffdd00' : '#6d4c2f';
    ctx.lineWidth = Math.max(2, CELL * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -CELL * 0.34); ctx.lineTo(CELL * 0.06, -CELL * 0.5); ctx.stroke();
    if (!isA11y()) {
      ctx.beginPath(); ctx.ellipse(CELL * 0.19, -CELL * 0.5, CELL * 0.17, CELL * 0.09, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#66bb6a'; ctx.fill();
    }
    ctx.restore();
  }

  function draw(t) {
    var w = cv.width, h = cv.height;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // трава-шахматка из кубиков
    var g1 = isA11y() ? '#000' : '#d2ecbc';
    var g2 = isA11y() ? '#000' : '#c3e2a8';
    ctx.fillStyle = g1;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.fillStyle = g2;
    for (var by = 0; by < ROWS; by++) {
      for (var bx = (by % 2); bx < COLS; bx += 2) {
        ctx.fillRect(bx * CELL, by * CELL, CELL, CELL);
      }
    }

    ctx.strokeStyle = isA11y() ? 'rgba(255,221,0,.25)' : 'rgba(90,140,70,.10)';
    ctx.lineWidth = Math.max(1, CELL * 0.04);
    for (var gx = 1; gx < COLS; gx++) { ctx.beginPath(); ctx.moveTo(gx * CELL, 0); ctx.lineTo(gx * CELL, h); ctx.stroke(); }
    for (var gy = 1; gy < ROWS; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * CELL); ctx.lineTo(w, gy * CELL); ctx.stroke(); }

    foods.forEach(drawApple);

    var pts = bodyPoints(t);
    if (pts.length) {
      var R = CELL * 0.42;
      var dark = isA11y() ? '#9e8a00' : 'hsl(140,58%,38%)';
      var light = isA11y() ? '#ffdd00' : 'hsl(145,62%,52%)';
      var headCol = isA11y() ? '#ffdd00' : '#3ddc6a';
      var W = R * 2.1; // постоянная толщина тела

      if (pts.length > 1) {
        // тень
        ctx.fillStyle = 'rgba(0,0,0,.10)';
        ribbon(pts, function () { return W; }, CELL * 0.07, CELL * 0.1);
        var tp = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(tp.x + CELL * 0.07, tp.y + CELL * 0.1, W / 2 * 0.92, 0, Math.PI * 2);
        ctx.fill();
        // тело с закруглённым концом
        ctx.fillStyle = dark;
        ribbon(pts, function () { return W; }, 0, 0);
        ctx.beginPath(); ctx.arc(tp.x, tp.y, W / 2, 0, Math.PI * 2); ctx.fill();
        // светлый блик сверху
        ctx.fillStyle = light;
        ribbon(pts, function (f) { return f > 0.9 ? 0 : W * 0.45; }, 0, -R * 0.22);
      } else {
        ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, R, 0, Math.PI * 2);
        ctx.fillStyle = headCol; ctx.fill();
      }

      var hp = pts[0];
      ctx.beginPath(); ctx.arc(hp.x, hp.y, R * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = headCol; ctx.fill();
      var dx = dir.x, dy = dir.y;
      var fx = hp.x + dx * R * 0.45, fy = hp.y + dy * R * 0.45;
      var sx = dy * R * 0.42, sy = dx * R * 0.42;
      [-1, 1].forEach(function (k) {
        ctx.beginPath(); ctx.arc(fx + sx * k, fy + sy * k, R * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(fx + sx * k + dx * R * 0.12, fy + sy * k + dy * R * 0.12, R * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#16233a'; ctx.fill();
      });
      ctx.beginPath();
      ctx.moveTo(hp.x + dx * R * 0.9, hp.y + dy * R * 0.9);
      ctx.lineTo(hp.x + dx * R * 1.35, hp.y + dy * R * 1.35);
      ctx.strokeStyle = '#ff5252'; ctx.lineWidth = Math.max(2, CELL * 0.1); ctx.lineCap = 'round';
      ctx.stroke();
    }

    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.col; ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (running && !moving) {
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = isA11y() ? '#ffdd00' : '#1c2430';
      ctx.font = 'bold ' + Math.round(CELL * 0.75) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Свайпни — поехали!', w / 2, h - CELL * 1.2);
      ctx.restore();
    }

    if (dieFlash > 0) {
      ctx.fillStyle = 'rgba(229,57,53,' + dieFlash + ')';
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }

    ctx.restore();
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(64, ts - lastTs); lastTs = ts;

    if (running && moving) {
      acc += dt;
      while (acc >= BASE_SPEED) { acc -= BASE_SPEED; step(); if (!running) break; }
    }
    foodT += dt / 1000;
    if (shake > 0) shake = Math.max(0, shake - dt / 12);
    if (dying && shake > 0) dieFlash = 0.18 + 0.14 * Math.abs(Math.sin(ts / 90)); else dieFlash = 0;

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt / 16; p.y += p.vy * dt / 16;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    draw(running && moving ? Math.min(1, acc / BASE_SPEED) : 1);
  }

  function onShow() {
    mounted = true;
    lastTs = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function onHide() {
    mounted = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  API.register({
    id: 'snake',
    name: 'Змейка',
    icon: '🐍',
    bestKey: BEST_KEY,
    create: function (holder) {
      el = holder;
      el.innerHTML =
        '<div class="gm-top">' +
          '<div class="gm-pill"><div class="cap">Яблоки</div><div class="val" id="gmScore">0</div></div>' +
          '<div class="gm-pill best"><div class="cap">Рекорд</div><div class="val" id="gmBest">0</div></div>' +
          '<button id="gmGear" class="gm-gear" aria-label="Настройки">⚙️</button>' +
        '</div>' +
        '<div class="gm-board">' +
          '<canvas id="gmCv"></canvas>' +
          '<div id="gmOver" class="gm-over" style="display:none">' +
            '<div class="t" id="gmOverTitle">🐍 Игра окончена</div>' +
            '<div class="s" id="gmOverText"></div>' +
            '<button id="gmAgain">Играть ещё</button>' +
          '</div>' +
          '<div id="gmReady" class="gm-over">' +
            '<div class="t">🐍 Змейка</div>' +
            '<div class="s">Собирай яблоки и вырастай. После «Начать» змейка ждёт первого свайпа — куда свайпнул, туда и поехала!</div>' +
            '<button id="gmStart">▶ Начать</button>' +
          '</div>' +
          '<div id="gmCfg" class="gm-cfg" style="display:none">' +
            '<button id="gmCfgClose" class="gm-cfg-close">✕</button>' +
            '<div class="gm-cfg-row" data-cfg="apples">' +
              '<button data-v="1">🍎</button><button data-v="3">🍎🍎</button><button data-v="5">🍎🍎🍎</button>' +
            '</div>' +
            '<div class="gm-cfg-row" data-cfg="size">' +
              '<button data-v="s"><span class="sz s"></span></button>' +
              '<button data-v="m"><span class="sz m"></span></button>' +
              '<button data-v="l"><span class="sz l"></span></button>' +
            '</div>' +
            '<div class="gm-cfg-row" data-cfg="speed">' +
              '<button data-v="s">🐢</button><button data-v="m">🚶</button><button data-v="f">🐇</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      cv = q('#gmCv');
      ctx = cv.getContext('2d');
      updateBestUI();
      resetField();
      draw(1);

      // события
      q('#gmGear').addEventListener('click', function () {
        if (running) { running = false; paused = true; }
        syncCfgUI();
        q('#gmCfg').style.display = 'flex';
      });
      q('#gmCfgClose').addEventListener('click', function () {
        q('#gmCfg').style.display = 'none';
        if (paused) { running = true; paused = false; }
      });
      el.querySelectorAll('.gm-cfg-row').forEach(function (row) {
        row.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          var key = row.dataset.cfg;
          if (key === 'apples') cfg.apples = parseInt(b.dataset.v, 10);
          else cfg[key] = b.dataset.v;
          saveCfg();
          syncCfgUI();
          if (!running && !dying && q('#gmReady').style.display !== 'none') {
            resetField();
            draw(1);
          }
        });
      });
      window.addEventListener('resize', function () {
        if (!mounted) return;
        resize();
        if (!running) draw(1);
      });
      cv.addEventListener('pointerdown', function (e) {
        if (q('#gmCfg').style.display !== 'none') return;
        var r = cv.getBoundingClientRect();
        var tx = (e.clientX - r.left) / r.width * COLS;
        var ty = (e.clientY - r.top) / r.height * ROWS;
        var h = snake[0];
        var dx = tx - (h.x + 0.5), dy = ty - (h.y + 0.5);
        if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) return;
        if (Math.abs(dx) > Math.abs(dy)) pushDir({ x: dx > 0 ? 1 : -1, y: 0 });
        else pushDir({ x: 0, y: dy > 0 ? 1 : -1 });
      });
      q('#gmStart').addEventListener('click', start);
      q('#gmAgain').addEventListener('click', start);

      return { onShow: onShow, onHide: onHide };
    }
  });
})();
