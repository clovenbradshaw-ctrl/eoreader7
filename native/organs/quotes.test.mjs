// node --test quotes.test.mjs
//
// A quotation is the source's bytes or it is not printed as one. These
// tests run against real chunks from source.js's own chunker, so the
// anchors' coordinate space is the app's actual ref space.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MIN_QUOTE_WORDS,
  applyQuotes,
  extractQuotedSpans,
  quoteFindings,
  quoteOpens,
  verifyQuotes,
} from "./quotes.js";
import { chunkSource, readRange } from "./source.js";

const DOC =
  "That evening Hélène spoke plainly to the whole assembly. " +
  "She said that the harbour committee had disputed the silting figure at great length, " +
  "and that no engineer present would defend it.\n\n" +
  "Later the record showed the figure was twelve percent per decade, " +
  "and the committee's dispute collapsed within the year.";
const CHUNKS = chunkSource("assembly.txt", DOC);

const POOL_DOC = "The northern quay was closed for repairs before the spring thaw arrived that year.";
const POOL = [...CHUNKS, ...chunkSource("quay.txt", POOL_DOC)];

test("extraction pairs straight quotes by position, across line breaks", () => {
  const spans = extractQuotedSpans(
    'He wrote "the harbour committee had disputed\nthe silting figure" and then "no engineer present would defend it" at the end.',
  );
  assert.equal(spans.length, 2);
  assert.match(spans[0].content, /^the harbour committee/);
  assert.match(spans[1].content, /^no engineer/);
  // Below the floor, a "quote" is not judged.
  assert.equal(extractQuotedSpans('He said "not really much" here.').length, 0);
});

