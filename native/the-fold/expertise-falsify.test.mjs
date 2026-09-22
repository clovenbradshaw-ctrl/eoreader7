// expertise-falsify.test.mjs — the revisable expertise log (2026-09-22): a
// form learned once is provisional; found again from a DIFFERENT source it
// corroborates and confirms; a revision supersedes, never erases; every
// entry names the source that taught it, and a refused paradigm is refused
// to record at all (nothing learned, nothing written).
import test from "node:test";
import assert from "node:assert/strict";
import { createExpertise, recordExpertise, projectExpertise, knownForms, expertiseHistory, falsifyExpertise, expertiseLines, scoreAgainstExpertise, demonstrateExpertise, sha256, glossFeature, competencyStatement, recordBelief, beliefLog, currentBelief, BELIEF_KIND, foldManual } from "./expertise.js";
import { learnParadigmEmergent } from "./paradigm.js";
import { learnForm } from "./form-prior.js";

let seed = 3;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const NOUNS = ["river", "window", "garden", "lantern", "harbor", "meadow", "kettle", "ladder"];
const VERBS = ["carried", "painted", "folded", "counted", "gathered", "followed"];
const RHYMES = [["hill", "still", "will", "mill"], ["town", "gown", "down", "crown"], ["cat", "hat", "mat", "flat"], ["bee", "tea", "sea", "knee"]];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const limerick = () => { const a = pick(RHYMES), b = pick(RHYMES.filter((r) => r !== a)); const A = shuffle(a), B = shuffle(b); return [`There was an old man of the ${A[0]},`, `Who ${pick(VERBS)} a ${pick(NOUNS)} ${A[1]};`, `He ${pick(VERBS)} the ${B[0]},`, `And a ${pick(NOUNS)} ${B[1]},`, `That odd old man of the ${A[0]}.`].join("\n"); };
const prose = () => Array.from({ length: 3 }, () => `The ${pick(NOUNS)} was ${pick(VERBS)} near the ${pick(NOUNS)} for years, the record says.`).join(" ");

const learn = (pop) => learnParadigmEmergent({ name: "limerick", instances: Array.from({ length: 20 }, limerick), population: Array.from({ length: 20 }, pop) });

test("a form learned once is provisional, tied to its source; a paradigm the organ refused is refused to record at all", () => {
  const ex = createExpertise();
  const p = learn(prose);
  const r = recordExpertise(ex, { name: "limerick", paradigm: p, source: "gutenberg:pg982" });
  assert.equal(r.status, "provisional");
  assert.equal(r.corroboration, 1);
  const cur = projectExpertise(ex, "limerick");
  assert.equal(cur.status, "provisional");
  assert.match(cur.basis, /gutenberg:pg982/);
  assert.match(cur.basis, /20 instance\(s\) against 20 population/);
  assert.deepEqual(knownForms(ex), ["limerick"]);
  assert.equal(projectExpertise(ex, "sonnet"), null, "a form never learned projects nothing, not a guess");
  assert.throws(() => recordExpertise(ex, { name: "x", paradigm: { refused: "under_powered", basis: "too few" } }), /refused/, "nothing learned, nothing written");
  assert.throws(() => recordExpertise(ex, { name: "x", paradigm: p }), /source is declared/, "provenance is never optional");
});

test("found again from a DIFFERENT source, it corroborates and confirms at the same floor kind-universe.js already uses; a repeat of the SAME source does not", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "gutenberg:pg982" });
  const again = recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "gutenberg:pg982" });
  assert.equal(again.corroboration, 1, "the same source again is not a second witness");
  const other = recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "nottingham:limericks" });
  assert.equal(other.corroboration, 2);
  assert.equal(other.confirmed, "limerick");
  assert.equal(projectExpertise(ex, "limerick").status, "confirmed");
});

test("a revision SUPERSEDES, never erases — the whole history stays on the ledger, in order, and the current projection is the latest", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "b" });
  const hist = expertiseHistory(ex, "limerick");
  assert.equal(hist.length, 2);
  assert.equal(hist[0].superseded, true);
  assert.equal(hist[1].superseded, false);
  assert.equal(hist[0].revision, 1);
  assert.equal(hist[1].revision, 2);
  assert.equal(projectExpertise(ex, "limerick").revision, 2);
  assert.ok(expertiseLines(ex, "limerick").some((l) => /revision 2/.test(l)));
  assert.deepEqual(expertiseLines(ex, "unknown-form"), ["unknown-form: never learned"]);
});

