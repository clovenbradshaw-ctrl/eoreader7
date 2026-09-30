// music-medium.test.js — music as the second medium of the one build
// pipeline, with no change to the core (organs/talk-build.js). Fixed sources
// (eval/the-fold/fixtures/midi, licenses read from each typesetting's
// header). Controls, each built to fail if the pipeline is not one:
//   - "a lullaby in two phrases of four bars each": the core reads it as 2
//     phrases × 4 bars; the mouth is asked only for words (the piece's name,
//     its phrases); every bar is snipped, never asked;
//   - the bars on the page are EXACTLY the source's bars 1–8 (pitch, tick,
//     duration), and every note on the file maps to the ledger claim for its
//     bar, whose witness names the source and the tick span;
//   - the share-alike typesetting is refused by the one license table: with
//     only it offered, no note of it reaches the file and nothing is sealed;
//   - a note added around the renderer's map is caught, and not sealed;
//   - no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { makeTalkBuild } from "../organs/talk-build.js";
import { makeMusicMedium } from "../adapters/build/music-medium.js";
import { parseMidi, writeMidi } from "../adapters/midi/midi.js";
import { makeNotes } from "../kernel/notes.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");
const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));
const F = path.join(NATIVE, "eval", "the-fold", "fixtures", "midi");
const PRELUDE = { uri: "wtk1-prelude1.mid", url: "https://www.mutopiaproject.org/ftp/BachJS/BWV846/wtk1-prelude1/wtk1-prelude1.mid", bytes: fs.readFileSync(path.join(F, "wtk1-prelude1.mid")), license: "Public Domain", licenseFrom: "wtk1-prelude1.ly copyright header" };
const ARIA = { uri: "bwv-988-aria.mid", url: "https://www.mutopiaproject.org/ftp/BachJS/BWV988/bwv-988-aria/bwv-988-aria.mid", bytes: fs.readFileSync(path.join(F, "bwv-988-aria.mid")), license: "Creative Commons Attribution-ShareAlike 3.0", licenseFrom: "bwv-988-aria.ly copyright header" };
const REQUEST = { what: "make a lullaby in two phrases of four bars each", forWhom: "my daughter" };

function scripted() {
  const prompts = [];
  const ask = async (p) => { prompts.push(p); const a = p.split("\n").at(-1); if (a === "It is called") return "Night Harbor"; if (a === "1.") return "Falling\n2. Rising"; return ""; };
  return { ask, prompts };
}

test("a lullaby: phrases asked, bars snipped, the file is the source's own bars, every note accounted for, sealed", async () => {
  const medium = makeMusicMedium({ sources: [ARIA, PRELUDE] });
  const { ask, prompts } = scripted();
  const out = await makeTalkBuild({ ask, parse, sentences, medium, verify: medium.verify, mouth: "scripted" }).build(REQUEST);
  assert.deepEqual(out.spec.counted.map((c) => [c.kind, c.n, c.per]), [["phrase", 2, null], ["bar", 4, "phrase"]]);
  assert.equal(prompts.length, 2, "the mouth is asked for words only");
  assert.ok(!prompts.some((p) => p.toLowerCase().includes("bar")), "never for a bar");
  // the file's notes are the prelude's first eight bars, exactly
  const src = parseMidi(PRELUDE.bytes);
  const barTicks = src.ticksPerBeat * 4;
  const want = src.notes.filter((n) => n.tick < 8 * barTicks).map((n) => `${n.pitch}@${n.tick}+${n.dur}`).sort();
  const got = parseMidi(out.artifact).notes.map((n) => `${n.pitch}@${n.tick}+${n.dur}`).sort();
  assert.deepEqual(got, want);
  // every note is accounted for, by a claim whose witness names the source and span
  assert.equal(out.provenance.ok, true);
  assert.equal(out.provenance.covered, got.length);
  const fold = makeNotes().fold(out.notes);
  const byId = new Map(fold.map((n) => [n.id, n]));
  for (const m of out.map) {
    const note = byId.get(m.src[0]);
    assert.ok(note.witnesses[0].startsWith(`source:${PRELUDE.url}#ticks:`), note.witnesses[0]);
  }
  assert.ok(out.sealed && out.sealed.body.encoding === "base64");
  assert.equal(out.sealed.regime.medium, "music");
});

