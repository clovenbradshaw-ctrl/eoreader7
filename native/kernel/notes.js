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
import { surprises, segmentBySurprise, recursiveSegments, quantile } from "./surprise-segments.js";
import { lcg, shuffled } from "./continuation.js";

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
 * THE WITNESS GRAMMAR, owned here because the ledger is what a witness
 * strings attach to: `[kind:]<ref>[#address][~recipe]`. `kind:` names how
 * the witness was earned (a testimony vote is `testimony:`); `#address` is
 * P5.2's own span shape; `~recipe` is P68's identity of the reader. The
 * SOURCE is the ref alone — two addresses in one ref are one perspective,
 * and a testimony vote from a ref the ledger already heard is the same
 * perspective wearing a second costume (found live, 2026-09-02: the first
 * witness walk over a real book attested eight notes, every one by the
 * part it was heard in, because the address was being compared as part of
 * the source). The INSTRUMENT is the recipe alone: two sources read by one
 * reader cannot disagree about anything the reader gets wrong.
 */
export const sourceOfWitness = (w) => {
  let s = String(w ?? "");
  const kind = s.indexOf(":");
  if (kind > 0 && !/[#~]/.test(s.slice(0, kind))) s = s.slice(kind + 1);
  const tilde = s.indexOf("~");
  if (tilde >= 0) s = s.slice(0, tilde);
  const hash = s.indexOf("#");
  return hash >= 0 ? s.slice(0, hash) : s;
};
export const recipeOfWitness = (w) => { const s = String(w ?? ""); const t = s.indexOf("~"); return t >= 0 ? s.slice(t + 1) : null; };
/** The declared KIND of a witness — the prefix before the first ":" when
 * that prefix carries no address or recipe (`testimony:`, `primary:`,
 * `planted:`); a witness with no kind is a mechanical sighting and reads
 * `sighting`. Kinds are caller-declared vocabulary; this file counts them
 * and never interprets one. */
export const kindOfWitness = (w) => {
  const s = String(w ?? "");
  const kind = s.indexOf(":");
  return kind > 0 && !/[#~]/.test(s.slice(0, kind)) ? s.slice(0, kind) : "sighting";
};

/**
 * standingOf(note) — what a note's witnesses amount to, DISCLOSED as counts
 * and a typed standing, never as a bit: `sources` (distinct refs),
 * `instruments` (distinct recipes; undeclared recipes counted apart),
 * and the standing:
 *   single-witness             — one source
 *   corroborated               — two or more sources through ONE instrument
 *                                (they cannot disagree about that
 *                                instrument's own errors)
 *   corroborated-independently — two or more sources AND two or more
 *                                instruments
 * `kinds` counts witnesses by their declared kind (`sighting` for a bare
 * mechanical witness) so a consumer can tell a note read off an ACCOUNT of
 * a thing from one read off the thing itself — a report of a measurement
 * and the instrument's own record are different kinds of witness in every
 * medium, and which kinds exist is the caller's vocabulary, not this
 * file's.
 * The floor is 2, binding.js's structural minimum: one witness has no
 * second to agree with. A consumer that gates on a standing gates on a
 * fact the note carries; a consumer that WITHHOLDS a note for its standing
 * is making a decision this file does not make for it.
 */
export function standingOf(note) {
  const ws = note?.witnesses ?? [];
  const sources = new Set(ws.map(sourceOfWitness));
  const recipes = new Set(ws.map(recipeOfWitness).filter((r) => r != null));
  const undeclared = ws.filter((w) => recipeOfWitness(w) == null).length;
  const standing = sources.size < 2 ? "single-witness" : recipes.size >= 2 ? "corroborated-independently" : "corroborated";
  const kinds = {};
  for (const w of ws) { const k = kindOfWitness(w); kinds[k] = (kinds[k] ?? 0) + 1; }
  // WHAT THE CORROBORATION RESTS ON. Every source past the first joined
  // this note across a referent bridge (see `hear`). `assumedBridges`
  // counts the ones nothing established, so "corroborated" can be read
  // back as "corroborated across N bridges nobody checked" rather than as
  // a bare number. A note standing on one source has none by construction.
  // Named `crossings`/`assumedBridges` rather than `joins` on purpose:
  // foldWithStanding spreads this over the note itself, and a count here
  // called `joins` would shadow the note's own record of them.
  const joins = note?.joins ?? [];
  const assumedBridges = joins.filter((j) => j?.standing === "assumed").length;
  return { sources: sources.size, instruments: recipes.size, undeclared, standing, kinds, crossings: joins.length, assumedBridges };
}

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
 *  - `bridge(crossing)` decides whether a hearing from a NEW SOURCE may join
 *    a note an OLD source already stands on. See `hear` below for why that
 *    is a separate question from whether the two propositions match. Absent,
 *    every crossing is allowed and RECORDED as assumed — never silent.
 *  - `identityGiver` names what the id rested on, for the join record. It is
 *    a label on evidence, never a check.
 */
export function makeNotes({ taskLog = nativeTaskLog, cellOf = nativeCellOf, identity = null, bridge = null, identityGiver = null } = {}) {
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

  /** Every frame this ledger has stood on, in order — the first at birth, the rest redeclared. */
  const frames = (log) => (log?.entries ?? []).filter((x) => x?.task_id === FRAME_TASK && x.frame).map((e) => ({ declared: e.frame, at: e.seq }));

  /** The frame IN FORCE (the latest declared), or the gap by name — never an invented one. */
  function frameOf(log) {
    const all = frames(log);
    if (!all.length) return { gap: "no_frame", detail: "this ledger was created without declaring what its reader stood on" };
    const last = all.at(-1);
    return { declared: last.declared, at: last.at, revisions: all.length - 1 };
  }

  /**
   * redeclareFrame(log, frame) — the reader's standing CHANGED after birth (a
   * prior loaded, an organ was swapped) and the ledger says so: SUPERSEDE on
   * the frame task, the past kept (task-log's own rule), so a hearing's seq
   * always falls under exactly one frame in force. A frame identical to the
   * one in force appends nothing. A ledger born without a frame may still
   * be given one here — late is honest, invented is not.
   */
  function redeclareFrame(log, frame) {
    if (!frame || typeof frame !== "object" || Array.isArray(frame)) throw new TypeError("redeclareFrame: a frame is a descriptor — what this reader stands on, as a plain record");
    const current = frameOf(log);
    if (current.declared && canon(current.declared) === canon(frame)) return log;
    return append(log, {
      kind: current.declared ? ENTRY_KINDS.SUPERSEDE : ENTRY_KINDS.EVIDENCE, task_id: FRAME_TASK, operator: "DEF", operator_basis: OPERATOR_BASIS.DECLARED, grain: GROUND,
      ...cellFields("DEF", GROUND),
      description: current.declared ? "frame redeclared: what this reader stands on now" : "frame: what this reader stands on",
      frame,
    });
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
    const baseId = canonId(end1, label, end2, end1Face, end2Face);
    const tasks = projectTasks(log);
    const incomingSource = witness ? sourceOfWitness(witness) : null;

    // ── ONE MATCH WAS DOING TWO JOBS ──────────────────────────────────
    // A triple that matches a note already on this ledger asserts that the
    // two PROPOSITIONS are the same. When the hearing also arrives from a
    // source no witness of that note has named, it asserts something else
    // as well: that the two documents' REFERENTS are the same. That second
    // claim is a bridge between two readings, each of which established its
    // own universe of referents, and it was never made explicitly, never
    // recorded, and could not be conceded. Usually right; silently
    // catastrophic when it is not — two Smiths, one note, two witnesses,
    // nothing to find out from.
    //
    // The two jobs are separated here. Proposition identity still decides
    // the id. Referent identity becomes a JOIN carried on the entry, with
    // what it rested on and a standing of its own, so a `corroborated`
    // reading can be read back as "corroborated across N assumed bridges".
    // With no `bridge` organ every crossing is still allowed, so behaviour
    // is unchanged — but it is no longer invisible, which is the whole of
    // this step. Establishing or conceding a bridge is the next one.
    let prior = tasks.find((t) => t.task_id === baseId) ?? null;
    let id = baseId;
    let joins = prior?.joins ?? [];
    let unbridged = prior?.unbridged ?? null;
    const priorSources = new Set((prior?.witnesses ?? []).map(sourceOfWitness));
    if (prior && incomingSource && !priorSources.has(incomingSource)) {
      const crossing = {
        end1: prior.end1, label: prior.label, end2: prior.end2,
        incoming: { end1, label, end2, spans: addressed(spans), witness },
        from: [...priorSources], to: incomingSource,
        basis: identityGiver ?? (identity ? "identity-organ" : "string-identity"),
      };
      const refusal = bridge ? bridge(crossing) : null;
      if (refusal) {
        // REFUSED: these are two universes, so this is two notes. The
        // sighting keeps its own address under its own source rather than
        // being dropped — nothing is lost, and a bridge established later
        // has two real notes to join.
        id = `${baseId}@${incomingSource}`;
        prior = tasks.find((t) => t.task_id === id) ?? null;
        joins = prior?.joins ?? [];
        unbridged = prior?.unbridged ?? { of: baseId, from: crossing.from, reason: refusal.reason ?? "bridge_refused", detail: refusal.detail ?? null };
      } else {
        joins = [...joins, {
          source: incomingSource, from: crossing.from, assumed: [prior.end1, prior.end2],
          // The prior side already has a face (`assumed`, above — the
          // established note's own display). Step 1 dropped the INCOMING
          // side's own face and spans the moment `bridge()` returned, so a
          // bridge could be COUNTED but never actually SHOWN — two ends,
          // one recorded. `crossing.incoming` already carried both; this
          // keeps them, so `native/organs/bridges.js` (step 2) has a real
          // correspondence to record, not a fabricated one.
          incomingEnds: { end1: end1Face || end1, end2: end2Face || end2 },
          incomingSpans: crossing.incoming.spans,
          basis: crossing.basis, standing: "assumed",
        }];
      }
    }
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
      ...(joins.length ? { joins } : {}),
      ...(unbridged ? { unbridged } : {}),
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
      // `joins` and `unbridged` ride only when they exist, so a note that
      // crossed no universe has exactly the shape it always had.
      .map((t) => ({ id: t.task_id, end1: t.end1, label: t.label, end2: t.end2, witnesses: t.witnesses ?? [], spans: t.spans ?? [], ...(t.joins?.length ? { joins: t.joins } : {}), ...(t.unbridged ? { unbridged: t.unbridged } : {}) }))
      .sort((a, b) => b.witnesses.length - a.witnesses.length || a.id.localeCompare(b.id));
  }

  /** fold(log) with each note's standing disclosed beside it — the shape a consumer that never withholds should read. */
  const foldWithStanding = (log) => fold(log).map((n) => ({ ...n, ...standingOf(n) }));

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

  /**
   * figures(log, { by, order }) — each hearing's surprise, in bits, under
   * the ground heard before it. The floor is the stream's own alphabet
   * (one rule with `segment`): with a GROWING floor every later first
   * occurrence reads a hair more surprising than an earlier one, and a
   * ranking by bits then just names the last hearings — which is exactly
   * what the first run of notes-segments.mjs mistook for a finding.
   */
  function figures(log, { by = "id", order } = {}) {
    const s = stream(log, { by });
    const symbols = s.map((x) => x.symbol);
    const bits = surprises(symbols, { order, alphabetSize: new Set(symbols).size });
    return s.map((x, i) => ({ ...x, bits: bits[i] }));
  }

  /** The source a hearing came from: the witness it was last heard by, up to its address or its recipe. */
  const defaultSourceOf = (e) => { const w = String((e?.witnesses ?? []).at(-1) ?? ""); return w ? w.split("#")[0].split("~")[0] : null; };

  /**
   * dietBoundaries(log, { by, order, alpha, draws, seed, sourceOf }) — where a
   * reading stopped hearing its material.
   *
   * For each source, the ledger's hearings in order; each hearing's surprise
   * under the ground heard before it; the TAIL RUN — how many hearings at the
   * very end sit at or above the null's cut — against the tail runs the
   * same hearings produce with their order destroyed. A tail run longer than
   * the shuffle's own (1−alpha) quantile is a boundary: from that hearing on,
   * nothing the reading heard recurred with what it had heard before. What
   * that is (a wrapper, a bibliography, an index, a licence) this file does
   * not know; it reports the run and its seqs, and `concedeDiet` is a
   * separate act. No site rule, no vocabulary, no medium: the same test on a
   * score would find where the applause starts.
   *
   * MEASURED, AND REFUTED AS A WRAPPER DOOR (2026-09-02, eval/the-fold/
   * diet-boundary.mjs). On planted structure it is exact (the pin below).
   * On real material it fails its control in both directions: the three
   * Wikipedia wrappers and Project Gutenberg's 18KB licence tail do NOT form
   * a run (their ends recur — "Project Gutenberg", "the Foundation",
   * "Статьи"), while the pages cut back to prose DO fire — on a closing
   * section that is a list of adaptations, or of streets named after the
   * battle. What this measures is a TAIL OF ENDS THAT NEVER RECUR, which is
   * the shape of a list, not of furniture. So `dietBoundaries` stays as a
   * diagnostic (it reports exactly that, with its null), and `concedeDiet`
   * is NOT licensed on real material — kept, tested, and named so it is not
   * rebuilt as an admission act under a new name. The results doc has the
   * numbers.
   *
   * `sourceOf(entry)` keys hearings to a source (default: the last witness up
   * to its `#` address or `~` recipe — P5.2's own address shape). A source
   * with fewer than two hearings is reported with `run: null`, never judged.
   */
  function dietBoundaries(log, { by = "end1", order, alpha, draws, seed, sourceOf = defaultSourceOf } = {}) {
    for (const [k, v] of Object.entries({ order, alpha, draws, seed })) if (!Number.isFinite(v)) throw new TypeError(`dietBoundaries: ${k} is declared`);
    const entryAt = new Map(hearings(log).map((e) => [e.seq, e]));
    const bySource = new Map();
    for (const x of stream(log, { by })) {
      const src = sourceOf(entryAt.get(x.seq));
      if (src == null) continue;
      if (!bySource.has(src)) bySource.set(src, []);
      bySource.get(src).push(x);
    }
    const tailRun = (bits, cut) => { let k = 0; for (let i = bits.length - 1; i >= 0 && bits[i] >= cut; i -= 1) k += 1; return k; };
    const out = [];
    for (const [source, xs] of bySource) {
      if (xs.length < 2) { out.push({ source, hearings: xs.length, run: null, runNull: null, cut: null, boundary: false, seqs: [], refused: "too_short" }); continue; }
      const symbols = xs.map((x) => x.symbol);
      const alphabetSize = new Set(symbols).size;
      const observed = surprises(symbols, { order, alphabetSize });
      const rng = lcg(seed);
      const nullBits = [];
      for (let d = 0; d < draws; d += 1) nullBits.push(surprises(shuffled(symbols, rng), { order, alphabetSize }));
      const pooled = nullBits.flatMap((b) => Array.from(b)).sort((a, b) => a - b);
      const cut = quantile(pooled, 1 - alpha);
      const nullRuns = nullBits.map((b) => tailRun(b, cut)).sort((a, b) => a - b);
      const runNull = quantile(nullRuns, 1 - alpha);
      const run = tailRun(observed, cut);
      const boundary = run > runNull;
      out.push({ source, hearings: xs.length, run, runNull, cut, boundary, seqs: boundary ? xs.slice(xs.length - run).map((x) => x.seq) : [], refused: null });
    }
    return out;
  }

  /**
   * concedeDiet(log, boundary, { trigger }) — REC on every note whose EVERY
   * hearing falls inside the boundary's run: the reading takes back what it
   * heard after it stopped hearing the material. A note also heard before
   * the run stays — it was material once. Append-only, like every concede.
   */
  function concedeDiet(log, boundary, { trigger } = {}) {
    if (!boundary?.boundary || !boundary.seqs?.length) return { log, conceded: [], refused: { type: "no_boundary", detail: "nothing to concede — this source's tail cleared its own null" } };
    const inRun = new Set(boundary.seqs);
    const seqsOf = new Map();
    for (const e of hearings(log)) { if (!seqsOf.has(e.task_id)) seqsOf.set(e.task_id, []); seqsOf.get(e.task_id).push(e.seq); }
    const conceded = [];
    let next = log;
    for (const [id, seqs] of seqsOf) {
      if (!seqs.every((q) => inRun.has(q))) continue;
      const r = concede(next, id, { trigger: `${trigger ?? "diet boundary"}: ${boundary.source} tail run of ${boundary.run} hearings (null ${boundary.runNull})` });
      if (!r.refused && !r.noop) { next = r.log; conceded.push(id); }
    }
    return { log: next, conceded, refused: null };
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

  return { createNotes, frameOf, frames, redeclareFrame, hear, admit, attest, concede, concededIds, concededNotes, fold, foldWithStanding, standingOf, sourceOfWitness, recipeOfWitness, kindOfWitness, readingFromNotes, stream, figures, segment, dietBoundaries, concedeDiet, noteId, recipeId, REFUSALS, FRAME_TASK };
}
