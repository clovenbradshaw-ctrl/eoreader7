// Handle: Dickens — Charles Dickens wrote his novels in monthly numbers, each
// written while the last was already in print, and kept "number plans": a
// sheet per instalment of who was in it, what was settled, what had to come
// back. He wrote books far longer than he could hold in mind at once by
// holding them on paper.
//
// long-form.js — the BODIES stage of the one pipeline, and its revisions. The
// outline (the whole, its counted parts, its cast and their details, a line
// for each part) is built and sealed by organs/talk-build.js like any other
// build. This stage then fills each leaf part (a scene) with the mouth's own
// words, one part at a time, in order, and never shows the mouth more than
// one working note:
//
//   the note    what the story is about; the lines for this part and the part
//               it sits in; the facts of the people here, as plain sentences;
//               and, as the anchor the mouth goes on from, the last sentences
//               of the part before. Built from the ledger each time, so its
//               size does not grow with the work.
//   the body    heard as ONE claim (scene —body→ text:<sha12>), witness the
//               ask it came from; the words are kept by their hash in the
//               text store, never inside a claim. Its because names the
//               notes the working note carried ([premises: …]) — what the
//               words rest on.
//   elements    the body's sentences, one per line of the artifact; each maps
//               to the claim its words came from (the body, or an edit).
//   set-down    a body with too few sentences is asked again, twice; then its
//               part is a declared void (NUL), scoped to the asks (Simon).
//
// REVISIONS. A change the person makes is heard into the ledger (witness
// request:rev<n>) and the note it replaces is conceded. What rests on the old
// note is found from the record, not re-read by the mouth: a body whose
// premises name it, and any line whose words state the old value. That a
// body's words go stale when a premise changes is a mechanism of this stage
// — the derived-claim withdrawal in talk-build's settle() never touches a
// claim the mouth witnessed. A rename is a mechanical edit of the words
// (derived:rename, zero asks); a changed detail re-asks only the lines that
// state the old value, one sentence each. Every edit is its own claim with
// its premises, and a line nothing touched keeps its bytes and its claim.
// No regular expressions.
import { createHash } from "node:crypto";
import { makeNotes } from "../kernel/notes.js";
import { sealArtifact } from "../kernel/artifact.js";
import { beliefOf } from "./talk-build.js";
import { uncovered } from "./provenance-cover.js";
import { helixCheck, premisesOf } from "./claim-acts.js";
import { reason, isDerived } from "./talk-reason.js";
import { groundAt } from "./carried-ground.js";
import { lcg } from "../kernel/continuation.js";

export const LONG_FORM_SCHEMA = "LongForm@1";
/** The anchor is this many sentences of the part before — set by hand
 *  2026-09-27 (panel, Gary: the mouth goes on from where it was). */
export const TAIL_SENTENCES = 2;
/** At most this many people are carried into one ask — set by hand
 *  2026-09-27, so a crowded scene cannot grow the note without bound. */
export const HERE_CAP = 4;
/** A body is asked at most this many times, then its part is a declared void
 *  — set by hand 2026-09-27 (panel, Simon; the same two-then-void rule as
 *  talk-build's gaps). */
export const BODY_TRIES = 3;
/** A body with fewer sentences than this is not a part of the story — set by
 *  hand 2026-09-27. */
export const MIN_BODY_SENTENCES = 3;

const sha12 = (text) => createHash("sha256").update(String(text)).digest("hex").slice(0, 12);

/** The words, kept by their hash: a claim carries the address, never the text. */
export function makeTextStore(init = {}) {
  const byKey = new Map(Object.entries(init));
  return {
    put(text) { const k = `text:${sha12(text)}`; byKey.set(k, String(text)); return k; },
    get: (k) => byKey.get(k) ?? null,
    toJSON: () => Object.fromEntries(byKey),
  };
}

// letters and digits make a word; anything else bounds it
const isWordChar = (ch) => !!ch && (ch.toLowerCase() !== ch.toUpperCase() || (ch >= "0" && ch <= "9"));

/** Every place `word` stands as a whole word in `text` ("Tom's" yes,
 *  "Tomorrow" no, "Ana" in "Banana" no). */
export function wordAt(text, word) {
  const s = String(text), w = String(word), at = [];
  if (!w) return at;
  let i = s.indexOf(w);
  while (i >= 0) {
    if (!isWordChar(s[i - 1]) && !isWordChar(s[i + w.length])) at.push(i);
    i = s.indexOf(w, i + 1);
  }
  return at;
}
export const hasWord = (text, word) => wordAt(text, word).length > 0;
/** `word` replaced as a whole word, every other byte kept. */
export function replaceWord(text, word, by) {
  const s = String(text);
  const at = wordAt(s, word);
  if (!at.length) return s;
  let out = "", from = 0;
  for (const i of at) { out += s.slice(from, i) + by; from = i + word.length; }
  return out + s.slice(from);
}

