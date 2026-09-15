const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../utils/upload');

const router = express.Router();

router.get('/settings/card', (req, res) => {
  const cardNumber = db.prepare('SELECT value FROM settings WHERE key = ?').get('card_number');
  const cardOwner = db.prepare('SELECT value FROM settings WHERE key = ?').get('card_owner');
  res.json({
    card_number: cardNumber ? cardNumber.value : '',
    card_owner: cardOwner ? cardOwner.value : ''
  });
});

router.get('/settings/music', (req, res) => {
  const track = db.prepare('SELECT filename FROM music_tracks WHERE is_active = 1 LIMIT 1').get();
  res.json({ url: track ? track.filename : null });
});

router.post('/topup', requireAuth, upload.single('receipt'), (req, res) => {
  const { amount } = req.body;
  const amt = parseInt(amount, 10);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Summani to\'g\'ri kiriting' });
  if (!req.file) return res.status(400).json({ error: 'Chek rasmini yuklang' });

  const relPath = '/uploads/receipts/' + req.file.filename;
  db.prepare(
    'INSERT INTO topups (user_id, amount, receipt_path, status, created_at) VALUES (?, ?, ?, \'pending\', ?)'
  ).run(req.user.id, amt, relPath, Date.now());

  res.json({ success: true });
});

router.get('/topup/my', requireAuth, (req, res) => {
  const topups = db.prepare('SELECT * FROM topups WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ topups });
});

module.exports = router;
