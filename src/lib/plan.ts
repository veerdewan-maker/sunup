import { ALL_EQUIP, EXERCISES, getExercise } from '../data/exercises';
import type { Equip, Exercise, Goal, Pattern, Plan, PlanDay, PlanExercise, Profile } from '../types';

type Slot = [Pattern, number];

// Each day lists slots from most to least important, so shorter sessions keep the big lifts.
const DAYS: Record<string, Slot[]> = {
  'Full Body A': [['squat', 0], ['hpush', 0], ['hpull', 0], ['hamIso', 0], ['vpush', 0], ['biceps', 0], ['core', 0]],
  'Full Body B': [['hinge', 0], ['vpush', 0], ['vpull', 0], ['lunge', 0], ['hpush', 1], ['triceps', 0], ['core', 1]],
  'Full Body C': [['lunge', 1], ['hpush', 0], ['vpull', 1], ['hinge', 1], ['latRaise', 0], ['biceps', 1], ['triceps', 1]],
  'Upper A': [['hpush', 0], ['hpull', 0], ['vpush', 0], ['vpull', 0], ['latRaise', 0], ['biceps', 0], ['triceps', 0]],
  'Upper B': [['vpush', 1], ['vpull', 1], ['hpush', 1], ['hpull', 1], ['rearDelt', 0], ['triceps', 1], ['biceps', 1]],
  Upper: [['hpush', 0], ['hpull', 0], ['vpush', 0], ['vpull', 0], ['latRaise', 0], ['biceps', 0], ['triceps', 0]],
  'Lower A': [['squat', 0], ['hinge', 1], ['lunge', 0], ['hamIso', 0], ['calves', 0], ['core', 0], ['quadIso', 0]],
  'Lower B': [['hinge', 0], ['squat', 1], ['quadIso', 0], ['glute', 0], ['calves', 1], ['core', 1], ['hamIso', 1]],
  Lower: [['squat', 0], ['hinge', 1], ['lunge', 0], ['hamIso', 0], ['calves', 0], ['core', 0], ['quadIso', 0]],
  Push: [['hpush', 0], ['vpush', 0], ['hpush', 2], ['latRaise', 0], ['triceps', 0], ['chestIso', 0], ['triceps', 1]],
  Pull: [['vpull', 0], ['hpull', 0], ['vpull', 1], ['rearDelt', 0], ['biceps', 0], ['hpull', 1], ['biceps', 1]],
  Legs: [['squat', 0], ['hinge', 1], ['lunge', 0], ['quadIso', 0], ['hamIso', 0], ['calves', 0], ['core', 0]],
  'Push B': [['vpush', 1], ['hpush', 1], ['hpush', 3], ['latRaise', 1], ['triceps', 1], ['chestIso', 1], ['triceps', 2]],
  'Pull B': [['hpull', 1], ['vpull', 1], ['hpull', 2], ['rearDelt', 1], ['biceps', 1], ['vpull', 2], ['biceps', 2]],
  'Legs B': [['hinge', 0], ['squat', 1], ['lunge', 1], ['hamIso', 1], ['quadIso', 0], ['calves', 1], ['core', 1]],
};

const SPLITS: Record<number, { name: string; days: [string, string][] }> = {
  2: { name: 'Full body, 2 days', days: [['Full Body A', 'Full Body A'], ['Full Body B', 'Full Body B']] },
  3: {
    name: 'Full body, 3 days',
    days: [['Full Body A', 'Full Body A'], ['Full Body B', 'Full Body B'], ['Full Body C', 'Full Body C']],
  },
  4: {
    name: 'Upper / Lower, 4 days',
    days: [['Upper A', 'Upper A'], ['Lower A', 'Lower A'], ['Upper B', 'Upper B'], ['Lower B', 'Lower B']],
  },
  5: {
    name: 'Upper / Lower / Push / Pull / Legs',
    days: [['Upper', 'Upper'], ['Lower', 'Lower'], ['Push', 'Push B'], ['Pull', 'Pull B'], ['Legs', 'Legs B']],
  },
  6: {
    name: 'Push / Pull / Legs, twice a week',
    days: [['Push A', 'Push'], ['Pull A', 'Pull'], ['Legs A', 'Legs'], ['Push B', 'Push B'], ['Pull B', 'Pull B'], ['Legs B', 'Legs B']],
  },
};

// If nothing fits the equipment, use a movement that trains the same muscles.
const FALLBACK: Partial<Record<Pattern, Pattern>> = {
  latRaise: 'vpush',
  rearDelt: 'hpull',
  chestIso: 'hpush',
  quadIso: 'squat',
  hamIso: 'hinge',
  glute: 'hinge',
  biceps: 'vpull',
  triceps: 'hpush',
};

export function equipmentFor(p: Pick<Profile, 'preset' | 'equipment'>): Equip[] {
  if (p.preset === 'gym') return ALL_EQUIP;
  if (p.preset === 'dumbbells') return ['db'];
  if (p.preset === 'bodyweight') return [];
  return p.equipment;
}

