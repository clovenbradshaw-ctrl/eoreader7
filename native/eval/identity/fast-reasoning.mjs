// eval/identity/fast-reasoning.mjs — THE LADDER RUN AS A REASONER, LIVE
// (2026-09-28). Correct verdicts per model call, over real books, with a
// real small model in this process, the cost of every call on the record.
//
// PRE-REGISTERED before the run (the key is fixed below; nothing in it was
// read off a run). Model: onnx-community/Qwen2.5-0.5B-Instruct at q4 on CPU
// through @huggingface/transformers — the SAME reader void-loop-e2e.mjs
// used; no Ollama in this container. Books: War and Peace (Maude, PG 2600)
// and Dracula (PG 345), read whole; retrieval = organs/source.js retrieve(),
// 3 passages per claim, the live turn's own number.
//
// THE LADDER (the-fold judge.js + answer-record.js::ingestionOf, eoreader7
// kernel/{ingestion,escalation,habit}.js, organs/judgment-reader.js):
//   mechanical  the relation reader over the retrieved passages: `bound` is
//               HOLDS, `contradicted` is REFUSED, no model
//   habit       a judgment learned on an earlier pass whose decider is in
//               the section at hand, no model
//   judge       the section around the cited passage + the claim + the
//               question, through Gary's door, prose read mechanically
// (the witness rung is OFF here — it needs a grammar-constrained decoder
// this in-process model does not have; disclosed, not skipped silently.)
//
// ARMS AND PREDICTIONS
//   E1  ON vs OFF on 34 claims (20 true / 14 false, key below). OFF = the
//       judge on every claim. Predictions: P1 ON spends fewer model calls
//       than OFF; P2 ON's correctness is not lower than OFF's; P3 zero
//       fabrications on either arm — a FALSE claim landing `holds` anchored
//       is a fabrication; P4 CONTROL: on a sentence-shuffled copy of each
//       book the mechanical rung binds fewer true claims than on the real
//       book (the reader reads order, not a bag).
//   E2  three passes of ON with the habit ledger carried. P5 pass 2 spends
//       fewer judge calls than pass 1, pass 3 no more than pass 2; P6 the
//       habit rung answers only claims the judge settled anchored. Then the
//       INJECTION: for every habit that holds, a negated restatement of its
//       decider sentence is inserted into the book; P7 every such habit is
//       conceded (REC, trigger quoted) before it answers, and none answers
//       `holds` against the negation.
//   E4  the judge asked three ways on every claim: as shipped (text, claim,
//       question LAST), question FIRST, and with a prohibition appended ("do
//       not guess"). P8 shipped yields the most anchored-chosen verdicts
//       and the fewest contested; a losing rule is recorded as losing.
// V2, PRE-REGISTERED 2026-09-28 after v1 (results/fast-reasoning-v1-RESULTS.md).
// Two changes: the control is rebuilt (v1's shuffle joined sentence OBJECTS
// and the chunker made one termless chunk — vacuous), and the judge's ask
// numbers the section's sentences so a judge that answers one word can
// POINT; the reader anchors a pointed sentence only when it carries the
// claim's first content word and one more (organs/judgment-reader.js). The
// same P1–P8 stand as registered; P3 (zero fabrications SHIPPED) is the one
// most at risk now that judgments can land: a false claim whose pointed
// sentence shares its subject and one word (Harker / "brightest") anchors.
// Re-registered: P4 on the rebuilt control; P9 the judge lands ≥ 1 chosen
// on the ON arm (v1: 0 of 30).
// V3, PRE-REGISTERED 2026-09-28 after v2 (results/fast-reasoning-v2-RESULTS.md).
// ONE change: the judge's protocol is point-then-word (the-fold judge.js):
// ask 1 the number of the deciding sentence (no example number), ask 2 one
// word over that sentence alone. P1–P9 stand as registered (a "call" is now
// a model call, so a judged claim costs up to two). Re-registered:
//   P9  ≥ 1 chosen on the ON arm (v2: 0)
//   P3  zero fabrications SHIPPED stays the prediction — and is the one at
//       risk: a false claim whose pointed sentence carries its subject and
//       one more word anchors, and the word is the model's
//   P5  pass 2 fewer judge calls than pass 1 — reachable now only if P9 holds
// V4, PRE-REGISTERED 2026-09-28 after v3 (results/fast-reasoning-v3-RESULTS.md).
// Driver fixes only, no organ change: (a) the injection looks habits up
// under judge.js's own key (the claim's folded arrangement) — v3 looked
// under the driver's `claim:<i>` and found none; (b) the negated
// restatement is "<subject> never <verb> ..." so the relation reader's own
// negation rule (negation BEFORE the verb, P43) reads it `contradicted`;
// (c) every claim reaches judgeTurn's revision loop, settled or not, as in
// production. SKIP_E4=1 skips the prompt-variant arms (measured in v3).
//   P7  every holding habit is conceded on the injected book (REC, trigger
//       quoted) and none answers `holds` against the negation; P1–P6, P9
//       stand as registered.
// V5, PRE-REGISTERED 2026-09-28 after v4 (results/fast-reasoning-v4-RESULTS.md).
// ONE organ change (the-fold judge.js): the habit rung's counter-decider
// wall — a section sentence sharing the decider's company and carrying a
// received negation word stands the habit down; the judge is asked.
//   P7  on the injected book no habit answers `holds` against its negation
//       (v4: 2 of 3 did); the readable one is still conceded (≥ 1 REC)
//   P10 the stood-down habits are asked to the judge (habitStoodDown set,
//       rung judge or none — never habit) and the extra cost is ≤ 2 calls each
// V6, PRE-REGISTERED 2026-09-28 after v5: the wall reads the CLAIM's company
// too (judge.js). P7 re-registered: no habit answers `holds` against its
// negation; ≥ 1 conceded; P10 stands.
// V7, PRE-REGISTERED 2026-09-28 after v6: the mechanical rung gains a second
// organ, adapters/text/copula-claims.js — a copula claim (subject · copula ·
// adjective/superlative/number complement) read sentence by sentence from
// the retrieved passages, the relation reader's blind class (22 of 34
// claims). Tried AFTER the relation reader, only where it read nothing.
//   P11 the mechanical rung binds ≥ 8 true claims (v6: 4), refuses no true
//       claim, and lands `holds` on no false claim
//   P12 ON pass 1: correct ≥ 10 at ≤ 34 model calls (v6: 7 at 34); zero
//       fabrications stands (P3)
//   P13 CONTROL: the copula rung is sentence-local, so a shuffled book keeps
//       it — the control's mechanical binds are predicted to RISE toward the
//       real book's; disclosed as the organ's own grain, not a defect
// V8, PRE-REGISTERED 2026-09-28 after v7: the copula reader reads the
// ARRANGEMENT — subject adjacent before the copula, complement adjacent
// after — never two bags (the shuffled control's one fabrication).
//   P14 zero fabrications on the CONTROL arm too (v7: 1); P11/P12 stand
//       (≥ 8 true bound, none refused, no false holds; ≥ 10 right ≤ 34 calls)
//   node eval/identity/fast-reasoning.mjs [out.json]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const LP = "/home/user/live_priors";
const OUT = process.argv[2] ?? null;
const MODEL = process.env.MODEL ?? "onnx-community/Qwen2.5-0.5B-Instruct";
const RETRIEVE = 3;

