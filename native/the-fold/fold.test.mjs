// node --test fold.test.mjs
//
// Everything here is pure, so it runs in node with no engine and no network.
// The one thing worth testing hardest is the claim in the README: the context
// does not grow with the conversation.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_FOLDS_IN_PROMPT,
  RECORDS_IN_PROMPT,
  RECENCY_WINDOW,
  FOLD_MAX_CHARS,
  addWarrantRecord,
  advanceSummaryFold,
  buildRecordSystemMessage,
  buildSummarySystemMessage,
  buildSummaryUpdatePrompt,
  buildTurnMessages,
  buildWarrantRecord,
  charCount,
  deriveRecordWindow,
  emptySummary,
  extractSummaryFindings,
  mechanicalFoldLine,
  projectFolds,
  projectRecords,
  updateSummaryWithFold,
} from "./fold.js";

// The one sibling-repo import in this file: eoreader7's real, tested
// dmdWindow — checked out at ../eoreader7 in this session, same relative-
// import convention every cast.js-pattern test in this repo already uses
// for eoreader6.1 (ground-ledger.test.mjs, build-log.test.mjs, …). Kept in
// its own try/import so a checkout without eoreader7 as a sibling degrades
// to a typed skip rather than failing the whole file to load.
let dmdWindow = null;
try {
  ({ dmdWindow } = await import("../kernel/activation.js"));
} catch {
  dmdWindow = null;
}

import {
  buildSourceBlock,
  checkCitations,
  chunkSource,
  identifyMaterial,
  openQuestions,
  readRange,
  retrieve,
  tokenize,
} from "../organs/source.js";

test("a fold line is bounded no matter how long the turn was", () => {
  const line = mechanicalFoldLine("x".repeat(5000), "y".repeat(5000));
  assert.ok(line.length <= FOLD_MAX_CHARS);
});

test("the fold STORE never truncates — only what a prompt projects out of it does (increment A)", () => {
  // Supersedes "the fold list stays bounded across many turns", which
  // asserted the OLD, incorrect behavior: the store itself sliced at
  // MAX_FOLDS_IN_PROMPT, so fold #13 landing destroyed fold #1 permanently.
  // P1: "a turn that falls out of [the window] is not forgotten."
  let s = emptySummary();
  for (let i = 0; i < 200; i++) s = advanceSummaryFold(s, `fold ${i}`);
  assert.equal(s.folds.length, 200, "the store keeps every fold, not just the last window");
  assert.equal(s.turnCount, 200);
  assert.equal(s.folds[0], "fold 0", "the first fold is still there — nothing was destroyed");
  assert.equal(s.folds.at(-1), "fold 199");
  // The PROJECTION is exactly as bounded as before this split — a refresh
  // prompt built from the whole store still only shows the recent window.
  assert.deepEqual(projectFolds(s), s.folds.slice(-MAX_FOLDS_IN_PROMPT));
  assert.equal(projectFolds(s).length, MAX_FOLDS_IN_PROMPT);
  const prompt = buildSummaryUpdatePrompt(s, s.folds);
  assert.ok(!prompt.includes("fold 0"), "the whole store was never resent");
  assert.ok(prompt.includes("fold 199"));
});

test("the context window does not grow with the conversation", () => {
  // 400 turns of steadily longer messages. What the model is sent on turn 400
  // must not be meaningfully larger than what it was sent on turn 20.
  let summary = emptySummary();
  const history = [];
  const sizeAt = [];
  for (let i = 1; i <= 400; i++) {
    const q = `question ${i} ` + "detail ".repeat(i);
    const a = `answer ${i} ` + "elaboration ".repeat(i);
    const msgs = buildTurnMessages({
      basePrompt: "You are a helpful assistant.",
      summary,
      history,
      question: q,
    });
    sizeAt.push(charCount(msgs));
    history.push({ role: "user", content: q }, { role: "assistant", content: a });
    summary = updateSummaryWithFold(
      summary,
      mechanicalFoldLine(q, a),
      JSON.stringify({
        topic: "a long conversation",
        flow: "it kept going",
        entities: ["nobody"],
        context: "turns keep arriving",
        language: "en",
        turnCount: i,
      }),
    );
  }
  const transcript = charCount(history);
  const last = sizeAt.at(-1);
  // Stated as a ratio rather than a size, because the claim is relational: the
  // transcript is what it is, and the prompt is a small fraction of it.
  assert.ok(transcript / last > 50, `prompt was ${last} of ${transcript}`);
  // And the growth that remains is the recency window alone — the last few raw
  // messages, which are themselves 20x longer at turn 400 than at turn 20.
  const promptGrowth = sizeAt.at(-1) / sizeAt[19];
  const transcriptGrowth = transcript / charCount(history.slice(0, 40));
  assert.ok(
    promptGrowth < transcriptGrowth / 10,
    `prompt grew ${promptGrowth}x while the transcript grew ${transcriptGrowth}x`,
  );
});

