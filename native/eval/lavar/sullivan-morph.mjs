// sullivan-morph.mjs — Sullivan learns every feature every treebank we hold
// marks: which of her senses (ending, prefix, class, neighbour, auxiliary)
// each language actually uses for each feature, admitted by elimination
// against each cue's own null and the search's own floor, audited
// afterwards against the gold of a half she never saw, and STORED with the
// givers, period, region, register and script the convention was learned
// from. Handle: Sullivan (second sense — adapters/text/morph-cues.js).
//
// THE QUESTION (user, 2026-09-25): "we must learn all tenses, cases, etc."
// and "be sure our language conventions are stored with givers and the
// period and regional provenance". Not written per language — learned per
// language, reported as a map (language × feature → coverage, accuracy,
// contests, misses, false fires, dominant cue kind; and for Tense, which
// universal values each language reaches by FORM versus by CONSTRUCTION),
// and written to priors/morph-cues-<lang>.json with a provenance block
// morph-cues.js::morphCuesFromPrior refuses to load without.
//
// PROVENANCE, TWO BASES KEPT APART. What the file itself says — its
// documents' own source lines, its script, its sha256, its token count —
// is MEASURED here. What only the treebank's documentation says — who
// annotated it, when its texts were written, where, in what register —
// is DECLARED, from the README shipped beside the file where one is
// (Latin Perseus, both Sanskrits) and otherwise from the builder's own
// reading of the UD documentation, marked "verify". A convention learned
// from the Aeneid is Augustan Rome's; from Herodotus, Ionia's; from 2004
// newswire, Modern Standard Arabic's and no one's dialect.
//
// THE SPLIT. Where a treebank ships train and test, learn on train and
// audit on test. Otherwise the one file is cut by sentence parity: even
// sentences learn (and are split-halved again inside learnFeature for
// admission), odd sentences are the audit — read only after the model is
// fixed. The gold is a witness, never the fitness.
//
//   node sullivan-morph.mjs [--json] [--lang la,grc] [--feature Tense,Case] [--draws 12] [--reruns 5] [--write-priors]
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseConllu } from "../../kernel/eot-rich.js";
import { learnFeature, audit, reachOf, featuresIn, NULL, PRIOR_SCHEMA, morphCuesFromPrior } from "../../adapters/text/morph-cues.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(HERE, "..", "fixtures");
const PRIORS = path.resolve(HERE, "..", "..", "priors");
const DOC = "declared from the treebank's documentation";
const VERIFY = "declared by the builder — verify";
const FILE = "measured from the file";
const d = (value, basis = DOC) => ({ value, basis });

