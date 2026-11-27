import type { Pattern, Season, Sport } from '../types';

/** One exercise slot in a sport day: a movement pattern, with preferred exercises tried first. */
export interface SportSlot {
  p: Pattern;
  ids?: string[];
  v?: number;
}

export interface SportDay {
  name: string;
  slots: SportSlot[];
}

export interface SportInfo {
  id: Sport;
  label: string;
  /** What the sport asks of the body, in one or two sentences. */
  demands: string;
  /** What the gym plan works on for this sport, short phrases. */
  focus: string[];
  /** Rough extra calories burned per practice or game. */
  kcalPerSession: number;
  /** Day templates, most important slots first. Plans rotate through them. */
  days: SportDay[];
}

const s = (p: Pattern, ...ids: string[]): SportSlot => ({ p, ids });
const v = (p: Pattern, variant: number): SportSlot => ({ p, v: variant });

const DIVING: SportDay[] = [
  {
    name: 'Takeoff power',
    slots: [
      s('plyo', 'cmj-arm-swing', 'hurdle-step-jump'),
      s('squat', 'front-squat', 'goblet-squat', 'kb-goblet-squat', 'db-squat', 'bw-squat'),
      s('vpush', 'ohp', 'db-shoulder-press', 'pike-push-up'),
      s('core', 'hollow-hold'),
      s('shoulder', 'band-external-rotation', 'cable-external-rotation', 'side-lying-er', 'ytw-raise'),
      v('hinge', 1),
      s('mobility', 'pike-stretch'),
    ],
  },
  {
    name: 'Spins and body shape',
    slots: [
      s('plyo', 'tuck-jump'),
      v('hinge', 0),
      v('vpull', 0),
      s('core', 'v-up', 'pike-compression'),
      s('rotate', 'cable-woodchop', 'band-woodchop', 'db-woodchop', 'rotational-lunge'),
      v('lunge', 0),
      s('mobility', 'shoulder-dislocate', 'overhead-reach'),
    ],
  },
  {
    name: 'Landings and control',
    slots: [
      s('plyo', 'drop-landing', 'squat-jump'),
      v('lunge', 1),
      v('hpull', 0),
      s('core', 'arch-hold'),
      s('shoulder', 'ytw-raise', 'scap-pushup'),
      v('hpush', 0),
      s('mobility', 'pancake-stretch'),
      v('calves', 0),
    ],
  },
];

const GYMNASTICS: SportDay[] = [
  { ...DIVING[0], name: 'Power and handstands' },
  { name: 'Pulling and compression', slots: [s('plyo', 'tuck-jump'), v('vpull', 0), s('core', 'pike-compression', 'v-up'), v('triceps', 0), v('hinge', 0), s('shoulder', 'scap-pushup'), s('mobility', 'pancake-stretch')] },
  DIVING[2],
];

const JUMPING: SportDay[] = [
  { name: 'Jump power', slots: [s('plyo', 'box-jump', 'cmj-arm-swing'), v('squat', 0), v('vpull', 0), v('hinge', 1), s('shoulder', 'band-external-rotation', 'cable-external-rotation', 'ytw-raise'), s('core', 'pallof-press', 'band-pallof-press', 'dead-bug'), v('calves', 0)] },
  { name: 'Strength and landings', slots: [s('plyo', 'drop-landing', 'squat-jump'), v('hinge', 0), v('hpush', 0), v('lunge', 0), v('hpull', 0), s('core', 'side-plank'), s('mobility', 'ankle-rock')] },
  { name: 'Speed and single leg', slots: [s('plyo', 'lateral-bound', 'pogo-hops'), v('lunge', 1), v('vpush', 0), s('hamIso', 'nordic-curl'), s('rotate'), v('glute', 0), s('core', 'hollow-hold')] },
];

