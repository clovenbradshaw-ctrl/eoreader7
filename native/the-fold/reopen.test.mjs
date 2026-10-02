// reopen.test.mjs — the `/reopen` door: restore what the person last had
// open, from the record's own rows. The BECOMING below was written BEFORE
// any code (LEVELS.md's convention): it names the referent the door is
// becoming, runs, and its failure does not fail the suite until the day
// the flag comes off. Grep `BECOMING` across the tests for the whole map.
import { test } from "node:test";
import assert from "node:assert/strict";

test("BECOMING reopen — INHABITED 2026-09-02: restores the last source, fold, or door result from the record's own rows, never from a transcript search", async () => {
  // Inhabited live, in the real page against the real explore-server:
  // `/reopen` re-rendered the last door result (an entity-seek row) with no
  // model call; `/reopen source` named an Explore-opened MP3 and refused to
  // re-admit it; then a pasted source opened in the Reading pane landed
  // `source-open` (via chat) on the record and `/reopen source` restored
  // it into the viewer. Two things had to move first: the door reads the
  // WHOLE record (a 500-row tail held no open at all — web-fetch is 60% of
  // rows), and explore-server's mirror route accepted only "term-" events,
  // so every chat-side open (and every `transcribe` row, ever) had been
  // refused 400 and dropped silently — a declared allowlist now.
  // THE REFERENT. The record (record/explore-record.jsonl, append-only,
  // FOLD-CONSTITUTION I.5) already lands `source-open` / `read-start` /
  // `read-reused` for Explore and `term-run`/`term-act` (via:"chat") for
  // the doors. `/reopen` walks those rows BACKWARDS from the cursor and
  // restores the last open — a source by the PATH the row itself carries,
  // a fold by its N, a door result by re-rendering the row's own recorded
  // fields. Walls it must pass to be licensed (each its own test once
  // built, this todo is the referent of all of them):
  //   ADDRESS (P5.2): the address is the row's own field, carried forward —
  //     no regex over transcript text, no search, no model guess.
  //   HEARD: identical on a heard-only ledger (S2 rows from a transcribed
  //     source) as on a read one — the door reads event kind + address, never
  //     the source's text.
  //   TRUST: no model is asked what to reopen. (If one is ever consulted, it
  //     selects by INDEX from a mechanically gathered list.)
  //   NO SELF CO-SIGN: a row that read nothing (no address) or is authored
  //     self:model is not an open — readsNothing applies.
  //   NULL BEFORE NUMBER: any hit rate carries its REDEAL_SEED null.
  //   RESTORE, NEVER RE-ADMIT: nothing reopened is mutated; a reopened
  //     source is opened, not re-added; a door result is re-rendered, not
  //     re-run.
  const { lastOpened } = await import("./reopen.js");
  const rows = [
    { at: "1", event: "source-open", path: "pg345.txt", bytes: 10, modality: "text" },
    { at: "2", event: "term-run", runtime: "js", code: "1+1", ok: true, via: "chat" },
    { at: "3", event: "source-open", path: "pg2600.txt", bytes: 20, modality: "text" },
  ];
  const pick = lastOpened(rows);
  assert.equal(pick.kind, "source");
  assert.equal(pick.address, rows[2].path, "the address is the row's own field, carried");
  assert.equal(lastOpened(rows.slice(0, 2)).kind, "door", "a door result is a reopenable thing");
});

// ── the walls, each a test that would fail without it ──
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const { lastOpened, restoreFor, renderDoor, OPEN_EVENTS } = await import("./reopen.js");
// The source scans read CODE, not prose: comments may name the walls they refuse.
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).map((l) => l.replace(/\s\/\/.*$/, "")).join("\n");
const SRC = codeOf(readFileSync(new URL("./reopen.js", import.meta.url), "utf8"));
const READ = [
  { at: "1", event: "source-open", path: "pg345.txt", bytes: 10, modality: "text" },
  { at: "2", event: "read-start", job: "j", path: "pg345.txt", modality: "text" },
  { at: "3", event: "term-run", runtime: "js", code: "open('pg2600.txt')", ok: true, via: "chat" }, // DECOY: the text names another file
  { at: "4", event: "source-open", path: "pg2600.txt", bytes: 20, modality: "text" },
  { at: "5", event: "term-run", runtime: "js", code: "reopen pg345.txt please", ok: true, via: "chat" }, // DECOY again
];
const HEARD = [ // the SAME history, heard: nothing was read — a transcribed attachment is the open
  { at: "1", event: "transcribe", source: "youtube", url: "u1", title: "t1", name: "pg345.txt", chars: 10, via: "chat", text: "DECOY pg2600.txt" },
  { at: "3", event: "term-run", runtime: "js", code: "open('pg2600.txt')", ok: true, via: "chat" },
  { at: "4", event: "transcribe", source: "file", name: "pg2600.txt", chars: 20, via: "chat", text: "DECOY pg345.txt" },
  { at: "5", event: "term-run", runtime: "js", code: "reopen pg345.txt please", ok: true, via: "chat" },
];

