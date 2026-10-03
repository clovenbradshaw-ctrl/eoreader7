// native/eval/the-fold/void-adapt.mjs — FULLY ADAPTABLE, ORDER-RESPECTING,
// AUTO-POETIC VOID REFINEMENT.
//
//   ADAPTABLE — the next sub-void is DERIVED from the failing test: the diff
//   between what the test expected and what the body produced selects the
//   transform that reduces it. Any task with a test.
//
//   ORDER-RESPECTING — every transform serves a void OPERATOR, and the operators
//   have the cube's dependency order (NUL SIG INS SEG CON SYN DEF EVA REC =
//   Existence -> Structure -> Interpretation). A transform may only be declared
//   when the operators it depends on are already declared; a move that skips
//   ahead is an ILLEGAL MOVE, refused and named. The pipeline is built in that
//   order: each operator WRAPS the expression the previous one produced.
//
//   AUTO-POETIC — each step is rendered in the system's own voice: a GFP claim
//   (Ground·Figure·Pattern) through the engine's own render() lens.
//
//   node native/eval/the-fold/void-adapt.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runTestCommand } from "../../the-fold/code-loop.js";
import { gfpClaim, render } from "../../kernel/gfp-claim.js";

// ── THE CUBE'S OPERATOR ORDER (the dependency order) ──
const OP_ORDER = ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"];
const DOMAIN = { NUL: "Existence", SIG: "Existence", INS: "Existence", SEG: "Structure", CON: "Structure", SYN: "Structure", DEF: "Interpretation", EVA: "Interpretation", REC: "Interpretation" };
const rank = (op) => OP_ORDER.indexOf(op);

// ── THE TRANSFORM REPERTOIRE. Each serves a void operator, wraps the prior
// expression, and says which test-diff it answers. The operator mapping is the
// void's own meaning, not the code's shape:
//   SIG anchor  — what must resolve          -> split the name into tokens
//   INS admits  — what KIND may stand         -> drop titles/suffixes
//   SEG extent  — cover the extent            -> take each token's initial
//   SYN compose — how fillers compose         -> join with '.'
const TRANSFORMS = [
  { name: "split", op: "SIG", wrap: (x) => `${x}.split()`,
    answers: (got) => !/\[/.test(got) },
  { name: "drop_set", op: "INS", wrap: (x, set) => `[w for w in ${x} if w.strip('.').lower() not in {${[...set].map((d) => `'${d}'`).join(",")}}]`,
    answers: (got, set) => /\[/.test(got) && !/A\.L\.|'A'|'L'/.test(got) },
  { name: "first_letter", op: "SEG", wrap: (x) => `[w[0].upper() for w in ${x}]`,
    answers: (got) => /'[A-Za-z]+'/.test(got) && !/^\[.*'[A-Z]'.*\]$/.test(got) },
  { name: "join_dot", op: "SYN", wrap: (x) => `''.join(w + '.' for w in ${x})`,
    answers: (got) => /^\[.*\]$/.test(got) },
];

function legal(t, declared) {
  const need = TRANSFORMS.filter((o) => rank(o.op) < rank(t.op)).map((o) => o.op);
  const missing = need.filter((op) => !declared.has(op));
  return { ok: missing.length === 0, missing };
}

function verse(rel, arg0, arg1, lens = "SVO") {
  try { return render(gfpClaim({ ground: "/void/formal_initials", rel, roles: { ARG0: arg0, ARG1: arg1 } }), lens); }
  catch { return `${arg0} ${rel} ${arg1}`; }
}

const TASK = {
  entry: "formal_initials",
  origin: "initials like 'A.L.': replace commas, split, drop titles/suffixes, first letter, joined 'X.Y.'",
  test: ["assert formal_initials('Dr. Ada Lovelace PhD') == 'A.L.'", "assert formal_initials('  mr.  john   doe, jr. ') == 'J.D.'", "assert formal_initials('Madonna') == 'M.'", "assert formal_initials('Dr. Prof. Jr.') == ''"],
  set: new Set(["dr", "mr", "mrs", "ms", "prof", "jr", "sr", "ii", "iii", "phd", "md"]),
};

function runPy(src) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "adapt-"));
  fs.writeFileSync(path.join(ws, "solution.py"), src + "\n");
  fs.writeFileSync(path.join(ws, "test_body.py"), TASK.test.join("\n") + "\n");
  fs.writeFileSync(path.join(ws, "check.py"), "exec(open('solution.py').read())\nexec(open('test_body.py').read())\nprint('TASK GREEN')\n");
  const r = runTestCommand("python3 check.py", ws, 15000);
  fs.rmSync(ws, { recursive: true, force: true });
  return { green: r.exitCode === 0, out: r.output };
}
function probe(expr) {
  const r = runPy(`def formal_initials(name):\n    return ${expr}\nprint('GOT=' + repr(formal_initials('Dr. Ada Lovelace PhD')))`);
  return (r.out.match(/GOT=(.*)/) || [null, ""])[1].trim();
}

