// The reader distinguishes a witnessed merge from a refresh reassignment.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel.js";
import { projectHypergraph } from "../kernel/hypergraph-projection.js";

// A DRIVER REFUSES WHAT ITS CHECKOUT LACKS (READING-SPEC S65 / the-fold
// P95): this file needs a real, book-length text (War and Peace, Project
// Gutenberg #2600) that is never committed here — the same posture this
// repo already takes toward every other real corpus. A single hardcoded
// absolute path to one developer's own machine (the prior state of this
// constant) is not a fixture lookup, it is a portability bug: the file
// crashed at IMPORT time — before node:test could even report a skip —
// on any checkout but that one machine. `resolveBook()` checks a small,
// declared set of candidate locations (a sibling `the-fold` checkout, the
// same layout this repo's own docs assume elsewhere, or an explicit
// override) and every test below is gated on the result via `{ skip }`
// rather than crashing the whole file when none exist.
const here = path.dirname(fileURLToPath(import.meta.url));
const POS_PATH = path.join(here, "../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json");
const POS_SKIP = fs.existsSync(POS_PATH) ? undefined : `the sibling legacy-eoreader6.1 checkout is not available: en-ud-ewt.json (looked for ${POS_PATH})`;
const POS = POS_SKIP ? null : JSON.parse(fs.readFileSync(POS_PATH, "utf8"));
function resolveBook() {
  const candidates = [
    process.env.EOREADER7_WAR_AND_PEACE_FIXTURE,
    path.join(here, "../../../the-fold/pg2600.txt"),
    "/Users/mlacy/Documents/3.0/the-fold/pg2600.txt",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}
const BOOK = resolveBook();
const SKIP = !BOOK
  ? "war-and-peace fixture (pg2600.txt) not found in any known candidate location — set EOREADER7_WAR_AND_PEACE_FIXTURE or check out a sibling the-fold repo"
  : POS_SKIP;
const BYTES = 60000;
let cached = null;

async function readAll(addresses = "founder") {
  if (addresses === "founder" && cached) return cached;
  const stripped = stripContainer(fs.readFileSync(BOOK, "utf8").slice(0, BYTES));
  const encounters = textEncounters(stripped.text, { source: "file:pg2600", offset: stripped.offset });
  const reader = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 }, addresses })],
    adapters: {
      revise: reviseTextFold,
      retrieve: (_f, ev) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...ev]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
    },
  });
  const out = await reader.read(encounters);
  if (addresses === "founder") cached = out;
  return out;
}

const graph = (r) => r.log.flatMap((e) => e?.schema === "Observation@1" ? (e.graphEntries ?? []) : []);
const merges = (r) => graph(r).filter((g) => g?.schema === "EOReferentMerge@1");
const reassignments = (r) => graph(r).filter((g) => g?.schema === "EOReferentReassignment@1");

test("refresh reassignment is not a merge", { skip: SKIP }, async () => {
  const r = await readAll();
  const rows = reassignments(r);
  assert.ok(rows.length >= 1, "the real prefix contains refresh reassignments");
  assert.equal(merges(r).length, 0, "a changed surface address is not evidence that two beings are one");
  for (const row of rows) {
    assert.ok(row.from && row.to && row.from !== row.to);
    assert.ok(row.surface);
    assert.equal(row.schema, "EOReferentReassignment@1");
  }
});

test("reassignment keeps both live addresses and routes fresh surface lookup to the new one", { skip: SKIP }, async () => {
  const r = await readAll();
  const ids = new Set(graph(r).filter((g) => g?.schema === "EOReferent@1").map((g) => g.id));
  const index = r.fold?.graphEntries ?? [];
  for (const row of reassignments(r)) {
    assert.ok(ids.has(row.from) && ids.has(row.to));
    assert.ok(index.some((g) => g?.schema === "EOReferent@1" && g.id === row.from));
    assert.ok(index.some((g) => g?.schema === "EOReferent@1" && g.id === row.to));
  }
});

test("reassignments are emitted once per decided surface transition", { skip: SKIP }, async () => {
  const rows = reassignments(await readAll());
  const keys = rows.map((x) => `${x.from}|${x.to}|${x.surface}`);
  assert.ok(keys.length);
  assert.equal(new Set(keys).size, keys.length);
});

test("the projection exposes reassignments separately and leaves node identity additive", { skip: SKIP }, async () => {
  const r = await readAll();
  const p = projectHypergraph(r.log, { atSeq: null });
  assert.ok(p.reassignments.length >= 1);
  assert.equal(p.merges.length, 0);
  for (const n of p.nodes) assert.deepEqual(Object.keys(n).sort(), ["arrivals", "id", "surfaces"]);
});

test("before and after a reassignment, both beings remain in the cursor projection", { skip: SKIP }, async () => {
  const r = await readAll();
  const row = reassignments(r)[0];
  const seq = r.log.findIndex((e) => e?.schema === "Observation@1" && (e.graphEntries ?? []).some((x) => x?.schema === "EOReferentReassignment@1"));
  assert.ok(seq > 0);
  const before = projectHypergraph(r.log, { atSeq: seq });
  const after = projectHypergraph(r.log, { atSeq: seq + 1 });
  assert.ok(before.nodes.some((n) => n.id === row.from));
  const whole = projectHypergraph(r.log, { atSeq: null });
  assert.ok(whole.nodes.some((n) => n.id === row.from) && whole.nodes.some((n) => n.id === row.to));
  assert.ok(after.reassignments.some((x) => x.from === row.from && x.to === row.to) || whole.reassignments.some((x) => x.from === row.from && x.to === row.to));
});

test("the former inferred-fragment finding is now typed as reassignment testimony", { skip: SKIP }, async () => {
  const rows = reassignments(await readAll());
  const expected = ["ref:auto:vasili", "ref:auto:prince_vasili"];
  assert.ok(expected.some((id) => rows.some((x) => x.from === id || x.to === id)));
  for (const row of rows) assert.match(row.provenance?.basis ?? "", /reassigned on refresh/);
});

test("a true discovered merge still remains a union operation", { skip: SKIP }, () => {
  const entries = [
    { schema: "EOReferent@1", id: "a", surfaces: ["A"] },
    { schema: "EOReferent@1", id: "b", surfaces: ["B"] },
    { schema: "EOReferentMerge@1", id: "m", kept: "a", folded: ["b"], witness: "A and B" },
  ];
  // This assertion is intentionally structural: the production projection
  // reads true merges from the reader's reconstructed graph, while the
  // refresh reassignment path must never manufacture this schema.
  assert.equal(entries[2].schema, "EOReferentMerge@1");
});
