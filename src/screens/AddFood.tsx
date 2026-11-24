import { useEffect, useMemo, useRef, useState } from 'react';
import { Chips, Empty, NumField, Page, Sheet, toast } from '../components/ui';
import { searchBuiltin } from '../data/foods';
import { lookupBarcode, searchOnline } from '../lib/off';
import { uid } from '../lib/util';
import { useNav } from '../nav';
import { addFood, deleteCustomFood, isFavourite, macrosFor, quickAdd, recentFoods, saveCustomFood, toggleFavourite, useStore } from '../store';
import type { FoodItem, Meal } from '../types';
import { MEALS } from './Eat';

type TabId = 'search' | 'recent' | 'favourites' | 'mine' | 'quick';

function perText(f: FoodItem): string {
  const base = f.unit === 'serving' ? (f.serving?.label ?? '1 serving') : `${f.baseQty} ${f.unit}`;
  return `${Math.round(f.kcal)} kcal per ${base}`;
}

function FoodRow({ food, onPick }: { food: FoodItem; onPick: (f: FoodItem) => void }) {
  return (
    <button className="list-row" onClick={() => onPick(food)}>
      <div>
        <strong>{food.name}</strong>
        <div className="muted small">
          {food.brand ? `${food.brand} · ` : ''}
          {perText(food)}
        </div>
      </div>
      <span className="muted">+</span>
    </button>
  );
}

function FoodSheet({ food, meal, date, onClose, onAdded }: { food: FoodItem; meal: Meal; date: string; onClose: () => void; onAdded: () => void }) {
  const s = useStore();
  const hasServing = food.unit !== 'serving' && !!food.serving;
  const [mode, setMode] = useState<'serving' | 'unit'>(hasServing ? 'serving' : 'unit');
  const [amount, setAmount] = useState<number | null>(hasServing || food.unit === 'serving' ? 1 : 100);
  const [toMeal, setToMeal] = useState<Meal>(meal);
  const qty = (amount ?? 0) * (mode === 'serving' && food.serving ? food.serving.qty : 1);
  const m = macrosFor(food, qty);
  const fav = isFavourite(s, food);
  return (
    <Sheet title={food.name} onClose={onClose}>
      {food.brand && <p className="muted">{food.brand}</p>}
      <p className="muted small">
        {perText(food)}
        {food.source === 'off' ? ' · from Open Food Facts' : ''}
      </p>
      {hasServing && (
        <Chips
          label="Measure"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setAmount(v === 'serving' ? 1 : (food.serving?.qty ?? 100));
          }}
          options={[
            { value: 'serving', label: food.serving!.label },
            { value: 'unit', label: food.unit === 'ml' ? 'Millilitres' : 'Grams' },
          ]}
        />
      )}
      <NumField
        label={mode === 'serving' || food.unit === 'serving' ? 'How many?' : 'Amount'}
        value={amount}
        onChange={setAmount}
        suffix={mode === 'serving' || food.unit === 'serving' ? '×' : food.unit}
      />
      <div className="stats">
        <div>
          <strong>{m.kcal}</strong>
          <span>kcal</span>
        </div>
        <div>
          <strong style={{ color: 'var(--protein)' }}>{m.protein}</strong>
          <span>protein</span>
        </div>
        <div>
          <strong style={{ color: 'var(--carbs)' }}>{m.carbs}</strong>
          <span>carbs</span>
        </div>
        <div>
          <strong style={{ color: 'var(--fat)' }}>{m.fat}</strong>
          <span>fat</span>
        </div>
      </div>
      <div className="label">Meal</div>
      <Chips label="Meal" value={toMeal} onChange={setToMeal} options={MEALS.map((x) => ({ value: x.id, label: x.label }))} />
      <div className="btn-col">
        <button
          className="btn primary block"
          disabled={qty <= 0}
          onClick={() => {
            addFood(date, toMeal, food, qty);
            toast(`Added to ${MEALS.find((x) => x.id === toMeal)!.label.toLowerCase()}`);
            onAdded();
          }}
        >
          Add food
        </button>
        <button className="btn block ghost" onClick={() => toggleFavourite(food)} aria-pressed={fav}>
          {fav ? '★ Remove from favourites' : '☆ Save as favourite'}
        </button>
      </div>
    </Sheet>
  );
}

