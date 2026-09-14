const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/support/my', requireAuth, (req, res) => {
  db.prepare('UPDATE messages SET read_by_user = 1 WHERE user_id = ? AND sender = \'admin\'').run(req.user.id);
  const messages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
  res.json({ messages });
});

router.post('/support/send', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Xabar bo\'sh bo\'lishi mumkin emas' });
  db.prepare(
    'INSERT INTO messages (user_id, sender, text, read_by_admin, read_by_user, created_at) VALUES (?, \'user\', ?, 0, 1, ?)'
  ).run(req.user.id, text.trim(), Date.now());
  res.json({ success: true });
});

module.exports = router;
