// recipe-scan.mjs — which sidecars in results/ were read by a pipeline
// generation that predates the current one, so it is a real, checkable
// question rather than a guess.
//
// Sidecars here are disposable (user direction, 2026-09-10: "are sidecars
// all in beta mode? I don't care if they even get fully deleted"), so this
// is not a gate on anything and touches no file. It is the read side of the
// two-level scheme: for a book that already has a sidecar, tell whether
// re-running with the current recipe would actually change anything worth
// having (a different chapter-heading convention, letter-ordinal or
// numeral-less support, vision-assisted structure) versus re-stamping the
// same reading for no reason.
//
// usage: node recipe-scan.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { currentRecipe } from "./recipe-id.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const current = currentRecipe();

const files = fs.readdirSync(RESULTS).filter((f) => f.endsWith(".eot.jsonl")).sort();
const byRecipe = new Map();
let unstamped = 0;

for (const f of files) {
  const first = fs.readFileSync(path.join(RESULTS, f), "utf8").split("\n", 3);
  const recipeLine = first.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((o) => o?.schema === "EOTRecipe@1");
  const id = recipeLine?.recipeId ?? null;
  if (!id) { unstamped += 1; continue; }
  if (!byRecipe.has(id)) byRecipe.set(id, []);
  byRecipe.get(id).push(f);
}

console.log(`current recipe: ${current.recipeId}  (git ${current.git})\n`);
console.log(`${files.length} sidecars scanned, ${unstamped} carry no recipe stamp at all (pre-dates this mechanism — worth a look, not necessarily stale)\n`);

for (const [id, list] of [...byRecipe.entries()].sort((a, b) => (a[0] === current.recipeId ? -1 : b[0] === current.recipeId ? 1 : 0))) {
  const mark = id === current.recipeId ? "CURRENT" : "stale";
  console.log(`recipe ${id}  [${mark}]  ${list.length} sidecar(s)`);
  if (mark === "stale") for (const f of list) console.log(`   ${f}`);
}

if (unstamped) {
  console.log(`\nunstamped (no EOTRecipe@1.recipeId):`);
  for (const f of files) {
    const first = fs.readFileSync(path.join(RESULTS, f), "utf8").split("\n", 3);
    const has = first.some((l) => { try { return JSON.parse(l)?.recipeId; } catch { return false; } });
    if (!has) console.log(`   ${f}`);
  }
}
