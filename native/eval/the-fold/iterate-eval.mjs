// eval/iterate-eval.mjs — the iteration loop, measured against live small
// models. Run: node eval/iterate-eval.mjs [model ...]
//
// What is measured is the whole mechanical ladder foldTurn now runs — the
// REAL organs, never a restatement: scoutSpan resolves the ask's own term
// to an arena; the model is shown that arena and asked for ONE {find, add}
// edit under the decoder's grammar; readOps types the act off the bytes;
// applyOps applies within the arena, strict first, `every` only as the
// disclosed ambiguous-rescue; a refusal lands DEF on the log; a landing is
// witnessed (witness.js) and the witness lands EVA. Then — the part that
// is the design — ONE repair turn: the next ask quotes the log's own DEF
// and EVA evidence, and we measure whether the loop converges.
//
// Two rates, kept apart because they answer different questions:
//   landed        — did a delta apply mechanically (turn 1)
//   witness-clean — is the artifact still whole after its last landing
// A landing with a dirty witness is the measured qwen case (a clobbered
// id): mechanically perfect, semantically broken — exactly what the
// repair turn exists to fix.
//
// Declared numbers: one edit per ask (the measured grammar a 2B decoder
// walks), one repair turn (the smallest loop that can show convergence —
// not a budget tuned to any outcome).

import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";
import { makeBuildLog } from "../build-log.js";
import { scoutSpan } from "../widget.js";
import { witnessCode } from "../witness.js";

const buildLog = makeBuildLog(taskLog);

const COUNTER = `<!DOCTYPE html>
<html>
<body>
  <div id="counter">0</div>
  <button id="inc" style="font-size:12px;background:#eee">+</button>
  <button id="dec" style="font-size:12px;background:#eee">-</button>
  <script>
    let n = 0;
    const out = document.getElementById('counter');
    document.getElementById('inc').addEventListener('click', () => { n++; out.textContent = n; });
    document.getElementById('dec').addEventListener('click', () => { n--; out.textContent = n; });
  </script>
</body>
</html>`;

const TODO = `<!DOCTYPE html>
<html>
<body>
  <h1 style="color:#444">Tasks</h1>
  <ul id="list"></ul>
  <input id="what" placeholder="new task">
  <button id="add" style="background:#4CAF50">add</button>
  <button id="reset" style="background:#4CAF50">reset</button>
  <script>
    const list = document.getElementById('list');
    document.getElementById('add').addEventListener('click', () => {
      const li = document.createElement('li');
      li.textContent = document.getElementById('what').value;
      list.append(li);
    });
    document.getElementById('reset').addEventListener('click', () => { list.innerHTML = ''; });
  </script>
</body>
</html>`;

const CASES = [
  { widget: COUNTER, name: "counter", ask: "make the buttons bigger with some color" },
  { widget: COUNTER, name: "counter", ask: "I don't like the colors" },
  { widget: COUNTER, name: "counter", ask: "change the plus button to blue" },
  { widget: TODO, name: "todo", ask: "make the reset button red" },
  { widget: TODO, name: "todo", ask: "the heading is too dull, make it navy" },
  { widget: TODO, name: "todo", ask: "remove the placeholder text" },
];

const PATCH_SCHEMA = {
  type: "object",
  properties: { find: { type: "string" }, add: { type: "string" } },
  required: ["find", "add"],
};

async function askModel(model, prompt) {
  const r = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false, format: PATCH_SCHEMA }),
  });
  const j = await r.json();
  return { text: j.message?.content ?? "", tokens: j.eval_count ?? 0 };
}

function opsPrompt(entry, instruction) {
  const cur = buildLog.foldBuild(entry.log);
  const lang = cur.seg?.lang ?? "";
  const scout = typeof cur.code === "string" ? scoutSpan(instruction, cur.code) : null;
  const arena = scout ? cur.code.slice(scout.span[0], scout.span[1]) : cur.code ?? "";
  const refusals = entry.log.entries.filter((e) => e.operator === "DEF").slice(-2);
  const lastWitness = entry.log.entries.filter((e) => e.operator === "EVA").at(-1);
  const known =
    (refusals.length
      ? `\nEdits already tried and refused (do not repeat): ${refusals
          .map((e) => `find ${JSON.stringify(String(e.refusal?.ops?.[0]?.find ?? "").slice(0, 48))} — ${e.refusal?.gap?.kind}`)
          .join("; ")}.`
      : "") +
    (lastWitness && lastWitness.witness?.ok === false
      ? `\nKnown defects in the current code: ${lastWitness.witness.findings.map((f) => f.detail).join("; ")}.`
      : "");
  const prompt =
    (scout
      ? `Here is the part of the code your request points at ("${scout.term}"):\n\n`
      : `Here is the working code (${lang}):\n\n`) +
    `\`\`\`${lang}\n${arena}\n\`\`\`\n\n` +
    `Change it as follows: ${instruction}\n${known}\n` +
    `Reply with ONE edit, the smallest that does it — never the whole file. ` +
    `find is a short piece of the code above, copied exactly, that appears only once. ` +
    `add is what that piece becomes. To delete something, leave add empty.`;
  return { prompt, scout };
}

