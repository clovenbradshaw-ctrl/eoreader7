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
import { clauseComplete, clauseCore } from "../the-fold/eot-notation.js";
import { lishCut, takesUp } from "../the-fold/finish.js";
import { isMetaSentence } from "../the-fold/referent-verify.js";
import { pacingGrade } from "./pacing.js";
import { sentences } from "../adapters/text/english-parser.js";
import { detectRedundancy } from "../the-fold/document-ledger.js";
import { styleFindings } from "./strunk-white.js";
import { sameOpening } from "./variation.js";
import { createHolograph, admit as admitBelief } from "../kernel/bayes-surprise.js";
import { quantile } from "../kernel/surprise-segments.js";
import { lcg, predictNext } from "../kernel/continuation.js";
import { classifyFortuneShape } from "../kernel/fortune-prior.js";
import { anchorsFor, carries } from "../the-fold/prosify.js";
import { readPiece } from "../the-fold/revision-spiral.js";
import { houdiniExclusivity } from "../the-fold/archon-rules.js";
import { arcFrame, arcChecks, trajectory, whereIs, says as saysPhrase } from "./narrative-arc.js";
import { outlineOf, MIN_BODY_SENTENCES, TAIL_SENTENCES, linesOfBody, bodyOfReply } from "./long-form.js";

export const BOOK_EDITOR_SCHEMA = "BookEditor@1";
/** Gornick's null — set by hand 2026-09-27: the order-2 reader of
 *  kernel/surprise-segments.js, 20 shuffled orders of the parts, the 5% tail. */
export const GORNICK = Object.freeze({ order: 2, draws: 20, alpha: 0.05, seed: 7 });
const wordsOf = (text) => String(text).toLowerCase().split(" ").map((w) => [...w].filter((ch) => ch.toLowerCase() !== ch.toUpperCase() || ch === "'").join("")).filter(Boolean);

/**
 * GORNICK (macro.pathos) — TAUGHT here, model-free: the surprise curve of a
 * long work. Each part's words are read against the ground of everything
 * before it (kernel/continuation.js's reader, order 2): its figure is its
 * mean bits per word. Every part of real prose reads below its own words
 * shuffled (grammar makes order predictable), so FLAT is relative: the parts
 * whose margin below their own shuffles sits in the book's own upper alpha
 * tail — the phrasing most already said. It names a few parts in any book;
 * the absolute measure is the book's mean bits per word (the long-form
 * checker reports it for every arm). The whole curve's shape is named by
 * kernel/fortune-prior.js. Reported, never revised: no organ writes the fix.
 */
export function gornickCurve(parts, { order = GORNICK.order, draws = GORNICK.draws, alpha = GORNICK.alpha, seed = GORNICK.seed } = {}) {
  const ws = parts.map((p) => wordsOf(p.text));
  const alphabet = new Map(), tables = new Map();
  for (let k = 1; k <= order; k++) tables.set(k, new Map());
  const prior = { order, alphabet, tables };
  const bitsOf = (words) => {
    if (!words.length) return 0;
    const floor = 1 / (alphabet.size + 1);
    let sum = 0;
    for (let i = 0; i < words.length; i++) {
      const p = alphabet.size ? predictNext(prior, words.slice(Math.max(0, i - order), i)).dist.get(words[i]) ?? 0 : 0;
      sum += -Math.log2(Math.max(p, floor));
    }
    return sum / words.length;
  };
  const sediment = (words) => {
    for (let i = 0; i < words.length; i++) {
      alphabet.set(words[i], (alphabet.get(words[i]) ?? 0) + 1);
      for (let k = 1; k <= order && i - k >= 0; k++) { const ctx = words.slice(i - k, i).join(" "), t = tables.get(k); if (!t.has(ctx)) t.set(ctx, new Map()); const m = t.get(ctx); m.set(words[i], (m.get(words[i]) ?? 0) + 1); }
    }
  };
  const rng = lcg(seed);
  const means = [], gaps = [];
  for (let i = 0; i < ws.length; i++) {
    const actual = bitsOf(ws[i]);
    const nul = [];
    for (let d = 0; d < draws; d++) { const w = [...ws[i]]; for (let a = w.length - 1; a > 0; a--) { const b = Math.floor(rng() * (a + 1)); [w[a], w[b]] = [w[b], w[a]]; } nul.push(bitsOf(w)); }
    nul.sort((a, b) => a - b);
    means.push(actual);
    gaps.push(i > 0 && ws[i].length ? quantile(nul, alpha) - actual : null);   // how far below its own shuffles the part reads
    sediment(ws[i]);
  }
  // flat: a gap beyond the book's own spread of gaps (its upper alpha tail)
  const g = gaps.filter((x) => x != null).sort((a, b) => a - b);
  const cut = g.length >= 3 ? quantile(g, 1 - alpha) : Infinity;
  const flat = gaps.map((x, i) => (x != null && x > 0 && x >= cut ? i : -1)).filter((i) => i >= 0);
  const mean = means.reduce((a, b) => a + b, 0) / Math.max(1, means.length);
  return { means, gaps, flat, shape: classifyFortuneShape(means.map((m) => m - Math.min(...means))), meanBits: mean };
}

