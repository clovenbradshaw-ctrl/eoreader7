// eval/referent-patch-eval.mjs — the rebuilt patch ladder, run live against
// a real local model and real eoreader6.1 code. The prior driver
// (eval/local-llm-patch-nul-index.mjs) measured 4/4 landed, 0/4 genuine —
// every failure was model-authored POSITIONAL metadata: a JSON {find, add}
// whose find named an ambiguous referent, corrupted by the every:true
// rescue, plus an arena scout (widget.js::scoutSpan) that anchored on
// incidental words. This driver replaces both halves per direction:
//
//   WORDS POINT TO REFERENTS, DEFINED CONTEXTUALLY — the arena is the named
//   identifier's own declaration span (code-scout.js::scoutDefinition), and
//   an instruction naming nothing declared is refused with zero model calls.
//
//   PHYSICS, NOT JSON — the model only ever emits code in its native medium
//   (the complete corrected function in a fence); the delta is DERIVED off
//   the bytes (code-scout.js::deltaOps, anchor grown until unique by
//   construction), the act is typed by build-log.js's own deriveOp, and the
//   strict wall always lands — the every:true rescue is never reached.
//
//   THE SNIP CARRIES ITS ADDRESS — the arena is snipped through the
//   engine's own host/corpus.js::snipRange (byte-accurate, provenance
//   registered), never an anonymous char slice; char→byte conversion is
//   self-verified (P5.2) by comparing the snip's bytes to the scout's own
//   slice before anything is shown to a model.
//
// Witnessing is four tiers, all mechanical, all evidence for the bounded
// repair loop (max ATTEMPTS model calls per case, each against the
// pristine build, evidence accumulating):
//   1. syntax — witness.js::witnessCode on the export-stripped patched
//      slice (offset arithmetic, the prior driver's proven recovery).
//   2. differential no-throw — the patched module must not THROW on any
//      probe input the original returned a value for. Gaps are results in
//      nul's own law; throwing is never a designed outcome, so this tier is
//      general, not tuned to any one patch. (The probe set includes the
//      no-pattern call shape because the prior run's one witness-clean
//      landing crashed exactly there — pinned as a regression the way every
//      measured failure in this repo is.)
//   3. intent — the case's own DECLARED expectation, measured over the
//      original/patched pair. Added after this driver's own first live run:
//      all three patches landed with every harm tier clean, and two had not
//      done the asked-for thing at all (a dead-code isGap check placed
//      after the guard that fires first; a comment claiming a move that
//      never happened). Harmlessness is not intent.
//   4. the engine's own conformance suite (1187 tests) over a tree with the
//      patched file in place — only failures NEW against the pristine
//      baseline convict (the same posture this repo takes for its own
//      pre-existing environment failures).
//
// Run: node eval/referent-patch-eval.mjs   (model shim on 127.0.0.1:11434)

import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import * as taskLog from "../../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import * as enginePriors from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import { createSession, admitChunked } from "../../eoreader7/legacy-eoreader6.1/packages/host/corpus.js";
import { snipRange } from "../../eoreader7/legacy-eoreader6.1/packages/host/corpus.js";
import { makeBuildLog } from "../build-log.js";
import { scoutSpan } from "../widget.js";
import { scoutDefinition, deltaOps, extractDeclaration } from "../code-scout.js";
import { witnessCode } from "../witness.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const buildLog = makeBuildLog(taskLog);
const SUFFIXES = enginePriors.INFLECTIONAL_SUFFIXES;

const SOURCE_PATH = join(HERE, "..", "..", "eoreader7", "legacy-eoreader6.1", "nul", "index.js");
const SOURCE_ID = "nul/index.js";
const FULL_CODE = readFileSync(SOURCE_PATH, "utf8");

const SCRATCH = process.env.SCRATCHPAD ?? "/tmp/claude-0/-home-user/56996205-f7b0-5b3c-b053-5b7875a0af55/scratchpad";
const WITNESS_TREE = join(SCRATCH, "witness-tree");
const BASELINE_FILE = join(SCRATCH, "baseline-suite-full.txt");

const ATTEMPTS = 3; // declared budget: model calls per case, evidence accumulating