test("falsifyExpertise marks a source's occurrence refuted without deleting its ledger line, and a refuted kind refuses a silent re-sign", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "b" });
  const f = falsifyExpertise(ex, "limerick", "a", { reason: "a later, larger read disagreed" });
  assert.equal(f.falsified, 1);
  assert.equal(expertiseHistory(ex, "limerick").length, 2, "the ledger line is not deleted");
  assert.ok(ex.store.concepts.limerick.occurrences.find((o) => o.source === "a").falsified);
});

test("expertise compresses under emergent feature dominance and carries the expectation side when given", () => {
  const ex = createExpertise();
  const p = learn(prose);
  const fp = learnForm(Array.from({ length: 20 }, limerick), { slots: "emergent" });
  const r = recordExpertise(ex, { name: "limerick", paradigm: p, formPrior: fp, source: "gutenberg:pg982" });
  const cur = projectExpertise(ex, "limerick");
  assert.ok(cur.featureCount > cur.features.length, `dominance should compress: ${cur.featureCount} total, ${cur.features.length} kept`);
  assert.ok(cur.formPrior);
  assert.match(r.line.basis, /expectation: \d+ slot\(s\) predictable/);
});

test("HARD PROVENANCE: sources are hashed, and the giver of a MEASURED entry is mechanical, never the model — a shape is measured, not model-authored", () => {
  const ex = createExpertise();
  const text = limerick() + "\n\n" + limerick();
  const r = recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a", sources: [{ url: "file:x.txt", text }] });
  assert.equal(r.line.giver, "mechanical:learnParadigmEmergent+learnForm", "the SHAPE is never attributed to a model — it was never one");
  const stored = JSON.parse(r.line.text);
  assert.equal(stored.sources[0].sha256, sha256(text), "the stored hash is the real sha256 of the exact bytes given");
  assert.match(r.line.basis, /1 source\(s\) hashed \(sha256\)/);
  const noHash = recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "b" });
  assert.match(noHash.line.basis, /NO SOURCE HASHES/, "a pass with no source bytes says so plainly, never a silent gap");
});

test("scoreAgainstExpertise recomputes purely from a ledger entry's stored text — the SAME candidate scores the SAME every time, from nothing but the log", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  const cur = projectExpertise(ex, "limerick");
  const a = scoreAgainstExpertise(cur, limerick());
  const b = scoreAgainstExpertise(cur, limerick.toString ? limerick() : limerick()); // a second, independently generated instance
  assert.ok(a.score > 0.5, `a real limerick should score well against its own learned shape: ${a.score}`);
  const off = scoreAgainstExpertise(cur, prose());
  assert.ok(off.score <= a.score, "unrelated prose should not outscore an actual instance of the form");
  // Determinism: scoring the identical text twice gives the identical score.
  const again = scoreAgainstExpertise(cur, limerick.name ? a.checks && JSON.stringify(a) : "");
  assert.deepEqual(scoreAgainstExpertise(cur, "SAME TEXT"), scoreAgainstExpertise(cur, "SAME TEXT"));
});

test("demonstrateExpertise: the model's own two completions are stored verbatim and given by the MODEL, not Polanyi; the recorded score matches recomputing it from the stored text", async () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  // A stub "model": ignores the shape info on purpose (the honest case where
  // shaping does NOT help) so both branches of the claim are exercised —
  // the falsifier must not assume shaping always wins.
  const draw = async (messages) => (/measured about this form/.test(messages[0].content) ? limerick() : prose());
  const d = await demonstrateExpertise(ex, "limerick", { draw, model: "stub-1" });
  assert.equal(d.line.giver, "model:stub-1", "a demonstration is the MODEL's own output, attributed to it, never to Polanyi");
  assert.equal(d.line.kind, "limerick");
  const stored = JSON.parse(d.line.text);
  assert.equal(stored.baseline, d.baseline);
  assert.equal(stored.shaped, d.shaped);
  assert.match(stored.shapedPrompt, /measured about this form, from real examples/);
  assert.ok(!/rhyme|scheme|AABBA/i.test(stored.shapedPrompt), "the shape is handed as MEASURED FACTS, never as an instruction to imitate a named form");
  const cur = projectExpertise(ex, "limerick");
  const recheck = scoreAgainstExpertise(cur, d.shaped);
  assert.deepEqual(recheck, d.shapedScore, "recomputing from the stored text alone reproduces the recorded score exactly");
  assert.ok(d.delta > 0, `the stub was built to do better when shaped: ${d.delta}`);
  assert.match(d.line.basis, /the shape measurably helped/);
});

