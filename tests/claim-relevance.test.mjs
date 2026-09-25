// tests/claim-relevance.test.mjs — native/organs/claim-relevance.js.
// EO_LEDGER_DIR (read by cli/reasoning-ledger.mjs's own DOCS constant) is
// resolved ONCE at module load time, so isolating it requires a fresh
// subprocess per env value — the same reason every other ledger-dependent
// test file in this repo (tests/reasoning-claims-ledger.test.mjs,
// tests/claude-code-recall.test.mjs) spawns rather than imports in-process.
// claim-relevance.js has no CLI entry of its own (deliberately — it is a
// pure organ, not a dual-purpose script), so this file drives it via a
// small inline `node -e` script per call rather than adding one.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MODULE_PATH = JSON.stringify(path.join(ROOT, "native", "organs", "claim-relevance.js"));

/** Runs relevantClaims(prompt, claims) in a fresh subprocess against the
 *  given EO_LEDGER_DIR, returns the admitted claims. */
function run(prompt, claims, ledgerDir) {
  const script = `
    import(${MODULE_PATH}).then(({ relevantClaims }) => {
      const out = relevantClaims(${JSON.stringify(prompt)}, ${JSON.stringify(claims)});
      console.log(JSON.stringify(out));
    });
  `;
  const r = spawnSync("node", ["--input-type=module", "-e", script], {
    env: { ...process.env, EO_LEDGER_DIR: ledgerDir },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `subprocess failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/** An isolated, empty ledger dir — forces the candidate-set-only fallback
 *  (below MIN_LEDGER_CLAIMS), deterministic and independent of the real
 *  shared ledger's own ever-growing, non-reproducible content. */
function emptyLedgerDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "claim-relevance-empty-"));
}

/** An isolated ledger dir seeded PROGRAMMATICALLY with a realistic df
 *  split, large enough for the separation to actually be strong: "the"
 *  (a true function word) in the great majority of lines, and one
 *  GENUINELY UNIQUE content word per line (co1, co2, ...con) appearing
 *  EXACTLY ONCE — mirroring the real, measured shape (df("the")=73%
 *  across 2,903 real claims, df("implements")=0.14%) at a scale a small
 *  hand-written corpus cannot reach: with only ~20 hand-picked lines,
 *  even a deliberately rare word still occurs in ~5% of them (this file's
 *  own first attempt measured that gap directly — see claim-relevance.js's
 *  header). N=200 with each content word appearing exactly once (0.5%)
 *  reproduces the real ledger's order of magnitude without depending on
 *  that live, non-reproducible file. */
function seededLedgerDir(n = 200) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claim-relevance-seeded-"));
  const lines = [];
  for (let i = 0; i < n; i++) {
    // ONLY "the" repeats across every line — anything else here (a second
    // shared word) becomes just as artificially common as "the" itself,
    // which is exactly the bug this corpus first shipped with: a fixed
    // template word ("implements") ended up at the SAME 100% document
    // frequency as "the", so any real candidate claim using that word
    // (several of them legitimately do — "implements" is an ordinary verb
    // in this codebase's own claim vocabulary) got falsely boosted too.
    const said = `the co${i}`;
    lines.push(JSON.stringify({ kind: "reasoning-claim", said, session: `seed${i}` }));
  }
  // A handful of lines the on-topic test below can actually match against —
  // still each occurring only once, same rarity as every other content word.
  lines.push(JSON.stringify({ kind: "reasoning-claim", said: "the recall hook implements the inject of the standing claims into the context", session: "seed-recall" }));
  lines.push(JSON.stringify({ kind: "reasoning-claim", said: "the watch command implements the tail of the session ledger for the browser", session: "seed-watch" }));
  fs.writeFileSync(path.join(dir, "eoreader7-reasoning:1.jsonl"), lines.join("\n") + "\n");
  return dir;
}

const note = (subject, rel, object) => ({ subject, rel, object });

test("fewer than 3 candidates: no population to measure from, returns everything unfiltered", () => {
  const claims = [note("a", "holds", "b"), note("c", "holds", "d")];
  assert.deepEqual(run("anything at all", claims, emptyLedgerDir()), claims);
});

test("[candidate-set fallback] a prompt clearly about ONE claim among several unrelated ones surfaces that claim and excludes the rest", () => {
  const claims = [
    note("claude-code-watch.mjs", "implements", "a live tail of the session ledger printed to stdout or served as a browser page"),
    note("gfp-claim.js", "defines", "ground figure pattern as a claim's three grains"),
    note("kind-memory.js", "implements", "a five act SIG CON SEG DEF REC lifecycle for kinds of poem form"),
    note("reasoning-lint.js", "exports", "lintGfp and falsifyGfp for checking and falsifying declared claims"),
    note("corroboration.js", "exports", "signProvisionalKind and confirmKind shared across three callers"),
  ];
  const relevant = run("how does the watch command serve the ledger as a browser page", claims, emptyLedgerDir());
  assert.ok(relevant.length >= 1, "at least the watch claim should surface");
  assert.equal(relevant[0].subject, "claude-code-watch.mjs", "the clearly on-topic claim must rank first");
  assert.ok(!relevant.some((c) => c.subject === "kind-memory.js"), "an unrelated claim about poem forms must not surface for a prompt about the watch command");
});

test("[candidate-set fallback] results are ranked by score, highest first", () => {
  const claims = [
    note("apple", "grows-on", "tree"),
    note("apple pie recipe", "requires", "apple and flour and sugar and cinnamon"),
    note("orange", "grows-on", "citrus tree"),
    note("car engine", "requires", "oil and spark plugs"),
  ];
  const relevant = run("what ingredients does an apple pie recipe require", claims, emptyLedgerDir());
  assert.ok(relevant.length >= 1);
  assert.equal(relevant[0].subject, "apple pie recipe", "the claim sharing the most rare vocabulary with the prompt must rank first");
});

test("[candidate-set fallback] the degenerate all-equal-score case (fully disjoint vocabularies) admits nothing rather than throwing or admitting everything", () => {
  const claims = [note("zzqqxx", "relates-to", "wwvvuu"), note("aabbcc", "relates-to", "ddeeff"), note("gghhii", "relates-to", "jjkkll")];
  const relevant = run("totally unrelated prompt text", claims, emptyLedgerDir());
  assert.equal(relevant.length, 0);
});

test("ADVERSARIAL, DISCLOSED STRUCTURAL LIMIT — even with strong background weighting (idf(\"the\")=1.0, the theoretical minimum, measured against a 202-line seeded ledger), a bare function-word collision can still surface a couple of claims: a real, information-theoretic property of mean+SD admission over a population that clusters at exact zero, not a fixable formula bug. ANY nonzero score looks like a statistical outlier against an all-zero population, however small in absolute terms. The honest, tested bound is 'never floods, never returns everything' — not 'always exactly empty'.", () => {
  const claims = [
    note("claude-code-watch.mjs", "implements", "a live tail of the session ledger printed to stdout or served as a browser page"),
    note("gfp-claim.js", "defines", "ground figure pattern as a claim's three grains"),
    note("kind-memory.js", "implements", "a five act lifecycle for kinds of poem form"),
    note("reasoning-lint.js", "exports", "lintGfp and falsifyGfp for checking and falsifying declared claims"),
    note("corroboration.js", "exports", "signProvisionalKind and confirmKind shared across three callers"),
    note("claim-deriver.js", "implements", "a mechanical constructor that derives a claim spec from an edit's token diff"),
    note("reasoning-ledger.mjs", "persists", "the fingerprint and source fields on every declared claim"),
    note("claude-code-steer.mjs", "wires", "claim deriver into the edit branch of its pre tool use denial path"),
    note("claude-code-recall.mjs", "implements", "a user prompt submit hook that injects standing claims as context"),
    note("settings.local.json", "wires", "claude code recall into the user prompt submit hook array"),
  ];
  const relevant = run("what is the weather like in Nashville today", claims, seededLedgerDir());
  assert.ok(relevant.length <= 2, `must never flood or return most of the set: got ${relevant.length}/${claims.length}`);
  assert.ok(relevant.length < claims.length, "must always filter SOMETHING relative to showing everything unconditionally");
});

test("[ledger background] a genuinely on-topic prompt still surfaces the right claim once background weighting is in play", () => {
  const claims = [
    note("claude-code-watch.mjs", "implements", "a live tail of the session ledger printed to stdout or served as a browser page"),
    note("gfp-claim.js", "defines", "ground figure pattern as a claim's three grains"),
    note("kind-memory.js", "implements", "a five act lifecycle for kinds of poem form"),
    note("claude-code-recall.mjs", "implements", "a user prompt submit hook that injects standing claims as context"),
  ];
  const relevant = run("how does the recall hook inject standing claims into context", claims, seededLedgerDir());
  assert.ok(relevant.some((c) => c.subject === "claude-code-recall.mjs"), "the on-topic claim must still surface with background weighting");
});

test("below MIN_LEDGER_CLAIMS, the ledger background is not trusted and the candidate-set fallback is used instead", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claim-relevance-sparse-"));
  const lines = Array.from({ length: 5 }, (_, i) => JSON.stringify({ kind: "reasoning-claim", said: `sparse claim number ${i}` }));
  fs.writeFileSync(path.join(dir, "eoreader7-reasoning:1.jsonl"), lines.join("\n") + "\n");
  const claims = [
    note("apple", "grows-on", "tree"),
    note("apple pie recipe", "requires", "apple and flour and sugar and cinnamon"),
    note("orange", "grows-on", "citrus tree"),
    note("car engine", "requires", "oil and spark plugs"),
  ];
  const relevant = run("what ingredients does an apple pie recipe require", claims, dir);
  assert.equal(relevant[0]?.subject, "apple pie recipe", "5 sparse ledger lines must not be trusted over the candidate set's own fallback");
});