// The three instructions are the PRIOR RUN's own, verbatim — same asks,
// better instrument, so the two runs compare cleanly.
//
// Each case also DECLARES its intent probe — tier 4, added after the first
// live run of this driver measured the gap the first three tiers are
// structurally blind to: all three patches landed with syntax, differential
// and the full suite clean, and TWO of the three had not done the asked-for
// thing at all (witness's isGap check landed AFTER the guard that fires
// first — dead code; difference kept the unconditional computation and
// added a COMMENT claiming the move). Harmlessness is not intent. The
// expectation is stated here, before the run, as an observable over the
// original and patched modules (the goldens' own discipline: the reference
// declared ahead, the engine never steered by it mid-flight — the model is
// only ever shown the MEASURED miss, never the probe's code), and a miss is
// typed evidence for the repair turn, never a silent pass.
const CASES = [
  {
    name: "ground: seed is never validated, unlike draws/window",
    instruction:
      "ground validates that draws and window are integers >= 2 with a typed gap, but it never validates seed at all even though seed is used arithmetically (seed + d) in the sampling loop right below. Add a check that seed is an integer, returning a typed gap (using the same gap(...) helper already used for draws and window) if it is not.",
    intent: {
      declared: "ground({ …, seed: 1.5 }) returns a typed gap; ground({ …, seed: 0 }) still returns a real ground",
      check(orig, patched, fx) {
        const bad = patched.ground({ material: fx.material, draws: 50, window: 4, seed: 1.5 });
        if (!patched.isGap(bad))
          return `calling ground with seed: 1.5 still returns a normal result, not a typed gap — the seed check the instruction asked for is not in effect`;
        const good = patched.ground({ material: fx.material, draws: 50, window: 4, seed: 0 });
        if (patched.isGap(good))
          return `calling ground with a valid integer seed: 0 now returns a gap (${good.gap}) — the new check rejects valid seeds`;
        return null;
      },
    },
  },
  {
    name: "difference: censoredAt is computed even when unused",
    instruction:
      "In difference, censoredAt is computed unconditionally at the top (const censoredAt = 1 / s.length) even though it is only ever used inside the two exceeds_witness gap branches below it. Move the censoredAt computation so it is only computed inside those two branches that actually use it, instead of on every call.",
    intent: {
      declared:
        "no `censoredAt` computation remains above the first branch in the patched text; both exceeds_witness gaps still carry the correct censoredAt value",
      check(orig, patched, fx, patchedSlice) {
        const firstIf = patchedSlice.indexOf("if (");
        const head = firstIf === -1 ? patchedSlice : patchedSlice.slice(0, firstIf);
        if (/censoredAt\s*=/.test(head))
          return `censoredAt is still computed unconditionally before the branches — the computation was not moved (the text above the first if still assigns it)`;
        const above = patched.difference(99, fx.g);
        const below = patched.difference(-99, fx.g);
        const want = 1 / fx.g.samples.length;
        if (above?.censoredAt !== want || below?.censoredAt !== want)
          return `after the move, an exceeds_witness gap no longer carries the correct censoredAt (got ${above?.censoredAt} / ${below?.censoredAt}, expected ${want})`;
        return null;
      },
    },
  },
  {
    name: "witness: an upstream gap from pattern is relabeled as made_no_difference",
    instruction:
      'In witness, the check `if (!p || typeof p.moved !== "boolean") return gap("made_no_difference", { reason: "pattern not established" });` also fires when p is itself a gap object returned by pattern() for a real reason (like incommensurate_extent or unreceived_origin), silently relabeling that real failure as made_no_difference and losing its actual detail. Add a check so that if p is already a gap (isGap(p) is true), witness returns p directly instead of relabeling it.',
    intent: {
      declared:
        "witness({ …, pattern: gap('incommensurate_extent') }) returns that gap itself; a merely-missing pattern still gets made_no_difference",
      check(orig, patched, fx) {
        const through = patched.witness({ ground: fx.g, figure: { observed: 0.5 }, pattern: fx.realGap });
        if (through?.gap !== "incommensurate_extent")
          return `calling witness with pattern set to a real upstream gap (incommensurate_extent) still returns ${JSON.stringify(through?.gap)} — the gap is still being relabeled instead of passed through`;
        const missing = patched.witness({ ground: fx.g, figure: { observed: 0.5 } });
        if (missing?.gap !== "made_no_difference")
          return `calling witness with NO pattern at all now returns ${JSON.stringify(missing?.gap)} — a merely-missing pattern must still get its made_no_difference gap`;
        return null;
      },
    },
  },
];

const CONTROLS = [
  { name: "negative control: underspecified", instruction: "make it better" },
  { name: "negative control: absent referent", instruction: "fix the frobnicate function" },
];

