async function api(path, options = {}) {
  const opts = Object.assign({ credentials: 'include' }, options);
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch('/api' + path, opts);
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Xatolik yuz berdi');
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
}

function fmtDate(ts) {
  const d = new Date(Number(ts));
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const map = {
    pending: ['status_pending', 'badge-pending'],
    delivered: ['status_delivered', 'badge-delivered'],
    approved: ['status_approved', 'badge-approved'],
    rejected: ['status_rejected', 'badge-rejected']
  };
  const [key, cls] = map[status] || [status, 'badge-pending'];
  return `<span class="badge ${cls}">${I18N.t(key)}</span>`;
}

async function renderNavbar(activePage) {
  const root = document.getElementById('navbar-root');
  if (!root) return;

  let user = null;
  try {
    const data = await api('/auth/me');
    user = data.user;
  } catch (e) { /* not logged in */ }

  const linkClass = (page) => 'navlink' + (page === activePage ? ' active' : '');

  root.innerHTML = `
    <div class="navbar">
      <div class="container navbar-inner">
        <a href="/" class="brand"><span>PUBG</span><span class="dot">UC</span> Shop</a>
        <div class="nav-links">
          <a href="/" class="${linkClass('home')}" data-i18n="nav_home">Bosh sahifa</a>
          ${user ? `<a href="/profile.html" class="${linkClass('profile')}" data-i18n="nav_profile">Profil</a>` : ''}
          ${user ? `<a href="/support.html" class="${linkClass('support')}" data-i18n="nav_support">Yordam</a>` : ''}
          ${user ? `
            <span class="balance-pill">💰 <span id="nav-balance">${fmtMoney(user.balance)}</span> <span data-i18n="sum">so'm</span></span>
          ` : `
            <a href="/login.html" class="${linkClass('login')}" data-i18n="nav_login">Kirish</a>
            <a href="/register.html" class="btn btn-accent btn-sm" data-i18n="nav_register">Ro'yxatdan o'tish</a>
          `}
          <button class="menu-toggle-btn" id="menu-toggle-btn" aria-label="Menu">☰</button>
        </div>
      </div>
    </div>

    <div id="side-menu-overlay" class="side-menu-overlay hidden"></div>
    <div id="side-menu" class="side-menu">
      <div class="side-menu-header">
        <span data-i18n="menu_title">Menyu</span>
        <button id="menu-close-btn" class="menu-close-btn">✕</button>
      </div>
      <div class="side-menu-body">
        ${user ? `
          <div class="side-menu-user">
            <div class="side-menu-username">👤 ${user.username}</div>
          </div>
          <a href="/profile.html" class="side-menu-item" data-i18n="menu_profile">Profil</a>
          <a href="/account.html" class="side-menu-item" data-i18n="menu_account">Hisob</a>
          <a href="/orders.html" class="side-menu-item" data-i18n="menu_orders">Buyurtmalar tarixi</a>
          <a href="/leaderboard.html" class="side-menu-item" data-i18n="menu_leaderboard">Top reyting</a>
          <a href="/global-chat.html" class="side-menu-item" data-i18n="menu_global_chat">Global chat</a>
        ` : `
          <a href="/login.html" class="side-menu-item" data-i18n="nav_login">Kirish</a>
        `}

        <div class="side-menu-divider"></div>

        <div class="side-menu-label" data-i18n="menu_language">Til</div>
        <div class="lang-switch side-menu-lang">
          <button data-lang="uz">UZ</button>
          <button data-lang="ru">RU</button>
        </div>

        <div class="side-menu-divider"></div>

        <div class="side-menu-item side-menu-toggle-row">
          <span data-i18n="menu_sound">Fon musiqasi</span>
          <label class="switch">
            <input type="checkbox" id="sound-toggle-checkbox">
            <span class="slider"></span>
          </label>
        </div>

        ${user ? `
          <div class="side-menu-divider"></div>
          <a href="#" id="side-menu-logout" class="side-menu-item side-menu-logout" data-i18n="nav_logout">Chiqish</a>
        ` : ''}
      </div>
    </div>
  `;

  I18N.initSwitcher();
  I18N.loadLang(I18N.getLang());

  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const sideMenu = document.getElementById('side-menu');
  const overlay = document.getElementById('side-menu-overlay');
  const closeBtn = document.getElementById('menu-close-btn');

  function openMenu() {
    sideMenu.classList.add('open');
    overlay.classList.remove('hidden');
  }
  function closeMenu() {
    sideMenu.classList.remove('open');
    overlay.classList.add('hidden');
  }
  menuToggleBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  const logoutLink = document.getElementById('side-menu-logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await api('/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }

  // Kosmik ovoz almashtirish tugmasi
  const soundCheckbox = document.getElementById('sound-toggle-checkbox');
  if (soundCheckbox && window.SpaceSound) {
    soundCheckbox.checked = window.SpaceSound.isEnabled();
    soundCheckbox.addEventListener('change', () => {
      if (soundCheckbox.checked) window.SpaceSound.enable();
      else window.SpaceSound.disable();
    });
  }

  return user;
}
