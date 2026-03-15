// ═══════════════════════════════════════════
//  PUBLIC BOOKING PAGE — app.js
// ═══════════════════════════════════════════

const App = (() => {
  // ── STATE ──────────────────────────────
  let state = {
    year:  new Date().getFullYear(),
    month: new Date().getMonth(),
    selectedDate: null,
    selectedHour: null,
    step: "calendar",  // calendar | time | form | success
  };

  // ── INIT ──────────────────────────────
  function init() {
    renderHostInfo();
    renderCalendar();
    bindNav();
  }

  // ── HOST INFO ──────────────────────────
  function renderHostInfo() {
    const el = document.getElementById("host-initials");
    if (el) el.textContent = CONFIG.ownerInitials;
    setText("host-name", CONFIG.ownerName);
    setText("host-role", CONFIG.ownerRole);
    setText("meeting-title", CONFIG.meetingTitle);
    setText("meeting-duration", `${CONFIG.meetingDuration} min · Google Meet`);
    setText("page-title", `Umów spotkanie z ${CONFIG.ownerName}`);
  }

  // ── CALENDAR ──────────────────────────
  function renderCalendar() {
    const grid = document.getElementById("cal-grid");
    if (!grid) return;

    const monthLabel = document.getElementById("cal-month-label");
    const months = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
                    "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
    if (monthLabel) monthLabel.textContent = `${months[state.month]} ${state.year}`;

    const todayStr = Helpers.today();
    const maxDate  = new Date();
    maxDate.setDate(maxDate.getDate() + CONFIG.bookingWindowDays);
    const maxStr = Helpers.dateToStr(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());

    const firstDay = new Date(state.year, state.month, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();

    // Day names row
    const dayNames = ["Pn","Wt","Śr","Cz","Pt","So","Nd"];
    let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join("");

    // Empty cells
    for (let i = 0; i < offset; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr  = Helpers.dateToStr(state.year, state.month, d);
      const isToday  = dateStr === todayStr;
      const isPast   = dateStr < todayStr;
      const isFuture = dateStr > maxStr;
      const isWeekend = (() => {
        const dow = new Date(dateStr + "T12:00:00").getDay();
        return dow === 0 || dow === 6;
      })();
      const hasEvents = Storage.getEventsForDay(dateStr).length > 0;
      const isSelected = dateStr === state.selectedDate;

      let cls = "cal-day";
      if (isPast || isFuture || isWeekend) cls += " past";
      if (isToday)    cls += " today";
      if (isSelected) cls += " selected";
      if (hasEvents)  cls += " has-events";

      const click = (!isPast && !isFuture && !isWeekend)
        ? `onclick="App.selectDate('${dateStr}')"`
        : "";
      html += `<div class="${cls}" ${click}>${d}</div>`;
    }

    grid.innerHTML = html;
  }

  // ── SELECT DATE ──────────────────────────
  function selectDate(dateStr) {
    state.selectedDate = dateStr;
    state.selectedHour = null;
    state.step = "time";
    renderCalendar();
    renderTimeSlots();
    showStep("time");
  }

  // ── TIME SLOTS ──────────────────────────
  function renderTimeSlots() {
    const container = document.getElementById("slots-container");
    if (!container) return;

    const dateLabel = document.getElementById("slots-date-label");
    if (dateLabel) dateLabel.textContent = Helpers.formatDate(state.selectedDate);

    let html = '<div class="slots-list">';
    CONFIG.workHours.forEach(hour => {
      const taken = Storage.isSlotTaken(state.selectedDate, hour)
                 || Helpers.isHourPast(state.selectedDate, hour);
      if (taken) {
        html += `
          <div class="slot-row">
            <span class="slot-time">${hour}</span>
            <button class="slot-btn taken" disabled>Zajęte</button>
          </div>`;
      } else {
        html += `
          <div class="slot-row">
            <span class="slot-time">${hour}</span>
            <button class="slot-btn free ${state.selectedHour === hour ? "selected" : ""}"
              onclick="App.selectHour('${hour}')">
              <span>${CONFIG.meetingDuration} min · Google Meet</span>
              <span class="slot-arrow">→</span>
            </button>
          </div>`;
      }
    });
    html += "</div>";
    container.innerHTML = html;
  }

  // ── SELECT HOUR ──────────────────────────
  function selectHour(hour) {
    state.selectedHour = hour;
    state.step = "form";
    renderForm();
    showStep("form");
  }

  // ── BOOKING FORM ──────────────────────────
  function renderForm() {
    const summary = document.getElementById("form-summary");
    if (summary) {
      summary.innerHTML = `
        <div class="flex gap-3 items-center" style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:var(--radius);padding:12px 14px;margin-bottom:20px">
          <div style="font-size:22px">📅</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text)">${Helpers.formatDate(state.selectedDate)}</div>
            <div style="font-size:13px;color:var(--text-2)">${state.selectedHour} · ${CONFIG.meetingDuration} min · Google Meet</div>
          </div>
        </div>`;
    }
  }

  // ── SUBMIT BOOKING ──────────────────────────
  async function submitBooking(e) {
    if (e) e.preventDefault();

    const fields = {
      firstName: document.getElementById("f-firstname"),
      lastName:  document.getElementById("f-lastname"),
      email:     document.getElementById("f-email"),
      phone:     document.getElementById("f-phone"),
      note:      document.getElementById("f-note"),
    };

    // Validate
    let valid = true;
    clearErrors();

    if (!fields.firstName.value.trim()) { showError("err-firstname", "Podaj imię"); valid = false; }
    if (!fields.lastName.value.trim())  { showError("err-lastname",  "Podaj nazwisko"); valid = false; }
    if (!Helpers.isEmail(fields.email.value)) { showError("err-email", "Podaj poprawny email"); valid = false; }
    if (fields.phone.value && !Helpers.isPhone(fields.phone.value)) {
      showError("err-phone", "Niepoprawny numer telefonu"); valid = false;
    }
    if (!valid) return;

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Wysyłam…"; }

    const booking = {
      date:      state.selectedDate,
      hour:      state.selectedHour,
      firstName: fields.firstName.value.trim(),
      lastName:  fields.lastName.value.trim(),
      email:     fields.email.value.trim(),
      phone:     fields.phone.value.trim(),
      note:      fields.note.value.trim(),
    };

    // Save locally
    const saved = Storage.addBooking(booking);

    // Send to n8n
    const n8nResult = await N8N.newBooking(saved);
    if (!n8nResult.ok && !n8nResult.mock) {
      Helpers.toast("Wystąpił błąd przy wysyłaniu — skontaktuj się bezpośrednio", "error");
    }

    // Show success
    state.step = "success";
    renderSuccess(booking);
    showStep("success");
  }

  // ── SUCCESS ──────────────────────────────
  function renderSuccess(booking) {
    const el = document.getElementById("success-details");
    if (!el) return;
    el.innerHTML = `
      <p style="font-size:15px;color:var(--text-2)">
        <strong>${booking.firstName} ${booking.lastName}</strong>, potwierdzenie wysłano na<br>
        <strong>${booking.email}</strong>
      </p>
      <div style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:var(--radius);padding:14px 16px;margin:16px 0;text-align:left">
        <div style="font-size:14px;font-weight:600;margin-bottom:4px">${CONFIG.meetingTitle}</div>
        <div style="font-size:13px;color:var(--text-2)">${Helpers.formatDate(booking.date)} · ${booking.hour} · ${CONFIG.meetingDuration} min</div>
        <div style="font-size:13px;color:var(--blue);margin-top:4px">📹 Link do Google Meet zostanie wysłany na Twój email</div>
      </div>`;
  }

  // ── STEP NAVIGATION ──────────────────────────
  function showStep(step) {
    ["calendar-section","time-section","form-section","success-section"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    const map = {
      calendar: "calendar-section",
      time:     "time-section",
      form:     "form-section",
      success:  "success-section",
    };
    const target = document.getElementById(map[step]);
    if (target) target.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (state.step === "time") {
      state.step = "calendar";
      showStep("calendar");
    } else if (state.step === "form") {
      state.step = "time";
      renderTimeSlots();
      showStep("time");
    }
  }

  // ── CALENDAR NAV ──────────────────────────
  function bindNav() {
    const prev = document.getElementById("cal-prev");
    const next = document.getElementById("cal-next");
    if (prev) prev.onclick = () => {
      state.month--;
      if (state.month < 0) { state.month = 11; state.year--; }
      renderCalendar();
    };
    if (next) next.onclick = () => {
      state.month++;
      if (state.month > 11) { state.month = 0; state.year++; }
      renderCalendar();
    };
  }

  // ── UTILS ──────────────────────────────
  function setText(id, val) {
    const el = document.getElementById(id); if (el) el.textContent = val;
  }
  function showError(id, msg) {
    const el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
  function clearErrors() {
    document.querySelectorAll(".form-error").forEach(e => { e.textContent = ""; e.classList.add("hidden"); });
  }

  // Public API
  return { init, selectDate, selectHour, submitBooking, goBack };
})();

document.addEventListener("DOMContentLoaded", App.init);
