// eval/local-llm-patch-nul-index.mjs — can a real local LLM propose a
// genuine, mechanically-checked improvement to real code from
// eoreader6.1/nul/index.js, using the-fold's OWN real build-iteration
// ladder (build-log.js + widget.js::scoutSpan + witness.js)?
//
// Run: node eval/local-llm-patch-nul-index.mjs
//
// Reuses eval/iterate-eval.mjs's exact organs (never a lighter
// reimplementation): buildLog.proposeBuild/applyOps/readOps/patchBuild/
// foldBuild, scoutSpan, witnessCode. The one deliberate departure from
// iterate-eval.mjs is the ARENA: a prior investigation this session
// (see task background) measured scoutSpan against this exact file for
// the identifiers "ground"/"difference"/"witness" and found it does NOT
// reliably anchor on them — those names recur too often (113x/27x/12x)
// to ever be scoutSpan's "most selective" shared term, so it falls back
// to incidental co-occurring words ("fixed"/"function"/"error") and
// returns spans that sometimes (by luck) still bracket the real
// definition and sometimes (no luck) do not. scoutSpan is still CALLED
// FOR REAL below and its raw result is logged for every case — but the
// arena actually shown to the model is a manually-bounded slice of the
// exact target function, computed by locating its unique signature
// string and brace-balancing to the matching close — because the task's
// own instructions invite exactly this fallback when the investigation
// says scoutSpan fails on the specific function being targeted, which it
// does here by the investigation's own numbers.
//
// witnessCode's "js" path compiles with `new Function(body)` — a plain
// SCRIPT-mode parse. nul/index.js is an ES module full of top-level
// `export const` statements throughout, so compiling the WHOLE file (or
// any slice still carrying a leading `export `) throws
// "Unexpected token 'export'" unconditionally, regardless of whether the
// patch itself is correct. So witnessing is scoped to just the patched
// function's own re-extracted slice (post-patch, since a patch can change
// its byte length), with the single leading "export " token stripped —
// ONLY for the witness call. What lands on the build log, and what this
// script reports as the real patched code, is always the untouched,
// full-file projection with "export " intact.

import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";
import * as enginePriors from "../../eoreader6.1/packages/engine/perceiver/text/priors.js";
import { makeBuildLog } from "../build-log.js";
import { scoutSpan } from "../widget.js";
import { witnessCode } from "../witness.js";
import { readFileSync } from "node:fs";

const buildLog = makeBuildLog(taskLog);
const INFLECTIONAL_SUFFIXES = enginePriors.INFLECTIONAL_SUFFIXES;

const SOURCE_PATH = "/home/user/eoreader6.1/nul/index.js";
const FULL_CODE = readFileSync(SOURCE_PATH, "utf8");

const PATCH_SCHEMA = {
  type: "object",
  properties: { find: { type: "string" }, add: { type: "string" } },
  required: ["find", "add"],
};

async function askModel(model, prompt, { timeoutMs = 180000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const r = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        format: PATCH_SCHEMA,
      }),
    });
    const j = await r.json();
    return { text: j.message?.content ?? "", tokens: j.eval_count ?? 0, ms: Date.now() - started, raw: j };
  } finally {
    clearTimeout(t);
  }
}

// Manually bound the arena for a target function: find its unique
// signature marker, then brace-balance from the first `{` after it to
// the matching close, including a trailing `;` if present. Deliberately
// NOT a parser — the same "cheap text walk, not an AST" posture this
// repo's own store-sql.js/CLAUDE.md already documents choosing elsewhere
// when a real parser isn't available and the shape is simple enough to
// walk honestly.
function functionSpan(src, marker) {
  const start = src.indexOf(marker);
  if (start === -1) return null;
  // Every marker here is written to end in the function BODY's own
  // opening brace ("=> {") — but a destructured parameter (`ground`,
  // `witness`) also contains a brace earlier in the same marker text
  // (`{ material, ... }`), so re-searching indexOf("{", start) from the
  // marker's own start locks onto that parameter brace instead, giving a
  // truncated span that ends right after the parameter list closes.
  // Caught live: it silently did exactly that for ground/witness (whose
  // markers destructure) while difference's marker (no destructuring)
  // masked the bug by having no earlier brace to find. Fixed by trusting
  // the marker's own last character — verified below to actually be "{".
  if (marker[marker.length - 1] !== "{") return null;
  const braceStart = start + marker.length - 1;
  let depth = 0;
  let i = braceStart;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  let end = i;
  while (src[end] === ";") end++;
  return [start, end];
}

function stripExport(s) {
  return s.replace(/^export\s+/, "");
}

