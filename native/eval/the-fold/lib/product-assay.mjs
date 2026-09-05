// lib/product-assay.mjs — the finish line, executable (the-fold P97 / S67).
//
// ONE implementation shared by the driver (`eval/the-fold/product-assay.mjs`,
// which prints and may spend model calls) and `native/tests/product-assay.test.js`
// (which reads every wall of the ZERO-CALL arm on each suite run).
//
// WHAT THIS IS. The product bar for The Fold, as one runnable object: over
// material BUILT here (so its numbers are the construction's own and may be
// pinned exactly, P95), the same production organs a live chat turn stands
// on — the relation reader with the app's levers, the hyperlexicon ledger,
// per-source testimony through the grid, derivation from a declared giver,
// the contest act — produce an ANSWER RECORD per question BEFORE any
// generation: the claims the answer may make, each byte-addressed; each
// claim's standing; what follows from the ledger and what it rests on;
// what is disputed and by whom; the reader's frame and recipe; the
// identity of every source and of the constitutions in force. A model, when
// one is spent (driver only), receives that record and phrases it; the
// record is what a model swap must leave byte-identical (bar item 5).
//
// WHAT IT REFUSES TO DO. It does not tune anything to make a wall hold. A
// wall that breaches is REPORTED with its mechanism, because the assay's
// first job is to find the seam where the live circuit is not what the
// docs say it is — that is what an assay is for (P90/P41: the instrument's
// own state, named, never worn as a fact about the material).

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const NATIVE = new URL("../../..", import.meta.url).pathname;
const FOLD = new URL("../../../../../the-fold/", import.meta.url).pathname;
const FIX = new URL("../fixtures/", import.meta.url).pathname;
const ROOT = new URL("../../../../../", import.meta.url).pathname;

const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const stable = (v) => JSON.stringify(v, (k, x) => (x instanceof Set ? [...x].sort() : x instanceof Map ? Object.fromEntries(x) : x));

// ── THE MATERIAL: built, not found ───────────────────────────────────────
// Three sources. A states a fact once (the founding); A and B both state
// one fact (the repair) so ONE note is corroborated beside the single one;
// A and B each state one link of a chain whose consequence nobody states
// (Rowan → Marta → Owen); A asserts the opening date and B DENIES it in its
// own bytes — a genuine disagreement on one claim, opposite polarity.
export const CORPUS = Object.freeze({
  "northgate-a.txt":
    "Amelia Hartley founded the Northgate Observatory in 1887. Rowan Vale preceded Marta Quill. The Northgate Observatory opened in 1889. Owen Blythe repaired the great refractor.",
  "northgate-b.txt":
    "Marta Quill preceded Owen Blythe. The Northgate Observatory never opened in 1889. Owen Blythe repaired the great refractor.",
});
// The shuffled arm: the same sentences with their OBJECTS deranged inside
// each source. Marginals kept (same subjects, same acts, same objects as a
// multiset), only the relation destroyed — the claim set MUST differ, or the
// record measures nothing (II.23: a control built to fail).
export const CORPUS_SHUFFLED = Object.freeze({
  "northgate-a.txt":
    "Amelia Hartley founded Marta Quill. Rowan Vale preceded the great refractor. The Northgate Observatory opened the Northgate Observatory in 1887. Owen Blythe repaired in 1889.",
  "northgate-b.txt":
    "Marta Quill preceded the great refractor. The Northgate Observatory never opened Owen Blythe. Owen Blythe repaired in 1889.",
});
export const QUESTIONS = Object.freeze([
  { id: "stated", question: "Who founded the Northgate Observatory?", expects: { end1: "Amelia Hartley", label: "founded" } },
  { id: "implied", question: "Did Rowan Vale precede Owen Blythe?", expects: { derived: { end1: "Rowan Vale", end2: "Owen Blythe" } } },
  { id: "disputed", question: "When did the Northgate Observatory open?", expects: { end1: "The Northgate Observatory", label: "opened", end2: "in 1889" } },
]);
// Drafts a mouth might produce. None is stated by the material; the reader
// that checks a draft must refuse to bind each. The third is TRUE by
// derivation and still must not bind at the reader — it is derived ground,
// not material ground, and the two are never the same mark.
export const FABRICATIONS = Object.freeze([
  "Amelia Hartley founded the Royal Society in 1887.",
  "Amelia Hartley founded a bakery.",
  "Rowan Vale preceded Owen Blythe.",
  "Marta Quill catalogued nine comets.",
]);
export const GIVER = "native/eval/the-fold/lib/product-assay.mjs — a stand-in giver, DISCLOSED: that `preceded` composes with itself is declared by this assay for its built corpus, never read off the material";

