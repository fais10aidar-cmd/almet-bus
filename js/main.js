// ===== Запуск =====
var MAP = L.map('map').setView([54.915, 52.31], 12);

L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&projection=web_mercator&lang=ru_RU', {
  attribution: '&copy; Яндекс',
  maxZoom: 18
}).addTo(MAP);
window.__aliceMap = MAP;  

var currentTab = 'map';

function showTab(name) {
  if (name === currentTab) return;

  var order = ['schedule', 'map', 'games', 'settings'];
  var oldIdx = order.indexOf(currentTab);
  var newIdx = order.indexOf(name);
  var dir = newIdx > oldIdx ? 'tab-anim-in-left' : 'tab-anim-in-right';

  var newEl = document.getElementById('tab-' + name);

  document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
  newEl.classList.add('active');

  newEl.classList.remove('tab-anim-in-left', 'tab-anim-in-right');
  void newEl.offsetWidth; // принудительный reflow, чтобы анимация сыграла заново
  newEl.classList.add(dir);

  document.querySelectorAll('#tabbar button').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === name);
  });

  currentTab = name;
  if (name === 'map') MAP.invalidateSize();
}

// 1. Панель вкладок и режим доступности — первыми, чтобы интерфейс жил всегда
document.querySelectorAll('#tabbar button').forEach(function (b) {
  b.addEventListener('click', function () { showTab(b.dataset.tab); });
});

try { initA11y(); }
catch (e) { console.error('a11y:', e); }

// 2. Экранная ошибка: если что-то падает, вместо молчаливой смерти — красная плашка
window.onerror = function (msg, src, line) {
  var el = document.getElementById('jsError');
  if (!el) {
    el = document.createElement('div');
    el.id = 'jsError';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;' +
      'background:#e53935;color:#fff;padding:10px 14px;font-size:13px;';
    document.body.appendChild(el);
  }
  el.textContent = 'Ошибка скрипта: ' + msg + ' (' + (src || '?') + ':' + line + ')';
};

// 3. Редактор, маршруты и игры — каждый в своей страховке
try { initEditor(); window.applyStopFilter(); }
catch (e) { console.error('editor:', e); window.onerror('editor: ' + e.message, 'editor.js', 0); }

try { initRoutes(); update(); }
catch (e) { console.error('routes:', e); window.onerror('routes: ' + e.message, 'routes.js', 0); }