// a title before a name is not a sentence's end: "Mr. Johnson" is one line —
// set by hand 2026-09-27 (the sentence splitter cut after "Mr.")
const TITLES = new Set(["mr.", "mrs.", "ms.", "dr.", "st.", "jr.", "sr.", "prof.", "capt.", "rev."]);
/** A body as its lines: paragraphs (a blank line between) of sentences. */
export function linesOfBody(text, sentences) {
  const out = [];
  String(text ?? "").split("\n\n").forEach((para, p) => {
    const ss = sentences(para.split("\n").join(" ")).map((s) => s.text);
    for (let i = 0; i < ss.length; i++) {
      let t = ss[i];
      while (i + 1 < ss.length && TITLES.has(t.split(" ").at(-1).toLowerCase())) t = `${t} ${ss[++i]}`;
      out.push({ text: t, para: p });
    }
  });
  return out;
}

/** The mouth's reply cut to what is a body: whole sentences only (a reply cut
 *  off by its length ends mid-sentence), no heading or preamble lines. */
export function bodyOfReply(reply, sentences) {
  const kept = String(reply ?? "").split("\n").filter((l) => {
    const t = l.trim();
    return !t.startsWith("#") && !t.startsWith("**") && !t.endsWith(":") && !t.toLowerCase().startsWith("chapter ") && !t.toLowerCase().startsWith("scene ");
  }).join("\n");
  const paras = kept.split("\n\n").map((p) => p.split("\n").join(" ").trim()).filter(Boolean);
  const out = [];
  for (const p of paras) {
    const ss = sentences(p).map((s) => s.text);
    out.push(ss);
  }
  // the last sentence of the reply is kept only when it is finished
  const last = out.at(-1);
  if (last?.length) { const end = last.at(-1).trim().at(-1); if (![".", "!", "?", "\"", "”", "’", "'"].includes(end)) last.pop(); }
  return out.filter((p) => p.length).map((p) => p.join(" ")).join("\n\n");
}

/** The things on the record, from its INS notes (the ear's working memory is
 *  not needed to read an outline back). */
export function thingsFromFold(fold) {
  return fold.filter((n) => n.label === "exists").map((n) => ({ id: n.end1, kind: n.end2, modifier: null, name: null }));
}

/** The outline read back from the ledger: the whole, the leaf parts in their
 *  order with the parts they sit in, and the cast with their details. */
export function outlineOf(fold, { root, bodyKind, castKind }) {
  const belief = beliefOf(fold, thingsFromFold(fold));
  const byId = new Map(belief.map((t) => [t.id, t]));
  const whole = belief.find((t) => t.kind === root && !t.parent) ?? null;
  const leaves = [];
  const walk = (t, path) => {
    for (const c of t.children.map((id) => byId.get(id)).filter(Boolean)) {
      if (c.kind === castKind) continue;
      if (c.kind === bodyKind) leaves.push({ part: c, within: path });
      else walk(c, [...path, c]);
    }
  };
  if (whole) walk(whole, []);
  const cast = belief.filter((t) => t.kind === castKind && t.name).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return { belief, byId, whole, leaves, cast };
}

const lineOf = (t) => t?.props.find((p) => p.label === "says") ?? null;

/**
 * makeLongForm({ ask, sentences, medium, mouth, log, persist, recipe })
 *   ask(prompt, { stage, attempt, numPredict }) -> string | { response, prompt_eval_count }
 *   medium    { root, bodyKind, castKind, storyWord, bodyTokens, lineTokens }
 *   recipe    "ledger" (the working note) or "lines-only" (the ablation: the
 *             lines and the anchor, no facts about the people)
 *   persist   ({ notes, store, done }) after every part set down (Hora: a stop
 *             loses one part, never the book)
 */
