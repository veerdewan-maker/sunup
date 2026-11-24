import { useMemo, useState } from 'react';
import { Empty, Page, Sheet, toast } from '../components/ui';
import { EXERCISES, PATTERN_LABEL, getExercise } from '../data/exercises';
import { alternatives, available, equipmentFor } from '../lib/plan';
import { doneSets, sessionVolume } from '../lib/progression';
import { finished, nextPlanDayIndex, workoutsInWeek } from '../lib/stats';
import { fmtDuration, fmtWeight, niceDate, toDisplay, ymd } from '../lib/util';
import { useNav } from '../nav';
import { deleteSession, startWorkout, swapPlanExercise, useStore } from '../store';
import type { Exercise, PlanExercise } from '../types';

export function rxText(e: { sets: number; repMin: number; repMax: number }, timed?: boolean): string {
  return `${e.sets} × ${e.repMin}–${e.repMax}${timed ? ' sec' : ''}`;
}

export function Train() {
  const s = useStore();
  const nav = useNav();
  const plan = s.plan;
  const nextIdx = nextPlanDayIndex(s);
  const done = finished(s.sessions);
  const week = workoutsInWeek(s.sessions, ymd());

  const begin = (dayId: string | null) => {
    if (s.active) {
      toast('Finish or discard your current workout first.');
      nav.push({ name: 'workout' });
      return;
    }
    startWorkout(dayId);
    nav.push({ name: 'workout' });
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <div className="muted small">{plan?.split ?? 'No plan yet'}</div>
          <h1>Train</h1>
        </div>
        <span className="pill">
          {week} of {s.profile!.days} this week
        </span>
      </header>

      {plan?.days.map((d, i) => {
        const last = done.find((x) => x.planDayId === d.id);
        return (
          <section key={d.id} className={'card' + (i === nextIdx ? ' highlight' : '')}>
            <button className="card-link" onClick={() => nav.push({ name: 'day', dayId: d.id })} aria-label={`Open ${d.name}`}>
              <div className="card-head">
                <h2>{d.name}</h2>
                {i === nextIdx && <span className="pill accent">Up next</span>}
              </div>
              <p className="muted">{d.exercises.map((e) => getExercise(e.exId).name).join(' · ')}</p>
              <p className="muted small">
                {d.exercises.length} exercises · {last ? `last done ${niceDate(last.date).toLowerCase()}` : 'not done yet'}
              </p>
            </button>
            <div className="btn-row">
              <button className={'btn small ' + (i === nextIdx ? 'primary' : '')} onClick={() => begin(d.id)}>
                Start
              </button>
              <button className="btn small ghost" onClick={() => nav.push({ name: 'day', dayId: d.id })}>
                View and edit
              </button>
            </div>
          </section>
        );
      })}

      <div className="btn-col">
        <button className="btn block" onClick={() => begin(null)}>
          Start a custom workout
        </button>
        <button className="btn block ghost" onClick={() => nav.push({ name: 'library' })}>
          Exercise library
        </button>
        <button className="btn block ghost" onClick={() => nav.push({ name: 'history' })}>
          Workout history ({done.length})
        </button>
      </div>
    </div>
  );
}

