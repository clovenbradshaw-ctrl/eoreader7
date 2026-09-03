// kernel/notes.js — what a reading was heard to say, as an append-only
// event stream; the current belief always a projection. Medium-blind.
// Handle: Arokin — after the Yoruba court historians, whose oral tradition kept an append-only record of what was said. Amendment XVII.
//
// LINEAGE. This is the-fold's assertion ledger (its P57 `hyperlexicon.js`,
// moved into native/organs on 2026-09-02) brought down one more level and
// stripped of its medium. That organ held ends called subject/verb/object
// and a grammar gate that asked whether a connector was a verb — a text
// reading's vocabulary carried into a store that has, since the same day,
// been fed arrangements read off MIDI, WAV, video shots, turbulence fields
// and the instrument's own operational record (event-arrangements.js).
// The user's direction (2026-09-02): "the hyperlexicon should be part of
// eoreader7, medium agnostic … the fold should only be an interaction
// surface." So the ledger lives here, an arrangement is two ENDS and a
// LABEL (the earned neutral shape, the-fold's P76: "an arrangement has
// ends, not parts of speech"), and the only gate is the one the caller
// injects — a text organ may ask its grammar question, a music organ its
// own, and this file asks none.
//
// WHAT A NOTE IS. One arrangement the material was heard to make, with the
// WITNESSES that heard it and the byte-addressed SPANS where it was heard.
// First sighting is INS · Figure · produced (a birth). A later sighting of
// the SAME note is SUPERSEDE · SYN · Figure carrying only what moved — the
// witness set and the span set, UNIONED never replaced. Two sources
// agreeing become one note with two witnesses, never two notes. A
// re-sighting that teaches the ledger nothing appends nothing.
//
// NO VIEW FROM NOWHERE. A ledger is created by a reader standing somewhere:
// which organs ran, which priors were injected, which were deliberately
// absent. `createNotes({ frame })` records that standing as the log's own
// first entry — DEF · Ground · declared, the cell frame.js already gives a
// declaration of interpretive ground — so a fold can always say WHOSE
// reading this is. A ledger created without a frame is not refused (every
// caller that predates this would break, and a refusal that breaks the
// world is not a wall), but `frameOf` reports the gap by name and never
// invents a frame to fill it.
//
// GROUND / FIGURE / PATTERN OVER WHAT WAS HEARD. surprise-segments.js
// measured (2026-09-02) that music finds its bar by surprise and English
// does not find its sentence at the word, move or class grain, and named
// the next stream to cut: the ledger's own notes, where recurrence is dense
// and the ground can be right. `stream` reads the log as the sequence of
// hearings it records; `figures` measures each hearing's surprise under the
// ground heard so far; `segment` cuts it, null built in. The oracle a cut
// is tested against — where the source itself turned — is the caller's,
// never read here.
//
// NOTHING NAMED. This file's executable body names no medium: no sentence,
// word, verb, note-as-music, bar, frame-of-film. `notes.test.js` reads this
// source and fails if one appears.
import * as nativeTaskLog from "./task-log.js";
import { cellOf as nativeCellOf } from "./cube.js";
import { surprises, segmentBySurprise, recursiveSegments } from "./surprise-segments.js";

const norm = (v) => String(v ?? "").trim().toLowerCase();

/** The one identity for an arrangement, so two sightings of it are one task. */
export const noteId = (end1, label, end2) => `${norm(end1)}|${norm(label)}|${norm(end2)}`;

/**
 * recipeId(descriptor) — the identity of HOW a reader was configured, so an
 * append-only reading names who heard something, not only what was heard
 * (live_priors POLICIES.md LP5). SHA-256 over a canonicalised, key-sorted
 * projection of the caller's own descriptor — never its prose — truncated to
 * 16 hex characters (this project's short-digest convention). Two callers
 * with the same descriptor get the same id, which is the point.
 */
