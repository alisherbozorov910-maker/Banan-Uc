const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const musicDir = path.join(__dirname, '..', 'uploads', 'music');
if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, musicDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Faqat audio fayllari (mp3, wav, ogg) qabul qilinadi'));
}

const uploadMusic = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

module.exports = uploadMusic;
