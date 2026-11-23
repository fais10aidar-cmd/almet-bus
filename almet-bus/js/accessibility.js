// ===== Режим для слабовидящих =====
var A11Y_KEY = 'almetyevsk_a11y';

function applyA11y(on) {
  document.body.classList.toggle('a11y', !!on);
  var cb = document.getElementById('a11yMode');
  if (cb) cb.checked = !!on;
  // карта может пересчитать размеры после смены шрифтов
  if (window.MAP) MAP.invalidateSize();
}

function initA11y() {
  var saved = false;
  try { saved = localStorage.getItem(A11Y_KEY) === '1'; } catch (e) { /* приватный режим — не страшно */ }
  applyA11y(saved);

  var cb = document.getElementById('a11yMode');
  if (cb) {
    cb.addEventListener('change', function () {
      applyA11y(this.checked);
      try { localStorage.setItem(A11Y_KEY, this.checked ? '1' : '0'); } catch (e) {}
    });
  }
}
