// hyperlexicon.js — read content as an EOT event stream; the reading is
// always a projection, never a cached truth.
//
// THE USER'S OWN INSTRUCTION, verbatim (2026-08-28): "all content should be
// converted into EOT and folded for the hyperlexicon" — said while looking at
// a live prompt dump in which it plainly was not. This module is that
// conversion. It is `store.js` one register over: that module's load-bearing
// line is "the reality of the database should be the EOT event stream, the
// current state always projected," and the same sentence is true of what this
// instrument has read. The log IS the reading; "what we currently believe the
// material says" is one fold over it, recomputed, never written back as
// though it were itself the source.
//
// WHAT WAS ACTUALLY HAPPENING, measured on a real turn before this existed.
// Asked "who was Queen Victoria's prime minister?", the app fetched two real
// pages, retrieved three passages, and handed the model:
//
//   * eight "notes" — SVO edges re-extracted from those passages on the spot,
//     discarded at the end of the turn, of which `complete list —is→ given
//     above`, `the Victorian —era's→ hallmark industrialization`, `and —in→
//     that time`, `Prime Minsters —of→ them all` and `new queen —in→
//     government and politics` are not assertions about the world at all; and
//   * nine raw source sentences.
//
// Ten edges came out of that material and NOT ONE names a prime minister of
// Queen Victoria. The sentence that answers the question — "The Ten Victorian
// Prime Ministers Under Queen Victoria Robert Peel (1834-1835; 1841-1846)" —
// yielded zero edges, and reached the model only as raw text. So the model
// did the reading, and read the first name out of a list of ten: "Queen
// Victoria's prime minister was Robert Peel."
//
// That is the failure this module is aimed at, and it has two halves, both
// visible in that one turn: nothing accumulates (the same bytes are re-read
// from scratch every turn, and a second page's agreement with the first is
// never noticed), and nothing is admitted (junk enters the model's context
// with exactly the standing a real assertion has).
//
// SO ADMISSION IS A DOOR, NOT A FUNNEL. `admit` returns what it took AND what
// it turned away, each refusal typed and on the record — the same posture
// `measure.js`'s own gate holds, and for the same reason its header gives:
// the statistics were already there, what was missing was the gate. Here the
// extraction was already there; what was missing was the door.
//
// WHAT THIS MODULE IS NOT. It is not an extractor — `hypergraph.js` reads the
// bytes and this file never touches text. It is not a classifier — the
// grammar lens it consults is INJECTED, carries its own giver, and is used
// ASYMMETRICALLY (P56: a part of speech is a candidate set, not a
// per-occurrence verdict, so an out-of-vocabulary word is never refused and a
// settled non-verb is). And it decides nothing about truth: an admitted
// assertion is a thing the material was heard to say, with its witnesses and
// its bytes, which is exactly what a defeasible note is supposed to be.

/** The one identity for an assertion, so two sightings of it are one task. */
export const assertionId = (subject, verb, object) =>
  `${String(subject ?? "").trim().toLowerCase()}|${String(verb ?? "").trim().toLowerCase()}|${String(object ?? "").trim().toLowerCase()}`;

/**
 * The one identity for a RECIPE — how this reader was configured — so an
 * append-only reading can name WHO heard something, not only WHAT was heard.
 *
 * live_priors POLICIES.md LP5: "the witness names what was read, never who
 * read it... append-only without attribution is strictly worse than an
 * honest overwrite — it looks like an accumulating record while being an
 * unreadable one." A recipe's descriptor is exactly the `organs` block every
 * caller of this module already builds for a human to read (which
 * organs ran, which priors were injected, which were deliberately omitted);
 * this hashes a MACHINE-MEANINGFUL projection of it, never the prose.
 * Hashing the prose itself would make recipe identity drift every time a
 * comment is reworded — the same defect a content address exists to avoid.
 *
 * The caller decides what belongs in the descriptor (this function makes no
 * claim about which fields matter — that is a fact about the reading, not
 * about identity itself) and passes a plain object of primitives: strings,
 * booleans, numbers. Two callers with the SAME descriptor get the SAME id,
 * which is the whole point — it lets `admit`'s witness distinguish "two
 * different recipes both heard this" from "the same recipe ran twice."
 *
 * Web Crypto, matching builds.js::buildHash / skills.js::skillDigest's own
 * convention — SHA-256 over a canonicalised (key-sorted) JSON string, async
 * because the digest is Web Crypto (browser and Node alike, no new
 * dependency). Truncated to 16 hex characters, matching this project's own
 * short-digest-id convention (builds/skills use the full 64; a recipe id is
 * for humans to read in a witness string, so it stays short — a collision
 * at 16 hex chars over the handful of recipes any one project will ever
 * actually run is not a real risk, and the full digest is never needed back).
 */
