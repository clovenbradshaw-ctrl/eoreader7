// falsify/surname.mjs — 2026-09-28: where does the host lose a page's bare surname? Two candidate
// causes: the extractor never emits "Murat" as a surface (the glue), or discoverReferents' generic-token
// fence reads a family name that pairs with many partners as a classifier and refuses it a being.
import { readFileSync } from "node:fs";
const N = new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");
const L = await import(`${N}/legacy-ported/packages/engine/perceiver/text/surfaces.js`);
const { splitSentences } = await import(`${N}/adapters/text/spans.js`);
const FIX = JSON.parse(readFileSync(`${N}/eval/identity/fixtures/occupancy-pages.json`, "utf8"));
for (const [page, name] of [["Joachim Murat", "Murat"], ["Angela Merkel", "Merkel"], ["Mikhail Kutuzov", "Kutuzov"], ["Pope Benedict XVI", "Ratzinger"]]) {
  const sents = splitSentences(FIX.pages[page].text).map((s, order) => ({ text: s.text, order }));
  const surfaces = L.extractSurfaces(sents);
  const bare = surfaces.find((s) => s.surface === name);
  const withName = surfaces.filter((s) => s.surface.split(" ").includes(name)).map((s) => `${s.surface}(${s.mentions})`);
  const disc = L.discoverReferents(surfaces);
  const admitted = [...new Set(disc.events.filter((e) => e.type === "DEF.admit").map((e) => e.surface))];
  const bareAdmitted = admitted.includes(name);
  const partners = new Set(surfaces.filter((s) => s.surface !== name && s.surface.split(" ").includes(name)).map((s) => s.surface));
  console.log(`${page}: bare "${name}" as a SURFACE: ${bare ? `yes (${bare.mentions} mentions, ${bare.sentences} sentences)` : "NO"}; ADMITTED as a referent surface: ${bareAdmitted ? "yes" : "NO"}; partner surfaces: ${partners.size} — ${withName.slice(0, 8).join(", ")}`);
}

// Second suspect: the host hands the extractor a frequency-derived closed class (material.js
// functionWordSet). A page's own topic is its most frequent capitalised token — does the closed
// class eat it?
const M = await import(`${N}/legacy-ported/packages/engine/perceiver/text/material.js`);
for (const [page, name] of [["Angela Merkel", "Merkel"], ["Joachim Murat", "Murat"]]) {
  const text = FIX.pages[page].text;
  const table = M.buildFrequencyTable(M.tokenize(text));
  const fw = M.functionWordSet(table);
  const sents = splitSentences(text).map((s, order) => ({ text: s.text, order }));
  const with_ = L.extractSurfaces(sents, { functionWords: fw });
  console.log(`${page}: closed class size ${fw.size}; "${name.toLowerCase()}" in it: ${fw.has(name.toLowerCase())}; bare "${name}" survives extractSurfaces WITH the closed class: ${with_.some((s) => s.surface === name)}`);
}
