// organs/consolidation.test.mjs — the dream: the offline rhythm that turns
// a day's deposits into a standing field. Against the REAL organs (the
// kernel notes ledger via notes-text.js, the real task-log), no stubs
// except the witness ask — which is exactly the codebase's scripted-stand-in
// precedent (P72's live run: the model is the only part that is ever
// substituted in a test here).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeNotesText } from "./notes-text.js";
import * as nativeTaskLog from "../kernel/task-log.js";
import * as testimony from "./testimony.js";
import { projectField, dream } from "./consolidation.js";

const door = makeNotesText(nativeTaskLog);

const edge = (subject, verb, object, ref, text) => ({
  subject, verb, object,
  spans: [{ ref, at: `${ref}#0-${text.length}`, text }],
});

const hearAll = (log, edges, witness) => door.admit(log, edges, { witness }).log;

test("the field is the mortal projection of the immortal ledger", () => {
  let log = door.createNotes({ frame: { reader: "test", recipe: "consolidation-field" } });
  // DAY 1 — two single-witness notes from A.
  log = hearAll(log, [
    edge("Russian army", "withdrew", "Moscow", "borodino-a", "The Russian army withdrew from Moscow."),
    edge("Napoleon", "entered", "Moscow", "borodino-a", "Napoleon entered Moscow."),
  ], "borodino-a");
  // B corroborates the second note by a mechanical repeat (same triple).
  log = hearAll(log, [
    edge("Napoleon", "entered", "Moscow", "borodino-b", "Napoleon entered Moscow that evening."),
  ], "borodino-b");

  // MORNING, at the present: both notes are in the field — one stands (2
  // sources), the other is still within the reach of the present.
  const now = projectField(door, log, { floor: 2, window: 3 });
  assert.deepEqual(
    now.field.map((n) => n.id).sort(),
    ["napoleon|entered|moscow", "russian army|withdrew|moscow"].sort(),
  );
  assert.equal(now.echo.length, 0);

  // MORNING, later: the single-witness note has fallen out of the window —
  // it is now ECHO, still on the record, out of the field. The corroborated
  // note stands. Forgetting is a projection decision, never a deletion.
  const late = projectField(door, log, { floor: 2, window: 3, now: now.cursor + 100 });
  assert.deepEqual(late.field.map((n) => n.id), ["napoleon|entered|moscow"]);
  assert.deepEqual(late.echo.map((n) => n.id), ["russian army|withdrew|moscow"]);
  assert.ok(log.entries.length >= 2, "the record is untouched — nothing was deleted");
});

test("the dream: the elenchus crosses the paraphrase wall, compose re-enters, the field re-forms", async () => {
  let log = door.createNotes({ frame: { reader: "test", recipe: "consolidation-dream" } });
  // DAY 1 — source A hears two single-witness notes.
  log = hearAll(log, [
    edge("Russian army", "withdrew", "Moscow", "borodino-a", "The Russian army withdrew from Moscow the next day."),
    edge("Napoleon", "burned", "Moscow", "borodino-a", "Napoleon burned Moscow."),
  ], "borodino-a");
  // DAY 2 — source B states the FIRST claim in other words. Mechanically a
  // DIFFERENT note (no exact-triple match): this is the measured paraphrase
  // wall — identity alone was measured FLAT against it (P74/P86).
  const B = "The imperial Russian forces retreated from Moscow the following morning.";
  log = hearAll(log, [edge("Imperial forces", "retreated", "Moscow", "borodino-b", B)], "borodino-b");

  // NIGHT — the elenchus is a judge at the door: "does B state the first
  // note?" It attests the note; the note now stands on two independent
  // sources. (The witness machinery itself is corroboration.js's own,
  // tested there; here the rhythm is the thing under test.)
  const elenchus = async (ledger, d, sources) => {
    const note = d.foldNotes(ledger).find((n) => n.subject === "Russian army");
    if (!note) return { log: ledger, asks: 1, attested: [], contradicted: [], refusals: null, candidatePairs: 0, standings: null };
    const r = d.attest(ledger, note.id, {
      witness: "testimony:borodino-b",
      span: { ref: "borodino-b", at: `borodino-b#0-${B.length}`, text: B },
      because: B,
    });
    if (r.refused) return { log: ledger, asks: 1, attested: [], contradicted: [], refusals: null, candidatePairs: 0, standings: null };
    return { log: r.log, asks: 1, attested: [{ note, source: "borodino-b", because: B }], contradicted: [], refusals: null, candidatePairs: 0, standings: null };
  };
  // compose: the chemistry's licensed product, heard back into the ledger.
  const compose = async () => [
    { end1: "Kutuzov", label: "assumed command", end2: "after the retreat", spans: [{ ref: "borodino-a", at: "borodino-a#0-1", text: "Kutuzov assumed command." }], witness: "derived:chemistry" },
  ];

  const { log: night, report, field, echo } = await dream(door, log, {
    sources: [{ ref: "borodino-b", text: B }],
    elenchus, compose, maxAsks: 1, floor: 2, window: 0,
  });

  assert.equal(report.attested.length, 1, "the elenchus attested the note");
  assert.ok(field.map((n) => n.id).includes("russian army|withdrew|moscow"), "the corroborated note stands in the morning field");
  assert.ok(echo.map((n) => n.id).includes("napoleon|burned|moscow"), "the stale single-witness note fell to the echo");
  assert.ok(report.derived.includes("Kutuzov assumed command after the retreat"), "compose heard its product back");
  assert.ok(door.foldNotes(night).length >= 3, "the record is immortal — nothing was deleted");
});

test("the dream with the real elenchus (corroborateLedger) crosses the paraphrase wall", async () => {
  let log = door.createNotes({ frame: { reader: "test", recipe: "consolidation-real" } });
  // The object is a TWO-WORD name — namesIn requires a run of capitals, and
  // the arm (siblingSwap) can only build against a real name (cite.js's L2).
  const A_TEXT = "The Russian army obeyed Prince Kutuzov at Borodino.";
  const B_TEXT = "The imperial Russian army obeyed first General Barclay, and later Prince Kutuzov at the battle.";
  log = hearAll(log, [edge("Russian army", "obeyed", "Prince Kutuzov", "borodino-a", A_TEXT)], "borodino-a");

  // A scripted stand-in witness (the codebase's own pattern): it says yes
  // to the claim and no to its sibling-swapped twin, with verbatim deciders
  // drawn from the bytes it is handed — the two conditions that let a vote
  // land at all (foldTestimony + the per-end company wall + the armed rule).
  const ask = async (sentence, slice) => {
    if (String(sentence).includes("Prince Kutuzov") && !String(sentence).includes("General Barclay"))
      return { answer: "yes", because: B_TEXT };
    return { answer: "no", because: "The imperial Russian army obeyed first General Barclay" };
  };

  const { report, field } = await dream(door, log, {
    sources: [{ ref: "borodino-b", text: B_TEXT }],
    ask, testimony, maxAsks: 4, floor: 2, window: 0,
  });

  assert.ok(report.asks >= 1, "the walk spent asks");
  assert.equal(report.attested.length, 1, "the witness promoted the note across the paraphrase wall");
  assert.ok(field.map((n) => n.id).includes("russian army|obeyed|prince kutuzov"));
});