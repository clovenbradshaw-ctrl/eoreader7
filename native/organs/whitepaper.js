// whitepaper.js — composing a document from ledger claims (kernel/notes.js)
// whose quoted spans are archive-anchored (archive-anchor.js) before they
// ever render, so a quote in the output cannot be a fabrication: it either
// points at a byte-verified archive.org snapshot, or it is disclosed,
// visibly, as unverified.
//
// REUSES, never rebuilds: `kernel/notes.js::sourceOfWitness` (a witness's
// address names the source it was heard from — the same string this
// organ reads as the claim's URL to archive), `archive-anchor.js`'s own
// `anchorClaim`/`anchorClaims` for the ONE verification crossing, and
// `whitepaper-html.js` for the ONE render. A caller with a real ledger
// (the-fold's P57 door, or this file's own `makeNotesText`) and an ordered
// list of section headings is composing a document ENTIRELY from claims
// this instrument already heard and verified — never from a model's fresh
// prose, per the task's own rule that no model call may be trusted for a
// quote's content.
//
// THE ORDER IS DECLARED, NEVER GUESSED (compose.js's own wall, the-fold
// P87: "an order the caller declares... its absence is a REFUSAL, never a
// fallback to fold order — a guessed order is an argument nobody made").
// `composeWhitepaper` takes `sections: [{ heading, noteIds }]` — which
// notes go in which section, in what order — refused outright without it.
//
// A CLAIM WITHOUT A DIRECT QUOTE IS NOT ANCHORED, AND THAT IS CORRECT, NOT
// A GAP: `fold(log)` (kernel/notes.js) does not surface a note's `because`
// field, but it does carry every SPAN the note was heard at
// (`{ref, at, text}` — the byte-addressed material `hear`/`attest` record
// it against, P5.2), and a span's own `text` is the verbatim material this
// organ treats as the quotable decider. A note heard with no span carries
// nothing quotable and composes as ordinary prose (the arrangement's own
// end1/label/end2), source disclosed, no quote-anchor drawn — there is
// nothing quoted to verify.
//
// A CLAIM'S WITNESS NAMES ITS SOURCE, NEVER ITS TRUTH (ranke.js's own
// stated posture, carried here): `sourceUrl` is read off the note's
// witness address via `sourceOfWitness` and handed to archive-anchor
// verbatim. A local/pasted source (no scheme, a bare filename) reaches
// `anchorClaim` and returns `not_a_url` by construction — disclosed in the
// coverage tally, never conflated with a web source that failed to
// verify.
//
// Generality: universal — this file reads only the ledger's own note
// shape (`end1/label/end2/because/witnesses/spans`, kernel/notes.js) and
// declares no vocabulary of its own about what a claim is ABOUT.

import { standingOf } from "../kernel/notes.js";
import { anchorClaims, ANCHOR_STANDINGS } from "./archive-anchor.js";

export const REFUSALS = Object.freeze({
  no_sections: "composeWhitepaper: sections are declared by the caller, in the order they compose in — an undeclared order is an argument nobody made",
  unknown_note: "a section names a noteId this ledger does not carry",
});

/** The note's own quotable text — the text of its first byte-addressed span, when one exists (see the header: fold() drops `because`, so the span carries it). */
const quoteOf = (note) => {
  const t = note?.spans?.[0]?.text;
  return t ? String(t).trim() : null;
};

/**
 * The first web-URL-shaped source a note carries, or null.
 *
 * `sourceOfWitness`'s own `[kind:]<ref>` grammar (kernel/notes.js) is
 * ambiguous against a bare scheme-carrying URL passed AS a witness — its
 * "does the text before the first colon carry no #/~" heuristic reads
 * "https" itself as a kind prefix and strips it, since the real convention
 * this ledger's own callers follow (ranke.js's own `chase`) never stores a
 * full URL as a witness OR a span's `ref` — those carry a bare HOST
 * (`primary:<host>#a-b~recipe`), with the scheme-carrying address living
 * only in the caller's own page list, outside the ledger. So a note that
 * DOES carry a full URL (this organ's own expected input shape — a caller
 * composing straight from web material, not from ranke.js's host-addressed
 * ledger) is detected directly, by its own unambiguous `https?://` prefix,
 * on both the raw witness string and every span's `ref` — never through
 * `sourceOfWitness`'s kind-stripping, which was built for a different
 * address convention and is not safe to reuse for this question.
 */
