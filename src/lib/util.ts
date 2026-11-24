import type { Units } from '../types';

export const KG_PER_LB = 0.45359237;

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Local calendar date as YYYY-MM-DD. */
export function ymd(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
}

/** Monday of the week containing the date. */
export function weekStart(s: string): string {
  const d = parseYmd(s);
  const dow = (d.getDay() + 6) % 7;
  return addDays(s, -dow);
}

export function niceDate(s: string): string {
  const today = ymd();
  if (s === today) return 'Today';
  if (s === addDays(today, -1)) return 'Yesterday';
  if (s === addDays(today, 1)) return 'Tomorrow';
  return parseYmd(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function shortDate(s: string): string {
  return parseYmd(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function toDisplay(kg: number, units: Units): number {
  return units === 'kg' ? kg : kg / KG_PER_LB;
}
export function fromDisplay(v: number, units: Units): number {
  return units === 'kg' ? v : v * KG_PER_LB;
}

/** Weight for showing: kg to 0.5, lb to 0.5, without trailing zeros. */
export function fmtWeight(kg: number, units: Units, step = 0.5): string {
  const v = Math.round(toDisplay(kg, units) / step) * step;
  return String(Number(v.toFixed(1)));
}

export function fmtBody(kg: number, units: Units): string {
  return `${Number(toDisplay(kg, units).toFixed(1))} ${units}`;
}

export function round(n: number, to = 1): number {
  return Math.round(n / to) * to;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function num(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function fmtDuration(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