test("only the recency window is sent raw", () => {
  const history = [];
  for (let i = 0; i < 50; i++)
    history.push({ role: i % 2 ? "assistant" : "user", content: `msg ${i}` });
  const msgs = buildTurnMessages({
    basePrompt: "base",
    summary: emptySummary(),
    history,
    question: "now what",
  });
  const raw = msgs.filter((m) => m.role !== "system");
  assert.equal(raw.length, RECENCY_WINDOW + 1);
  assert.ok(!JSON.stringify(msgs).includes("msg 10"));
  assert.ok(JSON.stringify(msgs).includes("msg 49"));
});

test("exactly one system message, at index 0", () => {
  let s = updateSummaryWithFold(
    emptySummary(),
    "a fold",
    JSON.stringify({ topic: "t", flow: "f", entities: ["e"], context: "c", language: "en" }),
  );
  s = addWarrantRecord(
    s,
    buildWarrantRecord({ turn: 1, gist: "g", channels: ["source"], refs: ["a.txt#0-10"], unsupported: [], open: [] }),
  );
  const msgs = buildTurnMessages({
    basePrompt: "base",
    summary: s,
    history: [],
    question: "q",
    sourceBlock: "MATERIAL — ...",
  });
  const systems = msgs.filter((m) => m.role === "system");
  assert.equal(systems.length, 1);
  assert.equal(msgs[0].role, "system");
  // All four blocks survived the merge.
  assert.match(msgs[0].content, /PAST DISCOURSE/);
  assert.match(msgs[0].content, /ON RECORD/);
  assert.match(msgs[0].content, /MATERIAL/);
});

test("the paraphrase and the record do not read alike", () => {
  const s = addWarrantRecord(
    updateSummaryWithFold(emptySummary(), "f", JSON.stringify({ topic: "t" })),
    buildWarrantRecord({ turn: 1, gist: "g", channels: [], refs: ["a.txt#0-10"], unsupported: [], open: [] }),
  );
  const past = buildSummarySystemMessage(s);
  const record = buildRecordSystemMessage(s);
  assert.match(past, /cannot support a factual claim/);
  assert.match(record, /can be re-opened/);
  assert.ok(!record.includes("cannot support a factual claim"));
});

test("the summary refresh cannot rewrite the records", () => {
  let s = addWarrantRecord(
    emptySummary(),
    buildWarrantRecord({ turn: 1, gist: "the real one", channels: [], refs: ["a.txt#0-9"], unsupported: [], open: [] }),
  );
  s = updateSummaryWithFold(
    s,
    "f",
    JSON.stringify({
      topic: "t",
      records: [{ turn: 1, gist: "a forged one", channels: [], refs: [], unsupported: [], open: [] }],
    }),
  );
  assert.equal(s.records.length, 1);
  assert.equal(s.records[0].gist, "the real one");
});

test("the record STORE never truncates — only what a prompt projects out of it does (increment A)", () => {
  // Supersedes "records stay bounded", which asserted the OLD, incorrect
  // behavior — and the worse of the two bugs the spec names: this is the
  // addressed-evidence tier (System 2), the one P1 says does not decay.
  let s = emptySummary();
  for (let i = 0; i < 40; i++)
    s = addWarrantRecord(s, buildWarrantRecord({ turn: i, gist: `g${i}`, channels: [], refs: [], unsupported: [], open: [] }));
  assert.equal(s.records.length, 40, "the store keeps every record, not just the last window");
  assert.equal(s.records[0].turn, 0, "turn 0's record is still addressed and re-openable");
  assert.equal(s.records.at(-1).turn, 39);
  // The PROJECTION is exactly as bounded as before this split.
  assert.deepEqual(projectRecords(s), s.records.slice(-RECORDS_IN_PROMPT));
  assert.equal(projectRecords(s).length, RECORDS_IN_PROMPT);
  const record = buildRecordSystemMessage(s);
  assert.ok(!record.includes("g0"), "the whole store was never resent");
  assert.ok(record.includes("g39"));
});

