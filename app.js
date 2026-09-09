"use strict";

/* -------------------------------------------------------------------------
 * Constantes
 * ---------------------------------------------------------------------- */
const WORK_SECONDS = 50;
const REST_SECONDS = 10;
const WORK_WARNING_WINDOW = 5; // bip chaque seconde durant les 5 dernières secondes d'effort
const REST_WARNING_WINDOW = 3; // bip chaque seconde durant les 3 dernières secondes de récup
const WORKOUT_SIZE = 10;
const HISTORY_DAYS = 6; // nb de jours d'historique pris en compte pour éviter les répétitions

const CATEGORY_META = {
  muscu: { emoji: "💪", label: "Muscu", color: "#e63946" },
  endurance: { emoji: "🌬️", label: "Endurance", color: "#1d6fd6" },
  combat: { emoji: "👊", label: "Combat", color: "#111111" },
  souplesse: { emoji: "🧘‍♂️", label: "Souplesse", color: "#2a9d4f" },
};
const CATEGORIES = Object.keys(CATEGORY_META);

const STORAGE_WORKOUT_PREFIX = "10mtf:workout:";
const STORAGE_HISTORY_KEY = "10mtf:history";

/* -------------------------------------------------------------------------
 * Utilitaires : date, RNG déterministe par jour, stockage local
 * ---------------------------------------------------------------------- */
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashSeed(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible (navigation privée...) : tant pis, pas bloquant */
  }
}

function getHistory() {
  return readJson(STORAGE_HISTORY_KEY, []); // [{date, ids: [...]}]
}

function recordHistory(date, ids) {
  const history = getHistory().filter((entry) => entry.date !== date);
  history.push({ date, ids });
  history.sort((a, b) => (a.date < b.date ? -1 : 1));
  writeJson(STORAGE_HISTORY_KEY, history.slice(-14));
}

function getRecentIds(beforeDate) {
  const history = getHistory()
    .filter((entry) => entry.date < beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, HISTORY_DAYS);
  const seen = new Set();
  for (const entry of history) for (const id of entry.ids) seen.add(id);
  return seen;
}

/* -------------------------------------------------------------------------
 * Génération de l'entraînement du jour
 * ---------------------------------------------------------------------- */
function exercisesByCategory(category) {
  return EXERCISES.filter((e) => e.category === category);
}

function pickQuotas(random) {
  const quotas = { muscu: 2, endurance: 2, combat: 2, souplesse: 2 };
  let remaining = WORKOUT_SIZE - CATEGORIES.length * 2;
  while (remaining > 0) {
    const cat = CATEGORIES[Math.floor(random() * CATEGORIES.length)];
    quotas[cat]++;
    remaining--;
  }
  return quotas;
}

function pickForCategory(category, count, recentIds, random) {
  const all = exercisesByCategory(category);
  const fresh = seededShuffle(all.filter((e) => !recentIds.has(e.id)), random);
  const stale = seededShuffle(all.filter((e) => recentIds.has(e.id)), random);
  return [...fresh, ...stale].slice(0, count);
}

function generateWorkout(date) {
  const cached = readJson(STORAGE_WORKOUT_PREFIX + date, null);
  if (cached) return cached;

  const random = mulberry32(hashSeed(date));
  const recentIds = getRecentIds(date);
  const quotas = pickQuotas(random);

  let selected = [];
  for (const category of CATEGORIES) {
    selected = selected.concat(pickForCategory(category, quotas[category], recentIds, random));
  }
  const workout = seededShuffle(selected, random);

  writeJson(STORAGE_WORKOUT_PREFIX + date, workout);
  recordHistory(date, workout.map((e) => e.id));
  return workout;
}

