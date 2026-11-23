// ===== Общий чат (Firebase) — v4.3: reply, правка/удаление, онлайн, анимации, мостик редактора =====
(function () {
  var root = document.getElementById('chatRoot');
  if (!root) return;

  var firebaseConfig = {
    apiKey: 'AIzaSyBLfvuYeLgQZLS_b0pJ8HY6BN7G39Sk8k',
    authDomain: 'chat2-b7445.firebaseapp.com',
    databaseURL: 'https://chat2-b7445-default-rtdb.firebaseio.com',
    projectId: 'chat2-b7445'
  };

  firebase.initializeApp(firebaseConfig);
  var db = firebase.database();
  var chatRef = db.ref('chat');
  var usersRef = db.ref('users');

  var NICK_KEY = 'chat_nick_v1';
  var nick = '';
  try { nick = localStorage.getItem(NICK_KEY) || ''; } catch (e) {}

  var st = document.createElement('style');
  st.textContent = [
    '#tab-chat { display:none; }',
    '#tab-chat.active { display:flex; flex-direction:column; height:100%; min-height:0; padding:12px 14px 76px; }',
    '#tab-chat h2 { margin:0 0 10px; }',
    '#chatRoot { flex:1; display:flex; flex-direction:column; min-height:0; max-height:100%; max-width:560px; width:100%; margin:0 auto; }',
    '.chat-box { position:relative; display:flex; flex-direction:column; flex:1; min-height:0;',
    '  background:#f4f6f9; border-radius:18px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,.07); }',
    '.chat-status { padding:6px 44px 6px 12px; font-size:12px; text-align:center; background:#eef3fb; color:#5a6b8a; flex:0 0 auto; }',
    '.chat-status.err { background:#fde8e8; color:#a33; }',
    '.chat-theme { position:absolute; top:2px; right:6px; z-index:2; background:transparent; border:none;',
    '  font-size:17px; cursor:pointer; padding:4px 8px; border-radius:8px; }',
    '.chat-msgs { flex:1 1 auto; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px;',
    '  -webkit-overflow-scrolling:touch; min-height:0; }',
    '.msg { max-width:85%; padding:10px 14px; border-radius:18px; font-size:15.5px; line-height:1.45;',
    '  overflow-wrap:anywhere; word-break:break-word; white-space:pre-wrap;',
    '  animation: msgIn .25s ease-out; }',
    '@keyframes msgIn { from { opacity:0; transform: translateY(8px) scale(.98); } to { opacity:1; transform:none; } }',
    '.msg .who { font-size:12px; font-weight:bold; opacity:.6; margin-bottom:3px; }',
    '.msg .tm { display:block; font-size:10.5px; opacity:.55; margin-top:4px; }',
    '.msg .quote { border-left:3px solid rgba(0,0,0,.25); padding:2px 8px; margin:0 0 4px;',
    '  font-size:13px; opacity:.85; border-radius:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '.msg.mine .quote { border-left-color:rgba(255,255,255,.6); }',
    '.msg .editMark { font-size:10.5px; opacity:.55; margin-left:6px; }',
    '.msg.bot { align-self:center; background:transparent; font-size:13px; color:#889; padding:2px; max-width:100%; text-align:center; }',
    '.msg.mod { align-self:center; background:#fff6d6; color:#8a6d1a; font-size:13px; max-width:100%;',
    '  border:1px solid #f0e0a0; animation: plateIn .2s ease-out; }',
    '@keyframes plateIn { from { opacity:0; transform: scale(.95); } to { opacity:1; transform:none; } }',
    '.msg.mine { align-self:flex-end; background:#007aff; color:#fff; border-bottom-right-radius:5px; }',
    '.msg.other { align-self:flex-start; background:#fff; border-bottom-left-radius:5px; box-shadow:0 1px 3px rgba(0,0,0,.06); }',
    '.chat-replybar { display:none; align-items:center; gap:8px; padding:6px 12px; background:#eef3fb;',
    '  border-top:1px solid #e6eaf0; font-size:13px; color:#5a6b8a; flex:0 0 auto; cursor:default; }',
    '.chat-replybar.on { display:flex; animation: plateIn .15s ease-out; }',
    '.chat-replybar .qt { flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }',
    '.chat-replybar button { border:none; background:transparent; font-size:15px; cursor:pointer; color:#888; padding:2px 6px; }',
    '.chat-menu { position:fixed; z-index:50; background:#fff; border-radius:12px; box-shadow:0 4px 18px rgba(0,0,0,.2);',
    '  padding:4px; display:none; flex-direction:column; min-width:150px; }',
    '.chat-menu.on { display:flex; animation: plateIn .12s ease-out; }',
    '.chat-menu button { border:none; background:transparent; text-align:left; padding:10px 14px;',
    '  font-size:14.5px; cursor:pointer; border-radius:8px; color:#222; }',
    '.chat-menu button:hover { background:#f0f4fa; }',
    '.chat-menu button.danger { color:#d33; }',
    '.chat-input-row { display:flex; gap:10px; padding:10px 12px; background:#fff; border-top:1px solid #e6eaf0; flex:0 0 auto; }',
    '.chat-input { flex:1; padding:12px 16px; border:1px solid #dde3ec; border-radius:24px; font-size:16px; outline:none; min-width:0; }',
    '.chat-input:focus { border-color:#007aff; box-shadow:0 0 0 3px rgba(0,122,255,.12); }',
    '.chat-send { width:50px; height:50px; border:none; border-radius:50%; background:#007aff; color:#fff;',
    '  font-size:20px; cursor:pointer; flex:0 0 auto; }',
    '.chat-send:active { background:#005ecb; }',
    '@media (max-width:480px) { .msg { max-width:92%; } }',
    'body.a11y .chat-box { background:#000; border:3px solid #000; }',
    'body.a11y .chat-status { background:#000; color:#ffdd00; }',
    'body.a11y .chat-theme { color:#ffdd00; }',
    'body.a11y .chat-replybar { background:#000; color:#ffdd00; }',
    'body.a11y .msg.bot { background:#000; color:#ffdd00; }',
    'body.a11y .msg.mod { background:#000; color:#ffdd00; border:2px solid #ffdd00; }',
    'body.a11y .msg.other { background:#000; color:#ffdd00; border:2px solid #ffdd00; font-size:17px; }',
    'body.a11y .msg.mine { background:#ffdd00; color:#000; font-weight:bold; font-size:17px; }',
    'body.a11y .chat-input { background:#000; color:#ffdd00; border:3px solid #ffdd00; font-size:17px; }',
    'body.a11y .chat-send { background:#ffdd00; color:#000; font-weight:bold; }'
  ].join('\n');
  document.head.appendChild(st);

  root.innerHTML =
    '<div class="chat-box">' +
      '<div class="chat-status" id="chatStatus">Подключаюсь…</div>' +
      '<button class="chat-theme" id="chatTheme" aria-label="Переключить тему">🌙</button>' +
      '<div class="chat-msgs" id="chatMsgs"></div>' +
      '<div class="chat-replybar" id="chatReplybar">' +
        '<span class="qt" id="chatReplyText"></span>' +
        '<button id="chatReplyClose" aria-label="Отменить ответ">✕</button>' +
      '</div>' +
      '<div class="chat-input-row">' +
        '<input class="chat-input" id="chatInput" type="text" placeholder="Сообщение… (1000 символов)" ' +
          'autocomplete="off" maxlength="1000">' +
        '<button class="chat-send" id="chatSend" aria-label="Отправить">➤</button>' +
      '</div>' +
      '<div class="chat-menu" id="chatMenu"></div>' +
    '</div>';

  var msgsEl = document.getElementById('chatMsgs');
  var inputEl = document.getElementById('chatInput');
  var statusEl = document.getElementById('chatStatus');
  var themeBtn = document.getElementById('chatTheme');
  var replyBar = document.getElementById('chatReplybar');
  var replyText = document.getElementById('chatReplyText');
  var menuEl = document.getElementById('chatMenu');

  // ===== Мостик: показ/скрытие редактора остановок (для админ-режима) =====
  window.toggleStopsEditor = function (show) {
    var el = document.getElementById('stopsEditor');
    if (el) el.style.display = show ? '' : 'none';
  };

  function updThemeBtn() {
    themeBtn.textContent = window.AliceDark && window.AliceDark.is() ? '☀️' : '🌙';
  }
  themeBtn.addEventListener('click', function () {
    if (window.AliceDark) window.AliceDark.toggle();
    updThemeBtn();
  });
  setTimeout(updThemeBtn, 0);

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function now() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  var UID_KEY = 'chat_uid_v1';
  var myUid = '';
  try {
    myUid = localStorage.getItem(UID_KEY);
    if (!myUid) {
      myUid = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(UID_KEY, myUid);
    }
  } catch (e) { myUid = 'u' + Math.random(); }

  function askNick() {
    var n = prompt('Как тебя зовут в чате?') || '';
    nick = n.trim().slice(0, 30);
    if (nick) {
      try { localStorage.setItem(NICK_KEY, nick); } catch (e) {}
      registerMe();
    }
  }

  function registerMe() {
    if (!myUid) return;
    if (nick) usersRef.child(myUid).update({ name: nick });
  }

  // ===== Онлайн-счётчик =====
  // Пишем lastSeen всегда, даже без ника — пользователь с пустым именем тоже в сети
  var ONLINE_WINDOW = 120000; // 2 минуты
  function touchPresence() {
    if (!myUid) return;
    usersRef.child(myUid + '/lastSeen').set(firebase.database.ServerValue.TIMESTAMP);
  }
  usersRef.child(myUid + '/lastSeen').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
  var usersCache = {};
  usersRef.on('value', function (s) {
    usersCache = s.val() || {};
    updOnline();
  });
  function onlineCount() {
    var n = 0, cut = Date.now() - ONLINE_WINDOW;
    for (var uid in usersCache) {
      var u = usersCache[uid];
      if (u && typeof u === 'object' && u.lastSeen && u.lastSeen > cut) n++;
    }
    return n;
  }
  function updOnline() {
    var n = onlineCount();
    if (!statusEl.classList.contains('err')) {
      statusEl.textContent = 'Онлайн · чат общий для всех · 👥 ' + n;
    }
  }
  setInterval(function () { touchPresence(); updOnline(); }, 30000);
  setInterval(updOnline, 15000);

  function scrollDown() { msgsEl.scrollTop = msgsEl.scrollHeight; }

  function sys(text, cls) {
    var d = document.createElement('div');
    d.className = 'msg ' + (cls || 'bot');
    d.textContent = text;
    msgsEl.appendChild(d);
    while (msgsEl.children.length > 200) msgsEl.removeChild(msgsEl.firstChild);
    scrollDown();
  }

  var modPlateTimer = null;
  function sysMod(text) {
    var el = document.getElementById('chatModPlate');
    if (!el) {
      el = document.createElement('div');
      el.id = 'chatModPlate';
      el.className = 'msg mod';
    }
    el.textContent = text;
    msgsEl.appendChild(el);
    while (msgsEl.children.length > 200) msgsEl.removeChild(msgsEl.firstChild);
    scrollDown();
    if (modPlateTimer) clearTimeout(modPlateTimer);
    modPlateTimer = setTimeout(function () {
      var p = document.getElementById('chatModPlate');
      if (p) p.remove();
    }, 60000);
  }

  // ===== Reply-состояние =====
  var replyTo = null;
  function setReply(data) {
    replyTo = { name: data.name, text: (data.text || '').slice(0, 60) };
    replyText.textContent = '↩ ' + data.name + ': ' + replyTo.text;
    replyBar.classList.add('on');
    inputEl.focus();
  }
  function clearReply() {
    replyTo = null;
    replyBar.classList.remove('on');
  }
  document.getElementById('chatReplyClose').addEventListener('click', clearReply);

  // ===== Меню действий (долгое нажатие / двойной клик) =====
  function hideMenu() { menuEl.classList.remove('on'); }
  document.addEventListener('click', function (e) {
    if (menuEl.classList.contains('on') && !menuEl.contains(e.target)) hideMenu();
  });

  function openMenu(x, y, data, key, mine) {
    menuEl.innerHTML = '';
    var b1 = document.createElement('button');
    b1.textContent = '↩ Ответить';
    b1.addEventListener('click', function () { setReply(data); hideMenu(); });
    menuEl.appendChild(b1);

    if (mine) {
      if (!data.deleted) {
        var b2 = document.createElement('button');
        b2.textContent = '✏️ Редактировать';
        b2.addEventListener('click', function () {
          hideMenu();
          var t = prompt('Измени сообщение:', data.text);
          if (t && t.trim()) {
            chatRef.child(key).update({ text: t.trim().slice(0, 1000), edited: true });
          }
        });
        menuEl.appendChild(b2);
      }
      var b3 = document.createElement('button');
      b3.className = 'danger';
      b3.textContent = '🗑 Удалить';
      b3.addEventListener('click', function () {
        hideMenu();
        chatRef.child(key).update({ deleted: true, text: '' });
      });
      menuEl.appendChild(b3);
    }

    menuEl.classList.add('on');
    var mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    menuEl.style.left = Math.min(Math.max(8, x - mw / 2), window.innerWidth - mw - 8) + 'px';
    menuEl.style.top = Math.min(Math.max(8, y - mh - 10), window.innerHeight - mh - 8) + 'px';
    menuEl.style.position = 'fixed';
  }

  function bindMsgEvents(d, data, key, mine) {
    var lpTimer = null;
    function show(e) {
      var pt = (e.touches && e.touches[0]) || e;
      openMenu(pt.clientX, pt.clientY, data, key, mine);
    }
    d.addEventListener('dblclick', show);
    d.addEventListener('touchstart', function (e) {
      lpTimer = setTimeout(function () { show(e); }, 450);
    }, { passive: true });
    d.addEventListener('touchend', function () { if (lpTimer) clearTimeout(lpTimer); });
    d.addEventListener('touchmove', function () { if (lpTimer) clearTimeout(lpTimer); });
  }

  function renderMsg(data, mine, key) {
    var d = document.createElement('div');
    d.className = 'msg ' + (mine ? 'mine' : 'other');
    if (key) d.setAttribute('data-key', key);
    var inner = '<div class="who">' + esc(data.name) + '</div>';
    if (data.deleted) {
      inner += '<em style="opacity:.6">Сообщение удалено</em>';
    } else {
      if (data.replyName) {
        inner += '<div class="quote">↩ ' + esc(data.replyName) + ': ' + esc(data.replyText || '…') + '</div>';
      }
      inner += esc(data.text || '');
      if (data.edited) inner += '<span class="editMark">(изменено)</span>';
    }
    inner += '<span class="tm">' + now() + '</span>';
    d.innerHTML = inner;
    if (!data.deleted) bindMsgEvents(d, data, key, mine);
    return d;
  }

  function addMsg(data, mine, key) {
    msgsEl.appendChild(renderMsg(data, mine, key));
    while (msgsEl.children.length > 200) msgsEl.removeChild(msgsEl.firstChild);
    scrollDown();
  }

  var connected = false;
  var clearedAt = 0;
  function listen() {
    if (connected) return;
    connected = true;
    chatRef.limitToLast(100).off();
    msgsEl.innerHTML = '';
    clearReply();
    sys('Это общий чат всех, кто пользуется приложением. Правила: /rules 🙂');
    chatRef.limitToLast(100).on('child_added', function (snap) {
      var data = snap.val();
      if (!data || !data.name) return;
      if (!data.deleted && !data.text) return;
      if (data.ts && clearedAt > 0 && data.ts < clearedAt) return;
      if (window.ChatMod && ChatMod.isMuted(data.uid)) return;
      addMsg(data, data.uid === myUid, snap.key);
    });
    chatRef.limitToLast(100).on('child_removed', function (snap) {
      var el = msgsEl.querySelector('[data-key="' + snap.key + '"]');
      if (el) el.remove();
    });
    // Правка и удаление — вживую у всех
    chatRef.limitToLast(100).on('child_changed', function (snap) {
      var data = snap.val();
      if (!data || !data.name) return;
      if (window.ChatMod && ChatMod.isMuted(data.uid)) return;
      var old = msgsEl.querySelector('[data-key="' + snap.key + '"]');
      var fresh = renderMsg(data, data.uid === myUid, snap.key);
      if (old) msgsEl.replaceChild(fresh, old);
      else msgsEl.appendChild(fresh);
      scrollDown();
    });
  }

  db.ref('meta/clearedAt').on('value', function (s) {
    var t = s.val() || 0;
    if (t !== clearedAt) {
      clearedAt = t;
      connected = false;
      listen();
    }
  });

  db.ref('.info/connected').on('value', function (snap) {
    if (snap.val()) {
      statusEl.className = 'chat-status';
      touchPresence();
      listen();
    } else {
      statusEl.className = 'chat-status err';
      statusEl.textContent = 'Нет сети — сообщения появятся, когда интернет вернётся';
    }
  });

  function send() {
    var text = inputEl.value.trim();
    if (!text) return;
    if (!nick) { askNick(); if (!nick) return; }
    text = text.slice(0, 1000);
    inputEl.value = '';

    var reply = replyTo;
    clearReply();

    var payload = {
      name: nick,
      text: text,
      uid: myUid,
      ts: firebase.database.ServerValue.TIMESTAMP
    };
    if (reply) {
      payload.replyName = reply.name;
      payload.replyText = reply.text;
    }

    if (window.ChatMod) {
      if (ChatMod.command(text, function (resp) { if (resp) sysMod(resp); })) return;

      ChatMod.check(myUid, nick, text, function (v) {
        if (!v.ok) { sysMod(v.msg); return; }
        registerMe();
        chatRef.push(payload);
      });
      return;
    }

    chatRef.push(payload);
  }

  document.getElementById('chatSend').addEventListener('click', send);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  });

  if (!nick) askNick();
  else registerMe();
})();