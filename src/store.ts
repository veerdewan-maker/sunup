import { del, get, keys, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import { getExercise } from './data/exercises';
import { generatePlan, prescription } from './lib/plan';
import { suggest } from './lib/progression';
import { calcTargets, dayTargets } from './lib/targets';
import { uid, ymd } from './lib/util';
import type { AppState, Checkin, FoodEntry, FoodItem, Meal, MeasureLog, Meet, PhotoMeta, Pose, Practice, Profile, SavedMeal, Session, SessionExercise, Targets } from './types';

const KEY = 'sunup-state-v1';

export function emptyState(): AppState {
  return {
    v: 1,
    profile: null,
    targets: { kcal: 2000, protein: 120, carbs: 230, fat: 55, waterMl: 2500 },
    plan: null,
    sessions: [],
    active: null,
    foodEntries: [],
    customFoods: [],
    favourites: [],
    water: {},
    weights: [],
    savedMeals: [],
    measurements: [],
    photos: [],
    practices: [],
    meets: [],
    checkins: [],
    settings: { restTimer: true },
  };
}

let state: AppState = emptyState();
let loaded = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Saves to IndexedDB. `sync` also writes a copy to localStorage first, because an IndexedDB
 * write started while the page is closing may not finish; loadState picks whichever is newer.
 */
function persistNow(sync = false) {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const snapshot: AppState = { ...state, savedAt: Date.now() };
  const toLocal = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
      /* storage full or unavailable */
    }
  };
  if (sync) toLocal();
  set(KEY, snapshot)
    .then(() => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw && (JSON.parse(raw) as AppState).savedAt! <= snapshot.savedAt!) localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    })
    .catch(() => !sync && toLocal());
}

function commit(next: AppState) {
  state = next;
  listeners.forEach((l) => l());
  if (!loaded) return;
  // Throttle rather than debounce: a burst of changes is saved within 150 ms of the first one.
  if (!saveTimer) saveTimer = setTimeout(persistNow, 150);
}

export function update(fn: (s: AppState) => AppState) {
  commit(fn(state));
}

export function getState(): AppState {
  return state;
}

export function isValidState(x: unknown): x is AppState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<AppState>;
  return s.v === 1 && Array.isArray(s.sessions) && Array.isArray(s.foodEntries) && Array.isArray(s.weights) && !!s.targets;
}

export async function loadState(): Promise<void> {
  let fromDb: unknown;
  let fromLocal: unknown;
  try {
    fromDb = await get(KEY);
  } catch {
    fromDb = undefined;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) fromLocal = JSON.parse(raw);
  } catch {
    fromLocal = undefined;
  }
  const candidates = [fromDb, fromLocal].filter(isValidState).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  const data = candidates[0];
  if (data) state = { ...emptyState(), ...data, settings: { ...emptyState().settings, ...data.settings } };
  loaded = true;
  listeners.forEach((l) => l());
  if (data && data === fromLocal) persistNow();
  // Ask the browser not to evict our data when the device is low on space.
  navigator.storage?.persist?.().catch(() => undefined);
  const flush = () => {
    if (saveTimer) persistNow(true);
  };
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('pagehide', flush);
}

