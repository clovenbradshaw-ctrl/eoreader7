// Handle: Perkins — Maxwell Perkins, the editor who took manuscripts too long
// for any one sitting (Wolfe's came in crates) and worked them part by part,
// cutting what did no work and asking only for what was missing, always
// against the book's own intent.
//
// book-editor.js — the EVALUATION and REVISION of a long work, in that order
// (the helix: EVA before REC). The pathos archons (the-fold/archon-rules.js,
// the revision grid in the-fold/revision-spiral.js) read the book against its
// ground and draft, and each finding licenses at most one kind of revision:
//
//   fold     a line that does no work (Clark's restatement, Caro's unverified,
//            Houdini's apparatus leak): its address is emptied
//   floor    a statement the part should carry and does not (Kidder & Todd):
//            the statement's own words are set into the part
//   repair   a splice with the repair the archon supplies (Clark)
//   bridge   a part that takes nothing up from the last (Clark): one sentence
//            asked of the mouth, the last part's close and this part's opening
//            its only context
//   rewrite  a sentence with tics (Zinsser): asked again plainly, one sentence
//   report   cadence (Lish/Klinkenborg): never revised
//
// WHAT THE BOOK IS READ AGAINST is decided by its universe (organs/universe.js):
// in a stipulated universe the ground is the telling's own record — its lines,
// its people, their details — and the draft's statements are the lines each
// part was written to carry. The engine reads the whole book (only the mouth's
// asks are bounded); each candidate revision is judged by reading again only
// its own part and the parts on either side: kept when the licensed findings
// there fall and nothing the parts carried is lost, else undone (Hora: one
// candidate at a time, never a whole pass on one verdict).
//
// Every finding is on the ledger (witness archon:<editor>, EVA·Figure) and
// every kept revision is a claim at the line's address (REC·Figure) whose
// premises are the line it changed and the finding that licensed it.
// No regular expressions.
import { createHash } from "node:crypto";
import { makeNotes, noteId } from "../kernel/notes.js";
import { buildDraft, drawnParts, draftWords } from "../the-fold/eot-draft.js";
import { isFunctionWord } from "../the-fold/pos-prior.js";
import { clauseComplete } from "../the-fold/eot-notation.js";
import { anchorsFor, carries } from "../the-fold/prosify.js";
import { readPiece } from "../the-fold/revision-spiral.js";
import { houdiniExclusivity } from "../the-fold/archon-rules.js";
import { outlineOf, MIN_BODY_SENTENCES } from "./long-form.js";

export const BOOK_EDITOR_SCHEMA = "BookEditor@1";
/** Revision passes over the book — set by hand 2026-09-27 (the-fold's pathos
 *  loop stops in two or three passes on its live runs). */
export const EDIT_PASSES = 2;
/** A candidate is judged on its part and this many parts either side — set by
 *  hand 2026-09-27: a transition needs the part before; a restatement is
 *  local enough to be seen next door. */
export const JUDGE_REACH = 1;
const sha8 = (t) => createHash("sha256").update(String(t)).digest("hex").slice(0, 8);
const sentence = (v) => { const s = String(v).trim(); return [".", "!", "?"].includes(s.at(-1)) ? s : `${s}.`; };
const ORDER = ["fold", "repair", "floor", "bridge", "rewrite"];
/** What a finding licenses, by the universe the book is in (organs/universe.js).
 *  A finding kind not named keeps its archon's own license. Set by hand
 *  2026-09-27 from slice 2: in a stipulated universe the telling is the
 *  source, so a sentence the thin record does not mention is not unverified —
 *  folding every such line cut the story from 3,561 words to 1,275. It is
 *  reported; repetition, apparatus, a part's own missing line and a
 *  contradiction of the record still license their revisions. */
