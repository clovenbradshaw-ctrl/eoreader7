// archive-anchor.test.mjs — offline, real organ, scripted archive/snapshot
// crossings (the-fold's own explore-server.mjs is a server this repo does
// not own; this file's stubs mirror its documented return shape — this is
// the SAME posture ranke.test.mjs already holds for its stub fetch/search
// organs — nothing here fakes the wall this organ enforces).
import test from "node:test";
import assert from "node:assert/strict";
import { anchorClaim, anchorClaims, quoteFoundAt, ANCHOR_STANDINGS, REFUSALS } from "./archive-anchor.js";

test("quoteFoundAt: exact substring, and whitespace-normalized re-wrapped text, both find the real offsets", () => {
  const hay = "Before. The quick brown fox jumps over the lazy dog. After.";
  const exact = quoteFoundAt(hay, "The quick brown fox jumps over the lazy dog.");
  assert.deepEqual(exact, { start: 8, end: 52 });
  assert.equal(hay.slice(exact.start, exact.end), "The quick brown fox jumps over the lazy dog.");

  const wrapped = "Before.\n  The   quick\nbrown fox jumps  over\tthe lazy dog. After.";
  const found = quoteFoundAt(wrapped, "The quick brown fox jumps over the lazy dog.");
  assert.ok(found, "a re-wrapped quote is still found");
  assert.equal(wrapped.slice(found.start, found.end).replace(/\s+/g, " "), "The quick brown fox jumps over the lazy dog.");

  assert.equal(quoteFoundAt(hay, "the dog jumped over the fox"), null, "words present but reordered is not the same quote");
  assert.equal(quoteFoundAt(hay, ""), null);
});

test("anchorClaim: a claim with no quote never reaches the network — REFUSED unanchored, no_quote", async () => {
  let called = false;
  const r = await anchorClaim({ quote: "", sourceUrl: "https://example.com/a" }, {
    archive: async () => { called = true; return { status: "saved", snapshotUrl: "https://web.archive.org/web/2/https://example.com/a" }; },
    readSnapshot: async () => ({ text: "anything" }),
  });
  assert.equal(r.standing, ANCHOR_STANDINGS.UNANCHORED);
  assert.equal(r.reason, "no_quote");
  assert.equal(called, false, "no_quote is decided before any crossing runs");
});

test("anchorClaim: a claim with no source URL (a local/pasted source) is NOT_A_URL — out of scope, never a failure", async () => {
  const r = await anchorClaim({ quote: "the city council voted", sourceUrl: null });
  assert.equal(r.standing, ANCHOR_STANDINGS.NOT_A_URL);
});

test("anchorClaim: a real quote, a real snapshot address, the words present in the fetched bytes — ANCHORED with a byte span", async () => {
  const url = "https://example.com/ordinance";
  const snapshot = "https://web.archive.org/web/20260101000000/https://example.com/ordinance";
  const pageText = "Section 4.2: No short-term rental shall exceed thirty consecutive days without a renewal permit.";
  const r = await anchorClaim({ quote: "No short-term rental shall exceed thirty consecutive days without a renewal permit.", sourceUrl: url }, {
    archive: async (u) => { assert.equal(u, url); return { status: "saved", snapshotUrl: snapshot }; },
    readSnapshot: async (s) => { assert.equal(s, snapshot); return { text: pageText }; },
  });
  assert.equal(r.standing, ANCHOR_STANDINGS.ANCHORED);
  assert.equal(r.snapshotUrl, snapshot);
  assert.equal(pageText.slice(r.span.start, r.span.end), "No short-term rental shall exceed thirty consecutive days without a renewal permit.");
});

