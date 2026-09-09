// golden-tool.mjs — build and check a hand-rolled golden against its chapter.
//
// A golden is scored against AFTER the fact and the engine never sees it
// (CLAUDE.md's own discipline). This tool enforces the two properties that
// make one trustworthy, both learned by getting them wrong on chapter 3:
//
//   EVERY ANCHOR RESOLVES. A golden quote that does not appear in the
//   chapter is an assertion about a text that does not exist.
//   EVERY SENTENCE IS ACCOUNTED FOR. Silence is ambiguous — an omitted
//   sentence cannot be told apart from a missed one. A sentence carries
//   either a proposition or an explicit claim of emptiness with a reason.
//   Chapter 3's first golden covered 98 of 134 sentences and its author
//   (me) believed it complete; it was missing the chapter's entire ending.
//
// usage:
//   node golden-tool.mjs sentences <ch>          — dump numbered sentences
//   node golden-tool.mjs check <ch>              — verify anchors + coverage
//   node golden-tool.mjs build <ch>              — clauses.txt -> golden JSON
//   node golden-tool.mjs score <ch>              — golden vs the ledger
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const [cmd, chArg] = process.argv.slice(2);
const CH = Number(chArg ?? 1);

const raw = fs.readFileSync(BOOK, "utf8");
// A REAL title line is blank-line-bounded on both sides, same as the
// heading itself — not every book has one (The Picture of Dorian Gray
// goes straight from "CHAPTER I." to prose), and without this check a
// naive \s*\n([^\r\n]*)\r?\n capture swallows the paragraph's own first
// physical line as a fake title. Found via eval/lavar/recoverability.mjs
// (S101) failing on a second text after Alice in Wonderland — which has a
// real title on every chapter and never exercised this branch — and fixed
// identically in eot-jsonl.mjs and recoverability.mjs.
const heads = [...raw.matchAll(/^CHAPTER ([IVXLC]+)\.\s*\r?\n([^\r\n]*)\r?\n/gmd)].map((m) => {
  const candidateEnd = m.index + m[0].length;
  const hasRealTitle = Boolean(m[2].trim()) && /^\r?\n/.test(raw.slice(candidateEnd));
  return { ...m, headEnd: hasRealTitle ? candidateEnd : m.indices[2][0], realTitle: hasRealTitle ? m[2].trim() : "" };
});
const lo = heads[CH - 1].headEnd;
const hi = CH < heads.length ? heads[CH].index : raw.length;
const flat = raw.slice(lo, hi).split(/\s+/).join(" ").trim();
const sentences = flat.split(/(?<=[.!?”])\s+/).filter((s) => s.trim());

const clausePath = path.join(HERE, "goldens", `aiw-ch${CH}.clauses.txt`);
const goldenPath = path.join(HERE, "goldens", `aiw-ch${CH}.json`);

const readClauses = () => {
  if (!fs.existsSync(clausePath)) return { rows: [], empties: [] };
  const rows = [], empties = [];
  for (const line of fs.readFileSync(clausePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const p = t.split("|").map((x) => x.trim());
    if (p[0] === "EMPTY" && p.length >= 3) empties.push({ quote: p[1], why: p[2] });
    else if (p.length === 4) rows.push({ end1: p[0], label: p[1], end2: p[2], quote: p[3] });
    else console.error(`  MALFORMED: ${t.slice(0, 60)}`);
  }
  return { rows, empties };
};

if (cmd === "sentences") {
  sentences.forEach((s, i) => console.log(`[${i}] ${s}`));
} else if (cmd === "check" || cmd === "build") {
  const { rows, empties } = readClauses();
  const anchors = [...rows.map((r) => r.quote), ...empties.map((e) => e.quote)];
  const unresolved = anchors.filter((a) => !flat.includes(a));
  const uncovered = sentences.map((s, i) => [i, s]).filter(([, s]) => !anchors.some((a) => s.includes(a)));
  console.log(`chapter ${CH}: ${sentences.length} sentences, ${rows.length} propositions, ${empties.length} expected-empty`);
  console.log(`  anchors unresolved : ${unresolved.length}`);
  unresolved.slice(0, 8).forEach((u) => console.log(`     MISSING: ${u.slice(0, 66)}`));
  console.log(`  sentence coverage  : ${sentences.length - uncovered.length}/${sentences.length}`);
  uncovered.slice(0, 12).forEach(([i, s]) => console.log(`     [${i}] ${s.slice(0, 76)}`));
  if (cmd === "build") {
    if (unresolved.length || uncovered.length) { console.error("refusing to build: fix the above first"); process.exit(2); }
    const prior = fs.existsSync(goldenPath) ? JSON.parse(fs.readFileSync(goldenPath, "utf8")) : {};
    fs.writeFileSync(goldenPath, JSON.stringify({
      ...prior, schema: "EOTGolden@1", chapter: CH,
      source: "01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt",
      title: heads[CH - 1].realTitle,
      giver: prior.giver ?? `LaVar (Claude Opus 5) — hand-read clause by clause, 2026-09-09, before scoring. The engine never saw this file.`,
      coverage: { sentences: sentences.length, propositions: rows.length, expectedEmpty: empties.length, sentenceCoverage: 1 },
      propositions: rows, expected_empty: empties,
    }, null, 1));
    console.log(`  -> ${path.relative(process.cwd(), goldenPath)}`);
  }
} else if (cmd === "score") {
  const g = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
  const ledger = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${CH}.eot.jsonl`);
  const LS = fs.readFileSync(ledger, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const props = LS.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  let hit = 0;
  for (const p of g.propositions) {
    const lab = norm(p.label), e2 = norm(p.end2);
    if (!lab) continue;
    if (props.some((x) => norm(x.label).includes(lab) && (!e2 || norm(x.end2).slice(0, 20).includes(e2.slice(0, 20)) || e2.includes(norm(x.end2).slice(0, 20))))) hit += 1;
  }
  const intr = g.propositions.filter((p) => !p.end2.trim()).length;
  console.log(`ch${CH}: recall ${hit}/${g.propositions.length} (${(hit / g.propositions.length * 100).toFixed(1)}%) | emitted ${props.length} | intransitive-ceiling ${intr}`);
} else {
  console.log("usage: node golden-tool.mjs sentences|check|build|score <chapter>");
}
