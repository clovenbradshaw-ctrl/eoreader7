// Handle: Terkel — Studs Terkel, the oral historian who built whole books by
// asking people to talk about their work and their lives, one conversation at
// a time, and kept the structure himself.
//
// talk-build.js — a build as a CONVERSATION. The mouth only talks; the engine
// listens, keeps the record, and decides what to ask next.
//
//   the spec   the request is read by the same ear as the talk: every counted
//              noun ("six communities", "two comments under each post") is an
//              expected kind, per parent where "each" says so; every other
//              noun it names ("a search box", "a sidebar") is an expected thing
//   the talk   each ask is one small plain question about ONE missing thing,
//              carrying only that thing's own path (the request, its parent,
//              the names already used), and it ends on a completion anchor —
//              "One more post in r/orca is titled" — so the mouth just goes on
//              talking and the reader hears a new post in r/orca
//   the record organs/talk-reader.js reads each reply into claims; the kernel's
//              notes ledger (kernel/notes.js) types every one itself (INS
//              first heard, SYN heard again, operator_basis: produced) — the
//              log is the build, and the belief is its fold
//   the gaps   after every reply the belief is folded again and compared with
//              the spec: a kind short of its count, a thing with no name, a
//              named noun nobody has described — the first gap is the next ask
//   the page   a renderer (injected) draws the folded belief
//
// As the request grows, the conversation gets longer and every ask stays the
// same size: that is the point of it. Nothing here calls a model (`ask` is
// injected) and nothing here is a regular expression.

import { makeTalkReader, numberOf } from "./talk-reader.js";
import { makeNotes } from "../kernel/notes.js";
import { reason, isDerived } from "./talk-reason.js";
// the rules organs/talk-reason.js derives by (its derive list is the whole of them)
const REASON_RULES = new Set(["shown", "total", "top", "correct"]);
import { readKinds, detailsFor } from "./kind-read.js";
import { uncovered } from "./provenance-cover.js";
import { helixCheck, premisesOf } from "./claim-acts.js";
import { universeOf } from "./universe.js";
import { detectRepetition } from "../the-fold/document-ledger.js";
import { sealArtifact } from "../kernel/artifact.js";
import { createHash } from "node:crypto";

export const TALK_BUILD_SCHEMA = "TalkBuild@1";
/** The most asks one build may spend, set by hand 2026-09-27, not measured:
 *  raised from 80 after the ladder's largest rung (six communities, 36 posts,
 *  72 comments) stopped at 80 with its comments half asked — the 1.5b mouth
 *  answers about one row per ask — and small enough that a stuck
 *  conversation still stops. */
export const MAX_ASKS = 120;
/** How many times a build reasons over its record and goes back to talk,
 *  set by hand 2026-09-27, not measured: a retraction reopens a gap, the
 *  refill may repeat again, and three rounds bound that without a loop. */
export const REASON_CYCLES = 3;
/** Nouns any request uses about itself, never a part of it, whatever the
 *  medium — set by hand 2026-09-27. A medium adds its own (a page's "site",
 *  a piece's "song"). */
export const WHOLE_WORDS = Object.freeze(new Set(["thing", "things", "way", "one", "detail", "details", "count", "number", "title", "name", "content"]));

/** The medium a build runs in when none is given: a whole with parts, no
 *  words of its own. A medium (adapters/build/page-medium.js, …) says what
 *  its whole is, which words name it, and how it is drawn and checked. */
export const BARE_MEDIUM = Object.freeze({ kind: "artifact", root: "whole", wholeFallback: "the whole", wholeWords: new Set(), fieldHolders: new Set(), numericDetails: new Set(), showsVerb: "has" });

const lowerOf = (r) => String(r?.form ?? "").toLowerCase();
const lemmaOf = (r) => String(r?.lemma ?? r?.form ?? "").toLowerCase();
const DASHES = new Set(["—", "–", "-", "--"]);
const INSIDE_EACH = new Set(["under", "in", "on", "for", "per", "about"]);
// words that size or date a thing rather than say what kind it is ("two SHORT
// comments", "a NEW post") — dropped from a modifier
const POSSESSIVE = new Set(["'s", "’s"]);
const UNMARKED = new Set(["new", "short", "long", "small", "big"]);

/** Read the request as a spec, in word order (a long imperative request is
 *  where a dependency tree goes wrong — "r/bottlenose" tagged a verb — so the
 *  spec leans on the parser's word classes and lemmas, not its tree). The
 *  request is walked as noun phrases, each one's role set by what came before:
 *    at the top    a phrase is a PART: counted when a numeral above one opens
 *                  it ("six communities"), named otherwise ("a search box")
 *    after "with"  on a part, a phrase is one of its DETAILS ("a title, a vote
 *                  count and a comment count") — unless a numeral above one
 *                  opens it ("two short comments under each post"), which is
 *                  a counted part of its own; the list closes on the phrase
 *                  after its "and", or at ", and"
 *    after a verb  ("to submit …", "listing …") a phrase says what the part is
 *                  FOR — again unless a count opens it ("showing three posts");
 *                  a comma ends it
 *  A part's kind is the last noun of its phrase ("three dolphin species" ->
 *  species); the words before it are its modifier. "each" between a part and
 *  a count, or "under/in/on each <noun>" after it, makes the count per parent.
 *  Names are the name-like words listed right after a counted noun
 *  ("r/bottlenose and r/orca") or the words between dashes. A phrase followed
 *  by "of" ("a section of five user profiles") only frames the next one.
 *  -> { counted: [{ kind, modifier, n, per, within, names, details, purpose }],
 *       named:   [{ kind, modifier, phrase, plural, details, purpose }] } */
