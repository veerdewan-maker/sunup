export type Goal = 'sport' | 'muscle' | 'fat' | 'strength' | 'general';
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
  | 'core'
  | 'plyo'
  | 'rotate'
  | 'shoulder'
  | 'mobility';

export type Sport =
  | 'none'
  | 'diving'
  | 'swimming'
  | 'soccer'
  | 'basketball'
  | 'volleyball'
  | 'football'
  | 'track'
  | 'running'
  | 'tennis'
  | 'baseball'
  | 'gymnastics'
  | 'hockey'
  | 'wrestling'
  | 'cycling';

export type Season = 'off' | 'pre' | 'in';

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
  /** The sport the plan is built around ('none' or missing = general gym plan). */
  sport?: Sport;
  /** Practices plus competitions per week. */
  sportSessions?: number;
  season?: Season;
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
  /** How hard the exercise felt: 1 easy, 2 good, 3 hard, 4 couldn't do another rep. */
  effort?: Effort;
}

export type Effort = 1 | 2 | 3 | 4;
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

/** A group of foods saved under a name, logged together in one tap. */
export interface SavedMeal {
  id: string;
  name: string;
  items: Omit<FoodEntry, 'id' | 'date' | 'meal'>[];
}

export type MeasureKey = 'waist' | 'chest' | 'hips' | 'arm' | 'thigh';

/** Body measurements in centimetres, one entry per day. */
export interface MeasureLog {
  date: string;
  cm: Partial<Record<MeasureKey, number>>;
}

export type Pose = 'front' | 'side' | 'back';

/** A progress photo. The image itself is kept in IndexedDB under `photo-<id>`, not in the app state. */
export interface PhotoMeta {
  id: string;
  date: string;
  pose: Pose;
}

/** A sport practice or game, logged with its length and how hard it was (0 rest to 10 maximal). */
export interface Practice {
  id: string;
  date: string;
  kind: 'practice' | 'game';
  minutes: number;
  effort: number;
}

/** A competition date (meet, match, race). */
export interface Meet {
  id: string;
  date: string;
  name: string;
}

/** Morning check: each answer is 1 (bad) to 3 (good). `light` trims that day's workout. */
export interface Readiness {
  sleep: number;
  soreness: number;
  energy: number;
  light: boolean;
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
  /** Extra grams of carbs on training days (0 = off); rest days give them back. */
  trainCarbs?: number;
  /** Days the user marked as training (true) or rest (false) by hand. */
  dayType?: Record<string, boolean>;
  /** Date the user hid the weigh-in prompt on Today. */
  weighSkip?: string;
  /** Week (its Monday) whose recap the user has closed. */
  recapSeen?: string;
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
  savedMeals: SavedMeal[];
  measurements: MeasureLog[];
  photos: PhotoMeta[];
  practices: Practice[];
  meets: Meet[];
  readiness: Record<string, Readiness>;
  checkins: Checkin[];
  settings: Settings;
  /** When this copy was written to storage. */
  savedAt?: number;
}
