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
  // RECALL (label+end2, lenient — the metric this project has always kept).
  let hit = 0;
  for (const p of g.propositions) {
    const lab = norm(p.label), e2 = norm(p.end2);
    if (!lab) continue;
    if (props.some((x) => norm(x.label).includes(lab) && (!e2 || norm(x.end2).slice(0, 20).includes(e2.slice(0, 20)) || e2.includes(norm(x.end2).slice(0, 20))))) hit += 1;
  }
  // PRECISION (end1 + label + end2 — the half this scorer has never checked,
  // which is exactly where the hand-read (2026-09-12) found the junk: subject
  // swallowing fronted material or a verb, label a preposition/modal, object
  // leaking punctuation). A reader proposition is TRUE if it matches a golden
  // one on label, on end2 (same leniency as recall), AND shares at least one
  // content token with the golden's end1 — the golden end1 is hand-authored
  // and short ("Alice", "her sister"), so a shared content word is a fair,
  // strict-ish head test. Unmatched reader propositions are the precision
  // cost, which the old score never saw.
  const contentTok = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []).filter((w) => !["the","a","an","and","or","of","to","in","with","her","his","its","their","our","my","your","there","she","he","it","they","was","were","had","have","been","being","as","at","by","for","from","on","that","this","these","those"].includes(w));
  const e1Shares = (r, gd) => {
    const a = new Set(contentTok(r)), b = contentTok(gd);
    return b.some((w) => a.has(w));
  };
  let trueProps = 0;
  for (const x of props) {
    const lab = norm(x.label), e2 = norm(x.end2);
    if (!lab) continue;
    if (g.propositions.some((p) => {
      const glab = norm(p.label), ge2 = norm(p.end2);
      if (!glab) return false;
      if (!(lab.includes(glab) || glab.includes(lab))) return false;
      if (!(e2 && ge2 && (norm(x.end2).slice(0, 20).includes(ge2.slice(0, 20)) || ge2.includes(norm(x.end2).slice(0, 20))))) return false;
      return e1Shares(x.end1, p.end1);
    })) trueProps += 1;
  }
  const intr = g.propositions.filter((p) => !p.end2.trim()).length;
  const prec = props.length ? (trueProps / props.length * 100).toFixed(1) : "n/a";
  console.log(`ch${CH}: recall ${hit}/${g.propositions.length} (${(hit / g.propositions.length * 100).toFixed(1)}%) | precision ${trueProps}/${props.length} (${prec}%) | emitted ${props.length} | intransitive-ceiling ${intr}`);

  // ── RECORD INTO THE SIDECAR ITSELF (2026-09-12, user direction: "record
  // our improvements into the same sidecars so we can track how our reading
  // gets better and what the common themes are"). Every scoring run APPENDS
  // an EOTScore@1 line to the ledger it just measured — dated, with the
  // metric recipe, the golden it was measured against, and the mechanically-
  // classified FALSE-POSITIVE themes (the closed set below, named from the
  // 2026-09-12 hand-read). Append-only like every other observation, so the
  // sidecar itself carries its own quality history and a re-score after a
  // reader fix lands a NEW line the old one can be diffed against — no
  // overwriting, and a sidecar with several EOTScore@1 lines is a sidecar
  // whose reading demonstrably improved.
  const VERBS = new Set();
  try {
    const pr = JSON.parse(fs.readFileSync(path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${CH}.prior.json`), "utf8"));
    (pr.verbs ?? []).forEach((v) => VERBS.add(String(v).toLowerCase()));
  } catch {}
  const toks = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []);
  const FIELD_CONNECTORS = new Set(["with","of","in","at","by","to","after","before","for","from","on","without","as","out","own","either","or","and","but","nor","yet","so"]);
  const falseProps = props.filter((x) => {
    const lab = norm(x.label), e2 = norm(x.end2);
    if (!lab) return true;
    return !g.propositions.some((p) => {
      const glab = norm(p.label), ge2 = norm(p.end2);
      if (!glab) return false;
      if (!(lab.includes(glab) || glab.includes(lab))) return false;
      if (!(e2 && ge2 && (norm(x.end2).slice(0, 20).includes(ge2.slice(0, 20)) || ge2.includes(norm(x.end2).slice(0, 20))))) return false;
      return e1Shares(x.end1, p.end1);
    });
  });
  const themes = {};
  const add = (k) => { themes[k] = (themes[k] ?? 0) + 1; };
  for (const x of falseProps) {
    const e1t = toks(x.end1), lab = norm(x.label), e2 = norm(x.end2);
    if (e1t.some((w) => VERBS.has(w)) && !VERBS.has(lab)) add("subject-contains-verb");
    if (["and","or","but","nor"].includes(e1t[0])) add("subject-leads-coordinator");
    if (/["”)]}$/.test(x.end2) || /^["”(]/.test(x.end2)) add("object-leaks-punctuation");
    if (lab && !VERBS.has(lab) && !FIELD_CONNECTORS.has(lab)) add("label-unsettled");
    if (!e1t.length) add("subject-empty");
  }
  themes.other = Math.max(0, falseProps.length - Object.values(themes).reduce((a, b) => a + b, 0));
  const themeKeys = Object.keys(themes).filter((k) => k !== "other" && themes[k] > 0).sort((a, b) => themes[b] - themes[a]);
  // FEYNMAN FALSIFICATION ARM (2026-09-12): the scorer audits itself. The
  // previous EOTScore line with the same metric is the prior score; the new
  // line reports how it moved. A no-op change to the reader must reproduce
  // the prior score exactly (deterministic); a real change shows as a
  // recorded delta — so a number can never move without the ledger of why.
  const prior = [...LS].reverse().find((l) => l.schema === "EOTScore@1" && !l.metric && l.recall && l.precision);
  const moved = prior
    ? { recall: hit - (prior.recall?.hit ?? hit), precision: trueProps - (prior.precision?.true ?? trueProps), emitted: props.length - (prior.precision?.emitted ?? props.length) }
    : null;
  const line = {
    schema: "EOTScore@1",
    seq: (LS[LS.length - 1]?.seq ?? 0) + 1,
    date: new Date().toISOString().slice(0, 10),
    scorer: "golden-tool.mjs score — recall = golden label+end2 lenient match; precision = end1/label/end2 match (end1 = shared content token with a golden end1)",
    golden: { chapter: g.chapter, propositions: g.propositions.length, giver: g.giver },
    recall: { hit, total: g.propositions.length, pct: Number((hit / g.propositions.length * 100).toFixed(1)) },
    precision: { true: trueProps, emitted: props.length, pct: Number(prec) },
    intransitiveCeiling: intr,
    themes: themeKeys.length ? Object.fromEntries(themeKeys.map((k) => [k, themes[k]])) : null,
    ...(moved ? { movedVsPrior: moved } : {}),
  };
  fs.appendFileSync(ledger, JSON.stringify(line) + "\n");
  console.log(`  -> EOTScore@1 appended to ${path.relative(process.cwd(), ledger)} | themes: ${themeKeys.length ? themeKeys.map((k) => `${k}=${themes[k]}`).join(", ") : "none"}`);
} else if (cmd === "gfp") {
  // CLAUSE → GFP COVERAGE — the MINIMUM BAR (user direction, 2026-09-12:
  // "at a minimum we want every clause broken into GFP. parts of speech
  // are nice to have but not necessary"). NOT the recall metric: that one
  // matches on label (a verb) + end2, so a clause the reader read as a
  // FIELD or DISTINCTION — a perfectly good GFP arrangement with a
  // preposition/coordinator in the connector slot (LAVAR.md §13: "a
  // preposition in the connector slot is not a defect") — scores as a miss.
  // Here a golden clause is COVERED if the ledger carries at least one
  // arrangement that shares a content token with the clause's end1 (its
  // figure) AND one with its end2 (its ground), whatever the grain — Link,
  // Field, Distinction, or grain_gap. POS never matters for coverage.
  // Like score, this APPENDS its result into the sidecar it measured.
  const g = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
  const ledger = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${CH}.eot.jsonl`);
  const LS = fs.readFileSync(ledger, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const arr = LS.filter((l) => l.role === "proposition" && (l.schema === "EOTObservation@1" || l.schema === "EOTRevision@1"));
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const contentTok = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []).filter((w) => !["the","a","an","and","or","of","to","in","with","her","his","its","their","our","my","your","there","she","he","it","they","was","were","had","have","been","being","as","at","by","for","from","on","that","this","these","those"].includes(w));
  // The one content-token vocabulary for BOTH metrics: true function words
  // only (determiners, pronouns, copulas, prepositions, coordinators, the
  // common linkers). Modals (shall/will/might), negation (not/no) and
  // degree (very/so) are deliberately KEPT — a clause whose predicate is
  // "shall not be able" has content a reader must actually break, and
  // stripping it would auto-cover clauses nobody read (found 2026-09-12:
  // the two definitions had drifted apart and the longer one inflated GFP
  // coverage by silently auto-covering all-function-word predicates).
  const sets = arr.map((a) => ({ e1: new Set(contentTok(a.end1)), e2: new Set(contentTok(a.end2)), a }));
  const uncovered = [];
  let covered = 0;
  for (const p of g.propositions) {
    const e1 = new Set(contentTok(p.end1)), pred = new Set([...contentTok(p.label), ...contentTok(p.end2)]);
    if (!e1.size && !pred.size) { covered += 1; continue; }
    // A clause is COVERED if an arrangement shares a FIGURE token with the
    // golden's end1 AND a GROUND token with its (label+end2) predicate side.
    // The predicate-side union is what keeps the metric fair on granularity:
    // "her sister was reading the book" is covered by the reader's
    // "her sister | was | reading" (sister=figure, reading=ground) even
    // though the reader split the predicate differently. Requiring golden
    // end2 tokens alone would call that a miss — undercounting Fields and
    // differently-segmented links alike.
    const hit = sets.find(({ e1: A, e2: B }) =>
      (e1.size === 0 || [...e1].some((w) => A.has(w))) &&
      (pred.size === 0 || [...pred].some((w) => B.has(w))));
    if (hit) covered += 1;
    else uncovered.push({ end1: p.end1, label: p.label, end2: p.end2, quote: p.quote });
  }
  const pct = g.propositions.length ? (covered / g.propositions.length * 100).toFixed(1) : "n/a";
  console.log(`ch${CH}: GFP coverage ${covered}/${g.propositions.length} (${pct}%) — every clause broken into SOME arrangement, any grain (Link/Field/Distinction/grain_gap), POS irrelevant`);
  // OSTROM ATTRIBUTION (2026-09-12): a missed clause is blamed on the READER
  // or the MATERIAL only with evidence. If the golden clause's label is in
  // the reader's own vocabulary (earned + received, from this chapter's
  // .prior.json) yet no arrangement covers it, the reader HEARD the word
  // but failed to break the clause — an extraction miss, blame the reader.
  // If the label is NOT in the vocabulary, the reader could not even hear
  // it — a vocabulary miss, blame the reader's starvation, never the
  // material. The material is only ever at fault in the (rare) clause whose
  // own words are not in the text the golden quotes.
  let vocab = new Set();
  try {
    const pr = JSON.parse(fs.readFileSync(path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${CH}.prior.json`), "utf8"));
    vocab = new Set((pr.verbs ?? []).map((v) => String(v).toLowerCase()));
  } catch {}
  const ostrom = { vocabularyMiss: 0, extractionMiss: 0, material: 0 };
  for (const u of uncovered) {
    const head = String(u.label ?? "").trim().split(/\s+/).pop()?.toLowerCase();
    if (head && vocab.has(head)) ostrom.extractionMiss += 1;
    else ostrom.vocabularyMiss += 1;
  }
  ostrom.material = Math.max(0, uncovered.length - ostrom.extractionMiss - ostrom.vocabularyMiss);
  uncovered.slice(0, 15).forEach((u) => console.log(`  UNCOVERED: ${u.end1} ${u.label} ${u.end2}  («${(u.quote ?? "").slice(0, 50)}»)`.slice(0, 120)));
  // MISS-SIDE THEMES (the "common themes" of what stays unbroken — the other
  // half of the record the score command already keeps for false positives).
  // A small closed classifier, named from the 2026-09-12 hand-read: a clause
  // stays uncovered when its shape is one the reader structurally skips.
  const MODALS = /^(shall|will|would|should|could|can|may|might|must|ought)/;
  const COPULAS = /^(was|were|is|are|be|been|being|seemed|looked|became|felt)$/;
  const missThemes = {};
  const madd = (k) => { missThemes[k] = (missThemes[k] ?? 0) + 1; };
  for (const u of uncovered) {
    const lab = norm(u.label), e1 = norm(u.end1), e2 = norm(u.end2);
    if (/[“”"'“”]/.test(e1 + e2)) madd("quotation-attribution");
    if (MODALS.test(lab)) madd("modal-headed");
    if (COPULAS.test(lab)) madd("copula-complement");
    if (/(^|\s)(not|no|never|n't|hardly|scarcely)/.test(lab + " " + e2)) madd("negated");
    if (/(ing|ed|en)$/.test(lab) && !MODALS.test(lab) && !COPULAS.test(lab)) madd("participial-reduced");
  }
  missThemes.other = Math.max(0, uncovered.length - Object.values(missThemes).reduce((a, b) => a + b, 0));
  const missKeys = Object.keys(missThemes).filter((k) => k !== "other" && missThemes[k] > 0).sort((a, b) => missThemes[b] - missThemes[a]);
  const gfpLine = {
    schema: "EOTScore@1", seq: (LS[LS.length - 1]?.seq ?? 0) + 1,
    date: new Date().toISOString().slice(0, 10),
    scorer: "golden-tool.mjs gfp — clause→GFP coverage: golden clause covered iff some arrangement shares a content token with its end1 AND its predicate side (label+end2), any grain, POS never required",
    metric: "gfp-coverage",
    golden: { chapter: g.chapter, propositions: g.propositions.length },
    coverage: { covered, total: g.propositions.length, pct: Number(pct), uncovered: uncovered.length },
    uncoveredThemes: missKeys.length ? Object.fromEntries(missKeys.map((k) => [k, missThemes[k]])) : null,
    ostromAttribution: ostrom,
  };
  fs.appendFileSync(ledger, JSON.stringify(gfpLine) + "\n");
  console.log(`  -> EOTScore@1 (metric=gfp-coverage) appended to ${path.relative(process.cwd(), ledger)} | miss-themes: ${missKeys.length ? missKeys.map((k) => `${k}=${missThemes[k]}`).join(", ") : "none"}`);
} else {
  console.log("usage: node golden-tool.mjs sentences|check|build|score|gfp <chapter>");
}
