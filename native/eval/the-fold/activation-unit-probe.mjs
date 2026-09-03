// activation-unit-probe.mjs — WHY did corpus-scale recall collapse to 0/9,
// and is the material reaching the model even capable of supporting a yes?
//
// THE FINDING THIS STARTS FROM (witness-paraphrase-corpus-RESULTS.md): the
// same protocol scored 3/9 on a 9KB excerpt and 0/9 on the whole book, with
// zero lies at both scales. That write-up traced ONE item by hand — retrieval
// correct, candidate correct, model saying no — and diagnosed the reading
// UNIT ("the fact sits inside a subordinate clause of a longer reported-
// speech sentence"). It named the next move and did not take it. This takes
// it for all nine, mechanically.
//
// THE QUESTION, and it needs no model: of the nine entailed items, how many
// died BEFORE the model was asked (no slice, no candidate), how many reached
// it holding material that literally carries both ends, and how many reached
// it holding something thinner? Those need different fixes and summing them
// hides all three.
//
// HOW IT ASKS. The REAL production path runs — real chunkSource, real
// retrieve, real witnessSentences over the real joined source — with the
// model replaced by a RECORDER that always answers no. A stand-in model
// changes nothing upstream of itself: every gate, slice, candidate set and
// refusal is the shipped organ's own. A first version of this probe
// reimplemented the path instead and modelled neither witnessSlice's
// hard gate nor the passage JOIN, which is exactly the kind of near-miss
// that produces a confident wrong partition.
//
//   node activation-unit-probe.mjs      env: BOOK, LIMIT
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const T = await import(`${NATIVE}/organs/index.js`);
const { witnessSentences } = await import(`${NATIVE}/organs/witness-sentences.js`);
const { chunkSource, retrieve } = await import(`${FOLD}/source.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { competingFiller } = await import(`${NATIVE}/organs/corroboration.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);

// The battery is INLINED, not imported: witness-paraphrase-corpus.mjs runs its
// whole model battery at module top level, so importing it for a constant
// would spend the run this probe exists to avoid. Copied verbatim from that
// file (its lines 41-58) — the truth labels are fixed there, not here.
const BATTERY = [
  [1, "who was appointed commander in chief to replace after Kutúzov", "The committee replaced someone with Kutúzov as commander in chief.", "ENTAILED", "role-reversed", "committee", "Kutúzov"],
  [2, "Kutúzov appointed commander in chief full powers armies", "Kutúzov was appointed commander in chief with full powers over the armies.", "ENTAILED", "near-verbatim", "Kutúzov", "commander in chief"],
  [3, "Kutúzov appointed commander in chief full powers armies", "Kutúzov replaced someone else as commander in chief.", "FALSE", "role-reversed-false", "Kutúzov", "commander in chief"],
  [4, "French army crossed the Niemen invasion", "The French army crossed the Niemen at the start of the invasion.", "ENTAILED", "near-verbatim", "French", "Niemen"],
  [5, "French army crossed the Niemen invasion", "The Niemen was crossed by the Russian army.", "FALSE", "swapped-agent", "Niemen", "Russian"],
  [6, "Bagratión wounded flèches captured retaken", "Prince Bagratión was wounded when the flèches were retaken.", "ENTAILED", "rearranged", "Bagratión", "flèches"],
  [7, "Bagratión wounded flèches captured retaken", "Kutúzov was wounded when the flèches were retaken.", "FALSE", "swapped-subject", "Kutúzov", "flèches"],
  [8, "Moscow was burned by its inhabitants", "Moscow was burned by the people who had abandoned it.", "ENTAILED", "near-verbatim", "Moscow", "inhabitants"],
  [9, "Moscow was burned by its inhabitants", "Moscow was burned by the French army.", "FALSE", "swapped-agent", "Moscow", "French"],
  [10, "Prince Andrew fatally wounded left care inhabitants district", "Prince Andrew was left in the care of the local people after being fatally wounded.", "ENTAILED", "passive", "Andrew", "wounded"],
  [11, "Prince Andrew fatally wounded left care inhabitants district", "Prince Andrew died instantly on the battlefield.", "FALSE", "unheard-verb", "Andrew", "battlefield"],
  [12, "Countess Hélène Bezúkhova suddenly died terrible", "Hélène Bezúkhova suddenly died.", "ENTAILED", "near-verbatim", "Hélène", "died"],
  [13, "Countess Hélène Bezúkhova suddenly died terrible", "Natásha Rostova suddenly died.", "FALSE", "swapped-subject", "Natásha", "died"],
  [14, "Natásha engaged brother sister of course out of question", "Natásha was engaged to marry a certain man's brother.", "ENTAILED", "rearranged", "Natásha", "engaged"],
  [15, "Natásha engaged brother sister of course out of question", "Natásha was engaged to marry Pierre.", "FALSE", "swapped-object", "Natásha", "Pierre"],
  [16, "Emperor's dislike Kutúzov committee advise appointment", "The committee advised the Emperor to appoint Kutúzov despite his dislike of him.", "ENTAILED", "role-reversed", "committee", "Emperor"],
];

