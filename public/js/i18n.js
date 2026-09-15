const I18N = (function () {
  let dict = {};
  let currentLang = localStorage.getItem('lang') || 'uz';

  async function loadLang(lang) {
    const res = await fetch(`/js/lang/${lang}.json`);
    dict = await res.json();
    currentLang = lang;
    localStorage.setItem('lang', lang);
    applyToDOM();
    document.documentElement.setAttribute('lang', lang);
    updateSwitchButtons();
  }

  function t(key) {
    return dict[key] || key;
  }

  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key] != null) el.setAttribute('placeholder', dict[key]);
    });
  }

  function updateSwitchButtons() {
    document.querySelectorAll('.lang-switch button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
  }

  function initSwitcher() {
    document.querySelectorAll('.lang-switch button').forEach(btn => {
      btn.addEventListener('click', () => loadLang(btn.dataset.lang));
    });
    updateSwitchButtons();
  }

  function getLang() { return currentLang; }

  loadLang(currentLang);

  return { t, loadLang, initSwitcher, getLang };
})();
