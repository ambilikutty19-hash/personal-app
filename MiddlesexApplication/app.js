// Service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

// Screens
const screens = [
  "home","timetable",
  "notifications","settings",
  "profile","faqs","ask","social","docs","mymdx","attendance","campus",
  "transport","appointments","cas","careers","library"
];

let stack = ["home"];

function resetScroll(){
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
}

function setBottomNavActive(name){
  const navButtons = document.querySelectorAll(".bottom-nav [data-nav]");
  navButtons.forEach(b => b.classList.remove("active"));
  const match = document.querySelector(`.bottom-nav [data-nav="${name}"]`);
  if (match) match.classList.add("active");
}

function show(name){
  screens.forEach(n => {
    const el = document.getElementById(`screen-${n}`);
    if (el) el.classList.remove("active");
  });

  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add("active");

  setBottomNavActive(name);

  if (name === "timetable") {
    view = new Date();
    selected = new Date();
    renderCalendar();
    renderCards();
  }
  if (name === "notifications") renderNotifs();
  if (name === "settings") syncSettingsUI();

  resetScroll();
}

function go(name){
  stack.push(name);
  show(name);
}

function back(){
  stack.pop();
  show(stack[stack.length - 1] || "home");
}

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => go(btn.dataset.go));
});
document.querySelectorAll("[data-back]").forEach(btn => btn.addEventListener("click", back));

document.querySelectorAll("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => {
    const dest = btn.dataset.nav;
    stack = [dest];
    show(dest);
  });
});

// Start
show("home");

// =====================
// Settings
// =====================
const PREFS_KEY = "mdx_prefs_v1";
const STORAGE_TIMETABLE = "mdx_timetable_v7";   // bumped for your new layout
const STORAGE_NOTIFS = "mdx_notifs_v1";

function loadPrefs(){
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || { notificationsEnabled: true }; }
  catch { return { notificationsEnabled: true }; }
}
function savePrefs(p){ localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }

function syncSettingsUI(){
  const prefs = loadPrefs();
  const cb = document.getElementById("pref-notifs");
  if (cb) cb.checked = !!prefs.notificationsEnabled;
}

document.getElementById("pref-notifs")?.addEventListener("change", (e) => {
  const prefs = loadPrefs();
  prefs.notificationsEnabled = !!e.target.checked;
  savePrefs(prefs);
});

document.getElementById("btn-logout")?.addEventListener("click", () => {
  const ok = confirm("Log out? This will clear your local data on this phone.");
  if (!ok) return;

  localStorage.removeItem(STORAGE_TIMETABLE);
  localStorage.removeItem(STORAGE_NOTIFS);

  alert("Logged out (local data cleared).");
  stack = ["home"];
  show("home");
});

// =====================
// Notifications
// =====================
const defaultNotifs = [
  { id: "n1", title: "Welcome to MDX (Personal)", body: "This is your custom app. You can edit your timetable here.", ts: Date.now() - 1000 * 60 * 60, viewed: false },
  { id: "n2", title: "Tip", body: "Tap a date in Timetable to view classes for that day.", ts: Date.now() - 1000 * 60 * 30, viewed: false }
];

function loadNotifs(){
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_NOTIFS));
    if (Array.isArray(raw)) return raw;
  } catch {}
  localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(defaultNotifs));
  return [...defaultNotifs];
}
function saveNotifs(list){
  localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(list));
}

let notifTab = "new";

document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    notifTab = t.dataset.tab;
    renderNotifs();
  });
});