// ── THE PRODUCTION READER, headless ──────────────────────────────────────
async function organs() {
  const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
  const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
  const { makeDerivation } = await import(`${NATIVE}/organs/derivation.js`);
  const { chunkSource, tokenize, blankLabelRows, retrieve } = await import(`${NATIVE}/organs/source.js`);
  const { proposeCandidates, textFeatures, distinctSources } = await import(`${NATIVE}/organs/corroboration.js`);
  const { CLAIM_STOPWORDS } = await import(`${NATIVE}/organs/grounding.js`);
  const { makeCapacityRunner, landAct, perSourceReadings, mergeTestimony, landContest, findCapacity, unresolvedCapacity } = await import(`${NATIVE}/organs/index.js`);
  const { makeReferentIndex } = await import(`${NATIVE}/organs/cast.js`);
  const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
  const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
  const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
  const M = await import(`${NATIVE}/adapters/text/morphology.js`);
  const P = await import(`${NATIVE}/adapters/text/priors.js`);
  const cube = await import(`${NATIVE}/kernel/cube.js`);
  const TL = await import(`${NATIVE}/kernel/task-log.js`);
  const decl = await import(`${NATIVE}/interpretation/declarations.js`);
  const { makeGrid } = await import(`${FOLD}grid.js`);
  const { readerFrame } = await import(`${FOLD}reader-frame.js`);

  const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
  const verbForms = new Set(JSON.parse(readFileSync(`${FIX}unimorph-eng-verb-forms.json`, "utf8")));
  const prior = M.morphologyFromPrior(JSON.parse(readFileSync(`${FIX}unimorph-morphology-prior.json`, "utf8")));
  const sameAct = M.createLemmatizer(prior.forms, { language: prior.language }).sameAct;

  // The app's own RELATION_READER_OPTIONS (app.js), key for key, so the
  // frame this assay records is the frame a live turn records. Differences
  // are declared in `priors`, never hidden: the connector lens (a browser
  // fetch of the POS prior) is not built here, so `classifyConnector` is
  // null at the door — the door's own disclosed behaviour.
  const RELATION_READER_OPTIONS = {
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
    posPriorFor: () => posPrior,
    verbForms, oovLexicon: verbForms,
    nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true,
    objectSpecificity: true,
    createLemmatizer: () => ({ sameAct }),
    morphologyIndex: {},
    determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
    negationWords: P.NEGATION_WORDS,
    blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
    resolvePronouns,
  };
  const relationsFor = makeRelationReader(RELATION_READER_OPTIONS);
  const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, blankFurniture: RELATION_READER_OPTIONS.blankFurniture });
  const runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor });
  const hl = makeHyperlexicon({ createTaskLog: TL.createTaskLog, append: TL.append, projectTasks: TL.projectTasks, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAINS: cube.GRAINS, cellOf: cube.cellOf });
  const D = makeDerivation({ hl, taskLog: { append: TL.append, projectTasks: TL.projectTasks, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAIN_RANK: TL.GRAIN_RANK ?? cube.GRAIN_RANK, cellOf: cube.cellOf } });
  const grid = makeGrid({ operators: { TERRAIN_BY_DOMAIN: cube.TERRAIN_BY_DOMAIN, isCurrentOperator: cube.isCurrentOperator }, taskLog: TL });
  grid.withCapacities({ findCapacity, unresolvedCapacity });

  const frame = readerFrame({
    options: RELATION_READER_OPTIONS,
    priors: {
      posPrior: posPrior.schema ?? "POSPrior@1",
      posGate: "on (type-level vocabulary gate over POSPrior@1)",
      verbForms: `UniMorph eng verb forms (${verbForms.size})`,
      morphology: "UniMorph morphology prior (sameAct)",
      connectorLens: null,
    },
    identity: { ends: "makeCastResolver (cast.js)", noteIdentity: null },
    model: null,
  });
  const recipe = await hl.recipeId(frame);
  return { relationsFor, hl, D, grid, runCapacity, chunkSource, retrieve, tokenize, proposeCandidates, textFeatures, distinctSources, CLAIM_STOPWORDS, landAct, perSourceReadings, mergeTestimony, landContest, decl, frame, recipe, RELATION_READER_OPTIONS };
}

