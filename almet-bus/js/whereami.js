// ===== Кнопка «Где я» =====
(function () {
var btn = document.createElement('button');
btn.id = 'whereamiBtn';
btn.innerHTML = pinIcon() + '<span>Где я</span>';
document.body.appendChild(btn);
  btn.addEventListener('click', function () {
    if (!navigator.geolocation) { btn.textContent = 'Нет геолокации'; return; }
    btn.innerHTML = hourglassIcon() + '<span>Ищу…</span>';
    navigator.geolocation.getCurrentPosition(function (p) {
      var lat = p.coords.latitude, lng = p.coords.longitude;
      btn.innerHTML = pinIcon() + '<span>Где я</span>';
      var map = window.__aliceMap;
      if (!map) { btn.textContent = 'Карта не найдена'; return; }
      // Leaflet: красная точка
      if (map.setView) {
        map.setView([lat, lng], 16);
        if (window.L) {
          if (btn._m) map.removeLayer(btn._m);
          btn._m = L.circleMarker([lat, lng], {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: '#e53935',
            fillOpacity: 1
          }).addTo(map);
        }
        return;
      }
      // Яндекс.Карты: красная точка
      if (map.setCenter) {
        map.setCenter([lat, lng], 16);
        if (window.ymaps) {
          map.geoObjects.add(new ymaps.Placemark([lat, lng], {}, {
            iconLayout: 'default#image',
            preset: 'islands#redCircleIcon'
          }));
        }
      }
    }, function () {
      btn.textContent = 'Не нашёл вас';
      setTimeout(function () { btn.innerHTML = pinIcon() + '<span>Где я</span>'; }, 2500);
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
})();
