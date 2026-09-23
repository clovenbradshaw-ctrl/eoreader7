// english-varieties.mjs — the sorts of English Sullivan holds a lens for,
// each built only from that variety's own text on disk, each tagged by
// period, region, register and lexifier (the curriculum's own rule: what we
// learn is period- and region-tagged). Handle: Sullivan.
//
// Extraction rules come from a read-only reconnaissance of the corpora
// (2026-09-23): CORAAL files hold participant speech only (interviewers are
// excluded at file level) and carry redaction/non-speech markup that is
// stripped here; Naija UD's cleaned orthography is the `# text_ortho` line
// (never `# text_en`, the English gloss); AfriSenti tweets are field 2 of
// the TSV; MasakhaNER news is field 1 per token line; Singlish and Naija
// gold tags are CoNLL column 4.
//
// ROLE: "lens" varieties get a lens and held-out segments; "placement"
// varieties are too small for a lens of their own and are only placed
// against the others. Haitian and Mauritian are French-lexified CONTROLS:
// English segments must never be attributed to them, and they must not be
// passed off as a sort of English.
//
// SPLIT: EWT keeps the parser's own held-out rule (sentence i % 10 === 9);
// every other variety holds out every tenth block of consecutive units
// (about 100 blocks, at most 50 units each), so held-out text is rarely a
// neighbour-sentence of training text.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const L = path.resolve(ROOT, "..", "live_priors");
const DPC = path.join(L, "11-multi-language", "dialects-pidgins-creoles");
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const paragraphs = (t) => t.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
const afterHeader = (t) => t.slice(t.indexOf("\n\n") + 2);
const gutenbergBody = (t) => {
  const s = t.search(/\*\*\* ?START OF/), e = t.search(/\*\*\* ?END OF/);
  if (s < 0) return t;
  const from = t.indexOf("\n", s) + 1;
  return t.slice(from, e > from ? e : undefined);
};
function csvFirstColumn(text) {
  const out = [];
  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    let field = "", q = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { field += '"'; i += 1; } else if (c === '"') q = false; else field += c; }
      else if (c === '"') q = true; else if (c === ",") break; else field += c;
    }
    out.push(field.trim());
  }
  return out.filter(Boolean);
}
function conllSentences(text, { formCol = 1, tagCol = 3, idPattern = /^\d+$/ } = {}) {
  const sents = [];
  for (const block of text.split(/\n\s*\n/)) {
    const rows = block.split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")).filter((c) => c.length > tagCol && idPattern.test(c[0]));
    if (rows.length) sents.push(rows.map((c) => [c[formCol], c[tagCol]]));
  }
  return sents;
}

const EWT = path.join(ROOT, "legacy-eoreader6.1", "scripts", "corpus", "en_ewt-ud-train.conllu");
const CORAAL = ["dcb", "prv", "roc"].map((c) => path.join(DPC, "coraal", c));
const NAIJA_UD = ["train_sample", "dev_sample", "test_sample"].map((s) => path.join(DPC, "creoleval", "pos_ud_naija_pcm", `pcm_nsc-ud-${s}.conllu`));
const SINGLISH = ["train_sample", "dev", "test"].map((s) => path.join(DPC, "creoleval", "pos_singlish", `${s}.conll`));

