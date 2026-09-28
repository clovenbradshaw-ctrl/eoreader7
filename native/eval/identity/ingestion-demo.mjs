// eval/identity/ingestion-demo.mjs — HOW MUCH OF "NOT FULLY INGESTED" IS
// MECHANICAL (2026-09-28). No model call anywhere in this file.
//
// Two readers over War and Peace (Maude, Gutenberg): the occupancy reader
// (reads every sentence — its reach is the whole) and the native perceiver
// AS THE EVAL RUNS IT (NATIVE_MAX_CHARS=150000 — its reach is the
// paragraphs inside the cap). Gaps are the occupancy reader's own typed
// refusals and its undecided slots that did not collapse `chosen`. Holons:
// "/p{k}/s{at}" (paragraphs by blank line, sentences by the splitter).
// Then: a claim citing a sentence beyond the native cap, and one citing a
// sentence with an open slot, each turned into a judgment REQUEST for two
// declared for-whoms — the request printed, the section's size shown, the
// model never asked. What is left for a judge is exactly what is printed.
//   node ingestion-demo.mjs [out.json]
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { readOccupancyTestimony } = await import(`${NATIVE}/adapters/text/occupancy-testimony.js`);
const { grammarFor } = await import(`${NATIVE}/adapters/text/grammar.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { ingestionStanding, unreadCited, judgmentRequest } = await import(`${NATIVE}/kernel/ingestion.js`);
const { createForWhom } = await import(`${NATIVE}/kernel/for-whom.js`);
const { NEGATION_WORDS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, AUXILIARY_VERBS } = await import(`${NATIVE}/adapters/text/priors.js`);
const { COPULA_FORMS } = await import(`${NATIVE}/adapters/text/phasepost.js`);

const [OUT] = process.argv.slice(2);
const NATIVE_CAP = Number(process.env.NATIVE_MAX_CHARS) || 150000;
const raw = readFileSync("/home/user/live_priors/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt", "utf8");
const start = raw.indexOf("*** START OF"), end = raw.indexOf("*** END OF");
const body = raw.slice(raw.indexOf("\n", start) + 1, end > 0 ? end : raw.length);

// paragraphs by blank line; sentences by the splitter; every sentence a holon
const paras = []; let off = 0;
for (const m of body.matchAll(/[^]+?(?:\n\s*\n|$)/g)) { const t = m[0]; if (t.trim()) paras.push({ k: paras.length, text: t, start: m.index, end: m.index + t.length }); }
const sentences = []; let at = 0;
for (const p of paras) for (const s of splitSentences(p.text)) { if (!s.text?.trim()) continue; sentences.push({ at, text: s.text, holon: `/p${p.k}/s${at}`, para: p.k, start: p.start + (s.start ?? 0) }); at += 1; }
const paraOf = new Map(paras.map((p) => [`/p${p.k}`, p]));

const MODALS = new Set([...AUXILIARY_VERBS].filter((w) => !COPULA_FORMS.has(w) && !["have", "has", "had", "do", "does", "did"].includes(w)));
const t0 = Date.now();
const r = readOccupancyTestimony(sentences, { source: "wp", determiners: { definite: DEFINITE_DETERMINERS, indefinite: INDEFINITE_DETERMINERS }, modals: MODALS, negation: NEGATION_WORDS, language: "en", grammarFor });
const holonAt = new Map(sentences.map((s) => [s.at, s.holon]));

// THE RECORD: reach, gaps, slots — read off what the readers reported
const capPara = paras.find((p) => p.end > NATIVE_CAP)?.k ?? paras.length;
const reached = [{ holon: "/", recipe: "occupancy-testimony@2e67c14+" }, ...paras.filter((p) => p.k < capPara).map((p) => ({ holon: `/p${p.k}`, recipe: `native-perceiver@cap${NATIVE_CAP}` }))];
const gaps = r.refused.map((x) => ({ holon: holonAt.get(x.at), reason: x.reason, recipe: "occupancy-testimony" }));
const slots = r.events.map((e) => ({ holon: holonAt.get(e.undecided.at.sentence), verdict: e.collapse.verdict, id: e.undecided.id }));

// The tallies index the record by holon once (the kernel's ingestionStanding
// is a per-holon question over the whole record — asked 35,000 times it is
// quadratic; asked per paragraph and per cited claim, below, it is exact).
const gapAt = new Map(), openAt = new Map();
for (const g of gaps) gapAt.set(g.holon, (gapAt.get(g.holon) ?? 0) + 1);
for (const s of slots) if (s.verdict !== "chosen") openAt.set(s.holon, (openAt.get(s.holon) ?? 0) + 1);
const bySentence = { read: 0, partial: 0, unread: 0 }, byPara = { read: 0, partial: 0, unread: 0 };
for (const s of sentences) bySentence[gapAt.has(s.holon) || openAt.has(s.holon) ? "partial" : "read"] += 1; // the occupancy reader reached "/"
const paraGaps = new Map(); for (const [h, n] of [...gapAt, ...openAt]) { const p = h.split("/")[1]; paraGaps.set(p, (paraGaps.get(p) ?? 0) + n); }
for (const p of paras) byPara[paraGaps.has(`p${p.k}`) ? "partial" : "read"] += 1;
// the native reader alone: what it never reached (its reach stops at the cap)
const nativeOnly = { read: 0, partial: 0, unread: 0 };
for (const p of paras) nativeOnly[p.k >= capPara ? "unread" : paraGaps.has(`p${p.k}`) ? "partial" : "read"] += 1;
// the kernel's own answer, exact, on a sample of paragraphs — agreement with the indexed tally is asserted
for (const p of paras.filter((_, i) => i % 250 === 0)) { const k = ingestionStanding({ holon: `/p${p.k}`, reached: reached.slice(1), gaps, slots }).standing; const t = p.k >= capPara ? "unread" : paraGaps.has(`p${p.k}`) ? "partial" : "read"; if (k !== t) throw new Error(`tally disagrees with the kernel at /p${p.k}: ${t} vs ${k}`); }

// claims being reasoned over: one cites a sentence beyond the native cap, one an open slot, one a clean sentence
const beyond = sentences.find((s) => s.para >= capPara && /Bez[uú]khov/.test(s.text));
const openSlot = slots.find((s) => s.verdict !== "chosen");
const clean = sentences.find((s) => ingestionStanding({ holon: s.holon, reached, gaps, slots }).standing === "read" && s.para < capPara);
const claims = [{ id: "c-beyond", ground: beyond?.holon, text: beyond?.text }, { id: "c-open", ground: openSlot?.holon }, { id: "c-clean", ground: clean?.holon }].filter((c) => c.ground);
const cited = unreadCited({ claims, reached, gaps, slots });
const sectionOf = (h) => paraOf.get(h)?.text ?? sentences.find((s) => s.holon === h)?.text ?? null;
const fwA = createForWhom({ id: "reader:succession", giver: "the succession question", question: "who held the title Count Bezúkhov, and when" });
const fwB = createForWhom({ id: "reader:novelist", giver: "a reader of the novel", question: "who is Pierre" });
const requests = cited.flatMap((x) => [fwA, fwB].map((fw) => { const req = judgmentRequest({ standing: x.standing, forWhom: fw, sectionOf, claim: x.claim }); return req && { claim: x.claim.id, forWhom: fw.id, holon: req.holon, section: req.section, sectionChars: req.text?.length ?? 0, left: req.findings.left, readers: req.findings.readers, ask: req.ask }; }).filter(Boolean));

// THE LADDER, learned in the environment (kernel/escalation.js over kernel/stigmergy.js):
// from an empty environment the order is structural — mechanical first. The
// mechanical rung here IS everything above (the readers ran, the gaps stayed):
// its trip is recorded as a failure for each cited shape, which deposits
// nothing (failures evaporate). The judge rung is what the requests above
// would be handed; it is never run here, so no judge trail forms — the
// environment learns only from trips actually made.
const { shouldEscalate, recordOutcome, shapeOf } = await import(`${NATIVE}/kernel/escalation.js`);
const { levelOfHolon } = await import(`${NATIVE}/adapters/text/grammar.js`);
let trails = {};
const ladders = cited.map((x) => {
  const prefix = `${levelOfHolon(x.standing.holon) ?? "holon"}:`;
  const before = shouldEscalate({ standing: x.standing, trails, prefix, rng: () => 1 });
  trails = recordOutcome(trails, { shape: before.shape, rung: "mechanical", ok: false, ms: 0 });
  const after = shouldEscalate({ standing: x.standing, trails, prefix, rng: () => 1 });
  return { claim: x.claim.id, shape: before.shape, first: before.first, order: before.ladder.order, learned: after.ladder.learned, afterMechanicalFailure: after.first, judgeTrips: 0 };
});
const out = { ladders, seconds: +((Date.now() - t0) / 1000).toFixed(1), sentences: sentences.length, paragraphs: paras.length, nativeCap: NATIVE_CAP, capParagraph: capPara, refused: r.refused.length, slotsOpen: slots.filter((s) => s.verdict !== "chosen").length, bySentence, byPara, nativeOnlyByPara: nativeOnly, claims: claims.map((c) => c.id), unreadCited: cited.map((x) => [x.claim.id, x.standing.standing, x.standing.gaps.length, x.standing.openSlots.length]), requests };
console.log(JSON.stringify({ ...out, requests: requests.map((q) => ({ ...q, ask: q.ask.slice(0, 160) })) }, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
