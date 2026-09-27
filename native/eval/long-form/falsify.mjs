// native/eval/long-form/falsify.mjs — controls built to break the long-form
// claims (user: "Falsify"). Offline: no model is asked.
//   F2  is bits/word a quality measure? word salad (each sentence's words
//       shuffled) against the edited book; plus a coherence measure the
//       salad cannot game — the share of lines that parse as a whole clause
//   F3  do the archons' CHOICES matter? the same number of lines deleted at
//       random (5 seeds), and a mechanical dedupe (exact repeats dropped),
//       against the archons' edit of the same draft
//   F5  does iteration need the ledger? a whole-word find/replace rename on
//       the plain text, against the ledger's rename
//   node native/eval/long-form/falsify.mjs <dir> [--edited=ledger-archons]
import fs from "node:fs";
import path from "node:path";
import { outlineOf, replaceWord, wordAt } from "../../organs/long-form.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { makeNotes } from "../../kernel/notes.js";
import { lcg } from "../../kernel/continuation.js";
import { loadEotParser, clauseComplete } from "../../the-fold/eot-notation.js";
import { scoreBook } from "./score.mjs";

const dir = process.argv[2];
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
const o = outlineOf(makeNotes().fold(outline.notes), PROSE_MEDIUM);
const cast = o.cast.map((c) => ({ name: c.name, details: Object.fromEntries(c.props.filter((p) => (outline.castDetails ?? []).includes(p.label)).map((p) => [p.label, p.value])) }));
const read = (arm) => fs.readFileSync(path.join(dir, `${arm}.book.md`), "utf8");
const raw = read("ledger"), edited = read(arg("edited", "ledger-archons"));
const parser = await loadEotParser();
const body = (book) => book.split("\n").filter((l) => l.trim() && !l.startsWith("#") && l.trim() !== "* * *");
const coherence = (book) => { const ls = body(book); const ok = ls.filter((l) => clauseComplete(parser, l) !== false).length; return ls.length ? Math.round((100 * ok) / ls.length) : 0; };
const AT = Math.min(...[raw, edited].map((b) => scoreBook(b, cast).words));
const row = (label, book) => { const r = scoreBook(book, cast, { castDetails: outline.castDetails ?? [], at: AT }); return { label, words: r.words, lines: body(book).length, repeatedPct: r.repeatedShare, bitsAt: r.bitsAt, coherentPct: coherence(book), callbacks: `${r.callbacks.right}/${r.callbacks.wrong}` }; };
const rows = [row("as written", raw), row("archons' edit", edited)];

// F2 — word salad
const rng = lcg(3);
const salad = (book) => book.split("\n").map((l) => { if (!l.trim() || l.startsWith("#") || l.trim() === "* * *") return l; const w = l.split(" "); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } return w.join(" "); }).join("\n");
rows.push(row("F2 word salad of the edit", salad(edited)));

// F3 — random deletion of as many lines as the archons removed; exact dedupe
const cut = body(raw).length - body(edited).length;
for (let seed = 1; seed <= 5; seed++) {
  const r2 = lcg(100 + seed);
  const idx = body(raw).map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const drop = new Set(idx.slice(0, Math.max(0, cut)));
  let k = -1;
  const book = raw.split("\n").filter((l) => { if (!l.trim() || l.startsWith("#") || l.trim() === "* * *") return true; k++; return !drop.has(k); }).join("\n");
  rows.push(row(`F3 random deletion of ${cut} lines, seed ${seed}`, book));
}
const seen = new Set();
rows.push(row("F3 exact dedupe only", raw.split("\n").filter((l) => { if (!l.trim() || l.startsWith("#") || l.trim() === "* * *") return true; const key = l.trim().toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).join("\n")));

for (const r of rows) console.log(`${r.label.padEnd(40)} words ${String(r.words).padStart(5)} · lines ${String(r.lines).padStart(4)} · repeated ${String(r.repeatedPct).padStart(3)}% · ${String(r.bitsAt).padStart(5)} bits/word at ${AT} · whole clauses ${r.coherentPct}% · ages/jobs ${r.callbacks}`);

// F5 — a find/replace rename on the text alone
const who = cast.map((c) => c.name).sort((a, b) => wordAt(edited, b).length - wordAt(edited, a).length)[0];
const renamed = replaceWord(edited, who, "Wren");
const before = body(edited), after = body(renamed);
console.log(`F5 find/replace rename ${who} -> Wren: 0 asks, ${wordAt(renamed, who).length} old names left, ${after.filter((l, i) => l !== before[i]).length} lines changed, ${after.filter((l, i) => l === before[i]).length} untouched — the same numbers the ledger's rename gives; what it lacks is the record (no claim says which line changed or why, no stale parts, no premises)`);
