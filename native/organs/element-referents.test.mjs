import { test } from "node:test";
import assert from "node:assert/strict";
import { establishElementReferents, bridgeElementReferents } from "./element-referents.js";

// A real extractElements()-shaped round: two episode rows (h3 title + p
// detail), one button, one badge — matching podcast-cdp-lib.mjs's own
// EXTRACT_EXPR fields exactly (id is scan-order, deliberately UNSTABLE
// across the fixtures below, to prove referent identity never depends on
// it).
function round1() {
  return [
    { id: "h1-1", tag: "h1", selector: "h1", text: "My Podcast App", rect: { top: 0 }, color: [0, 0, 0], backgroundColor: [255, 255, 255], fontSizePx: 24, bold: true },
    { id: "button-1", tag: "button", selector: "button", text: "Subscribe", rect: { top: 20 }, color: [255, 255, 255], backgroundColor: [255, 0, 0], fontSizePx: 14, bold: false },
    { id: "div-1", tag: "div", selector: ".episode", text: "Episode 1: Hello World The first episode.", rect: { top: 45 }, color: [0, 0, 0], backgroundColor: [255, 255, 255], borderRadiusPx: 0, fontSizePx: 16, bold: false },
    { id: "h3-1", tag: "h3", selector: ".episode h3", text: "Episode 1: Hello World", rect: { top: 50 }, color: [0, 0, 0], backgroundColor: [255, 255, 255], fontSizePx: 16, bold: true },
    { id: "p-1", tag: "p", selector: ".episode p", text: "The first episode.", rect: { top: 60 }, color: [50, 50, 50], backgroundColor: [255, 255, 255], fontSizePx: 12, bold: false },
    { id: "div-2", tag: "div", selector: ".episode", text: "Episode 2: Goodbye The second episode.", rect: { top: 85 }, color: [0, 0, 0], backgroundColor: [255, 255, 255], borderRadiusPx: 0, fontSizePx: 16, bold: false },
    { id: "h3-2", tag: "h3", selector: ".episode h3", text: "Episode 2: Goodbye", rect: { top: 90 }, color: [0, 0, 0], backgroundColor: [255, 255, 255], fontSizePx: 16, bold: true },
    { id: "p-2", tag: "p", selector: ".episode p", text: "The second episode.", rect: { top: 100 }, color: [50, 50, 50], backgroundColor: [255, 255, 255], fontSizePx: 12, bold: false },
  ];
}

test("establishElementReferents: two episode titles sharing one selector get DISTINCT, text-keyed referents", () => {
  const refs = establishElementReferents(round1());
  const titles = refs.filter((r) => r.kind === "episode-title");
  assert.equal(titles.length, 2);
  assert.notEqual(titles[0].ref, titles[1].ref);
  assert.equal(titles[0].keyedBy, "text");
  assert.equal(titles[1].keyedBy, "text");
  assert.match(titles[0].ref, /episode-1-hello-world/);
});

test("establishElementReferents: a scan-order-only id never leaks into the referent id — same round, id shuffled, refs identical", () => {
  const shuffled = round1().map((el, i, arr) => ({ ...el, id: `x-${arr.length - i}` }));
  const a = establishElementReferents(round1()).map((r) => r.ref).sort();
  const b = establishElementReferents(shuffled).map((r) => r.ref).sort();
  assert.deepEqual(a, b);
});

test("establishElementReferents: elements with identical text in one selector group fall back to position-keying, disclosed as weak", () => {
  const dup = [
    { tag: "h3", selector: ".episode h3", text: "Untitled", rect: { top: 0 } },
    { tag: "h3", selector: ".episode h3", text: "Untitled", rect: { top: 10 } },
  ];
  const refs = establishElementReferents(dup);
  assert.equal(refs[0].keyedBy, "position");
  assert.equal(refs[1].keyedBy, "position");
  assert.notEqual(refs[0].ref, refs[1].ref);
});

test("bridgeElementReferents: an unchanged round reports everything persisted, nothing appeared or vanished", () => {
  const before = establishElementReferents(round1());
  const after = establishElementReferents(round1());
  const b = bridgeElementReferents(before, after);
  assert.equal(b.persisted.length, before.length);
  assert.equal(b.changed.length, 0);
  assert.equal(b.appeared.length, 0);
  assert.equal(b.vanished.length, 0);
});