// ── the adversarial wall: verification FAILURE never renders/returns anchored ──
test("ADVERSARIAL: archivePage-shaped crossing reports 'failed' — the claim is UNANCHORED, never anchored on the far side's own optimism", async () => {
  const r = await anchorClaim({ quote: "The bridge collapsed in 1998.", sourceUrl: "https://example.com/report" }, {
    archive: async () => ({ status: "failed", detail: "snapshot never resolved a challenge page" }),
    readSnapshot: async () => { throw new Error("should never be called — archive() already refused"); },
  });
  assert.equal(r.standing, ANCHOR_STANDINGS.UNANCHORED);
  assert.equal(r.reason, "archive_failed");
});

test("ADVERSARIAL: archive() throws — read as a gap, never as a pass", async () => {
  const r = await anchorClaim({ quote: "x y z quote words here", sourceUrl: "https://example.com/a" }, {
    archive: async () => { throw new Error("network reset"); },
    readSnapshot: async () => ({ text: "irrelevant" }),
  });
  assert.equal(r.standing, ANCHOR_STANDINGS.UNANCHORED);
});

test("ADVERSARIAL: archivePage-shaped crossing SAYS 'saved' but the snapshot bytes do not contain the claimed quote — UNANCHORED (the fabricated-quote case this whole feature exists to catch)", async () => {
  const r = await anchorClaim({ quote: "The mayor personally approved every permit that year.", sourceUrl: "https://example.com/real-page" }, {
    archive: async () => ({ status: "saved", snapshotUrl: "https://web.archive.org/web/2/https://example.com/real-page" }),
    readSnapshot: async () => ({ text: "This page discusses zoning variances and says nothing about the mayor's personal approval of permits." }),
  });
  assert.equal(r.standing, ANCHOR_STANDINGS.UNANCHORED);
  assert.equal(r.reason, "quote_not_found");
  assert.equal(r.snapshotUrl, "https://web.archive.org/web/2/https://example.com/real-page", "the snapshot address is disclosed even though the quote failed — never hidden, never re-labeled as if it verified");
});

test("ADVERSARIAL: readSnapshot returns a gap after a 'saved' archive() verdict — still UNANCHORED, the 'saved' claim alone is never trusted", async () => {
  const r = await anchorClaim({ quote: "some quoted words that are long enough", sourceUrl: "https://example.com/a" }, {
    archive: async () => ({ status: "saved", snapshotUrl: "https://web.archive.org/web/2/https://example.com/a" }),
    readSnapshot: async () => ({ gap: { type: "beyond-reach", detail: "challenge page" } }),
  });
  assert.equal(r.standing, ANCHOR_STANDINGS.UNANCHORED);
  assert.equal(r.reason, "network_gap");
});

test("anchorClaim: injecting neither archive nor readSnapshot throws — this organ owns no network and will not silently no-op", async () => {
  await assert.rejects(() => anchorClaim({ quote: "x", sourceUrl: "https://example.com" }, {}), TypeError);
});

test("anchorClaims: sequential, one result per input, order preserved, mixed standings", async () => {
  const claims = [
    { quote: "alpha bravo charlie delta words", sourceUrl: "https://a.example/1" },
    { quote: "", sourceUrl: "https://a.example/2" },
    { quote: "echo foxtrot", sourceUrl: null },
  ];
  const rs = await anchorClaims(claims, {
    archive: async () => ({ status: "saved", snapshotUrl: "https://web.archive.org/web/2/https://a.example/1" }),
    readSnapshot: async () => ({ text: "alpha bravo charlie delta words appear right here" }),
  });
  assert.equal(rs.length, 3);
  assert.equal(rs[0].standing, ANCHOR_STANDINGS.ANCHORED);
  assert.equal(rs[1].standing, ANCHOR_STANDINGS.UNANCHORED); // no_quote
  assert.equal(rs[2].standing, ANCHOR_STANDINGS.NOT_A_URL);
});

test("REFUSALS is a fixed, named vocabulary — every code path in this file uses one of its keys", () => {
  assert.deepEqual(Object.keys(REFUSALS).sort(), ["archive_failed", "network_gap", "no_quote", "no_source_url", "quote_not_found"].sort());
});
