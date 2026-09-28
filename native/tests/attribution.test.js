// native/tests/attribution.test.js — who is speaking, and the refusals that
// keep the answer honest.

import test from "node:test";
import assert from "node:assert/strict";
import { quotationFrames, quotedSpans, attributeQuotation, narrationFrames, holderAt, rayaFrames, raySpans } from "../adapters/text/attribution.js";

test("the continued-quotation convention is read off the bytes: a run of opened-but-unclosed paragraphs is one embedded telling", () => {
  const text = [
    "He began his tale.",
    "“I remember the first days of my being.",
    "“By degrees I learned to distinguish the operations of my senses.",
    "“Such was the history of my cottagers.”",
    "The being finished speaking.",
  ].join("\n\n");
  const q = quotationFrames(text);
  assert.equal(q.embeddedFrames.length, 1, "three quoted paragraphs are ONE telling, not three");
  assert.equal(q.embeddedFrames[0].paragraphs, 3);
  assert.ok(text.slice(q.embeddedFrames[0].start, q.embeddedFrames[0].end).startsWith("“I remember"), "the span re-slices to the quoted material (P5.2)");
});

test("one paragraph of ordinary dialogue is not an embedded frame", () => {
  const q = quotationFrames("“Good evening,” said Clerval.\n\nThey walked on.");
  assert.equal(q.embeddedFrames.length, 0);
  assert.equal(q.counted.closed, 1);
});

test("a quotation is bounded by its own marks, not by its paragraph — the speaker tag sits inside the block", () => {
  const text = "He turned. “Good evening,” said Clerval, and we walked on together toward the lake.";
  const { spans } = quotedSpans(text);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].text, "“Good evening,”");
  assert.ok(spans[0].after.startsWith(" said Clerval"), "the tag is in `after` — taking the PARAGRAPH's end instead put it out of reach, which is what made the first live run attribute 2.8% (P5.5: the driver, not the theory)");
  const isVerb = (w) => w.toLowerCase() === "said";
  const referentFor = (s) => (s === "Clerval" ? "ref:auto:clerval" : null);
  assert.equal(attributeQuotation(spans[0].before, spans[0].after, { isVerb, referentFor }).speaker, "ref:auto:clerval");
});

test("attribution needs a verb the prior admits AND a name the reading admitted — neither alone", () => {
  const isVerb = (w) => ["said", "exclaimed"].includes(w.toLowerCase());
  const referentFor = (s) => (["Clerval", "Elizabeth"].includes(s) ? `ref:auto:${s.toLowerCase()}` : null);
  assert.equal(attributeQuotation("", "” said Clerval, and we walked", { isVerb, referentFor }).speaker, "ref:auto:clerval");
  assert.equal(attributeQuotation("Elizabeth said, ", "", { isVerb, referentFor }).speaker, "ref:auto:elizabeth");
  // A verb beside an unknown name: no speaker. A known name beside a
  // non-verb: no speaker. Both are gaps, not guesses.
  assert.equal(attributeQuotation("", "” said Mrs", { isVerb, referentFor }).gap.type, "attribution_unwitnessed");
  assert.equal(attributeQuotation("", "” beside Clerval", { isVerb, referentFor }).gap.type, "attribution_unwitnessed");
  assert.throws(() => attributeQuotation("", "", {}), /injected/, "the prior and the cast are injected, never derived here (P3)");
});

test("narration frames come from an injected prior; with none, a typed gap and NO guessed narrator", () => {
  const bare = narrationFrames("Chapter 1\n\nI am by birth a Genevese.");
  assert.equal(bare.frames.length, 0);
  assert.equal(bare.gap.type, "frame_prior_absent");
});

test("narratorSpans resolve by anchor, and an anchor that does not resolve is reported, never widened", () => {
  const text = "Walton writes. I am by birth a Genevese. Victor speaks. The being finished speaking. Victor again.";
  const prior = {
    source: "test prior",
    referents: [
      { id: "walton", narratorSpans: [{ toAnchor: "I am by birth a Genevese" }] },
      { id: "victor", narratorSpans: [{ fromAnchor: "I am by birth a Genevese", toAnchor: "The being finished speaking" }] },
      { id: "ghost", narratorSpans: [{ fromAnchor: "a line that is not in this text" }] },
    ],
  };
  const nf = narrationFrames(text, { framePrior: prior });
  assert.deepEqual(nf.narrators, ["victor", "walton"], "the unresolvable narrator is not among them");
  assert.equal(nf.unresolvedAnchors.length, 1);
  assert.equal(nf.unresolvedAnchors[0].narrator, "ghost");
  assert.equal(holderAt(0, { narration: nf }).holder, "walton");
  assert.equal(holderAt(text.indexOf("Victor speaks"), { narration: nf }).holder, "victor");
  assert.equal(holderAt(text.length - 1, { narration: nf }).gap, "outside_every_known_frame", "past the last frame is a gap, not the last narrator carried forward");
});