test("buildRecordSystemMessage/buildSummaryUpdatePrompt accept an explicit window, overriding the declared default", () => {
  let s = emptySummary();
  for (let i = 0; i < 10; i++)
    s = addWarrantRecord(s, buildWarrantRecord({ turn: i, gist: `g${i}`, channels: [], refs: [], unsupported: [], open: [] }));
  const wide = buildRecordSystemMessage(s, { window: 10 });
  assert.ok(wide.includes("g0"), "an explicit wider window reaches further back");
  const narrow = buildRecordSystemMessage(s, { window: 1 });
  assert.ok(!narrow.includes("g8") && narrow.includes("g9"));

  let s2 = emptySummary();
  for (let i = 0; i < 5; i++) s2 = advanceSummaryFold(s2, `fold ${i}`);
  const p = buildSummaryUpdatePrompt(s2, s2.folds, { window: 2 });
  assert.ok(!p.includes("fold 2") && p.includes("fold 3") && p.includes("fold 4"));
});

test("buildTurnMessages forwards recordWindow to the record projection", () => {
  let s = emptySummary();
  for (let i = 0; i < 10; i++)
    s = addWarrantRecord(s, buildWarrantRecord({ turn: i, gist: `g${i}`, channels: [], refs: [], unsupported: [], open: [] }));
  const msgs = buildTurnMessages({ basePrompt: "base", summary: s, history: [], question: "q", recordWindow: 10 });
  assert.ok(JSON.stringify(msgs).includes("g0"), "an explicit recordWindow reaches past the declared default");
});

// ── deriveRecordWindow: measured, not declared, when an organ is injected ──

test("deriveRecordWindow: no organ injected returns the declared fallback, and says so", () => {
  const records = Array.from({ length: 20 }, (_, i) => ({ refs: [`t${i}.txt#0-10`] }));
  const r = deriveRecordWindow(records, {});
  assert.equal(r.window, RECORDS_IN_PROMPT);
  assert.match(r.basis, /declared/);
  assert.equal(r.gap, null);
});

test("deriveRecordWindow: too little material to try any candidate also declines to the declared fallback", () => {
  if (!dmdWindow) return; // no eoreader7 sibling checked out — see the header try/import
  const records = [{ refs: ["a.txt#0-10"] }];
  const r = deriveRecordWindow(records, { dmdWindow, candidates: [2, 4, 8] });
  assert.equal(r.window, RECORDS_IN_PROMPT);
  assert.match(r.basis, /fewer records/);
});

test("deriveRecordWindow: a live-identity set that has already stabilized measures the shallowest candidate", () => {
  if (!dmdWindow) return;
  // Every record cites the same address throughout — the whole-store
  // conclusion and every candidate-depth conclusion agree trivially, so
  // the shallowest one wins (dmdWindow's own "difference that makes a
  // difference": once forgetting more changes nothing, stop there).
  const records = Array.from({ length: 20 }, () => ({ refs: ["stable.txt#0-10"] }));
  const r = deriveRecordWindow(records, { dmdWindow, candidates: [2, 4, 8, 16] });
  assert.equal(r.window, 2);
  assert.match(r.basis, /difference-that-makes-a-difference/);
});

test("deriveRecordWindow: a genuinely singleton old address is an honest reach_exceeds_candidates gap, never a silent guess", () => {
  if (!dmdWindow) return;
  // Records 0-9 cite an address that is never cited again; forgetting it
  // really does change what "currently live" means, at every candidate
  // depth that stays inside the current-topic tail — the honest answer is
  // that this material's reach exceeds what was tried, not the widest
  // candidate. (Candidates are all < 10, the current-topic block's own
  // size, so none of them can accidentally reach back into the old block —
  // a candidate of 16 would, and correctly measure 16, which is a
  // different, equally honest finding this test does not exercise.)
  const records = [
    ...Array.from({ length: 10 }, () => ({ refs: ["old.txt#0-10"] })),
    ...Array.from({ length: 10 }, () => ({ refs: ["current.txt#0-10"] })),
  ];
  const r = deriveRecordWindow(records, { dmdWindow, candidates: [2, 4, 8] });
  assert.equal(r.window, RECORDS_IN_PROMPT, "falls back to the declared default on a gap");
  assert.equal(r.gap, "reach_exceeds_candidates");
});

