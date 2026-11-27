import { getSport } from '../data/sports';
import type { Goal, Profile, Targets } from '../types';
import { round } from './util';

export const GOAL_LABEL: Record<Goal, string> = {
  sport: 'Play my sport better',
  muscle: 'Build muscle',
  fat: 'Lose fat',
  strength: 'Get stronger',
  general: 'General fitness',
};

export const ACTIVITY_LABEL = [
  'Mostly sitting (desk job, school)',
  'Lightly active (some walking)',
  'Active (on my feet most of the day)',
  'Very active (physical job or sport)',
];

const ACTIVITY_BASE = [1.2, 1.3, 1.45, 1.6];
const GOAL_ADJ: Record<Goal, number> = { sport: 0, muscle: 0.1, fat: -0.2, strength: 0.05, general: 0 };
const PROTEIN_PER_KG: Record<Goal, number> = { sport: 1.8, muscle: 2.0, fat: 2.2, strength: 1.8, general: 1.6 };

/** Mifflin-St Jeor resting energy, kcal per day. */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm'>, weightKg: number): number {
  return 10 * weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

export function maintenance(p: Profile, weightKg: number): number {
  const factor = ACTIVITY_BASE[p.activity] + 0.04 * p.days;
  // Practices and games burn far more than daily life, so add them on top, spread over the week.
  const sport = getSport(p.sport);
  const sportKcal = sport ? (sport.kcalPerSession * (p.sportSessions ?? 0)) / 7 : 0;
  return bmr(p, weightKg) * factor + sportKcal;
}

export function calcTargets(p: Profile, weightKg: number = p.startWeightKg): Targets {
  const maint = maintenance(p, weightKg);
  let adj = GOAL_ADJ[p.goal];
  // Under 18s are still growing, so never suggest more than a gentle deficit.
  if (p.age < 18 && adj < -0.1) adj = -0.1;
  const floor = p.sex === 'male' ? 1500 : 1200;
  const kcal = Math.max(floor, round(maint * (1 + adj), 10));
  const protein = round(PROTEIN_PER_KG[p.goal] * weightKg, 5);
  const fat = round((kcal * 0.25) / 9, 5);
  const carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4, 5));
  return { kcal, protein, carbs, fat, waterMl: 2500 };
}

/**
 * Carb cycling: training days get `extraCarbs` more grams, and rest days give the same total back,
 * so the weekly average stays the same. With a workout every day there is no rest day to take from.
 */
export function dayTargets(base: Targets, extraCarbs: number, planDays: number, training: boolean): Targets {
  if (!extraCarbs) return base;
  const restDays = 7 - planDays;
  const shift = training ? extraCarbs : restDays > 0 ? -round((extraCarbs * planDays) / restDays, 5) : 0;
  const carbs = Math.max(0, base.carbs + shift);
  return { ...base, carbs, kcal: base.kcal + (carbs - base.carbs) * 4 };
}
