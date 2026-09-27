// lib-record.mjs — a book's cached relation edges as identity-induction's
// record: node = relation label; hop-1 features = the ends' first words by
// role; hop-2 features = the OTHER labels those end words keep (naming a
// node, so the kernel masks them by `namesNode`). Shared by every driver
// here so the organ is always judged on one construction.
import { readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const DROP = new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS, ...(P.POSSESSIVE_DETERMINERS ?? [])].map((w) => w.toLowerCase()));
export const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function loadEdges(path, { wordsPerEnd }) {
  const words = (s) => (fold(s).match(/\p{L}+/gu) ?? []).filter((w) => !DROP.has(w)).slice(0, wordsPerEnd);
  const { edges, book } = JSON.parse(readFileSync(path, "utf8"));
  return { book, edges: edges.map((e) => ({ label: fold(e.label), s: words(e.end1), o: words(e.end2) })).filter((e) => e.label) };
}
export const namesNode = (f) => { const i = f.indexOf("2:"); return i >= 0 ? f.slice(i + 2) : null; };
export function recordOf(es, { hop2MaxShare }) {
  const wordLabels = { s: new Map(), o: new Map() }; const wordCount = new Map();
  for (const e of es) for (const r of ["s", "o"]) for (const w of e[r]) {
    if (!wordLabels[r].has(w)) wordLabels[r].set(w, new Map());
    const m = wordLabels[r].get(w); m.set(e.label, (m.get(e.label) ?? 0) + 1);
    wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
  }
  const hubCap = hop2MaxShare * es.length;
  const rec = new Map();
  for (const e of es) {
    const occ = [];
    for (const r of ["s", "o"]) for (const w of e[r]) {
      occ.push({ f: `${r}:${w}`, hop: 1 });
      if ((wordCount.get(w) ?? 0) > hubCap) continue;
      for (const [l] of wordLabels[r].get(w)) occ.push({ f: `${r}2:${l}`, hop: 2 });
    }
    if (!rec.has(e.label)) rec.set(e.label, []);
    rec.get(e.label).push(occ);
  }
  return rec;
}