export function available(ex: Exercise, have: Equip[]): boolean {
  return ex.needs.every((n) => have.includes(n));
}

/** Exercises for a pattern the user can do. Weighted options come before bodyweight ones. */
export function optionsFor(pattern: Pattern, have: Equip[]): Exercise[] {
  const list = EXERCISES.filter((e) => e.pattern === pattern && available(e, have));
  const weighted = list.filter((e) => e.needs.length > 0);
  const body = list.filter((e) => e.needs.length === 0);
  return [...weighted, ...body];
}

function pick(pattern: Pattern, variant: number, have: Equip[], used: Set<string>): Exercise | null {
  let opts = optionsFor(pattern, have).filter((e) => !used.has(e.id));
  if (!opts.length && FALLBACK[pattern]) {
    opts = optionsFor(FALLBACK[pattern]!, have).filter((e) => !used.has(e.id));
  }
  if (!opts.length) return null;
  return opts[variant % opts.length];
}

export function prescription(ex: Exercise, goal: Goal, index: number, beginner: boolean): Omit<PlanExercise, 'exId'> {
  if (ex.timed) return { sets: 3, repMin: 30, repMax: 60, restSec: 45 };
  let p: Omit<PlanExercise, 'exId'>;
  const main = ex.compound && index < 2;
  if (goal === 'strength') {
    p = main
      ? { sets: 4, repMin: 3, repMax: 6, restSec: 180 }
      : ex.compound
        ? { sets: 3, repMin: 6, repMax: 8, restSec: 120 }
        : { sets: 3, repMin: 8, repMax: 12, restSec: 75 };
  } else if (goal === 'muscle') {
    p = main
      ? { sets: 4, repMin: 8, repMax: 12, restSec: 120 }
      : ex.compound
        ? { sets: 3, repMin: 8, repMax: 12, restSec: 90 }
        : { sets: 3, repMin: 10, repMax: 15, restSec: 60 };
  } else if (goal === 'fat') {
    p = ex.compound
      ? { sets: 3, repMin: 6, repMax: 10, restSec: 120 }
      : { sets: 2, repMin: 10, repMax: 15, restSec: 60 };
  } else {
    p = ex.compound
      ? { sets: 3, repMin: 8, repMax: 10, restSec: 90 }
      : { sets: 2, repMin: 10, repMax: 15, restSec: 60 };
  }
  // Bodyweight moves are lighter, so they use higher reps.
  if (ex.needs.length === 0 && !ex.timed) {
    p = { ...p, repMin: Math.max(p.repMin, 8), repMax: Math.max(p.repMax, 15), restSec: Math.min(p.restSec, 90) };
  }
  if (beginner && p.sets > 3) p = { ...p, sets: 3 };
  return p;
}

export function exerciseCount(sessionMin: number): number {
  if (sessionMin <= 30) return 4;
  if (sessionMin <= 45) return 5;
  if (sessionMin <= 60) return 6;
  return 7;
}

export function generatePlan(p: Profile): Plan {
  const have = equipmentFor(p);
  const split = SPLITS[Math.min(6, Math.max(2, p.days))];
  const count = exerciseCount(p.sessionMin);
  const beginner = p.experience === 'new';
  const days: PlanDay[] = split.days.map(([name, key], i) => {
    const used = new Set<string>();
    const exercises: PlanExercise[] = [];
    for (const [pattern, variant] of DAYS[key]) {
      if (exercises.length >= count) break;
      const ex = pick(pattern, variant, have, used);
      if (!ex) continue;
      used.add(ex.id);
      exercises.push({ exId: ex.id, ...prescription(ex, p.goal, exercises.length, beginner) });
    }
    // With little equipment some slots have no match, so top up with other moves that fit the day.
    const fill: Pattern[] = [...new Set([...DAYS[key].map(([pt]) => pt), 'core' as Pattern])];
    let added = true;
    while (exercises.length < count && added) {
      added = false;
      for (const pattern of fill) {
        if (exercises.length >= count) break;
        const ex = optionsFor(pattern, have).find((e) => !used.has(e.id));
        if (!ex) continue;
        used.add(ex.id);
        exercises.push({ exId: ex.id, ...prescription(ex, p.goal, exercises.length, beginner) });
        added = true;
      }
    }
    return { id: `d${i + 1}`, name, exercises };
  });
  return { createdAt: new Date().toISOString(), split: split.name, days };
}

/** Other exercises that train the same thing with the user's equipment. */
export function alternatives(exId: string, have: Equip[], exclude: string[]): Exercise[] {
  const ex = getExercise(exId);
  let opts = optionsFor(ex.pattern, have);
  if (opts.filter((o) => o.id !== exId).length === 0 && FALLBACK[ex.pattern]) {
    opts = optionsFor(FALLBACK[ex.pattern]!, have);
  }
  return opts.filter((o) => o.id !== exId && !exclude.includes(o.id));
}