// ── STRAIGHT QUOTES (real, fetched Turkish prose) ───────────────────────────
// Genuinely downloaded, not fabricated: bbc.com/turkce/articles/c3rr448q5xdvo
// (BBC News Türkçe), fetched 2026-09-28, five consecutive real paragraphs of
// the article's own body text — a straight-ASCII-quote publication with
// ZERO curly quotes anywhere. Confirmed by direct character count of the
// site's own embedded JSON payload before this fixture was built: 60
// straight double quotes, 0 curly, across the whole article.
const BBC_STRAIGHT = [
  "AKP Genel Başkan Yardımcısı Fatma Betül Sayan Kaya, hakkında çıkan fon iddiaları nedeniyle görevinden istifa ettiğini duyurdu.",
  "X hesabında bir paylaşım yapan Sayan Kaya, \"ortaya atılan iddiaların hiçbir tereddüde mahal bırakmayacak şekilde açıklığa kavuşturulmasını son derece önemsediğini\" söyledi.",
  "Konuyla ilgili açıklamasında AKP Sözcüsü Ömer Çelik, Sayan Kaya'nın MYK ve MKYK üyeliklerinden \"affını istediğini\" ve bunun Cumhurbaşkanı Erdoğan tarafından kabul edildiğini söyledi. ",
  "Çelik, konuyla ilgili değerlendirmelerinde temel ilkelerinin,  \"Cumhurbaşkanımız ve Genel Başkanımızın 'sorumluluğu olan kim varsa hesap sorulacaktır' ifadesi\" olduğunu ekledi. ",
  "İstifanın ardından konuşan Yeni Parti Genel Başkanı Özgür Özel, Cumhurbaşkanı Erdoğan'a \"bataklığı kurutmak için birlikte çalışma\" çağrısı yaptı. ",
].join("\n\n");

test("quotationFrames alone (curly-only, pre-fix) finds NOTHING in real straight-quote prose — the confirmed bug", () => {
  // Reproduces the report exactly: n.straight is counted but never
  // consulted by the type-detection branches, so a paragraph with only
  // straight quotes gets `type: null` and is silently dropped.
  const before = { open: 0, close: 0 };
  for (const para of BBC_STRAIGHT.split("\n\n")) {
    let o = 0, c = 0;
    for (const ch of para) { if (ch === "“") o++; else if (ch === "”") c++; }
    before.open += o; before.close += c;
  }
  assert.equal(before.open, 0);
  assert.equal(before.close, 0, "zero curly marks anywhere in real straight-quote prose — the un-fixed branches had nothing to fire on");
});

test("quotationFrames reads all four straight-quote paragraphs as closed dialogue — every quote closes within its own paragraph, none crosses one", () => {
  const q = quotationFrames(BBC_STRAIGHT);
  assert.equal(q.paragraphs, 5);
  assert.equal(q.marked.length, 4, "the four paragraphs actually carrying a quotation; the bare intro sentence is not one");
  assert.ok(q.marked.every((m) => m.type === "closed"), "every real quote in this article closes within its own paragraph — an even straight-quote count, never a hanging one");
  assert.equal(q.counted.closed, 4);
  assert.equal(q.embeddedFrames.length, 0, "closed dialogue is not an embedded telling");
});