export const LICENSES_BY_UNIVERSE = Object.freeze({
  stipulated: Object.freeze({ unverified: null }),
});
// a line set on its own starts as a sentence does ("her mother scolds…" cut from a splice)
const wordIn = (text, word) => { const t = String(text), w = String(word); let i = t.indexOf(w); const isW = (ch) => !!ch && ch.toLowerCase() !== ch.toUpperCase(); while (i >= 0) { if (!isW(t[i - 1]) && !isW(t[i + w.length])) return true; i = t.indexOf(w, i + 1); } return false; };
// A LINE SET IN IS A WHOLE SENTENCE (slice 2: splice repairs kept on the
// finding count alone left "Of her comfort zone." and "…her work and."):
// it ends as a sentence ends, not on a word that leads somewhere, does not
// open on a word that hangs from another clause, and — with the parser — has
// a subject for its root. Set by hand 2026-09-27.
const DANGLING_END = new Set(["and", "or", "but", "the", "a", "an", "of", "to", "with", "that", "which", "as"]);
const HANGING_START = new Set(["that", "of", "which", "and", "or", "but", "because", "while", "to"]);
export function wholeSentence(text, parser = null) {
  const t = String(text ?? "").trim();
  if (!t || ![".", "!", "?", "\"", "”"].includes(t.at(-1))) return false;
  const words = t.split(" ").filter(Boolean);
  let last = words.at(-1).toLowerCase(); while (last && !(last.at(-1).toLowerCase() !== last.at(-1).toUpperCase())) last = last.slice(0, -1);
  if (DANGLING_END.has(last) || HANGING_START.has(words[0].toLowerCase())) return false;
  return parser ? clauseComplete(parser, t) !== false : true;
}
const capitalised = (t) => { const s = String(t).trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };

/**
 * makeBookEditor({ lf, ask, parse, medium, mouth, log })
 *   lf     the long-form instance (organs/long-form.js) that wrote the book
 *   parse  the EOT parser's parse (the-fold/eot-notation.js loadEotParser), or null
 */
