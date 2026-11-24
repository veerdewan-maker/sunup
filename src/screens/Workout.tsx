import { useEffect, useState } from 'react';
import { Empty, NumField, Page, Sheet, toast } from '../components/ui';
import { getExercise } from '../data/exercises';
import { doneSets, sessionPRs, sessionVolume, type PR } from '../lib/progression';
import { fmtClock, fmtDuration, fmtWeight, fromDisplay, toDisplay } from '../lib/util';
import { useNav } from '../nav';
import { addExerciseToActive, discardWorkout, finishWorkout, getState, swapActiveExercise, updateActive, useStore } from '../store';
import type { Session, SessionExercise, SetLog } from '../types';
import { ExerciseList, SwapSheet } from './Train';

// Kept outside the component so the countdown survives leaving and reopening the workout.
let rest: { end: number; total: number } | null = null;

function beep() {
  try {
    navigator.vibrate?.([200, 100, 200]);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    /* sound is a nice-to-have */
  }
}

function RestBar() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (rest && Date.now() >= rest.end) {
        rest = null;
        beep();
      }
      tick((n) => n + 1);
    }, 250);
    return () => clearInterval(t);
  }, []);
  if (!rest) return null;
  const left = (rest.end - Date.now()) / 1000;
  const pct = Math.max(0, Math.min(100, (left / rest.total) * 100));
  return (
    <div className="rest-bar" role="timer" aria-label="Rest timer">
      <div className="rest-fill" style={{ width: `${pct}%` }} />
      <div className="rest-content">
        <span>
          Rest <strong>{fmtClock(left)}</strong>
        </span>
        <div className="btn-row tight">
          <button
            className="btn small"
            onClick={() => {
              if (rest) rest = { end: rest.end + 15000, total: rest.total + 15 };
            }}
          >
            +15s
          </button>
          <button className="btn small" onClick={() => (rest = null)}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function Elapsed({ since }: { since: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);
  return <span className="pill">{fmtDuration(Date.now() - since)}</span>;
}

function patchExercise(index: number, fn: (e: SessionExercise) => SessionExercise) {
  updateActive((a) => ({ ...a, exercises: a.exercises.map((e, i) => (i === index ? fn(e) : e)) }));
}
function patchSet(exIndex: number, setIndex: number, patch: Partial<SetLog>) {
  patchExercise(exIndex, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)) }));
}

interface Summary {
  session: Session;
  prs: PR[];
}

