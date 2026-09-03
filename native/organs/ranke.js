// ranke.js — Ranke: the agent that chases a claim to its primary source.
//
// Named, by the user's direction (2026-09-02: "when reading things like
// wikipedia, and in general, we must chase primary sources" — "this activity
// should be personified by the agent we can call … Leopold von Ranke"),
// after the historian whose Quellenkritik this organ mechanizes: an account
// is judged by the document it stands on, and history is written from the
// Quellen — the archive, the dispatch, the record — never from the narrative
// that repeats them. A citing page is a NARRATIVE. It is a good witness to
// WHERE the primary material lives — it links to it, or quotes it — and a
// weak witness to the fact itself. So a note the reader heard off such a
// page is not left standing on that page: Ranke follows the page's LEADS to
// the sources the page stands on, reads those faces, and lands every source
// that states the note as its own witness — a `primary:` witness, kind
// declared, addressed into the primary's bytes, recipe named.
//
// THE FOOTNOTE BINDING (2026-09-03, measured backwards on Apollo 11 —
// eval/the-fold/ranke-backwards.mjs): a citing page does not cite "for the
// page", it cites PER SENTENCE — a superscript marker in the prose is an
// in-page link to one numbered note, and that note's outbound links are
// the source the page attached to THAT claim. Ranking a page's whole
// bibliography by word overlap with a note's ends picked a NASA landing
// page for "Armstrong began his descent" while the sentence itself carried
// [139]; over 285 notes with a readable cited face the overlap-ranked
// leads found the proposition in one sentence 6 times and the redealt
// control 7 — the leads were noise. `footnoteLeads(page)` binds marker
// number → note → links, generically: any <sup> whose in-page anchor
// resolves to an element with that id (numeric-style citation, the
// convention of encyclopedias and journals alike; nothing keyed on one
// site's ids), and `chase` consults a note's own footnotes FIRST, the
// overlap-ranked links only after.
//
// TWO KINDS OF LEAD, both the user's own direction (2026-09-03): "if it is
// citing something via a hyperlink, it should go read that, not just
// Wikipedia-shaped sourcing. if it is just quoting someone, it should go
// try to find that quote if the source isn't given."
//   link  — any outbound hyperlink on the page (any host that is not the
//           page's own, nor the encyclopedia family's navigation), with the
//           text it rides in; primary.js's extractCitations is the reader,
//           and it is not Wikipedia-shaped past its family skip — a <cite>
//           block is preferred for context where one exists and any <li> or
//           the anchor's own text serves otherwise.
//   quote — a quotation the page gives WITHOUT a link: an unsourced quote
//           is a lead to be found, not a fact to be kept. Found through an
//           injected `search(quoteText)`, the results read as candidates.
//
// THE GATE, so it does not explode in a novel (user, same day: "that needs
// a gate so it doesn't explode in a novel"). Structural, never a genre
// label: a page that CITES NOTHING — zero outbound links — has declared no
// sources and gets no chase of either kind. Dracula carries thousands of
// quotation marks and not one hyperlink; under this gate it yields zero
// leads, zero searches, zero fetches, typed `no_citations`. Only a page
// that shows its sources for SOME claims licenses the hunt for the
// quotations it leaves unsourced. On top of the gate: every run is BUDGETED
// (`maxFetches`, `maxSearches`, declared by the caller — P9) and the organ
// never runs unbidden — the surface's toggle/door decides when (user:
// "perhaps we toggle this one as this could be very burdensome").
//
// THE ONE THING THIS ORGAN DECIDES, so it is not re-derived: a secondary
// account is a witness to WHERE a claim is stated, and the primary is a
// witness to the claim BEING STATED THERE — at an address. Neither is a
// claim about what is true: this ledger is the richest possible map of
// what claims are made about the truth, and by whom (user, 2026-09-03:
// "we are not making claims about what is objectively true, just making
// the richest possible hypergraph of what claims are about the truth").
// The two kinds are not summed —
// `standingOf` (kernel notes.js) keeps witness KINDS apart — and a note that
// only accounts state stays `single-witness` however many accounts repeat
// it, because accounts copy each other (Ladha's correlated witnesses;
// nesting.js's wall one register over: "papers report he said it" is not
// "sources confirm it").
//
// WHAT IT REUSES, never rebuilds: primary.js's extractCitations /
// rankPrimary (claim overlap counted, a declared class ladder, the page's
// own order as tiebreak — no weights) / snipClaim (every sentence of a
// fetched face stating the claim's words, offsets self-verified, P5.2),
// pointed at LEDGER NOTES instead of proof-tier claims, landed through the
// door's own `attest` — the same landing the witness tier uses.
//
// THIS MODULE OWNS NO NETWORK. `fetchFace(url, archiveUrl)` and
// `search(query)` are injected — the crossing belongs to whoever holds
// P13's consent (explore-server.mjs, or an eval driver that keeps every face
// content-addressed so the run reproduces offline). A failed fetch is a
// typed gap on the consulted list, never a dropped candidate; a face with no
// text is `beyond-reach`, never "the source is silent".
//
// THE CONTROL this organ ships with (II.23), AND WHAT IT DECIDED: snipClaim
// is a CONTAINMENT test and cannot tell a real note from a fabricated one
// whose words co-occur. Measured live (eval/the-fold/ranke-walk.mjs,
// 2026-09-03, 605 notes off two real pages, 18 primary faces read): the
// real ledger's containment hits were 1, the REDEALT ledger's (end2 rotated,
// same faces) were 6 — containment is not discriminated, so it may not
// land a witness. A containment hit is a LEAD to a sentence; the landing
// is the WITNESS TIER's (corroboration.js::witnessNote — the small model
// reads the primary face and says whether it states the note; the verdict
// is derived, never written). Without witness organs injected, Ranke
// reports its leads and lands nothing — disclosed as `unwitnessed` on every
// consulted entry, never a silent attest.
//
// Generality: universal in shape (any medium whose accounts cite their
// sources — a paper's bibliography, a report's data appendix, a review
// naming the recording); the two lead readers here are text/HTML adapters.

