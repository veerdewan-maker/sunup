export type Goal = 'muscle' | 'fat' | 'strength' | 'general';
export type Sex = 'male' | 'female';
export type Units = 'kg' | 'lb';
export type Experience = 'new' | 'lt1' | '1to3' | '3plus';
export type EquipmentPreset = 'gym' | 'home' | 'dumbbells' | 'bodyweight';
export type Equip =
  | 'bb'
  | 'rack'
  | 'bench'
  | 'db'
  | 'cable'
  | 'machine'
  | 'pullup'
  | 'kb'
  | 'band'
  | 'dip';

export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'hpush'
  | 'vpush'
  | 'hpull'
  | 'vpull'
  | 'chestIso'
  | 'latRaise'
  | 'rearDelt'
  | 'biceps'
  | 'triceps'
  | 'quadIso'
  | 'hamIso'
  | 'glute'
  | 'calves'
  | 'core';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  muscle: string;
  needs: Equip[];
  compound: boolean;
  lower: boolean;
  timed?: boolean;
  how: string;
}

export interface Profile {
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg?: number;
  /** 0 desk job … 3 very active, outside the gym */
  activity: number;
  experience: Experience;
  days: number;
  sessionMin: number;
  preset: EquipmentPreset;
  equipment: Equip[];
  units: Units;
  createdAt: string;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}

export interface PlanExercise {
  exId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
}
export interface PlanDay {
  id: string;
  name: string;
  exercises: PlanExercise[];
}
export interface Plan {
  createdAt: string;
  split: string;
  days: PlanDay[];
}

export interface SetLog {
  weightKg: number;
  reps: number;
  done: boolean;
}
export interface SessionExercise {
  exId: string;
  sets: SetLog[];
  repMin: number;
  repMax: number;
  restSec: number;
  note?: string;
  hint?: string;
}
export interface Session {
  id: string;
  date: string;
  startedAt: number;
  finishedAt?: number;
  planDayId?: string;
  name: string;
  exercises: SessionExercise[];
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

/** Nutrition values are for `baseQty` of `unit` (for example 100 g, or 1 serving). */
export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  unit: 'g' | 'ml' | 'serving';
  baseQty: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Optional handy portion, in `unit`s (for example "1 egg" = 50 g). */
  serving?: { label: string; qty: number };
  source: 'builtin' | 'off' | 'custom';
  barcode?: string;
}

export interface FoodEntry {
  id: string;
  date: string;
  meal: Meal;
  name: string;
  brand?: string;
  qtyLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  food?: FoodItem;
  qty?: number;
}

export interface WeightLog {
  date: string;
  kg: number;
}

export interface Checkin {
  date: string;
  weightChangeKg: number | null;
  workouts: number;
  planned: number;
  avgKcal: number | null;
  avgProtein: number | null;
  kcalDelta: number;
  accepted: boolean;
}

export interface Settings {
  restTimer: boolean;
  lastBackupAt?: string;
  installHintDismissed?: boolean;
  backupNudgeAt?: string;
}

export interface AppState {
  v: 1;
  profile: Profile | null;
  targets: Targets;
  plan: Plan | null;
  sessions: Session[];
  active: Session | null;
  foodEntries: FoodEntry[];
  customFoods: FoodItem[];
  favourites: FoodItem[];
  water: Record<string, number>;
  weights: WeightLog[];
  checkins: Checkin[];
  settings: Settings;
  /** When this copy was written to storage. */
  savedAt?: number;
}