// ── extractSummaryFindings: the consolidation witness ───────────────────────

test("extractSummaryFindings: a live-supported entity silently dropped is lost_live_entity", () => {
  const records = [{ gist: "Alice reported the Koniag contract's status." }];
  const check = extractSummaryFindings(["Alice"], [], { records });
  assert.equal(check.ok, false);
  assert.equal(check.findings.length, 1);
  assert.equal(check.findings[0].kind, "lost_live_entity");
  assert.equal(check.findings[0].id, "Alice");
});

test("extractSummaryFindings: an entity with no live record or fold behind it is unsupported_addition", () => {
  const check = extractSummaryFindings([], ["Fabricated Corp"], { records: [{ gist: "nothing about that here" }], folds: ["Q: hi A: hello"] });
  assert.equal(check.ok, false);
  assert.deepEqual(check.findings, [{
    kind: "unsupported_addition",
    id: "Fabricated Corp",
    detail: '"Fabricated Corp" is new in the refreshed summary, and no live record or fold names it',
  }]);
});

test("extractSummaryFindings: a name a fold (not a record) supports is not flagged", () => {
  const check = extractSummaryFindings([], ["Bob"], { records: [], folds: ["Q: who reported it? A: Bob did."] });
  assert.equal(check.ok, true);
});

test("extractSummaryFindings: carrying forward an already-unsupported name is not a NEW finding", () => {
  // Matches witnessRegressed's own subset rule: an issue already present
  // does not re-fire just for persisting across one more refresh.
  const check = extractSummaryFindings(["AlreadyBad"], ["AlreadyBad"], { records: [], folds: [] });
  assert.equal(check.ok, true);
});

test("extractSummaryFindings: dropping an entity nothing live supports is not lost_live_entity", () => {
  // The entity was never live in the first place (nothing cites it) — S1's
  // gist is allowed to let genuinely stale topics fade; only a name the
  // CURRENT live records/folds still back counts as a regression to lose.
  const check = extractSummaryFindings(["StaleTopic"], [], { records: [{ gist: "unrelated content" }] });
  assert.equal(check.ok, true);
});

test("extractSummaryFindings composes with witnessRegressed exactly as a code witness does", async () => {
  const { witnessRegressed } = await import("./witness.js");
  const clean = extractSummaryFindings(["Alice"], ["Alice"], { records: [{ gist: "Alice again" }] });
  assert.equal(witnessRegressed({ ok: true, findings: [] }, clean), false);
  const regressed = extractSummaryFindings(["Alice"], [], { records: [{ gist: "Alice again" }] });
  assert.equal(witnessRegressed({ ok: true, findings: [] }, regressed), true);
});

test("the summary call cannot revise the turn count", () => {
  // Observed live: the first fold of a conversation came back claiming turn 2.
  let s = updateSummaryWithFold(
    emptySummary(),
    "f1",
    JSON.stringify({ topic: "t", turnCount: 2 }),
  );
  assert.equal(s.turnCount, 1);
  s = updateSummaryWithFold(s, "f2", JSON.stringify({ topic: "t", turnCount: 99 }));
  assert.equal(s.turnCount, 2);
  assert.equal(s.turnCount, s.folds.length);
});

test("a malformed summary response leaves the summary intact", () => {
  const before = updateSummaryWithFold(
    emptySummary(),
    "f1",
    JSON.stringify({ topic: "kept", flow: "kept flow", entities: ["e"], context: "c", language: "en" }),
  );
  const after = updateSummaryWithFold(before, "f2", "I'm sorry, I can't do that.");
  assert.equal(after.topic, "kept");
  assert.equal(after.turnCount, before.turnCount + 1);
  assert.deepEqual(after.folds, ["f1", "f2"]);
});