test("demonstrateExpertise reports an honest WORSE result too, never smoothed over, and refuses a form never learned", async () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  const draw = async () => prose(); // the same, unhelped output either way — no gain
  const d = await demonstrateExpertise(ex, "limerick", { draw, model: "stub-flat" });
  assert.ok(d.delta <= 0);
  assert.match(d.line.basis, /no measured difference|did NOT measurably help/);
  await assert.rejects(demonstrateExpertise(ex, "never-learned", { draw, model: "x" }), /never been learned/);
  await assert.rejects(demonstrateExpertise(ex, "limerick", { draw: null, model: "x" }), /draw .* is declared/);
});

test("demonstrateExpertise with a base: both prompts carry the SAME real material, its provenance (url+sha256) is stored honestly, and the model must draw from it — not recite a stock example", async () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  const baseText = "The Cumberland River flows through Nashville, Tennessee, past the old dockyards. " + prose();
  const base = { url: "https://en.wikipedia.org/wiki/Special:Random", title: "Cumberland River (test fixture)", text: baseText };
  let seenBaseInBaseline = false, seenBaseInShaped = false;
  const draw = async (messages) => {
    if (messages[0].content.includes(baseText.slice(0, 40))) { if (!seenBaseInBaseline) seenBaseInBaseline = true; else seenBaseInShaped = true; }
    return limerick();
  };
  const d = await demonstrateExpertise(ex, "limerick", { draw, model: "stub-base", base });
  assert.ok(seenBaseInBaseline && seenBaseInShaped, "the base material must appear in BOTH the unshaped and shaped prompts");
  const stored = JSON.parse(d.line.text);
  assert.equal(stored.base.url, base.url);
  assert.equal(stored.base.sha256, sha256(baseText), "the stored hash is the real sha256 of the exact base text used");
  assert.match(d.line.title, /grounded in a random article/);
  assert.match(d.line.basis, /base article \(sha256 checkable\)/);
});

