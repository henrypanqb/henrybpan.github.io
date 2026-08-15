export const EMPTY = { calories: 0, protein: 0, fat: 0, carb: 0 };
const KEYS = ['calories', 'protein', 'fat', 'carb'];
const round = (n) => Math.round(n * 100) / 100;

export function itemMacros(food, servings) {
  if (!food) return { ...EMPTY };
  const s = Number(servings) || 0;
  const out = {};
  for (const k of KEYS) out[k] = round((Number(food[k]) || 0) * s);
  return out;
}

export function sumMacros(list) {
  const out = { ...EMPTY };
  for (const m of list) for (const k of KEYS) out[k] = round(out[k] + (Number(m[k]) || 0));
  return out;
}

export function vsTarget(actual, target) {
  const out = {};
  for (const k of KEYS) {
    const a = Number(actual?.[k]) || 0;
    const t = target ? Number(target[k]) || 0 : 0;
    const pct = t > 0 ? Math.round((a / t) * 100) : 0;
    out[k] = { actual: a, target: t, pct, met: t > 0 && a >= t };
  }
  return out;
}