// ── the address half ─────────────────────────────────────────────────────────

const DOC = `The Kessington Report was commissioned in 1974.

It put the figure at 12 percent, a number the committee disputed at length.

An unrelated paragraph about shipping lanes and tariffs.`;

test("a ref reads back the exact bytes it names", () => {
  const chunks = chunkSource("kess.txt", DOC);
  const hit = chunks.find((c) => c.text.includes("12 percent"));
  assert.ok(hit);
  assert.equal(readRange({ "kess.txt": DOC }, hit.ref).trim(), hit.text);
});

test("an accented corpus answers an unaccented question", () => {
  // The failure this pins: a Gutenberg text writes "Natásha" throughout, a
  // reader types "Natasha", and the app reports no mention of her while
  // holding the whole novel.
  const doc = "Natásha Rostóva glanced at Prince Andréw across the ballroom.";
  const chunks = chunkSource("wp.txt", doc);
  assert.equal(retrieve(chunks, "Who is Natasha Rostova?").length, 1);
  assert.equal(retrieve(chunks, "what did Andrew do").length, 1);
  // And in the other direction: an unaccented corpus, an accented question.
  const plain = chunkSource("q.txt", "Natasha danced with Andrew until the small hours.");
  assert.equal(retrieve(plain, "Natásha").length, 1);
});

test("a vocalized Hebrew corpus answers an unvocalized question — and the reverse", () => {
  // Measured live before this fix, against a real fetched Talmud folio:
  // tokenize("שלום") === []. A pointed (vocalized) corpus and an unpointed
  // question are the identical Bezúkhov/Bezukhov shape one script over.
  const talmud = "מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בָּעֲרָבִין מִשָּׁעָה שֶׁהַכֹּהֲנִים נִכְנָסִים לֶאֱכוֹל בִּתְרוּמָתָן";
  const chunks = chunkSource("berakhot.txt", talmud);
  assert.equal(retrieve(chunks, "מאימתי קורין שמע").length, 1);
  // And unpointed corpus, pointed question.
  const plain = chunkSource("q.txt", "מאימתי קורין את שמע בערבין");
  assert.equal(retrieve(plain, "מֵאֵימָתַי קוֹרִין").length, 1);
});

test("tokenize is not ASCII-only — every whitespace-delimited script survives", () => {
  // The bug this closes: tokenize's split class was `[a-z0-9%.-]`, so any
  // string outside that alphabet was ONE giant boundary run and tokenize
  // returned []. retrieve() calls tokenize() on both the question and every
  // chunk's own .terms (chunkSource -> chunkProse/makeChunk/chunkRows, all
  // three via tokenize alone), so the failure was blind on both sides, not
  // merely unranked.
  assert.deepEqual(tokenize("שלום עולם"), ["שלום", "עולם"]);
  assert.deepEqual(tokenize("Наташа Ростова"), ["наташа", "ростова"]);
  assert.deepEqual(tokenize("مرحبا بالعالم"), ["مرحبا", "بالعالم"]);
});

test("CJK is a disclosed, narrower fix — not real word segmentation", () => {
  // Checked live, not assumed: a boundary-based tokenizer cannot introduce a
  // split where the text itself has none — there is no character between
  // adjacent CJK ideographs for `\p{L}`-class splitting to find. A bare
  // two-character real word ("Beijing") is STILL [] here, because the same
  // length floor that drops a two-letter English word drops it too; only a
  // longer run survives, as one oversized merged token, never a real word.
  assert.deepEqual(tokenize("北京"), []);
  assert.deepEqual(tokenize("北京大学"), ["北京大学"]);
});

const CSV = `org_id,organization_name,reason,case_number
3982,Murfreesboro PD,stolen vehicle,24-0011
3499,Metro Nashville PD,missing person,24-0042
5334,Franklin PD,hit and run,24-0107
3982,Murfreesboro PD,MNPD assist burglary,24-0155
3499,Metro Nashville PD,homicide investigation,24-0198
5334,Franklin PD,stolen tag,24-0231
3982,Murfreesboro PD,welfare check,24-0244
3499,Metro Nashville PD,armed robbery,24-0287
5334,Franklin PD,MNPD narcotics,24-0301
`;