import { extractCitations, rankPrimary, snipClaim, isWikiFamilyHost, PRIMARY_SOURCES_CONSULTED, PRIMARY_SNIPS_KEPT } from "./primary.js";
import { hostOf } from "./web.js";
import { CLAIM_STOPWORDS, wordSet, hasWord } from "./grounding.js";
import { sourceOfWitness, kindOfWitness } from "../kernel/notes.js";
import { witnessNote } from "./corroboration.js";

export const RANKE = Object.freeze({
  name: "Ranke",
  after: "Leopold von Ranke — the account is judged by the document it stands on (Quellenkritik)",
  recipe: "ranke-v1",
});

/** The witness kind Ranke lands. Counted apart by kernel standingOf. */
export const PRIMARY_KIND = "primary";

// A quotation shorter than this is not findable — a search engine returns
// noise for three common words in quotation marks. Giver: none earned; a
// P4 debt named as such (the same class as ROWS_PER_CHUNK), never tuned
// against a result.
export const QUOTE_MIN_WORDS = 6;

const content = (s) => String(s ?? "").toLowerCase().split(/[^\p{L}\p{N}'’]+/u).map((w) => w.replace(/['’]s$/, "")).filter((w) => w.length > 2 && !CLAIM_STOPWORDS.has(w));

// ── the claim a note makes ──────────────────────────────────────────────────
/**
 * A ledger note as the claim shape primary.js's walk judges: the content
 * words of BOTH ends (never the label — a label is the reader's own
 * arrangement word and a primary source rarely repeats it; the ends are
 * what the world calls the things). A note whose ends carry no content
 * word yields no claim (typed null).
 */
export function claimOfNote(note) {
  const end1 = String(note?.end1 ?? note?.subject ?? "");
  const end2 = String(note?.end2 ?? note?.object ?? "");
  const label = String(note?.label ?? note?.verb ?? "");
  const tokens = [...new Set([...content(end1), ...content(end2)])];
  if (!tokens.length) return null;
  return { kind: "name", text: `${end1} ${label} ${end2}`.trim(), tokens, sentence: `${end1} ${label} ${end2}` };
}

