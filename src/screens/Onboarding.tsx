import { useMemo, useState } from 'react';
import { Chips, NumField } from '../components/ui';
import { EQUIPMENT, getExercise } from '../data/exercises';
import { generatePlan } from '../lib/plan';
import { ACTIVITY_LABEL, GOAL_LABEL, calcTargets } from '../lib/targets';
import { fromDisplay } from '../lib/util';
import { completeOnboarding } from '../store';
import type { Equip, EquipmentPreset, Experience, Goal, Profile, Sex, Units } from '../types';

const GOALS: { id: Goal; desc: string }[] = [
  { id: 'muscle', desc: 'Gain size with 8 to 12 rep training and a small calorie surplus.' },
  { id: 'fat', desc: 'Drop body fat while keeping your strength, with a calorie deficit.' },
  { id: 'strength', desc: 'Lift heavier with low rep compound lifts.' },
  { id: 'general', desc: 'Balanced training and eating at maintenance.' },
];

const PRESETS: { id: EquipmentPreset; label: string; desc: string }[] = [
  { id: 'gym', label: 'Full gym', desc: 'Barbells, machines, cables, everything' },
  { id: 'home', label: 'Home gym', desc: 'Pick what you have' },
  { id: 'dumbbells', label: 'Dumbbells only', desc: 'A pair or a set of dumbbells' },
  { id: 'bodyweight', label: 'Bodyweight', desc: 'No equipment' },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sex, setSex] = useState<Sex>('male');
  const [units, setUnits] = useState<Units>('kg');
  const [age, setAge] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [ft, setFt] = useState<number | null>(null);
  const [inch, setInch] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [activity, setActivity] = useState(0);
  const [experience, setExperience] = useState<Experience>('new');
  const [days, setDays] = useState(3);
  const [sessionMin, setSessionMin] = useState(60);
  const [preset, setPreset] = useState<EquipmentPreset>('gym');
  const [equipment, setEquipment] = useState<Equip[]>(['db', 'bench']);

  const height = units === 'kg' ? heightCm : ft != null ? (ft * 12 + (inch ?? 0)) * 2.54 : null;

  const aboutError = useMemo(() => {
    if (age == null || height == null || weight == null) return 'Fill in age, height and weight to continue.';
    if (age < 13 || age > 90) return 'Age should be between 13 and 90.';
    if (height < 120 || height > 230) return 'That height looks off. Please check it.';
    const kg = fromDisplay(weight, units);
    if (kg < 30 || kg > 300) return 'That weight looks off. Please check it.';
    if (target != null) {
      const t = fromDisplay(target, units);
      if (t < 30 || t > 300) return 'That goal weight looks off. Please check it.';
    }
    return null;
  }, [age, height, weight, target, units]);

  const profile: Profile | null = useMemo(() => {
    if (!goal || aboutError || age == null || height == null || weight == null) return null;
    return {
      goal,
      sex,
      age,
      heightCm: Math.round(height),
      startWeightKg: fromDisplay(weight, units),
      targetWeightKg: target != null ? fromDisplay(target, units) : undefined,
      activity,
      experience,
      days,
      sessionMin,
      preset,
      equipment,
      units,
      createdAt: new Date().toISOString(),
    };
  }, [goal, aboutError, sex, age, height, weight, target, activity, experience, days, sessionMin, preset, equipment, units]);

  const preview = useMemo(() => (profile ? { targets: calcTargets(profile), plan: generatePlan(profile) } : null), [profile]);

  const canNext = step === 0 ? goal != null : step === 1 ? !aboutError : true;
  const last = step === 5;

  return (
    <div className="onboarding">
      <div className="ob-progress" aria-label={`Step ${step + 1} of 6`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      <div className="ob-body">
        {step === 0 && (
          <>
            <h1>What's your main goal?</h1>
            <p className="muted">This sets your workout style and your daily calories. You can change it later.</p>
            <div className="stack">
              {GOALS.map((g) => (
                <button key={g.id} className={'option' + (goal === g.id ? ' on' : '')} onClick={() => setGoal(g.id)} aria-pressed={goal === g.id}>
                  <strong>{GOAL_LABEL[g.id]}</strong>
                  <span>{g.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>About you</h1>
            <p className="muted">Used to estimate how many calories you burn in a day.</p>
            <div className="row2">
              <div>
                <div className="label">Units</div>
                <Chips label="Units" value={units} onChange={setUnits} options={[{ value: 'kg', label: 'kg / cm' }, { value: 'lb', label: 'lb / ft' }]} />
              </div>
              <div>
                <div className="label">Sex</div>
                <Chips label="Sex" value={sex} onChange={setSex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
              </div>
            </div>
            <NumField label="Age" value={age} onChange={setAge} decimal={false} suffix="years" />
            {units === 'kg' ? (
              <NumField label="Height" value={heightCm} onChange={setHeightCm} suffix="cm" />
            ) : (
              <div className="row2">
                <NumField label="Height (feet)" value={ft} onChange={setFt} decimal={false} suffix="ft" />
                <NumField label="Height (inches)" value={inch} onChange={setInch} suffix="in" />
              </div>
            )}
            <NumField label="Current weight" value={weight} onChange={setWeight} suffix={units} />
            <NumField label="Goal weight (optional)" value={target} onChange={setTarget} suffix={units} />
            {aboutError && (age != null || weight != null) && <p className="hint">{aboutError}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <h1>Activity and experience</h1>
            <div className="label">Outside the gym, I am…</div>
            <div className="stack">
              {ACTIVITY_LABEL.map((l, i) => (
                <button key={i} className={'option slim' + (activity === i ? ' on' : '')} onClick={() => setActivity(i)} aria-pressed={activity === i}>
                  <strong>{l}</strong>
                </button>
              ))}
            </div>
            <div className="label">I've been lifting for…</div>
            <Chips
              label="Experience"
              value={experience}
              onChange={setExperience}
              options={[
                { value: 'new', label: 'New' },
                { value: 'lt1', label: 'Under 1 year' },
                { value: '1to3', label: '1 to 3 years' },
                { value: '3plus', label: '3+ years' },
              ]}
            />
          </>
        )}

        {step === 3 && (
          <>
            <h1>Your schedule</h1>
            <div className="label">Days per week</div>
            <Chips label="Days per week" value={days} onChange={setDays} options={[2, 3, 4, 5, 6].map((d) => ({ value: d, label: String(d) }))} />
            <div className="label">Time per workout</div>
            <Chips label="Time per workout" value={sessionMin} onChange={setSessionMin} options={[30, 45, 60, 90].map((d) => ({ value: d, label: `${d} min` }))} />
            <p className="muted">Pick what you can keep up every week. Showing up beats the perfect plan.</p>
          </>
        )}

        {step === 4 && (
          <>
            <h1>What equipment do you have?</h1>
            <div className="stack">
              {PRESETS.map((p) => (
                <button key={p.id} className={'option slim' + (preset === p.id ? ' on' : '')} onClick={() => setPreset(p.id)} aria-pressed={preset === p.id}>
                  <strong>{p.label}</strong>
                  <span>{p.desc}</span>
                </button>
              ))}
            </div>
            {preset === 'home' && (
              <>
                <div className="label">Tick everything you have</div>
                <div className="chips wrap">
                  {EQUIPMENT.map((e) => {
                    const on = equipment.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        className={'chip' + (on ? ' on' : '')}
                        aria-pressed={on}
                        onClick={() => setEquipment(on ? equipment.filter((x) => x !== e.id) : [...equipment, e.id])}
                      >
                        {e.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {step === 5 && preview && profile && (
          <>
            <h1>Your plan is ready</h1>
            <div className="card">
              <div className="label">Daily targets</div>
              <div className="big">{preview.targets.kcal} kcal</div>
              <div className="macro-row">
                <span style={{ color: 'var(--protein)' }}>{preview.targets.protein} g protein</span>
                <span style={{ color: 'var(--carbs)' }}>{preview.targets.carbs} g carbs</span>
                <span style={{ color: 'var(--fat)' }}>{preview.targets.fat} g fat</span>
              </div>
              {profile.age < 18 && (
                <p className="hint">Because you're under 18, the app won't set an aggressive calorie cut. Check big diet changes with a parent or doctor.</p>
              )}
            </div>
            <div className="card">
              <div className="label">{preview.plan.split}</div>
              {preview.plan.days.map((d) => (
                <div key={d.id} className="plan-preview">
                  <strong>{d.name}</strong>
                  <span className="muted">{d.exercises.map((e) => getExercise(e.exId).name).join(', ')}</span>
                </div>
              ))}
            </div>
            <p className="muted small">Targets are estimates from standard formulas, not medical advice. You can edit everything in Settings.</p>
          </>
        )}
      </div>

      <div className="ob-foot">
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <button
          className="btn primary grow"
          disabled={!canNext}
          onClick={() => {
            if (last) {
              if (profile) completeOnboarding(profile);
            } else setStep(step + 1);
          }}
        >
          {last ? 'Start' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