const { organs } = await import(`${NATIVE}/eval/the-fold/lib/product-assay.mjs`);
const { ingestionOf } = await import(`${FOLD}answer-record.js`);
const { judgeTurn, buildJudgeMessages, sectionAround, habitKeyOf, refOfHolon, JUDGE_MAX_TOKENS } = await import(`${FOLD}judge.js`);
const { createHabits, habitCensus, recallHabit } = await import(`${NATIVE}/kernel/habit.js`);
const { readJudgment } = await import(`${NATIVE}/organs/judgment-reader.js`);
const { judgmentRequest, ingestionStanding } = await import(`${NATIVE}/kernel/ingestion.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { readCopulaClaim } = await import(`${NATIVE}/adapters/text/copula-claims.js`);

// ── THE KEY, fixed before the run: every TRUE claim's bytes were read in the book first ──
const WP = "War and Peace", DR = "Dracula";
const KEY = [
  [WP, true, "Pierre became Count Bezúkhov."],
  [WP, true, "Weyrother was the Austrian general who succeeded Schmidt."],
  [WP, true, "Braunau was the headquarters of Kutúzov."],
  [WP, true, "Mary Hendríkhovna was the wife of the regimental doctor."],
  [WP, true, "Speránski was the son of a village priest."],
  [WP, true, "Borodinó became the greatest glory of the Russian army."],
  [WP, true, "Makár Alexéevich was Joseph Bazdéev's brother."],
  [WP, true, "Iogel's balls were the most enjoyable in Moscow."],
  [WP, true, "The letter taken by Balashëv was the last Napoleon sent to Alexander."],
  [WP, true, "Count Markóv was the only man who knew how to handle him."],
  [WP, true, "Tíkhon Shcherbáty was the bravest man in the party."],
  [WP, true, "Mademoiselle Bourienne was a coquettish girl."],
  [WP, false, "Pierre became the Austrian general."],
  [WP, false, "Weyrother became Count Bezúkhov."],
  [WP, false, "Braunau was the headquarters of Napoleon."],
  [WP, false, "Mary Hendríkhovna was the wife of Kutúzov."],
  [WP, false, "Speránski was the son of a count."],
  [WP, false, "Balashëv was the son of a village priest."],
  [WP, false, "Dokhtúrov succeeded Schmidt."],
  [WP, false, "Bennigsen became Count Bezúkhov."],
  [DR, true, "Mina was the brightest and most cheerful of us."],
  [DR, true, "Harker was the only one who had any result."],
  [DR, true, "The Pruth is the more easily navigated."],
  [DR, true, "Arthur was the first."],
  [DR, true, "The estate is called Carfax."],
  [DR, true, "Renfield is fifty-nine."],
  [DR, true, "Van Helsing is Seward's old friend and master."],
  [DR, true, "Carfax is near Purfleet."],
  [DR, false, "Mina was the only one who had any result."],
  [DR, false, "Harker was the brightest and most cheerful of us."],
  [DR, false, "The estate is called Whitby."],
  [DR, false, "Renfield is thirty-nine."],
  [DR, false, "Van Helsing was the first."],
  [DR, false, "Carfax is near Exeter."],
].map(([book, truth, claim], i) => ({ i, book, truth, claim }));

const BOOKS = {
  [WP]: `${LP}/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt`,
  [DR]: `${LP}/01-literature-books/gutenberg/pg345_Dracula.txt`,
};

// ── the model, in this process ──
let gen = null, calls = 0, callMs = 0;
async function loadModel() {
  const { pipeline } = await import("@huggingface/transformers");
  const t0 = Date.now();
  try { gen = await pipeline("text-generation", MODEL, { dtype: "q4", device: "cpu" }); }
  catch (e) { console.log("cpu backend failed, wasm:", String(e.message).slice(0, 120)); gen = await pipeline("text-generation", MODEL, { dtype: "q4", device: "wasm" }); }
  console.log(`model ${MODEL} loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
async function ask(messages, { maxTokens = JUDGE_MAX_TOKENS } = {}) {
  const t0 = Date.now(); calls += 1;
  const out = await gen(messages, { max_new_tokens: maxTokens, do_sample: false, return_full_text: false });
  callMs += Date.now() - t0;
  const g = out?.[0]?.generated_text;
  return typeof g === "string" ? g : Array.isArray(g) ? String(g.at(-1)?.content ?? "") : String(g ?? "");
}

// ── material ──
const O = await organs({ language: "eng" });
const seedShuffle = (arr, seed) => { let s = seed >>> 0; const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function material(name, text) {
  const chunks = O.chunkSource(name, text);
  return { name, text, chunks };
}
const REAL = Object.fromEntries(Object.entries(BOOKS).map(([n, p]) => [n, material(n, readFileSync(p, "utf8").replace(/\r\n/g, "\n"))]));
// the control: the book's own sentences (their TEXT — v1 joined the splitter's objects) in a seeded random order, re-paragraphed six to a paragraph so the chunker and retrieval see the same grain as the real book
const paragraphed = (sents) => { const out = []; for (let i = 0; i < sents.length; i += 6) out.push(sents.slice(i, i + 6).join(" ")); return out.join("\n\n"); };
const SHUFFLED = Object.fromEntries(Object.entries(REAL).map(([n, m]) => [n, material(`${n} (shuffled)`, paragraphed(seedShuffle(splitSentences(m.text).map((x) => (typeof x === "string" ? x : x.text)), 7)))]));
console.log(Object.entries(REAL).map(([n, m]) => `${n}: ${m.text.length} chars, ${m.chunks.length} chunks`).join(" · "));

// ── one claim through the ladder ──
function mechanical(m, claim) {
  const passages = O.retrieve(m.chunks, claim, RETRIEVE);
  if (!passages.length) return { passages, claims: [], verdict: "no_passages" };
  const rel = O.relationsFor(passages, { pool: passages });
  const read = rel.read(claim);
  const claims = (read?.claims ?? []).map((c) => ({ key: habitKeyOf(c), end1: c.end1, label: c.label, end2: c.end2, verdict: c.verdict, polarity: c.polarity ?? "+", refs: [...(c.refs ?? [])], spans: (c.spans ?? []).map((s) => ({ ref: s.ref })) }));
  let verdict = claims.some((c) => c.verdict === "contradicted") ? "refused" : claims.some((c) => c.verdict === "bound") ? "holds" : claims.length ? "open" : "no_claim";
  let organ = verdict === "holds" || verdict === "refused" ? "relations" : null, copula = null;
  // V7: the copula reader, after the relation reader and only where it read nothing settled
  if (!organ) {
    copula = readCopulaClaim(claim, passages, { splitSentences });
    if (copula.verdict === "holds" || copula.verdict === "refused") { verdict = copula.verdict; organ = "copula"; }
  }
  return { passages, claims, verdict, organ, copula };
}
const truthOf = (v) => (v === "holds" ? true : v === "refused" ? false : null);

async function ladder(m, item, { trails, habits, judgeOn = true, mechanicalOn = true, variant = "shipped", question }) {
  const mech = mechanical(m, item.claim);
  const row = { i: item.i, book: item.book, truth: item.truth, claim: item.claim, passages: mech.passages.map((p) => p.ref), mechanical: mech.verdict, rung: null, verdict: null, calls: 0, anchored: null, landed: null };
  const before = calls;
  if (mechanicalOn && (mech.verdict === "holds" || mech.verdict === "refused")) {
    row.rung = "mechanical"; row.verdict = mech.verdict; row.calls = 0; row.organ = mech.organ; row.decider = mech.copula?.decider ?? null;
    // the revision loop sees every claim, settled or not (as in production): a live habit the reader now contradicts is conceded here
    const settled = mech.claims.filter((c) => c.verdict === "bound" || c.verdict === "contradicted").map((c) => ({ ...c, key: `claim:${item.i}` }));
    row.habitKey = settled.length ? habitKeyOf(settled[0]) : null;
    const ing = ingestionOf({ claims: settled, unread: [], witness: [], sources: [{ name: m.name }], trails });
    const rev = await judgeTurn({ ingestion: ing, claims: settled, question: "", forWhomId: `key:${item.i}`, chunks: m.chunks, recipe: "revision", habits, model: MODEL, ask: async () => { throw new Error("no ask on a settled claim"); } });
    return { row, trails: rev.trails, habits: rev.habits, conceded: rev.conceded };
  }
  if (!judgeOn) { row.rung = "none"; row.verdict = null; return { row, trails, habits }; }
  // a claim the reader could not settle: hand ingestion the claim's own gap so the ladder escalates it
  const refs = mech.passages.map((p) => p.ref);
  const claimRow = mech.claims.find((c) => c.verdict !== "bound" && c.verdict !== "contradicted") ?? { key: habitKeyOf({ end1: item.claim, label: "", end2: "" }), end1: item.claim, label: "", end2: "", verdict: "unheard", refs: refs.slice(0, 1), spans: [] };
  if (!claimRow.refs?.length) claimRow.refs = refs.slice(0, 1);
  const claims = [{ ...claimRow, key: `claim:${item.i}` }];
  row.habitKey = habitKeyOf(claims[0]);
  const ing = ingestionOf({ claims, unread: [], witness: [], sources: [{ name: m.name }], trails });
  const judged = await judgeTurn({ ingestion: ing, claims, question: question ?? `Is it true that ${item.claim.replace(/\.$/, "")}?`, forWhomId: `key:${item.i}`, chunks: m.chunks, recipe: `${MODEL}@judge-point-then-word-${variant}`, habits, model: MODEL,
    ask: (messages) => ask(variant === "shipped" ? messages : rewire(messages, variant)) });
  const j = judged.ingestion.byClaim[0]?.judgment ?? null;
  row.rung = j?.rung ?? "none"; row.verdict = j?.landed === "chosen" ? j.verdict : null; row.anchored = j?.anchored ?? null; row.landed = j?.landed ?? (j?.refused ?? "not_asked"); row.calls = calls - before; row.gary = j?.gary?.findings?.length ?? null; row.judgeVerdictRaw = j?.verdict ?? null;
  return { row, trails: judged.trails, habits: judged.habits, conceded: judged.conceded };
}
// E4's variants, applied AFTER Gary's door so the door's own reading of the shipped bag is what it is
function rewire(messages, variant) {
  const [sys, user] = messages;
  if (variant === "question-first") { const parts = user.content.split("\n\n"); const q = parts.pop(); return [sys, { role: "user", content: [q, ...parts].join("\n\n") }]; }
  if (variant === "prohibition") return [{ ...sys, content: sys.content + " Do not guess. Do not make anything up." }, user];
  return messages;
}
const score = (rows) => {
  const answered = rows.filter((r) => r.verdict !== null);
  const correct = answered.filter((r) => truthOf(r.verdict) === r.truth).length;
  const fabrications = rows.filter((r) => r.truth === false && r.verdict === "holds").length;
  const callsN = rows.reduce((n, r) => n + r.calls, 0);
  return { claims: rows.length, answered: answered.length, correct, wrong: answered.length - correct, fabrications, calls: callsN, correctPerCall: callsN ? +(correct / callsN).toFixed(2) : null, byRung: rows.reduce((t, r) => ({ ...t, [r.rung]: (t[r.rung] ?? 0) + 1 }), {}) };
};

async function runArm(name, mats, { judgeOn, mechanicalOn, trails = {}, habits = createHabits(), variant = "shipped" }) {
  const rows = []; let conceded = [];
  for (const item of KEY) { const r = await ladder(mats[item.book], item, { trails, habits, judgeOn, mechanicalOn, variant }); rows.push(r.row); trails = r.trails; habits = r.habits; if (r.conceded?.length) conceded.push(...r.conceded); }
  const s = score(rows);
  console.log(`${name}: ${JSON.stringify(s)}`);
  return { rows, score: s, trails, habits, conceded };
}

const t0 = Date.now();
await loadModel();
const out = { model: MODEL, retrieve: RETRIEVE, key: KEY.length, arms: {} };
// E1
out.arms.on1 = await runArm("E1 ON pass 1", REAL, { judgeOn: true, mechanicalOn: true });
out.arms.off = await runArm("E1 OFF (judge every claim)", REAL, { judgeOn: true, mechanicalOn: false });
out.arms.shuffled = await runArm("E1 CONTROL shuffled, ON", SHUFFLED, { judgeOn: true, mechanicalOn: true });
// E2
out.arms.on2 = await runArm("E2 ON pass 2 (habits carried)", REAL, { judgeOn: true, mechanicalOn: true, trails: out.arms.on1.trails, habits: out.arms.on1.habits });
out.arms.on3 = await runArm("E2 ON pass 3", REAL, { judgeOn: true, mechanicalOn: true, trails: out.arms.on2.trails, habits: out.arms.on2.habits });
// the injection: for every live habit that holds, a negated restatement of its decider sentence is inserted right before the passage it lives in
const keyOf = (i) => out.arms.on3.rows.find((r) => r.i === i)?.habitKey ?? null;
const liveHabits = KEY.map((item) => ({ item, habit: keyOf(item.i) ? recallHabit(out.arms.on3.habits, keyOf(item.i)) : null })).filter((x) => x.habit && x.habit.verdict === "holds");
const INJECTED = Object.fromEntries(Object.entries(REAL).map(([n, m]) => {
  let text = m.text;
  for (const { item, habit } of liveHabits.filter((x) => x.item.book === n)) {
    const at = text.indexOf(habit.decider);
    const neg = item.claim.replace(/\b(was|is|were|became|succeeded)\b/, (v) => `never ${v}`);
    if (at >= 0) text = text.slice(0, at) + neg + " " + text.slice(at);
  }
  return [n, material(n, text)];
}));
out.injection = { habitsHolding: liveHabits.map((x) => ({ i: x.item.i, decider: x.habit.decider })) };
out.arms.injected = await runArm("E2 INJECTION (negations inserted, habits carried)", INJECTED, { judgeOn: true, mechanicalOn: true, trails: out.arms.on3.trails, habits: out.arms.on3.habits });
out.injection.conceded = out.arms.injected.conceded;
out.injection.stoodDown = out.arms.injected.rows.filter((r) => liveHabits.some((x) => x.item.i === r.i) && r.rung !== "habit").map((r) => [r.i, r.rung, r.verdict, r.calls]);
out.injection.heldAgainstNegation = out.arms.injected.rows.filter((r) => liveHabits.some((x) => x.item.i === r.i) && r.rung === "habit" && r.verdict === "holds").map((r) => r.i);
// E4
if (process.env.SKIP_E4) { out.arms.v_first = { rows: [], score: null }; out.arms.v_prohib = { rows: [], score: null }; }
else {
out.arms.v_first = await runArm("E4 question-first (judge every claim)", REAL, { judgeOn: true, mechanicalOn: false, variant: "question-first" });
out.arms.v_prohib = await runArm("E4 prohibition (judge every claim)", REAL, { judgeOn: true, mechanicalOn: false, variant: "prohibition" });
}
const landings = (rows) => rows.reduce((t, r) => ({ ...t, [r.landed]: (t[r.landed] ?? 0) + 1 }), {});
out.e4 = { shipped: landings(out.arms.off.rows), questionFirst: landings(out.arms.v_first.rows), prohibition: landings(out.arms.v_prohib.rows) };

// ── predictions, read off the record ──
const P = {};
P.P1 = { on: out.arms.on1.score.calls, off: out.arms.off.score.calls, held: out.arms.on1.score.calls < out.arms.off.score.calls };
P.P2 = { on: out.arms.on1.score.correct, off: out.arms.off.score.correct, held: out.arms.on1.score.correct >= out.arms.off.score.correct };
P.P3 = { on: out.arms.on1.score.fabrications, off: out.arms.off.score.fabrications, held: out.arms.on1.score.fabrications === 0 && out.arms.off.score.fabrications === 0 };
const mechTrue = (rows) => rows.filter((r) => r.truth && r.rung === "mechanical" && r.verdict === "holds").length;
P.P4 = { real: mechTrue(out.arms.on1.rows), shuffled: mechTrue(out.arms.shuffled.rows), held: mechTrue(out.arms.shuffled.rows) < mechTrue(out.arms.on1.rows) };
const judgeCalls = (rows) => rows.filter((r) => r.rung === "judge").length;
P.P5 = { pass1: judgeCalls(out.arms.on1.rows), pass2: judgeCalls(out.arms.on2.rows), pass3: judgeCalls(out.arms.on3.rows), held: judgeCalls(out.arms.on2.rows) < judgeCalls(out.arms.on1.rows) && judgeCalls(out.arms.on3.rows) <= judgeCalls(out.arms.on2.rows) };
const anchoredJudged = new Set(out.arms.on1.rows.filter((r) => r.rung === "judge" && r.landed === "chosen").map((r) => r.i));
P.P6 = { habitRows: out.arms.on2.rows.filter((r) => r.rung === "habit").map((r) => r.i), held: out.arms.on2.rows.filter((r) => r.rung === "habit").every((r) => anchoredJudged.has(r.i)) };
P.P7 = { holdingHabits: liveHabits.length, conceded: out.injection.conceded.length, heldAgainstNegation: out.injection.heldAgainstNegation, held: liveHabits.length > 0 && out.injection.heldAgainstNegation.length === 0 && out.injection.conceded.length > 0 };
const chosen = (l) => l.chosen ?? 0, contested = (l) => l.contested ?? 0;
P.P8 = { shipped: out.e4.shipped, questionFirst: out.e4.questionFirst, prohibition: out.e4.prohibition, held: chosen(out.e4.shipped) >= Math.max(chosen(out.e4.questionFirst), chosen(out.e4.prohibition)) && contested(out.e4.shipped) <= Math.min(contested(out.e4.questionFirst), contested(out.e4.prohibition)) };
P.P10 = { stoodDown: out.injection.stoodDown, held: out.injection.stoodDown.length + out.injection.conceded.length >= liveHabits.length && out.injection.stoodDown.every(([, , , c]) => c <= 2) };
const mechRows = (rows) => rows.filter((r) => r.rung === "mechanical");
P.P11 = { trueBound: mechRows(out.arms.on1.rows).filter((r) => r.truth && r.verdict === "holds").length, trueRefused: mechRows(out.arms.on1.rows).filter((r) => r.truth && r.verdict === "refused").length, falseHolds: mechRows(out.arms.on1.rows).filter((r) => !r.truth && r.verdict === "holds").length, byOrgan: mechRows(out.arms.on1.rows).reduce((t, r) => ({ ...t, [r.organ]: (t[r.organ] ?? 0) + 1 }), {}), held: null };
P.P11.held = P.P11.trueBound >= 8 && P.P11.trueRefused === 0 && P.P11.falseHolds === 0;
P.P12 = { correct: out.arms.on1.score.correct, calls: out.arms.on1.score.calls, held: out.arms.on1.score.correct >= 10 && out.arms.on1.score.calls <= 34 };
P.P13 = { realMechanical: mechRows(out.arms.on1.rows).length, shuffledMechanical: mechRows(out.arms.shuffled.rows).length, note: "sentence-local organ: predicted to rise on the shuffled book" };
P.P14 = { controlFabrications: out.arms.shuffled.score.fabrications, realFabrications: out.arms.on1.score.fabrications, held: out.arms.shuffled.score.fabrications === 0 && out.arms.on1.score.fabrications === 0 };
P.P9 = { chosenOn: out.arms.on1.rows.filter((r) => r.rung === "judge" && r.landed === "chosen").length, held: out.arms.on1.rows.some((r) => r.rung === "judge" && r.landed === "chosen") };
P.P4.controlPassages = out.arms.shuffled.rows.filter((r) => r.mechanical !== "no_passages").length;
out.predictions = P;
out.totals = { modelCalls: calls, modelSeconds: +(callMs / 1000).toFixed(1), seconds: +((Date.now() - t0) / 1000).toFixed(1), habits: habitCensus(out.arms.injected.habits) };
for (const [k, v] of Object.entries(P)) console.log(k, v.held ? "HELD" : "FAILED", JSON.stringify(v).slice(0, 240));
console.log("totals", JSON.stringify(out.totals));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
