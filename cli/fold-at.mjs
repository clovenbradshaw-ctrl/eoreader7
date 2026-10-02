#!/usr/bin/env node
// cli/fold-at.mjs -- the actual cursor-addressable fold INTERFACE, not just
// the backend plumbing (the-fold/fold-at.js, claimsFromFeat). Answers the
// vision's own question for real: "what is this, here" for a real document
// and a real cursor -- built after two prior cron cycles found no existing
// pipeline gap that motivated wiring the plumbing INTO generation, so the
// path taken here is the other disclosed option: a genuinely new capability,
// not a retrofit into logic that already works its own way.
//
//   node cli/fold-at.mjs FILE.md ADDRESS [--task "..."] [--for "WHO | what they ask"]
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
import { claimDependencyIndex, seedsOfClaimFiller } from "../native/the-fold/claim-dependencies.js";
import { tokenize } from "../native/organs/source.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function usage() {
  console.error("usage: node cli/fold-at.mjs FILE.md ADDRESS [--task \"...\"] [--pvalue N] [--for \"WHO | what they ask\"]");
  console.error("  ADDRESS is a holon path (e.g. /whole/p4/2), or 'list' to print every real address this file produces.");
  console.error("  --for \"WHO | what they ask\" reads the same fold FOR someone: what at this address touches what they ask (the engine's own");
  console.error("    term matching, no stemming), what folds away, and where else in the document their question lives. No model.");
  console.error("  --pvalue N (0 < N < 1) additionally wires the load-bearing consequential-surprise layer.");
  console.error("    Never defaulted here -- consequential-surprise.js's own guard requires a caller-declared");
  console.error("    pValue, and this project's standing rule forbids a hand-set default. You choose it.");
  process.exit(2);
}

const [, , file, address, ...rest] = process.argv;
if (!file || !address) usage();
const taskFlagIdx = rest.indexOf("--task");
const task = taskFlagIdx >= 0 ? rest[taskFlagIdx + 1] : "Write an essay on this material.";
const pValueFlagIdx = rest.indexOf("--pvalue");
const pValue = pValueFlagIdx >= 0 ? Number(rest[pValueFlagIdx + 1]) : null;
if (pValueFlagIdx >= 0 && !(pValue > 0 && pValue < 1)) {
  console.error(`--pvalue must be a number strictly between 0 and 1, got: ${rest[pValueFlagIdx + 1]}`);
  process.exit(2);
}

const forFlagIdx = rest.indexOf("--for");
const forWhom = forFlagIdx >= 0 ? String(rest[forFlagIdx + 1] ?? "") : null;
if (forWhom !== null && !forWhom.includes("|")) {
  console.error(`--for needs "WHO | what they ask", got: ${forWhom} (a for-whom reads FOR something, never from nowhere)`);
  process.exit(2);
}
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

// The dependents index (claim-dependencies.js's own shared-role-filler
// relation) is now built unconditionally -- one pass over the claims, no
// model call, no null simulation -- so foldAt's contacts layer is always
// available. Only the heavier consequential/load-bearing layer still
// requires the caller to additionally, explicitly declare --pvalue.
const index = claimDependencyIndex(claims);
const fold = foldAt(address, claims, { holo, index, ...(pValue !== null ? { seedsOf: seedsOfClaimFiller, pValue } : {}) });
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
if (fold.contacts.wired) {
  console.log(`\ncontacts, shared referent (${fold.contacts.rows.length}, ${fold.contacts.crossCutting} cross-cutting):`);
  for (const r of fold.contacts.rows) console.log(`  ${r.crossCutting ? "(cross-cutting) " : ""}${line(r.claim)}`);
} else {
  console.log(`\ncontacts: gap: ${fold.contacts.reason}`);
}
console.log(`\natmosphere: ${fold.atmosphere.wired ? (fold.atmosphere.field ? "real field computed" : "wired, no obligations supplied") : "gap: " + fold.atmosphere.reason}`);
console.log(`significance: ${fold.significance.wired ? `${fold.significance.totalBits.toFixed(2)} bits` : "gap: " + fold.significance.reason}`);
if (fold.significance.wired) {
  const c = fold.significance.consequential;
  if (c.wired) {
    console.log(`  consequential: ${c.consequentialBits.toFixed(2)} load-bearing bit(s), ${c.localBits.toFixed(2)} local bit(s) (pValue=${pValue})`);
    for (const row of c.rows) if (row.loadBearing) console.log(`    load-bearing: ${row.slot}=${row.value} (reaches ${row.reached}, rank ${row.rank.toFixed(2)})`);
  } else {
    console.log(`  consequential: gap: ${c.reason}`);
  }
}
console.log(`paradigm: gap: ${fold.paradigm.reason}`);

