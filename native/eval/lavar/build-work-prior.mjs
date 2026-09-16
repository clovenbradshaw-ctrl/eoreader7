// build-work-prior.mjs — extend the cross-work memory from a bare verb
// list to the FULL FIELD: what reading one document actually earns that a
// next document can be primed with. (2026-09-13)
//
// WHY EXTEND. The old cross-work lexicon was `verbs: [...]` — a sliver.
// The experiment proved it inert (Δ = +0.0000 on W&P ch1 primed with
// Alice's verbs): the reader earns its own verbs from the material, so a
// verb list that overlaps that earns nothing. The hyperlexicon is the
// FIELD — priors, register, chemistry — and the field carries FOUR kinds
// of cross-document knowledge, each through its own door:
//
//   1. RELATION FORMS (WHICH)   — which relation labels the reading
//      actually heard as eligible verbs (compositionStanding !== false,
//      the same filter deriveExperiencePrior applies). Crosses documents
//      safely: a relation label is not a referent.
//   2. CHEMISTRY (the affordances) — which relation PAIRS composed in
//      this reading (the composition ledger's pairSupport). A next
//      reading offered this chemistry can LICENSE the same composition —
//      the one thing a bare verb list can never carry. This is the
//      Pattern-grain knowledge: refutable from a corpus, never earned
//      from one (the grain law), so the prior OFFERS candidates, never
//      licenses them — only a giver's GIVEN affordance licenses.
//   3. RHYTHM (WHEN)            — how soon a being returns after a
//      mention (rhythm-priors.js's readingGaps/deriveRhythmPrior). The
//      FORM transfers, the identity never does (S95): the next reading
//      learns "beings return ~this fast," not "Alice returns."
//   4. KINDS                    — the company signatures the reading's
//      referents kept (discoverCompanyKinds/frameWords). The KIND
//      survives the document, the member does not.
//   5. STRUCTURAL               — the grain-keyed chemistry (grain:Figure
//      ∘ grain:Figure): two Figure relations composing through a shared
//      referent bridge, licensed by the SHAPE not the label. Declared by
//      this prior's own giver, so the field itself is medium-blind — the
//      same chain shape in English, French, Russian, audio, video. This is
//      the field's own 2026-09-13 addition; a consumer that cannot see it
//      is reading the previous four doors only.
//
// THE DOOR: each carries its OWN field, no cast anywhere (S95's
// construction, not discipline: referent identity must never cross
// documents). Everything is a received prior with a named giver — a
// resource joins the received-priors tier (S99), never witness, never a
// verdict.
//
//   node build-work-prior.mjs <read-real-fold.json> <out.json> [--source=<name>] [--giver=<who>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveExperiencePrior } from "../../kernel/experience-priors.js";
import { deriveRhythmPrior } from "../../kernel/rhythm-priors.js";
import { createRelationCompositionLedger } from "../../kernel/relation-composition.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [foldPath, outPath, ...rest] = process.argv.slice(2);
const source = rest.find((a) => a.startsWith("--source="))?.replace("--source=", "") ?? path.basename(foldPath, ".json");
const giver = rest.find((a) => a.startsWith("--giver="))?.replace("--giver=", "") ?? `build-work-prior.mjs — the reading of ${source}, earned as a received prior`;
if (!foldPath || !outPath) throw new TypeError("usage: build-work-prior.mjs <read-real-fold.json> <out.json> [--source=<name>] [--giver=<who>]");

const fold = JSON.parse(fs.readFileSync(foldPath, "utf8"));
// read-real writes the full entry set (with bindings) to holograph.
// graphEntries; a raw fold carries graphEntries at the top level. Read
// both — the identity bridge's bindings live in the holograph shape.
const graphEntries = fold.graphEntries ?? fold.holograph?.graphEntries ?? [];

// THE READING SHAPE deriveExperiencePrior/deriveRhythmPrior expect: a
// completed reading with a fold of EOHyperedge@1 entries.
const reading = { fold: { graphEntries }, effectiveTerrainState: {} };

const experience = deriveExperiencePrior([{ source, reading }], { giver, id: `experience:${source}` });
const rhythm = deriveRhythmPrior([{ source, reading }], { giver, id: `rhythm:${source}` });

// CHEMISTRY: the relation PAIRS this reading composed. read-real's own
// entries carry the bindings that let the ledger form chains; the pair
// support is what a next reading could be primed with. Offered as
// CANDIDATES — a corpus can refute chemistry, never earn it (the grain
// law); only the giver's own giveHyperlexiconAffordance licenses.
const ledger = createRelationCompositionLedger(graphEntries);
const diag = ledger.diagnostics();
const chemistry = (diag.topPairs ?? []).slice(0, 40).map((p) => freezePair(p));

