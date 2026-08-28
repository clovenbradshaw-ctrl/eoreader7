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
  const { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS, GRAIN_RANK } = taskLog;

  // Read from task-log's own rank table rather than restated as a literal —
  // build-log.js and store.js both already take the name this way.
  const FIGURE = Object.keys(GRAIN_RANK).find((g) => GRAIN_RANK[g] === 1);

  /** A fresh, empty hyperlexicon. */
  const createHyperlexicon = () => createTaskLog();

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
   */
  function hear(log, { subject, verb, object, spans = [], witness = null, because = null }) {
    const id = assertionId(subject, verb, object);
    const prior = projectTasks(log).find((t) => t.task_id === id) ?? null;
    // Witnesses and spans UNION, never replace: a merge that overwrote them
    // would make the second sighting erase the first one's evidence, which
    // is the opposite of what hearing something twice means.
    const witnesses = [...new Set([...(prior?.witnesses ?? []), ...(witness ? [witness] : [])])];
    const at = new Set((prior?.spans ?? []).map((s) => s.at));
    const merged = [...(prior?.spans ?? [])];
    for (const s of spans) if (s?.at && !at.has(s.at)) { at.add(s.at); merged.push(s); }
    return append(log, {
      kind: prior ? ENTRY_KINDS.SUPERSEDE : ENTRY_KINDS.PROPOSE,
      task_id: id,
      operator: prior ? "SYN" : "INS",
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      description: prior ? `heard again: ${subject} ${verb} ${object}` : `${subject} ${verb} ${object}`,
      subject,
      verb,
      object,
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

  return { createHyperlexicon, hear, admit, foldHyperlexicon, assertionId, REFUSALS };
}