// The EXCERPT battery, from witness-paraphrase.mjs, inlined on the same terms.
// It is a DIFFERENT battery over DIFFERENT material — which is itself worth
// stating, because the "3/9 excerpt vs 0/9 corpus" contrast this probe starts
// from compares two item sets, not one item set at two scales. Each arm's own
// ceiling is the only thing comparable between them.
const EXCERPT_BATTERY = [
  [1, null, "Kutuzov replaced Barclay de Tolly as commander.", "ENTAILED", "role-reversed", "Kutuzov", "Barclay de Tolly"],
  [2, null, "The Tsar replaced Barclay de Tolly with Kutuzov.", "ENTAILED", "near-verbatim", "Tsar", "Kutuzov"],
  [3, null, "Barclay de Tolly was replaced by Kutuzov.", "ENTAILED", "passive", "Barclay de Tolly", "Kutuzov"],
  [6, null, "Napoleon crossed the Niemen river in June 1812.", "ENTAILED", "rearranged", "Napoleon", "Niemen"],
  [7, null, "The Niemen was crossed by Napoleon's army at the start of the invasion.", "ENTAILED", "passive", "Niemen", "Napoleon"],
  [10, null, "The French took the redoubt at Shevardino.", "ENTAILED", "synonym-verb", "French", "redoubt"],
  [11, null, "The Russian army retreated south after the battle.", "ENTAILED", "role-reversed", "Russian", "retreated"],
  [13, null, "Kutuzov built a defensive line at Borodino.", "ENTAILED", "synonym-verb", "Kutuzov", "Borodino"],
  [15, null, "Alexander I appointed Kutuzov on 29 August.", "ENTAILED", "rearranged", "Alexander", "Kutuzov"],
];

const MODE = process.env.MODE ?? "corpus";       // corpus | excerpt
const LIMIT = Number(process.env.LIMIT ?? 3);   // app.js's own retrieval width
const BOOK = process.env.BOOK ?? "/tmp/wp.txt";

const prior = morphologyFromPrior(JSON.parse(readFileSync(`${NATIVE}/eval/the-fold/fixtures/unimorph-morphology-prior.json`, "utf8")));
const sameForm = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

let items, passagesFor;
if (MODE === "excerpt") {
  const excerpt = readFileSync(`${NATIVE}/eval/the-fold/fixtures/borodino-excerpt.txt`, "utf8");
  items = EXCERPT_BATTERY;
  passagesFor = () => [{ text: excerpt, ref: "borodino-excerpt.txt", start: 0, end: excerpt.length }];
  console.log(`excerpt: borodino-excerpt.txt (${excerpt.length} chars), the whole of it as one passage — no retrieval\n`);
} else {
  const text = readFileSync(BOOK, "utf8");
  const chunks = chunkSource("pg2600.txt", text, {});
  items = BATTERY;
  passagesFor = (question) => (retrieve(chunks, question, LIMIT) ?? []).map((c) => ({ text: c.text, ref: c.ref, start: c.start, end: c.end }));
  console.log(`${BOOK}: ${text.length} chars -> ${chunks.length} chunks (limit ${LIMIT})\n`);
}

