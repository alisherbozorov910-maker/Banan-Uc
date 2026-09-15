// Global chatdagi so'kinish so'zlarini aniqlash uchun oddiy filtr.
// Ro'yxatni xohlagancha to'ldirishingiz mumkin - har bir so'z kichik harfda yoziladi.
const BLOCKED_WORDS = [
  'blyad', 'blya', 'suka', 'pidor', 'huy', 'xуй', 'ebat', 'eban',
  'jalab', 'kot', 'aqmoq', 'gandon', 'мразь', 'сука', 'блять'
];

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-zа-яёʼ'0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsProfanity(text) {
  const norm = normalize(text);
  return BLOCKED_WORDS.some(word => norm.includes(word));
}

function censor(text) {
  let result = text;
  for (const word of BLOCKED_WORDS) {
    const re = new RegExp(word, 'gi');
    result = result.replace(re, '*'.repeat(word.length));
  }
  return result;
}

module.exports = { containsProfanity, censor };
