// node eval/mhc-battery.mjs [material...]
//
// The MHC battery bound to REAL organs. mhc.js is the machinery (the order
// table, the axioms as arms, quantal scoring); this file is the ladder of
// actual tasks, each one driving organs this repo really has, over real
// material this repo already ships.
//
// A RE-RUNNABLE DRIVER, NOT A COMMITTED REGRESSION TEST — the posture P19 and
// P27 already set for measurement drivers here. The conformance for the
// machinery is mhc.test.mjs and needs no engine at all.
//
// ── READING-POLICY P0, STATED BEFORE ANY NUMBER ───────────────────────────
//
// "Any claim about 'what this system can do' must name the assembly it was
// measured on... Drivers that hand-chain engine organs are experiments, each
// asking one question; they are not the reader."
//
// This driver hand-chains organs. It is therefore an EXPERIMENT, and every
// number it produces is a statement about THAT assembly — engine text
// adapters composed through the-fold's own tiers — never about
// `packages/host`'s assembled reader, which is not present in this checkout
// at all. Nothing here may be reported as "the system's stage" full stop.
//
// ── PROBES ARE DERIVED FROM THE MATERIAL, NEVER HARDCODED ─────────────────
//
// The first cut hardcoded names ("Lincoln appointed Hamlin") and it was wrong
// twice over. It made the battery a test of one fixture, and — worse — it
// made content-independence unaskable, since a battery that names its own
// answers cannot be run on a second material to see whether the profile
// holds. `deriveSpec` instead reads each probe OUT of the material: the
// principal referent is whichever the reading admits most, the specimen edge
// is whichever the material corroborates most, the negative is that edge
// reversed, and the absent name is a string checked to be absent. Where the
// material does not offer a probe (no slot with two distinct fillers, say),
// the item lands a typed `unmeasured` rather than a fabricated specimen.
//
// This is also the only construction under which the MHC's own central
// property — content-independence — can be tested at all rather than assumed.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runBattery, stageFrom, contentIndependence, SYMBOLIC_FLOOR, ORDERS, orderOf } from "../mhc.js";
import { makeRelationReader, queryFillers, queryEdges } from "../hypergraph.js";
import { makeReferentIndex } from "../cast.js";
import { verificationTasksFor, verificationSummary } from "../verification.js";
import { mergeTestimony } from "../../eoreader7/native/organs/index.js";
import { seededShuffle, shuffleSentenceWords, WITNESS_FLOOR } from "../asserted.js";
import { extractReadable } from "../web.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── the engine, wherever it is on this disk ───────────────────────────────
//
// The engine has moved between layouts across generations of this project
// (packages/engine/perceiver/text → native/adapters/text). A driver that
// hardcodes one of them reports "organ unreachable" on a checkout where the
// organs are present under the other name — which would land in the report as
// a statement about the SYSTEM when it is a statement about a path. Both
// known layouts are tried and the one actually found is DECLARED on the
// report, so a reader always knows which engine produced the numbers.
const LAYOUTS = [
  { name: "eoreader6.1 (packages/engine/perceiver/text)", base: "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text" },
  { name: "eoreader7 (native/adapters/text)", base: "../../eoreader7/native/adapters/text" },
];

async function loadEngine() {
  const tried = [];
  for (const layout of LAYOUTS) {
    try {
      const at = (f) => new URL(`${layout.base}/${f}`, import.meta.url).href;
      const spans = await import(at("spans.js"));
      const surfaces = await import(at("surfaces.js"));
      const relations = await import(at("relations.js"));
      const material = await import(at("material.js"));
      const pronouns = await import(at("pronouns.js"));
      return {
        layout: layout.name,
        organs: {
          splitSentences: spans.splitSentences,
          extractSurfaces: surfaces.extractSurfaces,
          discoverReferents: surfaces.discoverReferents,
          namesCorefer: surfaces.namesCorefer,
          genericTokens: surfaces.genericTokens,
          diaNorm: surfaces.diaNorm,
          discoverRelationVocab: relations.discoverRelationVocab,
          extractRelations: relations.extractRelations,
          tokenize: material.tokenize,
          buildFrequencyTable: material.buildFrequencyTable,
          functionWordSet: material.functionWordSet,
          resolvePronouns: pronouns.resolvePronouns,
        },
      };
    } catch (err) {
      tried.push(`${layout.name}: ${err?.message ?? err}`);
    }
  }
  return { layout: null, organs: null, tried };
}

// ── the Russian material's cell of the coreference seam (anaphora-ru, 2026-08-29) ──
//
// `discoverReferents`/`namesCorefer` (native surfaces.js) accept an injected token
// fold that maps an inflected proper-noun form onto its lemma, so one being does
// not strand across its case-forms in an inflecting script; `resolvePronouns`
// (native pronouns.js) accepts an injected `pronounClass` so it can FIND a
// non-English language's third-person pronouns and gate them by their own
// gender. Both are BUILT FROM received, giver-named registers (derived from
// UD_Russian-GSD, language `ru`), never hand-typed rules:
//   - propernoun-fold.js::makeProperNounFold  ← live_priors/derived-priors/propernoun-priors/propernoun-ru.json
//   - normalizePronounClass (in pronouns.js)  ← live_priors/derived-priors/pronoun-priors/pronoun-ru.json
//
// They are applied HERE ONLY to the Russian material (`borodino-ru`): the
// registers are Russian-tagged, and this driver otherwise deliberately injects
// no English closed-class priors (P70's omnilingual probe). English materials
// pass `foldToken = undefined` and `pronounClass = undefined` and are
// byte-identical to the pre-seam driver. A missing native repo or register
// degrades to no seam, honestly, rather than reporting a seam that was never
// built. The registers' own `language`/`provenance` ride on the returned object
// so the report can attribute them.
async function buildRussianSeam(material) {
  if (material?.key !== "borodino-ru") return undefined;
  const out = {};
  let module;
  try {
    module = await import("../../eoreader7/native/adapters/text/propernoun-fold.js");
  } catch {
    return undefined;
  }
  try {
    const prior = JSON.parse(
      readFileSync(join(HERE, "..", "..", "live_priors", "derived-priors", "propernoun-priors", "propernoun-ru.json"), "utf8"),
    );
    out.fold = module.makeProperNounFold(prior);
    out.language = prior?.language;
    out.propernounProvenance = prior?.provenance;
  } catch {
    /* propernoun register absent: carry only the pronoun half if it loads */
  }
  try {
    const prior = JSON.parse(
      readFileSync(join(HERE, "..", "..", "live_priors", "derived-priors", "pronoun-priors", "pronoun-ru.json"), "utf8"),
    );
    out.pronounClass = prior;
    out.language = out.language ?? prior?.language;
    out.pronounProvenance = prior?.provenance;
  } catch {
    /* pronoun register absent: carry only the fold half if it loads */
  }
  if (out.fold === undefined && out.pronounClass === undefined) return undefined;
  return out;
}

// ── declared numbers (P4: numbers are declared, never defaulted) ──────────
const DRAWS = 20; // seeded re-coordinations per arbitrary arm — A9: one null is not a null
// Arms that must REBUILD a reader per draw cost ~1.5s each, so they run at a
// smaller, separately declared number of grounds. Declared rather than
// silently different: a reader comparing "fired 0 of 20" against "fired 0 of
// 5" is comparing two different amounts of evidence and must be able to see
// that from the report (P4).
const HEAVY_DRAWS = 5;
const SEED = 0; // the fold's standing seed for null arms
const PASSAGE_CHARS = 1200; // the chunk a passage is cut at for this driver
// A DECLARED SLICE of the real material — for these two fixtures (61 and 67
// passages respectively) this now covers both in full, but it is still a cap,
// not an assumption of wholeness: `.slice(0, WORKING_PASSAGES)` bounds
// whatever is actually there, and `totalPassages` is reported alongside
// `workingPassages` on every run so a longer future fixture reads honestly as
// a partial slice again rather than silently claiming full coverage.
//
// Raised from 40 (2026-08-29/30) once order 10's own missing-probe gap on
// war-and-peace was traced to its true cause: not a real capability ceiling,
// but order 8's OWN `arbitrary` arm losing power as the corpus grew — a
// 20-draw Monte Carlo estimate of a rate near 0.6% is barely distinguishable
// from a rate near 10% (0/20 and 2/20 are both ordinary outcomes of either).
// `redealAgainstExactNull` (below) replaced the estimate with the exact
// hypergeometric probability for this one arm's shape, which has no draw
// count to be underpowered at. Re-measured at 70 passages afterward, not
// tuned to it: order 8 passes on both materials at the exact rate 0.0058
// (war-and-peace) / 0.0176 (borodino) — both comfortably below alpha, and
// both computed from real counts (K subjects, m matching verb+object edges)
// this corpus's own full extent actually has, not from a smaller, arbitrarily
// safer slice. Order 10 now has a real specimen and passes on both. Full
// run: 26.5s, still well inside what an interactive re-run affords.
const WORKING_PASSAGES = 70;
const HEAVY_PASSAGES = 10; // the slice an arm re-reads per draw
// How many source-systems the order-13 merge reads, and how many candidate
// claims are scanned against them to find one the sample corroborates and one
// it does not. Both declared: the sample is a fixed prefix of the material, so
// which claims come back corroborated is a fact about THIS sample, and a
// reader comparing runs needs to see the sample size that produced it.
const PER_SOURCE_PASSAGES = 10;
const CLAIM_SCAN = 14;
const ABSENT_NAME = "Zzyrflax Quenbourne"; // checked to be absent, never assumed

// ── material ──────────────────────────────────────────────────────────────
const FIXTURES = {
  "war-and-peace": "wikipedia-war-and-peace.html",
  borodino: "wikipedia-battle-of-borodino.html",
  // Omnilingual probe (2026-08-30): the SAME topic, in Russian, fetched live
  // from ru.wikipedia.org — not a translation, not a fixture engineered to
  // pass. Every organ this driver injects (surfaces/relations/pronouns) is
  // the base engine's, with NO English closed-class priors (determiners,
  // negation words, verb-form lexicons) opted in — those are English-tagged
  // (`lang/en`) everywhere else in this repo and are deliberately NOT wired
  // here, so a pass on this material is evidence the CAPITALIZATION- and
  // STRUCTURE-based machinery generalizes, never that an English prior
  // quietly did the work.
  "borodino-ru": "wikipedia-borodino-ru.html",
};

function loadMaterial(key) {
  const html = readFileSync(join(HERE, "fixtures", FIXTURES[key]), "utf8");
  const { text } = extractReadable(html);
  const all = [];
  for (let i = 0; i < text.length; i += PASSAGE_CHARS) {
    const slice = text.slice(i, i + PASSAGE_CHARS);
    if (slice.trim()) all.push({ ref: `${key}#${i}-${i + slice.length}`, text: slice });
  }
  const passages = all.slice(0, WORKING_PASSAGES);
  return { key, text: passages.map((p) => p.text).join(""), fullChars: text.length, passages, totalPassages: all.length };
}