function sourceUrlOf(note) {
  for (const w of note?.witnesses ?? []) {
    if (/^https?:\/\//i.test(String(w ?? ""))) return String(w);
  }
  for (const sp of note?.spans ?? []) {
    if (/^https?:\/\//i.test(String(sp?.ref ?? ""))) return String(sp.ref);
  }
  return null;
}

/**
 * claimOf(note) — a ledger note, as one composed claim: the arrangement's
 * own plain sentence (`end1 label end2`), its quoted decider text if it
 * has one, and the source URL to archive-anchor it against.
 */
export function claimOf(note) {
  const end1 = note?.end1 ?? note?.subject ?? "";
  const label = note?.label ?? note?.verb ?? "";
  const end2 = note?.end2 ?? note?.object ?? "";
  return {
    noteId: note?.id ?? null,
    text: `${end1} ${label} ${end2}`.trim(),
    quote: quoteOf(note),
    sourceUrl: sourceUrlOf(note),
    ledgerStanding: standingOf(note).standing,
  };
}

/**
 * composeWhitepaper(notesById, { title, sections }, { archive, readSnapshot })
 *   notesById   — Map<id, note> | { id: note } — the ledger's own notes,
 *                 by id (`door.foldNotes(log)` keyed by `.id`, or a plain
 *                 lookup a caller already built).
 *   sections    — [{ heading, noteIds: [id, ...] }] — DECLARED, in order.
 *                 A noteId absent from notesById refuses the whole call
 *                 (compose.js's own posture: an undetermined merge is
 *                 never silently skipped).
 *   archive/readSnapshot — the archive-anchor.js crossing, injected.
 *
 * Returns { title, sections: [{heading, claims:[{text, sourceUrl, quotes:
 * [anchoring...]}], withheld}], coverage: {anchored, unanchored, notAUrl,
 * total} } — the shape whitepaper-html.js renders, or { refused }.
 */
export async function composeWhitepaper(notesById, { title = "Untitled", sections } = {}, deps) {
  if (!Array.isArray(sections) || !sections.length)
    return { refused: { type: "no_sections", detail: REFUSALS.no_sections } };
  const get = (id) => (notesById instanceof Map ? notesById.get(id) : notesById?.[id]);

  const allClaims = [];
  const built = [];
  for (const sec of sections) {
    const claims = [];
    const withheld = [];
    for (const id of sec.noteIds ?? []) {
      const note = get(id);
      if (!note) { withheld.push({ noteId: id, reason: REFUSALS.unknown_note }); continue; }
      const claim = claimOf(note);
      claims.push(claim);
      allClaims.push(claim);
    }
    built.push({ heading: sec.heading ?? null, claims, withheld });
  }

  // Anchor every claim that carries a quote, in one pass (a shared source
  // URL cited by two claims is still verified independently per claim —
  // see archive-anchor.js's own header for why one anchoring must never
  // ride another's).
  const quoted = allClaims.filter((c) => c.quote);
  const anchorings = deps ? await anchorClaims(quoted, deps) : quoted.map((c) => ({ ...c, standing: ANCHOR_STANDINGS.UNANCHORED, reason: "no_archive_organ", detail: "no archive/readSnapshot organ was injected — every quote is disclosed unanchored" }));
  const byId = new Map();
  anchorings.forEach((a, i) => byId.set(quoted[i].noteId, a));

  let anchored = 0, unanchored = 0, notAUrl = 0;
  for (const sec of built) {
    for (const claim of sec.claims) {
      claim.quotes = [];
      if (claim.quote) {
        const a = byId.get(claim.noteId);
        claim.quotes.push(a);
        if (a.standing === ANCHOR_STANDINGS.ANCHORED) anchored += 1;
        else if (a.standing === ANCHOR_STANDINGS.NOT_A_URL) notAUrl += 1;
        else unanchored += 1;
      }
    }
  }

  return {
    title,
    sections: built,
    coverage: { anchored, unanchored, notAUrl, total: quoted.length },
  };
}