/* -------------------------------------------------------------------------
 * Son : bips synthétisés (Web Audio) + annonces vocales (Web Speech)
 * ---------------------------------------------------------------------- */
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(frequency, durationMs, volume) {
  const ctx = ensureAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  osc.connect(gain).connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

function beepNormal() {
  beep(523, 120, 0.28); // do5
}
function beepSharp() {
  beep(1046, 220, 0.32); // do6, dernière seconde
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "fr-FR";
  utter.rate = 1.02;
  window.speechSynthesis.speak(utter);
}

function unlockAudioForMobile() {
  // Doit être appelé depuis un vrai geste utilisateur (tap sur "Démarrer")
  // pour débloquer AudioContext et speechSynthesis sur iOS Safari.
  ensureAudioCtx();
  if ("speechSynthesis" in window) {
    const primer = new SpeechSynthesisUtterance(" ");
    primer.volume = 0;
    window.speechSynthesis.speak(primer);
  }
}

/* -------------------------------------------------------------------------
 * État de l'appli et rendu des écrans
 * ---------------------------------------------------------------------- */
const screens = {
  home: document.getElementById("home-screen"),
  player: document.getElementById("player-screen"),
  summary: document.getElementById("summary-screen"),
};

function showScreen(name) {
  for (const key of Object.keys(screens)) {
    screens[key].classList.toggle("active", key === name);
  }
}

function pastilleHtml(category) {
  const meta = CATEGORY_META[category];
  return `<span class="pastille pastille-${category}" aria-hidden="true">${meta.emoji}</span>`;
}

/* ---- Écran d'accueil ---- */
let todayWorkout = [];

function renderHome() {
  const date = todayIso();
  todayWorkout = generateWorkout(date);

  document.getElementById("home-date").textContent = formatDateLong(date);

  const list = document.getElementById("home-exercise-list");
  list.innerHTML = "";
  todayWorkout.forEach((exercise, index) => {
    const li = document.createElement("li");
    li.className = "home-row";
    li.innerHTML = `
      ${pastilleHtml(exercise.category)}
      <div class="home-row-text">
        <span class="home-row-index">${index + 1}. ${exercise.name}</span>
        <span class="home-row-category">${CATEGORY_META[exercise.category].label}</span>
      </div>
    `;
    list.appendChild(li);
  });
}

function formatDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/* ---- Écran d'entraînement (player) ---- */
let session = null; // { index, phase, secondsLeft, timerHandle }

function startWorkout() {
  unlockAudioForMobile();
  session = { index: 0, phase: "work", secondsLeft: WORK_SECONDS };
  showScreen("player");
  renderPlayer();
  const first = todayWorkout[0];
  speak(`C'est parti ! Premier exercice : ${first.name}`);
  session.timerHandle = setInterval(tick, 1000);
}

function quitWorkout() {
  if (session && session.timerHandle) clearInterval(session.timerHandle);
  window.speechSynthesis && window.speechSynthesis.cancel();
  session = null;
  showScreen("home");
}

function tick() {
  if (!session) return;
  session.secondsLeft -= 1;
  const remaining = session.secondsLeft;

  if (remaining > 0) maybeBeep(remaining);
  renderPlayer();

  if (remaining <= 0) transitionPhase();
}

function maybeBeep(remaining) {
  const isWork = session.phase === "work";
  const window_ = isWork ? WORK_WARNING_WINDOW : REST_WARNING_WINDOW;
  if (remaining > window_) return;
  if (remaining === 1) beepSharp();
  else beepNormal();
}

function transitionPhase() {
  const isLastExercise = session.index === todayWorkout.length - 1;

  if (session.phase === "work") {
    session.phase = "rest";
    session.secondsLeft = REST_SECONDS;
    if (isLastExercise) {
      speak("Entraînement terminé, bravo !");
    } else {
      const next = todayWorkout[session.index + 1];
      speak(`Prochain exercice : ${next.name}`);
    }
    renderPlayer();
    return;
  }

  // Fin de la récupération
  if (isLastExercise) {
    finishWorkout();
    return;
  }
  session.index += 1;
  session.phase = "work";
  session.secondsLeft = WORK_SECONDS;
  renderPlayer();
}

function renderPlayer() {
  const exercise = todayWorkout[session.index];
  const root = document.getElementById("player-screen");
  root.classList.toggle("phase-work", session.phase === "work");
  root.classList.toggle("phase-rest", session.phase === "rest");

  document.getElementById("player-progress").textContent =
    `Exercice ${session.index + 1} / ${todayWorkout.length}`;

  const pastille = document.getElementById("player-pastille");
  pastille.className = `pastille pastille-large pastille-${exercise.category}`;
  pastille.textContent = CATEGORY_META[exercise.category].emoji;

  document.getElementById("player-name").textContent = exercise.name;
  document.getElementById("player-description").textContent = exercise.description;
  document.getElementById("player-phase-label").textContent =
    session.phase === "work" ? "INTENSE" : "RÉCUP";
  document.getElementById("player-seconds").textContent = session.secondsLeft;

  if (session.phase === "rest") {
    const isLastExercise = session.index === todayWorkout.length - 1;
    const nextEl = document.getElementById("player-next");
    nextEl.textContent = isLastExercise
      ? "Dernier effort, bravo !"
      : `Ensuite : ${todayWorkout[session.index + 1].name}`;
  } else {
    document.getElementById("player-next").textContent = "";
  }
}

/* ---- Écran de récapitulatif ---- */
function finishWorkout() {
  if (session && session.timerHandle) clearInterval(session.timerHandle);
  session = null;

  const list = document.getElementById("summary-list");
  list.innerHTML = "";
  todayWorkout.forEach((exercise) => {
    const li = document.createElement("li");
    li.className = "summary-row";
    li.innerHTML = `${pastilleHtml(exercise.category)}<span>${exercise.name}</span>`;
    list.appendChild(li);
  });

  showScreen("summary");
}

/* -------------------------------------------------------------------------
 * Câblage des boutons
 * ---------------------------------------------------------------------- */
document.getElementById("start-button").addEventListener("click", startWorkout);
document.getElementById("quit-button").addEventListener("click", quitWorkout);
document.getElementById("restart-button").addEventListener("click", () => {
  showScreen("home");
  renderHome();
});

renderHome();
showScreen("home");
