// ===== Редактор остановок =====
var stopLayer = null;
var STOP_DATA = [];
var sheetStopIdx = null;
var STOPS_VISIBLE = false; // невидимые по умолчанию; галка в настройках — для правки

// невидимая кликабельная зона поверх родного значка Яндекса
function stopIcon() {
  return L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12], html: '' });
}

// короткая красная пульсирующая вспышка при клике
function stopIconGlow() {
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: '<div style="width:34px;height:34px;border-radius:50%;' +
      'background:rgba(229,57,53,.35);border:2px solid rgba(229,57,53,.7);' +
      'box-shadow:0 0 14px rgba(229,57,53,.45);' +
      'animation:pulseGlow .5s ease both;"></div>'
  });
}

// видимая иконка для режима правки
function visibleIcon(named) {
  var size = named ? 16 : 13;
  var bg = named ? '#f5f5f5' : 'rgba(255,255,255,.6)';
  var border = named ? '#888' : '#bbb';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: '<div style="width:' + size + 'px;height:' + size + 'px;' +
      'border-radius:50%;background:' + bg + ';border:1px solid ' + border + ';' +
      'display:flex;align-items:center;justify-content:center;' +
      'box-shadow:0 1px 2px rgba(0,0,0,.25);' +
      'font-size:' + Math.round(size * 0.65) + 'px;line-height:1;">🚏</div>'
  });
}

// все остановки всегда на карте и кликабельны
window.applyStopFilter = function () {
  if (!stopLayer) return;
  stopLayer.clearLayers();
  STOP_DATA.forEach(function (s) {
    if (s.deleted || !s._marker) return;
    s._marker.setIcon(STOPS_VISIBLE ? visibleIcon(s.named) : stopIcon());
    s._marker.addTo(stopLayer);
  });
  stopLayer.addTo(MAP);
};

function createStopMarker(s, idx) {
  var m = L.marker(s.coords, { draggable: true, icon: STOPS_VISIBLE ? visibleIcon(s.named) : stopIcon() });
  m.on('click', function () {
    if (!STOPS_VISIBLE) {
      m.setIcon(stopIconGlow());
      setTimeout(function () {
        if (!STOPS_VISIBLE) m.setIcon(stopIcon());
      }, 1000);
    }
    openStopSheet(idx);
  });
  m.on('dragend', function () {
    var p = m.getLatLng();
    s.coords = [p.lat, p.lng];
  });
  s._marker = m;
  return m;
}

window.openStopSheet = function (idx) {
  var s = STOP_DATA[idx];
  if (!s) return;
  sheetStopIdx = idx;
  document.getElementById('sheetTitle').textContent = s.name || 'Без названия';
  document.getElementById('sheetRoutes').innerHTML =
    window.routesHtml ? window.routesHtml(s.coords) : '<i>Загрузка…</i>';
  document.getElementById('sheetArrivals').innerHTML =
    window.arrivalsHtml ? window.arrivalsHtml(s.coords) : '';
  document.getElementById('sheetCoords').textContent =
    s.coords[0].toFixed(6) + ', ' + s.coords[1].toFixed(6) +
    (s.osm_id ? ' · OSM ' + s.osm_id : '');
  var sheet = document.getElementById('sheet');
  sheet.style.transform = ''; // сброс ручного перетаскивания
  sheet.classList.add('open');
};

window.closeSheet = function () {
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheet').style.transform = '';
  sheetStopIdx = null;
};