export function useStore(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// ---------- Profile and plan ----------

export function completeOnboarding(profile: Profile) {
  update((s) => ({
    ...s,
    profile,
    targets: calcTargets(profile),
    plan: generatePlan(profile),
    weights: [{ date: ymd(), kg: profile.startWeightKg }],
  }));
}

export function updateProfile(patch: Partial<Profile>, opts: { plan?: boolean; targets?: boolean } = {}) {
  update((s) => {
    if (!s.profile) return s;
    const profile = { ...s.profile, ...patch };
    const latest = [...s.weights].sort((a, b) => b.date.localeCompare(a.date))[0]?.kg ?? profile.startWeightKg;
    return {
      ...s,
      profile,
      plan: opts.plan ? generatePlan(profile) : s.plan,
      targets: opts.targets ? { ...calcTargets(profile, latest), waterMl: s.targets.waterMl } : s.targets,
    };
  });
}

export function setTargets(targets: Targets) {
  update((s) => ({ ...s, targets }));
}

export function swapPlanExercise(dayId: string, index: number, newExId: string) {
  update((s) => {
    if (!s.plan || !s.profile) return s;
    const beginner = s.profile.experience === 'new';
    const goal = s.profile.goal;
    return {
      ...s,
      plan: {
        ...s.plan,
        days: s.plan.days.map((d) =>
          d.id !== dayId
            ? d
            : {
                ...d,
                exercises: d.exercises.map((e, i) =>
                  i === index ? { exId: newExId, ...prescription(getExercise(newExId), goal, i, beginner) } : e,
                ),
              },
        ),
      },
    };
  });
}

// ---------- Workouts ----------

function buildSessionExercise(exId: string, rx: { sets: number; repMin: number; repMax: number; restSec: number }, s: AppState): SessionExercise {
  const sug = suggest(exId, rx, s.sessions, s.profile?.units ?? 'kg');
  return { exId, sets: sug.sets, repMin: rx.repMin, repMax: rx.repMax, restSec: rx.restSec, hint: sug.hint };
}

export function startWorkout(planDayId: string | null) {
  update((s) => {
    if (s.active) return s;
    const day = planDayId ? s.plan?.days.find((d) => d.id === planDayId) : undefined;
    const session: Session = {
      id: uid(),
      date: ymd(),
      startedAt: Date.now(),
      planDayId: day?.id,
      name: day?.name ?? 'Custom workout',
      exercises: day ? day.exercises.map((e) => buildSessionExercise(e.exId, e, s)) : [],
    };
    return { ...s, active: session };
  });
}

export function updateActive(fn: (a: Session) => Session) {
  update((s) => (s.active ? { ...s, active: fn(s.active) } : s));
}

export function addExerciseToActive(exId: string) {
  update((s) => {
    if (!s.active || !s.profile) return s;
    const rx = prescription(getExercise(exId), s.profile.goal, s.active.exercises.length, s.profile.experience === 'new');
    return { ...s, active: { ...s.active, exercises: [...s.active.exercises, buildSessionExercise(exId, rx, s)] } };
  });
}

export function swapActiveExercise(index: number, newExId: string) {
  const oldExId = state.active?.exercises[index]?.exId;
  update((s) => {
    if (!s.active || !s.profile) return s;
    const rx = prescription(getExercise(newExId), s.profile.goal, index, s.profile.experience === 'new');
    const active = {
      ...s.active,
      exercises: s.active.exercises.map((e, i) => (i === index ? buildSessionExercise(newExId, rx, s) : e)),
    };
    return { ...s, active };
  });
  // Keep the plan in step, so the swap sticks for next time.
  const a = state.active;
  if (a?.planDayId && oldExId) {
    const day = state.plan?.days.find((d) => d.id === a.planDayId);
    const planIndex = day ? day.exercises.findIndex((e) => e.exId === oldExId) : -1;
    if (planIndex >= 0) swapPlanExercise(a.planDayId, planIndex, newExId);
  }
}

/** Saves the active workout. Sets that were never ticked are dropped. Returns the saved session. */
export function finishWorkout(): Session | null {
  const a = state.active;
  if (!a) return null;
  const done: Session = {
    ...a,
    finishedAt: Date.now(),
    exercises: a.exercises
      .map((e) => ({ ...e, hint: undefined, sets: e.sets.filter((x) => x.done && x.reps > 0) }))
      .filter((e) => e.sets.length > 0),
  };
  update((s) => ({ ...s, active: null, sessions: [...s.sessions, done] }));
  return done;
}

export function discardWorkout() {
  update((s) => ({ ...s, active: null }));
}

export function deleteSession(id: string) {
  update((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
}

// ---------- Food ----------

export function macrosFor(food: FoodItem, qty: number) {
  const k = food.baseQty > 0 ? qty / food.baseQty : 0;
  return {
    kcal: Math.round(food.kcal * k),
    protein: Math.round(food.protein * k * 10) / 10,
    carbs: Math.round(food.carbs * k * 10) / 10,
    fat: Math.round(food.fat * k * 10) / 10,
  };
}

export function qtyLabel(food: FoodItem, qty: number): string {
  const n = Number(qty.toFixed(2));
  if (food.unit === 'serving') return `${n} serving${n === 1 ? '' : 's'}`;
  return `${n} ${food.unit}`;
}

export function addFood(date: string, meal: Meal, food: FoodItem, qty: number) {
  const entry: FoodEntry = {
    id: uid(),
    date,
    meal,
    name: food.name,
    brand: food.brand,
    qtyLabel: qtyLabel(food, qty),
    ...macrosFor(food, qty),
    food,
    qty,
  };
  update((s) => ({ ...s, foodEntries: [...s.foodEntries, entry] }));
}

export function quickAdd(date: string, meal: Meal, name: string, m: { kcal: number; protein: number; carbs: number; fat: number }) {
  const entry: FoodEntry = { id: uid(), date, meal, name: name || 'Quick add', qtyLabel: 'Quick add', ...m };
  update((s) => ({ ...s, foodEntries: [...s.foodEntries, entry] }));
}

/** Removes an entry and returns a function that puts it back, for an Undo button. */
export function deleteFoodEntry(id: string): () => void {
  const i = state.foodEntries.findIndex((e) => e.id === id);
  const entry = state.foodEntries[i];
  update((s) => ({ ...s, foodEntries: s.foodEntries.filter((e) => e.id !== id) }));
  return () => {
    if (!entry) return;
    update((s) => {
      const list = [...s.foodEntries];
      list.splice(Math.min(i, list.length), 0, entry);
      return { ...s, foodEntries: list };
    });
  };
}

/** Changes how much of a food was eaten, recalculating its macros. */
export function editFoodQty(id: string, qty: number) {
  update((s) => ({
    ...s,
    foodEntries: s.foodEntries.map((e) => (e.id === id && e.food ? { ...e, qty, qtyLabel: qtyLabel(e.food, qty), ...macrosFor(e.food, qty) } : e)),
  }));
}

/** The amount last logged for a food, so it can be added again in one tap. */
export function lastQty(s: AppState, foodId: string): number | null {
  for (let i = s.foodEntries.length - 1; i >= 0; i--) {
    const e = s.foodEntries[i];
    if (e.food?.id === foodId && e.qty) return e.qty;
  }
  return null;
}

export function copyMeal(fromDate: string, toDate: string, meal: Meal): number {
  const src = state.foodEntries.filter((e) => e.date === fromDate && e.meal === meal);
  if (!src.length) return 0;
  update((s) => ({ ...s, foodEntries: [...s.foodEntries, ...src.map((e) => ({ ...e, id: uid(), date: toDate }))] }));
  return src.length;
}

export function isFavourite(s: AppState, food: FoodItem): boolean {
  return s.favourites.some((f) => f.id === food.id);
}

export function toggleFavourite(food: FoodItem) {
  update((s) => ({
    ...s,
    favourites: isFavourite(s, food) ? s.favourites.filter((f) => f.id !== food.id) : [...s.favourites, food],
  }));
}

export function saveCustomFood(food: FoodItem) {
  update((s) => ({
    ...s,
    customFoods: s.customFoods.some((f) => f.id === food.id)
      ? s.customFoods.map((f) => (f.id === food.id ? food : f))
      : [...s.customFoods, food],
  }));
}

export function deleteCustomFood(id: string) {
  update((s) => ({
    ...s,
    customFoods: s.customFoods.filter((f) => f.id !== id),
    favourites: s.favourites.filter((f) => f.id !== id),
  }));
}

/** Most recently logged distinct foods, newest first. */
export function recentFoods(s: AppState, limit = 30): FoodItem[] {
  const seen = new Set<string>();
  const out: FoodItem[] = [];
  for (let i = s.foodEntries.length - 1; i >= 0 && out.length < limit; i--) {
    const f = s.foodEntries[i].food;
    if (f && !seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

// ---------- Saved meals ----------

/** Saves the foods logged in one meal on one day under a name. Returns the new meal, or null if there was nothing to save. */
export function saveMeal(name: string, date: string, meal: Meal): SavedMeal | null {
  const src = state.foodEntries.filter((e) => e.date === date && e.meal === meal);
  if (!src.length) return null;
  const saved: SavedMeal = {
    id: uid(),
    name: name.trim() || 'My meal',
    items: src.map(({ id: _id, date: _d, meal: _m, ...rest }) => rest),
  };
  update((s) => ({ ...s, savedMeals: [...s.savedMeals, saved] }));
  return saved;
}

export function logSavedMeal(id: string, date: string, meal: Meal): number {
  const sm = state.savedMeals.find((m) => m.id === id);
  if (!sm) return 0;
  update((s) => ({ ...s, foodEntries: [...s.foodEntries, ...sm.items.map((it) => ({ ...it, id: uid(), date, meal }))] }));
  return sm.items.length;
}

export function deleteSavedMeal(id: string) {
  update((s) => ({ ...s, savedMeals: s.savedMeals.filter((m) => m.id !== id) }));
}

export function addWater(date: string, ml: number) {
  update((s) => ({ ...s, water: { ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) + ml) } }));
}

// ---------- Body weight and check-ins ----------

export function logWeight(date: string, kg: number) {
  update((s) => ({
    ...s,
    weights: [...s.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date)),
  }));
}

export function deleteWeight(date: string) {
  update((s) => ({ ...s, weights: s.weights.filter((w) => w.date !== date) }));
}

export function logMeasurements(date: string, cm: MeasureLog['cm']) {
  const clean = Object.fromEntries(Object.entries(cm).filter(([, v]) => v != null && v > 0)) as MeasureLog['cm'];
  update((s) => {
    const rest = s.measurements.filter((m) => m.date !== date);
    const next = Object.keys(clean).length ? [...rest, { date, cm: clean }] : rest;
    return { ...s, measurements: next.sort((a, b) => a.date.localeCompare(b.date)) };
  });
}

export function deleteMeasurements(date: string) {
  update((s) => ({ ...s, measurements: s.measurements.filter((m) => m.date !== date) }));
}

// ---------- Training-day carbs ----------

/** A day counts as training if a workout was done (or is under way) that day, unless the user said otherwise. */
export function isTrainingDay(s: AppState, date: string): boolean {
  const manual = s.settings.dayType?.[date];
  if (manual != null) return manual;
  return s.sessions.some((x) => x.finishedAt && x.date === date) || s.active?.date === date || s.practices.some((x) => x.date === date);
}

export function targetsFor(s: AppState, date: string): Targets {
  return dayTargets(s.targets, s.settings.trainCarbs ?? 0, s.profile?.days ?? 3, isTrainingDay(s, date));
}

export function setDayType(date: string, training: boolean) {
  update((s) => ({ ...s, settings: { ...s.settings, dayType: { ...s.settings.dayType, [date]: training } } }));
}

// ---------- Sport practices and meets ----------

export function logPractice(p: Omit<Practice, 'id'>): Practice {
  const practice = { ...p, id: uid() };
  update((s) => ({ ...s, practices: [...s.practices, practice] }));
  return practice;
}

export function deletePractice(id: string) {
  update((s) => ({ ...s, practices: s.practices.filter((x) => x.id !== id) }));
}

export function addMeet(date: string, name: string) {
  const meet: Meet = { id: uid(), date, name: name.trim() || 'Competition' };
  update((s) => ({ ...s, meets: [...s.meets, meet].sort((a, b) => a.date.localeCompare(b.date)) }));
}

export function deleteMeet(id: string) {
  update((s) => ({ ...s, meets: s.meets.filter((m) => m.id !== id) }));
}

// ---------- Progress photos ----------

const photoKey = (id: string) => `photo-${id}`;

export async function addPhoto(date: string, pose: Pose, image: Blob): Promise<PhotoMeta> {
  const meta: PhotoMeta = { id: uid(), date, pose };
  await set(photoKey(meta.id), image);
  update((s) => ({ ...s, photos: [...s.photos, meta].sort((a, b) => a.date.localeCompare(b.date)) }));
  return meta;
}

export function getPhoto(id: string): Promise<Blob | undefined> {
  return get(photoKey(id));
}

export async function deletePhoto(id: string) {
  update((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
  await del(photoKey(id)).catch(() => undefined);
}

async function deleteAllPhotos() {
  try {
    for (const k of await keys()) if (String(k).startsWith('photo-')) await del(k);
  } catch {
    /* ignore */
  }
}

export function saveCheckin(c: Checkin, accept: boolean) {
  update((s) => ({
    ...s,
    checkins: [...s.checkins, { ...c, accepted: accept }],
    targets:
      accept && c.kcalDelta
        ? {
            ...s.targets,
            kcal: s.targets.kcal + c.kcalDelta,
            carbs: Math.max(0, Math.round((s.targets.carbs + c.kcalDelta / 4) / 5) * 5),
          }
        : s.targets,
  }));
}

// ---------- Settings and backup ----------

export function patchSettings(patch: Partial<AppState['settings']>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function exportJson(): string {
  // Photos stay on this device: they would make the file huge, and they are private.
  return JSON.stringify({ app: 'sunup', exportedAt: new Date().toISOString(), state: { ...state, photos: [] } }, null, 1);
}

/** Replaces everything with the contents of a backup file. Throws a readable error if the file is wrong. */
export function importJson(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not a Sunup backup (it could not be read).');
  }
  const candidate = (parsed as { state?: unknown })?.state;
  if (!isValidState(candidate)) throw new Error('That file is not a Sunup backup.');
  commit({ ...emptyState(), ...candidate, photos: state.photos, active: null, settings: { ...emptyState().settings, ...candidate.settings } });
  persistNow();
}

export function resetAll() {
  void deleteAllPhotos();
  commit(emptyState());
  persistNow();
}

/** Test hook: lets automated checks seed data. */
export function __setLoadedForTests(s?: AppState) {
  loaded = true;
  if (s) state = s;
}
