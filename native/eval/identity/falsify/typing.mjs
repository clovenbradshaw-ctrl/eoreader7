// falsify/typing.mjs — 2026-09-28: is the structural locus/state typing a capitalisation proxy for what
// positionsByPattern measures? Arm A typing on, arm B typing off; host-arm mentions over the 13 pages.
// Claim to falsify: the structural locus/state typing is a capitalisation proxy for what
// positionsByPattern already measures. Arm A: typing on. Arm B: typing off, pattern decides.
// Host arm mentions, 13 pages. Report the positions each arm admits and the held-once residue.
import { readFileSync } from "node:fs";
const N = new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");
const { readOccupancyTestimony, positionsByPattern } = await import(`${N}/adapters/text/occupancy-testimony.js`);
const { NEGATION_WORDS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, AUXILIARY_VERBS, SUBJECT_PRONOUNS } = await import(`${N}/adapters/text/priors.js`);
const { COPULA_FORMS } = await import(`${N}/adapters/text/phasepost.js`);
const { createSession, admitChunked, sessionCast } = await import(`${N}/legacy-ported/packages/host/corpus.js`);
const MODALS = new Set([...AUXILIARY_VERBS].filter((w) => !COPULA_FORMS.has(w) && !["have","has","had","do","does","did"].includes(w)));
const FIX = JSON.parse(readFileSync(`${N}/eval/identity/fixtures/occupancy-pages.json`, "utf8"));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const all = { structural: [], none: [] };
for (const [name, { text }] of Object.entries(FIX.pages)) {
  const s = createSession(); admitChunked(s, { text, sourceId: name, language: "en" }); const c = sessionCast(s, { sourceId: name });
  const owner = new Map(); for (const r of c.referents) for (const x of r.surfaces) if (!owner.has(x)) owner.set(x, `${name}/${r.id}`);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${[...owner.keys()].sort((a, b) => b.length - a.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "gu");
  const mentions = (sent) => { const out = []; if (owner.size) for (const m of sent.text.matchAll(re)) out.push({ start: m.index, end: m.index + m[0].length, referent: owner.get(m[1]), via: "cast" }); for (const b of c.pronounBindings) if (b.sentenceOrder === sent.at) { const st = b.offset - sent.offset; if (st >= 0) out.push({ start: st, end: st + b.pronoun.length, referent: `${name}/${b.referentId}`, via: "pronoun" }); } return out; };
  const sentences = c.sentences.map((x) => ({ text: x.text, at: x.order, offset: x.offset }));
  for (const arm of ["structural", "none"]) {
    const r = readOccupancyTestimony(sentences, { source: name, determiners: { definite: DEFINITE_DETERMINERS, indefinite: INDEFINITE_DETERMINERS }, modals: MODALS, negation: NEGATION_WORDS, mentions, pronouns: SUBJECT_PRONOUNS, complementTyping: arm });
    all[arm].push(...r.candidates);
  }
}
for (const arm of ["structural", "none"]) {
  const pat = positionsByPattern(all[arm]);
  console.log(`\n== ${arm}: ${all[arm].length} standings, ${pat.positions.length} positions, ${pat.descriptions.length} held once`);
  for (const p of pat.positions) console.log(`  POSITION ${p.locus} <- ${p.occupants.map((o) => o.split("/").pop()).join(", ")} [${p.evidence}]`);
  console.log("  held-once sample:", pat.descriptions.slice(0, 14).map((d) => d.locus).join(" | "));
}