test("glossFeature: mechanical slot→plain-language transform, covering SIG/CON/SYN and the lifted/keyed/counted slot shapes — never a model's phrasing", () => {
  assert.equal(glossFeature({ slot: "count:bar", value: 4 }), `the number of "bar" elements is 4`);
  assert.match(glossFeature({ slot: "heading*:marker", value: "-" }), /every "heading"'s marker is/);
  assert.match(glossFeature({ slot: "line@3:syllables", value: 5 }), /position 3'?s syllables is 5/);
  assert.match(glossFeature({ slot: "line@3:rhymes-with=", value: "line@1" }), /matches an earlier one/);
  assert.match(glossFeature({ slot: "line@3:syllables+1", value: 6 }), /follows on from an earlier one/);
  assert.match(glossFeature({ slot: "key:M.text", value: "abc" }), /its "M" field's text is/);
  assert.match(glossFeature({ slot: "field:title", value: "x" }), /its "title" field is/);
});

test("competencyStatement: a plain paragraph built ONLY from stored features, distinguishing far-only from far+near signals when grounds were tagged", () => {
  const cur = {
    title: "Expertise: white paper (revision 2)",
    features: [
      { key: "a", slot: "count:section", value: 6, gloss: glossFeature({ slot: "count:section", value: 6 }), groundedAt: ["far", "near"] },
      { key: "b", slot: "has:citation", value: "yes", gloss: glossFeature({ slot: "has:citation", value: "yes" }), groundedAt: ["far"] },
    ],
  };
  const stmt = competencyStatement(cur);
  assert.match(stmt, /competent at "white paper"/);
  assert.match(stmt, /OTHER material found while searching/);
  assert.match(stmt, /ordinary, unrelated prose/);
  assert.equal(competencyStatement(null), "Nothing measured yet.");
  assert.equal(competencyStatement({ features: [] }), "Nothing measured yet.");
});

test("competencyStatement without groundedAt tags (a single-ground pass) never claims a tiering that wasn't measured", () => {
  const cur = { title: "Expertise: x", features: [{ key: "a", slot: "count:foo", value: 1, gloss: glossFeature({ slot: "count:foo", value: 1 }) }] };
  const stmt = competencyStatement(cur);
  assert.doesNotMatch(stmt, /OTHER material found while searching/);
  assert.doesNotMatch(stmt, /ordinary, unrelated prose/);
});

test("the belief log: EVERY entry accretes, none superseded — a diary, not a revisable fact like a paradigm", () => {
  const ex = createExpertise();
  assert.equal(currentBelief(ex), null, "nothing believed yet");
  recordBelief(ex, { statement: "First position.", basis: "founding" });
  recordBelief(ex, { statement: "Second, deepened position.", basis: "a later run" });
  const log = beliefLog(ex);
  assert.equal(log.length, 2);
  assert.equal(log[0].statement, "First position.");
  assert.equal(log[1].statement, "Second, deepened position.");
  assert.equal(ex.ledger.superseded.size, 0, "nothing in the belief log is ever marked superseded");
  assert.equal(currentBelief(ex).statement, "Second, deepened position.");
});

test("recordBelief distinguishes a standing archon position (default giver) from a mechanical per-run derivation", () => {
  const ex = createExpertise();
  recordBelief(ex, { statement: "A founding philosophical claim." });
  recordBelief(ex, { statement: "A run-derived note.", giver: "mechanical:runLearnPass" });
  const log = beliefLog(ex);
  assert.equal(log[0].giver, "archon:polanyi");
  assert.equal(log[1].giver, "mechanical:runLearnPass");
});

test("recordBelief declares its statement; a paradigm entry and a belief entry never collide even though both live on the same ledger", () => {
  const ex = createExpertise();
  assert.throws(() => recordBelief(ex, {}), /statement is declared/);
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  recordBelief(ex, { statement: "A belief about competency in general." });
  assert.equal(knownForms(ex).filter((n) => n === BELIEF_KIND).length, 1, "the belief kind shows up in knownForms too (it is just another kind on the shared ledger) but never as a real form's paradigm");
  assert.equal(projectExpertise(ex, BELIEF_KIND), null, "projectExpertise only reads role:paradigm lines — a belief is never mistaken for a form's shape");
  assert.equal(currentBelief(ex).statement, "A belief about competency in general.");
});

test("foldManual: nothing learned yet folds to an honest empty manual, no fabricated content", () => {
  const md = foldManual(null, "sonnet");
  assert.match(md, /^---\nname: sonnet\n/);
  assert.match(md, /Nothing has been measured/);
  assert.match(md, /Nothing recurs here yet/);
});

test("foldManual: a real learned form folds every stored field — frontmatter, signals with grounded-at tiers, activation, provenance table, open questions when not confirmed", () => {
  const ex = createExpertise();
  const p = learn(prose);
  const fp = learnForm(Array.from({ length: 20 }, limerick), { slots: "emergent" });
  const text = limerick();
  recordExpertise(ex, { name: "limerick", paradigm: p, formPrior: fp, source: "gutenberg:pg982", sources: [{ url: "file:x.txt", text }] });
  const cur = projectExpertise(ex, "limerick");
  const md = foldManual(cur, "limerick");
  assert.match(md, /^---\nname: limerick\ndescription: .+\n---/s);
  assert.match(md, /# limerick/);
  assert.match(md, /## Measured signals/);
  assert.match(md, /_\((strong|broad|measured)/);
  assert.match(md, /## What tends to come next/);
  assert.match(md, /## Provenance/);
  assert.match(md, /\| file:x\.txt \|/);
  assert.match(md, new RegExp(sha256(text).slice(0, 16)));
  assert.match(md, /## Open questions/, "not yet confirmed (only 1 source) — open questions must be honest about that");
  assert.match(md, /needs a second, DISTINCT source/);
});

test("foldManual: a confirmed, fully-featured form has NO 'not yet confirmed' open question — the manual doesn't manufacture doubt that isn't there", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "b" });
  const cur = projectExpertise(ex, "limerick");
  assert.equal(cur.status, "confirmed");
  const md = foldManual(cur, "limerick");
  assert.doesNotMatch(md, /needs a second, DISTINCT source/);
});

test("foldManual's description and body are read straight off competencyStatement/cur fields — recomputing competencyStatement(cur) independently must match what's embedded", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  const cur = projectExpertise(ex, "limerick");
  const md = foldManual(cur, "limerick");
  const stmt = competencyStatement(cur);
  if (cur.features?.length) assert.ok(md.includes(stmt), "the manual's body contains the EXACT same statement competencyStatement(cur) computes, not a paraphrase");
});
