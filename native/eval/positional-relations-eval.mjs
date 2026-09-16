// native/eval/positional-relations-eval.mjs — the real measurement:
// relations-positional.js's full pipeline (raw sentence in, {end1,label,
// end2} out) against held-out UD test sentences NEVER used to build the
// language's RoleConfig@1, scored against real human-annotated gold
// nsubj/obj dependency relations. One driver, any language with a
// fixture+prior+role-config triple below — matches `latin-case-marking-
// eval.mjs`'s own posture (P19/P27/S31): re-runnable, not a committed
// regression test.
//
// Usage: node native/eval/positional-relations-eval.mjs --lang=heb|arb
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extractPositionalRelation, isHeadOfPhraseUpos } from "../adapters/text/relations-positional.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";
import { peelProclitics } from "../organs/heard-surfaces.js";

const LANG = (process.argv.find((a) => a.startsWith("--lang=")) ?? "").replace("--lang=", "");
const LANGUAGES = {
  heb: { fixture: "../eval/fixtures/ud-hebrew-htb/he_htb-ud-test.conllu", pos: "../priors/pos-heb.json", proclitics: "../priors/proclitics-heb.json", roleConfig: "../priors/role-config-heb.json" },
  arb: { fixture: "../eval/fixtures/ud-arabic-padt/ar_padt-ud-test.conllu", pos: "../priors/pos-arb.json", proclitics: "../priors/proclitics-arb.json", roleConfig: "../priors/role-config-arb.json" },
};
if (!LANGUAGES[LANG]) { console.error(`usage: node positional-relations-eval.mjs --lang=<${Object.keys(LANGUAGES).join("|")}>`); process.exit(1); }
const cfg = LANGUAGES[LANG];
const resolve = (p) => fileURLToPath(new URL(p, import.meta.url));

const posPrior = JSON.parse(readFileSync(resolve(cfg.pos), "utf8"));
const proclitics = new Set(JSON.parse(readFileSync(resolve(cfg.proclitics), "utf8")).proclitics);
const roleConfig = JSON.parse(readFileSync(resolve(cfg.roleConfig), "utf8"));

function parseSentences(conllu) {
  const sentences = [];
  let text = null, toks = [];
  for (const line of conllu.split("\n")) {
    if (line.startsWith("# text = ")) { text = line.slice(9); continue; }
    if (line.startsWith("#")) continue;
    if (!line.trim()) { if (text && toks.length) sentences.push({ text, toks }); text = null; toks = []; continue; }
    const cols = line.split("\t");
    if (!/^[0-9]+$/.test(cols[0])) continue;
    toks.push({ id: Number(cols[0]), form: cols[1], upos: cols[3], head: Number(cols[6]), deprel: cols[7].split(":")[0] });
  }
  if (text && toks.length) sentences.push({ text, toks });
  return sentences;
}
const sentences = parseSentences(readFileSync(resolve(cfg.fixture), "utf8"));

// S123: gold CoNLL-U tokenisation is a TREEBANK CONVENTION, not the
// orthography — a bound proclitic (Hebrew's ה, HTB splits it into its own
// syntactic token routinely) never has a space around it in real text,
// and this reader's own output (P5.2: faithful to what was actually
// written) returns the RAW surface form ("התוצאה"), never a stem invented
// for comparison's sake. A byte-for-byte match against gold's OWN split
// form ("תוצאה") therefore fails for a semantically CORRECT answer purely
// because of how one treebank happens to tokenise, not because the reader
// misread anything — measured directly (Arabic's own PADT treebank never
// splits its definite article ال in this fixture's FORM column at all,
// which is why Arabic never shows this effect and Hebrew does). `matches`
// accepts either the raw form (Arabic's own case, and any Hebrew word gold
// happens to leave glued) or its discovered-proclitic-peeled stem
// (Hebrew's own MWT-split case) as a correct match — this changes ONLY
// what this eval script COUNTS as correct, never `extractPositionalRelation`'s
// own production output.
function matches(readWord, goldForm) {
  if (readWord === goldForm) return true;
  const peeled = peelProclitics(readWord, proclitics, posPrior);
  return !!peeled && peeled.stem === goldForm;
}

let evaluated = 0, skippedMultiVerb = 0, skippedNoVerb = 0;
let end1Total = 0, end1Correct = 0, end1Found = 0;
let end2Total = 0, end2Correct = 0, end2Found = 0;
const gapCounts = {};

