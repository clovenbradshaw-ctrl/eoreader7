// native/eval/the-fold/falsify-context-fold.mjs — DOES ADDING THE VOID'S
// NEIGHBOURHOOD HELP? A falsifier for the `contextFold` change.
//
// PRIOR RESULT (2026-10-02, superseded reasoning): folding the WHOLE code base
// into the void-loop prompt is dead (runVoidLoop gets no contextMode) and would
// be harmful (a 2b mouth degrades on the full fold). The void loop shows only
// the target's own declaration. The honest question is narrower: does adding the
// target's NEIGHBOURHOOD — the real declarations that call it / it calls —
// let the mouth solve a unit it otherwise couldn't?
//
// DESIGN (frozen): a workspace where the target's CONTRACT is only visible in a
// CALLER. The stub names the function; the caller shows HOW it is used (the
// expected return shape / argument), which the stub alone does not state.
//   · bare arm  — the target declaration only (today's void-loop prompt)
//   · fold arm  — plus renderVoidNeighbourhood: the caller's real bytes
// Same task, same real test (exit 0), same model, same cap.
//
// FALSIFIED if fold does not solve in strictly fewer rounds (or more often)
// than bare. Also asserts the neighbourhood is non-empty (else the arm proved
// nothing) and the null: a target with NO callers must yield no section.
//
//   node native/eval/the-fold/falsify-context-fold.mjs [--runs K]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCodeLoop, runVoidLoop } from "../../the-fold/code-loop.js";

const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? Number(process.argv[i + 1]) : fb; };
const RUNS = arg("--runs", 5);
const MODEL = process.env.FALSIFY_MODEL ?? "qwen2.5-coder:1.5b";

// The unit is `capitalize_words`: the KIN (siblings) show the exact idiom the
// task wants (split on whitespace, capitalize each, join) — visible ONLY in
// the siblings' bodies, not in the stub. The bare arm has the stub; the fold
// arm also sees the siblings that solved the same shape, so it can copy the
// idiom rather than invent one. A 1.5B solves this bare only sometimes, which
// is what makes the arms separable.
function makeWorkspace(root) {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "target.py"), [
    "def capitalize_words(text):",
    "    # capitalize each word in the given text",
    "    raise NotImplementedError",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "siblings.py"), [
    "def title_case(text):",
    "    return ' '.join(w.capitalize() for w in text.split())",
    "",
    "def shout_words(text):",
    "    return ' '.join(w.upper() for w in text.split())",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "check.py"), [
    "from target import capitalize_words",
    "got = capitalize_words('the cumberland river')",
    "assert got == 'The Cumberland River', repr(got)",
    "print('GREEN')",
    "",
  ].join("\n"));
  return root;
}

// A workspace with NO caller — the null: renderVoidNeighbourhood must be "".
function makeOrphan(root) {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "target.py"), "def lonely(x):\n    raise NotImplementedError\n");
  return root;
}

async function runArm(fold, run) {
  const root = makeWorkspace(path.join(os.tmpdir(), `neigh-${fold ? "fold" : "bare"}-${run}`));
  const res = await runCodeLoop({
    sessionId: `neigh-${fold ? "fold" : "bare"}-${run}`, userId: null, model: MODEL,
    task: "Implement capitalize_words: capitalize each word in the text.",
    workspace: root, testCommand: "python3 check.py", maxRounds: 5,
    testTimeoutMs: 20000, candidates: 1, contextFold: fold,
  });
  return { green: res.done === true, rounds: res.rounds?.length ?? 0 };
}

