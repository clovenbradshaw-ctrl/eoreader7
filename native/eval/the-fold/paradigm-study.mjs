// The paradigm study: every form learned against the union of all the others,
// on half its instances; evaluated on the held-out half and held-out others.
import fs from "node:fs";
import path from "node:path";
import { segmentCollection, elementsOf } from "../../the-fold/medium.js";
import { learnParadigm, evaluateParadigm, paradigmLines } from "../../the-fold/paradigm.js";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const C = process.env.PARADIGM_CORPUS ?? path.join(HERE, "results/paradigm-2026-09-22/corpus"); // corpora are re-derived by paradigm-gather.mjs, never committed
const gut = (t) => { const a = t.indexOf("*** START"), b = t.indexOf("*** END"); return t.slice(a >= 0 ? t.indexOf("\n", a) : 0, b >= 0 ? b : t.length); };
const dir = (d) => (fs.existsSync(path.join(C, d)) ? fs.readdirSync(path.join(C, d)).map((f) => ({ id: f, elements: elementsOf(fs.readFileSync(path.join(C, d, f), "utf8")).elements })).filter((u) => u.elements.length >= 2) : []);
const forms = {
  "English sonnet (Shakespeare)": segmentCollection(gut(fs.readFileSync(path.join(C, "pg1041.txt"), "utf8"))).units,
  "Petrarchan sonnet (Browning)": segmentCollection(gut(fs.readFileSync(path.join(C, "pg2002.txt"), "utf8"))).units,
  limerick: segmentCollection(gut(fs.readFileSync(path.join(C, "pg982.txt"), "utf8"))).units,
  "man page": dir("man"),
  "statute section": segmentCollection(fs.readFileSync(path.join(HERE, "fixtures/ukpga-2017-1.md"), "utf8")).units,
  recipe: dir("recipes"),
  obituary: dir("obits"),
  "encyclopedia prose": dir("prose"),
};
for (const k of Object.keys(forms)) if (forms[k].length < 6) { console.log(`(${k}: ${forms[k].length} unit(s) — left out)`); delete forms[k]; }
// Cap each form so no one population dominates the null; deterministic split.
const CAP = 120;
for (const k of Object.keys(forms)) forms[k] = forms[k].filter((_, i) => i % Math.max(1, Math.floor(forms[k].length / CAP)) === 0).slice(0, CAP);
const half = (xs, side) => xs.filter((_, i) => i % 2 === side);

const report = {};
for (const [name, units] of Object.entries(forms)) {
  const others = Object.entries(forms).filter(([k]) => k !== name).flatMap(([, u]) => u);
  const p = learnParadigm({ name, instances: half(units, 0), population: half(others, 0) });
  console.log("\n" + paradigmLines(p).join("\n"));
  if (p.refused) continue;
  const hin = half(units, 1).map((u) => evaluateParadigm(p, u).satisfies), hout = half(others, 1).map((u) => evaluateParadigm(p, u).satisfies);
  const byForm = Object.fromEntries(Object.entries(forms).filter(([k]) => k !== name).map(([k, u]) => [k, half(u, 1).filter((x) => evaluateParadigm(p, x).satisfies).length + "/" + half(u, 1).length]));
  const line = `  HELD OUT        ${hin.filter(Boolean).length}/${hin.length} ${name} instances satisfy · ${hout.filter(Boolean).length}/${hout.length} others falsely admitted (${Object.entries(byForm).map(([k, v]) => `${k} ${v}`).join(", ")})`;
  console.log(line);
  report[name] = { basis: p.basis, features: p.features.map((f) => ({ cell: f.cell, key: f.key, support: f.support, contrast: f.contrast ?? null, p: f.p })), scheme: p.scheme, count: p.count, satisfies: p.satisfies, heldOut: { instances: `${hin.filter(Boolean).length}/${hin.length}`, others: `${hout.filter(Boolean).length}/${hout.length}`, byForm } };
}
fs.writeFileSync(path.join(HERE, "results/paradigm-2026-09-22/paradigm-study.json"), JSON.stringify(report, null, 2));
