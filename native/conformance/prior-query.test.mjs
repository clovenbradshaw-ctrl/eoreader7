// native/conformance/prior-query.test.mjs — Bayes, checked.
//
// kernel/prior-query.js had zero test coverage (chorus-lint, 2026-09-17,
// Simon/Chekhov: "new or untested source") despite being live and wired
// into proxy-runner.mjs's composition planning since 2026-09-14. This is
// the first real coverage: a controlled fixture directory shaped exactly
// like live_priors/derived-priors, injected via ER7_LIVE_PRIORS, so the
// cascade's own contract is pinned without depending on the real corpus's
// current (and constantly changing) contents.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-priors-"));
fs.mkdirSync(path.join(dir, "arc-priors"), { recursive: true });
fs.mkdirSync(path.join(dir, "need-priors"), { recursive: true });
fs.mkdirSync(path.join(dir, "reading-priors"), { recursive: true });

fs.writeFileSync(
  path.join(dir, "arc-priors", "fortune-prior-v1.json"),
  JSON.stringify({
    entries: [
      {
        genre: "narrative", medium: "text", subgenre: null,
        staging: ["The opening scene", "The turn", "The resolution"],
        movements: [{ focus: "a lighthouse keeper", from: 0, to: 1, gain: 1 }],
        felt: { shape: "rising" },
      },
      {
        genre: "narrative", medium: "text", subgenre: null,
        staging: ["The opening scene"],
        movements: [{ focus: "a storm at sea", from: 0, to: 1, gain: 1 }],
        felt: { shape: "man-in-hole" },
      },
    ],
  }, null, 2),
);
fs.writeFileSync(
  path.join(dir, "need-priors", "need-prior-eng-narrative.json"),
  JSON.stringify({ schema: "NeedPrior@1", genre: "narrative", works: [{ file: "moby-dick.txt" }, { file: "dracula.txt" }], cells: { "recent-freq": {}, "old-freq": {} } }, null, 2),
);
fs.writeFileSync(
  path.join(dir, "reading-priors", "reading-priors-v1.json"),
  JSON.stringify({ actExpectations: { assert: {}, deny: {}, ask: {} }, giver: { compiledFrom: ["a", "b"] } }, null, 2),
);
// A malformed sidecar file lives beside a NeedPrior with no genre — both
// must be skipped, never thrown through (JSON.parse failures and schema
// misses are read()'s and genrePriors()'s own contract).
fs.writeFileSync(path.join(dir, "need-priors", "not-a-need-prior.json"), JSON.stringify({ schema: "SomethingElse@1" }));

const { queryMeaningPotential, queryMeaningPotentialWithResonance, loadSidecar, livePriorsDir, sidecarPath } = await import("../kernel/prior-query.js");

const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";
let embeddingAvailable = false;
try {
  const res = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: "ping" }),
  });
  embeddingAvailable = res.ok;
} catch { /* no local Ollama reachable — skip below */ }

const registerFor = (field, mode = "text") => ({ field: { field }, mode, tenor: { tenor: "general" } });

test("livePriorsDir resolves explicit > env > default, in that order", () => {
  const priorEnv = process.env.ER7_LIVE_PRIORS;
  try {
    delete process.env.ER7_LIVE_PRIORS;
    assert.match(livePriorsDir(), /live_priors\/derived-priors$/);
    process.env.ER7_LIVE_PRIORS = dir;
    assert.equal(livePriorsDir(), dir);
    assert.equal(livePriorsDir("/explicit/wins"), "/explicit/wins");
  } finally {
    if (priorEnv === undefined) delete process.env.ER7_LIVE_PRIORS; else process.env.ER7_LIVE_PRIORS = priorEnv;
  }
});

test("loadSidecar and sidecarPath read the injected fixture, not the real corpus", () => {
  assert.equal(sidecarPath(dir), path.join(dir, "arc-priors", "fortune-prior-v1.json"));
  const sidecar = loadSidecar({ liveDir: dir });
  assert.equal(sidecar.entries.length, 2);
});

test("a genre with real sidecar entries surfaces FortunePrior@1 evidence — staging from structure, fragments from coverage, kept apart", () => {
  const res = queryMeaningPotential(registerFor("narrative"), { liveDir: dir });
  const fp = res.evidence.find((e) => e.from === "FortunePrior@1 (sidecar)");
  assert.ok(fp, "narrative has two accumulated entries — must be surfaced");
  assert.equal(fp.seen, 2);
  // staging comes only from the material's own structure (the `staging` field);
  // "a lighthouse keeper"/"a storm at sea" are movement fragments, never staged.
  assert.deepEqual(fp.phases.sort(), ["The opening scene", "The resolution", "The turn"]);
  assert.ok(fp.fragments.includes("a lighthouse keeper"));
  assert.ok(!fp.phases.includes("a lighthouse keeper"), "a movement's focus is coverage evidence, not a stage name");
  assert.deepEqual(fp.shapes.sort(), ["man-in-hole", "rising"]);
});