const canon = (value) => {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
};
export async function recipeId(descriptor) {
  const bytes = new TextEncoder().encode(canon(descriptor));
  const buf = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Why an offered arrangement was turned away — the kernel's own reasons; a gate adds its own. */
export const REFUSALS = Object.freeze({
  /** An end or the label is missing, so there is no arrangement to hold. */
  INCOMPLETE: "incomplete",
  /** No byte-addressed span backs it — P5.2 applied at the door. */
  UNADDRESSED: "unaddressed",
});

/** The id every frame entry carries; one per ledger, at seq 0. */
export const FRAME_TASK = "frame:0";

/**
 * makeNotes({ taskLog, cellOf, identity }) — the ledger, over an injected
 * task-log (default: this kernel's own) so a caller that reads through a
 * different provider of the same algebra can still keep its notes here.
 *
 *  - `cellOf(op, grain)` stamps each entry's cell (mode/domain/terrain/
 *    stance) off the (operator, grain) pair it already carries. Default:
 *    this kernel's cube. `null` declares no cube — entries carry no cell
 *    and `readingFromNotes` sediments nothing, honestly.
 *  - `identity(end1, label, end2)` canonicalises the ID ALONE (the note's
 *    display keeps the first hearing's own face). A gapping organ (falsy or
 *    an empty field) falls back to the face — an identity gap never blocks
 *    admission.
 */
export function makeNotes({ taskLog = nativeTaskLog, cellOf = nativeCellOf, identity = null } = {}) {
  const { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } = taskLog;
  const grains = taskLog.GRAIN_RANK
    ? Object.keys(taskLog.GRAIN_RANK).sort((a, b) => taskLog.GRAIN_RANK[a] - taskLog.GRAIN_RANK[b])
    : [...taskLog.GRAINS];
  const [GROUND, FIGURE] = grains;

  const cellFields = (op, grain) => {
    if (!cellOf) return {};
    const c = cellOf(op, grain);
    if (!c || c.gap) return { cell_gap: c?.gap ?? "no_cell", cell_reason: c?.reason ?? null };
    return { cell: `${c.op}·${c.grain}`, stance: c.stance, terrain: c.terrain, mode: c.mode, domain: c.domain };
  };

  /**
   * createNotes({ frame }) — a fresh ledger. With a frame, the first entry
   * declares it (DEF · Ground · declared): the reader's standing, on the
   * record before anything is heard.
   */
  function createNotes({ frame = null } = {}) {
    const log = createTaskLog();
    if (frame == null) return log;
    if (typeof frame !== "object" || Array.isArray(frame)) throw new TypeError("createNotes: a frame is a descriptor — what this reader stands on, as a plain record");
    return append(log, {
      kind: ENTRY_KINDS.EVIDENCE, task_id: FRAME_TASK, operator: "DEF", operator_basis: OPERATOR_BASIS.DECLARED, grain: GROUND,
      ...cellFields("DEF", GROUND),
      description: "frame: what this reader stands on",
      frame,
    });
  }

  /** The declared frame, or the gap by name — never an invented one. */
  function frameOf(log) {
    const e = (log?.entries ?? []).find((x) => x?.task_id === FRAME_TASK && x.frame);
    return e ? { declared: e.frame, at: e.seq } : { gap: "no_frame", detail: "this ledger was created without declaring what its reader stood on" };
  }

  /**
   * A span is an ADDRESS (`at`) plus whatever the medium's adapter put
   * beside it. The address is computed here when only its parts came
   * (`ref#start-end`, P5.2's own shape); everything else is carried opaque
   * — this file does not know what a span holds. One rule, used by `hear`
   * and by the door alike.
   */
  const addressed = (spans) => (spans ?? [])
    .filter((s) => s && (s.at || (s.ref != null && s.start != null && s.end != null)))
    .map(({ start, end, ...rest }) => ({ ...rest, ref: rest.ref ?? null, at: rest.at ?? `${rest.ref}#${start}-${end}` }));

  const canonId = (end1, label, end2, end1Face, end2Face) => {
    const c = identity ? identity(end1, label, end2) : null;
    return noteId(c?.end1 || end1Face || end1, c?.label || label, c?.end2 || end2Face || end2);
  };

  /**
   * hear(log, { end1, label, end2, spans, witness, because, end1Face, end2Face })
   * — one sighting of one arrangement, admitted. Returns the log UNCHANGED
   * when the sighting moved neither the witness set nor the span set.
   */
  function hear(log, { end1, label, end2, spans = [], witness = null, because = null, end1Face = null, end2Face = null }) {
    const id = canonId(end1, label, end2, end1Face, end2Face);
    const prior = projectTasks(log).find((t) => t.task_id === id) ?? null;
    const witnesses = [...new Set([...(prior?.witnesses ?? []), ...(witness ? [witness] : [])])];
    const at = new Set((prior?.spans ?? []).map((s) => s.at));
    const merged = [...(prior?.spans ?? [])];
    for (const s of addressed(spans)) if (!at.has(s.at)) { at.add(s.at); merged.push(s); }
    if (prior && witnesses.length === prior.witnesses.length && merged.length === (prior.spans?.length ?? 0)) return log;
    return append(log, {
      kind: prior ? ENTRY_KINDS.SUPERSEDE : ENTRY_KINDS.PROPOSE,
      task_id: id,
      operator: prior ? "SYN" : "INS",
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      ...cellFields(prior ? "SYN" : "INS", FIGURE),
      description: prior ? `heard again: ${end1} ${label} ${end2}` : `${end1} ${label} ${end2}`,
      // The FIRST hearing's face wins the display; evidence accumulates
      // beneath it without the words drifting.
      end1: prior?.end1 ?? end1,
      label: prior?.label ?? label,
      end2: prior?.end2 ?? end2,
      witnesses,
      spans: merged,
      ...(because != null ? { because } : {}),
    });
  }

  /**
   * admit(log, arrangements, { gate, witness }) — the door. Every
   * arrangement is heard or turned away with a named reason, and BOTH lists
   * come back. `gate(arrangement)` is the caller's own question — a refusal
   * `{ reason, detail, givers }` or null — and its absence is a disclosed
   * difference: a check that did not run never reports a pass.
   */
  function admit(log, arrangements, { gate = null, witness = null } = {}) {
    let next = log;
    const heard = [];
    const turnedAway = [];
    for (const a of arrangements ?? []) {
      const end1 = String(a?.end1 ?? "").trim();
      const label = String(a?.label ?? "").trim();
      const end2 = String(a?.end2 ?? "").trim();
      if (!end1 || !label || !end2) { turnedAway.push({ arrangement: a, reason: REFUSALS.INCOMPLETE, detail: "an arrangement needs two ends and something between them" }); continue; }
      const spans = addressed(a?.spans);
      if (!spans.length) { turnedAway.push({ arrangement: a, reason: REFUSALS.UNADDRESSED, detail: "no addressed span backs it" }); continue; }
      if (gate) {
        const r = gate({ end1, label, end2, spans });
        if (r) { turnedAway.push({ arrangement: a, reason: r.reason, detail: r.detail ?? null, givers: r.givers ?? null }); continue; }
      }
      next = hear(next, { end1, label, end2, spans, witness, end1Face: a.end1Face ?? null, end2Face: a.end2Face ?? null });
      heard.push({ id: noteId(end1, label, end2), end1, label, end2 });
    }
    return { log: next, heard, turnedAway };
  }

  /**
   * attest(log, id, { witness, span, because }) — a witness earned by
   * testimony attaches to a note that already exists, by id. The witness
   * string arrives already namespaced (`testimony:<ref>`); a bare one is
   * refused rather than mistaken for a mechanical re-sighting.
   */
  function attest(log, id, { witness, span = null, because = null } = {}) {
    if (!witness || !String(witness).includes(":"))
      return { log, refused: { type: "untyped_witness", detail: "an attested witness names its kind (e.g. testimony:<ref>) — a bare string could be mistaken for a mechanical re-sighting" } };
    const prior = projectTasks(log).find((t) => t.task_id === id) ?? null;
    if (!prior) return { log, refused: { type: "unknown_note", noteId: id, detail: "nothing stands to attest — testimony attaches to a note that already exists" } };
    const witnesses = [...new Set([...(prior.witnesses ?? []), witness])];
    const at = new Set((prior.spans ?? []).map((x) => x.at));
    const spans = [...(prior.spans ?? [])];
    if (span?.at && !at.has(span.at)) spans.push(span);
    if (witnesses.length === (prior.witnesses ?? []).length && spans.length === (prior.spans ?? []).length) return { log, refused: null, noop: true };
    const next = append(log, {
      kind: ENTRY_KINDS.SUPERSEDE, task_id: id, operator: "SYN", operator_basis: OPERATOR_BASIS.PRODUCED, grain: FIGURE,
      ...cellFields("SYN", FIGURE),
      description: `attested: ${id}`,
      end1: prior.end1, label: prior.label, end2: prior.end2,
      witnesses, spans, because: because ?? null,
    });
    return { log: next, refused: null, noop: false };
  }

  /** The ids every REC entry on this log has conceded. */
  function concededIds(log) {
    const out = new Set();
    for (const e of log?.entries ?? []) if (e?.kind === ENTRY_KINDS.EVIDENCE && e.operator === "REC" && e.concedes) out.add(e.concedes);
    return out;
  }

  /**
   * concede(log, id, { trigger }) — REC on a note: the reader takes back
   * something it heard. EVIDENCE · REC with the reason VERBATIM; nothing is
   * deleted, the fold stops projecting it, and a conceded note stays
   * conceded — a later re-hearing lands on the same task and does not
   * resurrect it.
   */
  function concede(log, id, { trigger } = {}) {
    if (typeof trigger !== "string" || !trigger.trim())
      return { log, refused: { type: "no_trigger", detail: "concede: a re-zero records its own reason as `trigger` — never a silent concession" } };
    const prior = projectTasks(log).find((t) => t.task_id === id) ?? null;
    if (!prior) return { log, refused: { type: "unknown_note", noteId: id, detail: "nothing stands to concede — a re-zero names a note that exists" } };
    if (concededIds(log).has(id)) return { log, refused: null, noop: true };
    const recId = `rec:${log.nextSeq}`;
    const next = append(log, {
      kind: ENTRY_KINDS.EVIDENCE, task_id: recId, operator: "REC", operator_basis: OPERATOR_BASIS.PRODUCED, grain: FIGURE,
      ...cellFields("REC", FIGURE),
      description: `re-zero: ${trigger}`,
      concedes: id, trigger,
    });
    return { log: next, refused: null, noop: false, id: recId };
  }

  /** What this log has conceded, each with the reason it recorded. */
  function concededNotes(log) {
    const tasks = new Map(projectTasks(log).map((t) => [t.task_id, t]));
    return (log?.entries ?? [])
      .filter((e) => e?.kind === ENTRY_KINDS.EVIDENCE && e.operator === "REC" && e.concedes)
      .map((e) => { const t = tasks.get(e.concedes); return { id: e.concedes, trigger: e.trigger, at: e.seq, end1: t?.end1 ?? null, label: t?.label ?? null, end2: t?.end2 ?? null }; });
  }

  /**
   * fold(log) — the reading, projected: every live note with its witnesses
   * and spans, most-witnessed first. Derived notes (`derived: true`, a
   * different floor's operand) and conceded notes leave the projection;
   * the frame entry has no ends and never enters it.
   */
  function fold(log) {
    const gone = concededIds(log);
    return projectTasks(log)
      .filter((t) => t.end1 && t.label && t.end2 && !t.derived && !gone.has(t.task_id))
      .map((t) => ({ id: t.task_id, end1: t.end1, label: t.label, end2: t.end2, witnesses: t.witnesses ?? [], spans: t.spans ?? [] }))
      .sort((a, b) => b.witnesses.length - a.witnesses.length || a.id.localeCompare(b.id));
  }

  /**
   * readingFromNotes(log, { source }) — the reader's own postures in the
   * shape experience-priors.js sediments. Only the ACT crosses (operator,
   * stance, terrain); no end, label, witness or span does — those are
   * world-facing and a prior that learned them would be learning the world
   * from its own habits. An entry with no cell contributes nothing.
   */
  function readingFromNotes(log, { source } = {}) {
    if (!source) throw new TypeError("readingFromNotes: a source is named — an unattributed reading cannot support cross-work memory");
    const transformationObjects = [];
    for (const e of log?.entries ?? []) {
      if (!e?.stance || !e?.operator) continue;
      transformationObjects.push({ operator: e.operator, stance: e.stance, terrain: e.terrain ?? null });
    }
    return { source, reading: { fold: { graphEntries: [], transformationObjects }, terrainState: {} }, postures: transformationObjects.length };
  }

  /** The hearing entries, in the order the ledger recorded them. */
  const hearings = (log) => (log?.entries ?? []).filter((e) => e?.end1 && e.label && e.end2 && (e.kind === ENTRY_KINDS.PROPOSE || e.kind === ENTRY_KINDS.SUPERSEDE));

  /**
   * stream(log, { by }) — the ledger as the sequence of hearings it
   * recorded, one symbol per hearing: `by: "id"` (which note), `"end1"`,
   * `"end2"`, `"label"`. A re-sighting that appended nothing is not in it —
   * the stream is the record's own, and the record keeps only what taught
   * it something. Each element is returned with the seq it came from so a
   * cut can be carried back to the entry.
   */
  function stream(log, { by = "id" } = {}) {
    const pick = { id: (e) => e.task_id, end1: (e) => e.end1, end2: (e) => e.end2, label: (e) => e.label }[by];
    if (!pick) throw new TypeError(`stream: by is one of id | end1 | end2 | label, not ${JSON.stringify(by)}`);
    return hearings(log).map((e) => ({ symbol: String(pick(e)), seq: e.seq }));
  }

  /** figures(log, { by, order }) — each hearing's surprise, in bits, under the ground heard before it. */
  function figures(log, { by = "id", order } = {}) {
    const s = stream(log, { by });
    const bits = surprises(s.map((x) => x.symbol), { order });
    return s.map((x, i) => ({ ...x, bits: bits[i] }));
  }

  /**
   * segment(log, { by, order, alpha, draws, seed, minLength, depth }) —
   * ground / figure / pattern over the ledger: the stream cut where its
   * ground was most wrong, against its own shuffled null, recursively.
   * Boundaries at every level are carried back to the seqs they fall
   * before, so a caller can test them against its own oracle.
   */
  function segment(log, { by = "id", order, alpha, draws, seed, minLength, depth = 1 } = {}) {
    const s = stream(log, { by });
    const symbols = s.map((x) => x.symbol);
    if (depth === 1) {
      // The floor is the stream's own alphabet (surprise-segments.mjs's own
      // flat call, and what recursiveSegments does per level) — one rule.
      const seg = segmentBySurprise(symbols, { order, alpha, draws, seed, minLength, alphabetSize: new Set(symbols).size });
      return { ...seg, stream: s, boundarySeqs: seg.boundaries.map((b) => s[b].seq) };
    }
    const levels = recursiveSegments(symbols, { order, alpha, draws, seed, minLength, depth });
    return { levels, stream: s, boundarySeqs: (levels[0]?.boundaries ?? []).map((b) => s[b].seq) };
  }

  return { createNotes, frameOf, hear, admit, attest, concede, concededIds, concededNotes, fold, readingFromNotes, stream, figures, segment, noteId, recipeId, REFUSALS, FRAME_TASK };
}
