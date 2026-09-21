// eval/udhr/udhr-corpus.mjs — the UDHR as a parallel corpus in ~490 languages.
//
// The Universal Declaration is translated into more languages than any other
// document, and every translation says the same thing. That makes it the one
// instrument that holds MEANING CONSTANT while the language varies as far as
// languages vary: ergative, polysynthetic, isolating, click, Austronesian,
// Amerindian, creole. It is also small — about eleven thousand characters a
// language — which is the point for a universal-grammar test: a language's
// parameters should be settable from very little input.
//
// SEGMENTATION WITHOUT READING THE LANGUAGE. Every file in the corpus shares
// one layout: articles are separated by runs of blank lines (three or more),
// each article opens with a short heading line, and its paragraphs are
// separated by single blank lines. So the preamble and the thirty articles
// are recovered from whitespace alone — no numerals (68 files write them as
// words), no heading vocabulary ("Article 1", "Jun Artikulo:", "Łáaʼii Góneʼ
// Biyiʼ Yisdzohígíí"), no script. A file that does not yield exactly 31
// blocks is reported, never forced.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const UDHR_DIR = path.resolve(HERE, "..", "..", "..", "..", "live_priors", "06-government-legal", "un-udhr");

/** Parse one translation: header fields, then the preamble and articles. */
export function parseUdhr(text, { file = null } = {}) {
  const raw = String(text ?? "").replace(/\r\n?/g, "\n");
  const lines = raw.split("\n");
  const header = {};
  let bodyStart = 0;
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const m = /^([A-Za-z]+):\s*(.*)$/.exec(lines[i]);
    if (m) { header[m[1].toLowerCase()] = m[2].trim(); bodyStart = i + 1; }
  }
  // Keep leading indentation: it is the structural signal. A numbered list
  // item inside an article is set DEEPER than the article's heading and
  // paragraphs, and is separated by the same long blank runs that separate
  // articles — so a block that opens deeper than the usual article indent
  // continues the article before it.
  const body = lines.slice(bodyStart).join("\n").replace(/^\n+|\s+$/g, "");
  const rawBlocks = body.split(/\n(?:[ \t]*\n){3,}/).filter((b) => b.trim());
  const indentOf = (b) => { const first = b.split("\n").find((l) => l.trim()) ?? ""; return first.length - first.trimStart().length; };
  // Articles sit at the SHALLOWEST indentation. Not the most common one: an
  // article with three numbered items contributes three deep blocks and one
  // shallow one, so across the declaration the deep blocks outnumber the
  // articles (measured: English has 30 articles and 32 list items).
  const articleIndent = Math.min(...rawBlocks.slice(1).map(indentOf));
  const blocks = [];
  for (const [i, b] of rawBlocks.entries()) {
    if (i > 0 && indentOf(b) > articleIndent && blocks.length) blocks[blocks.length - 1] += `\n\n${b}`;
    else blocks.push(b);
  }
  const paras = (b) => b.split(/\n[ \t]*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out = { file, header, language: header.language ?? null, blocks: blocks.length, articleIndent, preamble: null, articles: [] };
  if (blocks.length === 31) {
    // The first block is the title followed by the preamble; its first line
    // is the title and is dropped from the preamble's paragraphs.
    const pre = paras(blocks[0]);
    out.title = pre[0] ?? null;
    out.preamble = pre.slice(1);
    out.articles = blocks.slice(1).map((b, i) => {
      const p = paras(b);
      return { n: i + 1, heading: p[0] ?? "", paragraphs: p.slice(1) };
    });
  }
  return out;
}

/** The language code a filename carries: udhr-fin.txt → "fin". */
export const codeOf = (file) => path.basename(file).replace(/^udhr-/, "").replace(/\.txt$/, "");

/** Every translation on disk, parsed. */
export function loadUdhr({ dir = UDHR_DIR } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^udhr-.*\.txt$/.test(f)).sort().map((f) => {
    const doc = parseUdhr(fs.readFileSync(path.join(dir, f), "utf8"), { file: f });
    return { code: codeOf(f), ...doc };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = loadUdhr();
  const ok = all.filter((d) => d.blocks === 31);
  const byCount = {};
  for (const d of all) byCount[d.blocks] = (byCount[d.blocks] ?? 0) + 1;
  console.log(`translations: ${all.length} | segmented into preamble + 30 articles: ${ok.length}`);
  console.log(`block counts: ${JSON.stringify(byCount)}`);
  const eng = all.find((d) => d.code === "eng");
  if (eng) console.log(`english: ${eng.preamble.length} preamble paragraphs; article 2 heading "${eng.articles[1].heading}", ${eng.articles[1].paragraphs.length} paragraphs`);
  for (const d of all.filter((x) => x.blocks !== 31).slice(0, 10)) console.log(`   not 31: ${d.code.padEnd(14)} ${String(d.blocks).padStart(3)} blocks  ${d.language ?? ""}`);
}
