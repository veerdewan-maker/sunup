import { getExercise } from '../data/exercises';
import type { Session, SessionExercise, SetLog, Units } from '../types';
import { fmtWeight, fromDisplay, toDisplay } from './util';

/** Estimated one rep max (Epley). */
export function e1rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 12) / 30);
}

export function doneSets(se: SessionExercise): SetLog[] {
  return se.sets.filter((s) => s.done && s.reps > 0);
}

/** Past finished sessions that include the exercise, newest first. */
export function history(exId: string, sessions: Session[]): { session: Session; ex: SessionExercise }[] {
  const out: { session: Session; ex: SessionExercise }[] = [];
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const ex = s.exercises.find((e) => e.exId === exId && doneSets(e).length > 0);
    if (ex) out.push({ session: s, ex });
  }
  return out.sort((a, b) => b.session.startedAt - a.session.startedAt);
}

export function increment(lower: boolean, units: Units): number {
  if (units === 'kg') return lower ? 5 : 2.5;
  return lower ? 10 : 5;
}

function roundDisplay(v: number, units: Units): number {
  const step = units === 'kg' ? 0.5 : 1;
  return Math.round(v / step) * step;
}

export interface Suggestion {
  sets: SetLog[];
  hint: string;
}

/**
 * Double progression: when every set reached the top of the rep range, add weight and
 * start again at the bottom of the range. Two sessions in a row below the range suggests a 10% deload.
 */
export function suggest(
  exId: string,
  rx: { sets: number; repMin: number; repMax: number },
  sessions: Session[],
  units: Units,
): Suggestion {
  const ex = getExercise(exId);
  const past = history(exId, sessions);
  const blank = (weightKg: number, reps: number): SetLog[] =>
    Array.from({ length: rx.sets }, () => ({ weightKg, reps, done: false }));
  if (!past.length) {
    return { sets: blank(0, rx.repMin), hint: ex.needs.length ? 'First time: pick a weight you could lift for 2 more reps.' : '' };
  }
  const last = doneSets(past[0].ex);
  const lastWeight = Math.max(...last.map((s) => s.weightKg));
  const lastText = `Last time: ${lastWeight > 0 ? fmtWeight(lastWeight, units) + ' ' + units + ' × ' : ''}${last.map((s) => s.reps).join(', ')}`;
  const missed = (sets: SetLog[]) => sets.some((s) => s.reps < rx.repMin);

  if (ex.timed || lastWeight <= 0) {
    // No load to add, so progress by reps or seconds.
    const allTop = last.length >= rx.sets && last.every((s) => s.reps >= rx.repMax);
    const sets = Array.from({ length: rx.sets }, (_, i) => ({
      weightKg: 0,
      reps: last[Math.min(i, last.length - 1)].reps,
      done: false,
    }));
    return { sets, hint: allTop ? `${lastText}. You hit the top of the range, so try a harder version or add reps.` : `${lastText}. Try to beat it.` };
  }

  const hitTop = (sets: SetLog[], w: number) =>
    sets.length >= rx.sets && sets.every((s) => s.weightKg === w) && sets.every((s) => s.reps >= rx.repMax);
  if (hitTop(last, lastWeight)) {
    const effort = past[0].ex.effort;
    const prev = past[1] ? doneSets(past[1].ex) : [];
    const heldAlready = prev.length > 0 && Math.max(...prev.map((s) => s.weightKg)) === lastWeight && hitTop(prev, lastWeight);
    if (effort === 4 && !heldAlready) {
      return {
        sets: Array.from({ length: rx.sets }, () => ({ weightKg: lastWeight, reps: rx.repMax, done: false })),
        hint: `${lastText}. You hit ${rx.repMax} on every set but it felt like your max, so keep ${fmtWeight(lastWeight, units)} ${units} once more and make it feel smoother.`,
      };
    }
    const step = increment(ex.lower, units) * (effort === 1 ? 2 : 1);
    const next = roundDisplay(toDisplay(lastWeight, units) + step, units);
    return {
      sets: blank(fromDisplay(next, units), rx.repMin),
      hint:
        effort === 1
          ? `${lastText}. All sets hit ${rx.repMax} and it felt easy, so the weight jumps to ${next} ${units}.`
          : `${lastText}. All sets hit ${rx.repMax}, so the weight goes up to ${next} ${units}.`,
    };
  }
  if (past.length >= 2 && missed(last) && missed(doneSets(past[1].ex))) {
    const next = roundDisplay(toDisplay(lastWeight, units) * 0.9, units);
    return {
      sets: blank(fromDisplay(next, units), rx.repMin),
      hint: `${lastText}. You missed the rep range twice in a row, so try a lighter ${next} ${units} and build back up.`,
    };
  }
  const sets = Array.from({ length: rx.sets }, (_, i) => ({
    weightKg: lastWeight,
    reps: Math.min(rx.repMax, Math.max(rx.repMin, last[Math.min(i, last.length - 1)].reps)),
    done: false,
  }));
  return { sets, hint: `${lastText}. Same weight, aim for more reps.` };
}

