// ===== Ярлык на рабочий стол: вопрос при заходе + галочка в настройках =====
(function () {
  var KEY_TOGGLE = 'shortcutEnabled';   // галочка в настройках
  var KEY_ASKED  = 'shortcutAsked';     // на вопрос уже отвечали

  function enabled() {
    var v = localStorage.getItem(KEY_TOGGLE);
    return v === null ? true : v === '1';
  }
  function setEnabled(on) { localStorage.setItem(KEY_TOGGLE, on ? '1' : '0'); }

  var deferredPrompt = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // ===== Стили надписи и галочки (сам блок оформляет тема) =====
  var stp = document.createElement('style');
  stp.textContent = [
    '#pwaToggleBox .set-label { display:flex; align-items:center; gap:12px;',
    '  font-size:15px; font-weight:bold; cursor:pointer; }',
    '#pwaToggleBox .set-label input { width:20px; height:20px; accent-color:#007aff; margin:0; }',
    '#pwaToggleBox .hint { margin:6px 0 0 0; font-size:13px; opacity:.65; line-height:1.45; }',
    'body.dark #pwaToggleBox .set-label input { accent-color:#0a84ff; }',
    'body.a11y #pwaToggleBox .set-label { font-size:19px; }',
    'body.a11y #pwaToggleBox .set-label input { width:26px; height:26px; }',
    'body.a11y #pwaToggleBox .hint { font-size:16px; opacity:1; color:#000; }'
  ].join('\n');
  document.head.appendChild(stp);

  // ===== Карточка-вопрос при заходе =====
  function showAskCard() {
    if (document.getElementById('pwaCard')) return;

    var card = document.createElement('div');
    card.id = 'pwaCard';

    // иконка приложения
    var ico = document.createElement('div');
    ico.className = 'pwa-ico';
    ico.innerHTML = (typeof vehIcon === 'function')
      ? vehIcon('bus')
      : '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>';
    card.appendChild(ico);

    // текст
    var txt = document.createElement('div');
    txt.className = 'pwa-text';
    var title = document.createElement('b');
    title.textContent = 'Добавить ярлык?';
    var sub = document.createElement('span');
    sub.textContent = 'Значок приложения появится на рабочем столе';
    txt.appendChild(title);
    txt.appendChild(sub);
    card.appendChild(txt);

    // «Да» — запускаем установку
    var yes = document.createElement('button');
    yes.className = 'pwa-yes';
    yes.textContent = 'Да';
    yes.addEventListener('click', function () {
      localStorage.setItem(KEY_ASKED, '1');
      localStorage.setItem(KEY_TOGGLE, '1');
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt = null;
      } else if (isIOS) {
        title.textContent = 'На iPhone';
        sub.textContent = '«Поделиться» → «На экран „Домой“»';
        yes.style.display = 'none';
      } else {
        title.textContent = 'В меню браузера';
        sub.textContent = 'Нажмите «Установить приложение»';
        yes.style.display = 'none';
      }
    });
    card.appendChild(yes);

    // «Нет» — больше не спрашиваем
    var no = document.createElement('button');
    no.className = 'pwa-no';
    no.textContent = 'Нет';
    no.addEventListener('click', function () {
      localStorage.setItem(KEY_ASKED, '1');
      localStorage.setItem(KEY_TOGGLE, '0');
      hideCard();
    });
    card.appendChild(no);

    document.body.appendChild(card);
    setTimeout(function () { card.classList.add('show'); }, 800);
  }

  function hideCard() {
    var c = document.getElementById('pwaCard');
    if (!c) return;
    c.classList.remove('show');
    setTimeout(function () { c.remove(); }, 250);
  }

  // нативное событие установки (Android/Chrome)
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone && enabled() && localStorage.getItem(KEY_ASKED) !== '1') {
      showAskCard();
    }
  });

  // ярлык установлен — фиксируем
  window.addEventListener('appinstalled', function () {
    localStorage.setItem(KEY_TOGGLE, '1');
    localStorage.setItem(KEY_ASKED, '1');
    hideCard();
    renderToggle();
  });

  // показываем вопрос через секунду после загрузки
  window.addEventListener('load', function () {
    if (isStandalone) return;                                   // уже как приложение
    if (localStorage.getItem(KEY_ASKED) === '1') return;        // уже отвечали
    if (!enabled()) return;                                     // выключено в настройках
    setTimeout(showAskCard, 1000);
  });

  // ===== Галочка в настройках =====
  function renderToggle() {
    var host = document.getElementById('pwaToggleBox');
    if (!host) return;
    host.innerHTML = '';

    var label = document.createElement('label');
    label.className = 'set-label';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'pwaToggle';
    cb.checked = enabled();

    var span = document.createElement('span');
    span.textContent = 'Ярлык на рабочем столе';

    label.appendChild(cb);
    label.appendChild(span);
    host.appendChild(label);

    var hint = document.createElement('p');
    hint.className = 'hint';
    if (cb.checked && isStandalone) {
      hint.textContent = 'Ярлык добавлен. Сними галочку, если больше не хочешь видеть предложение.';
    } else if (!cb.checked) {
      hint.textContent = 'Предложение выключено. Чтобы убрать значок с рабочего стола: удерживай его и выбери «Удалить».';
    } else {
      hint.textContent = 'Ярлык ещё не добавлен. Он появится после подтверждения в браузере.';
    }
    host.appendChild(hint);

    cb.addEventListener('change', function () {
      setEnabled(cb.checked);
      if (!cb.checked) {
        hideCard();
        renderToggle();
      }
    });
  }

  // вставляем блок в «Настройки»: строго прямым ребёнком вкладки, без вложенности
  function mountToggle() {
    var tab = document.getElementById('tab-settings');
    if (!tab) return;
    var host = document.getElementById('pwaToggleBox');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pwaToggleBox';
    } else if (host.parentNode !== tab) {
      // блок затесался внутрь чужой карточки — вырезаем
      if (host.parentNode) host.parentNode.removeChild(host);
    }
    if (host.parentNode !== tab) {
      // точка вставки: сразу после карточки, где живёт чекбокс доступности
      var node = document.getElementById('a11yMode');
      while (node && node.parentNode !== tab) node = node.parentNode;
      if (node) tab.insertBefore(host, node.nextSibling);
      else tab.appendChild(host);
    }
    renderToggle();
  }

  window.addEventListener('load', mountToggle);
  window.addEventListener('DOMContentLoaded', mountToggle);

  // если ярлык уже стоит — галочка включена, вопрос не задаём
  if (isStandalone) {
    localStorage.setItem(KEY_TOGGLE, '1');
    localStorage.setItem(KEY_ASKED, '1');
  }

  // ===== Плашка «Ближайший рейс»: яркие края =====
  function findPlate(root) {
    var all = (root || document).querySelectorAll('div, section, li, article');
    var best = null;
    var bestLen = Infinity;
    for (var i = 0; i < all.length; i++) {
      var t = all[i].textContent || '';
      if (t.indexOf('Ближайший рейс') !== -1 && t.length < bestLen) {
        best = all[i];
        bestLen = t.length;
      }
    }
    if (!best) return;
    // поднимаемся до всей карточки с временем
    var plate = best;
    while (plate.parentNode && plate.textContent.indexOf('через') === -1) {
      plate = plate.parentNode;
    }
    (plate || best.parentNode).classList.add('plate-bright');
    ensureReportBtn();
  }

  document.addEventListener('DOMContentLoaded', function () { findPlate(); });

  // наблюдатель живёт постоянно: плашка пересоздаётся при каждой смене маршрута
  var plateObserver = new MutationObserver(function () {
    findPlate();
  });
  plateObserver.observe(document.body, { childList: true, subtree: true });

  // ===== Кнопка «Расписание неточное?» =====
    var REP_REASONS = [
    'Неправильное расписание',
    'Нашёл баг или ошибку',
    'Автобус пришёл раньше',
    'Автобус пришёл позже',
    'Рейса не было'
  ];


  function getReports() {
    try { return JSON.parse(localStorage.getItem('problemReports') || '[]'); }
    catch (e) { return []; }
  }

  // кнопка на плашке (плашка пересоздаётся — проверяем каждый раз)
  function ensureReportBtn() {
    var plate = document.querySelector('.plate-bright');
    if (!plate || plate.querySelector('.rep-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'rep-btn';
    btn.type = 'button';
    btn.textContent = 'Пожаловаться';
    btn.addEventListener('click', function () { openReportCard(plate); });
    plate.appendChild(btn);
  }
  function openReportCard(plate) {
    var old = document.getElementById('repCard');
    if (old) old.remove();

    var card = document.createElement('div');
    card.id = 'repCard';

    var title = document.createElement('b');
    title.textContent = 'Что случилось?';
    card.appendChild(title);

    var close = document.createElement('button');
    close.className = 'rep-close';
    close.textContent = '×';
    close.addEventListener('click', function () { card.remove(); });
    card.appendChild(close);

    // маршрут берём из текста плашки, без самой кнопки
    var route = plate
      ? plate.textContent.replace('Пожаловаться', '').trim()
      : '';

    var chosen = null;

    REP_REASONS.forEach(function (r) {
      var b = document.createElement('button');
      b.className = 'rep-reason';
      b.textContent = r;
      b.addEventListener('click', function () {
        chosen = r;
        REP_REASONS.forEach(function (_, i) {
          card.querySelectorAll('.rep-reason')[i].style.background = '';
        });
        b.style.background = 'rgba(229,72,77,.18)';
      });
      card.appendChild(b);
    });

    // свободное описание
    var ta = document.createElement('textarea');
    ta.className = 'rep-text';
    ta.placeholder = 'Или опишите, что не понравилось…';
    card.appendChild(ta);

    var send = document.createElement('button');
    send.className = 'rep-send';
    send.textContent = 'Отправить';
    send.addEventListener('click', function () {
      if (!chosen && !ta.value.trim()) {
        ta.placeholder = 'Выберите причину или напишите пару слов';
        ta.focus();
        return;
      }
      var list = getReports();
      list.push({
        time: new Date().toISOString(),
        route: route,
        reason: chosen || 'Другое',
        text: ta.value.trim()
      });
      localStorage.setItem('problemReports', JSON.stringify(list));
      card.innerHTML = '';
      var ok = document.createElement('div');
      ok.className = 'rep-ok';
      ok.textContent = 'Спасибо! Сообщение записано.';
      card.appendChild(ok);
      setTimeout(function () { card.remove(); renderRepBox(); }, 1500);
    });
    card.appendChild(send);

    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('show'); });
  }


  // копирование жалоб в буфер
  function copyText(text, btn) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); btn.textContent = 'Скопировано!'; }
      catch (e) { btn.textContent = 'Не вышло'; }
      ta.remove();
      setTimeout(renderRepBox, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Скопировано!';
        setTimeout(renderRepBox, 1200);
      }, fallback);
    } else fallback();
  }

  // раздел жалоб в настройках
  function renderRepBox() {
    var host = document.getElementById('repBox');
    if (!host) return;
    var list = getReports();
    host.innerHTML = '';

    var title = document.createElement('b');
    title.textContent = 'Сообщения о расписании';
    host.appendChild(title);

    var p = document.createElement('p');
    p.className = 'hint';
    p.textContent = list.length
      ? 'Записано: ' + list.length
      : 'Пока ни одного сообщения.';
    host.appendChild(p);

    if (list.length) {
      var btn = document.createElement('button');
      btn.className = 'rep-copy';
      btn.textContent = 'Скопировать все';
      btn.addEventListener('click', function () {
        var text = list.map(function (r) {
          return new Date(r.time).toLocaleString() + ' — ' +
            r.route + ' — ' + r.reason;
        }).join('\n');
        copyText(text, btn);
      });
      host.appendChild(btn);
    }
  }

  function mountRepBox() {
    var tab = document.getElementById('tab-settings');
    if (!tab) return;
    var host = document.getElementById('repBox');
    if (!host) {
      host = document.createElement('div');
      host.id = 'repBox';
    } else if (host.parentNode !== tab) {
      if (host.parentNode) host.parentNode.removeChild(host);
    }
    if (host.parentNode !== tab) {
      var anchor = document.getElementById('pwaToggleBox');
      if (anchor && anchor.parentNode === tab) tab.insertBefore(host, anchor.nextSibling);
      else tab.appendChild(host);
    }
    renderRepBox();
  }

  window.addEventListener('load', mountRepBox);
  window.addEventListener('DOMContentLoaded', mountRepBox);
})();
