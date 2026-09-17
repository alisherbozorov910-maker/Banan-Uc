let activeThreadUserId = null;
let threadPollTimer = null;

function showAdminError(msg) {
  const box = document.getElementById('admin-login-error');
  box.textContent = msg;
  box.classList.remove('hidden');
}

async function checkAdminAuth() {
  try {
    await api('/admin/check');
    document.getElementById('admin-login-view').classList.add('hidden');
    document.getElementById('admin-dashboard-view').classList.remove('hidden');
    initDashboard();
    return true;
  } catch (e) {
    document.getElementById('admin-login-view').classList.remove('hidden');
    document.getElementById('admin-dashboard-view').classList.add('hidden');
    return false;
  }
}

document.getElementById('admin-login-btn').addEventListener('click', async () => {
  const password = document.getElementById('admin-password').value;
  try {
    await api('/admin/login', { method: 'POST', body: { password } });
    await checkAdminAuth();
  } catch (e) {
    showAdminError(e.message);
  }
});
document.getElementById('admin-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('admin-login-btn').click();
});

document.getElementById('admin-logout-btn').addEventListener('click', async () => {
  await api('/admin/logout', { method: 'POST' });
  window.location.reload();
});

// ---------- Tabs ----------
document.querySelectorAll('.admin-tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'dashboard') loadSummary();
    if (btn.dataset.tab === 'packages') loadPackages();
    if (btn.dataset.tab === 'orders') loadOrders();
    if (btn.dataset.tab === 'topups') loadTopups();
    if (btn.dataset.tab === 'users') loadUsers();
    if (btn.dataset.tab === 'support') loadThreads();
    if (btn.dataset.tab === 'settings') loadSettings();
    if (btn.dataset.tab === 'music') loadMusic();
    if (btn.dataset.tab === 'news') loadNewsAdmin();
  });
});

function initDashboard() {
  loadSummary();
}

// ---------- Dashboard ----------
async function loadSummary() {
  const s = await api('/admin/summary');
  document.getElementById('stat-users').textContent = s.usersCount;
  document.getElementById('stat-orders').textContent = s.pendingOrders;
  document.getElementById('stat-topups').textContent = s.pendingTopups;
  document.getElementById('stat-messages').textContent = s.unreadMessages;
}

// ---------- Packages ----------
async function loadPackages() {
  const { packages } = await api('/admin/packages');
  document.getElementById('packages-table').innerHTML = packages.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.title}</td>
      <td>${p.uc_amount}</td>
      <td>${fmtMoney(p.price)}</td>
      <td>${p.is_active ? '✅' : '❌'}</td>
      <td class="flex gap-2">
        <button class="btn btn-ghost btn-sm" onclick="editPackage(${p.id}, ${p.uc_amount}, ${p.price})">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="togglePackage(${p.id}, ${p.is_active ? 0 : 1})">${p.is_active ? '⏸' : '▶️'}</button>
        <button class="btn btn-danger btn-sm" onclick="deletePackage(${p.id})">🗑</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="text-dim text-center">Paketlar yo'q</td></tr>`;
}

document.getElementById('pkg-add-btn').addEventListener('click', async () => {
  const title = document.getElementById('pkg-title').value.trim();
  const uc_amount = document.getElementById('pkg-uc').value;
  const price = document.getElementById('pkg-price').value;
  if (!title || !uc_amount || !price) { alert('Barcha maydonlarni to\'ldiring'); return; }
  await api('/admin/packages', { method: 'POST', body: { title, uc_amount, price } });
  document.getElementById('pkg-title').value = '';
  document.getElementById('pkg-uc').value = '';
  document.getElementById('pkg-price').value = '';
  loadPackages();
});

async function editPackage(id, currentUc, currentPrice) {
  const newUc = prompt('Yangi UC miqdori:', currentUc);
  if (newUc === null) return;
  const newPrice = prompt('Yangi narx (so\'m):', currentPrice);
  if (newPrice === null) return;
  await api('/admin/packages/' + id, { method: 'PUT', body: { uc_amount: newUc, price: newPrice } });
  loadPackages();
}