test("a verbatim quotation earns its verdict and a checkable anchor", () => {
  const answer = 'The minutes say "the harbour committee had disputed the silting figure" that night.';
  const { examined, quotes } = verifyQuotes(answer, CHUNKS);
  assert.equal(examined, true);
  assert.equal(quotes.length, 1);
  assert.equal(quotes[0].status, "verbatim");
  const seg = quotes[0].segments[0];
  assert.ok(seg.ref, "the chunk address rides the segment");
  // The anchor names real chars of the real source: read them back.
  const m = seg.anchor.match(/^assembly\.txt#(\d+)-(\d+)$/);
  assert.ok(m, seg.anchor);
  assert.equal(
    DOC.slice(Number(m[1]), Number(m[2])).replace(/\s+/g, " "),
    "the harbour committee had disputed the silting figure",
  );
});

test("a drifted quotation is backported to the source's own bytes, and cited", () => {
  // The model folds the accent and re-cases a word — every token passes the
  // byte check, and the quotation is still not what the material wrote.
  const answer = 'As the record puts it, "That evening Helene spoke plainly to the whole assembly." Nothing more happened.';
  const report = verifyQuotes(answer, CHUNKS);
  assert.equal(report.quotes[0].status, "drifted");
  const { text, corrections, cited } = applyQuotes(answer, report);
  assert.match(text, /Hélène spoke plainly/, "the source's accent is restored");
  assert.match(text, /That evening Hélène/, "the source's own casing stands");
  assert.equal(corrections.length, 1);
  assert.ok(cited.length >= 1, "the repaired quote carries its address");
  assert.match(text, /assembly\.txt#\d+-\d+\]/);

  // Idempotent: running the repair on repaired text changes nothing.
  const again = applyQuotes(text, verifyQuotes(text, CHUNKS));
  assert.equal(again.text, text);
  assert.equal(again.corrections.length, 0);
});

test("a fabricated quotation is unlocated and lands on the unsupported list", () => {
  const answer = 'The chair allegedly said "we will bury the report before the equinox arrives" to the clerk.';
  const report = verifyQuotes(answer, CHUNKS);
  assert.equal(report.quotes[0].status, "unlocated");
  const lines = quoteFindings(report);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /quotation not found in the material/);
  // And the repair leaves it untouched — there are no bytes to backport.
  assert.equal(applyQuotes(answer, report).text, answer);
});

test("a real quotation from unoffered material is typed outside-offer, never silently warranted", () => {
  const answer = 'One aside noted "The northern quay was closed for repairs" in passing.';
  const report = verifyQuotes(answer, CHUNKS, { pool: POOL });
  assert.equal(report.quotes[0].status, "outside-offer");
  // An open entry, not an accusation — and not an inline address.
  assert.equal(quoteFindings(report).length, 0);
  const opens = quoteOpens(report);
  assert.equal(opens.length, 1);
  assert.match(opens[0], /outside the offered passages/);
  assert.match(opens[0], /quay\.txt#\d+-\d+/);
  const { text, cited } = applyQuotes(answer, report);
  assert.equal(cited.length, 0);
  assert.ok(!/\[quay\.txt#/.test(text), "no warrant for material the turn was not given");
});

test("an ellipsis quotation whose every shown segment is in the bytes is verbatim, and cited", () => {
  // Elision is legitimate: a quotation may skip material. What it SHOWS is
  // what is judged, and here both shown segments are the source's bytes.
  const answer =
    'The minutes say "the harbour committee had disputed the silting figure ... no engineer present would defend it" that night.';
  const report = verifyQuotes(answer, CHUNKS);
  assert.equal(report.quotes[0].status, "verbatim");
  assert.equal(report.quotes[0].segments.length, 2);
  assert.deepEqual(report.quotes[0].missingSegments, []);
  assert.equal(quoteFindings(report).length, 0);
  const { text, cited } = applyQuotes(answer, report);
  assert.ok(cited.length >= 1, "an elided quotation that is wholly in the bytes still earns its address");
  assert.match(text, /assembly\.txt#\d+-\d+\]/);
});

test("an ellipsis quotation with a fabricated segment earns no address and drives correction", () => {
  // The audit's harbour-committee scenario: the first segment is the
  // source's bytes, the second was invented. A quotation that shows words
  // the material never wrote is not verbatim, whatever else it shows — so
  // the located half must not hand the invented half a warrant.
  const answer =
    'The minutes say "the harbour committee had disputed the silting figure ' +
    '... and agreed to bury the report before the equinox" that night.';
  const report = verifyQuotes(answer, CHUNKS);
  const q = report.quotes[0];
  assert.equal(q.status, "partial");
  assert.equal(q.unlocatedSegments, 1);
  assert.deepEqual(q.missingSegments, ["and agreed to bury the report before the equinox"]);

  // (a) never an inline warrant — the located segment's chunk address is
  // not stamped on a quotation whose other half is invented.
  const { text, cited } = applyQuotes(answer, report);
  assert.deepEqual(cited, [], "a partly invented quotation earns no address");
  assert.ok(!/\[assembly\.txt#\d+-\d+\]/.test(text), text);

  // (b) it drives the correction loop the way a fabricated quotation does —
  // holon.js folds quoteFindings into `unsupported`, which is the driver.
  const lines = quoteFindings(report);
  assert.equal(lines.length, 1);
  // and the reader is told WHICH segment failed, since that is the useful fact.
  assert.match(lines[0], /bury the report before the equinox/);
  assert.match(lines[0], /segment/);
  // It is an accusation, not an open: nothing here is "real words, wrong warrant".
  assert.equal(quoteOpens(report).length, 0);
});

test("a fabricated segment outranks an outside-offer one: a finding, never an open", () => {
  // One quotation, three segments: offered bytes, live-but-unoffered bytes,
  // and invention. Precedence must be the fabrication's — typing this
  // `outside-offer` filed the invented segment as a disclosure and left the
  // record with no accusation at all.
  const answer =
    'One aside noted "the harbour committee had disputed the silting figure ' +
    '... The northern quay was closed for repairs ' +
    '... and agreed to bury the report before the equinox" in passing.';
  const report = verifyQuotes(answer, CHUNKS, { pool: POOL });
  assert.equal(report.quotes[0].status, "partial");
  assert.deepEqual(report.quotes[0].missingSegments, ["and agreed to bury the report before the equinox"]);
  assert.equal(quoteOpens(report).length, 0, "invention is not a disclosure");
  const lines = quoteFindings(report);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /bury the report before the equinox/);
  const { text, cited } = applyQuotes(answer, report);
  assert.deepEqual(cited, []);
  assert.ok(!/\[assembly\.txt#/.test(text), text);
  assert.ok(!/\[quay\.txt#/.test(text), text);
});

test("the invariant, over every verdict: invented words earn a finding and never an address", () => {
  // The structural rule the statuses are only a naming of: if a quotation
  // SHOWS a segment that is in no material, it is a finding (one line per
  // invented segment) and it carries no warrant — whatever else it shows,
  // and whatever the verdict is called. Stated as a property so a verdict
  // added later cannot quietly re-open the hole.
  const answers = [
    'The minutes say "the harbour committee had disputed the silting figure" that night.',
    'The minutes say "the harbour committee had disputed the silting figure ... no engineer present would defend it" that night.',
    'As the record puts it, "That evening Helene spoke plainly to the whole assembly." Nothing more.',
    'The chair allegedly said "we will bury the report before the equinox arrives" to the clerk.',
    'One aside noted "The northern quay was closed for repairs" in passing.',
    'The minutes say "the harbour committee had disputed the silting figure ... and agreed to bury the report before the equinox" that night.',
    'One aside noted "the harbour committee had disputed the silting figure ... The northern quay was closed for repairs ... and agreed to bury the report before the equinox" in passing.',
  ];
  let seen = 0;
  for (const answer of answers) {
    const report = verifyQuotes(answer, CHUNKS, { pool: POOL });
    for (const q of report.quotes) {
      const invented = q.missingSegments ?? [];
      if (!invented.length) continue;
      seen++;
      const one = { quotes: [q] };
      assert.equal(quoteFindings(one).length, invented.length, `a finding per invented segment: ${q.text}`);
      assert.deepEqual(applyQuotes(answer, one).cited, [], `no warrant for invented words: ${q.text}`);
    }
  }
  assert.equal(seen, 3, "the corpus above holds three quotations with invented words");
});

test("an already-cited quotation is not double-tagged", () => {
  const base = 'It reads "the harbour committee had disputed the silting figure"';
  const first = applyQuotes(`${base} today.`, verifyQuotes(`${base} today.`, CHUNKS));
  const tagged = first.text;
  const again = applyQuotes(tagged, verifyQuotes(tagged, CHUNKS));
  const tags = [...again.text.matchAll(/\[assembly\.txt#\d+-\d+\]/g)];
  assert.equal(tags.length, 1, again.text);
});

test("nothing offered means unexamined, not clean", () => {
  const report = verifyQuotes('She said "the harbour committee had disputed the silting figure" then.', []);
  assert.equal(report.examined, false);
  assert.equal(quoteFindings(report).length, 0, "no material, no accusation");
});

test("the floor is a declaration", () => {
  assert.equal(MIN_QUOTE_WORDS, 5);
});

test("readRange round trip: the appended address re-opens to the quoted bytes", () => {
  const answer = 'The minutes say "no engineer present would defend it" plainly.';
  const { text } = applyQuotes(answer, verifyQuotes(answer, CHUNKS));
  const ref = text.match(/\[(assembly\.txt#\d+-\d+)\]/)?.[1];
  assert.ok(ref, text);
  const opened = readRange({ "assembly.txt": DOC }, ref);
  assert.ok(opened, "the chunk address must re-open");
  assert.match(opened.replace(/\s+/g, " "), /no engineer present would defend it/);
});
