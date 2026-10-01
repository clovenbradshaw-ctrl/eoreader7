// lib/ud-name-words.mjs — the NAME WORDS of a Universal Dependencies treebank, as a reader meets them: raw written words, with the gold of what
// is stem and what is exponent. Handle: Sullivan (eval/lavar/sullivan-names.mjs reads it; nothing here is a rule about any language).
//
// WHY RAW WORDS. A treebank tokenizes. English UD splits "Elena's" into Elena + 's (two tokens, no space between), German UD keeps "Annas" as
// one token with lemma "Anna", Hebrew UD splits "ה" off a noun by a multi-word-token range. A reader of running text meets none of those
// tokens: it meets the written word between two spaces. So the gold unit here is the RAW WORD, recovered by aligning the treebank's tokens
// (and multi-word-token ranges, which are the written surface) against the sentence's own `# text` line — the one place UD keeps what was
// actually written. A sentence whose tokens will not align to its text is counted and skipped, never guessed at.
//
// WHAT IS GOLD, AND WHERE IT COMES FROM. Only the treebank's own annotation, no list written here:
//   · a raw word whose written run holds a PROPN token has a STEM (the PROPN token or tokens) and an EXPONENT — whatever else the run
//     holds, glued with no space: the suffix after the stem ("'s", "'", "-s") or the prefix before it ("d'", "l'");
//   · a single PROPN token whose lemma differs from its form has an exponent too — the form minus the lemma — when the form begins with the
//     lemma (case-insensitively). A lemma that is not a prefix of the form (stem alternation: Finnish "Helsingissä" / "Helsinki") is
//     "(other)": a real inflection this suffix account does not explain, counted and kept out of the labels, never forced;
//   · the exponent's CLASS is the annotation's own: a glued clitic token is "clitic"; a fused exponent carrying Number=Plur is "number"
//     (a plural of a name is a group, not the individual); any other fused exponent is "case" (it marks the name's role in the clause and
//     leaves the referent where it was). Only "clitic" and "case" keep a referent; "number" does not.
//
// PURE. No I/O; the caller reads the file and passes parseConllu's sentences.

const IS_SPACE = /\s/u;
// UPOS classes that are NOT a piece of a written word: a glued comma or quotation mark ends the word, a glued particle does not.
const NOT_WORD_PIECE = new Set(["PUNCT", "SYM"]);

/** The units of a sentence, in order: a multi-word-token range is ONE unit (its form is the written surface), any other token is its own. */
export function surfaceUnits(sent) {
  const ranges = new Map();
  for (const m of sent.multi ?? []) {
    const r = /^(\d+)-(\d+)$/.exec(m.range ?? "");
    if (r) ranges.set(Number(r[1]), { to: Number(r[2]), form: m.form });
  }
  const units = [];
  const toks = sent.tokens ?? [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    const rg = ranges.get(t.id);
    if (rg) {
      const members = [];
      while (i < toks.length && toks[i].id <= rg.to) { members.push(toks[i]); i += 1; }
      i -= 1;
      units.push({ form: rg.form, members, range: true });
    } else {
      units.push({ form: t.form, members: [t], range: false });
    }
  }
  return units;
}

const norm = (s) => String(s ?? "").normalize("NFC");

/**
 * Align the units to sent.text, giving each a [start, end) in it; a multi-word-token range whose members spell its surface exactly
 * (English "Elena's" = Elena + 's, Hebrew "הספר" = ה + ספר) is then split into one aligned unit per member, so the exponent has a span of
 * its own. A range whose members do not spell the surface (French "du" = de + le) stays one opaque unit. Returns null if any unit cannot be
 * found where it must be — the sentence is then skipped by the caller (counted), because adjacency read off a misaligned text would be a
 * guess.
 */
export function alignUnits(sent) {
  const text = norm(sent.text ?? "");
  if (!text) return null;
  const units = surfaceUnits(sent);
  const out = [];
  let pos = 0;
  for (const u of units) {
    while (pos < text.length && IS_SPACE.test(text[pos])) pos += 1;
    const f = norm(u.form);
    if (!f || !text.startsWith(f, pos)) return null;
    const start = pos, end = pos + f.length;
    pos = end;
    if (u.range && u.members.length > 1 && u.members.map((m) => norm(m.form)).join("").toLowerCase() === f.toLowerCase()) {
      let at = start;
      for (const m of u.members) { const len = norm(m.form).length; out.push({ form: norm(m.form), members: [m], range: false, start: at, end: at + len, splitFrom: f }); at += len; }
    } else {
      out.push({ form: f, members: u.members, range: u.range, start, end, opaque: u.range && u.members.length > 1 });
    }
  }
  return out;
}