test("quotedSpans finds all four real quotations, byte-exact, including one with a nested straight single-quote left untouched", () => {
  const { spans, unclosed } = quotedSpans(BBC_STRAIGHT);
  assert.equal(spans.length, 4);
  assert.equal(unclosed, 0);
  assert.equal(spans[0].text, '"ortaya atılan iddiaların hiçbir tereddüde mahal bırakmayacak şekilde açıklığa kavuşturulmasını son derece önemsediğini"');
  assert.ok(spans[0].after.trimStart().startsWith("söyledi"), "the attribution verb sits in `after`, immediately following the closing mark");
  assert.equal(spans[1].text, '"affını istediğini"');
  // The nested case: a straight DOUBLE quote spanning a straight SINGLE
  // quote (Turkish's own apostrophe/quote convention, ' not " ) — the
  // single quote is not this module's STRAIGHT constant at all, so it
  // passes through untouched and the whole double-quoted span is found
  // as ONE span, not fractured at the inner mark.
  assert.equal(spans[2].text, "\"Cumhurbaşkanımız ve Genel Başkanımızın 'sorumluluğu olan kim varsa hesap sorulacaktır' ifadesi\"");
  assert.ok(spans[2].text.includes("'sorumluluğu"), "the nested single-quoted phrase rides inside the span, untouched");
  assert.equal(spans[3].text, '"bataklığı kurutmak için birlikte çalışma"');
  for (const s of spans) assert.equal(BBC_STRAIGHT.slice(s.byteStart, s.byteEnd), s.text, "every span re-slices to the received bytes (P5.2)");
});

test("disclosed, not silently claimed: attributeQuotation's verb-adjacent-to-name heuristic does not yet attribute this real specimen — Turkish's SOV order separates the name and the verb ACROSS the quote itself", () => {
  // \"Sayan Kaya, «quote» söyledi\" names the speaker BEFORE the quote and
  // states the verb AFTER it, with nothing adjacent to anything — neither
  // attributeQuotation's trailing form (verb immediately followed by a
  // name) nor its leading form (a name immediately followed by a verb)
  // matches a structure where the name and verb are separated by the
  // whole quotation. This is the same class of scoped-out limitation the
  // raya section above already discloses for Spanish attribution
  // (a real POS prior would need injecting, and even then the ADJACENCY
  // heuristic itself is English/Spanish-shaped) — named here rather than
  // silently implied solved, because this fix's own scope is DETECTION,
  // not cross-lingual attribution grammar.
  const { spans } = quotedSpans(BBC_STRAIGHT);
  const isVerb = (w) => ["söyledi", "yazdı", "ekledi", "yaptı"].includes(String(w).toLowerCase());
  const referentFor = (s) => ({ Sayan: "ref:sayan-kaya", Kaya: "ref:sayan-kaya", Çelik: "ref:celik", Özel: "ref:ozel" }[s] ?? null);
  for (const s of spans) {
    assert.equal(attributeQuotation(s.before, s.after, { isVerb, referentFor }).gap?.type, "attribution_unwitnessed");
  }
});

test("a mixed curly+straight text: curly wins where both appear in one paragraph, straight still claims a paragraph curly says nothing about", () => {
  const text = [
    "“Good evening,” said Clerval.",
    "The clerk read the note aloud: \"the shipment arrives Tuesday.\"",
  ].join("\n\n");
  const q = quotationFrames(text);
  assert.equal(q.marked.length, 2);
  assert.equal(q.marked[0].type, "closed");
  assert.equal(q.marked[1].type, "closed", "the second paragraph has no curly marks at all — straight claims it");
  const { spans } = quotedSpans(text);
  assert.equal(spans.length, 2);
  assert.equal(spans[0].text, "“Good evening,”");
  assert.equal(spans[1].text, '"the shipment arrives Tuesday."');
});

test("a genuinely unclosed straight quote is disclosed via `unclosed`, never silently dropped", () => {
  const q = quotedSpans('She began, "I never meant for any of this to happen');
  assert.equal(q.spans.length, 0);
  assert.equal(q.unclosed, 1);
});

test("quotationFrames tracks the straight convention ACROSS paragraphs too, the same way curly's own continued/resumed/closing already work", () => {
  const text = [
    '"I remember the first days of my being.',
    'By degrees I learned to distinguish the operations of my senses."',
  ].join("\n\n");
  const q = quotationFrames(text);
  assert.equal(q.marked[0].type, "continued");
  assert.equal(q.marked[1].type, "closing");
  assert.equal(q.embeddedFrames.length, 1);
});

