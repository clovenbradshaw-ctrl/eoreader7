// node session-stress-adversarial.mjs
//
// Adversarial regression probes for this session's landed changes,
// unit-scoped directly against the two organs involved in the fix
// (commit 87f9a9f: judge() reduces both sides through headVerb before
// calling sameAct) — this avoids noise from the full extraction pipeline
// (which needs corpus-scale material for discoverRelationVocab to admit a
// verb at all, per material.js's CORPUS_MINIMUM) and isolates exactly the
// comparison this session's fix changed.
//
// Also includes end-to-end probes through the real reader on fresh
// material, and characterization-only probes for LaVar's two open,
// disclosed findings (unexplained no-named-surface pronoun miss;
// "James A."-style abbreviation sentence-split bug).
//
// The pronoun-gate item (S22) was NOT touched this session — confirmed
// via `git log` (no commit this session touches pronouns.js). Probe 2
// confirms the existing conservative gate still behaves as documented.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { headVerb } from "../../adapters/text/phasepost.js";
import { makeRelationReader } from "../../organs/hypergraph.js";

const LEGACY_PRESENT = existsSync(new URL("../../../legacy-eoreader6.1/packages/engine/perceiver/text/spans.js", import.meta.url));
const PROVIDER = process.env.ENGINE === "native" || (process.env.ENGINE !== "legacy" && !LEGACY_PRESENT)
  ? "../../adapters/text/"
  : "../../../legacy-eoreader6.1/packages/engine/perceiver/text/";

async function organs() {
  const { splitSentences } = await import(PROVIDER + "spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(PROVIDER + "surfaces.js");
  const { discoverRelationVocab, extractRelations } = await import(PROVIDER + "relations.js");
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(PROVIDER + "material.js");
  const { createLemmatizer } = await import(PROVIDER + "morphology.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, buildFrequencyTable, functionWordSet, createLemmatizer };
}

let pass = 0, fail = 0;
function report(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); }
}

const org = await organs();
console.log(`Provider: ${PROVIDER}\n`);

const prior = JSON.parse(readFileSync(new URL("fixtures/unimorph-morphology-prior.json", import.meta.url), "utf8"));
const lemmatizer = org.createLemmatizer(prior.forms, { language: prior.language });

// ---------------------------------------------------------------------
// UNIT PROBE 1: headVerb + sameAct, the exact mechanism the fix changed.
// A phrasal predicate reduces to its head correctly...
{
  const reduced = headVerb("had rejected").head;
  report("headVerb('had rejected') reduces to 'rejected'-ish head, not blank", typeof reduced === "string" && reduced.length > 0, `got ${JSON.stringify(reduced)}`);
}

// UNIT PROBE 2 (adversarial, true negative): two DIFFERENT phrasal
// predicates whose head verbs are also different must never collide
// through sameAct after reduction.
{
  const h1 = headVerb("had rejected").head;
  const h2 = headVerb("had accepted").head;
  const same = lemmatizer.sameAct ? lemmatizer.sameAct(h1, h2) : (h1 === h2);
  report("headVerb-reduced 'had rejected' vs 'had accepted' are NOT the same act", !same, `h1=${h1} h2=${h2} sameAct=${same}`);
}

// UNIT PROBE 3 (true positive control): the SAME phrasal predicate
// against itself still matches after reduction.
{
  const h1 = headVerb("had rejected").head;
  const h2 = headVerb("rejected").head;
  const same = lemmatizer.sameAct ? lemmatizer.sameAct(h1, h2) : (h1 === h2);
  report("headVerb-reduced 'had rejected' matches plain 'rejected'", !!same, `h1=${h1} h2=${h2} sameAct=${same}`);
}

// UNIT PROBE 4 (adversarial near-miss, three-way auxiliary chains): a
// longer auxiliary chain around a DIFFERENT head verb must not collide.
{
  const cases = [
    ["had been rejected", "approved"],
    ["will have declined", "accepted"],
    ["was still rejecting", "approving"],
  ];
  let allOk = true;
  for (const [a, b] of cases) {
    const ha = headVerb(a).head;
    const same = lemmatizer.sameAct ? lemmatizer.sameAct(ha, b) : (ha === b);
    if (same) { allOk = false; console.log(`    collision: "${a}" (head=${ha}) vs "${b}"`); }
  }
  report("longer auxiliary chains around DIFFERENT head verbs never collide", allOk);
}

