// complementary-eval.mjs — kernel/complementary-distribution.js on War and
// Peace, English (Maude, live_priors) and the Russian first version (lib.ru,
// the spec's own source). Zero model calls. No spelling is read.
//
// PRE-REGISTERED 2026-09-27, before the first run:
//   declared   frame = sentence; window 20 sentences (the headline); draws 200;
//              alpha 0.05; seed 7; minSharedScenes 5. Windows 10 and 40 are
//              reported beside it as sensitivity, never chosen after.
//   P1  pairs declared SAME: most read "complementary"; NONE reads
//       "together"
//   P2  pairs declared DIFFERENT that share scenes: NONE reads
//       "complementary"
//   P3  impure pairs (a surname naming several people) are reported only
//   A gap (no shared scenes) is scored neither way.
// Disclosed: the null places frames uniformly within a scene, so a long
// sentence is no likelier than a short one to hold a name; the last scene's
// size is bounded by the last mention, not the book's end.
//   node complementary-eval.mjs <en.txt> <ru.html> [out.json]
import { writeFileSync, readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { complementaryDistribution } = await import(`${NATIVE}/kernel/complementary-distribution.js`);
const { mentionRecord } = await import("./mention-record.mjs");
const [EN, RU, OUT] = process.argv.slice(2);
const DECLARED = { window: 20, draws: 200, alpha: 0.05, seed: 7, minSharedScenes: 5 };
const SENSITIVITY = [10, 40];

const EN_NAMES = ["Pierre", "Bezukhov", "Natasha", "Prince Andrew", "Andrew", "Bolkonski", "Princess Mary", "Countess Mary", "Nicholas", "Rostov", "Napoleon", "Bonaparte", "Kutuzov", "Sonya", "Denisov", "Dolokhov", "Boris", "Anatole", "Petya", "Prince Vasili", "Helene", "Moscow", "Russia", "Petersburg", "Bagration"];
const EN_PAIRS = [["Pierre", "Bezukhov", "same"], ["Prince Andrew", "Andrew", "same"], ["Napoleon", "Bonaparte", "same"], ["Princess Mary", "Countess Mary", "same"], ["Nicholas", "Rostov", "impure"], ["Prince Andrew", "Bolkonski", "impure"],
  ["Pierre", "Natasha", "different"], ["Kutuzov", "Napoleon", "different"], ["Sonya", "Natasha", "different"], ["Denisov", "Dolokhov", "different"], ["Boris", "Anatole", "different"], ["Prince Andrew", "Pierre", "different"],
  ["Princess Mary", "Natasha", "different"], ["Moscow", "Russia", "different"], ["Moscow", "Petersburg", "different"], ["Pierre", "Moscow", "different"], ["Bagration", "Kutuzov", "different"], ["Helene", "Natasha", "different"]];
const spec = JSON.parse(readFileSync(new URL("./fixtures/ru-war-and-peace-first-version.spec.json", import.meta.url), "utf8"));

function run(book, names, pairs, recordOpts) {
  const rec = mentionRecord(book, names, recordOpts);
  const total = Math.max(...[...rec.values()].flatMap((os) => os.map((o) => o.at))) + 1;
  const framesOf = (n) => rec.get(n).map((o) => o.at);
  return pairs.map(([a, b, expect]) => {
    const r = complementaryDistribution(framesOf(a), framesOf(b), { ...DECLARED, totalFrames: total });
    const sens = Object.fromEntries(SENSITIVITY.map((w) => [w, complementaryDistribution(framesOf(a), framesOf(b), { ...DECLARED, window: w, totalFrames: total }).verdict]));
    return { a, b, expect, counts: [rec.get(a).length, rec.get(b).length], verdict: r.verdict, ratio: r.ratio ?? null, observed: r.observed ?? null, expected: r.expected ?? null, sharedScenes: r.sharedScenes, sensitivity: sens };
  });
}
const out = { declared: DECLARED, sensitivityWindows: SENSITIVITY, english: run(EN, EN_NAMES, EN_PAIRS, {}), russian: run(RU, spec.names, spec.pairs, spec.record) };
const tally = (rows, expect) => rows.filter((r) => r.expect === expect).reduce((m, r) => ((m[r.verdict] = (m[r.verdict] ?? 0) + 1), m), {});
for (const lang of ["english", "russian"]) {
  for (const r of out[lang]) console.log(`${lang.slice(0, 2)} ${r.expect.padEnd(9)} ${`${r.a}/${r.b}`.padEnd(30)} ${r.verdict.padEnd(15)} obs=${r.observed} exp=${r.expected} ratio=${r.ratio} scenes=${r.sharedScenes} w10/40=${r.sensitivity[10]}/${r.sensitivity[40]}`);
  out[`${lang}Summary`] = { same: tally(out[lang], "same"), different: tally(out[lang], "different"), impure: tally(out[lang], "impure") };
  console.log(lang, JSON.stringify(out[`${lang}Summary`]));
}
if (OUT) writeFileSync(OUT, JSON.stringify(out));
