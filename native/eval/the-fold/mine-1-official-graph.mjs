// eval/mine-1-official-graph.mjs — export our reader's own knowledge graph
// (nodes + edges) per essay, in the shape the MINE-1 paper's own scoring
// pipeline expects: a flat node list and a subject/verb/object edge list,
// so a SEPARATE embedding+retrieval+judge script (python, since that's
// where sentence-transformers lives) can run the paper's ACTUAL
// methodology against it — top-k semantically similar nodes per fact
// (all-MiniLM-L6-v2), expanded to the 2-hop neighborhood, then an LLM
// judge scoring whether the fact is inferable from that retrieved
// subgraph alone. This is NOT the `bound` verdict — `bound` requires an
// exact structural SVO match and has no LLM judge anywhere in it, by
// design (this codebase's whole P4/P20 discipline). The paper's own
// metric is permissive/entailment-style. Exporting the graph plainly, so
// the comparison is against the SAME rubric KGGen/GraphRAG/OpenIE were
// scored under (66.07% / 47.80% / 29.84%, arxiv.org/abs/2502.09956),
// not our own stricter one.
//
// Configuration: plain UniMorph (unfiltered) — the pareto-best of all
// nine variants tried this session (eval/results/mine-1-FINAL-COMPARISON.md).
//
// Run: node eval/mine-1-official-graph.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";

const here = dirname(fileURLToPath(import.meta.url));

async function organs() {
  const { splitSentences } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize };
}

async function main() {
  const data = JSON.parse(readFileSync(join(here, "fixtures", "mine1-essays.json"), "utf8"));
  const verbFormsList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-verb-forms.json"), "utf8"));
  const VERB_SET = new Set(verbFormsList);

  const base = await organs();
  const reader = makeRelationReader({ ...base, verbForms: VERB_SET });

  const essays = [];
  for (const ex of data.examples) {
    const passages = [{ ref: `mine1:${ex.idx}#0`, text: ex.content }];
    const built = reader(passages);
    const edges = built.examined ? built.edges : [];
    const nodeSet = new Set();
    for (const e of edges) {
      nodeSet.add(e.subject);
      nodeSet.add(e.object);
    }
    essays.push({
      idx: ex.idx,
      topic: ex.topic,
      facts: ex.facts,
      nodes: [...nodeSet],
      edges: edges.map((e) => ({ subject: e.subject, verb: e.verb, object: e.object, polarity: e.polarity })),
    });
  }

  writeFileSync(join(here, "fixtures", "mine1-graph-export.json"), JSON.stringify({ essays }, null, 1));
  console.log(`exported ${essays.length} essays' graphs`);
  console.log(`total nodes: ${essays.reduce((s, e) => s + e.nodes.length, 0)}, total edges: ${essays.reduce((s, e) => s + e.edges.length, 0)}`);
  console.log(`essays with zero edges (graph-empty): ${essays.filter((e) => e.edges.length === 0).length}`);
}

main();
