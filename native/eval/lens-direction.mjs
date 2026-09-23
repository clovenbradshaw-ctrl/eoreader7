// lens-direction.mjs — which way through the language's lens? Handle: Chomsky.
//
// The question (user, 2026-09-23): "for reading we have to pass through the
// lens the language 'wants' us to use to the universal. For generation it's
// flipped." Measured here against treebank gold, both directions:
//
// GENERATION — meaning -> lens -> surface. Held-out English sentences are
// rebuilt from the EOT meaning layer (kernel/eot-rich.js) and linearised with
// word-order parameters measured from (a) English itself, (b) each other
// treebank, (c) all other languages pooled — a "universal" order.
//
// READING — surface -> lens -> universal. On the English parser's held-out
// tenth of UD_English-EWT, gold subject–verb–object triples are recovered by
// (a) the English dependency parser (english-parser.js; lens first), (b) the
// positional reader with English's measured RoleConfig@1 (the proxy's chat
// route), (c) the language-blind GFP adjacency reader (relations-gfp.js;
// universal first; the CLI's route). Each finds its own participants.
//
// AND: GFP adjacency GIVEN the gold participants, per language — how often
// the verb sits between them, which is what adjacency assumes. If that holds
// only where the verb is medial, the "universal" reader is an SVO lens.
//
//   node native/eval/lens-direction.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConllu, toEot, annotationFromMeaning, measureOrder, linearize, kendallTau } from "../kernel/eot-rich.js";
import { loadModel, parseText } from "../adapters/text/english-parser.js";
import { extractGfpRelations } from "../adapters/text/relations-gfp.js";
import { extractPositionalRelation } from "../adapters/text/relations-positional.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";
import { findTreebanks } from "./eot-roundtrip.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
export const MODEL = path.join(ROOT, "native", "priors", "parser-eng-ewt.json");
const ROLE_CONFIG = path.join(ROOT, "native", "priors", "role-config-eng.json");
const POS_ENG = path.resolve(ROOT, "..", "the-fold", "priors-data", "pos-prior-eng.json");

const lc = (x) => String(x ?? "").toLowerCase();
const textOf = (s) => (s.lines.find((l) => l.startsWith("# text = ")) ?? "").slice(9);
const load = (tb) => tb.files.flatMap((f) => parseConllu(fs.readFileSync(f, "utf8")));
function triplesOf(rows) {
  const out = [];
  for (const s of rows.filter((r) => r.deprel === "nsubj")) for (const o of rows.filter((r) => r.deprel === "obj" && r.head === s.head)) {
    const v = rows.find((r) => r.id === s.head);
    if (v) out.push([lc(s.form), lc(v.form), lc(o.form)]);
  }
  return out;
}
const goldOf = (s) => triplesOf(s.tokens.map((t) => ({ ...t, id: Number(t.id), head: Number(t.head) })));
const words = (x) => lc(x).split(/[^\p{L}\p{N}]+/u);

export function generation(banks, { sample = 3000 } = {}) {
  const en = load(banks.find((b) => b.name === "ud-english-ewt"));
  const held = en.filter((_, i) => i % 2 === 1).slice(0, sample), train = en.filter((_, i) => i % 2 === 0);
  const others = Object.fromEntries(banks.filter((b) => b.name !== "ud-english-ewt").map((b) => [b.name, load(b)]));
  const sources = { english: measureOrder(train), ...Object.fromEntries(Object.entries(others).map(([n, s]) => [n, measureOrder(s)])), pooledOthers: measureOrder(Object.values(others).flat()) };
  const out = {};
  for (const [name, params] of Object.entries(sources)) {
    let tau = 0, exact = 0;
    for (const s of held) {
      const rec = toEot(s, { language: "en", source: "lens-direction" });
      const produced = linearize(annotationFromMeaning(rec), params);
      const gold = s.tokens.filter((t) => !String(t.deprel).startsWith("punct")).map((t) => rec.surface.keyOfId[t.id]);
      tau += kendallTau(produced, gold);
      if (produced.filter((k) => gold.includes(k)).join() === gold.join()) exact += 1;
    }
    out[name] = { tau: +(tau / held.length).toFixed(4), exact: +(exact / held.length).toFixed(4) };
  }
  return { sentences: held.length, orderFrom: out };
}

