// falsify/glue.mjs — a claim checked in one second, 2026-09-28: the frozen legacy extractor glues a
// capitalised run across "2015," and the native one breaks it. Run: node eval/identity/falsify/glue.mjs
// Claim: the frozen legacy extractor glues a capitalised run across "2015," ; the native one breaks it.
const N = new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");
const L = await import(`${N}/legacy-ported/packages/engine/perceiver/text/surfaces.js`);
const V = await import(`${N}/adapters/text/surfaces.js`);
const sents = ["Early that year, in December 2015, Merkel was named Person of the Year.", "Later, in October 2016, Merkel was elected again.", "A friend of Merkel said so; Merkel agreed."].map((text, order) => ({ text, order }));
const show = (xs) => xs.map((s) => s.surface).sort().join(" | ");
console.log("legacy:", show(L.extractSurfaces(sents)));
console.log("native:", show(V.extractSurfaces(sents)));
