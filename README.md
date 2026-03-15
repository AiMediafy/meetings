# MeetBook — Scheduler App

Własna aplikacja do umawiania spotkań, zbudowana jak Calendly.
Hosted na GitHub Pages / Vercel + własna domena.

---

## Struktura plików

```
/
├── index.html      ← strona główna (landing page)
├── book.html       ← widok publiczny — klient umawia spotkanie
├── admin.html      ← panel administratora (Ty)
├── css/
│   └── style.css   ← cały design
├── js/
│   ├── data.js     ← konfiguracja + logika danych + n8n
│   ├── app.js      ← logika strony book.html
│   └── admin.js    ← logika panelu admin.html
└── README.md
```

---

## Krok 1 — Konfiguracja (WAŻNE — zrób to przed deployem!)

Otwórz `js/data.js` i uzupełnij sekcję CONFIG:

```js
const CONFIG = {
  ownerName:  "Jan Kowalski",          // Twoje imię
  ownerRole:  "CEO @ TwojaFirma",
  ownerEmail: "jan@twojafirma.pl",
  ownerInitials: "JK",

  meetingTitle:    "Konsultacja 1:1",
  meetingDuration: 45,                 // minuty

  n8nWebhookUrl: "https://TWOJ-N8N...",  // wypełnij po skonfigurowaniu n8n

  adminPassword: "TWOJE-HASLO",          // zmień koniecznie!

  workHours: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
  bookingWindowDays: 30,
};
```

---

## Krok 2 — Deploy na GitHub + Vercel

### 2a) GitHub

1. Wejdź na https://github.com/new
2. Utwórz nowe repo, np. `meetbook`
3. Wrzuć wszystkie pliki:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TWOJ-LOGIN/meetbook.git
git push -u origin main
```

### 2b) Vercel (darmowy hosting)

1. Wejdź na https://vercel.com → Sign up (zaloguj przez GitHub)
2. Kliknij "Add New Project" → wybierz swoje repo `meetbook`
3. Kliknij Deploy — za chwilę masz link `https://meetbook.vercel.app`

### 2c) Własna domena (za ~2 zł/rok)

Dobry rejestr domen po polsku: https://www.domeny.tv lub https://aftermarket.pl

1. Kup domenę, np. `jankowalski.pl`
2. W Vercel: Settings → Domains → Add domain → wpisz `jankowalski.pl`
3. Vercel pokaże Ci dwa rekordy DNS do dodania w panelu rejestratora domeny
4. Po ~5 minutach działa!

---

## Krok 3 — n8n Workflow (zrobimy razem później)

Gdy będziesz gotowy, workflow w n8n będzie obsługiwał:

- ✅ Email powiadomienie do Ciebie (nowa rezerwacja)
- ✅ Email z podziękowaniem do klienta + link Google Meet
- ✅ Zapis do Google Calendar (event + Google Meet)
- ✅ Zapis do Google Sheets (baza danych rezerwacji)
- ✅ Zapis do Notion (opcjonalnie)

**Trigger:** Webhook POST na endpoint n8n
**Payload który wysyła aplikacja:**
```json
{
  "event": "new_booking",
  "date": "2025-03-20",
  "hour": "14:00",
  "firstName": "Jan",
  "lastName": "Kowalski",
  "email": "jan@email.com",
  "phone": "+48 500 000 000",
  "note": "Chcę porozmawiać o...",
  "meetingTitle": "Konsultacja 1:1",
  "meetingDuration": 45,
  "ownerName": "Twoje imię",
  "ownerEmail": "twoj@email.com",
  "createdAt": "2025-03-15T10:23:00.000Z"
}
```

---

## Krok 4 — Link do udostępnienia

Po deployu wyślij klientom link do: `https://twoja-domena.pl/book.html`

---

## Panel admina

Dostępny pod: `https://twoja-domena.pl/admin.html`

- Zaloguj się hasłem z CONFIG
- Dodawaj blokady (fikcyjne spotkania) — klienci widzą je jako "Zajęte"
- Przeglądaj prawdziwe rezerwacje
- Zielone = prawdziwe | Czerwone = blokady (tylko Ty widzisz różnicę)

---

## FAQ

**Czy klienci widzą czy slot jest fikcyjny?**
Nie. W widoku publicznym wszystkie zajęte sloty wyglądają tak samo — "Zajęte".

**Gdzie są przechowywane dane?**
Na razie w `localStorage` przeglądarki admina. Docelowo połączymy z Google Sheets przez n8n.

**Jak zmienić nazwę aplikacji?**
Znajdź "MeetBook" w plikach HTML i zamień na swoją markę.
