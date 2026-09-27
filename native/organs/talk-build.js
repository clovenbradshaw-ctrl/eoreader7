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

export const TALK_BUILD_SCHEMA = "TalkBuild@1";
/** The most asks one build may spend, set by hand 2026-09-27, not measured:
 *  raised from 80 after the ladder's largest rung (six communities, 36 posts,
 *  72 comments) stopped at 80 with its comments half asked — the 1.5b mouth
 *  answers about one row per ask — and small enough that a stuck
 *  conversation still stops. */
export const MAX_ASKS = 120;
/** Nouns a request uses that name the build itself, never a part of it —
 *  set by hand 2026-09-27; a noun here is never asked about as a thing. */
export const WHOLE_WORDS = Object.freeze(new Set(["site", "page", "website", "app", "application", "reddit", "fan", "fans", "people", "content", "thing", "things", "way", "one", "detail", "details", "count", "number", "title", "name"]));

const lowerOf = (r) => String(r?.form ?? "").toLowerCase();
const lemmaOf = (r) => String(r?.lemma ?? r?.form ?? "").toLowerCase();
const DASHES = new Set(["—", "–", "-", "--"]);
const INSIDE_EACH = new Set(["under", "in", "on", "for", "per", "about"]);
// words that size or date a thing rather than say what kind it is ("two SHORT
// comments", "a NEW post") — dropped from a modifier
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
export function specOf(request, { parse, sentences }) {
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
    const toTop = () => { mode = "top"; closeAfter = false; };
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const w = lowerOf(t);
      if (w === ";") { toTop(); owner = null; sawEach = false; continue; }
      if (w === ",") { if (mode === "for" || (mode === "with" && lowerOf(toks[i + 1]) === "and")) toTop(); continue; }
      if (w === "with") { if (owner) mode = "with"; closeAfter = false; continue; }
      if (w === "each") { sawEach = true; continue; }
      if (w === "and" && mode === "with") { closeAfter = true; continue; }
      if (t.upos === "VERB" && !isMod(t, toks[i + 1], toks[i - 1]) && !String(t.form).includes("/")) { if (owner) { mode = "for"; owner.purpose.push(w); } continue; }
      // a noun phrase opens at a numeral, a determiner, or a bare noun or adjective
      const n = numberOf(t.form);
      const numeral = n != null && (t.upos === "NUM" || t.deprel === "nummod");
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
      if (lowerOf(toks[i + 1]) === "of") { i++; continue; }        // "a section of …" frames what follows
      const many = numeral && n > 1;
      if (mode === "with" && !many && owner) {
        owner.details.push(phrase);
        if (closeAfter) toTop();
        continue;
      }
      if (mode === "for" && !many) { if (owner) owner.purpose.push(phrase); continue; }
      if (WHOLE_WORDS.has(kind)) { owner = null; toTop(); sawEach = false; continue; }
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
  return { counted, named, whole: words.join(" ") || null };
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
    if (!a || n.label === "exists") continue;
    if (n.label === "has" && byId.has(n.end2)) { const b = byId.get(n.end2); if (!b.parent && b !== a) { b.parent = a.id; a.children.push(b.id); } continue; }
    if (n.label === "named") { a.name = n.end2; continue; }
    a.props.push({ label: n.label, value: n.end2 });
  }
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
const title = (t) => t.name ?? `the ${t.modifier ? `${t.modifier} ` : ""}${t.kind}`;
const phraseOf = (c) => [c.modifier, c.kind].filter(Boolean).join(" ");
// The slot's value is the reply up to its first break: "Superpod sighting, with
// 301 upvotes" -> "Superpod sighting". A said-slot keeps its whole first sentence.
const BREAKS = new Set([",", ";", ":", "—", "–", "(", "\n"]);
function slotValue(reply, whole) {
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
/** Seed words set by hand 2026-09-27: a named part of this kind whose request
 *  lists details ("a form … with a title and a community") holds them as fields. */
export const FIELD_HOLDERS = Object.freeze(new Set(["form"]));

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
export function makeTalkBuild({ ask, parse, sentences, render, verify = async () => ({ ok: true, checks: [] }), log = () => {}, maxAsks = MAX_ASKS, frame = "task" }) {
  async function build(request) {
    const what = request.what;
    // the person's answers to the build's questions ("three communities, with
    // four posts each") are the request too: read after it, in their words
    const more = (request.more ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);
    const spec = specOf([what, ...more.map((m) => (m.endsWith(".") ? m : `${m}.`))].join(" "), { parse, sentences });
    const firstWhole = specOf(what, { parse, sentences }).whole;
    if (firstWhole) spec.whole = firstWhole;
    log({ kind: "spec", spec });
    const reader = makeTalkReader({ parse, sentences });
    const N = makeNotes();
    let notes = N.createNotes({ frame: { request: what, forWhom: request.forWhom ?? null, reader: "organs/talk-reader.js" } });
    let asks = 0;
    const tried = new Map();
    const hear = (claims) => {
      const before = notes.entries.length;
      for (const c of claims) notes = N.hear(notes, { end1: c.end1, label: c.label, end2: c.end2, witness: c.witness, because: c.sentence });
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
      const witness = `talk:${asks}`;
      let claims = [];
      let focusId = null;
      if (slot?.list) {
        // one value per line: "1. Superpod sighting" / "- Superpod sighting"
        const values = linesOf(reply).map((l) => slotValue(l, slot.whole)).filter(Boolean).slice(0, slot.list);
        for (const value of values) {
          if (slot.label === "named" && !takeName(slot.kind, slot.parent, value)) continue;
          const because = `${anchor} ${value}`;
          const subject = reader.mint(slot.kind, slot.modifier ?? null).id;
          claims.push({ end1: subject, label: "exists", end2: slot.kind, sentence: because, witness });
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
            claims.push({ end1: subject, label: "exists", end2: slot.kind, sentence: `${row.title}: ${value}`, witness }, { end1: row.id, label: "has", end2: subject, sentence: `${row.title}: ${value}`, witness });
            if (slot.label === "named") reader.rename(subject, value);
            claims.push({ end1: subject, label: slot.label, end2: value, sentence: `${row.title}: ${value}`, witness });
          } else claims.push({ end1: row.id, label: slot.label, end2: value, sentence: `${row.title}: ${slot.label} ${value}`, witness });
        });
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
        const value = slotValue(reply, slot.whole);
        if (value) {
          const because = `${anchor} ${value}`;
          let subject = slot.subject;
          if (!subject && slot.label === "named" && !takeName(slot.kind, slot.parent, value)) { log({ kind: "turn", gap, prompt, reply, claims: [], ops: [], refused: `name already used: ${value}`, ms: Date.now() - t0 }); return 0; }
          if (!subject) {
            subject = reader.mint(slot.kind, slot.modifier ?? null).id;
            claims.push({ end1: subject, label: "exists", end2: slot.kind, sentence: because, witness });
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
    const seeded = [];
    for (const c of spec.counted) for (const nm of c.names) {
      takeName(c.kind, null, nm);
      const t = reader.mint(c.kind, c.modifier, nm);
      seeded.push({ end1: t.id, label: "exists", end2: c.kind, sentence: what, witness: "request" }, { end1: t.id, label: "named", end2: nm, sentence: what, witness: "request" });
    }
    const seedTalk = spec.named.flatMap((p) => {
      const be = p.plural ? "are" : "is";
      const lines = [`There ${be} ${p.plural ? "" : "a "}${p.phrase}.`];
      if (p.purpose) lines.push(`The ${p.phrase} ${be} used ${p.purpose.split(" ")[0].endsWith("ing") ? "for" : "to"} ${p.purpose}.`);
      if (FIELD_HOLDERS.has(p.kind)) for (const d of p.details) lines.push(`The ${p.phrase} has a ${d} field.`);
      return lines;
    }).join(" ");
    if (seedTalk) seeded.push(...reader.read(seedTalk, { witness: "request" }).claims);
    if (seeded.length) { hear(seeded); log({ kind: "seed", talk: seedTalk, claims: show(seeded) }); }

    // THE FRAME an ask carries. "task" (the default): the task at hand and
    // nothing else — "Name 6 posts in r/bottlenose." carries its own path, and
    // the whole is named only where the task IS the whole (its name, what its
    // parts show). "whole": every ask also opens with what the build is and
    // who it is for — kept as the arm "task" is measured against.
    const wholeLine = `We are describing ${spec.whole ?? "a site"}, for ${request.forWhom ?? "the people who will use it"}. Talk about it in short plain sentences, one fact per sentence.`;
    const context = frame === "whole" ? wholeLine : "";
    const framed = (q) => (context ? `${context}\n${q}` : q);

    // A THIN REQUEST ("make a reddit but only for dolphin content") names its
    // parts and no details for any of them. What each part shows is the
    // mouth's to know (what a reddit post carries is common knowledge), so it
    // is asked once per part, near the top — "what does each post show?" —
    // and the answer's lines become that part's details. A request that names
    // any detail itself is never second-guessed.
    if (!spec.counted.some((c) => c.details.length)) {
      const partOf = (kind) => spec.counted.find((c) => c.kind === kind);
      const depth = (c, seen = new Set()) => (!c.per || seen.has(c) ? 0 : (seen.add(c), 1 + depth(partOf(c.per) ?? {}, seen)));
      for (const c of spec.counted.filter((x) => depth(x) <= 1)) {
        asks++;
        // a sentence to finish, not a list to write: "Each post shows its
        // name, its" -> "upvotes, its comments and its author."
        const anchor = `Each ${phraseOf(c)} shows its name, its`;
        const prompt = `${framed(`What does each ${phraseOf(c)} on ${spec.whole ?? "the site"} show?`)}\n\n${anchor}`;
        let reply = String(await ask(prompt, { stage: `shows:${c.kind}` }) ?? "").trim();
        // the mouth often says the sentence again from its start ("Each post
        // shows its title, its …"): read what follows its own "shows"
        const words = reply.split(" ");
        const at = words.findIndex((w) => w.toLowerCase() === "shows" || w.toLowerCase() === "show");
        if (at >= 0 && at < 4) reply = words.slice(at + 1).join(" ");
        const shown = itemsOf(reply).filter((x) => x.split(" ").length <= 3 && !["title", "name"].includes(x)).slice(0, 3);
        c.details.push(...shown);
        log({ kind: "turn", gap: `shows:${c.kind}`, prompt, reply, claims: shown.map((x) => `${c.kind} shows ${x}`), ops: [], ms: 0 });
      }
    }
    await turn("opening", framed(`What is ${spec.whole ?? "the site"}${request.forWhom ? ` for ${request.forWhom}` : ""} called?`), "It is called", { subject: reader.mint("site").id, label: "named" });

    while (asks < maxAsks) {
      const belief = beliefOf(N.fold(notes), reader.things());
      const next = nextGap(belief, spec, tried);
      if (!next) break;
      // a gap is let go after two asks in a row that heard nothing for it
      if ((tried.get(next.key) ?? 0) >= 2) { log({ kind: "gap_abandoned", gap: next.key, why: "asked twice, nothing heard" }); spec.abandoned = [...(spec.abandoned ?? []), next.key]; continue; }
      const heard = await turn(next.key, framed(next.question), next.anchor, next.slot ?? null);
      // a part asked to be described is asked once; any other gap is asked
      // again while each ask hears something for it
      tried.set(next.key, heard && !next.once ? 0 : (tried.get(next.key) ?? 0) + 1);
      if (next.once) spec.abandoned = [...(spec.abandoned ?? []), next.key];
    }

    const belief = beliefOf(N.fold(notes), reader.things());
    const artifact = render(belief, { what, forWhom: request.forWhom });
    const verdict = await verify("page", artifact);
    log({ kind: "set_down", asks, things: belief.length, notes: N.fold(notes).length, ok: verdict.ok });
    return { schema: TALK_BUILD_SCHEMA, kind: "page", belief, artifact, verdict, asks, notes, spec };
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
    const says = (c) => !c.details.length;   // a part with nothing to show but what it says (a comment)
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
            return { key, slot: { rows: ps.map((p) => ({ id: p.id, title: title(p) })), mint: true, kind: c.kind, modifier: c.modifier, label: says(c) ? "says" : "named", whole: says(c) }, question: `Here are ${ps.length} ${partOf(c.per)?.phrase ?? c.per}${group ? ` in ${title(group)}` : ""}:\n${listed}\n${says(c) ? "Write" : "Name"} one ${one} for each, one per line as "name: ${says(c) ? "what it says" : "its name"}".`, anchor: `1. ${title(ps[0])}:` };
          }
        }
        for (const p of parents) {
          const have = all(c).filter((t) => (p ? t.parent === p.id : true));
          const key = `count:${phraseOf(c)}:${p ? p.id : "top"}`;
          const missing = c.n - have.length;
          if (missing <= 0 || abandoned.has(key)) continue;
          const where = p ? ` ${says(c) ? "on" : "in"} ${title(p)}` : c.within ? ` in the ${c.within}` : "";
          const others = have.length ? `, different from: ${have.map(title).join("; ")}` : "";
          const slot = { kind: c.kind, modifier: c.modifier, parent: p?.id ?? null, label: says(c) ? "says" : "named", whole: says(c), list: missing };
          const verb = says(c) ? "Write" : "Name";
          if (missing === 1) return { key, slot: { ...slot, list: null }, question: `${verb} one more ${phraseOf(c)}${where}${others}.`, anchor: says(c) ? `One more ${phraseOf(c)}${where} says:` : `One more ${phraseOf(c)}${where} is called` };
          return { key, slot, question: `${verb} ${missing} ${have.length ? "more " : ""}${c.phrase}${where}${others}. One per line, ${says(c) ? "each a short sentence" : "just the name"}.`, anchor: "1." };
        }
      }
      // 2. things at this depth missing a detail the request asked each one to
      //    show: one ask per group of siblings, a row each; the numbers a
      //    thing shows ("a vote count and a comment count") on one row
      for (const c of level) {
        const wanted = c.details.filter((x) => !["title", "name"].includes(x));
        const isNumeric = (x) => x.split(" ").includes("count") || x === "karma";
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
            return { key, slot, question: `Here ${lacking.length > 1 ? `are ${lacking.length} ${c.phrase}` : `is a ${phraseOf(c)}`}${parent ? ` in ${title(parent)}` : ""}:\n${listed}\nGive the ${said} of ${lacking.length > 1 ? "each one" : "it"}${numeric ? ` as ${labels.length > 1 ? "numbers" : "a number"}` : ""}, one per line as "name: ${labels.join(", ")}".`, anchor: `1. ${title(lacking[0])}:` };
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
