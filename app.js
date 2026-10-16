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
// Couleurs utilisées pour les courbes/barres de l'écran Stats : identiques aux
// pastilles, sauf combat (noir) remplacé par une teinte claire pour rester
// visible sur fond sombre.
const CATEGORY_CHART_COLOR = {
  muscu: "#e63946",
  endurance: "#2f7de0",
  combat: "#f4f5f7",
  souplesse: "#2a9d4f",
};

const STORAGE_WORKOUT_PREFIX = "10mtf:workout:";
const STORAGE_HISTORY_KEY = "10mtf:history";
const STORAGE_PREFS_KEY = "10mtf:prefs";
const STORAGE_DIFFICULTY_PREFS_KEY = "10mtf:difficulty-prefs";
const STORAGE_DIFFICULTY_RANDOM_KEY = "10mtf:difficulty-random";
const STORAGE_INJURIES_KEY = "10mtf:injuries";
const STORAGE_MUSCLE_FOCUS_KEY = "10mtf:muscle-focus";
const STORAGE_VARIANT_PREFIX = "10mtf:variant:";
const STORAGE_COMPLETIONS_KEY = "10mtf:completions";

const PERCENT_TOTAL = 100;
const FREQUENCY_STEP = 5;
const DEFAULT_WEIGHTS = { endurance: 25, muscu: 25, souplesse: 25, combat: 25 };

const MAX_DIFFICULTY = 4;
const MIN_DIFFICULTY = 1;
const DEFAULT_TARGET_DIFFICULTY = 2;
// Poids relatif d'un exercice à distance D du niveau cible = DECAY^-D : plus D
// grandit, plus l'exercice devient rare sans jamais être strictement exclu
// (niveau visé = majoritaire, ±1 = fréquent, ±2 = rare, ±3 = extrêmement rare).
const DIFFICULTY_WEIGHT_DECAY = 4;
const DEFAULT_DIFFICULTY_PREFS = {
  endurance: DEFAULT_TARGET_DIFFICULTY,
  muscu: DEFAULT_TARGET_DIFFICULTY,
  souplesse: DEFAULT_TARGET_DIFFICULTY,
  combat: DEFAULT_TARGET_DIFFICULTY,
};
// true = difficulté tirée au hasard pour cette catégorie (jauge ignorée)
const DEFAULT_DIFFICULTY_RANDOM = { endurance: false, muscu: false, souplesse: false, combat: false };

const BODY_PARTS = [
  { id: "genoux", label: "Genoux", emoji: "🦵" },
  { id: "chevilles", label: "Chevilles", emoji: "🦶" },
  { id: "hanches", label: "Hanches", emoji: "🦴" },
  { id: "lombaires", label: "Lombaires", emoji: "🔻" },
  { id: "cervicales", label: "Cervicales", emoji: "🧠" },
  { id: "epaules", label: "Épaules", emoji: "💪" },
  { id: "coudes", label: "Coudes", emoji: "🦾" },
  { id: "poignets", label: "Poignets", emoji: "✋" },
];
const MUSCLES = [
  { id: "abdominaux", label: "Abdominaux" },
  { id: "obliques", label: "Obliques" },
  { id: "fessiers", label: "Fessiers" },
  { id: "quadriceps", label: "Quadriceps" },
  { id: "ischio-jambiers", label: "Ischio-jambiers" },
  { id: "adducteurs", label: "Adducteurs" },
  { id: "mollets", label: "Mollets" },
  { id: "pectoraux", label: "Pectoraux" },
  { id: "dos", label: "Dos" },
  { id: "epaules", label: "Épaules" },
  { id: "bras", label: "Bras" },
  { id: "hanches", label: "Hanches" },
];
// Multiplicateur de poids appliqué à un exercice qui cible un muscle choisi en
// "focus" dans les paramètres — préférence, pas une exclusion stricte.
const MUSCLE_FOCUS_BOOST = 3;

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

function getDifficultyRandomPreferences() {
  const stored = readJson(STORAGE_DIFFICULTY_RANDOM_KEY, null);
  if (!stored) return { ...DEFAULT_DIFFICULTY_RANDOM };
  return { ...DEFAULT_DIFFICULTY_RANDOM, ...stored };
}

function saveDifficultyRandomPreferences(flags) {
  writeJson(STORAGE_DIFFICULTY_RANDOM_KEY, flags);
}

function getInjuries() {
  return readJson(STORAGE_INJURIES_KEY, []);
}

function saveInjuries(bodyPartIds) {
  writeJson(STORAGE_INJURIES_KEY, bodyPartIds);
}