test("ADDRESS (P5.2): the pick is the row's own field, carried — the decoy text naming another file never wins", () => {
  const p = lastOpened(READ, { kinds: ["source"] });
  assert.equal(p.address, "pg2600.txt");
  assert.equal(p.address, READ[3].path, "identity with the row's field, not a re-derivation");
  assert.equal(lastOpened(READ).kind, "door", "with no kind filter, the last open is the door result at row 5");
  assert.equal(lastOpened(READ, { before: 3, kinds: ["source"] }).address, "pg345.txt", "the cursor walks backwards from a declared point");
  const src = SRC;
  for (const forbidden of ["RegExp", ".match(", ".search(", ".test(", "indexOf(", "includes(\"", "fetch(", "complete(", "ask("])
    assert.ok(!src.includes(forbidden), `reopen.js may not search or ask: found ${forbidden}`);
});

test("HEARD: a heard-only ledger opens identically to a read one — kind, address, and cursor behaviour", () => {
  const a = lastOpened(READ, { kinds: ["source"] }), b = lastOpened(HEARD, { kinds: ["source"] });
  assert.equal(b.kind, a.kind); assert.equal(b.address, a.address);
  assert.equal(lastOpened(HEARD, { before: 2, kinds: ["source"] }).address, lastOpened(READ, { before: 3, kinds: ["source"] }).address);
  assert.deepEqual(restoreFor(b), restoreFor(a), "the restore descriptor is the same whichever way the source arrived");
  const src = SRC;
  assert.ok(!src.includes(".text") && !src.includes("modality"), "the organ never reads a source's text or its modality");
});

test("TRUST: no model organ is accepted — lastOpened takes rows and a cursor, nothing that can be asked", () => {
  assert.equal(lastOpened.length, 1, "one positional parameter (rows) plus options");
  const src = SRC;
  for (const organ of ["ask", "selectAsk", "complete", "model", "ollama"]) assert.ok(!new RegExp(`\\b${organ}\\b`).test(src), `no ${organ} in reopen.js`);
});

test("NO SELF CO-SIGN: a row authored self:model, or carrying no address, is not an open", () => {
  const rows = [
    { at: "1", event: "source-open", path: "real.txt" },
    { at: "2", event: "source-open", path: "ghost.txt", by: "self:model" },
    { at: "3", event: "source-open", bytes: 5 },                 // reads nothing: no address
    { at: "4", event: "transcribe", source: "file", chars: 9 },  // heard, but unnamed — reads nothing too
  ];
  assert.equal(lastOpened(rows).address, "real.txt");
  assert.equal(lastOpened([rows[1], rows[2], rows[3]]).refused, "nothing_open");
});

test("RESTORE, NEVER RE-ADMIT: rows are untouched, the pick is frozen, and the module has no writing organ", () => {
  const before = JSON.stringify(READ);
  const p = lastOpened(READ);
  assert.equal(JSON.stringify(READ), before, "rows are not mutated");
  assert.ok(Object.isFrozen(p) && Object.isFrozen(p.row));
  assert.throws(() => { p.row.code = "x"; }, "a frozen pick cannot be edited in strict mode");
  const src = SRC;
  for (const w of ["hear(", "admit(", "attest(", "addSource", "append(", "writeFile"]) assert.ok(!src.includes(w), `no ${w} in reopen.js`);
  const door = restoreFor(lastOpened(READ));
  assert.equal(door.action, "render-door");
  assert.ok(renderDoor(door.fields).includes("not re-run"), "a door result is re-rendered from the row, and says what was not kept");
  assert.deepEqual(restoreFor(lastOpened([])), { action: "none", reason: "nothing_open" });
});

