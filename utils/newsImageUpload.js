const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const newsDir = path.join(__dirname, '..', 'uploads', 'news');
if (!fs.existsSync(newsDir)) fs.mkdirSync(newsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, newsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Faqat rasm fayllari (jpg, png, webp, gif) qabul qilinadi'));
}

const uploadNewsImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});

module.exports = uploadNewsImage;
