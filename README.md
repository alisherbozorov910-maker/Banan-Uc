# PUBG UC Shop 🎮

PUBG Mobile uchun UC sotadigan to'liq veb-sayt. Node.js + Express + SQLite (backend) va oddiy HTML/CSS/JS (frontend) asosida qurilgan.

## ✨ Imkoniyatlar

- 🔐 **Ro'yxatdan o'tish + Email tasdiqlash** — foydalanuvchi ro'yxatdan o'tganda emailiga 6 xonali kod yuboriladi
- 🛒 **UC do'koni** — paketlarni tanlab, PUBG ID kiritib sotib olish
- 💳 **Hisob to'ldirish** — foydalanuvchi istalgan tizimdan (Payme, Click, Payeer va h.k.) admin ko'rsatgan kartaga pul o'tkazadi, chek rasmini yuklaydi, admin tasdiqlagach balans qo'shiladi
- 🛠️ **Admin panel** (parol bilan himoyalangan):
  - UC paketlari va narxlarini boshqarish (qo'shish/tahrirlash/o'chirish)
  - Buyurtmalarni ko'rish va UC yetkazib berishni tasdiqlash/rad etish
  - Chek/to'ldirish so'rovlarini tasdiqlash/rad etish
  - Foydalanuvchilar ro'yxati va balansini qo'lda o'zgartirish
  - **Karta raqami va egasini o'zgartirish** (sizning so'rovingiz bo'yicha)
  - Foydalanuvchilar bilan yozishish (yordam bo'limi)
- 💬 **Yordam bo'limi** — foydalanuvchi va admin real vaqt rejimiga yaqin chat orqali yozishadi
- 🌐 **UZ/RU til almashtirish**
- 🌌 **Animatsiyali kosmik fon** — yulduzlar, tumanlik va uchayotgan yulduzlar effekti

## 📁 Loyiha tuzilishi

```
pubg-uc-shop/
├── server.js              # Asosiy server fayli
├── config/db.js           # SQLite ma'lumotlar bazasi va jadval sxemasi
├── middleware/auth.js     # JWT autentifikatsiya (user va admin)
├── routes/                # API yo'nalishlari
│   ├── auth.js             # ro'yxatdan o'tish, login, email tasdiqlash
│   ├── shop.js             # paketlar va buyurtmalar
│   ├── topup.js            # hisob to'ldirish (chek yuklash)
│   ├── support.js          # foydalanuvchi yordam xabarlari
│   └── admin.js            # admin panel API
├── utils/
│   ├── mailer.js           # email yuborish (nodemailer)
│   └── upload.js           # chek rasmlarini yuklash (multer)
└── public/                 # Frontend (HTML/CSS/JS)
    ├── index.html           # Bosh sahifa / do'kon
    ├── login.html, register.html, verify.html
    ├── profile.html         # balans, hisob to'ldirish, tarix
    ├── support.html         # yordam chat
    ├── admin.html + js/admin.js
    ├── css/style.css        # dizayn
    └── js/space-background.js, i18n.js, common.js, lang/{uz,ru}.json
```

## 🚀 O'rnatish (o'z kompyuteringizda)

1. **Node.js o'rnating** (agar yo'q bo'lsa): https://nodejs.org (18+ versiya)

2. Loyiha papkasiga kiring va paketlarni o'rnating:
   ```bash
   cd pubg-uc-shop
   npm install
   ```

3. `.env.example` faylidan nusxa oling va sozlang:
   ```bash
   cp .env.example .env
   ```
   `.env` faylini oching va quyidagilarni to'ldiring:
   - `ADMIN_PASSWORD` — admin panelga kirish paroli (standart: `alisherbek2013`, xohlasangiz o'zgartiring)
   - `JWT_SECRET` — istalgan uzun tasodifiy matn
   - `SMTP_USER`, `SMTP_PASS` — email yuborish uchun (pastda tushuntirilgan)

4. Serverni ishga tushiring:
   ```bash
   npm start
   ```

5. Brauzerda oching: **http://localhost:3000**

   Admin panel: **http://localhost:3000/admin.html** (parol: `.env` dagi `ADMIN_PASSWORD`)

## 📧 Email yuborishni sozlash (tasdiqlash kodlari uchun)

Gmail orqali eng oson yo'l:
1. Google hisobingizda 2 bosqichli tasdiqlashni yoqing
2. https://myaccount.google.com/apppasswords orqali "App Password" yarating
3. `.env` faylida:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=sizning_emailingiz@gmail.com
   SMTP_PASS=yaratilgan_app_parol
   ```

⚠️ **Agar SMTP sozlanmagan bo'lsa** — tizim ishlashda davom etadi, lekin tasdiqlash kodi emailga emas, server konsoliga (terminalga) chiqadi. Bu — ishlab chiqish (development) uchun qulay, lekin **haqiqiy saytda albatta SMTP sozlang**.

## 🔗 GitHub'ga yuklash

```bash
cd pubg-uc-shop
git init
git add .
git commit -m "PUBG UC Shop - boshlang'ich versiya"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPO_NOMI.git
git push -u origin main
```

`.env` fayli va `node_modules/` `.gitignore` orqali GitHub'ga yuklanmaydi — bu to'g'ri, chunki ular maxfiy va og'ir fayllar.

## 🌍 Internetga chiqarish (deploy)

Bepul/arzon variantlar:
- **Render.com** — Node.js loyihalar uchun bepul tarif bor
- **Railway.app**
- **VPS (masalan Timeweb, Hetzner)** — to'liq nazorat uchun, `pm2` yoki `systemd` bilan ishga tushirasiz

Deploy qilishda muhit o'zgaruvchilarini (`.env` dagi qiymatlarni) hosting panelida "Environment Variables" bo'limiga kiritishni unutmang.

## 🔒 Xavfsizlik bo'yicha muhim eslatmalar

- `ADMIN_PASSWORD` va `JWT_SECRET`ni **albatta o'zgartiring**, standart qiymatlarni ishlatmang (ayniqsa production'da)
- Saytni **HTTPS** orqali ishga tushiring (Render/Railway avtomatik beradi)
- `uploads/receipts/` papkasidagi chek rasmlari hozircha ochiq static papkadan beriladi — juda yuqori xavfsizlik talab qilinsa, buni faqat adminga ko'rinadigan qilib qayta ishlash mumkin
- Balansni qo'lda tasdiqlash (chek orqali) inson omiliga bog'liq — soxta cheklardan ehtiyot bo'lish adminning vazifasi

## 🛠️ Keyingi qadamlar / Takomillashtirish g'oyalari

- Payme/Click/Uzcard API bilan **avtomatik** to'lov integratsiyasi (hozir qo'lda chek tasdiqlash)
- SMS orqali tasdiqlash (email'ga qo'shimcha)
- Buyurtma statusi o'zgarganda foydalanuvchiga email/Telegram xabarnoma
- Referal/bonus tizimi
- Statistika va grafiklar (kunlik sotuvlar, daromad)

Loyihani yana takomillashtirish kerak bo'lsa — shunchaki qaysi qismini kengaytirish kerakligini ayting, davom ettiramiz! 🚀
