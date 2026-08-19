// eval/mine-1-priors.mjs — MINE-1 against the priors tier, fully activated.
//
// THE QUESTION THIS ANSWERS. After the plain run (eval/mine-1.mjs, 5.8%/
// 17.1% bound) the dominant failure was structural: `hypergraph.js`'s
// reader needs the ESSAY ITSELF to establish a referent and a relation
// vocabulary, and 66% of MINE-1 facts never even produced a checkable
// triple that way. The hypothesis on the table: what if the system could
// also consult `live_priors` — the curated local reference corpus
// `priors.js` already knows how to check a claim against — instead of
// relying on the essay alone?
//
// WHAT "ACTIVATED" MEANS HERE, DECLARED BEFORE THE RUN. In the running app,
// `/api/priors/check` gates its candidate list on the standing toggle
// ledger (`priors-toggles.js`), which defaults every document OFF
// (`decidedBy: null`) until a person turns it on. This script does not
// drive that ledger — it treats the WHOLE corpus as enabled, because the
// question on the table is "would priors help at all if switched on," not
// "what does today's specific toggle state happen to cover." That is a
// deliberately more generous test than the app's own default posture, and
// it is stated here rather than left implicit.
//
// THE CLAIM SHAPE, DECLARED BEFORE THE RUN — AND WHY IT DIFFERS FROM HOW
// THIS TOOL IS NORMALLY USED. Every existing caller of `checkPrior` (the
// grounding ladder's own atom checks) builds a claim from ONE extracted
// atom — a name or a number, a handful of tokens — because `extractAtoms`
// only ever pulls proper-noun phrases and figures out of a sentence. A
// MINE-1 fact ("Butterflies undergo a remarkable transformation throughout
// their life cycle.") usually has neither, so that machinery would find
// nothing to check at all. This script instead builds the claim from EVERY
// content word of the fact sentence (stopwords and short words dropped) —
// the literal, maximally strict reading of "does some document in the
// library state this fact": `snipClaim` requires all of them to land in
// ONE sentence of a candidate document. This is a harder bar than the
// tool's usual one-atom claims, not a gentler one, and it was fixed before
// the run and is unchanged after seeing the numbers.
//
// Run: node eval/mine-1-priors.mjs

import { readFileSync, readdirSync, statSync, existsSync, openSync, readSync, closeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";

import {
  parseFrontmatter,
  readPriorDocument,
  rankPriorCandidates,
  checkPrior,
  foldPriors,
  PRIORS_DOCS_CONSULTED,
} from "../priors.js";
import { wordSet, CLAIM_STOPWORDS } from "../grounding.js";

const here = dirname(fileURLToPath(import.meta.url));
const PRIORS_ROOT = resolve(here, "..", "..", "live_priors");

// The identical skip rule explore-server.mjs's listPriorDocuments/walkPriors
// use, restated here because this script does not import the server (it
// owns no IO of its own, priors.js's own discipline) — the two priors
// organs must see one corpus, so the rule is copied verbatim, not
// reinvented.
const FIND_SKIP = new Set(["node_modules", ".git", ".next", "dist", "out", "build", ".cache"]);
const PRIORS_SKIP = new Set(["scripts", "src", "manifests"]);
const PRIORS_HEAD_BYTES = 4096;

function utf8Probe(buf) {
  // A crude but adequate binary sniff: a NUL byte inside the head means
  // this is not a text face priors.js can snip.
  return !buf.includes(0);
}

function listPriorDocuments() {
  if (!existsSync(PRIORS_ROOT)) return null;
  const entries = [];
  const walk = (dir, rel, category) => {
    let names;
    try {
      names = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of names) {
      if (ent.name.startsWith(".")) continue;
      if (ent.isSymbolicLink()) continue;
      const abs = join(dir, ent.name);
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (FIND_SKIP.has(ent.name) || (!rel && PRIORS_SKIP.has(ent.name))) continue;
        walk(abs, childRel, category ?? ent.name);
        continue;
      }
      if (!category) continue; // top-level loose files are the corpus's papers about itself
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      const buf = Buffer.alloc(Math.min(st.size, PRIORS_HEAD_BYTES));
      if (buf.length) {
        try {
          const fd = openSync(abs, "r");
          try {
            readSync(fd, buf, 0, buf.length, 0);
          } finally {
            closeSync(fd);
          }
        } catch {
          continue;
        }
      }
      if (buf.length && !utf8Probe(buf)) continue;
      const title = buf.length ? parseFrontmatter(buf.toString("utf8")).title : null;
      entries.push({ path: childRel, title });
    }
  };
  walk(PRIORS_ROOT, "", null);
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return entries;
}