test("the share-alike typesetting is refused: nothing of it reaches the file, nothing is sealed", async () => {
  const medium = makeMusicMedium({ sources: [ARIA] });
  assert.deepEqual(medium.refused.map((r) => r.uri), ["bwv-988-aria.mid"]);
  const { ask } = scripted();
  const out = await makeTalkBuild({ ask, parse, sentences, medium, verify: medium.verify, mouth: "scripted", maxAsks: 8 }).build(REQUEST);
  assert.equal(parseMidi(out.artifact).notes.length, 0, "no note of a refused source");
  assert.equal(out.sealed, null);
});

test("a note added around the renderer's map is caught, and not sealed", async () => {
  const base = makeMusicMedium({ sources: [PRELUDE] });
  const leaky = { ...base, render: (belief, o) => { const r = base.render(belief, o); const notes = parseMidi(r.artifact).notes.map((n) => ({ tick: n.tick, dur: n.dur, pitch: n.pitch, velocity: n.velocity })); notes.push({ tick: 0, dur: 100, pitch: 61, velocity: 80 }); return { ...r, artifact: writeMidi(notes, { ticksPerBeat: parseMidi(r.artifact).ticksPerBeat }) }; } };
  const { ask } = scripted();
  const out = await makeTalkBuild({ ask, parse, sentences, medium: leaky, verify: base.verify, mouth: "scripted" }).build(REQUEST);
  assert.equal(out.provenance.ok, false);
  assert.ok(out.provenance.uncovered.some((l) => l.text === "61@0"), JSON.stringify(out.provenance.uncovered));
  assert.equal(out.sealed, null);
});

test("music-medium contains no regular expression", () => {
  const found = scanRegexes(fs.readFileSync(path.join(NATIVE, "adapters", "build", "music-medium.js"), "utf8"));
  assert.equal(found.length, 0, JSON.stringify(found).slice(0, 200));
});

test("a piece longer than its source: the source's 35 bars snipped, the rest CONTINUED from them — derived, premised on the snipped bars, every note accounted for, sealed", async () => {
  const medium = makeMusicMedium({ sources: [PRELUDE] });
  const names = ["Harbor", "Tide", "Lamp", "Stair", "Gull", "Rope", "Salt", "Keel", "Fog", "Dawn"];
  const ask = async (p) => { const a = p.split("\n").at(-1); if (a === "It is called") return "Night Harbor"; if (a === "1.") return names.map((n, i) => `${i + 1}. ${n}`).join("\n"); return ""; };
  const out = await makeTalkBuild({ ask, parse, sentences, medium, verify: medium.verify, mouth: "scripted" }).build({ what: "a lullaby in 10 phrases of 4 bars each" });
  const fold = makeNotes().fold(out.notes);
  const bars = fold.filter((n) => n.label === "notes");
  const continued = bars.filter((n) => n.witnesses.every((w) => w === "derived:continuation"));
  assert.equal(bars.length, 40, `bars on the record: ${bars.length}`);
  assert.equal(continued.length, 5, "bars 36-40 are continued, never asked and never snipped from nothing");
  // the snipped part is the source's own 35 bars, exactly
  const src = parseMidi(PRELUDE.bytes), barTicks = src.ticksPerBeat * 4;
  const got = parseMidi(out.artifact).notes;
  const early = got.filter((n) => n.tick < 35 * barTicks).map((n) => `${n.pitch}@${n.tick}`).sort();
  assert.deepEqual(early, src.notes.map((n) => `${n.pitch}@${n.tick}`).sort());
  // the continued bars sound, use only pitches the hearing held (no theory, no invention of an alphabet)
  const late = got.filter((n) => n.tick >= 35 * barTicks);
  assert.ok(late.length > 0, "the continuation is silent");
  const heardPitches = new Set(src.notes.map((n) => n.pitch));
  assert.ok(late.every((n) => heardPitches.has(n.pitch)));
  // every note is accounted for; a continued note rests on a derived claim whose premises are snipped bars on the record
  assert.equal(out.provenance.ok, true, JSON.stringify(out.provenance.uncovered.slice(0, 3)));
  assert.equal(out.helix.ok, true, JSON.stringify(out.helix.violations.slice(0, 3)));
  assert.ok(out.sealed);
  const byId = new Map(fold.map((n) => [n.id, n]));
  const lateSrc = new Set(out.map.filter((m) => byId.get(m.src[0])?.witnesses.includes("derived:continuation")).map((m) => m.src[0]));
  assert.equal(lateSrc.size, 5);
});
