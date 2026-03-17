// ═══════════════════════════════════════════
//  PUBLIC BOOKING PAGE — app.js
// ═══════════════════════════════════════════

const App = (() => {
  var state = {
    year:         new Date().getFullYear(),
    month:        new Date().getMonth(),
    selectedDate: null,
    selectedHour: null,
    step:         "calendar",   // calendar | time | meetingtype | form | success
    meetingType:  "online",
    duration:     30,
    guestCount:   0,
  };

  // ── INIT ──────────────────────────────
  function init() {
    setText("host-initials", CONFIG.ownerInitials);
    setText("host-name",     CONFIG.ownerName);
    setText("host-role",     CONFIG.ownerRole);
    setText("page-title",    "Umow spotkanie z " + CONFIG.ownerName);
    setText("meta-duration", state.duration + " min");
    renderCal("cal-grid-1", "cal-month-1");
    bindNavBtn("cal-prev-1", "cal-next-1");
    bindNavBtn("cal-prev-2", "cal-next-2");
    showPanel("panel-calendar");
  }

  // ── RENDER CALENDAR ──────────────────────────
  function renderCal(gridId, labelId) {
    var grid  = document.getElementById(gridId);
    var label = document.getElementById(labelId);
    if (!grid) return;

    var months = ["Styczen","Luty","Marzec","Kwiecien","Maj","Czerwiec",
                  "Lipiec","Sierpien","Wrzesien","Pazdziernik","Listopad","Grudzien"];
    if (label) label.textContent = months[state.month] + " " + state.year;

    var todayStr    = Helpers.today();
    var maxDate     = new Date();
    maxDate.setDate(maxDate.getDate() + CONFIG.bookingWindowDays);
    var maxStr      = Helpers.dateToStr(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    var firstDay    = new Date(state.year, state.month, 1).getDay();
    var offset      = firstDay === 0 ? 6 : firstDay - 1;
    var daysInMonth = new Date(state.year, state.month + 1, 0).getDate();

    var dayNames = ["Pn","Wt","Sr","Cz","Pt","So","Nd"];
    var html = dayNames.map(function(d) { return '<div class="cal-day-name">' + d + '</div>'; }).join("");
    for (var i = 0; i < offset; i++) html += '<div class="cal-day empty"></div>';

    for (var d = 1; d <= daysInMonth; d++) {
      var ds      = Helpers.dateToStr(state.year, state.month, d);
      var dow     = new Date(ds + "T12:00:00").getDay();
      var past    = ds < todayStr;
      var future  = ds > maxStr;
      var weekend = (dow === 0 || dow === 6);
      var hasEv   = Storage.getEventsForDay(ds).length > 0;
      var sel     = ds === state.selectedDate;

      var cls = "cal-day";
      if (past || future || weekend) cls += " past";
      if (ds === todayStr) cls += " today";
      if (sel)  cls += " selected";
      if (hasEv) cls += " has-events";

      var click = (!past && !future && !weekend)
        ? 'onclick="App.selectDate(\'' + ds + '\')"' : "";
      html += '<div class="' + cls + '" ' + click + '>' + d + '</div>';
    }
    grid.innerHTML = html;
  }

  function renderBothCals() {
    renderCal("cal-grid-1", "cal-month-1");
    renderCal("cal-grid-2", "cal-month-2");
  }

  function bindNavBtn(prevId, nextId) {
    var prev = document.getElementById(prevId);
    var next = document.getElementById(nextId);
    if (prev) prev.onclick = function() {
      var now = new Date();
      var newMonth = state.month - 1;
      var newYear  = state.year;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      // nie cofaj przed aktualnym miesiącem
      if (newYear < now.getFullYear() || (newYear === now.getFullYear() && newMonth < now.getMonth())) return;
      state.month = newMonth;
      state.year  = newYear;
      renderBothCals();
    };
    if (next) next.onclick = function() {
      state.month++;
      if (state.month > 11) { state.month = 0; state.year++; }
      renderBothCals();
    };
  }

  // ── KROK 1→2: wybór daty ──────────────────────────
  function selectDate(ds) {
    state.selectedDate = ds;
    state.selectedHour = null;
    state.step = "time";
    renderBothCals();
    renderSlots();
    showPanel("panel-time");
  }

  // ── KROK 2: sloty ──────────────────────────
  function renderSlots() {
    var lbl = document.getElementById("slots-date-label");
    if (lbl) lbl.textContent = Helpers.formatDate(state.selectedDate);
    var container = document.getElementById("slots-container");
    if (!container) return;
    var html = "";
    CONFIG.workHours.forEach(function(hour) {
      var taken = Storage.isSlotTaken(state.selectedDate, hour)
               || Helpers.isHourPast(state.selectedDate, hour);
      if (taken) {
        html += '<div class="pt-slot taken">' + hour + '</div>';
      } else {
        html += '<div class="pt-slot" onclick="App.selectHour(\'' + hour + '\')">' + hour + '</div>';
      }
    });
    container.innerHTML = html;
  }

  // ── KROK 2→3a: wybór godziny ──────────────────────────
  function selectHour(hour) {
    state.selectedHour = hour;
    state.step = "meetingtype";
    state.duration = 30;

    setText("summary-date", Helpers.formatDate(state.selectedDate));
    setText("summary-time", hour);

    // Reset duration buttons
    setDuration(30);
    setMeetingType("online");

    showPanel("panel-meetingtype");
  }

  // ── DURATION ──────────────────────────
  function setDuration(mins) {
    state.duration = mins;
    setText("meta-duration", mins + " min");
    document.querySelectorAll(".dur-btn").forEach(function(btn) {
      btn.classList.toggle("active", parseInt(btn.dataset.dur) === mins);
    });
    // aktualizuj summary-time
    var timeEl = document.getElementById("summary-time");
    if (timeEl) timeEl.textContent = state.selectedHour + " · " + mins + " min";
  }

  // ── MEETING TYPE ──────────────────────────
  function setMeetingType(type) {
    state.meetingType = type;
    var btnO = document.getElementById("type-online");
    var btnI = document.getElementById("type-inperson");
    var locG = document.getElementById("location-group");
    if (btnO) btnO.classList.toggle("active", type === "online");
    if (btnI) btnI.classList.toggle("active", type === "inperson");
    if (locG) locG.classList.toggle("hidden", type === "online");

    var metaType = document.getElementById("meta-type-label");
    if (metaType) metaType.textContent = type === "online" ? "Google Meet" : "Spotkanie na zywo";

    if (type === "online") {
      var metaLoc = document.getElementById("meta-location-row");
      if (metaLoc) metaLoc.classList.add("hidden");
    }
  }

  function updateMeta() {
    var locInput   = document.getElementById("f-location");
    var metaLocRow = document.getElementById("meta-location-row");
    var metaLocLbl = document.getElementById("meta-location-label");
    if (!locInput || !metaLocRow || !metaLocLbl) return;
    if (locInput.value.trim()) {
      metaLocRow.classList.remove("hidden");
      metaLocLbl.textContent = locInput.value.trim();
    } else {
      metaLocRow.classList.add("hidden");
    }
  }

  // ── KROK 3a→3b: przejdź do danych ──────────────────────────
  function goToDetails() {
    // Walidacja miejsca dla spotkania na zywo
    if (state.meetingType === "inperson") {
      var loc = document.getElementById("f-location");
      if (!loc || !loc.value.trim()) {
        if (loc) {
          loc.style.borderColor = "var(--red)";
          loc.style.boxShadow = "0 0 0 3px rgba(220,38,38,.15)";
          loc.focus();
          setTimeout(function() {
            loc.style.borderColor = "";
            loc.style.boxShadow = "";
          }, 2500);
        }
        var hint = document.querySelector("#location-group .form-hint");
        if (hint) { hint.textContent = "To pole jest wymagane!"; hint.style.color = "var(--red)"; }
        setTimeout(function() {
          if (hint) { hint.textContent = "Podaj adres lub nazwe miejsca"; hint.style.color = ""; }
        }, 2500);
        return;
      }
    }
    state.step = "form";
    var gc = document.getElementById("guests-container");
    if (gc) gc.innerHTML = "";
    state.guestCount = 0;
    showPanel("panel-form");
  }

  // ── GUESTS ──────────────────────────────
  function addGuest() {
    state.guestCount++;
    var idx = state.guestCount;
    var container = document.getElementById("guests-container");
    if (!container) return;
    var row = document.createElement("div");
    row.className = "guest-row";
    row.id = "guest-row-" + idx;
    row.innerHTML =
      '<div class="guest-row-header">'
      + '<div class="guest-row-title">Partner biznesowy</div>'
      + '<button class="btn-remove-guest" type="button" onclick="App.removeGuest(' + idx + ')">&times;</button>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + '<div class="form-group"><label class="form-label">Imie <span style='color:var(--red)'>*</span></label>'
      + '<input class="form-input" id="g-fn-' + idx + '" placeholder="Anna" /></div>'
      + '<div class="form-group"><label class="form-label">Nazwisko <span style='color:var(--red)'>*</span></label>'
      + '<input class="form-input" id="g-ln-' + idx + '" placeholder="Kowalska" /></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Email <span style='color:var(--red)'>*</span></label>'
      + '<input class="form-input" id="g-em-' + idx + '" type="email" placeholder="anna@firma.pl" /></div>'
      + '<div class="form-group"><label class="form-label">Numer telefonu <span style='color:var(--red)'>*</span></label>'
      + '<input class="form-input" id="g-ph-' + idx + '" type="tel" placeholder="+48 500 000 000" /></div>';
    container.appendChild(row);
    updateGuestsMeta();
  }

  function removeGuest(idx) {
    var row = document.getElementById("guest-row-" + idx);
    if (row) row.remove();
    state.guestCount = Math.max(0, state.guestCount - 1);
    updateGuestsMeta();
  }

  function updateGuestsMeta() {
    var row = document.getElementById("meta-guests-row");
    var lbl = document.getElementById("meta-guests-label");
    if (!row || !lbl) return;
    if (state.guestCount > 0) {
      row.classList.remove("hidden");
      lbl.textContent = (1 + state.guestCount) + " osoby lacznie";
    } else {
      row.classList.add("hidden");
    }
  }

  // ── SUBMIT ──────────────────────────────
  async function submitBooking() {
    var fn  = document.getElementById("f-firstname");
    var ln  = document.getElementById("f-lastname");
    var em  = document.getElementById("f-email");
    var ph  = document.getElementById("f-phone");
    var nt  = document.getElementById("f-note");
    var loc = document.getElementById("f-location");

    var valid = true;
    clearErrors();
    if (!fn || !fn.value.trim())          { showError("err-firstname", "Podaj imie"); valid = false; }
    if (!ln || !ln.value.trim())          { showError("err-lastname", "Podaj nazwisko"); valid = false; }
    if (!em || !Helpers.isEmail(em.value)){ showError("err-email", "Podaj poprawny email"); valid = false; }
    if (!ph || !ph.value.trim())          { showError("err-phone", "Podaj numer telefonu"); valid = false; }
    else if (!Helpers.isPhone(ph.value))  { showError("err-phone", "Niepoprawny numer"); valid = false; }
    if (!valid) return;

    var btn = document.getElementById("submit-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Wysylam..."; }

    var guests = [];
    for (var i = 1; i <= state.guestCount; i++) {
      var gfn = document.getElementById("g-fn-" + i);
      var gln = document.getElementById("g-ln-" + i);
      var gem = document.getElementById("g-em-" + i);
      var gph = document.getElementById("g-ph-" + i);
      if (gfn) {
        if (!gfn.value.trim()) { gfn.style.borderColor="var(--red)"; valid = false; }
        if (!gln || !gln.value.trim()) { if(gln) gln.style.borderColor="var(--red)"; valid = false; }
        if (!gem || !Helpers.isEmail(gem.value)) { if(gem) gem.style.borderColor="var(--red)"; valid = false; }
        if (!gph || !gph.value.trim()) { if(gph) gph.style.borderColor="var(--red)"; valid = false; }
        if (valid) {
          guests.push({ firstName: gfn.value.trim(), lastName: gln.value.trim(), email: gem.value.trim(), phone: gph ? gph.value.trim() : "" });
        }
      }
    }
    if (!valid) { var btn2 = document.getElementById("submit-btn"); if(btn2){btn2.disabled=false;btn2.textContent="Potwierdź rezerwację →";} return; }

    var ws  = document.getElementById("f-website");
    var lin = document.getElementById("f-linkedin");
    var booking = {
      date:        state.selectedDate,
      hour:        state.selectedHour,
      duration:    state.duration,
      meetingType: state.meetingType,
      location:    (loc && state.meetingType === "inperson") ? loc.value.trim() : "",
      firstName:   fn.value.trim(),
      lastName:    ln.value.trim(),
      email:       em.value.trim(),
      phone:       ph ? ph.value.trim() : "",
      website:     ws  ? ws.value.trim()  : "",
      linkedin:    lin ? lin.value.trim() : "",
      note:        nt ? nt.value.trim() : "",
      guests:      guests,
      totalPeople: 1 + guests.length,
    };

    var saved = Storage.addBooking(booking);
    var n8nResult = await N8N.newBooking(saved);
    if (!n8nResult.ok && !n8nResult.mock) {
      Helpers.toast("Wystapil blad — skontaktuj sie bezposrednio", "error");
    }

    state.step = "success";
    renderSuccess(booking);
    showPanel("panel-success");
  }

  // ── SUCCESS ──────────────────────────────
  function renderSuccess(booking) {
    var el = document.getElementById("success-details");
    if (!el) return;
    var typeLabel = booking.meetingType === "online"
      ? "Google Meet — link wyslemy na email"
      : "Spotkanie na zywo" + (booking.location ? " · " + booking.location : "");
    var guestsHtml = "";
    if (booking.guests && booking.guests.length > 0) {
      guestsHtml = '<div style="font-size:12px;color:var(--text-2);margin-top:6px">Uczestnicy: '
        + booking.guests.map(function(g) { return g.firstName + " " + g.lastName; }).join(", ")
        + '</div>';
    }
    el.innerHTML =
      '<p style="font-size:14px;color:var(--text-2);margin-bottom:12px">'
      + 'Potwierdzenie wyslano na <strong>' + booking.email + '</strong></p>'
      + '<div style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:var(--radius);padding:14px 16px;text-align:left">'
      + '<div style="font-size:14px;font-weight:600;margin-bottom:4px">' + CONFIG.meetingTitle + '</div>'
      + '<div style="font-size:13px;color:var(--text-2)">' + Helpers.formatDate(booking.date) + ' · ' + booking.hour + ' · ' + booking.duration + ' min</div>'
      + '<div style="font-size:13px;color:var(--blue);margin-top:4px">' + typeLabel + '</div>'
      + guestsHtml + '</div>';
  }

  // ── SIDEBAR: pokazuj/ukrywaj meta i LinkedIn ──────────────────────────
  function updateSidebar() {
    var metaBox     = document.getElementById("bc-meta-box");
    var linkedinCard = document.getElementById("linkedin-card");
    var showMeta    = (state.step === "meetingtype" || state.step === "form" || state.step === "success");

    if (metaBox) {
      metaBox.style.display = showMeta ? "flex" : "none";
      metaBox.style.flexDirection = "column";
    }
    if (linkedinCard) {
      linkedinCard.style.display = showMeta ? "none" : "block";
    }
  }

  // ── PANEL SWITCH ──────────────────────────
  function showPanel(id) {
    ["panel-calendar","panel-time","panel-meetingtype","panel-form","panel-success"].forEach(function(pid) {
      var el = document.getElementById(pid);
      if (!el) return;
      el.style.display = "none";
    });
    var target = document.getElementById(id);
    if (!target) return;
    if (id === "panel-time")    { target.style.display = "block"; updateSidebar(); return; }
    if (id === "panel-success") { target.style.display = "flex";  updateSidebar(); return; }
    target.style.display = "flex";
    target.style.flexDirection = "column";
    updateSidebar();
  }

  // ── BACK ──────────────────────────────
  function goBack() {
    if (state.step === "time") {
      state.step = "calendar";
      state.selectedDate = null;
      renderBothCals();
      showPanel("panel-calendar");
    } else if (state.step === "meetingtype") {
      state.step = "time";
      showPanel("panel-time");
    }
  }

  function goBackToMeetingType() {
    state.step = "meetingtype";
    showPanel("panel-meetingtype");
  }

  // ── UTILS ──────────────────────────────
  function setText(id, val) {
    var el = document.getElementById(id); if (el) el.textContent = val;
  }
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
  function clearErrors() {
    document.querySelectorAll(".form-error").forEach(function(e) { e.textContent = ""; e.classList.add("hidden"); });
  }

  return {
    init: init,
    selectDate: selectDate,
    selectHour: selectHour,
    setDuration: setDuration,
    setMeetingType: setMeetingType,
    updateMeta: updateMeta,
    goToDetails: goToDetails,
    addGuest: addGuest,
    removeGuest: removeGuest,
    submitBooking: submitBooking,
    goBack: goBack,
    goBackToMeetingType: goBackToMeetingType,
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
