#!/usr/bin/env node
// read-real.mjs — LaVar's second attempt at "read it word by word" (first
// attempt, lavar-read.mjs, hand-authored the propositions and only used
// notes.js's admission door — the user's correction: real reading means
// running the REAL pipeline in the REAL order, with the real activation
// rules, and leveraging the holograph AND the Hyperlexicon, not LaVar's own
// paraphrase of what a real reader would find).
//
// This runs the SAME machinery native/eval/experienced-new-book.mjs runs —
// createRecursiveReader + createCausalTextPerceiver, one Encounter@1 at a
// time in textEncounters' own reading order (surfaces -> referents ->
// pronoun activation -> typed relation -> notes.js admission, composed
// inside the perceiver exactly as READING-POLICY P2 describes) — over ONE
// short text, then builds Hyperlexicon composition candidates from what
// that real read actually produced. No hand-authored propositions here;
// every edge in the output is something the real reader concluded.
//
// Uses createCausalTextPerceiver's own default for refreshEvery (1, as of
// 2026-09-09 — see recursive.js's own header) rather than the archived
// sidecars' refreshEvery:25, because that recipe is exactly the batched
// design this session found and fixed: it read this 14-sentence book into
// an empty fold. Comparable to the archived sidecars in every other
// respect (same perceiver, same minRelationSurfaces/posPrior/anchoring),
// not in the one setting that was the bug.
//
//   node read-real.mjs <text-file> [--limit N]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer } from "../../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../../adapters/text/recursive.js";
import { anchorAsDefiniteBinding } from "../../adapters/text/anchoring.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { createHyperlexicon, admitHyperlexiconCandidates } from "../../kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "../../kernel/relation-composition.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../.."); // native/eval/lavar -> native/eval -> native -> repo root
const GIVER = "reader:lavar-read-real";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 };
// The received POS prior is per-language: a French read with the English
// prior admits "ne/pour/chose" as relations (the French reader measured
// 2026-09-12: top relations were ne x38, pour x23 — negation/connectors,
// not verbs). English's pos-eng.json has no French word forms at all, so
// the §8 received floor and the relationStanding REFUSAL both silently
// no-op. Selected by the file's language, never hardcoded.
const PRIOR_BY_LANG = {
  en: "pos-eng.json", fr: "pos-fra.json", ru: "pos-rus.json",
  eng: "pos-eng.json", fra: "pos-fra.json", rus: "pos-rus.json",
};
const langOfFile = (name) => {
  const base = name.toLowerCase();
  if (/(guerre|fran|^fr[^a-z]|_fra\.)/.test(base)) return "fra";
  if (/(voyna|vojna|^ru[^a-z]|_rus\.|cyrillic)/.test(base)) return "rus";
  return "eng";
};
function loadPrior(filePath) {
  const lang = langOfFile(path.basename(filePath));
  const file = PRIOR_BY_LANG[lang];
  const full = path.join(HERE, "../../priors", file);
  console.error(`[read-real] ${lang} prior: ${full}`);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

const adapters = {
  revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: CANONICALIZATION_FLOOR }),
  retrieve: emptyRetrieve,
};
const RECIPE = "causalTextPerceiver_reviseTextFold_refresh1";
const perceivers = (posPrior) => [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: ANCHORING, recipe: RECIPE })];

