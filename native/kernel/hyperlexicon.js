// Canonical EOReader 7 Hyperlexicon.
// Handle: Xushen — after the Shuowen Jiezi, the first dictionary built from attested character usage rather than decree. Amendment XVII.
//
// HL is not a vocabulary or synonym table. It is an explicit ledger of
// relation-composition affordances. Experience may nominate candidates; only
// a GIVEN affordance with a named giver licenses composition.
//
// THE WHEEL (native/docs/THE-WHEEL.md): HL is the FIELD — the accumulated
// ground the reading stands on, the void's own content (register name TBD).

const freeze = (value) => Object.freeze(value);
const stable = (value) => typeof value === "string" ? value : JSON.stringify(value);
export const pairKey = (left, right) => `${stable(left)}\u0000${stable(right)}`;

export const HL_SCHEMA = "EOHyperlexicon@1";
export const HL = "Hyperlexicon";

const provenanceFor = (entry = {}) => freeze({
  giver: entry.giver ?? entry.provenance?.giver ?? null,
  basis: entry.provenance?.basis ?? (entry.standing === "given"
    ? "explicitly given relation-composition affordance"
    : entry.standing === "candidate"
      ? "observed relation adjacency nominated for consideration"
      : "no composition affordance has been given"),
});

const normalizeAffordance = (entry = {}) => freeze({
  left: entry.left,
  right: entry.right,
  standing: entry.standing ?? "unknown",
  giver: entry.giver ?? entry.provenance?.giver ?? null,
  witnesses: freeze([...(entry.witnesses ?? [])]),
  provenance: provenanceFor(entry),
  meta: freeze({ ...(entry.meta ?? {}) }),
});

export function createHyperlexicon({ composition = [], meta = {} } = {}) {
  const table = Object.create(null);
  const entries = Array.isArray(composition)
    ? composition
    : Object.entries(composition).map(([key, value]) => ({
        ...(typeof value === "string" ? { standing: value } : value),
        _key: key,
      }));

  for (const raw of entries) {
    const entry = normalizeAffordance(raw);
    const key = raw._key ?? pairKey(entry.left, entry.right);
    table[key] = entry;
  }

  return freeze({
    schema: HL_SCHEMA,
    composition: freeze(table),
    meta: freeze({ ...meta }),
  });
}

export function normalizeHyperlexicon(input = null) {
  if (!input) return createHyperlexicon();
  if (input.schema === HL_SCHEMA && input.composition) return input;
  if (Array.isArray(input)) return createHyperlexicon({ composition: input });
  if (input.composition) return createHyperlexicon({ composition: input.composition, meta: input.meta });
  return createHyperlexicon({ composition: input });
}

export function compositionAffordance(hyperlexicon, left, right, { leftGrain = null, rightGrain = null } = {}) {
  const hl = normalizeHyperlexicon(hyperlexicon);
  // EXACT label-pair first (the text-specific chemistry — "approached"∘
  // "began").
  const exact = hl.composition[pairKey(left, right)];
  if (exact?.standing === "given") return exact;
  // STRUCTURAL fallback (2026-09-13 — omnilingual/omnimodal chemistry). An
  // affordance keyed on the GRAIN (the cube's medium-blind Figure/Pattern
  // axis) licenses composition for ANY label pair of that grain — the same
  // chain shape in English, French, Russian, audio, video. This is the
  // "AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH" law applied to
  // chemistry: the positions compose through a shared referent, and the
  // grain is the invariant that crosses texts and modalities. VERB/AUX
  // are English lenses; the grain is not. A structural affordance is
  // declared by the giver with left/right as `grain:<GRAIN>` wildcards;
  // the caller supplies the relations' actual grains. It never shadows an
  // exact given affordance.
  if (leftGrain) {
    const structural = hl.composition[pairKey(`grain:${leftGrain}`, rightGrain ? `grain:${rightGrain}` : "*")]
      ?? hl.composition[pairKey(`grain:${leftGrain}`, "*")];
    if (structural?.standing === "given") return structural;
  }
  if (rightGrain) {
    const structural = hl.composition[pairKey("*", `grain:${rightGrain}`)];
    if (structural?.standing === "given") return structural;
  }
  const any = hl.composition[pairKey("*", "*")];
  if (any?.standing === "given") return any;
  return exact ?? normalizeAffordance({ left, right, standing: "unknown" });
}

export function admitHyperlexiconCandidates(hyperlexicon, candidates = []) {
  const hl = normalizeHyperlexicon(hyperlexicon);
  const composition = { ...hl.composition };

  for (const raw of candidates) {
    const candidate = normalizeAffordance({ ...raw, standing: "candidate" });
    const key = pairKey(candidate.left, candidate.right);
    const current = composition[key];
    if (current?.standing === "given") continue;

    const witnessByKey = new Map();
    for (const witness of [...(current?.witnesses ?? []), ...(candidate.witnesses ?? [])]) witnessByKey.set(stable(witness), witness);

    composition[key] = normalizeAffordance({
      left: candidate.left,
      right: candidate.right,
      standing: "candidate",
      giver: current?.giver ?? candidate.giver ?? null,
      witnesses: [...witnessByKey.values()],
      provenance: {
        giver: current?.provenance?.giver ?? candidate.provenance?.giver ?? null,
        basis: "observed relation adjacency nominated for consideration; nomination is not reasoning permission",
      },
      meta: { ...(current?.meta ?? {}), ...(candidate.meta ?? {}), observed: true },
    });
  }

  return createHyperlexicon({ composition, meta: hl.meta });
}

export function giveHyperlexiconAffordance(hyperlexicon, { left, right, giver, witnesses = [], meta = {} } = {}) {
  if (left === undefined || right === undefined) throw new TypeError("giveHyperlexiconAffordance: left and right are required");
  if (!giver) throw new TypeError("giveHyperlexiconAffordance: giver is required");
  const hl = normalizeHyperlexicon(hyperlexicon);
  return createHyperlexicon({
    meta: hl.meta,
    composition: {
      ...hl.composition,
      [pairKey(left, right)]: {
        left,
        right,
        standing: "given",
        giver,
        witnesses,
        provenance: { giver, basis: "explicitly given relation-composition affordance" },
        meta,
      },
    },
  });
}
