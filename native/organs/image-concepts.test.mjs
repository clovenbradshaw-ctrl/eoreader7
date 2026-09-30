import { test } from "node:test";
import assert from "node:assert/strict";
import { regionAddress, parseRegionAddress, imageConceptSighting, domConceptSighting } from "./image-concepts.js";
import { makeNotes } from "../kernel/notes.js";

test("regionAddress: a real, well-formed region addresses correctly", () => {
  assert.equal(regionAddress({ imagePath: "img.png", x0: 0.1, y0: 0.2, x1: 0.5, y1: 0.6 }), "img.png#0.1,0.2-0.5,0.6");
});

test("regionAddress: refuses a degenerate region (x1<=x0) — never silently accepted", () => {
  assert.throws(() => regionAddress({ imagePath: "img.png", x0: 0.5, y0: 0.2, x1: 0.3, y1: 0.6 }), /degenerate/);
});

test("regionAddress: refuses an out-of-bounds coordinate", () => {
  assert.throws(() => regionAddress({ imagePath: "img.png", x0: 0.1, y0: 0.2, x1: 1.5, y1: 0.6 }), /RangeError/);
});

test("parseRegionAddress: round-trips regionAddress exactly", () => {
  const at = regionAddress({ imagePath: "reference-images/x.png", x0: 0, y0: 0, x1: 1, y1: 0.5 });
  const parsed = parseRegionAddress(at);
  assert.equal(parsed.imagePath, "reference-images/x.png");
  assert.equal(parsed.x0, 0);
  assert.equal(parsed.y1, 0.5);
});

test("imageConceptSighting: refuses an unattributed visual claim — no giver, no note", () => {
  assert.throws(() => imageConceptSighting({ imagePath: "x.png", concept: "artwork", region: { x0: 0, y0: 0, x1: 1, y1: 1 }, giver: null }), /giver/);
});

test("imageConceptSighting: builds a real hear()-ready arrangement, and the SAME kernel/notes.js ledger actually admits it", () => {
  const notes = makeNotes();
  let log = notes.createNotes({ frame: { reader: "test", medium: "screenshot" } });
  const sighting = imageConceptSighting({ imagePath: "pocket-casts.png", concept: "artwork", region: { x0: 0.02, y0: 0.15, x1: 0.3, y1: 0.35 }, giver: "this session" });
  log = notes.hear(log, sighting);
  const noteList = notes.fold(log);
  const landed = noteList.find((t) => t.end1 === "pocket-casts.png" && t.end2 === "artwork");
  assert.ok(landed, "the sighting must land as a real note on the real ledger");
  assert.ok(landed.witnesses.length > 0);
  assert.ok(landed.spans.length > 0);
  assert.match(landed.spans[0].at, /^pocket-casts\.png#0\.02,0\.15-0\.3,0\.35$/);
});

test("domConceptSighting: carries `present` for the caller to filter on — an absence is never landed as a sighting", () => {
  const s = domConceptSighting({ appUrl: "http://x/", concept: "artwork", selector: ".episode img", giver: "CDP", present: false });
  assert.equal(s.present, false);
});