test("a genre with no sidecar entries gets no FortunePrior@1 evidence — honest absence, never a guess", () => {
  const res = queryMeaningPotential(registerFor("lyric"), { liveDir: dir });
  assert.equal(res.evidence.find((e) => e.from === "FortunePrior@1 (sidecar)"), undefined);
});

test("a genre-tagged NeedPrior surfaces as its own contributor, and a malformed sibling file is skipped, never thrown", () => {
  const res = queryMeaningPotential(registerFor("narrative"), { liveDir: dir });
  const np = res.evidence.find((e) => e.from.startsWith("NeedPrior@1"));
  assert.ok(np);
  assert.equal(np.genre, "narrative");
  assert.equal(np.cells, 2);
  assert.deepEqual(np.works, ["moby-dick.txt", "dracula.txt"]);
});

test("reading priors and the web hunt are always present; the record's own seams only when given", () => {
  const bare = queryMeaningPotential(registerFor("exposition"), { liveDir: dir });
  assert.ok(bare.evidence.find((e) => e.from === "ReadingPriors@1"));
  assert.ok(bare.evidence.find((e) => e.from === "the web (hunt)"));
  assert.equal(bare.evidence.find((e) => e.from === "the record's own seams"), undefined);

  const withSeams = queryMeaningPotential(registerFor("exposition"), { liveDir: dir, seams: ["s1", "s2"] });
  const seamEv = withSeams.evidence.find((e) => e.from === "the record's own seams");
  assert.ok(seamEv);
  assert.equal(seamEv.phases, "2 seam(s)");
});

test("a missing corpus directory fails honestly to empty evidence, never a thrown error", () => {
  const res = queryMeaningPotential(registerFor("narrative"), { liveDir: path.join(dir, "does-not-exist") });
  assert.equal(res.evidence.find((e) => e.from.startsWith("FortunePrior")), undefined);
  assert.equal(res.evidence.find((e) => e.from.startsWith("NeedPrior")), undefined);
  assert.ok(res.evidence.find((e) => e.from === "the web (hunt)"), "the one contributor with no corpus dependency still answers");
});

test("queryMeaningPotentialWithResonance: with no topic, degrades to exactly queryMeaningPotential's own output", async () => {
  const base = queryMeaningPotential(registerFor("narrative"), { liveDir: dir });
  const withResonance = await queryMeaningPotentialWithResonance(registerFor("narrative"), { liveDir: dir });
  assert.deepEqual(withResonance, base);
});

test(
  "queryMeaningPotentialWithResonance: with a real topic and a reachable embedding service, adds a live_priors resonance contributor without disturbing the existing cascade",
  { skip: !embeddingAvailable && "no local Ollama + nomic-embed-text reachable" },
  async () => {
    const withResonance = await queryMeaningPotentialWithResonance(
      registerFor("narrative"),
      { liveDir: dir, topic: "the human right to a fair trial and due process under the law" },
    );
    // The existing cascade's own contributors are untouched.
    assert.ok(withResonance.evidence.find((e) => e.from === "FortunePrior@1 (sidecar)"));
    assert.ok(withResonance.evidence.find((e) => e.from === "the web (hunt)"));
    // This fixture directory (arc-priors/need-priors/reading-priors only)
    // carries no live_priors category directories, so the new contributor
    // has nothing to sample and correctly adds no entry — proving it
    // degrades honestly on an absent corpus rather than fabricating one.
    assert.equal(withResonance.evidence.find((e) => e.from === "live_priors (embedding resonance)"), undefined);
  },
);

test(
  "queryMeaningPotentialWithResonance: against the REAL live_priors corpus (default root), a human-rights topic surfaces a real category — proves livePriorsRoot resolves to live_priors itself, never derived-priors",
  { skip: !embeddingAvailable && "no local Ollama + nomic-embed-text reachable" },
  async () => {
    // Deliberately uses the DEFAULT liveDir/livePriorsRoot resolution (no
    // override) against the real, present live_priors checkout — the one
    // path this file's own header discloses was wrong until fixed
    // (livePriorsDir() names live_priors/derived-priors, one level below
    // where the content categories actually live; queryMeaningPotential-
    // WithResonance derives the category root as that path's PARENT).
    const withResonance = await queryMeaningPotentialWithResonance(
      registerFor("narrative"),
      { topic: "the human right to a fair trial and due process under the law" },
    );
    const resonance = withResonance.evidence.find((e) => e.from === "live_priors (embedding resonance)");
    assert.ok(resonance, "the real corpus has real government-legal content — this must fire, not silently degrade");
    assert.ok(resonance.categories.length >= 1);
    assert.ok(resonance.categories.includes("06-government-legal"), `expected 06-government-legal among ${JSON.stringify(resonance.categories)}`);
  },
);

test("cleanup", () => {
  fs.rmSync(dir, { recursive: true, force: true });
});
