const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'database.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 1,
  verify_code TEXT,
  verify_expires INTEGER,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  uc_amount INTEGER NOT NULL,
  price INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  package_id INTEGER,
  package_title TEXT NOT NULL,
  uc_amount INTEGER NOT NULL,
  price INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | delivered | rejected
  admin_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS topups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  receipt_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sender TEXT NOT NULL, -- 'user' | 'admin'
  text TEXT NOT NULL,
  read_by_admin INTEGER NOT NULL DEFAULT 0,
  read_by_user INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS global_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS music_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// Default settings seed
const defaultSettings = {
  card_number: '0000 0000 0000 0000',
  card_owner: "F.I.Sh kiritilmagan"
};
const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  if (!getSetting.get(key)) insertSetting.run(key, value);
}

// Seed a couple of demo UC packages if none exist
const pkgCount = db.prepare('SELECT COUNT(*) AS c FROM packages').get().c;
if (pkgCount === 0) {
  const insertPkg = db.prepare(
    'INSERT INTO packages (title, uc_amount, price, is_active, sort_order) VALUES (?, ?, ?, 1, ?)'
  );
  insertPkg.run('60 UC', 60, 15000, 1);
  insertPkg.run('325 UC', 325, 70000, 2);
  insertPkg.run('660 UC', 660, 140000, 3);
  insertPkg.run('1800 UC', 1800, 370000, 4);
  insertPkg.run('3850 UC', 3850, 780000, 5);
  insertPkg.run('8100 UC', 8100, 1600000, 6);
}

module.exports = db;
