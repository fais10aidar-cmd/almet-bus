// ===== Модерация чата: спам, оскорбления, мут (Firebase + localStorage) =====
window.ChatMod = (function () {

  var ADMIN_PASS = '890931';
  var MUTE_STEPS = [5, 15, 45, 180, 1440];       // 5 мин → 15 → 45 → 3 ч → сутки
  var FLOOD_COUNT = 4;    // больше 4 сообщений за 10 сек — флуд
  var FLOOD_WINDOW = 10000;
  var REPEAT_COUNT = 3;   // 3 одинаковых сообщения подряд — спам

  var SETTINGS = {
    hardWords: ['хуй', 'хуе', 'хуё', 'хуя', 'бля', 'блять', 'пизд', 'еба', 'ёба',
      'ебат', 'сука', 'суч', 'мудак', 'мудила', 'пидор', 'пидар', 'гандон',
      'гондон', 'хер', 'херн', 'долбоёб', 'долбоеб', 'чмо', 'шлюх', 'гнид',
      'жоп', 'залуп', 'уеб', 'заеб', 'охуе', 'ахуе', 'нахуй', 'похуй',
      'нахер', 'похер', 'член', 'ёб твою', 'еб твою'],
    bannedWords: ['казино', 'ставки', 'купить подписчик', 'реклама'],
    insultWords: ['дурак', 'дура', 'тупой', 'тупая', 'идиот', 'идиотка',
      'кретин', 'дебил', 'бездарь', 'нищеброд', 'нищеброт', 'лох'],
    rudeRoots: ['сволоч', 'сволочь', 'мерзав', 'тварь', 'мраз', 'гнид', 'ублюд', 'падл'],
    familyWords: ['мама', 'мать', 'маму', 'мамке', 'мамки', 'мамой', 'отец', 'отца',
      'батя', 'батю', 'сестр', 'брат', 'бабушк', 'дедушк', 'дед', 'родител']
  };

  var db = null, mutesRef, warnsRef, usersRef, logRef;
  var mutes = {};          // муты из базы
  var localMutes = {};     // резерв в localStorage — переживает обновление страницы
  var mutesLoaded = false; // база уже отдала список мутов?
  var isAdmin = false;

  var MUTE_CACHE_KEY = 'chat_mutes_v1';
  try { localMutes = JSON.parse(localStorage.getItem(MUTE_CACHE_KEY) || '{}') || {}; }
  catch (e) { localMutes = {}; }

  function saveLocalMutes() {
    try { localStorage.setItem(MUTE_CACHE_KEY, JSON.stringify(localMutes)); } catch (e) {}
  }

  // Убираем просроченные локальные муты
  function pruneLocalMutes() {
    var now = Date.now(), changed = false;
    for (var uid in localMutes) {
      if (!localMutes[uid] || localMutes[uid].until <= now) {
        delete localMutes[uid]; changed = true;
      }
    }
    if (changed) saveLocalMutes();
  }

  function ensureDb() {
    if (db) return true;
    if (!window.firebase || !firebase.apps || !firebase.apps.length) return false;
    db = firebase.database();
    mutesRef = db.ref('mutes');
    warnsRef = db.ref('warns');
    usersRef = db.ref('users');
    logRef = db.ref('modlog');
    mutesRef.on('value', function (s) {
      mutes = s.val() || {};
      mutesLoaded = true;
      // База подтвердила: если мут удалён в базе (/unmute) — снимаем и локальный
      for (var uid in localMutes) {
        if (localMutes[uid].confirmed && !(mutes[uid] && mutes[uid].until > Date.now())) {
          delete localMutes[uid];
        }
      }
      saveLocalMutes();
    });
    return true;
  }

  function normalize(text) {
    var t = (text || '').toLowerCase();
    var map = { 'a': 'а', 'e': 'е', 'o': 'о', 'c': 'с', 'y': 'у', 'x': 'х',
      'p': 'р', 'k': 'к', 'm': 'м', 't': 'т', 'b': 'в', 'h': 'н',
      '0': 'о', '3': 'е', '6': 'б', '@': 'а', '$': 'с' };
    t = t.replace(/[a-z0-9@$]/g, function (ch) { return map[ch] || ' '; });
    t = t.replace(/[^а-яё ]/g, ' ');
    t = t.replace(/(.)\1{2,}/g, '$1');
    t = t.replace(/\s+/g, ' ');
    return t;
  }

  function hasAny(words, text) {
    for (var i = 0; i < words.length; i++) {
      if (text.indexOf(words[i]) >= 0) return true;
    }
    return false;
  }

  function fmtMin(min) {
    if (min < 60) return min + ' мин';
    var h = Math.floor(min / 60);
    if (h < 24) return h + ' ч';
    return Math.floor(h / 24) + ' дн';
  }

  function activeMute(uid) {
    var now = Date.now();
    if (mutes[uid] && mutes[uid].until > now) return mutes[uid];
    if (localMutes[uid] && localMutes[uid].until > now) return localMutes[uid];
    return null;
  }

  function isMuted(uid) { return !!activeMute(uid); }

  function muteLeft(uid) {
    var m = activeMute(uid);
    if (!m) return 0;
    return Math.ceil((m.until - Date.now()) / 60000);
  }

  function pushLog(text) {
    if (!ensureDb()) return;
    logRef.push({ t: firebase.database.ServerValue.TIMESTAMP, text: text });
  }

  function setMute(uid, nick, reason, cb) {
    if (!ensureDb()) { if (cb) cb(true, MUTE_STEPS[0]); return; }
    mutesRef.child(uid).transaction(function (cur) {
      var active = cur && cur.until > Date.now();
      var step = active ? Math.min((cur.step || 0) + 1, MUTE_STEPS.length - 1) : 0;
      return { step: step, nick: nick || '???', reason: reason || '',
        until: Date.now() + MUTE_STEPS[step] * 60000 };
    }, function (err, ok, snap) {
      if (!err && snap && snap.val()) {
        mutes[uid] = snap.val();
        // Подтверждаем локальную копию значением из базы
        localMutes[uid] = snap.val();
        localMutes[uid].confirmed = true;
        saveLocalMutes();
      }
      var step = (snap && snap.val() && snap.val().step) || 0;
      var min = MUTE_STEPS[step];
      pushLog('🔇 ' + (nick || uid) + ' — мут ' + fmtMin(min) + (reason ? ' (' + reason + ')' : ''));
      if (cb) cb(true, min);
    });
  }

  // Мгновенная блокировка: мут действует ещё до ответа базы
  function muteNow(uid, nick, reason, cb) {
    pruneLocalMutes();
    var cur = activeMute(uid);
    if (!cur) {
      var m = { step: 0, nick: nick || '???', reason: reason,
        until: Date.now() + MUTE_STEPS[0] * 60000, confirmed: false };
      mutes[uid] = m;
      localMutes[uid] = m;
      saveLocalMutes();
    }
    setMute(uid, nick, reason, function (_, min) {
      if (cb) cb(min);
    });
  }

  function directMute(uid, nick, reason, cb) {
    muteNow(uid, nick, reason, function (min) {
      cb('🚫 ' + nick + ': мут ' + fmtMin(min) + '. Причина: ' + reason + '.');
    });
  }

  function punish(uid, nick, reason, cb) {
    if (!ensureDb()) { cb(false); return; }
    warnsRef.child(uid).transaction(function (cur) { return (cur || 0) + 1; },
      function (err, ok, snap) {
        var n = (snap && snap.val()) || 0;
        if (n >= 2) {
          warnsRef.child(uid).set(0);
          muteNow(uid, nick, reason, function (min) { cb(true, min); });
        } else cb(false);
      });
  }

  var floodState = {}, repState = {};

  function check(uid, nick, text, cb) {
    if (!ensureDb()) { cb({ ok: true, msg: '' }); return; }
    pruneLocalMutes();

    if (isMuted(uid)) {
      cb({ ok: false, msg: '🔇 Вы в муте ещё ' + fmtMin(muteLeft(uid)) +
        '. Причина: ' + (activeMute(uid).reason || 'нарушение правил') });
      return;
    }

    var raw = (text || '').toLowerCase();
    var norm = normalize(text);

    if (raw.indexOf('http://') >= 0 || raw.indexOf('https://') >= 0 ||
        raw.indexOf('www.') >= 0 || raw.indexOf('.com') >= 0 || raw.indexOf('.ru') >= 0) {
      directMute(uid, nick, 'реклама/ссылки', function (msg) { cb({ ok: false, msg: msg }); });
      return;
    }

    if (hasAny(SETTINGS.hardWords, norm) || hasAny(SETTINGS.bannedWords, norm)) {
      directMute(uid, nick, 'запрещённые слова', function (msg) { cb({ ok: false, msg: msg }); });
      return;
    }

    var famHit = hasAny(SETTINGS.familyWords, norm);
    var rudeHit = hasAny(SETTINGS.rudeRoots, norm);
    if (famHit && rudeHit) {
      directMute(uid, nick, 'оскорбление родных', function (msg) { cb({ ok: false, msg: msg }); });
      return;
    }

    if (hasAny(SETTINGS.insultWords, norm) || (rudeHit && !famHit)) {
      punish(uid, nick, 'оскорбления', function (muted, min) {
        if (muted) cb({ ok: false, msg: '🚫 ' + nick + ': за оскорбления — мут ' + fmtMin(min) + '.' });
        else cb({ ok: false, msg: '⚠️ Оскорбления запрещены! Следующий раз — мут.' });
      });
      return;
    }

    var key = uid + '_flood';
    var times = (floodState[key] || []).filter(function (t) { return Date.now() - t < FLOOD_WINDOW; });
    times.push(Date.now());
    floodState[key] = times;
    if (times.length > FLOOD_COUNT) {
      muteNow(uid, nick, 'флуд', function (min) {
        cb({ ok: false, msg: '🚫 ' + nick + ': не флудите. Мут ' + fmtMin(min) + '.' });
      });
      return;
    }

    key = uid + '_rep';
    var same = repState[key] || { last: '', n: 0 };
    if (same.last === norm && norm.length > 0) same.n++; else same = { last: norm, n: 1 };
    repState[key] = same;
    if (same.n >= REPEAT_COUNT) {
      muteNow(uid, nick, 'спам повторами', function (min) {
        cb({ ok: false, msg: '🚫 ' + nick + ': спам повторами. Мут ' + fmtMin(min) + '.' });
      });
      return;
    }

    cb({ ok: true, msg: '' });
  }

  // Ищет пользователя по нику. Понимает оба формата:
  // старый users/<uid> = "Айдар" и новый users/<uid> = { name: 'Айдар', lastSeen: ... }
  function findUser(nick, cb) {
    usersRef.once('value', function (s) {
      var users = s.val() || {};
      var want = nick.toLowerCase();
      for (var uid in users) {
        var u = users[uid];
        var nm = (u && typeof u === 'object') ? (u.name || '') : u;
        if (String(nm).toLowerCase() === want) { cb({ id: uid, nick: nm }); return; }
      }
      cb(null);
    });
  }

  function command(text, cb) {
    if (!ensureDb()) return false;
    var parts = text.trim().split(/\s+/);
    var cmd = parts[0].toLowerCase();

    if (cmd === '/admin' && parts[1]) {
      if (parts[1] === ADMIN_PASS) {
        isAdmin = true;
        if (window.toggleStopsEditor) window.toggleStopsEditor(true); // открыть редактор остановок
        pushLog('👑 Админ-режим включён');
        cb('✅ Режим админа включён. Редактор остановок открыт.');
      }
      else cb('❌ Неверный пароль.');
      return true;
    }
    if (cmd === '/rules') {
      cb('📜 Правила чата:\n• без мата и оскорблений (за родных — мут сразу)\n• без спама, флуда и рекламы\n• нарушение = мут 5 мин → 15 → 45 → 3 ч → сутки');
      return true;
    }
    if (cmd === '/mutelist') {
      pruneLocalMutes();
      var out = [], seen = {};
      for (var uid in mutes) {
        if (mutes[uid] && mutes[uid].until > Date.now()) {
          out.push(mutes[uid].nick + ' — ещё ' + fmtMin(muteLeft(uid)));
          seen[uid] = true;
        }
      }
      for (var id in localMutes) {
        if (!seen[id] && localMutes[id].until > Date.now()) {
          out.push(localMutes[id].nick + ' — ещё ' + fmtMin(Math.ceil((localMutes[id].until - Date.now()) / 60000)));
        }
      }
      cb(out.length ? out.join('\n') : 'Список замученных пуст.');
      return true;
    }
    if (cmd === '/modlog') {
      logRef.limitToLast(10).once('value', function (s) {
        var rows = [];
        s.forEach(function (ch) { rows.push(ch.val()); });
        rows.sort(function (a, b) { return (a.t || 0) - (b.t || 0); });
        cb(rows.length ? rows.map(function (r) {
          return new Date(r.t).toLocaleTimeString('ru-RU') + ' ' + r.text;
        }).join('\n') : 'Лог пуст.');
      });
      return true;
    }
    if (cmd === '/mute' && parts[1]) {
      if (!isAdmin) { cb('❌ Только для админа. Сначала /admin <пароль>.'); return true; }
      var min = parseInt(parts[2], 10) || 10;
      findUser(parts[1], function (u) {
        if (!u) { cb('Пользователь не найден.'); return; }
        mutesRef.child(u.id).set({ step: 0, nick: u.nick, reason: 'решение админа',
          until: Date.now() + min * 60000 });
        pushLog('🔇 ' + u.nick + ' — ручной мут ' + fmtMin(min));
        cb('✅ ' + u.nick + ' в муте на ' + fmtMin(min) + '.');
      });
      return true;
    }
    if (cmd === '/unmute' && parts[1]) {
      if (!isAdmin) { cb('❌ Только для админа. Сначала /admin <пароль>.'); return true; }
      findUser(parts[1], function (u) {
        if (!u) { cb('Пользователь не найден.'); return; }
        mutesRef.child(u.id).remove();
        delete mutes[u.id];
        delete localMutes[u.id];
        saveLocalMutes();
        pushLog('🔊 Мут снят: ' + u.nick);
        cb('✅ Мут снят: ' + u.nick);
      });
      return true;
    }
    if (cmd === '/unmuteall') {
      if (!isAdmin) { cb('❌ Только для админа. Сначала /admin <пароль>.'); return true; }
      var n = 0;
      for (var id in mutes) {
        if (mutes[id] && mutes[id].until > Date.now()) { mutesRef.child(id).remove(); n++; }
      }
      for (var lid in localMutes) { delete localMutes[lid]; n++; }
      saveLocalMutes();
      pushLog('🔊 Сняты все муты');
      cb(n ? '✅ Снято мутов: ' + n : 'Замученных нет.');
      return true;
    }
    if (cmd === '/clear') {
      if (!isAdmin) { cb('❌ Только для админа. Сначала /admin <пароль>.'); return true; }
      db.ref('chat').remove();
      db.ref('meta/clearedAt').set(firebase.database.ServerValue.TIMESTAMP);
      pushLog('🧹 Чат очищен админом');
      cb('✅ Чат очищен — сообщения и плашки удалились у всех.');
      return true;
    }
    if (cmd === '/restore') {
      if (!isAdmin) { cb('❌ Только для админа. Сначала /admin <пароль>.'); return true; }
      db.ref('meta/clearedAt').set(0);
      pushLog('📜 История чата восстановлена');
      cb('✅ История восстановлена — старые сообщения снова видны.');
      return true;
    }

    return false;
  }

  return {
    check: check,
    isMuted: isMuted,
    muteLeft: muteLeft,
    setMute: setMute,
    command: command,
    registerUser: function (uid, nick) {
      if (ensureDb()) usersRef.child(uid).update({ name: nick });
    },
    settings: SETTINGS
  };
})();