test("the open-event table names only events the record carries or the chat page mirrors — never an invented one", (t) => {
  const recordPath = new URL("./record/explore-record.jsonl", import.meta.url);
  if (!existsSync(recordPath)) return t.skip("no record on this checkout (record/ is gitignored) — the vocabulary check needs a real record");
  const real = new Set(readFileSync(recordPath, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l).event; } catch { return null; } }));
  // events app.js lands through mirrorTermRecord — read off the source, not listed here
  // read from the INDEX (blob-staged hunks live there ahead of the working tree), the file as fallback
  let appSrc; try { appSrc = execSync("git show :app.js", { cwd: new URL(".", import.meta.url).pathname, encoding: "utf8", maxBuffer: 1 << 26 }); } catch { appSrc = readFileSync(new URL("./app.js", import.meta.url), "utf8"); }
  for (const m of appSrc.matchAll(/mirrorTermRecord\("([a-z-]+)"/g)) real.add(m[1]);
  for (const ev of Object.keys(OPEN_EVENTS)) assert.ok(real.has(ev), `${ev} is a real event kind`);
});

// ── GFP Pass 34 — the pattern act at the reopen door (2026-09-11) ──
import { Field } from "./relative.js";
const { correspondFor, noteOf } = await import("./reopen.js");
const PASSAGES_FOR_REOPEN = [
  "Prince Andrew rode along the line of the troops, looking at the faces of the men he was to lead.",
  "The battery on the mound fired without pause, and the smoke lay over the field like a fog.",
  "Pierre, in his white hat, wandered between the guns, and the soldiers laughed at him kindly.",
  "Kutuzov sat on the bench with his head bowed, and said nothing when the adjutants reported.",
];

test("GFP Pass 34: a door address that still stands AGREES; a renamed+prefaced source is REPAIRED with a new address; a deleted one is APART, exactly — the deletion null", () => {
  const source = PASSAGES_FOR_REOPEN.join("\n\n");
  const at = (p) => `tolstoy.txt#${source.indexOf(p)}-${source.indexOf(p) + p.length}`;
  const field = new Field();
  for (const p of PASSAGES_FOR_REOPEN) field.admit(p, { source: "tolstoy.txt", at: at(p) });
  const pick = (p) => ({ kind: "door", at: at(p), row: { event: "entity-seek", output: p } });
  // intact — agree
  const agree = correspondFor(pick(PASSAGES_FOR_REOPEN[2]), field, { "tolstoy.txt": source });
  assert.equal(agree.kind, "agree", "the address still names its note");
  assert.equal(agree.was, at(PASSAGES_FOR_REOPEN[2]));
  // renamed and prefaced — repaired, a NEW address minted, never shown as if it had always been the address
  const renamed = { "tolstoy_v2.txt": "PREFACE ".repeat(60) + source };
  const repaired = correspondFor(pick(PASSAGES_FOR_REOPEN[2]), field, renamed);
  assert.equal(repaired.kind, "repaired", "the figure finds its bytes in the moved source");
  assert.ok(repaired.at !== at(PASSAGES_FOR_REOPEN[2]), "a new address is minted");
  assert.match(repaired.at, /tolstoy_v2\.txt#/, "it names the moved source");
  // deleted — apart, exactly the deleted set (the deletion null): the source
  // is gone, replaced by others that do not hold the note
  const apart = correspondFor(pick(PASSAGES_FOR_REOPEN[2]), field, { "other.txt": "An unrelated document that never held this passage." });
  assert.equal(apart.kind, "apart", "a true loss is apart, never papered over");
  assert.equal(apart.ground?.kind, "gone", "the ground is named gone");
  // the typed refusals: no note, no span, no field, no sources — never a guess
  assert.equal(correspondFor({ kind: "door", at: "x#0-1", row: {} }, field, { "t.txt": "y" }).verdict, "no_note");
  assert.equal(correspondFor({ kind: "door", at: "not-a-span", row: { output: "x" } }, field, { "t.txt": "y" }).verdict, "not_a_span");
  assert.equal(correspondFor(pick(PASSAGES_FOR_REOPEN[0]), null, { "t.txt": "y" }).verdict, "no_field");
  assert.equal(correspondFor(pick(PASSAGES_FOR_REOPEN[0]), field, {}).verdict, "no_sources");
});
