// eval/copresence-audit.mjs — OFFLINE, no model: is the co-presence gate's
// window the lever, or is the wall genuinely paraphrase? For every (note,
// other-source) pair the walk would skip at the shipped ±400 window, ask
// what a wider window would change — and whether BOTH ends occur ANYWHERE
// in that source at all (the downstream decider wall needs both).
import { buildLedger } from "./lib/borodino-ledger.mjs";
import { endsCopresentWindow, textFeatures } from "../../eoreader7/native/organs/index.js";
const { hl, log, sources, planted } = await buildLedger();
const notes = hl.foldHyperlexicon(log).filter((n) => !planted.includes(`${n.subject}|${n.verb}|${n.object}`.toLowerCase()));
const WINDOWS = [400, 800, 1600, 3200, Infinity];
const tally = Object.fromEntries(WINDOWS.map((w) => [w, 0]));
let pairs = 0, oneEndAbsent = 0, noFeatures = 0;
const lowerOf = new Map(sources.map((s) => [s.ref, s.text.toLowerCase()]));
for (const n of notes) for (const s of sources) {
  if ((n.witnesses ?? []).some((w) => w === s.ref)) continue; // never seconds its own sighting
  pairs += 1;
  const ends = { end1: n.end1 ?? n.subject, end2: n.end2 ?? n.object };
  const f1 = [...textFeatures(ends.end1)], f2 = [...textFeatures(ends.end2)];
  if (!f1.length || !f2.length) { noFeatures += 1; continue; }
  const L = lowerOf.get(s.ref);
  if (!f1.some((w) => L.includes(w)) || !f2.some((w) => L.includes(w))) { oneEndAbsent += 1; continue; }
  for (const w of WINDOWS) if (endsCopresentWindow(s.text, ends, { window: w === Infinity ? s.text.length : w })) tally[w] += 1;
}
console.log(`pairs (note × other source): ${pairs}`);
console.log(`  an end with no feature words: ${noFeatures}`);
console.log(`  one end ABSENT from the whole source (no window can help — paraphrase or debris): ${oneEndAbsent}`);
console.log(`  both ends present somewhere — co-present within window:`);
for (const w of WINDOWS) console.log(`    ±${w}: ${tally[w]}  (marginal over ±400: ${tally[w] - tally[400]})`);