const FIELD: SportDay[] = [
  { name: 'Acceleration', slots: [s('plyo', 'sprint-start', 'broad-jump'), v('squat', 0), s('hamIso', 'nordic-curl'), v('hpull', 0), s('core', 'copenhagen-plank', 'side-plank'), v('calves', 0), s('mobility', 'hip-flexor-stretch')] },
  { name: 'Change of direction', slots: [s('plyo', 'lateral-bound'), v('hinge', 0), v('lunge', 0), v('hpush', 0), s('rotate'), v('glute', 0), s('core', 'pallof-press', 'band-pallof-press', 'dead-bug')] },
  { name: 'Single-leg strength', slots: [s('plyo', 'pogo-hops', 'squat-jump'), s('lunge', 'bulgarian-split-squat', 'db-step-up', 'step-up'), s('hinge', 'sl-rdl'), v('vpull', 0), s('hamIso', 'nordic-curl'), s('core', 'copenhagen-plank', 'side-plank'), s('mobility', 'ankle-rock')] },
];

const FOOTBALL: SportDay[] = [
  { name: 'Lower power', slots: [s('plyo', 'broad-jump', 'box-jump'), v('squat', 0), v('hinge', 1), s('hamIso', 'nordic-curl'), v('lunge', 0), s('core', 'farmer-carry', 'plank'), v('calves', 0)] },
  { name: 'Upper strength', slots: [s('plyo', 'sprint-start'), v('hpush', 0), v('hpull', 0), v('vpush', 0), v('vpull', 0), s('rotate'), s('shoulder', 'band-external-rotation', 'ytw-raise')] },
  { name: 'Total body', slots: [s('plyo', 'lateral-bound'), v('hinge', 0), v('hpush', 1), s('glute', 'hip-thrust', 'db-hip-thrust', 'glute-bridge'), v('hpull', 1), s('core', 'copenhagen-plank', 'side-plank'), s('mobility', 'hip-flexor-stretch')] },
];

const SWIM: SportDay[] = [
  { name: 'Pull strength', slots: [v('vpull', 0), s('plyo', 'squat-jump', 'broad-jump'), v('hpull', 0), v('squat', 0), s('shoulder', 'band-external-rotation', 'cable-external-rotation', 'side-lying-er'), s('core', 'hollow-hold'), s('mobility', 'shoulder-dislocate', 'overhead-reach')] },
  { name: 'Starts and turns', slots: [s('plyo', 'box-jump', 'cmj-arm-swing'), v('hinge', 0), s('hpush', 'push-up', 'db-bench-press'), v('lunge', 0), s('shoulder', 'ytw-raise', 'scap-pushup'), s('core', 'pallof-press', 'band-pallof-press', 'dead-bug'), s('mobility', 'ankle-rock')] },
  { name: 'Body line', slots: [v('vpull', 1), v('squat', 1), v('hpull', 1), s('rotate'), s('core', 'arch-hold'), v('glute', 0), s('mobility', 'hip-flexor-stretch')] },
];

const SPRINT: SportDay[] = [
  { name: 'Acceleration', slots: [s('plyo', 'sprint-start'), s('plyo', 'broad-jump'), v('squat', 0), s('hamIso', 'nordic-curl'), v('hpull', 0), s('core', 'dead-bug', 'plank'), s('mobility', 'hip-flexor-stretch')] },
  { name: 'Elastic speed', slots: [s('plyo', 'pogo-hops'), s('plyo', 'lateral-bound', 'tuck-jump'), v('hinge', 0), s('lunge', 'bulgarian-split-squat', 'split-squat'), s('calves', 'sl-calf-raise', 'db-calf-raise'), v('hpush', 0), s('core', 'hollow-hold')] },
  { name: 'Hip strength', slots: [s('plyo', 'box-jump', 'squat-jump'), s('hinge', 'sl-rdl'), s('glute', 'hip-thrust', 'db-hip-thrust', 'sl-glute-bridge'), v('vpull', 0), s('hamIso', 'nordic-curl'), s('core', 'side-plank'), s('mobility', 'ankle-rock')] },
];

