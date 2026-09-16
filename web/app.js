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
const STORAGE_DIFFICULTY_PREFS_KEY = "10mtf:difficulty-prefs";
const STORAGE_VARIANT_PREFIX = "10mtf:variant:";
const STORAGE_COMPLETIONS_KEY = "10mtf:completions";

const PERCENT_TOTAL = 100;
const FREQUENCY_STEP = 5;
const DEFAULT_WEIGHTS = { endurance: 25, muscu: 25, souplesse: 25, combat: 25 };

const MAX_DIFFICULTY = 4;
const MIN_DIFFICULTY = 1;
const DEFAULT_TARGET_DIFFICULTY = 2;
const DEFAULT_DIFFICULTY_PREFS = {
  endurance: DEFAULT_TARGET_DIFFICULTY,
  muscu: DEFAULT_TARGET_DIFFICULTY,
  souplesse: DEFAULT_TARGET_DIFFICULTY,
  combat: DEFAULT_TARGET_DIFFICULTY,
};
const STATS_WINDOW_DAYS = 14;

/* -------------------------------------------------------------------------
 * Utilitaires : date, RNG déterministe par jour, stockage local
 * ---------------------------------------------------------------------- */
function todayIso() {
  return isoFromDate(new Date());
}

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso, delta) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return isoFromDate(d);
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

/**
 * Arrondit un jeu de valeurs (une par catégorie) en entiers dont la somme
 * fait exactement 100, par la méthode du plus grand reste (même principe
 * que computeQuotas, mais pour des pourcentages plutôt que des créneaux).
 */
function roundPercentTotal(values) {
  const floors = {};
  let assigned = 0;
  const items = CATEGORIES.map((cat) => {
    const v = Math.max(0, values[cat] || 0);
    const floor = Math.floor(v);
    floors[cat] = floor;
    assigned += floor;
    return { cat, frac: v - floor };
  });
  let remaining = PERCENT_TOTAL - assigned;
  const ordered = items.slice().sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remaining; i++) {
    floors[ordered[i % ordered.length].cat]++;
  }
  return floors;
}

/**
 * Ramène un jeu de poids quelconque (y compris d'anciennes préférences en
 * points 0..3) à des pourcentages entiers dont la somme fait 100.
 */