// KINDS: the company signatures the reading's beings kept. The kind
// survives, the member doesn't. discoverCompanyKinds discovers from a
// heard stream; we feed the ledger's own surface references as the
// population.
let kinds = [];
try {
  kinds = companyKindsOf(graphEntries);
} catch {
  kinds = [];
}

const prior = {
  schema: "EOWorkPrior@1",
  giver,
  sourceDocument: source,
  fields: {
    // 1. RELATION FORMS (WHICH) — the eligible verbs, the old lexicon's
    // whole content, now one of four.
    verbs: freezeList(experience.relationVocabulary.map((r) => r.relation)),
    // 2. CHEMISTRY (affordances) — composed pairs as candidates.
    chemistry: freezeList(chemistry),
    // 3. RHYTHM (WHEN) — the return-gap form.
    rhythm: freezeObj(rhythm),
    // 4. KINDS — company signatures.
    kinds: freezeList(kinds),
    // 5. STRUCTURAL — the medium-blind affordance, declared by this prior's
    // own giver (S115's "structural affordances are GIVEN and never shadow
    // exact"). Two Figure relations composing through a shared referent
    // bridge are licensed by the chain SHAPE, never by the English label
    // pair — the invariant that crosses texts, languages, and modalities
    // (LAVAR.md 2026-09-13). Carried HERE so any consumer of the field gets
    // it, not only the measurement driver that once hardcoded it.
    structural: freezeObj({
      left: "grain:Figure", right: "grain:Figure",
      giver,
      basis: `structural chemistry — Figure relations composing through a shared referent bridge are licensed across texts and modalities, carried from ${source}; the grain is the invariant, the label is the lens`,
    }),
  },
  // THE WALL: no cast anywhere. The per-document boundary is by
  // construction (S95) — identity must never cross documents.
  cast: undefined,
  basis: "reading one document earns the FULL field — relation forms, composition chemistry, return rhythm, and kinds — each offered to the next document as a received prior with a named giver; no cast crosses, referent identity never transfers",
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(prior, null, 1) + "\n");
console.log(`WORK PRIOR · ${source} → ${path.relative(process.cwd(), outPath)}`);
console.log(`  verbs: ${prior.fields.verbs.length} eligible relation forms`);
console.log(`  chemistry: ${prior.fields.chemistry.length} composed pairs`);
console.log(`  rhythm: ${JSON.stringify(rhythm).slice(0, 120)}…`);
console.log(`  kinds: ${prior.fields.kinds.length}`);
  console.log(`  structural: ${JSON.stringify(prior.fields.structural).slice(0, 120)}…`);
console.log(`  cast: ${prior.cast === undefined ? "ABSENT (S95 — identity never crosses documents)" : prior.cast}`);
console.log(`  giver: ${giver}`);

function freezePair(p) {
  return { left: p.left, right: p.right, support: p.independentSupport ?? p.chainSites ?? 1, examples: (p.examples ?? []).slice(0, 2) };
}
function freezeList(list) { return (list ?? []).map((v) => (typeof v === "string" ? v : typeof v === "object" && v !== null ? Object.freeze({ ...v }) : v)); }
function freezeObj(obj) { return Object.freeze({ ...obj }); }
function companyKindsOf(entries) {
  // The minimal company signal a kind transfer needs: which tokens recur
  // around which referent surfaces — the SAME frameWords/discoverCompanyKinds
  // mechanism, fed from the fold's own surfaces. The kind is the signature;
  // the member is not carried.
  const mentions = new Map();
  for (const e of entries) {
    if (e.schema !== "EOMention@1") continue;
    const ref = e.referent;
    if (!ref) continue;
    if (!mentions.has(ref)) mentions.set(ref, new Set());
    const enc = e.encounterRef ?? "";
    for (const other of entries) {
      if (other.schema === "EOLexicalOccurrence@1" && (other.encounterRef ?? "") === enc) {
        const w = String(other.canonicalSurface ?? other.surface ?? "");
        if (w.length >= 4) mentions.get(ref).add(w.toLowerCase());
      }
    }
  }
  const kinds = new Map();
  for (const [, company] of mentions) {
    const sig = [...company].sort().slice(0, 6).join("|");
    if (sig.length < 6) continue;
    kinds.set(sig, (kinds.get(sig) ?? 0) + 1);
  }
  return [...kinds.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([sig, n]) => ({ signature: sig, members: n, basis: "the company this reading's beings kept — the kind survives, the member never crosses" }));
}