// whitepaper.test.mjs — composing a document from a REAL kernel/notes.js
// ledger, with archive-anchoring exercised for real (offline: a scripted
// archive/readSnapshot crossing, the same posture ranke.test.mjs and
// archive-anchor.test.mjs already hold — no stub of composeWhitepaper's
// OWN logic, only of the network it is forbidden to own).
import test from "node:test";
import assert from "node:assert/strict";
import * as nativeTaskLog from "../kernel/task-log.js";
import { makeNotes } from "../kernel/notes.js";
import { composeWhitepaper, claimOf, REFUSALS } from "./whitepaper.js";
import { ANCHOR_STANDINGS } from "./archive-anchor.js";
import { renderWhitepaperHtml } from "./whitepaper-html.js";

const notes = makeNotes({ taskLog: nativeTaskLog });

function ledger() {
  let log = notes.createNotes({ frame: { reader: "whitepaper.test", walls: true } });
  // A claim with a real quotable span from a real live URL.
  log = notes.hear(log, {
    end1: "the ordinance", label: "requires", end2: "a renewal permit every thirty days",
    witness: "https://example.gov/ordinance-4-2",
    spans: [{ ref: "https://example.gov/ordinance-4-2", at: "https://example.gov/ordinance-4-2#40-140", text: "No short-term rental shall exceed thirty consecutive days without a renewal permit." }],
  });
  // A second claim from a source archive verification will FAIL for.
  log = notes.hear(log, {
    end1: "the council", label: "voted", end2: "unanimously in favor",
    witness: "https://example.gov/minutes-2026-01",
    spans: [{ ref: "https://example.gov/minutes-2026-01", at: "https://example.gov/minutes-2026-01#0-30", text: "The council voted 7-0 to adopt the ordinance." }],
  });
  // A claim from a LOCAL source — no URL, out of scope for archiving.
  log = notes.hear(log, {
    end1: "the pasted memo", label: "states", end2: "a January deadline",
    witness: "pasted-memo.txt",
    spans: [{ ref: "pasted-memo.txt", at: "pasted-memo.txt#0-20", text: "Deadline: January 15." }],
  });
  // A claim with no span at all — ordinary prose, nothing to quote.
  log = notes.hear(log, { end1: "the registry", label: "covers", end2: "every listed unit", witness: "https://example.gov/registry" });
  return notes.fold(log);
}

const byId = (folded) => new Map(folded.map((n) => [n.id, n]));
// fold() sorts by witness count then id — never by insertion order — so
// tests pick a note by its own content, not by array position.
const find = (folded, end1) => folded.find((n) => n.end1 === end1);

test("claimOf: reads the arrangement's own words, the span's text as the quote, and the witness's URL as the source", () => {
  const permit = find(ledger(), "the ordinance");
  const c = claimOf(permit);
  assert.equal(c.text, "the ordinance requires a renewal permit every thirty days");
  assert.equal(c.quote, "No short-term rental shall exceed thirty consecutive days without a renewal permit.");
  assert.equal(c.sourceUrl, "https://example.gov/ordinance-4-2");
});

test("composeWhitepaper: refuses outright without a declared section order — never falls back to fold order", async () => {
  const r = await composeWhitepaper(byId(ledger()), { title: "x" }, {});
  assert.equal(r.refused.type, "no_sections");
  assert.equal(r.refused.detail, REFUSALS.no_sections);
});

test("composeWhitepaper: an unknown noteId in a declared section is disclosed as withheld, never silently skipped", async () => {
  const folded = ledger();
  const notesById = byId(folded);
  const permit = find(folded, "the ordinance");
  const r = await composeWhitepaper(notesById, { title: "x", sections: [{ heading: "H", noteIds: [permit.id, "nonexistent-id"] }] }, {
    archive: async () => ({ status: "saved", snapshotUrl: "https://web.archive.org/web/2/https://example.gov/ordinance-4-2" }),
    readSnapshot: async () => ({ text: "No short-term rental shall exceed thirty consecutive days without a renewal permit." }),
  });
  assert.equal(r.sections[0].withheld.length, 1);
  assert.equal(r.sections[0].withheld[0].noteId, "nonexistent-id");
});

