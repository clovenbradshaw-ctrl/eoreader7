// eval/falsification-probe.mjs — STEP 0 of the self-individuation build:
// establish, BEFORE writing the mechanism, whether structural evidence can
// actually license a composition on its own.
//
// THE QUESTION, sharply. The proposed change is to let a refutation-cleared
// CANDIDATE (no named giver) license bounded derivation, on the reasoning
// that "a real regularity exists here" is an existence claim and existence
// claims can be earned from evidence. That reasoning has one load-bearing
// assumption: that a refutation search over the material can actually
// REFUSE a composition that should not happen. This driver tests exactly
// that assumption, on corpora whose ground truth is declared in advance,
// and it is deliberately run BEFORE the mechanism is built — because if the
// assumption fails, the mechanism is the wrong shape and five modules of
// work would have been spent on it.
//
// THE ADVERSARIAL DESIGN, and why these six corpora.
//
// `succession-clean` and `defeated-acyclic` are STRUCTURALLY IDENTICAL: a
// 1:1 chain of five adjacency facts, no cycle, every referent distinct.
// Their ground truth is opposite. Succession composes soundly (if Johnson
// replaced Hamlin and Colfax replaced Johnson, Colfax genuinely holds the
// office after Hamlin). "Defeated" does not (Alvarez beating Brennan and
// Brennan beating Castellan says NOTHING about Alvarez against Castellan —
// non-transitivity of dominance is the textbook case). If a structural
// scan clears both, structure alone cannot license composition, and the
// finding is decisive.
//
// `defeated-cyclic` is the sensitivity control (A10's discipline: a check
// that cannot refuse fails invisibly and globally). A cycle IS a positive
// counterexample to transitivity — the one case where refutation is
// genuinely available from positive-only material. A scan that misses it is
// broken rather than merely limited, and the two failures must not be
// confused.
//
// `tenure-violation` is the regression fixture for the real bug the live
// run surfaced: one person entering the same office twice, which conflates
// two tenures at a person-level bridge.
//
// `parent-nontransitive` is the case worth running precisely BECAUSE it is
// expected to be refused FOR THE WRONG REASON: parent-of fails uniqueness
// (a child has two parents, a parent has several children) and so a
// uniqueness check refuses it without ever testing transitivity. A right
// answer from an irrelevant test is the exact shape of A10's trap, and
// demonstrating it here is what stops a future pass from reading that
// refusal as evidence the scan understands transitivity.
//
// `lineage-chain` asks the second, separate question: son_of is a 1:1
// chain that composes SOUNDLY, but not to itself — the closure of "son of"
// is "descendant of". Structure cannot say which; that is a naming act.
//
// WHAT THIS DRIVER DOES NOT DO: it builds no production organ. It runs the
// REAL door (the-fold hyperlexicon), the REAL projection, and the REAL
// kernel nominator (acquireCompositionCandidates) against each corpus, plus
// the two structural checks a refutation scan would have available to it —
// uniqueness (the shape the live tenure gate already uses) and cycle
// detection (the shape positive refutation of transitivity would use) — and
// reports the cross-tab against declared ground truth. Extraction is NOT
// under test: the fixtures are a declared TSV, stated as such, so nothing
// here is measuring prose reading.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../eoreader7/native/kernel/task-log.js";
import { GRAINS } from "../../eoreader7/native/kernel/cube.js";
import { acquireCompositionCandidates } from "../../eoreader7/native/kernel/relation-composition.js";

import { makeHyperlexicon } from "../hyperlexicon.js";
import { adaptTaskLog } from "../consequence.js";
import { assertionEdges } from "../predigest.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures", "falsification");
const OUT = path.join(HERE, "results", "falsification-probe.json");

const foldHl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS }), projectTasks });

/**
 * DECLARED GROUND TRUTH — fixed before the probe runs, never adjusted by
 * what it reports (this repo's own rule: never tune against a golden's own
 * score). `composesSoundly` is a claim about the WORLD, argued in `why`,
 * not a claim about what any organ does.
 */