// ── THE RUN-LEAK (found adversarially, real content) ────────────────────────
// A genuinely UNCLOSED quote — an ordinary truncation/typo artifact, not
// deliberate multi-paragraph authorship — left `open`/`straightOpen` stuck
// true, and every mark-free paragraph after it, however unrelated, was
// silently absorbed into that one run. Confirmed live against real,
// independently fetched en.wikinews.org prose by an adversarial pass built
// specifically to break this fix, then confirmed the identical shape was
// already latent in the pre-existing curly branch. Both closed together
// (quotationFrames's own header carries the fix and the reasoning); these
// pin the shape without needing the exact live fetch to reproduce it.
test("an unclosed straight quote does not swallow the unrelated paragraphs that follow it", () => {
  const text = [
    'The chief said, "the situation continues to worsen and',
    "the community remains on edge as officials investigate further reports.",
    "==Related news==",
    "==Sources==",
  ].join("\n\n");
  const q = quotationFrames(text);
  // Paragraph 1 opens a straight quote and never closes it (odd count = 1):
  // a real, honest "continued" — the run starts here, exactly as before.
  assert.equal(q.marked[0].type, "continued");
  // Paragraphs 2-4 carry NO quote mark of any kind. Before this fix they
  // were absorbed as "resumed" into the same run forever; now they are not
  // marked at all — narration and section headers are not dialogue just
  // because an earlier quote never closed.
  assert.equal(q.marked.length, 1, "only the genuinely marked paragraph is reported — the three mark-free ones that follow are not swept in");
  assert.equal(q.embeddedFrames.length, 0, "a run of ONE marked paragraph is not an embedded telling — quotationFrames's own >= 2 rule, now actually reachable instead of masked by the leak");
});

test("the SAME leak, in the pre-existing curly branch, is closed too — not left known-bad beside the fix that exposed it", () => {
  const text = [
    "“The situation continues to worsen, said the chief,",
    "as officials investigate further reports of unrest in the region.",
    "See also: related coverage.",
  ].join("\n\n");
  const q = quotationFrames(text);
  assert.equal(q.marked[0].type, "continued");
  assert.equal(q.marked.length, 1, "the two mark-free paragraphs after the unclosed curly quote are not absorbed either");
});

test("propagation still survives a mark-free paragraph — a LATER genuinely-marked paragraph still reads correctly against the carried-forward state", () => {
  const text = [
    '"He looked up and said,',
    "There was a long pause before anyone spoke.",
    'that everything would be fine."',
  ].join("\n\n");
  const q = quotationFrames(text);
  assert.equal(q.marked.length, 2, "the middle, mark-free paragraph is not reported, but the state it sits inside is not reset by it either");
  assert.equal(q.marked[0].type, "continued");
  assert.equal(q.marked[1].type, "closing", "the third paragraph still correctly closes the run the first opened, skipping over the unmarked middle one");
  assert.equal(q.embeddedFrames.length, 1);
  assert.equal(q.embeddedFrames[0].paragraphs, 2, "the run counts only the two paragraphs that actually carried a mark");
});

test("the founding Frankenstein convention is read identically after the leak fix — every 'resumed' paragraph there already carries its own mark", () => {
  const text = [
    "He began his tale.",
    "“I remember the first days of my being.",
    "“By degrees I learned to distinguish the operations of my senses.",
    "“Such was the history of my cottagers.”",
    "The being finished speaking.",
  ].join("\n\n");
  const q = quotationFrames(text);
  assert.equal(q.embeddedFrames.length, 1);
  assert.equal(q.embeddedFrames[0].paragraphs, 3, "unchanged: this convention's own paragraphs all carry marks, so the leak fix never touches this case");
});

// ── THE RAYA (real, fetched Spanish prose) ──────────────────────────────────
// Genuinely downloaded, not fabricated: es.wikisource.org's transcription of
// Galdós's "Marianela", chapter I (public domain), 2026-09-28. This exact
// paragraph carries none of OPEN/CLOSE/STRAIGHT, so quotationFrames alone
// finds zero dialogue in it — confirmed by running quotationFrames on it
// directly below before rayaFrames/raySpans existed to fix that.
const MARIANELA_REAL = "—No puedo equivocarme—murmuró.—Me dijeron que atravesara el rio por la pasadera.";
const MARIANELA_TAIL = "—Me he perdido, no hay duda de que me he perdido... Aquí tienes, Teodoro Golfin.";
const MARIANELA_TEXT = [MARIANELA_REAL, "Despues de andar largo trecho, añadió:", MARIANELA_TAIL].join("\n\n");

test("quotationFrames alone (the pre-existing English quote-mark mechanism) finds NOTHING in real raya prose — the confirmed bug", () => {
  const q = quotationFrames(MARIANELA_TEXT);
  assert.equal(q.marked.length, 0, "zero of OPEN/CLOSE/STRAIGHT anywhere in genuine Spanish literary dialogue");
});

