require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const topupRoutes = require('./routes/topup');
const supportRoutes = require('./routes/support');
const adminRoutes = require('./routes/admin');
const globalChatRoutes = require('./routes/globalchat');

const app = express();

// Render/Cloudflare kabi proxy orqasida to'g'ri IP aniqlash uchun
app.set('trust proxy', 1);

// ---------- Xavfsizlik middleware'lari ----------
app.use(helmet({
  contentSecurityPolicy: false, // inline skriptlar ishlatilgani uchun o'chirilgan
  crossOriginEmbedderPolicy: false
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Umumiy API so'rovlarini cheklash (DDoS/brute-force'ga qarshi)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Juda ko\'p so\'rov yuborildi, biroz kuting.' }
});
app.use('/api', generalLimiter);

// Login/register/admin-login uchun qattiqroq cheklash (parol taxmin qilishga qarshi)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Juda ko\'p urinish. 15 daqiqadan so\'ng qaytadan urinib ko\'ring.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/login', authLimiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api', shopRoutes);
app.use('/api', topupRoutes);
app.use('/api', supportRoutes);
app.use('/api', globalChatRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server xatosi' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: http://localhost:${PORT}`);
});