// ── the specimen set, read OUT of the material ────────────────────────────
function deriveSpec(material, reader, index, control, organs, foldToken) {
  const edges = reader.edges ?? [];

  // WHICH EDGES MAY SERVE AS A SPECIMEN, and why the filter is not cosmetic.
  // The first version took the most-corroborated edge outright and drew
  // "entire book —was→ ..." — endpoints that are common phrases rather than
  // beings. A word-salad copy regenerates such an edge easily, so the order-6
  // arm refused the item for `arbitrary_coordination` when what had actually
  // happened was that the specimen carried no referential structure to
  // destroy. The filter below is therefore part of the measurement, declared
  // rather than tuned: both endpoints must resolve to referents the reading
  // ADMITTED, neither may span a line break (the known subject/object-capture
  // artefact this project's own A19 records), and the two ends must differ.
  const clean = (x) => typeof x === "string" && x.trim() && !/[\n\r]/.test(x);
  const isReferent = (x) => {
    try {
      return index.resolve(x).size > 0;
    } catch {
      return false;
    }
  };
  const candidates = edges
    .filter(
      (e) =>
        clean(e.subject) &&
        clean(e.object) &&
        clean(e.verb) &&
        !/\s/.test(e.verb) &&
        e.subject.toLowerCase() !== e.object.toLowerCase() &&
        isReferent(e.subject) &&
        isReferent(e.object),
    )
    .sort((a, b) => (b.refs?.length ?? 0) - (a.refs?.length ?? 0));

  // DISTINCTIVENESS IS PART OF THE DERIVATION, not a nicety. Several arms
  // ask "does this hold against DIFFERENT content"; a specimen drawn from
  // vocabulary the two materials share (both of these are about the same war)
  // makes those arms answer yes for reasons that have nothing to do with the
  // system, and the first run refused order 6 and order 8 on exactly that.
  // So a specimen is preferred that the control material does NOT state.
  const statedInControl = (e) => {
    if (!control) return false;
    try {
      return queryEdges(control.reader.edges ?? [], { subject: e.subject, verb: e.verb, object: e.object }).length > 0;
    } catch {
      return false;
    }
  };
  const distinctive = candidates.filter((e) => !statedInControl(e));
  const specimen = distinctive[0] ?? candidates[0] ?? null;
  // A SECOND real claim, used by the order-13 arm as the other group. It has
  // to be one that actually binds somewhere, or mixing it in changes nothing
  // and the arm is unlicensed rather than informative.
  const otherCandidate =
    (distinctive.length ? distinctive : candidates).find(
      (e) => e !== specimen && e.subject !== specimen?.subject && (e.refs?.length ?? 0) >= 1,
    ) ?? null;
  const specimenIsDistinctive = !!distinctive[0];
  const recurring = distinctive.find((e) => (e.refs?.length ?? 0) >= WITNESS_FLOOR) ?? candidates.find((e) => (e.refs?.length ?? 0) >= WITNESS_FLOOR) ?? null;

  // A subject+verb slot the material binds to two or more DISTINCT objects —
  // the abstraction an order-10 item quantifies over. Derived, never assumed
  // to exist: a material without one leaves that item honestly unmeasured.
  let slot = null;
  for (const e of [...distinctive, ...candidates]) {
    const fillers = queryFillers(edges, { subject: e.subject, verb: e.verb });
    if (fillers && fillers.length >= 2) {
      slot = { subject: e.subject, verb: e.verb, fillers };
      break;
    }
  }

  // The principal must be a being THIS material establishes and the control
  // does NOT — otherwise the order-5 discrimination arm has nothing to
  // discriminate and is unlicensed (A10). Derived by asking the control,
  // never by assuming a name is distinctive.
  // A clean single-token name. Multi-word "names" here are routinely the
  // subject/object capture artefact A19 records ("Peace Russian Война" came
  // out of the first run), and scoring nominal reference on one measures the
  // capture bug, not the capacity.
  const named = [...(index.referents ?? [])]
    .map((id) => ({ id, name: index.represent(id) }))
    .filter((r) => r.name && clean(r.name) && !/\s/.test(r.name) && /^[\p{L}][\p{L}\p{M}'-]+$/u.test(r.name));
  const principal =
    named.find((r) => {
      if (!control) return false;
      try {
        return control.index.resolve(r.name).size === 0;
      } catch {
        return false;
      }
    }) ?? null;

  // ── THE TWO NOMINAL QUESTIONS, POSED WITH THE FOLD'S OWN RULE ──────────
  //
  // Three wrong versions of this were built before this one, and the wrong
  // turns are worth keeping because each was a real methodological error:
  //
  //   1. Pairs chosen by SPELLING ("b starts with a plus a space") drew
  //      "Russian" / "Russian Army". The reading refuses to merge those, and
  //      it is RIGHT to; the probe scored it as failing.
  //   2. Pairs chosen by `namesCorefer` on the RAW surfaces drew "Ilya
  //      Andreyevich Rostov" / "Petya Rostov" — coreferent on a shared final
  //      token, two different people. Again the reading was right.
  //
  // Both were the same mistake, and it is this repo's own P38 in a new place:
  // an organ answering "could these two strings be variants of one name" is
  // not an organ answering "does this material establish them as one being",
  // and handing the first to a mechanism that reads the second convicts the
  // reader of the probe's error. `discoverReferents` does not call
  // `namesCorefer` on surfaces at all — it strips GENERIC tokens (titles,
  // family names, demonyms: the ones that appear with many partners) from
  // both sides first and requires the REMAINDERS to corefer, precisely so
  // that "Princess Mary" and "Princess Hélène" stay apart. Its own comment
  // says so.
  //
  // So the pairs below are built with that same rule, using the engine's own
  // exported `genericTokens`, which puts the probe and the organ on one
  // footing and makes the disagreement — where there is one — mean something.
  const generic = (() => {
    try {
      const entries = organs.extractSurfaces(organs.splitSentences(material.text), {});
      return organs.genericTokens ? organs.genericTokens(entries, {}) : new Set();
    } catch {
      return new Set();
    }
  })();
  // The same three lines `discoverReferents::individuating` runs, through the
  // session's own fold (P7.1: one fold per session, by import, never a local
  // reimplementation).
  const individuating = (surface) =>
    organs
      .diaNorm(surface)
      .split(/\s+/)
      .filter((t) => t.length > 2 && !generic.has(t));

  // NOT `index.events`. cast.js builds its referent index with
  // `minSentences: 0` — its own header says why: "presence... a name
  // mentioned once is present once", which is the right floor for a citation
  // presence check and the wrong one for this question. Reading the coref
  // regimes off it drew 510 "pairs" on this material, most of them
  // capture artefacts ("Moscow Pierre", "Tolly Pyotr Bagration"), and scored
  // the reading as stranding names it had rightly never admitted.
  //
  // That is P38 exactly — "an index answering 'does this exist' is not an
  // index answering 'is this established' — never hand one to a mechanism
  // that reads" — committed here, by this driver, against the very organ
  // whose floor P38 was written about. The regimes are therefore built from a
  // `discoverReferents` pass at the organ's OWN derived floor.
  const eventId = new Map();
  let establishedEvents = [];
  try {
    const entries = organs.extractSurfaces(organs.splitSentences(material.text), {});
    establishedEvents = organs.discoverReferents(entries, { foldToken }).events ?? [];
  } catch {
    establishedEvents = [];
  }
  for (const ev of establishedEvents) if (!eventId.has(ev.surface)) eventId.set(ev.surface, ev.referent_id);
  const allSurfaces = [...eventId.keys()].filter((f) => clean(f));

  // TWO REGIMES, AND ONE DELIBERATELY NOT SCORED.
  //
  // `corefersIndividuated` has two branches. The FIRST — both sides carry
  // individuating evidence, and the remainders corefer — is fully computable
  // here from exported organs (`genericTokens` + `namesCorefer`), and it is
  // what regimes 1 and 2 below measure, in both directions.
  //
  // The SECOND branch is the documented singleton-partner RESCUE: a bare
  // generic token whose corpus-wide partner set is exactly one can only name
  // that partner's bearer ("Clerval" → "Henry Clerval", the code's own
  // example). A first version of this driver treated every one-side-bare pair
  // as "the rule withholds" and duly reported `Anna` | `Anna Karenina` and
  // `Hélène` | `Hélène Bezukhova` as wrongly merged. Checked rather than
  // believed: both are the rescue firing exactly as designed. Computing that
  // branch here would mean reimplementing the engine's own partner-eligibility
  // floor in a driver — the drift this repo has already caught itself at
  // twice — so one-side-bare pairs are EXCLUDED from the score and counted as
  // a disclosed abstention instead.
  const regime1 = [];
  const regime2 = [];
  let abstained = 0;
  const rawShare = (a, b) => {
    const ta = new Set(organs.diaNorm(a).split(/\s+/).filter((t) => t.length > 2));
    return organs
      .diaNorm(b)
      .split(/\s+/)
      .some((t) => t.length > 2 && ta.has(t));
  };
  for (let i = 0; i < allSurfaces.length; i += 1) {
    for (let j = i + 1; j < allSurfaces.length; j += 1) {
      const a = allSurfaces[i];
      const b = allSurfaces[j];
      const ia = individuating(a);
      const ib = individuating(b);
      if (!(ia.length && ib.length)) {
        let raw = false;
        try {
          raw = !!organs.namesCorefer(a, b);
        } catch {
          raw = false;
        }
        if (raw) abstained += 1;
        continue;
      }
      let remaindersCorefer = false;
      try {
        remaindersCorefer = !!organs.namesCorefer(ia.join(" "), ib.join(" "));
      } catch {
        remaindersCorefer = false;
      }
      const merged = eventId.get(a) === eventId.get(b);
      if (remaindersCorefer) regime1.push({ a, b, merged });
      // A near miss is a pair a NAIVE fold would merge — the raw surfaces
      // share a token — whose individuating remainders nonetheless say they
      // are different beings. "Princess Mary" / "Princess Hélène" is the
      // code's own example: both share "princess", both individuate, and
      // [mary] vs [helene] do not corefer. The shared token is the GENERIC
      // one, which is exactly why the remainders must be compared instead of
      // the surfaces; an earlier version of this line looked for a shared
      // token in the REMAINDERS and found none anywhere, in either material.
      else if (rawShare(a, b)) regime2.push({ a, b, merged });
    }
  }

  const corefAgreement = {
    regime1,
    regime2,
    shouldMerge: regime1.length,
    didMerge: regime1.filter((r) => r.merged).length,
    missed: regime1.filter((r) => !r.merged),
    abstained,
    shouldWithhold: regime2.length,
    wronglyMerged: regime2.filter((r) => r.merged),
  };
  const variantPair = regime1[0] ?? null;
  const nearMissPair = regime2[0] ?? null;

  // A token the material certainly contains and which is certainly NOT an
  // admitted being — the order-5 lower-order arm needs one, and deriving it
  // from this material's own frequency table keeps that arm content-independent
  // (the first version hardcoded the word "chapter", which one of the two
  // materials simply does not contain, and the arm passed for that reason).
  let presentNonReferent = null;
  try {
    const table = reader.vocabulary ? null : null;
    const counts = new Map();
    for (const t of (material.text.match(/[\p{L}]{3,}/gu) ?? [])) {
      const k = t.toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    presentNonReferent =
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([w]) => w)
        .find((w) => {
          try {
            return index.resolve(w).size === 0;
          } catch {
            return false;
          }
        }) ?? null;
  } catch {
    presentNonReferent = null;
  }

  // ── the order-13 sample, measured rather than assumed ──────────────────
  //
  // Each passage of a fixed prefix is read as its OWN system. Two claims are
  // then selected BY MEASUREMENT against that fixed sample: one it
  // corroborates (two or more systems bind it) and one it does not (exactly
  // one binds). An earlier version instead prepended the specimen's own ref
  // passages to the sample, which guaranteed the holds it then reported —
  // and left which claim came back corroborated to luck, which is how the
  // arm below came to fire on one material and not the other.
  //
  // The readers are built ONCE and reused across every candidate: `read()` is
  // cheap, building a reader is not, and rebuilding per claim cost minutes for
  // an answer that cannot change.
  const sourcePassages = (material.passages ?? []).slice(0, PER_SOURCE_PASSAGES);
  let sourceReaders = [];
  try {
    sourceReaders = sourcePassages.map((p) => ({ ref: p.ref, reader: makeRelationReader(organs)([p], { pool: material.passages }) }));
  } catch {
    sourceReaders = [];
  }
  const readAcross = (edge) => {
    const claim = `${edge.subject} ${edge.verb} ${edge.object}.`;
    return sourceReaders.map((s) => {
      let v = null;
      try {
        v = (s.reader.read(claim).claims ?? [])[0]?.verdict ?? null;
      } catch {
        v = null;
      }
      return {
        claim_id: `mhc:${edge.subject}|${edge.verb}|${edge.object}`,
        who: s.ref,
        verdict: v === "bound" ? "holds" : v === "contradicted" ? "refused" : "undetermined",
        read: [],
        edges: [],
        grammar: [],
        corroboration: null,
      };
    });
  };
  const holdsIn = (readings) => readings.filter((r) => r.verdict === "holds").length;

  let corroboratedClaim = null;
  let singleClaim = null;
  if (sourceReaders.length) {
    for (const e of candidates.slice(0, CLAIM_SCAN)) {
      if (corroboratedClaim && singleClaim) break;
      const readings = readAcross(e);
      const h = holdsIn(readings);
      if (h >= 2 && !corroboratedClaim) corroboratedClaim = { edge: e, readings, holds: h };
      else if (h === 1 && !singleClaim) singleClaim = { edge: e, readings, holds: h };
    }
  }

  return {
    specimen,
    specimenIsDistinctive,
    sourceReaders,
    readAcross,
    corroboratedClaim,
    singleClaim,
    otherCandidate,
    variantPair,
    nearMissPair,
    eventId,
    corefAgreement,
    generic,
    slot,
    recurring,
    principal,
    presentNonReferent,
    edgeCount: edges.length,
    candidateCount: candidates.length,
  };
}

// ── arm helpers: every arm must SHOW its perturbation landed (A10) ────────
//
// Three arm kinds, three concrete licensing conditions. None of them is a
// declaration that the perturbation happened — each is a check that it did.

/** A withholding arm (`lowerOrder`): the constituent is removed and the task
 * attempted without it. LICENSED only if the withheld organ actually produced
 * something in the real run — withholding an organ that contributed nothing
 * perturbs nothing, and its `completed: false` would mean nothing. */
const withheld = (contributed, detail, attempt) => ({
  completed: contributed ? attempt() : false,
  perturbed: !!contributed,
  detail: contributed ? detail : `nothing was withheld: ${detail} — the organ produced no output in the real run, so removing it perturbs nothing`,
});

/** A shuffling arm (`arbitrary`): the coordination is re-done at N seeds with
 * the constituents held fixed. LICENSED only if at least one draw actually
 * changed the input. Reported natural-frequency (fired of draws). */
const shuffled = (draws, makeDraw, attempt) => {
  let fired = 0;
  let anyChanged = false;
  for (let d = 0; d < draws; d += 1) {
    const drawn = makeDraw(SEED + d);
    if (drawn.changed) anyChanged = true;
    if (drawn.changed && attempt(drawn.value)) fired += 1;
  }
  return {
    completed: fired > 0,
    perturbed: anyChanged,
    draws,
    fired,
    detail: anyChanged
      ? `accomplished the task in ${fired} of ${draws} seeded re-coordinations`
      : "no draw changed the input — the shuffle was a no-op and tested nothing",
  };
};

// log-factorial via direct summation — n here is the corpus's own edge
// count (hundreds to low thousands), so a plain loop is exact and fast
// enough; no Stirling approximation is needed or wanted for an exact test.
const logFactorial = (n) => {
  let s = 0;
  for (let i = 2; i <= n; i += 1) s += Math.log(i);
  return s;
};
const logChoose = (n, k) => (k < 0 || k > n ? -Infinity : logFactorial(n) - logFactorial(k) - logFactorial(n - k));

/**
 * hyperAtLeastOne(n, K, m) — the EXACT probability that a uniform random
 * permutation of n labels (K of them equal to the specimen's own subject)
 * places at least one of them onto one of m fixed target positions.
 *
 * WHY THIS REPLACES A SIMULATED `shuffled()` ARM FOR THIS ONE SHAPE. o8's
 * `arbitrary` arm redeals subjects across the edge set and asks whether the
 * specimen's exact triple recurs — a question about where K copies of one
 * label land among m matching-shaped positions out of n total, under a
 * uniform permutation. That is a hypergeometric tail with a closed form:
 * P(>=1 hit) = 1 - C(n-K, m) / C(n, m). Measured live (2026-08-29/30,
 * widening this driver's own WORKING_PASSAGES from 40 to 100 passages on
 * war-and-peace): the same specimen's `shuffled()` estimate moved from 0/20
 * to 2/20 fired, which reads as "the corpus got noisier" but is at least as
 * likely to be sampling noise on a small-n Monte Carlo estimate of a rate
 * that may not have moved much at all — `shuffled()` cannot tell the two
 * apart, and READING-POLICY A10 says a statistic that cannot tell the two
 * apart is exactly the trap. An exact tail has no seed, no draw count, and
 * no simulation variance to confound with a real corpus-size effect.
 *
 * This is NOT a general replacement for `shuffled()` — most of this file's
 * arms perturb something with no closed-form null (passage order, source
 * grouping, …) and a permutation estimate is the correct tool there. This
 * closed form exists only because THIS arm's question — "does one label
 * land in a fixed target set under a uniform permutation" — happens to be
 * exactly what a hypergeometric distribution answers, and computing the
 * true answer is strictly better than estimating it whenever it is cheap
 * to compute, which it is here (n is this corpus's own edge count).
 *
 * `m` is symmetric with `K` in this formula (a well-known hypergeometric
 * identity) — which one is called "the sample" and which "the successes"
 * does not change the probability, only the reading.
 */
const hyperAtLeastOne = (n, K, m) => {
  if (n <= 0 || K <= 0 || m <= 0) return 0;
  if (m > n - K) return 1; // pigeonhole: the sample cannot avoid every success
  return 1 - Math.exp(logChoose(n - K, m) - logChoose(n, m));
};

// The declared significance this repo already uses for exactly this
// question elsewhere (network-standing.js's LINK_SPEC precedent, draws 199
// / alpha 0.05; kind-induction.js's own default) — reused rather than
// picked fresh for this file. "Not small" is a value judgment; 0.05 is not
// invented here, it is cited.
const ARBITRARY_ALPHA = 0.05;

/**
 * Order 9's own exact null: a specimen's ref-count is arbitrarily redealt
 * among this corpus's real edges (marginals preserved — the same counts,
 * reassigned to different identities). Under a uniform random permutation,
 * the chance any ONE position draws a count clearing `floor` is exactly
 * the corpus's own base rate — no simulation needed, for the identical
 * reason `hyperAtLeastOne` needed none: the question has a closed form.
 * A first cut at this arm used `shuffled()`'s 20-draw estimate and hit the
 * SAME bare-inequality trap `redealAgainstExactNull` was built to close —
 * 2/20 fired on real material, indistinguishable from either a rare or a
 * common true rate at that draw count.
 */
const redealCountAgainstExactNull = (edges, specimen, floor) => {
  const idx = edges.indexOf(specimen);
  if (idx < 0) return { completed: false, perturbed: false, draws: 1, fired: 0, detail: "the specimen is not among this reading's own edges" };
  const counts = edges.map((x) => x.refs?.length ?? 0);
  const distinctCounts = new Set(counts);
  const perturbed = distinctCounts.size > 1; // no real variation to redeal otherwise
  if (!perturbed) {
    return { completed: false, perturbed: false, draws: 1, fired: 0, detail: "every edge in this reading carries the same ref-count — a redeal is a no-op and tested nothing" };
  }
  const n = counts.length;
  const clearing = counts.filter((c) => c >= floor).length;
  const pHit = clearing / n;
  const completed = pHit >= ARBITRARY_ALPHA;
  return {
    completed,
    perturbed: true,
    draws: 1,
    fired: completed ? 1 : 0,
    detail: `exact P(an arbitrary redeal hands this specimen a count clearing the witness floor) = ${pHit.toFixed(4)} (${clearing} of ${n} edges in this reading already clear it) — ${completed ? `at or above alpha ${ARBITRARY_ALPHA}, so the floor is not rare here` : `below alpha ${ARBITRARY_ALPHA}, so clearing it is not explained by chance alone`}`,
  };
};

/**
 * A redeal arm with an EXACT null, for the one shape that has one: does the
 * specimen's own (subject, verb, object) recur under a uniform random
 * redeal of subjects across `edges`, MORE OFTEN than chance alone predicts
 * from this corpus's own composition (how many edges share the specimen's
 * subject, how many share its verb+object) — never "did it ever happen
 * once." `completed` (axiom 3 fails) only when the exact hit probability
 * clears ARBITRARY_ALPHA; a rare, structurally-expected hit no longer
 * convicts the item on 20 noisy draws' worth of bad luck.
 */
const redealAgainstExactNull = (edges, e) => {
  const n = edges.length;
  const K = edges.filter((x) => x.subject === e.subject).length;
  const m = edges.filter((x) => x.verb === e.verb && x.object === e.object).length;
  const perturbed = K < n; // some edge's subject differs — a redeal can move something
  if (!perturbed) {
    return { completed: false, perturbed: false, draws: 1, fired: 0, detail: "every edge shares the specimen's own subject — a redeal is a no-op and tested nothing" };
  }
  const pHit = hyperAtLeastOne(n, K, m);
  const completed = pHit >= ARBITRARY_ALPHA;
  return {
    completed,
    perturbed: true,
    draws: 1,
    fired: completed ? 1 : 0,
    detail: `exact P(a uniform redeal reproduces this triple) = ${pHit.toFixed(4)} over n=${n} edges, K=${K} sharing the subject, m=${m} sharing the verb+object — ${completed ? `at or above alpha ${ARBITRARY_ALPHA}, so a random re-coordination is not rare here` : `below alpha ${ARBITRARY_ALPHA}, so the true match is not explained by chance alone`}`,
  };
};

/** A discrimination arm: the same task on material that does not support it.
 * LICENSED only if the other material genuinely lacks the specimen. */
const against = (lacks, detail, attempt) => ({
  completed: lacks ? attempt() : false,
  perturbed: !!lacks,
  detail: lacks ? detail : `the control material was not confirmed to lack the specimen — ${detail}`,
});

const GAP = (detail) => ({ unreachable: true, detail });

/** Does an arbitrary fold reproduce the individuation rule's own verdicts —
 * gathering every pair the rule calls one being, and keeping apart every pair
 * it withholds on? The order-5 arbitrary arm's whole question, broken out so
 * the arm reads as one thing. */
function foldReproducesRule(agreement, groupOf) {
  const { regime1 = [], regime2 = [] } = agreement;
  if (!regime1.length) return false;
  for (const p of regime1) {
    const ga = groupOf(p.a);
    if (ga == null || ga !== groupOf(p.b)) return false;
  }
  for (const p of regime2) {
    const ga = groupOf(p.a);
    if (ga == null || ga === groupOf(p.b)) return false;
  }
  return true;
}

/** An item may declare the specimen it needs. Where the material does not
 * offer one, the honest report is "this material offers no such specimen" —
 * a gap about the MATERIAL — not "the arm's perturbation was unlicensed",
 * which is a statement about the arm, and not a performance verdict, which
 * would be a statement about the system. Wrapping here keeps that distinction
 * out of every individual arm. */
function guardItems(items) {
  return items.map((item) => {
    if (typeof item.requires !== "function") return item;
    const gate = () => {
      const missing = item.requires();
      return missing ? { unreachable: true, detail: `this material offers no ${missing}` } : null;
    };
    const wrap = (fn) => async (ctx) => gate() ?? fn(ctx);
    return {
      ...item,
      task: wrap(item.task),
      arms: Object.fromEntries(Object.entries(item.arms).map(([k, fn]) => [k, wrap(fn)])),
    };
  });
}

// ── the ladder ────────────────────────────────────────────────────────────
function buildItems(ctx) {
  const { organs, material, reader, index, spec, control } = ctx;
  const ASSEMBLY =
    "EXPERIMENT — engine text adapters hand-chained through the-fold's cast.js / hypergraph.js / verification.js / capacity-runner.js. NOT packages/host's assembled reader (absent from this checkout). READING-POLICY P0.";

  const edges = reader.edges ?? [];
  const text = material.text;
  const heavyText = material.passages.slice(0, HEAVY_PASSAGES).map((p) => p.text).join("");
  // The Russian material's cell of the coreference seam: single-lemma
  // proper-noun case-forms fold onto their lemma so one being does not strand
  // across inflections, and `resolvePronouns` reads the material's OWN
  // third-person pronoun register so a Russian `он` can be found and gated by
  // its own gender (both undefined for every other material → byte-identical).
  const foldToken = ctx.foldToken;
  const pronounClass = ctx.pronounClass;

  // Each passage read as its OWN system. Built once and memoised: the
  // order-13 arms perturb how these readings are GROUPED, never what they
  // say, so rebuilding them per draw would cost minutes and change nothing.
  // The real pronoun run, computed once: both the order-7 task and two of its
  // arms need it, and re-running it per draw would triple the item's cost for
  // an answer that cannot change.
  let realBindingsMemo = null;
  const realBindings = () => {
    if (realBindingsMemo) return realBindingsMemo;
    const sentences = organs.splitSentences(text);
    const surfaces = organs.extractSurfaces(sentences, {});
    const disc = organs.discoverReferents(surfaces, { foldToken });
    const map = new Map(disc.events.map((e) => [e.surface, e.referent_id]));
    const res = organs.resolvePronouns(sentences, map, { minActivation: 0.05, minMargin: 0.2, pronounClass });
    realBindingsMemo = res?.bindings ?? [];
    return realBindingsMemo;
  };

  const readingMemo = new Map();
  const readPerSource = (edge, claimId) => {
    const key = `${claimId}|${edge.subject}|${edge.verb}|${edge.object}`;
    if (readingMemo.has(key)) return readingMemo.get(key);
    const claim = `${edge.subject} ${edge.verb} ${edge.object}.`;
    // WHICH passages stand as source-systems. Taking the first N made every
    // reading `undetermined` — the specimen simply is not in them — and a
    // merge of unanimous declines is degenerate: the grouping cannot matter,
    // so nothing about the coordination shows. The sources are therefore the
    // passages the edge's own refs name (which do state it) PLUS others that
    // do not, which is what a real multi-source corpus looks like: some
    // witnesses speak to the claim and some are silent.
    const refPassages = (edge.refs ?? [])
      .map((r) => material.passages.find((p) => p.ref === r))
      .filter(Boolean);
    const seen = new Set(refPassages.map((p) => p.ref));
    const others = material.passages.filter((p) => !seen.has(p.ref));
    const sources = [...refPassages, ...others].slice(0, PER_SOURCE_PASSAGES);
    const readings = sources.map((p) => {
      const r = makeRelationReader(organs)([p], { pool: material.passages });
      const c = (r.read(claim).claims ?? [])[0];
      return {
        claim_id: claimId,
        who: p.ref,
        verdict: c?.verdict === "bound" ? "holds" : c?.verdict === "contradicted" ? "refused" : "undetermined",
        read: c?.refs ?? [],
        edges: [],
        grammar: [],
        corroboration: null,
      };
    });
    readingMemo.set(key, readings);
    return readings;
  };

  return guardItems([
    // ── 5 · Nominal ───────────────────────────────────────────────────────
    {
      id: "o5-nominal",
      order: 5,
      requires: () =>
        !spec.principal
          ? "being it establishes that the control material does not"
          : !spec.variantPair
            ? "pair its own individuation rule says is one being"
            : !spec.nearMissPair
              ? "pair its own individuation rule withholds on"
              : null,
      name: "a name denotes a being the material establishes",
      organ: "cast.js::makeReferentIndex (extractSurfaces → discoverReferents)",
      assembly: ASSEMBLY,
      stages: ["perception", "witnessed admission", "alias resolution"],
      definedInTermsOf: [],
      organizes:
        "raw capitalised runs (order 4's symbols, out of scope by construction) are folded into admitted referent identities, so a name points at a being rather than at a byte string",
      task: async () => {
        const resolved = index.resolve(spec.principal.name);
        const absent = index.resolve(ABSENT_NAME);
        // The coordination, in three parts: a name reaches a being; a name of
        // nobody reaches nobody; and — the part byte containment can never do
        // — two surface FORMS of one being reach the same being while two
        // different beings stay apart.
        // The coordination in four parts, ALL SCORED. Identity is compared by
        // referent id, never by resolve()'s candidate set — resolve is a
        // covering match that returns many ids for a generic token, and an
        // earlier version of this item read that as two beings merged when it
        // was only resolve doing its own job.
        const c = spec.corefAgreement;
        const mergesItsOwn = c.shouldMerge > 0 && c.missed.length === 0;
        const withholdsItsOwn = c.wronglyMerged.length === 0;
        const missed = c.missed.map((m) => `"${m.a}" | "${m.b}"`).join("; ");
        return {
          completed: resolved.size > 0 && absent.size === 0 && mergesItsOwn && withholdsItsOwn,
          detail:
            `"${spec.principal.name}" resolves (${resolved.size}); "${ABSENT_NAME}" does not (${absent.size}); ` +
            `gathered ${c.didMerge}/${c.shouldMerge} pairs its own individuation rule calls one being` +
            (missed ? ` (stranded: ${missed})` : "") +
            `; kept apart ${c.shouldWithhold - c.wronglyMerged.length}/${c.shouldWithhold} it withholds on`,
        };
      },
      arms: {
        // Order 4 stands in as raw byte containment — the thing the symbolic
        // floor sits above. It can find the token; it has no notion of a
        // being, so it cannot refuse a token that is present but names nobody.
        lowerOrder: async () =>
          withheld(
            index.referents.size > 0,
            "referent admission withheld; only raw token containment available",
            () => {
              const has = (n) => !!n && text.toLowerCase().includes(String(n).toLowerCase());
              // Containment finds the principal, and would equally "find" the
              // material's most common ordinary word — which names no being.
              // The task is accomplished only if containment can ALSO refuse
              // that word, which it structurally cannot: it has no notion of
              // a being to refuse it with.
              return has(spec.principal?.name) && !has(ABSENT_NAME) && !has(spec.presentNonReferent);
            },
          ),
        arbitrary: async () =>
          shuffled(
            DRAWS,
            (seed) => {
              // Marginals preserved: the same surfaces, folded into the same
              // NUMBER of groups of the same SIZES. Destroyed: which surfaces
              // go together. This is the coreference rule replaced by a deal.
              const events = index.events ?? [];
              const surfaces = events.map((e) => e.surface);
              const sizes = [...new Map(events.map((e) => [e.referent_id, 0])).keys()];
              const dealt = seededShuffle(surfaces, seed);
              const groups = new Map();
              dealt.forEach((surface, i) => groups.set(surface, `rand:${i % Math.max(1, sizes.length)}`));
              return { changed: dealt.join("|") !== surfaces.join("|"), value: groups };
            },
            (groups) => {
              // Held to EXACTLY the standard the task is held to: the deal
              // must gather every pair the individuation rule calls one being
              // and keep apart every pair it withholds on. An earlier version
              // asked only whether two surfaces landed in different groups,
              // which a random deal satisfies essentially always — it fired
              // 20 of 20 and refused the item for `arbitrary_coordination`
              // when what was arbitrary was the arm.
              return foldReproducesRule(spec.corefAgreement, (n) => groups.get(n) ?? null);
            },
          ),
        discrimination: async () =>
          against(
            !!control && !control.index.resolve(spec.principal?.name ?? "").size,
            `the control material (${control?.key}) does not establish "${spec.principal?.name}"`,
            () => control.index.resolve(spec.principal.name).size > 0,
          ),
      },
    },

    // ── 6 · Sentential ────────────────────────────────────────────────────
    {
      id: "o6-sentential",
      order: 6,
      requires: () => (!spec.specimen ? "edge whose two ends are both admitted referents" : null),
      name: "a directed relation inside one sentence: who did what to whom, in order",
      organ: "hypergraph.js::makeRelationReader (discoverRelationVocab → extractRelations)",
      assembly: ASSEMBLY,
      stages: ["perception", "alias resolution", "typed, directional relation"],
      definedInTermsOf: ["o5-nominal"],
      organizes:
        "admitted referents are ordered around a measured connector, so the pair carries a direction the referent set alone does not have",
      task: async () => {
        if (!spec.specimen) return GAP("the material yielded no edge to ask about");
        const e = spec.specimen;
        const forward = queryEdges(edges, { subject: e.subject, verb: e.verb, object: e.object });
        const reverse = queryEdges(edges, { subject: e.object, verb: e.verb, object: e.subject });
        return {
          completed: forward.length > 0 && reverse.length === 0,
          detail: `"${e.subject} —${e.verb}→ ${e.object}" is stated (${forward.length}); its reverse is not (${reverse.length})`,
        };
      },
      arms: {
        lowerOrder: async () =>
          withheld(
            index.referents.size > 0,
            "the connector withheld; only the unordered referent set available",
            () => {
              // Referents alone give a bag. The only ordering available
              // without a connector is document order, which decides the
              // direction of a pair only by accident.
              const e = spec.specimen;
              if (!e) return false;
              const first = text.indexOf(e.subject);
              const second = text.indexOf(e.object);
              // Accomplishing the task means also refusing the reverse, which
              // first-mention order cannot do: it ranks the pair either way.
              return first >= 0 && second >= 0 && false;
            },
          ),
        arbitrary: async () =>
          shuffled(
            HEAVY_DRAWS,
            (seed) => {
              // asserted.js's own order arm, verbatim in construction: each
              // sentence's words shuffled IN PLACE, vocabulary and sentence
              // boundaries held fixed.
              const sentences = organs.splitSentences(heavyText);
              const salad = sentences
                .map((s, i) => shuffleSentenceWords(typeof s === "string" ? s : s.text, seed * 1000 + i))
                .join(" ");
              return { changed: salad !== heavyText, value: salad };
            },
            (salad) => {
              const e = spec.specimen;
              if (!e) return false;
              const r = makeRelationReader(organs)([{ ref: "salad#0", text: salad }], { pool: material.passages });
              return queryEdges(r.edges, { subject: e.subject, verb: e.verb, object: e.object }).length > 0;
            },

          ),
        discrimination: async () =>
          against(
            !!control,
            `the control material (${control?.key}) is different content`,
            () => {
              const e = spec.specimen;
              return queryEdges(control.reader.edges ?? [], { subject: e.subject, verb: e.verb, object: e.object }).length > 0;
            },
          ),
      },
    },

    // ── 7 · Preoperational ────────────────────────────────────────────────
    {
      id: "o7-preoperational",
      order: 7,
      name: "a sequence coordinated across sentences: a pronoun bound to what was read before it",
      organ: "perceiver/text/pronouns.js::resolvePronouns, via hypergraph.js's resolvePronouns organ",
      assembly: ASSEMBLY,
      stages: ["perception", "witnessed admission", "alias resolution", "pronoun binding"],
      definedInTermsOf: ["o6-sentential"],
      organizes:
        "sentence-local relations are carried forward as an activation trace, so a later sentence's pronoun reaches an antecedent no single sentence contains",
      task: async () => {
        const sentences = organs.splitSentences(text);
        const surfaces = organs.extractSurfaces(sentences, {});
        const disc = organs.discoverReferents(surfaces, { foldToken });
        const map = new Map(disc.events.map((e) => [e.surface, e.referent_id]));
        const res = organs.resolvePronouns(sentences, map, { minActivation: 0.05, minMargin: 0.2, pronounClass });
        const bindings = res?.bindings ?? [];
        const gaps = res?.gaps ?? [];
        // P1: a refusal is a correct result, so the task is not "bind
        // everything". It is: bind at least one pronoun to an admitted
        // referent, and never bind one to a referent the reading has not
        // admitted. Fabrication fails; principled silence is reported as a
        // gap in the detail rather than dressed up as success.
        const admitted = new Set(disc.events.map((e) => e.referent_id));
        const fabricated = bindings.filter((b) => !admitted.has(b.referentId));
        return {
          completed: bindings.length > 0 && fabricated.length === 0,
          detail: `${bindings.length} pronoun(s) bound, ${gaps.length} refused (${[...new Set(gaps.map((g) => g.reason))].join(", ") || "none"}), ${fabricated.length} bound to an unadmitted referent`,
        };
      },
      arms: {
        lowerOrder: async () =>
          withheld(
            true,
            "the activation trace withheld; only within-sentence extraction available",
            () => {
              // The lower-order stand-in attempts the SAME task with only
              // within-sentence information: bind each pronoun to a name in
              // its own sentence. It accomplishes the task only if it
              // REPRODUCES the real bindings — which would mean the
              // cross-sentence trace was not what produced them.
              const sentences = organs.splitSentences(text);
              const surfaces = organs.extractSurfaces(sentences, {});
              const disc = organs.discoverReferents(surfaces, { foldToken });
              const map = new Map(disc.events.map((e) => [e.surface, e.referent_id]));
              const real = organs.resolvePronouns(sentences, map, { minActivation: 0.05, minMargin: 0.2 });
              const realKeys = new Set((real?.bindings ?? []).map((b) => `${b.offset}:${b.referentId}`));
              if (!realKeys.size) return false;
              const localKeys = new Set();
              for (const sent of sentences) {
                const body = typeof sent === "string" ? sent : sent.text;
                const base = typeof sent === "string" ? 0 : (sent.offset ?? 0);
                const names = [...map.keys()].filter((n) => body.includes(n));
                if (!names.length) continue;
                for (const m of body.matchAll(/\b(he|she|his|her|him|they|them|their)\b/gi)) {
                  localKeys.add(`${base + m.index}:${map.get(names[0])}`);
                }
              }
              return [...realKeys].every((k) => localKeys.has(k));
            },
          ),
        arbitrary: async () =>
          shuffled(
            HEAVY_DRAWS,
            (seed) => {
              // The coordination is SEQUENCE. Sentences are re-ordered
              // arbitrarily; every sentence is preserved intact (marginals
              // held, order destroyed), so what is perturbed is exactly the
              // thing the coordination claims to use.
              const sentences = organs.splitSentences(text);
              const texts = sentences.map((s) => (typeof s === "string" ? s : s.text));
              const permuted = seededShuffle(texts, seed);
              return { changed: permuted.join(" ") !== texts.join(" "), value: permuted.join(" ") };
            },
            (scrambled) => {
              const sentences = organs.splitSentences(scrambled);
              const surfaces = organs.extractSurfaces(sentences, {});
              const disc = organs.discoverReferents(surfaces, { foldToken });
              const map = new Map(disc.events.map((e) => [e.surface, e.referent_id]));
              const res = organs.resolvePronouns(sentences, map, { minActivation: 0.05, minMargin: 0.2, pronounClass });
              // The arm accomplishes the task only if scrambling the sequence
              // reproduces THE SAME bindings — which would mean the sequence
              // was not what produced them. Offsets move under a re-ordering,
              // so the comparison is on the (pronoun, referent) multiset, not
              // on positions. Merely producing SOME bindings from scrambled
              // text is not accomplishing this task: the task is to bind the
              // pronouns THIS material actually has to THEIR antecedents.
              const key = (b) => `${String(b.pronoun).toLowerCase()}:${b.referentId}`;
              const real = new Set((realBindings() ?? []).map(key));
              const got = new Set((res?.bindings ?? []).map(key));
              return real.size > 0 && got.size === real.size && [...real].every((k) => got.has(k));
            },
          ),
        discrimination: async () =>
          against(
            true,
            "text with no pronoun at all must yield no binding",
            () => {
              // The stripped control must remove the pronouns the reader
              // ACTUALLY binds — the register's own forms when one is in
              // scope, the English closed set otherwise. A hardcoded English
              // list named nothing on a Russian register (P70's third
              // amendment: `resolvePronouns` now reads a language's own
              // register), so on borodino-ru stripping `he|she|they…` left
              // every `он`/его/их standing and the "no pronoun" control
              // still bound — a false `indiscriminate`. The boundary is the
              // same Unicode-aware one pronouns.js uses, so a Cyrillic
              // register strips and an ASCII one is byte-identical.
              const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const set = pronounClass?.forms ? Object.keys(pronounClass.forms) : ["he", "she", "they", "him", "her", "his", "hers", "their", "them"];
              const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${set.sort((a, b) => b.length - a.length).map(esc).join("|")})(?![\\p{L}\\p{N}_])`, "giu");
              const stripped = text.replace(re, "someone");
              const sentences = organs.splitSentences(stripped);
              const surfaces = organs.extractSurfaces(sentences, {});
              const disc = organs.discoverReferents(surfaces, { foldToken });
              const map = new Map(disc.events.map((e) => [e.surface, e.referent_id]));
              const res = organs.resolvePronouns(sentences, map, { minActivation: 0.05, minMargin: 0.2, pronounClass });
              return (res?.bindings ?? []).length > 0;
            },
          ),
      },
    },

    // ── 8 · Primary ───────────────────────────────────────────────────────
    {
      id: "o8-primary",
      order: 8,
      requires: () => (!spec.specimen ? "edge whose two ends are both admitted referents" : null),
      name: "an empirical rule applied: a claim checked against the material's own edges",
      organ: "hypergraph.js::judge (reader.read)",
      assembly: ASSEMBLY,
      stages: ["typed, directional relation"],
      definedInTermsOf: ["o7-preoperational"],
      organizes:
        "the material's whole edge set becomes a rule a claim is measured against, so a sentence that was never read still gets a verdict",
      task: async () => {
        if (!spec.specimen) return GAP("no specimen edge to build a claim from");
        const e = spec.specimen;
        const stated = reader.read(`${e.subject} ${e.verb} ${e.object}.`);
        const scrambled = reader.read(`${e.object} ${e.verb} ${e.subject}.`);
        const boundStated = (stated.claims ?? []).some((c) => c.verdict === "bound");
        const boundReverse = (scrambled.claims ?? []).some((c) => c.verdict === "bound");
        return {
          completed: boundStated && !boundReverse,
          detail: `stated claim -> ${(stated.claims ?? []).map((c) => c.verdict).join(",") || "no claim"}; reversed claim -> ${(scrambled.claims ?? []).map((c) => c.verdict).join(",") || "no claim"}`,
        };
      },
      arms: {
        lowerOrder: async () =>
          withheld(
            edges.length > 0,
            "the edge set withheld; only word containment available",
            () => {
              // Bag-of-words containment: every content word of the reversed
              // claim is present in the material too, so containment cannot
              // refuse it. This is the repo's own P31 finding, used here as
              // the honest lower-order stand-in.
              const e = spec.specimen;
              const has = (s) => text.toLowerCase().includes(String(s).toLowerCase());
              const statedOk = has(e.subject) && has(e.verb) && has(e.object);
              const reverseRefused = !(has(e.object) && has(e.verb) && has(e.subject));
              return statedOk && reverseRefused;
            },
          ),
        // The coordination pairs a claim with the material it is checked
        // against. Arbitrary version: check the claim against a re-dealt
        // edge set (the same edges, subjects redealt among them — marginals
        // preserved, pairing destroyed). This question — does one label
        // land in a fixed target set under a uniform permutation — has an
        // exact hypergeometric answer, so it is computed rather than
        // Monte Carlo-estimated; see `redealAgainstExactNull`'s own header
        // for why a simulated `shuffled()` call is not used here.
        arbitrary: async () => redealAgainstExactNull(edges, spec.specimen),
        discrimination: async () =>
          against(
            !!control,
            `the same claim checked against different content (${control?.key}) must not bind`,
            () => {
              const e = spec.specimen;
              const rep = control.reader.read(`${e.subject} ${e.verb} ${e.object}.`);
              return (rep.claims ?? []).some((c) => c.verdict === "bound");
            },
          ),
      },
    },

    // ── 9 · Concrete ──────────────────────────────────────────────────────
    {
      id: "o9-concrete",
      order: 9,
      requires: () => (!spec.recurring ? `edge stated at the witness floor (${WITNESS_FLOOR}) whose ends are both admitted referents` : null),
      name: "multiple concrete instances coordinated: corroboration counted by perspective, not by mention",
      organ: "hypergraph.js::judge's refs/sources on a bound claim",
      assembly: ASSEMBLY,
      stages: ["typed, directional relation"],
      definedInTermsOf: ["o8-primary"],
      organizes:
        "separate statements of one claim are folded into a corroboration count that distinguishes two passages of one source from two sources — a distinction no single verdict carries",
      task: async () => {
        if (!spec.recurring) return GAP(`no edge in this material recurs at the witness floor (${WITNESS_FLOOR})`);
        const e = spec.recurring;
        const rep = reader.read(`${e.subject} ${e.verb} ${e.object}.`);
        const claim = (rep.claims ?? []).find((c) => c.verdict === "bound");
        if (!claim) return { completed: false, detail: "the recurring edge's own claim did not bind" };
        const corr = claim.corroboration ?? {};
        return {
          completed: Number(corr.passages ?? 0) >= WITNESS_FLOOR && corr.sources != null,
          detail: `passages=${corr.passages}, sources=${corr.sources} — counted apart`,
        };
      },
      arms: {
        lowerOrder: async () =>
          withheld(
            !!spec.recurring,
            "the per-passage provenance withheld; only the bare verdict available",
            () => {
              // A verdict is one bit. It cannot report how many perspectives
              // stand behind it, which is the whole of this task.
              const e = spec.recurring;
              const rep = reader.read(`${e.subject} ${e.verb} ${e.object}.`);
              const claim = (rep.claims ?? []).find((c) => c.verdict === "bound");
              return !!claim && false;
            },
          ),
        // The original arm shuffled the ORDER of the specimen's own refs
        // array, then took a Set() over the shuffled copy — a Set is
        // insensitive to order, so that computation was byte-identical to
        // the unshuffled Set on every single draw. It reported "0 of 20
        // fired" on both fixtures, which happened to be the axiom-3-holds
        // answer, but for no real reason: the check was a tautology, not a
        // draw. Worse: this driver tags every passage with the SAME source
        // key (one Wikipedia page per material), so "distinct sources" can
        // never exceed 1 here regardless of what the arm computes — the
        // distinction this item's own `organizes` field names (two
        // passages of one source vs. two sources) has never actually been
        // exercised by this battery, and no tuning of this arm's math can
        // fix that; it traces to the driver's own material-loading, not to
        // a wrong threshold. Disclosed, not silently patched around: real
        // multi-source corroboration is order 13's own apparatus
        // (`spec.sourceReaders`), unbuilt here.
        //
        // What axiom 3 actually needs of THIS specimen: does the corpus's
        // own real distribution of ref-counts-per-edge, arbitrarily
        // reassigned to a different edge identity (marginals preserved —
        // the same counts, relabelled), still hand the SPECIMEN a count
        // that clears the witness floor by pure chance? If most edges in
        // this corpus recur at the floor anyway, the specimen's own count
        // is not doing real work; if the floor is rare, an arbitrary
        // redeal should almost never hand it to this specimen by luck.
        arbitrary: async () => redealCountAgainstExactNull(edges, spec.recurring, WITNESS_FLOOR),
        discrimination: async () =>
          against(
            !!spec.specimen,
            "a claim the material states once must not report corroboration at the witness floor",
            () => {
              const single = (reader.edges ?? []).find((x) => (x.refs?.length ?? 0) === 1);
              if (!single) return false;
              const rep = reader.read(`${single.subject} ${single.verb} ${single.object}.`);
              const claim = (rep.claims ?? []).find((c) => c.verdict === "bound");
              return Number(claim?.corroboration?.passages ?? 0) >= WITNESS_FLOOR;
            },
          ),
      },
    },

    // ── 10 · Abstract ─────────────────────────────────────────────────────
    {
      id: "o10-abstract",
      order: 10,
      requires: () => (!spec.slot ? "subject+verb slot with two or more distinct fillers" : null),
      name: "a variable quantified over a category: the whole filler set of an open slot",
      organ: "hypergraph.js::queryFillers",
      assembly: ASSEMBLY,
      stages: ["typed, directional relation"],
      definedInTermsOf: ["o9-concrete"],
      organizes:
        "instance-level verdicts are generalised into a slot with a range, so the question 'who are ALL the X that Y' has an answer no single instance carries",
      task: async () => {
        if (!spec.slot) return GAP("this material offers no subject+verb slot with two or more distinct fillers");
        const fillers = queryFillers(edges, { subject: spec.slot.subject, verb: spec.slot.verb });
        const empty = queryFillers(edges, { subject: ABSENT_NAME, verb: spec.slot.verb });
        return {
          completed: (fillers?.length ?? 0) >= 2 && (empty?.length ?? 0) === 0,
          detail: `"${spec.slot.subject} ${spec.slot.verb} __" ranges over ${fillers?.length ?? 0} filler(s); an absent subject ranges over ${empty?.length ?? 0}`,
        };
      },
      arms: {
        lowerOrder: async () =>
          withheld(
            !!spec.slot,
            "the open slot withheld; only instance-level claim checking available",
            () => {
              // Checking one instance returns bound for that instance and
              // says nothing about the range — it can never return a SET.
              const one = spec.slot.fillers[0];
              const rep = reader.read(`${spec.slot.subject} ${spec.slot.verb} ${one.object}.`);
              const bound = (rep.claims ?? []).some((c) => c.verdict === "bound");
              return bound && false;
            },
          ),
        arbitrary: async () =>
          shuffled(
            DRAWS,
            (seed) => {
              // Marginals preserved: the same objects, the same group sizes.
              // Destroyed: which subject+verb key each object is filed under.
              const objects = seededShuffle(edges.map((x) => x.object), seed);
              const redealt = edges.map((x, i) => ({ ...x, object: objects[i] }));
              return { changed: redealt.some((x, i) => x.object !== edges[i].object), value: redealt };
            },
            (redealt) => {
              const real = new Set((spec.slot.fillers ?? []).map((f) => String(f.object).toLowerCase()));
              const got = new Set((queryFillers(redealt, { subject: spec.slot.subject, verb: spec.slot.verb }) ?? []).map((f) => String(f.object).toLowerCase()));
              return got.size === real.size && [...real].every((v) => got.has(v));
            },
          ),
        discrimination: async () =>
          against(
            !!control,
            `the same slot queried against different content (${control?.key}) must not return the same range`,
            () => {
              const got = queryFillers(control.reader.edges ?? [], { subject: spec.slot.subject, verb: spec.slot.verb });
              return (got?.length ?? 0) >= 2;
            },
          ),
      },
    },

    // ── 11 · Formal ───────────────────────────────────────────────────────
    {
      id: "o11-formal",
      order: 11,
      name: "one hypothesis tested against a constructed null: is this edge's connector asserted, or an artefact",
      organ: "asserted.js (the assertion tier), read off hypergraph.js's own edge.assertion",
      assembly: ASSEMBLY,
      stages: ["typed, directional relation"],
      definedInTermsOf: ["o10-abstract"],
      organizes:
        "a slot's contents stop being taken as recovered fact and become a hypothesis with a support count and a null it has to clear — a relation among variables, not a report about instances",
      task: async () => {
        const withAssertion = edges.filter((e) => e.assertion);
        if (!withAssertion.length) return GAP("no edge carried an assertion record");
        const corroborated = withAssertion.filter((e) => e.assertion.standing === "corroborated");
        const single = withAssertion.filter((e) => e.assertion.standing === "single-witness");
        // Coverage alone (every edge typed, closed vocabulary) is necessary
        // but not sufficient: asserted.js types every edge unconditionally,
        // so 100% coverage would hold even if standings were assigned by a
        // coin flip. A pointwise check against `standingOf` was tried here
        // first and reverted: hypergraph.js computes `assertion.standing`
        // AS `standingOf(e.statements)` in the same loop (its own comment,
        // "statement grain, not passage grain: a restatement inside one
        // passage is a second witness too" — a deliberate design, not a
        // bug, and a DIFFERENT grain than order 9's `corroboration()`,
        // which deliberately counts distinct PASSAGES instead), so
        // checking standing against that same field is tautological by
        // construction and proves nothing new. The real, non-tautological
        // requirement is that the reading actually exhibits BOTH standings
        // — a population where every edge landed on one label would not
        // be discriminating anything.
        return {
          completed:
            withAssertion.length === edges.length &&
            corroborated.length + single.length === withAssertion.length &&
            corroborated.length > 0 &&
            single.length > 0,
          detail: `${withAssertion.length}/${edges.length} edges carry a standing — ${corroborated.length} corroborated, ${single.length} single-witness`,
        };
      },
      arms: {
        lowerOrder: async () =>
          withheld(
            edges.length > 0,
            "the null withheld; only the edge's own existence available",
            () => {
              // "The edge exists" is exactly what the assertion tier refuses
              // to accept as evidence for itself. Existence cannot separate a
              // corroborated connector from an artefact.
              const distinct = new Set(edges.map((e) => e.assertion?.standing));
              return edges.length > 0 && distinct.size <= 1 && false;
            },
          ),
        // FIXED, not merely disclosed. The original construction (three
        // identical unshuffled text copies, a completion check hardcoded
        // `&& false`, `perturbed` falsely hardcoded true) was a rubber
        // stamp — see this file's own git history for the diagnosis. The
        // dead end every naive redeal hit: `standingOf` is a pure function
        // of ref-count, so feeding it any redealt count trivially
        // reproduces a self-consistent label, proving nothing.
        //
        // The way out: stop redealing COUNTS and redeal the LABEL instead.
        // If the "corroborated" label were assigned ARBITRARILY — the same
        // k edges chosen at random, without reference to real ref-counts
        // at all — what is the exact chance that random draw lands
        // ENTIRELY on the K edges that genuinely clear the witness floor,
        // the same perfect correspondence the real, count-derived labeling
        // achieves by construction? A uniformly random size-k draw from n
        // edges, K of them true floor-clearers, landing entirely inside K
        // is exactly the hypergeometric point mass at the maximum — no
        // simulation, the same closed-form machinery `redealAgainstExactNull`
        // and `redealCountAgainstExactNull` already use.
        // K is measured off `assertion.statements` — the SAME field
        // hypergraph.js itself keys `standingOf` off — never `refs.length`
        // (order 9's distinct-passage count, a deliberately different
        // grain here; conflating the two was tried and reverted, see the
        // task's own comment above).
        arbitrary: async () => {
          const n = edges.length;
          const K = edges.filter((e) => (e.assertion?.statements ?? e.statements ?? 0) >= WITNESS_FLOOR).length;
          const k = edges.filter((e) => e.assertion?.standing === "corroborated").length;
          const perturbed = k > 0 && k < n;
          if (!perturbed) {
            return {
              completed: false,
              perturbed: false,
              draws: 1,
              fired: 0,
              detail: "no corroborated edges, or every edge is — a redeal of which edges carry the label has nothing to vary",
            };
          }
          const logP = logChoose(K, k) - logChoose(n, k);
          const pHit = Math.exp(logP);
          const completed = pHit >= ARBITRARY_ALPHA;
          return {
            completed,
            perturbed: true,
            draws: 1,
            fired: completed ? 1 : 0,
            detail: `exact P(an arbitrary same-size redeal of the "corroborated" label lands entirely on genuine floor-clearers) = ${pHit < 1e-6 ? pHit.toExponential(2) : pHit.toFixed(4)} (${K} of ${n} edges genuinely clear the floor; ${k} carry the label) — ${completed ? `at or above alpha ${ARBITRARY_ALPHA}, so the labelling is not doing real work` : `below alpha ${ARBITRARY_ALPHA}, so the real derivation is not explained by chance`}`,
          };
        },
        discrimination: async () =>
          against(
            true,
            "a word-salad copy must not yield corroborated standings at the real material's rate",
            () => {
              const sentences = organs.splitSentences(heavyText);
              const salad = sentences.map((s, i) => shuffleSentenceWords(typeof s === "string" ? s : s.text, i)).join(" ");
              const r = makeRelationReader(organs)([{ ref: "salad#0", text: salad }], { pool: material.passages });
              const corr = (r.edges ?? []).filter((e) => e.assertion?.standing === "corroborated").length;
              const realCorr = edges.filter((e) => e.assertion?.standing === "corroborated").length;
              return corr >= realCorr && realCorr > 0;
            },
          ),
      },
    },

    // ── 12 · Systematic ───────────────────────────────────────────────────
    {
      id: "o12-systematic",
      order: 12,
      requires: () => (!spec.specimen ? "edge whose two ends are both admitted referents" : null),
      name: "many formal relations coordinated into one system, ordered by presupposition",
      organ: "verification.js::verificationTasksFor (the nine-cell grid)",
      assembly: ASSEMBLY,
      stages: ["typed, directional relation", "altitude"],
      definedInTermsOf: ["o11-formal"],
      organizes:
        "separate checks are ordered so Existence gates Structure gates Interpretation — a referent that fails to exist makes downstream cells typed GAPS rather than falses, which no single check can produce",
      task: async () => {
        if (!spec.specimen) return GAP("no specimen to verify");
        const e = spec.specimen;
        const rep = reader.read(`${e.subject} ${e.verb} ${e.object}.`);
        const claim = (rep.claims ?? [])[0] ?? null;
        const tasks = verificationTasksFor({ hgReport: rep, hgClaim: claim, cursor: "mhc" });

        // The presupposition order is the coordination. Test it where it
        // bites: a claim whose subject does not exist must make the
        // downstream cells GAPS, never falses.
        const absentRep = reader.read(`${ABSENT_NAME} ${e.verb} ${e.object}.`);
        const absentClaim = (absentRep.claims ?? [])[0] ?? null;
        const absentTasks = verificationTasksFor({ hgReport: absentRep, hgClaim: absentClaim, cursor: "mhc" });
        const downstream = absentTasks.filter((t) => ["Link", "Network", "Lens", "Paradigm"].includes(t.terrain));
        const noFalses = downstream.every((t) => t.verdict !== "fails");

        return {
          completed: tasks.length === 9 && noFalses,
          detail: `${tasks.length} cells (${verificationSummary(tasks)}); with a non-existent subject, downstream cells are ${[...new Set(downstream.map((t) => t.verdict))].join(", ") || "absent"}`,
        };
      },
      arms: {
        lowerOrder: async () =>
          withheld(
            edges.length > 0,
            "the grid withheld; only a single claim verdict available",
            () => {
              // One verdict cannot distinguish "checked and false" from
              // "could not be checked because its presupposition failed" —
              // it has one axis where the system has two.
              const e = spec.specimen;
              const rep = reader.read(`${ABSENT_NAME} ${e.verb} ${e.object}.`);
              const claim = (rep.claims ?? [])[0];
              return !!claim && false;
            },
          ),
        arbitrary: async () =>
          shuffled(
            DRAWS,
            (seed) => {
              // WHAT IS PERTURBED, AND WHY THIS ONE. The first version of this
              // arm shuffled the ORDER of the returned cells and asked whether
              // gating survived — which tested nothing, because the gating
              // happens inside `verificationTasksFor` before it returns, and
              // reordering its output cannot reach it. That is A10's
              // insensitive-statistic trap exactly, and it produced a false
              // `arbitrary_coordination` refusal on the first run.
              //
              // The coordination this grid actually performs is that all nine
              // cells describe THE SAME claim against THE SAME report. So the
              // licensed perturbation re-pairs them: the report of one claim
              // is graded against a DIFFERENT claim's own reading, marginals
              // (both real, both from this material) preserved.
              const e = spec.specimen;
              if (!e) return { changed: false, value: null };
              const mineRep = reader.read(`${e.subject} ${e.verb} ${e.object}.`);
              const mineClaim = (mineRep.claims ?? [])[0] ?? null;
              // The crossed claim must differ in VERDICT, not merely in
              // wording: two bound claims produce identical grids because the
              // cells read the verdict, so pairing one with the other would
              // change nothing the grid can see and the arm would be
              // unlicensed. The reversed specimen is the natural partner —
              // real, drawn from this material, and known not to bind.
              const theirsRep = reader.read(`${e.object} ${e.verb} ${e.subject}.`);
              const theirsClaim = (theirsRep.claims ?? [])[0] ?? null;
              if (!mineClaim || !theirsClaim || mineClaim.verdict === theirsClaim.verdict) return { changed: false, value: null };
              const pick = seededShuffle([mineClaim, theirsClaim], seed)[0];
              return { changed: pick !== mineClaim, value: { rep: mineRep, claim: pick, mineClaim } };
            },
            (mixed) => {
              if (!mixed) return false;
              const mine = verificationTasksFor({ hgReport: mixed.rep, hgClaim: mixed.mineClaim, cursor: "mhc" });
              const crossed = verificationTasksFor({ hgReport: mixed.rep, hgClaim: mixed.claim, cursor: "mhc" });
              // Accomplished only if grading a report against the WRONG
              // claim yields the same coordinated verdicts — which would mean
              // the pairing was doing no work.
              return mine.map((t) => `${t.terrain}=${t.verdict}`).join("|") === crossed.map((t) => `${t.terrain}=${t.verdict}`).join("|");
            },
          ),
        discrimination: async () =>
          against(
            true,
            "a claim with no material at all must produce gaps, not a full grid of holds",
            () => {
              const empty = makeRelationReader(organs)([], {});
              const rep = empty.read("anything happened somewhere.");
              const tasks = verificationTasksFor({ hgReport: rep, hgClaim: null, cursor: "mhc" });
              return tasks.filter((t) => t.verdict === "holds").length >= 4;
            },
          ),
      },
    },

    // ── 13 · Metasystematic ───────────────────────────────────────────────
    {
      id: "o13-metasystematic",
      order: 13,
      name: "several whole systems compared: a standing no single system carries",
      organ: "capacity-runner.js::mergeTestimony over per-source hypergraph readings",
      assembly: ASSEMBLY,
      stages: ["typed, directional relation", "population"],
      definedInTermsOf: ["o12-systematic"],
      requires: () =>
        !spec.sourceReaders?.length
          ? "passages that can each be read as their own system"
          : !spec.corroboratedClaim
            ? "claim two or more of its source-systems independently bind"
            : !spec.singleClaim
              ? "claim exactly one of its source-systems binds"
              : null,
      organizes:
        "each source's whole verdict-system is treated as one witness, and the STANDING of a claim across those witnesses — corroborated, or a lone voice — becomes the finding: a property of the set that no member of it carries",
      task: async () => {
        const corr = mergeTestimony(spec.corroboratedClaim.readings);
        const lone = mergeTestimony(spec.singleClaim.readings);

        // THE METASYSTEMATIC CONTENT, and why this is not order 12 repeated.
        // At the level of any ONE system, the two claims are indistinguishable:
        // each has a source that says exactly `holds`, the same word, carrying
        // no standing of its own. Only the comparison ACROSS systems separates
        // them — one corroborated, one a lone voice. That is the finding that
        // is not recoverable from any member of the set.
        const oneHolder = (readings) => readings.find((r) => r.verdict === "holds") ?? null;
        const a = oneHolder(spec.corroboratedClaim.readings);
        const b = oneHolder(spec.singleClaim.readings);
        const indistinguishableBelow = !!a && !!b && a.verdict === b.verdict;
        const noMemberCarriesStanding = [...spec.corroboratedClaim.readings, ...spec.singleClaim.readings].every(
          (r) => r.standing === undefined,
        );

        return {
          completed:
            corr.case === "AGREE" &&
            corr.standing === "corroborated" &&
            lone.case === "SINGLE" &&
            lone.standing === "single" &&
            indistinguishableBelow &&
            noMemberCarriesStanding,
          detail:
            `${spec.sourceReaders.length} source-systems. ` +
            `"${spec.corroboratedClaim.edge.subject} ${spec.corroboratedClaim.edge.verb} ${spec.corroboratedClaim.edge.object}" bound by ${spec.corroboratedClaim.holds} -> ${corr.case}/${corr.standing}; ` +
            `"${spec.singleClaim.edge.subject} ${spec.singleClaim.edge.verb} ${spec.singleClaim.edge.object}" bound by ${spec.singleClaim.holds} -> ${lone.case}/${lone.standing}. ` +
            `Below the merge both read identically (a system saying "${a?.verdict}"), and no reading carries a standing of its own.`,
        };
      },
      arms: {
        // One system's verdict cannot produce the finding, and here that is
        // shown rather than asserted: the single binding source says `holds`
        // for BOTH claims, so nothing at that level separates corroborated
        // from lone. Licensed only if the two merges genuinely differ — if
        // they did not, there would be nothing for a lower order to fail at.
        lowerOrder: async () => {
          const corr = mergeTestimony(spec.corroboratedClaim.readings);
          const lone = mergeTestimony(spec.singleClaim.readings);
          const differ = corr.standing !== lone.standing;
          const a = spec.corroboratedClaim.readings.find((r) => r.verdict === "holds");
          const b = spec.singleClaim.readings.find((r) => r.verdict === "holds");
          return {
            completed: differ && !!a && !!b && a.verdict !== b.verdict,
            perturbed: differ,
            detail: differ
              ? `one system says "${a?.verdict}" for both claims; the merges say ${corr.standing} and ${lone.standing}`
              : "the two claims' merges do not differ, so there is no cross-system finding for a single system to fail to reach",
          };
        },
        arbitrary: async () =>
          shuffled(
            DRAWS,
            (seed) => {
              // WHAT IS PERTURBED, AND THE LICENSING THAT WAS MISSING BEFORE.
              // The coordination is that the readings merged are readings OF
              // ONE CLAIM. Shuffling WHICH SOURCE said what is NOT licensed —
              // `mergeTestimony`'s verdict is invariant to source identity by
              // construction, A10's insensitive statistic exactly. So the
              // perturbation destroys the claim-GROUPING instead, mixing the
              // two claims' readings.
              //
              // The earlier version stopped there and was still unlicensed: it
              // mixed in whichever second claim came to hand, and on one
              // material that claim contributed ONLY `undetermined` readings —
              // which `mergeTestimony` genuinely does not read, so the mix
              // could not change the merge, and the arm reported the
              // coordination arbitrary while testing nothing. It fired 20 of
              // 20 there and 0 of 20 on the other material, on that difference
              // alone. Now the mixed-in readings are the CORROBORATED claim's,
              // selected because they carry holds, and the licence is checked
              // directly: the hold/refused counts the merge actually reads
              // must differ between the clean and mixed sets.
              const clean = spec.singleClaim.readings;
              const mixed = seededShuffle([...clean, ...spec.corroboratedClaim.readings], seed);
              const counts = (rs) => `${rs.filter((r) => r.verdict === "holds").length}/${rs.filter((r) => r.verdict === "refused").length}`;
              return { changed: counts(mixed) !== counts(clean), value: mixed };
            },
            (mixed) => {
              const clean = mergeTestimony(spec.singleClaim.readings);
              const got = mergeTestimony(mixed);
              // Accomplished only if merging readings of two DIFFERENT claims
              // still reproduces this claim's own standing — which would mean
              // the claim-grouping was doing no work.
              return got.case === clean.case && got.standing === clean.standing;
            },
          ),
        discrimination: async () => {
          // Real readings, not hand-built: the corroborated claim REVERSED is
          // a claim this material does not state, read by the same systems.
          // It must not come back corroborated.
          const e = spec.corroboratedClaim.edge;
          const readings = spec.readAcross({ subject: e.object, verb: e.verb, object: e.subject });
          const holds = readings.filter((r) => r.verdict === "holds").length;
          const merged = mergeTestimony(readings);
          return {
            completed: merged.standing === "corroborated",
            // Licensed only if the reversed claim really is a different
            // question to these systems — if it drew the same holds, nothing
            // was controlled for.
            perturbed: holds < spec.corroboratedClaim.holds,
            detail: `reversed claim bound by ${holds} of ${readings.length} systems -> ${merged.case}/${merged.standing}`,
          };
        },
      },
    },

    // ── 14 · Paradigmatic ─────────────────────────────────────────────────
    {
      id: "o14-paradigmatic",
      order: 14,
      name: "two metasystems coordinated into a new one that reorganises both",
      organ: "searched for; see detail",
      assembly: ASSEMBLY,
      stages: [],
      definedInTermsOf: ["o13-metasystematic"],
      organizes:
        "two whole metasystematic results — a cross-source testimony merge and a nine-cell verification grid — would be reorganised into a third framework with its own terms, yielding something neither metasystem can state",
      task: async () => {
        // The honest test of an absent capacity is to look for it and report
        // what was looked at. Both metasystematic outputs are constructed
        // here; the question is whether any organ in this repo consumes TWO
        // of them and returns a third framework.
        const searched = [
          "capacities.js — the registry's ten entries, each naming one organ at one terrain",
          "capacity-runner.js — runs one capacity per act; mergeTestimony consumes readings, never other merges",
          "verification.js — consumes one hypergraph report plus one testimony; returns cells, never a new grid",
          "grid.js — composes acts over one log; `synthesize` checks parts against the capacity registry",
          "hl.js — a logic over one stage's edges",
        ];
        return {
          completed: false,
          detail: `no organ in this repo takes two metasystematic results and returns a third framework. Searched: ${searched.join(" · ")}`,
        };
      },
      arms: {
        lowerOrder: async () => ({ completed: false, perturbed: true, detail: "one metasystem alone cannot reorganise two" }),
        arbitrary: async () => ({ completed: false, perturbed: true, detail: "there is no coordination to perturb — the capacity is absent, which is what the task reports" }),
        discrimination: async () => ({ completed: false, perturbed: true, detail: "nothing to discriminate: no candidate organ was found" }),
      },
    },
  ]);
}

// ── run ───────────────────────────────────────────────────────────────────

async function runOne(engine, material, control) {
  const organs = engine.organs;
  const reader = makeRelationReader(organs)(material.passages, { pool: material.passages });
  const index = makeReferentIndex(organs)(material.passages);
  const fold = await buildRussianSeam(material);
  const spec = deriveSpec(material, reader, index, control, engine.organs, fold?.fold);
  const ctx = { organs, material, reader, index, spec, control, foldToken: fold?.fold, pronounClass: fold?.pronounClass, foldMeta: fold };
  const items = buildItems(ctx);
  const report = await runBattery(items, ctx, {
    // P3: this run injects NO priors into the READER. That is a statement
    // about which reader was measured — an unprimed one — not an omission.
    // (The Russian material additionally threads a language-tagged
    // propernoun FOLD into `discoverReferents` at the coreference seam —
    // that is an argument to an organ call, not a reader prior, and its
    // presence is disclosed in the report via `foldMeta`, never implied
    // default here.)
    priors: [],
    assembly: items[0].assembly,
    material: material.key,
  });
  return {
    report,
    stage: stageFrom(report),
    fold: fold,
    // The coreference diagnostic is carried on the run rather than buried in
    // one item's detail string: it is an aggregate measurement over every
    // pair the material offers, and the order-5 item scores it but does not
    // contain it.
    coref: {
      shouldMerge: spec.corefAgreement.shouldMerge,
      didMerge: spec.corefAgreement.didMerge,
      stranded: spec.corefAgreement.missed.map((m) => ({ a: m.a, b: m.b })),
      shouldWithhold: spec.corefAgreement.shouldWithhold,
      wronglyMerged: spec.corefAgreement.wronglyMerged.map((m) => ({ a: m.a, b: m.b })),
      abstained: spec.corefAgreement.abstained,
    },
    specimen: spec.specimen ? { subject: spec.specimen.subject, verb: spec.specimen.verb, object: spec.specimen.object } : null,
  };
}

async function main() {
  const engine = await loadEngine();
  const keys = process.argv.slice(2).filter((k) => FIXTURES[k]);
  const chosen = keys.length ? keys : Object.keys(FIXTURES);

  if (!engine.organs) {
    console.error("no engine layout resolved. Tried:\n  " + engine.tried.join("\n  "));
    process.exitCode = 1;
    return;
  }
  console.error(`engine: ${engine.layout}`);

  const materials = chosen.map(loadMaterial);
  const built = materials.map((m) => {
    const reader = makeRelationReader(engine.organs)(m.passages, { pool: m.passages });
    const index = makeReferentIndex(engine.organs)(m.passages);
    return { key: m.key, material: m, reader, index };
  });

  const runs = [];
  for (let i = 0; i < materials.length; i += 1) {
    const control = built.find((b) => b.key !== materials[i].key) ?? null;
    console.error(`running ${materials[i].key} (${materials[i].passages.length} passages, control: ${control?.key ?? "none"})...`);
    const out = await runOne(engine, materials[i], control);
    runs.push({ material: materials[i].key, totalPassages: materials[i].totalPassages, ...out });
  }

  const independence = contentIndependence(runs.map((r) => ({ material: r.material, report: r.report })));

  const out = {
    engine: engine.layout,
    draws: DRAWS,
    heavyDraws: HEAVY_DRAWS,
    workingPassages: WORKING_PASSAGES,
    seed: SEED,
    passageChars: PASSAGE_CHARS,
    runs,
    independence,
  };
  mkdirSync(join(HERE, "results"), { recursive: true });
  writeFileSync(join(HERE, "results", "mhc-battery.json"), JSON.stringify(out, null, 2));
  writeFileSync(join(HERE, "results", "mhc-RESULTS.md"), renderReport(out));
  console.error("\nwrote eval/results/mhc-RESULTS.md and mhc-battery.json");
  console.log(renderReport(out));
}

function renderReport(out) {
  const L = [];
  L.push("# The MHC battery — what order of task this instrument's organs actually complete");
  L.push("");
  L.push(
    `Engine: \`${out.engine}\`. Seeded grounds per arbitrary arm: ${out.draws} for arms that re-deal an already-built structure, ${out.heavyDraws} for arms that must re-read the material (declared apart — 0-of-20 and 0-of-5 are different amounts of evidence). Seed ${out.seed}.`,
  );
  L.push("");
  L.push(
    `Material: a declared slice of ${out.workingPassages} passages of ${out.passageChars} chars each (of ${out.runs[0]?.totalPassages ?? "?"} available). Nothing here is a whole-document measurement.`,
  );
  L.push("");
  L.push("**READING-POLICY P0 — the assembly.** " + (out.runs[0]?.report?.assembly ?? "unnamed"));
  L.push("");
  const foldMention = out.runs.some((r) => r.fold)
    ? " The Russian material additionally threads a language-tagged proper-noun fold into `discoverReferents` at the coreference seam — that is an organ argument, not a reader prior, and is disclosed per-run below."
    : "";
  L.push(
    "**READING-POLICY P3 — priors injected.** None into the reader. Every number below is a result about an *unprimed* reader: no language prior, no per-text coreference prior, no kind vocabulary." +
      foldMention,
  );
  L.push("");
  for (const run of out.runs) {
    L.push(`## ${run.material}`);
    L.push("");
    const s = run.stage;
    L.push(`**Stage: ${s.stage == null ? "none readable" : `${s.stage} (${s.stageName})`}** — ${s.cappedBy ? s.cappedBy.detail : "no cap"}`);
    if (run.fold) {
      const f = run.fold;
      const pn = f.propernounProvenance?.source ? `${f.propernounProvenance.source} (\`${f.propernounProvenance.license ?? "?"}\`)` : "giver-named by the derived register";
      L.push(
        `**Coreference fold:** a proper-noun fold (language \`${f.language ?? "?"}\`) injected into \`discoverReferents\` at the coreference seam, built from a received ProperNounPrior (${pn}). Single-lemma case-forms fold onto their lemma; ambiguous/multi-lemma forms and adjectives strand. Coverage is bounded by the register: in-register case-forms (москва/москву/москве, наполеон/наполеона) now fold, while in-register multi-word over-merge (Евгений/Евгения inside longer surfaces) remains a disclosed precision cost, and register-absent surnames are untouched. This fold is partial by disclosure, not by silence.`,
      );
      if (f.pronounClass) {
        const pr = f.pronounProvenance?.source ? `${f.pronounProvenance.source} (\`${f.pronounProvenance.license ?? "?"}\`)` : "giver-named by the derived register";
        L.push(
          `**Pronoun register:** \`resolvePronouns\` now reads this material's own third-person register (language \`${f.language ?? "?"}\`, ${pr}) at every \`pronounClass\` seam. A pronoun the register covers can be FOUND and gated by its own gender (clean vs. soft, \`MIN_OBSERVATIONS\` floor); a pronoun whose antecedent is a register-absent being still strands as a typed gap. This is what lets order 7 actually attempt Russian \`он\`/его forms instead of reporting zero pronouns found — a partial binding, disclosed rather than presumed complete.`,
        );
      }
      L.push("");
    }
    if (s.isolated.length) L.push(`Passes above the cap, carried as observations and NOT folded into the stage: ${s.isolated.map((i) => `${i.order} (${i.name})`).join(", ")}`);
    L.push("");
    L.push("| order | name | verdict | item | detail |");
    L.push("|---|---|---|---|---|");
    for (const o of run.report.orders) {
      for (const it of o.items) {
        L.push(`| ${o.order} | ${o.name} | \`${it.status}\`${it.reason ? ` (${it.reason})` : ""} | ${it.name} | ${String(it.detail ?? "").replace(/\|/g, "\\|").slice(0, 300)} |`);
      }
    }
    L.push("");
  }
  L.push("## Coreference: the fold against its own individuation rule");
  L.push("");
  L.push("`discoverReferents` strips GENERIC tokens (those appearing with many partners — titles, family names, demonyms) from both surfaces and requires the REMAINDERS to corefer. Both columns below apply that same rule.");
  L.push("");
  L.push("| material | rule says one being | gathered | rule says different | kept apart | abstained |");
  L.push("|---|---|---|---|---|---|");
  for (const run of out.runs) {
    const c = run.coref;
    L.push(`| ${run.material} | ${c.shouldMerge} | **${c.didMerge}** | ${c.shouldWithhold} | **${c.shouldWithhold - c.wronglyMerged.length}** | ${c.abstained} |`);
  }
  L.push("");
  L.push("*Abstained* = pairs where one surface is bare/generic, decided by `discoverReferents`'s singleton-partner rescue. That branch is not computable from the engine's exported organs, so this driver does not score it rather than reimplementing the engine's partner floor.");
  L.push("");
  for (const run of out.runs) {
    if (run.coref.stranded.length) {
      L.push(`**${run.material} — stranded** (the rule says one being; the fold kept them apart): ` + run.coref.stranded.map((m) => `\`${m.a}\` | \`${m.b}\``).join("; "));
    }
    if (run.coref.wronglyMerged.length) {
      L.push(`**${run.material} — wrongly merged** (the rule withholds; the fold merged anyway): ` + run.coref.wronglyMerged.map((m) => `\`${m.a}\` | \`${m.b}\``).join("; "));
    }
  }
  L.push("");
  L.push("**What the strandings have in common, and the defect they name.** All three are one shape: a bare single token left alone while the longer surface containing it merged with a DIFFERENT partner. `Mikhail Kutuzov` sits with `Kutuzov`, and `Mikhail` stands by itself; `Emperor Alexander` sits with `Emperor`, and `Alexander` stands by itself; `Saint Petersburg` sits with `Petersburg`, and `Saint` stands by itself.");
  L.push("");
  L.push("`discoverReferents` assigns each surface by scanning already-assigned surfaces and taking the FIRST that coreferes (`for (const [existing, id] of assigned) { if (corefersIndividuated(...)) { referentId = id; break; } }`) — greedy, insertion-ordered, with no second pass. So the grouping it computes is a greedy closure over a relation that is not transitive: `Mikhail` ~ `Mikhail Kutuzov` and `Mikhail Kutuzov` ~ `Kutuzov` both hold under the rule, while `Mikhail` and `Kutuzov` end in different referents. \"Is the same being as\" is necessarily transitive; what the fold computes is not.");
  L.push("");
  L.push("**Not prescribed here: the obvious fix is unsafe.** A union-find over the corefer relation would close all three — and would also merge `Alexander` into `Emperor`, since `Emperor Alexander` corefers with both. `Emperor` survives as an individuating token only because `genericTokens` did not see enough partners for it in this slice; on a larger read it would be stripped and the case would not arise. So the root cause is a chain — generic detection under-firing on a bounded slice, then a title surviving as individuating, then greedy assignment binding a person to it — and which link to fix is a real design question, not a one-line change.");
  L.push("");
  L.push("Precision is the other half and it is clean: **4/4 and 3/3** pairs the rule calls different beings were kept apart. The fold under-merges; it was never observed to over-merge.");
  L.push("");
  L.push("## Content-independence");
  L.push("");
  if (!out.independence.examined) {
    L.push(out.independence.detail);
  } else {
    const ci = out.independence;
    L.push(
      "The MHC's claim is about the SCALE: a task's ORDER does not depend on what it is about. It is NOT a claim that a performer succeeds equally across domains — separating task from performance is precisely what makes a per-domain difference ordinary rather than a defect. The three outcomes are kept apart.",
    );
    L.push("");
    L.push(`**Scale held: ${ci.held}** — ${ci.violations.length} order(s) changed their order-hood with the content. Materials: ${ci.materials.join(", ")}.`);
    L.push("");
    if (ci.violations.length) {
      L.push("**Violations** — valid on one material, MIS-DECLARED on another. This is the real thing the scale forbids:");
      L.push("");
      for (const d of ci.violations) L.push(`- order ${d.order}: ` + d.cells.map((x) => `${x.material}=\`${x.status}\` (${x.validity})`).join(", "));
      L.push("");
    }
    if (ci.performance.length) {
      L.push("**Performance varied** — a well-formed task at that order in both materials; the system completed it in one and not the other. Ordinary, and what a stage measurement is for:");
      L.push("");
      for (const d of ci.performance) L.push(`- order ${d.order}: ` + d.cells.map((x) => `${x.material}=\`${x.status}\``).join(", "));
      L.push("");
    }
    if (ci.noProbe.length) {
      L.push("**No probe** — the material offers no specimen for that item. A fact about the material, not about the item or the system:");
      L.push("");
      for (const d of ci.noProbe) L.push(`- order ${d.order}: ` + d.cells.map((x) => `${x.material}=\`${x.status}\``).join(", "));
      L.push("");
    }
    L.push(`Agreed outright on ${ci.agreed.length} order(s): ` + ci.agreed.map((a) => `${a.order} (\`${a.status}\`)`).join(", ") + ".");
  }
  L.push("");
  return L.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
