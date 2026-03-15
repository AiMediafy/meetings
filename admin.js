// ═══════════════════════════════════════════
//  ADMIN PANEL — admin.js
// ═══════════════════════════════════════════

const Admin = (() => {
  let state = {
    loggedIn: false,
    year:  new Date().getFullYear(),
    month: new Date().getMonth(),
    selectedDate: Helpers.today(),
    page: "dashboard",  // dashboard | calendar | bookings | settings
    editingSlot: null,
  };

  // ── AUTH ──────────────────────────────
  function checkAuth() {
    const stored = sessionStorage.getItem("admin_auth");
    if (stored === btoa(CONFIG.adminPassword)) {
      state.loggedIn = true;
      showPanel();
    } else {
      showLogin();
    }
  }

  function login() {
    const pw = document.getElementById("login-pw");
    const err = document.getElementById("login-err");
    if (!pw) return;
    if (pw.value === CONFIG.adminPassword) {
      sessionStorage.setItem("admin_auth", btoa(CONFIG.adminPassword));
      state.loggedIn = true;
      err.classList.add("hidden");
      showPanel();
    } else {
      err.textContent = "Niepoprawne hasło";
      err.classList.remove("hidden");
      pw.focus();
    }
  }

  function logout() {
    sessionStorage.removeItem("admin_auth");
    location.reload();
  }

  function showLogin() {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("admin-screen").classList.add("hidden");
  }

  function showPanel() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("admin-screen").classList.remove("hidden");
    setText("admin-owner-name", CONFIG.ownerName);
    setText("admin-owner-initials", CONFIG.ownerInitials);
    renderPage("dashboard");
  }

  // ── PAGE ROUTING ──────────────────────────
  function renderPage(page) {
    state.page = page;

    // Update sidebar active
    document.querySelectorAll(".sidebar-item").forEach(el => {
      el.classList.toggle("active", el.dataset.page === page);
    });

    const main = document.getElementById("admin-content");
    if (!main) return;

    switch (page) {
      case "dashboard": main.innerHTML = buildDashboard(); bindDashboard(); break;
      case "calendar":  main.innerHTML = buildCalendarPage(); bindCalendarPage(); break;
      case "bookings":  main.innerHTML = buildBookingsPage(); break;
      case "settings":  main.innerHTML = buildSettingsPage(); bindSettings(); break;
    }
  }

  // ── DASHBOARD ──────────────────────────
  function buildDashboard() {
    const today = Helpers.today();
    const allEvents = Storage.getEvents();
    const allBookings = Storage.getBookings();

    const todayEvents  = allEvents.filter(e => e.date === today);
    const realToday    = todayEvents.filter(e => e.type === "real");
    const totalReal    = allEvents.filter(e => e.type === "real").length;
    const totalFake    = allEvents.filter(e => e.type === "fake").length;
    const upcoming     = allBookings.filter(e => e.date >= today).length;

    // Last 5 bookings
    const recent = [...allBookings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return `
      <h1>Panel główny</h1>
      <p class="page-sub">Witaj, ${CONFIG.ownerName}! Oto dzisiejsze podsumowanie.</p>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value blue">${upcoming}</div>
          <div class="stat-label">Nadchodzące spotkania</div>
        </div>
        <div class="stat-card">
          <div class="stat-value green">${realToday.length}</div>
          <div class="stat-label">Prawdziwe dziś</div>
        </div>
        <div class="stat-card">
          <div class="stat-value red">${todayEvents.filter(e=>e.type==="fake").length}</div>
          <div class="stat-label">Fikcyjne dziś</div>
        </div>
        <div class="stat-card">
          <div class="stat-value amber">${totalFake}</div>
          <div class="stat-label">Łącznie blokad</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div class="card card-pad">
          <div class="flex justify-between items-center mb-4">
            <div class="fw-6">Dzisiaj · ${Helpers.formatDate(today)}</div>
            <button class="btn btn-sm btn-outline" onclick="Admin.goToCalendar('${today}')">Zarządzaj</button>
          </div>
          ${todayEvents.length === 0
            ? `<p class="muted t-sm">Brak zdarzeń na dziś</p>`
            : buildMiniSlotList(todayEvents)}
        </div>

        <div class="card card-pad">
          <div class="fw-6 mb-4">Ostatnie rezerwacje</div>
          ${recent.length === 0
            ? `<p class="muted t-sm">Brak rezerwacji</p>`
            : `<div style="display:flex;flex-direction:column;gap:10px">
                ${recent.map(b => `
                  <div class="flex items-center gap-3">
                    <div class="avatar" style="width:32px;height:32px;font-size:12px">${Helpers.initials(b.firstName,b.lastName)}</div>
                    <div>
                      <div class="fw-5 t-sm">${b.firstName} ${b.lastName}</div>
                      <div class="muted t-xs">${Helpers.formatDateShort(b.date)} · ${b.hour}</div>
                    </div>
                    <div class="badge badge-green" style="margin-left:auto">potwierdzone</div>
                  </div>`).join("")}
              </div>`}
        </div>
      </div>

      <div class="card card-pad">
        <div class="flex justify-between items-center mb-4">
          <div class="fw-6">Statystyki ogólne</div>
        </div>
        <div style="display:flex;gap:32px">
          <div><div style="font-size:32px;font-weight:700;color:var(--blue)">${totalReal}</div><div class="muted t-sm">Łącznie prawdziwych</div></div>
          <div><div style="font-size:32px;font-weight:700;color:var(--red)">${totalFake}</div><div class="muted t-sm">Łącznie blokad</div></div>
          <div><div style="font-size:32px;font-weight:700;color:var(--green)">${allBookings.length}</div><div class="muted t-sm">Łącznie rezerwacji</div></div>
        </div>
      </div>`;
  }

  function bindDashboard() {}

  function buildMiniSlotList(events) {
    return `<div style="display:flex;flex-direction:column;gap:6px">
      ${events.sort((a,b)=>a.hour.localeCompare(b.hour)).map(ev => `
        <div class="flex items-center gap-3">
          <span style="font-size:12px;font-weight:500;color:var(--text-2);width:44px;text-align:right">${ev.hour}</span>
          <div style="flex:1;padding:7px 10px;border-radius:var(--radius-sm);font-size:13px;
            background:${ev.type==='real'?'var(--green-light)':'var(--red-light)'};
            border-left:3px solid ${ev.type==='real'?'var(--green)':'var(--red)'};
            font-weight:500;color:${ev.type==='real'?'var(--green)':'var(--red)'}">
            ${ev.title}
          </div>
        </div>`).join("")}
    </div>`;
  }

  // ── CALENDAR PAGE ──────────────────────────
  function buildCalendarPage() {
    const months = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
                    "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
    return `
      <h1>Kalendarz</h1>
      <p class="page-sub">Zarządzaj slotami — dodawaj blokady i przeglądaj rezerwacje.</p>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start">
        <div class="card card-pad">
          <div class="cal-wrap">
            <div class="cal-header">
              <button class="cal-nav" id="admin-cal-prev">‹</button>
              <span class="cal-title" id="admin-cal-label">${months[state.month]} ${state.year}</span>
              <button class="cal-nav" id="admin-cal-next">›</button>
            </div>
            <div class="cal-grid" id="admin-cal-grid"></div>
          </div>
          <div class="divider"></div>
          <div style="font-size:12px;display:flex;flex-direction:column;gap:6px">
            <div class="flex items-center gap-2"><span style="width:10px;height:10px;border-radius:50%;background:var(--green);display:inline-block"></span> Prawdziwe spotkanie</div>
            <div class="flex items-center gap-2"><span style="width:10px;height:10px;border-radius:50%;background:var(--red);display:inline-block"></span> Blokada / fikcyjne</div>
            <div class="flex items-center gap-2"><span style="width:10px;height:10px;border-radius:2px;border:1.5px dashed var(--border-2);display:inline-block"></span> Wolny slot</div>
          </div>
        </div>

        <div class="card card-pad" id="admin-day-panel">
          <div class="flex justify-between items-center mb-4">
            <div>
              <div class="fw-6 t-lg" id="admin-day-title">Wybierz dzień</div>
              <div class="muted t-sm" id="admin-day-sub">Kliknij dzień w kalendarzu</div>
            </div>
            <button class="btn btn-sm btn-primary" id="admin-add-block-btn" onclick="Admin.openAddModal()" style="display:none">+ Dodaj blokadę</button>
          </div>
          <div id="admin-slots-container"><p class="muted t-sm">Wybierz dzień w kalendarzu aby zobaczyć sloty</p></div>
        </div>
      </div>`;
  }

  function bindCalendarPage() {
    renderAdminCal();
    document.getElementById("admin-cal-prev").onclick = () => {
      state.month--; if (state.month < 0) { state.month = 11; state.year--; }
      renderAdminCal();
    };
    document.getElementById("admin-cal-next").onclick = () => {
      state.month++; if (state.month > 11) { state.month = 0; state.year++; }
      renderAdminCal();
    };
    if (state.selectedDate) selectAdminDay(state.selectedDate);
  }

  function renderAdminCal() {
    const months = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
                    "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
    const lbl = document.getElementById("admin-cal-label");
    const grid = document.getElementById("admin-cal-grid");
    if (!lbl || !grid) return;

    lbl.textContent = `${months[state.month]} ${state.year}`;

    const todayStr = Helpers.today();
    const dayNames = ["Pn","Wt","Śr","Cz","Pt","So","Nd"];
    let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join("");

    const firstDay = new Date(state.year, state.month, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const daysInM  = new Date(state.year, state.month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) html += `<div class="cal-day empty"></div>`;
    for (let d = 1; d <= daysInM; d++) {
      const ds = Helpers.dateToStr(state.year, state.month, d);
      const hasEv = Storage.getEventsForDay(ds).length > 0;
      let cls = "cal-day";
      if (ds === todayStr)          cls += " today";
      if (ds === state.selectedDate) cls += " selected";
      if (hasEv)                     cls += " has-events";
      html += `<div class="${cls}" onclick="Admin.selectAdminDay('${ds}')">${d}</div>`;
    }
    grid.innerHTML = html;
  }

  function selectAdminDay(dateStr) {
    state.selectedDate = dateStr;
    renderAdminCal();

    const title = document.getElementById("admin-day-title");
    const sub   = document.getElementById("admin-day-sub");
    const addBtn = document.getElementById("admin-add-block-btn");

    if (title) title.textContent = Helpers.formatDate(dateStr);
    if (sub)   sub.textContent   = "Zarządzaj slotami tego dnia";
    if (addBtn) addBtn.style.display = "";

    renderAdminSlots(dateStr);
  }

  function renderAdminSlots(dateStr) {
    const container = document.getElementById("admin-slots-container");
    if (!container) return;
    const dayEvents = Storage.getEventsForDay(dateStr);

    let html = '<div class="slots-list">';
    CONFIG.workHours.forEach(hour => {
      const ev = dayEvents.find(e => e.hour === hour);
      html += `<div class="slot-row"><span class="slot-time">${hour}</span>`;
      if (ev) {
        const isReal = ev.type === "real";
        html += `<div class="slot-event ${ev.type}">
          <div class="slot-event-info">
            <span class="slot-event-title">${ev.title}</span>
            ${ev.email ? `<span class="slot-event-sub">${ev.email}${ev.phone ? ' · ' + ev.phone : ''}</span>` : ""}
          </div>
          <div class="slot-event-actions">
            <span class="badge ${isReal ? 'badge-green' : 'badge-red'}">${isReal ? 'prawdziwe' : 'blokada'}</span>
            <button class="btn btn-sm btn-ghost" onclick="Admin.deleteEvent(${ev.id}, '${dateStr}')" title="Usuń"
              style="padding:4px 8px;font-size:18px;color:var(--text-3)">×</button>
          </div>
        </div>`;
      } else {
        html += `<button class="slot-add" onclick="Admin.openAddModal('${hour}')">+ Dodaj blokadę</button>`;
      }
      html += `</div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  // ── BOOKINGS PAGE ──────────────────────────
  function buildBookingsPage() {
    const bookings = [...Storage.getBookings()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return `
      <h1>Rezerwacje</h1>
      <p class="page-sub">Wszystkie rezerwacje klientów.</p>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Klient</th>
                <th>Data i godzina</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Notatka</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${bookings.length === 0
                ? `<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:32px">Brak rezerwacji</td></tr>`
                : bookings.map(b => `
                  <tr>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="avatar" style="width:30px;height:30px;font-size:11px">${Helpers.initials(b.firstName,b.lastName)}</div>
                        <span class="fw-5">${b.firstName} ${b.lastName}</span>
                      </div>
                    </td>
                    <td><div class="fw-5">${Helpers.formatDateShort(b.date)}</div><div class="muted t-xs">${b.hour} · ${CONFIG.meetingDuration} min</div></td>
                    <td><a href="mailto:${b.email}" class="blue t-sm">${b.email}</a></td>
                    <td class="t-sm">${b.phone || "—"}</td>
                    <td class="t-sm muted" style="max-width:180px">${b.note ? b.note.slice(0,60) + (b.note.length>60?"…":"") : "—"}</td>
                    <td><span class="badge badge-green">potwierdzone</span></td>
                  </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ── SETTINGS PAGE ──────────────────────────
  function buildSettingsPage() {
    return `
      <h1>Ustawienia</h1>
      <p class="page-sub">Konfiguracja aplikacji.</p>
      <div class="card card-pad" style="max-width:500px;margin-bottom:16px">
        <div class="fw-6 mb-4">Twoje dane</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group"><label class="form-label">Imię i nazwisko</label><input class="form-input" id="s-name" value="${CONFIG.ownerName}" /></div>
          <div class="form-group"><label class="form-label">Rola / firma</label><input class="form-input" id="s-role" value="${CONFIG.ownerRole}" /></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="s-email" value="${CONFIG.ownerEmail}" /></div>
        </div>
      </div>
      <div class="card card-pad" style="max-width:500px;margin-bottom:16px">
        <div class="fw-6 mb-4">Spotkanie</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group"><label class="form-label">Tytuł spotkania</label><input class="form-input" id="s-title" value="${CONFIG.meetingTitle}" /></div>
          <div class="form-group"><label class="form-label">Czas trwania (min)</label><input class="form-input" id="s-duration" type="number" value="${CONFIG.meetingDuration}" /></div>
          <div class="form-group"><label class="form-label">N8N Webhook URL</label><input class="form-input" id="s-webhook" value="${CONFIG.n8nWebhookUrl}" placeholder="https://..." /></div>
        </div>
      </div>
      <div class="card card-pad" style="max-width:500px">
        <div class="fw-6 mb-4">Bezpieczeństwo</div>
        <button class="btn btn-outline btn-danger" onclick="Admin.logout()">Wyloguj się</button>
      </div>
      <div style="margin-top:16px"><button class="btn btn-primary" onclick="Admin.saveSettings()">Zapisz ustawienia</button></div>`;
  }

  function bindSettings() {}

  function saveSettings() {
    CONFIG.ownerName    = document.getElementById("s-name")?.value  || CONFIG.ownerName;
    CONFIG.ownerRole    = document.getElementById("s-role")?.value  || CONFIG.ownerRole;
    CONFIG.ownerEmail   = document.getElementById("s-email")?.value || CONFIG.ownerEmail;
    CONFIG.meetingTitle = document.getElementById("s-title")?.value || CONFIG.meetingTitle;
    CONFIG.meetingDuration = parseInt(document.getElementById("s-duration")?.value) || CONFIG.meetingDuration;
    CONFIG.n8nWebhookUrl = document.getElementById("s-webhook")?.value || CONFIG.n8nWebhookUrl;
    Helpers.toast("Ustawienia zapisane (do następnego odświeżenia)", "success");
  }

  // ── ADD BLOCK MODAL ──────────────────────────
  function openAddModal(preHour) {
    const hoursOpts = CONFIG.workHours.map(h =>
      `<option value="${h}" ${h===preHour?"selected":""}>${h}</option>`).join("");
    showModal("Dodaj slot / blokadę", `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Godzina</label>
          <select class="form-select" id="m-hour">${hoursOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Typ slotu</label>
          <select class="form-select" id="m-type" onchange="Admin.togglePersonFields()">
            <option value="fake">🔴 Blokada / fikcyjne</option>
            <option value="real">🟢 Prawdziwe spotkanie</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tytuł</label>
          <input class="form-input" id="m-title" placeholder="np. Spotkanie z klientem" />
        </div>
        <div id="m-person-fields" style="display:none;flex-direction:column;gap:14px">
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="m-email" placeholder="email@firma.pl" /></div>
          <div class="form-group"><label class="form-label">Telefon</label><input class="form-input" id="m-phone" /></div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="Admin.closeModal()">Anuluj</button>
        <button class="btn btn-primary" onclick="Admin.saveSlot()">Dodaj</button>
      </div>`);
  }

  function togglePersonFields() {
    const t = document.getElementById("m-type")?.value;
    const f = document.getElementById("m-person-fields");
    if (f) f.style.display = t === "real" ? "flex" : "none";
  }

  function saveSlot() {
    const hour  = document.getElementById("m-hour")?.value;
    const type  = document.getElementById("m-type")?.value;
    const title = document.getElementById("m-title")?.value.trim() || (type==="fake" ? "Blokada" : "Spotkanie");
    const email = document.getElementById("m-email")?.value.trim() || "";
    const phone = document.getElementById("m-phone")?.value.trim() || "";

    if (Storage.isSlotTaken(state.selectedDate, hour)) {
      Helpers.toast("Ten slot jest już zajęty!", "error"); return;
    }
    Storage.addEvent({ date: state.selectedDate, hour, type, title, email, phone });
    closeModal();
    renderAdminSlots(state.selectedDate);
    renderAdminCal();
    Helpers.toast("Slot dodany", "success");
  }

  function deleteEvent(id, dateStr) {
    if (!confirm("Usunąć ten slot?")) return;
    Storage.removeEvent(id);
    renderAdminSlots(dateStr);
    renderAdminCal();
    Helpers.toast("Slot usunięty");
  }

  // ── MODAL HELPERS ──────────────────────────
  function showModal(title, body) {
    let el = document.getElementById("admin-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "admin-modal";
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div class="modal-backdrop" onclick="Admin.closeModal()">
        <div class="modal-box" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">${title}</div>
            <button class="modal-close" onclick="Admin.closeModal()">×</button>
          </div>
          ${body}
        </div>
      </div>`;
  }

  function closeModal() {
    const el = document.getElementById("admin-modal");
    if (el) el.innerHTML = "";
  }

  // ── UTILS ──────────────────────────────
  function setText(id, val) {
    const el = document.getElementById(id); if (el) el.textContent = val;
  }

  function goToCalendar(dateStr) {
    state.selectedDate = dateStr;
    renderPage("calendar");
  }

  // ── HANDLE LOGIN ENTER KEY ──────────────────────────
  function handleLoginKey(e) {
    if (e.key === "Enter") login();
  }

  return {
    init: checkAuth, login, logout,
    renderPage, selectAdminDay,
    openAddModal, togglePersonFields, saveSlot, deleteEvent,
    closeModal, saveSettings, goToCalendar, handleLoginKey,
  };
})();

document.addEventListener("DOMContentLoaded", Admin.init);
