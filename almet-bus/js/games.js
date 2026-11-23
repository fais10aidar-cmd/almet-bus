// ===== Игровой движок: реестр игр + список + навигация =====
window.GameAPI = (function () {
  var registry = [];
  var root, listView, gameView, active = null;

  // ——— общие стили всех игр
  var st = document.createElement('style');
  st.textContent = [
    '#gameRoot { max-width:520px; margin:0 auto; }',
    '.gm-list { display:flex; gap:12px; flex-wrap:wrap; }',
    '.gm-list .gm-tile { flex:1; min-width:150px; }',
    '.gm-tile { display:flex; flex-direction:column; align-items:center; gap:8px; padding:26px 16px;',
    '  border:1px solid #e3e3e3; border-radius:16px; background:#fff; cursor:pointer;',
    '  box-shadow:0 2px 8px rgba(0,0,0,.06); }',
    '.gm-tile-ico { font-size:52px; }',
    '.gm-tile-name { font-weight:bold; font-size:19px; }',
    '.gm-tile-best { font-size:13px; color:#8a93a5; }',
    '.gm-tile button { margin-top:4px; padding:10px 30px; border:none; border-radius:12px;',
    '  background:#007aff; color:#fff; font-size:16px; cursor:pointer; }',
    '.gm-top { display:flex; gap:8px; margin-bottom:10px; }',
    '.gm-pill { flex:1; background:#fff; border-radius:16px; padding:10px 14px; box-shadow:0 2px 10px rgba(0,0,0,.07); }',
    '.gm-pill .cap { font-size:11px; color:#8a93a5; text-transform:uppercase; letter-spacing:.5px; }',
    '.gm-pill .val { font-size:24px; font-weight:800; color:#1c2430; line-height:1.1; }',
    '.gm-top.three .gm-pill .val { font-size:19px; }',
    '.gm-pill.best .val { color:#34c759; }',
    '.gm-pill .val.pop { animation:gmpop .3s ease; }',
    '@keyframes gmpop { from { transform:scale(1.4); } to { transform:scale(1); } }',
    '.gm-gear { flex:0 0 auto; width:52px; border:none; border-radius:16px; background:#fff;',
    '  font-size:22px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.07); }',
    '.gm-gear:active { background:#f0f0f0; }',
    '.gm-board { position:relative; border-radius:18px; overflow:hidden; box-shadow:0 10px 30px rgba(15,30,60,.25); }',
    '.gm-board canvas { display:block; width:100%; height:auto; touch-action:none; }',
    '.gm-over { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;',
    '  text-align:center; padding:24px; color:#fff;',
    '  background:linear-gradient(180deg, rgba(13,20,36,.9), rgba(13,20,36,.8));',
    '  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }',
    '.gm-over .t { font-size:24px; font-weight:800; margin-bottom:8px; }',
    '.gm-over .s { font-size:14.5px; opacity:.85; margin-bottom:18px; line-height:1.45; max-width:280px; }',
    '.gm-over button { padding:13px 34px; border:none; border-radius:24px; cursor:pointer;',
    '  background:linear-gradient(135deg,#34c759,#0aa64e); color:#fff; font-size:16px; font-weight:bold;',
    '  box-shadow:0 6px 18px rgba(52,199,89,.45); }',
    '.gm-over button:active { transform:scale(.95); }',
    '.gm-cfg { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;',
    '  gap:14px; background:linear-gradient(180deg, rgba(13,20,36,.92), rgba(13,20,36,.85));',
    '  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }',
    '.gm-cfg-row { display:flex; gap:8px; justify-content:center; }',
    '.gm-cfg-row button { min-width:64px; height:56px; padding:0 10px; border:2px solid rgba(255,255,255,.25);',
    '  border-radius:14px; background:rgba(255,255,255,.12); cursor:pointer;',
    '  font-size:22px; line-height:1; white-space:nowrap; display:flex; align-items:center; justify-content:center; }',
    '.gm-cfg-row button.active { background:#007aff; border-color:#007aff; box-shadow:0 3px 12px rgba(0,122,255,.5); }',
    '.sz { display:inline-block; border-radius:4px; background:#fff; }',
    '.sz.s { width:12px; height:12px; }',
    '.sz.m { width:19px; height:19px; }',
    '.sz.l { width:27px; height:27px; }',
    '.gm-cfg-close { position:absolute; top:12px; right:12px; width:40px; height:40px; padding:0;',
    '  border:none; border-radius:12px; background:rgba(255,255,255,.15); color:#fff; font-size:18px; cursor:pointer; }',
    '.gm-back { display:block; margin:12px auto 0; padding:9px 20px; border:none; border-radius:10px;',
    '  background:#eee; font-size:14px; cursor:pointer; }',
    'body.a11y .gm-tile { border:3px solid #000; }',
    'body.a11y .gm-tile button, body.a11y .gm-gear { background:#000; color:#ffdd00; font-weight:bold; }',
    'body.a11y .gm-pill { background:#000; border:3px solid #000; }',
    'body.a11y .gm-pill .cap { color:#fff; font-size:14px; }',
    'body.a11y .gm-pill .val, body.a11y .gm-pill.best .val { color:#ffdd00; }',
    'body.a11y .gm-over, body.a11y .gm-cfg { background:#000; }',
    'body.a11y .gm-over .t, body.a11y .gm-over .s { color:#ffdd00; font-size:18px; }',
    'body.a11y .gm-over button, body.a11y .gm-cfg-close { background:#ffdd00; color:#000; font-weight:bold; }',
    'body.a11y .gm-cfg-row button { background:#000; color:#ffdd00; border-color:#ffdd00; font-weight:bold; }',
    'body.a11y .gm-cfg-row button.active { text-decoration:underline; }',
    'body.a11y .sz { background:#ffdd00; }',
    'body.a11y .gm-back { background:#000; color:#ffdd00; font-weight:bold; }'
  ].join('\n');
  document.head.appendChild(st);

  function isA11y() { return document.body.classList.contains('a11y'); }

  function bestGet(key) {
    try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
  }
  function bestSet(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) {}
    refreshBests();
  }

  function renderList() {
    if (!root) return;
    document.getElementById('gmList').innerHTML = registry.map(function (g) {
      return '<div class="gm-tile" data-id="' + g.id + '">' +
        '<div class="gm-tile-ico">' + g.icon + '</div>' +
        '<div class="gm-tile-name">' + g.name + '</div>' +
        '<div class="gm-tile-best">рекорд: <span data-best="' + g.id + '">0</span></div>' +
        '<button type="button">Играть</button></div>';
    }).join('');
    document.querySelectorAll('#gmList .gm-tile').forEach(function (tile) {
      tile.addEventListener('click', function () { open(tile.dataset.id); });
    });
    refreshBests();
  }

  function refreshBests() {
    registry.forEach(function (g) {
      var s = root.querySelector('[data-best="' + g.id + '"]');
      if (s) s.textContent = bestGet(g.bestKey);
    });
  }

  function open(id) {
    var g = null;
    for (var i = 0; i < registry.length; i++) if (registry[i].id === id) g = registry[i];
    if (!g) return;
    closeActive();
    gameView.innerHTML = '';
    var holder = document.createElement('div');
    gameView.appendChild(holder);
    var back = document.createElement('button');
    back.className = 'gm-back';
    back.textContent = '← К списку игр';
    back.addEventListener('click', closeActive);
    gameView.appendChild(back);
    var api = g.create(holder) || {};
    active = { def: g, api: api };
    listView.style.display = 'none';
    gameView.style.display = 'block';
    if (api.onShow) api.onShow();
  }

  function closeActive() {
    if (active && active.api && active.api.onHide) active.api.onHide();
    active = null;
    gameView.style.display = 'none';
    gameView.innerHTML = '';
    listView.style.display = 'block';
    refreshBests();
  }

  function register(def) {
    registry.push(def);
    if (root) renderList();
  }

  root = document.getElementById('gameRoot');
  if (root) {
    root.innerHTML =
      '<div id="gmTileView"><div class="gm-list" id="gmList"></div></div>' +
      '<div id="gmGameView" style="display:none"></div>';
    listView = document.getElementById('gmTileView');
    gameView = document.getElementById('gmGameView');
  }

  return { register: register, isA11y: isA11y, bestGet: bestGet, bestSet: bestSet };
})();