// ---------------------------------------------------------------------
// END-TO-END PROBE 5: fresh material (not Katherine Johnson), phrasal
// predicate true positive AND true negative through the FULL reader,
// mirroring the shape of the real a3 fix specimen (enough surrounding
// prose for discoverRelationVocab to admit the verb).
{
  const passages = [
    {
      ref: "merger.txt#0-500",
      text:
        "The regional bank operated for decades under family ownership. " +
        "When a rival firm proposed a merger last spring, the board initially welcomed the offer; " +
        "Harrison had rejected the terms outright and had insisted on a higher valuation before any vote.",
    },
  ];
  const reader = makeRelationReader({ ...org, phrasalPredicates: true, objectSpecificity: true, morphologyIndex: prior.forms, morphologyLanguage: prior.language, createLemmatizer: org.createLemmatizer })(passages, { pool: passages });

  const positive = reader.read("Harrison rejected the terms.");
  const posClaim = positive.claims.find((c) => c.end1 === "Harrison" && /reject/i.test(c.label));
  report("e2e: 'Harrison rejected the terms' finds Harrison's phrasal-predicate edge as nearest/bound",
    !!posClaim && (posClaim.verdict === "bound" || posClaim.nearest?.some((e) => e.end1 === "Harrison" && /reject/i.test(e.label))),
    posClaim ? `verdict=${posClaim.verdict} nearest=${JSON.stringify(posClaim.nearest?.map((e) => e.label))}` : "no claim");

  const negative = reader.read("Harrison approved the terms.");
  const negClaim = negative.claims.find((c) => c.end1 === "Harrison" && /approv/i.test(c.label));
  report("e2e ADVERSARIAL: 'Harrison approved the terms' (different verb) does not falsely bind",
    !negClaim || negClaim.verdict !== "bound",
    negClaim ? `verdict=${negClaim.verdict}` : "no claim");
}

// ---------------------------------------------------------------------
// PROBE 6: genuine multi-candidate pronoun ambiguity — S22's conservative
// gate, UNCHANGED this session. Confirm it still refuses to silently pick
// one antecedent over another with no disclosure.
{
  const passages = [
    {
      ref: "amb.txt#0-260",
      text:
        "Nora Whitfield met Diane Castellano at the symposium last fall. " +
        "She later published a paper on the same subject that Diane had presented. " +
        "Nora Whitfield and Diane Castellano remained in contact afterward, sharing drafts by email.",
    },
  ];
  const reader = makeRelationReader({ ...org, phrasalPredicates: true, objectSpecificity: true, morphologyIndex: prior.forms, morphologyLanguage: prior.language })(passages, { pool: passages });
  const rNora = reader.read("Nora Whitfield published a paper.");
  const rDiane = reader.read("Diane Castellano published a paper.");
  const claimNora = rNora.claims.find((c) => /publish/i.test(c.label));
  const claimDiane = rDiane.claims.find((c) => /publish/i.test(c.label));
  console.log(`  [probe6] Nora-published verdict=${claimNora?.verdict} Diane-published verdict=${claimDiane?.verdict}`);
  // The material never explicitly says "Nora published" or "Diane
  // published" — only "She... published". Correct/conservative behavior:
  // do not confidently BOTH bind, since that would mean the ambiguous
  // pronoun secretly resolved to both people at once.
  const bothBound = claimNora?.verdict === "bound" && claimDiane?.verdict === "bound";
  report("ambiguous pronoun 'She' does not resolve to BOTH candidates as bound simultaneously", !bothBound,
    `Nora=${claimNora?.verdict} Diane=${claimDiane?.verdict}`);
}

// ---------------------------------------------------------------------
// PROBE 7 (LaVar finding b, generalization check): pronoun-binding miss
// with NO co-occurring named surface at all, on FRESH material.
{
  const passages = [
    {
      ref: "gen7.txt#0-260",
      text:
        "The senior auditor reviewed the quarterly filings alone that evening. " +
        "He flagged three discrepancies in the expense report before leaving the office. " +
        "The senior auditor later confirmed the discrepancies to the finance committee.",
    },
  ];
  const reader = makeRelationReader({ ...org, phrasalPredicates: true, objectSpecificity: true, morphologyIndex: prior.forms, morphologyLanguage: prior.language })(passages, { pool: passages });
  const r7 = reader.read("He flagged three discrepancies.");
  console.log(`  [probe7/LaVar-b generalization] claims=${JSON.stringify(r7.claims.map((c) => ({ label: c.label, verdict: c.verdict, end1: c.end1 })))}`);
  report("probe7 (no co-occurring named surface, pronoun-only subject) ran without crash — characterization only", true);
}

// ---------------------------------------------------------------------
// PROBE 8 (LaVar finding c, generalization check): abbreviation-period
// sentence-split bug on a FRESH "X. Y." style name.
{
  const specimens = [
    "The award went to Robert T. Alvarez in 2003. He accepted it in person at the ceremony.",
    "Contact was made through James A. Whitfield in early 1998. Whitfield later confirmed the arrangement in writing.",
    "The report was authored by Maria L. Chen in 2011. Chen declined to comment further.",
  ];
  let anyReproduced = false;
  for (const text of specimens) {
    const sentences = org.splitSentences(text);
    const rendered = sentences.map((s) => (typeof s === "string" ? s : s.text));
    const badSplit = rendered.length >= 1 && rendered[0] && /[A-Z]\.\s*$/.test(rendered[0].replace(/\.$/, "")) === false && / [A-Z]\.\s+in\s+\d{4}\.?$/.test(rendered[0] || "");
    console.log(`  [probe8] "${text.slice(0, 40)}..." -> ${sentences.length} sentence(s): ${JSON.stringify(rendered)}`);
    if (sentences.length !== 2) anyReproduced = true;
  }
  report(`probe8 (abbreviation-period split, 3 fresh "X. Y." specimens) — reproduced-on-any=${anyReproduced} (characterization only)`, true);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