/** Candidate bodies the mouth proposes for a flat part — set by hand
 *  2026-09-27 (three: enough for the archons to choose among, at three asks
 *  a part). */
export const PATHOS_CANDIDATES = 3;

/** Bridge sentences asked for one missing transition — set by hand
 *  2026-09-28 (the-fold's own turnPass asks once; three samples, each held to
 *  its refusal reasons, before the judge). */
export const BRIDGE_TRIES = 3;

/** Revision passes over the book — set by hand 2026-09-27 (the-fold's pathos
 *  loop stops in two or three passes on its live runs). */
export const EDIT_PASSES = 2;
/** A candidate is judged on its part and this many parts either side — set by
 *  hand 2026-09-27: a transition needs the part before; a restatement is
 *  local enough to be seen next door. */
export const JUDGE_REACH = 1;
/** The share of a role fact's content words a line must carry to be the fact
 *  read aloud — set by hand 2026-09-28 (arc1's homecoming line carried all). */
export const ROLE_READ_ALOUD = 0.8;
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
    // the being the telling follows: where they start, what is missing, what they become
    const frame = arcFrame(outline.cast);
    if (frame.p) facts.push(...[frame.home && `${frame.p}'s home is ${frame.home}.`, frame.lack && `${frame.p} is missing ${frame.lack}.`, frame.becomes && `${frame.p} becomes ${frame.becomes}.`].filter(Boolean));
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
    return [...r.findings, ...houdiniExclusivity("", ctx).map((f) => ({ ...f, editor: "Harry Houdini" })), ...innerConsistency(piece, gd), ...sacks(piece), ...strunkWhite(piece), ...staleOpenings(piece, gd)];
  }

  // SACKS (the-fold/document-ledger.js detectRedundancy) — a sentence
  // construction that opens sentences in several parts ("She is able to use
  // her strengths…"), and a fact stated again in a later part. The template
  // licenses a rewrite (Lish cuts first); the restated fact, the fold of the
  // later sentence. Openings shared beyond chance are the gate's, not here.
  const bare = (w) => [...w.toLowerCase()].filter((ch) => (ch >= "a" && ch <= "z") || ch === "'").join("");
  const quoted = (detail) => { const a = String(detail).indexOf("\""), b = String(detail).indexOf("\"", a + 1); return a >= 0 && b > a ? String(detail).slice(a + 1, b) : null; };
  function sacks(piece) {
    if (piece.length < 2) return [];
    const out = [];
    for (const f of detectRedundancy(piece.map((p) => p.pieces.map((pc) => pc.text).join(" ")), { shuffles: 50 })) {
      const key = quoted(f.detail);
      if (!key || f.kind === "repetition") continue;
      for (const k of f.sections.slice(1)) {
        const p = piece[k];
        const hit = p?.pieces.find((pc) => (f.kind === "repeated-template" ? pc.text.split(" ").slice(0, 6).map(bare).join(" ") === key : key.split(" ").every((w) => pc.text.toLowerCase().includes(w))));
        if (hit) out.push({ kind: f.kind === "repeated-template" ? "repeated_template" : "repeated_fact", editor: "Oliver Sacks", part: p.id, sentence: hit.text, words: f.kind === "repeated-template" ? key.split(" ") : [], detail: f.detail, licenses: f.kind === "repeated-template" ? "rewrite" : "fold" });
      }
    }
    return out;
  }

  // STRUNK & WHITE (organs/strunk-white.js) — the sharp rules only: the
  // weak adverb, the cliché, the needless word, the nominalization, the
  // weasel word. Each licenses a rewrite of its sentence, Lish cutting first.
  // (weak_verb and passive are left out: they match "this"/"his" and most
  // narration — census 2026-09-27.)
  const SHARP = new Set(["weak_adverb", "cliche", "needless_word", "nominalization", "weasel_word"]);
  function strunkWhite(piece) {
    const out = [];
    for (const p of piece) for (const pc of p.pieces) for (const k of styleFindings(pc.text)) {
      if (!SHARP.has(k.kind ?? k.id)) continue;
      out.push({ kind: `style_${k.kind ?? k.id}`, editor: "William Strunk Jr. & E. B. White", part: p.id, sentence: pc.text, words: (k.matches ?? []).map((m) => m.word), detail: k.rule ?? k.kind ?? k.id, licenses: "rewrite" });
    }
    return out;
  }

  // SOCKEYE (how an identity comes home) — a part that opens on "She"/"He"
  // when the part before names no one in its last lines: the reader has no
  // one to bind it to. With exactly one person in the part's own lines, the
  // pronoun is repaired to the name, every other byte kept, no ask.
  const OPENING_PRONOUNS = new Map([["she", ""], ["he", ""], ["her", "'s"], ["his", "'s"]]);
  function staleOpenings(piece, gd) {
    const out = [];
    const said = (t) => t.props.find((q) => q.label === "says")?.value ?? "";
    for (let i = 1; i < piece.length; i++) {
      const first = piece[i].pieces[0]?.text ?? "";
      const w0 = first.split(" ")[0] ?? "";
      const pro = OPENING_PRONOUNS.get(bare(w0));
      if (pro == null) continue;
      const before = piece[i - 1].pieces.slice(-2).map((pc) => pc.text).join(" ");
      if (gd.outline.cast.some((c) => wordIn(before, c.name))) continue;
      const leaf = gd.outline.leaves[piece[i].index ?? i];
      const here = gd.outline.cast.filter((c) => leaf && [...leaf.within, leaf.part].some((t) => wordIn(said(t), c.name)));
      if (here.length !== 1) continue;
      const repair = `${here[0].name}${pro}${first.slice(w0.length)}`;
      out.push({ kind: "stale_pronoun", editor: "Sockeye", part: piece[i].id, sentence: first, repair, detail: `opens on "${w0}" and the part before names no one in its last lines; ${here[0].name} is the one person this part is about`, licenses: "repair" });
    }
    return out;
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
    // Gornick reads the whole book (the engine is not the mouth: it may)
    const curve = gornickCurve(piece.map((p) => ({ text: p.pieces.map((pc) => pc.text).join(" ") })));
    // HOUDINI (the apparatus leaking): a line that says a role fact back
    // nearly whole ("Alice comes home to the house where she lives, no longer
    // missing her dog, a skilled and experienced person") is the engine's
    // sentence in the mouth's voice — asked again plainly
    for (const p of piece) {
      const role = lf.roleOf?.(gd.outline, gd.outline.leaves[p.index]?.part);
      const clauses = (role?.facts ?? []).map((f) => f.slice(f.indexOf(",") + 1).trim()).filter(Boolean);
      for (const pc of p.pieces) {
        const w = pc.text.split(" ");
        const placed = w[0] === "In" && ["scene", "chapter", "part", "Scene", "Chapter", "Part"].includes(w[1] ?? "") && pc.text.includes(",");
        if (placed) { const rest = pc.text.slice(pc.text.indexOf(",") + 1).trim(); if (rest.split(" ").length > 3) findings.push({ kind: "placing_said", editor: "Harry Houdini", part: p.id, leaf: p.leaf, index: p.index, addr: pc.addr, lineNote: pc.note, sentence: pc.text, repair: rest, detail: `opens on the part's own placing ("${pc.text.slice(0, pc.text.indexOf(","))}"): the engine's words, cut`, licenses: "repair" }); continue; }
        const said = clauses.find((c) => saysPhrase(pc.text, c, ROLE_READ_ALOUD));
        if (said) findings.push({ kind: "role_read_aloud", editor: "Harry Houdini", part: p.id, leaf: p.leaf, index: p.index, addr: pc.addr, lineNote: pc.note, sentence: pc.text, words: [], detail: `says the part's own placing back nearly whole: "${said}"`, licenses: "rewrite" });
      }
    }
    for (const i of curve.flat) findings.push({ kind: "flat_given_before", editor: "Vivian Gornick", part: piece[i].id, leaf: piece[i].leaf, index: i, addr: null, detail: `${curve.means[i].toFixed(2)} bits per word against what precedes it, ${curve.gaps[i].toFixed(2)} below its own words shuffled — beyond the book's own spread (alpha ${GORNICK.alpha}): its phrasing was already said`, licenses: null });
    // THE BEING AND THE ARCS (narrative-arc.js): where the one the telling
    // follows is in every part, out from the void and back to it, changed
    const arc = arcOf(piece, gd);
    for (const f of arc.findings) { const p = byId.get(f.part); findings.push({ ...f, leaf: p?.leaf ?? null, index: p?.index ?? null, addr: null }); }
    const lines = piece.flatMap((p) => p.pieces);
    return { gd, piece, findings, path: arc.path, frame: arc.frame, curve: { shape: curve.shape, meanBits: curve.meanBits, flat: curve.flat.length, of: piece.length }, lines: lines.length, carrying: lines.filter((l) => l.carries.length).length };
  }

  /** The parts as the being's trajectory reads them: each with its chapter
   *  (the group it sits in, counted in order) and its current lines. */
  function arcParts(piece, gd) {
    const groups = [];
    return piece.map((p) => {
      const g = gd.outline.leaves[p.index]?.within.at(-1)?.id ?? "whole";
      if (groups.at(-1) !== g) groups.push(g);
      return { id: p.id, chapter: groups.length - 1, lines: p.pieces.map((pc) => ({ text: pc.text, addr: pc.addr ?? null })) };
    });
  }
  function arcOf(piece, gd) {
    const frame = arcFrame(gd.outline.cast);
    const r = arcChecks({ parts: arcParts(piece, gd), frame });
    return { ...r, frame };
  }

  /** "Where is the being at part k?" — read from the book as it stands now. */
  function whereIsBeing({ notes, store, task, k }) {
    const gd = groundAndDraft(notes, task);
    const piece = pieceOf(notes, store, gd);
    const frame = arcFrame(gd.outline.cast);
    const parts = arcParts(piece, gd);
    return whereIs({ path: trajectory({ parts, frame }), frame, k: Math.max(0, Math.min(parts.length - 1, k)), chapters: parts.length ? parts.at(-1).chapter + 1 : 0 });
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
      // THE TURN, AS THE-FOLD'S turnPass HOLDS IT (the-fold/finish.js): up to
      // BRIDGE_TRIES sentences asked, the first kept that takes up where the
      // last part closed AND hands on to where this one opens, does not talk
      // about the writing, does not say the opening first, and names no one
      // the book does not already hold. One sample judged on the finding
      // count alone was undone 58 times in 59 at scale.
      const known = new Set([...gd.outline.cast.map((c) => c.name.toLowerCase()), ...draftWords(gd.ground)]);
      const content = (t) => [...new Set(draftWords(t))].filter((w) => !isFunctionWord(w));
      const reasons = [];
      let asked = 0;
      for (let k = 0; k < BRIDGE_TRIES && asked < asksLeft; k++) {
        asked++;
        const reply = await say(`The last part ends: "${close}"\n\nThe next part begins: "${open}"\n\nWrite one sentence that carries the reader from the first into the second.`, { stage: `bridge:${f.leaf}`, attempt: k, numPredict: 90 });
        const line = reply.split("\n").map((x) => x.trim().split("\"").join("")).find((x) => x.length > 12) ?? "";
        const cand = sentence((sentences(line)[0]?.text ?? line).trim());
        const why = [];
        if (!line) why.push("nothing said");
        else {
          if (!takesUp(cand, close, { ground: gd.ground, draft: gd.draft })) why.push("takes nothing up from the close");
          if (!takesUp(open, cand, { ground: gd.ground, draft: gd.draft })) why.push("hands nothing on to the opening");
          if (isMetaSentence(cand)) why.push("talks about the writing");
          const cw = content(cand), ow = new Set(content(open));
          if (cw.length && cw.filter((w) => ow.has(w)).length * 2 > cw.length) why.push("says the opening first");
          const names = cand.split(" ").slice(1).map((w) => bare(w)).filter((w, i, a) => w && cand.split(" ")[i + 1]?.[0] && cand.split(" ")[i + 1][0] !== cand.split(" ")[i + 1][0].toLowerCase());
          if (names.some((n) => !known.has(n))) why.push("names someone the book does not hold");
        }
        if (!why.length) return { edits: [{ label: `after 0.${cur.nextAfter(0)}`, text: cand, witness: `talk:${mouth}#bridge`, premise: prev.lines.at(-1).note }], asks: asked, reply };
        reasons.push(`${cand.slice(0, 60)}: ${why.join(", ")}`);
      }
      return { edits: [], asks: asked, refused: reasons.join(" | ") };
    }
    // LISH CUTS FIRST, with no ask: the decoration the tic or the inflation
    // sits in is cut out of the sentence (the-fold/finish.js lishCut), and a
    // rewrite is asked only when nothing can be cut
    if (f.licenses === "rewrite" && f.addr && f.sentence) {
      const known = new Set(draftWords(gd.ground));
      const cut = lishCut(f.sentence, { flagged: new Set((f.words ?? []).map((w) => String(w).toLowerCase())), known, complete: parser?.ok ? (t) => clauseComplete(parser, t) : null, core: parser?.ok ? (t) => clauseCore(parser, t) : null });
      if (cut && cut !== f.sentence && cut.length < f.sentence.length) return { edits: [{ label: f.addr, text: cut, witness: "derived:lish-cut", premise: f.lineNote }], asks: 0 };
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
    return { notes, store, asks, passes: report, final: { findings: last.findings.length, licensed: last.findings.filter((f) => ORDER.includes(f.licenses)).length, lines: last.lines, carrying: last.carrying, curve: last.curve } };
  }

  // ── THE PATHOS PASS: the mouth proposes, the archons choose ──────────────
  // A part Gornick reads flat (its phrasing already said) or Klinkenborg
  // reads flat in cadence is written again: PATHOS_CANDIDATES bodies from a
  // working note that also says what the book has already told (the lines of
  // the parts before it, as facts — never "do not repeat"), and the archons
  // choose among them. The best replaces the part only when it reads better
  // on every count: no more licensed findings in its window, more that is new
  // per word against everything before it, and a cadence that is not flat.
  // The new body rests on the finding that licensed it; the old one is
  // conceded with its reason (REC).
  function bitsAgainst(prefixWords, words, order = GORNICK.order) {
    const alphabet = new Map(), tables = new Map(); for (let k = 1; k <= order; k++) tables.set(k, new Map());
    const prior = { order, alphabet, tables };
    for (let i = 0; i < prefixWords.length; i++) { const w = prefixWords[i]; alphabet.set(w, (alphabet.get(w) ?? 0) + 1); for (let k = 1; k <= order && i - k >= 0; k++) { const ctx = prefixWords.slice(i - k, i).join(" "), t = tables.get(k); if (!t.has(ctx)) t.set(ctx, new Map()); const m = t.get(ctx); m.set(w, (m.get(w) ?? 0) + 1); } }
    if (!words.length) return 0;
    const floor = 1 / (alphabet.size + 1);
    let sum = 0; for (let i = 0; i < words.length; i++) { const q = alphabet.size ? predictNext(prior, words.slice(Math.max(0, i - order), i)).dist.get(words[i]) ?? 0 : 0; sum += -Math.log2(Math.max(q, floor)); }
    return sum / words.length;
  }

  // chooser: "archons" (the default: the best that fixes what licensed it,
  // or the old words), or — falsification controls, never the default —
  // "first" (the first candidate, always) and "random" (one at random, always)
  async function pathosPass({ notes, store, task, budget = Infinity, candidates = PATHOS_CANDIDATES, topic = null, chooser = "archons", seed = 1 }) {
    const pick = lcg(seed);
    const read = readBook({ notes, store, task });
    const gd = read.gd;
    // what licenses a part written again: a flat part (Gornick, Klinkenborg),
    // or the being's arc left unwalked there (Gebser, the being) — the arc's
    // parts first, since the book stands on them
    const writesAgain = (f) => f.kind === "flat_given_before" || f.kind === "flat_cadence" || f.licenses === "regenerate";
    const arcFirst = (f) => (f.licenses === "regenerate" ? 0 : 1);
    const targets = [...new Set([...read.findings].filter((f) => writesAgain(f) && f.part).sort((a, b) => arcFirst(a) - arcFirst(b)).map((f) => read.piece.findIndex((p) => p.id === f.part)).filter((i) => i >= 0))].filter((i) => i > 0 || read.findings.some((f) => f.licenses === "regenerate" && f.part === read.piece[0].id));
    let asks = 0, kept = 0, tried = 0;
    const rows = [];
    for (const i of targets) {
      if (asks >= budget) break;
      const leaf = gd.outline.leaves[i];
      const cur = lf.currentLines(notes, store, leaf.part.id);
      if (!cur) continue;
      tried++;
      const prev = i > 0 ? lf.currentLines(notes, store, gd.outline.leaves[i - 1].part.id) : null;
      const prevTail = (prev?.lines ?? []).slice(-TAIL_SENTENCES).map((l) => l.text);
      const note = lf.workingNote({ outline: gd.outline, leaf, prevTail, topic });
      // what the book has already told: the lines of the parts before this one
      const said = (t) => t.props.find((p) => p.label === "says")?.value;
      const told = gd.outline.leaves.slice(Math.max(0, i - 3), i).map((l) => said(l.part)).filter(Boolean).map((v) => (v.trim().endsWith(".") ? v.trim() : `${v.trim()}.`));
      const prompt = told.length ? note.prompt.replace(`Continue the ${medium.storyWord ?? "story"}.`, `Already told: ${told.join(" ")}\n\nContinue the ${medium.storyWord ?? "story"}.`) : note.prompt;
      const prefix = read.piece.slice(0, i).flatMap((p) => wordsOf(p.pieces.map((pc) => pc.text).join(" ")));
      // A CANDIDATE IS JUDGED AS THE EDITORS WOULD LEAVE IT, and so is the
      // part it would replace: the mechanical revisions its window licenses
      // (folds, repairs — no ask) are applied to both, then both are read
      // again. Judged raw, a fresh draw lost on restatements and splices the
      // editors fold anyway (slice 2: 9 of 12 kept the old words).
      const lo = Math.max(0, i - JUDGE_REACH), hi = Math.min(read.piece.length, i + JUDGE_REACH + 1);
      const ids = new Set(gd.parts.slice(lo, hi).map((x) => x.id));
      const draft = { ...gd.draft, root: { ...gd.draft.root, children: gd.draft.root.children.filter((p) => ids.has(p.id)) } };
      const readWindow = (lines) => {
        const trialPiece = read.piece.map((p, j) => (j !== i ? p : { ...p, pieces: lines.map((text) => ({ text, carries: [] })) }));
        return toldRestatement(readWith(trialPiece.slice(lo, hi), { ...gd, draft }, task, draft).map((x) => licensed(x, universeOf(notes))), trialPiece.slice(lo, hi), universeOf(notes)).filter((x) => x.licenses && x.part === read.piece[i].id);
      };
      const asEdited = (lines) => {
        let out = [...lines];
        for (const f of readWindow(out)) {
          const k = out.indexOf(f.sentence);
          if (k < 0) continue;
          if (f.licenses === "fold" && out.length > MIN_BODY_SENTENCES) out.splice(k, 1);
          else if (f.licenses === "repair" && f.repair && wholeSentence(capitalised(f.repair), parser)) out[k] = capitalised(f.repair);
        }
        return out;
      };
      const scoreOf = (lines) => {
        const edited = asEdited(lines);
        const f = readWindow(edited);
        return { licensed: f.length, bits: bitsAgainst(prefix, wordsOf(edited.join(" "))), flatCadence: !!pacingGrade(edited.join(" ")).flatline, keptLines: edited.length };
      };
      // ITTI & BALDI (kernel/bayes-surprise.js): how far a part moves the
      // belief the book so far has built, over slots declared here — how it
      // opens, whom it names, how long it is, whether anyone speaks. A
      // candidate that moves belief further is the less formulaic one.
      const slotsOf = (lines) => { const t = lines.join(" "), w = (lines[0] ?? "").split(" ").map(bare); const n = lines.length; return { open1: w[0] ?? "", open3: w.slice(0, 3).join(" "), cast: gd.outline.cast.filter((c) => wordIn(t, c.name)).map((c) => c.name).sort().join("+") || "no one", size: n <= 3 ? "short" : n <= 6 ? "middle" : "long", talk: t.includes("\"") || t.includes("“") ? "talk" : "no talk" }; };
      const beliefBefore = (() => { const hb = createHolograph({ alpha: 1 }); for (const p of read.piece.slice(0, i)) admitBelief(hb, slotsOf(p.pieces.map((pc) => pc.text))); return hb; })();
      const cloneBelief = (hb) => ({ ...hb, slots: new Map([...hb.slots].map(([k, m]) => [k, new Map(m)])) });
      const movedBy = (lines) => admitBelief(cloneBelief(beliefBefore), slotsOf(lines)).bayes;
      const baseScore = scoreOf;
      const scoreWith = (lines) => ({ ...baseScore(lines), moved: movedBy(lines) });
      const now = scoreWith(cur.lines.map((l) => l.text));
      const reasons = read.findings.filter((f) => f.part === read.piece[i].id && writesAgain(f));
      // what the being's arc wants said here (the home come back to, what was
      // missing, what they become), said of the being by name
      const wants = reasons.filter((r) => r.wants).map((r) => r.wants);
      const forArc = wants.length > 0;
      // the part's own placing, which a fresh draw must not say back (arc2:
      // the regenerated parts read the role aloud and Houdini's count rose)
      const roleClauses = (lf.roleOf?.(gd.outline, leaf.part)?.facts ?? []).map((f) => f.slice(f.indexOf(",") + 1).trim()).filter(Boolean);
      const readsAloud = (lines) => lines.some((l) => { const w = l.toLowerCase().split(" "); return (w[0] === "in" && ["scene", "chapter", "part"].includes(w[1] ?? "")) || roleClauses.some((c) => saysPhrase(l, c, ROLE_READ_ALOUD)); });
      const pool = [];
      // an arc part gets twice the draws: it must say what the arc wants there
      // in its own words, and three draws found none at the arrival (arc2)
      for (let c = 0; c < (forArc ? 2 * candidates : candidates) && asks < budget; c++) {
        asks++;
        const got = await say(prompt, { stage: `pathos:${leaf.part.id}`, attempt: c + 1, numPredict: medium.bodyTokens ?? 320 });
        let reply = got.trim();
        while (note.anchor && reply.startsWith(note.anchor)) reply = reply.slice(note.anchor.length).trim();
        const text = bodyOfReply(reply, sentences);
        const lines = linesOfBody(text, sentences).map((l) => l.text);
        if (lines.length < MIN_BODY_SENTENCES) continue;
        pool.push({ text, lines, ...scoreWith(lines) });
      }
      const walks = (x) => wants.every((w) => saysPhrase(x.lines.join(" "), w)) && (!wants.length || x.lines.some((l) => l.includes(read.frame?.p ?? "")));
      // a candidate must fix what licensed it and worsen nothing the judge
      // counts: never more licensed findings in its window; more that is new
      // per word when Gornick licensed it; a cadence that is not flat when
      // Klinkenborg did (cadence is a report elsewhere, so not a veto here)
      const byGornick = reasons.some((r) => r.kind === "flat_given_before"), byCadence = reasons.some((r) => r.kind === "flat_cadence");
      // Brillat-Savarin's veto: a candidate opening as one of the three parts
      // before it opens (variation.js sameOpening) is not a new draw
      const opens = read.piece.slice(Math.max(0, i - 3), i).map((p) => p.pieces[0]?.text ?? "").filter(Boolean);
      // a part written again for the ARC is judged by the walk alone: it says
      // what the arc wants there, of the being, and does not open as the last
      // parts did. The licensed-findings veto stays for flat parts only — the
      // editors fold and repair what they license afterwards anyway, and the
      // veto refused every homecoming (arc1: 0 of 8 kept; F4: the veto is not
      // worth its asks)
      const fixes = (x) => !readsAloud(x.lines) && (forArc ? walks(x) && !opens.some((o) => sameOpening(x.lines[0] ?? "", o)) : x.licensed <= now.licensed && (!byGornick || x.bits > now.bits) && (!byCadence || !x.flatCadence) && !opens.some((o) => sameOpening(x.lines[0] ?? "", o)));
      const rank = (a, b) => a.licensed - b.licensed || b.moved - a.moved || b.bits - a.bits;
      const ok = chooser === "archons" ? pool.filter(fixes).sort(rank) : chooser === "first" ? pool.slice(0, 1) : pool.length ? [pool[Math.floor(pick() * pool.length)]] : [];
      const best = ok[0] ?? [...pool].sort(rank)[0];
      const better = !!ok[0];
      rows.push({ part: leaf.part.id, now, best: best ? { licensed: best.licensed, bits: Number(best.bits.toFixed(2)), flatCadence: best.flatCadence } : null, candidates: pool.length, kept: !!better, why: reasons.map((r) => `${r.editor}: ${r.kind}`) });
      log({ kind: better ? "pathos_kept" : "pathos_undone", part: leaf.part.id, now, best: best && { licensed: best.licensed, bits: best.bits, flatCadence: best.flatCadence, text: best.text }, candidates: pool.length, why: reasons.map((r) => r.detail) });
      if (!better) continue;
      // the findings on the record, the old words conceded, the chosen words heard
      const findingIds = [];
      for (const r of reasons) { const h = hearFinding(notes, r); notes = h.notes; findingIds.push(h.id); }
      const fold = N.fold(notes);
      for (const n of fold.filter((x) => x.end1 === leaf.part.id && (x.label === "body" || x.label.startsWith("line ") || x.label.startsWith("after ")))) { const d = N.concede(notes, n.id, { trigger: `written again: the archons chose a body that reads better (${reasons.map((r) => r.kind).join(", ")})` }); if (!d.refused) notes = d.log; }
      notes = N.hear(notes, { end1: leaf.part.id, label: "body", end2: store.put(best.text), witness: `talk:${mouth}#pathos${tried}`, because: `chosen of ${pool.length} by the archons: ${best.licensed} licensed findings (was ${now.licensed}), ${best.bits.toFixed(2)} bits per word against what precedes it (was ${now.bits.toFixed(2)}) [premises: ${JSON.stringify([...findingIds, ...note.carried])}]` });
      kept++;
    }
    return { notes, store, asks, tried, kept, targets: targets.length, rows };
  }

  return { readBook, editBook, pathosPass, groundAndDraft, whereIsBeing };
}
