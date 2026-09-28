// scripts/kleene-up.test.mjs -- the standing sweep's own CLI, tested end to
// end by spawning the real process (same posture as cli/fold-at.test.mjs):
// this locks in the thing a person actually runs (`node scripts/kleene-up.mjs
// --roots ...`), not just a library function underneath it.
//
// What this pins: the combined sweep now runs TWO scanners over the same
// files -- scripts/kleene-up.mjs's own scanRegexes+reduceRegex (which names a
// regex literal's KIND: literal/semantic/structural/typed_gap) and
// native/the-fold/kleeneup.js's patrol() (which names a regex literal as a
// TABLE wearing regex clothes: alternation-list/number-alternation/...). The
// two can fire on the SAME regex literal and prescribe DIFFERENT fixes
// (findNeedles-for-locating vs. a Set-for-membership); the report must carry
// both, per-occurrence, never merging or picking one.
//
// The tracked kleeneup-report.json at repo root is written by every real run
// of this CLI (there is no output-path override), so this test captures its
// bytes before spawning and restores them in a `finally` -- the same
// with-fixture-then-clean-up shape cli/fold-at.test.mjs already uses, applied
// to a file the CLI writes rather than one the test hands it.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(HERE, "kleene-up.mjs");
const REPORT_PATH = path.join(ROOT, "kleeneup-report.json");

// K1's own fixture (kleeneup-falsify.test.mjs) proved patrol() finds a
// number-word alternation; this is the same shape as a REAL, loadable regex
// literal (no test-only backtick escaping) so scripts/kleene-up.mjs's own
// scanRegexes can extract it too, and reduceRegex classifies it "semantic"
// (a word class: `(?:one|two|...)` with no metacharacters inside a branch) --
// the exact snippet the two scanners are meant to agree exists, and
// disagree about what to do with.
const FIXTURE_SOURCE = `// number-words.mjs -- a table-regex fixture for the combined kleeneUp sweep.
export function normalizeNumberWord(s) {
  return String(s).toLowerCase().replace(/(?:one|two|three|four|five|six|seven|eight|nine|ten)/g, "NUM");
}
`;

function withFixtureRun(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kleeneup-fixture-"));
  const file = path.join(dir, "number-words.mjs");
  fs.writeFileSync(file, FIXTURE_SOURCE);
  const before = fs.readFileSync(REPORT_PATH, "utf8");
  try {
    const r = spawnSync(process.execPath, [CLI, "--roots", dir], { encoding: "utf8", cwd: ROOT });
    assert.equal(r.status, 0, `the sweep exits clean: ${r.stderr}`);
    const out = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
    return fn({ out, stdout: r.stdout, file });
  } finally {
    fs.writeFileSync(REPORT_PATH, before);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the combined sweep carries a patrol field, additive to the existing report shape", () => {
  withFixtureRun(({ out }) => {
    assert.equal(out.schema, "KleeneUpReport@1", "the report's own schema is unchanged");
    assert.ok(Array.isArray(out.rows), "the reduceRegex-based rows are still there");
    assert.ok(Array.isArray(out.patrol), "a new patrol array rides the same report");
    assert.equal(out.counted.patrol, out.patrol.length, "the counted summary agrees with the array it counts");
  });
});

test("one snippet, two verdicts: reduceRegex says semantic, patrol says a table -- both land, neither merged", () => {
  withFixtureRun(({ out, file }) => {
    const semanticRow = out.rows.find((r) => r.file === file && r.kind === "semantic");
    assert.ok(semanticRow, "scripts/kleene-up.mjs's own scanner still classifies the number-word alternation as semantic");
    assert.ok(semanticRow.source.includes("one|two|three"), "the classified source is the fixture's own regex");

    const patrolHits = out.patrol.filter((p) => p.file === file);
    assert.ok(patrolHits.length > 0, "patrol() surfaces at least one table-regex finding for the SAME file");
    const numberAlt = patrolHits.find((p) => p.kind === "number-alternation");
    assert.ok(numberAlt, "patrol names it a number-alternation (a Set, not findNeedles)");
    assert.equal(numberAlt.line, semanticRow.line, "both scanners land on the same source line");
    assert.notEqual(numberAlt.replacement, undefined, "patrol's finding carries its own, different, stated replacement");
    assert.ok(
      !numberAlt.replacement.includes("findNeedles") && !semanticRow.kind.includes("number-alternation"),
      "the two verdicts are genuinely different remediations for the same regex, kept apart"
    );
  });
});

test("the JSON patrol field round-trips through the file scripts/kleene-up.mjs actually writes", () => {
  withFixtureRun(({ out, file }) => {
    // out is already the result of JSON.parse(fs.readFileSync(...)) -- so
    // reaching a well-shaped finding here IS the round trip: patrol()'s
    // in-memory objects survived JSON.stringify (in the CLI) and
    // JSON.parse (here) with every field a caller needs intact.
    const hit = out.patrol.find((p) => p.file === file);
    assert.ok(hit, "a patrol finding for the fixture survived the write/read cycle");
    assert.equal(typeof hit.kind, "string");
    assert.equal(typeof hit.line, "number");
    assert.equal(typeof hit.snippet, "string");
    assert.equal(typeof hit.replacement, "string");
    assert.equal(hit.file, file, "the file field is exactly what patrol({file}) was called with -- not re-derived");
    // A second parse of the same bytes is identical -- the write is stable.
    const again = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
    assert.deepEqual(again.patrol.find((p) => p.file === file && p.kind === hit.kind && p.line === hit.line), hit);
  });
});

test("the printed report discloses the patrol findings too, not only the JSON", () => {
  withFixtureRun(({ stdout }) => {
    assert.match(stdout, /\*\*patrol: \d+ table-regex finding\(s\)\*\*/, "the console report names a patrol count");
    assert.match(stdout, /number-alternation/, "the printed breakdown names the kind the fixture triggers");
  });
});
