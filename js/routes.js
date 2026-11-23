// ===== Маршруты =====
var ROUTE_GEOS = []; // {id, label, color, coords}
var layers = {};
var ACTIVE_ROUTE = ''; // пусто = ничего не показывать

window.getActiveRoute = function () { return ACTIVE_ROUTE; };

// нормализация: 'bus_8Б' и '8Б' и '8b' -> '8b'
function normalizeId(str) {
  var s = String(str || '').toLowerCase().replace(/^bus_|^trolleybus_/, '');
  return s.replace(/[абвгд]/g, function (ch) {
    return { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd' }[ch] || ch;
  });
}

// достаём «номер маршрута»: 'Тб 7А' -> '7a', 'А 2Б' -> '2b', id 'tb1' -> '1'
function routeToken(route) {
  var s = normalizeId(route.label || '') || normalizeId(route.popup || '') || normalizeId(route.id || '');
  var m = s.match(/[0-9]+[a-z]*/);
  return m ? m[0] : '';
}

// запись из window.SCHEDULE (массив из schedule.js) по номеру маршрута
function scheduleFor(route) {
  var S = window.SCHEDULE;
  if (!S || !S.length) return null;
  var tok = routeToken(route);
  if (!tok) return null;
  for (var i = 0; i < S.length; i++) {
    if (normalizeId(S[i].num) === tok) return S[i];
  }
  return null;
}

// название маршрута с запасными вариантами
function routeLabel(route) {
  return route.label || route.popup ||
    ('А ' + String(route.id || '').replace(/^bus_|^trolleybus_/, '').replace(/_d0$/, ''));
}

function dayType() { var d = new Date().getDay(); return (d === 0 || d === 6) ? 'we' : 'wd'; }
function toMin(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); }
function byMin(a, b) { return toMin(a) - toMin(b); }

// едет ли сезонный маршрут прямо сейчас (май–октябрь)
function routeActiveNow(r) {
  if (!r || !r.seasonal) return true;
  var m = new Date().getMonth() + 1;
  return m >= 5 && m <= 10;
}

// все рейсы маршрута за выбранный тип дня (объединение направлений), по возрастанию
function allTimes(s, t) {
  var out = [];
  (s.dirs || []).forEach(function (d) {
    var arr = (d.daily && d.daily.length) ? d.daily : (d[t] || []);
    out = out.concat(arr);
  });
  out.sort(byMin);
  return out;
}

// какой режим дней реально есть в данных: daily / wd / we
function schedDayType(s) {
  var hasDaily = false, hasWd = false, hasWe = false;
  (s.dirs || []).forEach(function (d) {
    if (d.daily && d.daily.length) hasDaily = true;
    if (d.wd && d.wd.length) hasWd = true;
    if (d.we && d.we.length) hasWe = true;
  });
  if (hasDaily && !hasWd && !hasWe) return 'daily';
  if (hasWd && hasWe) return dayType();
  if (hasWd) return 'wd';
  if (hasWe) return 'we';
  return 'daily';
}

// рабочие часы маршрута: [первыйЧас .. последнийЧас] за сегодня
function workHours(route) {
  var s = scheduleFor(route);
  if (!s) return null;
  if (s.seasonal && !routeActiveNow(s)) return null;
  var dt = schedDayType(s);
  var times = allTimes(s, dt === 'daily' ? 'wd' : dt);
  if (!times.length) return null;
  var f = toMin(times[0]), l = toMin(times[times.length - 1]);
  return [Math.floor(f / 60), Math.floor(l / 60)];
}

// 'Приедет в 17 и 18' для остановки
window.arrivalsHtml = function (point) {
  var ids = window.routeIdsNear(point);
  var geos = ROUTE_GEOS.filter(function (g) { return ids.indexOf(g.id) !== -1; });
  if (!geos.length) return '';

  var minH = Infinity, maxH = -1, haveData = false;
  geos.forEach(function (g) {
    var route = ROUTES_EXTRA.find(function (r) { return r.id === g.id; }) || { id: g.id, label: g.label };
    var wh = workHours(route);
    if (!wh) return;
    haveData = true;
    if (wh[0] < minH) minH = wh[0];
    if (wh[1] > maxH) maxH = wh[1];
  });

  if (!haveData) return '<div class="arrivals"><i>Расписание не уточнялось</i></div>';

  var now = new Date();
  var h = now.getHours();
  var first, second, tomorrow = false;

  if (h < minH) {
    first = minH;
  } else if (h > maxH) {
    first = minH;
    tomorrow = true;
  } else {
    first = h;
    second = h + 1 <= maxH ? h + 1 : null;
  }

  function hourTxt(n) { return '<b>' + n + '</b>'; }

  var txt;
  if (second !== null && second !== undefined) {
    txt = 'Приедет в ' + hourTxt(first) + ' и ' + hourTxt(second);
  } else {
    txt = 'Приедет в ' + hourTxt(first);
  }
  if (tomorrow) txt = 'Сегодня всё — ' + txt.charAt(0).toLowerCase() + txt.slice(1) + ' <i>завтра</i>';

  return '<div class="arrivals">' + txt +
    ' <span class="arr-approx">≈ по сводке, без точных минут</span></div>';
};

