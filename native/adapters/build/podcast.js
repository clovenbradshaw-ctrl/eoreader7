// native/adapters/build/podcast.js — a podcast episode as a fold over the
// kernel's own append-only ledger. Nothing here is a new mechanism: it is
// the REAL pipeline (kernel/task-log.js + kernel/cube.js + kernel/notes.js)
// pointed at one more medium — a spoken episode instead of a text or an
// audio recording.
//
// THE SHAPE, stated once so it is not re-derived per function:
//
//   MOUTH proposes.  The model is asked for a segment (or a revision, or an
//   arbitration) and answers with ALREADY-STRUCTURED content — this organ
//   never parses free text and never calls a network. That crossing (a real
//   LLM call plus whatever tolerant parsing turning its prose into this
//   shape needs) belongs to the caller, exactly the way web.js stays pure
//   while explore-server.mjs owns the fetch, and witness-sentences.js stays
//   pure while its caller supplies `call`. `mouth` here is three injected
//   async functions — propose / arbitrate / revise — each returning data,
//   never text this module would have to interpret.
//
//   THE UNCONSCIOUS SYSTEM records, append-only. Every segment the mouth
//   proposes lands as INS·Figure (a birth) or SYN·Figure (a revision) on
//   the SAME task-log a segment's own claims are heard onto via
//   kernel/notes.js — one ledger, not two, for the identical reason
//   commitments.js gives: a second log would make "as of" a reconciliation
//   problem between a segment and the claims it made.
//
//   THE OPERATORS ARE APPLIED, never simulated. `notes.hear` stamps INS/SYN
//   on a claim's own birth/re-sighting; `notes.dispute` stamps CON when a
//   new claim collides with an established one; `notes.settleDispute` +
//   `notes.concede` stamp the second CON and the REC that withdraws
//   whichever claim lost. This module adds no new operator typing beyond
//   the segment's own PROPOSE/SUPERSEDE (INS/SYN·Figure, the same cell
//   `notes.hear` already gives a birth/re-sighting) — it is a caller of the
//   kernel's algebra, not a second one.
//
//   SELF-HEALING IS LOOPS ON LOOPS. The OUTER loop is the episode: one pass
//   per planned beat. The INNER loop is the repair: for each claim a
//   segment makes, check it against the ledger's CURRENT fold; a collision
//   with an already-established, un-conceded claim on a DECLARED-functional
//   relation opens a dispute (CON), the mouth is asked to ARBITRATE between
//   the two (the select protocol, P32/P83's own discipline: the mouth
//   points at a candidate, it never manufactures a verdict from nothing),
//   and the loser is conceded (REC) — if the loser is the new claim, the
//   segment itself is asked for a fresh, uncensored rewrite (a whole new
//   mouth call, never a silent edit of what it already said — P186's rule,
//   carried here because the shape of the failure is the same one that law
//   was written against). The repair loop is bounded by a caller-declared
//   budget (P9): it stops, typed, rather than spin.
//
//   FUNCTIONAL CONFLICT IS DECLARED, NEVER INFERRED. `functionalConflict`
//   only ever checks a label the caller has put in `declaredFunctional` —
//   the same rule this project holds everywhere a relation's cardinality
//   matters (P36's checkObjectSpecificity, HL's R2): a corpus cannot tell
//   you a relation admits one value; only a giver can.
//
//   THE APP IS A FOLD AT ANY GIVEN CURSOR. `foldAt` slices the log's own
//   entries by seq and hands the slice to the SAME kernel functions
//   (`projectTasks`, `notes.fold`, `notes.disputesOf`,
//   `checkCubeProgression`) that read the whole log — nothing here re-
//   derives a state machine of its own. `renderEpisodeAt` is the whole
//   holographic reading recomputed from the ledger at that cursor: the
//   script as it stood, the facts as they stood, which disputes were still
//   open, whether the algebra itself held. Scrub the cursor and every one
//   of those can move; nothing is cached forward from a later seq.
//
// DISCLOSED, NOT SILENTLY ABSENT: this module produces a SCRIPT (segments
// of speech, addressed, fact-checked against itself). There is no text-to-
// speech synthesizer anywhere in this kernel or its adapters — the audio
// adapters (adapters/audio/) read and analyse existing sound, they do not
// produce it. A caller wanting actual spoken audio bolts a TTS engine onto
// the rendered transcript; that crossing is named here as absent, never
// faked.
//
// DISCLOSED LIMIT: claim identity is exact-string (kernel/notes.js's own
// `noteId`, lower-cased and trimmed) — two claims that agree in different
// words are two different notes, the same paraphrase wall this project has
// measured and refused to paper over everywhere else (P74's withdraw/
// retreat, MINE-1's unbound plateau). A caller wanting sameness-of-meaning
// composes kernel/commitments.js's DEF/EVA/REC triad on top of this
// ledger; it is not reinvented here.
//
// DISCLOSED LIMIT: this organ computes `noteId` itself (plain end1/label/
// end2, lower-cased and trimmed) to find the note a fresh claim would land
// on, so its conflict/concession bookkeeping is correct only when the
// ledger was NOT given a custom `identity` organ (a ledger with one may
// canonicalise a claim's id differently than the plain formula this file
// uses to predict it). Stated rather than silently assumed.