const canonRecipe = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonRecipe).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonRecipe(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
export async function recipeId(descriptor) {
  const bytes = new TextEncoder().encode(canonRecipe(descriptor));
  const buf = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Why an offered assertion was turned away. A closed class: a refusal this
 * module cannot name is not a refusal it is allowed to make.
 */
export const REFUSALS = Object.freeze({
  /** The connector settles, against a named prior, as something other than a verb. */
  NOT_A_VERB: "not_a_verb",
  /** An end is missing, so there is no assertion to hold. */
  INCOMPLETE: "incomplete",
  /** No byte-addressed span backs it — P5.2 applied at the door. */
  UNADDRESSED: "unaddressed",
});

/**
 * The Thrax class an assertion's connector has to settle as, in the lens's own
 * vocabulary (`wordclass.js::THRAX_MAP` maps UD's VERB and AUX onto it).
 *
 * A LITERAL THAT IS CHECKED, never one that is trusted: written `"Verb"` at
 * first, it matched nothing, so `went`, `developed` and `is` — three real
 * verbs — were all turned away at the door while the prepositions this gate
 * exists for got through on the same mistake. A capitalisation slip in a
 * comparison against another module's vocabulary fails SILENTLY and in the
 * safe-looking direction, so `hyperlexicon.test.mjs` asserts this string is
 * actually in that map rather than assuming it.
 */
export const VERB_CLASS = "verb";

export function makeHyperlexicon(taskLog) {
  // `noteIdentity` is THE IDENTITY SEAM (P73): which two sightings are ONE
  // note is an injectable question, never a string accident. Measured need
  // (eval/hyperlexicon-door-probe.mjs, real Wikipedia fixtures): with
  // identity = the exact triple, 0 of 29 notes ever reached two witnesses
  // — the same fact restated in different words ("The Russian army
  // withdraws" / "Imperial Russian forces retreated") can never fold, so
  // the >=2-witness ledger block is structurally unreachable on prose.
  // The organ, when injected, canonicalises (subject, verb, object) for
  // the ID ALONE — the note's DISPLAY keeps the FIRST reading's own words
  // (bytes read, never a normalised paraphrase), and witnesses/spans union
  // exactly as before. Absent (every existing caller), identity is
  // byte-identical to the exact-triple behaviour. A gapping organ (falsy
  // return, or an empty field) falls back to the surface form for that
  // field — an identity gap must never block admission (the withhold-vs-
  // convict rule, applied to identity). The production organ — referent
  // faces for ends, sameAct lemma equivalence for the connector, both
  // already proven in the MINE-1 work — is the named next wiring, not
  // built here; this seam is what it plugs into.
  const { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS, GRAIN_RANK, cellOf = null, noteIdentity = null } = taskLog;

  // Read from task-log's own rank table rather than restated as a literal —
  // build-log.js and store.js both already take the name this way.
  const FIGURE = Object.keys(GRAIN_RANK).find((g) => GRAIN_RANK[g] === 1);

  /** A fresh, empty hyperlexicon. */
  const createHyperlexicon = () => createTaskLog();

  /**
   * The admitting act's cell, read off (operator, grain) — never chosen.
   *
   * Absent `cellOf` this returns nothing at all, so an entry is byte-identical
   * to what it was before this existed: a reader that declares no cube is not
   * silently given one (P7's "priors are injected and stated; their absence is
   * stated too"). A `cellOf` that gaps is likewise carried as a gap, never
   * smoothed into a plausible cell.
   */
  const cellFields = (op) => {
    if (!cellOf) return {};
    const c = cellOf(op, FIGURE);
    if (!c || c.gap) return { cell_gap: c?.gap ?? "no_cell", cell_reason: c?.reason ?? null };
    return { cell: `${c.op}\u00b7${c.grain}`, stance: c.stance, terrain: c.terrain, mode: c.mode, domain: c.domain };
  };

  /**
   * hear(log, assertion) — one sighting of one assertion, admitted.
   *
   * First sighting is INS · Figure · produced: a birth, task-log's own typing
   * for one, and `store.js::insertRow`'s precedent for this repo's mapping.
   * A later sighting of the SAME assertion is SUPERSEDE · SYN · Figure,
   * carrying only what changed — which is the witness list and the spans.
   * That is task-log's own field-merge (`{...prior, ...payload}` per
   * task_id), so a second page agreeing with the first does not become a
   * second note; it becomes the same note with two witnesses.
   *
   * THE CORROBORATION IS THE POINT, not a side effect. A fact already heard
   * costs nothing to hear again, and the budget that frees is what should go
   * to what is genuinely new — this repo's own P30, applied to reading.
   *
   * A RE-SIGHTING THAT TEACHES NOTHING APPENDS NOTHING. live_priors's own
   * POLICIES.md LP2 states this as law, not as a suggestion: "growth is
   * bounded by the source's extent × distinct recipes, and is self-limiting,
   * because a recipe that hears nothing appends nothing." Found live, not
   * hypothetically: the-fold's own eot-sidecar.mjs re-ran the identical
   * recipe against an unchanged source and the log DOUBLED — every witness
   * already on record, every span already merged, and a new SUPERSEDE entry
   * landed anyway, because this function used to append unconditionally.
   * The fix compares what the merge ACTUALLY moved, not whether `hear` was
   * called: if the witness set and the span set come out exactly the length
   * they already were, the material taught this log nothing and the log is
   * returned UNCHANGED — no entry, no seq consumed. A witness that adds
   * itself for the first time, or a span this task has never carried before,
   * still lands exactly as before.
   */
  function hear(log, { subject, verb, object, spans = [], witness = null, because = null }) {
    const canon = noteIdentity ? noteIdentity(subject, verb, object) : null;
    const id = assertionId(canon?.subject || subject, canon?.verb || verb, canon?.object || object);
    const prior = projectTasks(log).find((t) => t.task_id === id) ?? null;
    // Witnesses and spans UNION, never replace: a merge that overwrote them
    // would make the second sighting erase the first one's evidence, which
    // is the opposite of what hearing something twice means.
    const witnesses = [...new Set([...(prior?.witnesses ?? []), ...(witness ? [witness] : [])])];
    const at = new Set((prior?.spans ?? []).map((s) => s.at));
    const merged = [...(prior?.spans ?? [])];
    for (const s of spans) if (s?.at && !at.has(s.at)) { at.add(s.at); merged.push(s); }
    if (prior && witnesses.length === prior.witnesses.length && merged.length === (prior.spans?.length ?? 0)) {
      return log;
    }
    return append(log, {
      kind: prior ? ENTRY_KINDS.SUPERSEDE : ENTRY_KINDS.PROPOSE,
      task_id: id,
      operator: prior ? "SYN" : "INS",
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      // THE CELL WAS ALREADY HERE, UNREAD. `operator` and `grain` are written
      // two lines up, and the cube derives mode/domain/terrain/stance from
      // exactly that pair — the space is 27 (operator x grain), not a free
      // stance axis. So this reads the cell off rather than choosing one, via
      // the engine's own `cellOf`, injected (the cast.js pattern) and never
      // restated as a local table.
      //
      // WHAT THIS IS, AND THE PLANE IT SITS ON. A note's stance is not a claim
      // about the world — it is the posture THIS READER admitted under, and it
      // is defeasible. So it rides beside `witnesses`/`spans` and never joins
      // them: those are world-facing and corroborable, this is reader-facing
      // and can only be defeated by incoherence or by being spent. Nothing
      // downstream may score a stance against an oracle.
      ...cellFields(prior ? "SYN" : "INS"),
      description: prior ? `heard again: ${subject} ${verb} ${object}` : `${subject} ${verb} ${object}`,
      // The FIRST reading's face wins the display: under an injected
      // identity a later restatement may word the same note differently,
      // and superseding the display with each paraphrase would make the
      // note's words drift while its evidence accumulates. Default path
      // (no organ): `prior` only exists when the exact triple matched, so
      // these are the same strings — byte-identical behaviour.
      subject: prior?.subject ?? subject,
      verb: prior?.verb ?? verb,
      object: prior?.object ?? object,
      witnesses,
      spans: merged,
      ...(because != null ? { because } : {}),
    });
  }

  /**
   * admit(log, edges, {classifyConnector, minShare, witness}) — the door.
   *
   * Every edge is either heard or turned away with a named reason, and BOTH
   * lists come back. A caller that only reads `heard` still cannot mistake a
   * refusal for an absence, because `turnedAway` is not optional.
   *
   * `classifyConnector` is optional and its absence is a real, disclosed
   * difference rather than a silent default: with no lens, the verb-hood
   * check does not run and no edge is refused for it. That is the honest
   * behaviour — a check that did not run must never report a pass (P41).
   */
  function admit(log, edges, { classifyConnector = null, minShare = 0.5, witness = null } = {}) {
    // THE LOG IS THREADED, NOT MUTATED. `append` returns a NEW log — that
    // immutability is what makes "what did this look like before" answerable
    // — and the first version of this loop called `hear(log, …)` ten times
    // against the SAME original log and threw away every result, so the
    // caller's hyperlexicon stayed empty while `heard` reported ten
    // successes. A write that reports success and lands nothing is the worst
    // shape a door can have, so the accumulated log comes back as the first
    // field of the result and there is no way to read the outcome without it.
    let next = log;
    const heard = [];
    const turnedAway = [];
    for (const e of edges ?? []) {
      const subject = String(e?.subject ?? "").trim();
      const verb = String(e?.verb ?? "").trim();
      const object = String(e?.object ?? "").trim();
      if (!subject || !verb || !object) {
        turnedAway.push({ edge: e, reason: REFUSALS.INCOMPLETE, detail: "an assertion needs two ends and something between them" });
        continue;
      }
      const spans = (e?.spans ?? [])
        .map((s) => ({ at: `${s.ref}#${s.start}-${s.end}`, ref: s.ref, text: String(s.text ?? "").replace(/\s+/g, " ").trim() }))
        .filter((s) => s.text);
      if (!spans.length) {
        // P5.2 at the door: an assertion with no bytes behind it cannot be
        // defeated by its own source, which is the whole standing a note has.
        turnedAway.push({ edge: e, reason: REFUSALS.UNADDRESSED, detail: "no byte-addressed span backs it" });
        continue;
      }
      if (classifyConnector) {
        const c = classifyConnector({ verb }, { minShare });
        // ASYMMETRIC, and this is P56's rule, not a convenience. `settled`
        // and not a verb is a real finding about a closed question. `found:
        // false` is an out-of-vocabulary word — a gap in the prior, never a
        // fact about the connector — and admits.
        if (c?.settled && c.thraxClass && c.thraxClass !== VERB_CLASS) {
          turnedAway.push({
            edge: e,
            reason: REFUSALS.NOT_A_VERB,
            detail: `"${verb}" settles as ${c.thraxClass}`,
            givers: c.givers ?? null,
          });
          continue;
        }
      }
      next = hear(next, { subject, verb, object, spans, witness });
      heard.push({ id: assertionId(subject, verb, object), subject, verb, object });
    }
    return { log: next, heard, turnedAway };
  }

  /**
   * readingFromHyperlexicon(log, {source}) — the reader's own postures, in the
   * shape `experience-priors.js` already sediments.
   *
   * WHY THIS IS AN ADAPTER AND NOT A KERNEL CHANGE. `deriveExperiencePrior`
   * counts `{operator, stance}` off a completed reading's own
   * `transformationObjects`; it is domain-agnostic and has no business
   * learning what a hyperlexicon note is. So the projection lives here, with
   * the consumer, and the kernel organ is used unmodified.
   *
   * WHAT SEDIMENTS, AND WHAT MAY NOT. Only the ACT — its operator and the
   * stance derived from it. No subject, verb, object, witness or span crosses
   * into this: those are world-facing and corroborable, and a prior that
   * learned them would be learning the world from its own habits. What
   * accumulates here is strictly "postures this reader has held, and across
   * how many works" — the reader becoming legible to itself.
   *
   * An entry with no cell contributes NOTHING rather than a default. A log
   * built without `cellOf` therefore sediments nothing at all, and
   * `postures: 0` is the honest report of a reader that never declared a cube.
   */
  function readingFromHyperlexicon(log, { source } = {}) {
    if (!source) throw new TypeError("readingFromHyperlexicon: a source is named — an unattributed reading cannot support cross-work memory");
    const transformationObjects = [];
    for (const e of log?.entries ?? []) {
      if (!e?.stance || !e?.operator) continue;   // no cell declared: nothing to learn
      transformationObjects.push({ operator: e.operator, stance: e.stance, terrain: e.terrain ?? null });
    }
    return {
      source,
      reading: {
        // graphEntries stays EMPTY on purpose: relation vocabulary is the
        // world-facing plane and does not belong in a posture prior.
        fold: { graphEntries: [], transformationObjects },
        terrainState: {},
      },
      postures: transformationObjects.length,
    };
  }

  /**
   * foldHyperlexicon(log) — the reading, projected. Every live assertion with
   * its witnesses and its bytes, most-witnessed first, so a caller that must
   * cut for room cuts the least corroborated rather than the most recent.
   */
  function foldHyperlexicon(log) {
    return projectTasks(log)
      .filter((t) => t.subject && t.verb && t.object)
      .map((t) => ({
        id: t.task_id,
        subject: t.subject,
        verb: t.verb,
        object: t.object,
        witnesses: t.witnesses ?? [],
        spans: t.spans ?? [],
      }))
      .sort((a, b) => b.witnesses.length - a.witnesses.length || a.id.localeCompare(b.id));
  }

  return { createHyperlexicon, hear, admit, foldHyperlexicon, readingFromHyperlexicon, assertionId, recipeId, REFUSALS };
}