async function askModel(prompt, { timeoutMs = 240000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const r = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "qwen2.5-coder-1.5b-instruct",
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    });
    // An infrastructure failure must never be dressed as a model failure —
    // a 404/refusal parsed to empty text would flow into the evidence trail
    // as "your reply did not contain…", misattributing the miss (the
    // completeness critic's rank-10 finding). Throw, loudly, as what it is.
    if (!r.ok) throw new Error(`model server answered ${r.status} — infrastructure failure, not a model refusal`);
    const j = await r.json();
    return { text: j.message?.content ?? "", tokens: j.eval_count ?? 0, ms: Date.now() - started };
  } finally {
    clearTimeout(t);
  }
}

const stripExport = (s) => s.replace(/^export\s+/, "");

function buildPrompt(snip, instruction, evidence) {
  const evidenceBlock = evidence.length
    ? `\nEarlier attempts at this change failed. What was measured, so you do not repeat it:\n${evidence.map((e) => `- ${e}`).join("\n")}\n`
    : "";
  return (
    `Here is a JavaScript function from a statistics module ` +
    `(${snip.source}, bytes ${snip.byte_start}-${snip.byte_end}):\n\n` +
    `\`\`\`js\n${snip.text}\n\`\`\`\n\n` +
    `Change it as follows: ${instruction}\n${evidenceBlock}\n` +
    `Reply with the complete corrected function in a single \`\`\`js code block. ` +
    `Keep everything you do not need to change exactly as it is, including comments.`
  );
}

// ── tier 2: differential no-throw probes ────────────────────────────────
// Fixtures are built by CALLING the original module — real objects, not
// hand-typed shapes. The gate: for every probe the ORIGINAL returns a value
// for (gap or not — both are returns), the PATCHED must also return, never
// throw. Behavior may change (that is what a patch is for); throwing on a
// previously-handled input is the one universally illegal outcome, by nul's
// own law (gaps are results).
function probeInputsFor(orig) {
  const material = Array.from({ length: 48 }, (_, i) => Math.sin(i / 3) * 4 + (i % 5));
  const g = orig.keep(orig.ground({ material, draws: 50, window: 4, seed: 0 }));
  const realGap = orig.gap("incommensurate_extent", { reason: "probe" });
  return {
    ground: [
      { material, draws: 50, window: 4, seed: 0 },
      { material, draws: 50, window: 4 }, // seed defaulted
      { material, draws: 50, window: 4, seed: 1.5 }, // the new check's own case — may become a gap, must not throw
      { material, draws: 50, window: 4, seed: "x" },
      { material: [], draws: 50, window: 4 },
      { material, window: 4 }, // draws undeclared
      { material, draws: 50 }, // window undeclared
    ],
    difference: [
      [0.5, g],
      [99, g], // above support — exceeds_witness path
      [-99, g], // below support — the other branch
      [Number.NaN, g],
      [0.5, { samples: [] }],
    ],
    witness: [
      { ground: g, figure: { observed: 0.5 } }, // NO pattern — the measured crash shape
      { ground: g, figure: { observed: 0.5 }, pattern: {} }, // malformed pattern
      { ground: g, figure: { observed: 0.5 }, pattern: realGap }, // the fix's own case
      { ground: g, figure: { observed: 0.5 }, pattern: { moved: true, displacement: 2, reseedNull: 0.1 } },
      { ground: g, figure: { observed: 0.5 }, pattern: { moved: false, displacement: 0, reseedNull: 0.1 } },
      { ground: g, figure: realGap },
      { ground: g, figure: null },
    ],
  };
}

async function differentialWitness(fnName, patchedFullCode) {
  const dir = mkdtempSync(join(tmpdir(), "nul-diff-"));
  const patchedPath = join(dir, "patched.mjs");
  writeFileSync(patchedPath, patchedFullCode);
  const orig = await import(pathToFileURL(SOURCE_PATH).href);
  const patched = await import(pathToFileURL(patchedPath).href);
  // A referent with no declared probes is UNEXAMINED, never vacuously clean
  // — "the absence of a refusal is not a check" (P41), the completeness
  // critic's rank-1 finding aimed at this exact `?? []` before the fix.
  const probes = probeInputsFor(orig)[fnName];
  if (!probes) return { findings: [], unexamined: true, orig, patched, fixtures: null };
  const material = Array.from({ length: 48 }, (_, i) => Math.sin(i / 3) * 4 + (i % 5));
  const fixtures = {
    material,
    g: orig.keep(orig.ground({ material, draws: 50, window: 4, seed: 0 })),
    realGap: orig.gap("incommensurate_extent", { reason: "probe" }),
  };
  const findings = [];
  for (const probe of probes) {
    const args = Array.isArray(probe) ? probe : [probe];
    let origOk = true;
    try {
      orig[fnName](...args);
    } catch {
      origOk = false; // original throws too — outside the gate, not evidence
    }
    if (!origOk) continue;
    try {
      patched[fnName](...args);
    } catch (err) {
      findings.push({
        probe: JSON.stringify(args[0], (k, v) => (typeof v === "object" && v?.samples ? "«real ground»" : v)).slice(0, 140),
        threw: String(err?.message ?? err).slice(0, 160),
      });
    }
  }
  return { findings, orig, patched, fixtures };
}