const words = (s) => new Set(String(s ?? "").toLowerCase().match(/[a-zà-ÿ']+/gi) ?? []);
const hasAll = (hay, needle) => { const h = words(hay); return [...words(needle)].every((w) => h.has(w)); };

// THE RECORDER. Always answers no, so nothing it says can move a verdict;
// what it captures is what the shipped path SHOWED it, which is the whole
// question. The material is taken from the ORGANS' OWN ARGUMENTS — the slice
// handed to `ask`, the candidate list handed to buildSelectMessages — never
// parsed back out of a prompt. A first cut regexed the numbered list out of
// the message body and, on the generate path (no list), fell back to the
// whole message, which contains the claim sentence itself and so scored
// "carries both ends" for free. Reading a prompt to find out what was shown
// is measuring the prompt.
function recorder(log) {
  const selectAsk = async () => JSON.stringify({ states: false });
  const buildSelectMessages = (sentence, shownList) => { log.select.push([...shownList]); return T.buildSelectMessages(sentence, shownList); };
  const ask = async (_s, slice) => { log.generate.push(String(slice?.text ?? slice ?? "")); return T.readTestimony(JSON.stringify({ answer: "no", because: "" })); };
  const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony,
                      buildSelectMessages, foldSelect: T.foldSelect, sameForm };
  return { ask, selectAsk, testimony, splitSentences };
}

// THE ORACLE ARM. The recorder above answers no, so it measures what the path
// SHOWS. This one answers as a PERFECT reader would — yes, pointing at the
// most-entailing candidate, for the claim the battery declared entailed; no
// for anything else it is asked, which is the sibling-swapped claim the arm
// builds. Whatever still fails to land `states` under a perfect reader failed
// on the PROTOCOL, not on the model and not on the material: an unbuildable
// arm, a no-valid-pick, a slice that never reached the select path. That is a
// third bucket the shown-material partition cannot see.
//
// The oracle picks by the same both-ends-in-full rule used everywhere in this
// probe, never by knowing which item it is: a candidate list carrying no such
// sentence gets an honest no, so the oracle cannot manufacture a landing.
function oracleRecorder(log, claimSentence, end1, end2) {
  let asking = null;
  const buildSelectMessages = (sentence, shownList) => { asking = sentence; log.select.push([...shownList]); return T.buildSelectMessages(sentence, shownList); };
  const selectAsk = async () => {
    const list = log.select[log.select.length - 1] ?? [];
    if (asking !== claimSentence) return JSON.stringify({ stated: "no", sentence: 0 });   // the swap
    const i = list.findIndex((c) => hasAll(c, end1) && hasAll(c, end2));
    return i === -1 ? JSON.stringify({ stated: "no", sentence: 0 }) : JSON.stringify({ stated: "yes", sentence: i + 1 });
  };
  const ask = async (s, slice) => {
    log.generate.push(String(slice?.text ?? slice ?? ""));
    const t = String(slice?.text ?? slice ?? "");
    const yes = s === claimSentence && hasAll(t, end1) && hasAll(t, end2);
    return T.readTestimony(JSON.stringify({ answer: yes ? "yes" : "no", because: yes ? t.slice(0, 200) : "" }));
  };
  const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony,
                      buildSelectMessages, foldSelect: T.foldSelect, sameForm };
  return { ask, selectAsk, testimony, splitSentences };
}

const rows = [];
for (const [id, question, sentence, truth, shape, end1, end2] of items) {
  if (truth !== "ENTAILED") continue;
  const passages = passagesFor(question);
  const claims = [{ sentence, end1, end2, verdict: "unbound" }];
  const log = { select: [], generate: [] };
  const r = await witnessSentences([sentence], claims, passages, { ...recorder(log), maxAsks: 1 });
  const row = r.rows[0] ?? {};
  // The same item again, same material, a perfect reader in the chair.
  const olog = { select: [], generate: [] };
  const or_ = await witnessSentences([sentence], claims, passages, { ...oracleRecorder(olog, sentence, end1, end2), maxAsks: 1 });
  const orow = or_.rows[0] ?? {};

  // Which protocol was reached, and with what. The select path is handed a
  // candidate LIST; the generate path one containment slice. A row whose
  // model was never called at all died on a gate.
  const reached = log.select.length ? "select" : log.generate.length ? "generate" : "NEVER ASKED";
  const cands = log.select.length ? log.select[0] : log.generate.length ? [log.generate[0]] : [];
  // THE ARM'S AMMUNITION, measured rather than inferred. The select arm swaps
  // end2 for a COMPETING FILLER harvested from the candidate list's own
  // capitalized surfaces (corroboration.js::competingFiller); no competitor
  // means `unarmed-select`, and an unarmed yes is refused however correct it
  // is. So this asks the arm's own organ what it would have found.
  const filler = cands.length ? competingFiller(end2, cands, { exclude: [end1] }) : null;
  // THE SECOND ARM WALL, separate from an empty ammunition pool: the swap is
  // a literal string replacement of end2 IN THE CLAIM SENTENCE. A claim that
  // paraphrases its own end2 ("the people who had abandoned it" for
  // "inhabitants") leaves the sentence unchanged, and an arm identical to the
  // claim is no arm — `unarmed-select` again, for an entirely different
  // reason. Measured apart, because they need different fixes.
  const end2Literal = new RegExp(String(end2).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(sentence);
  const adequate = cands.some((c) => hasAll(c, end1) && hasAll(c, end2));
  const passageCarries = passages.some((p) => hasAll(p.text, end1) && hasAll(p.text, end2));
  const joinedCarries = hasAll(passages.map((p) => p.text).join("\n\n"), end1) && hasAll(passages.map((p) => p.text).join("\n\n"), end2);

  rows.push({ id, shape, end1, end2, psg: passages.length, reached, cands: cands.length, adequate,
              passageCarries, joinedCarries, filler, end2Literal, witness: row.witness ?? "?", why: row.why ?? null, oracle: orow.witness ?? "?", oracleWhy: orow.why ?? null,
              sample: cands.find((c) => hasAll(c, end1) && hasAll(c, end2)) ?? cands[0] ?? "" });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("id", 4), pad("shape", 16), pad("psg", 4), pad("reached", 12), pad("cands", 6), pad("adequate", 9), pad("one-psg", 8), pad("joined", 7), pad("arm-filler", 22), pad("end2-in-claim", 14), pad("always-no", 10), "PERFECT READER");
for (const r of rows)
  console.log(pad(r.id, 4), pad(r.shape, 16), pad(r.psg, 4), pad(r.reached, 12), pad(r.cands, 6),
    pad(r.adequate ? "yes" : "no", 9), pad(r.passageCarries ? "yes" : "no", 8), pad(r.joinedCarries ? "yes" : "no", 7), pad(r.filler ? JSON.stringify(r.filler).slice(0, 21) : "— no competitor", 22), pad(r.end2Literal ? "literal" : "PARAPHRASED", 14), pad(r.witness, 10), r.oracle === "states" ? "states" : `${r.oracle} — ${String(r.oracleWhy ?? "").slice(0, 60)}`);

const n = rows.length, c = (f) => rows.filter(f).length;
console.log(`\n── ${MODE}: the entailed set, partitioned (the shipped path, a recorder in the model's chair) ──`);
console.log(`  entailed items                                     ${n}`);
console.log(`  died on a gate — model NEVER ASKED                  ${c((r) => r.reached === "NEVER ASKED")}`);
console.log(`  reached the model via the GENERATE fallback         ${c((r) => r.reached === "generate")}`);
console.log(`  reached the model via the armed SELECT protocol     ${c((r) => r.reached === "select")}`);
console.log(`  ── of those asked, what were they holding? ──`);
console.log(`  material carried BOTH ends in full                  ${c((r) => r.adequate)}   <- refused on READING, not on material`);
console.log(`  material carried neither / one end only             ${c((r) => r.reached !== "NEVER ASKED" && !r.adequate)}   <- refused on MATERIAL`);
console.log(`\n── with a PERFECT reader in the model's chair (same material, same protocol) ──`);
console.log(`  landed \`states\`                                     ${c((r) => r.oracle === "states")} of ${n}`);
console.log(`  refused ANYWAY — the protocol, not the model         ${c((r) => r.oracle !== "states")}`);
for (const r of rows.filter((x) => x.oracle !== "states")) console.log(`     [${r.id}] ${r.oracle}: ${r.oracleWhy ?? ""}`);
console.log(`  of the ${c((r) => r.reached === "select")} select-path items, the arm could be built for ${c((r) => r.reached === "select" && r.filler)}` +
  ` — the two arm walls, measured apart:`);
console.log(`     no competing filler in the candidate set          ${c((r) => r.reached === "select" && !r.filler)}   (its only capitalized surfaces ARE the ends)`);
console.log(`     end2 PARAPHRASED in the claim, so the swap no-ops  ${c((r) => r.reached === "select" && r.filler && !r.end2Literal)}   (a literal replace on a sentence that never says it)`);
console.log(`\n  a single retrieved passage carries both ends        ${c((r) => r.passageCarries)} of ${n}`);
console.log(`  the JOINED source carries both ends                 ${c((r) => r.joinedCarries)} of ${n}`);

console.log(`\n── the best thing the model was shown, per item ──`);
for (const r of rows) console.log(`  [${String(r.id).padStart(2)}] ${r.adequate ? "BOTH ENDS" : "thin     "} ${JSON.stringify(String(r.sample).replace(/\s+/g, " ").slice(0, 120))}`);