// ---------------------------------------------------------------------
// The three real, self-identified issues. Each `marker` is the exact,
// unique substring that opens the target function in the real file —
// verified unique by grep before this file was written.
// ---------------------------------------------------------------------

const CASES = [
  {
    name: "ground: seed is never validated, unlike draws/window",
    marker: "export const ground = ({ material, draws, window, perturbation = \"shuffle\", statistic = \"burstiness\", seed = 0, via }) => {",
    instruction:
      "ground validates that draws and window are integers >= 2 with a typed gap, but it never validates seed at all even though seed is used arithmetically (seed + d) in the sampling loop right below. Add a check that seed is an integer, returning a typed gap (using the same gap(...) helper already used for draws and window) if it is not.",
  },
  {
    name: "difference: censoredAt is computed even when unused",
    marker: "export const difference = (observed, g) => {",
    instruction:
      "In difference, censoredAt is computed unconditionally at the top (const censoredAt = 1 / s.length) even though it is only ever used inside the two exceeds_witness gap branches below it. Move the censoredAt computation so it is only computed inside those two branches that actually use it, instead of on every call.",
  },
  {
    name: "witness: an upstream gap from pattern is relabeled as made_no_difference",
    marker: "export const witness = ({ ground: g, figure, pattern: p }) => {",
    instruction:
      "In witness, the check `if (!p || typeof p.moved !== \"boolean\") return gap(\"made_no_difference\", { reason: \"pattern not established\" });` also fires when p is itself a gap object returned by pattern() for a real reason (like incommensurate_extent or unreceived_origin), silently relabeling that real failure as made_no_difference and losing its actual detail. Add a check so that if p is already a gap (isGap(p) is true), witness returns p directly instead of relabeling it.",
  },
];

const NEGATIVE_CONTROL = {
  name: "negative control: underspecified instruction (\"make it better\")",
  instruction: "make it better",
};

function opsPromptFor(arenaText, instruction, lang = "js") {
  return (
    `Here is the part of the code your request points at:\n\n` +
    `\`\`\`${lang}\n${arenaText}\n\`\`\`\n\n` +
    `Change it as follows: ${instruction}\n` +
    `Reply with ONE edit, the smallest that does it — never the whole file. ` +
    `find is a short piece of the code above, copied exactly, that appears only once. ` +
    `add is what that piece becomes. To delete something, leave add empty.`
  );
}

