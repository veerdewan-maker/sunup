import { useState } from 'react';
import { Bar, Ring, Sheet, toast } from '../components/ui';
import { totalsFor } from '../lib/stats';
import { addDays, niceDate, ymd } from '../lib/util';
import { useNav } from '../nav';
import { copyMeal, deleteFoodEntry, saveMeal, useStore } from '../store';
import type { Meal } from '../types';
import { WaterCard } from './Today';

export const MEALS: { id: Meal; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snacks', label: 'Snacks' },
];

export function Eat() {
  const s = useStore();
  const nav = useNav();
  const [date, setDate] = useState(ymd());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<Meal | null>(null);
  const [mealName, setMealName] = useState('');
  const totals = totalsFor(s.foodEntries, date);
  const yesterday = addDays(date, -1);

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Eat</h1>
        <div className="date-nav">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            ‹
          </button>
          <button className="date-label" onClick={() => setDate(ymd())} aria-label="Go to today">
            {niceDate(date)}
          </button>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} disabled={date >= ymd()} aria-label="Next day">
            ›
          </button>
        </div>
      </header>

      <section className="card">
        <div className="food-summary">
          <Ring value={totals.kcal} target={s.targets.kcal} />
          <div className="grow">
            <Bar label="Protein" value={totals.protein} target={s.targets.protein} unit="g" color="var(--protein)" />
            <Bar label="Carbs" value={totals.carbs} target={s.targets.carbs} unit="g" color="var(--carbs)" />
            <Bar label="Fat" value={totals.fat} target={s.targets.fat} unit="g" color="var(--fat)" />
          </div>
        </div>
        <p className="muted small center">
          {Math.round(totals.kcal)} of {s.targets.kcal} kcal eaten
        </p>
      </section>

      {MEALS.map((m) => {
        const entries = s.foodEntries.filter((e) => e.date === date && e.meal === m.id);
        const kcal = entries.reduce((a, e) => a + e.kcal, 0);
        const canCopy = entries.length === 0 && s.foodEntries.some((e) => e.date === yesterday && e.meal === m.id);
        return (
          <section key={m.id} className="card">
            <div className="card-head">
              <h2>{m.label}</h2>
              <span className="muted">{entries.length ? `${Math.round(kcal)} kcal` : ''}</span>
            </div>
            {entries.length === 0 && <p className="muted small">Nothing logged yet.</p>}
            {entries.map((e) => (
              <div key={e.id} className="food-row">
                <button className="row-main" onClick={() => setEditing(editing === e.id ? null : e.id)} aria-expanded={editing === e.id}>
                  <div>
                    <strong>{e.name}</strong>
                    <div className="muted small">
                      {e.brand ? `${e.brand} · ` : ''}
                      {e.qtyLabel} · P {Math.round(e.protein)} · C {Math.round(e.carbs)} · F {Math.round(e.fat)}
                    </div>
                  </div>
                  <span>{Math.round(e.kcal)}</span>
                </button>
                {editing === e.id && (
                  <div className="btn-row">
                    <button
                      className="btn small danger"
                      onClick={() => {
                        deleteFoodEntry(e.id);
                        setEditing(null);
                        toast('Removed');
                      }}
                    >
                      Remove
                    </button>
                    <button className="btn small ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="btn-row">
              <button className="btn small" onClick={() => nav.push({ name: 'addFood', date, meal: m.id })} aria-label={`Add food to ${m.label}`}>
                + Add food
              </button>
              {entries.length > 1 && (
                <button
                  className="btn small ghost"
                  onClick={() => {
                    setMealName('');
                    setSaving(m.id);
                  }}
                >
                  Save as meal
                </button>
              )}
              {canCopy && (
                <button
                  className="btn small ghost"
                  onClick={() => {
                    const n = copyMeal(yesterday, date, m.id);
                    toast(`Copied ${n} item${n === 1 ? '' : 's'}`);
                  }}
                >
                  Copy {niceDate(yesterday) === 'Yesterday' ? "yesterday's" : 'previous day'}
                </button>
              )}
            </div>
          </section>
        );
      })}

      <WaterCard date={date} />

      {saving && (
        <Sheet title="Save as a meal" onClose={() => setSaving(null)}>
          <p className="muted small">
            Saves these {s.foodEntries.filter((e) => e.date === date && e.meal === saving).length} foods together, so next time you can add them all from the Meals tab in one tap.
          </p>
          <form
            className="btn-col"
            onSubmit={(ev) => {
              ev.preventDefault();
              const sm = saveMeal(mealName, date, saving);
              setSaving(null);
              if (sm) toast(`Saved "${sm.name}"`);
            }}
          >
            <label className="field">
              <span>Name</span>
              <div className="field-input">
                <input value={mealName} onChange={(ev) => setMealName(ev.target.value)} placeholder="Usual breakfast" aria-label="Meal name" autoFocus />
              </div>
            </label>
            <button className="btn primary block" type="submit">
              Save meal
            </button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