// Each treebank: where its files are, and what only its documentation can
// say. Everything measurable is measured below, never restated here.
const TREEBANKS = [
  {
    lang: "en", name: "English EWT", language: { iso: "eng", name: "English", stage: "Present-day English, web register" },
    learn: path.resolve(HERE, "..", "..", "..", "legacy-eoreader6.1", "scripts", "corpus", "en_ewt-ud-train.conllu"),
    declared: {
      giver: d("UD_English-EWT (Silveira, Dozat, de Marneffe, Schuster, Bauer, Manning et al.), converted from the English Web Treebank, LDC2012T13 — as priors/parser-eng-ewt.json already records", DOC),
      period: d("2000s — the English Web Treebank's weblogs, newsgroups, emails, reviews and question-answer forums", DOC),
      region: d("predominantly American English, as parser-eng-ewt.json's ParserProvenance@1 declares", DOC),
      register: d("informal written web English: reviews, answers, email, newsgroup, weblog (document genres measured below)", DOC),
      license: d("CC BY-SA 4.0 (UD_English-EWT)", VERIFY),
    },
  },
  {
    lang: "la", name: "Latin Perseus", language: { iso: "lat", name: "Latin", stage: "Classical and Augustan literary Latin, with Jerome's late-antique Vulgate" },
    learn: path.join(FIX, "ud-latin-perseus", "la_perseus-ud-train.conllu"), audit: path.join(FIX, "ud-latin-perseus", "la_perseus-ud-test.conllu"),
    readme: path.join(FIX, "ud-latin-perseus", "README.md"), licenseFile: path.join(FIX, "ud-latin-perseus", "LICENSE.txt"),
    declared: {
      giver: d("Ancient Greek and Latin Dependency Treebank 2.1 (Perseus, Tufts and Leipzig, Gregory Crane; UD conversion Giuseppe G. A. Celano; morphology via Morpheus, syntax manual — the README lists the annotators)", DOC),
      period: d("1st c. BCE – early 2nd c. CE (Cicero, Sallust, Propertius, Vergil, Ovid, Augustus, Phaedrus, Petronius, Tacitus, Suetonius) plus Jerome's Vulgate, c. 382–405 CE", DOC),
      region: d("Rome and Roman Italy — the literary standard, not a regional Latin", DOC),
      register: d("literary verse and prose: epic, elegy, oratory, history, fable, satire, scripture (works listed in the README)", DOC),
    },
  },
  {
    lang: "grc", name: "Greek PROIEL", language: { iso: "grc", name: "Ancient Greek", stage: "Ionic prose (Herodotus) and Koine (Greek New Testament)" },
    learn: path.join(FIX, "ud-greek-proiel", "grc_proiel-ud-test.conllu"),
    declared: {
      giver: d("PROIEL treebank (Dag Haug and Marius Jøhndal, University of Oslo), UD conversion by the PROIEL project — no README shipped beside this file", VERIFY),
      period: d("5th c. BCE (Herodotus, Histories) and 1st c. CE (Greek New Testament) — the two sources the file's own source lines name", VERIFY),
      region: d("Halicarnassus and Ionia (Herodotus); the eastern Mediterranean Koine (the Gospels and Acts)", VERIFY),
      register: d("historiographic prose and scripture narrative", VERIFY),
      license: d("CC BY-NC-SA 3.0 (UD_Ancient_Greek-PROIEL)", VERIFY),
    },
  },
  {
    lang: "sa-vedic", name: "Sanskrit Vedic", language: { iso: "san", name: "Sanskrit", stage: "Vedic Sanskrit — hymns, Brāhmaṇa and Sūtra prose, not Classical" },
    learn: path.join(FIX, "ud-sanskrit-vedic", "sa_vedic-ud-test.conllu"),
    readme: path.join(FIX, "ud-sanskrit-vedic", "README.md"), licenseFile: path.join(FIX, "ud-sanskrit-vedic", "LICENSE.txt"),
    declared: {
      giver: d("Treebank of Vedic Sanskrit (Hellwig, Scarlata, Ackermann, Widmer, LREC 2020; annotation also Biagetti, Sellmer), University of Zurich", DOC),
      period: d("c. 1500–500 BCE for the Vedic layers (Ṛgveda, Atharvaveda, Saṃhitās, Brāhmaṇas, Upaniṣads, Sūtras); the README calls them the oldest transmitted Indo-European layers — the cited texts are measured below and a few sit later", DOC),
      region: d("northwestern South Asia (Punjab, upper Gangetic plain) — the Vedic homeland", VERIFY),
      register: d("metrical hymns and ritual/exegetical prose", DOC),
    },
  },
  {
    lang: "sa-ufal", name: "Sanskrit UFAL", language: { iso: "san", name: "Sanskrit", stage: "Classical Sanskrit fable prose (Pañcatantra)" },
    learn: path.join(FIX, "ud-sanskrit-ufal", "sa_ufal-ud-test.conllu"),
    readme: path.join(FIX, "ud-sanskrit-ufal", "README.md"), licenseFile: path.join(FIX, "ud-sanskrit-ufal", "LICENSE.txt"),
    declared: {
      giver: d("UD_Sanskrit-UFAL (Dwivedi, Zeman, Biagetti; ÚFAL, Charles University, Prague; Gérard Huet's Sanskrit Reader for segmentation) — the README's machine-readable metadata", DOC),
      period: d("the Pañcatantra: composed c. 200 BCE–300 CE, transmitted in later recensions; the text here is Wikisource's", VERIFY),
      region: d("India — a pan-Indian literary text, no single region", VERIFY),
      register: d("fiction: fable (README genre)", DOC),
    },
  },
  {
    lang: "ar", name: "Arabic PADT", language: { iso: "arb", name: "Arabic", stage: "Modern Standard Arabic (newswire) — no spoken dialect" },
    learn: path.join(FIX, "ud-arabic-padt", "ar_padt-ud-test.conllu"),
    declared: {
      giver: d("Prague Arabic Dependency Treebank (Hajič, Smrž, Zemánek, Šnaidauf, Beška; ÚFAL), UD conversion by ÚFAL — no README shipped beside this file", VERIFY),
      period: d("2000s newswire (the file's document ids carry 2004 dates)", VERIFY),
      region: d("supra-regional written standard; the sources the file names are Tunisian (Assabah), Lebanese (An-Nahar), pan-Arab London-based (Al-Hayat), Xinhua's Arabic service and Ummah Press", VERIFY),
      register: d("newswire prose", VERIFY),
      license: d("CC BY-NC-SA 3.0 (UD_Arabic-PADT)", VERIFY),
    },
  },
  {
    lang: "he", name: "Hebrew HTB", language: { iso: "heb", name: "Hebrew", stage: "Modern Israeli Hebrew, newspaper register" },
    learn: path.join(FIX, "ud-hebrew-htb", "he_htb-ud-test.conllu"),
    declared: {
      giver: d("Hebrew Treebank (Sima'an, Itai, Winter, Altman, Nativ; Technion / MILA), UD conversion by Tsarfaty, Goldberg et al. — no README shipped beside this file", VERIFY),
      period: d("early 1990s Haaretz newspaper text", VERIFY),
      region: d("Israel", VERIFY),
      register: d("newspaper prose, unvocalised script", VERIFY),
      license: d("CC BY-NC-SA 4.0 (UD_Hebrew-HTB)", VERIFY),
    },
  },
];

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const JSON_OUT = argv.includes("--json");
const WRITE = argv.includes("--write-priors");
const LANGS = opt("--lang")?.split(",") ?? null;
const FEATURES = opt("--feature")?.split(",") ?? null;
const DRAWS = Number(opt("--draws") ?? NULL.draws);
const RERUNS = Number(opt("--reruns") ?? NULL.reruns);

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "—");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const tally = (xs) => { const t = {}; for (const x of xs) t[x] = (t[x] || 0) + 1; return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1])); };

