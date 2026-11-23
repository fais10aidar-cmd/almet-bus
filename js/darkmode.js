// ===== Тема приложения: светлая полировка + тёмная тема =====
(function () {
  var KEY = 'theme_dark_v1';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  var dark = stored !== null ? stored === '1'
    : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // ===== 1. Светлая полировка: работает ВСЕГДА, даже с выключенным дарк-модом =====
  var base = document.createElement('style');
  base.textContent = [
    // настройки: аккуратные блоки вместо гигантских чёрных рамок (только вне режима слабовидящих)
    'body:not(.a11y) .a11y-box { border:1px solid #e3e6ec; border-radius:14px; background:#fff;',
    '  padding:14px 16px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,.04); }',
    'body:not(.a11y) .a11y-box label { font-size:15px; font-weight:600; }',
    'body:not(.a11y) .a11y-box input[type="checkbox"] { width:20px; height:20px; accent-color:#007aff; }',
    'body:not(.a11y) .a11y-box .hint { font-size:12.5px; color:#8a93a5; margin:6px 0 0; line-height:1.45; }',
    // чат: мягче углы и тень
    '.chat-box { border-radius:16px; }',
    // игры: карточкам лёгкий отклик на касание
    '.gm-tile { transition:transform .15s ease; }',
    '.gm-tile:hover { transform:translateY(-2px); }',
    // таббар: белая подложка и мягкая тень сверху
    '#tabbar { background:#fff; box-shadow:0 -2px 10px rgba(0,0,0,.06); }'
  ].join('\n');
  document.head.appendChild(base);

// ===== Тёмная тема =====
(function () {
  var KEY = 'theme_dark_v1';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  var dark = stored !== null ? stored === '1'
    : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  var D = 'body.dark:not(.a11y)';
  var st = document.createElement('style');
  st.textContent = [
    D + ' { background:#07080b; color:#e8eaf0; }',
    D + ' h2, ' + D + ' h3 { color:#fff; }',
    D + ' #app { background:#07080b; }',
    D + ' .a11y-box { background:#131519; border-color:#262a33; }',
    D + ' .hint { color:#8a919c; }',
    D + ' label { color:#e8eaf0; }',
    D + ' button { background:#16181e; color:#e8eaf0; border:1px solid #2a2e38; }',
    D + ' #tabbar { background:#0d0e12; border-top:1px solid #23262f; }',
    D + ' #tabbar button { color:#7d8492; background:transparent; border:none; }',
    D + ' #tabbar button.active { color:#0a84ff; }',
    D + ' #sheet { background:#131519; color:#e8eaf0; box-shadow:0 -4px 20px rgba(0,0,0,.6); }',
    D + ' #sheet .sheet-handle { background:#33363f; }',
    D + ' #sheetCoords { color:#8a919c; }',
    D + ' input[type="text"], ' + D + ' input[type="number"], ' + D + ' select {',
    '  background:#131519; color:#e8eaf0; border:1px solid #2a2e38; }',
    D + ' #routePicker { background:#131519; color:#e8eaf0; border-color:#262a33; }',
    D + ' #routePicker button { background:#1a1d24; }',

    // --- расписание: спокойная сетка только для тёмной темы ---
    D + ' #scheduleList .sched-sub { color:#8a919c; background:transparent; border:none; }',
    D + ' #scheduleList .sched-note { color:#8a919c; background:transparent; border:none; }',
    D + ' #scheduleList .sched-note a { color:#6db2ff; }',
    D + ' #scheduleList .sched-chips { background:transparent; border:none; }',
    D + ' #scheduleList .sched-chip { background:#131519; color:#e8eaf0; border-color:#262a33; }',
    D + ' #scheduleList .sched-chip.active { background:#1f2430; border-color:#33363f; color:#fff; font-weight:600; }',
    D + ' #scheduleList .sched-daybar { background:transparent; border:none; }',
    D + ' #scheduleList .sched-daybar .lbl { color:#8a919c; }',
    D + ' #scheduleList .sched-daybtn { background:#131519; color:#e8eaf0; border-color:#2a2e38; }',
    D + ' #scheduleList .sched-daybtn.active { background:#1f2430; border-color:#33363f; color:#fff; font-weight:600; }',
    D + ' #scheduleList .sched-dirrow { background:transparent; border:none; }',
    D + ' #scheduleList .sched-dir { background:#1a1d24; color:#e8eaf0; border-color:#2a2e38; }',
    D + ' #scheduleList .sched-dir.active { background:#2fae56; border-color:#2fae56; color:#fff; }',
    D + ' #scheduleList .sched-next { background:#101d16; border-color:#24402f; color:#e8eaf0; }',
    D + ' #scheduleList .sched-next .cap { color:#7fcf9d; }',
    D + ' #scheduleList .sched-end { background:#221a10; border-color:#3f3320; color:#e8eaf0; }',
    D + ' #scheduleList .sched-times { background:transparent; border:none; }',
    D + ' #scheduleList .sched-time { background:#1a1d24; color:#e8eaf0; border:none; }',
    D + ' #scheduleList .sched-time.next { background:#2fae56; color:#fff; }',
    D + ' #scheduleList .disp-block, ' + D + ' #sheetArrivals .disp-block { background:transparent; border:none; padding:0; }',
    D + ' #scheduleList .disp-text, ' + D + ' #sheetArrivals .disp-text { color:#8a919c; }',
    D + ' #scheduleList .disp-call, ' + D + ' #sheetArrivals .disp-call { background:transparent; color:#6db2ff; font-weight:normal; padding:0; text-decoration:underline; border:none; }',

    // --- плашка остановки ---
    D + ' #sheetArrivals .arr-head span { color:#e8eaf0; }',
    D + ' #sheetArrivals .arr-schedbtn { background:#1f2430; color:#fff; border:1px solid #33363f; }',
    D + ' #sheetArrivals .arr-row { background:#1a1d24; color:#e8eaf0; border:none; }',
    D + ' #sheetArrivals .arr-row.first { background:#101d16; border-color:#24402f; }',
    D + ' #sheetArrivals .arr-dirname2 { color:#8a919c; }',
    D + ' #sheetArrivals .arr-when i { color:#8a919c; }',
    D + ' #sheetArrivals .arr-row.first .arr-when i { color:#7fcf9d; }',
    D + ' #sheetArrivals .arr-note { color:#8a919c; }',
    D + ' #sheetArrivals .arr-back { background:#1a1d24; color:#e8eaf0; }',

    // --- чат ---
    D + ' .chat-box { background:#131519; box-shadow:0 2px 10px rgba(0,0,0,.45); }',
    D + ' .chat-status { background:#1a1d24; color:#8a919c; }',
    D + ' .chat-status.err { background:#322025; color:#ff8a8a; }',
    D + ' .msg.bot { color:#8e93a3; }',
    D + ' .msg.mine { background:#0a84ff; color:#fff; }',
    D + ' .msg.other { background:#1a1d24; color:#e8eaf0; box-shadow:none; }',
    D + ' .chat-input-row { background:#131519; border-top:1px solid #262a33; }',
    D + ' .chat-input { background:#1a1d24; color:#e8eaf0; border-color:#2a2e38; }',
    D + ' .chat-send { background:#0a84ff; }',

    // --- игры ---
    D + ' .game-tile { background:#131519; border-color:#262a33; box-shadow:none; }',
    D + ' .game-tile-name { color:#e8eaf0; }',
    D + ' .game-tile-play { background:#0a84ff; color:#fff; }',
    D + ' .gm-tile { background:#131519; border-color:#262a33; box-shadow:none; }',
    D + ' .gm-tile-name { color:#e8eaf0; }',
    D + ' .gm-tile-best { color:#8a919c; }',
    D + ' .gm-tile button { background:#0a84ff; color:#fff; }',
    D + ' .gm-pill { background:#14161c; box-shadow:none; }',
    D + ' .gm-pill .cap { color:#8a919c; }',
    D + ' .gm-pill .val { color:#e8eaf0; }',
    D + ' .gm-pill.best .val { color:#4ade80; }',
    D + ' .gm-gear { background:#16181e; color:#e8eaf0; }',
    D + ' .gm-gear:active { background:#1a1d24; }',
    D + ' .gm-back { background:#16181e; color:#e8eaf0; border:1px solid #2a2e38; }',
    D + ' #gameRoot h2 { color:#fff; }'
  ].join('\n');
  document.head.appendChild(st);

  // ===== Автофикс контраста =====
  var SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, HEAD: 1, TITLE: 1 };

  // разбор цвета без регулярки — не ломается при копировании из чата
  function parseRgb(s) {
    s = String(s || '');
    var i = s.indexOf('rgb');
    if (i < 0) return null;
    var o = s.indexOf('(', i), c = s.indexOf(')', i);
    if (o < 0 || c < 0) return null;
    var parts = s.slice(o + 1, c).split(',');
    if (parts.length < 3) return null;
    var r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2]);
    var a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r: r, g: g, b: b, a: a };
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function fixLight() {
    var els = document.body.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (SKIP[el.tagName]) continue;
      var cs;
      try { cs = getComputedStyle(el); } catch (e) { continue; }
      var bg = parseRgb(cs.backgroundColor);
      if (!bg || bg.a < 0.1) continue;
      if (lum(bg) > 0.45) {
        el.setAttribute('data-dfix', '1');
        el.style.backgroundColor = '#171a20';
        var bc = parseRgb(cs.borderTopColor);
        if (bc && bc.a > 0.1) el.style.borderColor = '#2a2e38';
        var tc = parseRgb(cs.color);
        if (tc && lum(tc) < 0.45) el.style.color = '#e8eaf0';
      }
    }
  }

  function clearFix() {
    var els = document.querySelectorAll('[data-dfix]');
    for (var i = 0; i < els.length; i++) {
      els[i].style.removeProperty('background-color');
      els[i].style.removeProperty('border-color');
      els[i].style.removeProperty('color');
      els[i].removeAttribute('data-dfix');
    }
  }

  var fixTimer = null;
  var tick = null;
  function scheduleFix() {
    if (!dark) return;
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(function () { fixLight(); }, 80);
  }

  var mo = null;
  function ensureObserver() {
    if (mo || !window.MutationObserver) return;
    mo = new MutationObserver(scheduleFix);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function apply() {
    document.body.classList.toggle('dark', dark);
    var cb = document.getElementById('darkMode');
    if (cb) cb.checked = dark;
    try { localStorage.setItem(KEY, dark ? '1' : '0'); } catch (e) {}
    if (dark) {
      scheduleFix();
      setTimeout(scheduleFix, 400);
      ensureObserver();
      if (!tick) tick = setInterval(scheduleFix, 2000);
    } else {
      clearFix();
    }
  }

  window.AliceDark = {
    toggle: function () { dark = !dark; apply(); },
    is: function () { return dark; }
  };

  function init() {
    var settings = document.getElementById('tab-settings');
    if (settings && !document.getElementById('darkMode')) {
      var box = document.createElement('div');
      box.className = 'a11y-box';
      box.innerHTML =
        '<label class="a11y-toggle" style="display:flex;align-items:center;gap:8px;">' +
        '<input type="checkbox" id="darkMode"><span>Тёмная тема</span></label>' +
        '<p class="hint">Тёмное оформление всего приложения. Запоминается. Кнопка 🌙 в чате переключает ту же тему.</p>';
      var h2 = settings.querySelector('h2');
      if (h2 && h2.nextSibling) settings.insertBefore(box, h2.nextSibling);
      else if (h2) h2.insertAdjacentElement('afterend', box);
      else settings.appendChild(box);
      document.getElementById('darkMode').addEventListener('change', function () {
        dark = this.checked; apply();
      });
    }
    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
})();
