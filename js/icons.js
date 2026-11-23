// ===== SVG-иконки интерфейса (единый стиль, красятся через currentColor) =====
window.vehIcon = function (type) {
  var bus =
    '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="4" y="3" width="16" height="14" rx="2.5"/><path d="M4 10h16"/>' +
    '<path d="M8 14h.01M16 14h.01"/>' +
    '<circle cx="7.5" cy="19.5" r="1.5"/><circle cx="16.5" cy="19.5" r="1.5"/></svg>';

  var trolley =
    '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="4" y="5" width="16" height="13" rx="2.5"/><path d="M4 11.5h16"/>' +
    '<path d="M12 5V2.5l5-1.5"/>' +
    '<path d="M8 15.5h.01M16 15.5h.01"/>' +
    '<circle cx="7.5" cy="20.5" r="1.5"/><circle cx="16.5" cy="20.5" r="1.5"/></svg>';

  return (type === 'trolleybus' || type === 'trolley') ? trolley : bus;
};

// Знак остановки (вместо 🚏)
window.stopIcon = function () {
  return '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="6" r="2.5"/><path d="M12 8.5V21"/>' +
    '<path d="M8 12h8"/><path d="M12 21l-2.5-3h5z" fill="currentColor" stroke="none"/></svg>';
};

// Информация (вместо ℹ️)
window.infoIcon = function () {
  return '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>';
};

// Часы (вместо ⏱)
window.clockIcon = function () {
  return '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';
};

// Календарь (вместо 📅)
window.calendarIcon = function () {
  return '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/>' +
    '<path d="M8 3v4M16 3v4"/></svg>';
};

// Булавка местоположения (вместо 📍)
window.pinIcon = function () {
  return '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 21s-6.5-5.7-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z"/>' +
    '<circle cx="12" cy="10.5" r="2.5"/></svg>';
};

// Песочные часы (вместо ⏳)
window.hourglassIcon = function () {
  return '<svg class="ico-veh" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6 3h12"/><path d="M6 21h12"/><path d="M8 3v3.5L12 12 8 17.5V21"/>' +
    '<path d="M16 3v3.5L12 12l4 5.5V21"/></svg>';
};
