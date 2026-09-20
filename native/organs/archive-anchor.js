// archive-anchor.js — anchoring a quoted claim to a verified archive.org
// (Wayback Machine) snapshot, so a quote in a composed document can never
// be a hallucination: the anchor is only ever the byte address of a
// snapshot this organ read and confirmed carries the words being quoted.
//
// REUSES, never rebuilds: the-fold's `explore-server.mjs::archivePage` /
// `verifySnapshot` mechanism (CLAUDE.md, "the web organ" section, 2026-08-17
// — "A link handed to the reader is checked, never taken on the far side's
// own word") — that crossing already does the hard part: it calls
// Wayback's Save Page Now API, then FETCHES the resulting snapshot address
// itself and reads it with the same `looksLikeChallenge`/`extractReadable`
// organs an ordinary page read uses, marking `status: "saved"` only once
// the snapshot demonstrably contains real content (2xx, not a challenge
// shell, non-empty text face). THIS MODULE OWNS NO NETWORK — the same
// posture ranke.js already states for itself ("THIS MODULE OWNS NO
// NETWORK... the crossing belongs to whoever holds P13's consent"): the
// caller injects an `archive(url)` function shaped exactly like that
// mechanism's own return — `{ status: "saved"|"failed", snapshotUrl?,
// detail? }` — so a browser/server caller passes the real crossing and a
// test passes a scripted one, and neither this file nor its tests ever
// open a socket.
//
// THE WALL: a claim never renders anchored unless `verifyClaimBytes` finds
// the QUOTED WORDS THEMSELVES inside the bytes this organ actually read
// back from the snapshot — never trusted from the archive call's own
// "saved" verdict alone. Two claims can share one URL and one archive
// call may succeed while a SECOND claim's exact words are not on that
// page at all (a paraphrase, a misquote, a wrong section) — each claim is
// verified on its own words, against the one shared snapshot fetch, so a
// failing claim never rides a passing sibling's anchor.
//
// A claim with no `sourceUrl` (a local/pasted source, a claim resting on
// this instrument's own ledger rather than a fetched web page) is not a
// failure of this organ — it is OUT OF SCOPE for archive-anchoring by
// construction, typed `not_a_url` and disclosed as such, never silently
// dropped and never promoted to "anchored".
//
// THE OSTENSION WALL (THE-WAYS-OF-KNOWING.md: "knowing-where... corrupted:
// the fabricated address"). An anchor this organ produces is ALWAYS one of
// three things: a verified snapshot address plus a byte offset into text
// this organ itself fetched and searched (`anchored`); a typed, named
// reason it could not be produced (`unanchored`); or absence, when the
// claim was never eligible to be anchored at all (`not_a_url`). There is
// no fourth state, and no code path anywhere in this file writes a
// `snapshotUrl` field without first confirming the quoted text is present
// in the bytes fetched from it.
//
// Generality: universal in shape (any claim carrying a quoted string and a
// source URL, over any archive/snapshot service whose crossing returns
// this shape); the injected `archive()` and `readSnapshot()` functions are
// the one place a particular provider (archive.org) enters.

/** The three, and only three, standings a claim's anchoring can reach. */
export const ANCHOR_STANDINGS = Object.freeze({
  ANCHORED: "anchored",
  UNANCHORED: "unanchored",
  NOT_A_URL: "not_a_url",
});

export const REFUSALS = Object.freeze({
  no_quote: "a claim with nothing quoted has no bytes to anchor — anchoring applies to a direct quotation, never to a paraphrase",
  no_source_url: "this claim's witness is not a fetched web page (a local or pasted source, or the instrument's own ledger) — archive-anchoring only applies to a live URL",
  archive_failed: "the archive crossing could not verify a snapshot for this URL",
  network_gap: "the archive/snapshot crossing threw or returned nothing — treated as a failed verification, never as a silent pass",
  quote_not_found: "a snapshot exists and was read, but the quoted words were not found in its text — the quote is not anchored to this address",
});

/**
 * quoteFoundAt(haystack, quote) — the byte offset of the quoted text in the
 * fetched snapshot bytes, whitespace-normalized on both sides (a real page
 * re-wraps its own prose; the quote's own punctuation and case are kept
 * exact — this is a containment check on a claimed VERBATIM quote, not a
 * fuzzy one). Returns { start, end } in the ORIGINAL (unnormalized)
 * haystack via a position map, or null.
 */
