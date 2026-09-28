// wiki-body.test.mjs — the body extractor's own walls (2026-09-28).
import { test } from "node:test";
import assert from "node:assert/strict";
import { wikiBody } from "./wiki-body.mjs";

const page = `<html><body><section><p id="a">Joachim <a rel="mw:WikiLink" href="./Joachim_Murat" title="x">Murat</a> was a <a rel="mw:WikiLink" href="./Marshal_of_the_Empire">Marshal of the Empire</a>.<sup class="ref">[1]</sup></p>
<table><tr><td><p>Infobox <a rel="mw:WikiLink" href="./Nope">prose</a></p></td></tr></table>
<figure><figcaption><p>A caption</p></figcaption></figure>
<p class="mw-empty-elt"></p>
<p>He was &amp; is <b>King of <a rel="mw:WikiLink" href="./Kingdom_of_Naples_(Napoleonic)">Naples</a></b>.</p></section></body></html>`;

test("only top-level prose paragraphs; tables, figures, footnotes dropped", () => {
  const { text } = wikiBody(page);
  assert.equal(text, "Joachim Murat was a Marshal of the Empire.\n\nHe was & is King of Naples.");
});

test("every link span reads back as its own text, in the returned text's coordinates", () => {
  const { text, links } = wikiBody(page);
  assert.equal(links.length, 3);
  for (const l of links) assert.equal(text.slice(l.start, l.end), l.text);
  assert.deepEqual(links.map((l) => l.title), ["Joachim Murat", "Marshal of the Empire", "Kingdom of Naples (Napoleonic)"]);
  assert.equal(links[2].text, "Naples");
});

test("a link inside dropped furniture never lands", () => {
  const { links } = wikiBody(page);
  assert.ok(!links.some((l) => l.title === "Nope"));
});