export function makeLongForm({ ask, sentences, medium, mouth = "mouth", log = () => {}, persist = () => {}, recipe = "ledger", castDetails = null, spec = null, carry = null, carrySeed = 1 }) {
  // carry: null, "field" (organs/carried-ground.js: the ground row) or
  // "stale" — its falsification control, the field as it stood at a random
  // earlier part: carried facts, but not this part's ground
  // castDetails: the details the request asked each person to have ("an age
  // and a job"); only these are carried as facts — what the ear heard a
  // person do in the outline's talk is on the record, not in the note
  const N = makeNotes();
  const say = async (prompt, opts) => {
    const r = await ask(prompt, opts);
    return typeof r === "string" ? { text: r, promptTokens: null } : { text: String(r?.response ?? ""), promptTokens: r?.prompt_eval_count ?? null };
  };

  // the current words of a part: its body, with the latest edit of each line over it
  // THE LINES OF A PART, BY ADDRESS. A body's own sentences are `line k`; a
  // line set in between (a bridge, a floor) is `after k.j` — the j-th set
  // after line k. Every edit is a claim at an address (the latest heard
  // wins), a folded line is the empty text, and an address never moves, so
  // an edit made later still lands where it was aimed.
  function currentLines(fold, entries, store, partId) {
    const body = fold.find((n) => n.end1 === partId && n.label === "body");
    if (!body) return null;
    const base = linesOfBody(store.get(body.end2), sentences).map((l, i) => ({ ...l, note: body.id, addr: `line ${i + 1}` }));
    const seqOf = new Map();
    for (const e of entries) if (e.task_id && !seqOf.has(e.task_id)) seqOf.set(e.task_id, e.seq);
    const latest = new Map();
    for (const e of fold.filter((n) => n.end1 === partId && (n.label.startsWith("line ") || n.label.startsWith("after "))).sort((a, b) => (seqOf.get(a.id) ?? 0) - (seqOf.get(b.id) ?? 0))) latest.set(e.label, e);
    const lines = [];
    const inserts = (k, para) => [...latest.values()].filter((e) => e.label.startsWith(`after ${k}.`)).sort((a, b) => Number(a.label.split(".")[1]) - Number(b.label.split(".")[1])).forEach((e) => { const text = store.get(e.end2) ?? ""; if (text) lines.push({ text, para, note: e.id, addr: e.label }); });
    inserts(0, base[0]?.para ?? 0);
    base.forEach((l, i) => {
      const e = latest.get(l.addr);
      const text = e ? store.get(e.end2) ?? "" : l.text;
      if (text) lines.push({ ...l, text, note: e ? e.id : l.note });
      inserts(i + 1, l.para);
    });
    return { body, lines, base: base.length, nextAfter: (k) => 1 + [...latest.keys()].filter((a) => a.startsWith(`after ${k}.`)).length };
  }

  // the people a line of the story names, in cast order, at most HERE_CAP
  const namedIn = (texts, cast) => cast.filter((c) => texts.some((t) => hasWord(t, c.name))).slice(0, HERE_CAP);

  /** Where a part sits among its own kind under its parent, and the role
   *  the medium places it in (null when the medium has no arcs). */
  function roleOf(outline, t) {
    if (!medium.partRole || !t) return null;
    const parent = outline.byId.get(t.parent);
    const sibs = (parent?.children ?? []).map((id) => outline.byId.get(id)).filter((x) => x && x.kind === t.kind).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return medium.partRole({ belief: outline.belief, parentId: t.parent ?? null, kind: t.kind, index: Math.max(0, sibs.indexOf(t)), n: sibs.length });
  }

  // the bodies set down before part i, as the ground row reads them: each
  // with its chapter (the group it sits in, counted in order)
  const pick = lcg(carrySeed);
  function partsSoFar(outline, notes, store, i) {
    const fold = N.fold(notes);
    const groups = [];
    return outline.leaves.slice(0, i).map((leaf) => {
      const g = leaf.within.at(-1)?.id ?? "whole";
      if (groups.at(-1) !== g) groups.push(g);
      const cur = currentLines(fold, notes.entries, store, leaf.part.id);
      return { id: leaf.part.id, chapter: groups.length - 1, lines: (cur?.lines ?? []).map((l) => ({ text: l.text, addr: l.addr })) };
    });
  }
  const castDetailValues = (outline) => outline.cast.flatMap((c) => c.props.filter((p) => (castDetails ?? []).includes(p.label) || ["home", "lacks", "becomes"].includes(p.label)).map((p) => p.value));

  /** The working note for one part — every line of it from the record. */
  function workingNote({ outline, leaf, prevTail, topic, ground = [] }) {
    const carried = [], lines = [];
    const story = medium.storyWord ?? "story";
    if (topic) lines.push(`The ${story} is ${topic}.`);
    for (const t of [...leaf.within, leaf.part]) { const l = lineOf(t); if (l) { lines.push(l.value.trim().endsWith(".") ? l.value.trim() : `${l.value.trim()}.`); carried.push(l.note); } }
    // the part's place in the nested arcs (organs/narrative-arc.js), as the
    // engine's facts, standing on what the record says of the being
    const role = recipe === "ledger" ? roleOf(outline, leaf.part) : null;
    if (role) { lines.push(...role.facts); carried.push(...role.premises); }
    // the ground row carried from the parts before (the engine's own facts)
    lines.push(...ground);
    let here = [];
    if (recipe === "ledger") {
      here = namedIn([...lines, ...prevTail], outline.cast);
      if (!here.length && outline.cast.length) here = [outline.cast[0]];
      for (const c of here) {
        carried.push(c.nameNote);
        for (const p of c.props.filter((q) => (castDetails ? castDetails.includes(q.label) : q.label !== "says") && !q.superseded)) { lines.push(`${c.name}'s ${p.label} is ${p.value}.`); carried.push(p.note); }
      }
      // how the people here are bound to the others (CON on the record), as sentences
      const nameOf = new Map(outline.cast.map((c) => [c.id, c.name]));
      for (const c of here) for (const p of c.props.filter((q) => q.label.endsWith(" of") && nameOf.has(q.value))) { lines.push(`${c.name} is ${nameOf.get(p.value)}'s ${p.label.slice(0, -3)}.`); carried.push(p.note); }
      if (here.length) lines.push(`${here.map((c) => c.name).join(here.length > 2 ? ", " : " and ")} ${here.length > 1 ? "are" : "is"} here.`);
    }
    const anchor = prevTail.join(" ");
    const prompt = `${lines.join("\n")}\n\n${anchor ? `Continue the ${story}.\n\n${anchor}` : `Begin the ${story}.`}`;
    return { prompt, anchor, carried: carried.filter(Boolean), here: here.map((c) => c.id) };
  }

  /**
   * writeBodies({ notes, store, topic, maxAsks }) -> { notes, store, asks, voids, prompts }
   * Fills every leaf part without a body, in order.
   */
  async function writeBodies({ notes, store = makeTextStore(), topic = null, maxAsks = Infinity }) {
    let asks = 0;
    const voids = [], prompts = [];
    const outline = outlineOf(N.fold(notes), medium);
    let prevTail = [];
    for (let i = 0; i < outline.leaves.length; i++) {
      const leaf = outline.leaves[i];
      const fold = N.fold(notes);
      const have = currentLines(fold, notes.entries, store, leaf.part.id);
      if (have) { prevTail = have.lines.slice(-TAIL_SENTENCES).map((l) => l.text); continue; }
      if (N.foldVoids(notes).some((v) => v.end1 === leaf.part.id)) { prevTail = []; continue; }
      let ground = [];
      if (carry && recipe === "ledger") {
        const soFar = partsSoFar(outline, notes, store, i);
        const k = carry === "stale" ? (i > 1 ? 1 + Math.floor(pick() * (i - 1)) : 0) : i;
        // "field:con", "field:rec", "field:syn" carry one element alone (the ablation)
        const only = carry.startsWith("field:") ? new Set([carry.slice(6)]) : null;
        ground = groundAt({ parts: soFar, k, cast: outline.cast, sentences, known: castDetailValues(outline), only }).facts;
        log({ kind: "carried", part: leaf.part.id, mode: carry, from: k, facts: ground });
      }
      const note = workingNote({ outline, leaf, prevTail, topic, ground });
      // the role on the record: the engine placed it (derived:arc), on the being's frame
      const role = recipe === "ledger" ? roleOf(outline, leaf.part) : null;
      if (role && !fold.some((n) => n.end1 === leaf.part.id && n.label === "role")) notes = N.hear(notes, { end1: leaf.part.id, label: "role", end2: role.roles.join(" / "), witness: "derived:arc", because: `placed by position in the nested arcs [premises: ${JSON.stringify(role.premises)}]` });
      let body = null, tries = 0;
      while (!body && tries < BODY_TRIES && asks < maxAsks) {
        asks++; tries++;
        const t0 = Date.now();
        const got = await say(note.prompt, { stage: `body:${leaf.part.id}`, attempt: tries - 1, numPredict: medium.bodyTokens ?? 320 });
        let reply = got.text.trim();
        while (note.anchor && reply.startsWith(note.anchor)) reply = reply.slice(note.anchor.length).trim();
        const text = bodyOfReply(reply, sentences);
        const n = linesOfBody(text, sentences).length;
        prompts.push({ part: leaf.part.id, chars: note.prompt.length, promptTokens: got.promptTokens, carried: note.carried.length });
        log({ kind: "body_turn", part: leaf.part.id, attempt: tries, prompt: note.prompt, reply: got.text, sentences: n, promptTokens: got.promptTokens, ms: Date.now() - t0 });
        if (n >= MIN_BODY_SENTENCES) body = { text, witness: `talk:${mouth}#body${prompts.length}` };
      }
      if (!body) {
        const r = N.declareVoid(notes, { end1: leaf.part.id, label: "body", scope: { sources: [`talk:${mouth}`], read: tries }, because: `asked ${tries} times, no body of ${MIN_BODY_SENTENCES} sentences heard` });
        if (!r.refused) notes = r.log;
        voids.push(leaf.part.id);
        prevTail = [];
      } else {
        const address = store.put(body.text);
        notes = N.hear(notes, { end1: leaf.part.id, label: "body", end2: address, witness: body.witness, because: `${note.here.length ? `with ${note.here.join(", ")} ` : ""}[premises: ${JSON.stringify(note.carried)}]` });
        prevTail = linesOfBody(body.text, sentences).slice(-TAIL_SENTENCES).map((l) => l.text);
      }
      persist({ notes, store, done: i + 1, of: outline.leaves.length });
    }
    return { notes, store, asks, voids, prompts };
  }

  /** The work as text, one sentence per line, and the account of every line. */
  function render({ notes, store }) {
    const fold = N.fold(notes);
    const outline = outlineOf(fold, medium);
    const map = [], out = [];
    const line = (text, src) => { out.push(text); if (String(text).trim()) map.push({ text: String(text).trim(), src }); };
    const title = outline.whole?.name ? { text: outline.whole.name, src: [outline.whole.nameNote] } : { text: medium.untitled ?? "Untitled", src: ["engine:untitled"] };
    out.push(`# ${title.text}`); map.push({ text: title.text, src: title.src });
    let within = null;
    for (const leaf of outline.leaves) {
      const group = leaf.within.at(-1) ?? null;
      if (group && group !== within) {
        within = group;
        const num = fold.find((n) => n.end1 === group.id && n.label === "ordinal");
        const heading = `${group.kind.charAt(0).toUpperCase()}${group.kind.slice(1)} ${num ? num.end2 : ""}`.trim();
        out.push("", `## ${heading}`); map.push({ text: heading, src: [group.existsNote, num?.id].filter(Boolean) });
      } else out.push("", medium.partBreak ?? "* * *"), map.push({ text: medium.partBreak ?? "* * *", src: ["engine:break"] });
      const cur = currentLines(fold, notes.entries, store, leaf.part.id);
      if (!cur) continue;
      out.push("");
      let para = 0;
      for (const l of cur.lines) { if (l.para !== para) { out.push(""); para = l.para; } line(l.text, [l.note]); }
    }
    return { artifact: `${out.join("\n")}\n`, map, engineWords: { untitled: medium.untitled ?? "Untitled", break: medium.partBreak ?? "* * *" } };
  }

  /** The elements of the text, read in its own terms: every non-empty line,
   *  a heading without its marks. */
  const leavesOf = (text) => String(text).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    let t = l; while (t.startsWith("#")) t = t.slice(1);
    return { text: t.trim(), where: l.startsWith("#") ? "heading" : "line" };
  });

  /** A group's number among its own kind ("Chapter 2"), derived from the
   *  positions on the record — a chapter sits among the story's people too,
   *  so its position is not its number. */
  function ordinals(notes) {
    const fold = N.fold(notes);
    const outline = outlineOf(fold, medium);
    const groups = [...new Map(outline.leaves.map((l) => l.within.at(-1)).filter(Boolean).map((g) => [g.id, g])).values()];
    const byKind = new Map();
    for (const g of groups) byKind.set(g.kind, [...(byKind.get(g.kind) ?? []), g]);
    for (const [, gs] of byKind) {
      const pos = (g) => fold.find((n) => n.end1 === g.id && n.label === "position");
      const ranked = gs.filter(pos).sort((a, b) => Number(pos(a).end2) - Number(pos(b).end2));
      ranked.forEach((g, k) => {
        if (fold.some((n) => n.end1 === g.id && n.label === "ordinal" && n.end2 === String(k + 1))) return;
        notes = N.hear(notes, { end1: g.id, label: "ordinal", end2: String(k + 1), witness: "derived:ordinal", because: `number ${k + 1} of ${ranked.length} ${g.kind}s by position [premises: ${JSON.stringify(ranked.map((x) => pos(x).id))}]` });
      });
    }
    return notes;
  }

  function seal({ notes, store, request, regime = {}, checks = [] }) {
    notes = ordinals(notes);
    const fold = N.fold(notes);
    const { artifact, map, engineWords } = render({ notes, store });
    const cover = uncovered({ artifact, map, fold, engineWords, leaves: leavesOf });
    const helix = helixCheck({ fold, entries: notes.entries });
    const outline = outlineOf(fold, medium);
    const filled = outline.leaves.filter((l) => fold.some((n) => n.end1 === l.part.id && n.label === "body")).length;
    const verified = { ok: filled > 0 && filled + N.foldVoids(notes).filter((v) => v.label === "body").length === outline.leaves.length, checks: [`${filled} of ${outline.leaves.length} parts have words; the rest are declared voids`] };
    let sealed = null;
    try {
      sealed = sealArtifact({
        kind: "LongForm@1",
        producer: { assembly: "assembly:dickens", version: 1 },
        material: { source: `request:${request}`, hash: createHash("sha256").update(String(request)).digest("hex"), extent: fold.length, unit: "notes" },
        regime: { recipe, mouth, tail: TAIL_SENTENCES, hereCap: HERE_CAP, bodyTries: BODY_TRIES, ...regime },
        dropped: ["the mouth's raw replies and the working notes (kept in the log)"],
        body: { artifact, encoding: "text", map },
        sealedAtSequence: notes.entries.length,
        conformance: { passed: verified.ok && cover.ok && helix.ok, checks: [...verified.checks, ...checks, `provenance: ${cover.covered} lines accounted for, ${cover.uncovered.length} uncovered, ${cover.unresolved.length} unresolved`, `helix: ${helix.violations.length} out of order`] },
      });
    } catch (err) { log({ kind: "unsealed", why: String(err?.message ?? err).slice(0, 200) }); }
    return { notes, artifact, map, provenance: cover, helix, verified, sealed };
  }

  // ── REVISIONS ────────────────────────────────────────────────────────────
  let revs = 0;
  /** Conclusions follow their premises (organs/talk-reason.js, as
   *  talk-build's settle does): one whose premises left the record is
   *  withdrawn, and with the outline's spec the rules derive again. */
  function settleDerived(notes) {
    const live = new Set(N.fold(notes).map((n) => n.id));
    const becauseOf = new Map(notes.entries.filter((e) => e.because != null).map((e) => [e.task_id, e.because]));
    for (const n of N.fold(notes).filter(isDerived)) {
      if (premisesOf(becauseOf.get(n.id)).every((p) => live.has(p))) continue;
      const d = N.concede(notes, n.id, { trigger: "its premises changed" });
      if (!d.refused) notes = d.log;
    }
    if (spec) {
      const fold = N.fold(notes);
      const have = new Set(fold.map((n) => `${n.end1}|${n.label}|${n.end2}`));
      for (const d of reason({ fold, belief: outlineOf(fold, medium).belief, spec }).derive) {
        if (have.has(`${d.end1}|${d.label}|${d.end2}`)) continue;
        notes = N.hear(notes, { end1: d.end1, label: d.label, end2: d.end2, witness: `derived:${d.rule}`, because: `${d.because} [premises: ${(d.premises ?? []).join(", ")}]` });
      }
    }
    return notes;
  }

  /** The person's change on the record: the new note, the old one conceded,
   *  and every conclusion drawn from the old one withdrawn or drawn again. */
  function hearChange(notes, { end1, label, end2, said }) {
    revs++;
    const fold = N.fold(notes);
    const old = fold.find((n) => n.end1 === end1 && n.label === label) ?? null;
    const witness = `request:rev${revs}`;
    notes = N.hear(notes, { end1, label, end2, witness, because: `${said}${old ? ` [replaces: ${old.id}]` : ""}` });
    const rev = N.fold(notes).find((n) => n.end1 === end1 && n.label === label && n.witnesses.includes(witness));
    if (old && old.id !== rev?.id) { const d = N.concede(notes, old.id, { trigger: `the person changed it (${witness}): ${said}` }); if (!d.refused) notes = d.log; }
    notes = settleDerived(notes);
    return { notes, rev, old };
  }

  /** Parts resting on a note: whose body carried it (premises). */
  const restingOn = (notes, noteIdOf) => {
    const becauseOf = new Map(notes.entries.filter((e) => e.because != null).map((e) => [e.task_id, e.because]));
    return N.fold(notes).filter((n) => n.label === "body" && premisesOf(becauseOf.get(n.id)).includes(noteIdOf)).map((n) => n.end1);
  };

  const markRevised = (notes, partId, rev) => N.hear(notes, { end1: partId, label: "revised", end2: rev.id, witness: "derived:revise", because: `the part was brought in line with the person's change [premises: ${JSON.stringify([rev.id])}]` });

  /**
   * rename({ notes, store, who, to }) — a person renamed: the name note
   * replaced, every line that says the old name edited mechanically. No asks.
   */
  function rename({ notes, store, who, to }) {
    const fold = N.fold(notes);
    const person = outlineOf(fold, medium).cast.find((c) => c.name === who);
    if (!person) return { notes, store, refused: `no one on the record is called ${who}` };
    const heard = hearChange(notes, { end1: person.id, label: "named", end2: to, said: `rename ${who} to ${to}` });
    notes = heard.notes;
    const outline = outlineOf(N.fold(notes), medium);
    const touched = new Set(restingOn(notes, heard.old?.id ?? "\u0000"));
    let edits = 0;
    for (const leaf of outline.leaves) {
      const cur = currentLines(N.fold(notes), notes.entries, store, leaf.part.id);
      if (!cur) continue;
      cur.lines.forEach((l, k) => {
        if (!hasWord(l.text, who)) return;
        const address = store.put(replaceWord(l.text, who, to));
        notes = N.hear(notes, { end1: leaf.part.id, label: l.addr, end2: address, witness: "derived:rename", because: `"${who}" -> "${to}" [premises: ${JSON.stringify([l.note, heard.rev.id])}]` });
        edits++;
        touched.add(leaf.part.id);
      });
    }
    for (const id of touched) notes = markRevised(notes, id, heard.rev);
    log({ kind: "revise", change: "rename", who, to, edits, parts: touched.size, asks: 0 });
    return { notes, store, edits, parts: [...touched], asks: 0 };
  }

  /**
   * changeDetail({ notes, store, who, label, to, cycles }) — a person's
   * detail changed ("Tom's job is ferryman"): the note replaced; every line
   * of a part the person is in that says the old value is asked again, one
   * sentence, with the new fact and the lines before it as the anchor.
   */
  async function changeDetail({ notes, store, who, label, to, cycles = 2 }) {
    const person = outlineOf(N.fold(notes), medium).cast.find((c) => c.name === who);
    if (!person) return { notes, store, refused: `no one on the record is called ${who}` };
    const was = person.props.find((p) => p.label === label)?.value ?? null;
    const heard = hearChange(notes, { end1: person.id, label, end2: to, said: `${who}'s ${label} is ${to}` });
    notes = heard.notes;
    let asks = 0, edits = 0;
    const touched = new Set(restingOn(notes, heard.old?.id ?? "\u0000"));
    const left = [];
    // a part is brought in line only once its words have been read against
    // the change in a cycle that finished; with no cycle run, nothing is
    const checked = new Set();
    for (let cycle = 0; cycle < cycles && was; cycle++) {
      left.length = 0;
      checked.clear();
      const outline = outlineOf(N.fold(notes), medium);
      for (const leaf of outline.leaves) {
        const cur = currentLines(N.fold(notes), notes.entries, store, leaf.part.id);
        if (cur) checked.add(leaf.part.id);
        if (!cur || !cur.lines.some((l) => hasWord(l.text, who))) continue;
        for (let k = 0; k < cur.lines.length; k++) {
          const l = cur.lines[k];
          if (!hasWord(l.text.toLowerCase(), String(was).toLowerCase())) continue;   // "Actress" on the record is "actress" in a sentence
          asks++;
          const before = cur.lines.slice(Math.max(0, k - TAIL_SENTENCES), k).map((x) => x.text).join(" ");
          const facts = [`${who}'s ${label} is ${to}.`];
          const prompt = `${facts.join("\n")}\n\nContinue the ${medium.storyWord ?? "story"} with one sentence.\n\n${before}`;
          const got = await say(prompt, { stage: `revise:${leaf.part.id}:${k + 1}`, attempt: cycle, numPredict: medium.lineTokens ?? 60 });
          let reply = got.text.trim();
          while (before && reply.startsWith(before)) reply = reply.slice(before.length).trim();
          const said = sentences(reply.split("\n").join(" "))[0]?.text ?? "";
          log({ kind: "revise_turn", part: leaf.part.id, line: k + 1, prompt, reply: got.text, took: said, promptTokens: got.promptTokens });
          if (!said || hasWord(said.toLowerCase(), String(was).toLowerCase())) { left.push({ part: leaf.part.id, line: k + 1 }); continue; }
          const address = store.put(said);
          notes = N.hear(notes, { end1: leaf.part.id, label: l.addr, end2: address, witness: `talk:${mouth}#rev${revs}.${asks}`, because: `said again with "${facts[0]}" [premises: ${JSON.stringify([l.note, heard.rev.id])}]` });
          edits++;
          touched.add(leaf.part.id);
        }
      }
      if (!left.length) break;
    }
    const unresolved = new Set(left.map((x) => x.part));
    for (const id of touched) if (checked.has(id) && !unresolved.has(id)) notes = markRevised(notes, id, heard.rev);
    log({ kind: "revise", change: "detail", who, label, was, to, edits, asks, parts: touched.size, left: left.length });
    return { notes, store, edits, asks, parts: [...touched], left };
  }

  /** Parts whose words rest on a note the record no longer holds, and that no
   *  revision has answered. */
  function stale(notes) {
    const fold = N.fold(notes), live = new Set(fold.map((n) => n.id));
    const becauseOf = new Map(notes.entries.filter((e) => e.because != null).map((e) => [e.task_id, String(e.because)]));
    const replaces = new Map();
    for (const n of fold) { const b = becauseOf.get(n.id) ?? ""; const at = b.indexOf("[replaces: "); if (at >= 0) replaces.set(b.slice(at + "[replaces: ".length, b.indexOf("]", at)), n.id); }
    const out = [];
    for (const body of fold.filter((n) => n.label === "body")) {
      for (const p of premisesOf(becauseOf.get(body.id))) {
        if (live.has(p)) continue;
        const rev = replaces.get(p);
        if (rev && fold.some((n) => n.end1 === body.end1 && n.label === "revised" && n.end2 === rev)) continue;
        out.push({ part: body.end1, premise: p });
      }
    }
    return out;
  }

  return { writeBodies, render, leavesOf, seal, rename, changeDetail, stale, workingNote, roleOf, hearChange, settleDerived, currentLines: (notes, store, id) => currentLines(N.fold(notes), notes.entries, store, id), N };
}

