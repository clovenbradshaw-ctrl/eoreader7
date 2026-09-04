// unwired-organs.mjs — which organs produce a typed finding that nothing
// consumes?
//
// THE PATTERN THIS EXISTS TO STOP, four instances in one week, each found by
// accident while chasing something else:
//
//   concession cascade        withdrawal set          nobody -> wired P88
//   corroboration.js contests contradictions          nobody -> wired P88
//   mergeTestimony DISAGREE   per-source disagreement nobody -> wired P91
//   experience-priors         cross-work memory       nobody, still
//
// That is not four bugs. Production of findings is outrunning consumption of
// them: each organ was built correctly, tested, and left with no caller.
//
// `capability-coverage.mjs` already enumerates the registry against the
// cube's 27 cells and states its own law — AN EMPTY CELL IS A LEAD, NEVER A
// VERDICT, because registry debt and real incapacity both read as zero. This
// driver is its DUAL, and the dual's lead is sharper: a FILLED cell nobody
// calls is a capability that exists and is being thrown away. An empty cell
// might mean the work was never done; an uncalled export means it was done
// and then dropped.
//
// WHAT COUNTS AS A CALLER, and the definition is the whole driver. An export
// is WIRED when some file that is not its own module and not a test imports
// or names it. Tests are excluded deliberately: a function whose only caller
// is its own test is exactly the shape being hunted — `mergeTestimony` had a
// full test suite and no production caller for months. Eval drivers ARE
// counted as callers but reported separately, because "one eval driver calls
// it" is a materially weaker standing than "an organ calls it", and P91's own
// audit turned on exactly that distinction.
//
// THIS IS A LEAD-GENERATOR, NOT A VERDICT, and the asymmetry is stated rather
// than implied. An uncalled export may be a public API for a consumer outside
// this tree, a deliberate seam, or genuinely dead. This driver cannot tell
// those apart and does not try — it reports WHAT IS UNCALLED and leaves the
// judgement where judgement belongs. What it removes is the excuse of not
// knowing.
//
// Offline, zero model calls, no network.
//
//   node unwired-organs.mjs        env: MIN_NAME (default 4)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const HERE = new URL(".", import.meta.url).pathname;
const NATIVE = path.resolve(HERE, "../..");
const ROOT = path.resolve(NATIVE, "../..");
const OUT = process.env.OUT_PATH ?? path.join(HERE, "results", "unwired-organs.json");
const MIN_NAME = Number(process.env.MIN_NAME ?? 4);

// The trees an organ can legitimately be called from. `legacy-eoreader6.1` is
// deliberately included: the native kernel is consumed from there through the
// shim layer, so an export called only from legacy is WIRED, not dead.
const SEARCH_ROOTS = [
  path.join(NATIVE, "kernel"),
  path.join(NATIVE, "organs"),
  path.join(NATIVE, "adapters"),
  path.join(NATIVE, "interpretation"),
  path.join(NATIVE, "eval"),
  path.join(NATIVE, "conformance"),
  path.join(NATIVE, "tests"),
  path.join(ROOT, "the-fold"),
];
// Where exports are HARVESTED from — the organ surface itself.
const ORGAN_ROOTS = [
  path.join(NATIVE, "kernel"),
  path.join(NATIVE, "organs"),
  path.join(NATIVE, "interpretation"),
];

const isTest = (f) => /\.test\.(mjs|js)$/.test(f) || /(^|\/)tests?\//.test(f);
const isEval = (f) => /(^|\/)eval\//.test(f);
const isResult = (f) => /(^|\/)results?\//.test(f);   // segment-anchored, as isTest already is
// Applied to DIRECTORY NAMES ONLY, and matched as whole segments. A first
// cut tested the full path with an unanchored /coverage/ and silently
// excluded `capability-coverage.mjs` — so every export only that driver calls
// was misreported as test-only. An audit that drops files is worse than no
// audit, because its zeros look like findings.
const SKIP_DIRS = new Set(["node_modules", ".git", "worktrees", "dist", "coverage", ".claude"]);
const skipDir = (name) => SKIP_DIRS.has(name);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { if (!skipDir(e)) walk(full, out); }
    else if (/\.(mjs|js)$/.test(e) && !isResult(full)) out.push(full);
  }
  return out;
}

// Named exports only. A default export has no name to search for, and this
// driver refuses to guess one — a limitation, stated, not papered over.
const EXPORT_RE = /^export\s+(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)|class\s+(\w+))/gm;