// ── THE CONSTITUTIONS, BY CONTENT IDENTITY ───────────────────────────────
export function constitutionIdentity() {
  const want = [
    { name: "FOLD-CONSTITUTION.md", path: `${ROOT}FOLD-CONSTITUTION.md` },
    { name: "eo-constitution/CONSTITUTION.md", path: `${ROOT}eo-constitution/CONSTITUTION.md` },
  ];
  return want.map((w) => (existsSync(w.path)
    ? { name: w.name, sha256: sha(readFileSync(w.path, "utf8")), resolved: true }
    : { name: w.name, sha256: null, resolved: false, gap: { type: "constitution_unresolved", detail: `${w.name} is not at ${w.path}; the folded prompt has no drill-down source on this checkout` } }));
}

// ── THE READING (Pass 18's shape: read when material arrives) ────────────
function readCorpus(O, corpus) {
  const passages = [];
  for (const [name, text] of Object.entries(corpus)) for (const p of O.chunkSource(name, text)) passages.push(p);
  const rel = O.relationsFor(passages, { pool: passages });
  let log = O.hl.createHyperlexicon({ frame: O.frame });
  const admitted = [];
  for (const p of passages) {
    const claims = rel.read(String(p.text ?? ""))?.claims ?? [];
    const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, polarity: c.polarity ?? "+", spans: c.spans ?? [] }));
    if (!edges.length) continue;
    const r = O.hl.admit(log, edges, { witness: `${p.ref}~${O.recipe}`, classifyConnector: null });
    log = r.log;
    admitted.push({ ref: p.ref, heard: r.heard.length, turnedAway: r.turnedAway.length });
  }
  return { passages, rel, log, admitted };
}

// A span's bytes are checked against the SOURCE, never trusted. `ref` is
// `name#start-end` of the passage; spans carry start/end in the passage's
// or the source's coordinates — both are tried and the one that verifies is
// named, so a caller knows which coordinate system the organ used.
function verifySpan(sp, corpus, passages) {
  const name = String(sp.ref ?? "").split("#")[0];
  const src = corpus[name];
  if (src == null || !Number.isFinite(sp.start) || !Number.isFinite(sp.end)) return { ok: false, frame: null };
  if (src.slice(sp.start, sp.end) === sp.text) return { ok: true, frame: "source" };
  const p = passages.find((x) => x.ref === sp.ref);
  if (p && src.slice(p.start + sp.start, p.start + sp.end) === sp.text) return { ok: true, frame: "passage" };
  return { ok: false, frame: null };
}