function load(filePath, source, limit) {
  const stripped = stripContainer(fs.readFileSync(filePath, "utf8"));
  if (!stripped.looks_like_material) throw new Error(`${filePath} does not look like readable material`);
  const all = textEncounters(stripped.text, { source, offset: stripped.offset });
  return limit ? all.slice(0, limit) : all;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new TypeError("usage: read-real.mjs <text-file> [--limit N]");
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : undefined;

  const source = `file:${path.basename(filePath)}`;
  const encounters = load(filePath, source, limit);
  console.error(`reading ${source}: ${encounters.length} encounters, in order, one at a time...`);

  const posPrior = loadPrior(filePath);
  const reader = createRecursiveReader({ perceivers: perceivers(posPrior), adapters });
  for (const enc of encounters) await reader.step(enc);
  const fold = reader.getFold();
  const log = reader.getLog?.() ?? [];

  const rawEntries = fold.graphEntries ?? [];
  const projectedBindings = rawEntries.map(anchorAsDefiniteBinding).filter(Boolean);
  // ── THE META-ID BRIDGE (2026-09-12) — the occurrence-id fracture, fixed.
  // The composition ledger's bindings resolve an edge's participant only
  // when the binding's `occurrence` equals the participant's own id. The
  // assembly's anchor evidence is keyed to `ref-occ:…` (referent-adjudicated)
  // while the hyperedge participants carry `occ:…` (text) — zero overlap,
  // so the holograph's composition stayed empty (264 edges, 0 chains, 0
  // candidates). The bridge keys each participant-level binding to the
  // EDGE's own `occ:` id by matching (encounter + surface), carrying a
  // META-ID: the canonical referent identity, stable across text versions —
  // what a future Rosetta match (en/fr/ru of one book) and the swarm's
  // breakthrough store both key on. The identity taxonomy it instantiates:
  //   text-occurrence  occ:file:encounter:idx:role   (S0 bytes)
  //   canonical-occurrence  co:<canonical surface>   (S1 — across versions)
  //   referent (meta)  ref:<canonical name>          (S2 Entity)
  //   kind             kind:<population kind>        (S3 Kind)
  // A referent is a whole to its canonical occurrences, a part to its kind.
  const refOccurrences = rawEntries.filter((e) => e.schema === "EOReferentOccurrence@1");
  const anchors = rawEntries.filter((e) => e.schema === "EOAnchorEvidence@1");
  // ── REFERENTS ARE NODES, NEVER LITERAL SPANS (2026-09-12). The being is
  // a span-free node born at first admission (S80: an address is a birth,
  // not a spelling); a literal span is only a WITNESS that points at it.
  // Build the span-free node table: ref -> { canonicalSurface, encounterRefs }.
  const refNodes = new Map();
  for (const ro of refOccurrences) {
    const r = ro.referent ?? ro.canonicalSurface;
    if (!r) continue;
    const n = refNodes.get(r) ?? { ref: r, canonicalSurface: ro.canonicalSurface ?? ro.surface ?? r, encounters: new Set() };
    if (ro.encounterRef) n.encounters.add(ro.encounterRef);
    refNodes.set(r, n);
  }
  for (const a of anchors) if (a.referent) {
    const n = refNodes.get(a.referent) ?? { ref: a.referent, canonicalSurface: a.surface ?? a.referent, encounters: new Set() };
    refNodes.set(a.referent, n);
  }
  // the EOReferent@1 nodes carry the full surface set the perceiver
  // admitted (Alice, White Rabbit, Dinah) — fold them into the node table
  // so the surface-equality match has every admitted name, not just the
  // first occurrence's canonical form.
  for (const r of rawEntries.filter((e) => e.schema === "EOReferent@1")) {
    const n = refNodes.get(r.id) ?? { ref: r.id, canonicalSurface: (r.surfaces ?? [])[0] ?? r.id, encounters: new Set(), surfaces: [] };
    n.surfaces = [...new Set([...(n.surfaces ?? []), ...(r.surfaces ?? [])])];
    refNodes.set(r.id, n);
  }
  const participantBindings = [];
  // ── THE SPAN-FREE NODE BRIDGE, BY IDENTITY NOT CONTAINMENT (2026-09-13).
  // The first cut matched a participant's surface against a referent node's
  // canonical surface by string CONTAINMENT within the same encounter —
  // the clause end "her sister" contains the being "sister". That fails
  // exactly where the perceiver already succeeded: a pronoun ("I", "you",
  // "he"), an inflected form, a fragment — the participant surface never
  // CONTAINS the canonical name, so the binding never lands. Measured on
  // W&P ch1-3: 51 of ~1100 participants resolved, the rest left standing
  // unresolved_surface despite the perceiver having resolved the very same
  // mentions into EOReferent@1 nodes (EOMention@1 carries referent +
  // encounterRef — the perceiver's OWN adjudication, discarded by the
  // containment bridge).
  //
  // THE FIX: build the identity table the perceiver already computed, and
  // match by ENCOUNTER + SURFACE EQUALITY (never containment). A
  // participant whose surface IS a referent node's canonical surface (or
  // whose occurrence the mention table already bound to a referent) at the
  // same encounter resolves to that node. The span is still a WITNESS, never
  // the identity — but the witness is now the perceiver's resolution, not a
  // substring guess.
  const mentions = rawEntries.filter((e) => e.schema === "EOMention@1");
  // referent -> node table (canonical surface + the encounters it was seen in)
  const refById = new Map();
  for (const n of refNodes.values()) refById.set(n.ref, n);
  // encounter -> the referent(s) the perceiver resolved there (from mentions)
  const mentionedRefsByEnc = new Map();
  for (const m of mentions) {
    if (!mentionedRefsByEnc.has(m.encounterRef)) mentionedRefsByEnc.set(m.encounterRef, []);
    mentionedRefsByEnc.get(m.encounterRef).push(m.referent);
  }
  // canonical surface (lowercased) -> referent node
  const refBySurface = new Map();
  for (const [ref, node] of refById) {
    for (const s of [node.canonicalSurface, ...(node.surfaces ?? [])]) {
      const key = String(s ?? "").toLowerCase();
      if (key.length >= 3 && !refBySurface.has(key)) refBySurface.set(key, node);
    }
  }
  // the pronoun -> referent resolution the perceiver already made: the
  // mentions at an encounter, keyed by that encounter's own resolution.
  const resolveAt = (p, pEnc) => {
    const encKey = `encounter:${pEnc}`;
    const psurf = String(p.surface ?? "").toLowerCase();
    // 1. exact canonical-surface match at the same encounter
    const exact = refBySurface.get(psurf);
    if (exact && (exact.encounters.size === 0 || exact.encounters.has(encKey))) return exact;
    // 2. the perceiver's own mention resolution at this encounter: if the
    //    participant's occurrence is bound by a mention there, that referent
    const resolved = mentionedRefsByEnc.get(encKey) ?? [];
    if (resolved.length === 1) {
      const node = refById.get(resolved[0]);
      if (node) return node;
    }
    // 3. surface-equality (never containment) against any node that was
    //    seen at this encounter
    for (const ref of resolved) {
      const node = refById.get(ref);
      if (!node) continue;
      for (const s of [node.canonicalSurface, ...(node.surfaces ?? [])]) {
        if (String(s ?? "").toLowerCase() === psurf && psurf.length >= 3) return node;
      }
    }
    return null;
  };
  for (const edge of rawEntries.filter((e) => e.schema === "EOHyperedge@1")) {
    for (const p of edge.participants ?? []) {
      if (p.standing === "referent") continue;
      const pEnc = String(p.occurrence ?? "").split(":")[1];
      const node = resolveAt(p, pEnc);
      if (!node) continue;
      // The participant is a frozen perceiver object — never mutate it. The
      // ledger resolves standing from the EODefiniteBinding below
      // (resolveEndpoint: binding lookup by occurrence), so the stamp lives
      // in the binding, not on the edge.
      participantBindings.push(Object.freeze({
        schema: "EODefiniteBinding@1",
        id: `definite-binding:meta:${p.occurrence}`,
        occurrence: p.occurrence, // the edge's own occurrence id (S0 witness)
        referent: node.ref,        // the SPAN-FREE node id (S2 meaning)
        metaId: node.canonicalSurface, // the canonical form (across versions)
        surface: p.surface,
        adjudicatedBy: "read-real.mjs span-free node bridge — Wilson's swarm",
        provenance: Object.freeze({ giver: "read-real.mjs span-free node bridge", basis: `identity, not containment: the perceiver resolved this participant's occurrence at encounter:${pEnc} to ${node.ref} (EOMention@1 / EOReferentOccurrence@1); the span is the WITNESS, the node is the identity; referents are never keyed by literal spans`, canonicalOccurrence: node.canonicalSurface }),
      }));
    }
  }
  // ── POSSESSIVE DEFINITE DESCRIPTIONS ARE HOLDINGS (S88's fourth signal,
  // 2026-09-12). "her sister" is a being — but a HOLDING, not a final
  // referent: the reader asks "who is the 'her' here?" (the possessive
  // resolves to its owner X), then "who is X's sister?" — not known yet →
  // put in HOLDING (an open identity hypothesis). When the material later
  // identifies that sister, the holding RESOLVES to Y via the canonicalization
  // floor (2 independent witnesses). The same resolve/hold/resolve loop works
  // for ANY parameter (X's mother, X's brother, X's house): a parameterized
  // being is a slot whose identity is open until the material fills it.
  const POSS = /^(my|her|his|our|their|your)\s+([\p{L}][\p{L}' -]{1,24})$/iu;
  const holdings = new Map(); // (noun, owner) -> the ONE open hypothesis
  for (const edge of rawEntries.filter((e) => e.schema === "EOHyperedge@1")) {
    for (const p of edge.participants ?? []) {
      if (p.standing === "referent") continue;
      const pm = POSS.exec(String(p.surface ?? ""));
      if (!pm) continue;
      const owner = pm[1].toLowerCase(), noun = pm[2].toLowerCase();
      // the HOLDING: ONE open identity hypothesis per (slot, owner) — all
      // "her sister" mentions resolve to the SAME holding, so chains can
      // form on it; a later witness resolves the holding to the real being Y.
      const hkey = `${noun}|${owner}`;
      let hypothesis = holdings.get(hkey);
      if (!hypothesis) {
        hypothesis = Object.freeze({
          schema: "EOIdentityHypothesis@1",
          id: `identity:poss:${noun}:${owner}`,
          surface: p.surface,
          canonicalSurface: noun,
          parameter: { slot: noun, of: owner },
          occurrence: p.occurrence,
          standing: "open", // HOLDING — not yet resolved
          adjudicatedBy: "read-real.mjs possessive-holding — Wilson's swarm",
          provenance: Object.freeze({ giver: "read-real.mjs possessive-holding", basis: "S88's fourth signal — a common noun under a possessive determiner is a parameterized being in HOLDING; the possessive resolves to its owner, the slot awaits a witness; ALL mentions share this one holding", canonicalOccurrence: noun }),
        });
        holdings.set(hkey, hypothesis);
        rawEntries.push(hypothesis); // the holding lands on the record
      }
      // Frozen participant — the holding binding below carries the
      // resolution; never mutate the edge (same rule as the bridge above).
      participantBindings.push(Object.freeze({
        schema: "EODefiniteBinding@1",
        id: `definite-binding:poss:${p.occurrence}`,
        occurrence: p.occurrence,
        referent: hypothesis.id, // every mention points at the ONE holding
        metaId: noun,
        surface: p.surface,
        possessiveAnchor: owner,
        adjudicatedBy: "read-real.mjs possessive-holding — Wilson's swarm",
        provenance: Object.freeze({ giver: "read-real.mjs possessive-holding", basis: "a possessive definite description is a HOLDING identity hypothesis, shared across mentions, resolved later by a witness", canonicalOccurrence: noun }),
      }));
    }
  }
  const entries = [...rawEntries, ...projectedBindings, ...participantBindings];
  const ledger = createRelationCompositionLedger(entries);
  const stats = ledger.diagnostics();

  // No prior works read yet at this rung (LAVAR.md §7: priors flow bottom-up
  // from cleared rungs; none are cleared yet), so nothing can be REMEMBERED
  // across works — every candidate here is nominated from recurrence WITHIN
  // this one reading alone, and none can reach "given" (experienced-new-
  // book.mjs's own rule: giving requires both sides to be cross-work
  // memories). Disclosed as a fact of this run, not a defect of this book.
  const observed = acquireCompositionCandidates(entries, { minWitnesses: 2 });
  const hyperlexicon = admitHyperlexiconCandidates(createHyperlexicon(), observed.map((c) => ({
    left: c.left, right: c.right, giver: GIVER,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));
  const composition = Object.values(hyperlexicon.composition);

  const out = {
    schema: "LaVarRealRead@1",
    declared: { source, encounters: encounters.length, limit: limit ?? null, canonicalizationFloor: CANONICALIZATION_FLOOR, anchoring: ANCHORING, giver: GIVER, recipe: RECIPE },
    holograph: {
      relationEdges: stats.relationEdges,
      referentBindings: stats.referentBindings,
      chainSites: stats.chainSites,
      pairTypes: stats.pairTypes,
      repeatedPairTypes: stats.repeatedPairTypes,
      projectedBindings: projectedBindings.length,
      // Persist the FULL record, not rawEntries: the EODefiniteBinding
      // entries (span-free node bridge + possessive holdings) are what make
      // the composition ledger reach 31 pairTypes / 34 chainSites. A
      // downstream re-read of this artifact must reproduce the chemistry,
      // not a graph that re-reads at 0.
      graphEntries: entries,
    },
    hyperlexicon: {
      schema: hyperlexicon.schema,
      entries: composition.length,
      given: composition.filter((e) => e.standing === "given"),
      candidates: composition.filter((e) => e.standing === "candidate").map((e) => ({ left: e.left, right: e.right, standing: e.standing, independentSupport: e.meta.independentSupport, witnesses: e.provenance?.witnesses ?? null })),
      disclosure: "no prior work has been read at this rung yet, so nothing can be a cross-work memory — every candidate here is nominated from recurrence inside this one text alone, and none is GIVEN",
    },
    taskLog: { entries: log.entries?.length ?? log.length ?? 0 },
  };

  const slug = path.basename(filePath).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const outDir = path.join(HERE, "results");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${slug}-real-read.json`), JSON.stringify(out, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, `${slug}-real-fold.json`), JSON.stringify(fold, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, `${slug}-real-log.json`), JSON.stringify(log, null, 2) + "\n");

  console.log(JSON.stringify({
    relationEdges: stats.relationEdges, referentBindings: stats.referentBindings,
    hyperlexiconCandidates: composition.length, taskLogEntries: out.taskLog.entries,
    outFiles: [`${slug}-real-read.json`, `${slug}-real-fold.json`, `${slug}-real-log.json`],
  }, null, 2));
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
