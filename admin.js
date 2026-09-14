const express = require('express');
const db = require('../config/db');
const { requireAdmin, signAdminToken } = require('../middleware/auth');

const router = express.Router();

// ---------- Admin auth ----------
router.post('/login', (req, res) => {
  const { password } = req.body;
  const expected = process.env.ADMIN_PASSWORD || 'alisherbek2013';
  if (password !== expected) {
    return res.status(401).json({ error: 'Parol noto\'g\'ri' });
  }
  const token = signAdminToken();
  res.cookie('admin_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000 });
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

router.get('/check', requireAdmin, (req, res) => res.json({ ok: true }));

// ---------- Dashboard summary ----------
router.get('/summary', requireAdmin, (req, res) => {
  const usersCount = db.prepare('SELECT COUNT(*) c FROM users WHERE is_verified = 1').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'pending'").get().c;
  const pendingTopups = db.prepare("SELECT COUNT(*) c FROM topups WHERE status = 'pending'").get().c;
  const unreadMessages = db.prepare("SELECT COUNT(*) c FROM messages WHERE sender = 'user' AND read_by_admin = 0").get().c;
  res.json({ usersCount, pendingOrders, pendingTopups, unreadMessages });
});

// ---------- Users ----------
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, email, is_verified, balance, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

router.put('/users/:id/balance', requireAdmin, (req, res) => {
  const { amount } = req.body; // amount to add (can be negative)
  const delta = parseInt(amount, 10);
  if (!delta) return res.status(400).json({ error: 'Summani kiriting' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(delta, user.id);
  res.json({ success: true });
});

// ---------- Packages CRUD ----------
router.get('/packages', requireAdmin, (req, res) => {
  const packages = db.prepare('SELECT * FROM packages ORDER BY sort_order ASC, id ASC').all();
  res.json({ packages });
});

router.post('/packages', requireAdmin, (req, res) => {
  const { title, uc_amount, price, sort_order } = req.body;
  if (!title || !uc_amount || !price) return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });
  const info = db.prepare(
    'INSERT INTO packages (title, uc_amount, price, is_active, sort_order) VALUES (?, ?, ?, 1, ?)'
  ).run(title, parseInt(uc_amount, 10), parseInt(price, 10), parseInt(sort_order || 0, 10));
  res.json({ success: true, id: info.lastInsertRowid });
});

router.put('/packages/:id', requireAdmin, (req, res) => {
  const { title, uc_amount, price, is_active, sort_order } = req.body;
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Paket topilmadi' });
  db.prepare(
    'UPDATE packages SET title = ?, uc_amount = ?, price = ?, is_active = ?, sort_order = ? WHERE id = ?'
  ).run(
    title ?? pkg.title,
    uc_amount != null ? parseInt(uc_amount, 10) : pkg.uc_amount,
    price != null ? parseInt(price, 10) : pkg.price,
    is_active != null ? (is_active ? 1 : 0) : pkg.is_active,
    sort_order != null ? parseInt(sort_order, 10) : pkg.sort_order,
    pkg.id
  );
  res.json({ success: true });
});

router.delete('/packages/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- Orders ----------
router.get('/orders', requireAdmin, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.username, u.email
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all();
  res.json({ orders });
});

router.put('/orders/:id', requireAdmin, (req, res) => {
  const { status, admin_note } = req.body; // 'delivered' | 'rejected'
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
  if (!['delivered', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status noto\'g\'ri' });
  }

  const tx = db.transaction(() => {
    if (status === 'rejected' && order.status !== 'rejected') {
      // refund balance
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(order.price, order.user_id);
    }
    db.prepare('UPDATE orders SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?')
      .run(status, admin_note || null, Date.now(), order.id);
  });
  tx();
  res.json({ success: true });
});

// ---------- Topups ----------
router.get('/topups', requireAdmin, (req, res) => {
  const topups = db.prepare(`
    SELECT t.*, u.username, u.email
    FROM topups t JOIN users u ON u.id = t.user_id
    ORDER BY t.created_at DESC
  `).all();
  res.json({ topups });
});

router.put('/topups/:id', requireAdmin, (req, res) => {
  const { status, admin_note } = req.body; // 'approved' | 'rejected'
  const topup = db.prepare('SELECT * FROM topups WHERE id = ?').get(req.params.id);
  if (!topup) return res.status(404).json({ error: 'So\'rov topilmadi' });
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status noto\'g\'ri' });
  }
  if (topup.status !== 'pending') {
    return res.status(400).json({ error: 'Bu so\'rov allaqachon ko\'rib chiqilgan' });
  }

  const tx = db.transaction(() => {
    if (status === 'approved') {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(topup.amount, topup.user_id);
    }
    db.prepare('UPDATE topups SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?')
      .run(status, admin_note || null, Date.now(), topup.id);
  });
  tx();
  res.json({ success: true });
});

// ---------- Settings (card number) ----------
router.get('/settings', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json({ settings });
});

router.put('/settings', requireAdmin, (req, res) => {
  const { card_number, card_owner } = req.body;
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  if (card_number != null) upsert.run('card_number', card_number);
  if (card_owner != null) upsert.run('card_owner', card_owner);
  res.json({ success: true });
});

// ---------- Support inbox ----------
router.get('/support/threads', requireAdmin, (req, res) => {
  const threads = db.prepare(`
    SELECT u.id as user_id, u.username, u.email,
      (SELECT text FROM messages m WHERE m.user_id = u.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages m WHERE m.user_id = u.id ORDER BY m.created_at DESC LIMIT 1) as last_time,
      (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id AND m.sender = 'user' AND m.read_by_admin = 0) as unread
    FROM users u
    WHERE EXISTS (SELECT 1 FROM messages m WHERE m.user_id = u.id)
    ORDER BY last_time DESC
  `).all();
  res.json({ threads });
});

router.get('/support/:userId', requireAdmin, (req, res) => {
  db.prepare("UPDATE messages SET read_by_admin = 1 WHERE user_id = ? AND sender = 'user'").run(req.params.userId);
  const messages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC').all(req.params.userId);
  res.json({ messages });
});

router.post('/support/:userId/reply', requireAdmin, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Xabar bo\'sh bo\'lmasin' });
  db.prepare(
    "INSERT INTO messages (user_id, sender, text, read_by_admin, read_by_user, created_at) VALUES (?, 'admin', ?, 1, 0, ?)"
  ).run(req.params.userId, text.trim(), Date.now());
  res.json({ success: true });
});

module.exports = router;