export function makeBookEditor({ lf, ask, parse = null, parser = null, medium, mouth = "mouth", log = () => {}, castDetails = [], universe = null }) {
  parse ??= parser?.ok ? parser.parse : null;
  const N = makeNotes();
  const say = async (prompt, opts) => { const r = await ask(prompt, opts); return typeof r === "string" ? r : String(r?.response ?? ""); };

  /** The ground and the draft a stipulated universe's book is read against. */
  function groundAndDraft(notes, task) {
    const outline = outlineOf(N.fold(notes), medium);
    const said = (t) => t.props.find((p) => p.label === "says")?.value ?? null;
    // statements: what each part was written to carry — its own line, and its
    // chapter's line in the chapter's first part
    const blocks = outline.leaves.map((leaf, i) => {
      const group = leaf.within.at(-1);
      const first = i === 0 || outline.leaves[i - 1].within.at(-1) !== group;
      return [...(first ? leaf.within : []), leaf.part].map(said).filter(Boolean).map(sentence).join(" ") || "(nothing said)";
    });
    const built = buildDraft({ task, ground: blocks.join("\n\n"), sourceId: "record" });
    // every part of a book is drawn: the draft's "relevant to the ask" is for
    // material the ask chooses among, and a book's parts are all the ask
    const draft = { ...built, root: { ...built.root, children: built.root.children.map((p) => ({ ...p, relevant: true })) } };
    // the ground: every line on the record and every person's details — the
    // words the telling stands on
    const nameOf = new Map(outline.cast.map((c) => [c.id, c.name]));
    const facts = outline.cast.flatMap((c) => [c.name, ...castDetails.map((d) => c.props.find((p) => p.label === d)).filter(Boolean).map((p) => `${c.name}'s ${p.label} is ${p.value}.`), ...c.props.filter((p) => p.label.endsWith(" of") && nameOf.has(p.value)).map((p) => `${c.name} is ${nameOf.get(p.value)}'s ${p.label.slice(0, -3)}.`)]);
    const ground = [blocks.join("\n\n"), facts.join(" ")].join("\n\n");
    return { outline, draft, ground, parts: drawnParts(draft) };
  }

  /** The book as the archons read it: a part per leaf, a piece per line, each
   *  line carrying the statements of its part it carries. */
  function pieceOf(notes, store, gd, only = null) {
    const anchors = anchorsFor(gd.draft);
    return gd.outline.leaves.map((leaf, i) => {
      if (only && !only.has(i)) return null;
      const part = gd.parts[i];
      const cur = lf.currentLines(notes, store, leaf.part.id);
      const pts = part?.children ?? [];
      return { id: part?.id ?? `p${i}`, leaf: leaf.part.id, index: i, pieces: (cur?.lines ?? []).map((l) => ({ text: l.text, addr: l.addr, note: l.note, carries: pts.filter((pt) => anchors.get(pt.id) && carries(anchors.get(pt.id), [l.text]).ok).map((pt) => pt.id) })) };
    }).filter(Boolean);
  }

  function readWith(piece, gd, task, draft = gd.draft) {
    const ctx = { piece, draft, ground: gd.ground, task, parse };
    const r = readPiece(ctx);
    return [...r.findings, ...houdiniExclusivity("", ctx).map((f) => ({ ...f, editor: "Harry Houdini" })), ...innerConsistency(piece, gd)];
  }

  // TOLKIEN (outside the grid, like Houdini and Gebser) — the inner
  // consistency of a told world: a line that names exactly one person and
  // states a number of years for them that the record contradicts ("Lily, a
  // 25-year-old …" when the record says 19) is repaired from the record, the
  // number replaced and every other byte kept. Only the numeric detail is
  // taught: which words are a person's job is not something this can read.
  function innerConsistency(piece, gd) {
    const ageLabel = castDetails.find((d) => medium.numericDetails?.has(d));
    if (!ageLabel) return [];
    const people = gd.outline.cast.map((c) => ({ name: c.name, age: c.props.find((p) => p.label === ageLabel)?.value ?? null })).filter((c) => c.age != null);
    const out = [];
    for (const p of piece) for (const pc of p.pieces) {
      const named = people.filter((c) => wordIn(pc.text, c.name));
      if (named.length !== 1) continue;
      const words = pc.text.split(" ");
      for (let i = 0; i + 1 < words.length; i++) {
        const w = words[i], digits = [...w.split("-")[0]].filter((ch) => ch >= "0" && ch <= "9").join("");
        const yearish = w.toLowerCase().includes("-year") || words[i + 1].toLowerCase().startsWith("year");
        if (!digits || !yearish || digits === String(named[0].age)) continue;
        const repair = [...words.slice(0, i), w.split(digits).join(String(named[0].age)), ...words.slice(i + 1)].join(" ");
        out.push({ kind: "contradicts_record", editor: "J. R. R. Tolkien", part: p.id, sentence: pc.text, repair, detail: `says ${named[0].name} is ${digits}; the record says ${named[0].age}`, licenses: "repair" });
        break;
      }
    }
    return out;
  }

  /** The window around part i: its piece and a draft of only those parts. */
  function windowRead(notes, store, gd, task, i) {
    const keep = new Set(); for (let k = i - JUDGE_REACH; k <= i + JUDGE_REACH; k++) if (k >= 0 && k < gd.parts.length) keep.add(k);
    const ids = new Set([...keep].map((k) => gd.parts[k]?.id));
    const draft = { ...gd.draft, root: { ...gd.draft.root, children: gd.draft.root.children.filter((p) => ids.has(p.id)) } };
    const piece = pieceOf(notes, store, { ...gd, draft }, keep);
    const f = toldRestatement(readWith(piece, { ...gd, draft }, task, draft).map((x) => licensed(x, universeOf(notes))), piece, universeOf(notes)).filter((x) => x.part == null || ids.has(x.part));
    return { licensed: f.filter((x) => x.licenses && x.licenses !== "report").length, dropped: f.filter((x) => x.kind === "statement_dropped").length };
  }

  /** EVA: every finding over the whole book, located at its part and line. */
  // the universe the book is in: the one given, else the one its ledger was born in
  const universeOf = (notes) => universe ?? N.frameOf(notes)?.declared?.universe ?? null;
  const licensed = (f, kind) => { const table = LICENSES_BY_UNIVERSE[kind] ?? {}; return f.kind in table ? { ...f, licenses: table[f.kind], licenseBy: `universe:${kind}` } : f; };

  // IN A TOLD WORLD A RESTATEMENT SAYS NOTHING NEW AT ALL. Clark's rule reads
  // a line against the ground's words, and a stipulated universe's ground is
  // its thin record: a line whose only record words ("Lily", "lighthouse")
  // were said before read as a restatement however much else it said — 96
  // folds on slice 2. There, a restatement licenses its fold only when its
  // own content words were all said earlier in the book; otherwise reported.
  function toldRestatement(findings, piece, kind) {
    if (kind !== "stipulated") return findings;
    const saidBefore = new Map(); const said = new Set();
    for (const p of piece) for (const pc of p.pieces) { saidBefore.set(`${p.id}|${pc.text}`, new Set(said)); for (const w of draftWords(pc.text)) said.add(w); }
    return findings.map((f) => {
      if (f.kind !== "restatement" || !f.licenses) return f;
      const before = saidBefore.get(`${f.part}|${f.sentence}`) ?? new Set();
      const fresh = [...new Set(draftWords(f.sentence))].filter((w) => !isFunctionWord(w) && !before.has(w));
      return fresh.length ? { ...f, licenses: null, licenseBy: "universe:stipulated", detail: `${f.detail} — but it says ${fresh.slice(0, 4).join(", ")} for the first time` } : f;
    });
  }

  function readBook({ notes, store, task }) {
    const gd = groundAndDraft(notes, task);
    const piece = pieceOf(notes, store, gd);
    const byId = new Map(piece.map((p) => [p.id, p]));
    const kind = universeOf(notes);
    const findings = toldRestatement(readWith(piece, gd, task).map((f) => licensed(f, kind)), piece, kind).map((f) => {
      const p = byId.get(f.part);
      const line = p && f.sentence ? p.pieces.find((pc) => pc.text === f.sentence) ?? null : null;
      return { ...f, leaf: p?.leaf ?? null, index: p?.index ?? null, addr: line?.addr ?? null, lineNote: line?.note ?? null };
    });
    const lines = piece.flatMap((p) => p.pieces);
    return { gd, piece, findings, lines: lines.length, carrying: lines.filter((l) => l.carries.length).length };
  }

  /** A finding on the record: EVA·Figure, the editor its witness. */
  function hearFinding(notes, f) {
    const end2 = `${f.kind}${f.addr ? ` @ ${f.addr}` : ""} ${sha8(f.sentence ?? f.detail ?? "")}`;
    notes = N.hear(notes, { end1: f.leaf, label: "finding", end2, witness: `archon:${String(f.editor ?? "unknown").split(" ").join("-")}`, because: String(f.detail ?? "").slice(0, 300) });
    return { notes, id: noteId(f.leaf, "finding", end2) };
  }

  /** One candidate: the edit claims it would add, before they are heard. */
  async function candidate(notes, store, gd, f, asksLeft) {
    const cur = lf.currentLines(notes, store, f.leaf);
    if (!cur) return null;
    // a fold never takes a part below a part's worth of sentences (long-form's own set-down)
    if (f.licenses === "fold" && f.addr) return cur.lines.length <= MIN_BODY_SENTENCES ? null : { edits: [{ label: f.addr, text: "", witness: "derived:fold", premise: f.lineNote }], asks: 0 };
    if (f.licenses === "repair" && f.addr && f.repair) return { edits: [{ label: f.addr, text: capitalised(String(f.repair)), witness: "derived:repair", premise: f.lineNote }], asks: 0 };
    if (f.licenses === "floor" && f.source) {
      const leaf = gd.outline.leaves[f.index];
      const src = leaf ? [...leaf.within, leaf.part].map((t) => t.props.find((p) => p.label === "says")).filter(Boolean).find((p) => sentence(p.value) === f.source || f.source.includes(sentence(p.value))) : null;
      return { edits: [{ label: `after 0.${cur.nextAfter(0)}`, text: f.source, witness: "derived:floor", premise: src?.note ?? null }], asks: 0 };
    }
    if (asksLeft <= 0) return null;
    if (f.licenses === "bridge" && f.index > 0) {
      const prev = lf.currentLines(notes, store, gd.outline.leaves[f.index - 1].part.id);
      const close = prev?.lines.at(-1)?.text, open = cur.lines[0]?.text;
      if (!close || !open) return null;
      const reply = await say(`The last part ends: "${close}"\n\nThe next part begins: "${open}"\n\nWrite one sentence that carries the reader from the first into the second.`, { stage: `bridge:${f.leaf}`, numPredict: 90 });
      const s = reply.split("\n").map((x) => x.trim()).find((x) => x.length > 12) ?? "";
      const first = s.split(". ")[0];
      return first ? { edits: [{ label: `after 0.${cur.nextAfter(0)}`, text: sentence(first.split("\"").join("")), witness: `talk:${mouth}#bridge`, premise: prev.lines.at(-1).note }], asks: 1, reply } : { edits: [], asks: 1 };
    }
    if (f.licenses === "rewrite" && f.addr && f.sentence) {
      const reply = await say(`Rewrite this sentence plainly, keeping every fact in it:\n"${f.sentence}"\n\nWrite the rewritten sentence now.`, { stage: `rewrite:${f.leaf}`, numPredict: 90 });
      const s = reply.split("\n").map((x) => x.trim().split("\"").join("")).find((x) => x.length > 8) ?? "";
      const bad = !s || s.length >= f.sentence.length || (f.words ?? []).some((w) => s.toLowerCase().includes(String(w).toLowerCase()));
      return bad ? { edits: [], asks: 1, refused: "not plainer: longer, or the same words" } : { edits: [{ label: f.addr, text: s, witness: `talk:${mouth}#rewrite`, premise: f.lineNote }], asks: 1 };
    }
    return null;
  }

  /**
   * editBook({ notes, store, task, budget, passes }) -> { notes, store, asks, passes: [...] }
   * Reads, hears the findings, tries each licensed revision alone, keeps it
   * only when its window reads better; then reads again, up to `passes`.
   */
  async function editBook({ notes, store, task, budget = Infinity, passes = EDIT_PASSES }) {
    let asks = 0;
    const report = [];
    for (let pass = 0; pass < passes; pass++) {
      const read = readBook({ notes, store, task });
      const tally = {};
      for (const f of read.findings) { const k = `${f.editor ?? "?"}: ${f.kind}`; tally[k] = (tally[k] ?? 0) + 1; }
      const actionable = read.findings.filter((f) => ORDER.includes(f.licenses) && f.leaf).sort((a, b) => ORDER.indexOf(a.licenses) - ORDER.indexOf(b.licenses));
      const row = { pass: pass + 1, findings: read.findings.length, licensed: actionable.length, lines: read.lines, carrying: read.carrying, tally, kept: {}, undone: {}, refused: 0, asks: 0 };
      const touched = new Set();
      for (const f of actionable) {
        // one revision per line per pass: a line already changed is read again next pass
        const key = `${f.leaf}|${f.addr ?? f.licenses}`;
        if (touched.has(key)) continue;
        const before = windowRead(notes, store, read.gd, task, f.index);
        const c = await candidate(notes, store, read.gd, f, budget - asks);
        if (!c) continue;
        asks += c.asks; row.asks += c.asks;
        if (!c.edits.length) { row.refused++; log({ kind: "edit_refused", finding: f.kind, part: f.leaf, why: c.refused ?? "nothing usable said", reply: c.reply }); continue; }
        const broken = c.edits.find((e) => e.text && !wholeSentence(e.text, parser));
        if (broken) { row.refused++; log({ kind: "edit_refused", finding: f.kind, part: f.leaf, why: "not a whole sentence", text: broken.text }); continue; }
        const heard = hearFinding(notes, f);
        let trial = heard.notes;
        for (const e of c.edits) {
          const address = store.put(e.text);
          trial = N.hear(trial, { end1: f.leaf, label: e.label, end2: address, witness: e.witness, because: `${f.editor}: ${f.kind} [premises: ${JSON.stringify([e.premise, heard.id].filter(Boolean))}]` });
        }
        const after = windowRead(trial, store, read.gd, task, f.index);
        const keep = after.licensed < before.licensed && after.dropped <= before.dropped;
        log({ kind: keep ? "edit_kept" : "edit_undone", finding: f.kind, editor: f.editor, part: f.leaf, addr: f.addr, license: f.licenses, text: c.edits.map((e) => e.text), before, after });
        if (keep) { notes = trial; touched.add(key); row.kept[f.licenses] = (row.kept[f.licenses] ?? 0) + 1; }
        else { notes = heard.notes; row.undone[f.licenses] = (row.undone[f.licenses] ?? 0) + 1; }
      }
      report.push(row);
      log({ kind: "edit_pass", ...row });
      if (!Object.keys(row.kept).length) break;
    }
    const last = readBook({ notes, store, task });
    return { notes, store, asks, passes: report, final: { findings: last.findings.length, licensed: last.findings.filter((f) => ORDER.includes(f.licenses)).length, lines: last.lines, carrying: last.carrying } };
  }

  return { readBook, editBook, groundAndDraft };
}