// static assertion: the neighbourhood helper is real and non-empty for a
// target that HAS structural kin, empty (or tiny) for one that does not.
// Uses the SAME shadow/echo method the helper uses — no regex, no name match.
const { parseDeclarations, loadCodeKeywordPrior, keywordSetOf } = await import("../../adapters/text/code-structure.js");
const { descriptorFromSeries } = await import("../../kernel/shadow-echo.js");
function neighbourhoodKin(root, files, name) {
  const kw = keywordSetOf(loadCodeKeywordPrior("python"));
  const decls = [];
  let id = 0;
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    for (const d of parseDeclarations(text, rel, { keywords: kw })) decls.push({ name: d.name, text: text.slice(d.start, d.end), _i: id++ });
  }
  if (decls.length < 3) return 0;
  const seriesOf = (s) => { const a = new Float64Array(s.length); for (let i = 0; i < s.length; i += 1) a[i] = s.charCodeAt(i) / 255; return a; };
  const desc = new Map();
  for (const d of decls) { try { desc.set(d._i, descriptorFromSeries(seriesOf(d.text))); } catch {} }
  const target = decls.find((d) => d.name === name);
  if (!target || !desc.has(target._i)) return 0;
  const dist = (a, b) => { let s = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i += 1) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); };
  const t = desc.get(target._i);
  const others = decls.filter((d) => d._i !== target._i && desc.has(d._i));
  const scored = others.map((d) => ({ d, r: dist(t, desc.get(d._i)) })).sort((a, b) => a.r - b.r);
  const all = [target, ...others];
  const coreDist = (d) => Math.min(...all.filter((x) => x._i !== d._i).map((x) => dist(desc.get(d._i), desc.get(x._i))));
  const bound = Math.max(...scored.map((s) => coreDist(s.d)));
  return scored.filter((s) => s.r <= bound).length;
}
const big = makeWorkspace(path.join(os.tmpdir(), "neigh-static-big"));
const orphan = makeOrphan(path.join(os.tmpdir(), "neigh-static-orphan"));
const edgesBig = neighbourhoodKin(big, ["target.py", "siblings.py", "check.py"], "capitalize_words");
const edgesOrphan = neighbourhoodKin(orphan, ["target.py"], "lonely");

console.log(`\n── FALSIFY THE VOID NEIGHBOURHOOD (contextFold) ──`);
console.log(`model ${MODEL} · runs ${RUNS}`);
console.log(`STATIC: target capitalize_words has ${edgesBig} structural kin (must be > 0); orphan "lonely" has ${edgesOrphan} (must be 0)\n`);

const rows = [];
for (let run = 1; run <= RUNS; run += 1) {
  const bare = await runArm(false, run);
  const fold = await runArm(true, run);
  rows.push({ run, bare, fold });
  console.log(`run ${run}:  BARE ${bare.green ? "GREEN" : "wall "} in ${bare.rounds}  |  FOLD ${fold.green ? "GREEN" : "wall "} in ${fold.rounds}`);
}

const gRounds = (k) => rows.map((r) => r[k]).filter((a) => a.green).map((a) => a.rounds);
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const bG = gRounds("bare"), fG = gRounds("fold");
const bMean = mean(bG), fMean = mean(fG);
const foldBetter = fG.length > bG.length || (fG.length === bG.length && fG.length > 0 && fMean < bMean - 0.01);

console.log(`\n── RESULT ──`);
console.log(`solved: BARE ${bG.length}/${RUNS}, FOLD ${fG.length}/${RUNS}`);
console.log(`mean rounds-to-green: BARE ${Number.isFinite(bMean) ? bMean.toFixed(2) : "—"}, FOLD ${Number.isFinite(fMean) ? fMean.toFixed(2) : "—"}`);

const staticOk = edgesBig > 0 && edgesOrphan === 0;
console.log(`STATIC: neighbourhood well-formed: ${staticOk}`);
const hurt = fG.length < bG.length;
const falsified = (!foldBetter && staticOk) || hurt;
console.log(`\nVERDICT: ${!staticOk
  ? `INCONCLUSIVE — the neighbourhood helper is not well-formed (kin ${edgesBig}/${edgesOrphan}); fix before judging.`
  : hurt
    ? `FALSIFIED (HARMFUL) — the neighbourhood solved ${fG.length}/${RUNS} vs bare ${bG.length}/${RUNS}: adding the kin's bytes made the small mouth WORSE (the extra context pulled it off the completion anchor). Do NOT ship contextFold.`
    : foldBetter
      ? `SUPPORTED — the neighbourhood solved ${fG.length}/${RUNS} vs bare ${bG.length}/${RUNS} (mean ${fMean.toFixed(2)} vs ${bMean.toFixed(2)}) — the change earns its slot.`
      : `FALSIFIED — the neighbourhood did not beat the bare stub (solved ${fG.length} vs ${bG.length}; mean ${Number.isFinite(fMean) ? fMean.toFixed(2) : "—"} vs ${Number.isFinite(bMean) ? bMean.toFixed(2) : "—"}). Adding the kin's bytes did not help; do not ship contextFold.`}`);
process.exit(falsified ? 1 : 0);
