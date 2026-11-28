import type { AppState, Checkin, FoodEntry, Goal, Session, WeightLog } from '../types';
import { addDays, daysBetween, round, weekStart, ymd } from './util';

export interface Totals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function totalsFor(entries: FoodEntry[], date: string): Totals {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    if (e.date !== date) continue;
    t.kcal += e.kcal;
    t.protein += e.protein;
    t.carbs += e.carbs;
    t.fat += e.fat;
  }
  return t;
}

/** Average of weigh-ins in the 7 days ending on `end` (inclusive), or null with no data. */
export function avgWeight(weights: WeightLog[], end: string): number | null {
  const start = addDays(end, -6);
  const w = weights.filter((x) => x.date >= start && x.date <= end);
  if (!w.length) return null;
  return w.reduce((a, b) => a + b.kg, 0) / w.length;
}

/** Trend line: for each weigh-in, the average of weigh-ins in the 7 days up to it. */
export function weightTrend(weights: WeightLog[]): { date: string; value: number }[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((w) => ({ date: w.date, value: avgWeight(sorted, w.date)! }));
}

export function currentWeight(state: AppState): number {
  const sorted = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length) return avgWeight(sorted, sorted[sorted.length - 1].date)!;
  return state.profile?.startWeightKg ?? 70;
}

/** Kg per week over roughly the last 3 weeks of trend, or null without enough data. */
export function weeklyRate(weights: WeightLog[]): number | null {
  const trend = weightTrend(weights);
  if (trend.length < 2) return null;
  const last = trend[trend.length - 1];
  const from = trend.find((t) => daysBetween(t.date, last.date) <= 21)!;
  const days = daysBetween(from.date, last.date);
  if (days < 7) return null;
  return ((last.value - from.value) / days) * 7;
}

export function finished(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.finishedAt).sort((a, b) => b.startedAt - a.startedAt);
}

export function workoutsInWeek(sessions: Session[], anyDate: string): number {
  const start = weekStart(anyDate);
  const end = addDays(start, 6);
  return sessions.filter((s) => s.finishedAt && s.date >= start && s.date <= end).length;
}

/** Workouts per week for the last `n` weeks, oldest first. */
export function weeklyCounts(sessions: Session[], n: number): { week: string; count: number }[] {
  const out: { week: string; count: number }[] = [];
  const thisWeek = weekStart(ymd());
  for (let i = n - 1; i >= 0; i--) {
    const week = addDays(thisWeek, -7 * i);
    out.push({ week, count: workoutsInWeek(sessions, week) });
  }
  return out;
}