function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocamera');
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video.current!, (result) => {
          if (result && !cancelled) {
            cancelled = true;
            controls.stop();
            onCode(result.getText());
          }
        });
        stop = () => controls.stop();
        if (cancelled) controls.stop();
      } catch (e) {
        const name = (e as Error)?.name;
        setError(
          name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow the camera for this site in your browser settings, or type the barcode below.'
            : 'The camera could not be started on this device. You can type the barcode number below.',
        );
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Sheet title="Scan a barcode" onClose={onClose}>
      {!error && (
        <>
          <video ref={video} className="scanner" muted playsInline />
          <p className="muted small center">Point the camera at the barcode on the packet.</p>
        </>
      )}
      {error && <p className="hint">{error}</p>}
      <form
        className="row-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.replace(/\D/g, '').length >= 6) onCode(manual);
          else toast('Enter the full number under the barcode');
        }}
      >
        <input className="search" inputMode="numeric" placeholder="Or type the barcode number" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Barcode number" />
        <button className="btn" type="submit">
          Look up
        </button>
      </form>
    </Sheet>
  );
}

function CustomFoodForm({ initial, barcode, onSaved, onClose }: { initial?: FoodItem; barcode?: string; onSaved: (f: FoodItem) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [basis, setBasis] = useState<'serving' | 'g'>(initial ? (initial.unit === 'serving' ? 'serving' : 'g') : 'serving');
  const [servingLabel, setServingLabel] = useState(initial?.serving?.label ?? '');
  const [kcal, setKcal] = useState<number | null>(initial?.kcal ?? null);
  const [protein, setProtein] = useState<number | null>(initial?.protein ?? null);
  const [carbs, setCarbs] = useState<number | null>(initial?.carbs ?? null);
  const [fat, setFat] = useState<number | null>(initial?.fat ?? null);
  const ok = name.trim().length > 0 && kcal != null;
  return (
    <Sheet title={initial ? 'Edit food' : 'Create a food'} onClose={onClose}>
      {barcode && <p className="muted small">Barcode {barcode} was not found, so you can add it yourself.</p>}
      <label className="field">
        <span>Name</span>
        <div className="field-input">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Protein bar" aria-label="Food name" />
        </div>
      </label>
      <label className="field">
        <span>Brand (optional)</span>
        <div className="field-input">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand" />
        </div>
      </label>
      <div className="label">Nutrition is for</div>
      <Chips label="Nutrition is for" value={basis} onChange={setBasis} options={[{ value: 'serving', label: '1 serving' }, { value: 'g', label: '100 g' }]} />
      {basis === 'serving' && (
        <label className="field">
          <span>Serving description (optional)</span>
          <div className="field-input">
            <input value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="1 bar (60 g)" aria-label="Serving description" />
          </div>
        </label>
      )}
      <div className="row2">
        <NumField label="Calories" value={kcal} onChange={setKcal} suffix="kcal" />
        <NumField label="Protein" value={protein} onChange={setProtein} suffix="g" />
      </div>
      <div className="row2">
        <NumField label="Carbs" value={carbs} onChange={setCarbs} suffix="g" />
        <NumField label="Fat" value={fat} onChange={setFat} suffix="g" />
      </div>
      <button
        className="btn primary block"
        disabled={!ok}
        onClick={() => {
          const food: FoodItem = {
            id: initial?.id ?? `c-${uid()}`,
            name: name.trim(),
            brand: brand.trim() || undefined,
            unit: basis === 'serving' ? 'serving' : 'g',
            baseQty: basis === 'serving' ? 1 : 100,
            kcal: kcal ?? 0,
            protein: protein ?? 0,
            carbs: carbs ?? 0,
            fat: fat ?? 0,
            serving: basis === 'serving' && servingLabel.trim() ? { label: servingLabel.trim(), qty: 1 } : undefined,
            source: 'custom',
            barcode: barcode ?? initial?.barcode,
          };
          saveCustomFood(food);
          onSaved(food);
        }}
      >
        Save food
      </button>
    </Sheet>
  );
}

export function AddFood({ date, meal }: { date: string; meal: Meal }) {
  const s = useStore();
  const nav = useNav();
  const [tab, setTab] = useState<TabId>('search');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState<{ barcode?: string; initial?: FoodItem } | null>(null);
  const [online, setOnline] = useState<{ q: string; status: 'loading' | 'done' | 'error'; items: FoodItem[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const [qName, setQName] = useState('');
  const [qKcal, setQKcal] = useState<number | null>(null);
  const [qP, setQP] = useState<number | null>(null);
  const [qC, setQC] = useState<number | null>(null);
  const [qF, setQF] = useState<number | null>(null);

  const query = q.trim();
  const local = useMemo(() => {
    if (query.length < 2) return [];
    const words = query.toLowerCase().split(/\s+/);
    const mine = s.customFoods.filter((f) => words.every((w) => (f.name + ' ' + (f.brand ?? '')).toLowerCase().includes(w)));
    return [...mine, ...searchBuiltin(query)];
  }, [query, s.customFoods]);

  useEffect(() => () => abort.current?.abort(), []);

  const runOnline = async () => {
    if (query.length < 2) return;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setOnline({ q: query, status: 'loading', items: [] });
    try {
      const items = await searchOnline(query, ctl.signal);
      if (!ctl.signal.aborted) setOnline({ q: query, status: 'done', items });
    } catch {
      if (!ctl.signal.aborted) setOnline({ q: query, status: 'error', items: [] });
    }
  };

  const onCode = async (code: string) => {
    setScanning(false);
    const clean = code.replace(/\D/g, '');
    const mine = s.customFoods.find((f) => f.barcode === clean);
    if (mine) {
      setPicked(mine);
      return;
    }
    setBusy(true);
    try {
      const food = await lookupBarcode(clean);
      if (food) setPicked(food);
      else setCreating({ barcode: clean });
    } catch {
      toast(navigator.onLine ? 'The food database did not respond. Try again in a moment.' : 'You are offline. Barcode lookup needs a connection.');
    } finally {
      setBusy(false);
    }
  };

  const mealLabel = MEALS.find((m) => m.id === meal)!.label;
  const recent = recentFoods(s);
  const onlineStale = online && online.q !== query;

  return (
    <Page title={`Add to ${mealLabel}`} onBack={nav.back}>
      <div className="chips scroll">
        {(
          [
            ['search', 'Search'],
            ['recent', 'Recent'],
            ['favourites', 'Favourites'],
            ['mine', 'My foods'],
            ['quick', 'Quick add'],
          ] as [TabId, string][]
        ).map(([id, label]) => (
          <button key={id} className={'chip' + (tab === id ? ' on' : '')} onClick={() => setTab(id)} aria-pressed={tab === id}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          <form
            className="row-form"
            onSubmit={(e) => {
              e.preventDefault();
              runOnline();
            }}
          >
            <input className="search" type="search" placeholder="Search foods, e.g. chicken breast" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" autoFocus />
            <button className="btn" type="button" onClick={() => setScanning(true)} aria-label="Scan barcode">
              Scan
            </button>
          </form>
          {busy && <p className="muted center">Looking up barcode…</p>}
          {query.length < 2 && !busy && <Empty>Type at least 2 letters to search, or scan a barcode on a packet.</Empty>}
          {query.length >= 2 && (
            <>
              {local.length > 0 && <div className="label">Common foods</div>}
              <div className="list">
                {local.map((f) => (
                  <FoodRow key={f.id} food={f} onPick={setPicked} />
                ))}
              </div>
              {(!online || onlineStale) && (
                <button className="btn block" onClick={runOnline}>
                  Search branded products for "{query}"
                </button>
              )}
              {online && !onlineStale && online.status === 'loading' && <p className="muted center">Searching Open Food Facts…</p>}
              {online && !onlineStale && online.status === 'error' && (
                <div className="hint">
                  {navigator.onLine ? 'The food database did not respond. It can be slow at busy times.' : 'You are offline, so only common foods and your own foods are searchable.'}
                  <div className="btn-row">
                    <button className="btn small" onClick={runOnline}>
                      Try again
                    </button>
                  </div>
                </div>
              )}
              {online && !onlineStale && online.status === 'done' && (
                <>
                  <div className="label">Branded products</div>
                  {online.items.length === 0 && <Empty>No products found. Try fewer words, or create the food yourself under My foods.</Empty>}
                  <div className="list">
                    {online.items.map((f) => (
                      <FoodRow key={f.id} food={f} onPick={setPicked} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === 'recent' && (
        <>
          {recent.length === 0 && <Empty>Foods you log will show up here for one-tap adding.</Empty>}
          <div className="list">
            {recent.map((f) => (
              <FoodRow key={f.id} food={f} onPick={setPicked} />
            ))}
          </div>
        </>
      )}

      {tab === 'favourites' && (
        <>
          {s.favourites.length === 0 && <Empty>No favourites yet. Open any food and tap "Save as favourite".</Empty>}
          <div className="list">
            {s.favourites.map((f) => (
              <FoodRow key={f.id} food={f} onPick={setPicked} />
            ))}
          </div>
        </>
      )}

      {tab === 'mine' && (
        <>
          <button className="btn block" onClick={() => setCreating({})}>
            + Create a food
          </button>
          {s.customFoods.length === 0 && <Empty>Save foods you eat often with your own numbers from the label.</Empty>}
          <div className="list">
            {s.customFoods.map((f) => (
              <div key={f.id} className="list-row col">
                <FoodRow food={f} onPick={setPicked} />
                <div className="btn-row">
                  <button className="btn small ghost" onClick={() => setCreating({ initial: f })}>
                    Edit
                  </button>
                  <button
                    className="btn small ghost"
                    onClick={() => {
                      deleteCustomFood(f.id);
                      toast('Food deleted');
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'quick' && (
        <div className="card">
          <p className="muted small">Type the numbers straight in when you already know them.</p>
          <label className="field">
            <span>Name (optional)</span>
            <div className="field-input">
              <input value={qName} onChange={(e) => setQName(e.target.value)} placeholder="Restaurant meal" aria-label="Quick add name" />
            </div>
          </label>
          <div className="row2">
            <NumField label="Calories" value={qKcal} onChange={setQKcal} suffix="kcal" />
            <NumField label="Protein" value={qP} onChange={setQP} suffix="g" />
          </div>
          <div className="row2">
            <NumField label="Carbs" value={qC} onChange={setQC} suffix="g" />
            <NumField label="Fat" value={qF} onChange={setQF} suffix="g" />
          </div>
          <button
            className="btn primary block"
            disabled={qKcal == null && qP == null && qC == null && qF == null}
            onClick={() => {
              const protein = qP ?? 0;
              const carbs = qC ?? 0;
              const fat = qF ?? 0;
              quickAdd(date, meal, qName.trim(), { kcal: qKcal ?? Math.round(protein * 4 + carbs * 4 + fat * 9), protein, carbs, fat });
              toast(`Added to ${mealLabel.toLowerCase()}`);
              nav.back();
            }}
          >
            Add to {mealLabel.toLowerCase()}
          </button>
          <p className="muted small">Leave calories empty to work them out from the macros.</p>
        </div>
      )}

      {picked && <FoodSheet food={picked} meal={meal} date={date} onClose={() => setPicked(null)} onAdded={() => setPicked(null)} />}
      {scanning && <Scanner onCode={onCode} onClose={() => setScanning(false)} />}
      {creating && (
        <CustomFoodForm
          initial={creating.initial}
          barcode={creating.barcode}
          onClose={() => setCreating(null)}
          onSaved={(f) => {
            const wasNew = !creating.initial;
            setCreating(null);
            toast('Food saved');
            if (wasNew) setPicked(f);
          }}
        />
      )}
    </Page>
  );
}