// ── tier 3: the engine's own conformance suite over the patched file ────
function loadBaselineFailures() {
  const lines = readFileSync(BASELINE_FILE, "utf8").split("\n");
  return new Set(lines.filter((l) => /^\s*not ok/.test(l)).map((l) => l.replace(/^\s*not ok \d+ - /, "").trim()));
}

function suiteWitness(patchedFullCode, baseline) {
  const target = join(WITNESS_TREE, "nul", "index.js");
  const backup = readFileSync(target, "utf8");
  writeFileSync(target, patchedFullCode);
  let out = "";
  try {
    out = execFileSync("bash", ["-c", `cd ${JSON.stringify(WITNESS_TREE)} && node --test conformance/*.test.js 2>&1 | grep -E "^ *not ok|^# (tests|pass|fail)"`], {
      encoding: "utf8",
      timeout: 480000,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    out = String(err.stdout ?? "") + String(err.stderr ?? "");
  } finally {
    writeFileSync(target, backup); // ALWAYS restore the pristine copy
  }
  const failures = out
    .split("\n")
    .filter((l) => /^\s*not ok/.test(l))
    .map((l) => l.replace(/^\s*not ok \d+ - /, "").trim());
  const newFailures = failures.filter((f) => !baseline.has(f));
  const totals = out.split("\n").filter((l) => /^# (tests|pass|fail)/.test(l)).join(" · ");
  return { newFailures, totals };
}

// ── one case, through the whole ladder ──────────────────────────────────
async function runCase(session, docText, byteOf, baseline, { name, instruction, intent: caseIntent }, report) {
  console.log(`\n=== ${name}`);
  console.log(`    ask: "${instruction.slice(0, 100)}${instruction.length > 100 ? "…" : ""}"`);

  // The OLD scout, logged for the before/after contrast — never used.
  const old = scoutSpan(instruction, docText, SUFFIXES);
  console.log(
    `    scoutSpan (old organ, for contrast): ${old ? `term="${old.term}" span=[${old.span}] (${old.span[1] - old.span[0]} chars)` : "null"}`,
  );

  // THE REFERENT SCOUT — the instruction's words resolved to a declared
  // referent's own contextual definition.
  const scout = scoutDefinition(instruction, docText, SUFFIXES);
  if (scout.gap) {
    console.log(`    scoutDefinition: REFUSED — ${scout.gap}${scout.candidates ? ` (${JSON.stringify(scout.candidates)})` : ""} · zero model calls`);
    report.push({ name, instruction, refused: scout.gap, modelCalls: 0 });
    return;
  }
  console.log(
    `    scoutDefinition: ${scout.name} span=[${scout.span}] (${scout.span[1] - scout.span[0]} chars)` +
      (scout.candidates.length > 1 ? ` · quotation-ranked over ${JSON.stringify(scout.candidates)}` : ""),
  );

  // THE SNIP — the engine's own byte-addressed extraction, self-verified.
  const snip = snipRange(session, {
    sourceId: SOURCE_ID,
    start: byteOf(scout.span[0]),
    end: byteOf(scout.span[1]),
    prompt: instruction,
    label: scout.name,
  });
  if (snip.gap) throw new Error(`snipRange refused: ${snip.gap}`);
  const charSlice = docText.slice(scout.span[0], scout.span[1]);
  if (snip.text !== charSlice) throw new Error("P5.2 violation: engine snip and scout slice disagree — coordinate spaces mixed");
  console.log(`    snip: ${snip.source} bytes ${snip.byte_start}-${snip.byte_end} · ref ${snip.refId} · verified against scout slice`);

  const exported = /^export\s/.test(snip.text);
  const evidence = [];
  let attempt = 0;
  let outcome = null;

  while (attempt < ATTEMPTS && !outcome) {
    attempt++;
    console.log(`    -- attempt ${attempt}/${ATTEMPTS}`);
    const { text: reply, tokens, ms } = await askModel(buildPrompt(snip, instruction, evidence));
    console.log(`       model: ${tokens} tokens in ${(ms / 1000).toFixed(1)}s`);

    const extracted = extractDeclaration(reply, scout.name, { exported });
    if (!extracted) {
      evidence.push(`your reply did not contain a complete \`${scout.name}\` function declaration — reply with the whole function, starting from its own first line`);
      console.log(`       extract: MISSING declaration — evidence recorded`);
      continue;
    }
    if (extracted.exportRestored) console.log(`       extract: export prefix restored mechanically (disclosed)`);

    const op = deltaOps(snip.text, extracted.text);
    if (!op) {
      evidence.push(`your reply was byte-identical to the original — no change was made`);
      console.log(`       delta: CHURN (identical) — evidence recorded`);
      continue;
    }
    console.log(`       delta: changed core ${op.core.find.length}→${op.core.add.length} chars · anchor ${op.find.length} chars (unique by construction)`);

    // Fresh build per attempt — pristine file, evidence carries the memory.
    let entry = {
      log: buildLog.proposeBuild({
        n: 1,
        turn: 1,
        caption: SOURCE_ID,
        seg: { type: "code", lang: "js", code: docText },
        instruction: "the real eoreader6.1 nul/index.js source, as a build to iterate on",
      }),
    };
    const strict = buildLog.applyOps(docText, [{ op: "SYN", find: op.find, add: op.add }], { within: scout.span });
    if (!strict.ok) throw new Error(`IMPOSSIBLE: byte-derived op refused by strict wall: ${JSON.stringify(strict.gap)}`);
    entry.log = buildLog.scoutBuild(entry.log, { term: scout.name, span: scout.span });
    const landed = buildLog.patchBuild(entry.log, {
      ops: [{ op: "SYN", find: op.find, add: op.add }],
      reason: "revision",
      every: false,
      within: scout.span,
    });
    if (!landed.landed) {
      evidence.push(`the derived edit did not land: ${landed.churn ? "churn" : JSON.stringify(landed.gap)}`);
      continue;
    }
    entry.log = landed.log;
    const now = buildLog.foldBuild(entry.log);

    // tier 1 — syntax, on the patched slice (offset arithmetic).
    const newEnd = now.code.length - (docText.length - scout.span[1]);
    const patchedSlice = now.code.slice(scout.span[0], newEnd);
    const w = witnessCode("js", stripExport(patchedSlice));
    if (w.ok === false) {
      evidence.push(`your corrected function does not compile: ${w.findings.map((f) => f.detail).join("; ")}`);
      console.log(`       tier-1 syntax: DIRTY — ${w.findings.map((f) => f.kind).join(",")} — evidence recorded`);
      continue;
    }
    console.log(`       tier-1 syntax: clean`);

    // tier 2 — differential no-throw against the original's own returns.
    const diff = await differentialWitness(scout.name, now.code);
    if (diff.unexamined) console.log(`       tier-2 differential: UNEXAMINED — no probes declared for ${scout.name}; this landing carries a disclosed unverified tier, not a clean one`);
    if (diff.findings.length) {
      for (const d of diff.findings)
        evidence.push(`your corrected function THROWS (“${d.threw}”) on a call the original handled by returning a value: ${scout.name}(${d.probe}). Keep the original's behavior for every input you were not asked to change — a missing or malformed argument must still get its typed gap, never a crash`);
      console.log(`       tier-2 differential: ${diff.findings.length} regression(s) — ${diff.findings.map((d) => d.threw).join(" | ").slice(0, 120)} — evidence recorded`);
      continue;
    }
    if (!diff.unexamined) console.log(`       tier-2 differential: clean (no new throws across probe set)`);

    // tier 3 — INTENT, the case's own declared expectation, measured over
    // the same original/patched pair tier 2 already imported. Added after
    // the first live run landed two harmless patches that had not done the
    // asked-for thing (a dead-code isGap check; a comment claiming a move
    // that never happened) with every harm-tier clean — harmlessness is
    // not intent, and a check that cannot fail a landed no-op is not a
    // check of the ask. The model is shown the MEASURED miss only.
    if (caseIntent && diff.fixtures) {
      const miss = caseIntent.check(diff.orig, diff.patched, diff.fixtures, patchedSlice);
      if (miss) {
        evidence.push(miss);
        console.log(`       tier-3 intent: UNMET — ${miss.slice(0, 140)} — evidence recorded`);
        continue;
      }
      console.log(`       tier-3 intent: met (${caseIntent.declared})`);
    }

    // tier 4 — the engine's own conformance suite, baseline-compared.
    console.log(`       tier-4 suite: running 1187 tests against the patched file…`);
    const suite = suiteWitness(now.code, baseline);
    if (suite.newFailures.length) {
      evidence.push(`with your change in place, the module's own test suite newly fails: ${suite.newFailures.slice(0, 4).join("; ")}`);
      console.log(`       tier-4 suite: ${suite.newFailures.length} NEW failure(s) — evidence recorded`);
      continue;
    }
    console.log(`       tier-4 suite: clean (${suite.totals}; no failures beyond the pristine baseline)`);

    outcome = {
      landedVerified: true,
      attempt,
      before: snip.text,
      after: patchedSlice,
      delta: { find: op.find, add: op.add, core: op.core },
      suiteTotals: suite.totals,
    };
  }

  if (outcome) {
    console.log(`    ✓ LANDED-VERIFIED on attempt ${outcome.attempt} — all three witness tiers clean`);
  } else {
    console.log(`    ✗ FAILED after ${ATTEMPTS} attempts — evidence trail: ${evidence.length} finding(s)`);
  }
  report.push({
    name,
    instruction,
    referent: scout.name,
    snipAddress: { source: snip.source, byte_start: snip.byte_start, byte_end: snip.byte_end, refId: snip.refId },
    scoutSpanContrast: old ? { term: old.term, span: old.span } : null,
    attemptsUsed: attempt,
    evidence,
    outcome,
  });
}

async function main() {
  const tags = await fetch("http://localhost:11434/api/tags").then((r) => r.json());
  console.log(`model server reachable: ${tags.models?.[0]?.name}`);
  console.log(`source: ${SOURCE_PATH} (${FULL_CODE.length} chars)`);

  // Admit into a REAL engine session; scout over the session's own text so
  // scout-space and snip-space are one text.
  const session = createSession();
  admitChunked(session, { text: FULL_CODE, sourceId: SOURCE_ID });
  const doc = session.documents.get(SOURCE_ID);
  const docText = doc.text;
  if (docText !== FULL_CODE) console.log(`note: admission adjusted the text (${FULL_CODE.length} → ${docText.length} chars) — scouting over the session's own text`);

  // char→byte conversion for snip addressing, computed once per offset.
  const byteOf = (charIdx) => Buffer.byteLength(docText.slice(0, charIdx), "utf8");

  const baseline = loadBaselineFailures();
  console.log(`suite baseline: ${baseline.size} pre-existing failure name(s) excluded from judgment`);

  const report = [];
  for (const c of CASES) await runCase(session, docText, byteOf, baseline, c, report);
  for (const c of CONTROLS) await runCase(session, docText, byteOf, baseline, c, report);

  console.log(`\n\n================ FULL BEFORE/AFTER ================`);
  for (const r of report) {
    console.log(`\n### ${r.name}`);
    if (r.refused) {
      console.log(`REFUSED: ${r.refused} · model calls: 0`);
      continue;
    }
    console.log(`referent: ${r.referent} · ${r.outcome ? `LANDED-VERIFIED (attempt ${r.outcome.attempt})` : `FAILED (${r.attemptsUsed} attempts)`}`);
    if (r.evidence.length) console.log(`evidence trail:\n${r.evidence.map((e) => `  - ${e.slice(0, 200)}`).join("\n")}`);
    if (r.outcome) {
      console.log(`--- BEFORE ---\n${r.outcome.before}`);
      console.log(`--- AFTER ---\n${r.outcome.after}`);
    }
  }

  console.log(`\n================ SUMMARY ================`);
  for (const r of report) {
    console.log(
      r.refused
        ? `REFUSED (${r.refused}, 0 model calls) — ${r.name}`
        : `${r.outcome ? "LANDED-VERIFIED" : "FAILED"} — ${r.name} — ${r.attemptsUsed} attempt(s)`,
    );
  }

  writeFileSync(join(HERE, "results", "referent-patch-eval-run.json"), JSON.stringify(report, null, 2));
  console.log(`\nreport written: eval/results/referent-patch-eval-run.json`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
