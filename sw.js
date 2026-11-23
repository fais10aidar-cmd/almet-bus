// Минимальный service worker — нужен только для установки ярлыка
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
// Всё кэширование отключаем, чтобы расписание всегда было свежим
self.addEventListener('fetch', function (e) { /* passthrough */ });