async function togglePackage(id, newState) {
  await api('/admin/packages/' + id, { method: 'PUT', body: { is_active: newState } });
  loadPackages();
}

async function deletePackage(id) {
  if (!confirm('Paketni o\'chirishni tasdiqlaysizmi?')) return;
  await api('/admin/packages/' + id, { method: 'DELETE' });
  loadPackages();
}

// ---------- Orders ----------
async function loadOrders() {
  const { orders } = await api('/admin/orders');
  const pending = orders.filter(o => o.status === 'pending');
  const history = orders.filter(o => o.status !== 'pending');

  document.getElementById('orders-pending-table').innerHTML = pending.map(o => `
    <tr>
      <td>${o.id}</td>
      <td>${o.username}<br><span class="text-dim">${o.email || '&mdash;'}</span></td>
      <td>${o.package_title}</td>
      <td>${o.player_id}</td>
      <td>${fmtMoney(o.price)}</td>
      <td>${fmtDate(o.created_at)}</td>
      <td class="flex gap-2">
        <button class="btn btn-success btn-sm" onclick="updateOrder(${o.id}, 'delivered')">✅</button>
        <button class="btn btn-danger btn-sm" onclick="updateOrder(${o.id}, 'rejected')">❌</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-dim text-center">Kutilayotgan buyurtma yo'q</td></tr>`;

  document.getElementById('orders-history-table').innerHTML = history.map(o => `
    <tr>
      <td>${o.id}</td>
      <td>${o.username}<br><span class="text-dim">${o.email || '&mdash;'}</span></td>
      <td>${o.package_title}</td>
      <td>${o.player_id}</td>
      <td>${fmtMoney(o.price)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>${fmtDate(o.created_at)}</td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-dim text-center">Tarix bo'sh</td></tr>`;
}

async function updateOrder(id, status) {
  await api('/admin/orders/' + id, { method: 'PUT', body: { status } });
  loadOrders();
  loadSummary();
}

// ---------- Topups ----------
async function loadTopups() {
  const { topups } = await api('/admin/topups');
  document.getElementById('topups-table').innerHTML = topups.map(t => `
    <tr>
      <td>${t.id}</td>
      <td>${t.username}<br><span class="text-dim">${t.email || '&mdash;'}</span></td>
      <td>${fmtMoney(t.amount)}</td>
      <td><a href="${t.receipt_path}" target="_blank"><img class="receipt-thumb" src="${t.receipt_path}"></a></td>
      <td>${statusBadge(t.status)}</td>
      <td>${fmtDate(t.created_at)}</td>
      <td class="flex gap-2">
        ${t.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="updateTopup(${t.id}, 'approved')">✅</button>
          <button class="btn btn-danger btn-sm" onclick="updateTopup(${t.id}, 'rejected')">❌</button>
        ` : '—'}
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-dim text-center">So'rovlar yo'q</td></tr>`;
}

async function updateTopup(id, status) {
  await api('/admin/topups/' + id, { method: 'PUT', body: { status } });
  loadTopups();
  loadSummary();
}

// ---------- Users ----------
async function loadUsers() {
  const { users } = await api('/admin/users');
  document.getElementById('users-table').innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${fmtMoney(u.balance)}</td>
      <td>${u.is_verified ? '✅' : '❌'}</td>
      <td class="flex gap-2">
        <button class="btn btn-ghost btn-sm" onclick="adjustBalance(${u.id})">💰 Balans</button>
        <button class="btn btn-ghost btn-sm" onclick="resetUserPassword(${u.id})">🔑 Parol</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="text-dim text-center">Foydalanuvchilar yo'q</td></tr>`;
}

async function adjustBalance(userId) {
  const amount = prompt('Qo\'shiladigan (yoki ayiriladigan, minus bilan) summa:');
  if (!amount) return;
  await api('/admin/users/' + userId + '/balance', { method: 'PUT', body: { amount } });
  loadUsers();
}

async function resetUserPassword(userId) {
  const newPassword = prompt('Foydalanuvchi uchun yangi parol kiriting (kamida 6 belgi):');
  if (!newPassword) return;
  try {
    await api('/admin/users/' + userId + '/password', { method: 'PUT', body: { new_password: newPassword } });
    alert('Parol muvaffaqiyatli yangilandi');
  } catch (e) {
    alert(e.message);
  }
}

// ---------- Support ----------
async function loadThreads() {
  const { threads } = await api('/admin/support/threads');
  document.getElementById('thread-list').innerHTML = threads.map(t => `
    <div class="thread-item ${t.user_id === activeThreadUserId ? 'active' : ''}" onclick="openThread(${t.user_id}, '${escapeAttr(t.username)}')">
      <div class="name">${t.username} ${t.unread > 0 ? `<span class="unread-dot">${t.unread}</span>` : ''}</div>
      <div class="preview">${escapeAttr(t.last_message || '')}</div>
    </div>
  `).join('') || `<p class="text-dim text-center">Hozircha xabarlar yo'q</p>`;
}

function escapeAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/</g, '&lt;');
}