export function quoteFoundAt(haystack, quote) {
  const hay = String(haystack ?? "");
  const q = String(quote ?? "").trim();
  if (!q) return null;
  // Fast path: exact substring.
  const direct = hay.indexOf(q);
  if (direct >= 0) return { start: direct, end: direct + q.length };
  // Whitespace-normalized path, mapped back to original offsets.
  const positions = [];
  let norm = "";
  let prevWasSpace = true;
  for (let i = 0; i < hay.length; i += 1) {
    const ch = hay[i];
    if (/\s/.test(ch)) {
      if (!prevWasSpace) { norm += " "; positions.push(i); prevWasSpace = true; }
      continue;
    }
    norm += ch;
    positions.push(i);
    prevWasSpace = false;
  }
  const qNorm = q.replace(/\s+/g, " ").trim();
  const at = norm.indexOf(qNorm);
  if (at < 0) return null;
  const start = positions[at];
  const endIdx = at + qNorm.length - 1;
  const end = positions[Math.min(endIdx, positions.length - 1)] + 1;
  return { start, end };
}

/**
 * anchorClaim(claim, { archive, readSnapshot }) — verify one claim against
 * archive.org and return its anchoring standing.
 *
 *   claim: { quote, sourceUrl, ends? } — `quote` the verbatim string being
 *          asserted; `sourceUrl` the live page it is claimed from.
 *   archive(url) — async → { status: "saved"|"failed", snapshotUrl?,
 *          detail? } — the-fold's archivePage/verifySnapshot shape,
 *          injected. May throw or return null; both are read as a gap.
 *   readSnapshot(snapshotUrl) — async → { text } | { gap } — reads the
 *          bytes of the VERIFIED snapshot itself (never the live URL) so
 *          the quote is confirmed against the address the reader can
 *          follow, not against whatever the live page now says.
 *
 * Returns one of (the organ's own fields always win over any same-named
 * field the caller's `claim` object happens to carry — `...claim` is
 * spread FIRST, never last, so nothing on the claim can shadow the
 * verdict this organ is the one thing responsible for deciding):
 *   { ...claim, standing: NOT_A_URL }
 *   { ...claim, standing: UNANCHORED, reason, detail }
 *   { ...claim, standing: ANCHORED, snapshotUrl, span: {start,end}, snippet }
 */
export async function anchorClaim(claim, { archive, readSnapshot } = {}) {
  const quote = String(claim?.quote ?? "").trim();
  const sourceUrl = claim?.sourceUrl ? String(claim.sourceUrl) : null;
  // These two are decided from the claim's own shape alone — no crossing
  // is ever spent on a claim that could not possibly reach one.
  if (!quote) return { ...claim, standing: ANCHOR_STANDINGS.UNANCHORED, reason: "no_quote", detail: REFUSALS.no_quote };
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return { ...claim, standing: ANCHOR_STANDINGS.NOT_A_URL };
  if (typeof archive !== "function" || typeof readSnapshot !== "function")
    throw new TypeError("archive-anchor.anchorClaim: archive() and readSnapshot() are injected — this organ owns no network");

  let saved;
  try { saved = await archive(sourceUrl); } catch (err) { saved = null; }
  if (!saved || saved.status !== "saved" || !saved.snapshotUrl)
    return { ...claim, standing: ANCHOR_STANDINGS.UNANCHORED, reason: "archive_failed", detail: saved?.detail ?? REFUSALS.archive_failed };

  let got;
  try { got = await readSnapshot(saved.snapshotUrl); } catch (err) { got = null; }
  if (!got || got.gap || got.text == null)
    return { ...claim, standing: ANCHOR_STANDINGS.UNANCHORED, reason: "network_gap", detail: got?.gap?.detail ?? REFUSALS.network_gap, snapshotUrl: saved.snapshotUrl };

  const span = quoteFoundAt(got.text, quote);
  if (!span) return { ...claim, standing: ANCHOR_STANDINGS.UNANCHORED, reason: "quote_not_found", detail: REFUSALS.quote_not_found, snapshotUrl: saved.snapshotUrl };

  return { ...claim, standing: ANCHOR_STANDINGS.ANCHORED, snapshotUrl: saved.snapshotUrl, span, snippet: got.text.slice(span.start, span.end) };
}

/**
 * anchorClaims(claims, deps) — sequential over a list (never a fan-out
 * burst — the same posture P84's proof-seeking tier and ranke.js already
 * hold for a network crossing), returning one anchoring result per claim
 * in the same order. A caller wanting a budget wraps `archive`/
 * `readSnapshot` in its own counter, the same pattern ranke.js's
 * `cachedFetch` uses — this organ declares no budget itself.
 */
export async function anchorClaims(claims, deps) {
  const out = [];
  for (const c of claims ?? []) out.push(await anchorClaim(c, deps));
  return out;
}
