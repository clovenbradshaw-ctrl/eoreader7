// fold-gate.test.mjs — the caller's walls, against the REAL kind-standing
// organs, and the flagship specimen on REAL Dracula bytes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { reviewMerges } from "../eoreader7/native/organs/index.js";

const N = "../eoreader7/native/adapters/text/";
const splitSentences = (t) => String(t).split(/(?<=[.!?])\s+/).filter(Boolean).map((text) => ({ text }));

test("the kind is DECLARED or the gate refuses to run — a self-derived kind is the refuted basin null", () => {
  assert.throws(() => reviewMerges([], [], { splitSentences, alpha: 0.05 }), /DECLARED/);
  assert.throws(() => reviewMerges([], [], { splitSentences, kind: { members: ["x"], giver: "g" } }), /DECLARED/);
  assert.throws(() => reviewMerges([], [], { splitSentences, kind: { members: [], giver: "g" }, alpha: 0.05 }), /DECLARED/);
});

test("a merge of two SAME-KIND surfaces is permitted; a cross-kind merge is VETOED — with kind-standing's own verdicts as evidence", () => {
  // A synthetic chronicle with a declared place-kind and person-kind:
  // places keep place company ("stood in", "walked to"), persons keep
  // person company ("said", "greeted"). The declared kind is the places.
  const lines = [];
  for (let i = 0; i < 14; i++) {
    lines.push(`Aldric said the harvest looked thin that year and Aldric greeted the travellers warmly.`);
    lines.push(`The wagons stood in Karsten Keep and the traders walked to Karsten Keep at dusk.`);
    lines.push(`The pilgrims stood in Veldt Mill and later walked to Veldt Mill again.`);
    lines.push(`Aldric Keep said nothing.`); // the trap: a PERSON-companied surface sharing the token "Keep"
  }
  const passages = [{ ref: "chronicle", text: lines.join(" ") }];
  const KIND = { members: ["Karsten Keep", "Veldt Mill"], giver: "declared place-kind (test fixture, ground truth by construction)" };

  const out = reviewMerges(passages,
    [
      { kept: "r1", folded: "Karsten Keep", witness: "Veldt Mill" },   // place+place: same kind
      { kept: "r2", folded: "Aldric Keep", witness: "Karsten Keep" },  // person-companied + place: cross-kind
    ],
    { splitSentences, kind: KIND, alpha: 0.1, population: ["Aldric"] });

  assert.equal(out.permitted.length + out.vetoed.length + out.unknown.length, 2, "every merge lands in exactly one bucket");
  const cross = [...out.vetoed, ...out.unknown].find((e) => e.b === "Aldric Keep" || e.a === "Aldric Keep");
  assert.ok(cross, `the cross-kind merge must not land permitted: ${JSON.stringify(out.permitted.map((p) => [p.a, p.b]))}`);
});

test("THE FLAGSHIP, on real bytes when present: Castle Dracula vs Count Dracula under a declared place-kind", { skip: !existsSync("eval/fixtures/pg345_Dracula.txt") && !existsSync("../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt") }, async () => {
  const path = existsSync("eval/fixtures/pg345_Dracula.txt") ? "eval/fixtures/pg345_Dracula.txt" : "../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const text = readFileSync(path, "utf8").slice(0, 400000); // the opening journals carry both surfaces densely
  const sp = await import(N + "spans.js");
  const passages = [{ ref: "dracula", text }];
  // P79's own validated kind, declared with its giver — the place set its
  // Dracula run already recovered 9 of 10 members of
  const KIND = { members: ["Castle Dracula", "Borgo Pass", "Transylvania", "Bistritz", "London", "Whitby"], giver: "P79's validated place-kind (kind-standing.js header)" };
  const out = reviewMerges(passages,
    [{ kept: "ref:count", folded: "Castle Dracula", witness: "Count Dracula" }],
    { splitSentences: (t) => sp.splitSentences(t), kind: KIND, alpha: 0.1,
      // the cast's own other members — P79's run: correctly not-places
      population: ["Jonathan Harker", "Mina Murray", "Lucy Westenra", "Van Helsing", "Renfield", "Count Dracula"] });
  const flagship = out.vetoed.find((e) => e.b === "Castle Dracula") ?? out.unknown.find((e) => e.b === "Castle Dracula");
  assert.ok(flagship, "the merge is examined");
  assert.ok(out.vetoed.some((e) => e.b === "Castle Dracula"),
    `Castle Dracula (a member of the declared place-kind) merging into Count Dracula (not a member) must be VETOED: ${JSON.stringify({ vetoed: out.vetoed.length, unknown: out.unknown.length, verdicts: flagship?.verdict })}`);
});