// FULL PIPELINE: verb-finding + role-assignment together.
for (const s of sentences) {
  const verbToks = s.toks.filter((t) => t.upos === "VERB" || t.upos === "AUX");
  if (verbToks.length !== 1) { if (verbToks.length === 0) skippedNoVerb++; else skippedMultiVerb++; continue; }
  const goldSubj = s.toks.find((t) => t.deprel === "nsubj" && t.head === verbToks[0].id);
  const goldObj = s.toks.find((t) => (t.deprel === "obj" || t.deprel === "iobj") && t.head === verbToks[0].id);
  evaluated++;

  const out = extractPositionalRelation(s.text, { roleConfig, posPrior, classifyWord, dominantClass, proclitics });
  if (out.gap) { const reasons = Array.isArray(out.gap) ? out.gap : [out.gap.reason]; for (const g of reasons) gapCounts[g] = (gapCounts[g] ?? 0) + 1; }

  if (goldSubj) { end1Total++; if (out.end1) { end1Found++; if (matches(out.end1.word, goldSubj.form)) end1Correct++; } }
  if (goldObj) { end2Total++; if (out.end2) { end2Found++; if (matches(out.end2.word, goldObj.form)) end2Correct++; } }
}

// ISOLATED ROLE-ASSIGNMENT: given the gold verb position, does position/
// marker logic alone (no verb-finding) hold up? Isolates whether the
// mechanism's DESIGN is sound apart from the verb-finding bottleneck —
// `relations-case-marked.js`'s own precedent for reporting this apart.
function isolatedRoleAssignment() {
  let e1t = 0, e1c = 0, e1f = 0, e2t = 0, e2c = 0, e2f = 0;
  for (const s of sentences) {
    const verbToks = s.toks.filter((t) => t.upos === "VERB" || t.upos === "AUX");
    if (verbToks.length !== 1) continue;
    const verb = verbToks[0];
    const goldSubj = s.toks.find((t) => t.deprel === "nsubj" && t.head === verb.id);
    const goldObj = s.toks.find((t) => (t.deprel === "obj" || t.deprel === "iobj") && t.head === verb.id);
    // HEAD-OF-PHRASE ONLY (`isHeadOfPhraseUpos`) — the SAME rule
    // `extractPositionalRelation` itself applies, called here on the
    // GOLD upos tags rather than a second, drifting hand-rolled copy of
    // the predicate.
    const byId = new Map(s.toks.map((t) => [t.id, t]));
    const nominals = s.toks.filter((t) => (t.upos === "NOUN" || t.upos === "PROPN") && t.id !== verb.id && isHeadOfPhraseUpos(byId.get(t.id - 1)?.upos));
    const before = nominals.filter((n) => n.id < verb.id);
    const after = nominals.filter((n) => n.id > verb.id);
    const bySide = { before, after };

    let end2 = null;
    if (roleConfig.object.usable !== false && roleConfig.object.dominantSide) {
      const cands = bySide[roleConfig.object.dominantSide] ?? [];
      if (cands.length === 1) end2 = cands[0];
    }
    let end1 = null;
    if (roleConfig.subject.usable !== false && roleConfig.subject.dominantSide) {
      const cands = (bySide[roleConfig.subject.dominantSide] ?? []).filter((n) => n !== end2);
      if (cands.length === 1) end1 = cands[0];
    } else {
      const remaining = nominals.filter((n) => n !== end2);
      if (remaining.length === 1) end1 = remaining[0];
    }

    if (goldSubj) { e1t++; if (end1) { e1f++; if (end1.id === goldSubj.id) e1c++; } }
    if (goldObj) { e2t++; if (end2) { e2f++; if (end2.id === goldObj.id) e2c++; } }
  }
  return { e1t, e1c, e1f, e2t, e2c, e2f };
}
const iso = isolatedRoleAssignment();

console.log(`=== ${LANG.toUpperCase()} — positional relation reader, held-out test split ===`);
console.log(`total sentences: ${sentences.length}, single-verb-like evaluated: ${evaluated} (skipped ${skippedMultiVerb} multi-verb, ${skippedNoVerb} no-verb)`);
console.log(`\nFULL PIPELINE (verb-finding + role-assignment):`);
console.log(`  end1 (subject): found ${end1Found}/${end1Total}, precision ${end1Found ? (100*end1Correct/end1Found).toFixed(1) : "n/a"}%, recall ${(100*end1Correct/end1Total).toFixed(1)}%`);
console.log(`  end2 (object):  found ${end2Found}/${end2Total}, precision ${end2Found ? (100*end2Correct/end2Found).toFixed(1) : "n/a"}%, recall ${(100*end2Correct/end2Total).toFixed(1)}%`);
console.log(`  gap reasons:`, gapCounts);
console.log(`\nISOLATED ROLE-ASSIGNMENT (gold verb position given):`);
console.log(`  end1 (subject): found ${iso.e1f}/${iso.e1t}, precision ${iso.e1f ? (100*iso.e1c/iso.e1f).toFixed(1) : "n/a"}%, recall ${(100*iso.e1c/iso.e1t).toFixed(1)}%`);
console.log(`  end2 (object):  found ${iso.e2f}/${iso.e2t}, precision ${iso.e2f ? (100*iso.e2c/iso.e2f).toFixed(1) : "n/a"}%, recall ${(100*iso.e2c/iso.e2t).toFixed(1)}%`);
