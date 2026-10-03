// native/eval/gfp-no-model-experiment.mjs — NL -> GFP -> NL, NO MODEL AT ALL.
//
// The engine holds a model-free NL->EOT leg: relations-gfp.js reads a
// language-neutral figure-connector-figure arrangement by recurrence + the
// received POS prior; relations-positional.js reads one main clause per
// sentence by a MEASURED RoleConfig@1; relations-language.js dispatches. This
// driver runs the whole loop with NO parser and NO mouth:
//
//   NL  --extractGfpRelations / extractPositionalRelation-->  GFP claims
//       --render(claim, lens)-->  NL again
//
// TWO RULES the first cut broke, now honored:
//   REMEMBER REFERENTS — the referent index is built ONCE and handed to BOTH
//     the read and the re-read. A round trip that re-discovers its figures is
//     measuring two different readers, not a projection.
//   THE CONNECTOR IS THE CONNECTOR — a label between two figures is the word
//     that joins them, never a whole clause that happens to sit between two
//     sparse multi-word names.
//
//   node native/eval/gfp-no-model-experiment.mjs [--text FILE] [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractGfpRelations } from "../adapters/text/relations-gfp.js";
import { relationExtractorsFor } from "../adapters/text/relations-language.js";
import { buildReferents } from "../the-fold/referents.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";
import { splitSentences } from "../adapters/text/spans.js";
import { claimFromTriple, render, figureKey } from "../kernel/gfp-claim.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : fb; };
const TEXT = arg("--text", "/Users/mlacy/Documents/3.0/the-fold/fixtures/summary-goldens/no-turn-on-red.txt");
const LENS = arg("--lens", "SVO");
const text = fs.readFileSync(TEXT, "utf8").replace(/\s+/g, " ").trim();

let posPrior = null;
for (const name of ["pos-en.json", "pos-eng.json"]) { const p = path.join(HERE, "..", "priors", name); if (fs.existsSync(p)) { posPrior = JSON.parse(fs.readFileSync(p, "utf8")); break; } }
let roleConfig = null;
const rc = path.join(HERE, "..", "priors", "role-config-eng.json");
if (fs.existsSync(rc)) roleConfig = JSON.parse(fs.readFileSync(rc, "utf8"));

// REMEMBER REFERENTS: build the index ONCE from the material and hand it to
// every read in this run (the read AND the re-read).
const R = buildReferents(text);
const figures = new Set();
for (const id of (R.index?.referents ?? [])) { const rep = R.represent(id); if (rep && rep.length >= 3) figures.add(rep.toLowerCase()); }

const sentences = splitSentences(text).map((s) => s.text ?? s);
const rels = extractGfpRelations(text, { posPrior, figures, minRec: 2, clauseAware: true });
const roleReaders = roleConfig && posPrior ? relationExtractorsFor({ language: "eng", roleConfig, posPrior, classifyWord, dominantClass }) : null;
const clauseRels = roleReaders ? sentences.flatMap((s) => roleReaders.extractRelations(s, {})).filter((r) => r.end1 && r.label && r.end2) : [];

console.log(`GFP-FIRST, NO MODEL — ${TEXT.split("/").pop()}`);
console.log(`lens ${LENS} | posPrior ${posPrior ? "loaded" : "NONE"} | roleConfig ${roleConfig ? "declared (eng)" : "none"}`);
console.log(`referents index: ${R.size} beings, ${figures.size} surfaces (REMEMBERED across read + re-read)`);
console.log(`RECURRENCE arrangements: ${rels.length}`);
console.log(`POSITIONAL clauses (one per sentence): ${clauseRels.length} of ${sentences.length} sentences\n`);

const claims = rels.map((r, i) => claimFromTriple(r.end1, r.label, r.end2, { ground: "/doc/test", id: `c${i}`, basis: r.basis ?? null })).filter((c) => c.roles.ARG0 && c.roles.ARG1);
const rendered = claims.map((c) => render(c, LENS));

const readFigures = new Set(rels.flatMap((r) => [String(r.end1 ?? "").toLowerCase(), String(r.end2 ?? "").toLowerCase()]).filter((f) => f.length > 2));
const surface = rendered.join(" ").toLowerCase();
const survive = [...readFigures].filter((f) => surface.includes(f));

console.log(`content figures individuated: ${readFigures.size}`);
console.log(`  survive the GFP->NL render: ${survive.length}/${readFigures.size} (${readFigures.size ? ((survive.length / readFigures.size) * 100).toFixed(0) : 0}%)`);
console.log(`\nsample round trips:`);
for (const [i, c] of claims.entries()) if (i < 8) console.log(`  ${JSON.stringify(rels[i].end1)} —${rels[i].label}→ ${JSON.stringify(rels[i].end2)}   =>   ${JSON.stringify(rendered[i])}`);

// REMEMBER REFERENTS on the re-read too — same figures set, not re-discovery.
const reread = extractGfpRelations(rendered.join(" "), { posPrior, figures, minRec: 1, clauseAware: false });
const keyOf = (r) => { const c = claimFromTriple(r.end1, r.label, r.end2); return `${String(c.rel).toLowerCase()}|${figureKey(c, { symmetric: true })}`; };
const before = new Set(rels.map(keyOf)); const after = new Set(reread.map(keyOf));
const kept = [...before].filter((k) => after.has(k)).length;
console.log(`\norder-free identity recovered on re-read (SAME referents): ${kept}/${before.size} (${before.size ? ((kept / before.size) * 100).toFixed(0) : 0}%)`);
console.log(`\nVERDICT: no parser, no mouth. Fidelity disclosed; a gap is a named projection loss.`);
if (process.argv.includes("--json")) console.log(JSON.stringify({ arrangements: rels.length, clauses: clauseRels.length, figures: readFigures.size, survive: survive.length, identityKept: kept, identityOf: before.size }, null, 2));