async function openThread(userId, name) {
  activeThreadUserId = userId;
  document.getElementById('chat-header').textContent = name;
  await loadThreadMessages();
  loadThreads();
  if (threadPollTimer) clearInterval(threadPollTimer);
  threadPollTimer = setInterval(loadThreadMessages, 5000);
}

async function loadThreadMessages() {
  if (!activeThreadUserId) return;
  const { messages } = await api('/admin/support/' + activeThreadUserId);
  const box = document.getElementById('admin-chat-box');
  box.innerHTML = messages.map(m => `
    <div class="msg ${m.sender === 'admin' ? 'msg-user' : 'msg-admin'}">
      ${escapeAttr(m.text)}
      <div class="msg-time">${fmtDate(m.created_at)}</div>
    </div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

document.getElementById('admin-chat-send').addEventListener('click', sendAdminReply);
document.getElementById('admin-chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendAdminReply();
});

async function sendAdminReply() {
  if (!activeThreadUserId) { alert('Avval suhbatni tanlang'); return; }
  const input = document.getElementById('admin-chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await api('/admin/support/' + activeThreadUserId + '/reply', { method: 'POST', body: { text } });
  await loadThreadMessages();
}

// ---------- Settings ----------
async function loadSettings() {
  const { settings } = await api('/admin/settings');
  document.getElementById('settings-card-number').value = settings.card_number || '';
  document.getElementById('settings-card-owner').value = settings.card_owner || '';
  document.getElementById('settings-secret-uc').value = settings.secret_uc_amount || '60';
  document.getElementById('settings-secret-code').value = settings.secret_code || '';
}

document.getElementById('settings-save-btn').addEventListener('click', async () => {
  const card_number = document.getElementById('settings-card-number').value.trim();
  const card_owner = document.getElementById('settings-card-owner').value.trim();
  await api('/admin/settings', { method: 'PUT', body: { card_number, card_owner } });
  const box = document.getElementById('settings-success');
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 2000);
});

document.getElementById('secret-save-btn').addEventListener('click', async () => {
  const secret_uc_amount = document.getElementById('settings-secret-uc').value.trim();
  const secret_code = document.getElementById('settings-secret-code').value.trim();
  await api('/admin/settings', { method: 'PUT', body: { secret_uc_amount, secret_code } });
  const box = document.getElementById('secret-success');
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 2000);
});

document.getElementById('admin-pw-save-btn').addEventListener('click', async () => {
  const current_password = document.getElementById('admin-pw-current').value;
  const new_password = document.getElementById('admin-pw-new').value;
  const errBox = document.getElementById('admin-pw-error');
  const okBox = document.getElementById('admin-pw-success');
  errBox.classList.add('hidden');
  okBox.classList.add('hidden');
  try {
    await api('/admin/change-password', { method: 'PUT', body: { current_password, new_password } });
    okBox.classList.remove('hidden');
    document.getElementById('admin-pw-current').value = '';
    document.getElementById('admin-pw-new').value = '';
  } catch (e) {
    errBox.textContent = e.message;
    errBox.classList.remove('hidden');
  }
});

// ---------- Music ----------
async function loadMusic() {
  const { tracks } = await api('/admin/music');
  document.getElementById('music-list').innerHTML = tracks.map(t => `
    <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:13px;">${t.is_active ? '🔊 ' : ''}${t.original_name}</div>
        <audio controls style="width:100%;margin-top:6px;height:32px;" src="${t.filename}"></audio>
      </div>
      <div class="flex gap-2" style="margin-left:10px;">
        ${!t.is_active ? `<button class="btn btn-success btn-sm" onclick="activateMusic(${t.id})">✅</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteMusic(${t.id})">🗑</button>
      </div>
    </div>
  `).join('') || `<p class="text-dim text-center">Hozircha trek yuklanmagan</p>`;
}

document.getElementById('music-upload-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('music-file-input');
  const errBox = document.getElementById('music-error');
  errBox.classList.add('hidden');
  if (!fileInput.files[0]) {
    errBox.textContent = 'Audio fayl tanlang';
    errBox.classList.remove('hidden');
    return;
  }
  const fd = new FormData();
  fd.append('track', fileInput.files[0]);
  try {
    await api('/admin/music', { method: 'POST', body: fd });
    fileInput.value = '';
    await loadMusic();
  } catch (e) {
    errBox.textContent = e.message;
    errBox.classList.remove('hidden');
  }
});

