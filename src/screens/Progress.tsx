import { useMemo, useState } from 'react';
import { Chips, Empty, LineChart, NumField, Sheet, toast } from '../components/ui';
import { getExercise } from '../data/exercises';
import { allTimeBests, e1rmSeries } from '../lib/progression';
import { buildCheckin, checkinDue, loadChange, weeklyLoad, currentWeight, foodStreak, weeklyCounts, weeklyRate, weightTrend, workoutsInWeek } from '../lib/stats';
import { addDays, fmtBody, fmtWeight, fromDisplay, niceDate, parseYmd, shortDate, toDisplay, ymd } from '../lib/util';
import { deleteMeasurements, deleteWeight, logMeasurements, logWeight, saveCheckin, useStore } from '../store';
import type { MeasureKey } from '../types';
import { PhotosCard } from './Photos';
import { getSport } from '../data/sports';

function CheckinCard() {
  const s = useStore();
  const units = s.profile!.units;
  const c = useMemo(() => buildCheckin(s), [s]);
  const sign = (n: number) => (n > 0 ? '+' : '');
  return (
    <section className="card tip">
      <h2>Weekly check-in</h2>
      <div className="stats">
        <div>
          <strong>{c.weightChangeKg == null ? '–' : `${sign(c.weightChangeKg)}${Number(toDisplay(c.weightChangeKg, units).toFixed(1))}`}</strong>
          <span>{units} this week</span>
        </div>
        <div>
          <strong>
            {c.workouts}/{c.planned}
          </strong>
          <span>workouts</span>
        </div>
        <div>
          <strong>{c.avgKcal ?? '–'}</strong>
          <span>avg kcal</span>
        </div>
        <div>
          <strong>{c.avgProtein ?? '–'}</strong>
          <span>avg protein</span>
        </div>
      </div>
      {c.weightChangeKg == null && <p className="muted small">Weigh in a few times a week and the check-in can tell you whether your calories need adjusting.</p>}
      {c.kcalDelta !== 0 ? (
        <>
          <p>
            Your weight is moving {c.kcalDelta > 0 === (s.profile!.goal === 'muscle') ? 'slower' : 'faster'} than planned for your goal. Suggested change:{' '}
            <strong>
              {sign(c.kcalDelta)}
              {c.kcalDelta} kcal per day
            </strong>{' '}
            (new target {s.targets.kcal + c.kcalDelta} kcal).
          </p>
          <div className="btn-row">
            <button
              className="btn small primary"
              onClick={() => {
                saveCheckin(c, true);
                toast('Calorie target updated');
              }}
            >
              Accept change
            </button>
            <button className="btn small ghost" onClick={() => saveCheckin(c, false)}>
              Skip
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">{c.weightChangeKg != null ? 'You are on track, so your targets stay the same.' : 'No change to your targets this week.'}</p>
          <button className="btn small primary" onClick={() => saveCheckin(c, false)}>
            Done
          </button>
        </>
      )}
    </section>
  );
}

const MEASURES: { key: MeasureKey; label: string }[] = [
  { key: 'waist', label: 'Waist' },
  { key: 'chest', label: 'Chest' },
  { key: 'hips', label: 'Hips' },
  { key: 'arm', label: 'Arm' },
  { key: 'thigh', label: 'Thigh' },
];
const CM_PER_IN = 2.54;