const ENDURANCE: SportDay[] = [
  { name: 'Single-leg strength', slots: [s('lunge', 'bulgarian-split-squat', 'split-squat'), s('hinge', 'sl-rdl'), s('calves', 'sl-calf-raise', 'db-calf-raise'), s('glute', 'sl-glute-bridge', 'glute-bridge'), v('hpull', 0), s('core', 'side-plank'), s('mobility', 'hip-flexor-stretch')] },
  { name: 'Stiffness and power', slots: [s('plyo', 'pogo-hops'), v('squat', 0), s('lunge', 'db-step-up', 'step-up'), s('hamIso', 'nordic-curl'), v('hpush', 0), s('core', 'dead-bug'), s('mobility', 'ankle-rock')] },
  { name: 'Hips and trunk', slots: [v('hinge', 0), s('glute', 'hip-thrust', 'db-hip-thrust', 'glute-bridge'), s('plyo', 'squat-jump'), v('vpull', 0), s('core', 'pallof-press', 'band-pallof-press', 'plank'), v('calves', 1), s('mobility', 'pike-stretch')] },
];

const SWING: SportDay[] = [
  { name: 'Rotation power', slots: [s('rotate'), s('plyo', 'lateral-bound'), v('squat', 0), v('hpull', 0), s('shoulder', 'band-external-rotation', 'cable-external-rotation', 'side-lying-er'), s('core', 'pallof-press', 'band-pallof-press', 'dead-bug'), s('mobility', 'hip-flexor-stretch')] },
  { name: 'Legs and shoulders', slots: [v('rotate', 1), v('hinge', 0), v('lunge', 0), v('hpush', 0), s('shoulder', 'ytw-raise', 'scap-pushup'), s('core', 'side-plank'), v('vpull', 0)] },
  { name: 'First step', slots: [s('plyo', 'broad-jump', 'sprint-start'), s('lunge', 'db-step-up', 'step-up'), v('hpull', 1), v('rotate', 2), s('shoulder', 'scap-pushup', 'wall-slide'), v('glute', 0), s('mobility', 'overhead-reach')] },
];

const GRAPPLING: SportDay[] = [
  { name: 'Pulling power', slots: [v('hinge', 0), v('vpull', 0), v('hpull', 0), s('plyo', 'broad-jump'), s('core', 'farmer-carry', 'plank'), s('rotate'), s('hamIso', 'nordic-curl')] },
  { name: 'Leg drive', slots: [s('plyo', 'squat-jump', 'box-jump'), v('squat', 0), v('hpush', 0), v('lunge', 0), s('core', 'copenhagen-plank', 'side-plank'), s('shoulder', 'band-external-rotation', 'ytw-raise'), s('mobility', 'hip-flexor-stretch')] },
  { name: 'Total body', slots: [v('hinge', 1), v('vpush', 0), v('hpull', 1), v('rotate', 1), s('core', 'hollow-hold'), v('glute', 0), v('biceps', 0)] },
];