test("composeWhitepaper: a real ledger, real archiving crossing — one claim ANCHORED, one UNANCHORED (verification failed), one NOT_A_URL (local source), one with no quote at all", async () => {
  const folded = ledger();
  const permit = find(folded, "the ordinance");
  const minutes = find(folded, "the council");
  const memo = find(folded, "the pasted memo");
  const registry = find(folded, "the registry");
  const notesById = byId(folded);
  const r = await composeWhitepaper(notesById, {
    title: "The Registry",
    sections: [
      { heading: "The rule", noteIds: [permit.id, registry.id] },
      { heading: "Adoption", noteIds: [minutes.id] },
      { heading: "Internal memo", noteIds: [memo.id] },
    ],
  }, {
    archive: async (url) => {
      if (url === permit.witnesses[0]) return { status: "saved", snapshotUrl: "https://web.archive.org/web/2/https://example.gov/ordinance-4-2" };
      // the minutes page's archive attempt genuinely fails
      return { status: "failed", detail: "snapshot never resolved past a challenge page" };
    },
    readSnapshot: async () => ({ text: "No short-term rental shall exceed thirty consecutive days without a renewal permit. Additional context on the ordinance page." }),
  });

  assert.equal(r.title, "The Registry");
  assert.equal(r.coverage.total, 3, "three claims carried a quote — the memo and registry claims did not");
  assert.equal(r.coverage.anchored, 1);
  assert.equal(r.coverage.unanchored, 1);
  assert.equal(r.coverage.notAUrl, 1);

  const ruleSection = r.sections[0];
  const permitClaim = ruleSection.claims.find((c) => c.noteId === permit.id);
  assert.equal(permitClaim.quotes[0].standing, ANCHOR_STANDINGS.ANCHORED);
  assert.ok(permitClaim.quotes[0].snapshotUrl.startsWith("https://web.archive.org/"));

  const registryClaim = ruleSection.claims.find((c) => c.noteId === registry.id);
  assert.equal(registryClaim.quotes.length, 0, "no span, no quote, nothing to anchor");

  const minutesClaim = r.sections[1].claims[0];
  assert.equal(minutesClaim.quotes[0].standing, ANCHOR_STANDINGS.UNANCHORED);
  assert.equal(minutesClaim.quotes[0].reason, "archive_failed");

  const memoClaim = r.sections[2].claims[0];
  assert.equal(memoClaim.quotes[0].standing, ANCHOR_STANDINGS.NOT_A_URL);

  // The HTML render draws the anchored quote as a real link and the
  // unanchored one as a visibly distinct, non-linking element — never the
  // same markup.
  const html = renderWhitepaperHtml(r);
  assert.match(html, /class="quote-anchor" href="https:\/\/web\.archive\.org\//);
  assert.match(html, /class="quote-unanchored"/);
  assert.match(html, /UNVERIFIED/);
  assert.doesNotMatch(html, /<script/i, "static, inert HTML — no script anywhere");
});

test("ADVERSARIAL: a fabricated quote whose real source page does NOT contain it never renders anchored, end to end through composeWhitepaper + the HTML render", async () => {
  let log = notes.createNotes({});
  log = notes.hear(log, {
    end1: "the mayor", label: "approved", end2: "every permit personally",
    witness: "https://example.gov/press-release",
    spans: [{ ref: "https://example.gov/press-release", at: "https://example.gov/press-release#0-40", text: "The mayor personally approved every permit issued that year." }],
  });
  const folded = notes.fold(log);
  const notesById = byId(folded);
  const r = await composeWhitepaper(notesById, { title: "x", sections: [{ heading: "H", noteIds: [folded[0].id] }] }, {
    archive: async () => ({ status: "saved", snapshotUrl: "https://web.archive.org/web/2/https://example.gov/press-release" }),
    // The REAL page, once read, never actually says this — the archive
    // call succeeding is not enough; the words themselves are absent.
    readSnapshot: async () => ({ text: "The city council approved a routine batch of permits at its regular meeting. The mayor did not attend." }),
  });
  assert.equal(r.coverage.anchored, 0);
  assert.equal(r.coverage.unanchored, 1);
  const html = renderWhitepaperHtml(r);
  // The footer LEGEND explaining the two marks is not itself a claim, so it
  // legitimately carries `class="quote-anchor"` with no href — the real
  // wall is that no claim's OWN rendered quote links anywhere.
  assert.doesNotMatch(html, /<a class="quote-anchor"/, "a claim whose archived source does not contain the quote NEVER renders as an anchored link");
  assert.match(html, /quote_not_found/);
});