// One turn of the ladder against a live model. Mutates entry.log the way
// foldTurn does; returns what happened, typed.
async function turn(model, entry, instruction) {
  const { prompt, scout } = opsPrompt(entry, instruction);
  const { text, tokens } = await askModel(model, prompt);
  let obj = null;
  try { obj = JSON.parse(text); } catch { /* extractObject's job in-app; format makes this rare */ }
  const ops = obj ? buildLog.readOps(Array.isArray(obj.ops) ? obj.ops : [obj]) : null;
  if (!ops) return { landed: false, gap: "no-ops", tokens };
  const cur = buildLog.foldBuild(entry.log);
  const within = scout?.span ?? null;
  const strict = buildLog.applyOps(cur.code, ops, { within });
  const trial = strict.ok ? strict : strict.gap.kind === "ambiguous" ? buildLog.applyOps(cur.code, ops, { every: true, within }) : strict;
  if (!trial.ok) {
    entry.log = buildLog.refuseBuild(entry.log, { ops, gap: trial.gap });
    return { landed: false, gap: trial.gap.kind, tokens };
  }
  if (scout) entry.log = buildLog.scoutBuild(entry.log, { term: scout.term, span: scout.span });
  const r = buildLog.patchBuild(entry.log, { ops, reason: "revision", every: !strict.ok, within });
  if (!r.landed) return { landed: false, gap: r.churn ? "churn" : r.gap?.kind ?? "?", tokens };
  entry.log = r.log;
  const now = buildLog.foldBuild(entry.log);
  const w = witnessCode(now.seg?.lang, now.code);
  if (w.ok !== null) entry.log = buildLog.attachWitness(entry.log, { witness: w });
  return { landed: true, witnessOk: w.ok, findings: w.findings, ops, scouted: !!scout, every: !strict.ok, tokens };
}

const models = process.argv.slice(2).length ? process.argv.slice(2) : ["gemma2:2b", "qwen2.5-coder:1.5b"];

for (const model of models) {
  let landed1 = 0;
  let clean1 = 0;
  let cleanFinal = 0;
  let tokensAll = 0;
  console.log(`\n=== ${model}`);
  for (const c of CASES) {
    const entry = {
      log: buildLog.proposeBuild({
        n: 1, turn: 1, caption: c.name,
        seg: { type: "code", lang: "html", code: c.widget },
        instruction: `make me a ${c.name} widget`,
      }),
    };
    const t1 = await turn(model, entry, c.ask);
    tokensAll += t1.tokens;
    if (t1.landed) landed1++;
    const okAfter1 = t1.landed && t1.witnessOk !== false;
    if (okAfter1) clean1++;
    let final = okAfter1;
    if (!okAfter1) {
      // The repair turn: the ask is the same, the log now carries the
      // evidence (DEF refusal or EVA findings) the model is shown.
      const t2 = await turn(model, entry, c.ask);
      tokensAll += t2.tokens;
      final = t2.landed && t2.witnessOk !== false;
    }
    if (final) cleanFinal++;
    const w1 = t1.landed ? (t1.witnessOk === false ? `dirty (${t1.findings.map((f) => f.kind).join(",")})` : "clean") : `— (${t1.gap})`;
    console.log(`  ${final ? "✓" : "✗"} [${c.name}] "${c.ask}" — turn1: ${t1.landed ? "landed" : "refused"}${t1.scouted ? " · scouted" : ""}${t1.every ? " · every" : ""} · witness ${w1}${final && !okAfter1 ? " · repaired on turn 2" : ""}`);
  }
  console.log(`  —— landed turn-1: ${landed1}/${CASES.length} · clean turn-1: ${clean1}/${CASES.length} · clean after repair: ${cleanFinal}/${CASES.length} · ${tokensAll} output tokens total`);
}
