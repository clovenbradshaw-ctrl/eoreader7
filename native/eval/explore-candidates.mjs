// Exploratory script (not the final benchmark) — real modules, real fixtures.
import { readFileSync } from "node:fs";
const NATIVE = new URL(".", import.meta.url).pathname.replace(/eval\/$/, "");
const { splitSentences } = await import(`${NATIVE}adapters/text/spans.js`);
const { extractSurfaces } = await import(`${NATIVE}adapters/text/surfaces.js`);
const { discoverRelationVocab } = await import(`${NATIVE}adapters/text/relations.js`);

const posPrior = JSON.parse(readFileSync(`${NATIVE}eval/the-fold/fixtures/pos-prior-eng.json`, "utf8"));

for (const [name, path] of [
  ["katherine-johnson-body", `${NATIVE}eval/the-fold/fixtures/katherine-johnson-body.txt`],
  ["borodino-excerpt", `${NATIVE}eval/the-fold/fixtures/borodino-excerpt.txt`],
]) {
  const text = readFileSync(path, "utf8");
  const sentences = splitSentences(text);
  const surfaces = extractSurfaces(sentences);
  console.log(`\n=== ${name} (${sentences.length} sentences, ${surfaces.length} surfaces) ===`);
  console.log("surfaces:", surfaces.slice(0, 20).map((s) => s.surface ?? s));
  const { verbs, candidates } = discoverRelationVocab(text, { surfaces, minSurfaces: 1, posPrior });
  console.log(`candidates: ${candidates.length}, verbs admitted: ${verbs.size}`);
  console.log("admitted verbs:", [...verbs].sort());
  for (const w of ["verified", "recheck", "captured", "took", "established", "built", "strengthened"]) {
    const c = candidates.find((c) => c.verb === w);
    console.log(`  ${w}: ${c ? JSON.stringify({ surfaces: c.surfaces, verbDominant: c.verbDominant, posStanding: c.posStanding }) : "NOT A CANDIDATE"}`);
  }
}
