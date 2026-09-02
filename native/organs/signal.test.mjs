// signal.test.mjs — the walls of the try-things organ, and the control that
// matters most: a wide search over noise must find NOTHING. Every test runs
// the REAL discovery organ (kind-standing.js), no stubs: a fake discoverer
// would carry none of the walls being tested.
import test from "node:test";
import assert from "node:assert/strict";
import { findSignal, phrase, scramble, REQUIRED } from "../eoreader7/native/organs/index.js";
import { discoverCompanyKinds } from "../eoreader7/native/organs/index.js";

const NUMBERS = { draws: 60, seed: 3, alpha: 0.05, minMentions: 6, minShare: 0.4, minMembers: 2 };
const KEEP = (t) => t; // identity cleaner: these streams are not text
const base = { discoverKinds: discoverCompanyKinds, clean: KEEP, ...NUMBERS };

// a planted grammar: `zub` always precedes rolea/roleb; names open phrases
const planted = (n, seed) => {
  let s = seed; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out = [];
  for (let i = 0; i < n; i++) {
    const role = ["rolea", "roleb"][Math.floor(r() * 2)];
    const name = ["namex", "namey", "namez"][Math.floor(r() * 3)];
    out.push({ text: `${name} walked zub ${role} then rested` });
  }
  return out;
};
// pure noise: the SAME alphabet, no company structure whatsoever
const noise = (n, seed) => {
  let s = seed; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const V = ["rolea", "roleb", "namex", "namey", "namez", "zub", "walked", "then", "rested"];
  return Array.from({ length: n }, () => ({ text: Array.from({ length: 6 }, () => V[Math.floor(r() * V.length)]).join(" ") }));
};
const VOCAB = ["rolea", "roleb", "namex", "namey", "namez"];

test("every number is declared — none defaulted (P4)", async () => {
  for (const k of REQUIRED) {
    const opts = { ...base, instruments: [{ recipe: "i", discretize: () => planted(20, 1) }], vocabulary: VOCAB };
    delete opts[k];
    const r = await findSignal([{ ref: "a", material: null }], opts);
    assert.equal(r.refused, "undeclared", `${k} must be required`);
    assert.equal(r.what, k);
  }
});

test("no instruments, no sources, and no events are TYPED refusals, never empty results", async () => {
  const opts = { ...base, vocabulary: VOCAB };
  assert.equal((await findSignal([{ ref: "a", material: 1 }], { ...opts, instruments: [] })).refused, "no_instruments");
  assert.equal((await findSignal([], { ...opts, instruments: [{ recipe: "i", discretize: () => [] }] })).refused, "no_sources");
  const empty = await findSignal([{ ref: "a", material: 1 }], { ...opts, instruments: [{ recipe: "i", discretize: () => [] }] });
  assert.equal(empty.refused, "no_events");
  assert.equal(empty.gaps[0].type, "no_events", "and the gap names which pair produced nothing");
});

test("THE CONTROL THAT MATTERS: a WIDE search over pure noise finds nothing", async () => {
  // twelve instruments, each a different slicing of the same noise — exactly
  // the shape that manufactures findings when the null is not search-aware.
  const instruments = Array.from({ length: 12 }, (_, i) => ({
    recipe: `noise-cut-${i}`,
    discretize: (m) => noise(40, m + i * 17),
  }));
  const r = await findSignal([{ ref: "run-a", material: 11 }, { ref: "run-b", material: 99 }],
    { ...base, instruments, vocabulary: VOCAB });
  assert.ok(!r.refused, `should complete, got ${r.refused ?? ""}`);
  assert.equal(r.findings.length, 0, `a wide search over noise must find nothing, got: ${JSON.stringify(r.findings)}`);
  assert.match(phrase(r), /measured absence, not a failure to look/);
});