test("rayaFrames reads the real specimen: a paragraph-initial em-dash is a speech turn, odd dash count is well-formed", () => {
  const r = rayaFrames(MARIANELA_TEXT);
  assert.equal(r.marked.length, 2, "two raya paragraphs; the plain narration paragraph in between is not one");
  assert.equal(r.marked[0].dashes, 3, "opens, closes into the attribution clause, reopens");
  assert.ok(r.marked[0].wellFormed);
  assert.equal(MARIANELA_TEXT.slice(r.marked[0].byteStart, r.marked[0].byteEnd), MARIANELA_REAL, "the span re-slices to the received bytes (P5.2)");
  assert.equal(r.marked[1].dashes, 1, "opens, and simply runs to the paragraph's own end — no closing mark expected");
  assert.equal(r.counted.turns, 2);
  assert.equal(r.counted.malformed, 0);
});

test("a paragraph's own parenthetical em-dash, mid-sentence, is never mistaken for the raya — position is the tell, never a bare dash count", () => {
  const ordinary = "El tiempo, frío y gris, encajaba con su ánimo — o eso pensaba él — mientras caminaba.";
  const r = rayaFrames(ordinary);
  assert.equal(r.marked.length, 0, "the paragraph's FIRST character is not an em-dash, so this is never read as dialogue");
});

test("raySpans splits the three-dash specimen into its two SPOKEN segments, excluding the embedded attribution clause", () => {
  const spans = raySpans(MARIANELA_TEXT).spans;
  assert.equal(spans.length, 3, "two segments from the 3-dash paragraph, one from the 1-dash paragraph");
  assert.equal(spans[0].text, "—No puedo equivocarme");
  assert.ok(spans[0].after.startsWith("—murmuró."), "the embedded attribution clause sits in `after`, not inside the speech span itself");
  assert.equal(spans[1].text, "—Me dijeron que atravesara el rio por la pasadera.", "the reopened speech, running to the paragraph's own end");
  assert.equal(spans[2].text, MARIANELA_TAIL, "a single-dash paragraph is one span, start to end");
});

test("raySpans feeds the SAME, unmodified attributeQuotation this file already tests for English — no second attribution mechanism was written for Spanish", () => {
  const spans = raySpans(MARIANELA_TEXT).spans;
  // A minimal Spanish verb/referent prior, injected exactly the way an
  // English one already is above — this repo already carries a real
  // Spanish POS-prior treebank (native/priors/pos-spa.json) for a live
  // caller to inject; a hand-picked stand-in is enough to prove the WIRING.
  const isVerb = (w) => ["murmuró", "dijo", "exclamó"].includes(w.toLowerCase());
  const referentFor = (s) => null; // Marianela's opening line names no referent yet — an honest gap, not a guess
  const attributed = attributeQuotation(spans[0].before, spans[0].after, { isVerb, referentFor });
  assert.equal(attributed.speaker, null, "no admitted referent stands beside the verb — a real, honest gap, never invented");
  assert.equal(attributed.gap.type, "attribution_unwitnessed");
  // Prove the verb IS found (so the gap is genuinely about the missing
  // referent, not a silent failure to read the span at all).
  const withReferent = attributeQuotation(spans[0].before, spans[0].after, { isVerb, referentFor: () => "ref:auto:narrator" });
  assert.equal(withReferent.speaker, "ref:auto:narrator");
  assert.equal(withReferent.form, "verb-then-name");
});

test("rayaFrames discloses a malformed (even dash-count) paragraph rather than silently guessing where speech ends", () => {
  const malformed = "—Uno—dos—tres—cuatro"; // 4 dashes: the last clause never closed
  const r = rayaFrames(malformed);
  assert.equal(r.marked.length, 1);
  assert.equal(r.marked[0].dashes, 4);
  assert.equal(r.marked[0].wellFormed, false);
  assert.equal(r.counted.malformed, 1);
});

test("an embedded frame outranks the outer narration — that is what embedding means", () => {
  const nf = { frames: [{ narrator: "victor", byteStart: 0, byteEnd: 100, heading: "Ch 11" }] };
  const embedded = [{ start: 40, end: 60 }];
  const speakers = new Map([[40, "creature"]]);
  assert.equal(holderAt(50, { narration: nf, embedded, embeddedSpeakers: speakers }).holder, "creature");
  assert.equal(holderAt(50, { narration: nf, embedded, embeddedSpeakers: speakers }).depth, 2);
  assert.equal(holderAt(10, { narration: nf, embedded, embeddedSpeakers: speakers }).holder, "victor");
  assert.equal(holderAt(50, { narration: nf, embedded }).gap, "embedded_speaker_unattributed", "an embedded frame with no attributed speaker says so rather than falling back to the outer narrator");
});