/** Days in a row with food logged, counting back from today (or yesterday if today is empty). */
export function foodStreak(entries: FoodEntry[]): number {
  const days = new Set(entries.map((e) => e.date));
  let d = ymd();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** The plan day to do next: the one after the most recently finished plan workout. */
export function nextPlanDayIndex(state: AppState): number {
  const plan = state.plan;
  if (!plan || !plan.days.length) return 0;
  const last = finished(state.sessions).find((s) => s.planDayId && plan.days.some((d) => d.id === s.planDayId));
  if (!last) return 0;
  const i = plan.days.findIndex((d) => d.id === last.planDayId);
  return (i + 1) % plan.days.length;
}

export function checkinDue(state: AppState): boolean {
  if (!state.profile) return false;
  const last = state.checkins.length ? state.checkins[state.checkins.length - 1].date : state.profile.createdAt.slice(0, 10);
  return daysBetween(last, ymd()) >= 7;
}

/**
 * Weekly check-in summary. Suggests a calorie change when the two-week weight trend
 * is clearly off pace for the goal: fat loss aims for 0.25 to 1% of body weight per week,
 * muscle gain for 0.1 to 0.5%.
 */
export function buildCheckin(state: AppState, today: string = ymd()): Checkin {
  const p = state.profile!;
  const from = addDays(today, -6);
  const now = avgWeight(state.weights, today);
  const before = avgWeight(state.weights, addDays(today, -7));
  const weightChangeKg = now != null && before != null ? now - before : null;
  const workouts = state.sessions.filter((s) => s.finishedAt && s.date >= from && s.date <= today).length;
  const days = new Map<string, { kcal: number; protein: number }>();
  for (const e of state.foodEntries) {
    if (e.date < from || e.date > today) continue;
    const d = days.get(e.date) ?? { kcal: 0, protein: 0 };
    d.kcal += e.kcal;
    d.protein += e.protein;
    days.set(e.date, d);
  }
  const n = days.size;
  const avgKcal = n ? round([...days.values()].reduce((a, b) => a + b.kcal, 0) / n) : null;
  const avgProtein = n ? round([...days.values()].reduce((a, b) => a + b.protein, 0) / n) : null;
  return {
    date: today,
    weightChangeKg,
    workouts,
    planned: p.days,
    avgKcal,
    avgProtein,
    kcalDelta: suggestKcalDelta(p.goal, state.weights, today),
    accepted: false,
  };
}

export function suggestKcalDelta(goal: Goal, weights: WeightLog[], today: string): number {
  const now = avgWeight(weights, today);
  const twoWeeksAgo = avgWeight(weights, addDays(today, -14));
  if (now == null || twoWeeksAgo == null) return 0;
  const recent = weights.filter((w) => w.date > addDays(today, -7)).length;
  const older = weights.filter((w) => w.date <= addDays(today, -14) && w.date > addDays(today, -21)).length;
  if (recent < 2 || older < 2) return 0;
  const pctPerWeek = ((now - twoWeeksAgo) / twoWeeksAgo / 2) * 100;
  if (goal === 'fat') {
    if (pctPerWeek > -0.25) return -150;
    if (pctPerWeek < -1) return 150;
  } else if (goal === 'muscle') {
    if (pctPerWeek < 0.1) return 150;
    if (pctPerWeek > 0.5) return -150;
  }
  return 0;
}

/** Gym effort is rated 1 to 4 per exercise; map the average onto the 0-10 session effort scale. */
function gymEffort(s: Session): number {
  const rated = s.exercises.map((e) => e.effort).filter((x): x is NonNullable<typeof x> => x != null);
  if (!rated.length) return 6;
  const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
  return Math.round(3 + avg * 1.75);
}

/**
 * Training load per week (minutes × effort, the "session RPE" method), oldest first,
 * counting both gym workouts and sport practices or games.
 */
export function weeklyLoad(state: AppState, n: number, today: string = ymd()): { week: string; gym: number; sport: number }[] {
  const start = weekStart(today);
  const weeks = Array.from({ length: n }, (_, i) => ({ week: addDays(start, -7 * (n - 1 - i)), gym: 0, sport: 0 }));
  const find = (date: string) => weeks.find((w) => w.week === weekStart(date));
  for (const s of finished(state.sessions)) {
    const w = find(s.date);
    if (!w) continue;
    const minutes = Math.min(180, Math.max(10, ((s.finishedAt ?? s.startedAt) - s.startedAt) / 60000));
    w.gym += Math.round(minutes * gymEffort(s));
  }
  for (const p of state.practices ?? []) {
    const w = find(p.date);
    if (w) w.sport += Math.round(p.minutes * p.effort);
  }
  return weeks;
}

/**
 * Compares this week's load with the average of the three weeks before. A jump of more than 30%
 * is a common warning sign for overuse injuries; a big drop is fine before a competition.
 */
export function loadChange(weeks: { gym: number; sport: number }[]): number | null {
  if (weeks.length < 4) return null;
  const tot = (w: { gym: number; sport: number }) => w.gym + w.sport;
  const prev = weeks.slice(-4, -1).map(tot);
  if (prev.filter((x) => x > 0).length < 2) return null;
  const base = prev.reduce((a, b) => a + b, 0) / 3;
  return base > 0 ? tot(weeks[weeks.length - 1]) / base - 1 : null;
}

/** The next competition on or after today, and how many days away it is. */
export function nextMeet(state: AppState, today: string = ymd()): { name: string; date: string; days: number } | null {
  const m = (state.meets ?? []).find((x) => x.date >= today);
  return m ? { name: m.name, date: m.date, days: daysBetween(today, m.date) } : null;
}