function MeasurementsCard() {
  const s = useStore();
  const imperial = s.profile!.units === 'lb';
  const unit = imperial ? 'in' : 'cm';
  const show = (cm: number) => Number((imperial ? cm / CM_PER_IN : cm).toFixed(1));
  const today = ymd();
  const logs = s.measurements;
  const todays = logs.find((m) => m.date === today);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<MeasureKey, number | null>>>({});
  const tracked = MEASURES.filter((m) => logs.some((l) => l.cm[m.key] != null));
  const [pick, setPick] = useState<MeasureKey | null>(null);
  const chartKey = pick && tracked.some((t) => t.key === pick) ? pick : tracked[0]?.key;
  const points = chartKey ? logs.filter((l) => l.cm[chartKey] != null).map((l) => ({ date: l.date, value: show(l.cm[chartKey]!) })) : [];

  const startEdit = () => {
    const base = todays?.cm ?? {};
    setDraft(Object.fromEntries(MEASURES.map((m) => [m.key, base[m.key] != null ? show(base[m.key]!) : null])));
    setOpen(true);
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>Measurements</h2>
        <span className="muted">{unit}</span>
      </div>
      {tracked.length === 0 ? (
        <Empty>The scale doesn't tell the whole story. Measure your waist, arms and more every couple of weeks to see where you're changing.</Empty>
      ) : (
        <>
          {tracked.map((m) => {
            const vals = logs.filter((l) => l.cm[m.key] != null);
            const first = vals[0].cm[m.key]!;
            const last = vals[vals.length - 1].cm[m.key]!;
            const diff = show(last) - show(first);
            return (
              <div key={m.key} className="food-row inline">
                <span>{m.label}</span>
                <span>
                  {show(last)} {unit}
                  {vals.length > 1 && (
                    <span className="muted small">
                      {' '}
                      ({diff > 0 ? '+' : ''}
                      {Number(diff.toFixed(1))} since {shortDate(vals[0].date)})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          {tracked.length > 1 && (
            <Chips label="Measurement to chart" value={chartKey!} onChange={setPick} options={tracked.map((t) => ({ value: t.key, label: t.label }))} />
          )}
          {points.length > 1 && <LineChart fmt={(v) => v.toFixed(1)} series={[{ points, color: 'var(--accent)', dots: true }]} />}
        </>
      )}
      <div className="btn-row">
        <button className="btn small primary" onClick={startEdit}>
          {todays ? "Edit today's" : 'Log measurements'}
        </button>
        {todays && (
          <button
            className="btn small ghost"
            onClick={() => {
              deleteMeasurements(today);
              toast("Today's measurements deleted");
            }}
          >
            Delete today's
          </button>
        )}
      </div>
      {open && (
        <Sheet title="Measurements" onClose={() => setOpen(false)}>
          <p className="muted small">Measure in the morning, tape snug but not tight. Fill in any you like and leave the rest blank.</p>
          <div className="row2">
            {MEASURES.map((m) => (
              <NumField
                key={m.key}
                label={m.label}
                value={draft[m.key] ?? null}
                onChange={(v) => setDraft({ ...draft, [m.key]: v })}
                suffix={unit}
              />
            ))}
          </div>
          <button
            className="btn primary block"
            onClick={() => {
              const cm = Object.fromEntries(
                Object.entries(draft)
                  .filter(([, v]) => v != null && v > 0)
                  .map(([k, v]) => [k, imperial ? v! * CM_PER_IN : v!]),
              );
              if (Object.values(cm).some((v) => v < 10 || v > 250)) {
                toast('One of those looks off. Please check it.');
                return;
              }
              logMeasurements(today, cm);
              setOpen(false);
              toast('Measurements saved');
            }}
          >
            Save
          </button>
        </Sheet>
      )}
    </section>
  );
}

function LoadCard() {
  const s = useStore();
  const weeks = useMemo(() => weeklyLoad(s, 6), [s]);
  const sport = getSport(s.profile!.sport);
  if (!sport) return null;
  const max = Math.max(1, ...weeks.map((w) => w.gym + w.sport));
  const change = loadChange(weeks);
  const any = weeks.some((w) => w.gym + w.sport > 0);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Training load</h2>
        <span className="muted">minutes × effort</span>
      </div>
      {!any ? (
        <Empty>Log your {sport.label.toLowerCase()} sessions on the Today screen. Together with your gym workouts, they show how hard each week was.</Empty>
      ) : (
        <>
          <div className="weeks six" role="img" aria-label="Training load for the last 6 weeks">
            {weeks.map((w) => (
              <div key={w.week} className="week">
                <div className="week-bar stack">
                  <div className="week-fill" style={{ height: `${(w.gym / max) * 100}%`, background: 'var(--accent)' }} />
                  <div className="week-fill" style={{ height: `${(w.sport / max) * 100}%`, background: 'var(--water)' }} />
                </div>
                <span>{Math.round((w.gym + w.sport) / 100) / 10}k</span>
              </div>
            ))}
          </div>
          <p className="muted small center">
            <span style={{ color: 'var(--water)' }}>■</span> {sport.label} <span style={{ color: 'var(--accent)' }}>■</span> Gym
          </p>
          {change != null && change > 0.3 && (
            <p className="hint">This week is already {Math.round(change * 100)}% above your recent average. Big jumps raise injury risk, so keep the rest of the week lighter if you can.</p>
          )}
        </>
      )}
    </section>
  );
}

export function Progress() {
  const s = useStore();
  const p = s.profile!;
  const units = p.units;
  const today = ymd();
  const todayWeight = s.weights.find((w) => w.date === today);
  const [input, setInput] = useState<number | null>(todayWeight ? Number(toDisplay(todayWeight.kg, units).toFixed(1)) : null);
  const [showAll, setShowAll] = useState(false);
  const trend = useMemo(() => weightTrend(s.weights), [s.weights]);
  const raw = useMemo(() => [...s.weights].sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({ date: w.date, value: toDisplay(w.kg, units) })), [s.weights, units]);
  const bests = useMemo(() => allTimeBests(s.sessions), [s.sessions]);
  const [lift, setLift] = useState<string | null>(null);
  const liftId = lift ?? bests[0]?.exId ?? null;
  const series = useMemo(() => (liftId ? e1rmSeries(liftId, s.sessions).map((x) => ({ date: x.date, value: toDisplay(x.value, units) })) : []), [liftId, s.sessions, units]);
  const weeks = useMemo(() => weeklyCounts(s.sessions, 8), [s.sessions]);
  const maxWeek = Math.max(p.days, ...weeks.map((w) => w.count));
  const current = currentWeight(s);
  const rate = weeklyRate(s.weights);

  let goal: { pct: number; text: string } | null = null;
  if (p.targetWeightKg != null && Math.abs(p.targetWeightKg - p.startWeightKg) > 0.05) {
    const total = p.targetWeightKg - p.startWeightKg;
    const done = current - p.startWeightKg;
    const pct = Math.max(0, Math.min(100, (done / total) * 100));
    const remaining = p.targetWeightKg - current;
    let text = `${fmtBody(Math.abs(remaining), units)} to go`;
    if (pct >= 100) text = 'Goal reached';
    else if (rate != null && Math.abs(rate) > 0.02 && Math.sign(rate) === Math.sign(remaining)) {
      const weeksLeft = remaining / rate;
      if (weeksLeft < 104) {
        const eta = parseYmd(addDays(today, Math.round(weeksLeft * 7)));
        text += ` · on pace for about ${eta.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    } else if (rate != null) text += ' · not trending toward it yet';
    goal = { pct, text };
  }

  const recent = [...s.weights].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Progress</h1>
      </header>

      {checkinDue(s) && <CheckinCard />}

      <section className="card">
        <div className="card-head">
          <h2>Body weight</h2>
          <span className="muted">7-day average {fmtBody(current, units)}</span>
        </div>
        <form
          className="row-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (input == null) return;
            const kg = fromDisplay(input, units);
            if (kg < 30 || kg > 300) {
              toast('That weight looks off. Please check it.');
              return;
            }
            logWeight(today, kg);
            toast(todayWeight ? "Today's weight updated" : 'Weight logged');
          }}
        >
          <NumField label="Today's weight" bare value={input} onChange={setInput} suffix={units} placeholder="Today's weight" />
          <button className="btn primary" type="submit" disabled={input == null}>
            {todayWeight ? 'Update' : 'Log'}
          </button>
        </form>
        {raw.length < 2 ? (
          <Empty>Log your weight on a few different days to see your trend line.</Empty>
        ) : (
          <>
            <LineChart
              fmt={(v) => v.toFixed(1)}
              series={[
                { points: raw, color: 'var(--muted)', dots: true },
                { points: trend.map((t) => ({ date: t.date, value: toDisplay(t.value, units) })), color: 'var(--accent)' },
              ]}
            />
            <p className="muted small center">Dots are weigh-ins. The line is your 7-day average.</p>
          </>
        )}
        {goal && (
          <div className="goal">
            <div className="bar-top">
              <span>{fmtBody(p.startWeightKg, units)}</span>
              <span>{fmtBody(p.targetWeightKg!, units)}</span>
            </div>
            <div className="bar-track tall">
              <div className="bar-fill" style={{ width: `${goal.pct}%`, background: 'var(--accent)' }} />
            </div>
            <p className="muted small">{goal.text}</p>
          </div>
        )}
        {recent.length > 0 && (
          <>
            {(showAll ? recent : recent.slice(0, 3)).map((w) => (
              <div key={w.date} className="food-row inline">
                <span>{niceDate(w.date)}</span>
                <span>
                  {fmtBody(w.kg, units)}
                  <button className="link-btn" onClick={() => deleteWeight(w.date)} aria-label={`Delete weight for ${niceDate(w.date)}`}>
                    Delete
                  </button>
                </span>
              </div>
            ))}
            {recent.length > 3 && (
              <button className="btn small ghost" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show fewer' : `Show all ${recent.length}`}
              </button>
            )}
          </>
        )}
      </section>

      <LoadCard />

      <MeasurementsCard />

      <PhotosCard />

      <section className="card">
        <div className="card-head">
          <h2>Strength</h2>
          <span className="muted">Estimated 1-rep max</span>
        </div>
        {bests.length === 0 ? (
          <Empty>Finish a workout with weights and your lifts will be charted here.</Empty>
        ) : (
          <>
            <select className="select" value={liftId ?? ''} onChange={(e) => setLift(e.target.value)} aria-label="Choose a lift">
              {bests.map((b) => (
                <option key={b.exId} value={b.exId}>
                  {getExercise(b.exId).name}
                </option>
              ))}
            </select>
            <LineChart fmt={(v) => String(Math.round(v))} series={[{ points: series, color: 'var(--accent)', dots: true }]} />
            <div className="label">Personal records</div>
            {bests.slice(0, 8).map((b) => (
              <div key={b.exId} className="food-row inline">
                <span>{getExercise(b.exId).name}</span>
                <span className="muted">
                  {fmtWeight(b.weightKg, units)} {units} × {b.reps} · {shortDate(b.date)}
                </span>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Consistency</h2>
          <span className="muted">
            {workoutsInWeek(s.sessions, today)} of {p.days} this week
          </span>
        </div>
        <div className="weeks" role="img" aria-label="Workouts per week for the last 8 weeks">
          {weeks.map((w) => (
            <div key={w.week} className="week">
              <div className="week-bar">
                <div className={'week-fill' + (w.count >= p.days ? ' hit' : '')} style={{ height: `${(w.count / maxWeek) * 100}%` }} />
              </div>
              <span>{w.count}</span>
            </div>
          ))}
        </div>
        <p className="muted small center">Workouts per week, last 8 weeks. Bright bars hit your {p.days}-day plan.</p>
        <div className="stats">
          <div>
            <strong>{s.sessions.filter((x) => x.finishedAt).length}</strong>
            <span>workouts total</span>
          </div>
          <div>
            <strong>{foodStreak(s.foodEntries)}</strong>
            <span>day food streak</span>
          </div>
        </div>
      </section>
    </div>
  );
}
