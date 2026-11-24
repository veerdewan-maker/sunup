import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { shortDate } from '../lib/util';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Page({
  title,
  onBack,
  right,
  children,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>{title}</h1>
        <div className="page-head-right">{right}</div>
      </header>
      <div className="page-body">{children}</div>
    </div>
  );
}

export function Bar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const left = Math.round(target - value);
  return (
    <div className="bar">
      <div className="bar-top">
        <span>{label}</span>
        <span className="muted">
          {Math.round(value)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="bar-left muted">{left >= 0 ? `${left} ${unit} left` : `${-left} ${unit} over`}</div>
    </div>
  );
}

export function Ring({ value, target, size = 132 }: { value: number; target: number; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const left = Math.round(target - value);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth="12" />
        {pct > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={left < 0 ? 'var(--fat)' : 'var(--accent)'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />}
      </svg>
      <div className="ring-label">
        <strong>{Math.abs(left)}</strong>
        <span>{left >= 0 ? 'kcal left' : 'kcal over'}</span>
      </div>
    </div>
  );
}

export interface Series {
  points: { date: string; value: number }[];
  color: string;
  dots?: boolean;
  dashed?: boolean;
}

export function LineChart({ series, fmt, height = 170 }: { series: Series[]; fmt: (v: number) => string; height?: number }) {
  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;
  const W = 340;
  const H = height;
  const pad = { l: 38, r: 10, t: 10, b: 22 };
  const times = all.map((p) => new Date(p.date + 'T00:00:00').getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  let lo = Math.min(...all.map((p) => p.value));
  let hi = Math.max(...all.map((p) => p.value));
  if (hi - lo < 1e-6) {
    lo -= 1;
    hi += 1;
  }
  const margin = (hi - lo) * 0.12;
  lo -= margin;
  hi += margin;
  const x = (d: string) => {
    const t = new Date(d + 'T00:00:00').getTime();
    return t1 === t0 ? (pad.l + W - pad.r) / 2 : pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  };
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [lo + margin, (lo + hi) / 2, hi - margin];
  const first = all.reduce((a, b) => (a.date < b.date ? a : b)).date;
  const last = all.reduce((a, b) => (a.date > b.date ? a : b)).date;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--track)" strokeWidth="1" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="chart-text">
            {fmt(t)}
          </text>
        </g>
      ))}
      {series.map((s, i) => (
        <g key={i}>
          {s.points.length > 1 && (
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={s.dots ? 1 : 2.5}
              strokeOpacity={s.dots ? 0.35 : 1}
              strokeDasharray={s.dashed ? '4 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.points.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')}
            />
          )}
          {(s.dots || s.points.length === 1) &&
            s.points.map((p, j) => <circle key={j} cx={x(p.date)} cy={y(p.value)} r="3" fill={s.color} />)}
        </g>
      ))}
      <text x={pad.l} y={H - 5} className="chart-text">
        {shortDate(first)}
      </text>
      {last !== first && (
        <text x={W - pad.r} y={H - 5} textAnchor="end" className="chart-text">
          {shortDate(last)}
        </text>
      )}
    </svg>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
  cols,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  /** Lay the choices out as equal columns that fill the row. */
  cols?: number;
}) {
  return (
    <div className={'chips' + (cols ? ' fill' : '')} style={cols ? ({ '--cols': cols } as CSSProperties) : undefined} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={'chip' + (o.value === value ? ' on' : '')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Numeric text field that keeps what the user typed while reporting a parsed number. */
export function NumField({
  value,
  onChange,
  label,
  suffix,
  placeholder,
  decimal = true,
  id,
  bare,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label?: string;
  suffix?: string;
  placeholder?: string;
  decimal?: boolean;
  id?: string;
  /** Show only the input; the label is still read by screen readers. */
  bare?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    const parsed = text === '' ? null : parseFloat(text.replace(',', '.'));
    if (parsed !== value && !(Number.isNaN(parsed as number) && value == null)) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const input = (
    <div className="field-input">
      <input
        id={id}
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={text}
        placeholder={placeholder}
        aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const t = e.target.value.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, '');
          setText(t);
          const v = parseFloat(t.replace(',', '.'));
          onChange(Number.isFinite(v) ? v : null);
        }}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
  if (!label || bare) return input;
  return (
    <label className="field">
      <span>{label}</span>
      {input}
    </label>
  );
}

let toastFn: (msg: string) => void = () => undefined;
export function toast(msg: string) {
  toastFn(msg);
}
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    toastFn = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2600);
    };
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