// FOR WHOM (kernel/for-whom.js's frame, read with no model): the same fold, through one person's question. A claim or sentence TOUCHES
// the question when it holds one of its words, matched exactly as the engine's own retrieval matches (source.js tokenize: case and
// diacritics folded, stopwords dropped, no stemming, so "closing" does not find "closure"). What touches nothing is FOLDED AWAY, never
// deleted: it is still listed above. Nothing here is a verdict about the person, only about the text.
if (forWhom !== null) {
  const [who, ...askParts] = forWhom.split("|");
  const asks = askParts.join("|").trim();
  const want = [...new Set(tokenize(asks))];
  const sentences = new Map(drawnParts(d).flatMap((p) => p.children).map((pt) => [`/${pt.path}`, pt.text]));
  const touch = (text) => { const have = new Set(tokenize(text)); return want.filter((t) => have.has(t)); };
  const mark = (c) => touch(`${c.rel} ${Object.values(c.roles ?? {}).join(" ")}`);
  console.log(`\nfor ${who.trim() || "someone"}, who asks about "${asks}" (terms: ${want.join(", ") || "none"}):`);
  if (!want.length) console.log("  the question has no content words the matcher keeps, so nothing can touch it.");
  else {
    const buckets = [["here", fold.here], ["above", fold.ancestors], ["around", fold.siblings], ["below", fold.descendants], ["same being", fold.contacts.wired ? fold.contacts.rows.map((r) => r.claim) : []]];
    let kept = 0, away = 0; const seen = new Set();
    for (const [name, list] of buckets) for (const c of list) { const key = c.id ?? `${c.ground}|${line(c)}`; if (seen.has(key)) continue; seen.add(key); const t = mark(c); if (t.length) { kept++; console.log(`  touches (${name}): ${line(c)}   [${t.join(", ")}]`); } else away++; }
    const hereText = sentences.get(fold.address);
    const hereTouch = hereText ? touch(hereText) : [];
    console.log(`  this address: ${kept || hereTouch.length ? "KEEPS it" : "FOLDS it away"} (${kept} claim(s) touch, ${away} fold away${hereText ? `; the sentence ${hereTouch.length ? "holds " + hereTouch.join(", ") : "holds none of the question's words"}` : ""})`);
    const never = want.filter((t) => ![...sentences.values()].some((x) => tokenize(x).includes(t)));
    if (never.length) console.log(`  the document never says: ${never.join(", ")}`);
    const order = [...sentences.keys()], at = Math.max(0, order.indexOf(fold.address));
    const elsewhere = order.map((k, i) => ({ k, i, t: touch(sentences.get(k)) })).filter((x) => x.t.length && x.k !== fold.address).sort((x, y) => Math.abs(x.i - at) - Math.abs(y.i - at)).slice(0, 4);
    if (elsewhere.length) { console.log("  where their question lives, nearest first:"); for (const x of elsewhere) console.log(`    ${x.k}  ${sentences.get(x.k).slice(0, 100)}${sentences.get(x.k).length > 100 ? "..." : ""}  [${x.t.join(", ")}]`); }
    else if (!never.length) console.log("  nowhere else in this document.");
  }
}
