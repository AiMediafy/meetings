// ═══════════════════════════════════════════
//  PUBLIC BOOKING PAGE — app.js
// ═══════════════════════════════════════════

const App = (() => {
  let state = {
    year:  new Date().getFullYear(),
    month: new Date().getMonth(),
    selectedDate: null,
    selectedHour: null,
    step: "calendar",
  };

  function init() {
    renderHostInfo();
    renderCalendar();
    bindNav();
  }

  function renderHostInfo() {
    const el = document.getElementById("host-initials");
    if (el) el.textContent = CONFIG.ownerInitials;
    setText("host-name", CONFIG.ownerName);
    setText("host-role", CONFIG.ownerRole);
    setText("meeting-title", CONFIG.meetingTitle);
    setText("meeting-duration", `${CONFIG.meetingDuration} min`);
    setText("page-title", `Umów spotkanie z ${CONFIG.ownerName}`);
  }

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

    const dayNames = ["Pn","Wt","Sr","Cz","Pt","So","Nd"];
    let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join("");

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

  function selectDate(dateStr) {
    state.selectedDate = dateStr;
    state.selectedHour = null;
    state.step = "time";
    renderCalendar();
    renderTimeSlots();
    showStep("time");
  }

  function renderTimeSlots() {
    const container = document.getElementById("slots-container");
    if (!container) return;

    const dateLabel = document.getElementById("slots-date-label");
    if (dateLabel) dateLabel.textContent = Helpers.formatDate(state.selectedDate);

    let html = '<div class="bc-slots">';
    CONFIG.workHours.forEach(function(hour) {
      const taken = Storage.isSlotTaken(state.selectedDate, hour)
                 || Helpers.isHourPast(state.selectedDate, hour);
      if (taken) {
        html += '<div class="bc-slot taken">'
              + '<span class="bc-slot-time">' + hour + '</span>'
              + '<span class="bc-slot-label">Zajete</span>'
              + '</div>';
      } else {
        html += '<div class="bc-slot" onclick="App.selectHour(\'' + hour + '\')">'
              + '<span class="bc-slot-time">' + hour + '</span>'
              + '<span class="bc-slot-label">' + CONFIG.meetingDuration + ' min &middot; Google Meet</span>'
              + '<span class="bc-slot-arrow">&rarr;</span>'
              + '</div>';
      }
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function selectHour(hour) {
    state.selectedHour = hour;
    state.step = "form";
    renderForm();
    showStep("form");
  }

  function renderForm() {
    const summary = document.getElementById("form-summary");
    if (summary) {
      summary.innerHTML = '<div style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">'
        + '<div style="font-size:20px">&#128197;</div>'
        + '<div>'
        + '<div style="font-size:14px;font-weight:600">' + Helpers.formatDate(state.selectedDate) + '</div>'
        + '<div style="font-size:13px;color:var(--text-2)">' + state.selectedHour + ' &middot; ' + CONFIG.meetingDuration + ' min &middot; Google Meet</div>'
        + '</div></div>';
    }
  }

  async function submitBooking(e) {
    if (e) e.preventDefault();

    const fields = {
      firstName: document.getElementById("f-firstname"),
      lastName:  document.getElementById("f-lastname"),
      email:     document.getElementById("f-email"),
      phone:     document.getElementById("f-phone"),
      note:      document.getElementById("f-note"),
    };

    let valid = true;
    clearErrors();

    if (!fields.firstName.value.trim()) { showError("err-firstname", "Podaj imie"); valid = false; }
    if (!fields.lastName.value.trim())  { showError("err-lastname",  "Podaj nazwisko"); valid = false; }
    if (!Helpers.isEmail(fields.email.value)) { showError("err-email", "Podaj poprawny email"); valid = false; }
    if (fields.phone.value && !Helpers.isPhone(fields.phone.value)) {
      showError("err-phone", "Niepoprawny numer telefonu"); valid = false;
    }
    if (!valid) return;

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Wysylam..."; }

    const booking = {
      date:      state.selectedDate,
      hour:      state.selectedHour,
      firstName: fields.firstName.value.trim(),
      lastName:  fields.lastName.value.trim(),
      email:     fields.email.value.trim(),
      phone:     fields.phone.value.trim(),
      note:      fields.note.value.trim(),
    };

    const saved = Storage.addBooking(booking);
    const n8nResult = await N8N.newBooking(saved);
    if (!n8nResult.ok && !n8nResult.mock) {
      Helpers.toast("Wystapil blad przy wysylaniu — skontaktuj sie bezposrednio", "error");
    }

    state.step = "success";
    renderSuccess(booking);
    showStep("success");
  }

  function renderSuccess(booking) {
    const el = document.getElementById("success-details");
    if (!el) return;
    el.innerHTML = '<p style="font-size:14px;color:var(--text-2);margin-bottom:12px">'
      + '<strong>' + booking.firstName + ' ' + booking.lastName + '</strong>, potwierdzenie wysylamy na<br>'
      + '<strong>' + booking.email + '</strong>'
      + '</p>'
      + '<div style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:var(--radius);padding:14px 16px;text-align:left">'
      + '<div style="font-size:14px;font-weight:600;margin-bottom:4px">' + CONFIG.meetingTitle + '</div>'
      + '<div style="font-size:13px;color:var(--text-2)">' + Helpers.formatDate(booking.date) + ' &middot; ' + booking.hour + ' &middot; ' + CONFIG.meetingDuration + ' min</div>'
      + '<div style="font-size:13px;color:var(--blue);margin-top:4px">&#128249; Link do Google Meet zostanie wyslany na Twoj email</div>'
      + '</div>';
  }

  function showStep(step) {
    ["calendar-section","time-section","form-section","success-section"].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    const map = {
      calendar: "calendar-section",
      time:     "time-section",
      form:     "form-section",
      success:  "success-section",
    };
    const target = document.getElementById(map[step]);
    if (target) target.style.display = "block";
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

  function bindNav() {
    const prev = document.getElementById("cal-prev");
    const next = document.getElementById("cal-next");
    if (prev) prev.onclick = function() {
      state.month--;
      if (state.month < 0) { state.month = 11; state.year--; }
      renderCalendar();
    };
    if (next) next.onclick = function() {
      state.month++;
      if (state.month > 11) { state.month = 0; state.year++; }
      renderCalendar();
    };
  }

  function setText(id, val) {
    const el = document.getElementById(id); if (el) el.textContent = val;
  }
  function showError(id, msg) {
    const el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
  function clearErrors() {
    document.querySelectorAll(".form-error").forEach(function(e) { e.textContent = ""; e.classList.add("hidden"); });
  }

  return { init: init, selectDate: selectDate, selectHour: selectHour, submitBooking: submitBooking, goBack: goBack };
})();

document.addEventListener("DOMContentLoaded", App.init);
