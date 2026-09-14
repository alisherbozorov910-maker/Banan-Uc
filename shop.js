const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/packages', (req, res) => {
  const packages = db.prepare('SELECT id, title, uc_amount, price FROM packages WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json({ packages });
});

router.post('/orders', requireAuth, (req, res) => {
  const { package_id, player_id } = req.body;
  if (!package_id || !player_id || !String(player_id).trim()) {
    return res.status(400).json({ error: 'PUBG ID va paketni tanlang' });
  }
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').get(package_id);
  if (!pkg) return res.status(404).json({ error: 'Paket topilmadi' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.balance < pkg.price) {
    return res.status(400).json({ error: 'Hisobingizda mablag\' yetarli emas. Iltimos hisobni to\'ldiring.' });
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(pkg.price, user.id);
    const info = db.prepare(
      'INSERT INTO orders (user_id, package_id, package_title, uc_amount, price, player_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, \'pending\', ?)'
    ).run(user.id, pkg.id, pkg.title, pkg.uc_amount, pkg.price, String(player_id).trim(), now);
    return info.lastInsertRowid;
  });

  try {
    const orderId = tx();
    res.json({ success: true, orderId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Buyurtma yaratishda xatolik' });
  }
});

router.get('/orders/my', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ orders });
});

module.exports = router;
