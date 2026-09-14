const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SECRET = process.env.JWT_SECRET || 'dev_secret_please_change';

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Tizimga kirilmagan' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, username, email, is_verified, balance FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token yaroqsiz yoki muddati tugagan' });
  }
}

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'Admin sifatida kirilmagan' });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    req.admin = true;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Admin token yaroqsiz yoki muddati tugagan' });
  }
}

function signUserToken(user) {
  return jwt.sign({ id: user.id }, SECRET, { expiresIn: '30d' });
}

function signAdminToken() {
  return jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '12h' });
}

module.exports = { requireAuth, requireAdmin, signUserToken, signAdminToken, SECRET };