function normalizeToPercent(weights) {
  const total = CATEGORIES.reduce((sum, cat) => sum + Math.max(0, weights[cat] || 0), 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  const scaled = {};
  CATEGORIES.forEach((cat) => {
    scaled[cat] = (Math.max(0, weights[cat] || 0) / total) * PERCENT_TOTAL;
  });
  return roundPercentTotal(scaled);
}

function getPreferences() {
  const stored = readJson(STORAGE_PREFS_KEY, null);
  if (!stored) return { ...DEFAULT_WEIGHTS };
  // merge avec les défauts (nouvelle catégorie) puis normalise en % (migre
  // aussi d'anciennes préférences enregistrées en points 0..3)
  return normalizeToPercent({ ...DEFAULT_WEIGHTS, ...stored });
}

function savePreferences(weights) {
  writeJson(STORAGE_PREFS_KEY, weights);
}

function getDifficultyPreferences() {
  const stored = readJson(STORAGE_DIFFICULTY_PREFS_KEY, null);
  if (!stored) return { ...DEFAULT_DIFFICULTY_PREFS };
  return { ...DEFAULT_DIFFICULTY_PREFS, ...stored };
}

function saveDifficultyPreferences(targets) {
  writeJson(STORAGE_DIFFICULTY_PREFS_KEY, targets);
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
 * Complétions (pour l'écran Stats) : score du jour = somme des difficultés
 * des exercices d'un entraînement effectivement terminé. Un jour sans
 * entraînement terminé vaut 0.
 * ---------------------------------------------------------------------- */
function getCompletions() {
  return readJson(STORAGE_COMPLETIONS_KEY, {}); // { "2026-09-10": { score, count } }
}

function recordCompletion(date, exercises) {
  const completions = getCompletions();
  const score = exercises.reduce((sum, e) => sum + (e.difficulty || 0), 0);
  completions[date] = { score, count: exercises.length };
  writeJson(STORAGE_COMPLETIONS_KEY, completions);
}

function getStatsSeries(days) {
  const completions = getCompletions();
  const today = todayIso();
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDaysIso(today, -i);
    series.push({ date, score: completions[date] ? completions[date].score : 0 });
  }
  return series;
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

/**
 * Choisit `count` exercices dans une catégorie : priorité aux exercices non
 * utilisés récemment (comme avant), puis parmi ceux-là (et parmi les
 * "récents" si on doit y puiser faute d'assez de frais) on préfère ceux dont
 * la difficulté est la plus proche du niveau cible réglé dans les paramètres.
 */
function pickForCategory(category, count, recentIds, random, targetDifficulty) {
  const all = exercisesByCategory(category);
  const rankByDifficulty = (list) =>
    seededShuffle(list, random).sort(
      (a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty),
    );
  const fresh = rankByDifficulty(all.filter((e) => !recentIds.has(e.id)));
  const stale = rankByDifficulty(all.filter((e) => recentIds.has(e.id)));
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
  const difficultyTargets = getDifficultyPreferences();
  const quotas = computeQuotas(weights, random);

  let selected = [];
  for (const category of CATEGORIES) {
    selected = selected.concat(
      pickForCategory(category, quotas[category], recentIds, random, difficultyTargets[category]),
    );
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
  stats: document.getElementById("stats-screen"),
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

function difficultyGaugeHtml(level) {
  const bars = [1, 2, 3, 4]
    .map((n) => `<span class="diff-bar${n <= level ? " filled" : ""}"></span>`)
    .join("");
  return `<span class="diff-gauge" role="img" aria-label="Difficulté ${level} sur 4">${bars}</span>`;
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
        <div class="home-row-meta">
          <span class="home-row-category">${CATEGORY_META[exercise.category].label}</span>
          ${difficultyGaugeHtml(exercise.difficulty)}
        </div>
      </div>
    `;
    list.appendChild(li);
  });
}

/* ---- Écran paramètres (radar de préférences) ---- */
let draftWeights = getPreferences();
let draftDifficulty = getDifficultyPreferences();

function openSettings() {
  draftWeights = getPreferences();
  draftDifficulty = getDifficultyPreferences();
  renderSettings();
  showScreen("settings");
}

/**
 * Ajuste la fréquence (en %) d'une catégorie et répartit la différence sur
 * les 3 autres au prorata de leur part actuelle, pour que le total des 4
 * catégories fasse toujours 100%.
 */
function adjustFrequency(category, delta) {
  const current = draftWeights[category] || 0;
  const target = Math.min(PERCENT_TOTAL, Math.max(0, current + delta));
  const appliedDelta = target - current;
  if (appliedDelta === 0) return;

  const others = CATEGORIES.filter((cat) => cat !== category);
  const othersTotal = others.reduce((sum, cat) => sum + (draftWeights[cat] || 0), 0);
  const toDistribute = -appliedDelta;

  const next = { ...draftWeights, [category]: target };
  if (othersTotal > 0) {
    others.forEach((cat) => {
      const w = draftWeights[cat] || 0;
      next[cat] = Math.max(0, w + (toDistribute * w) / othersTotal);
    });
  } else {
    const share = toDistribute / others.length;
    others.forEach((cat) => {
      next[cat] = Math.max(0, share);
    });
  }

  draftWeights = roundPercentTotal(next);
  renderSettings();
}

function setTargetDifficulty(category, level) {
  draftDifficulty = { ...draftDifficulty, [category]: level };
  renderSettings();
}

function saveSettings() {
  savePreferences(draftWeights);
  saveDifficultyPreferences(draftDifficulty);
  todayWorkout = generateWorkout(todayIso(), { force: true });
  renderHome();
  showScreen("home");
}

function difficultyGaugeInputHtml(category, level) {
  const bars = [1, 2, 3, 4]
    .map(
      (n) => `
      <button type="button" class="diff-gauge-input-bar${n <= level ? " filled" : ""}"
        data-cat="${category}" data-level="${n}"
        aria-label="Régler la difficulté de ${CATEGORY_META[category].label} à ${n} sur 4"></button>
    `,
    )
    .join("");
  return `<div class="diff-gauge-input">${bars}</div>`;
}

function renderSettings() {
  const rows = document.getElementById("settings-rows");
  rows.innerHTML = "";
  CATEGORIES.forEach((category) => {
    const meta = CATEGORY_META[category];
    const value = draftWeights[category] || 0;
    const targetDifficulty = draftDifficulty[category] || DEFAULT_TARGET_DIFFICULTY;
    const card = document.createElement("div");
    card.className = "settings-card";
    card.innerHTML = `
      <div class="settings-card-head">
        ${pastilleHtml(category)}
        <span class="settings-row-label">${meta.label}</span>
      </div>
      <div class="settings-control-row">
        <span class="settings-control-label">Fréquence</span>
        <div class="stepper">
          <button type="button" class="stepper-btn" data-action="dec" data-cat="${category}" aria-label="Diminuer la fréquence de ${meta.label}">−</button>
          <span class="stepper-value">${value}%</span>
          <button type="button" class="stepper-btn" data-action="inc" data-cat="${category}" aria-label="Augmenter la fréquence de ${meta.label}">+</button>
        </div>
      </div>
      <div class="settings-control-row">
        <span class="settings-control-label">Difficulté</span>
        ${difficultyGaugeInputHtml(category, targetDifficulty)}
      </div>
    `;
    rows.appendChild(card);
  });

  rows.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = btn.dataset.action === "inc" ? FREQUENCY_STEP : -FREQUENCY_STEP;
      adjustFrequency(btn.dataset.cat, delta);
    });
  });

  rows.querySelectorAll(".diff-gauge-input-bar").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTargetDifficulty(btn.dataset.cat, Number(btn.dataset.level));
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
    const radius = (value / PERCENT_TOTAL) * maxRadius;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  let svgContent = "";

  // Anneaux de fond (échelle 0..100%, par pas de 25%)
  const ringStep = 25;
  for (let ring = ringStep; ring <= PERCENT_TOTAL; ring += ringStep) {
    const points = CATEGORIES.map((_, i) => pointFor(i, ring).join(",")).join(" ");
    svgContent += `<polygon points="${points}" class="radar-ring" />`;
  }

  // Axes
  CATEGORIES.forEach((_, i) => {
    const [x, y] = pointFor(i, PERCENT_TOTAL);
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
    const [x, y] = pointFor(i, PERCENT_TOTAL + 22);
    svgContent += `<text x="${x}" y="${y}" class="radar-label" text-anchor="middle" dominant-baseline="middle">${CATEGORY_META[cat].emoji}</text>`;
  });

  svg.innerHTML = svgContent;
}

/* ---- Écran Stats ---- */
function openStats() {
  renderStats();
  showScreen("stats");
}

function renderStats() {
  const series = getStatsSeries(STATS_WINDOW_DAYS);
  const scores = series.map((s) => s.score);

  const today = scores[scores.length - 1];
  const best = Math.max(...scores, 0);
  let streak = 0;
  for (let i = scores.length - 1; i >= 0 && scores[i] > 0; i--) streak++;

  document.getElementById("stats-today").textContent = today;
  document.getElementById("stats-best").textContent = best;
  document.getElementById("stats-streak").textContent = streak;

  renderStatsChart(series);
}

function renderStatsChart(series) {
  const svg = document.getElementById("stats-svg");
  const width = 320;
  const height = 180;
  const padLeft = 10;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 26;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const maxScore = WORKOUT_SIZE * MAX_DIFFICULTY; // plafond fixe (40) : un entraînement "parfait" en difficulté
  const stepX = plotWidth / (series.length - 1);

  const xFor = (i) => padLeft + i * stepX;
  const yFor = (score) => padTop + plotHeight - (Math.min(score, maxScore) / maxScore) * plotHeight;

  let svgContent = "";

  // Grille horizontale (0%, 50%, 100% du score max théorique)
  [0, 0.5, 1].forEach((frac) => {
    const y = padTop + plotHeight - frac * plotHeight;
    svgContent += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="stats-grid" />`;
  });

  const linePoints = series.map((s, i) => `${xFor(i)},${yFor(s.score)}`).join(" ");
  const areaPoints = `${xFor(0)},${yFor(0)} ${linePoints} ${xFor(series.length - 1)},${yFor(0)}`;
  svgContent += `<polygon points="${areaPoints}" class="stats-area" />`;
  svgContent += `<polyline points="${linePoints}" class="stats-line" />`;

  series.forEach((s, i) => {
    const isToday = i === series.length - 1;
    svgContent += `<circle cx="${xFor(i)}" cy="${yFor(s.score)}" r="${isToday ? 4 : 2.5}" class="stats-dot${isToday ? " stats-dot-today" : ""}" />`;
  });

  series.forEach((s, i) => {
    const isLast = i === series.length - 1;
    const showLabel = isLast || (i % 3 === 0 && i < series.length - 2);
    if (!showLabel) return;
    const d = new Date(s.date + "T00:00:00");
    const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" });
    svgContent += `<text x="${xFor(i)}" y="${height - 6}" class="stats-axis-label" text-anchor="middle">${label}</text>`;
  });

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = svgContent;
}

/* ---- Écran d'entraînement (player) ---- */
let session = null; // { index, phase, secondsLeft, timerHandle, paused }

function startWorkout() {
  unlockAudioForMobile();
  session = { index: 0, phase: "work", secondsLeft: WORK_SECONDS, paused: false };
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

function togglePause() {
  if (!session) return;
  if (session.paused) resumeWorkout();
  else pauseWorkout();
}

function pauseWorkout() {
  if (!session || session.paused) return;
  clearInterval(session.timerHandle);
  session.timerHandle = null;
  session.paused = true;
  if ("speechSynthesis" in window) window.speechSynthesis.pause();
  renderPlayer();
}

function resumeWorkout() {
  if (!session || !session.paused) return;
  session.paused = false;
  if ("speechSynthesis" in window) window.speechSynthesis.resume();
  session.timerHandle = setInterval(tick, 1000);
  renderPlayer();
}

function tick() {
  if (!session || session.paused) return;
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
  root.classList.toggle("paused", session.paused);

  document.getElementById("player-progress").textContent =
    `Exercice ${session.index + 1} / ${todayWorkout.length}`;

  const pastille = document.getElementById("player-pastille");
  pastille.className = `pastille pastille-large pastille-${exercise.category}`;
  pastille.textContent = CATEGORY_META[exercise.category].emoji;

  document.getElementById("player-name").textContent = exercise.name;
  document.getElementById("player-meta").innerHTML = `
    <span class="player-category">${CATEGORY_META[exercise.category].label}</span>
    ${difficultyGaugeHtml(exercise.difficulty)}
  `;
  document.getElementById("player-description").textContent = exercise.description;
  document.getElementById("player-phase-label").textContent = session.paused
    ? "EN PAUSE"
    : session.phase === "work"
      ? "INTENSE"
      : "RÉCUP";
  document.getElementById("player-seconds").textContent = session.secondsLeft;

  const pauseButton = document.getElementById("pause-button");
  pauseButton.textContent = session.paused ? "▶ Reprendre" : "⏸ Pause";

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

  recordCompletion(todayIso(), todayWorkout);

  const list = document.getElementById("summary-list");
  list.innerHTML = "";
  let totalScore = 0;
  todayWorkout.forEach((exercise) => {
    totalScore += exercise.difficulty || 0;
    const li = document.createElement("li");
    li.className = "summary-row";
    li.innerHTML = `${pastilleHtml(exercise.category)}<span class="summary-row-name">${exercise.name}</span>${difficultyGaugeHtml(exercise.difficulty)}`;
    list.appendChild(li);
  });
  document.getElementById("summary-score").textContent = totalScore;

  showScreen("summary");
}

/* -------------------------------------------------------------------------
 * Câblage des boutons
 * ---------------------------------------------------------------------- */
document.getElementById("start-button").addEventListener("click", startWorkout);
document.getElementById("quit-button").addEventListener("click", quitWorkout);
document.getElementById("pause-button").addEventListener("click", togglePause);
document.getElementById("restart-button").addEventListener("click", () => {
  showScreen("home");
  renderHome();
});
document.getElementById("regenerate-button").addEventListener("click", regenerateWorkout);
document.getElementById("settings-button").addEventListener("click", openSettings);
document.getElementById("settings-back-button").addEventListener("click", () => showScreen("home"));
document.getElementById("settings-save-button").addEventListener("click", saveSettings);
document.getElementById("stats-button").addEventListener("click", openStats);
document.getElementById("stats-back-button").addEventListener("click", () => showScreen("home"));

renderHome();
showScreen("home");