function claimFor(sentence) {
  const words = [...wordSet(sentence)].filter((w) => w.length > 2 && !CLAIM_STOPWORDS.has(w));
  return { kind: "text", text: sentence, tokens: [...new Set(words)], sentence };
}

async function main() {
  if (!existsSync(PRIORS_ROOT)) {
    console.log(`live_priors is not beside the-fold (looked at ${PRIORS_ROOT}) — nothing to run`);
    return;
  }
  const data = JSON.parse(readFileSync(join(here, "fixtures", "mine1-essays.json"), "utf8"));
  console.error("listing live_priors …");
  const entries = listPriorDocuments();
  console.error(`${entries.length} candidate documents in the corpus (scripts/src/manifests and dotfiles excluded)`);

  const docCache = new Map(); // path -> parsed prior document (readPriorDocument)
  function loadDoc(relPath) {
    if (docCache.has(relPath)) return docCache.get(relPath);
    const abs = join(PRIORS_ROOT, relPath);
    if (!abs.startsWith(PRIORS_ROOT + sep)) return null;
    let raw;
    try {
      raw = readFileSync(abs, "utf8");
    } catch {
      docCache.set(relPath, null);
      return null;
    }
    const doc = readPriorDocument(relPath, raw);
    docCache.set(relPath, doc);
    return doc;
  }

  const totals = {
    facts: 0,
    "stated-by-library": 0,
    "unstated-by-consulted": 0,
    "not-consulted": 0,
    "no-candidates": 0,
  };
  const statedExamples = [];

  let i = 0;
  for (const ex of data.examples) {
    for (const fact of ex.facts) {
      i++;
      if (i % 200 === 0) console.error(`… ${i}/${data.n_facts_total}`);
      const claim = claimFor(fact);
      if (!claim.tokens.length) {
        totals.facts++;
        totals["no-candidates"]++;
        continue;
      }
      const ranked = rankPriorCandidates(claim, entries);
      const documents = [];
      for (const cand of ranked.slice(0, PRIORS_DOCS_CONSULTED)) {
        const doc = loadDoc(cand.path);
        if (!doc) {
          documents.push({ path: cand.path, category: cand.category, title: cand.title ?? null, stating: false, snipsFound: 0, snips: [], source: {}, gap: { silence: "not-present", detail: "could not be read" } });
          continue;
        }
        documents.push(checkPrior(claim, doc));
      }
      const folded = foldPriors(claim, { candidates: ranked.length, documents });
      totals.facts++;
      totals[folded.verdict] = (totals[folded.verdict] ?? 0) + 1;
      if (folded.verdict === "stated-by-library") {
        statedExamples.push({ essay: ex.topic, fact, verdict: folded.verdict, stating: folded.documents.filter((d) => d.stating).map((d) => ({ path: d.path, snip: d.snips[0]?.text })) });
      }
    }
  }

  const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");
  console.log(`\nMINE-1 · priors tier, whole corpus treated as activated (${entries.length} documents)`);
  console.log(`${data.n_examples} essays, ${totals.facts} attached facts\n`);
  console.log(`  stated-by-library     (a document literally states the fact) : ${totals["stated-by-library"]} (${pct(totals["stated-by-library"], totals.facts)})`);
  console.log(`  unstated-by-consulted (candidates read, none states it)      : ${totals["unstated-by-consulted"]} (${pct(totals["unstated-by-consulted"], totals.facts)})`);
  console.log(`  not-consulted         (candidates existed, none could be read): ${totals["not-consulted"]} (${pct(totals["not-consulted"], totals.facts)})`);
  console.log(`  no-candidates         (no document shares this fact's words) : ${totals["no-candidates"]} (${pct(totals["no-candidates"], totals.facts)})`);
  console.log(`\nheadline (stated-by-library / all ${totals.facts} facts): ${pct(totals["stated-by-library"], totals.facts)}`);

  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(here, "results", "mine-1-priors-run.json"), JSON.stringify({ totals, statedExamples }, null, 1));
  console.log(`\n${statedExamples.length} example(s) that landed stated-by-library, with their snip, in eval/results/mine-1-priors-run.json`);
}

main();
