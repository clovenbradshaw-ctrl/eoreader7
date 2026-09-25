// wire-wiktionary.mjs — wire the hypergraph vocabulary to Wiktionary (pull on the fly).
//
// No definitions are fetched or recorded here. This writes a wiring index: every term
// the graph speaks in (harm referents, typed-edge relations, duty verbs, department
// names) maps to its live Wiktionary REST + page URLs, so a definition can be pulled
// on demand at read time. The graph carries a pointer to this wiring file.

import fs from "node:fs";

const ROOT = new URL("./", import.meta.url);
const graph = JSON.parse(fs.readFileSync(new URL("./harm-graph.json", import.meta.url), "utf8"));
const rows = fs.readFileSync(new URL("./ledger/metro-code-departments.jsonl", import.meta.url), "utf8")
  .trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

const STOP = new Set(["and", "or", "the", "of", "a", "an", "in", "on", "to", "for", "with", "related", "risk", "harm", "death", "injury", "fatal", "deaths"]);
const wordsOf = (label) =>
  label.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/)
    .filter((w) => w.length > 3 && !STOP.has(w));

const DUTY = ["administer", "appoint", "audit", "coordinate", "enforce", "inspect", "investigate",
  "license", "maintain", "manage", "oversee", "regulate", "supervise", "recommend", "report",
  "monitor", "mitigate", "respond", "preserve", "protect", "conduct", "evaluate", "certify"];

const terms = new Set();
const wiring = { schema: "WiktionaryWiring@1", note: "definitions pulled on the fly, never recorded", terms: {} };

const addTerm = (t) => {
  if (!terms.has(t)) {
    terms.add(t);
    wiring.terms[t] = {
      rest: `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(t)}`,
      page: `https://en.wiktionary.org/wiki/${encodeURIComponent(t)}`,
    };
  }
};

// vocabulary -> term lists
const vocab = { harmReferents: {}, relations: {}, dutyVerbs: {}, departments: {} };

for (const id of graph.harmReferentIds ?? []) {
  const label = graph.harmReferentsById[id]?.label ?? id.split(":").pop().replace(/-/g, " ");
  const ws = wordsOf(label);
  vocab.harmReferents[id] = ws;
  ws.forEach(addTerm);
}
for (const rel of new Set(graph.edgesList.map((e) => e.relation))) {
  const ws = wordsOf(rel);
  vocab.relations[rel] = ws;
  ws.forEach(addTerm);
}
vocab.dutyVerbs = DUTY;
DUTY.forEach(addTerm);
for (const dep of graph.departmentNames ?? []) {
  const ws = wordsOf(dep);
  vocab.departments[dep] = ws;
  ws.forEach(addTerm);
}

wiring.vocabulary = vocab;
wiring.termCount = terms.size;

fs.writeFileSync(new URL("./wiktionary-wiring.json", import.meta.url), JSON.stringify(wiring, null, 2));

// point the graph at the wiring
graph.wiktionary = { schema: "WiktionaryWiringRef@1", wired: true, wiringFile: "wiktionary-wiring.json", mode: "on-the-fly", termCount: terms.size };
fs.writeFileSync(new URL("./harm-graph.json", import.meta.url), JSON.stringify(graph, null, 2));

console.log("terms wired:", terms.size);
console.log("sample:", Object.keys(wiring.terms).slice(0, 8).join(", "));