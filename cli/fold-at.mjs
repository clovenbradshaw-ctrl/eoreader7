#!/usr/bin/env node
// cli/fold-at.mjs -- the actual cursor-addressable fold INTERFACE, not just
// the backend plumbing (the-fold/fold-at.js, claimsFromFeat). Answers the
// vision's own question for real: "what is this, here" for a real document
// and a real cursor -- built after two prior cron cycles found no existing
// pipeline gap that motivated wiring the plumbing INTO generation, so the
// path taken here is the other disclosed option: a genuinely new capability,
// not a retrofit into logic that already works its own way.
//
//   node cli/fold-at.mjs FILE.md ADDRESS [--task "..."]
//
// Runs the real pipeline (buildDraft -> attachReferents -> attachEot ->
// arrangeEssay) on FILE.md, then calls the real foldAt(ADDRESS, outline.claims)
// and prints its real result. No invented content: every printed relation
// is a real GFP claim from arrangeEssay's own claims field; a cursor with
// nothing there prints an honest empty fold, never a guess.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDraft, drawnParts } from "../native/the-fold/eot-draft.js";
import { buildReferents, attachReferents } from "../native/the-fold/referents.js";
import { loadEotParser, attachEot } from "../native/the-fold/eot-notation.js";
import { arrangeEssay } from "../native/the-fold/arrange.js";
import { foldAt, slotsFromClaims } from "../native/the-fold/fold-at.js";
import { createHolograph, admit } from "../native/kernel/bayes-surprise.js";
import { holon } from "../native/kernel/gfp-claim.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function usage() {
  console.error("usage: node cli/fold-at.mjs FILE.md ADDRESS [--task \"...\"]");
  console.error("  ADDRESS is a holon path (e.g. /whole/p4/2), or 'list' to print every real address this file produces.");
  process.exit(2);
}

const [, , file, address, ...rest] = process.argv;
if (!file || !address) usage();
const taskFlagIdx = rest.indexOf("--task");
const task = taskFlagIdx >= 0 ? rest[taskFlagIdx + 1] : "Write an essay on this material.";

const ground = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const parser = await loadEotParser();
const d = attachReferents(buildDraft({ task, ground }), buildReferents(ground));
attachEot(drawnParts(d).flatMap((p) => p.children), parser.parse(ground, "ground"));
const outline = arrangeEssay({ draft: d });
const claims = outline.claims.claims;

if (address === "list") {
  const grounds = [...new Set(claims.map((c) => c.ground))].sort();
  console.log(`${claims.length} real claim(s), ${grounds.length} distinct address(es), ${outline.claims.unresolved} unresolved (excluded):`);
  for (const g of grounds) console.log(`  ${g}`);
  process.exit(0);
}

// A real, document-derived prior for significance -- admit (mutate) a fresh
// holograph with every OTHER claim in this document (excluding this cursor's
// own, so the score answers "how surprising is this given the rest of the
// document," not a self-fulfilling "given itself"). foldAt itself only ever
// reads this via predict(), never admits into it again.
const here = holon(address === "list" ? "/" : address);
const holo = createHolograph({ alpha: 1, gamma: 1 });
for (const c of claims) {
  if (holon(c.ground) === here) continue;
  admit(holo, Object.fromEntries(slotsFromClaims([c])));
}

const fold = foldAt(address, claims, { holo });
const line = (c) => `${c.roles.ARG0} ${c.polarity === "-" ? "NOT " : ""}${c.rel} ${c.roles.ARG1}  @${c.ground}`;
console.log(`fold at ${fold.address}  (${claims.length} claim(s) total in this document)`);
console.log(`\nhere (${fold.here.length}):`);
for (const c of fold.here) console.log(`  ${line(c)}`);
console.log(`\nancestors, outermost first (${fold.ancestors.length}):`);
for (const c of fold.ancestors) console.log(`  ${line(c)}`);
console.log(`\nsiblings (${fold.siblings.length}):`);
for (const c of fold.siblings) console.log(`  ${line(c)}`);
console.log(`\ndescendants (${fold.descendants.length}):`);
for (const c of fold.descendants) console.log(`  ${line(c)}`);
console.log(`\natmosphere: ${fold.atmosphere.wired ? (fold.atmosphere.field ? "real field computed" : "wired, no obligations supplied") : "gap: " + fold.atmosphere.reason}`);
console.log(`significance: ${fold.significance.wired ? `${fold.significance.totalBits.toFixed(2)} bits` : "gap: " + fold.significance.reason}`);
console.log(`paradigm: gap: ${fold.paradigm.reason}`);
