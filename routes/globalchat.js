const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { containsProfanity } = require('../utils/profanityFilter');

const router = express.Router();

router.get('/global-chat', requireAuth, (req, res) => {
  const messages = db.prepare(
    'SELECT id, user_id, username, text, created_at FROM global_messages ORDER BY created_at DESC LIMIT 100'
  ).all().reverse();
  res.json({ messages });
});

router.post('/global-chat', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Xabar bo\'sh bo\'lishi mumkin emas' });
  }
  const trimmed = text.trim().slice(0, 500);

  if (containsProfanity(trimmed)) {
    return res.status(400).json({ error: 'Xabaringizda taqiqlangan so\'zlar bor. Iltimos, hurmat bilan yozing.' });
  }

  db.prepare(
    'INSERT INTO global_messages (user_id, username, text, created_at) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, req.user.username, trimmed, Date.now());

  res.json({ success: true });
});

module.exports = router;