export function Workout() {
  const s = useStore();
  const nav = useNav();
  const a = s.active;
  const units = s.profile!.units;
  const [how, setHow] = useState<number | null>(null);
  const [swap, setSwap] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  if (summary) {
    const x = summary.session;
    return (
      <Page title="Workout complete" onBack={nav.back}>
        <div className="card center">
          <div className="big">Nice work</div>
          <p className="muted">{x.name}</p>
          <div className="stats">
            <div>
              <strong>{fmtDuration((x.finishedAt ?? x.startedAt) - x.startedAt)}</strong>
              <span>Time</span>
            </div>
            <div>
              <strong>{x.exercises.reduce((n, e) => n + e.sets.length, 0)}</strong>
              <span>Sets</span>
            </div>
            <div>
              <strong>{Math.round(toDisplay(sessionVolume(x), units)).toLocaleString()}</strong>
              <span>{units} lifted</span>
            </div>
          </div>
        </div>
        {summary.prs.length > 0 && (
          <div className="card">
            <h2>Personal records</h2>
            {summary.prs.map((p) => (
              <div key={p.exId} className="hist-ex">
                <strong>{getExercise(p.exId).name}</strong>
                <span className="muted">
                  {fmtWeight(p.weightKg, units)} {units} × {p.reps}
                </span>
              </div>
            ))}
          </div>
        )}
        <button className="btn primary block" onClick={nav.back}>
          Done
        </button>
      </Page>
    );
  }

  if (!a) {
    return (
      <Page title="Workout" onBack={nav.back}>
        <Empty>No workout in progress. Start one from the Train tab.</Empty>
      </Page>
    );
  }

  const ticked = a.exercises.reduce((n, e) => n + doneSets(e).length, 0);

  const finish = () => {
    if (ticked === 0) {
      setConfirmDiscard(true);
      return;
    }
    const before = getState().sessions;
    const done = finishWorkout();
    rest = null;
    if (done) setSummary({ session: done, prs: sessionPRs(done, before) });
  };

  return (
    <Page
      title={a.name}
      onBack={nav.back}
      right={
        <button className="btn small primary" onClick={finish}>
          Finish
        </button>
      }
    >
      <div className="workout-meta">
        <Elapsed since={a.startedAt} />
        <span className="muted">{ticked} sets done</span>
      </div>

      {a.exercises.length === 0 && <Empty>Add your first exercise to get going.</Empty>}

      {a.exercises.map((e, i) => {
        const ex = getExercise(e.exId);
        return (
          <section key={i} className="card">
            <div className="card-head">
              <h2>{ex.name}</h2>
              <span className="pill">
                {e.repMin}–{e.repMax} {ex.timed ? 'sec' : 'reps'}
              </span>
            </div>
            {e.hint && <p className="muted small">{e.hint}</p>}
            {how === i && <p className="how">{ex.how}</p>}
            <div className="set-head muted small">
              <span>Set</span>
              <span>{units}</span>
              <span>{ex.timed ? 'Seconds' : 'Reps'}</span>
              <span>Done</span>
            </div>
            {e.sets.map((st, j) => (
              <div key={j} className={'set-row' + (st.done ? ' done' : '')}>
                <span className="set-n">{j + 1}</span>
                <NumField
                  label={`${ex.name} set ${j + 1} weight`}
                  bare
                  value={st.weightKg > 0 ? Number(toDisplay(st.weightKg, units).toFixed(2)) : null}
                  placeholder={ex.needs.length ? '0' : 'BW'}
                  onChange={(v) => patchSet(i, j, { weightKg: v ? fromDisplay(v, units) : 0 })}
                />
                <NumField
                  label={`${ex.name} set ${j + 1} ${ex.timed ? 'seconds' : 'reps'}`}
                  bare
                  decimal={false}
                  value={st.reps > 0 ? st.reps : null}
                  onChange={(v) => patchSet(i, j, { reps: v ?? 0 })}
                />
                <button
                  className={'tick' + (st.done ? ' on' : '')}
                  aria-label={`${ex.name} set ${j + 1} ${st.done ? 'done, tap to undo' : 'mark done'}`}
                  aria-pressed={st.done}
                  onClick={() => {
                    if (!st.done && st.reps <= 0) {
                      toast(ex.timed ? 'Enter the seconds first' : 'Enter your reps first');
                      return;
                    }
                    patchSet(i, j, { done: !st.done });
                    if (!st.done && s.settings.restTimer) rest = { end: Date.now() + e.restSec * 1000, total: e.restSec };
                  }}
                >
                  ✓
                </button>
              </div>
            ))}
            <input
              className="note"
              placeholder="Note (optional)"
              aria-label={`${ex.name} note`}
              value={e.note ?? ''}
              onChange={(ev) => patchExercise(i, (x) => ({ ...x, note: ev.target.value }))}
            />
            <div className="btn-row wrap">
              <button
                className="btn small"
                onClick={() =>
                  patchExercise(i, (x) => {
                    const last = x.sets[x.sets.length - 1];
                    return { ...x, sets: [...x.sets, { weightKg: last?.weightKg ?? 0, reps: last?.reps ?? x.repMin, done: false }] };
                  })
                }
              >
                + Set
              </button>
              <button className="btn small ghost" disabled={e.sets.length <= 1} onClick={() => patchExercise(i, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}>
                − Set
              </button>
              <button className="btn small ghost" onClick={() => setHow(how === i ? null : i)}>
                {how === i ? 'Hide how-to' : 'How-to'}
              </button>
              <button className="btn small ghost" onClick={() => setSwap(i)}>
                Swap
              </button>
              <button
                className="btn small ghost"
                onClick={() => updateActive((x) => ({ ...x, exercises: x.exercises.filter((_, k) => k !== i) }))}
                aria-label={`Remove ${ex.name}`}
              >
                Remove
              </button>
            </div>
          </section>
        );
      })}

      <div className="btn-col">
        <button className="btn block" onClick={() => setAdding(true)}>
          + Add exercise
        </button>
        <button className="btn block primary" onClick={finish}>
          Finish workout
        </button>
        <button className="btn block ghost" onClick={() => setConfirmDiscard(true)}>
          Discard workout
        </button>
      </div>
      <div className="rest-spacer" />
      <RestBar />

      {swap != null && (
        <SwapSheet
          exId={a.exercises[swap].exId}
          exclude={a.exercises.map((x) => x.exId)}
          onClose={() => setSwap(null)}
          onPick={(id) => {
            swapActiveExercise(swap, id);
            setSwap(null);
            toast(a.planDayId ? 'Swapped here and in your plan' : 'Exercise swapped');
          }}
        />
      )}
      {adding && (
        <Sheet title="Add exercise" onClose={() => setAdding(false)}>
          <ExerciseList
            exclude={a.exercises.map((x) => x.exId)}
            onPick={(ex) => {
              addExerciseToActive(ex.id);
              setAdding(false);
            }}
          />
        </Sheet>
      )}
      {confirmDiscard && (
        <Sheet title="Discard this workout?" onClose={() => setConfirmDiscard(false)}>
          <p className="muted">{ticked === 0 ? 'No sets are ticked yet, so there is nothing to save.' : `You have ${ticked} sets ticked. They will not be saved.`}</p>
          <div className="btn-col">
            <button
              className="btn block danger"
              onClick={() => {
                discardWorkout();
                rest = null;
                setConfirmDiscard(false);
                nav.back();
              }}
            >
              Discard workout
            </button>
            <button className="btn block" onClick={() => setConfirmDiscard(false)}>
              Keep going
            </button>
          </div>
        </Sheet>
      )}
    </Page>
  );
}