test("a spreadsheet is admitted by row, not as one lump", () => {
  // Paragraph chunking would make this whole file a single passage: nothing
  // retrievable, nothing citable.
  const chunks = chunkSource("mnpd.csv", CSV);
  assert.ok(chunks.length > 1, `got ${chunks.length} chunks`);
  assert.ok(chunks.every((c) => c.header.startsWith("org_id,")));
});

test("a row group's ref reads back exactly the rows, header excluded", () => {
  const chunks = chunkSource("mnpd.csv", CSV);
  for (const c of chunks) {
    assert.equal(readRange({ "mnpd.csv": CSV }, c.ref), c.text + "\n");
    assert.ok(!readRange({ "mnpd.csv": CSV }, c.ref).includes("org_id,"));
  }
});

test("a row is retrievable by what is in it, and by its column names", () => {
  const chunks = chunkSource("mnpd.csv", CSV);
  const hit = retrieve(chunks, "which searches mention narcotics?");
  assert.ok(hit.length && hit[0].text.includes("narcotics"));
  // Column names ride along as terms, so a question phrased in the schema's
  // own words finds rows too.
  assert.ok(retrieve(chunks, "list the case_number values").length > 0);
});

test("a header-only file yields nothing rather than a phantom row", () => {
  assert.deepEqual(chunkSource("empty.csv", "a,b,c\n"), []);
});

test("retrieval is mechanical and returns nothing when nothing matches", () => {
  const chunks = chunkSource("kess.txt", DOC);
  assert.equal(retrieve(chunks, "what figure did the report give").length > 0, true);
  assert.deepEqual(retrieve(chunks, "quantum chromodynamics telescope"), []);
});

test("a folded passage is deprioritized, not excluded", () => {
  const chunks = chunkSource("kess.txt", DOC);
  // A deliberate tie: "report" and "1974" land in the first chunk, "figure"
  // and "percent" in the second, two hits each. A penalty that does nothing
  // would leave the order alone, so a flip here is real evidence it fired.
  const q = "report 1974 figure percent";
  const before = retrieve(chunks, q, 3);
  const after = retrieve(chunks, q, 3, [before[0].ref]);
  assert.ok(after.length > 0, "the folded passage vanished entirely");
  assert.notEqual(after[0].ref, before[0].ref, "the ranking did not flip");
});

test("a citation to material never retrieved is unsupported", () => {
  const chunks = chunkSource("kess.txt", DOC);
  const offered = retrieve(chunks, "what figure did the report give");
  const answer = `It was 12 percent [${offered[0].ref}], and also 40 percent [kess.txt#9000-9100].`;
  const { used, unsupported } = checkCitations(answer, offered);
  assert.deepEqual(used, [offered[0].ref]);
  assert.deepEqual(unsupported, ["kess.txt#9000-9100"]);
});

test("an uncited turn leaves the question open", () => {
  const chunks = chunkSource("kess.txt", DOC);
  const offered = retrieve(chunks, "what figure did the report give");
  assert.equal(openQuestions("what figure did the report give", offered, []).length, 1);
  assert.equal(openQuestions("what figure did the report give", offered, [offered[0].ref]).length, 0);
  assert.equal(openQuestions("tell me about penguins", [], []).length, 1);
});

test("the material block carries passage text, never the address itself", () => {
  // Requirement, 2026-08-18 (citation-forgery closure): the model must
  // have zero exposure to this instrument's own addressing scheme, so it
  // has nothing to imitate. buildSourceBlock used to show the model the
  // literal `[ref]` for every passage and instruct it to reproduce one —
  // exactly the string material a self-citation forgery needs. Addresses
  // are attached AFTERWARD, mechanically, by attribute() (cite.js) reading
  // which passage's CONTENT the model's own sentence actually overlaps —
  // the model never needs to see or write the token for that to work.
  const chunks = chunkSource("kess.txt", DOC);
  const offered = retrieve(chunks, "the report figure percent");
  const block = buildSourceBlock(offered);
  for (const c of offered) {
    assert.ok(!block.includes(`[${c.ref}]`), "the model must never see its own address token");
    assert.ok(block.includes(c.text), "the passage's own words still reach the model");
  }
  assert.ok(!/\bcite\b/i.test(block), "the model is never instructed to cite anything");
});