function getMuscleFocus() {
  return readJson(STORAGE_MUSCLE_FOCUS_KEY, []);
}

function saveMuscleFocus(muscleIds) {
  writeJson(STORAGE_MUSCLE_FOCUS_KEY, muscleIds);
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
 * entraînement terminé vaut 0. `categories` compte, pour ce jour-là, combien
 * d'exercices de chaque discipline ont été faits.
 * ---------------------------------------------------------------------- */
function getCompletions() {
  return readJson(STORAGE_COMPLETIONS_KEY, {}); // { "2026-09-10": { score, count, categories } }
}

function recordCompletion(date, exercises) {
  const completions = getCompletions();
  const score = exercises.reduce((sum, e) => sum + (e.difficulty || 0), 0);
  const categories = {};
  CATEGORIES.forEach((cat) => {
    categories[cat] = 0;
  });
  exercises.forEach((e) => {
    categories[e.category] = (categories[e.category] || 0) + 1;
  });
  completions[date] = { score, count: exercises.length, categories };
  writeJson(STORAGE_COMPLETIONS_KEY, completions);
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** Compte par discipline, jour par jour, pour un mois donné (month = 0..11). */
function getMonthSeries(year, month) {
  const completions = getCompletions();
  const numDays = daysInMonth(year, month);
  const series = [];
  for (let day = 1; day <= numDays; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = completions[date];
    const categories = {};
    CATEGORIES.forEach((cat) => {
      categories[cat] = entry && entry.categories ? entry.categories[cat] || 0 : 0;
    });
    series.push({ date, day, categories, total: entry ? entry.count || 0 : 0 });
  }
  return series;
}

function getCurrentStreak() {
  const completions = getCompletions();
  let streak = 0;
  let d = todayIso();
  while (completions[d] && completions[d].count > 0) {
    streak++;
    d = addDaysIso(d, -1);
  }
  return streak;
}

function getBestStreak() {
  const completions = getCompletions();
  const dates = Object.keys(completions)
    .filter((d) => completions[d] && completions[d].count > 0)
    .sort();
  if (dates.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    current = addDaysIso(dates[i - 1], 1) === dates[i] ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}

function getAllTimeTotals() {
  const completions = getCompletions();
  const totals = { workouts: 0, exercises: 0, score: 0, categories: {} };
  CATEGORIES.forEach((cat) => {
    totals.categories[cat] = 0;
  });
  Object.values(completions).forEach((entry) => {
    if (!entry || !entry.count) return;
    totals.workouts += 1;
    totals.exercises += entry.count;
    totals.score += entry.score || 0;
    const cats = entry.categories || {};
    CATEGORIES.forEach((cat) => {
      totals.categories[cat] += cats[cat] || 0;
    });
  });
  return totals;
}

/* -------------------------------------------------------------------------
 * Génération de l'entraînement du jour
 * ---------------------------------------------------------------------- */
function hasIntersection(a, b) {
  return a.some((x) => b.includes(x));
}

function exercisesByCategory(category, injuries) {
  const all = EXERCISES.filter((e) => e.category === category);
  if (!injuries || injuries.length === 0) return all;
  return all.filter((e) => !hasIntersection(e.bodyParts, injuries));
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
 * Tire, sans remise, `count` exercices d'une liste : chacun a une chance
 * proportionnelle à DIFFICULTY_WEIGHT_DECAY^-|difficulté - cible| d'être pris,
 * donc le niveau visé sort majoritairement mais un écart reste toujours
 * possible (jamais un tri strict "les plus proches d'abord"). Un exercice qui
 * cible un muscle choisi en "focus" voit son poids multiplié par
 * MUSCLE_FOCUS_BOOST — préférence, pas une exclusion.
 */
function weightedSampleWithoutReplacement(list, count, random, targetDifficulty, muscleFocus) {
  const pool = list.slice();
  const picked = [];
  while (pool.length > 0 && picked.length < count) {
    const weights = pool.map((e) => {
      const base = Math.pow(DIFFICULTY_WEIGHT_DECAY, -Math.abs(e.difficulty - targetDifficulty));
      const boost = muscleFocus && muscleFocus.length > 0 && hasIntersection(e.muscles, muscleFocus) ? MUSCLE_FOCUS_BOOST : 1;
      return base * boost;
    });
    const total = weights.reduce((sum, w) => sum + w, 0);
    let r = random() * total;
    let index = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        index = i;
        break;
      }
    }
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

/**
 * Choisit `count` exercices dans une catégorie : priorité aux exercices non
 * utilisés récemment (comme avant) — on ne pioche dans les "récents" que
 * s'il n'y a pas assez de frais. Au sein de chaque groupe, la difficulté
 * cible réglée dans les paramètres oriente un tirage pondéré (pas un tri
 * strict), sauf si `randomDifficulty` est activé pour la catégorie, auquel
 * cas la difficulté n'entre pas en compte et la sélection reste uniforme.
 * `injuries` exclut strictement les exercices qui sollicitent une zone
 * blessée ; `muscleFocus` favorise (sans exclure) ceux qui travaillent un
 * muscle choisi.
 */
function pickForCategory(category, count, recentIds, random, targetDifficulty, randomDifficulty, injuries, muscleFocus) {
  const all = exercisesByCategory(category, injuries);
  const fresh = seededShuffle(all.filter((e) => !recentIds.has(e.id)), random);
  const stale = seededShuffle(all.filter((e) => recentIds.has(e.id)), random);

  if (randomDifficulty) {
    return [...fresh, ...stale].slice(0, count);
  }

  const pickedFresh = weightedSampleWithoutReplacement(fresh, count, random, targetDifficulty, muscleFocus);
  const remaining = count - pickedFresh.length;
  const pickedStale =
    remaining > 0 ? weightedSampleWithoutReplacement(stale, remaining, random, targetDifficulty, muscleFocus) : [];
  return [...pickedFresh, ...pickedStale];
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
  const difficultyRandom = getDifficultyRandomPreferences();
  const injuries = getInjuries();
  const muscleFocus = getMuscleFocus();
  const quotas = computeQuotas(weights, random);

  let selected = [];
  for (const category of CATEGORIES) {
    selected = selected.concat(
      pickForCategory(
        category,
        quotas[category],
        recentIds,
        random,
        difficultyTargets[category],
        difficultyRandom[category],
        injuries,
        muscleFocus,
      ),
    );
  }

  // Si l'exclusion des zones blessées a affamé une catégorie, on complète
  // avec des exercices sûrs d'autres catégories pour garder 10 exercices.
  if (selected.length < WORKOUT_SIZE) {
    const selectedIds = new Set(selected.map((e) => e.id));
    const safePool = CATEGORIES.flatMap((cat) => exercisesByCategory(cat, injuries)).filter(
      (e) => !selectedIds.has(e.id),
    );
    const extra = weightedSampleWithoutReplacement(
      seededShuffle(safePool, random),
      WORKOUT_SIZE - selected.length,
      random,
      DEFAULT_TARGET_DIFFICULTY,
      muscleFocus,
    );
    selected = selected.concat(extra);
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
let draftDifficultyRandom = getDifficultyRandomPreferences();
let draftInjuries = getInjuries();
let draftMuscleFocus = getMuscleFocus();

function openSettings() {
  draftWeights = getPreferences();
  draftDifficulty = getDifficultyPreferences();
  draftDifficultyRandom = getDifficultyRandomPreferences();
  draftInjuries = getInjuries();
  draftMuscleFocus = getMuscleFocus();
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
  draftDifficultyRandom = { ...draftDifficultyRandom, [category]: false };
  renderSettings();
}

function setRandomDifficulty(category) {
  draftDifficultyRandom = { ...draftDifficultyRandom, [category]: true };
  renderSettings();
}

function saveSettings() {
  savePreferences(draftWeights);
  saveDifficultyPreferences(draftDifficulty);
  saveDifficultyRandomPreferences(draftDifficultyRandom);
  saveInjuries(draftInjuries);
  saveMuscleFocus(draftMuscleFocus);
  todayWorkout = generateWorkout(todayIso(), { force: true });
  renderHome();
  showScreen("home");
}

function toggleInjury(bodyPartId) {
  draftInjuries = draftInjuries.includes(bodyPartId)
    ? draftInjuries.filter((id) => id !== bodyPartId)
    : [...draftInjuries, bodyPartId];
  renderSettings();
}

function toggleMuscleFocus(muscleId) {
  draftMuscleFocus = draftMuscleFocus.includes(muscleId)
    ? draftMuscleFocus.filter((id) => id !== muscleId)
    : [...draftMuscleFocus, muscleId];
  renderSettings();
}

function difficultyGaugeInputHtml(category, level, isRandom) {
  const bars = [1, 2, 3, 4]
    .map(
      (n) => `
      <button type="button" class="diff-gauge-input-bar${n <= level ? " filled" : ""}"
        data-cat="${category}" data-level="${n}"
        aria-label="Régler la difficulté de ${CATEGORY_META[category].label} à ${n} sur 4"></button>
    `,
    )
    .join("");
  return `<div class="diff-gauge-input${isRandom ? " is-dimmed" : ""}">${bars}</div>`;
}

function randomDifficultyButtonHtml(category, isRandom) {
  return `
    <button type="button" class="diff-random-btn${isRandom ? " active" : ""}" data-cat="${category}"
      aria-pressed="${isRandom}" aria-label="Difficulté aléatoire pour ${CATEGORY_META[category].label}">🎲</button>
  `;
}

function renderSettings() {
  const rows = document.getElementById("settings-rows");
  rows.innerHTML = "";
  CATEGORIES.forEach((category) => {
    const meta = CATEGORY_META[category];
    const value = draftWeights[category] || 0;
    const targetDifficulty = draftDifficulty[category] || DEFAULT_TARGET_DIFFICULTY;
    const isRandom = !!draftDifficultyRandom[category];
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
        <div class="diff-control">
          ${difficultyGaugeInputHtml(category, targetDifficulty, isRandom)}
          ${randomDifficultyButtonHtml(category, isRandom)}
        </div>
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

  rows.querySelectorAll(".diff-random-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRandomDifficulty(btn.dataset.cat);
    });
  });

  renderRadar(draftWeights);
  renderInjuryChips();
  renderMuscleFocusChips();
}

function renderInjuryChips() {
  const container = document.getElementById("injuries-chips");
  if (!container) return;
  container.innerHTML = BODY_PARTS.map(
    (part) => `
      <button type="button" class="chip chip-injury${draftInjuries.includes(part.id) ? " selected" : ""}"
        data-part="${part.id}" aria-pressed="${draftInjuries.includes(part.id)}">
        <span aria-hidden="true">${part.emoji}</span> ${part.label}
      </button>
    `,
  ).join("");
  container.querySelectorAll(".chip-injury").forEach((btn) => {
    btn.addEventListener("click", () => toggleInjury(btn.dataset.part));
  });
}

function renderMuscleFocusChips() {
  const container = document.getElementById("muscle-focus-chips");
  if (!container) return;
  container.innerHTML = MUSCLES.map(
    (muscle) => `
      <button type="button" class="chip chip-muscle${draftMuscleFocus.includes(muscle.id) ? " selected" : ""}"
        data-muscle="${muscle.id}" aria-pressed="${draftMuscleFocus.includes(muscle.id)}">
        ${muscle.label}
      </button>
    `,
  ).join("");
  container.querySelectorAll(".chip-muscle").forEach((btn) => {
    btn.addEventListener("click", () => toggleMuscleFocus(btn.dataset.muscle));
  });
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
let statsMonthView = currentMonthView();

function currentMonthView() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

function openStats() {
  statsMonthView = currentMonthView();
  renderStats();
  showScreen("stats");
}

function renderStats() {
  const completions = getCompletions();
  const todayEntry = completions[todayIso()];

  document.getElementById("stats-today").textContent = todayEntry ? todayEntry.score : 0;
  document.getElementById("stats-streak").textContent = getCurrentStreak();
  document.getElementById("stats-best-streak").textContent = getBestStreak();

  const totals = getAllTimeTotals();
  document.getElementById("stats-total-workouts").textContent = totals.workouts;
  document.getElementById("stats-total-exercises").textContent = totals.exercises;

  const favoriteCat = CATEGORIES.reduce(
    (best, cat) => (totals.categories[cat] > (best ? totals.categories[best] : 0) ? cat : best),
    null,
  );
  document.getElementById("stats-favorite").textContent =
    favoriteCat && totals.categories[favoriteCat] > 0
      ? `${CATEGORY_META[favoriteCat].emoji} ${CATEGORY_META[favoriteCat].label}`
      : "—";

  renderMonthChart();
  renderHeatmap();
  renderBreakdown(totals);
}

function changeStatsMonth(delta) {
  let { year, month } = statsMonthView;
  month += delta;
  if (month < 0) {
    month = 11;
    year -= 1;
  } else if (month > 11) {
    month = 0;
    year += 1;
  }
  const now = currentMonthView();
  if (year > now.year || (year === now.year && month > now.month)) return; // pas de mois futur
  statsMonthView = { year, month };
  renderMonthChart();
}

function renderMonthChart() {
  const { year, month } = statsMonthView;
  document.getElementById("stats-month-label").textContent = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const now = currentMonthView();
  document.getElementById("stats-month-next").disabled = year === now.year && month === now.month;

  const series = getMonthSeries(year, month);
  const svg = document.getElementById("stats-month-svg");
  const width = 340;
  const height = 210;
  const padLeft = 22;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 24;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const maxY = WORKOUT_SIZE; // 10 exercices/jour max
  const stepX = series.length > 1 ? plotWidth / (series.length - 1) : plotWidth;

  const xFor = (i) => padLeft + i * stepX;
  const yFor = (v) => padTop + plotHeight - (Math.min(v, maxY) / maxY) * plotHeight;

  let svgContent = "";

  [0, 0.5, 1].forEach((frac) => {
    const y = padTop + plotHeight - frac * plotHeight;
    svgContent += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="stats-grid" />`;
    svgContent += `<text x="${padLeft - 6}" y="${y + 3}" class="stats-axis-label" text-anchor="end">${Math.round(frac * maxY)}</text>`;
  });

  CATEGORIES.forEach((cat) => {
    const points = series.map((s, i) => `${xFor(i)},${yFor(s.categories[cat])}`).join(" ");
    svgContent += `<polyline points="${points}" class="stats-line" style="stroke:${CATEGORY_CHART_COLOR[cat]}" />`;
  });

  series.forEach((s, i) => {
    const showLabel = i === 0 || i === series.length - 1 || (s.day % 5 === 0 && i < series.length - 2);
    if (!showLabel) return;
    svgContent += `<text x="${xFor(i)}" y="${height - 6}" class="stats-axis-label" text-anchor="middle">${s.day}</text>`;
  });

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = svgContent;

  const legend = document.getElementById("stats-month-legend");
  legend.innerHTML = CATEGORIES.map(
    (cat) => `
      <span class="stats-legend-item">
        <span class="stats-legend-dot" style="background:${CATEGORY_CHART_COLOR[cat]}"></span>
        ${CATEGORY_META[cat].label}
      </span>
    `,
  ).join("");
}

function heatColor(count) {
  if (count <= 0) return "#262b35"; // var(--line) : case vide = jour sans entraînement, bien visible
  const opacity = Math.min(1, 0.25 + (count / WORKOUT_SIZE) * 0.75);
  return `rgba(230, 57, 70, ${opacity.toFixed(2)})`;
}

/** Calendrier type "heatmap" des 12 dernières semaines : rend immédiatement
 * visibles les jours (ou séries de jours) sans entraînement. */
function renderHeatmap() {
  const svg = document.getElementById("stats-heatmap-svg");
  const weeks = 12;
  const days = weeks * 7;
  const completions = getCompletions();
  const today = todayIso();
  const cellSize = 11;
  const gap = 3;
  const gridLeft = 20;
  const gridTop = 12;
  const width = gridLeft + weeks * (cellSize + gap);
  const height = gridTop + 7 * (cellSize + gap);

  let svgContent = "";
  let lastMonth = null;
  for (let i = 0; i < days; i++) {
    const date = addDaysIso(today, -(days - 1 - i));
    const entry = completions[date];
    const count = entry ? entry.count || 0 : 0;
    const col = Math.floor(i / 7);
    const dow = (new Date(date + "T00:00:00").getDay() + 6) % 7; // 0 = lundi
    const x = gridLeft + col * (cellSize + gap);
    const y = gridTop + dow * (cellSize + gap);
    svgContent += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${heatColor(count)}"><title>${date} : ${count} exercice${count > 1 ? "s" : ""}</title></rect>`;

    if (dow === 0) {
      const monthKey = date.slice(0, 7);
      if (monthKey !== lastMonth) {
        lastMonth = monthKey;
        const label = new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { month: "short" });
        svgContent += `<text x="${x}" y="8" class="stats-heat-label">${label}</text>`;
      }
    }
  }

  ["L", "", "M", "", "V", "", ""].forEach((d, i) => {
    if (!d) return;
    const y = gridTop + i * (cellSize + gap) + cellSize - 1;
    svgContent += `<text x="0" y="${y}" class="stats-heat-label">${d}</text>`;
  });

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = svgContent;
}

function renderBreakdown(totals) {
  const container = document.getElementById("stats-breakdown");
  const total = CATEGORIES.reduce((sum, cat) => sum + totals.categories[cat], 0);
  container.innerHTML = CATEGORIES.map((cat) => {
    const count = totals.categories[cat];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="stats-breakdown-row">
        <span class="stats-breakdown-label">${pastilleHtml(cat)} ${CATEGORY_META[cat].label}</span>
        <div class="stats-breakdown-bar-track">
          <div class="stats-breakdown-bar-fill" style="width:${pct}%;background:${CATEGORY_CHART_COLOR[cat]}"></div>
        </div>
        <span class="stats-breakdown-value">${count}</span>
      </div>
    `;
  }).join("");
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
document.getElementById("stats-month-prev").addEventListener("click", () => changeStatsMonth(-1));
document.getElementById("stats-month-next").addEventListener("click", () => changeStatsMonth(1));

renderHome();
showScreen("home");