async function activateMusic(id) {
  await api('/admin/music/' + id + '/activate', { method: 'PUT' });
  loadMusic();
}

async function deleteMusic(id) {
  if (!confirm('Trekni o\'chirishni tasdiqlaysizmi?')) return;
  await api('/admin/music/' + id, { method: 'DELETE' });
  loadMusic();
}

// ---------- News ----------
async function loadNewsAdmin() {
  const { news } = await api('/admin/news');
  document.getElementById('news-list-admin').innerHTML = news.map(n => `
    <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div class="flex items-center justify-between">
        <div style="flex:1;min-width:0;">
          ${n.image_path ? `<img src="${n.image_path}" style="max-width:100%;border-radius:8px;margin-bottom:6px;display:block;">` : ''}
          <div style="font-size:13px;white-space:pre-wrap;">${escapeAttr(n.description)}</div>
          <div class="text-dim" style="font-size:11px;">${fmtDate(n.created_at)}</div>
        </div>
        <button class="btn btn-danger btn-sm" style="margin-left:10px;" onclick="deleteNews(${n.id})">🗑</button>
      </div>
    </div>
  `).join('') || `<p class="text-dim text-center">Hozircha yangilik yo'q</p>`;
}

document.getElementById('news-add-btn').addEventListener('click', async () => {
  const imageInput = document.getElementById('news-image-input');
  const description = document.getElementById('news-description-input').value.trim();
  const errBox = document.getElementById('news-error');
  errBox.classList.add('hidden');

  if (!description) {
    errBox.textContent = 'Tafsif kiritilishi shart';
    errBox.classList.remove('hidden');
    return;
  }

  const fd = new FormData();
  fd.append('description', description);
  if (imageInput.files[0]) fd.append('image', imageInput.files[0]);

  try {
    await api('/admin/news', { method: 'POST', body: fd });
    imageInput.value = '';
    document.getElementById('news-description-input').value = '';
    await loadNewsAdmin();
  } catch (e) {
    errBox.textContent = e.message;
    errBox.classList.remove('hidden');
  }
});

async function deleteNews(id) {
  if (!confirm('Yangilikni o\'chirishni tasdiqlaysizmi?')) return;
  await api('/admin/news/' + id, { method: 'DELETE' });
  loadNewsAdmin();
}

// ---------- Init ----------
(async function init() {
  await renderNavbar('admin');
  await checkAdminAuth();
})();
