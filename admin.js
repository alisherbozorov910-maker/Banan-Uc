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
  document.getElementById('orders-table').innerHTML = orders.map(o => `
    <tr>
      <td>${o.id}</td>
      <td>${o.username}<br><span class="text-dim">${o.email || '&mdash;'}</span></td>
      <td>${o.package_title}</td>
      <td>${o.player_id}</td>
      <td>${fmtMoney(o.price)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>${fmtDate(o.created_at)}</td>
      <td class="flex gap-2">
        ${o.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="updateOrder(${o.id}, 'delivered')">✅</button>
          <button class="btn btn-danger btn-sm" onclick="updateOrder(${o.id}, 'rejected')">❌</button>
        ` : '—'}
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8" class="text-dim text-center">Buyurtmalar yo'q</td></tr>`;
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
      <td><button class="btn btn-ghost btn-sm" onclick="adjustBalance(${u.id})">💰 Balans</button></td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="text-dim text-center">Foydalanuvchilar yo'q</td></tr>`;
}

async function adjustBalance(userId) {
  const amount = prompt('Qo\'shiladigan (yoki ayiriladigan, minus bilan) summa:');
  if (!amount) return;
  await api('/admin/users/' + userId + '/balance', { method: 'PUT', body: { amount } });
  loadUsers();
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
}

document.getElementById('settings-save-btn').addEventListener('click', async () => {
  const card_number = document.getElementById('settings-card-number').value.trim();
  const card_owner = document.getElementById('settings-card-owner').value.trim();
  await api('/admin/settings', { method: 'PUT', body: { card_number, card_owner } });
  const box = document.getElementById('settings-success');
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 2000);
});

// ---------- Init ----------
(async function init() {
  await renderNavbar('admin');
  await checkAdminAuth();
})();