/** What the file itself says about where it came from: its comment lines. */
function measuredSources(sentences) {
  const src = [], docs = [], cites = [];
  for (const s of sentences) for (const c of s.comments) {
    let m;
    if ((m = /^#\s*source\s*=\s*(.+)$/.exec(c))) src.push(m[1].replace(/,\s*(Book|chapter).*$/i, "").trim());
    else if ((m = /^#\s*newdoc id\s*=\s*(.+)$/.exec(c))) docs.push(m[1].trim());
    else if ((m = /^#\s*citation_text\s*=\s*(.+)$/.exec(c))) cites.push(m[1].trim());
  }
  const out = {};
  if (src.length) out.sourceLines = tally(src);
  if (docs.length) out.documents = { count: docs.length, prefixes: tally(docs.map((x) => x.split(/[-.]/)[0])) };
  if (cites.length) out.citedTexts = tally(cites);
  return out;
}
/** The script, measured: which Unicode blocks the forms fall in. */
function measuredScript(sentences) {
  const counts = { Latin: 0, Greek: 0, Devanagari: 0, Arabic: 0, Hebrew: 0, other: 0 };
  for (const s of sentences) for (const t of s.tokens) for (const ch of String(t.form)) {
    const c = ch.codePointAt(0);
    if (/\p{P}|\p{N}|\s/u.test(ch)) continue;
    if ((c >= 0x41 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f) || (c >= 0x1e00 && c <= 0x1eff)) counts.Latin += 1;
    else if (c >= 0x370 && c <= 0x3ff || c >= 0x1f00 && c <= 0x1fff) counts.Greek += 1;
    else if (c >= 0x900 && c <= 0x97f) counts.Devanagari += 1;
    else if (c >= 0x600 && c <= 0x6ff) counts.Arabic += 1;
    else if (c >= 0x590 && c <= 0x5ff) counts.Hebrew += 1;
    else counts.other += 1;
  }
  const [script, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { script, share: total ? n / total : 0, counts };
}
function licenseFrom(tb) {
  if (tb.licenseFile && fs.existsSync(tb.licenseFile)) return d(fs.readFileSync(tb.licenseFile, "utf8").split("\n").find((l) => l.trim())?.trim() ?? "", FILE);
  return tb.declared.license ?? d("not shipped beside the file", VERIFY);
}

const results = [];
for (const tb of TREEBANKS) {
  if (LANGS && !LANGS.includes(tb.lang)) continue;
  if (!fs.existsSync(tb.learn)) { console.error(`${tb.name}: missing ${tb.learn}`); continue; }
  const learnText = fs.readFileSync(tb.learn, "utf8");
  const all = parseConllu(learnText).filter((s) => s.tokens.length);
  let learn, auditSet, split, auditText = null;
  if (tb.audit && fs.existsSync(tb.audit)) {
    auditText = fs.readFileSync(tb.audit, "utf8");
    learn = all; auditSet = parseConllu(auditText).filter((s) => s.tokens.length); split = "train/test";
  } else {
    learn = all.filter((_, i) => i % 2 === 0); auditSet = all.filter((_, i) => i % 2 === 1); split = "parity: even sentences learn, odd audit";
  }
  const features = featuresIn(learn).filter((f) => !FEATURES || FEATURES.includes(f));
  const t0 = Date.now();
  const rows = [], models = {};
  for (const feature of features) {
    const model = learnFeature(learn, feature, { draws: DRAWS, reruns: RERUNS });
    const a = audit(model, auditSet);
    models[feature] = model;
    rows.push({
      feature, carriers: a.carriers, covered: a.covered, correct: a.correct, contested: a.contested, contestedCorrect: a.contestedCorrect,
      missedUnmarked: a.missedUnmarked, missedVoid: a.missedVoid, nonCarriers: a.nonCarriers, falseFires: a.falseFires, silenced: a.silenced,
      dominantKind: a.dominantKind, admitted: model.admitted, candidates: model.candidates, floor: model.floor, values: model.values.length, reach: reachOf(model), byValue: a.byValue,
    });
  }
  const ms = Date.now() - t0;
  const script = measuredScript(all);
  const provenance = {
    schema: "Provenance@1",
    source: d(`${path.basename(tb.learn)} sha256:${sha256(learnText)}${auditText ? ` + ${path.basename(tb.audit)} sha256:${sha256(auditText)}` : ""}`, FILE),
    giver: tb.declared.giver,
    license: licenseFrom(tb),
    period: tb.declared.period,
    region: tb.declared.region,
    register: tb.declared.register,
    script: d(`${script.script} (${(100 * script.share).toFixed(1)}% of letters)`, FILE),
    documents: d(measuredSources(all), FILE),
    readme: tb.readme && fs.existsSync(tb.readme) ? d(path.relative(path.resolve(HERE, "..", ".."), tb.readme), FILE) : d("no README shipped beside the file", FILE),
    split: d(split, FILE),
    tokens: d({ learn: learn.reduce((n, s) => n + s.tokens.length, 0), audit: auditSet.reduce((n, s) => n + s.tokens.length, 0) }, FILE),
    builtBy: d("native/eval/lavar/sullivan-morph.mjs (Sullivan's second sense, morph-cues.js)", FILE),
    builtAt: d(new Date().toISOString(), FILE),
    null: d({ draws: DRAWS, reruns: RERUNS, seed: NULL.seed }, FILE),
  };
  results.push({ lang: tb.lang, name: tb.name, language: tb.language, split, learnSentences: learn.length, auditSentences: auditSet.length, ms, provenance, rows });

  if (WRITE) {
    // The prior stores the CONVENTION — admitted cues and the numbers that
    // admitted them — never the search log: the refused list stays in
    // results/sullivan-morph.json, summarised here by reason. Measured
    // before this cut: 13.6 MB for English, most of it refusals.
    const stored = Object.fromEntries(Object.entries(models).map(([f, m]) => {
      const { refused, ...keep } = m;
      const refusedBy = {};
      for (const r of refused ?? []) refusedBy[r.why] = (refusedBy[r.why] ?? 0) + 1;
      return [f, { ...keep, refusedBy }];
    }));
    const prior = { schema: PRIOR_SCHEMA, language: tb.language, provenance, features: stored };
    morphCuesFromPrior(prior); // the loader's own refusal, before anything is written
    fs.mkdirSync(PRIORS, { recursive: true });
    fs.writeFileSync(path.join(PRIORS, `morph-cues-${tb.lang}.json`), JSON.stringify(prior, null, 1));
  }

  if (!JSON_OUT) {
    console.log(`\n${tb.name} (${tb.lang}) · ${tb.language.stage} · ${split} · learn ${learn.length} / audit ${auditSet.length} sentences · ${ms} ms · null ${DRAWS} draws, ${RERUNS} reruns, seed ${NULL.seed}`);
    console.log(`  period: ${provenance.period.value} [${provenance.period.basis}]`);
    console.log(`  region: ${provenance.region.value} [${provenance.region.basis}]`);
    console.log(`  script: ${provenance.script.value} · documents: ${JSON.stringify(provenance.documents.value).slice(0, 150)}`);
    console.log(`${"feature".padEnd(14)} ${"carriers".padStart(8)} ${"covered".padStart(8)} ${"accuracy".padStart(9)} ${"contest".padStart(8)} ${"missed∅".padStart(8)} ${"void".padStart(6)} ${"falseFire".padStart(10)} ${"cues".padStart(5)} ${"of".padStart(6)} ${"floor".padStart(6)}  dominant`);
    for (const r of rows) {
      console.log(`${r.feature.padEnd(14)} ${String(r.carriers).padStart(8)} ${pct(r.covered, r.carriers).padStart(8)} ${pct(r.correct, r.covered).padStart(9)} ${String(r.contested).padStart(8)} ${String(r.missedUnmarked).padStart(8)} ${String(r.missedVoid).padStart(6)} ${pct(r.falseFires, r.nonCarriers).padStart(10)} ${String(r.admitted).padStart(5)} ${String(r.candidates).padStart(6)} ${r.floor.toFixed(1).padStart(6)}  ${r.dominantKind ?? "—"}`);
    }
  }
}

if (!JSON_OUT) {
  console.log(`\nTENSE REACH — how each universal value is reached, per language (form = ending/prefix, construction = neighbour/auxiliary)`);
  for (const r of results) {
    const tense = r.rows.find((x) => x.feature === "Tense");
    if (!tense) { console.log(`${r.name.padEnd(16)} no Tense in this treebank`); continue; }
    const parts = Object.entries(tense.reach).map(([v, x]) => {
      const fam = x.form && !x.construction ? "form" : x.construction && !x.form ? "construction" : x.form && x.construction ? "form+construction" : "class";
      const bv = tense.byValue[v];
      return `${v}: ${fam} (best ${x.best.kind}=${JSON.stringify(x.best.key)}|${x.best.class} ${(100 * x.best.accuracy).toFixed(0)}%${bv ? `, audit ${bv.correct}/${bv.n}` : ""})`;
    });
    const unreached = Object.keys(tense.byValue).filter((v) => !tense.reach[v]);
    console.log(`${r.name.padEnd(16)} ${parts.join(" · ") || "no cue admitted"}${unreached.length ? ` · UNREACHED: ${unreached.join(", ")}` : ""}`);
  }
}

const out = path.join(HERE, "results", "sullivan-morph.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ schema: "SullivanMorph@1", generatedAt: new Date().toISOString(), null: { draws: DRAWS, reruns: RERUNS, seed: NULL.seed }, treebanks: results }, null, 1));
if (JSON_OUT) console.log(JSON.stringify(results, null, 1)); else console.log(`\n-> ${path.relative(process.cwd(), out)}${WRITE ? ` · priors written to ${path.relative(process.cwd(), PRIORS)}/morph-cues-<lang>.json` : ""}`);
