// copula-reach.mjs — S58's impact measurement. The copula supplement closes a
// hole in a received prior; this asks what closing it actually reaches.
//
// THE DISTINCTION THAT HAD TO BE DRAWN FIRST, because it decides what to
// measure. `sameAct` is NOT what folds two notes together — `notes.js` keys a
// note by its exact triple, so no lemmatizer anywhere changes what the ledger
// folds. `sameAct` is what decides whether a CLAIM binds to MATERIAL in the
// relation reader. So the supplement's reach is on the grounding ladder, not
// on corroboration, and reporting it as the latter would be the same category
// error the chunk-vs-source correction already cost this project once.
//
// THE ARMS. The same real material read three ways, differing in one organ:
//   none        — no lemmatizer at all (what app.js runs today)
//   prior       — the vendored MorphologyPrior@1 alone
//   supplemented— the same prior plus COPULA_PARADIGM (lang/en)
//
// THE CONTROL (II.23), built to fail: a DECOY supplement of the same size
// mapping the same forms to a lemma that is not `be`. If the decoy moves the
// same claims the real supplement does, the movement is the merge mechanism
// and not the copula, and this measurement decides nothing.
//
//   node copula-reach.mjs      env: MATERIAL=wikipedia|dracula
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const MATERIAL = process.env.MATERIAL ?? "wikipedia";

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));
const morph = morphologyFromPrior(JSON.parse(readFileSync(`${FIX}/unimorph-morphology-prior.json`, "utf8")));

// The decoy: the same eleven forms, the same merge path, a lemma that is not
// the copula's. Anything the decoy also moves was moved by the mechanism.
const DECOY = Object.fromEntries(Object.keys(P.COPULA_PARADIGM).map((f) => [f, "zzq-not-a-lemma"]));

let PAGES;
if (MATERIAL === "dracula") {
  const BOOK = process.env.BOOK ?? "/home/user/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const slice = readFileSync(BOOK, "utf8").replace(/\r\n/g, "\n").slice(100000, 340000);
  const cuts = [...slice.matchAll(/\n\s*CHAPTER [IVXL]+\s*\n/g)].map((m) => m.index);
  const bounds = [0, ...cuts.slice(0, 5), slice.length];
  PAGES = [];
  for (let i = 0; i + 1 < bounds.length; i += 1) PAGES.push({ ref: `dracula-part-${i + 1}.txt`, text: slice.slice(bounds[i], bounds[i + 1]) });
} else {
  PAGES = "wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html,wikipedia-battle-of-borodino.html"
    .split(",").map((ref) => ({ ref, text: extractReadable(readFileSync(`${FIX}/${ref}`, "utf8")).text }));
}

const base = {
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
};
const ARMS = {
  none: {},
  prior: { createLemmatizer: (i, o) => createLemmatizer(i, o), morphologyIndex: morph.forms, morphologyLanguage: morph.language },
  supplemented: { createLemmatizer: (i, o) => createLemmatizer(i, { ...o, supplement: P.COPULA_PARADIGM }), morphologyIndex: morph.forms, morphologyLanguage: morph.language },
  decoy: { createLemmatizer: (i, o) => createLemmatizer(i, { ...o, supplement: DECOY }), morphologyIndex: morph.forms, morphologyLanguage: morph.language },
};

console.log(`material: ${MATERIAL} (${PAGES.length} sources)`);
const results = {};
for (const [name, organs] of Object.entries(ARMS)) {
  const t0 = Date.now();
  const reader = makeRelationReader({ ...base, ...organs });
  const verdicts = new Map();
  let bound = 0, total = 0;
  for (const pg of PAGES) {
    const passages = chunkSource(pg.ref, pg.text);
    const rel = reader(passages, { pool: passages });
    for (const p of passages) for (const c of rel.read(String(p.text ?? ""))?.claims ?? []) {
      total += 1;
      if (c.verdict === "bound") bound += 1;
      verdicts.set(`${pg.ref}|${c.end1}|${c.label}|${c.end2}`, c.verdict);
    }
  }
  results[name] = { bound, total, verdicts, ms: Date.now() - t0 };
  console.log(`  ${name.padEnd(13)} bound ${String(bound).padStart(4)} of ${total}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// Movement is measured claim by claim, never as a difference of totals: two
// arms can reach the same count while disagreeing about which claims bound.
const moved = (a, b) => {
  let gained = 0, lost = 0;
  for (const [k, v] of results[b].verdicts) {
    const before = results[a].verdicts.get(k);
    if (before !== "bound" && v === "bound") gained += 1;
    if (before === "bound" && v !== "bound") lost += 1;
  }
  return { gained, lost };
};
console.log(`\nMOVEMENT, claim by claim`);
for (const [a, b] of [["none", "prior"], ["prior", "supplemented"], ["prior", "decoy"]]) {
  const m = moved(a, b);
  console.log(`  ${a} -> ${b}: ${m.gained} claims newly bound, ${m.lost} no longer bound`);
}
const real = moved("prior", "supplemented"), ctrl = moved("prior", "decoy");
console.log(real.gained === 0 && real.lost === 0
  ? "\n  -> the supplement reaches NOTHING on this material's own claims: sameAct is\n     consulted where the copula is not the deciding label."
  : ctrl.gained + ctrl.lost >= real.gained + real.lost
    ? "\n  -> THE CONTROL SURVIVES: a decoy of the same size moves as much, so the\n     movement is the merge mechanism and not the copula."
    : `\n  -> the copula moves ${real.gained + real.lost} claims where the decoy moves ${ctrl.gained + ctrl.lost}.`);
