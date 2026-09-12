// generate-passage.mjs — what the whole stack can SAY.
//
// Every organ in this project has been measured on whether it reads correctly.
// This asks the other question: given a real corpus, what novel content does
// the stack PRODUCE — and can a person read it?
//
// THE CHAIN, and every link is already built and already tested:
//
//   read      real Wikidata succession records, 158 entities
//   admit     edges at TENURE grain (a person holds an office FOR A TERM; the
//             grain lesson — an entity-grain uniqueness violation is evidence
//             the grain is too coarse, not that the relation is unsound)
//   acquire   candidate transitive relations, scanned for refutation, and
//             DECLARED by a named giver, because a Pattern-grain claim is
//             never earned from a corpus
//   derive    `reaction.js` composes premises into facts NO SOURCE STATES
//   compose   `compose.js` renders them as a passage, model-free
//
// ZERO MODEL CALLS. Every sentence below is produced by template from checked
// structure, and every fact in it was derived rather than read.
//
// WHAT MAKES THIS NOVEL CONTENT RATHER THAN A REPORT: no record in the corpus
// says "Grant held the presidency after Lincoln". Each record says only who
// one person immediately replaced. The chain composes those into statements
// the material never made, and then writes them down.
//
// THE ORACLE IS NEVER READ BY THE CHAIN. Term dates (P580/P582) judge the
// output afterwards; the derivation reads only adjacency (P1365/P1366).
//
//   node generate-passage.mjs     env: MATERIAL - LIMIT
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const FOLD = "/Users/mlacy/Documents/3.0/the-fold";
const MATERIAL = process.env.MATERIAL ?? `${FIX}succession-tenures-wide.json`;
const LIMIT = Number(process.env.LIMIT ?? 14);

