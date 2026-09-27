// native/eval/long-form/score.mjs — the checker for a long work. It reads the
// BOOK TEXT ONLY (never the ledger that wrote it) against the outline's cast,
// whose names and details were fixed before any part was written:
//
//   size       words, and tokens at ~4 characters each, against the window
//   callbacks  every sentence naming a person that states an age (a number
//              beside "year(s) old") or one of the cast's jobs: right when it
//              is that person's own, wrong when it is not
//   strays     proper names the text uses that are not the cast's, by two
//              detectors that do not share a method: the parser's PROPN tags,
//              and capitalised words inside a sentence (never its first word)
//   presence   how many parts name anyone in the cast
//
// No regular expressions.
//   node native/eval/long-form/score.mjs <dir> [arm,arm]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../../adapters/text/english-parser.js";
import { outlineOf, hasWord } from "../../organs/long-form.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { makeNotes } from "../../kernel/notes.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
const parser = loadModel(JSON.parse(fs.readFileSync(path.join(ROOT, "native", "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(parser, tokenize(text).map((t) => t.form));

const isCap = (w) => !!w && w[0] !== w[0].toLowerCase();
const clean = (w) => { let x = String(w); while (x && !(x.at(-1).toLowerCase() !== x.at(-1).toUpperCase())) x = x.slice(0, -1); while (x && !(x[0].toLowerCase() !== x[0].toUpperCase())) x = x.slice(1); if (x.endsWith("'s") || x.endsWith("’s")) x = x.slice(0, -2); return x; };
// words capitalised for reasons other than being a name — set by hand 2026-09-27
const NOT_NAMES = new Set(["I", "I'm", "I'll", "I've", "I'd", "Mom", "Dad", "Mama", "Papa", "God", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Chapter", "Mr", "Mrs", "Ms", "Dr", "OK", "Oh"]);

export function scoreBook(book, cast, { castDetails = [] } = {}) {
  const lines = String(book).split("\n").filter((l) => l.trim() && !l.startsWith("#") && l.trim() !== "* * *");
  const text = lines.join(" ");
  const words = text.split(" ").filter(Boolean).length;
  // the cast's own words — names and the words of their details ("Lighthouse
  // Keeper") — are the universe's, never strays
  const castWords = new Set(cast.flatMap((c) => [c.name, ...Object.values(c.details)].flatMap((v) => String(v).split(" ").map(clean))));
  // repetition, read from the text alone: sentences said word for word
  // before, and the share of the book they make up
  const seen = new Set(); let said = 0, repeated = 0; const echo = new Map();
  for (const line of lines) for (const s of sentences(line)) { said++; const k = s.text.toLowerCase(); if (seen.has(k)) { repeated++; echo.set(k, (echo.get(k) ?? 1) + 1); } else seen.add(k); }
  // the note said back: a sentence that states a person's detail in the
  // note's own form ("Lily's job is …") — the mouth reading its note aloud
  const noteEchoes = lines.filter((l) => cast.some((c) => Object.keys(c.details).some((d) => l.includes(`${c.name}'s ${d} is`)))).length;
  const jobs = cast.map((c) => ({ who: c.name, job: c.details.job ? String(c.details.job).toLowerCase() : null }));
  const callbacks = { right: 0, wrong: 0, examples: [] };
  const strays = { propn: new Map(), capital: new Map() };
  for (const line of lines) {
    for (const s of sentences(line)) {
      const t = s.text;
      const named = cast.filter((c) => String(c.name).split(" ").some((w) => hasWord(t, w)));
      // ages: a number right before "year"/"years"/"-year-old"
      const ws = t.split(" ");
      for (let i = 0; i + 1 < ws.length; i++) {
        let digits = ws[i].split("-")[0];
        while (digits && !(digits.at(-1) >= "0" && digits.at(-1) <= "9")) digits = digits.slice(0, -1);
        while (digits && !(digits[0] >= "0" && digits[0] <= "9")) digits = digits.slice(1);
        const n = digits ? Number(digits) : NaN;
        const next = ws[i + 1].toLowerCase();
        const hy = ws[i].toLowerCase().includes("-year");
        if ((Number.isFinite(n) && n > 0 && (next.startsWith("year") || hy)) && named.length === 1) {
          const want = Number(named[0].details.age);
          if (Number.isFinite(want)) { if (n === want) callbacks.right++; else { callbacks.wrong++; callbacks.examples.push({ who: named[0].name, said: t }); } }
        }
      }
      if (named.length === 1 && castDetails.includes("job")) {
        const own = jobs.find((j) => j.who === named[0].name)?.job;
        const low = t.toLowerCase();
        const said = jobs.filter((j) => j.job && low.includes(j.job));
        if (own && said.some((j) => j.job === own)) callbacks.right++;
        else if (said.length) { callbacks.wrong++; callbacks.examples.push({ who: named[0].name, said: t }); }
      }
      for (const tok of parse(t)) if (tok.upos === "PROPN") { const w = clean(tok.form); if (w && isCap(w) && !castWords.has(w) && !NOT_NAMES.has(w)) strays.propn.set(w, (strays.propn.get(w) ?? 0) + 1); }
      ws.slice(1).forEach((w0) => { const w = clean(w0); if (w && isCap(w) && w.length > 1 && !castWords.has(w) && !NOT_NAMES.has(w) && w !== w.toUpperCase()) strays.capital.set(w, (strays.capital.get(w) ?? 0) + 1); });
    }
  }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, n]) => `${w}×${n}`);
  const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  return { words, tokensApprox: Math.round(text.length / 4), sentences: said, repeated, repeatedShare: said ? Math.round((100 * repeated) / said) : 0, noteEchoes, topRepeat: [...echo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t, n]) => `${n}× "${t.slice(0, 50)}"`), callbacks, strays: { propn: sum(strays.propn), propnDistinct: strays.propn.size, capital: sum(strays.capital), capitalDistinct: strays.capital.size, perThousandWords: Math.round((1000 * sum(strays.propn)) / Math.max(1, words)), top: top(strays.propn) } };
}

if (process.argv[1] && process.argv[1].endsWith("score.mjs")) {
  const dir = process.argv[2];
  const arms = (process.argv[3] ?? "ledger,ledger-edited,lines-only,window,summary").split(",");
  const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
  const N = makeNotes();
  const o = outlineOf(N.fold(outline.notes), PROSE_MEDIUM);
  const cast = o.cast.map((c) => ({ name: c.name, details: Object.fromEntries(c.props.filter((p) => (outline.castDetails ?? []).includes(p.label)).map((p) => [p.label, p.value])) }));
  console.log("cast:", cast.map((c) => `${c.name} (${Object.values(c.details).join(", ")})`).join("; "));
  for (const arm of arms) {
    const f = path.join(dir, `${arm}.book.md`);
    if (!fs.existsSync(f)) continue;
    const r = scoreBook(fs.readFileSync(f, "utf8"), cast, { castDetails: outline.castDetails ?? [] });
    console.log(`${arm.padEnd(13)} words ${r.words} (~${r.tokensApprox} tok) · repeated ${r.repeated}/${r.sentences} sentences (${r.repeatedShare}%) · note read aloud ${r.noteEchoes} · callbacks right ${r.callbacks.right} wrong ${r.callbacks.wrong} · strays ${r.strays.propn} (${r.strays.propnDistinct} names, ${r.strays.perThousandWords}/1k words; capital-detector ${r.strays.capital}) · ${r.strays.top.join(" ")}`);
  }
}
