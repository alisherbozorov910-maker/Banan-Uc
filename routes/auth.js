const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const { signUserToken, requireAuth, SECRET } = require('../middleware/auth');

const router = express.Router();
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function usernameTaken(username) {
  return !!db.prepare('SELECT id FROM users WHERE username = ?').get(username);
}

function makeUniqueUsername(base) {
  let candidate = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'user';
  if (!usernameTaken(candidate)) return candidate;
  for (let i = 0; i < 50; i++) {
    const attempt = candidate + Math.floor(Math.random() * 10000);
    if (!usernameTaken(attempt)) return attempt;
  }
  return candidate + Date.now();
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

    const hash = bcrypt.hashSync(password, 10);
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
  if (!bcrypt.compareSync(password || '', user.password)) {
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
  if (!bcrypt.compareSync(current_password || '', user.password)) {
    return res.status(401).json({ error: 'Joriy parol noto\'g\'ri' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
  res.json({ success: true });
});

// ---------- Google orqali kirish / ro'yxatdan o'tish ----------
router.post('/google', async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(500).json({ error: 'Google kirish serverda sozlanmagan (GOOGLE_CLIENT_ID yo\'q)' });
    }
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google ma\'lumoti kelmadi' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Google hisobidan email olinmadi' });
    }
    if (!payload.email_verified) {
      return res.status(400).json({ error: 'Google email manzili tasdiqlanmagan' });
    }

    const email = payload.email.toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (user) {
      // Mavjud foydalanuvchi - to'g'ridan-to'g'ri kirgizamiz
      const token = signUserToken(user);
      res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.json({ success: true, user: { id: user.id, username: user.username, balance: user.balance } });
    }

    // Yangi foydalanuvchi - avval username so'raymiz
    const googleToken = jwt.sign({ email, purpose: 'google_signup' }, SECRET, { expiresIn: '10m' });
    res.json({ needsUsername: true, googleToken, suggestedUsername: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) });
  } catch (e) {
    console.error('Google login xatosi:', e);
    res.status(401).json({ error: 'Google orqali kirishda xatolik yuz berdi' });
  }
});

// ---------- Google orqali ro'yxatdan o'tishni username bilan yakunlash ----------
router.post('/google-complete', (req, res) => {
  try {
    const { googleToken, username } = req.body;
    if (!googleToken) return res.status(400).json({ error: 'Google ma\'lumoti topilmadi, qaytadan urining' });
    if (!username || !USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username 3-20 belgidan iborat, faqat harf/raqam/_ bo\'lishi mumkin' });
    }

    let decoded;
    try {
      decoded = jwt.verify(googleToken, SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Vaqt tugagan, qaytadan Google orqali urining' });
    }
    if (decoded.purpose !== 'google_signup' || !decoded.email) {
      return res.status(400).json({ error: 'Noto\'g\'ri so\'rov' });
    }

    const existingByEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(decoded.email);
    if (existingByEmail) {
      const token = signUserToken(existingByEmail);
      res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.json({ success: true, user: { id: existingByEmail.id, username: existingByEmail.username, balance: existingByEmail.balance } });
    }

    if (usernameTaken(username)) {
      return res.status(409).json({ error: 'Bu username band, boshqasini tanlang' });
    }

    const randomPassword = crypto.randomBytes(24).toString('hex');
    const hash = bcrypt.hashSync(randomPassword, 10);
    const info = db.prepare(
      'INSERT INTO users (username, email, password, is_verified, balance, created_at) VALUES (?, ?, ?, 1, 0, ?)'
    ).run(username, decoded.email, hash, Date.now());
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

    const token = signUserToken(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, user: { id: user.id, username: user.username, balance: user.balance } });
  } catch (e) {
    console.error('Google-complete xatosi:', e);
    res.status(500).json({ error: 'Server xatosi, keyinroq urinib ko\'ring' });
  }
});

router.get('/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

module.exports = router;
