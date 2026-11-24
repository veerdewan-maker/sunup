import type { FoodItem } from '../types';

// Open Food Facts: a free, open food database. No key or account needed.
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
const BASE = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,brands,nutriments,serving_size,serving_quantity,quantity';

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

function n(v: unknown): number | null {
  const x = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(x) ? x : null;
}

/** Converts a product to our food shape. Returns null when it has no usable calorie data. */
export function toFood(p: OffProduct): FoodItem | null {
  const nut = p.nutriments ?? {};
  let kcal = n(nut['energy-kcal_100g']);
  if (kcal == null) {
    const kj = n(nut['energy_100g']);
    if (kj != null) kcal = kj / 4.184;
  }
  const name = (p.product_name ?? '').trim();
  if (kcal == null || !name || !p.code) return null;
  const servingQty = n(p.serving_quantity);
  const isDrink = /\d\s*(ml|cl|l)\b/i.test(p.serving_size ?? '') && !/\d\s*g\b/i.test(p.serving_size ?? '');
  return {
    id: `off-${p.code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    unit: isDrink ? 'ml' : 'g',
    baseQty: 100,
    kcal: Math.round(kcal),
    protein: n(nut['proteins_100g']) ?? 0,
    carbs: n(nut['carbohydrates_100g']) ?? 0,
    fat: n(nut['fat_100g']) ?? 0,
    serving: servingQty && servingQty > 0 ? { label: `1 serving (${p.serving_size ?? servingQty + ' g'})`, qty: servingQty } : undefined,
    source: 'off',
    barcode: p.code,
  };
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(15000);
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!res.ok && res.status !== 404) throw new Error(`Food database error (${res.status})`);
  return res.json();
}

export async function searchOnline(query: string, signal?: AbortSignal): Promise<FoodItem[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`;
  const data = (await getJson(url, signal)) as { products?: OffProduct[] };
  const out: FoodItem[] = [];
  const seen = new Set<string>();
  for (const p of data.products ?? []) {
    const f = toFood(p);
    if (f && !seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

/** Looks up one barcode. Returns null when the product is not in the database or has no nutrition data. */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<FoodItem | null> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) return null;
  const data = (await getJson(`${BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`, signal)) as {
    status?: number;
    product?: OffProduct;
  };
  if (data.status !== 1 || !data.product) return null;
  return toFood({ ...data.product, code: data.product.code ?? clean });
}