// ── THE PERSON'S CHANGE, READ ──────────────────────────────────────────────
// A change is said in plain words, in the conversation, and read here against
// the cast on the record — no model: "Rename Lily to Wren", "call Lily Wren",
// "Tommy's job is ferry pilot", "Tommy is a ferry pilot now", "Lola is 49".
// A value that is a number goes to the one numeric detail; "a/an …" to the
// one other detail; anything this cannot place is refused, never guessed.
const TAIL_WORDS = new Set(["now", "instead", "then", "please"]);
const trimEnd = (w) => { let x = w; while (x && [".", "!", ",", ";"].includes(x.at(-1))) x = x.slice(0, -1); return x; };
export function readChange(text, { cast, details = [], numericDetails = new Set() }) {
  const words = String(text ?? "").trim().split(" ").filter(Boolean).map(trimEnd).filter(Boolean);
  while (words.length && TAIL_WORDS.has(words.at(-1).toLowerCase())) words.pop();
  const low = words.map((w) => w.toLowerCase());
  // the person a sentence names at word k: the longest cast name standing
  // there, however many words it has ("Lighthouse Keeper's Daughter")
  const named = (k) => {
    let best = null;
    for (const c of cast) {
      const n = String(c.name).toLowerCase().split(" ");
      const here = low.slice(k, k + n.length);
      const last = here.at(-1) ?? "";
      const bare = last.endsWith("'s") || last.endsWith("’s") ? last.slice(0, -2) : last;
      const same = here.length === n.length && here.slice(0, -1).every((w, i) => w === n[i]) && (last === n.at(-1) || bare === n.at(-1));
      if (same && (!best || n.length > best.len)) best = { c, len: n.length, possessive: last !== n.at(-1) };
    }
    return best;
  };
  // rename X to Y / call X Y
  if ((low[0] === "rename" || low[0] === "call") && words.length >= 3) {
    const who = named(1);
    if (who) {
      const rest = low[0] === "rename" ? (low[1 + who.len] === "to" ? words.slice(2 + who.len) : null) : words.slice(1 + who.len);
      if (rest?.length) return { kind: "rename", who: who.c.name, to: rest.join(" ") };
    }
  }
  const who = named(0);
  if (!who) return { refused: `no one on the record is named in "${text}"` };
  const k = who.len;
  // X's <label> is V
  if (who.possessive) {
    const is = low.indexOf("is", k);
    const label = low.slice(k, is).join(" ");
    if (is > k && details.includes(label) && words.length > is + 1) return { kind: "detail", who: who.c.name, label, to: words.slice(is + 1).join(" ") };
    return { refused: `no detail "${label}" on the record` };
  }
  // X is N / X is a V
  if (low[k] === "is" && words.length > k + 1) {
    const v = words.slice(k + 1);
    const numeric = details.filter((d) => numericDetails.has(d));
    const other = details.filter((d) => !numericDetails.has(d));
    const isNum = v.length === 1 && [...v[0]].every((ch) => ch >= "0" && ch <= "9");
    if (isNum && numeric.length === 1) return { kind: "detail", who: who.c.name, label: numeric[0], to: v[0] };
    if (!isNum && ["a", "an", "the"].includes(v[0].toLowerCase()) && other.length === 1) return { kind: "detail", who: who.c.name, label: other[0], to: v.slice(1).join(" ") };
  }
  return { refused: `could not place "${text}" as a change to the record` };
}
