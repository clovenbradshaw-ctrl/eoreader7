// eot-draft-falsify.test.mjs — the EOT draft stage of the generation pipeline:
//   the whole piece as witnessed spans, before prose; the material sets what
//   is possible, the ask sets what is probable; no byte is ever lost.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildDraft, draftLines, floorProjection, drawnParts } from "./eot-draft.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const GROUND = readFileSync(join(HERE, "fixtures", "cumberland-ground.md"), "utf8");
const ESSAY = "Write an essay on the role of the Cumberland River in Nashville's growth.";

test("PROVENANCE: every point's span reproduces its bytes exactly", () => {
  const d = buildDraft({ task: ESSAY, ground: GROUND, sourceId: "cumberland.md" });
  for (const p of d.root.children) for (const pt of p.children) {
    assert.equal(GROUND.slice(pt.span.start, pt.span.end), pt.text, `${pt.id} drifted from its bytes`);
  }
});

test("NO BYTE LOST: a part's points cover every non-space character of the part", () => {
  const d = buildDraft({ task: ESSAY, ground: GROUND });
  for (const p of d.root.children) {
    const squash = (x) => x.replace(/\s+/g, "");
    assert.equal(squash(p.children.map((x) => x.text).join("")), squash(p.text), `${p.id} lost bytes between its sentences`);
  }
});

test("MEASURED FAILURES STAY FIXED: abbreviations, initials and decimals are not sentence ends", () => {
  const all = buildDraft({ task: ESSAY, ground: GROUND }).root.children.flatMap((p) => p.children.map((x) => x.text));
  assert.ok(all.some((x) => x.includes("Dr. Thomas Walker")), "\"Dr.\" split a name");
  assert.ok(all.some((x) => x.startsWith("The U.S. Army Corps")), "\"U.S.\" split or lost");
  assert.ok(all.some((x) => x.includes("crested at 51.86 feet")), "a decimal ended a sentence and the flood sentence was lost");
});

test("THE ASK SELECTS AMONG WHAT THE MATERIAL OFFERS", () => {
  const d = buildDraft({ task: "Write a short piece about the floods and the dams.", ground: GROUND });
  const ids = drawnParts(d).map((p) => p.id);
  assert.deepEqual(ids, ["p5", "p6"], `drew ${ids.join(",")}`);
  assert.match(d.basis, /chosen by: flood, dam/);
});

test("an ask whose words every part carries chooses nothing, and all parts are drawn", () => {
  const d = buildDraft({ task: "Write about the river.", ground: "The river is long. It runs west.\n\nThe river floods. People leave.\n\nThe river is dammed now. It is calm." });
  assert.equal(drawnParts(d).length, 3);
});

test("the material's seams set the parts; an unseamed ground is one part of sentences", () => {
  const d = buildDraft({ task: "x", ground: "One claim here is made. A second claim here follows. A third claim here ends it." });
  assert.equal(d.root.children.length, 1);
  assert.equal(d.root.children[0].children.length, 3);
});

test("the floor is the material's own sentences, in the piece's order, and needs no model", () => {
  const d = buildDraft({ task: "Write a short piece about the floods and the dams.", ground: GROUND });
  const floor = floorProjection(d).join(" ");
  assert.ok(floor.startsWith("The river also brought danger."));
  assert.ok(!floor.includes("Steamboats"), "a part the ask did not draw reached the floor");
});

test("every transition without a shared name is declared, not discovered", () => {
  const d = buildDraft({ task: ESSAY, ground: GROUND });
  const lines = draftLines(d).join("\n");
  const unbridged = drawnParts(d).filter((p) => p.bridge && !p.bridge.name).length;
  assert.equal((lines.match(/a transition must be written/g) ?? []).length, unbridged);
});