function distM(a, b) {
  var R = 6371000;
  var dLat = (b[0] - a[0]) * Math.PI / 180;
  var dLng = (b[1] - a[1]) * Math.PI / 180;
  var lat1 = a[0] * Math.PI / 180, lat2 = b[0] * Math.PI / 180;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestDist(geo, point) {
  var min = Infinity;
  for (var i = 0; i < geo.coords.length; i++) {
    var d = distM(point, geo.coords[i]);
    if (d < min) min = d;
  }
  return min;
}

var TOLERANCE = 60;

// id маршрутов, проходящих рядом с точкой
window.routeIdsNear = function (point) {
  var res = [];
  ROUTE_GEOS.forEach(function (g) {
    if (g.coords.length && nearestDist(g, point) <= TOLERANCE) res.push(g.id);
  });
  return res;
};

window.routesHtml = function (point) {
  var ids = window.routeIdsNear(point);
  var geos = ROUTE_GEOS.filter(function (g) { return ids.indexOf(g.id) !== -1; });
  geos.sort(function (a, b) { return a.label < b.label ? -1 : 1; });
  if (!geos.length) return '<i>Маршруты рядом не найдены</i>';
  return geos.map(function (g) {
    return '<span class="badge" style="background:' + g.color + '"' +
      ' onclick="selectRoute(\'' + g.id + '\')">' + g.label + '</span>';
  }).join(' ');
};

window.selectRoute = function (id) {
  setActiveRoute(id);
  showTab('map');
};

// Выбор маршрута: повторный тап по тому же — снять выбор
function setActiveRoute(id) {
  ACTIVE_ROUTE = (ACTIVE_ROUTE === id) ? '' : id;
  update();
}

function buildRoute(route) {
  var group = L.layerGroup();
  var color = route.color || '#d53e4f';
  var label = routeLabel(route);
  var jobs = [];

  if (!route.id) route.id = 'route_' + label.replace(/\s+/g, '_');

  var geo = { id: route.id, label: label, color: color, coords: [] };
  ROUTE_GEOS.push(geo);

  function osrm(points) {
    if (!points || points.length < 2) return;
    jobs.push(
      fetch('https://router.project-osrm.org/route/v1/driving/' +
        points.map(function (c) { return c[1] + ',' + c[0]; }).join(';') +
        '?overview=full&geometries=geojson')
        .then(function (resp) { return resp.json(); })
        .then(function (data) {
          if (data.code !== 'Ok') throw new Error('OSRM: ' + data.code);
          var coords = data.routes[0].geometry.coordinates.map(function (c) {
            return [c[1], c[0]];
          });
          geo.coords = geo.coords.concat(coords);
          L.polyline(coords, { color: color, weight: 4, opacity: 0.75 }).addTo(group);
        })
        .catch(function (e) {
          console.error('Ошибка маршрута ' + label + ':', e);
          L.popup().setLatLng([54.915, 52.31])
            .setContent('Ошибка OSRM (' + label + '): ' + e.message).openOn(MAP);
        })
    );
  }

  function manualLine(line) {
    if (!line || line.length < 2) return;
    geo.coords = geo.coords.concat(line);
    L.polyline(line, { color: color, weight: 4, opacity: 0.85 }).addTo(group);
  }

  if (route.segments) {
    route.segments.forEach(function (seg) {
      if (Array.isArray(seg)) {
        manualLine(seg);
      } else if (seg.line) {
        manualLine(seg.line);
      } else if (seg.points) {
        osrm(seg.points);
      }
    });
  } else if (route.line) {
    manualLine(route.line);
  } else if (route.points) {
    osrm(route.points);
  }

  return { group: group, jobs: jobs };
}

function update() {
  var chosen = ACTIVE_ROUTE;

  for (var key in layers) {
    if (key === chosen) layers[key].addTo(MAP); else MAP.removeLayer(layers[key]);
  }

  if (chosen && layers[chosen]) {
    layers[chosen].addTo(MAP);
    var bounds = L.latLngBounds();
    layers[chosen].eachLayer(function (l) {
      if (l.getBounds) bounds.extend(l.getBounds());
    });
    if (bounds.isValid()) MAP.fitBounds(bounds);
  }

  document.querySelectorAll('.picker-item').forEach(function (el) {
    el.classList.toggle('active', el.dataset.id === chosen);
  });
}

function initRoutes() {
  var picker = document.getElementById('routePicker');
  var pickerBtn = document.getElementById('routePickerBtn');

  ROUTES_EXTRA.forEach(function (route) {
    var built = buildRoute(route);
    layers[route.id] = built.group;
    built.jobs.forEach(function (p) { p.then(update); });

    var color = route.color || '#d53e4f';
    var label = routeLabel(route);

    var pi = document.createElement('div');
    pi.className = 'picker-item';
    pi.dataset.id = route.id;
    pi.innerHTML = '<span class="route-dot" style="background:' + color + '"></span>' + label;
    pi.addEventListener('click', function () { setActiveRoute(route.id); });
    if (picker) picker.appendChild(pi);
  });

  if (pickerBtn) {
    pickerBtn.addEventListener('click', function () {
      picker.classList.toggle('open');
    });
  }
}