const featOf = (t, k) => { const m = new RegExp(`(?:^|\\|)${k}=([^|]+)`).exec(t?.feats ?? ""); return m ? m[1] : null; };

/**
 * rawWords(sent) → [{ text, start, end, units }] — maximal runs of units glued with no space between them, with punctuation and symbols
 * ending a run (a glued comma is not part of the word). Null when the sentence will not align.
 */
export function rawWords(sent) {
  const units = alignUnits(sent);
  if (!units) return null;
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length) out.push({ text: norm(sent.text).slice(run[0].start, run[run.length - 1].end), start: run[0].start, end: run[run.length - 1].end, units: run });
    run = [];
  };
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    // A piece of a written word is any unit the treebank does not class as punctuation or a symbol — a possessive apostrophe is tagged PART
    // (a piece), a quotation mark PUNCT (not).
    const piece = !u.members.every((m) => NOT_WORD_PIECE.has(m.upos));
    if (!piece) { flush(); continue; }
    if (run.length && run[run.length - 1].end !== u.start) flush();
    run.push(u);
  }
  flush();
  return out;
}

const PROPN_UNIT = (u) => u.members.some((m) => m.upos === "PROPN");
// A glued token is an EXPONENT of the name only if the treebank classes it as a grammatical function word. A number or a noun glued on by
// the tokenizer ("EB1774") is part of what was written, not a mark on it.
export const EXPONENT_UPOS = new Set(["PART", "AUX", "ADP", "DET", "PRON", "CCONJ", "SCONJ"]);
const isExponent = (u) => u.members.length > 0 && u.members.every((m) => EXPONENT_UPOS.has(m.upos));

/**
 * nameWords(sent) → [{ word, stem, suffix, prefix, klass, prefixKlass, via, other }] — one row per raw word holding a PROPN. `word` is the
 * written word; `suffix`/`prefix` the exponent strings ('' when there is none); `klass` the suffix's class ("clitic" | "case" | "number" |
 * null); `via` how the gold was read ("glued" tokens, a "fused" lemma, or "bare"); `other` true when a fused inflection is not a suffix of
 * the lemma. Null when the sentence will not align.
 */
export function nameWords(sent) {
  const words = rawWords(sent);
  if (!words) return null;
  const text = norm(sent.text);
  const rows = [];
  for (const w of words) {
    const idx = w.units.map(PROPN_UNIT);
    const first = idx.indexOf(true), last = idx.lastIndexOf(true);
    if (first < 0) continue;
    const stemStart = w.units[first].start, stemEnd = w.units[last].end;
    const before = w.units.slice(0, first), after = w.units.slice(last + 1);
    // every glued unit around the stem must be a function word, or the word is not read as stem+exponent at all
    const clean = before.every(isExponent) && after.every(isExponent);
    let prefix = clean ? text.slice(w.start, stemStart) : "";
    let suffix = clean ? text.slice(stemEnd, w.end) : "";
    let klass = suffix ? "clitic" : null;
    let prefixKlass = prefix ? "clitic" : null;
    let via = prefix || suffix ? "glued" : "bare";
    let other = false;
    // A single fused PROPN token: the exponent is what its lemma lacks.
    if (!prefix && !suffix && w.units.length === 1 && w.units[0].members.length === 1) {
      const t = w.units[0].members[0];
      if (t.lemma && t.lemma !== "_" && t.lemma !== t.form) {
        const f = norm(t.form), l = norm(t.lemma);
        if (f.toLowerCase().startsWith(l.toLowerCase())) {
          suffix = f.slice(l.length);
          if (suffix) { via = "fused"; klass = featOf(t, "Number") === "Plur" ? "number" : "case"; }
        } else {
          other = true; via = "fused";
        }
      }
    }
    if (!clean) { other = true; via = "glued"; }
    rows.push({ word: w.text, stem: clean ? text.slice(stemStart, stemEnd) : w.text, suffix, prefix, klass, prefixKlass, via, other });
  }
  return rows;
}
