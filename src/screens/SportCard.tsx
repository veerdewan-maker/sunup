import { useState } from 'react';
import { Chips, NumField, Sheet, toast } from '../components/ui';
import { getSport } from '../data/sports';
import { nextMeet } from '../lib/stats';
import { niceDate, shortDate, ymd } from '../lib/util';
import { addMeet, deleteMeet, deletePractice, logPractice, useStore } from '../store';

const EFFORT_WORDS = ['Rest', 'Very easy', 'Easy', 'Moderate', 'Somewhat hard', 'Hard', 'Hard', 'Very hard', 'Very hard', 'Near max', 'Max'];

function taperTip(days: number, sport: string): string | null {
  if (days === 0) return `Skip the gym today, eat a familiar carb-rich meal 3 to 4 hours before, and sip water. Good luck!`;
  if (days === 1) return `No gym today, or just mobility. Get to bed early and eat plenty of carbs.`;
  if (days === 2) return `Keep any gym work light: jumps and upper body only, no heavy legs.`;
  if (days <= 7) return `Drop your gym sets by about a third and don't try new maxes, so you arrive fresh for ${sport}.`;
  return null;
}

/** Log sport practices and games in a couple of taps, and keep an eye on the next competition. */
export function SportCard() {
  const s = useStore();
  const p = s.profile!;
  const sport = getSport(p.sport);
  const today = ymd();
  const [logging, setLogging] = useState(false);
  const [meets, setMeets] = useState(false);
  const [kind, setKind] = useState<'practice' | 'game'>('practice');
  const [minutes, setMinutes] = useState<number | null>(90);
  const [effort, setEffort] = useState(6);
  const [meetName, setMeetName] = useState('');
  const [meetDate, setMeetDate] = useState('');
  if (!sport) return null;

  const todays = s.practices.filter((x) => x.date === today);
  const meet = nextMeet(s, today);
  const tip = meet ? taperTip(meet.days, sport.label.toLowerCase()) : null;
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - ((weekStartDate.getDay() + 6) % 7));
  const thisWeek = s.practices.filter((x) => x.date >= ymd(weekStartDate)).length;

  return (
    <section className="card">
      <div className="card-head">
        <h2>{sport.label}</h2>
        <span className="muted">
          {thisWeek} of {p.sportSessions ?? 0} this week
        </span>
      </div>
      {todays.map((x) => (
        <div key={x.id} className="food-row inline">
          <span>
            {x.kind === 'game' ? 'Competition' : 'Practice'} · {x.minutes} min · effort {x.effort}/10
          </span>
          <button
            className="link-btn"
            onClick={() => {
              deletePractice(x.id);
              toast('Removed');
            }}
            aria-label="Delete this practice"
          >
            Delete
          </button>
        </div>
      ))}
      {meet ? (
        <p className={tip ? 'hint' : 'muted small'}>
          <strong>{meet.name}</strong> {meet.days === 0 ? 'is today' : meet.days === 1 ? 'is tomorrow' : `in ${meet.days} days (${shortDate(meet.date)})`}.
          {tip ? ` ${tip}` : ''}
        </p>
      ) : null}
      <div className="btn-row wrap">
        <button className="btn small primary" onClick={() => setLogging(true)}>
          {todays.length ? '+ Log another' : `Log ${sport.label.toLowerCase()} session`}
        </button>
        <button className="btn small ghost" onClick={() => setMeets(true)}>
          {meet ? 'Competitions' : '+ Add a competition'}
        </button>
      </div>

      {logging && (
        <Sheet title={`Log ${sport.label.toLowerCase()}`} onClose={() => setLogging(false)}>
          <Chips
            cols={2}
            label="Session type"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'practice', label: 'Practice' },
              { value: 'game', label: 'Competition' },
            ]}
          />
          <div className="label">How long?</div>
          <Chips<number>
            cols={4}
            label="Length"
            value={minutes ?? 0}
            onChange={setMinutes}
            options={[60, 90, 120, 150].map((m) => ({ value: m, label: `${m} min` }))}
          />
          <NumField label="Or type minutes" value={minutes} onChange={setMinutes} decimal={false} suffix="min" />
          <div className="label">How hard was it overall?</div>
          <Chips<number> cols={5} label="Session effort" value={effort} onChange={setEffort} options={[2, 4, 6, 8, 10].map((e) => ({ value: e, label: String(e) }))} />
          <p className="muted small">
            {effort}/10: {EFFORT_WORDS[effort]}. Rate the whole session, about 30 minutes after it ends.
          </p>
          <button
            className="btn primary block"
            disabled={!minutes || minutes < 5 || minutes > 600}
            onClick={() => {
              logPractice({ date: today, kind, minutes: minutes!, effort });
              setLogging(false);
              toast(`${kind === 'game' ? 'Competition' : 'Practice'} logged`);
            }}
          >
            Save
          </button>
        </Sheet>
      )}

      {meets && (
        <Sheet title="Competitions" onClose={() => setMeets(false)}>
          <p className="muted small">Add your meets or games and the app will tell you when to ease off the gym so you're fresh.</p>
          {s.meets
            .filter((m) => m.date >= today)
            .map((m) => (
              <div key={m.id} className="food-row inline">
                <span>
                  {m.name} · {niceDate(m.date)}
                </span>
                <button className="link-btn" onClick={() => deleteMeet(m.id)} aria-label={`Delete ${m.name}`}>
                  Delete
                </button>
              </div>
            ))}
          <label className="field">
            <span>Name</span>
            <div className="field-input">
              <input value={meetName} onChange={(e) => setMeetName(e.target.value)} placeholder="Regional championships" aria-label="Competition name" />
            </div>
          </label>
          <label className="field">
            <span>Date</span>
            <div className="field-input">
              <input type="date" min={today} value={meetDate} onChange={(e) => setMeetDate(e.target.value)} aria-label="Competition date" />
            </div>
          </label>
          <button
            className="btn primary block"
            disabled={!meetDate}
            onClick={() => {
              addMeet(meetDate, meetName);
              setMeetName('');
              setMeetDate('');
              toast('Competition added');
            }}
          >
            Add competition
          </button>
        </Sheet>
      )}
    </section>
  );
}
