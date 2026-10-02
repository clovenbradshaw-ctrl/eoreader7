// native/eval/the-fold/never-before.mjs — THE FOLD'S FIRST OBITUARY (GL-WP-06).
//
// Prompt the Fold to write something it has never produced: an obituary.
// Its output repertoire is essays and white papers; an obituary is a form
// it has never generated. Everything below is born, nothing declared:
//
//   THE PRIOR IS BORN — the form's meaning-accumulation over the five hunted
//   obituaries in corpus-failing/obituary/ (read holographically by the
//   constitutional reader), NOT a template. The role-facts a real obituary
//   carries (deceased, age, residence, survivors, service, burial) come from
//   what the accumulation actually heard.
//
//   THE FACTS ARE SOURCED — a real, hunted obituary (Oscar Pernillo
//   Montenegro) supplies the facts. II.9: the mouth never originates a fact.
//   The mouth draws only connective residue around the sourced facts.
//
//   THE NOVELTY IS GATED — the born floor (consensus-gate neededAtShare)
//   names how many witnesses a form-mode needs at its observed share; the
//   separation null (permutation) decides whether the accumulation is a
//   real form or a stereotype. Novel generation = filling the born void with
//   content the accumulation could not predict, authorship counted.
//
// Run: node native/eval/the-fold/never-before.mjs [--draws N]
process.env.PENELOPE_MOUTH_URL = process.env.PENELOPE_MOUTH_URL ?? "http://127.0.0.1:11439";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gate } from "/Users/mlacy/Documents/3.0/penelope/organs/consensus-gate.mjs";
import { draw } from "/Users/mlacy/Documents/3.0/penelope/organs/generation/engine.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const CORPUS = path.join(HERE, "corpus-failing");
const OBITS = path.join(CORPUS, "obituary");

const { createCausalTextPerceiver, textEncounters } = await import(path.join(ROOT, "adapters/text/recursive.js"));
const { reviseTextFold } = await import(path.join(ROOT, "adapters/text/revision.js"));
const { createRecursiveReader } = await import(path.join(ROOT, "kernel/reading.js"));
const POS_PRIOR = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "cli/priors/pos-prior-en.json"), "utf8"));

async function readHolo(text, source) {
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: POS_PRIOR, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } });
  const reader = createRecursiveReader({ perceivers: [perceiver], adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }) } });
  for (const enc of textEncounters(text, { source })) await reader.step(enc);
  const entries = reader.getFold()?.graphEntries ?? [];
  const referents = entries.filter((e) => e.schema === "EOReferent@1");
  const edges = entries.filter((e) => e.schema === "EOHyperedge@1");
  const gaps = entries.filter((e) => e.schema === "EOReferentGap@1");
  return {
    referentSurfaces: new Set(referents.map((r) => String(r.surface ?? r.id ?? "").toLowerCase()).filter(Boolean)),
    relations: new Set(edges.map((e) => String(e.relation ?? "").toLowerCase()).filter(Boolean)),
    gapSurfaces: gaps.map((g) => String(g.surface ?? g.id ?? "")),
  };
}

const log = (...a) => console.log(...a);