async function runCase(model, entry, { name, instruction, arenaSpan, arenaLabel }) {
  console.log(`\n--- ${name}`);
  console.log(`    instruction: "${instruction}"`);

  // 1. Run scoutSpan FOR REAL against the full current projection, and
  // log its raw result, whatever it is — this is the empirical check on
  // whether the background investigation's finding transfers to this
  // exact instruction.
  const cur0 = buildLog.foldBuild(entry.log);
  const scout = scoutSpan(instruction, cur0.code, INFLECTIONAL_SUFFIXES);
  if (scout) {
    const [a, b] = scout.span;
    const containsTarget = arenaSpan ? a <= arenaSpan[0] && b >= arenaSpan[1] : null;
    console.log(
      `    scoutSpan (real call): term="${scout.term}" span=[${a},${b}] (${b - a} chars, ${((b - a) / cur0.code.length * 100).toFixed(1)}% of file)` +
        (containsTarget === null ? "" : containsTarget ? " — CONTAINS the manually-bounded target span" : " — does NOT contain the manually-bounded target span")
    );
  } else {
    console.log(`    scoutSpan (real call): returned null (no shared term found)`);
  }

  // 2. Decide the working arena. For the three real cases we already
  // know, from the task's own background investigation, that scoutSpan's
  // fallback is unreliable on exactly these identifiers — so the working
  // arena is the manually-bounded function slice, computed independently
  // of scoutSpan, disclosed here rather than silently substituted.
  let within, arenaText;
  if (arenaSpan) {
    within = arenaSpan;
    arenaText = cur0.code.slice(arenaSpan[0], arenaSpan[1]);
    console.log(`    working arena: manually-bounded ${arenaLabel} span=[${arenaSpan[0]},${arenaSpan[1]}] (${arenaText.length} chars)`);
  } else {
    // Negative control: no known target — follow scoutSpan's own
    // fallback contract exactly as iterate-eval.mjs does (null -> whole
    // code as the arena).
    within = scout ? scout.span : null;
    arenaText = scout ? cur0.code.slice(scout.span[0], scout.span[1]) : cur0.code;
    console.log(`    working arena: ${scout ? "scoutSpan's own span" : "WHOLE FILE (scoutSpan returned null, iterate-eval.mjs's own fallback)"} (${arenaText.length} chars)`);
  }

  // 3. Ask the model for exactly one {find, add} edit, showing it ONLY
  // the arena.
  const prompt = opsPromptFor(arenaText, instruction);
  console.log(`    asking model (arena ${arenaText.length} chars)...`);
  const { text, tokens, ms } = await askModel(model, prompt);
  console.log(`    model responded in ${ms}ms, ${tokens} output tokens`);
  console.log(`    raw model response: ${text}`);

  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch {
    /* handled below as no-ops */
  }
  const ops = obj ? buildLog.readOps(Array.isArray(obj.ops) ? obj.ops : [obj]) : null;
  if (!ops) {
    console.log(`    -> REFUSED: no parseable {find, add} op from the model's response`);
    return { landed: false, gap: "no-ops", name, instruction, rawResponse: text };
  }
  console.log(`    parsed op(s): ${JSON.stringify(ops)}`);

  // 4. Apply strict-first, then `every` as the disclosed ambiguous-rescue.
  const strict = buildLog.applyOps(cur0.code, ops, { within });
  const usedEvery = !strict.ok && strict.gap.kind === "ambiguous";
  if (usedEvery) console.log(`    strict apply was AMBIGUOUS (${strict.gap.count}x) — retrying with every:true rescue`);
  const trial = strict.ok ? strict : usedEvery ? buildLog.applyOps(cur0.code, ops, { every: true, within }) : strict;
  if (!trial.ok) {
    entry.log = buildLog.refuseBuild(entry.log, { ops, gap: trial.gap });
    console.log(`    -> REFUSED: applyOps gap = ${JSON.stringify(trial.gap)}`);
    return { landed: false, gap: trial.gap.kind, gapDetail: trial.gap, name, instruction, ops, rawResponse: text };
  }

  // 5. Land it.
  if (scout) entry.log = buildLog.scoutBuild(entry.log, { term: scout.term, span: scout.span });
  const r = buildLog.patchBuild(entry.log, { ops, reason: "revision", every: !strict.ok, within });
  if (!r.landed) {
    console.log(`    -> REFUSED at patchBuild: ${r.churn ? "churn (no-op edit)" : JSON.stringify(r.gap)}`);
    return { landed: false, gap: r.churn ? "churn" : r.gap?.kind ?? "?", name, instruction, ops, rawResponse: text };
  }
  entry.log = r.log;
  const now = buildLog.foldBuild(entry.log);

  // 6. Witness — scoped to just the patched function's own slice,
  // export-stripped ONLY for this compile check. Recovered by OFFSET
  // ARITHMETIC, not by re-searching for the function's marker text: a
  // patch applied under the `every:true` ambiguous-rescue can touch every
  // occurrence of `find` inside the arena, INCLUDING inside the function's
  // own signature if the model's find string was short and generic enough
  // to also match there — which happened live in this run (see below) and
  // would make a marker-based re-search silently fail to relocate anything
  // even though the patch landed and is exactly the case we most need to
  // witness. Since `within=[a,b)` was the ONLY region of cur0.code that
  // applyOps touched (everything outside [a,b) is byte-identical between
  // cur0.code and now.code by construction — see applyOps's own `within`
  // stitching: `code.slice(0,a) + r.code + code.slice(b)`), the patched
  // slice's new end is recoverable directly: now.code's length grew by
  // exactly (patched-arena-length - original-arena-length), and nothing
  // after `b` in the old coordinates moved except by that same shift.
  let witnessResult = null;
  let witnessedSlice = null;
  if (arenaSpan) {
    const [a, b] = within;
    const newEnd = now.code.length - (cur0.code.length - b);
    witnessedSlice = now.code.slice(a, newEnd);
    const stripped = stripExport(witnessedSlice);
    witnessResult = witnessCode("js", stripped);
  } else {
    // Negative control landed (unexpected) — witness the whole file the
    // same way iterate-eval.mjs would for a non-html/js-only case: this
    // is JS-module source, so a whole-file compile will throw on export
    // syntax regardless of the patch. Report that honestly rather than
    // stripping every export in the file (which would silently patch
    // over module syntax unrelated to what we are actually checking).
    witnessResult = { ok: null, unexamined: true, findings: [], reason: "whole-file js witness is not meaningful for an ES module (export syntax throughout)" };
  }

  console.log(`    -> LANDED. witness: ${witnessResult.unexamined ? "unexamined (" + witnessResult.reason + ")" : witnessResult.ok ? "clean" : "DIRTY: " + JSON.stringify(witnessResult.findings)}`);

  return {
    landed: true,
    witnessOk: witnessResult.ok,
    witnessUnexamined: !!witnessResult.unexamined,
    witnessFindings: witnessResult.findings,
    ops,
    scout,
    within,
    name,
    instruction,
    rawResponse: text,
    beforeFunctionText: arenaSpan ? cur0.code.slice(arenaSpan[0], arenaSpan[1]) : null,
    afterFunctionText: witnessedSlice,
    fullCodeAfter: now.code,
  };
}