export function reading(banks, { model, posPrior, roleConfig }) {
  const held = load(banks.find((b) => b.name === "ud-english-ewt")).filter((_, i) => i % 10 === 9).filter((s) => textOf(s));
  const spans = []; let off = 0;
  for (const s of held) { const t = textOf(s); spans.push([off, off + t.length]); off += t.length + 1; }
  const arrangements = extractGfpRelations(held.map(textOf).join("\n"), { posPrior });
  let gold = 0, parHit = 0, parEmit = 0, posHit = 0, posEmit = 0, gfpHit = 0;
  held.forEach((s, i) => {
    const G = goldOf(s); gold += G.length;
    const text = textOf(s);
    const P = triplesOf(parseText(model, text).split("\n").filter((l) => l && !l.startsWith("#")).map((l) => { const c = l.split("\t"); return { id: Number(c[0]), form: c[1], head: Number(c[6]), deprel: c[7] }; }));
    parEmit += P.length; parHit += P.filter((t) => G.some((g) => g.join() === t.join())).length;
    let r = null; try { r = extractPositionalRelation(text, { roleConfig, posPrior, classifyWord, dominantClass }); } catch { r = null; }
    if (r?.end1 && r?.end2) { posEmit += 1; if (G.some(([a, v, c]) => lc(r.end1.word) === a && lc(r.end2.word) === c && lc(r.label?.word) === v)) posHit += 1; }
    const mine = arrangements.filter((x) => x.offset >= spans[i][0] && x.offset < spans[i][1]);
    for (const [a, v, c] of G) if (mine.some((x) => lc(x.end1) === a && lc(x.end2) === c && words(x.label).includes(v))) gfpHit += 1;
  });
  const rate = (a, b) => (b ? +(a / b).toFixed(4) : null);
  return {
    sentences: held.length, goldTriples: gold,
    parserLensFirst: { recall: rate(parHit, gold), precision: rate(parHit, parEmit) },
    positionalRoleConfig: { recall: rate(posHit, gold), precision: rate(posHit, posEmit) },
    gfpUniversalFirst: { recall: rate(gfpHit, gold), arrangements: arrangements.length },
  };
}

export function adjacencyAsLens(banks, { sample = 3000 } = {}) {
  const out = {};
  for (const tb of banks) {
    let g = 0, hit = 0;
    for (const s of load(tb).filter((x) => textOf(x)).slice(0, sample)) {
      const G = goldOf(s); if (!G.length) continue;
      g += G.length;
      const A = extractGfpRelations(textOf(s), { figures: new Set(G.flatMap(([a, , c]) => [a, c])) });
      for (const [a, v, c] of G) if (A.some((x) => ((lc(x.end1) === a && lc(x.end2) === c) || (lc(x.end1) === c && lc(x.end2) === a)) && words(x.label).includes(v))) hit += 1;
    }
    out[tb.name] = { triples: g, verbBetween: g ? +(hit / g).toFixed(4) : null };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const banks = findTreebanks();
  const model = loadModel(JSON.parse(fs.readFileSync(MODEL, "utf8")));
  const posPrior = JSON.parse(fs.readFileSync(POS_ENG, "utf8"));
  const roleConfig = JSON.parse(fs.readFileSync(ROLE_CONFIG, "utf8"));
  const result = { at: new Date().toISOString().slice(0, 10), generation: generation(banks), reading: reading(banks, { model, posPrior, roleConfig }), adjacencyAsLens: adjacencyAsLens(banks) };
  console.log(JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(HERE, "results", "lens-direction.json"), JSON.stringify(result, null, 2));
}
