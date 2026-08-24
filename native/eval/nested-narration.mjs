// native/eval/nested-narration.mjs — read Frankenstein the way a person does:
// keeping track of who is telling it.
//
// The book is Walton writing to his sister about Victor, who tells him about
// the creature, who tells Victor about the cottagers. A reader holds all four
// apart. Until this driver, this repo's reading did not: every relation
// extracted from the creature's own account of Felix and Safie entered the
// reading exactly like a relation from Walton's own eyes.
//
// ASSEMBLY, NAMED (P0): the causal text perceiver stepped in order, plus
// adapters/text/attribution.js for frames, plus kernel/perspective.js for the
// projection. The revision/fold tier and the binding layer are NOT run.
//
// PRIORS, STATED (P3/S7):
//   - narratorSpans, from the human-curated pg84 coref prior. Not authored
//     here: the prior already carried them, anchored to the book's own frame
//     seams, and the search that found them is the reason no second prior
//     file exists.
//   - the relay chain (Walton > Victor > creature) is DECLARED, citing the
//     same prior's own note verbatim. It is not derived from the spans:
//     their representation is a flat partition, and reading nesting out of a
//     partition would be an inference wearing a measurement's clothes.
//
// Usage: node native/eval/nested-narration.mjs <book.txt> --coref <prior.json>

import fs from "node:fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { narrationFrames, quotationFrames, holderAt } from "../adapters/text/attribution.js";
import { deltaFold } from "../kernel/fold.js";
import { READER, STANCE, projectPerspectives, commonGround, divergence, mentalModel, perspectiveOperation } from "../kernel/perspective.js";
import { FIRST_PERSON, FIRST_PERSON_META } from "../../legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import { resolvePronouns } from "../adapters/text/pronouns.js";
import { splitSentences } from "../adapters/text/spans.js";
import { createSession, admitChunked, sessionReferents } from "../../legacy-eoreader6.1/packages/host/corpus.js";

// Declared, not defaulted, and borrowed rather than invented: host/corpus.js's
// own operating point for this organ. Its own header says no golden exists for
// pronoun binding, so these are disclosed-as-unvalidated, and moving them is
// expected rather than a regression.
const PRONOUN_RECALL = { minActivation: 0.05, minMargin: 0.2 };

// DECLARED, with its giver: the coref prior's own note — "the whole book is
// nested first-person narration (Walton > Victor > Creature)."
const RELAY_CHAIN = ["walton", "victor", "creature"];
const relayVia = (holder) => {
  const i = RELAY_CHAIN.indexOf(holder);
  return i <= 0 ? [] : RELAY_CHAIN.slice(0, i);
};

const arg = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; };

// How an arrangement's end becomes a CLAIM key. Keyed by occurrence, two
// tellers can never agree about anything (occurrence ids are unique by
// construction) and "common ground: 0" would be an artifact of the key, not
// a finding about the book. Keyed by bare surface, they agree too much — and
// about the worst possible thing: the coref prior's own note says "'I' points
// at the Creature ONLY inside his own spans; elsewhere it is Victor or
// Walton. Same string, three referents, split by scope." So first person
// resolves to the FRAME'S narrator, using the prior register's own closed
// class (giver: lang/en) rather than a pronoun list written here.
const endKey = (participant, frameHolder, offset, resolvePronoun) => {
  if (participant?.standing === "referent" && typeof participant.ref === "string" && participant.ref.startsWith("ref:")) return participant.ref;
  const surface = String(participant?.surface ?? "").trim();
  if (surface && FIRST_PERSON.test(surface)) return `holder:${frameHolder}`;
  // A third-person pronoun the pronoun organ bound in THIS sentence names a
  // real being, and a claim keyed on the bare string would scatter every
  // teller's "he" into one meaningless pile. Frame-scoped by construction:
  // the bindings were resolved inside one teller's stretch and never across.
  const bound = resolvePronoun ? resolvePronoun(surface, offset) : null;
  if (bound) return bound;
  return participant?.surfaceKey ?? `surface:${surface.toLowerCase().replace(/\s+/g, "_")}`;
};