function fmtTime(ts){
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function renderNotifs(){
  const wrap = document.getElementById("notif-list");
  if (!wrap) return;

  const prefs = loadPrefs();
  if (!prefs.notificationsEnabled) {
    wrap.innerHTML = `<div class="notif"><div class="notif-title">Notifications disabled</div><div style="color:#555;">Enable them in Settings.</div></div>`;
    return;
  }

  const list = loadNotifs();
  const filtered = list.filter(n => (notifTab === "new" ? !n.viewed : n.viewed));

  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="notif"><div class="notif-title">No ${notifTab === "new" ? "new" : "viewed"} notifications</div></div>`;
    return;
  }

  wrap.innerHTML = "";
  filtered
    .sort((a,b) => b.ts - a.ts)
    .forEach(n => {
      const div = document.createElement("div");
      div.className = "notif";
      div.innerHTML = `
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div style="color:#333;">${escapeHtml(n.body)}</div>
        <div class="notif-meta">
          <span>${fmtTime(n.ts)}</span>
          <span>${n.viewed ? "Viewed" : "New"}</span>
        </div>
        <div class="notif-actions">
          ${n.viewed
            ? `<button data-act="mark-new">Mark as New</button>`
            : `<button data-act="mark-viewed">Mark as Viewed</button>`
          }
          <button data-act="delete">Delete</button>
        </div>
      `;

      div.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.act;
          const all = loadNotifs();
          const idx = all.findIndex(x => x.id === n.id);
          if (idx === -1) return;

          if (act === "mark-viewed") all[idx].viewed = true;
          if (act === "mark-new") all[idx].viewed = false;
          if (act === "delete") all.splice(idx, 1);

          saveNotifs(all);
          renderNotifs();
        });
      });

      wrap.appendChild(div);
    });
}

// =====================
// Timetable
// =====================
function loadData(){
  try { return JSON.parse(localStorage.getItem(STORAGE_TIMETABLE)) || {}; }
  catch { return {}; }
}
function saveData(d){ localStorage.setItem(STORAGE_TIMETABLE, JSON.stringify(d)); }

function toKey(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const day = String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function monthLabel(date){
  return date.toLocaleDateString(undefined, {month:"long", year:"numeric"});
}

const monthLabelEl = document.getElementById("month-label");
const calendarEl = document.getElementById("calendar");
const cardsEl = document.getElementById("cards");

let view = new Date();
let selected = new Date();

function daysInMonth(date){
  return new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
}

function renderCalendar(){
  if (!monthLabelEl || !calendarEl) return;

  const data = loadData();
  monthLabelEl.textContent = monthLabel(view);
  calendarEl.innerHTML = "";

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const dim = daysInMonth(view);
  const pad = first.getDay();
  const total = Math.ceil((pad + dim) / 7) * 7;

  const todayKey = toKey(new Date());

  for (let i=0; i<total; i++){
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day";

    const dayNum = i - pad + 1;
    const inMonth = dayNum >= 1 && dayNum <= dim;

    if (!inMonth){
      cell.classList.add("out");
      cell.disabled = true;
      cell.textContent = "";
    } else {
      const d = new Date(view.getFullYear(), view.getMonth(), dayNum);
      const dKey = toKey(d);

      cell.textContent = String(dayNum).padStart(2,"0");

      if (dKey === toKey(selected)) cell.classList.add("selected");
      if (dKey === todayKey) cell.classList.add("today");

      const has = Array.isArray(data[dKey]) && data[dKey].length > 0;
      if (has){
        const dot = document.createElement("div");
        dot.className = "dot";
        cell.appendChild(dot);
      }

      cell.addEventListener("click", () => {
        selected = d;
        renderCalendar();
        renderCards();
      });
    }

    calendarEl.appendChild(cell);
  }
}

function fmtDatePill(date){
  return {
    d: date.getDate(),
    m: date.toLocaleDateString(undefined, {month:"short"})
  };
}

// Long-press helper (for delete without showing buttons)
function attachLongPressToDelete(el, onLongPress){
  let timer = null;

  const start = () => {
    timer = setTimeout(() => {
      timer = null;
      onLongPress();
    }, 550); // hold ~0.55s
  };

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", cancel);
  el.addEventListener("touchcancel", cancel);

  // also works on desktop with mouse
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", cancel);
  el.addEventListener("mouseleave", cancel);
}

function renderCards(){
  if (!cardsEl) return;

  const data = loadData();
  const key = toKey(selected);
  const list = data[key] || [];
  const pill = fmtDatePill(selected);

  cardsEl.innerHTML = "";

  if (!list.length){
    cardsEl.innerHTML = `<div style="color:#444;font-weight:500;padding:10px;">No classes for this day.</div>`;
    return;
  }

  list.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    // NO clock emoji, NO edit/delete buttons
    card.innerHTML = `
      <div class="date-pill">
        <div class="d">${pill.d}</div>
        <div class="m">${pill.m}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(c.title || "Untitled")}</div>
        <div class="meta"><b>Module Code</b> : ${escapeHtml(c.code || "-")}</div>
        <div class="meta"><b>Tutor</b> : ${escapeHtml(c.tutor || "-")}</div>
        <div class="meta"><b>Session Type</b> : ${escapeHtml(c.type || "-")}</div>
        <div class="meta"><b>Location</b> : ${escapeHtml(c.location || "-")}</div>

        <div class="time-row">
          <div>${escapeHtml(c.start || "--:--")} - ${escapeHtml(c.end || "--:--")}</div>
        </div>
      </div>
    `;

    // Optional delete (hidden): long press on the card
    attachLongPressToDelete(card, () => {
      const ok = confirm("Delete this session? (Hold to delete)");
      if (!ok) return;

      const fresh = loadData();
      const arr = fresh[key] || [];
      arr.splice(idx, 1);
      if (arr.length === 0) delete fresh[key];
      else fresh[key] = arr;

      saveData(fresh);
      renderCalendar();
      renderCards();
    });

    cardsEl.appendChild(card);
  });
}

document.getElementById("prev-month")?.addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth()-1, 1);
  renderCalendar();
});
document.getElementById("next-month")?.addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth()+1, 1);
  renderCalendar();
});

// Modal
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");

const fTitle = document.getElementById("f-title");
const fCode = document.getElementById("f-code");
const fType = document.getElementById("f-type");
const fTutor = document.getElementById("f-tutor");
const fLocation = document.getElementById("f-location");
const fStart = document.getElementById("f-start");
const fEnd = document.getElementById("f-end");

document.getElementById("btn-add")?.addEventListener("click", () => openModal());
document.getElementById("btn-cancel")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function openModal(){
  if (!modal) return;

  modalTitle.textContent = "Add class";
  fTitle.value = "";
  fCode.value = "";
  fType.value = "";
  fTutor.value = "";
  fLocation.value = "";
  fStart.value = "";
  fEnd.value = "";

  modal.classList.remove("hidden");
}

function closeModal(){
  modal?.classList.add("hidden");
}

document.getElementById("btn-save")?.addEventListener("click", () => {
  const title = fTitle.value.trim();
  if (!title) { alert("Please enter a module/title."); return; }

  const entry = {
    title,
    code: fCode.value.trim(),
    type: fType.value.trim(),
    tutor: fTutor.value.trim(),
    location: fLocation.value.trim(),
    start: fStart.value,
    end: fEnd.value
  };

  const data = loadData();
  const key = toKey(selected);
  const list = data[key] || [];

  list.push(entry);
  data[key] = list;
  saveData(data);

  closeModal();
  renderCalendar();
  renderCards();
});
