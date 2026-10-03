// native/eval/gfp-composed-falsify.mjs — FALSIFY THE MODEL-FREE READER against
// GOLD UD TREEBANKS, MULTILINGUAL.
//
// The composed reader (gfp-relations-composed.js) claims to read
// figure-connector-figure with NO model. This falsifies that against the one
// independent ground we hold: UD treebanks. For each language whose RoleConfig@1
// and POSPrior@1 we have, take the treebank's own sentences, read each with the
// composed reader (no model, no parser), and measure how often its arrangement
// recovers the treebank's own nsubj/obj core (end1 = the clause's subject head,
// end2 = the object head, label typed by the verb).
//
// FALSIFIED if the reader recovers the gold core at or below the SHUFFLE NULL —
// the same sentence with its words shuffled, so the reader has no real order to
// read. A reader that cannot beat its own shuffle is reading nothing.
//
//   node native/eval/gfp-composed-falsify.mjs [--lang eng|heb|arb] [--n 200] [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composedRelations } from "../adapters/text/gfp-relations-composed.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : fb; };
const N = Number(arg("--n", 200));

// language -> { roleConfig, posPrior, treebank }
const LANGS = {
  eng: { role: "role-config-eng.json", pos: "pos-en.json", bank: "__EN_EWT__" },
  heb: { role: "role-config-heb.json", pos: "pos-heb.json", bank: "ud-hebrew-htb/he_htb-ud-test.conllu" },
  arb: { role: "role-config-arb.json", pos: "pos-arb.json", bank: "ud-arabic-padt/ar_padt-ud-test.conllu" },
};

function loadConllu(file) {
  const sents = []; let cur = null;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    if (!raw.trim()) { if (cur && cur.tokens.length) sents.push(cur); cur = null; continue; }
    if (!cur) cur = { text: null, tokens: [] };
    if (raw.startsWith("# text = ")) { cur.text = raw.slice(9); continue; }
    if (raw.startsWith("#")) continue;
    const c = raw.split("\t");
    if (c.length !== 10 || c[0].includes("-") || c[0].includes(".")) continue;
    cur.tokens.push({ id: +c[0], form: c[1], lemma: c[2], upos: c[3], head: +c[6], deprel: c[7] });
  }
  return sents;
}

/** the gold core: the root verb's subject head (nsubj/csubj) and object head (obj/iobj) */
function goldCore(sent) {
  const byId = new Map(sent.tokens.map((t) => [t.id, t]));
  const root = sent.tokens.find((t) => t.head === 0 && /VERB|AUX/.test(t.upos));
  if (!root) return null;
  const subj = sent.tokens.find((t) => t.head === root.id && /^(nsubj|csubj)/.test(t.deprel));
  const obj = sent.tokens.find((t) => t.head === root.id && /^(obj|iobj)/.test(t.deprel));
  if (!subj || !obj) return null;
  return { end1: subj.form, end2: obj.form, label: root.form };
}

const shuffle = (s) => { const a = s.split(/\s+/); for (let i = a.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.join(" "); };

const summary = [];
for (const [lang, cfg] of Object.entries(LANGS)) {
  const bank = cfg.bank === "__EN_EWT__" ? path.join(HERE, "..", "scripts", "corpus", "en_ewt-ud-train.conllu") : path.join(HERE, "fixtures", cfg.bank);
  if (!fs.existsSync(bank)) { console.log(`-- ${lang}: treebank absent (${cfg.bank}), skipped`); continue; }
  const roleConfig = JSON.parse(fs.readFileSync(path.join(HERE, "..", "priors", cfg.role), "utf8"));
  const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "..", "priors", cfg.pos), "utf8"));
  const verbForms = new Set();
  const GMS = 0.9;
  for (const [w, c] of Object.entries(posPrior.forms ?? {})) { const tot = Object.values(c).reduce((a, b) => a + b, 0); if (tot > 0 && ((c.VERB ?? 0) + (c.AUX ?? 0)) / tot >= GMS) verbForms.add(w.toLowerCase()); }

  const sents = loadConllu(bank).filter((s) => s.text).slice(0, N);
  let gold = 0, real = 0, nullHits = 0, considered = 0;
  for (const s of sents) {
    const g = goldCore(s); if (!g) continue; considered++;
    gold++;
    const realRels = composedRelations(s.text, { posPrior, roleConfig, classifyWord, dominantClass, verbForms }).relations;
    const nullRels = composedRelations(shuffle(s.text), { posPrior, roleConfig, classifyWord, dominantClass, verbForms }).relations;
    const hit = (rels) => rels.some((r) => (String(r.end1).toLowerCase() === g.end1.toLowerCase() && String(r.end2).toLowerCase() === g.end2.toLowerCase()) || (String(r.end1).toLowerCase() === g.end2.toLowerCase() && String(r.end2).toLowerCase() === g.end1.toLowerCase()));
    if (hit(realRels)) real++;
    if (hit(nullRels)) nullHits++;
  }
  const pct = (x) => (gold ? ((x / gold) * 100).toFixed(1) : "0");
  console.log(`${lang}: sentences with a gold core ${gold} (of ${considered}) | comp-reader recovers core ${real} (${pct(real)}%) | SHUFFLE-NULL recovers ${nullHits} (${pct(nullHits)}%)  ${real > nullHits ? "BEATS NULL" : "≤ NULL — FALSIFIED"}`);
  summary.push({ lang, gold, real, nullHits, recoversPct: gold ? real / gold : 0, nullPct: gold ? nullHits / gold : 0 });
}
if (process.argv.includes("--json")) console.log(JSON.stringify(summary, null, 2));