test("container boilerplate is not material", () => {
  // READING-POLICY P5.3. Measured on War and Peace: 47 of 11,190 passages
  // were the Gutenberg licence, the donation appeal and the header —
  // retrievable, quotable, citable, and not the book.
  const doc =
    "The Project Gutenberg eBook of Something\n\nLicence prose about donations and trademark.\n\n" +
    "*** START OF THE PROJECT GUTENBERG EBOOK SOMETHING ***\n\n" +
    "The real first paragraph of the book, long enough to be admitted.\n\n" +
    "*** END OF THE PROJECT GUTENBERG EBOOK SOMETHING ***\n\n" +
    "More licence prose about donations, trademark and the Foundation.";
  const chunks = chunkSource("book.txt", doc);
  assert.equal(chunks.length, 1);
  assert.match(chunks[0].text, /^The real first paragraph/);
  // P5.2: the address still names bytes in the file as it sits on disk.
  assert.equal(readRange({ "book.txt": doc }, chunks[0].ref).trim(), chunks[0].text);
});

test("a document is cut at its own boundaries when it has them", () => {
  // Boundaries are received, never found here: this module does not know the
  // word "chapter" and must not learn it.
  const doc =
    "CHAPTER I\n\nThe first chapter's body, long enough to be admitted here.\n\n" +
    "CHAPTER II\n\nThe second chapter's body, also long enough to be admitted.\n";
  const boundaries = [
    { start: 0, end: doc.indexOf("CHAPTER II"), label: "CHAPTER I" },
    { start: doc.indexOf("CHAPTER II"), end: doc.length, label: "CHAPTER II" },
  ];
  const chunks = chunkSource("book.txt", doc, { boundaries });
  assert.equal(chunks.length, 2);
  assert.deepEqual(chunks.map((c) => c.label), ["CHAPTER I", "CHAPTER II"]);
  // The label is searchable, so "chapter ii" finds the chapter.
  assert.equal(retrieve(chunks, "chapter ii")[0].label, "CHAPTER II");
  // And every address still names the bytes it claims.
  for (const c of chunks)
    assert.equal(readRange({ "book.txt": doc }, c.ref).trim(), c.text);
});

test("a long segment splits inside itself and keeps its label", () => {
  const para = "A paragraph of the chapter, long enough to matter. ".repeat(30);
  const doc = `CHAPTER I\n\n${para}\n\n${para}\n\n${para}\n`;
  const chunks = chunkSource("book.txt", doc, {
    boundaries: [{ start: 0, end: doc.length, label: "CHAPTER I" }],
  });
  assert.ok(chunks.length > 1, "a chapter larger than the reach is split");
  assert.ok(chunks.every((c) => c.label === "CHAPTER I"), "the label travels");
  for (const c of chunks)
    assert.equal(readRange({ "book.txt": doc }, c.ref).trim(), c.text);
});

test("no boundaries means paragraphs, not an invented structure", () => {
  const doc = "First paragraph, long enough to be admitted.\n\nSecond paragraph, also long enough.";
  const chunks = chunkSource("plain.txt", doc, { boundaries: null });
  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((c) => !c.label));
});

// ── identifyMaterial: a best guess of WHAT a thing is, checked magic and
// structure first, extension last, never asserted for ordinary prose ──────

test("identifyMaterial: structure wins over guessing — feed, table, JSON, HTML each named by their own unambiguous marker", () => {
  const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>X</title><item><title>Y</title></item></channel></rss>`;
  assert.equal(identifyMaterial("feed.xml", rss).kind, "feed:rss");
  assert.equal(identifyMaterial("feed.xml", rss).certainty, "structure");

  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>X</title></feed>`;
  assert.equal(identifyMaterial("feed.atom", atom).kind, "feed:atom");

  assert.equal(identifyMaterial("data.csv", "a,b,c,d\n1,2,3,4\n5,6,7,8").kind, "table");
  // Structure, not the extension: an untitled paste that repeats a
  // delimiter (looksDelimited's own floor: at least 3 on the first two
  // lines) is still recognized as a table.
  assert.equal(identifyMaterial("pasted.txt", "name,age,city,country\nAda,36,London,UK\nGrace,85,NYC,US").kind, "table");

  assert.equal(identifyMaterial("data.json", '{"a": 1, "b": [1,2,3]}').kind, "json");
  assert.equal(identifyMaterial("page.html", "<!DOCTYPE html><html><body>hi</body></html>").kind, "html");
});

