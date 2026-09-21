#!/usr/bin/env node
// eval/udhr/udhr-swarm-lessons.mjs — what the swarm learned on the UDHR, hardened LOCALLY.
//
// The swarm (native/eval/lavar/wilson.mjs) was sent across the declaration in
// the reader's declared languages. A kept winner is a NOMINEE at one site; it
// hardens into a THING only when the same variant wins on two or more
// independent materials (swarm-things.mjs's ladder). The UDHR is a strong
// test of that ladder: the same meaning in each language, so a variant that
// wins in two languages is corroborated across languages, not across books.
//
// This reports the ladder's verdict for the UDHR runs, alone and together with
// everything the device store already held. It never writes to the shared
// store in live_priors — promotion there (swarm-priors.mjs) is a decision the
// user makes, because other sessions read it.
//
//   node native/eval/udhr/udhr-swarm-lessons.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readBreakthroughs, harden, lineageOf } from "../lavar/swarm-things.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const isUdhr = (e) => /udhr-.*\.clean\.txt/.test(String(e.provenance?.source ?? ""));

const all = readBreakthroughs();
const udhr = all.filter(isUdhr);
const langOf = (e) => e.shadow?.lang ?? "?";
console.log(`breakthroughs in the device store: ${all.length} | from the UDHR runs: ${udhr.length}`);
for (const e of udhr) console.log(`   ${langOf(e).padEnd(4)} gen ${e.gen} ${String(e.variant).padEnd(34)} shape ${Number(e.shape).toFixed(3)} terrain ${(e.terrain ?? []).join(",")} echo ${e.echo}`);

for (const [label, entries] of [["UDHR alone", udhr], ["UDHR with every earlier material", all]]) {
  const { things, nominees } = harden(entries, { lineage: (v) => lineageOf(v) });
  const touchesUdhr = (t) => (t.independentSources ?? [t.pointer]).some((p) => /udhr-/.test(String(p)));
  const rel = label === "UDHR alone" ? things : things.filter(touchesUdhr);
  console.log(`\n${label}: ${rel.length} hardened thing(s), ${nominees.filter((n) => /udhr-/.test(String(n.pointer))).length} UDHR nominee(s) still at one site`);
  for (const t of rel) {
    const langs = [...new Set(entries.filter((e) => e.variant === t.variant).map(langOf))];
    console.log(`   ${t.name}  ${t.variant}  — ${t.label}  stance ${t.stance}  cells ${t.cells.join(" ")}  witnesses ${t.witnesses} across ${t.independentSources.length} materials  langs ${langs.join(",")}`);
  }
}
