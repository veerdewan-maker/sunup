import { describe, expect, it } from 'vitest';
import { getExercise } from '../data/exercises';
import type { Profile, Session } from '../types';
import { available, equipmentFor, generatePlan } from './plan';
import { e1rm, sessionPRs, suggest } from './progression';
import { suggestKcalDelta } from './stats';
import { calcTargets, dayTargets } from './targets';
import { addDays, ymd } from './util';

const base: Profile = {
  goal: 'muscle', sex: 'male', age: 25, heightCm: 180, startWeightKg: 80, activity: 0, experience: '1to3',
  days: 4, sessionMin: 60, preset: 'gym', equipment: [], units: 'kg', createdAt: new Date().toISOString(),
};

describe('targets', () => {
  it('uses Mifflin-St Jeor with a surplus for muscle', () => {
    const t = calcTargets(base);
    // BMR 10*80 + 6.25*180 - 5*25 + 5 = 1805; factor 1.2 + 0.16 = 1.36; +10%
    expect(t.kcal).toBe(2700);
    expect(t.protein).toBe(160);
    expect(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal)).toBeLessThan(40);
  });
  it('cuts 20% for fat loss but only 10% under 18', () => {
    const adult = calcTargets({ ...base, goal: 'fat' });
    const teen = calcTargets({ ...base, goal: 'fat', age: 16 });
    expect(adult.kcal).toBe(1960);
    expect(teen.kcal).toBeGreaterThan(adult.kcal * 1.1);
  });
});

describe('plan', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    for (const preset of ['gym', 'dumbbells', 'bodyweight'] as const) {
      for (const sessionMin of [30, 60, 90]) {
        it(`${days} days, ${preset}, ${sessionMin} min`, () => {
          const p = { ...base, days, preset, sessionMin };
          const plan = generatePlan(p);
          expect(plan.days).toHaveLength(days);
          const want = sessionMin === 30 ? 4 : sessionMin === 60 ? 6 : 7;
          for (const d of plan.days) {
            expect(d.exercises.length).toBe(want);
            expect(new Set(d.exercises.map((e) => e.exId)).size).toBe(d.exercises.length);
            for (const e of d.exercises) expect(available(getExercise(e.exId), equipmentFor(p))).toBe(true);
          }
        });
      }
    }
  }
  it('home gym with only bands still fills every day', () => {
    const plan = generatePlan({ ...base, preset: 'home', equipment: ['band'], days: 6 });
    for (const d of plan.days) expect(d.exercises.length).toBe(6);
  });
  it('strength goal puts heavy low reps first', () => {
    const plan = generatePlan({ ...base, goal: 'strength' });
    expect(plan.days[0].exercises[0]).toMatchObject({ exId: 'bench-press', sets: 4, repMin: 3, repMax: 6 });
  });
});

function sess(id: string, daysAgo: number, reps: number[], weightKg: number): Session {
  const t = Date.now() - daysAgo * 86400000;
  return {
    id, date: addDays(ymd(), -daysAgo), startedAt: t, finishedAt: t + 3600000, name: 'x',
    exercises: [{ exId: 'bench-press', repMin: 8, repMax: 12, restSec: 90, sets: reps.map((r) => ({ weightKg, reps: r, done: true })) }],
  };
}
const rx = { sets: 3, repMin: 8, repMax: 12 };