export function specOf(request, { parse, sentences, wholeWords = new Set() }) {
  const isWhole = (k) => WHOLE_WORDS.has(k) || wholeWords.has(k);
  const counted = [];
  const named = [];
  const nameLike = (t) => t.upos === "PROPN" || String(t.form).includes("/") || (t.form[0] !== t.form[0].toLowerCase() && t.id > 1);
  const isNoun = (t) => !!t && (t.upos === "NOUN" || t.upos === "PROPN") && !String(t.form).includes("/");
  // a participle is a modifier only inside a phrase a numeral or determiner
  // opened ("three REPORTED posts"), never after "to" ("to sort posts")
  const isMod = (t, next, prev) => !!t && !String(t.form).includes("/") && (t.upos === "ADJ" || isNoun(t) || (t.upos === "VERB" && isNoun(next) && (prev?.upos === "NUM" || prev?.upos === "DET")));
  const punct = (w) => w.split("").every((c) => c.toLowerCase() === c.toUpperCase() && !(c >= "0" && c <= "9"));
  for (const s of sentences(request)) {
    const toks = parse(s.text);
    let mode = "top";        // top | with | for
    let owner = null;        // the part a with-list or a purpose belongs to
    let closeAfter = false;  // the with-list closes on the phrase after "and"
    let sawEach = false;     // "each" since the owner was named
    let afterFor = false;    // the next phrase follows "for"/"about"
    const toTop = () => { mode = "top"; closeAfter = false; };
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const w = lowerOf(t);
      if (w === ";") { toTop(); owner = null; sawEach = false; continue; }
      // ", in 12 chapters" after a list of what each part has: the list is
      // over, and what follows is the whole's again, not each part's
      if (w === "," && owner && toks[i + 1]?.upos === "ADP" && lowerOf(toks[i + 1]) !== "with") { toTop(); owner = null; sawEach = false; continue; }
      if (w === ",") { if (mode === "for" || (mode === "with" && lowerOf(toks[i + 1]) === "and")) toTop(); continue; }
      if (w === "with") { if (owner) mode = "with"; closeAfter = false; continue; }
      if (w === "each") { sawEach = true; continue; }
      // the phrase after "for"/"about" is who or what it is for — the topic,
      // never a part ("for dolphin fans", "for my daughter")
      if ((w === "for" || w === "about") && mode === "top") { afterFor = true; continue; }
      if (w === "and" && mode === "with") { closeAfter = true; continue; }
      if (t.upos === "VERB" && !isMod(t, toks[i + 1], toks[i - 1]) && !String(t.form).includes("/")) { if (owner) { mode = "for"; owner.purpose.push(w); } continue; }
      // a noun phrase opens at a numeral, a determiner, or a bare noun or adjective
      const n = numberOf(t.form);
      // a number word right before a noun is a count, however the tagger
      // tagged it ("twelve posts" came back without NUM)
      const numeral = n != null && (t.upos === "NUM" || t.deprel === "nummod" || isMod(toks[i + 1], toks[i + 2], t));
      const start = numeral || t.upos === "DET" ? i + 1 : i;
      const run = [];
      for (let j = start; j < toks.length && isMod(toks[j], toks[j + 1], toks[j - 1]); j++) run.push(toks[j]);
      const headAt = run.map(isNoun).lastIndexOf(true);
      if (headAt < 0) { if (mode === "for" && owner && !punct(w)) owner.purpose.push(w); continue; }
      const head = run[headAt];
      const kind = lemmaOf(head);
      const modifier = run.slice(0, headAt).map(lowerOf).filter((m) => !UNMARKED.has(m)).join(" ") || null;
      const phrase = run.slice(0, headAt + 1).map(lowerOf).join(" ");
      i = start + headAt;
      // "a section of …" frames what follows — unless a count opens it ("two phrases of four bars")
      if (lowerOf(toks[i + 1]) === "of" && !(numeral && n > 1)) { i++; continue; }
      const many = numeral && n > 1;
      if (mode === "with" && !many && owner) {
        owner.details.push(phrase);
        if (closeAfter) toTop();
        continue;
      }
      if (mode === "for" && !many) { if (owner) owner.purpose.push(phrase); continue; }
      // a possessive goes on to what is possessed: "about a lighthouse
      // keeper's daughter" is one topic, never a part called "daughter"
      const possessive = POSSESSIVE.has(lowerOf(toks[i + 1]));
      if (isWhole(kind) || afterFor) { owner = null; toTop(); sawEach = false; afterFor = possessive && afterFor; if (possessive) i++; continue; }
      if (many) {
        // names right after: "r/bottlenose and r/orca", or "— a, b and c —"
        const names = [];
        let k = i + 1;
        if (DASHES.has(lowerOf(toks[k]))) {
          for (k = k + 1; k < toks.length && !DASHES.has(lowerOf(toks[k])); k++) if (isNoun(toks[k]) || nameLike(toks[k])) names.push(toks[k].form);
          k++;
        } else {
          for (; k < toks.length; k++) {
            if (nameLike(toks[k])) { names.push(toks[k].form); continue; }
            if ([",", "and", "or"].includes(lowerOf(toks[k]))) continue;
            break;
          }
          if (!names.length) k = i + 1;
        }
        // per: "under/in/on each <noun>" after it, or "each" since the owner
        let per = null;
        if (INSIDE_EACH.has(lowerOf(toks[k])) && lowerOf(toks[k + 1]) === "each" && isNoun(toks[k + 2])) { per = lemmaOf(toks[k + 2]); k += 3; }
        else if (lowerOf(toks[k]) === "each" && owner?.n) { per = owner.kind; k += 1; }   // "with four posts each"
        else if (sawEach && owner?.n) per = owner.kind;
        if (per === kind) per = null;
        const within = !per && owner && mode === "for" ? owner.phrase : null;
        const c = { kind, modifier, n, per, within, names: names.slice(0, n), details: [], purpose: [], phrase };
        counted.push(c);
        owner = c; toTop(); sawEach = false;
        i = k - 1;
        continue;
      }
      // a named part, once
      let part = named.find((x) => x.phrase === phrase);
      if (!part) { part = { kind, modifier, phrase, plural: lowerOf(head) !== kind, details: [], purpose: [] }; named.push(part); }
      owner = part; toTop(); sawEach = false;
    }
  }
  for (const x of [...counted, ...named]) x.purpose = x.purpose.length ? x.purpose.join(" ") : null;
  // what the build is, in the request's own words: the phrase before its
  // first part ("make a reddit-style site for dolphin fans with six …" ->
  // "a reddit-style site for dolphin fans"). Every ask carries this and its
  // own thing's path — never the whole request, which grows with the build.
  const first = sentences(request)[0];
  const toks = first ? parse(first.text) : [];
  const words = [];
  for (let i = toks[0]?.upos === "VERB" ? 1 : 0; i < toks.length; i++) {
    const t = toks[i], w = lowerOf(t);
    if (w === "with" || w === "but" || w === "," || w === ";" || w === "—" || numberOf(t.form) != null || (t.upos === "VERB" && words.length)) break;
    words.push(t.form);
  }
  // the request's own "for …"/"about …" phrase ("only for dolphin content",
  // "for dolphin fans"): a constraint on every piece of content, carried by
  // the asks that produce names and words (never by a number's ask)
  let topic = null;
  for (let i = 0; i < toks.length; i++) {
    const w = lowerOf(toks[i]);
    if (w !== "for" && w !== "about") continue;
    const run = [];
    for (let j = i + 1; j < toks.length && (toks[j].upos === "NOUN" || toks[j].upos === "ADJ" || toks[j].upos === "PROPN" || ((toks[j].upos === "PRON" || toks[j].upos === "DET") && j === i + 1) || (POSSESSIVE.has(lowerOf(toks[j])) && j > i + 1 && ["NOUN", "ADJ", "PROPN"].includes(toks[j + 1]?.upos))); j++) run.push(toks[j].form);
    if (run.length) { topic = `${w} ${run.join(" ").split(" 's").join("'s").split(" ’s").join("’s")}`; break; }
  }
  while (words.length && toks.some((t) => t.form === words.at(-1) && t.upos === "ADP")) words.pop();   // "a lullaby in" -> "a lullaby"
  return { counted, named, whole: words.join(" ") || null, topic };
}

/** The folded belief as things: { id, kind, modifier, name, props, children, parent }.
 *  "exists" only puts a thing on the record; an unnamed part that is nothing
 *  but a value ("its username is orcafan99" heard as a username thing) folds
 *  into its owner as that value. */
export function beliefOf(notesFold, things) {
  // the belief is the fold: a thing is on the page only when the ledger holds
  // a claim about it, and its name is only the name the ledger heard (the
  // ear's own working memory is never the record)
  const onRecord = new Set(notesFold.flatMap((n) => [n.end1, n.end2]));
  const byId = new Map(things.filter((t) => onRecord.has(t.id)).map((t) => [t.id, { ...t, name: null, props: [], children: [], parent: null }]));
  for (const n of notesFold) {
    const a = byId.get(n.end1);
    if (a && n.label === "exists") { a.existsNote ??= n.id; continue; }
    if (!a) continue;
    if (n.label === "has" && byId.has(n.end2)) { const b = byId.get(n.end2); b.heldNote ??= n.id; if (!b.parent && b !== a) { b.parent = a.id; a.children.push(b.id); } continue; }
    if (n.label === "named") { a.name = n.end2; a.nameNote = n.id; continue; }
    if (n.label === "position") { a.position = Number(n.end2); continue; }
    a.props.push({ label: n.label, value: n.end2, note: n.id, witnesses: n.witnesses ?? [], ...(isDerived(n) ? { derived: true } : {}) });
  }
  // a part's children in the order they were made (their heard positions);
  // the fold's own order is by id, which puts "bar#10" before "bar#8"
  for (const t of byId.values()) t.children.sort((x, y) => (byId.get(x)?.position ?? Infinity) - (byId.get(y)?.position ?? Infinity));
  // a heard value the record corrects stays on the page as what was said,
  // beside the value the record supports (never silently replaced)
  for (const t of byId.values()) for (const q of t.props) if (!q.derived && t.props.some((d) => d.derived && d.label === q.label && d.value !== q.value)) q.superseded = true;
  for (const t of byId.values()) {
    const owner = t.parent ? byId.get(t.parent) : null;
    if (!owner || t.name || t.children.length || t.props.length !== 1 || t.props[0].label !== "is") continue;
    owner.props.push({ label: [t.modifier, t.kind].filter(Boolean).join(" "), value: t.props[0].value });
    owner.children = owner.children.filter((c) => c !== t.id);
    byId.delete(t.id);
  }
  return [...byId.values()];
}