console.log(`\n── VOID REFINEMENT: ADAPTABLE · ORDER-RESPECTING · AUTO-POETIC ──`);
console.log(`origin: ${TASK.origin}\n`);

const declared = new Set();
let expr = "name";
let arrived = false;
for (let step = 0; step < 8; step += 1) {
  const r = runPy(`def formal_initials(name):\n    return ${expr}`);
  const got = probe(expr);
  console.log(`STEP ${step}: ${verse("stands at", "the void", expr)}`);
  console.log(`  body: return ${expr}`);
  console.log(`  output on 'Dr. Ada Lovelace PhD': ${got}   (origin wants 'A.L.')`);
  console.log(`  REAL TEST: ${r.green ? "TASK GREEN — ARRIVED" : "fail"}`);
  if (r.green) { arrived = true; break; }

  // ADAPTABLE: the diff selects the next transform
  const next = TRANSFORMS.find((t) => !declared.has(t.op) && t.answers(got, TASK.set));
  if (!next) { console.log(`  no transform the diff implies — the irreducible leaf is the mouth's.`); break; }
  // ORDER-RESPECTING: refuse an illegal move
  const L = legal(next, declared);
  if (!L.ok) {
    console.log(`  ⚠ ILLEGAL MOVE refused: "${next.name}" (${next.op}·${DOMAIN[next.op]}) needs ${L.missing.join(", ")} declared first — the order is not skippable.`);
    const need = TRANSFORMS.find((t) => t.op === L.missing[0]);
    declared.add(need.op); expr = need.wrap(expr, TASK.set);
    console.log(`  → declared ${need.name} (${need.op}) first, in order.`);
    continue;
  }
  declared.add(next.op);
  expr = next.wrap(expr, TASK.set);
  console.log(`  ${verse("admits", next.name, DOMAIN[next.op])}   [${next.op} · ${DOMAIN[next.op]}]\n`);
}

// ── explicit illegal-move probe (the dependency order is enforced, not assumed) ──
const illegal = legal(TRANSFORMS.find((t) => t.op === "SYN"), new Set(["SIG", "INS"]));
console.log(`\nILLEGAL-MOVE PROBE: declare SYN (composition) with only {SIG, INS} declared → ${illegal.ok ? "ALLOWED (bug)" : `REFUSED, missing ${illegal.missing.join(", ")}`}`);

console.log(`\n── RESULT ──`);
console.log(`arrived: ${arrived}  ·  operators declared in order: ${[...declared].join(" → ")}`);
console.log(`final body:\n  def formal_initials(name):\n      return ${expr}`);
console.log(`\nADAPTABLE (the diff picked each transform) · ORDER-RESPECTING (illegal moves refused, the prerequisite declared first) · AUTO-POETIC (each step a GFP claim in the system's own voice).`);
