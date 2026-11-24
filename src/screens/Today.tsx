import { Bar, Ring } from '../components/ui';
import { getExercise } from '../data/exercises';
import { GOAL_LABEL } from '../lib/targets';
import { checkinDue, finished, nextPlanDayIndex, totalsFor, workoutsInWeek } from '../lib/stats';
import { daysBetween, ymd } from '../lib/util';
import { useNav } from '../nav';
import { addWater, patchSettings, startWorkout, useStore } from '../store';
import type { Meal } from '../types';

export function mealForNow(): Meal {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snacks';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function WaterCard({ date }: { date: string }) {
  const s = useStore();
  const ml = s.water[date] ?? 0;
  const pct = Math.min(100, (ml / s.targets.waterMl) * 100);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Water</h2>
        <span className="muted">
          {Number((ml / 1000).toFixed(2))} / {Number((s.targets.waterMl / 1000).toFixed(2))} L
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--protein)' }} />
      </div>
      <div className="btn-row">
        <button className="btn small" onClick={() => addWater(date, 250)}>
          + 250 ml
        </button>
        <button className="btn small" onClick={() => addWater(date, 500)}>
          + 500 ml
        </button>
        <button className="btn small ghost" disabled={ml <= 0} onClick={() => addWater(date, -250)} aria-label="Remove 250 ml">
          − 250
        </button>
      </div>
    </section>
  );
}

export function Today() {
  const s = useStore();
  const nav = useNav();
  const today = ymd();
  const p = s.profile!;
  const totals = totalsFor(s.foodEntries, today);
  const plan = s.plan;
  const next = plan?.days[nextPlanDayIndex(s)];
  const doneToday = finished(s.sessions).some((x) => x.date === today);
  const week = workoutsInWeek(s.sessions, today);
  const hasData = s.sessions.length > 0 || s.foodEntries.length > 0;
  const lastBackup = s.settings.lastBackupAt ?? s.settings.backupNudgeAt ?? p.createdAt;
  const backupDue = hasData && daysBetween(lastBackup.slice(0, 10), today) >= 14;
  const showInstall = !s.settings.installHintDismissed && !isStandalone();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const begin = (dayId: string | null) => {
    if (!s.active) startWorkout(dayId);
    nav.push({ name: 'workout' });
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <div className="muted small">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>Today</h1>
        </div>
        <button className="icon-btn" onClick={() => nav.push({ name: 'settings' })} aria-label="Settings">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </header>

      {showInstall && (
        <section className="card note">
          <div className="card-head">
            <h2>Add to your home screen</h2>
            <button className="icon-btn" onClick={() => patchSettings({ installHintDismissed: true })} aria-label="Dismiss">
              ✕
            </button>
          </div>
          <p className="muted">
            {ios
              ? 'In Safari, tap the Share button, then "Add to Home Screen". The app then opens full screen and works offline.'
              : 'Open your browser menu and choose "Install app" or "Add to Home screen". The app then opens full screen and works offline.'}
          </p>
        </section>
      )}

      {backupDue && (
        <section className="card note">
          <h2>Time to back up</h2>
          <p className="muted">Your data lives only on this device. Save a backup file so you can restore it if anything happens.</p>
          <div className="btn-row">
            <button className="btn small primary" onClick={() => nav.push({ name: 'settings' })}>
              Back up now
            </button>
            <button className="btn small ghost" onClick={() => patchSettings({ backupNudgeAt: new Date().toISOString() })}>
              Remind me later
            </button>
          </div>
        </section>
      )}

      {checkinDue(s) && (
        <section className="card note">
          <h2>Weekly check-in is ready</h2>
          <p className="muted">See how your week went and whether your targets need a tweak.</p>
          <button className="btn small primary" onClick={() => nav.setTab('progress')}>
            Open check-in
          </button>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>{s.active ? 'Workout in progress' : doneToday ? 'Workout done today' : 'Next workout'}</h2>
          <span className="muted">
            {week} of {p.days} this week
          </span>
        </div>
        {s.active ? (
          <>
            <div className="big">{s.active.name}</div>
            <button className="btn primary block" onClick={() => begin(null)}>
              Resume workout
            </button>
          </>
        ) : next ? (
          <>
            <div className="big">{next.name}</div>
            <p className="muted">{next.exercises.map((e) => getExercise(e.exId).name).join(' · ')}</p>
            <button className={'btn block ' + (doneToday ? '' : 'primary')} onClick={() => begin(next.id)}>
              {doneToday ? 'Start another workout' : 'Start workout'}
            </button>
          </>
        ) : (
          <button className="btn primary block" onClick={() => begin(null)}>
            Start a custom workout
          </button>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Food</h2>
          <span className="muted">{GOAL_LABEL[p.goal]}</span>
        </div>
        <div className="food-summary">
          <Ring value={totals.kcal} target={s.targets.kcal} />
          <div className="grow">
            <Bar label="Protein" value={totals.protein} target={s.targets.protein} unit="g" color="var(--protein)" />
            <Bar label="Carbs" value={totals.carbs} target={s.targets.carbs} unit="g" color="var(--carbs)" />
            <Bar label="Fat" value={totals.fat} target={s.targets.fat} unit="g" color="var(--fat)" />
          </div>
        </div>
        <button className="btn block" onClick={() => nav.push({ name: 'addFood', date: today, meal: mealForNow() })}>
          Log food
        </button>
      </section>

      <WaterCard date={today} />
    </div>
  );
}