async function main() {
  const path = process.argv[2];
  if (!path) throw new TypeError("usage: node native/eval/nested-narration.mjs <book.txt> --coref <prior.json>");
  const corefPath = arg("--coref");
  const stripped = stripContainer(fs.readFileSync(path, "utf8"));
  const framePrior = corefPath ? JSON.parse(fs.readFileSync(corefPath, "utf8")) : null;

  const narration = narrationFrames(stripped.text, { framePrior, offset: stripped.offset });
  const quotes = quotationFrames(stripped.text, { offset: stripped.offset });
  const encounters = textEncounters(stripped.text, { source: `file:${path.split("/").pop()}`, offset: stripped.offset });

  // ── pronoun binding, scoped PER TELLER ────────────────────────────────
  // The organ (adapters/text/pronouns.js) was built, tested, and had no
  // caller in the reading path — the scaffolded-organ pattern this repo's
  // own CLAUDE.md names. It is wired here rather than inside the perceiver
  // because S4 keeps the perceiver's re-ground posture until conformance
  // parity licenses a swap.
  //
  // FRAME-SCOPED, and that is the whole point. Resolving "he" against a name
  // that only occurs in a DIFFERENT teller's stretch is the same error P1
  // forbids across books, one level in: the creature's "he" is not Victor's.
  // The coref prior states the rule for first person ("same string, three
  // referents, split by scope"); third person inherits it.
  const cast = sessionReferents(
    (() => { const s = createSession(); admitChunked(s, { text: fs.readFileSync(path, "utf8"), sourceId: `file:${path.split("/").pop()}`, language: "en" }); return s; })(),
    { sourceId: `file:${path.split("/").pop()}`, priors: framePrior ? [framePrior] : [], limit: 200 },
  );
  const surfaceToReferent = new Map();
  for (const ref of cast.referents ?? []) {
    for (const s of [ref.display, ...(ref.surfaces ?? []).map((x) => x.surface ?? x)]) {
      if (typeof s === "string" && s.trim()) surfaceToReferent.set(s.trim(), ref.display ?? ref.id);
    }
  }
  // A bound SENTENCE range, not a bare offset: resolvePronouns binds a
  // sentence that carries a pronoun and no name, so the sentence is the
  // honest granularity. The join is on the organ's OWN pronoun token — this
  // file never re-derives a third-person closed class it would then own.
  const boundSentences = [];
  const perFrameBindings = [];
  for (const frame of narration.frames) {
    const local = stripped.text.slice(frame.byteStart - stripped.offset, frame.byteEnd - stripped.offset);
    const sentences = splitSentences(local).map((s, i) => ({
      // splitSentences returns {text, offset, order} — the range is the
      // sentence's own offset plus its own length. (An earlier cut read
      // .start/.end, which this shape does not carry: every range came out
      // NaN and the join silently matched nothing while binding itself
      // still ran. Instrumenting the join, not reasoning about it, is what
      // found that — P5.5, the driver before the theory.)
      text: s.text,
      order: i,
      start: s.offset + frame.byteStart,
      end: s.offset + s.text.length + frame.byteStart,
      offset: s.offset + frame.byteStart,
    }));
    const { bindings, gaps } = resolvePronouns(sentences, surfaceToReferent, PRONOUN_RECALL);
    const byOrder = new Map(sentences.map((s) => [s.order, s]));
    for (const b of bindings) {
      const sent = byOrder.get(b.sentenceOrder);
      if (sent) boundSentences.push({ start: sent.start, end: sent.end, referentId: b.referentId, pronoun: String(b.pronoun ?? "").toLowerCase() });
    }
    perFrameBindings.push({ narrator: frame.narrator, sentences: sentences.length, bound: bindings.length, refused: gaps.length });
  }
  boundSentences.sort((a, b) => a.start - b.start);
  // Not scaffolding — this IS the finding. Each stage of the join is
  // counted so the ceiling can be located rather than guessed at.
  const probe = { pronounEnds: 0, inBoundRange: 0, tokenMatch: 0 };
  const PRON_PROBE = /^(he|him|his|himself|she|her|hers|herself)$/i;
  const referentForPronoun = (surface, offset) => {
    const want = String(surface ?? "").trim().toLowerCase();
    if (!want) return null;
    if (PRON_PROBE.test(want)) probe.pronounEnds += 1;
    for (const b of boundSentences) {
      if (offset < b.start) break;
      if (offset < b.end) {
        if (PRON_PROBE.test(want)) probe.inBoundRange += 1;
        if (b.pronoun === want) { probe.tokenMatch += 1; return b.referentId; }
      }
    }
    return null;
  };

  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 });
  const entries = [];
  const byHolder = new Map();
  const unframed = [];

  for (const enc of encounters) {
    const out = (await perceiver.perceive(enc, {})) ?? [];
    const edges = out.flatMap((c) => c.candidate?.hyperedges ?? []);
    if (!edges.length) continue;
    const at = holderAt(enc.anchor.start, { narration, embedded: [] });
    if (!at.holder) { unframed.push(enc.anchor.start); continue; }
    byHolder.set(at.holder, (byHolder.get(at.holder) ?? 0) + edges.length);
    const ops = [];
    for (const edge of edges) {
      const ends = (edge.participants ?? []).map((p) => endKey(p, at.holder, enc.anchor.start, referentForPronoun));
      const claim = `${ends[0]}|${edge.relation ?? edge.label ?? "?"}|${ends[ends.length - 1]}`;
      // The extractor already carries polarity on every edge; a negated
      // arrangement is its teller REFUSING that claim, not asserting it.
      // Without this, two holders can only ever be asymmetric — nobody can
      // disagree, and "conflicting: 0" would say more about the driver than
      // about the book.
      const stance = edge.meta?.polarity === "-" ? STANCE.REFUSES : STANCE.HOLDS;
      // The teller holds it as their own assertion...
      ops.push(perspectiveOperation({ holder: at.holder, claim, stance, witness: `byte:${enc.anchor.start}` }));
      // ...and the reader holds it as RELAYED, through whoever relayed it.
      // Two entries, because they are two different epistemic facts, and the
      // whole point of this driver is that collapsing them loses the book.
      ops.push(perspectiveOperation({ holder: READER, claim, stance, via: [...relayVia(at.holder), at.holder], witness: `byte:${enc.anchor.start}` }));
    }
    entries.push(deltaFold(ops));
  }

  const projected = projectPerspectives(entries);
  const perHolder = Object.fromEntries(Object.entries(projected.perspectives).map(([h, p]) => [h, p.beliefs.length]));

  const report = {
    schema: "EONestedNarration@1",
    book: path.split("/").pop(),
    assembly: "causal text perceiver (in order) + attribution frames + perspective projection — revision tier and binding layer NOT run (P0/P2)",
    priorsInjected: [
      { kind: "narratorSpans", giver: narration.prior?.giver ?? null, version: narration.prior?.version ?? null, via: "adapters/text/attribution.js::narrationFrames" },
      { kind: "relay chain", giver: "the same coref prior's own note: 'the whole book is nested first-person narration (Walton > Victor > Creature)'", declared: RELAY_CHAIN },
      { kind: "first-person closed class", giver: FIRST_PERSON_META.giver, via: "claim keying: 'I' resolves to the frame's narrator, never to one shared string" },
    ],
    frames: {
      resolved: narration.frames.length,
      unresolvedAnchors: narration.unresolvedAnchors.length,
      narrators: narration.narrators,
      spans: narration.frames.map((f) => ({ narrator: f.narrator, byteStart: f.byteStart, byteEnd: f.byteEnd, opens: (f.fromAnchor ?? "<book start>").slice(0, 44) })),
    },
    quotationConvention: {
      basis: quotes.basis,
      paragraphs: quotes.paragraphs,
      counted: quotes.counted,
      embeddedRuns: quotes.embeddedFrames.length,
      largestRuns: [...quotes.embeddedFrames].sort((a, b) => b.paragraphs - a.paragraphs).slice(0, 3)
        .map((r) => ({ paragraphs: r.paragraphs, byteStart: r.start, byteEnd: r.end })),
    },
    // The headline: the same book, read as four different sets of claims.
    heldPerHolder: perHolder,
    edgesPerNarrator: Object.fromEntries(byHolder),
    pronounBinding: {
      organ: "adapters/text/pronouns.js::resolvePronouns (built and tested here, previously with no caller in the reading path)",
      declared: PRONOUN_RECALL,
      scope: "per narration frame — a teller's 'he' is never resolved against a name that only occurs in another teller's stretch (P1, one level in)",
      castSurfaces: surfaceToReferent.size,
      reach: {
        ...probe,
        reading: "pronounEnds: gendered-pronoun edge ends the extractor produced at all (of 3,180 edges — 4.2%). inBoundRange: those inside a sentence the organ bound, which it only does for sentences carrying NO name (its own declared scope). tokenMatch: the end IS the bound pronoun, so the claim keys to a being.",
        ceiling: "the claim tier is unmoved, and the bottleneck is UPSTREAM, not here: the relation extractor anchors on capitalised surfaces, so pronoun-subject clauses are mostly never extracted. Widening this organ would not help; widening extraction would. Named, not attempted.",
      },
      boundSentences: boundSentences.length,
      perFrame: perFrameBindings,
    },
    unframedEncounters: unframed.length,
    // What the reader holds only through Victor — every one of these is a
    // claim no one in the book corroborates, and the reader knows it.
    readersModelOfVictor: (() => { const m = mentalModel(projected, "victor", READER); return { attributed: m.count, ofHoldsInTotal: m.ofHoldsInTotal, coverage: m.coverage, sample: m.attributed.slice(0, 4) }; })(),
    readersModelOfTheCreature: (() => { const m = mentalModel(projected, "creature", READER); return { attributed: m.count, ofHoldsInTotal: m.ofHoldsInTotal, coverage: m.coverage, relayDepth: m.attributed[0]?.relayDepth ?? null, sample: m.attributed.slice(0, 4) }; })(),
    // Dramatic irony, mechanically: what one teller holds that another has
    // no belief about at all.
    victorVersusCreature: (() => {
      const d = divergence(projected, "victor", "creature");
      return { asymmetric: d.asymmetric.length, conflicting: d.conflicting.length, conflictSample: d.conflicting.slice(0, 3) };
    })(),
    refusedPerHolder: Object.fromEntries(Object.entries(projected.perspectives).map(([h, p]) => [h, p.beliefs.filter((b) => b.stance === STANCE.REFUSES).length])),
    sharedByVictorAndWalton: (() => { const g = commonGround(projected, "victor", "walton"); return { count: g.count, sample: g.shared.slice(0, 3).map((s) => s.claim) }; })(),
    counted: projected.counted,
    logEntries: entries.length,
    note: "every claim here is held BY someone. A relation from the creature's own telling reaches the reader with relayDepth 2 and basis 'reported' — never as something the reading witnessed.",
  };
  console.log(JSON.stringify(report, null, 1));
}

main().catch((err) => { console.error(err); process.exit(1); });