const kindMatches = (thing, kind) => thing.kind === kind || thing.kind === `${kind}s` || `${thing.kind}s` === kind;
// an unnamed part is called by what it says, when it says something (a
// chapter's line: "Mara finds the boat"), else by its kind
const title = (t) => t.name ?? t.props?.find((p) => p.label === "says")?.value ?? `the ${t.modifier ? `${t.modifier} ` : ""}${t.kind}`;
const phraseOf = (c) => [c.modifier, c.kind].filter(Boolean).join(" ");
// The slot's value is the reply up to its first break: "Superpod sighting, with
// 301 upvotes" -> "Superpod sighting". A said-slot keeps its whole first sentence.
// a name is at most this many words — set by hand 2026-09-27 (longer slot
// values were sentences about the name, not the name)
const NAME_WORDS = 4;
const isCapitalised = (w) => !!w && w[0] !== w[0].toLowerCase() && w[0] === w[0].toUpperCase();
const hasLetter = (v) => [...String(v)].some((ch) => ch.toLowerCase() !== ch.toUpperCase());
const BREAKS = new Set([",", ";", ":", "—", "–", "(", "\n"]);
function slotValue(reply, whole, { name = true } = {}) {
  let v = String(reply ?? "").trim();
  // a quoted span inside a sentence is the answer: 'The first one is "Orca Watch".' -> Orca Watch
  for (const [open, close] of [["\"", "\""], ["“", "”"]]) {
    const a = v.indexOf(open), b = a >= 0 ? v.indexOf(close, a + 1) : -1;
    if (a > 0 && b > a + 1) return v.slice(a + 1, b).trim();
  }
  const nl = v.indexOf("\n"); if (nl >= 0) v = v.slice(0, nl);
  let cut = v.length;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (!whole && BREAKS.has(c)) { cut = i; break; }
    if ((c === "." || c === "!" || c === "?") && (i + 1 === v.length || v[i + 1] === " ")) { cut = whole ? i + 1 : i; break; }
  }
  v = v.slice(0, cut).trim();
  // a name said in a sentence is the words after "named"/"called": "The
  // character you are referring to is named Anna" -> Anna
  // a phrase asked for (a place, what is missing) is not a name: its words stand
  if (!whole && name) {
    const w = v.split(" ");
    const at = Math.max(w.lastIndexOf("named"), w.lastIndexOf("called"));
    if (at >= 0 && at < w.length - 1) v = w.slice(at + 1).join(" ");
    // a name is a few words: a long sentence ending in capitalised words
    // ("The name of the additional character could be Alex") names the last of them
    else if (w.length > NAME_WORDS) { let k = w.length; while (k > 0 && isCapitalised(w[k - 1])) k--; if (k < w.length) v = w.slice(k).join(" "); }
  }
  const QUOTES = ["\"", "'", "“", "”", "‘", "’", "*", "`"];
  while (v && QUOTES.includes(v[0])) v = v.slice(1);
  while (v && QUOTES.includes(v[v.length - 1])) v = v.slice(0, -1);
  return v.trim();
}
// the numbers a line states, in order ("1,234 votes and 12 comments" -> ["1234", "12"])
function numbersIn(text) {
  const out = [];
  for (const w of String(text ?? "").split(" ")) {
    let x = w.split(",").join("");
    while (x && !(x.at(-1) >= "0" && x.at(-1) <= "9")) x = x.slice(0, -1);
    while (x && !(x[0] >= "0" && x[0] <= "9")) x = x.slice(1);
    const v = x ? numberOf(x) : null;
    if (v != null && !Number.isNaN(v)) out.push(String(v));
  }
  return out;
}
// the items a finished sentence lists: "upvotes, its comments and its
// author." -> ["upvotes", "comments", "author"] (to the sentence's end; the
// possessive and article that open an item are not part of it)
function itemsOf(reply) {
  let v = String(reply ?? "").trim();
  const nl = v.indexOf("\n"); if (nl >= 0) v = v.slice(0, nl);
  for (let i = 0; i < v.length; i++) if ((v[i] === "." || v[i] === "!" || v[i] === "?") && (i + 1 === v.length || v[i + 1] === " ")) { v = v.slice(0, i); break; }
  const OPENERS = new Set(["its", "their", "the", "a", "an", "and", "or", "also"]);
  return v.split(",").flatMap((x) => x.split(" and ")).map((x) => {
    const w = x.trim().toLowerCase().split(" ").filter(Boolean);
    while (w.length && OPENERS.has(w[0])) w.shift();
    return w.join(" ");
  }).filter(Boolean);
}
// the reply's lines, list markers ("1.", "2)", "-", "*") taken off
function linesOf(reply) {
  return String(reply ?? "").split("\n").map((l) => {
    let x = l.trim(), i = 0;
    while (i < x.length && x[i] >= "0" && x[i] <= "9") i++;
    if (i > 0 && (x[i] === "." || x[i] === ")") && x[i + 1] === " ") x = x.slice(i + 1);   // "22." is an answer, "2. Orca" a list line
    else if (x[0] === "-" || x[0] === "*" || x[0] === "•") x = x.slice(1);
    return x.trim();
  }).filter((x) => x && !x.endsWith(":"));   // "Here are five user profiles:" is a preamble, not an answer
}

/** How much of the spec the folded belief holds: every counted part wanted
 *  (its count times its parents' wanted count) against the ones heard (at
 *  most its count per parent), and every detail wanted on them against the
 *  ones heard. Named parts count once each. -> { want, have, ratio, byPart } */
export function completeness(spec, belief) {
  const isOf = (t, c) => kindMatches(t, c.kind) && (c.modifier ? t.modifier === c.modifier : !spec.counted.some((o) => o !== c && o.kind === c.kind && o.modifier && t.modifier === o.modifier));
  const partOf = (kind) => spec.counted.find((c) => c.kind === kind && !c.modifier) ?? spec.counted.find((c) => c.kind === kind);
  const wantOf = (c, seen = new Set()) => { if (seen.has(c)) return c.n; seen.add(c); const p = c.per ? partOf(c.per) : null; return c.n * (p ? wantOf(p, seen) : 1); };
  const byPart = [];
  for (const c of spec.counted) {
    const things = belief.filter((t) => isOf(t, c));
    const perParent = new Map();
    for (const t of things) perParent.set(t.parent ?? "top", [...(perParent.get(t.parent ?? "top") ?? []), t]);
    const perPart = c.per ? partOf(c.per) : null;
    const parentIds = perPart ? new Set(belief.filter((t) => isOf(t, perPart)).map((t) => t.id)) : null;
    const kept = [...perParent.entries()].filter(([g]) => !parentIds || parentIds.has(g)).flatMap(([, list]) => list.slice(0, c.n));
    const details = c.details.filter((x) => !["title", "name"].includes(x));
    byPart.push({ part: c.phrase, want: wantOf(c), have: Math.min(kept.length, wantOf(c)), detailsWant: wantOf(c) * details.length, detailsHave: kept.reduce((a, t) => a + details.filter((x) => t.props.some((p) => p.label === x)).length, 0) });
  }
  for (const p of spec.named) byPart.push({ part: p.phrase, want: 1, have: belief.some((t) => kindMatches(t, p.kind) && (!p.modifier || t.modifier === p.modifier)) ? 1 : 0, detailsWant: 0, detailsHave: 0 });
  const want = byPart.reduce((a, b) => a + b.want + b.detailsWant, 0);
  const have = byPart.reduce((a, b) => a + b.have + b.detailsHave, 0);
  return { want, have, ratio: want ? have / want : 1, byPart };
}