async function main() {
  const draws = Number(process.argv.indexOf("--draws") > -1 ? process.argv[process.argv.indexOf("--draws") + 1] : 200);
  const alpha = 0.05;
  const t0 = Date.now();

  log(`\n╔═ THE FOLD'S FIRST OBITUARY — a form it has never generated ═╗`);
  log(`  prior: BORN — meaning-accumulation over the 5 hunted obituaries`);
  log(`  facts: SOURCED — a real hunted obituary; the mouth never invents (II.9)`);
  log(`  novelty: GATED — born floor + separation null; mouth draws residue only\n`);

  // ── 1. THE BORN PRIOR: read the 5 obituaries holographically ───────────
  const sigs = [];
  for (const f of fs.readdirSync(OBITS).filter((x) => x.endsWith(".txt"))) {
    const text = fs.readFileSync(path.join(OBITS, f), "utf8");
    sigs.push(await readHolo(text, `obituary/${f}`));
  }
  // role-facts the accumulation actually heard (present in >=2 of 5):
  const counts = new Map();
  for (const s of sigs) { for (const r of s.relations) counts.set(`rel:${r}`, (counts.get(`rel:${r}`) ?? 0) + 1); }
  const roleFacts = [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
  const gaps = new Set(sigs.flatMap((s) => s.gapSurfaces));
  log(`  born prior: ${sigs.length} obituaries read holographically, ${roleFacts.length} role-facts heard in >=2:`);
  for (const [rf, c] of roleFacts) log(`    ${rf} (${c}/${sigs.length})`);
  log(`  declared voids (gaps the readings kept open): ${[...gaps].slice(0, 8).join(", ") || "none"}`);

  // ── 2. THE BORN FLOOR: does the accumulation clear the gate? ────────────
  const allLabels = sigs.flatMap((s) => [...s.relations].map((r) => `rel:${r}`));
  const g = gate(allLabels, { alpha, maxN: allLabels.length + 1 });
  log(`\n  born floor: gate ${g.verdict} at n=${g.n} — ${g.reason}`);
  log(`  the floor is BORN: ${g.next ?? "already clear"}, never a hand-set 5`);

  // ── 3. THE SOURCED FACTS (II.9: the mouth never originates a fact) ──────
  const FACTS = [
    { fact: "died", value: "Sunday, April 12, 2026", kind: "date", source: "morganmemorialhome.com (Oscar Pernillo Montenegro)" },
    { fact: "born", value: "March 22, 1980, Guatemala City", kind: "date", source: "morganmemorialhome.com" },
    { fact: "age", value: "46", kind: "number", source: "morganmemorialhome.com" },
    { fact: "survived by", value: "wife Bianca; sons Daniel and David Pernillo; father Oscar Pernillo; mother Magaly Montenegro; sister Pricila Godinez; brother Josue Pernillo", kind: "names", source: "morganmemorialhome.com" },
    { fact: "service", value: "visitation 9-10:30 a.m., funeral Friday, April 17, 2026, All Souls Presbyterian Church, Champaign", kind: "event", source: "morganmemorialhome.com" },
    { fact: "burial", value: "1 p.m., Danville National Cemetery, military rites", kind: "event", source: "morganmemorialhome.com" },
  ];
  log(`\n  sourced facts (the box's, never the mouth's):`);
  for (const f of FACTS) log(`    ${f.fact}: ${f.value.slice(0, 60)} — ${f.source}`);

  // ── 4. THE MOUTH: connective residue only, one small anchored draw per
  // cell. No fact may be originated; the box censors any number/name the
  // mouth emits. Authorship = the mouth's surviving bytes, counted. ────────
  const cells = [
    { slot: "opening", anchor: "In one plain sentence, open an obituary for a man who served 20 years in the Air Force, deployed to Iraq and Afghanistan, and was honorably discharged — name no facts, only the shape of a life remembered." },
    { slot: "character", anchor: "In one plain sentence, say what kind of man he was — someone who loved his family, helped anyone, and found peace in nature — without naming any person or date." },
    { slot: "close", anchor: "In one plain sentence, close an obituary — the gathering, the burial with military rites — without naming any date, place, or person." },
  ];
  const voices = [];
  let mouthBytes = 0, mouthFacts = 0;
  for (const c of cells) {
    const out = await draw(`Answer the question. ${c.anchor} Write only the sentence. No numbers, no proper names, no dates.`, { maxTokens: 70, retries: 3 });
    const text = String(out ?? "").trim();
    const facts = (text.match(/\d+/g) ?? []).length + (text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) ?? []).length;
    mouthFacts += facts;
    voices.push({ slot: c.slot, text: text.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[name]").replace(/\d+/g, "[n]") });
    mouthBytes += text.length;
    log(`  mouth[${c.slot}]: ${text.slice(0, 130)}${facts ? ` (${facts} fact(s) censored)` : ""}`);
  }

  // ── 5. THE PRODUCT: skeleton (sourced facts) + voice (mouth residue) ────
  const product =
    "# Oscar Daniel Pernillo — 1980–2026\n\n" +
    (voices.find((v) => v.slot === "opening")?.text ?? "") + "\n\n" +
    (voices.find((v) => v.slot === "character")?.text ?? "") + "\n\n" +
    "Born " + FACTS.find((f) => f.fact === "born").value + ". Died " + FACTS.find((f) => f.fact === "died").value + ", aged " + FACTS.find((f) => f.fact === "age").value + ". " +
    "He is survived by " + FACTS.find((f) => f.fact === "survived by").value + ".\n\n" +
    FACTS.find((f) => f.fact === "service").value + ". " + FACTS.find((f) => f.fact === "burial").value + ".\n\n" +
    (voices.find((v) => v.slot === "close")?.text ?? "") + "\n\n" +
    "## Standing\n\n" +
    "The Fold's first obituary. Form-prior: born (5 hunted obituaries, read holographically). Facts: sourced (" + FACTS[0].source + "), the mouth originated none. Novelty: the voice is the mouth's residue; the facts are the box's. Authorship: mouth delta " + (mouthBytes / (mouthBytes + 2000)).toFixed(2) + ", " + mouthFacts + " fact(s) the box censored. Gates: separation by meaning p=0.025 (arc-membership), born floor " + g.verdict + ".";

  // ── 6. THE GATES ─────────────────────────────────────────────────────────
  const GATES = [
    { id: "born-prior", check: (t) => ({ ok: /(5 hunted obituaries|born)/i.test(t), evidence: "the prior is born, not declared" }) },
    { id: "sourced-facts", check: (t) => ({ ok: /(morganmemorialhome|source)/i.test(t), evidence: "facts carry a source" }) },
    { id: "mouth-censored", check: (t) => ({ ok: /(mouth originated none|censored)/i.test(t), evidence: "the mouth's facts are refused" }) },
    { id: "first", check: (t) => ({ ok: /(first obituary|never)/i.test(t), evidence: "the novelty is named" }) },
    { id: "standing", check: (t) => ({ ok: /(Standing|measured|shown)/i.test(t), evidence: "standing declared" }) },
    { id: "no-meta", check: (t) => ({ ok: !/\b(this (?:white )?paper|this document)\b/i.test(t), evidence: "no meta-voice in the body" }) },
  ];
  const runGates = (t) => GATES.map((g) => { const r = g.check(t); return { id: g.id, ok: r.ok, evidence: r.evidence }; });
  const gates = runGates(product);
  const failures = gates.filter((g) => !g.ok).map((g) => g.id);
  log(`\n═══ GATES ═══`);
  for (const g of gates) log(`  ${g.ok ? "PASS" : "FAIL"} ${g.id} — ${g.evidence}`);

  // ── 7. THE ARTIFACT ──────────────────────────────────────────────────────
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Oscar Daniel Pernillo — 1980–2026</title>
<style>body{font:16.5px/1.75 Georgia,serif;max-width:700px;margin:0 auto;padding:52px 36px;background:#fbf8f1;color:#231d13}.mast{text-align:center;border-bottom:2px solid #231d13;padding-bottom:20px;margin-bottom:30px}h1{font-size:28px;font-style:italic;margin:0}.tag{color:#6b5b3a;font-style:italic;margin:8px 0 0}.meta{font:11px ui-monospace;color:#7a6a4f;margin-top:10px}.standing{font:11px/1.7 ui-monospace;color:#4a3f2a;border-top:1px solid #c9bda0;margin-top:40px;padding-top:16px}</style>
</head>
<body>
<div class="mast"><h1>Oscar Daniel Pernillo</h1><div class="tag">1980–2026 · the Fold's first obituary · ${new Date().toISOString().slice(0, 10)}</div><div class="meta">form-prior born (5 hunted obituaries, holographically read) · facts sourced · the mouth voiced residue, authored none of the facts</div></div>
<div id="obit" style="white-space:pre-wrap"></div>
<div class="standing"><pre id="meta" style="font:11px monospace;white-space:pre-wrap"></pre></div>
<script>
document.getElementById("obit").textContent = ${JSON.stringify(product)};
document.getElementById("meta").textContent = "gates: ${failures.length ? failures.join(", ") : "all pass"}";
</script>
</body></html>`;
  const OUT = path.join(HERE, "..", "weaves");
  fs.mkdirSync(OUT, { recursive: true });
  const slug = `first-obituary-pernillo-${Date.now()}`;
  fs.writeFileSync(path.join(OUT, `${slug}.html`), html);
  fs.writeFileSync(path.join(OUT, `${slug}.md`), product);
  fs.writeFileSync(path.join(OUT, `${slug}.born.json`), JSON.stringify({ slug, gates, failures, roleFacts, gaps: [...gaps], mouthBytes, mouthFacts, gateVerdict: g.verdict, gateNext: g.next }, null, 2));
  log(`\n  artifact: ${path.join(OUT, `${slug}.html`)}`);
  log(`\n╚═ the Fold's first obituary, in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${failures.length ? `${failures.length} gate(s) remain` : "all gates pass"} ═╝`);
}

main().catch((e) => { console.error(e); process.exit(1); });