// A catalogue page is not the document. Some hosts serve the document's
// own text at an address the catalogue address determines — Internet
// Archive's full-text face for a `details/<id>` item lives at
// `stream/<id>/<id>_djvu.txt` (giver: archive.org's own djvu.txt endpoint,
// used as documented; measured live 2026-09-03: the cited `details` page
// read as a 5,961-char catalogue record with none of the book's prose).
// One declared table, extensible by the caller; never a scrape of a
// site's layout — an address rule, not a format rule.
export const FULL_TEXT_FACES = Object.freeze([
  { host: /(^|\.)archive\.org$/i, re: /\/details\/([^/?#]+)/, face: (id) => `https://archive.org/stream/${id}/${id}_djvu.txt` },
]);
export function expandLead(cand, table = FULL_TEXT_FACES) {
  const out = [];
  for (const rule of table) {
    if (!rule.host.test(String(cand?.host ?? ""))) continue;
    const m = String(cand?.url ?? "").match(rule.re);
    if (m) out.push(rule.face(m[1]));
  }
  return out;
}

/** The witness string for a primary face: `primary:<host>#<start>-<end>~<recipe>` — kind declared, address into the face, recipe named (P68). */
export const primaryWitness = (host, snip, recipe = RANKE.recipe) => `${PRIMARY_KIND}:${host}#${snip.start}-${snip.end}~${recipe}`;

/** Is this note standing on ACCOUNTS only — every witness a citing page (by the injected predicate), none a primary? */
export function standsOnAccountsOnly(note, { isAccount }) {
  const ws = note?.witnesses ?? [];
  if (!ws.length) return false;
  return ws.every((w) => kindOfWitness(w) !== PRIMARY_KIND && isAccount(sourceOfWitness(w)));
}

// ── leads ───────────────────────────────────────────────────────────────────
/**
 * leadsOf(page) — what a page offers to chase, and the GATE.
 *   page: { html?, text?, host?, url? }
 * Returns { citing, links, quotes, refused? }:
 *   links  — outbound hyperlinks (not the page's own host, not the
 *            encyclopedia family), each { url, host, text, index, archiveUrl? }
 *   quotes — quotations in the text face of at least QUOTE_MIN_WORDS words
 *            that no link's own text carries — the UNSOURCED ones;
 *            each { text, start, end, words }
 *   citing — links.length > 0. When false, quotes is EMPTY and `refused`
 *            is `no_citations`: a page that cites nothing declares no
 *            sources, and its quotation marks are dialogue until proven
 *            otherwise. This is the gate that keeps a novel closed.
 */
export function leadsOf(page) {
  const html = String(page?.html ?? "");
  const self = String(page?.host ?? hostOf(page?.url ?? "") ?? "");
  const links = extractCitations(html).filter((c) => c.host && c.host !== self && !isWikiFamilyHost(c.host));
  if (!links.length) return { citing: false, links: [], quotes: [], refused: { type: "no_citations", detail: "the page links to no outside source; nothing to chase, and its quotation marks are not leads" } };
  const text = String(page?.text ?? "");
  const linkedText = wordSet(links.map((l) => l.text).join(" "));
  const quotes = [];
  for (const m of text.matchAll(/[“"]([^”"]{12,600})[”"]/g)) {
    const q = m[1].trim();
    // Prose only: a quotation that crosses a line break, carries an address,
    // a footnote arrow or bracketed apparatus is a reference-list fragment
    // the quote marks happened to bracket — measured live on the Austerlitz
    // page: «(as per Bodart), at 6,000 men.\n\n- ↑ Farwell (2001)» and two bare
    // URLs were "quotes" on the first run and every search on them was spent
    // for nothing.
    if (/[\n\r]|https?:\/\/|↑|\[\d|\bpp?\.\s*\d|\bISBN\b|\bvol\.\s*\d/i.test(q)) continue;
    if ((q.match(/\p{L}/gu) ?? []).length < q.length * 0.6) continue;
    const words = content(q);
    if (words.length < QUOTE_MIN_WORDS) continue;
    // a quote whose words already ride a citation's own text is sourced by that link
    if (words.length && words.every((w) => hasWord(linkedText, w))) continue;
    quotes.push({ text: q, start: m.index + 1, end: m.index + 1 + m[1].length, words });
  }
  return { citing: true, links, quotes };
}

// ── the footnote binding ──────────────────────────────────────────────────
const stripTags = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
/**
 * footnoteLeads(page) — number → the outbound links of the note that
 * number points at. A marker is a <sup> carrying an in-page anchor
 * (href="#id") whose visible text is a number; the note is the element
 * with that id, read to the end of its list item. Returns
 * { byNumber: Map<number, [{url, host, text}]>, markers, notes } — a page
 * with no such markers returns an empty map (its links are still leads
 * through leadsOf; they are just not bound to sentences).
 */
export function footnoteLeads(page) {
  const html = String(page?.html ?? "");
  const self = String(page?.host ?? hostOf(page?.url ?? "") ?? "");
  const byNumber = new Map();
  let markers = 0;
  const seen = new Set();
  for (const m of html.matchAll(/<sup\b[^>]*>([\s\S]{0,600}?)<\/sup\s*>/gi)) {
    const inner = m[1];
    const href = inner.match(/href="#([^"]+)"/);
    if (!href) continue;
    const num = Number((stripTags(inner).match(/\d+/) ?? [])[0]);
    if (!Number.isInteger(num)) continue;
    markers += 1;
    if (seen.has(href[1])) continue;
    seen.add(href[1]);
    const at = html.indexOf(`id="${href[1]}"`);
    if (at < 0) continue;
    const end = html.indexOf("</li", at);
    const block = html.slice(at, end > 0 ? Math.min(end, at + 8000) : at + 8000);
    const links = [];
    for (const a of block.matchAll(/href="(https?:\/\/[^"]+)"/gi)) {
      const url = a[1].replace(/&amp;/g, "&");
      const host = hostOf(url);
      if (!host || host === self || isWikiFamilyHost(host)) continue;
      if (links.some((l) => l.url === url)) continue;
      links.push({ url, host, text: stripTags(block).slice(0, 400), index: links.length, structuralClass: "other", overlap: 0 });
    }
    if (links.length) byNumber.set(num, [...(byNumber.get(num) ?? []), ...links]);
  }
  return { byNumber, markers, notes: byNumber.size };
}
/** The footnote numbers a text span carries — "[ 139 ]" as the text face renders a marker. */
export const markersIn = (text) => [...String(text ?? "").matchAll(/\[\s*(\d{1,4})\s*\]/g)].map((m) => Number(m[1]));
/** The links a note's own sentences bound, through the page's footnotes; [] when the note carries no marker or its note has no outbound link. */
export function footnoteLeadsForNote(note, footnotes) {
  if (!footnotes?.byNumber?.size) return [];
  const out = [];
  for (const sp of note?.spans ?? []) for (const n of markersIn(sp?.text)) for (const l of footnotes.byNumber.get(n) ?? []) if (!out.some((x) => x.url === l.url)) out.push({ ...l, footnote: n });
  return out;
}

// ── one chase ───────────────────────────────────────────────────────────────
/**
 * chase(log, door, note, { leads, fetchFace, search, consult, recipe })
 * Rank the page's link leads for this note (rankPrimary); for quote leads
 * sharing a content word with the note, `search` the quote and take the
 * results as further candidates. Fetch sequentially up to `consult`, snip
 * each face for the note's words, attest the note with every stating face.
 *   fetchFace — async (url, archiveUrl) → { text, url, host, path } | { gap }
 *   search    — async (query) → [{ url, host?, title? }] (omit to skip quotes)
 * Returns { log, consulted:[{url, host, via, structuralClass?, snipsFound, snips|gap}], attested:[witness], claim, searched:[query] }.
 */
export async function chase(log, door, note, { leads, fetchFace, search = null, consult = PRIMARY_SOURCES_CONSULTED, recipe = RANKE.recipe, witness = null, footnotes = null } = {}) {
  if (typeof fetchFace !== "function") throw new TypeError("ranke.chase: fetchFace is injected — this organ owns no network");
  const claim = claimOfNote(note);
  if (!claim) return { log, consulted: [], attested: [], searched: [], claim: null, refused: { type: "no_claim", detail: "the note's ends carry no content word to chase" } };
  if (!leads?.citing) return { log, consulted: [], attested: [], searched: [], claim, refused: leads?.refused ?? { type: "no_citations" } };
  // A link sharing no word with the claim is not a lead FOR THIS NOTE — the
  // same rule proposeCandidates already holds (`shared > 0`). Measured live
  // on the first walk: 178 of 318 consults were overlap-0 fetches of
  // whatever the page cited first, and the budget was gone before a lead
  // with a shared word was reached.
  // The note's OWN footnotes first — the source the page attached to this
  // sentence — then the page's links ranked by overlap, minus any already
  // bound. A footnote lead needs no shared word: the binding is the page's
  // own, not a guess from vocabulary.
  const bound = footnoteLeadsForNote(note, footnotes).flatMap((c) => [{ ...c, via: "footnote" }, ...expandLead(c).map((u) => ({ ...c, url: u, via: "footnote:full-text", archiveUrl: null }))]);
  const ranked = rankPrimary(claim, leads.links).filter((c) => c.overlap > 0 && !bound.some((b) => b.url === c.url)).flatMap((c) => [{ ...c, via: "link" }, ...expandLead(c).map((u) => ({ ...c, url: u, via: "link:full-text", archiveUrl: null }))]);
  const candidates = [...bound, ...ranked];
  const searched = [];
  if (search && leads.quotes?.length) {
    const want = new Set(claim.tokens);
    const relevant = leads.quotes.filter((q) => q.words.some((w) => want.has(w)));
    for (const q of relevant) {
      const results = await search(q.text);
      searched.push(q.text);
      for (const r of results ?? []) {
        const host = r.host ?? hostOf(r.url);
        if (!r.url || !host || isWikiFamilyHost(host)) continue;
        if (candidates.some((c) => c.url === r.url)) continue;
        candidates.push({ url: r.url, host, text: `${r.title ?? ""} ${q.text}`, via: "quote", quote: q.text, structuralClass: "other", overlap: 0 });
      }
    }
  }
  const consulted = [];
  const attested = [];
  let next = log;
  for (const cand of candidates.slice(0, consult)) {
    const base = { url: cand.url, host: cand.host, via: cand.via, ...(cand.quote ? { quote: cand.quote } : {}), structuralClass: cand.structuralClass, overlap: cand.overlap, citation: cand.text || null };
    const got = await fetchFace(cand.url, cand.archiveUrl ?? null);
    if (!got || got.gap) { consulted.push({ ...base, gap: got?.gap ?? { type: "no_face" } }); continue; }
    if (got.text == null) { consulted.push({ ...base, gap: { type: "beyond-reach", detail: "no text face — snipping needs one" } }); continue; }
    const host = got.host ?? cand.host ?? hostOf(got.url ?? cand.url);
    const snips = snipClaim(claim, got.text, { facePath: got.path ?? null, url: got.url ?? cand.url, host });
    const quoteFound = cand.quote ? snipClaim({ kind: "name", tokens: content(cand.quote), text: cand.quote }, got.text).length : null;
    const entry = { ...base, host, textChars: got.text.length, snipsFound: snips.length, snips: snips.slice(0, PRIMARY_SNIPS_KEPT), ...(quoteFound != null ? { quoteFound: quoteFound > 0 } : {}) };
    consulted.push(entry);
    if (!snips.length) continue;
    if (!witness) { entry.unwitnessed = true; continue; } // a lead, reported; nothing lands on containment alone
    // THE WITNESS reads the primary face where the lead points: the same
    // protocol the ledger walk uses (select over gathered sentences, the
    // same-index arm; generate as its own fallback), the verdict derived.
    const w = await witnessNote(claim.sentence, { ref: host, text: got.text }, { ...witness, ends: { end1: note.end1 ?? note.subject, end2: note.end2 ?? note.object }, slice: snips[0].text });
    entry.witness = w.refused ? { refused: w.refused } : { verdict: w.verdict, because: w.because ?? null };
    if (w.refused || w.verdict !== "states") continue;
    const at = w.because ? got.text.indexOf(w.because) : -1;
    const s = at >= 0 ? { start: at, end: at + w.because.length, text: w.because } : snips[0];
    const witnessId = primaryWitness(host, s, recipe);
    const r = door.attest(next, note.id, { witness: witnessId, span: { ref: host, at: `${host}#${s.start}-${s.end}`, text: s.text }, because: s.text });
    if (!r.refused) { next = r.log; attested.push(witnessId); }
  }
  return { log: next, consulted, attested, searched, claim };
}

// ── the walk over a ledger ──────────────────────────────────────────────────
/**
 * chaseLedger(log, door, pages, { fetchFace, search, maxFetches, maxSearches, isAccount, consult, recipe })
 *   pages — [{ ref, html, text?, host?, url? }] : the citing pages the
 *           ledger was read from, by the ref their witnesses carry
 *   isAccount(ref) — which refs are accounts to chase FROM (default: any
 *           page passed in that passes the gate — a page that cites)
 *   maxFetches / maxSearches — declared budgets (P9); faces are cached
 *           across notes so one source cited for many notes is read once
 * Walks every note standing on accounts only, most-witnessed first.
 * Returns { log, chased, fetches, searches, faces, pagesRefused, notesConsidered, notesAttested }.
 */
export async function chaseLedger(log, door, pages, { fetchFace, search = null, maxFetches, maxSearches = null, isAccount = null, consult = PRIMARY_SOURCES_CONSULTED, recipe = RANKE.recipe, witness = null } = {}) {
  const footnotesByRef = new Map();
  const footnotesOf = (ref) => { if (!footnotesByRef.has(ref)) footnotesByRef.set(ref, footnoteLeads(byRef.get(ref) ?? {})); return footnotesByRef.get(ref); };
  if (!Number.isFinite(maxFetches)) throw new TypeError("ranke.chaseLedger: maxFetches is declared by the caller (P9)");
  if (search && !Number.isFinite(maxSearches)) throw new TypeError("ranke.chaseLedger: maxSearches is declared when a search organ is injected (P9)");
  const byRef = new Map((pages ?? []).map((p) => [p.ref, p]));
  const leadsByRef = new Map();
  const leads = (ref) => { if (!leadsByRef.has(ref)) leadsByRef.set(ref, leadsOf(byRef.get(ref) ?? {})); return leadsByRef.get(ref); };
  const pagesRefused = [];
  for (const p of pages ?? []) if (!leads(p.ref).citing) pagesRefused.push({ ref: p.ref, refused: leads(p.ref).refused });
  const account = isAccount ?? ((ref) => byRef.has(ref) && leads(ref).citing);
  const faces = new Map();
  let fetches = 0;
  let searches = 0;
  const cachedFetch = async (url, archiveUrl) => {
    if (faces.has(url)) return faces.get(url);
    if (fetches >= maxFetches) return { gap: { type: "budget", detail: `maxFetches ${maxFetches} spent` } };
    fetches += 1;
    const got = await fetchFace(url, archiveUrl);
    faces.set(url, got);
    return got;
  };
  const searchCache = new Map();
  const budgetedSearch = search
    ? async (q) => {
        if (searchCache.has(q)) return searchCache.get(q);
        if (searches >= maxSearches) return [];
        searches += 1;
        const r = (await search(q)) ?? [];
        searchCache.set(q, r);
        return r;
      }
    : null;
  let next = log;
  const chased = [];
  const notes = door.foldHyperlexicon(next).filter((n) => standsOnAccountsOnly(n, { isAccount: account }));
  for (const n of notes) {
    const refs = [...new Set((n.witnesses ?? []).map(sourceOfWitness))].filter((r) => byRef.has(r) && leads(r).citing);
    const merged = { citing: refs.length > 0, links: refs.flatMap((r) => leads(r).links), quotes: refs.flatMap((r) => leads(r).quotes) };
    const fn = { byNumber: new Map() };
    for (const ref of refs) for (const [k, v] of footnotesOf(ref).byNumber) fn.byNumber.set(k, [...(fn.byNumber.get(k) ?? []), ...v]);
    const r = await chase(next, door, n, { leads: merged, fetchFace: cachedFetch, search: budgetedSearch, consult, recipe, witness, footnotes: fn });
    next = r.log;
    chased.push({ noteId: n.id, note: `${n.subject} —${n.verb}→ ${n.object}`, leads: { links: merged.links.length, quotes: merged.quotes.length }, searched: r.searched, consulted: r.consulted, attested: r.attested, ...(r.refused ? { refused: r.refused } : {}) });
    if (fetches >= maxFetches && r.consulted.length && r.consulted.every((c) => c.gap?.type === "budget")) break;
  }
  return {
    log: next, chased, fetches, searches, pagesRefused, witnessed: !!witness,
    leads: chased.reduce((a, c) => a + c.consulted.filter((x) => x.snipsFound > 0).length, 0),
    faces: [...faces.entries()].map(([url, f]) => ({ url, gap: f?.gap ?? null, chars: f?.text?.length ?? 0 })),
    notesConsidered: notes.length, notesAttested: chased.filter((c) => c.attested.length).length,
  };
}
