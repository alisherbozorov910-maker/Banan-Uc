const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signUserToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function usernameTaken(username) {
  return !!db.prepare('SELECT id FROM users WHERE username = ?').get(username);
}

// ---------- Ro'yxatdan o'tish (username + parol) ----------
router.post('/register', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username va parolni kiriting' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username 3-20 belgidan iborat, faqat harf/raqam/_ bo\'lishi mumkin' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
    }
    if (usernameTaken(username)) {
      return res.status(409).json({ error: 'Bu username band, boshqasini tanlang' });
    }

    const hash = bcrypt.hashSync(password.toLowerCase(), 10);
    const info = db.prepare(
      'INSERT INTO users (username, password, is_verified, balance, created_at) VALUES (?, ?, 1, 0, ?)'
    ).run(username, hash, Date.now());

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = signUserToken(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, user: { id: user.id, username: user.username, balance: user.balance } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server xatosi, keyinroq urinib ko\'ring' });
  }
});

// ---------- Login (username + parol) ----------
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get((username || '').trim());
  if (!user) return res.status(401).json({ error: 'Username yoki parol noto\'g\'ri' });
  if (!bcrypt.compareSync((password || '').toLowerCase(), user.password)) {
    return res.status(401).json({ error: 'Username yoki parol noto\'g\'ri' });
  }
  const token = signUserToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, user: { id: user.id, username: user.username, balance: user.balance } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Profil sozlamalari: username va parolni o'zgartirish ----------
router.put('/username', requireAuth, (req, res) => {
  const { username } = req.body;
  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username 3-20 belgidan iborat, faqat harf/raqam/_ bo\'lishi mumkin' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
  if (existing) return res.status(409).json({ error: 'Bu username band' });

  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.user.id);
  res.json({ success: true, username });
});

router.put('/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync((current_password || '').toLowerCase(), user.password)) {
    return res.status(401).json({ error: 'Joriy parol noto\'g\'ri' });
  }
  const hash = bcrypt.hashSync(new_password.toLowerCase(), 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
  res.json({ success: true });
});

// ---------- Ixtiyoriy email qo'shish (parol tiklash uchun, tasdiqlash kodisiz) ----------
router.put('/email', requireAuth, (req, res) => {
  const { email } = req.body;
  const trimmed = (email || '').trim().toLowerCase();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!trimmed) {
    // Bo'sh yuborilsa - emailni o'chirib qo'yamiz
    db.prepare('UPDATE users SET email = NULL WHERE id = ?').run(req.user.id);
    return res.json({ success: true, email: null });
  }

  if (!EMAIL_RE.test(trimmed)) {
    return res.status(400).json({ error: 'Email manzil noto\'g\'ri' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(trimmed, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'Bu email boshqa hisobga bog\'langan' });
  }

  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(trimmed, req.user.id);
  res.json({ success: true, email: trimmed });
});

module.exports = router;