describe('progression', () => {
  it('starts blank the first time', () => {
    const s = suggest('bench-press', rx, [], 'kg');
    expect(s.sets).toHaveLength(3);
    expect(s.sets[0]).toMatchObject({ weightKg: 0, reps: 8, done: false });
  });
  it('adds weight after hitting the top of the range on all sets', () => {
    const s = suggest('bench-press', rx, [sess('a', 2, [12, 12, 12], 60)], 'kg');
    expect(s.sets[0]).toMatchObject({ weightKg: 62.5, reps: 8 });
  });
  it('adds 5 lb in pound mode', () => {
    const s = suggest('bench-press', rx, [sess('a', 2, [12, 12, 12], 135 * 0.45359237)], 'lb');
    expect(s.sets[0].weightKg / 0.45359237).toBeCloseTo(140, 5);
  });
  it('keeps the weight when reps are short of the top', () => {
    const s = suggest('bench-press', rx, [sess('a', 2, [12, 10, 9], 60)], 'kg');
    expect(s.sets.map((x) => x.weightKg)).toEqual([60, 60, 60]);
    expect(s.sets.map((x) => x.reps)).toEqual([12, 10, 9]);
  });
  it('suggests a 10% deload after two misses in a row', () => {
    const s = suggest('bench-press', rx, [sess('a', 4, [8, 7, 6], 60), sess('b', 2, [7, 6, 6], 60)], 'kg');
    expect(s.sets[0].weightKg).toBe(54);
    expect(s.hint).toMatch(/lighter/);
  });
  const rated = (x: Session, effort: 1 | 2 | 3 | 4): Session => ({ ...x, exercises: x.exercises.map((e) => ({ ...e, effort })) });
  it('adds a double step when the top of the range felt easy', () => {
    const s = suggest('bench-press', rx, [rated(sess('a', 2, [12, 12, 12], 60), 1)], 'kg');
    expect(s.sets[0].weightKg).toBe(65);
    expect(s.hint).toMatch(/easy/);
  });
  it('holds the weight once when the top of the range felt like a max', () => {
    const s = suggest('bench-press', rx, [rated(sess('a', 2, [12, 12, 12], 60), 4)], 'kg');
    expect(s.sets.map((x) => x.weightKg)).toEqual([60, 60, 60]);
    expect(s.hint).toMatch(/once more/);
  });
  it('adds weight after a held session even if it still felt like a max', () => {
    const s = suggest('bench-press', rx, [rated(sess('a', 2, [12, 12, 12], 60), 4), rated(sess('b', 5, [12, 12, 12], 60), 4)], 'kg');
    expect(s.sets[0].weightKg).toBe(62.5);
  });
  it('finds personal records against earlier sessions only', () => {
    const old = sess('a', 4, [8, 8, 8], 60);
    const better = sess('b', 0, [8, 8, 8], 65);
    expect(sessionPRs(better, [old, better])).toHaveLength(1);
    expect(sessionPRs(old, [old])).toHaveLength(0);
    expect(e1rm(100, 1)).toBe(100);
  });
});

describe('check-in', () => {
  const today = ymd();
  const w = (daysAgo: number, kg: number) => ({ date: addDays(today, -daysAgo), kg });
  it('suggests fewer calories when fat loss has stalled', () => {
    const weights = [w(20, 80), w(18, 80), w(15, 80), w(5, 80), w(3, 80), w(0, 80)];
    expect(suggestKcalDelta('fat', weights, today)).toBe(-150);
  });
  it('leaves targets alone when on pace or without enough data', () => {
    const weights = [w(20, 80), w(18, 80), w(15, 80), w(5, 79.3), w(3, 79.2), w(0, 79.1)];
    expect(suggestKcalDelta('fat', weights, today)).toBe(0);
    expect(suggestKcalDelta('fat', [w(0, 80)], today)).toBe(0);
  });
});

describe('training-day carbs', () => {
  const t = { kcal: 2500, protein: 160, carbs: 300, fat: 70, waterMl: 2500 };
  it('adds carbs on training days and takes them back on rest days, keeping the week the same', () => {
    const train = dayTargets(t, 50, 4, true);
    const rest = dayTargets(t, 50, 4, false);
    expect(train.carbs).toBe(350);
    expect(train.kcal).toBe(2700);
    expect(rest.carbs).toBe(235);
    expect(Math.abs(4 * train.carbs + 3 * rest.carbs - 7 * t.carbs)).toBeLessThanOrEqual(15);
  });
  it('changes nothing when off, and never takes from rest days that do not exist', () => {
    expect(dayTargets(t, 0, 4, true)).toEqual(t);
    expect(dayTargets(t, 50, 7, false).carbs).toBe(300);
  });
});