const organFiles = ORGAN_ROOTS.flatMap((r) => walk(r)).filter((f) => !isTest(f));
const searchFiles = SEARCH_ROOTS.flatMap((r) => walk(r));
const contents = new Map(searchFiles.map((f) => {
  try { return [f, readFileSync(f, "utf8")]; } catch { return [f, ""]; }
}));

const rows = [];
for (const file of organFiles) {
  const src = contents.get(file) ?? readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  for (const m of src.matchAll(EXPORT_RE)) {
    const name = m[1] ?? m[2] ?? m[3];
    if (!name || name.length < MIN_NAME) continue;   // short names collide with everything
    if (/^[A-Z_]+$/.test(name)) continue;            // SCREAMING constants are data tables, not organs
    const callers = { organ: [], evalDriver: [], test: [] };
    for (const [other, text] of contents) {
      if (other === file) continue;
      // A barrel re-export is not a caller — index.js forwarding a name is
      // exactly how three of the four unwired organs looked "used".
      const isBarrel = /(^|\/)index\.js$/.test(other);
      if (!new RegExp(`\\b${name}\\b`).test(text)) continue;
      if (isBarrel) continue;
      const bucket = isTest(other) ? "test" : isEval(other) ? "evalDriver" : "organ";
      callers[bucket].push(path.relative(ROOT, other));
    }
    rows.push({
      name,
      module: rel,
      organCallers: callers.organ.length,
      evalCallers: callers.evalDriver.length,
      testCallers: callers.test.length,
      standing: callers.organ.length ? "wired"
        : callers.evalDriver.length ? "eval-only"
          : callers.test.length ? "TEST-ONLY — the shape being hunted"
            : "UNCALLED",
      where: { organ: callers.organ.slice(0, 4), evalDriver: callers.evalDriver.slice(0, 3), test: callers.test.slice(0, 3) },
    });
  }
}

const by = (s) => rows.filter((r) => r.standing === s);
const testOnly = by("TEST-ONLY — the shape being hunted");
const uncalled = by("UNCALLED");
const evalOnly = by("eval-only");

const report = {
  driver: "unwired-organs.mjs",
  ran: new Date().toISOString().slice(0, 10),
  modelCalls: 0,
  question: "which organs produce a typed finding that nothing consumes? the dual of capability-coverage.mjs",
  law: "an uncalled export is a LEAD, never a verdict — it may be a public seam, a consumer outside this tree, or genuinely dropped work. This driver reports; it does not judge.",
  definition: "WIRED = named by a file that is not its own module, not a barrel index.js, and not a test. Eval drivers count but are reported apart: 'one eval driver calls it' is weaker standing than 'an organ calls it', which is the exact distinction P91's audit turned on.",
  limitation: "named exports only — a default export has no name to search for, and guessing one is refused.",
  scanned: { organModules: organFiles.length, searchedFiles: searchFiles.length, exports: rows.length },
  counts: {
    wired: by("wired").length,
    evalOnly: evalOnly.length,
    testOnly: testOnly.length,
    uncalled: uncalled.length,
  },
  testOnly: testOnly.sort((a, b) => b.testCallers - a.testCallers),
  uncalled,
  evalOnly: evalOnly.sort((a, b) => a.module.localeCompare(b.module)),
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));

const say = (s) => console.log(s);
say(`\n=== unwired-organs — ${report.modelCalls} model calls ===`);
say(`scanned ${organFiles.length} organ modules, ${rows.length} named exports, against ${searchFiles.length} files\n`);
say(`  wired (an organ calls it)        ${report.counts.wired}`);
say(`  eval-only (a driver calls it)    ${report.counts.evalOnly}`);
say(`  TEST-ONLY (only its own tests)   ${report.counts.testOnly}`);
say(`  UNCALLED (nothing at all)        ${report.counts.uncalled}\n`);
if (testOnly.length) {
  say(`TEST-ONLY — built, tested, and consumed by nothing. This is the shape of all four:`);
  for (const r of testOnly.slice(0, 25)) say(`   ${r.name.padEnd(34)} ${r.module}  (${r.testCallers} test${r.testCallers === 1 ? "" : "s"})`);
}
if (uncalled.length) {
  say(`\nUNCALLED — not even a test names them:`);
  for (const r of uncalled.slice(0, 25)) say(`   ${r.name.padEnd(34)} ${r.module}`);
}
say(`\n${report.law}\n`);
say(`wrote ${OUT}\n`);
