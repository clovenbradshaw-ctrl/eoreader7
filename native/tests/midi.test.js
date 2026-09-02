// midi.test.js — floor 0 for MIDI: real files parse to their notes, the writer
// round-trips exactly, and a non-file is refused by name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseMidi, writeMidi, noteName, noteNumber } from "../adapters/midi/midi.js";

const FIX = new URL("../eval/the-fold/fixtures/midi/", import.meta.url).pathname;

test("a real Bach file parses to addressed note events", () => {
  const r = parseMidi(readFileSync(`${FIX}wtk1-prelude1.mid`));
  assert.equal(r.refused, null);
  assert.equal(r.format, 1);
  assert.equal(r.ticksPerBeat, 384);
  assert.ok(r.notes.length > 500, String(r.notes.length));
  assert.equal(noteName(r.notes[0].pitch), "c4", "the prelude opens on middle C");
  assert.match(r.notes[0].at, /^midi:t\d+#\d+$/, "every note has an address in the file's own coordinates");
  assert.ok(r.notes.every((n, i) => i === 0 || n.tick >= r.notes[i - 1].tick), "onset order");
});

test("the writer round-trips exactly: write → parse gives the same pitches, ticks and durations", () => {
  const r = parseMidi(readFileSync(`${FIX}bwv-988-aria.mid`));
  const back = parseMidi(writeMidi(r.notes, { ticksPerBeat: r.ticksPerBeat, tempo: r.tempo }));
  assert.equal(back.notes.length, r.notes.length);
  for (let i = 0; i < r.notes.length; i += 1) {
    assert.equal(back.notes[i].pitch, r.notes[i].pitch);
    assert.equal(back.notes[i].tick, r.notes[i].tick);
    assert.equal(back.notes[i].dur, r.notes[i].dur);
  }
  assert.equal(back.tempo, r.tempo);
});

test("naming is a projection and inverts; a non-file is refused by name, never half-parsed", () => {
  assert.equal(noteName(60), "c4");
  assert.equal(noteName(61), "c#4");
  assert.equal(noteNumber("a4"), 69);
  assert.equal(noteNumber("nonsense"), null);
  assert.equal(parseMidi(new TextEncoder().encode("<!DOCTYPE html>")).refused.type, "not_smf");
});