// ===== Свайп-закрытие плашки: зажать и потянуть вниз =====
function initSheetDrag() {
  var sheet = document.getElementById('sheet');
  var startY = null;
  var curDelta = 0;
  var moved = false;

  function startDrag(y, target) {
    // не мешаем бейджам внутри плашки
    if (target.closest && target.closest('.badge')) return;
    startY = y;
    curDelta = 0;
    moved = false;
    sheet.classList.add('dragging');
  }

  function moveDrag(y) {
    if (startY === null) return;
    var delta = y - startY;
    if (delta > 6) moved = true;
    // тянуть можно только вниз; вверх — лёгкое сопротивление
    curDelta = delta > 0 ? delta : delta / 4;
    sheet.style.transform = 'translateY(' + curDelta + 'px)';
  }

  function endDrag() {
    if (startY === null) return;
    sheet.classList.remove('dragging');
    var THRESHOLD = 90; // сколько надо протянуть, чтобы закрыть
    if (curDelta > THRESHOLD) {
      sheet.style.transition = 'transform .25s ease-in';
      sheet.style.transform = 'translateY(110%)';
      setTimeout(function () {
        window.closeSheet();
      }, 250);
    } else {
      sheet.style.transition = 'transform .3s cubic-bezier(.3,1.3,.45,1)';
      sheet.style.transform = 'translateY(0)';
    }
    startY = null;
    curDelta = 0;
    setTimeout(function () { sheet.style.transition = ''; }, 350);
  }

  sheet.addEventListener('touchstart', function (e) {
    if (!sheet.classList.contains('open')) return;
    startDrag(e.touches[0].clientY, e.target);
  }, { passive: true });

  sheet.addEventListener('touchmove', function (e) {
    moveDrag(e.touches[0].clientY);
  }, { passive: true });

  sheet.addEventListener('touchend', endDrag);
  sheet.addEventListener('touchcancel', endDrag);

  // на компьютере — мышкой за ручку
  var handle = sheet.querySelector('.sheet-handle');
  if (handle) {
    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      startDrag(e.clientY, handle);
      var mm = function (ev) { moveDrag(ev.clientY); };
      var mu = function () {
        endDrag();
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
      };
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
    });
  }

  // защита от ложных кликов после свайпа
  sheet.addEventListener('click', function (e) {
    if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
  }, true);
}

function exportStops() {
  var lines = [
    '// Остановки Альметьевска — скорректировано вручную',
    'var STOPS = ['
  ];
  STOP_DATA.forEach(function (s) {
    if (s.deleted || !s.named) return;
    lines.push('  { name: ' + JSON.stringify(s.name) + ', coords: [' +
      s.coords[0].toFixed(6) + ', ' + s.coords[1].toFixed(6) + ']' +
      (s.osm_id ? ", osm_id: '" + s.osm_id + "'" : '') + ' },');
  });
  lines.push('];', '', 'var STOPS_UNNAMED = [');
  STOP_DATA.forEach(function (s) {
    if (s.deleted || s.named) return;
    lines.push('  { name: ' + JSON.stringify(s.name) + ', coords: [' +
      s.coords[0].toFixed(6) + ', ' + s.coords[1].toFixed(6) + ']' +
      (s.osm_id ? ", osm_id: '" + s.osm_id + "'" : '') + ' },');
  });
  lines.push('];');
  var blob = new Blob([lines.join('\n')], { type: 'text/javascript' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stops.js';
  a.click();
}

function initEditor() {
  stopLayer = L.layerGroup();

  if (typeof STOPS !== 'undefined') {
    STOPS.forEach(function (s) {
      STOP_DATA.push({ name: s.name || '', coords: [s.coords[0], s.coords[1]], named: true, deleted: false, osm_id: s.osm_id });
    });
  }
  if (typeof STOPS_UNNAMED !== 'undefined') {
    STOPS_UNNAMED.forEach(function (s) {
      STOP_DATA.push({ name: s.name || '', coords: [s.coords[0], s.coords[1]], named: false, deleted: false, osm_id: s.osm_id });
    });
  }

  STOP_DATA.forEach(function (s, idx) { createStopMarker(s, idx); });

  var addMode = false;
  var addBtn = document.getElementById('addStopBtn');
  addBtn.addEventListener('click', function () {
    addMode = !addMode;
    addBtn.textContent = addMode ? 'Теперь кликни по карте' : '+ Остановка';
    if (addMode) showTab('map');
  });
  MAP.on('click', function (e) {
    if (!addMode) return;
    addMode = false;
    addBtn.textContent = '+ Остановка';
    var name = prompt('Название остановки (пусто — оставить без названия):', '') || '';
    var s = { name: name, coords: [e.latlng.lat, e.latlng.lng], named: name !== '', deleted: false };
    STOP_DATA.push(s);
    createStopMarker(s, STOP_DATA.length - 1);
    window.applyStopFilter();
  });

  document.getElementById('exportStopsBtn').addEventListener('click', exportStops);

  var cb = document.getElementById('stopMarkers');
  if (cb) {
    cb.addEventListener('change', function () {
      STOPS_VISIBLE = this.checked;
      window.applyStopFilter();
    });
  }

  initSheetDrag();
}
