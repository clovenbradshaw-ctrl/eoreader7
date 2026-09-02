// eval/derivation-precision-resolution.mjs — P60's arms, asked the question
// they were never asked: what does a SHUFFLE score on this judge?
//
// The full-circuit oracle run (2026-09-02) found that derivation-precision's
// person-grain verdict ("some term of X begins after some term of Y ends")
// is TRUE for a random within-office pair ~0.82 of the time — so a
// precision of 1.000 on 9 facts is not, by itself, evidence of anything.
// P60's numbers (0.842 -> 1.000) compared arms against each other and
// never spent a null on the judge. This driver spends it: the real run
// once, then NULL_DRAWS redealt runs (REDEAL_SEED shuffles succession
// targets within each office, marginals kept), and per arm reports where
// the real number sits in the shuffle's distribution. A number outside it
// is LICENSED; a number inside it is RETRACTED, in these words, in the
// results document this writes.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "derivation-precision.mjs");
const TMP = path.join(HERE, "results", ".resolution-tmp.json");
const NULL_DRAWS = Number(process.env.NULL_DRAWS ?? 40);

function run(env) {
  execFileSync("node", [DRIVER], { env: { ...process.env, ...env, OUT_PATH: TMP }, stdio: ["ignore", "ignore", "inherit"], maxBuffer: 1 << 26 });
  return JSON.parse(fs.readFileSync(TMP, "utf8"));
}
const real = run({});
const draws = [];
for (let k = 0; k < NULL_DRAWS; k++) draws.push(run({ REDEAL_SEED: String(1000 + k * 17) }));
fs.rmSync(TMP, { force: true });

const lines = ["# derivation-precision, resolution-tested (II.23) — " + new Date().toISOString().slice(0, 10), "",
  `Real run once; ${NULL_DRAWS} redealt runs (succession targets shuffled within each office, marginals kept). Per arm: the real number, and what the shuffle produces.`, "",
  "| arm | real derived | real TRUE/FALSE | real precision | null precision median / 95th | null decided median | null runs with 0 FALSE at ≥ real decided | verdict |", "|---|---|---|---|---|---|---|---|"];
const verdicts = {};
for (const arm of real.arms) {
  const name = arm.arm;
  const nulls = draws.map((d) => d.arms.find((a) => a.arm === name)).filter(Boolean);
  const decidedReal = arm.TRUE + arm.FALSE;
  const nullPrec = nulls.map((n) => n.precisionOnDecided).filter((x) => x != null).sort((a, b) => a - b);
  const q = (f) => nullPrec.length ? nullPrec[Math.min(nullPrec.length - 1, Math.floor(f * nullPrec.length))] : null;
  const matched = nulls.filter((n) => n.FALSE === 0 && (n.TRUE + n.FALSE) >= decidedReal).length;
  const decidedNulls = nulls.filter((n) => n.precisionOnDecided != null).length;
  const nullDecided = nulls.map((n) => n.TRUE + n.FALSE).sort((a, b) => a - b);
  const nullDecidedMedian = nullDecided.length ? nullDecided[Math.floor(nullDecided.length / 2)] : 0;
  let verdict;
  if (decidedReal === 0) verdict = "no decided facts — nothing to license";
  else if (arm.FALSE > 0) verdict = `real arm has ${arm.FALSE} FALSE — not a precision claim to license`;
  else if (decidedNulls === 0) verdict = "null produced no decided facts — unresolved";
  else if (matched / decidedNulls <= 0.05 && nullDecidedMedian < decidedReal)
    verdict = `LICENSED WITH A CAVEAT — the shuffle rarely matches, but mostly because it derives FEWER facts (null median ${nullDecidedMedian} decided vs real ${decidedReal}); precision per fact is not what separated them, reach was`;
  else verdict = matched / decidedNulls <= 0.05 ? "LICENSED (shuffle rarely matches at equal reach)" : `RETRACTED — ${matched}/${decidedNulls} shuffles match a perfect score; the judge does not resolve this arm`;
  verdicts[name] = verdict;
  const chanceNote = arm.FALSE > 0 && q(0.5) != null && arm.precisionOnDecided <= q(0.5) ? " — AT OR BELOW the null's median: a chance-level number" : "";
  lines.push(`| ${name} | ${arm.derived} | ${arm.TRUE}/${arm.FALSE} | ${arm.precisionOnDecided ?? "—"} | ${q(0.5)?.toFixed(3) ?? "—"} / ${q(0.95)?.toFixed(3) ?? "—"} | ${nullDecidedMedian} | ${matched}/${decidedNulls} | ${verdict}${chanceNote} |`);
}
lines.push("", "## Reading", "",
  "The judge is P60's own person-grain verdict. Where the shuffle matches a perfect score in more than 5% of draws, the arm's precision was never evidence of the apparatus helping — it was the judge's own permissiveness — and the number is retracted here. The tenure-grain verdict (eval/full-circuit-oracle.mjs) passes resolution on the same material; re-scoring these arms under it needs their facts to carry tenure identity, which arms A–D do not (person grain by construction).");
const out = path.join(HERE, "results", "derivation-precision-resolution.md");
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(lines.join("\n"));