async function main() {
  // Verify the real model server is reachable before doing anything else.
  const tagsRes = await fetch("http://localhost:11434/api/tags");
  if (!tagsRes.ok) {
    console.error(`FATAL: model server at localhost:11434 not reachable (status ${tagsRes.status})`);
    process.exit(1);
  }
  const tags = await tagsRes.json();
  const model = tags.models?.[0]?.name;
  if (!model) {
    console.error(`FATAL: model server reachable but no models listed`);
    process.exit(1);
  }
  console.log(`Model server reachable. Using model: ${model}`);
  console.log(`Source: ${SOURCE_PATH} (${FULL_CODE.length} chars)`);

  // EACH case gets its OWN independent build log over the PRISTINE file —
  // never a shared, accumulating one. Found necessary live: an earlier cut
  // of this driver shared one build across all three cases sequentially,
  // and precomputed each case's manual arena span ONCE against the
  // original file text. That went stale the moment the first case's patch
  // changed the file's byte length — the second case's `within` window
  // then pointed at the wrong bytes in the (now-shifted) projection,
  // confirmed live: its printed "arena" started mid-COMMENT, not at the
  // function signature, off by exactly the earlier case's byte growth.
  // Independent builds make each case's evidence about that ONE function's
  // real, current, unmodified text — never contaminated by an earlier
  // case's outcome (good or bad) — and sidestep the staleness class of bug
  // entirely rather than patching around it with re-derived offsets.
  function freshEntry() {
    return {
      log: buildLog.proposeBuild({
        n: 1,
        turn: 1,
        caption: "nul/index.js",
        seg: { type: "code", lang: "js", code: FULL_CODE },
        instruction: "the real eoreader6.1 nul/index.js source, as a build to iterate on",
      }),
    };
  }

  // Compute each real case's manual arena span against the pristine file,
  // and verify the marker is unique.
  for (const c of CASES) {
    const count = FULL_CODE.split(c.marker).length - 1;
    const span = functionSpan(FULL_CODE, c.marker);
    console.log(`\nPrecheck "${c.name}": marker occurs ${count}x in file; span=${span ? `[${span[0]},${span[1]}] (${span[1] - span[0]} chars)` : "NOT FOUND"}`);
    c.arenaSpan = span;
  }

  const results = [];
  for (const c of CASES) {
    const res = await runCase(model, freshEntry(), {
      name: c.name,
      instruction: c.instruction,
      arenaSpan: c.arenaSpan,
      arenaLabel: c.name,
    });
    results.push(res);
  }

  // Negative control — same underspecified instruction pattern this
  // session already established with iterate-eval.mjs's own cases
  // ("I don't like the colors" etc.), aimed here at "make it better"
  // with no target named at all. Own fresh build too, for the same reason.
  const negRes = await runCase(model, freshEntry(), {
    name: NEGATIVE_CONTROL.name,
    instruction: NEGATIVE_CONTROL.instruction,
    arenaSpan: null,
    arenaLabel: null,
  });
  results.push(negRes);

  // ---- Full before/after report ----
  console.log(`\n\n================ FULL BEFORE/AFTER DIFFS ================`);
  for (const r of results) {
    console.log(`\n### ${r.name}`);
    console.log(`landed: ${r.landed}${r.landed ? ` · witness: ${r.witnessUnexamined ? "unexamined" : r.witnessOk ? "clean" : "dirty"}` : ` · gap: ${r.gap}`}`);
    if (r.landed && r.beforeFunctionText != null) {
      console.log(`\n--- BEFORE ---\n${r.beforeFunctionText}`);
      console.log(`\n--- AFTER ---\n${r.afterFunctionText ?? "(could not re-extract post-patch slice)"}`);
    } else if (r.landed) {
      console.log(`(negative-control/whole-file landing — see fullCodeAfter length: ${r.fullCodeAfter?.length})`);
    } else {
      console.log(`ops attempted: ${JSON.stringify(r.ops ?? null)}`);
      console.log(`gap detail: ${JSON.stringify(r.gapDetail ?? null)}`);
    }
  }

  console.log(`\n\n================ SUMMARY ================`);
  for (const r of results) {
    console.log(`${r.landed ? "LANDED" : "REFUSED"} — ${r.name} — ${r.landed ? (r.witnessUnexamined ? "witness unexamined" : r.witnessOk ? "witness clean" : "witness DIRTY") : "gap: " + r.gap}`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
