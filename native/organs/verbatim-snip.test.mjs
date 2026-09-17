// verbatim-snip.test.mjs — the snip hand's contract, pinned.
// A verbatim ask is snipped from a source, never generated; the shape
// detector must fire only on real quotation asks (EN/FR/DE/ES/IT), and the
// snip cut must be positional, never semantic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { snipShape, cutSnip, formatQuote, MAX_SNIP_CHARS } from "./verbatim-snip.js";

test("snipShape fires on verbatim-quote asks, naming the wired work", () => {
  const s = snipShape("can you quote me shakespeare verbatim?");
  assert.ok(s, "must fire");
  assert.equal(s.work.author, "William Shakespeare");
  assert.equal(s.defaulted, true, "no passage named — the pinned default applies");
  assert.equal(s.gap, null);
});

test("snipShape fires on exact-text frames and names the passage", () => {
  const s = snipShape("give me the exact text of Hamlet's To be or not to be speech");
  assert.ok(s, "must fire");
  assert.equal(s.defaulted, false, "a passage was named");
});

test("snipShape stays silent on questions ABOUT a work", () => {
  assert.equal(snipShape("tell me about Hamlet"), null);
  assert.equal(snipShape("who was Shakespeare?"), null);
  assert.equal(snipShape("what is the fold?"), null);
  assert.equal(snipShape(""), null);
});

test("snipShape names the gap for unwired works — never a model quote", () => {
  const s = snipShape("quote me the latest bestseller verbatim");
  assert.ok(s, "the intent is detected");
  assert.equal(s.work, null);
  assert.equal(s.gap, "no_source_wired");
});

test("snipShape fires cross-lingually (FR/DE/ES/IT) — falsified 2026-09-17", () => {
  const fr = snipShape("cite-moi Shakespeare mot pour mot");
  assert.ok(fr && fr.work?.author === "William Shakespeare", "French fires");
  const de = snipShape("zitier mir Shakespeare wörtlich");
  assert.ok(de && de.work?.author === "William Shakespeare", "German fires");
  const es = snipShape("cita a Shakespeare palabra por palabra");
  assert.ok(es && es.work?.author === "William Shakespeare", "Spanish fires");
  const it = snipShape("citami Shakespeare parola per parola");
  assert.ok(it && it.work?.author === "William Shakespeare", "Italian fires");
  // About-questions stay silent in any language.
  assert.equal(snipShape("parle-moi de Hamlet"), null);
});

test("cutSnip is positional and bounded — never semantic", () => {
  const src = ["Title", "Author", "", "Shall I compare thee to a summer's day?", "Thou art more lovely and more temperate:"].join("\n");
  const a = cutSnip(src, { maxChars: 200 });
  assert.ok(a.snip.length <= 200, "bounded");
  assert.ok(a.snip.includes("summer"), "the opening lines, positionally");
  const b = cutSnip(src, { maxChars: 200 });
  assert.equal(a.snip, b.snip, "deterministic: same source ⇒ same snip");
  assert.equal(cutSnip("").snip, "", "empty source ⇒ empty snip, never invented");
});

test("cutSnip skips Wikisource scaffolding — versions pages are thin", () => {
  const versionsPage = [
    "Sonnet 18 (Shakespeare)",
    "Versions of Sonnet 18 include:",
    "2712945 Sonnet 18 William Shakespeare (1564-1616)",
    "In the collected Sonnets",
    '" Sonnet 18 ," in Shake-speares Sonnets, Never before Imprinted (1609)',
    '" Sonnet 18 ," in Shakespeare\u2019s Sonnets , (ed.) by William J. Rolfe (1883)',
  ].join("\n");
  const thin = cutSnip(versionsPage, { maxChars: 600 });
  assert.ok(!thin.snip.includes("Versions of"), "scaffolding skipped");
  assert.ok(thin.longest <= 30, `versions page has no verse-length line (longest ${thin.longest})`);
  const verse = [
    "For other versions of this work, see Sonnet 18 (Shakespeare) .",
    "Shall I compare thee to a summer's day?",
    "Thou art more lovely and more temperate:",
  ].join("\n");
  const good = cutSnip(verse, { maxChars: 600 });
  assert.ok(good.snip.includes("summer"), "verse survives the filter");
  assert.ok(good.longest > 30, "verse page reads quotable");
});

test("cutSnip drops the catalog id-line — century class covers 18xx", () => {
  const page = [
    "William Shakespeare 12120 Shakespeare's Sonnets (1883) — Sonnet 18 1883 William J. Rolfe",
    "XVIII.",
    "Shall I compare thee to a summer's day?",
  ].join("\n");
  const r = cutSnip(page, { maxChars: 600 });
  assert.ok(!r.snip.includes("12120"), "catalog id-line is scaffolding, never quoted");
  assert.ok(r.snip.startsWith("XVIII."), "the snip opens on the verse");
});

test("cutSnip never exceeds the budget", () => {
  const src = Array.from({ length: 50 }, (_, i) => `This is line number ${i} of the source text, carrying real words.`).join("\n");
  const { snip } = cutSnip(src);
  assert.ok(snip.length <= MAX_SNIP_CHARS, `snip ${snip.length} chars over budget ${MAX_SNIP_CHARS}`);
});

test("formatQuote marks the block as snipped, non-model prose", () => {
  const out = formatQuote({ snip: "To be, or not to be", title: "Hamlet", author: "William Shakespeare", url: "https://en.wikisource.org/wiki/Hamlet" });
  assert.ok(out.includes("❝"), "visual snip marker");
  assert.ok(out.includes("non-model"), "provenance names the non-model standing");
  assert.ok(out.includes("https://en.wikisource.org/wiki/Hamlet"), "the source address rides along");
  assert.ok(out.includes("To be, or not to be"), "the bytes are the bytes");
});