import * as nativeTaskLog from "../../kernel/task-log.js";
import { cellOf as nativeCellOf } from "../../kernel/cube.js";
import { makeNotes, noteId, REFUSALS as NOTE_REFUSALS } from "../../kernel/notes.js";

export const SEGMENT_PREFIX = "segment:";
export const segmentTaskId = (n) => `${SEGMENT_PREFIX}${n}`;
export const isSegmentId = (id) => typeof id === "string" && id.startsWith(SEGMENT_PREFIX);

const norm = (v) => String(v ?? "").trim().toLowerCase();

/**
 * makePodcast({ taskLog, cellOf, notes, identity, bridge }) — the podcast
 * organ, over an injected task-log/cube (default: this kernel's own) and
 * an injected notes ledger (default: a fresh `makeNotes()` built from the
 * same taskLog/cellOf, so a segment's own PROPOSE/SUPERSEDE entries and its
 * claims' INS/SYN/CON/REC entries share one log by construction).
 */
export function makePodcast({ taskLog = nativeTaskLog, cellOf = nativeCellOf, notes = null, identity = null, bridge = null } = {}) {
  const { createTaskLog, append, projectTasks, checkCubeProgression, ENTRY_KINDS, OPERATOR_BASIS } = taskLog;
  const ledger = notes ?? makeNotes({ taskLog, cellOf, identity, bridge });

  const cellFields = (op, grain) => {
    const c = cellOf(op, grain);
    if (!c || c.gap) return { cell_gap: c?.gap ?? "no_cell" };
    return { cell: `${c.op}·${c.grain}`, stance: c.stance, terrain: c.terrain, mode: c.mode, domain: c.domain };
  };

  /** openEpisode({topic, voices, format}) — the frame: what this episode stands on, DEF·Ground, before anything is proposed. */
  function openEpisode({ topic, voices = [], format = null } = {}) {
    if (typeof topic !== "string" || !topic.trim()) throw new TypeError("openEpisode: a topic is the episode's own frame — it cannot stand on nothing");
    return ledger.createNotes({ frame: { topic, voices: [...voices], format } });
  }

  /** landSegment — INS·Figure on first proposal, SYN·Figure on a revision. Same task_id both times (notes.hear's own re-sighting convention), never a `supersedes` — that field is for a NEW task replacing an OLD one, not a task updating itself. */
  function landSegment(log, { n, speaker = null, title, script, isRevision = false, trigger = null }) {
    if (!Number.isInteger(n) || n < 0) throw new TypeError("landSegment: n is the segment's own ordinal");
    if (typeof script !== "string" || !script.trim()) throw new TypeError("landSegment: a segment with no script is not a segment");
    const id = segmentTaskId(n);
    const op = isRevision ? "SYN" : "INS";
    const entry = {
      kind: isRevision ? ENTRY_KINDS.SUPERSEDE : ENTRY_KINDS.PROPOSE,
      task_id: id, operator: op, operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Figure",
      ...cellFields(op, "Figure"),
      description: isRevision ? `segment ${n} revised: ${trigger}` : `segment ${n} proposed: ${title ?? script.slice(0, 40)}`,
      n, speaker, title: title ?? null, script,
      ...(isRevision ? { trigger } : {}),
    };
    return { log: append(log, entry), id };
  }

  /**
   * hearClaim — a segment's own claim, heard onto the SAME notes ledger,
   * witnessed by the segment that made it. `quote` (a verbatim substring of
   * the segment's `script`) becomes a self-verified span (P5.2: the address
   * always re-slices to the words it names) at `segment:<n>#start-end`; a
   * claim with no locatable quote is heard unaddressed UNLESS
   * `requireAddressed` is set, in which case it is REFUSED (notes.js's own
   * REFUSALS.UNADDRESSED), never silently admitted as if it named its own
   * evidence.
   */
  function hearClaim(log, segId, claim, { requireAddressed = false } = {}) {
    const { end1, label, end2, quote = null, because = null } = claim ?? {};
    if (!end1 || !label || !end2) return { log, refused: { type: NOTE_REFUSALS.INCOMPLETE, detail: "hearClaim: an arrangement needs both ends and a label" } };
    let span = null;
    if (quote) {
      const start = claim.script != null ? String(claim.script).indexOf(quote) : -1;
      if (start >= 0) {
        const end = start + quote.length;
        span = { ref: segId, start, end, at: `${segId}#${start}-${end}` };
      }
    }
    if (requireAddressed && !span) return { log, refused: { type: NOTE_REFUSALS.UNADDRESSED, detail: `hearClaim: "${end1} ${label} ${end2}" names no verbatim quote in its own segment's script` } };
    const next = ledger.hear(log, { end1, label, end2, spans: span ? [span] : [], witness: segId, because });
    return { log: next, refused: null, id: noteId(end1, label, end2) };
  }

  /**
   * functionalConflict(folded, claim, declaredFunctional) — does an
   * established, un-conceded note already answer this claim's (end1,
   * label) with a DIFFERENT end2? Checked only for a label the caller has
   * declared functional (P36/HL's R2: cardinality is declared, never
   * inferred). `folded` is `ledger.fold(log)` (or `foldWithStanding`) taken
   * BEFORE the new claim is heard, so a claim never collides with itself.
   */
  function functionalConflict(folded, claim, declaredFunctional) {
    if (!declaredFunctional || !declaredFunctional.has(norm(claim?.label))) return null;
    return (folded ?? []).find((note) =>
      norm(note.end1) === norm(claim.end1) &&
      norm(note.label) === norm(claim.label) &&
      norm(note.end2) !== norm(claim.end2)
    ) ?? null;
  }

  /**
   * healConflict(log, { segId, claim, rival, arbitrate }) — the inner loop's
   * one repair act: open the dispute (CON), ask the mouth to point at the
   * winner (never to invent one — a select, not a generate), settle (CON)
   * and concede (REC) the loser. Returns `{ log, outcome, disputeId }`;
   * `outcome` is `"rival-stands"` (the new claim is conceded), `"claim-
   * stands"` (the rival is conceded), or `"unsettled"` (the mouth named
   * neither — the dispute is left open, on the record, never guessed shut).
   */
  async function healConflict(log, { segId, claim, rival, arbitrate }) {
    const claimId = noteId(claim.end1, claim.label, claim.end2);
    const { log: l1, refused, id: disputeId } = ledger.dispute(log, rival.task_id ?? rival.id, {
      source: segId, kind: "contest",
      because: `${segId} states ${claim.end1} ${claim.label} ${claim.end2}, against ${rival.end1} ${rival.label} ${rival.end2}`,
    });
    if (refused) return { log, outcome: "unsettled", disputeId: null, refused };
    let log2 = l1;
    const pick = await arbitrate({ rival, claim, disputeId });
    if (pick !== "rival" && pick !== "claim") {
      return { log: log2, outcome: "unsettled", disputeId };
    }
    const trigger = `arbitration on ${disputeId}: ${pick === "claim" ? "the new claim" : "the established claim"} stands`;
    if (pick === "claim") {
      const s = ledger.settleDispute(log2, disputeId, { trigger, outcome: "conceded" });
      log2 = s.log;
      if (s.concession) { const c = ledger.concede(log2, s.concession.id, { trigger: s.concession.trigger }); log2 = c.log; }
      return { log: log2, outcome: "claim-stands", disputeId };
    }
    const s = ledger.settleDispute(log2, disputeId, { trigger, outcome: "upheld" });
    log2 = s.log;
    const c = ledger.concede(log2, claimId, { trigger: `settled against the new claim (${disputeId}): the established claim stands` });
    log2 = c.log;
    return { log: log2, outcome: "rival-stands", disputeId };
  }

  /**
   * produceEpisode(api-internal) — the outer loop over a declared plan of
   * beats, each proposed by the mouth, each claim checked against the
   * ledger's own current fold, repaired (bounded, P9) on a genuine
   * collision. Returns `{ log, report }`; `report` names every heal this
   * run performed and every gap left open — never silent either way.
   *
   *   plan: [{ speaker, beat }] — what each segment is meant to cover.
   *   mouth: { propose(ctx) -> {title, speaker, script, claims}, arbitrate(ctx) -> "rival"|"claim"|"neither", revise(ctx) -> {title, speaker, script, claims} }
   *   declaredFunctional: Set<string> of labels that admit one value per end1.
   *   maxRepairsPerSegment: the bounded budget (P9 — no default).
   *   requireAddressed: refuse a claim with no locatable quote (default false).
   */
  async function produceEpisode({ topic, voices = [], format = null, plan, mouth, declaredFunctional = new Set(), maxRepairsPerSegment, requireAddressed = false }) {
    if (!Number.isFinite(maxRepairsPerSegment)) throw new TypeError("produceEpisode: maxRepairsPerSegment is declared by the caller (P9) — there is no default budget for a self-heal loop");
    if (!mouth || typeof mouth.propose !== "function" || typeof mouth.arbitrate !== "function" || typeof mouth.revise !== "function") throw new TypeError("produceEpisode: mouth needs propose/arbitrate/revise, each async");
    if (!Array.isArray(plan) || !plan.length) throw new TypeError("produceEpisode: a plan is the episode's own beats — at least one");

    let log = openEpisode({ topic, voices, format });
    const report = { segments: [] };

    for (let i = 0; i < plan.length; i++) {
      const n = i;
      const beat = plan[i];
      let draft = await mouth.propose({ n, beat, topic, voices });
      let { log: l1, id: segId } = landSegment(log, { n, speaker: draft.speaker ?? beat.speaker ?? null, title: draft.title, script: draft.script });
      log = l1;
      const segReport = { id: segId, n, heals: [], claims: [] };
      let repairs = 0;
      let claims = (draft.claims ?? []).map((c) => ({ ...c, script: draft.script }));

      for (let ci = 0; ci < claims.length; ci++) {
        const claim = claims[ci];
        const before = ledger.fold(log);
        const rival = functionalConflict(before, claim, declaredFunctional);
        const heard = hearClaim(log, segId, claim, { requireAddressed });
        if (heard.refused) { segReport.claims.push({ claim, refused: heard.refused }); continue; }
        log = heard.log;
        segReport.claims.push({ claim, id: heard.id });
        if (!rival) continue;
        if (repairs >= maxRepairsPerSegment) {
          segReport.heals.push({ outcome: "budget-spent", rival: rival.task_id ?? rival.id, claim: heard.id });
          continue;
        }
        repairs += 1;
        const healed = await healConflict(log, {
          segId, claim, rival,
          arbitrate: (ctx) => mouth.arbitrate({ ...ctx, n, beat, topic }),
        });
        log = healed.log;
        segReport.heals.push({ outcome: healed.outcome, disputeId: healed.disputeId, rival: rival.task_id ?? rival.id, claim: heard.id });
        if (healed.outcome === "rival-stands") {
          // the segment's own new claim lost — a fresh, uncensored ask,
          // never a silent edit of what the mouth already said (P186).
          const revised = await mouth.revise({ n, beat, topic, priorScript: draft.script, correction: rival });
          const land = landSegment(log, { n, speaker: revised.speaker ?? draft.speaker ?? null, title: revised.title, script: revised.script, isRevision: true, trigger: `withdrew "${claim.end1} ${claim.label} ${claim.end2}" — the ledger already stands on "${rival.end1} ${rival.label} ${rival.end2}"` });
          log = land.log;
          draft = revised;
          // the revision's OWN claims still need hearing/checking; splice
          // them onto the outer loop so the same segment's later claims are
          // read against the corrected script, not the withdrawn one.
          claims = claims.slice(0, ci + 1).concat((revised.claims ?? []).map((c) => ({ ...c, script: revised.script })));
        }
      }
      report.segments.push(segReport);
    }

    report.algebraFlags = checkCubeProgression(log);
    report.openGaps = [...ledger.disputesOf(log).entries()];
    return { log, report };
  }

  /**
   * foldAt(log, cursor) — the log SLICED at a seq, in the SAME shape
   * task-log.js's own functions read (`{entries, nextSeq, admits}`). No
   * state is re-derived by hand: `projectTasks`, `ledger.fold`,
   * `ledger.disputesOf`, `checkCubeProgression` all read this slice exactly
   * as they read the whole log. `cursor` omitted means the current head.
   */
  function foldAt(log, cursor) {
    const cut = Number.isFinite(cursor) ? cursor : log.nextSeq - 1;
    const entries = log.entries.filter((e) => e.seq <= cut);
    return { entries, nextSeq: entries.length ? entries[entries.length - 1].seq + 1 : 0, admits: log.admits };
  }

  /**
   * renderEpisodeAt(log, cursor) — the whole holographic reading, recomputed
   * from the ledger AS OF that cursor: the script as it stood, the facts as
   * they stood, which disputes were still open, whether the algebra itself
   * held. "The app is a fold at any given cursor" — this is that fold.
   */
  function renderEpisodeAt(log, cursor) {
    const sliced = foldAt(log, cursor);
    const tasks = projectTasks(sliced);
    const segments = tasks.filter((t) => isSegmentId(t.task_id)).sort((a, b) => a.n - b.n);
    return Object.freeze({
      cursor: sliced.entries.length ? sliced.entries[sliced.entries.length - 1].seq : -1,
      frame: ledger.frameOf(sliced),
      segments: Object.freeze(segments),
      standing: Object.freeze(ledger.foldWithStanding(sliced)),
      openDisputes: Object.freeze([...ledger.disputesOf(sliced).entries()]),
      algebraFlags: Object.freeze(checkCubeProgression(sliced)),
    });
  }

  /** transcriptOf(rendered) — the episode as a readable script. Text only; no TTS engine exists here (see this file's own header). */
  function transcriptOf(rendered) {
    return rendered.segments.map((s) => `${s.speaker ? `${s.speaker}: ` : ""}${s.script}`).join("\n\n");
  }

  return Object.freeze({
    ledger, openEpisode, landSegment, hearClaim, functionalConflict, healConflict,
    produceEpisode, foldAt, renderEpisodeAt, transcriptOf,
  });
}