export function SwapSheet({ exId, exclude, onPick, onClose }: { exId: string; exclude: string[]; onPick: (id: string) => void; onClose: () => void }) {
  const s = useStore();
  const opts = alternatives(exId, equipmentFor(s.profile!), exclude);
  return (
    <Sheet title={`Swap ${getExercise(exId).name}`} onClose={onClose}>
      {opts.length === 0 && <Empty>No other exercise fits your equipment for this movement. You can add equipment in Settings.</Empty>}
      <div className="list">
        {opts.map((o) => (
          <button key={o.id} className="list-row" onClick={() => onPick(o.id)}>
            <div>
              <strong>{o.name}</strong>
              <div className="muted small">{o.muscle}</div>
            </div>
            <span className="muted">Use</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function DayDetail({ dayId }: { dayId: string }) {
  const s = useStore();
  const nav = useNav();
  const day = s.plan?.days.find((d) => d.id === dayId);
  const [open, setOpen] = useState<number | null>(null);
  const [swap, setSwap] = useState<number | null>(null);
  if (!day) {
    return (
      <Page title="Workout" onBack={nav.back}>
        <Empty>This workout is no longer in your plan.</Empty>
      </Page>
    );
  }
  return (
    <Page title={day.name} onBack={nav.back}>
      <div className="list">
        {day.exercises.map((e: PlanExercise, i) => {
          const ex = getExercise(e.exId);
          return (
            <div key={i} className="card">
              <button className="card-link" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <div className="card-head">
                  <h2>{ex.name}</h2>
                  <span className="pill">{rxText(e, ex.timed)}</span>
                </div>
                <p className="muted small">
                  {ex.muscle} · rest {e.restSec}s
                </p>
              </button>
              {open === i && <p className="how">{ex.how}</p>}
              <div className="btn-row">
                <button className="btn small ghost" onClick={() => setOpen(open === i ? null : i)}>
                  {open === i ? 'Hide how-to' : 'How to do it'}
                </button>
                <button className="btn small ghost" onClick={() => setSwap(i)}>
                  Swap
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sticky-foot">
        <button
          className="btn primary block"
          onClick={() => {
            if (s.active) {
              toast('Finish or discard your current workout first.');
              return;
            }
            startWorkout(day.id);
            nav.replace({ name: 'workout' });
          }}
        >
          Start this workout
        </button>
      </div>
      {swap != null && (
        <SwapSheet
          exId={day.exercises[swap].exId}
          exclude={day.exercises.map((x) => x.exId)}
          onClose={() => setSwap(null)}
          onPick={(id) => {
            swapPlanExercise(day.id, swap, id);
            setSwap(null);
            toast('Exercise swapped');
          }}
        />
      )}
    </Page>
  );
}

const GROUPS: { label: string; patterns: string[] }[] = [
  { label: 'All', patterns: [] },
  { label: 'Legs', patterns: ['squat', 'hinge', 'lunge', 'quadIso', 'hamIso', 'glute', 'calves'] },
  { label: 'Chest', patterns: ['hpush', 'chestIso'] },
  { label: 'Back', patterns: ['hpull', 'vpull', 'rearDelt'] },
  { label: 'Shoulders', patterns: ['vpush', 'latRaise', 'rearDelt'] },
  { label: 'Arms', patterns: ['biceps', 'triceps'] },
  { label: 'Core', patterns: ['core'] },
];

export function ExerciseList({ onPick, exclude = [] }: { onPick?: (ex: Exercise) => void; exclude?: string[] }) {
  const s = useStore();
  const have = equipmentFor(s.profile!);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('All');
  const [mine, setMine] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => {
    const g = GROUPS.find((x) => x.label === group)!;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return EXERCISES.filter(
      (e) =>
        !exclude.includes(e.id) &&
        (g.patterns.length === 0 || g.patterns.includes(e.pattern)) &&
        (!mine || available(e, have)) &&
        words.every((w) => e.name.toLowerCase().includes(w) || e.muscle.toLowerCase().includes(w)),
    );
  }, [q, group, mine, have, exclude]);
  return (
    <>
      <input className="search" type="search" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      <div className="chips scroll">
        {GROUPS.map((g) => (
          <button key={g.label} className={'chip' + (group === g.label ? ' on' : '')} onClick={() => setGroup(g.label)} aria-pressed={group === g.label}>
            {g.label}
          </button>
        ))}
      </div>
      <label className="check">
        <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only show what I can do with my equipment
      </label>
      {list.length === 0 && <Empty>No exercises match. Try a different search or untick the equipment filter.</Empty>}
      <div className="list">
        {list.map((e) => (
          <div key={e.id} className="list-row col">
            <button className="row-main" onClick={() => (onPick ? onPick(e) : setOpen(open === e.id ? null : e.id))} aria-expanded={onPick ? undefined : open === e.id}>
              <div>
                <strong>{e.name}</strong>
                <div className="muted small">
                  {PATTERN_LABEL[e.pattern] === e.muscle ? e.muscle : `${PATTERN_LABEL[e.pattern]} · ${e.muscle}`}
                </div>
              </div>
              <span className="muted">{onPick ? 'Add' : open === e.id ? '−' : '+'}</span>
            </button>
            {!onPick && open === e.id && <p className="how">{e.how}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

export function Library() {
  const nav = useNav();
  return (
    <Page title="Exercise library" onBack={nav.back}>
      <ExerciseList />
    </Page>
  );
}

export function History() {
  const s = useStore();
  const nav = useNav();
  const units = s.profile!.units;
  const list = finished(s.sessions);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <Page title="Workout history" onBack={nav.back}>
      {list.length === 0 && <Empty>No workouts yet. Finish your first one and it will show up here.</Empty>}
      <div className="list">
        {list.map((x) => (
          <div key={x.id} className="card">
            <button className="card-link" onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id}>
              <div className="card-head">
                <h2>{x.name}</h2>
                <span className="muted">{niceDate(x.date)}</span>
              </div>
              <p className="muted small">
                {fmtDuration((x.finishedAt ?? x.startedAt) - x.startedAt)} · {x.exercises.reduce((a, e) => a + doneSets(e).length, 0)} sets ·{' '}
                {Math.round(toDisplay(sessionVolume(x), units)).toLocaleString()} {units} lifted
              </p>
            </button>
            {open === x.id && (
              <>
                {x.exercises.map((e, i) => {
                  const ex = getExercise(e.exId);
                  return (
                    <div key={i} className="hist-ex">
                      <strong>{ex.name}</strong>
                      <span className="muted">
                        {doneSets(e)
                          .map((st) => (st.weightKg > 0 ? `${fmtWeight(st.weightKg, units)} × ${st.reps}` : `${st.reps}${ex.timed ? ' s' : ''}`))
                          .join(', ')}
                      </span>
                      {e.note && <span className="muted small">Note: {e.note}</span>}
                    </div>
                  );
                })}
                <div className="btn-row">
                  {confirm === x.id ? (
                    <>
                      <button
                        className="btn small danger"
                        onClick={() => {
                          deleteSession(x.id);
                          setConfirm(null);
                          toast('Workout deleted');
                        }}
                      >
                        Yes, delete it
                      </button>
                      <button className="btn small ghost" onClick={() => setConfirm(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button className="btn small ghost" onClick={() => setConfirm(x.id)}>
                      Delete workout
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Page>
  );
}