export const SPORTS: SportInfo[] = [
  {
    id: 'diving',
    label: 'Diving',
    demands: 'Explosive takeoffs from the board and platform, a rigid body line in the air, fast tucks and pikes, strong shoulders for entries and handstands, and deep hamstring and shoulder flexibility.',
    focus: ['Jump and takeoff power', 'Hollow and arch body shape', 'Shoulder strength for entries', 'Pike and shoulder flexibility', 'Safe landings'],
    kcalPerSession: 350,
    days: DIVING,
  },
  {
    id: 'swimming',
    label: 'Swimming',
    demands: 'Pulling strength and endurance, healthy shoulders under huge volume, a stable streamlined body, and powerful starts and turns.',
    focus: ['Pulling strength', 'Rotator cuff care', 'Streamline core', 'Starts and turns'],
    kcalPerSession: 600,
    days: SWIM,
  },
  {
    id: 'soccer',
    label: 'Soccer',
    demands: 'Repeated sprints, cutting and kicking, with hamstrings and groin taking most of the strain.',
    focus: ['Acceleration', 'Hamstring and groin protection', 'Single-leg strength', 'Change of direction'],
    kcalPerSession: 600,
    days: FIELD,
  },
  {
    id: 'basketball',
    label: 'Basketball',
    demands: 'Repeated jumping and landing, quick lateral moves and contact, with lots of load on knees and ankles.',
    focus: ['Vertical jump', 'Landing control', 'Lateral quickness', 'Ankle and knee resilience'],
    kcalPerSession: 550,
    days: JUMPING,
  },
  {
    id: 'volleyball',
    label: 'Volleyball',
    demands: 'Max-height jumps for spiking and blocking, overhead swinging, and quick floor movement.',
    focus: ['Vertical jump', 'Shoulder health for hitting', 'Landing control', 'Trunk stability'],
    kcalPerSession: 450,
    days: JUMPING,
  },
  {
    id: 'football',
    label: 'American football',
    demands: 'Short explosive bursts, collisions and pushing, with high demands on total-body strength and power.',
    focus: ['Total-body strength', 'Explosive starts', 'Hamstring protection', 'Contact readiness'],
    kcalPerSession: 600,
    days: FOOTBALL,
  },
  {
    id: 'track',
    label: 'Sprints and jumps',
    demands: 'Maximum speed, elastic ankles and hips, and hamstrings that can take top-speed running.',
    focus: ['Acceleration', 'Elastic stiffness', 'Hamstring strength', 'Hip power'],
    kcalPerSession: 450,
    days: SPRINT,
  },
  {
    id: 'running',
    label: 'Distance running',
    demands: 'Thousands of single-leg landings, so strong calves, hips and feet matter more than size.',
    focus: ['Single-leg strength', 'Calf and ankle resilience', 'Hip stability', 'Running economy'],
    kcalPerSession: 600,
    days: ENDURANCE,
  },
  {
    id: 'cycling',
    label: 'Cycling',
    demands: 'Long efforts in a fixed position, driven by quads and glutes, with a trunk that has to hold you steady.',
    focus: ['Leg strength', 'Hip mobility', 'Trunk stability', 'Bone-loading jumps'],
    kcalPerSession: 650,
    days: ENDURANCE,
  },
  {
    id: 'tennis',
    label: 'Tennis',
    demands: 'Fast rotation for serves and groundstrokes, quick lateral footwork, and shoulders that take repeated overhead swings.',
    focus: ['Rotation power', 'Shoulder health', 'Lateral first step', 'Anti-rotation core'],
    kcalPerSession: 500,
    days: SWING,
  },
  {
    id: 'baseball',
    label: 'Baseball / softball',
    demands: 'Throwing and swinging power from the hips, plus a throwing shoulder that needs care.',
    focus: ['Rotation power', 'Throwing shoulder care', 'First-step speed', 'Hip strength'],
    kcalPerSession: 350,
    days: SWING,
  },
  {
    id: 'gymnastics',
    label: 'Gymnastics',
    demands: 'Strength relative to body weight, compression and body shape, powerful tumbling takeoffs and landings, and big flexibility.',
    focus: ['Relative strength', 'Compression and body shape', 'Takeoff and landing', 'Flexibility'],
    kcalPerSession: 450,
    days: GYMNASTICS,
  },
  {
    id: 'hockey',
    label: 'Hockey',
    demands: 'Explosive skating strides, contact, and a lot of strain on the groin and hips.',
    focus: ['Stride power', 'Groin and hip protection', 'Single-leg strength', 'Trunk for contact'],
    kcalPerSession: 600,
    days: FIELD,
  },
  {
    id: 'wrestling',
    label: 'Wrestling / combat',
    demands: 'Pulling, grip and hip drive against a resisting opponent, with power that holds up when tired.',
    focus: ['Pulling strength', 'Grip', 'Hip drive', 'Neck and trunk stability'],
    kcalPerSession: 650,
    days: GRAPPLING,
  },
];

export function getSport(id: Sport | undefined): SportInfo | null {
  return SPORTS.find((x) => x.id === id) ?? null;
}

export const SEASON_LABEL: Record<Season, string> = {
  off: 'Off-season',
  pre: 'Pre-season',
  in: 'In season',
};

/** Gym days that fit around this much sport. Busy weeks and the competitive season need fewer. */
export function recommendedDays(sessions: number, season: Season): number {
  if (season === 'in') return 2;
  if (sessions >= 6) return season === 'off' ? 3 : 2;
  if (sessions >= 3) return 3;
  return 4;
}
