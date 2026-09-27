// being-record.mjs — a mention's features from the BEING'S OWN slots, never
// from the scene around it (2026-09-27). Built because trajectory-eval's
// splice control did not fail: with every content word of the sentence as the
// extent, Pierre and Natasha in one drawing room share its words. The scene
// stood in for the being, as the string had stood in for the referent.
//
// Per mention, inside its clause (the sentence cut at , ; : — ( ) ! ? .):
//   after:<w>   the first word after the mention the POS prior does not settle
//               as a closed class — the arrangement's label slot ("Pierre
//               murmured") or an apposition
//   before:<w>  the same, to the left — what was done to it, or what governs it
//   rel:<w>     "<name>'s <w>" — a relationship or possession of its own
//   with:<N>    another declared name in the same clause — a relationship
// A word the prior has never seen is kept (a literary verb such as "murmured"
// is absent from EWT); a word it settles closed is skipped, never guessed.
// The prior: UD_English-EWT (live_priors pos-prior-en.json), its giver named.
import { readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const CLOSED = new Set(["DET", "ADP", "PRON", "CCONJ", "SCONJ", "PART", "PUNCT", "AUX", "ADV", "NUM", "INTJ", "SYM", "X"]);
const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "");

export function beingRecord(bookPath, names, { posPrior }) {
  const forms = posPrior.forms;
  const closed = (w) => { const t = forms[w]; if (!t) return false; let top = null, n = -1; for (const [k, c] of Object.entries(t)) if (c > n) { top = k; n = c; } return CLOSED.has(top); };
  const text = fold(readFileSync(bookPath, "utf8").replace(/\r\n/g, "\n"));
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const nameRe = new RegExp(`(?<![\\p{L}\\p{N}])(${sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`, "gu");
  const rec = new Map(names.map((n) => [n, []]));
  const sentences = splitSentences(text).map((s) => s.text);
  sentences.forEach((s, at) => {
    for (const clause of s.split(/[,;:—()!?.]+/u)) {
      const ms = [...clause.matchAll(nameRe)]; if (!ms.length) continue;
      const present = ms.map((m) => m[1]);
      for (const m of ms) {
        const feats = [];
        const right = clause.slice(m.index + m[0].length), left = clause.slice(0, m.index);
        const poss = /^[’']s\s+(\p{Ll}[\p{L}’'-]*)/u.exec(right);
        if (poss) feats.push(`rel:${poss[1].toLowerCase()}`);
        const rw = (right.replace(/^[’']s\b/u, "").match(/\p{L}[\p{L}’'-]*/gu) ?? []).map((w) => w.toLowerCase());
        const a = rw.find((w) => !closed(w) && !names.some((n) => n.toLowerCase() === w)); if (a && !poss) feats.push(`after:${a}`);
        const lw = (left.match(/\p{L}[\p{L}’'-]*/gu) ?? []).map((w) => w.toLowerCase()).reverse();
        const b = lw.find((w) => !closed(w) && !names.some((n) => n.toLowerCase().split(" ").includes(w))); if (b) feats.push(`before:${b}`);
        for (const o of new Set(present)) if (o !== m[1]) feats.push(`with:${o}`);
        rec.get(m[1]).push({ at, features: feats });
      }
    }
  });
  return { rec, totalFrames: sentences.length, sentences };
}