const CORPORA = [
  {
    file: "succession-clean.tsv",
    composesSoundly: true,
    yieldsSelf: false,
    why: "an office held in immediate succession: if C replaced B and B replaced A, C genuinely holds it after A. The closure is real but is a DIFFERENT relation ('after'), not 'replaces' itself.",
    expectRefusal: false,
  },
  {
    file: "defeated-acyclic.tsv",
    composesSoundly: false,
    yieldsSelf: false,
    why: "non-transitivity of dominance: A beating B and B beating C says nothing whatever about A against C. There is no sound closure to derive, under any name.",
    expectRefusal: true,
  },
  {
    file: "defeated-cyclic.tsv",
    composesSoundly: false,
    yieldsSelf: false,
    why: "same relation, and the corpus itself contains a cycle — a POSITIVE counterexample to transitivity, the one case refutation is genuinely available from positive-only material.",
    expectRefusal: true,
  },
  {
    file: "tenure-violation.tsv",
    composesSoundly: false,
    yieldsSelf: false,
    why: "one person enters the same office twice, so a person-level bridge conflates two distinct tenures — the real bug the live succession run surfaced.",
    expectRefusal: true,
  },
  {
    file: "parent-nontransitive.tsv",
    composesSoundly: false,
    yieldsSelf: false,
    why: "parent-of is not transitive (the composition is grandparent-of, never parent-of) — but it ALSO fails uniqueness, so a uniqueness check refuses it without ever testing transitivity: the right answer from an irrelevant test.",
    expectRefusal: true,
  },
  {
    file: "lineage-chain.tsv",
    composesSoundly: true,
    yieldsSelf: false,
    why: "a strict 1:1 lineage composes soundly, but to 'descendant of', never to 'son of'. Structure cannot say WHICH relation is yielded; that is a naming act.",
    expectRefusal: false,
  },
];

/** Facts from a declared TSV, each addressed to its own line's bytes and
 * self-verified before use (P5.2 — the fixture format is declared, but the
 * addressing discipline is the same one every other source gets). */
function factsOf(file) {
  const full = path.join(FIXTURES, file);
  const raw = fs.readFileSync(full, "utf8");
  const facts = [];
  let offset = 0;
  for (const line of raw.split("\n")) {
    if (line.trim()) {
      const [subject, verb, object] = line.split("\t");
      if (raw.slice(offset, offset + line.length) !== line) throw new Error(`address self-verification failed: ${file}#${offset}`);
      facts.push({ subject, verb, object, spans: [{ ref: `falsification/${file}`, start: offset, end: offset + line.length, text: line }] });
    }
    offset += line.length + 1;
  }
  return facts;
}

/** Uniqueness over the bridged identity — the shape the live tenure gate
 * already uses, run here per relation. A relation that is functional AND
 * inverse-functional has a 1:1 chain structure; a violation means the
 * bridge conflates two distinct things. */
function uniqueness(facts, relation) {
  const forward = new Map();
  const backward = new Map();
  for (const f of facts.filter((x) => x.verb === relation)) {
    if (!forward.has(f.subject)) forward.set(f.subject, new Set());
    forward.get(f.subject).add(f.object);
    if (!backward.has(f.object)) backward.set(f.object, new Set());
    backward.get(f.object).add(f.subject);
  }
  const violations = [];
  for (const [k, vs] of forward) if (vs.size >= 2) violations.push({ referent: k, side: "functional", partners: [...vs] });
  for (const [k, vs] of backward) if (vs.size >= 2) violations.push({ referent: k, side: "inverse-functional", partners: [...vs] });
  return { clears: violations.length === 0, violations };
}

/** Cycle detection over the relation's own directed graph. A cycle is a
 * positive counterexample to transitivity — the only refutation of a
 * yields-claim that positive-only material can actually supply. */
function cycles(facts, relation) {
  const out = new Map();
  for (const f of facts.filter((x) => x.verb === relation)) {
    if (!out.has(f.subject)) out.set(f.subject, []);
    out.get(f.subject).push(f.object);
  }
  const state = new Map();
  const found = [];
  const walk = (node, trail) => {
    if (state.get(node) === "done") return;
    if (state.get(node) === "open") { found.push([...trail.slice(trail.indexOf(node)), node]); return; }
    state.set(node, "open");
    for (const next of out.get(node) ?? []) walk(next, [...trail, next]);
    state.set(node, "done");
  };
  for (const node of out.keys()) walk(node, [node]);
  return { present: found.length > 0, examples: found.slice(0, 3) };
}

