// eval/eot-realize-memory.mjs — PROMPTING THE REALIZER OVER THE HYPERLEXICON
// AND THE HOLOGRAPH, ACROSS THE PRIORS.
//
// READ   the reader's splitter + the English parser turn a register's prose
//        into EOTRich@1 records.
// ADMIT  the records land in the HYPERLEXICON — an append-only, address-keyed
//        store of EOT — and their words fold into the HOLOGRAPH, the keyless
//        memory (field-of-record.js: full tokens AND the address).
// PROMPT a cue; the holograph recalls passages it settles above its own null
//        band; the recalled passage's EOT is pulled from the hyperlexicon by
//        its address.
// SPEAK  the English grammar realizes that EOT back to NL — no model.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConllu, toEot, measureOrder } from "../kernel/eot-rich.js";
import { learnForms, realizeRecord } from "../kernel/eot-realize.js";
import { splitSentences, normaliseNewlines } from "../adapters/text/spans.js";
import { loadModel, eotFromText } from "../adapters/text/english-parser.js";
import { fieldOf, recallForTurn } from "../the-fold/field-of-record.js";
import { buildReferents } from "../the-fold/referents.js";
import { realizedTokens } from "./eot-realize.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const EWT = path.join(ROOT, "native", "scripts", "corpus", "en_ewt-ud-train.conllu");
const PRIORS = "/Users/mlacy/Documents/3.0/live_priors";
const OC = path.join(PRIORS, "19-organic-community");

const REGISTERS = deriveRegisters();

/** THE FULL live_priors, DERIVED — not hand-picked. Every top-level corpus
 *  directory carrying text becomes a register; the organic-community register
 *  is split into its dialects (cosem, enron, lccc, nus-sms, ubuntu-irc) so the
 *  not-quite-proper English is reachable by name. */
function deriveRegisters() {
  const DIRS = [
    ["01-literature-books", "literature-books", "books — Gutenberg editions"],
    ["02-encyclopedic", "encyclopedic", "1911 Britannica and encyclopedic entries"],
    ["05-academic-papers", "academic-papers", "papers — the academy's prose"],
    ["06-government-legal", "government-legal", "legal and government text — the densest register"],
    ["08-news-current", "news-current", "news — Wikinews shorts"],
    ["14-holy-texts", "holy-texts", "scripture — much of it not English, disclosed"],
    ["15-western-canon", "western-canon", "the canon — public-domain classics"],
    ["16-wordplay", "wordplay", "wordplay"],
    ["18-childrens-books", "childrens-books", "children's books"],
  ];
  const textFiles = (dir) => {
    const out = [];
    const walk = (d) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const a = path.join(d, e.name); if (e.isDirectory()) walk(a); else if (/\.(txt|md)$/i.test(e.name)) out.push(a); } };
    walk(dir);
    return out.sort();
  };
  const regs = {};
  const WINDOW = 24;
  for (const [dir, key, what] of DIRS) {
    const files = textFiles(path.join(PRIORS, dir)).slice(0, WINDOW);
    if (!files.length) continue;
    const bytes = files.reduce((s, f) => { try { return s + fs.statSync(f).size; } catch { return s; } }, 0);
    regs[key] = { label: `${key} — live_priors ${dir}`, note: `${what}; window: first ${files.length} file(s), ${(bytes / 1048576).toFixed(1)} MB`, docs: () => files.map((f) => ({ text: fs.readFileSync(f, "utf8") })) };
  }
  for (const sub of fs.existsSync(path.join(OC, "cosem")) ? ["cosem", "enron", "lccc", "nus-sms", "ubuntu-irc"] : []) {
    const files = textFiles(path.join(OC, sub)).slice(0, WINDOW);
    const bytes = files.reduce((s, f) => { try { return s + fs.statSync(f).size; } catch { return s; } }, 0);
    regs[sub] = { label: `${sub} — Singapore English / Enron mail / IRC chat (not proper English)`, note: `${files.length} file(s), ${(bytes / 1024).toFixed(0)} KB`, docs: () => files.map((f) => ({ text: fs.readFileSync(f, "utf8"), strip: true })) };
  }
  regs["organic-community"] = { label: "organic-community — the whole register (cosem · enron · lccc · nus-sms · ubuntu-irc)", note: "the dialects, admitted together", docs: () => fs.readdirSync(OC).filter((f) => { try { return fs.statSync(path.join(OC, f)).isDirectory(); } catch { return false; } }).flatMap((sub) => textFiles(path.join(OC, sub)).slice(0, WINDOW).map((f) => ({ text: fs.readFileSync(f, "utf8"), strip: true }))) };
  return regs;
}

export function listRegisters() { return Object.entries(REGISTERS).map(([name, reg]) => ({ name, label: reg.label, note: reg.note })); }

let _grammar = null;
export function englishGrammar() {
  if (_grammar) return _grammar;
  const modelJson = JSON.parse(fs.readFileSync(path.join(ROOT, "native", "priors", "parser-eng-ewt.json"), "utf8"));
  const model = Object.assign(loadModel(modelJson), { provenance: modelJson.provenance });
  const all = parseConllu(fs.readFileSync(EWT, "utf8"));
  _grammar = { model, params: measureOrder(all), forms: learnForms(all) };
  return _grammar;
}

/** admit(register, { n, model }) — READ + ADMIT into store + holograph + index. */
export function admit(register, { n = 0, model = null } = {}) {
  const reg = REGISTERS[register];
  if (!reg) throw new Error(`unknown register ${register}; have ${Object.keys(REGISTERS).join(", ")}`);
  const docs = reg.docs();
  const store = new Map();
  const passages = [];
  const index = new Map();
  for (let d = 0; d < docs.length && (n === 0 || passages.length < n); d++) {
    const { text: raw, startByte = null, strip = false } = docs[d];
    const body = strip ? raw.replace(/^---[\s\S]*?---\n/, "").trim() : raw;
    const doc = normaliseNewlines(body).text;
    const start = startByte != null ? normaliseNewlines(raw.slice(0, startByte)).text.length : 0;
    const sents = splitSentences(doc).filter((s) => s.offset >= start);
    for (const s of sents) {
      if (n !== 0 && passages.length >= n) break;
      const text = s.text;
      if (!text.trim()) continue;
      const key = `${d}:${s.offset}-${s.offset + text.length}`;
      const recs = eotFromText(model, text, { source: `${register}:${reg.note ?? ""}`, toEot, parseConllu }).filter((r) => r.span);
      store.set(key, { text, source: register, records: recs });
      passages.push({ text, ref: key, source: register });
      for (const w of new Set(text.toLowerCase().split(/\W+/).filter(Boolean))) { if (!index.has(w)) index.set(w, new Set()); index.get(w).add(key); }
    }
  }
  const referents = buildReferents(passages.map((p) => p.text).join("\n"));
  return { store, passages, field: fieldOf({ passages }), index, referents };
}