function coraalLine(l) {
  return l
    .replace(/\/RD-[A-Z-]+-?\d*\//g, " ")
    .replace(/\/\?+\//g, " ")
    .replace(/\/unintelligible\//gi, " ")
    .replace(/<[^>]*>+/g, " ")
    .replace(/\([a-z ]{1,24}\)/gi, " ")
    .replace(/\/([^/\s][^/]{0,40})\//g, "$1")
    .replace(/\s+/g, " ").trim();
}

export const VARIETIES = Object.freeze([
  { id: "web", label: "web", lexifier: "English", role: "lens", period: "2000s", region: "US-dominant, web", register: "informal web writing (blogs, email, reviews, answers, newsgroups)",
    provenance: "UD_English-EWT train, CC BY-SA 4.0", split: "ewt",
    units: () => read(EWT).split("\n").filter((l) => l.startsWith("# text = ")).map((l) => l.slice(9)),
    gold: () => { const s = conllSentences(read(EWT)); return { train: s.filter((_, i) => i % 10 !== 9), test: s.filter((_, i) => i % 10 === 9) }; } },
  { id: "us-legal", label: "US statute", lexifier: "English", role: "lens", period: "20th-21st c.", region: "United States", register: "statutory / legal",
    provenance: "US Code via uscode.house.gov, public domain (17 USC 105)", split: "block",
    units: () => { const d = path.join(L, "06-government-legal", "world-legislation", "us"); return fs.readdirSync(d).filter((f) => !f.startsWith(".")).flatMap((f) => { const p = path.join(d, f); if (!fs.statSync(p).isFile()) return []; return paragraphs(read(p).replace(/^---[\s\S]*?\n---\n/, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")); }); } },
  { id: "british-19c", label: "19th-c. British literary", lexifier: "English", role: "lens", period: "1811-1861", region: "England", register: "novel narration and dialogue",
    provenance: "Project Gutenberg (public domain): Austen P&P, Emma, Sense and Sensibility; Dickens Great Expectations, A Tale of Two Cities", split: "block",
    units: () => ["gutenberg/pg1342_Pride_and_Prejudice.txt", "gitenberg/pg158_Emma.txt", "gitenberg/pg161_Sense-and-Sensibility.txt", "gitenberg/pg1400_Great-Expectations.txt", "gutenberg/pg98_A_Tale_of_Two_Cities.txt"]
      .map((f) => path.join(L, "01-literature-books", f)).filter(exists).flatMap((p) => paragraphs(gutenbergBody(read(p)))) },
  { id: "american-19c", label: "19th-c. American literary", lexifier: "English", role: "lens", period: "1851-1876", region: "United States", register: "novel narration and dialogue",
    provenance: "Project Gutenberg (public domain): Twain Tom Sawyer, Melville Moby-Dick, Alcott Little Women", split: "block",
    units: () => {
      const tom = path.join(L, "01-literature-books", "gutenberg", "pg1661_The_Adventures_of_Tom_Sawyer.txt");
      const out = exists(tom) ? paragraphs(read(tom).split("\n").slice(459).join("\n")) : [];
      for (const f of ["gutenberg/pg2701_Moby_Dick.txt", "gitenberg/pg514_Little-Women.txt"]) { const p = path.join(L, "01-literature-books", f); if (exists(p)) out.push(...paragraphs(gutenbergBody(read(p)))); }
      return out;
    } },
  { id: "early-modern-folio", label: "Early Modern (1623 Folio spelling)", lexifier: "English", role: "lens", period: "1597 play, 1623 print", region: "England (London stage)", register: "verse and prose drama",
    provenance: "Project Gutenberg #2270, public domain", split: "block",
    units: () => afterHeader(read(path.join(L, "15-western-canon", "first-folio", "henry-iv-part-1.txt"))).split("\n")
      .filter((l) => !/(Actus|Scoena|Scena|Scaena) (Primus|Secundus|Tertius|Quartus|Quintus|Prima|Secunda|Tertia|Quarta)/.test(l) && !/^(Enter|Exit|Exeunt|Manet)\b/.test(l))
      .map((l) => l.replace(/^\s{1,4}[A-Z][a-z]+\.\s+/, "").trim()).filter(Boolean) },
  { id: "early-modern-modernized", label: "Early Modern (modernized spelling)", lexifier: "English", role: "lens", period: "1590s-1604 texts, modern editions", region: "England (London stage)", register: "verse and prose drama",
    provenance: "Project Gutenberg #100 (Henry IV Part 1) and #779 (Doctor Faustus, Dyce), public domain", split: "block",
    units: () => {
      const mod = afterHeader(read(path.join(L, "15-western-canon", "first-folio", "henry-iv-part-1-modern.txt"))).split("\n");
      let faust = afterHeader(read(path.join(L, "15-western-canon", "marlowe", "doctor-faustus-1604-quarto.txt"))).split("\n");
      const fn = faust.findIndex((l) => /^\s*\[?Footnote|^FOOTNOTES/.test(l)); if (fn > 0) faust = faust.slice(0, fn);
      return [...mod, ...faust].filter((l) => !/^\s*(ACT|SCENE)\b/.test(l) && !/^\s*(Enter|Exit|Exeunt|Re-enter)\b/i.test(l) && !/^[A-Z][A-Z .'’]+\.\s*$/.test(l.trim()))
        .map((l) => l.replace(/\[\d+\]/g, "").replace(/^\s*[A-Z][A-Z ]{2,}\.\s+/, "").trim()).filter(Boolean);
    } },
  { id: "aave", label: "African American English (CORAAL)", lexifier: "English", role: "lens", period: "1960s-2010s recordings", region: "Washington DC, Princeville NC, Rochester NY", register: "spoken sociolinguistic interviews (participants only)",
    provenance: "CORAAL via Koenecke et al. 2020 reproduction repository, CC BY-NC-SA 4.0", split: "block",
    units: () => CORAAL.filter(exists).flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith(".txt")).sort().flatMap((f) => read(path.join(d, f)).split("\n").filter((l) => l.trim() && !l.startsWith("#")).map(coraalLine).filter(Boolean))) },
  { id: "naija", label: "Nigerian Pidgin (Naija)", lexifier: "English", role: "lens", period: "2010s-2020s", region: "Nigeria", register: "BBC Pidgin news, tweets, spoken transcripts",
    provenance: "MasakhaNER 2.0 pcm, AfriSenti-SemEval pcm, UD_Naija-NSC (text_ortho)", split: "block",
    units: () => {
      const out = [];
      for (const f of ["train_sample.txt", "dev.txt", "test.txt"]) { const p = path.join(DPC, "creoleval", "ner_masakhaner_pcm", f); if (exists(p)) for (const b of read(p).split(/\n\s*\n/)) { const s = b.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean).join(" "); if (s) out.push(s); } }
      for (const f of ["pcm_train_sample.tsv", "pcm_dev.tsv", "pcm_test.tsv"]) { const p = path.join(DPC, "creoleval", "sa_afrisenti_pcm", f); if (exists(p)) out.push(...read(p).split("\n").slice(1).map((l) => l.split("\t")[1]).filter(Boolean)); }
      for (const p of NAIJA_UD.filter(exists)) out.push(...read(p).split("\n").filter((l) => l.startsWith("# text_ortho = ")).map((l) => l.slice(15)));
      return out;
    },
    gold: () => { const [tr, dv, te] = NAIJA_UD.map((p) => (exists(p) ? conllSentences(read(p)) : [])); return { train: [...tr, ...dv], test: te }; } },
  { id: "singlish", label: "Singlish", lexifier: "English", role: "lens", period: "2010s", region: "Singapore", register: "web forum",
    provenance: "Sing_Par (Wang et al. ACL 2017) gold POS", split: "block",
    units: () => SINGLISH.filter(exists).flatMap((p) => conllSentences(read(p)).map((s) => s.map(([f]) => f).join(" "))),
    gold: () => { const [tr, dv, te] = SINGLISH.map((p) => (exists(p) ? conllSentences(read(p)) : [])); return { train: [...tr, ...dv], test: te }; } },
  { id: "haitian", label: "Haitian Creole", lexifier: "French", role: "lens", period: "2000s-2010s", region: "Haiti", register: "educational stories",
    // In each MIT-Haiti pair, *.src is the SOURCE language (English, French,
    // Spanish) and *.trg is the Haitian translation. A first version read
    // ht-en.src as Haitian (following the reconnaissance) — measured: the
    // English lenses then refused to void 41% of the "Haitian" control, and
    // they were right, because those segments were English children's stories.
    provenance: "MIT-Haiti corpus: ht-{en,fr,es}.trg (the Haitian side) + monolingual sample (no licence stated)", split: "block",
    units: () => { const seen = new Set(); const out = []; const dir = path.join(DPC, "creoleval", "mt_mit_haiti"); const mono = path.join(dir, "ht_monolingual_sample.txt");
      const trg = ["ht-en.trg", "ht-fr.trg", "ht-es.trg"].map((f) => path.join(dir, f)).filter(exists);
      const lines = [...(exists(mono) ? read(mono).split("\n") : []), ...trg.flatMap((p) => read(p).split("\n").map((l) => l.replace(/^\d+\t/, "")))];
      for (const l of lines.map((x) => x.replace(/^[•\s]*(\d+\.\s*)?/, "").trim())) if (l && !seen.has(l)) { seen.add(l); out.push(l); }
      return out; } },
  { id: "mauritian", label: "Mauritian Creole", lexifier: "French", role: "lens", period: "2020s", region: "Mauritius", register: "mixed translated prose",
    provenance: "KreolMorisienMT (HF prajdabre)", split: "block",
    units: () => ["en-cr_train_sample.jsonl", "en-cr_dev.jsonl", "en-cr_test.jsonl"].map((f) => path.join(DPC, "creoleval", "mt_kreolmorisien", f)).filter(exists)
      .flatMap((p) => read(p).split("\n").filter(Boolean).map((l) => JSON.parse(l).target).filter(Boolean)) },
  // placement only — too little text for a lens of their own
  { id: "jamaican", label: "Jamaican Patwa", lexifier: "English", role: "placement", region: "Jamaica", register: "encyclopedic sentences", provenance: "CreoleVal relation classification",
    units: () => { const p = path.join(DPC, "creoleval", "relation_classification", "jam.csv"); return exists(p) ? csvFirstColumn(read(p)) : []; } },
  { id: "tok-pisin", label: "Tok Pisin", lexifier: "English", role: "placement", region: "Papua New Guinea", register: "encyclopedic sentences", provenance: "CreoleVal relation classification",
    units: () => { const p = path.join(DPC, "creoleval", "relation_classification", "tpi.csv"); return exists(p) ? csvFirstColumn(read(p)) : []; } },
  { id: "bislama", label: "Bislama", lexifier: "English", role: "placement", region: "Vanuatu", register: "encyclopedic sentences", provenance: "CreoleVal relation classification",
    units: () => { const p = path.join(DPC, "creoleval", "relation_classification", "bi.csv"); return exists(p) ? csvFirstColumn(read(p)) : []; } },
  { id: "scots", label: "Scots", lexifier: "English", role: "placement", region: "Scotland", register: "UDHR translation (legal)", provenance: "OHCHR UDHR, public domain",
    units: () => { const p = path.join(L, "06-government-legal", "un-udhr", "udhr-sco.txt"); return exists(p) ? read(p).split("\n").slice(5).map((l) => l.trim()).filter(Boolean) : []; } },
]);

/** splitUnits(variety, units) — train and held-out units per the variety's declared split. */
export function splitUnits(variety, units) {
  if (variety.split === "ewt") return { train: units.filter((_, i) => i % 10 !== 9), heldOut: units.filter((_, i) => i % 10 === 9) };
  // about 100 blocks per variety, never more than 50 units a block, so a small
  // corpus (Singlish: 448 sentences) still holds out a tenth
  const size = Math.max(1, Math.min(50, Math.floor(units.length / 100)));
  const blockOf = (i) => Math.floor(i / size);
  return { train: units.filter((_, i) => blockOf(i) % 10 !== 9), heldOut: units.filter((_, i) => blockOf(i) % 10 === 9) };
}