// ── THE ANSWER RECORD ────────────────────────────────────────────────────
async function answerRecord(O, reading, corpus, q, { declarations }) {
  const chunks = O.retrieve(reading.passages, q.question, 3);
  const rel = O.relationsFor(chunks, { pool: reading.passages });
  const claims = [];
  for (const p of chunks) {
    for (const c of rel.read(String(p.text ?? ""))?.claims ?? []) {
      if (c.verdict !== "bound") continue;
      const claim_id = await O.grid.mintClaimId({ subject: c.end1, verb: c.label, object: c.end2 });
      const spans = (c.spans ?? []).map((sp) => ({ ref: sp.ref, start: sp.start, end: sp.end, text: sp.text, verified: verifySpan(sp, corpus, reading.passages) }));
      // ONE claim per identity: a fact two passages state is one claim with
      // two addresses, never two claims (the same identity mintClaimId hashes).
      const have = claims.find((k) => k.claim_id === claim_id);
      if (have) {
        for (const r of c.refs ?? []) if (!have.refs.includes(r)) have.refs.push(r);
        for (const sp of spans) if (!have.spans.some((x) => x.ref === sp.ref && x.start === sp.start && x.end === sp.end)) have.spans.push(sp);
        continue;
      }
      claims.push({ claim_id, end1: c.end1, label: c.label, end2: c.end2, verdict: c.verdict, polarity: c.polarity ?? "+", refs: [...(c.refs ?? [])], spans });
    }
  }
  claims.sort((a, b) => a.claim_id.localeCompare(b.claim_id));
  // Standing, as the ledger block ranks it (holon.js ledgerBlock, P84):
  // every note ranked by shared vocabulary with the question, standing as
  // the tiebreak, five lines, split corroborated / single, standing said.
  const notes = O.hl.foldWithStanding(reading.log);
  const questionFeatures = (text) => new Set([...O.textFeatures(text)].filter((w) => !O.CLAIM_STOPWORDS.has(w)));
  const ranked = O.proposeCandidates(notes, q.question, { limit: notes.length, featuresOfSource: questionFeatures })
    .filter((c) => c.shared > 0)
    .sort((a, b) => b.shared - a.shared || (b.note.sources ?? 0) - (a.note.sources ?? 0))
    .slice(0, 5)
    .map((c) => ({ id: c.note.id, end1: c.note.subject, label: c.note.verb, end2: c.note.object, sources: c.note.sources, instruments: c.note.instruments, standing: c.note.standing, disputedBy: c.note.disputedBy ?? [], phrase: (c.note.sources ?? 0) >= 2 ? `read in ${c.note.sources} places` : "stated once so far, nowhere else yet" }));
  const derived = O.D.foldDerived(reading.log).map((d) => ({ id: d.id, end1: d.subject, label: d.verb, end2: d.object, premises: d.premises, depth: d.depth, giver: d.giver, restsOn: d.restsOn ?? null }));
  const contests = [...O.hl.disputesOf(reading.log).entries()].map(([noteId, ds]) => ({ noteId, disputes: ds.map((d) => ({ id: d.id, source: d.source, kind: d.kind ?? null, span: d.span ?? null })) }));
  return {
    question: q.question,
    retrieved: chunks.map((c) => c.ref),
    unread: reading.passages.filter((p) => !chunks.includes(p)).map((p) => p.ref),
    claims, standing: ranked, derived, contests,
    frame: O.frame, recipe: O.recipe,
    sources: Object.entries(corpus).map(([name, text]) => ({ name, sha256: sha(text), bytes: text.length })),
    constitutions: constitutionIdentity(),
    declarations: O.decl.foldDeclarations(declarations).given.map((g) => ({ rel: g.rel, kind: g.declKind, giver: g.giver })),
  };
}

// ── THE ASSAY ────────────────────────────────────────────────────────────
/**
 * @returns {Promise<{lines:string[], walls:Array<{n:string,name:string,ok:boolean,detail:string,mechanism?:string}>, records:object[], numbers:object}>}
 */
