// lib-values.mjs — when two Wikidata values are the same: an item by id; a
// date in ONE calendar (Julian converted) at the coarser of the two
// precisions; a quantity by amount and unit. Undecidable -> null, never false.
export const JULIAN = "Q1985786";
const jdnG = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };
const jdnJ = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083; };
const parts = (t) => { const m = /^([+-]\d+)-(\d\d)-(\d\d)/.exec(t.time); return m && { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }; };
export const makeSameValue = ({ calendarAware = true } = {}) => (u, v) => {
  if (u.item || v.item) return u.item && v.item ? u.item === v.item : null;
  if (u.amount !== undefined || v.amount !== undefined) return u.amount !== undefined && v.amount !== undefined ? Number(u.amount) === Number(v.amount) && u.unit === v.unit : null;
  if (!u.time || !v.time) return null;
  const p = Math.min(u.precision, v.precision); if (p < 9) return null;
  const a = parts(u), b = parts(v); if (!a || !b) return null;
  if (p === 9) return a.y === b.y ? true : Math.abs(a.y - b.y) > 1 ? false : null;
  if (p === 10) return a.y === b.y && a.m === b.m ? true : null;
  if (!calendarAware) return a.y === b.y && a.m === b.m && a.d === b.d;
  if (!a.m || !a.d || !b.m || !b.d) return null;
  return (u.calendar === JULIAN ? jdnJ(a.y, a.m, a.d) : jdnG(a.y, a.m, a.d)) === (v.calendar === JULIAN ? jdnJ(b.y, b.m, b.d) : jdnG(b.y, b.m, b.d));
};
