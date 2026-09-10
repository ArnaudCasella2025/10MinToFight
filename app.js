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
const STORAGE_PREFS_KEY = "10mtf:prefs";
const STORAGE_VARIANT_PREFIX = "10mtf:variant:";

const MAX_WEIGHT = 3;
const DEFAULT_WEIGHTS = { endurance: 1, muscu: 1, souplesse: 1, combat: 1 };

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

function getPreferences() {
  const stored = readJson(STORAGE_PREFS_KEY, null);
  if (!stored) return { ...DEFAULT_WEIGHTS };
  // merge with defaults so any new category added later doesn't end up undefined
  return { ...DEFAULT_WEIGHTS, ...stored };
}

function savePreferences(weights) {
  writeJson(STORAGE_PREFS_KEY, weights);
}

function getVariant(date) {
  return readJson(STORAGE_VARIANT_PREFIX + date, 0);
}

function bumpVariant(date) {
  const next = getVariant(date) + 1;
  writeJson(STORAGE_VARIANT_PREFIX + date, next);
  return next;
}

/* -------------------------------------------------------------------------
 * Génération de l'entraînement du jour
 * ---------------------------------------------------------------------- */
function exercisesByCategory(category) {
  return EXERCISES.filter((e) => e.category === category);
}

/**
 * Répartit les WORKOUT_SIZE exercices entre catégories proportionnellement aux
 * niveaux du radar (méthode du plus grand reste / Hamilton) : une catégorie à
 * 0 n'obtient jamais de créneau, et par ex. muscu=1 / combat=3 donne un ratio
 * 25% / 75% sur les 10 exercices.
 */
function computeQuotas(weights, random) {
  let totalWeight = CATEGORIES.reduce((sum, cat) => sum + (weights[cat] || 0), 0);
  const effectiveWeights = totalWeight > 0 ? weights : DEFAULT_WEIGHTS;
  if (totalWeight <= 0) totalWeight = CATEGORIES.length;

  const raw = CATEGORIES.map((cat) => {
    const w = effectiveWeights[cat] || 0;
    const exact = (w / totalWeight) * WORKOUT_SIZE;
    return { cat, w, floor: Math.floor(exact), frac: exact - Math.floor(exact) };
  });

  const quotas = {};
  let assigned = 0;
  for (const r of raw) {
    quotas[r.cat] = r.floor;
    assigned += r.floor;
  }

  let remaining = WORKOUT_SIZE - assigned;
  const candidates = seededShuffle(
    raw.filter((r) => r.w > 0),
    random,
  ).sort((a, b) => b.frac - a.frac || b.w - a.w);

  for (let i = 0; i < remaining && candidates.length > 0; i++) {
    quotas[candidates[i % candidates.length].cat]++;
  }
  return quotas;
}

function pickForCategory(category, count, recentIds, random) {
  const all = exercisesByCategory(category);
  const fresh = seededShuffle(all.filter((e) => !recentIds.has(e.id)), random);
  const stale = seededShuffle(all.filter((e) => recentIds.has(e.id)), random);
  return [...fresh, ...stale].slice(0, count);
}

function generateWorkout(date, { force = false } = {}) {
  if (!force) {
    const cached = readJson(STORAGE_WORKOUT_PREFIX + date, null);
    if (cached) return cached;
  }

  const variant = force ? bumpVariant(date) : getVariant(date);
  const random = mulberry32(hashSeed(`${date}:${variant}`));
  const recentIds = getRecentIds(date);
  const weights = getPreferences();
  const quotas = computeQuotas(weights, random);

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
  settings: document.getElementById("settings-screen"),
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
  renderHomeList();
}

function formatDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function regenerateWorkout() {
  const date = todayIso();
  todayWorkout = generateWorkout(date, { force: true });
  renderHomeList();
}

function renderHomeList() {
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

/* ---- Écran paramètres (radar de préférences) ---- */
let draftWeights = getPreferences();

function openSettings() {
  draftWeights = getPreferences();
  renderSettings();
  showScreen("settings");
}

function adjustWeight(category, delta) {
  const next = Math.min(MAX_WEIGHT, Math.max(0, (draftWeights[category] || 0) + delta));
  draftWeights = { ...draftWeights, [category]: next };
  renderSettings();
}

function saveSettings() {
  savePreferences(draftWeights);
  todayWorkout = generateWorkout(todayIso(), { force: true });
  renderHome();
  showScreen("home");
}

function renderSettings() {
  const rows = document.getElementById("settings-rows");
  rows.innerHTML = "";
  CATEGORIES.forEach((category) => {
    const meta = CATEGORY_META[category];
    const value = draftWeights[category] || 0;
    const row = document.createElement("div");
    row.className = "settings-row";
    row.innerHTML = `
      ${pastilleHtml(category)}
      <span class="settings-row-label">${meta.label}</span>
      <div class="stepper">
        <button type="button" class="stepper-btn" data-action="dec" data-cat="${category}" aria-label="Diminuer ${meta.label}">−</button>
        <span class="stepper-value">${value}</span>
        <button type="button" class="stepper-btn" data-action="inc" data-cat="${category}" aria-label="Augmenter ${meta.label}">+</button>
      </div>
    `;
    rows.appendChild(row);
  });

  rows.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = btn.dataset.action === "inc" ? 1 : -1;
      adjustWeight(btn.dataset.cat, delta);
    });
  });

  renderRadar(draftWeights);
}

function renderRadar(weights) {
  const svg = document.getElementById("radar-svg");
  const cx = 120;
  const cy = 120;
  const maxRadius = 88;
  const axisCount = CATEGORIES.length;

  function pointFor(index, value) {
    const angle = -Math.PI / 2 + index * ((2 * Math.PI) / axisCount);
    const radius = (value / MAX_WEIGHT) * maxRadius;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  let svgContent = "";

  // Anneaux de fond (échelle 0..MAX_WEIGHT)
  for (let ring = 1; ring <= MAX_WEIGHT; ring++) {
    const points = CATEGORIES.map((_, i) => pointFor(i, ring).join(",")).join(" ");
    svgContent += `<polygon points="${points}" class="radar-ring" />`;
  }

  // Axes
  CATEGORIES.forEach((_, i) => {
    const [x, y] = pointFor(i, MAX_WEIGHT);
    svgContent += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="radar-axis" />`;
  });

  // Polygone des valeurs actuelles
  const valuePoints = CATEGORIES.map((cat, i) => pointFor(i, weights[cat] || 0).join(",")).join(" ");
  svgContent += `<polygon points="${valuePoints}" class="radar-shape" />`;
  CATEGORIES.forEach((cat, i) => {
    const [x, y] = pointFor(i, weights[cat] || 0);
    svgContent += `<circle cx="${x}" cy="${y}" r="4" class="radar-dot radar-dot-${cat}" />`;
  });

  // Labels (emoji) au-delà de l'anneau externe
  CATEGORIES.forEach((cat, i) => {
    const [x, y] = pointFor(i, MAX_WEIGHT + 0.65);
    svgContent += `<text x="${x}" y="${y}" class="radar-label" text-anchor="middle" dominant-baseline="middle">${CATEGORY_META[cat].emoji}</text>`;
  });

  svg.innerHTML = svgContent;
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
document.getElementById("regenerate-button").addEventListener("click", regenerateWorkout);
document.getElementById("settings-button").addEventListener("click", openSettings);
document.getElementById("settings-back-button").addEventListener("click", () => showScreen("home"));
document.getElementById("settings-save-button").addEventListener("click", saveSettings);

renderHome();
showScreen("home");