test("identifyMaterial: an extension is the last, weakest resort — only consulted when nothing structural was found", () => {
  const py = identifyMaterial("script.py", "def f():\n    return 1\n");
  assert.equal(py.kind, "code:py");
  assert.equal(py.certainty, "extension");
  assert.match(py.guess, /Python/);

  assert.equal(identifyMaterial("notes.md", "# Title\n\nSome notes.").kind, "markdown");

  // A .py-named file whose CONTENT is actually a feed is named by its real
  // structure, never by the misleading extension — magic/structure always
  // outranks the filename.
  const misnamed = identifyMaterial("script.py", `<rss version="2.0"><channel><title>X</title></channel></rss>`);
  assert.equal(misnamed.kind, "feed:rss");
});

test("identifyMaterial: ordinary prose says nothing — a guess is only offered when there is something worth guessing", () => {
  const prose = identifyMaterial("essay.txt", "This is an ordinary essay about harbor traffic in the spring.");
  assert.equal(prose.kind, "prose");
  assert.equal(prose.guess, null);
  assert.equal(prose.certainty, "default");
});

test("identity travels on every chunk a source produces, never spliced into the addressable text", () => {
  const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>EOlab</title>` +
    `<item><title>One</title><description>First post, long enough to be admitted as its own chunk of real prose.</description></item>` +
    `</channel></rss>`;
  const identity = identifyMaterial("feed.xml", rss);
  const chunks = chunkSource("web:eolab-0", rss, { identity });
  assert.ok(chunks.length > 0);
  for (const c of chunks) {
    assert.deepEqual(c.identity, identity);
    // The byte range still reads back EXACTLY what is on disk — identity
    // rides beside the passage, the same discipline chunkRows already
    // holds for a table's column header.
    assert.equal(readRange({ "web:eolab-0": rss }, c.ref), c.text);
  }
});

test("buildSourceBlock shows the identity guess ahead of a passage's text, and says nothing for ordinary prose", () => {
  const feedIdentity = { kind: "feed:rss", guess: "an RSS feed — a syndicated list of separate posts, not one document", certainty: "structure" };
  const withIdentity = [{ text: "Post content here.", identity: feedIdentity }];
  const block = buildSourceBlock(withIdentity);
  assert.match(block, /\(this looks like: an RSS feed/);
  assert.match(block, /Post content here\./);

  const plain = [{ text: "Ordinary prose, nothing structural about it.", identity: { kind: "prose", guess: null } }];
  assert.ok(!buildSourceBlock(plain).includes("this looks like"));
});

// ── an empty field is the model's abstain (2026-09-02) ──────────────────
// The refresh's schema requires every field, so a small model forced to
// fill a form filled it: the prompt now says an empty field carries, the
// prompt no longer tells the model to "reply with JSON" (the decoder holds
// the shape; the words only taught it to talk JSON), and the placeholder
// template that a 2B model copies back is gone.
test("an empty summary field carries the previous value; the prompt never says JSON and never shows a placeholder template", async () => {
  const { updateSummaryWithFold, emptySummary, buildSummaryUpdatePrompt, FOLD_SYSTEM_PROMPT } = await import("./fold.js");
  const prev = { ...emptySummary(), topic: "Borodino", flow: "one question so far", entities: ["Kutuzov"], context: "who commanded", language: "en", turnCount: 1, folds: ["Q: who commanded? A: Kutuzov"] };
  const next = updateSummaryWithFold(prev, "Q: and after? A: they retreated", JSON.stringify({ topic: "", flow: "", entities: [], context: "", language: "" }));
  assert.equal(next.topic, "Borodino"); assert.equal(next.flow, "one question so far"); assert.deepEqual(next.entities, ["Kutuzov"]); assert.equal(next.language, "en");
  assert.equal(next.turnCount, 2, "the count is mechanical");
  const prompt = String(buildSummaryUpdatePrompt?.(prev, prev.folds) ?? "") + FOLD_SYSTEM_PROMPT;
  assert.ok(!/JSON/.test(prompt) && !/<what this/.test(prompt), "no JSON instruction, no placeholder template");
});