export function sessionVolume(s: Session): number {
  let v = 0;
  for (const e of s.exercises) for (const set of doneSets(e)) v += set.weightKg * set.reps;
  return v;
}

export function bestE1rm(se: SessionExercise): number {
  return Math.max(0, ...doneSets(se).map((s) => e1rm(s.weightKg, s.reps)));
}

export interface PR {
  exId: string;
  e1rmKg: number;
  weightKg: number;
  reps: number;
  date: string;
}

/** Personal records in this session compared with everything before it: a heavier weight or a higher estimated max. */
export function sessionPRs(session: Session, earlier: Session[]): PR[] {
  const prs: PR[] = [];
  for (const se of session.exercises) {
    const sets = doneSets(se).filter((s) => s.weightKg > 0);
    if (!sets.length) continue;
    const prev = history(se.exId, earlier.filter((s) => s.id !== session.id));
    if (!prev.length) continue;
    const prevBest = Math.max(...prev.map((p) => bestE1rm(p.ex)));
    const prevHeaviest = Math.max(...prev.flatMap((p) => doneSets(p.ex).map((s) => s.weightKg)));
    const best = sets.reduce((a, b) => (e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a));
    const heaviest = sets.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
    const val = e1rm(best.weightKg, best.reps);
    if (val > prevBest + 0.01) prs.push({ exId: se.exId, e1rmKg: val, weightKg: best.weightKg, reps: best.reps, date: session.date });
    else if (heaviest.weightKg > prevHeaviest + 0.01)
      prs.push({ exId: se.exId, e1rmKg: e1rm(heaviest.weightKg, heaviest.reps), weightKg: heaviest.weightKg, reps: heaviest.reps, date: session.date });
  }
  return prs;
}

/** Best lift ever for each exercise that has been logged with weight. */
export function allTimeBests(sessions: Session[]): PR[] {
  const best = new Map<string, PR>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    for (const se of s.exercises) {
      for (const set of doneSets(se)) {
        if (set.weightKg <= 0) continue;
        const val = e1rm(set.weightKg, set.reps);
        const cur = best.get(se.exId);
        if (!cur || val > cur.e1rmKg) best.set(se.exId, { exId: se.exId, e1rmKg: val, weightKg: set.weightKg, reps: set.reps, date: s.date });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.e1rmKg - a.e1rmKg);
}

/** Best estimated 1RM per day for one exercise, oldest first. */
export function e1rmSeries(exId: string, sessions: Session[]): { date: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const h of history(exId, sessions)) {
    const v = bestE1rm(h.ex);
    if (v > 0) byDay.set(h.session.date, Math.max(v, byDay.get(h.session.date) ?? 0));
  }
  return [...byDay.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Warm-up ramp before a heavy set: the empty bar (or a very light weight), then about 40%, 60% and 80%.
 * Weights are rounded to what you can load, and steps that would repeat a weight are dropped.
 */
export function warmups(workKg: number, units: Units, barbell: boolean): { weightKg: number; reps: number }[] {
  if (workKg <= 0) return [];
  const step = units === 'kg' ? 2.5 : 5;
  const bar = units === 'kg' ? 20 : 45;
  const work = toDisplay(workKg, units);
  const ramp: [number, number][] = [
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ];
  const out: { weightKg: number; reps: number }[] = [];
  const minimum = barbell ? bar : step;
  if (barbell && work > bar * 1.4) out.push({ weightKg: fromDisplay(bar, units), reps: 10 });
  for (const [pct, reps] of ramp) {
    const v = Math.max(minimum, Math.round((work * pct) / step) * step);
    if (v >= work) continue;
    const kg = fromDisplay(v, units);
    // Skip a step that is barely heavier than the one before; it only adds fatigue.
    const prev = out.length ? toDisplay(out[out.length - 1].weightKg, units) : 0;
    if (out.length && v - prev < work * 0.15) continue;
    out.push({ weightKg: kg, reps });
  }
  return out;
}