test("real planted structure IS found, and is reported with both counts apart", async () => {
  const instruments = [
    { recipe: "cut-a", discretize: (m) => planted(40, m) },
    { recipe: "cut-b", discretize: (m) => planted(40, m + 5) },
  ];
  const r = await findSignal([{ ref: "run-a", material: 2 }, { ref: "run-b", material: 900 }],
    { ...base, instruments, vocabulary: VOCAB });
  assert.ok(!r.refused, `should complete, got ${r.refused ?? ""} ${r.detail ?? ""}`);
  const zub = r.findings.filter((f) => f.kind === "kind:before=zub");
  assert.ok(zub.length >= 2, `the planted kind is found: ${JSON.stringify(r.findings)}`);
  assert.ok(zub.every((f) => f.corroborated), "2 sources AND 2 instruments");
  assert.ok(zub.every((f) => f.share > f.searchCeiling), "each beat the search-aware ceiling it is reported with");
});

test("THE SEARCH RAISES ITS OWN BAR: adding instruments never lowers the ceiling", async () => {
  const one = [{ recipe: "cut-a", discretize: (m) => planted(40, m) }];
  const many = [...one, ...Array.from({ length: 8 }, (_, i) => ({ recipe: `noise-${i}`, discretize: (m) => noise(40, m + i * 31) }))];
  const src = [{ ref: "run-a", material: 2 }];
  const narrow = await findSignal(src, { ...base, instruments: one, vocabulary: VOCAB });
  const wide = await findSignal(src, { ...base, instruments: many, vocabulary: VOCAB });
  assert.ok(wide.searchCeiling >= narrow.searchCeiling,
    `trying more must not make passing easier: narrow ${narrow.searchCeiling} vs wide ${wide.searchCeiling}`);
});

test("one instrument is NOT corroboration — the shared-instrument law, structural", async () => {
  const one = [{ recipe: "only-cut", discretize: (m) => planted(40, m) }];
  const r = await findSignal([{ ref: "run-a", material: 2 }, { ref: "run-b", material: 700 }],
    { ...base, instruments: one, vocabulary: VOCAB });
  const found = r.findings.filter((f) => f.kind === "kind:before=zub");
  assert.ok(found.length >= 1, "the kind is still found");
  assert.ok(found.every((f) => !f.corroborated), "two sources through one instrument are NOT corroborated");
  assert.match(found[0].note, /one instrument only/);
});

test("an instrument that throws is a typed gap, and the search continues without it", async () => {
  const instruments = [
    { recipe: "broken", discretize: () => { throw new Error("decoder blew up"); } },
    { recipe: "cut-a", discretize: (m) => planted(40, m) },
    { recipe: "cut-b", discretize: (m) => planted(40, m + 5) },
  ];
  const r = await findSignal([{ ref: "run-a", material: 2 }, { ref: "run-b", material: 900 }],
    { ...base, instruments, vocabulary: VOCAB });
  assert.ok(!r.refused);
  assert.ok(r.gaps.some((g) => g.type === "instrument_threw" && /decoder blew up/.test(g.detail)), "named, never swallowed");
  assert.ok(r.findings.length >= 1, "the rest of the search still ran");
});

test("scramble keeps marginals exactly and destroys order", () => {
  const rnd = (() => { let s = 9; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
  const before = [{ text: "a b c d e f" }];
  const after = scramble(before, rnd);
  assert.deepEqual(after[0].text.split(" ").sort(), before[0].text.split(" ").sort(), "same multiset");
  assert.notEqual(after[0].text, before[0].text, "different order");
});

test("phrase() never phrases a verdict — only counts, ceilings and limits", async () => {
  const r = await findSignal([{ ref: "a", material: 2 }, { ref: "b", material: 900 }], {
    ...base, vocabulary: VOCAB,
    instruments: [{ recipe: "x", discretize: (m) => planted(40, m) }, { recipe: "y", discretize: (m) => planted(40, m + 5) }],
  });
  const said = phrase(r);
  assert.match(said, /search-aware ceiling/);
  assert.ok(!/\b(true|proves|confirms|real)\b/i.test(said), `no verdict language: ${said}`);
});
