import { useRef, useState } from 'react';
import { Chips, NumField, Page, Sheet, toast } from '../components/ui';
import { EQUIPMENT } from '../data/exercises';
import { GOAL_LABEL, calcTargets } from '../lib/targets';
import { currentWeight } from '../lib/stats';
import { fromDisplay, shortDate, toDisplay, ymd } from '../lib/util';
import { useNav } from '../nav';
import { exportJson, importJson, patchSettings, resetAll, setTargets, updateProfile, useStore } from '../store';
import type { Equip, EquipmentPreset, Goal, Targets, Units } from '../types';

export function Settings() {
  const s = useStore();
  const nav = useNav();
  const p = s.profile!;
  const file = useRef<HTMLInputElement>(null);
  const [t, setT] = useState<Targets>(s.targets);
  const [goal, setGoal] = useState<Goal>(p.goal);
  const [days, setDays] = useState(p.days);
  const [sessionMin, setSessionMin] = useState(p.sessionMin);
  const [preset, setPreset] = useState<EquipmentPreset>(p.preset);
  const [equipment, setEquipment] = useState<Equip[]>(p.equipment);
  const [goalWeight, setGoalWeight] = useState<number | null>(p.targetWeightKg != null ? Number(toDisplay(p.targetWeightKg, p.units).toFixed(1)) : null);
  const [confirm, setConfirm] = useState<null | 'plan' | 'reset' | { importText: string }>(null);

  const planChanged = goal !== p.goal || days !== p.days || sessionMin !== p.sessionMin || preset !== p.preset || (preset === 'home' && equipment.join() !== p.equipment.join());
  const targetsChanged = (Object.keys(t) as (keyof Targets)[]).some((k) => t[k] !== s.targets[k]);
  const macroKcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;

  const doExport = async () => {
    const name = `sunup-backup-${ymd()}.json`;
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const fileObj = new File([blob], name, { type: 'application/json' });
    try {
      // On phones the share sheet is the most reliable way to save to Files or a cloud drive.
      if (navigator.canShare?.({ files: [fileObj] }) && /iphone|ipad|android/i.test(navigator.userAgent)) {
        await navigator.share({ files: [fileObj], title: 'Sunup backup' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      patchSettings({ lastBackupAt: new Date().toISOString() });
      toast('Backup saved');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast('The backup could not be saved. Please try again.');
    }
  };

  return (
    <Page title="Settings" onBack={nav.back}>
      <section className="card">
        <h2>Daily targets</h2>
        <div className="row2">
          <NumField label="Calories" value={t.kcal} onChange={(v) => setT({ ...t, kcal: v ?? 0 })} decimal={false} suffix="kcal" />
          <NumField label="Protein" value={t.protein} onChange={(v) => setT({ ...t, protein: v ?? 0 })} decimal={false} suffix="g" />
        </div>
        <div className="row2">
          <NumField label="Carbs" value={t.carbs} onChange={(v) => setT({ ...t, carbs: v ?? 0 })} decimal={false} suffix="g" />
          <NumField label="Fat" value={t.fat} onChange={(v) => setT({ ...t, fat: v ?? 0 })} decimal={false} suffix="g" />
        </div>
        <NumField label="Water" value={t.waterMl} onChange={(v) => setT({ ...t, waterMl: v ?? 0 })} decimal={false} suffix="ml" />
        {Math.abs(macroKcal - t.kcal) > 60 && <p className="hint">These macros add up to {Math.round(macroKcal)} kcal, which is different from your calorie target.</p>}
        <div className="btn-row wrap">
          <button
            className="btn small primary"
            disabled={!targetsChanged || t.kcal < 800 || t.waterMl < 250}
            onClick={() => {
              setTargets(t);
              toast('Targets saved');
            }}
          >
            Save targets
          </button>
          <button
            className="btn small ghost"
            onClick={() => {
              const fresh = { ...calcTargets(p, currentWeight(s)), waterMl: t.waterMl };
              setT(fresh);
              setTargets(fresh);
              toast('Targets recalculated from your current weight');
            }}
          >
            Recalculate for me
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Goal and plan</h2>
        <div className="label">Goal</div>
        <Chips label="Goal" value={goal} onChange={setGoal} options={(Object.keys(GOAL_LABEL) as Goal[]).map((g) => ({ value: g, label: GOAL_LABEL[g] }))} />
        <div className="label">Days per week</div>
        <Chips label="Days per week" value={days} onChange={setDays} options={[2, 3, 4, 5, 6].map((d) => ({ value: d, label: String(d) }))} />
        <div className="label">Time per workout</div>
        <Chips label="Time per workout" value={sessionMin} onChange={setSessionMin} options={[30, 45, 60, 90].map((d) => ({ value: d, label: `${d} min` }))} />
        <div className="label">Equipment</div>
        <Chips
          label="Equipment"
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'gym', label: 'Full gym' },
            { value: 'home', label: 'Home gym' },
            { value: 'dumbbells', label: 'Dumbbells' },
            { value: 'bodyweight', label: 'Bodyweight' },
          ]}
        />
        {preset === 'home' && (
          <div className="chips wrap">
            {EQUIPMENT.map((e) => {
              const on = equipment.includes(e.id);
              return (
                <button key={e.id} className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setEquipment(on ? equipment.filter((x) => x !== e.id) : [...equipment, e.id])}>
                  {e.label}
                </button>
              );
            })}
          </div>
        )}
        <button className="btn small primary" disabled={!planChanged} onClick={() => setConfirm('plan')}>
          Rebuild my plan
        </button>
        <div className="row-form">
          <NumField label="Goal weight" value={goalWeight} onChange={setGoalWeight} suffix={p.units} />
          <button
            className="btn"
            onClick={() => {
              if (goalWeight != null && (fromDisplay(goalWeight, p.units) < 30 || fromDisplay(goalWeight, p.units) > 300)) {
                toast('That goal weight looks off. Please check it.');
                return;
              }
              updateProfile({ targetWeightKg: goalWeight != null ? fromDisplay(goalWeight, p.units) : undefined });
              toast(goalWeight != null ? 'Goal weight saved' : 'Goal weight removed');
            }}
          >
            Save
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Preferences</h2>
        <div className="label">Weight units</div>
        <Chips<Units> label="Weight units" value={p.units} onChange={(u) => updateProfile({ units: u })} options={[{ value: 'kg', label: 'Kilograms' }, { value: 'lb', label: 'Pounds' }]} />
        <label className="check">
          <input type="checkbox" checked={s.settings.restTimer} onChange={(e) => patchSettings({ restTimer: e.target.checked })} /> Start a rest timer when I tick a set
        </label>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted">
          Everything is stored on this device only. A backup file lets you restore your data on a new phone or after clearing your browser.{' '}
          {s.settings.lastBackupAt ? `Last backup: ${shortDate(s.settings.lastBackupAt.slice(0, 10))}.` : 'No backup made yet.'}
        </p>
        <div className="btn-row wrap">
          <button className="btn small primary" onClick={doExport}>
            Save a backup file
          </button>
          <button className="btn small" onClick={() => file.current?.click()}>
            Restore from a file
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Backup file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setConfirm({ importText: await f.text() });
          }}
        />
      </section>

      <section className="card">
        <h2>Start over</h2>
        <p className="muted">Erase all data on this device and go back to the setup screens.</p>
        <button className="btn small danger" onClick={() => setConfirm('reset')}>
          Erase everything
        </button>
      </section>

      <p className="muted small center">
        Sunup version 1. Food data from Open Food Facts (openfoodfacts.org, Open Database License) and USDA averages. Calorie targets are estimates, not medical advice.
      </p>

      {confirm === 'plan' && (
        <Sheet title="Rebuild your plan?" onClose={() => setConfirm(null)}>
          <p className="muted">This replaces your current workouts, including any swaps you made. Your workout history is kept. Calorie and macro targets are recalculated for the new goal.</p>
          <div className="btn-col">
            <button
              className="btn primary block"
              onClick={() => {
                updateProfile({ goal, days, sessionMin, preset, equipment }, { plan: true, targets: true });
                setConfirm(null);
                toast('New plan ready');
                nav.back();
              }}
            >
              Rebuild plan
            </button>
            <button className="btn block" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
      {confirm === 'reset' && (
        <Sheet title="Erase everything?" onClose={() => setConfirm(null)}>
          <p className="muted">All workouts, food logs and weigh-ins on this device will be deleted. This cannot be undone unless you have a backup file.</p>
          <div className="btn-col">
            <button
              className="btn danger block"
              onClick={() => {
                setConfirm(null);
                nav.back();
                setTimeout(resetAll, 50);
              }}
            >
              Erase everything
            </button>
            <button className="btn block" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
      {confirm && typeof confirm === 'object' && (
        <Sheet title="Restore from this backup?" onClose={() => setConfirm(null)}>
          <p className="muted">This replaces everything currently on this device with the contents of the backup file.</p>
          <div className="btn-col">
            <button
              className="btn primary block"
              onClick={() => {
                try {
                  importJson(confirm.importText);
                  toast('Backup restored');
                  setConfirm(null);
                  nav.back();
                } catch (err) {
                  setConfirm(null);
                  toast((err as Error).message);
                }
              }}
            >
              Restore
            </button>
            <button className="btn block" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </Page>
  );
}