test("establishElementReferents: .episode containers get their own episode-row referent, distinct from their h3/p children", () => {
  const refs = establishElementReferents(round1());
  const rows = refs.filter((r) => r.kind === "episode-row");
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].ref, rows[1].ref);
});

test("bridgeElementReferents: closes the real gap found in the live e2e run — a roundness/elevation fix on the .episode CONTAINER (borderRadius + background) is detected as CHANGED", () => {
  // This reproduces exactly what the live repair loop's elevation
  // strategy landed on 2026-09-30: extractElements previously never
  // queried `.episode` at all, so this mutation — the one the repair
  // strategies actually make — was structurally invisible to any bridge.
  const before = establishElementReferents(round1());
  const elevated = round1().map((el) => (el.selector === ".episode"
    ? { ...el, backgroundColor: [21, 21, 26], borderRadiusPx: 8 }
    : el));
  const after = establishElementReferents(elevated);
  const b = bridgeElementReferents(before, after);
  const rows = b.changed.filter((x) => x.before.kind === "episode-row");
  assert.equal(rows.length, 2, "both episode-row containers must be reported as changed");
  // Everything ELSE (the titles/details inside them) is untouched and
  // must still read as persisted — the change is scoped to the container.
  assert.ok(b.persisted.some((x) => x.before.kind === "episode-title"));
});

test("bridgeElementReferents: a color-only edit is CHANGED, not vanished+appeared — same referent, different face", () => {
  const before = establishElementReferents(round1());
  const after1 = round1().map((el) => (el.selector === "button" ? { ...el, backgroundColor: [29, 185, 84] } : el));
  const after = establishElementReferents(after1);
  const b = bridgeElementReferents(before, after);
  assert.equal(b.changed.length, 1);
  assert.equal(b.changed[0].before.kind, "button");
  assert.equal(b.changed[0].confidence, "strong"); // button has no other siblings -> position-keyed but unique group; still a real match
  assert.equal(b.persisted.length, before.length - 1);
});

test("bridgeElementReferents: a new episode row APPEARS, the existing rows PERSIST unchanged", () => {
  const before = establishElementReferents(round1());
  const withNewRow = [
    ...round1(),
    { tag: "h3", selector: ".episode h3", text: "Episode 3: A New One", rect: { top: 130 }, color: [0, 0, 0], backgroundColor: [255, 255, 255], fontSizePx: 16, bold: true },
    { tag: "p", selector: ".episode p", text: "A brand new episode.", rect: { top: 140 }, color: [50, 50, 50], backgroundColor: [255, 255, 255], fontSizePx: 12, bold: false },
  ];
  const after = establishElementReferents(withNewRow);
  const b = bridgeElementReferents(before, after);
  assert.equal(b.appeared.length, 2);
  assert.equal(b.vanished.length, 0);
  assert.equal(b.persisted.length, before.length);
});

test("bridgeElementReferents: a removed button VANISHES — never silently reported as 'persisted' or ignored", () => {
  const before = establishElementReferents(round1());
  const withoutButton = round1().filter((el) => el.selector !== "button");
  const after = establishElementReferents(withoutButton);
  const b = bridgeElementReferents(before, after);
  assert.equal(b.vanished.length, 1);
  assert.equal(b.vanished[0].kind, "button");
});

test("CONTROL: a position-keyed group whose ORDER reverses bridges falsely (disclosed weak-confidence cost, never hidden)", () => {
  const dupBefore = [
    { tag: "h3", selector: ".episode h3", text: "Untitled", rect: { top: 0 } },
    { tag: "h3", selector: ".episode h3", text: "Untitled", rect: { top: 10 } },
  ];
  const dupAfter = [
    { tag: "h3", selector: ".episode h3", text: "Untitled", rect: { top: 10 } }, // reordered
    { tag: "h3", selector: ".episode h3", text: "Untitled", rect: { top: 0 } },
  ];
  const before = establishElementReferents(dupBefore);
  const after = establishElementReferents(dupAfter);
  const b = bridgeElementReferents(before, after);
  // Both still bridge (ordinal 0 maps to ordinal 0's slot again after
  // sorting by top), so this is reported as "persisted" — genuinely
  // correct here since position resorts by rect.top — but every entry
  // is marked weak, which is the disclosed cost this control exists to
  // keep visible rather than silently assumed strong.
  for (const p of b.persisted) assert.equal(p.confidence, "weak");
});
