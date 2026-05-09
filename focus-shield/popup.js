// ============================================================
// popup.js — Focus Shield Popup Controller
// Runs only while the popup is open.
// Sends messages to background.js for any persistent actions.
// ============================================================

// ── DOM references ──────────────────────────────────────────
const focusToggle   = document.getElementById("focusToggle");
const focusStatus   = document.getElementById("focusStatus");
const sessionCount  = document.getElementById("sessionCount");
const timerLabel    = document.getElementById("timerLabel");
const timerDigits   = document.getElementById("timerDigits");
const ringFill      = document.getElementById("ringFill");
const pomodoroBtn   = document.getElementById("pomodoroBtn");
const resetBtn      = document.getElementById("resetBtn");
const siteInput     = document.getElementById("siteInput");
const addSiteBtn    = document.getElementById("addSiteBtn");
const sitesList     = document.getElementById("sitesList");

// Total circumference of the SVG ring (2 * π * r = 2 * π * 52 ≈ 327)
const RING_CIRCUMFERENCE = 327;
const WORK_DURATION = 25 * 60; // seconds
const BREAK_DURATION = 5 * 60; // seconds

// Interval handle for the live countdown
let countdownInterval = null;

// ── Utility: send a message to the service worker ──────────
function sendMsg(payload) {
  return chrome.runtime.sendMessage(payload);
}

// ── Utility: format seconds → "MM:SS" ──────────────────────
function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Update the SVG ring progress ───────────────────────────
// progress: 0.0 (empty) → 1.0 (full)
function setRingProgress(progress) {
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  ringFill.style.strokeDashoffset = offset;
}

// ── Render the blocked sites list ──────────────────────────
function renderSites(sites) {
  sitesList.innerHTML = ""; // Clear existing

  if (sites.length === 0) {
    sitesList.innerHTML = `<li class="empty-msg">No sites blocked yet.</li>`;
    return;
  }

  sites.forEach((site, index) => {
    const li = document.createElement("li");
    li.className = "site-item";
    li.innerHTML = `
      <span class="site-favicon">🌐</span>
      <span class="site-name">${site}</span>
      <button class="remove-btn" data-index="${index}" title="Remove ${site}">✕</button>
    `;
    sitesList.appendChild(li);
  });

  // Attach remove handlers (event delegation on each button)
  sitesList.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => removeSite(parseInt(btn.dataset.index)));
  });
}

// ── Add a new site to the block list ───────────────────────
async function addSite() {
  let value = siteInput.value.trim().toLowerCase();

  // Strip http(s):// and trailing paths
  value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!value || !value.includes(".")) {
    siteInput.classList.add("shake");
    setTimeout(() => siteInput.classList.remove("shake"), 400);
    return;
  }

  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");

  if (blockedSites.includes(value)) {
    siteInput.value = "";
    return; // Already blocked
  }

  const updated = [...blockedSites, value];
  await sendMsg({ action: "updateSites", sites: updated });

  siteInput.value = "";
  renderSites(updated);
}

// ── Remove a site by its list index ────────────────────────
async function removeSite(index) {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  const updated = blockedSites.filter((_, i) => i !== index);
  await sendMsg({ action: "updateSites", sites: updated });
  renderSites(updated);
}

// ── Update focus toggle UI ──────────────────────────────────
function setFocusUI(isActive) {
  focusToggle.checked = isActive;
  focusStatus.textContent = isActive
    ? "Distraction blocking is ON 🔒"
    : "Distraction blocking is OFF";
  focusStatus.style.color = isActive ? "var(--accent)" : "var(--text-muted)";
}

// ── Start the live countdown display ───────────────────────
function startCountdown(endTime, totalDuration) {
  clearInterval(countdownInterval);

  function tick() {
    const remaining = Math.floor((endTime - Date.now()) / 1000);

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      timerDigits.textContent = "00:00";
      setRingProgress(0);
      
      // Give background script a tiny moment to update storage then re-sync UI
      setTimeout(() => {
        init();
      }, 500);
      return;
    }

    timerDigits.textContent = formatTime(remaining);
    setRingProgress(remaining / totalDuration);
  }

  tick(); // Immediately render, then every second
  countdownInterval = setInterval(tick, 1000);
}

// ── Sync the Pomodoro UI from stored state ─────────────────
function syncPomodoroUI(state) {
  const { pomodoroState, pomodoroEndTime } = state;

  if (pomodoroState === "work") {
    timerLabel.textContent = "FOCUS";
    timerLabel.style.color = "var(--accent)";
    pomodoroBtn.style.display = "none";
    resetBtn.style.display = "inline-flex";
    ringFill.style.stroke = "var(--accent)";
    startCountdown(pomodoroEndTime, WORK_DURATION);

  } else if (pomodoroState === "break") {
    timerLabel.textContent = "BREAK";
    timerLabel.style.color = "#4ade80"; // green
    pomodoroBtn.style.display = "none";
    resetBtn.style.display = "inline-flex";
    ringFill.style.stroke = "#4ade80";
    startCountdown(pomodoroEndTime, BREAK_DURATION);

  } else {
    // idle
    timerLabel.textContent = "READY";
    timerLabel.style.color = "var(--text-muted)";
    timerDigits.textContent = "25:00";
    pomodoroBtn.style.display = "inline-flex";
    resetBtn.style.display = "none";
    setRingProgress(1); // Full ring = ready to go
    clearInterval(countdownInterval);
  }
}

// ── Event: toggle focus mode ────────────────────────────────
focusToggle.addEventListener("change", async () => {
  const active = focusToggle.checked;
  await sendMsg({ action: "setFocusActive", active });
  setFocusUI(active);
});

// ── Event: start Pomodoro ───────────────────────────────────
pomodoroBtn.addEventListener("click", async () => {
  const response = await sendMsg({ action: "startPomodoro" });
  if (response.ok) {
    syncPomodoroUI({ pomodoroState: "work", pomodoroEndTime: response.endTime });
    setFocusUI(true);
  }
});

// ── Event: stop / reset Pomodoro ───────────────────────────
resetBtn.addEventListener("click", async () => {
  await sendMsg({ action: "stopPomodoro" });
  syncPomodoroUI({ pomodoroState: "idle" });
  setFocusUI(false);
});

// ── Event: add site via button ──────────────────────────────
addSiteBtn.addEventListener("click", addSite);

// ── Event: add site via Enter key ──────────────────────────
siteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

// ── INIT: load all state when popup opens ──────────────────
async function init() {
  const state = await sendMsg({ action: "getState" });

  // Render blocked sites
  renderSites(state.blockedSites || []);

  // Render focus toggle
  setFocusUI(state.focusActive || false);

  // Render session counter
  sessionCount.textContent = state.sessionCount || 0;

  // Render Pomodoro timer
  syncPomodoroUI(state);
}

init();