/** makeTalkBuild({ ask, parse, sentences, render, verify, log }) */
export function makeTalkBuild({ ask, parse, sentences, render, verify = async () => ({ ok: true, checks: [] }), log = () => {}, maxAsks = MAX_ASKS, frame = "task", lookup = null, mouth = "mouth", medium = BARE_MEDIUM }) {
  render ??= medium.render;
  const specIn = (text) => specOf(text, { parse, sentences, wholeWords: medium.wholeWords });
  async function build(request) {
    const what = request.what;
    // the person's answers to the build's questions ("three communities, with
    // four posts each") are the request too: read after it, in their words
    const more = (request.more ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);
    const spec = specIn([what, ...more.map((m) => (m.endsWith(".") ? m : `${m}.`))].join(" "));
    const first = specIn(what);
    if (first.whole) spec.whole = first.whole;
    spec.topic = first.topic;
    log({ kind: "spec", spec });
    const reader = makeTalkReader({ parse, sentences });
    const N = makeNotes();
    // WHAT UNIVERSE THIS IS, declared before anything is said in it
    // (organs/universe.js): it decides how every claim here is known — a page
    // from its sources, a story by its own telling — and so whether the world
    // is looked up at all
    const universe = universeOf({ medium });
    let notes = N.createNotes({ frame: { request: what, forWhom: request.forWhom ?? null, reader: "organs/talk-reader.js", universe: universe.kind, knowing: universe.knowing } });
    let asks = 0;
    const tried = new Map();
    // ORDER IS INFORMATION: the fold returns claims by id ("bar#10" before
    // "bar#8"), so the order parts were made in is heard as a claim of its
    // own — each part's position among its siblings, at the moment it is minted
    const positions = new Map();
    const positioned = (id, parentId) => { const k = parentId ?? "top"; const n = (positions.get(k) ?? 0) + 1; positions.set(k, n); return { end1: id, label: "position", end2: String(n) }; };
    // INS FIRST (the helix, organs/claim-acts.js): nothing is bonded,
    // placed, defined or judged before it is instantiated. A claim that acts
    // on a thing not yet on the record (a part the ear heard in a reply, a
    // field the request named) brings that thing's INS with it, from the
    // same witness, ahead of it.
    // a thing on the record is "kind#n" — a snip's address ("prelude.mid@ab12#ticks:0-1920") is not one
const isThing = (id) => { if (typeof id !== "string" || id.startsWith("kind:") || id.includes("|")) return false; const at = id.lastIndexOf("#"); const n = id.slice(at + 1); return at > 0 && n.length > 0 && [...n].every((ch) => ch >= "0" && ch <= "9") && !id.slice(0, at).includes("@"); };
    const kindOfThing = (id) => reader.things().find((t) => t.id === id)?.kind ?? String(id).split("#")[0];
    const instantiateFirst = (claims) => {
      const done = new Set(N.fold(notes).filter((n) => n.label === "exists").map((n) => n.end1));
      const out = [];
      for (const c of claims) {
        if (c.label === "exists") { done.add(c.end1); out.push(c); continue; }
        for (const end of [c.end1, c.label === "has" ? c.end2 : null]) {
          if (isThing(end) && !done.has(end)) { out.push({ end1: end, label: "exists", end2: kindOfThing(end), sentence: c.sentence, witness: c.witness }); done.add(end); }
        }
        out.push(c);
      }
      return out;
    };
    const hear = (claims) => {
      const before = notes.entries.length;
      for (const c of instantiateFirst(claims)) notes = N.hear(notes, { end1: c.end1, label: c.label, end2: c.end2, witness: c.witness, because: c.sentence });
      return notes.entries.slice(before).map((e) => ({ seq: e.seq, operator: e.operator, basis: e.operator_basis, description: e.description }));
    };
    const show = (claims) => claims.map((c) => `${c.end1} —${c.label}→ ${c.end2}`);

    // One turn. The ask ends on an anchor and the mouth goes on talking.
    //   a slot turn  the engine asked for ONE thing ("One more post in r/orca is
    //                called", "The karma of Orca Fan is"): the reply's first
    //                words fill that slot — the question says what the answer
    //                is, so the engine types it; the rest is read as talk
    //                about the same thing
    //   a talk turn  the reader reads anchor and reply together
    const turn = async (gap, question, anchor, slot = null) => {
      asks++;
      const prompt = `${question}\n\n${anchor}`;
      const t0 = Date.now();
      let reply = String(await ask(prompt, { stage: gap, attempt: tried.get(gap) ?? 0 }) ?? "").trim();
      // a small model often says the anchor again before going on: drop the echo
      while (reply.toLowerCase().startsWith(anchor.toLowerCase())) reply = reply.slice(anchor.length).trim();
      for (const e of slot?.echoes ?? []) if (reply.toLowerCase().startsWith(e.toLowerCase())) { reply = reply.slice(e.length).trim(); while (reply.startsWith(",")) reply = reply.slice(1).trim(); reply = reply.charAt(0).toUpperCase() + reply.slice(1); break; }
      // the mouth is ONE source however many times it is asked: its asks are
      // addresses within it (talk:<model>#ask<n>), so a model agreeing with
      // itself is never read as corroboration
      const witness = `talk:${mouth}#ask${asks}`;
      let claims = [];
      let focusId = null;
      if (slot?.list) {
        // one value per line: "1. Superpod sighting" / "- Superpod sighting"
        const values = linesOf(reply).map((l) => slotValue(l, slot.whole)).filter(hasLetter).slice(0, slot.list);
        for (const value of values) {
          if (slot.label === "named" && !takeName(slot.kind, slot.parent, value)) continue;
          const because = `${anchor} ${value}`;
          const subject = reader.mint(slot.kind, slot.modifier ?? null).id;
          claims.push({ end1: subject, label: "exists", end2: slot.kind, sentence: because, witness }, { ...positioned(subject, slot.parent), sentence: because, witness });
          if (slot.parent) claims.push({ end1: slot.parent, label: "has", end2: subject, sentence: because, witness });
          if (slot.label === "named") reader.rename(subject, value);
          claims.push({ end1: subject, label: slot.label, end2: value, sentence: because, witness });
        }
      } else if (slot?.rows) {
        // one row per thing: "2. Orca Watch: 25". The anchor opened the first
        // row with its name, so the reply's first line is that row's value;
        // a line that names its row before a colon (the first one too, when
        // the mouth says the name again) goes to that row, else by order.
        const norm = (x) => slotValue(x, false).toLowerCase();
        linesOf(reply).forEach((l, i) => {
          let row = i === 0 ? slot.rows[0] : slot.rows[i] ?? null, said = l;
          const colon = l.indexOf(":");
          if (colon > 0) { const who = norm(l.slice(0, colon)); const hit = slot.rows.find((r) => norm(r.title) === who); if (hit) { row = hit; said = l.slice(colon + 1); } else if (!row) return; }
          if (!row || row.done) return;
          if (slot.labels) {
            // several numbers on one row, in the order they were asked: "25 votes, 12 comments"
            const nums = numbersIn(said);
            if (!nums.length) return;
            row.done = true;
            const open = row.lacks ?? slot.labels;
            nums.slice(0, open.length).forEach((v, k) => claims.push({ end1: row.id, label: open[k], end2: v, sentence: `${row.title}: ${said.trim()}`, witness }));
            return;
          }
          let value = slot.numeric ? numbersIn(said).at(-1) ?? null : slotValue(said, !!slot.whole);
          if (!value) return;
          row.done = true;
          if (slot.mint) {
            if (slot.label === "named" && !takeName(slot.kind, row.id, value)) { row.done = false; return; }
            const subject = reader.mint(slot.kind, slot.modifier ?? null).id;
            claims.push({ end1: subject, label: "exists", end2: slot.kind, sentence: `${row.title}: ${value}`, witness }, { ...positioned(subject, row.id), sentence: `${row.title}: ${value}`, witness }, { end1: row.id, label: "has", end2: subject, sentence: `${row.title}: ${value}`, witness });
            if (slot.label === "named") reader.rename(subject, value);
            claims.push({ end1: subject, label: slot.label, end2: value, sentence: `${row.title}: ${value}`, witness });
          } else claims.push({ end1: row.id, label: slot.label, end2: value, sentence: `${row.title}: ${slot.label} ${value}`, witness });
        });
      } else if (slot?.relation) {
        // the anchor named both ends ("Tommy is Lily's"): the first words said are the bond
        let rel = slotValue(reply, false).toLowerCase();
        const w = rel.split(" ").filter((x) => !["a", "an", "the"].includes(x));
        rel = w.slice(0, 3).join(" ");
        if (rel && hasLetter(rel)) claims.push({ end1: slot.relation.a, label: `${rel} of`, end2: slot.relation.owner, sentence: `${anchor} ${rel}`, witness });
      } else if (slot?.relations) {
        // "Tommy is Lily's father": a bond between two things on the record,
        // read by name — never a thing the ear would mint
        const byName = new Map(reader.things().filter((t) => t.name).map((t) => [t.name.toLowerCase(), t]));
        for (const l of linesOf(reply)) {
          const w = l.split(" ").map((x) => x.trim()).filter(Boolean);
          const is = w.findIndex((x) => x.toLowerCase() === "is" || x.toLowerCase() === "was");
          if (is < 1 || is + 2 > w.length) continue;
          const a = byName.get(w.slice(0, is).join(" ").toLowerCase());
          const poss = w[is + 1];
          const owner = poss.endsWith("'s") || poss.endsWith("’s") ? byName.get(poss.slice(0, -2).toLowerCase()) : null;
          let rel = w.slice(is + 2).join(" ");
          while (rel && [".", ",", ";", "!"].includes(rel.at(-1))) rel = rel.slice(0, -1);
          if (!a || !owner || a === owner || !rel || rel.split(" ").length > 3) continue;
          claims.push({ end1: a.id, label: `${rel.toLowerCase()} of`, end2: owner.id, sentence: l, witness });
        }
      } else if (slot?.labels) {
        // "vote count: 301" per line; the first line answers the anchor's own label
        linesOf(reply).forEach((l, i) => {
          let label = i === 0 ? slot.labels[0] : null, value = l;
          const colon = l.indexOf(":");
          if (colon > 0) { const said = l.slice(0, colon).trim().toLowerCase(); const hit = slot.labels.find((d) => said.includes(d) || d.includes(said)); if (hit) { label = hit; value = l.slice(colon + 1); } }
          value = slotValue(value, false);
          // a number asked for is the number said: "The vote count for X is 100" -> 100
          if (label && slot.numeric?.includes(label)) value = value.split(" ").map((w) => numberOf(w.split(",").join(""))).filter((v) => v != null && !Number.isNaN(v)).map(String).at(-1) ?? null;
          if (label && value && !claims.some((c) => c.label === label)) claims.push({ end1: slot.subject, label, end2: value, sentence: `${label}: ${value}`, witness });
        });
      } else if (slot) {
        let value = slotValue(reply, slot.whole, { name: !slot.phrase });
        // a phrase asked for is a clause, not a sentence: the mouth's restatement
        // of the ask ("Alice is missing her dog" for "What Alice is missing is")
        // is dropped from its front, so the record holds "her dog" (arc1: the
        // role fact read "no longer missing Alice is missing her dog")
        for (const pre of slot?.strip ?? []) if (value && value.toLowerCase().startsWith(pre.toLowerCase() + " ")) { value = value.slice(pre.length).trim(); break; }
        if (value) {
          const because = `${anchor} ${value}`;
          let subject = slot.subject;
          if (!subject && slot.label === "named" && !takeName(slot.kind, slot.parent, value)) { log({ kind: "turn", gap, prompt, reply, claims: [], ops: [], refused: `name already used: ${value}`, ms: Date.now() - t0 }); return 0; }
          if (!subject) {
            subject = reader.mint(slot.kind, slot.modifier ?? null).id;
            claims.push({ end1: subject, label: "exists", end2: slot.kind, sentence: because, witness }, { ...positioned(subject, slot.parent), sentence: because, witness });
            if (slot.parent) claims.push({ end1: slot.parent, label: "has", end2: subject, sentence: because, witness });
          }
          if (slot.label === "named") reader.rename(subject, value);
          claims.push({ end1: subject, label: slot.label, end2: value, sentence: because, witness });
          focusId = subject;
        }
      } else {
        claims = reader.read(`${anchor} ${reply}`, { witness }).claims;
      }
      // THE REPLY IS READ, NOT ONLY SLOTTED. The mouth's words are not the
      // page: what the slot did not take (the rest of the sentence, or a
      // reply that missed the slot altogether — "Each post is a discussion
      // about dolphins") is read by the ear into claims about the thing asked
      // about. A claim lands only on a thing already on the record or on a
      // new part of the thing asked about — a reading never invents a stray
      // (a post filed under the search box) and never renames what has a name.
      const about = focusId ?? slot?.subject ?? null;
      if (about && !slot?.rows && !slot?.list) {
        const known = new Set(reader.things().map((t) => t.id));
        reader.focus(about);
        const read = reader.read(`${anchor} ${reply}`, { witness }).claims;
        const partsOfAbout = new Set(read.filter((c) => c.end1 === about && c.label === "has").map((c) => c.end2));
        const taken = new Set(claims.map((c) => `${c.end1}|${c.label}|${c.end2}`));
        for (const c of read) {
          if (taken.has(`${c.end1}|${c.label}|${c.end2}`) || c.label === "exists") continue;
          if (c.label === "named" && known.has(c.end1)) continue;
          if (slot?.labels && c.end1 === about && slot.labels.includes(c.label)) continue;
          if (known.has(c.end1) || partsOfAbout.has(c.end1) || c.end1 === about) claims.push(c);
        }
      }
      const ops = hear(claims);
      log({ kind: "turn", gap, prompt, reply, claims: show(claims), ops, ms: Date.now() - t0 });
      // what this turn added: a claim heard again (SYN) is agreement, not progress
      return ops.filter((o) => o.operator === "INS").length;
    };

    // Siblings are told apart by name: a name already used by a thing of the
    // same kind under the same parent is not taken again (five profiles all
    // called "DolphinDolphin" are one name heard five times, not five profiles)
    const used = new Map();
    const takeName = (kind, parent, name) => {
      const k = `${kind}|${parent ?? "top"}`, n = String(name).trim().toLowerCase();
      if (!used.has(k)) used.set(k, new Set());
      if (used.get(k).has(n)) return false;
      used.get(k).add(n);
      return true;
    };

    // The request is the first talk: what it names is on the record before
    // the mouth says anything (witness "request").
    // the whole is on the record first: it holds the parts the request
    // counts at its top ("three posts" are the site's posts), so there is
    // something to reason over — a total, a top — at every level
    const wholeId = reader.mint(medium.root).id;
    spec.wholeId = wholeId;
    const seeded = [{ end1: wholeId, label: "exists", end2: medium.root, sentence: what, witness: "request" }];
    // who it is for is the person's own answer: on the record, never passed around it
    if (request.forWhom) seeded.push({ end1: wholeId, label: "for whom", end2: String(request.forWhom), sentence: String(request.forWhom), witness: "request" });
    for (const c of spec.counted) for (const nm of c.names) {
      takeName(c.kind, null, nm);
      const t = reader.mint(c.kind, c.modifier, nm);
      seeded.push({ end1: t.id, label: "exists", end2: c.kind, sentence: what, witness: "request" }, { end1: t.id, label: "named", end2: nm, sentence: what, witness: "request" });
      if (!c.per) seeded.push({ end1: wholeId, label: "has", end2: t.id, sentence: what, witness: "request" }, { ...positioned(t.id, wholeId), sentence: what, witness: "request" });
    }
    const seedTalk = spec.named.flatMap((p) => {
      const be = p.plural ? "are" : "is";
      const lines = [`There ${be} ${p.plural ? "" : "a "}${p.phrase}.`];
      if (p.purpose) lines.push(`The ${p.phrase} ${be} used ${p.purpose.split(" ")[0].endsWith("ing") ? "for" : "to"} ${p.purpose}.`);
      if (medium.fieldHolders.has(p.kind)) for (const d of p.details) lines.push(`The ${p.phrase} has a ${d} field.`);
      return lines;
    }).join(" ");
    if (seedTalk) seeded.push(...reader.read(seedTalk, { witness: "request" }).claims);
    if (seeded.length) { hear(seeded); log({ kind: "seed", talk: seedTalk, claims: show(seeded) }); }

    // THE FRAME an ask carries. "task" (the default): the task at hand and
    // nothing else — "Name 6 posts in r/bottlenose." carries its own path, and
    // the whole is named only where the task IS the whole (its name, what its
    // parts show). "whole": every ask also opens with what the build is and
    // who it is for — kept as the arm "task" is measured against.
    const wholeLine = `We are describing ${spec.whole ?? medium.wholeFallback}, for ${request.forWhom ?? "the people who will use it"}. Talk about it in short plain sentences, one fact per sentence.`;
    const context = frame === "whole" ? wholeLine : "";
    const framed = (q) => (context ? `${context}\n${q}` : q);

    // A THIN REQUEST ("make a reddit but only for dolphin content") names its
    // parts and no details for any of them. What each part shows is the
    // mouth's to know (what a reddit post carries is common knowledge), so it
    // is asked once per part, near the top — "what does each post show?" —
    // and the answer's lines become that part's details. A request that names
    // any detail itself is never second-guessed.
    if (medium.askWhatPartsShow !== false && !spec.counted.some((c) => c.details.length)) {
      const partOf = (kind) => spec.counted.find((c) => c.kind === kind);
      const depth = (c, seen = new Set()) => (!c.per || seen.has(c) ? 0 : (seen.add(c), 1 + depth(partOf(c.per) ?? {}, seen)));
      // REASONED FIRST, ASKED ONLY WHERE THE SOURCE IS SILENT. What a reddit
      // post carries is written down somewhere: the thing the request names
      // is looked up (an injected `lookup`, a cached encyclopedia lead), read
      // by organs/kind-read.js (Linnaeus) and reasoned over — a post is a
      // kind of content, content is voted on by members, so a post carries a
      // vote count. Each detail so found is on the ledger with its source and
      // the sentence it rests on; only a part the source says nothing about
      // is asked of the mouth.
      const wholeWords = String(spec.whole ?? "").split(" ");
      const forAt = wholeWords.indexOf("for");
      const term = (forAt > 0 ? wholeWords.slice(0, forAt) : wholeWords).filter((w) => !["a", "an", "the"].includes(w.toLowerCase())).at(-1) ?? null;
      let facts = [];
      let sourceWitness = `source:${term}`, sourceLicense = null;
      if (lookup && term && universe.lookups) {
        // a lookup answers text, or { text, url, revision, license }: the
        // witness names the page and revision read, and the license rides
        // with the quoted sentence
        const got = await lookup(term).catch(() => null);
        const text = typeof got === "string" ? got : got?.text ?? null;
        if (got && typeof got === "object" && got.url) sourceWitness = `source:${got.url}${got.revision ? `@${got.revision}` : ""}`;
        sourceLicense = got && typeof got === "object" ? got.license ?? null : null;
        if (text) facts = readKinds(text, { parse, sentences }).facts;
        log({ kind: "source", term, found: !!text, witness: sourceWitness, license: sourceLicense, facts: facts.map((f) => `${f.a} ${f.rel} ${f.b}${f.agent ? ` (by ${f.agent})` : ""}`) });
      }
      let showsOps = [];
      for (const c of spec.counted.filter((x) => depth(x) <= 1)) {
        const found = facts.length ? detailsFor(facts, c.kind).filter((d) => !["title", "name"].includes(d.detail)).slice(0, 3) : [];
        if (found.length) {
          for (const d of found) {
            c.details.push(d.detail);
            notes = N.hear(notes, { end1: `kind:${c.kind}`, label: "shows", end2: d.detail, witness: sourceWitness, because: `${d.because[0]}${sourceLicense ? ` [${sourceLicense}]` : ""}` });
          }
          log({ kind: "reasoned", gap: `shows:${c.kind}`, from: sourceWitness, claims: found.map((d) => `${c.kind} shows ${d.detail}${d.inherited ? " (inherited)" : ""}`), because: found.flatMap((d) => d.because) });
          continue;
        }
        asks++;
        // a sentence to finish, not a list to write: "Each post shows its
        // name, its" -> "upvotes, its comments and its author."
        const anchor = `Each ${phraseOf(c)} ${medium.showsVerb} its name, its`;
        const prompt = `${framed(`What does each ${phraseOf(c)} in ${spec.whole ?? medium.wholeFallback} ${medium.showsVerb === "shows" ? "show" : "have"}?`)}\n\n${anchor}`;
        let reply = String(await ask(prompt, { stage: `shows:${c.kind}` }) ?? "").trim();
        // the mouth often says the sentence again from its start ("Each post
        // shows its title, its …"): read what follows its own "shows"
        const words = reply.split(" ");
        const at = words.findIndex((w) => w.toLowerCase() === "shows" || w.toLowerCase() === "show");
        if (at >= 0 && at < 4) reply = words.slice(at + 1).join(" ");
        const shown = itemsOf(reply).filter((x) => x.split(" ").length <= 3 && !["title", "name"].includes(x)).slice(0, 3);
        c.details.push(...shown);
        // what the mouth says a part shows is on the record like anything it says
        const before = notes.entries.length;
        for (const d of shown) notes = N.hear(notes, { end1: `kind:${c.kind}`, label: "shows", end2: d, witness: `talk:${mouth}#ask${asks}`, because: `${anchor} ${reply}`.slice(0, 240) });
        showsOps = notes.entries.slice(before).map((e) => e.operator);
        log({ kind: "turn", gap: `shows:${c.kind}`, prompt, reply, claims: shown.map((x) => `${c.kind} shows ${x}`), ops: showsOps.map((operator) => ({ operator })), ms: 0 });
      }
    }
    // the whole is named first — unless the medium names it last, once its
    // parts exist (a story's title is said of what happens in it: DEF of the
    // whole after its parts, and never a title the parts are then asked "in")
    const nameWhole = () => turn("opening", framed(`What is ${spec.whole ?? medium.wholeFallback}${request.forWhom ? ` for ${request.forWhom}` : ""} called?`), "It is called", { subject: wholeId, label: "named" });
    if (!medium.nameWholeLast) await nameWhole();

    // ── REASONING OVER THE RECORD (organs/talk-reason.js, Peirce) ──────────
    // The talk is claims now, so the engine reasons over them with no model:
    // it derives what nobody said (totals, how many, the top part), corrects
    // a heard value the record contradicts, and retracts a part heard twice.
    // Every act lands on the ledger — a derived claim carries the witness
    // kind "derived:<rule>" and its premises; a correction or retraction is
    // a REC with its reason — and a conclusion whose premises changed is
    // withdrawn, so the record stays true to itself after every edit.
    const settle = () => {
      // LINES THAT OPEN ALIKE BEYOND CHANCE (the-fold/document-ledger.js,
      // Fisher's word-order null — the same test a chat's boredom is read
      // by): a medium that gates it retracts every repeat after the first,
      // so the gap reopens and is asked again with the openings on the record
      let gated = 0;
      if (medium.gateRepeatedLines) {
        // tested among SIBLINGS (one chapter's scenes, the story's chapters):
        // across a whole long outline, lines about one person open alike by
        // nature — tested book-wide the gate retracted 211 of ~300 lines a
        // round on the scale run and the outline never completed
        const all = beliefOf(N.fold(notes), reader.things()).filter((t) => t.kind !== medium.root).map((t) => ({ t, v: t.props.find((q) => q.label === "says")?.value })).filter((x) => x.v && x.v.length > 20).sort((a, b) => (a.t.position ?? 0) - (b.t.position ?? 0));
        const groups = new Map();
        for (const x of all) { const g = `${x.t.parent ?? "top"}|${x.t.kind}`; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); }
        for (const lines of groups.values()) {
        const r = lines.length >= 3 ? detectRepetition(lines.map((x) => x.v)) : { significant: false, repeated: [] };
        if (r.significant) {
          const head = (v) => v.toLowerCase().split(" ").slice(0, 3).join(" ");
          const kept = new Set();
          for (const x of lines) {
            if (!r.repeated.includes(x.v)) continue;
            const h = head(x.v);
            if (!kept.has(h)) { kept.add(h); continue; }
            for (const n of N.fold(notes).filter((n) => n.end1 === x.t.id || n.end2 === x.t.id)) { const d = N.concede(notes, n.id, { trigger: `opens as other lines do ("${h}…"; ${r.basis})` }); if (!d.refused) notes = d.log; }
            gated++;
            spec.openings = [...new Set([...(spec.openings ?? []), h])];
          }
        }
        }
      }
      const fold = N.fold(notes);
      const r = reason({ fold, belief: beliefOf(fold, reader.things()), spec });
      const at = (end1, label, end2) => fold.find((n) => n.end1 === end1 && n.label === label && n.end2 === end2);
      const want = new Map(r.derive.map((d) => [`${d.end1}|${d.label}|${d.end2}`, d]));
      const acts = { derived: 0, withdrawn: 0, corrected: 0, retracted: gated };
      // a conclusion no longer supported by its premises is withdrawn
      // only this reasoner's own conclusions are its to withdraw: a part a
      // medium derived (a bar continued from the heard bars) answers to its
      // own premises, not to reason()'s list
      for (const n of fold.filter(isDerived).filter((x) => x.witnesses.every((w) => REASON_RULES.has(String(w).slice("derived:".length).split("#")[0])))) {
        if (want.has(`${n.end1}|${n.label}|${n.end2}`)) continue;
        const done = N.concede(notes, n.id, { trigger: "its premises changed" });
        if (!done.refused) { notes = done.log; acts.withdrawn++; }
      }
      // a conclusion already on the record is re-heard when its premises
      // changed though its value did not ("scenes shown: 5" after one scene
      // was retracted and another heard): the ledger never resurrects a
      // conceded note, so it is re-based under a witness fingerprinted by
      // its premises, and its because names the premises it now rests on
      const becauseNow = new Map(notes.entries.filter((e) => e.because != null).map((e) => [e.task_id, e.because]));
      const liveByKey = new Map(N.fold(notes).map((n) => [`${n.end1}|${n.label}|${n.end2}`, n]));
      for (const [key, d] of want) {
        const premises = (d.premises ?? []).map(String);
        const onRecord = liveByKey.get(key);
        if (onRecord && premisesOf(becauseNow.get(onRecord.id)).join("\u0000") === premises.join("\u0000")) continue;
        const print = createHash("sha256").update(premises.join("\u0000")).digest("hex").slice(0, 8);
        notes = N.hear(notes, { end1: d.end1, label: d.label, end2: d.end2, witness: `derived:${d.rule}#${print}`, because: `${d.because} [premises: ${premises.join(", ")}]` });
        acts.derived++;
      }
      acts.corrected = r.correct.length;
      for (const d of r.drop ?? []) {
        const heard = at(d.end1, d.label, d.end2);
        if (!heard || isDerived(heard)) continue;
        const done = N.concede(notes, heard.id, { trigger: d.trigger });
        if (!done.refused) { notes = done.log; acts.dropped = (acts.dropped ?? 0) + 1; }
      }
      for (const x of r.retract) {
        for (const n of N.fold(notes).filter((n) => n.end1 === x.thing || n.end2 === x.thing)) {
          const done = N.concede(notes, n.id, { trigger: x.trigger });
          if (!done.refused) notes = done.log;
        }
        acts.retracted++;
      }
      if (acts.derived || acts.withdrawn || acts.corrected || acts.retracted || acts.dropped) log({ kind: "reason", ...acts, derive: r.derive.map((d) => `${d.end1} —${d.label}→ ${d.end2}`), correct: r.correct.map((c) => c.trigger), retract: r.retract.map((x) => x.trigger), drop: (r.drop ?? []).map((d) => d.trigger) });
      return acts;
    };

    for (let cycle = 0; cycle < REASON_CYCLES; cycle++) {
    while (asks < maxAsks) {
      const belief = beliefOf(N.fold(notes), reader.things());
      const next = nextGap(belief, spec, tried);
      if (!next) break;
      // SOURCED BEFORE ASKED: a medium that can take a part from a licensed
      // source itself (a bar snipped from a score, a rule from a document)
      // does, and the mouth is not asked for it. What it takes is heard with
      // the medium's source witness and the span it was cut from.
      if (medium.sourcePart && (next.part || next.parts)) {
        let sourced = 0;
        for (const pt of next.parts ?? [next.part]) {
          const parent = belief.find((t) => t.id === pt.parentId) ?? null;
          const grand = parent?.parent ? belief.find((t) => t.id === parent.parent) : null;
          const parentOrdinal = grand ? grand.children.indexOf(parent.id) : 0;
          for (let k = 0; k < pt.missing; k++) {
            const got = await medium.sourcePart({ kind: pt.c.kind, modifier: pt.c.modifier ?? null, parentId: pt.parentId, parentOrdinal, index: pt.have + k, perParent: pt.c.n, spec, fold: N.fold(notes) });
            if (!got) break;
            const id = reader.mint(pt.c.kind, pt.c.modifier ?? null).id;
            const claims = [{ end1: id, label: "exists", end2: pt.c.kind }, positioned(id, pt.parentId), ...(pt.parentId ? [{ end1: pt.parentId, label: "has", end2: id }] : []), ...(got.name ? [{ end1: id, label: "named", end2: got.name }] : []), ...(got.claims ?? []).map((c) => ({ end1: id, ...c }))];
            for (const c of claims) notes = N.hear(notes, { end1: c.end1, label: c.label, end2: c.end2, witness: got.witness, because: got.because ?? "" });
            if (got.name) reader.rename(id, got.name);
            sourced++;
          }
        }
        log({ kind: "sourced", gap: next.key, sourced });
        if (sourced) continue;
      }
      // a gap is let go after two asks in a row that heard nothing for it
      if ((tried.get(next.key) ?? 0) >= 2) {
        // NUL on the record, not only in the log: what was asked for and not
        // heard is a declared void, scoped to the asks that found nothing
        const voids = [];
        const scope = { sources: [`talk:${mouth}`], read: tried.get(next.key) };
        const declare = (end1, label, end2 = null) => { const r = N.declareVoid(notes, { end1, label, end2, scope, because: `asked ${tried.get(next.key)} times, nothing heard (${next.key})` }); if (!r.refused) { notes = r.log; voids.push(`${end1} ${label}${end2 ? ` ${end2}` : ""}`); } };
        if (next.part || next.parts) for (const pt of next.parts ?? [next.part]) declare(pt.parentId ?? wholeId, "has", `a ${pt.c.kind}`);
        else if (next.slot?.rows) for (const row of next.slot.rows) for (const lab of next.slot.labels ?? [next.slot.label]) declare(row.id, lab);
        else if (next.slot?.subject) for (const lab of next.slot.labels ?? [next.slot.label]) declare(next.slot.subject, lab);
        else declare(wholeId, "has", next.key);
        log({ kind: "gap_abandoned", gap: next.key, why: "asked twice, nothing heard", voids });
        spec.abandoned = [...(spec.abandoned ?? []), next.key];
        continue;
      }
      const heard = await turn(next.key, framed(next.question), next.anchor, next.slot ?? null);
      // a part asked to be described is asked once; any other gap is asked
      // again while each ask hears something for it
      tried.set(next.key, heard && !next.once ? 0 : (tried.get(next.key) ?? 0) + 1);
      if (next.once) spec.abandoned = [...(spec.abandoned ?? []), next.key];
    }
    // the talk has no gap left (or no asks): reason over what it said; a part
    // retracted reopens its gap and the conversation goes on (recursively)
    const acts = settle();
    if ((!acts.retracted && !acts.dropped) || asks >= maxAsks) break;
    }

    if (medium.nameWholeLast) {
      // what the whole is called, said of what happens in it
      const lines = beliefOf(N.fold(notes), reader.things()).filter((t) => t.parent === wholeId).map((t) => t.props.find((p) => p.label === "says")?.value).filter(Boolean).slice(0, 3);
      await turn("opening", framed(`${lines.length ? `${lines.join(" ")}\n` : ""}What is ${spec.whole ?? medium.wholeFallback} called?`), "It is called", { subject: wholeId, label: "named" });
    }
    const belief = beliefOf(N.fold(notes), reader.things());
    // the renderer returns the artifact and the account of every element on
    // it; the account is checked against the artifact itself (Ostrom)
    const rendered = render(belief, { what, forWhom: request.forWhom });
    const artifact = typeof rendered === "string" ? rendered : rendered.artifact;
    const map = typeof rendered === "string" ? null : rendered.map;
    const fold = N.fold(notes);
    const cover = map ? uncovered({ artifact, map, fold, engineWords: rendered.engineWords ?? {}, ...(medium.leaves ? { leaves: medium.leaves } : {}) }) : { ok: false, uncovered: [], unresolved: [{ text: "", why: ["the renderer returned no map"] }], covered: 0 };
    log({ kind: "provenance", ok: cover.ok, covered: cover.covered, uncovered: cover.uncovered.slice(0, 12).map((l) => `${l.where}: ${l.text}`), unresolved: cover.unresolved.slice(0, 12).map((u) => `${u.text}: ${u.why.join("; ")}`) });
    const verdict = await verify(medium.kind, artifact);
    // the record's own order: every act after its thing's INS, every
    // conclusion with its premises on the record (organs/claim-acts.js)
    const helix = helixCheck({ fold, entries: notes.entries });
    log({ kind: "helix", ok: helix.ok, acts: helix.acts, violations: helix.violations.slice(0, 12) });
    // sealed only when the medium's own check, the provenance check and the helix all hold
    let sealed = null;
    try {
      sealed = sealArtifact({
        kind: "TalkBuild@1",
        producer: { assembly: "assembly:terkel", version: 1 },
        material: { source: `request:${what}`, hash: createHash("sha256").update(JSON.stringify({ what, more: request.more ?? [], forWhom: request.forWhom ?? null })).digest("hex"), extent: fold.length, unit: "notes" },
        regime: { frame, maxAsks, reasonCycles: REASON_CYCLES, mouth, medium: medium.kind, style: rendered?.style ?? null },
        dropped: ["the mouth's raw replies (kept in the log and the ledger's because, not in the artifact)"],
        body: { artifact: typeof artifact === "string" ? artifact : Buffer.from(artifact).toString("base64"), encoding: typeof artifact === "string" ? "text" : "base64", map },
        sealedAtSequence: notes.entries.length,
        conformance: { passed: verdict.ok === true && cover.ok && helix.ok, checks: [...(verdict.checks ?? []), `provenance: ${cover.covered} elements accounted for, ${cover.uncovered.length} uncovered, ${cover.unresolved.length} unresolved`, `helix: ${helix.violations.length} act${helix.violations.length === 1 ? "" : "s"} out of order; acts ${Object.entries(helix.acts).map(([k, v]) => `${k} ${v}`).join(", ")}`] },
      });
    } catch (err) { log({ kind: "unsealed", why: String(err?.message ?? err).slice(0, 200) }); }
    log({ kind: "set_down", asks, things: belief.length, notes: N.fold(notes).length, ok: verdict.ok });
    return { schema: TALK_BUILD_SCHEMA, kind: medium.kind, belief, artifact, map, provenance: cover, helix, sealed, verdict, asks, notes, spec };
  }

  /** The first thing the belief still lacks: a plain question, an anchor, and
   *  the slot its answer fills. Breadth first: the parts at one depth are all
   *  counted and described before the parts inside them are asked for, so a
   *  build cut short by its ask budget is shallow everywhere, not deep in one
   *  corner. */
  function nextGap(belief, spec, tried = new Map()) {
    const abandoned = new Set(spec.abandoned ?? []);
    // a retry is never the same ask: the rows turn, so a different one opens the anchor
    const turned = (key, list) => { const k = (tried.get(key) ?? 0) % Math.max(1, list.length); return [...list.slice(k), ...list.slice(0, k)]; };
    // a thing is one of a counted part when its kind matches and its modifier
    // is that part's own (the moderation queue's reported posts are not a
    // community's posts)
    const isOf = (t, c) => kindMatches(t, c.kind) && (c.modifier ? t.modifier === c.modifier : !spec.counted.some((o) => o !== c && o.kind === c.kind && o.modifier && t.modifier === o.modifier));
    const partOf = (kind) => spec.counted.find((c) => c.kind === kind && !c.modifier) ?? spec.counted.find((c) => c.kind === kind);
    const all = (c) => belief.filter((t) => isOf(t, c));
    const depth = (c, seen = new Set()) => { if (!c.per || seen.has(c)) return 0; seen.add(c); const p = partOf(c.per); return p ? 1 + depth(p, seen) : 1; };
    // a part with nothing to show but what it says (a comment) — unless the
    // medium names that kind always (a story's people have names, not lines)
    const says = (c) => !c.details.length && !medium.namedKinds?.has(c.kind);
    // a content ask carries the request's own constraint ("for dolphin content")
    // what the medium knows the mouth should hear first (a story's people, by
    // name, before any line of it is asked): facts, never instructions
    // the openings the record already holds, said as a fact when lines repeated them
    const opened = spec.openings?.length ? `Lines already begin ${spec.openings.map((o) => `"${o.charAt(0).toUpperCase()}${o.slice(1)}"`).join(", ")}.` : "";
    const known = [medium.factsFor ? medium.factsFor(belief) : "", opened].filter(Boolean).join("\n");
    const scoped = (q) => `${known ? `${known}\n` : ""}${spec.topic ? `${q} All of it is ${spec.topic}.` : q}`;
    const sayVerb = medium.saysVerb ?? "Write", sayWhat = medium.saysWhat ?? "what it says";
    // in a told universe a person's details are theirs, not the topic's: the
    // topic scoping every detail made four of five characters "lighthouse
    // keepers" (slice 1, 2026-09-27)
    const scopeDetails = universeOf({ medium }).kind !== "stipulated";
    // THE UNIVERSE IN DEPENDENCY ORDER: once its referents are on the record
    // (INS), the medium may ask how they are bound to each other (CON) before
    // any line of the telling is asked
    const framed0 = medium.frameGaps?.(belief, spec, abandoned, known);
    if (framed0) return framed0;
    const deepest = Math.max(0, ...spec.counted.map((c) => depth(c)));
    for (let d = 0; d <= deepest; d++) {
      const level = spec.counted.filter((c) => depth(c) === d);
      // 1. counted parts short of their count, per parent
      for (const c of level) {
        const perPart = c.per ? partOf(c.per) : null;
        const parents = c.per ? (perPart ? all(perPart) : belief.filter((t) => kindMatches(t, c.per))) : [null];
        // few missing under each of several parents ("two comments on each
        // post"): one ask covers every parent in a group, a row each
        if (c.per && c.n <= 2) {
          const lacking = (parents.filter((p) => all(c).filter((t) => t.parent === p.id).length < c.n && !abandoned.has(`count:${phraseOf(c)}:${p.id}`)));
          const byGroup = new Map();
          for (const p of lacking) byGroup.set(p.parent ?? "top", [...(byGroup.get(p.parent ?? "top") ?? []), p]);
          for (const [g, ps] of byGroup) {
            if (ps.length < 2) continue;
            const key = `rows:${phraseOf(c)}:${g}`;
            if (abandoned.has(key)) continue;
            ps.splice(0, ps.length, ...turned(key, ps));
            const group = belief.find((t) => t.id === g);
            const listed = ps.map((p, i) => `${i + 1}. ${title(p)}`).join("\n");
            const one = c.phrase.endsWith("s") ? phraseOf(c) : c.phrase;
            return { key, parts: ps.map((p) => ({ c, parentId: p.id, have: all(c).filter((t) => t.parent === p.id).length, missing: c.n - all(c).filter((t) => t.parent === p.id).length })), slot: { rows: ps.map((p) => ({ id: p.id, title: title(p) })), mint: true, kind: c.kind, modifier: c.modifier, label: says(c) ? "says" : "named", whole: says(c) }, question: `${says(c) && known ? `${known}\n` : ""}Here are ${ps.length} ${partOf(c.per)?.phrase ?? c.per}${group ? ` in ${title(group)}` : ""}:\n${listed}\n${says(c) ? sayVerb : "Name"} one ${one} for each, one per line as "name: ${says(c) ? sayWhat : "its name"}".${spec.topic ? ` All of it is ${spec.topic}.` : ""}`, anchor: `1. ${title(ps[0])}:` };
          }
        }
        for (const p of parents) {
          const have = all(c).filter((t) => (p ? t.parent === p.id : true));
          const key = `count:${phraseOf(c)}:${p ? p.id : "top"}`;
          const missing = c.n - have.length;
          if (missing <= 0 || abandoned.has(key)) continue;
          const where = p ? ` ${says(c) ? "on" : "in"} ${title(p)}` : c.within ? ` in the ${c.within}` : "";
          const others = have.length ? `, different from: ${have.map(title).join("; ")}` : "";
          const slot = { kind: c.kind, modifier: c.modifier, parent: p?.id ?? spec.wholeId ?? null, label: says(c) ? "says" : "named", whole: says(c), list: missing };
          const verb = says(c) ? sayVerb : "Name";
          const part = { c, parentId: p?.id ?? spec.wholeId ?? null, have: have.length, missing };
          // a told world's people are named for themselves, never for the topic
          // (the topic line made eight people "Lighthouse Keeper's Daughter",
          // "… Son", "… Sister" on the scale run)
          const askFor = (q) => (!says(c) && !scopeDetails ? `${known ? `${known}\n` : ""}${q}` : scoped(q));
          // THE NESTED ARCS: a medium that places each part in an arc
          // (prose-medium partRole) has its parts asked for one at a time,
          // each with the engine's facts about what happens there
          const role = says(c) && medium.partRole ? medium.partRole({ belief, parentId: p?.id ?? spec.wholeId ?? null, kind: c.kind, index: have.length, n: c.n }) : null;
          // the mouth copies the engine's placing clause into the line ("In
          // scene 3 of chapter 4, Alice …", arc1 2026-09-28): the clause is
          // the engine's, dropped from the reply like an echoed anchor
          // (arc2: 10 of 28 lines began "In scene 1 on <the chapter's line>, …" —
          // the anchor said back with "In" in front; every shape is dropped)
          const placing = `${phraseOf(c)} ${have.length + 1}`;
          const echoes = role ? [...role.facts.map((f) => f.slice(0, f.indexOf(",") + 1)).filter((e) => e.length > 1), `in ${placing}${where},`, `in ${placing}${where}`, `in ${placing},`, `in ${placing}`, `${placing}${where},`] : [];
          if (role) return { key, part: { ...part, missing: 1 }, slot: { ...slot, list: null, echoes }, role, question: askFor(`${role.facts.join(" ")}\n${verb} ${phraseOf(c)} ${have.length + 1}${where}${others}.`), anchor: `${phraseOf(c).charAt(0).toUpperCase()}${phraseOf(c).slice(1)} ${have.length + 1}${where} says:` };
          if (missing === 1) return { key, part, slot: { ...slot, list: null }, question: askFor(`${verb} one more ${phraseOf(c)}${where}${others}.`), anchor: says(c) ? `One more ${phraseOf(c)}${where} says:` : `One more ${phraseOf(c)}${where} is called` };
          return { key, part, slot, question: askFor(`${verb} ${missing} ${have.length ? "more " : ""}${c.phrase}${where}${others}. One per line, ${says(c) ? "each a short sentence" : "just the name"}.`), anchor: "1." };
        }
      }
      // 2. things at this depth missing a detail the request asked each one to
      //    show: one ask per group of siblings, a row each; the numbers a
      //    thing shows ("a vote count and a comment count") on one row
      for (const c of level) {
        const wanted = c.details.filter((x) => !["title", "name"].includes(x));
        const isNumeric = (x) => x.split(" ").includes("count") || medium.numericDetails.has(x);
        const perPart = c.per ? partOf(c.per) : null;
        const parentIds = perPart ? new Set(all(perPart).map((t) => t.id)) : null;
        const groups = new Map();
        for (const t of all(c)) { const g = t.parent ?? "top"; if (parentIds && !parentIds.has(g)) continue; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(t); }
        const asks = [...(wanted.filter(isNumeric).length ? [wanted.filter(isNumeric)] : []), ...wanted.filter((x) => !isNumeric(x)).map((x) => [x])];
        for (const labels of asks) {
          const numeric = isNumeric(labels[0]);
          const said = labels.join(" and ");
          for (const [g, sibs] of groups) {
            const key = `detail:${phraseOf(c)}:${g}:${said}`;
            const lacking = turned(key, sibs.filter((t) => labels.some((x) => !t.props.some((p) => p.label === x))));
            if (!lacking.length || abandoned.has(key)) continue;
            const parent = belief.find((t) => t.id === g);
            const listed = lacking.map((t, i) => `${i + 1}. ${title(t)}`).join("\n");
            const slot = { rows: lacking.map((t) => ({ id: t.id, title: title(t), lacks: labels.filter((x) => !t.props.some((p) => p.label === x)) })), label: labels[0], numeric, ...(labels.length > 1 ? { labels } : {}) };
            // a state ("approved") is asked as yes or no, not as a value
            const state = labels.length === 1 && labels[0].endsWith("ed") && !labels[0].includes(" ");
            const give = state ? `Say whether ${lacking.length > 1 ? "each one" : "it"} is ${labels[0]}, one per line as "name: yes" or "name: no".` : `Give the ${said} of ${lacking.length > 1 ? "each one" : "it"}${numeric ? ` as ${labels.length > 1 ? "numbers" : "a number"}` : ""}, one per line as "name: ${labels.join(", ")}".`;
            return { key, slot, question: `Here ${lacking.length > 1 ? `are ${lacking.length} ${c.phrase}` : `is a ${phraseOf(c)}`}${parent ? ` in ${title(parent)}` : ""}:\n${listed}\n${numeric || state || !scopeDetails ? `${known && !numeric && !state ? `${known}\n` : ""}${give}` : scoped(give)}`, anchor: `1. ${title(lacking[0])}:` };
          }
        }
      }
      // 3. once the top level stands: a named part nothing has been said about yet
      if (d === 0) for (const p of spec.named) {
        const key = `named:${p.phrase}`;
        if (abandoned.has(key)) continue;
        const t = belief.find((x) => kindMatches(x, p.kind) && (!p.modifier || x.modifier === p.modifier));
        if (t && (t.children.length || t.props.some((q) => q.label !== "for"))) continue;
        return { key, once: true, question: `Describe the ${p.phrase}${p.purpose ? ` (${p.purpose})` : ""}: what ${p.plural ? "they show" : "it shows"}, in one or two short sentences.`, anchor: `The ${p.phrase} ${p.plural ? "show" : "shows"}` };
      }
    }
    return null;
  }

  return { build };
}
