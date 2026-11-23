// ===== Расписание автобусов и троллейбусов Альметьевска =====
// Источник: malyegorodarossii.ru (данные МУП «АТУ»), сверено в ноябре 2026.
// Перед выходом минуты лучше сверять с диспетчерской: 8 (8553) 44-23-33.

(function () {
  var root = document.getElementById('scheduleList');
  if (!root) return;
  // ===== Стили =====
  var st = document.createElement('style');
  st.textContent = [
    '.sched-sub { color:#888; font-size:13px; margin:2px 0 10px; }',
    '.sched-daybar { display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }',
    '.sched-daybar .lbl { font-size:13px; color:#666; }',
    '.sched-daybtn { padding:6px 14px; border-radius:16px; border:1px solid #dcdcdc; background:#fff; font-size:13.5px; cursor:pointer; }',
    '.sched-daybtn.active { background:#007aff; border-color:#007aff; color:#fff; }',
    '.sched-chips { display:flex; gap:8px; overflow-x:auto; padding:2px 0 10px; -webkit-overflow-scrolling:touch; }',
    '.sched-chip { flex:0 0 auto; padding:8px 15px; border-radius:20px; border:1px solid #e0e0e0; background:#f7f7f7; font-size:15px; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px; }',
    '.sched-chip.active { background:#007aff; border-color:#007aff; color:#fff; font-weight:bold; }',
    '.sched-dirrow { display:flex; gap:8px; flex-wrap:wrap; margin:4px 0 10px; }',
    '.sched-dir { padding:7px 12px; border-radius:12px; background:#f2f2f2; border:1px solid #e4e4e4; font-size:13.5px; cursor:pointer; }',
    '.sched-dir.active { background:#34c759; border-color:#34c759; color:#fff; font-weight:bold; }',
    '.sched-next { padding:14px 16px; border-radius:14px; background:#e9f8ee; border:1px solid #bfe8cc; margin-bottom:12px; }',
    '.sched-next .big { font-size:34px; font-weight:800; line-height:1.1; }',
    '.sched-next .cap { font-size:13px; color:#3d7a50; margin-top:3px; }',
    '.sched-end { padding:14px 16px; border-radius:14px; background:#fff4e5; border:1px solid #f3ddb8; margin-bottom:12px; font-size:14.5px; }',
    '.sched-times { display:flex; flex-wrap:wrap; gap:6px; }',
    '.sched-time { padding:6px 10px; border-radius:9px; background:#f1f1f1; font-size:14.5px; font-variant-numeric:tabular-nums; }',
    '.sched-time.next { background:#34c759; color:#fff; font-weight:bold; box-shadow:0 2px 8px rgba(52,199,89,.4); }',
    '.sched-note { margin-top:14px; font-size:12.5px; color:#999; line-height:1.5; }',
    '.disp-block { margin-top:14px; padding:12px 14px; border-radius:12px; background:#eef3fb; border:1px solid #c7d7ef; }',
    '.disp-title { font-weight:bold; font-size:14px; margin-bottom:4px; }',
    '.disp-text { font-size:13px; color:#556; line-height:1.45; }',
    '.disp-call { display:inline-block; margin-top:8px; padding:9px 18px; border-radius:12px; background:#007aff; color:#fff; font-size:15px; font-weight:bold; text-decoration:none; }',
    '.disp-call:active { background:#005ecb; }',
    'body.a11y .sched-sub, body.a11y .sched-daybar .lbl, body.a11y .sched-note, body.a11y .arr-note { color:#000; font-size:16px; }',
    'body.a11y .sched-chip, body.a11y .sched-daybtn { background:#000; color:#ffdd00; border:3px solid #000; font-weight:bold; }',
    'body.a11y .sched-chip.active, body.a11y .sched-daybtn.active { text-decoration:underline; }',
    'body.a11y .sched-dir { background:#000; color:#ffdd00; border:3px solid #000; font-weight:bold; }',
    'body.a11y .sched-dir.active { text-decoration:underline; }',
    'body.a11y .sched-next, body.a11y .sched-end { background:#000; border:3px solid #000; }',
    'body.a11y .sched-next .big, body.a11y .sched-end { color:#ffdd00; }',
    'body.a11y .sched-next .cap { color:#fff; font-size:16px; }',
    'body.a11y .sched-time { background:#e0e0e0; border:1px solid #000; font-size:16px; font-weight:bold; }',
    'body.a11y .sched-time.next { background:#000; color:#ffdd00; }',
    'body.a11y .arr-back { background:#000; color:#ffdd00; font-weight:bold; }',
    'body.a11y .disp-block { background:#000; border:3px solid #000; }',
    'body.a11y .disp-title, body.a11y .disp-text { color:#ffdd00; font-size:16px; }',
    'body.a11y .disp-call { background:#ffdd00; color:#000; }'
  ].join('\n');
  document.head.appendChild(st);

  // тип иконки по id: tb* — троллейбус, остальное — автобус
  function vehIconFor(r) {
    return vehIcon(r && r.id && r.id.indexOf('tb') === 0 ? 'trolleybus' : 'bus');
  }

  // ===== Данные =====
  var R = [
    { id: 'tb1', num: '1', dirs: [
      { name: 'Яшьлек → ТНГП',
        wd: '05:50 06:06 06:22 06:38 06:54 07:10 07:26 07:42 07:58 08:14 08:30 08:46 09:02 09:18 09:34 09:50 10:06 10:38 11:10 11:42 12:14 12:46 13:18 13:50 14:22 14:54 15:26 15:58 16:14 16:30 16:46 17:02 17:18 17:34 17:58 18:06 18:22 18:38 18:54 19:26 20:06 20:38 21:10 21:26 22:07'.split(' '),
        we: '04:57 06:09 06:35 07:01 07:27 07:53 08:19 08:45 09:11 09:37 10:06 10:55 11:21 11:47 12:13 12:39 13:05 13:31 13:57 14:23 14:49 15:15 15:41 16:07 16:33 16:59 17:25 17:51 18:17 18:37 19:37 19:57 20:37 21:00 21:20 21:40 22:14'.split(' ') },
      { name: 'ТНГП → Яшьлек',
        wd: '04:48 05:04 05:20 05:36 05:52 06:08 06:24 06:40 06:56 07:12 07:28 07:44 08:00 08:16 08:32 08:48 09:04 09:36 10:08 10:40 11:12 11:44 12:16 12:48 13:20 13:52 14:24 14:56 15:12 15:28 15:44 16:00 16:16 16:32 16:56 17:04 17:20 17:36 17:52 18:24 19:04 19:36 20:08 20:24 21:05'.split(' '),
        we: '05:05 05:31 05:57 06:23 06:49 07:15 07:41 08:07 08:33 09:02 09:51 10:17 10:43 11:09 11:35 12:01 12:27 12:53 13:19 13:45 14:11 14:37 15:03 15:29 15:55 16:21 16:47 17:13 17:33 18:33 18:53 19:33 19:56 20:16 20:36 21:10'.split(' ') }
    ]},
    { id: 'bus2', num: '2', dirs: [
      { name: 'Машинный парк (кольцо)',
        daily: '05:40 06:28 07:16 08:04 08:52 09:40 11:16 11:17 12:05 12:53 13:41 14:29 15:17 16:05 16:53 17:45 18:33'.split(' ') }
    ]},
    { id: 'bus2b', num: '2б', dirs: [
      { name: 'Машинный парк (кольцо)',
        wd: '05:16 06:04 06:52 07:40 08:28 09:16 10:53 11:41 12:13 12:45 13:17 13:49 14:21 14:53 15:25 15:57 16:29 17:01 17:33 18:05 19:01 19:04 20:40'.split(' ') }
    ]},
    { id: 'tb3', num: '3', dirs: [
      { name: 'РТС → Завод Алнас',
        wd: '06:26 07:14 08:02 08:50 09:38 10:26 12:42 14:18 15:14 16:02 16:50 18:26 20:02'.split(' '),
        we: '07:18 11:10 12:43 14:15 15:45 17:19 20:56'.split(' ') },
      { name: 'Завод Алнас → РТС',
        wd: '07:14 08:02 08:50 09:38 10:26 11:15 13:30 15:06 16:02 16:50 17:37 19:14 20:50'.split(' '),
        we: '11:59 13:32 15:00 16:31 20:13'.split(' ') }
    ]},
    { id: 'bus4', num: '4', dirs: [
      { name: 'мкр. ДСРК (кольцо)',
        wd: '05:00 05:30 06:00 06:30 07:00 07:30 08:00 08:30 09:00 09:30 10:00 10:30 11:30 11:55 12:55 13:35 13:55 14:15 14:35 14:55 15:15 15:35 15:55 16:15 16:35 16:55 17:15 17:35 17:55 18:15 18:35 19:15'.split(' '),
        we: '05:00 06:00 07:00 08:00 09:00 10:00 11:55 12:55 13:55 14:55 15:55 16:55 17:55'.split(' ') }
    ]},
    { id: 'bus4b', num: '4б', dirs: [
      { name: 'мкр. ДСРК (кольцо)',
        wd: '05:05 05:25 05:45 06:00 06:05 06:20 06:25 06:40 06:45 07:00 07:05 07:20 07:25 07:40 07:45 08:00 08:05 08:20 08:25 08:40 08:45 09:00 09:05 09:20 09:25 09:40 09:45 10:00 10:20 10:40 10:45 11:10 11:40 12:05 12:10 12:40 13:05 13:10 13:35 13:40 14:05 14:10 14:35 14:40 15:05 15:10 15:35 15:40 16:05 16:10 16:35 16:40 17:05 17:10 17:35 17:40 18:05 18:35 18:40 19:35'.split(' '),
        we: '05:05 06:00 06:05 07:00 07:05 08:00 08:05 09:00 09:05 10:00 11:10 12:05 12:10 13:05 13:10 14:05 14:10 15:05 15:10 16:05 16:10 17:05 17:10 18:05'.split(' ') }
    ]},
    { id: 'bus5c', num: '5с', dirs: [
      { name: 'Сезонный маршрут', daily: [] }
    ], seasonal: true,
      note: 'Сезонный маршрут: май–октябрь, по вт, чт и сб. Расписание уточняйте в диспетчерской: 8 (8553) 44-23-33.' },
    { id: 'bus6', num: '6', dirs: [
      { name: 'Техснаб (кольцо)',
        daily: '05:15 06:05 06:08 06:58 07:03 07:53 08:03 08:53 08:58 09:48 09:53 10:43 10:48 11:38 12:38 13:28 13:33 14:23 14:28 15:18 15:23 16:13 16:18 17:08 17:18 18:08 18:15 19:05'.split(' ') }
    ]},
    { id: 'tb7a', num: '7а', dirs: [
      { name: 'ТНГП → Яшьлек',
        wd: '04:56 05:12 05:44 06:16 06:32 06:48 07:04 07:20 07:52 08:24 08:40 08:56 09:20 10:24 10:48 10:56 11:28 12:00 12:32 13:04 13:36 14:08 14:40 15:20 15:52 16:08 16:24 16:40 16:48 17:28 18:00 18:16 18:32 18:48 20:40'.split(' '),
        we: '04:52 05:18 05:44 06:10 06:36 07:02 07:28 07:54 08:20 08:46 09:34 10:04 10:30 10:56 11:22 11:48 12:14 12:40 13:06 13:32 13:58 14:24 14:50 15:16 15:42 16:08 16:34 17:00 17:53 18:13 19:13 19:45 20:56'.split(' ') },
      { name: 'Яшьлек → ТНГП',
        wd: '05:56 06:12 06:44 07:16 07:32 07:48 08:04 08:20 08:52 09:24 09:40 09:56 10:20 11:24 11:48 11:56 12:28 13:00 13:32 14:04 14:36 15:08 15:40 16:20 16:52 17:08 17:24 17:40 17:48 18:28 19:00 19:16 19:32 19:48 21:40'.split(' '),
        we: '05:52 06:18 06:44 07:10 07:36 08:02 08:28 08:54 09:20 09:46 10:34 11:04 11:30 11:56 12:22 12:48 13:14 13:40 14:06 14:32 14:58 15:24 15:50 16:16 16:42 17:08 17:34 18:00 18:53 19:13 20:13 20:45 21:56'.split(' ') }
    ]},
    { id: 'tb7b', num: '7б', dirs: [
      { name: 'СУ-2 → Яшьлек',
        wd: '07:31 09:07 12:07 13:41 15:15 17:00'.split(' '),
        we: '08:39 11:06 12:49 14:33 16:17 18:39'.split(' ') },
      { name: 'Яшьлек → СУ-2',
        wd: '08:11 09:47 12:47 14:21 15:55 17:40'.split(' '),
        we: '09:19 11:46 13:29 15:13 16:57 19:19'.split(' ') }
    ]},
    { id: 'bus8', num: '8', dirs: [
      { name: 'РТС → Завод Алнас',
        wd: '05:44 06:13 07:24 07:53 09:04 09:33 11:48 12:17 13:28 13:57 15:08 15:36 16:48 17:14'.split(' '),
        we: '06:13 07:53 09:33 12:17 13:57 15:36 17:14'.split(' ') },
      { name: 'Завод Алнас → РТС',
        wd: '06:28 06:57 08:08 08:37 09:48 10:17 12:32 13:01 14:12 15:52 16:18 17:32 17:58'.split(' '),
        we: '06:57 08:37 10:17 13:01 14:41 16:18 17:58'.split(' ') }
    ]},
    { id: 'bus8b', num: '8б', dirs: [
      { name: 'Агропосёлок ↔ Высшая школа нефти', daily: [] }
    ] }
  ];

  // Едет ли маршрут прямо сейчас: для сезонных проверяем месяц и день недели
  function routeActiveNow(r) {
    if (!r || !r.seasonal) return true;
    var now = new Date();
    var m = now.getMonth() + 1;                   // 1 = январь … 12 = декабрь
    var d = now.getDay();                          // 0 = вс, 2 = вт, 4 = чт, 6 = сб
    var inSeason = m >= 5 && m <= 10;              // май–октябрь
    var onDay = (d === 2 || d === 4 || d === 6);   // вт, чт, сб
    return inSeason && onDay;
  }

  // отдаём расписание наружу — его используют расчёт прибытия в плашке
  window.SCHEDULE = R;
  window.schedTodayType = function () {
    var d = new Date().getDay();
    return (d === 0 || d === 6) ? 'we' : 'wd';
  };

  // ===== Состояние (при заходе ничего не выбрано) =====
  var sel = { route: null, dir: 0, dayOverride: null };

  var DAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

  function todayType() { return window.schedTodayType(); }
  function viewDay() { return sel.dayOverride || todayType(); }
  function dayLabel(t) { return t === 'we' ? 'выходные' : 'будни'; }
  function toMin(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }

  function fmtDelta(min) {
    if (min <= 0) return 'отправляется';
    var h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return 'через ' + m + ' мин';
    if (m === 0) return 'через ' + h + ' ч';
    return 'через ' + h + ' ч ' + m + ' мин';
  }

  function render() {
    if (sel.route !== null && !routeActiveNow(R[sel.route])) {
      sel.route = null;
    }

    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();

    var html = '<div class="sched-sub">Расписание МУП «АТУ» · отправления с начальной остановки</div>';

    // маршруты — пока это единственное, что видно при заходе
    html += '<div class="sched-chips">';
    R.forEach(function (rr, i) {
      if (!routeActiveNow(rr)) return;
      html += '<button class="sched-chip' + (sel.route !== null && i === sel.route ? ' active' : '') + '" data-route="' + i + '">' + vehIconFor(rr) + ' ' + rr.num + '</button>';
    });
    html += '</div>';

    // маршрут не выбран — показываем только чипы и подсказку
    if (sel.route === null) {
      html += '<div class="sched-note">Выберите маршрут — покажу ближайшие рейсы.</div>';
      root.innerHTML = html;
      bind();
      return;
    }

    var r = R[sel.route];
    if (sel.dir >= r.dirs.length) sel.dir = 0;
    var d = r.dirs[sel.dir];
    var t = viewDay();
    var times = d.daily || d[t] || [];

    // переключатель дней
    html += '<div class="sched-daybar">';
    html += '<button class="sched-daybtn' + (t === 'wd' ? ' active' : '') + '" data-day="wd">Будни</button>';
    html += '<button class="sched-daybtn' + (t === 'we' ? ' active' : '') + '" data-day="we">Выходные</button>';
    if (sel.dayOverride) html += '<button class="sched-daybtn" data-day="auto">Авто</button>';
    html += '<span class="lbl">сегодня: ' + DAY_NAMES[now.getDay()] + ' — по календарю ' + dayLabel(todayType()) + '</span>';
    html += '</div>';

    // направления
    if (r.dirs.length > 1) {
      html += '<div class="sched-dirrow">';
      r.dirs.forEach(function (dd, i) {
        html += '<button class="sched-dir' + (i === sel.dir ? ' active' : '') + '" data-dir="' + i + '">' + dd.name + '</button>';
      });
      html += '</div>';
    } else {
      html += '<div class="sched-dirrow"><span class="sched-dir">' + d.name + '</span></div>';
    }

    if (!times.length) {
      html += '<div class="sched-end">' + stopIcon() + ' ' + (r.note || 'Рейсов по этому маршруту сейчас нет.') + '</div>';
    } else {
      // только будущие рейсы — прошедшие не показываем вовсе
      var future = [];
      for (var i = 0; i < times.length; i++) {
        if (toMin(times[i]) > nowMin) future.push(times[i]);
      }
      if (!future.length) {
        html += '<div class="sched-end">На сегодня рейсов больше нет. Первый завтра в ' + times[0] + '.</div>';
      } else {
        html += '<div class="sched-next">';
        html += '<div class="big">' + future[0] + ' · ' + fmtDelta(toMin(future[0]) - nowMin) + '</div>';
        html += '<div class="cap">Ближайший рейс · ' + vehIconFor(r) + ' ' + r.num + ' · ' + d.name + '</div>';
        html += '</div>';
        html += '<div class="sched-times">';
        future.forEach(function (tm, i) {
          html += '<span class="sched-time' + (i === 0 ? ' next' : '') + '">' + tm + '</span>';
        });
        html += '</div>';
      }
    }

    if (r.note) html += '<div class="sched-note">' + infoIcon() + ' ' + r.note + '</div>';

    html += '<div class="sched-note">Расписание может меняться в праздники и при объездах. Диспетчерская МУП «АТУ»: <a href="tel:+78553442333">8 (8553) 44-23-33</a>.</div>';

    root.innerHTML = html;
    bind();
  }

  function bind() {
    root.querySelectorAll('.sched-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        sel.route = parseInt(b.dataset.route, 10);
        sel.dir = 0;
        render();
      });
    });
    root.querySelectorAll('.sched-dir').forEach(function (b) {
      if (b.dataset.dir === undefined) return;
      b.addEventListener('click', function () {
        sel.dir = parseInt(b.dataset.dir, 10);
        render();
      });
    });
    root.querySelectorAll('.sched-daybtn').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.day;
        if (v === 'auto') sel.dayOverride = null;
        else if (v !== viewDay()) sel.dayOverride = v;
        render();
      });
    });
  }

  setInterval(render, 20000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) render();
  });

  render();

  // =====================================================================
  // ===== Плашка остановки: «Скоро приедут» + кнопка «Расписание» =====
  // =====================================================================
  (function () {
    var ARR = { speed: 22, defaultTrip: 35, pending: null, lastCoords: null, mode: 'soon', lastStop: null };

    // стили нового вида
    var st2 = document.createElement('style');
    st2.textContent = [
      '.arr-head { display:flex; align-items:center; justify-content:space-between; margin:6px 0 8px; }',
      '.arr-head span { font-weight:600; font-size:15px; display:inline-flex; align-items:center; gap:6px; }',
      '.arr-schedbtn { padding:8px 14px; border:none; border-radius:12px; background:#1c2430; color:#fff; font-size:13.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }',
      '.arr-schedbtn:active { opacity:.85; }',
      '.arr-list { display:flex; flex-direction:column; gap:6px; }',
      '.arr-row { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; background:#f2f4f8; }',
      '.arr-row.first { background:#f0faf4; border:1px solid #cdeedb; }',
      '.arr-num { font-size:16px; font-weight:700; white-space:nowrap; display:inline-flex; align-items:center; gap:7px; }',
      '.arr-num .ico-veh { width:17px; height:17px; }',
      '.arr-dirname2 { font-size:12.5px; color:#777; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.arr-when { margin-left:auto; text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; font-size:15px; }',
      '.arr-when i { font-style:normal; font-size:12px; color:#888; margin-left:4px; }',
      '.arr-row.first .arr-when i { color:#3d7a50; }',
      '.arr-note { margin-top:8px; font-size:12.5px; color:#999; line-height:1.5; }',
      '.arr-back { margin:2px 0 8px; padding:6px 14px; border:none; border-radius:10px; background:#eee; font-size:13.5px; cursor:pointer; }',
      'body.a11y .arr-head span { color:#ffdd00; font-size:16px; }',
      'body.a11y .arr-schedbtn { background:#ffdd00; color:#000; }',
      'body.a11y .arr-row { background:#000; border:2px solid #000; }',
      'body.a11y .arr-row.first { border:2px solid #ffdd00; }',
      'body.a11y .arr-num, body.a11y .arr-when b { color:#ffdd00; }',
      'body.a11y .arr-dirname2, body.a11y .arr-when i { color:#fff; font-size:15px; }'
    ].join('\n');
    document.head.appendChild(st2);

    // контейнер прибытий: если его нет в разметке — создаём сами
    var box = document.getElementById('sheetArrivals');
    if (!box) {
      box = document.createElement('div');
      box.id = 'sheetArrivals';
      var bar0 = document.getElementById('sheetRoutes');
      if (bar0 && bar0.parentNode) bar0.parentNode.insertBefore(box, bar0.nextSibling);
      else {
        var cont = document.querySelector('.sheet-content');
        if (cont) cont.appendChild(box);
      }
    }

    function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function toMin(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
    function todayType() { var d = new Date().getDay(); return (d === 0 || d === 6) ? 'we' : 'wd'; }

    function asPt(p) {
      if (Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number') return { lat: p[0], lng: p[1] };
      if (p && typeof p.lat === 'function') return { lat: p.lat(), lng: p.lng() };
      if (p && typeof p.lat === 'number' && typeof p.lng === 'number') return { lat: p.lat, lng: p.lng };
      return null;
    }

    function distM(a, b) {
      var Rr = 6371000, k = Math.PI / 180;
      var dy = (b.lat - a.lat) * k * Rr;
      var dx = (b.lng - a.lng) * k * Rr * Math.cos((a.lat + b.lat) / 2 * k);
      return Math.sqrt(dx * dx + dy * dy);
    }

    function segT(a, b, c) {
      var k = Math.PI / 180, midLat = (a.lat + b.lat) / 2 * k;
      var ax = a.lng * k * Math.cos(midLat), ay = a.lat * k;
      var bx = b.lng * k * Math.cos(midLat), by = b.lat * k;
      var cx = c.lng * k * Math.cos(midLat), cy = c.lat * k;
      var abx = bx - ax, aby = by - ay;
      var den = abx * abx + aby * aby;
      if (!den) return 0;
      var tt = ((cx - ax) * abx + (cy - ay) * aby) / den;
      return Math.max(0, Math.min(1, tt));
    }

    function tripMinutes(pts) {
      var m = 0;
      for (var i = 1; i < pts.length; i++) m += distM(pts[i - 1], pts[i]);
      return m / (ARR.speed * 1000 / 60);
    }

    function projectOnPath(c, pts) {
      var lens = [], total = 0, acc = 0, best = null;
      for (var i = 1; i < pts.length; i++) {
        var d = distM(pts[i - 1], pts[i]);
        lens.push(d); total += d;
      }
      if (!total) return null;
      for (var j = 1; j < pts.length; j++) {
        var t = segT(pts[j - 1], pts[j], c);
        var px = {
          lat: pts[j - 1].lat + (pts[j].lat - pts[j - 1].lat) * t,
          lng: pts[j - 1].lng + (pts[j].lng - pts[j - 1].lng) * t
        };
        var d2 = distM(px, c);
        if (!best || d2 < best.d) best = { d: d2, frac: (acc + t * lens[j - 1]) / total };
        acc += lens[j - 1];
      }
      if (!best || best.d > 2500) return null;
      return best.frac;
    }

    function parseCoords(text) {
      var m = String(text || '').match(/(\d{2}\.\d+)\D+(\d{2}\.\d+)/);
      if (!m) return null;
      return { lat: +m[1], lng: +m[2] };
    }

    function getRouteObjects() {
      var found = [], seen = {};
      function take(c) {
        if (!c) return;
        var arr = Array.isArray(c) ? c
          : (typeof c === 'object' ? Object.keys(c).map(function (k) { return c[k]; }) : null);
        if (!arr) return;
        arr.forEach(function (r) {
          if (!r || typeof r !== 'object') return;
          var num = r.num || r.number || r.routeNum || '';
          if (!num) return;
          var pts = r.path || r.points || r.coords || r.line || [];
          var stops = r.stops || r.stopNames || [];
          if (!pts.length && !stops.length) return;
          var key = norm(num);
          if (seen[key]) return;
          seen[key] = 1;
          found.push({ num: String(num), path: pts, stops: stops });
        });
      }
      [window.ROUTES, window.routes, window.ROUTES_DATA, window.BUS_ROUTES].forEach(take);
      return found;
    }

    function numsFromText(text) {
      var out = [], seen = {};
      String(text || '').toLowerCase().replace(/[0-9]+[а-яa-z]*/g, function (tok) {
        if (!seen[tok]) { seen[tok] = 1; out.push(tok); }
        return tok;
      });
      return out;
    }

    function fmtClock(m) {
      m = ((m % 1440) + 1440) % 1440;
      var h = Math.floor(m / 60), mm = m % 60;
      return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
    }

    function arrDelta(min) {
      if (min < 1) return 'сейчас';
      var h = Math.floor(min / 60), m = min % 60;
      if (h === 0) return 'через ' + m + ' мин';
      if (m === 0) return 'через ' + h + ' ч';
      return 'через ' + h + ' ч ' + m + ' мин';
    }

    // вычисляем смещение остановки на маршруте, мин
    function stopOffset(num, stop, coords) {
      var s = null;
      for (var i = 0; i < (window.SCHEDULE || []).length; i++) {
        if (norm((window.SCHEDULE[i]).num) === num) { s = window.SCHEDULE[i]; break; }
      }
      if (!s) return { sched: null, offset: null, trip: ARR.defaultTrip, unknown: true };

      var objs = getRouteObjects(), o = null;
      for (var k = 0; k < objs.length; k++) {
        if (norm(objs[k].num) === num) { o = objs[k]; break; }
      }

      var pts = o ? (o.path || []).map(asPt).filter(Boolean) : [];
      var frac = (coords && pts.length > 1) ? projectOnPath(coords, pts) : null;

      var stopNames = o ? (o.stops || []).map(function (x) {
        return typeof x === 'string' ? x : (x && (x.name || x.title)) || '';
      }) : [];
      var idx = -1;
      for (var j = 0; j < stopNames.length; j++) {
        if (norm(stopNames[j]) === norm(stop)) { idx = j; break; }
      }

      var trip = pts.length > 1 ? tripMinutes(pts) : ARR.defaultTrip;
      var offset = null;
      if (frac !== null) offset = Math.round(frac * trip);
      else if (idx >= 0 && stopNames.length > 1) offset = Math.round(idx / (stopNames.length - 1) * trip);
      return { sched: s, offset: offset, trip: trip, unknown: offset === null };
    }

    // собираем ВСЕ будущие прибытия на остановку по всем маршрутам и направлениям
    function collectArrivals(stop, coords) {
      var now = new Date();
      var nowMin = now.getHours() * 60 + now.getMinutes();
      var t = todayType();
      var sched = window.SCHEDULE || [];

      var objs = getRouteObjects();
      var nums = objs.map(function (o) { return norm(o.num); });
      if (!nums.length) {
        var bar = document.getElementById('sheetRoutes');
        if (bar) nums = numsFromText(bar.textContent);
      }
      if (!nums.length) {
        // не знаем, какие маршруты тут останавливаются — берём все едущие
        nums = sched.filter(function (s) { return routeActiveNow(s); })
          .map(function (s) { return norm(s.num); });
      }

      var out = [], seenKey = {};
      nums.forEach(function (n) {
        var s = null;
        for (var i = 0; i < sched.length; i++) {
          if (norm(sched[i].num) === n) { s = sched[i]; break; }
        }
        if (!s || !routeActiveNow(s)) return;
        if (seenKey[n]) return;
        seenKey[n] = 1;

        var inf = stopOffset(n, stop, coords);
        var off = inf.offset || 0;
        s.dirs.forEach(function (d, di) {
          var o = (s.dirs.length > 1 && di > 0)
            ? Math.max(0, Math.round((inf.trip || ARR.defaultTrip) - off))
            : off;
          var times = d.daily || d[t] || [];
          for (var q = 0; q < times.length; q++) {
            var a = toMin(times[q]) + o;
            if (a > nowMin) out.push({ a: a, num: s.num, icon: vehIconFor(s), dir: d.name });
          }
        });
      });
      out.sort(function (x, y) { return x.a - y.a; });
      return { list: out, nowMin: nowMin };
    }

    function rowHtml(it, nowMin, first) {
      return '<div class="arr-row' + (first ? ' first' : '') + '">' +
        '<span class="arr-num">' + it.icon + ' ' + esc(it.num) + '</span>' +
        '<span class="arr-when"><b>' + fmtClock(it.a) + '</b> <i>≈ ' + arrDelta(it.a - nowMin) + '</i></span>' +
      '</div>';
    }

    function renderArrivals() {
      try {
        var titleEl = document.getElementById('sheetTitle');
        var coordsEl = document.getElementById('sheetCoords');
        var bar = document.getElementById('sheetRoutes');
        if (!box || !titleEl) return;

        var stop = titleEl.textContent.replace(/Остановка[,:]?\s*/i, '').replace(/[«»"]/g, '').trim();
        if (!stop || norm(stop) === 'остановка') { box.innerHTML = ''; return; }

        // новая остановка — возвращаемся к виду «Скоро приедут»
        if (ARR.lastStop !== stop) { ARR.lastStop = stop; ARR.mode = 'soon'; }

        var coords = parseCoords(coordsEl && coordsEl.textContent);
        if (coords) ARR.lastCoords = coords; else coords = ARR.lastCoords;

        // прячем исходный текстовый список маршрутов — вместо него теперь наши виды
        if (bar) bar.style.display = 'none';

        var got = collectArrivals(stop, coords);
        var list = got.list, nowMin = got.nowMin;

        var html = '';

        if (ARR.mode === 'soon') {
          html += '<div class="arr-head"><span>' + clockIcon() + ' Приедут в течение часа</span>' +
                  '<button class="arr-schedbtn" data-mode="sched">' + calendarIcon() + ' Расписание</button></div>';
          // только ближайший час
          var soon = list.filter(function (it) { return it.a - nowMin <= 60; });
          if (!soon.length) {
            html += '<div class="arr-note">В течение часа автобусов не будет.' +
              (list.length ? ' Ближайший — ' + fmtClock(list[0].a) + ' (через ' + Math.floor((list[0].a - nowMin) / 60) + ' ч ' + (list[0].a - nowMin) % 60 + ' мин), полное расписание — по кнопке «Расписание».' : '') + '</div>';
          } else {
            html += '<div class="arr-list">';
            soon.slice(0, 8).forEach(function (it, i) {
              html += rowHtml(it, nowMin, i === 0);
            });
            html += '</div>';
          }
        } else {
          html += '<button class="arr-back" data-mode="soon">← Скоро приедут</button>';
          html += '<div class="arr-head"><span>' + calendarIcon() + ' Расписание на сегодня</span></div>';
          if (!list.length) {
            html += '<div class="arr-note">На сегодня рейсов больше нет.</div>';
          } else {
            html += '<div class="arr-list">';
            list.slice(0, 40).forEach(function (it, i) {
              html += rowHtml(it, nowMin, i === 0);
            });
            html += '</div>';
          }
        }

        // диспетчерская — тихой строкой в самом низу плашки
        html += '<div class="disp-block">' +
          '<div class="disp-text">Точное время и изменения: диспетчер МУП «АТУ» — <a class="disp-call" href="tel:+78553442333">8 (8553) 44-23-33</a>.</div>' +
        '</div>';

        box.innerHTML = html;

        box.querySelectorAll('[data-mode]').forEach(function (b) {
          b.addEventListener('click', function () {
            ARR.mode = b.dataset.mode;
            renderArrivals();
          });
        });
      } catch (e) {
        if (window.console && console.error) console.error('arrivals:', e);
      }
    }

    function soon() {
      clearTimeout(ARR.pending);
      ARR.pending = setTimeout(renderArrivals, 60);
    }

    ['sheetTitle', 'sheetCoords', 'sheetRoutes'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        new MutationObserver(function () {
          try { soon(); } catch (e) {}
        }).observe(el, { childList: true, subtree: true, characterData: true });
      }
    });

    // «через N мин» в плашке живёт само
    setInterval(function () {
      if (box.offsetHeight > 0) renderArrivals();
    }, 30000);

    renderArrivals();
  })();
})();
