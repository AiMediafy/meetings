// ═══════════════════════════════════════════
//  CONFIG — edytuj tylko tutaj
// ═══════════════════════════════════════════

const CONFIG = {
  // ── TWOJE DANE ──────────────────────────
  ownerName:  "Twoje Imię",          // zmień na swoje imię
  ownerRole:  "Twoja rola / firma",  // np. "CEO @ MediafySpartaAI"
  ownerEmail: "twoj@email.com",      // twój email
  ownerInitials: "TI",               // inicjały do avatara

  // ── OPIS SPOTKANIA ───────────────────────
  meetingTitle:    "Konsultacja 1:1",
  meetingDuration: 45,               // minut
  meetingDesc:     "Porozmawiajmy o Twoich potrzebach. Spotkanie online przez Google Meet.",

  // ── N8N WEBHOOK ──────────────────────────
  // Wklej tutaj URL webhooka z n8n po jego skonfigurowaniu
  n8nWebhookUrl: "https://TWOJ-N8N.app.n8n.cloud/webhook/TWOJ-WEBHOOK-ID",

  // ── HASŁO ADMINA ─────────────────────────
  // To jest hasło tymczasowe — docelowo użyj lepszego auth
  adminPassword: "zmien-to-haslo-2024",

  // ── GODZINY PRACY ────────────────────────
  workHours: [
    "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00",
    "16:00", "17:00", "18:00"
  ],

  // ── DOMYŚLNA LICZBA DNI DO PRZODU ────────
  bookingWindowDays: 30,  // ile dni do przodu można zarezerwować
};

// ═══════════════════════════════════════════
//  STORAGE — zarządzanie danymi (localStorage)
//  Docelowo zastąp przez Google Sheets API
// ═══════════════════════════════════════════

const Storage = {
  EVENTS_KEY: "scheduler_events",
  BOOKINGS_KEY: "scheduler_bookings",

  getEvents() {
    try { return JSON.parse(localStorage.getItem(this.EVENTS_KEY) || "[]"); }
    catch { return []; }
  },

  saveEvents(events) {
    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
  },

  getBookings() {
    try { return JSON.parse(localStorage.getItem(this.BOOKINGS_KEY) || "[]"); }
    catch { return []; }
  },

  saveBookings(bookings) {
    localStorage.setItem(this.BOOKINGS_KEY, JSON.stringify(bookings));
  },

  // Dodaj nowe zdarzenie (fake lub real z admina)
  addEvent(ev) {
    const events = this.getEvents();
    events.push({ ...ev, id: Date.now() + Math.random() });
    this.saveEvents(events);
  },

  // Usuń zdarzenie po id
  removeEvent(id) {
    const events = this.getEvents().filter(e => e.id !== id);
    this.saveEvents(events);
  },

  // Pobierz eventy dla konkretnego dnia (format: YYYY-MM-DD)
  getEventsForDay(dateStr) {
    return this.getEvents().filter(e => e.date === dateStr);
  },

  // Czy dany slot jest zajęty?
  isSlotTaken(dateStr, hour) {
    return this.getEvents().some(e => e.date === dateStr && e.hour === hour);
  },

  // Zapisz nową rezerwację od klienta
  addBooking(booking) {
    const bookings = this.getBookings();
    const newBooking = {
      ...booking,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: "confirmed"
    };
    bookings.push(newBooking);
    this.saveBookings(bookings);

    // Automatycznie dodaj jako real event
    this.addEvent({
      date: booking.date,
      hour: booking.hour,
      type: "real",
      title: `${booking.firstName} ${booking.lastName}`,
      email: booking.email,
      phone: booking.phone,
      note:  booking.note,
      bookingId: newBooking.id,
    });

    return newBooking;
  },
};

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════

const Helpers = {
  // Format daty do wyświetlania
  formatDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  },

  formatDateShort(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  },

  // Generuj string daty YYYY-MM-DD
  dateToStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  },

  // Dzisiaj jako string
  today() {
    const d = new Date();
    return this.dateToStr(d.getFullYear(), d.getMonth(), d.getDate());
  },

  // Czy data jest w przeszłości?
  isPast(dateStr) {
    return dateStr < this.today();
  },

  // Czy slot jest dzisiaj i już minął?
  isHourPast(dateStr, hour) {
    if (dateStr > this.today()) return false;
    if (dateStr < this.today()) return true;
    const now = new Date();
    const [h] = hour.split(":").map(Number);
    return now.getHours() >= h;
  },

  // Inicjały z imienia i nazwiska
  initials(firstName, lastName) {
    return `${(firstName || "?")[0]}${(lastName || "?")[0]}`.toUpperCase();
  },

  // Toast
  toast(msg, type = "default", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  },

  // Walidacja email
  isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); },

  // Walidacja telefonu (luźna)
  isPhone(v) { return v.replace(/[\s\-\+\(\)]/g, "").length >= 7; },
};

// ═══════════════════════════════════════════
//  N8N — wysyłanie danych do webhooka
// ═══════════════════════════════════════════

const N8N = {
  async send(payload) {
    if (!CONFIG.n8nWebhookUrl || CONFIG.n8nWebhookUrl.includes("TWOJ")) {
      console.warn("N8N webhook nie skonfigurowany — dane nie zostaną wysłane");
      return { ok: false, mock: true };
    }
    try {
      const res = await fetch(CONFIG.n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: res.ok };
    } catch (err) {
      console.error("N8N error:", err);
      return { ok: false, error: err.message };
    }
  },

  async newBooking(booking) {
    return this.send({
      event: "new_booking",
      ...booking,
      meetingTitle: CONFIG.meetingTitle,
      meetingDuration: CONFIG.meetingDuration,
      ownerName: CONFIG.ownerName,
      ownerEmail: CONFIG.ownerEmail,
    });
  },
};