const rows = [];
for (const corpus of CORPORA) {
  const facts = factsOf(corpus.file);
  const relations = [...new Set(facts.map((f) => f.verb))];

  // Through the REAL door, then the REAL projection.
  let log = foldHl.createHyperlexicon();
  const admitted = foldHl.admit(log, facts, { witness: `falsification/${corpus.file}` });
  log = admitted.log;
  const folded = foldHl.foldHyperlexicon(log);
  const { edges, skipped } = assertionEdges(folded, { hyperedge, source: corpus.file });

  // The REAL kernel nominator, at its own >=2-independent-witness floor.
  const candidates = acquireCompositionCandidates(edges, { minWitnesses: 2 });
  const selfPairs = candidates.filter((c) => c.left === c.right);

  const perRelation = relations.map((rel) => ({
    relation: rel,
    uniqueness: uniqueness(facts, rel),
    cycles: cycles(facts, rel),
    nominated: selfPairs.filter((c) => c.left === rel).map((c) => ({ support: c.meta?.support ?? 0 })),
  }));

  // What a refutation scan built from these two checks WOULD conclude.
  const anyRefusal = perRelation.some((r) => !r.uniqueness.clears || r.cycles.present);
  const nominatedAtAll = selfPairs.length > 0;

  rows.push({
    corpus: corpus.file,
    declared: { composesSoundly: corpus.composesSoundly, expectRefusal: corpus.expectRefusal, why: corpus.why },
    facts: facts.length,
    notes: folded.length,
    edges: edges.length,
    skipped: skipped.length,
    nominated: nominatedAtAll,
    nominatedPairs: selfPairs.map((c) => `${c.left} ∘ ${c.right} (support ${c.meta?.support ?? 0})`),
    perRelation,
    scanRefuses: anyRefusal,
    // The verdict that matters: did the structural scan agree with the world?
    outcome: anyRefusal === corpus.expectRefusal
      ? (anyRefusal ? "correctly refused" : "correctly cleared")
      : (anyRefusal ? "WRONGLY REFUSED (a sound composition blocked)" : "WRONGLY CLEARED (an unsound composition licensed)"),
    refusedBy: anyRefusal
      ? perRelation.filter((r) => !r.uniqueness.clears || r.cycles.present)
        .map((r) => ({ relation: r.relation, uniqueness: !r.uniqueness.clears ? "violated" : "clears", cycle: r.cycles.present ? "present" : "absent" }))
      : null,
  });
}

// ── the cross-tab that decides the design ─────────────────────────────────
const wronglyCleared = rows.filter((r) => r.outcome.startsWith("WRONGLY CLEARED"));
const wronglyRefused = rows.filter((r) => r.outcome.startsWith("WRONGLY REFUSED"));
const rightReasonCheck = rows.find((r) => r.corpus === "parent-nontransitive.tsv");

const finding = {
  schema: "EOFalsificationProbe@1",
  question: "can a structural refutation scan, over the material alone, refuse a composition that should not happen?",
  corpora: rows.length,
  correct: rows.filter((r) => r.outcome.startsWith("correctly")).length,
  wronglyCleared: wronglyCleared.map((r) => r.corpus),
  wronglyRefused: wronglyRefused.map((r) => r.corpus),
  // The decisive pair: same structure, opposite ground truth.
  twinTest: (() => {
    const a = rows.find((r) => r.corpus === "succession-clean.tsv");
    const b = rows.find((r) => r.corpus === "defeated-acyclic.tsv");
    return {
      structurallyIdentical: a.facts === b.facts && a.edges === b.edges && a.nominated === b.nominated,
      succession: { nominated: a.nominated, scanRefuses: a.scanRefuses, composesSoundly: true },
      defeated: { nominated: b.nominated, scanRefuses: b.scanRefuses, composesSoundly: false },
      discriminates: a.scanRefuses !== b.scanRefuses,
      reading: a.scanRefuses === b.scanRefuses
        ? "THE SCAN CANNOT TELL THEM APART — structure alone does not license composition; open-world absence is not refutation"
        : "the scan discriminated sound from unsound composition on structure alone",
    };
  })(),
  rightReasonTrap: rightReasonCheck ? {
    corpus: rightReasonCheck.corpus,
    refused: rightReasonCheck.scanRefuses,
    refusedBy: rightReasonCheck.refusedBy,
    reading: "refused on UNIQUENESS, never on transitivity — a right answer from an irrelevant test (A10). Do not read this refusal as the scan understanding composition.",
  } : null,
  rows,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(finding, null, 1));
console.log(JSON.stringify(finding, null, 2));