export async function runProductAssay({ corpus = CORPUS } = {}) {
  const O = await organs();
  const lines = [];
  const walls = [];
  const say = (s) => lines.push(s);
  const wall = (n, name, ok, detail, mechanism = null) => { walls.push({ n, name, ok: Boolean(ok), detail, ...(mechanism ? { mechanism } : {}) }); say(`  wall ${n} ${name.padEnd(18)} ${ok ? "held ✓" : "BREACHED ✗"}  ${detail}${mechanism ? `\n      mechanism: ${mechanism}` : ""}`); };
  const numbers = {};

  say("── THE PRODUCT ASSAY: one record per question, before any mouth speaks ──\n");
  say(`reader recipe ${O.recipe.slice(0, 12)} · organs ${Object.keys(O.frame.organs).length} · levers ${stable(O.frame.levers)} · omitted ${O.frame.omitted.join(", ")}`);
  const consts = constitutionIdentity();
  for (const c of consts) say(`constitution ${c.name}: ${c.resolved ? c.sha256.slice(0, 12) : `UNRESOLVED (${c.gap.type})`}`);
  wall("0", "configuration", Object.keys(O.frame.organs).length > 0 && typeof O.recipe === "string" && consts.every((c) => c.resolved || c.gap?.type === "constitution_unresolved"),
    `frame derived from the reader's own options; recipe minted; constitutions ${consts.filter((c) => c.resolved).length}/${consts.length} resolved by content, the rest typed`);

  // 1. read on arrival
  const reading = readCorpus(O, corpus);
  const notes = O.hl.foldWithStanding(reading.log);
  numbers.passages = reading.passages.length; numbers.notes = notes.length;
  const cutsHeard = O.hl.foldCuts ? O.hl.foldCuts(reading.log) : [];
  say(`\n1. READ ON ARRIVAL — ${reading.passages.length} passage(s), ${notes.length} link(s) and ${cutsHeard.length} cut(s) on the ledger before any question`);
  for (const n of notes) say(`     ${n.subject} —${n.verb}→ ${n.object}  · sources ${n.sources} · ${n.standing}`);

  // 2. the giver, declared; 3. derivation with fragility carried
  let declarations = O.decl.createDeclarationLog();
  const proposed = O.decl.proposeCandidate(declarations, { kind: "transitive", rel: "preceded", acquisition: "declared", source: "product-assay corpus (built)" });
  declarations = proposed.log;
  const promoted = O.decl.promote(declarations, proposed.id, { giver: GIVER });
  declarations = promoted.log;
  const noGiver = O.D.derive(reading.log, { declarations: O.decl.createDeclarationLog(), floor: { sources: 1, instruments: 0 }, carry: true, maxSteps: 4 });
  const dv = O.D.derive(reading.log, { declarations, floor: { sources: 1, instruments: 0 }, carry: true, maxSteps: 4 });
  reading.log = dv.log;
  const derived = O.D.foldDerived(reading.log);
  numbers.derived = derived.length; numbers.derivedWithoutGiver = noGiver.derived.length;
  const implied = derived.find((d) => /rowan vale/i.test(d.subject) && /owen blythe/i.test(d.object));
  say(`\n2. DERIVATION — giver declared for "preceded" (transitive); ${derived.length} derived, ${noGiver.derived.length} without a giver`);
  for (const d of derived) say(`     ${d.subject} —${d.verb}→ ${d.object}  · depth ${d.depth} · premises ${d.premises.length} · restsOn ${stable(d.restsOn ?? null)}`);
  wall("3", "derivation", Boolean(implied) && noGiver.derived.length === 0 && (implied?.restsOn?.sources ?? 0) === 1,
    implied ? `Rowan Vale —${implied.verb}→ Owen Blythe is derived, never stated, resting on ${implied.premises.length} premises, weakest at ${implied.restsOn?.sources ?? "?"} source(s); no giver → ${noGiver.derived.length}` : "the never-stated consequence was NOT derived");

  // 4. contest — the spine the app runs (crownTestimony), mechanical
  const disputedQ = QUESTIONS.find((q) => q.id === "disputed");
  const claimText = `${disputedQ.expects.end1} ${disputedQ.expects.label} ${disputedQ.expects.end2}`;
  const claimId = await O.grid.mintClaimId({ subject: disputedQ.expects.end1, verb: disputedQ.expects.label, object: disputedQ.expects.end2 });
  let gridLog = O.grid.createLog();
  for (const name of Object.keys(corpus)) {
    const out = O.landAct(O.grid, gridLog, `evaluate "${claimText}" at Link from differentiate ground "${name}" broken:rotation`, { sources: corpus, runCapacity: O.runCapacity, claimId });
    if (out.ok && out.event?.ground === name) gridLog = out.log;
  }
  const readings = O.perSourceReadings(O.grid, gridLog, claimId);
  const merged = O.mergeTestimony(readings);
  numbers.testimony = { case: merged.case, verdicts: readings.map((r) => [r.who, r.verdict]) };
  say(`\n4. TESTIMONY — "${claimText}" evaluated per source: ${readings.map((r) => `${r.who}:${r.verdict}`).join(", ")} → ${merged.case}`);
  wall("4a", "contest-detected", merged.case === "DISAGREE",
    `the per-source spine reads ${merged.case}; northgate-b says "never opened in 1889" in its own bytes`,
    merged.case === "DISAGREE" ? null : "a negated statement never yields a `contradicted` verdict under the production configuration: `negationBeforeVerbFor` reads \"did not X\" as act `did` with the negation leading the object (P43), and DR5 (`phrasalPredicates`) folds \"never X\" into the act itself, so the draft's act `opened` never meets the source's `never opened` — the reader answers unbound/unheard, and mergeTestimony cannot see a refusal it was never handed");
  // The record's contest machinery, exercised from the denying source's OWN
  // bytes — what a witness that could read the negation would hand the act.
  const textAt = (at) => { const m = String(at).match(/^(.+?)#(\d+)-(\d+)$/); return m ? String(corpus[m[1]] ?? "").slice(Number(m[2]), Number(m[3])) : null; };
  const denial = { name: "northgate-b.txt", sentence: "The Northgate Observatory never opened in 1889." };
  const start = String(corpus[denial.name]).indexOf(denial.sentence);
  const at = `${denial.name}#${start}-${start + denial.sentence.length}`;
  const target = notes.find((n) => /northgate observatory/i.test(n.subject) && n.verb === "opened");
  const before = stable(O.hl.foldWithStanding(reading.log).map(({ disputedBy, ...n }) => n));
  // Since S69 the cut ("never opened in 1889") entered the ledger as a SEG
  // note of its own and the door landed the contest against the link when
  // the two met. `landContest` from the spine's DISAGREE then finds the
  // dispute already on the record (a repeat is the act's own no-op) — both
  // routes to one contest, never two.
  const atDoor = O.hl.disputesOf(reading.log).size;
  const cuts = O.hl.foldCuts(reading.log);
  const landed = O.landContest(reading.log, O.hl, { case: "DISAGREE", holds: [], refused: [{ who: denial.name, read: [at], verdict: "refused", edges: target ? [{ subject: target.subject, verb: target.verb, object: target.object }] : [] }] }, { textAt });
  reading.log = landed.log;
  const after = stable(O.hl.foldWithStanding(reading.log).map(({ disputedBy, ...n }) => n));
  const disputes = O.hl.disputesOf(reading.log);
  const premisesNow = O.D.derive(reading.log, { declarations, floor: { sources: 1, instruments: 0 }, carry: true, maxSteps: 4 });
  numbers.contests = { landed: disputes.size, atDoor, cuts: cuts.length, viaSpine: landed.landed.length, refusals: landed.refusals, leak: before === after };
  numbers.cuts = cuts.length;
  say(`   CONTEST — ${atDoor} landed at the door when the cut met its link (${cuts.length} cut(s) on their own fold); the spine's DISAGREE landed ${landed.landed.length} more (a repeat is a no-op); refusals ${stable(landed.refusals)}; standing byte-identical across the acts: ${before === after}`);
  wall("4b", "contest-recorded", disputes.size === 1 && atDoor === 1 && cuts.length === 1 && before === after && (premisesNow.contested ?? []).length === 1 && textAt(at) === denial.sentence && landed.refusals.not_a_contest === 0,
    `1 CON·Figure·CONTESTED on the record, kind contest, decider = the denying source's own bytes, landed at the door and not doubled by the spine; the cut is a SEG note apart from the link it denies; leak assay holds (no standing moved); derivation reports the contested premise, never withholds it`);

  // 5. the records, per question — twice, for determinism
  const buildAll = async (c, r) => { const out = []; for (const q of QUESTIONS) out.push(await answerRecord(O, r, c, q, { declarations })); return out; };
  const records = await buildAll(corpus, reading);
  const again = await buildAll(corpus, reading);
  const shuffledReading = readCorpus(O, CORPUS_SHUFFLED);
  const shuffled = await buildAll(CORPUS_SHUFFLED, shuffledReading);
  const claimSet = (rs) => stable(rs.map((r) => r.claims.map((c) => [c.claim_id, c.verdict]).sort()));
  const idsOf = (rs) => new Set(rs.flatMap((r) => r.claims.map((c) => c.claim_id)));
  const realIds = idsOf(records), shuffledIds = idsOf(shuffled);
  const sharedIds = [...realIds].filter((id) => shuffledIds.has(id)).length;
  numbers.claims = records.map((r) => r.claims.length);
  say(`\n5. ANSWER RECORDS — ${records.map((r) => `${r.retrieved.length} passage(s) → ${r.claims.length} claim(s)`).join(" · ")}`);
  for (const r of records) {
    say(`   Q: ${r.question}`);
    for (const c of r.claims) say(`      claim ${c.claim_id.slice(0, 10)} ${c.end1} —${c.label}→ ${c.end2}  · spans ${c.spans.length} (${c.spans.filter((s) => s.verified.ok).length} self-verify)`);
    for (const s of r.standing) say(`      ledger  ${s.end1} —${s.label}→ ${s.end2}  · ${s.phrase}${s.disputedBy.length ? ` · DISPUTED by ${s.disputedBy.map((d) => d.source ?? d).join(", ")}` : ""}`);
    for (const d of r.derived) say(`      derived ${d.end1} —${d.label}→ ${d.end2}  · rests on ${d.premises.length} premise(s)`);
  }
  const allSpans = records.flatMap((r) => r.claims.flatMap((c) => c.spans));
  wall("1", "addressed", allSpans.length > 0 && allSpans.every((s) => s.verified.ok),
    `${allSpans.filter((s) => s.verified.ok).length}/${allSpans.length} claim spans resolve to the source's exact bytes (${[...new Set(allSpans.map((s) => s.verified.frame))].join("/")} coordinates)`);
  const stated = records.find((r) => r.question === QUESTIONS[0].question);
  const founded = stated?.standing.find((s) => /amelia hartley/i.test(s.end1) && s.label === "founded");
  const repaired = notes.find((n) => /owen blythe/i.test(n.subject) && n.verb === "repaired");
  wall("2", "stated-once", Boolean(founded) && founded.sources === 1 && /stated once/.test(founded.phrase) && (repaired?.sources ?? 0) === 2,
    founded ? `"${founded.end1} ${founded.label} ${founded.end2}" reaches the record at ${founded.sources} source, phrased "${founded.phrase}"; the repair note sits beside it at ${repaired?.sources ?? 0} sources` : "the stated-once note did not reach the record");
  const implRec = records.find((r) => r.question === QUESTIONS[1].question);
  wall("3b", "derived-in-record", Boolean(implRec?.derived.some((d) => /rowan vale/i.test(d.end1) && /owen blythe/i.test(d.end2))),
    `the implied question's record carries the derived fact with its premises`);
  const dispRec = records.find((r) => r.question === QUESTIONS[2].question);
  wall("4c", "contest-in-record", dispRec.contests.length === 1 && dispRec.standing.some((s) => s.disputedBy.length > 0),
    `the disputed question's record carries the open contest and the disputed note says so`);
  wall("5", "deterministic", stable(records) === stable(again) && claimSet(records) !== claimSet(shuffled),
    `two builds byte-identical; the object-deranged corpus yields a different claim set — ${realIds.size} real claim ids, ${shuffledIds.size} deranged, ${sharedIds} shared`);
  numbers.shuffle = { real: realIds.size, deranged: shuffledIds.size, shared: sharedIds };

  // 6. fabrications at the reader
  const checker = O.relationsFor(reading.passages, { pool: reading.passages });
  const fab = FABRICATIONS.map((s) => { const cs = checker.read(s)?.claims ?? []; return { sentence: s, verdicts: cs.map((c) => `${c.verdict}: ${c.end1}|${c.label}|${c.end2}`), bound: cs.some((c) => c.verdict === "bound") }; });
  numbers.fabricationsBound = fab.filter((f) => f.bound).length;
  say(`\n6. FABRICATIONS at the reader — ${fab.filter((f) => f.bound).length}/${fab.length} bound`);
  for (const f of fab) say(`     ${f.bound ? "✗ BOUND  " : "· refused"} ${JSON.stringify(f.sentence)} → ${f.verdicts.join("; ") || "no claim"}`);
  wall("6", "fabrication", fab.every((f) => !f.bound),
    `${fab.filter((f) => !f.bound).length}/${fab.length} fabricated drafts refused`,
    fab.every((f) => !f.bound) ? null : "below `CORPUS_MINIMUM` the object match is `tokensShare` — one shared token binds (hypergraph.js's own disclosed fallback): \"the Royal Society in 1887\" binds to \"the Northgate Observatory in 1887\" on `in 1887`. A live turn's retrieved passages are always sub-floor, so a mouth that keeps the subject, the act and one object token is marked material-ground");
  wall("7", "derived-not-material", !fab.find((f) => /Rowan Vale preceded Owen Blythe/.test(f.sentence)).bound && Boolean(implied),
    `the derived-only statement is refused at the reader and present in the derivation — two grounds, never alike`);

  // 7. recourse: concede the weakest premise, the tower falls, history whole
  const premiseId = implied?.premises?.[0] ?? null;
  const exposure = premiseId ? O.D.exposure(reading.log, premiseId) : { withdrawn: [] };
  const conceded = premiseId ? O.D.concedePremise(reading.log, premiseId, { trigger: "product-assay: the user withdraws the premise" }) : { refused: "no premise", withdrawn: [] };
  const afterConcession = premiseId ? O.D.foldDerived(conceded.log) : [];
  numbers.concession = { exposed: exposure.withdrawn.length, withdrawn: conceded.withdrawn?.length ?? 0, entriesBefore: reading.log.entries.length, entriesAfter: conceded.log?.entries?.length ?? null };
  say(`\n7. RECOURSE — exposure of ${premiseId?.slice(0, 24) ?? "?"}: ${exposure.withdrawn.length} would fall; conceded: ${conceded.withdrawn?.length ?? 0} withdrawn; ledger entries ${reading.log.entries.length} → ${conceded.log?.entries?.length ?? "?"} (append-only: nothing removed)`);
  wall("8", "recourse", Boolean(premiseId) && exposure.withdrawn.length >= 1 && !conceded.refused && conceded.withdrawn.length === exposure.withdrawn.length && !afterConcession.some((d) => d.id === implied.id) && (conceded.log.entries.length > reading.log.entries.length),
    `exposure named ${exposure.withdrawn.length} product(s) before the act; conceding withdrew exactly those; the derived fact is gone from the fold and the record grew, never shrank`);

  // 8. the void, through time (S70 / THE-NULL-STATES DEF·Ground): a declared
  // emptiness over an extent WITH its scope, before any mouth speaks; ONE
  // arrival re-zeros it at the door; the timeline reads both events. The
  // control built to fail: a void with no scope is refused; a void over an
  // extent the reader has not finished is a fact about the reader
  // (`reached: false`), never a finding about the material.
  const base = conceded.log ?? reading.log;
  const ARRIVAL = { "northgate-c.txt": "The Northgate Observatory closed in 1950." };
  const noScope = O.hl.declareVoid(base, { end1: "the Northgate Observatory", label: "closed" });
  const unread = O.hl.declareVoid(base, { end1: "the Northgate Observatory", label: "closed", scope: { sources: Object.keys(corpus), read: 1, total: reading.passages.length } });
  const declared = O.hl.declareVoid(base, { end1: "the Northgate Observatory", label: "closed", scope: { sources: Object.keys(corpus), read: reading.passages.length, total: reading.passages.length }, because: "the question asks when it closed; nothing read states it" });
  const openVoids = declared.refused ? [] : O.hl.foldVoids(declared.log);
  let filledLog = declared.log ?? base, rezeroed = [];
  if (!declared.refused) {
    const arrival = readCorpus(O, ARRIVAL);
    for (const p of arrival.passages) {
      const claims = arrival.rel.read(String(p.text ?? ""))?.claims ?? [];
      const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, polarity: c.polarity ?? "+", spans: c.spans ?? [] }));
      const r = O.hl.admit(filledLog, edges, { witness: `${p.ref}~${O.recipe}`, classifyConnector: null });
      filledLog = r.log; rezeroed.push(...(r.rezeroed ?? []));
    }
  }
  const timeline = declared.refused ? null : O.hl.voidTimeline(filledLog, declared.id);
  numbers.void = { noScopeRefused: noScope.refused?.type ?? null, unreadReached: unread.refused ? null : O.hl.foldVoids(unread.log)[0]?.reached ?? null, declared: openVoids.length, reached: openVoids[0]?.reached ?? null, rezeroed: rezeroed.length, liveAfter: O.hl.foldVoids(filledLog).filter((v) => v.id === declared.id).length, timeline: timeline?.events.map((e) => e.act) ?? [], standing: timeline?.standing ?? null };
  say(`\n8. THE VOID — declared over ${Object.keys(corpus).length} source(s), ${reading.passages.length} of ${reading.passages.length} passages read (reached: ${numbers.void.reached}); no-scope declaration refused: ${numbers.void.noScopeRefused}; unread-extent declaration reads reached=${numbers.void.unreadReached}; one arrival ("${ARRIVAL["northgate-c.txt"]}") re-zeroed ${rezeroed.length}; timeline ${numbers.void.timeline.join(" → ")}; standing ${numbers.void.standing}`);
  wall("9", "void-through-time", numbers.void.noScopeRefused === "no_scope" && numbers.void.unreadReached === false && numbers.void.declared === 1 && numbers.void.reached === true && numbers.void.rezeroed === 1 && numbers.void.liveAfter === 0 && numbers.void.timeline.join(",") === "declared,filled" && numbers.void.standing === "filled",
    `a void names its scope or is refused; an unfinished read is a fact about the reader; the void stood open before the mouth and ONE arrival re-zeroed it at the door; the timeline holds both events with their seqs`);

  return { lines, walls, records, numbers, log: filledLog };
}
