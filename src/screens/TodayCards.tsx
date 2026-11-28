import { Chips } from '../components/ui';
import { sessionPRs } from '../lib/progression';
import { weeklyRecap } from '../lib/stats';
import { fmtBody, shortDate, addDays, ymd } from '../lib/util';
import { patchSettings, readinessScore, setReadiness, useStore } from '../store';

const Q: { key: 'sleep' | 'soreness' | 'energy'; label: string; opts: [string, string, string] }[] = [
  { key: 'sleep', label: 'Sleep', opts: ['Poor', 'OK', 'Great'] },
  { key: 'soreness', label: 'Soreness', opts: ['Very sore', 'A bit', 'Fresh'] },
  { key: 'energy', label: 'Energy', opts: ['Low', 'OK', 'High'] },
];

/** Three taps each morning. A low score offers a lighter workout for the day. */
export function ReadinessCard() {
  const s = useStore();
  const today = ymd();
  const r = s.readiness?.[today];
  const draft = r ?? { sleep: 0, soreness: 0, energy: 0, light: false };
  const answered = !!r && r.sleep > 0 && r.soreness > 0 && r.energy > 0;
  const score = answered ? readinessScore(r!) : 0;
  const set = (key: 'sleep' | 'soreness' | 'energy', v: number) => {
    const next = { sleep: draft.sleep, soreness: draft.soreness, energy: draft.energy, [key]: v };
    setReadiness(today, next);
  };
  return (
    <section className="card">
      <div className="card-head">
        <h2>How do you feel?</h2>
        {answered && <span className={'pill' + (score >= 7 ? ' accent' : '')}>{score >= 7 ? 'Ready' : score >= 5 ? 'Normal' : 'Take it easy'}</span>}
      </div>
      {Q.map((q) => (
        <div key={q.key} className="ready-row">
          <span className="muted small">{q.label}</span>
          <Chips<number> cols={3} label={q.label} value={draft[q.key]} onChange={(v) => set(q.key, v)} options={q.opts.map((o, i) => ({ value: i + 1, label: o }))} />
        </div>
      ))}
      {answered && (
        <>
          <p className="muted small">
            {score >= 7
              ? 'You are good to go. A great day to push for more reps or a heavier weight.'
              : score >= 5
                ? 'A normal day. Train as planned, and back off any set that feels wrong.'
                : 'Your body is asking for an easier day. Training lighter now helps you train harder later in the week.'}
          </p>
          <label className="check">
            <input type="checkbox" checked={r!.light} onChange={(e) => setReadiness(today, { ...r!, light: e.target.checked })} /> Make today's workout lighter (one set fewer per exercise)
          </label>
        </>
      )}
    </section>
  );
}

/** At the start of a week, show what went well last week. */
export function RecapCard() {
  const s = useStore();
  const today = ymd();
  const r = weeklyRecap(s, sessionPRs, today);
  if (!r || s.settings.recapSeen === r.week) return null;
  if (r.workouts + r.practices + r.loggedDays === 0) return null;
  const units = s.profile!.units;
  const wins: string[] = [];
  if (r.workouts >= r.planned) wins.push(`Every planned workout done (${r.workouts} of ${r.planned})`);
  else if (r.workouts > 0) wins.push(`${r.workouts} of ${r.planned} workouts done`);
  if (r.practices) wins.push(`${r.practices} practice${r.practices === 1 ? '' : 's'} or competition${r.practices === 1 ? '' : 's'} logged`);
  if (r.prs) wins.push(`${r.prs} personal record${r.prs === 1 ? '' : 's'}`);
  if (r.loggedDays) wins.push(`Protein target hit on ${r.proteinDays} of ${r.loggedDays} logged days`);
  if (r.weightChangeKg != null) wins.push(`Weight ${r.weightChangeKg >= 0 ? 'up' : 'down'} ${fmtBody(Math.abs(r.weightChangeKg), units)} on the 7-day average`);
  return (
    <section className="card tip">
      <div className="card-head">
        <h2>Last week</h2>
        <span className="muted small">
          {shortDate(r.week)} to {shortDate(addDays(r.week, 6))}
        </span>
      </div>
      <ul className="focus-list">
        {wins.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <p className="muted small">
        {r.workouts >= r.planned ? 'Showing up every time is what builds results. Keep it going.' : 'Any week with training in it counts. Pick one thing to do a bit better this week.'}
      </p>
      <button className="btn small primary" onClick={() => patchSettings({ recapSeen: r.week })}>
        Nice, close
      </button>
    </section>
  );
}
