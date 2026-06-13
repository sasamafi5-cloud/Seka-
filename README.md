# 🌙 Luna - Premium AI Sekretarica PWA

Kompletna PWA aplikacija sa offline AI podrškom, glasovnim komandama i naprednim organizacijskim alatima.

## ✨ Šta sve radi

### 🤖 AI Sistem
- **Online režim** - Groq API (llama-3.3-70b-versatile) za naprednije razgovore
- **Offline režim** - Lokalna obrada osnovnih komandi bez interneta
- **Auto-prebacivanje** - Bez ručnog uključivanja, detektuje konekciju
- **5 ličnosti**: Pametna, Šaljiva, Sveznalica, Poslovna, Prijateljska
- **Glasovne komande** - "Beleška kupi hleb", "Alarm 8:00", "Podsetnik sastanak 14:00"...

### 📋 Funkcije
- 📝 **Beleške** - sa datumom/vremenom (postaju podsetnici)
- ⏰ **Alarmi** - sa glasovnom najavom i odlaganjem
- ✅ **Zadaci** - sa 4 prioriteta (nizak, normalan, visok, hitno)
- 📅 **Kalendar/Planer** - sa mesečnim prikazom
- 🔍 **Globalna pretraga** - kroz sve podatke
- 💬 **Chat** - sa istorijom razgovora

### 🎨 Premium Dizajn
- **Dark/Light/AMOLED** teme + auto-detekcija sistemske
- **Talasasti prelaz** između tamnog i svetlog dela (kao na referentnoj slici)
- **3D Neumorphism** sa prilagodljivim senkama
- **Glassmorphism** efekti
- **10+ 3D dizajn podešavanja** u realnom vremenu
- **60 FPS animacije**

### 📦 PWA & Offline
- **IndexedDB** offline-first skladištenje
- **Service Worker** za offline rad
- **Push notifikacije** (za alarme i podsetnike)
- **Auto-backup** sa export/import (JSON)
- **Install to home screen** na mobilnom

### 🎤 Glasovni Sistem
- **STT** (Speech-to-Text) - Web Speech API
- **TTS** (Text-to-Speech) - sa glasovnim pozdravom
- **Automatski pozdrav** pri pokretanju
- **Glasovne notifikacije** - čita alarme, podsetnike, zadatke
- **Centralni 3D mikrofon** sa animacijom slušanja/govora

### 📊 Status Panel
- Online/Offline režim
- Status Groq API
- Status mikrofona, zvučnika
- Status baze podataka
- Status sinhronizacije

## 🚀 Pokretanje

### Opcija 1: Direktno u browseru
1. Otvori `index.html` u modernom browseru (Chrome, Edge, Safari)
2. Ili pokreni lokalni server: `python3 -m http.server 8000`
3. Idi na `http://localhost:8000`

### Opcija 2: Instalacija na mobilni
1. Pokreni preko HTTPS (PWA zahteva sigurnu konekciju)
2. U Chrome/Safari → "Dodaj na početni ekran"
3. Luna će se instalirati kao nativna aplikacija

### Opcija 3: Deploy
- GitHub Pages
- Netlify
- Vercel
- Bilo koji statički hosting

## 🔑 Groq API Setup (Opciono ali preporučeno)

1. Idi na https://console.groq.com
2. Napravi besplatan nalog
3. Generiši API ključ
4. U aplikaciji → Podešavanja → AI Konfiguracija
5. Nalepi ključ i klikni "Test API Connection"
6. Luna će automatski koristiti Groq kad postoji internet

**Napomena**: API ključ se čuva LOKALNO u IndexedDB. Nikad se ne šalje na druge servere osim Groq-a.

## 🎤 Glasovne Komande (Primeri)

```
"Dobro jutro" → pozdrav
"Beleška kupi mleko" → kreira belešku
"Zadatak završi izveštaj" → kreira zadatak
"Alarm 8:30" → postavlja alarm
"Podsetnik sastanak 14:00" → kreira podsetnik
"Koliko je sati?" → govori vreme
"Vic" → ispriča vic
"Pomoć" → lista komandi
```

## 🛠️ Tehnologije

- **HTML5** + **CSS3** (Custom Properties, Animations, Backdrop Filter)
- **Vanilla JavaScript** (ES6+ Modules, Async/Await, Classes)
- **IndexedDB** za perzistentno skladištenje
- **Service Worker** za offline caching
- **Web Speech API** (STT + TTS)
- **Notifications API**
- **PWA Standard** (manifest.json, service worker)

## 📁 Struktura Projekta

```
luna-pwa/
├── index.html          # Glavna aplikacija (sve 7 sekcija)
├── styles.css          # Premium dizajn (3D neumorphism, glassmorphism)
├── app.js              # Glavna app logika (40KB)
├── ai.js               # AI sistem (Groq + offline fallback)
├── voice.js            # Glasovni sistem (STT + TTS)
├── db.js               # IndexedDB wrapper
├── sw.js               # Service Worker (offline cache)
├── manifest.json       # PWA manifest
├── icons/
│   ├── icon-192.png    # PWA ikona
│   └── icon-512.png    # PWA ikona
└── README.md
```

## 🎨 3D Dizajn Podešavanja

U Podešavanja → 3D Dizajn možeš prilagoditi:
- **Dubina 3D efekta** (0-30px)
- **Visina elemenata** (40-100px)
- **Širina** (80-100%)
- **Unutrašnje senke** (0-20px)
- **Spoljašnje senke** (0-40px)
- **Intenzitet senki** (0-100%)
- **Glow efekat** (0-50px)
- **Refleksija** (0-100%)
- **Radius elemenata** (0-40px)
- **Staklasti efekat** (0-50%)

Sve promene se vide u realnom vremenu i automatski čuvaju.

## 🔒 Privatnost

- **Svi podaci su lokalni** - IndexedDB u browseru
- **API ključevi se ne šalju** nigde osim Groq-u
- **Nema trackinga** - nema analytics, nema kolačića
- **Open source** - možeš proveriti svaki fajl

## 🌟 Teme

- 🌙 **Dark Mode** (default) - premium tamna sa neon glow
- ☀️ **Light Mode** - svetla sa mekim senkama
- ⚫ **AMOLED Mode** - pravo crna za OLED ekrane
- 🌓 **Auto** - prati sistemsku postavku

## 📱 Browser Podrška

- ✅ Chrome/Edge 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Samsung Internet 14+
- ✅ iOS Safari 14+ (PWA install podržan)

## 💝 Značajke

- Funkcionalan offline AI koji razume komande
- Auto-prebacivanje online/offline
- Glasovni pozdrav sa dnevnim pregledom obaveza
- Alarmi sa glasovnom najavom
- Podsetnici sa auto-čitanjem
- Real-time sinhronizacija
- 100% responsive dizajn za mobilni

---

Made with 🌙 by Luna Team