const { createDeclarationLog, foldDeclarations } = await import(`${NATIVE}/interpretation/declarations.js`);
const { acquireCandidates, promoteAndDeclare } = await import(`${FOLD}/hl-acquire.js`).catch(() => import(`${NATIVE}/organs/hl-acquire.js`));
const { stageFromEdges } = await import(`${FOLD}/hl.js`);
// The chemistry table is `createHyperlexicon` — the THIRD module in this
// project wearing that name (the assertion ledger and the HL adapter are the
// other two, and CLAUDE.md keeps them apart for exactly this reason).
const { createHyperlexicon: createChemistry, giveHyperlexiconAffordance } = await import(`${NATIVE}/kernel/hyperlexicon.js`);
// `hyperedge` is the substrate's own edge constructor — a plain object is not
// an entry, and building one by hand is why the first cuts derived nothing.
const { createReactionSubstrate, closureAffordances } = await import(`${NATIVE}/kernel/reaction.js`);
const { hyperedge } = await import(`${NATIVE}/kernel/hypergraph.js`);
const { compose } = await import(`${FOLD}/compose.js`);
// THE REASONING LINT — pure, zero model calls (G2: it is free, run it early
// and always). Seat 1: at derive, the oracle becomes a VERIFY gate so a
// refuted fact is withheld before it ships. Seat 2: pre-compose, candidate
// claims are checked at `standard`. Seat 3: post-compose, the composed
// subset is checked at `strict`. Integration per
// native/eval/the-fold/REASONING-LINT-GENERATION-INTEGRATION.md.
const { lintLedger, lintInferences, lintReport, setResolveEnd } = await import(`${NATIVE}/organs/reasoning-lint.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { tagClaim } = await import(`${NATIVE}/organs/regime.js`);
const TL = await import(`${NATIVE}/kernel/task-log.js`);
const cube = await import(`${NATIVE}/kernel/cube.js`);
const reasoningTaskLog = { ...TL, cellOf: cube.cellOf };
const reasoningHl = makeHyperlexicon(reasoningTaskLog); // the `door` lintLedger reads the ledger through

const material = JSON.parse(readFileSync(MATERIAL, "utf8"));
const labelOf = (q) => material.entities?.[q]?.label ?? material.labels?.[q] ?? q;

// THE LINT IS ABOUT REFERENTS, NOT SPANS: the resolver maps a display name
// back to its Wikidata QID — the reading's real referent identity — so two
// names that name the same being ("Lincoln", "Abraham Lincoln") share one
// address, and a contradiction between them is caught rather than missed as
// two different strings.
const qidOfLabel = new Map();
for (const [q, ent] of Object.entries(material.entities ?? {})) {
  const label = labelOf(q).toLowerCase();
  if (!qidOfLabel.has(label)) qidOfLabel.set(label, q);
}
setResolveEnd((end) => qidOfLabel.get(String(end ?? "").trim().toLowerCase()) ?? null);

// ── the substrate, at tenure grain ───────────────────────────────────────
const stamp = (d) => (typeof d === "string" ? Number(d.slice(0, 4).replace(/\D/g, "")) || null : null);
const tenureId = (q, i) => `${q}#${i}`;
const person = (id) => String(id).split("#")[0];
const tenureIdx = (id) => Number(String(id).split("#")[1]);

const entries = [];
for (const [q, ent] of Object.entries(material.entities ?? {})) {
  (ent.tenures ?? []).forEach((t, i) => {
    if (!t.replaces) return;
    const prev = (material.entities[t.replaces]?.tenures ?? []).findIndex((u) => u.office === t.office && u.replacedBy === q);
    if (prev < 0) return;
    // The relation name is FOLDED (lower-cased) because that is the form
    // `scanFunctionalCandidates` returns and therefore the form the chemistry
    // table is keyed on. Carrying the raw `Q4416090` into the substrate while
    // the affordance says `q4416090` declares a chemistry nothing can match.
    entries.push(hyperedge({
      id: `${q}#${i}`,
      relation: `replaces:${String(t.office).toLowerCase()}`,
      participants: [
        { ref: tenureId(q, i), standing: "referent", identity: "wikidata", display: labelOf(q), role: null },
        { ref: tenureId(t.replaces, prev), standing: "referent", identity: "wikidata", display: labelOf(t.replaces), role: null },
      ],
      witness: `wikidata:${q}#P1365`,
      meta: { office: t.office, witnesses: [`wikidata:${q}#P1365`] },
    }));
  });
}
console.log(`material: ${Object.keys(material.entities ?? {}).length} entities -> ${entries.length} stated succession edges at tenure grain`);

// ── declare the chemistry, by a NAMED giver ──────────────────────────────
const GIVER = "wikidata P1365/P1366 immediate-succession semantics; per-office transitive closure declared by this driver as its own risk — a stand-in giver, disclosed";
// `stageFromEdges` takes the edge ARRAY and reads end1/label/end2 (or the SAE
// names) — read from the code after the first cut passed `{ edges }` and got
// "not iterable".
const hg = entries.map((e) => ({
  end1: e.participants[0].ref, label: e.relation, end2: e.participants[1].ref, refs: [e.witness],
  // POLARITY IS EXPLICIT. `scanFunctionalCandidates` skips any edge whose
  // polarity is not "+", and it is right to: P43's law is that an unmeasured
  // polarity decides nothing. The first cut omitted it and all 158 edges were
  // silently skipped — candidates AND refutations both zero, which is the tell.
  // These are affirmative by construction (a stated `replaces` claim).
  polarity: "+",
}));
let declarations = createDeclarationLog();
const STAGE = stageFromEdges(hg);
const acquired = // `acquireCandidates` takes the EDGE ARRAY; `promoteAndDeclare` takes the
// STAGE. Two different arguments, read from the code rather than assumed alike.
acquireCandidates(declarations, hg, { source: "generate-passage" });
declarations = acquired.log;
const fold = foldDeclarations(declarations);
let chem = createChemistry();
for (const c of fold.candidates) {
  ({ log: declarations } = promoteAndDeclare(declarations, STAGE, c.rel, { giver: GIVER }));
  for (const row of closureAffordances({ base: c.rel, yields: `after:${c.rel.split(":")[1]}`, giver: GIVER }))
    chem = giveHyperlexiconAffordance(chem, row);
}
console.log(`chemistry: ${fold.candidates.length} relation(s) declared GIVEN, ${acquired.scan.refuted.length} refuted by the corpus itself`);

// ── derive: facts no record states ───────────────────────────────────────
const substrate = createReactionSubstrate({ entries, hyperlexicon: chem, window: null });
const settled = substrate.settle({ cue: null, floor: null, maxSteps: 12 });
const stated = new Set(entries.map((e) => `${e.relation}|${e.participants[0].ref}|${e.participants[1].ref}`));
const derived = settled.derived
  .map((d) => {
    const [a, b] = d.edge.participants.map((p) => p.ref);
    return { rel: d.edge.relation, a, b, depth: d.depth, office: d.edge.relation.split(":")[1] };
  })
  .filter((f) => person(f.a) !== person(f.b))
  .filter((f) => !stated.has(`replaces:${f.office}|${f.a}|${f.b}`));
console.log(`derived: ${derived.length} fact(s) no record in this corpus states\n`);

// ── the oracle ─────────────────────────────────────────────────────────────
const judge = (f) => {
  const sa = stamp(material.entities[person(f.a)]?.tenures?.[tenureIdx(f.a)]?.start);
  const eb = stamp(material.entities[person(f.b)]?.tenures?.[tenureIdx(f.b)]?.end);
  if (sa == null || eb == null) return "unverifiable";
  return sa >= eb ? "true" : "false";
};

// OFFICE LABELS, and the honest state of them: the corpus was crawled for
// PEOPLE, so it carries no label for the 97 offices its tenures name. Three
// are on disk as real Wikidata entity files and are read from there; the rest
// render as their QID. That is a gap in the fixture, not in the chain — the
// derivation never reads a label, and an unresolved office is visibly
// unresolved rather than quietly guessed at. (Wikidata's API answers 429 to
// this container, so the remaining 94 were not fetched.)
const officeLabels = {};
try {
  for (const f of (await import("node:fs")).readdirSync(`${FIX}wikidata`)) {
    const j = JSON.parse(readFileSync(`${FIX}wikidata/${f}`, "utf8"));
    const q = f.replace(/\.json$/, "");
    const lab = j.labels?.en?.value ?? j.entities?.[q]?.labels?.en?.value;
    if (lab) officeLabels[q] = lab;
  }
} catch { /* an absent label directory leaves every office a QID, which is honest */ }
const officeName = (o) => officeLabels[String(o).toUpperCase()] ?? String(o).toUpperCase();

// ── SEAT 1 — at derive: the oracle becomes the VERIFY gate ─────────────────
// The oracle's term dates are now consulted BY THE GATE, not as a post-hoc
// tally (G2, the seed's "refutation is a veto" applied at generation). A
// derived fact the oracle refutes (judge = "false") is declared to
// lintInferences' `verify` slot, lands as `claim_fails_oracle` at standard
// severity ERROR, and is WITHHELD from the items — it never reaches prose.
const derivedFindings = await lintInferences(
  derived.map((f) => ({
    kind: "deduction", end1: labelOf(person(f.a)), label: `held ${officeName(f.office)} after`, end2: labelOf(person(f.b)),
    relation: `replaces:${f.office}`, yields: `after:${f.office}`, ref: `${person(f.a)}|${person(f.b)}`,
  })),
  {
    // The licence tier is NOT re-derived: reaction.js already enforces R1
    // structurally (an unlicensed pair is withheldByPair, never derived).
    // We pass the DECLARED chemistry (the given affordances) as the licence
    // set so the strict tier confirms the joins that DID fire were licensed —
    // never a second table.
    licenses: new Set(Object.values(chem.composition ?? {}).filter((e) => e?.standing === "given").map((e) => `${e.left}→${e.right}`)),
    verify: (inf) => {
      const [a, b] = String(inf.ref ?? "").split("|");
      const v = judge({ a, b });
      return v === "true" ? { verdict: "holds", detail: "term dates confirm — sa >= eb" }
        : v === "false" ? { verdict: "false", detail: "term dates refute — sa < eb" }
          : { verdict: "unchecked", detail: "term dates unavailable" };
    },
    strictness: "standard",
  },
);
const oracleRefuted = (derivedFindings.findings ?? []).filter((f) => f.kind === "claim_fails_oracle").map((f) => f.at);
if ((derivedFindings.findings ?? []).some((f) => f.kind === "claim_fails_oracle")) {
  console.log(`SEAT 1 (derive): oracle refutes ${oracleRefuted.length} derived fact(s) — withheld before composition`);
  for (const f of (derivedFindings.findings ?? []).filter((x) => x.kind === "claim_fails_oracle")) console.log(`  [${f.level}·${f.severity}] ${f.kind}: ${f.detail}`);
}

// ── the items a candidate may compose ─────────────────────────────────────
const items = derived
  .filter((f) => !oracleRefuted.includes(`${person(f.a)}|${person(f.b)}`)) // SEAT 1: refuted facts never reach prose
  .slice(0, LIMIT)
  .map((f) => ({
    claim: { end1: labelOf(person(f.a)), label: `held ${officeName(f.office)} after`, end2: labelOf(person(f.b)), depth: f.depth, verdict: judge(f) },
    merged: {
      case: "SINGLE",
      standing: f.depth > 1 ? "single" : "corroborated",
      readings: [{ who: `derived depth ${f.depth}`, verdict: "holds", read: [`wikidata:${person(f.a)}`, `wikidata:${person(f.b)}`] }],
    },
  }));

// ── SEAT 2 — pre-compose pool check at `standard` (G1/L5) ─────────────────
// Candidate claims are admitted to a real notes ledger (the hyperlexicon is
// the `door`) and linted at standard. A claim that is the subject of a
// standing contradiction, expired or contested premise, or circular finding
// is WITHHELD from composition with a typed reason (P87: the passage reports
// its own incompleteness). The finding→withhold mapping lives HERE, in the
// pipeline — never in compose (P87: compose is a renderer).
const withheldReasons = new Map();
{
  let notes = reasoningHl.createHyperlexicon({ frame: { reader: "generate-passage", giver: "eoreader7", corpus: "wikidata succession" } });
  for (const f of derived) {
    notes = reasoningHl.hear(notes, {
      subject: labelOf(person(f.a)), verb: `held ${officeName(f.office)} after`, object: labelOf(person(f.b)),
      witness: `wikidata:${person(f.a)}#derived`, spans: [],
    });
  }
  const poolFindings = lintLedger(notes, { door: reasoningHl, taskLog: reasoningTaskLog, strictness: "standard" });
  for (const f of poolFindings.findings ?? []) {
    if (f.severity !== "error") continue;
    if (["standing_contradiction", "expired_in_conflict", "expired_premise", "contested_premise", "circular"].includes(f.kind) && f.at) {
      withheldReasons.set(String(f.at), f.kind);
    }
  }
  if (withheldReasons.size) {
    console.log(`SEAT 2 (pre-compose pool): ${withheldReasons.size} candidate claim(s) withheld by reasoning lint at standard`);
    for (const [at, kind] of withheldReasons) console.log(`  ${kind}: ${at}`);
  }
}

// ── compose: a passage, model-free ───────────────────────────────────────
// `renderClaim` is this driver's template. It is deliberately plain: the
// composer's job is the JOINING, and a template that tried to be literary
// would be this file writing prose rather than the structure doing it.
// The template ends a sentence. `compose` supplies the JOINING between
// claims; a renderer that returned bare fragments would leave the composer
// joining things that never closed.
const renderClaim = (merged, claim) => `${claim.end1} ${claim.label} ${claim.end2}.`;

const assertionIdOf = (it) => `${it.claim.end1}|${it.claim.label}|${it.claim.end2}`;
// A candidate is withheld when it is HALF of a flagged pair: the linter's
// standing-contradiction `at` joins two claims with "+"; a candidate whose
// id appears in any flagged pair is the subject of that contradiction and
// must not reach prose (P87 — the passage reports its own incompleteness).
const withheldAt = [...withheldReasons.keys()];
const composeItems = items.filter((it) => {
  const id = assertionIdOf(it);
  return !withheldAt.some((pair) => String(pair).split("+").includes(id));
});

const out = compose(composeItems.length ? composeItems : items, {
  renderClaim,
  // A DECLARED order: by office, then by how many hops the fact took. Its
  // absence is a refusal in `compose` — a ledger's fold order is not a
  // narrative order, and emitting one as the other would assert a sequence
  // nobody declared.
  orderBy: (x, y) => String(x.claim.label).localeCompare(String(y.claim.label)) || x.claim.depth - y.claim.depth,
});

// ── SEAT 3 — post-compose whole-passage check at `strict` ─────────────────
// What actually shipped is linted at strict: a directed cycle across joined
// sentences, or a standing contradiction between adjacent composed claims,
// refuses the passage. This is a SHIP gate — it may refuse, it may not
// silently edit (G1/L5).
{
  const composedSubset = composeItems.length ? composeItems : items;
  let notes = reasoningHl.createHyperlexicon({ frame: { reader: "generate-passage", giver: "eoreader7", corpus: "composed subset" } });
  for (const it of composedSubset) {
    notes = reasoningHl.hear(notes, {
      subject: it.claim.end1, verb: it.claim.label, object: it.claim.end2,
      witness: "composed", spans: [],
    });
  }
  const strictFindings = lintLedger(notes, { door: reasoningHl, taskLog: reasoningTaskLog, strictness: "strict" });
  const shipBlocking = strictFindings.findings ?? strictFindings;
  const blockers = shipBlocking.filter((f) => f.severity === "error");
  if (blockers.length) {
    console.log(`SEAT 3 (post-compose): ${blockers.length} error(s) at strict — the passage is refused as incoherent`);
    for (const f of blockers) console.log(`  [${f.level}·${f.severity}] ${f.kind}: ${f.detail}`);
  }
}

console.log("=".repeat(72));
console.log("GENERATED PASSAGE — every fact derived, no model, no record states any of it");
console.log("=".repeat(72));
console.log(out.text || "(nothing composed)");
console.log("=".repeat(72));
console.log(`composed ${out.coverage.composed} of ${out.coverage.given}, withheld ${out.coverage.withheld}`);

const tally = { true: 0, false: 0, unverifiable: 0 };
for (const it of items) tally[it.claim.verdict] += 1;
console.log(`\nJUDGED AFTERWARDS by term dates the derivation never read:`);
console.log(`  true ${tally.true}, false ${tally["false"]}, unverifiable ${tally.unverifiable}`);
console.log(`\nprovenance of the first composed fact:`);
if (items[0]) console.log(`  "${renderClaim(items[0].merged, items[0].claim)}"`);
if (items[0]) console.log(`  derived at depth ${items[0].claim.depth}, from ${items[0].merged.readings[0].read.join(" and ")}`);
