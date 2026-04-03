/** Orbit allows none | light | normal | extra (validation.js). */
const UI_ICE = { 'No Ice': 'none', Light: 'light', Regular: 'normal', Extra: 'extra' };

export function ingredientList(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v).trim()].filter(Boolean);
}

export function optionalAuthJsonHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Token ${token}`;
  return h;
}

export function iceForCreateApi(ice) {
  if (ice == null || ice === '') return 'normal';
  if (Object.prototype.hasOwnProperty.call(UI_ICE, ice)) return UI_ICE[ice];
  const s = String(ice).toLowerCase();
  if (s === 'regular' || s === 'reg') return 'normal';
  if (s === 'no ice' || s === 'none') return 'none';
  if (['light', 'normal', 'extra'].includes(s)) return s;
  return s;
}
