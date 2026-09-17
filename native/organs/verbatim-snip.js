/* Verbatim snip — the mechanical answer to a verbatim ask.
 *
 * When the person asks for a work's OWN words ("quote me Shakespeare
 * verbatim", "cite-moi Shakespeare mot pour mot"), the answer is not
 * composed — it is SNIPPED. The mouth must never generate a quotation from
 * its weights: a generated "quote" is an invention wearing a source's name.
 *
 *   VERBATIM SNIP — resolve the named public-domain work against a real
 *   source (Wikisource), cut a bounded passage mechanically, and return it
 *   with its provenance. Deterministic for a fixed source text, free of
 *   model tokens. The only invented words are the fixed FRAME naming the
 *   source and the choice of the default passage when the person names no
 *   passage — both disclosed, never silent.
 *
 * Relation to organs/quotes.js (Handle: Dai): that organ VERIFIES
 * quotations already in an answer against the offered material (verbatim /
 * drifted / unlocated) and repairs drift — a post-hoc audit. This organ is
 * the mirror image, pre-model: a REQUESTED verbatim never reaches the model
 * at all; it is fetched and cut. Dai checks what the mouth wrote; this hand
 * decides what the mouth never needs to write.
 *
 * What this organ does NOT do:
 *   - It never quotes from the model's memory. No source on hand → named gap,
 *     never a guess dressed as a quotation.
 *   - It never serves works still in copyright. The door is public-domain
 *     primary sources only (Wikisource); anything else is a refused gap.
 *   - It never paraphrases the snip. The bytes are the bytes.
 */

// A verbatim ask: the person wants the work's own words, not prose about it.
// Requires BOTH a quotation verb and an exactness marker (or an explicit
// "quote me X" frame), so "tell me about Hamlet" never fires — that is a
// question ABOUT the work, and the normal turn owns it.
//
// Falsified 2026-09-17: the first version fired English-only, so a French /
// German / Spanish / Italian verbatim ask fell through to the normal turn —
// exactly the unprotected path where a model invents a "quote" from weights.
// The triggers below cover EN/FR/DE/ES/IT; the works stay proper nouns
// (Shakespeare, Hamlet, Macbeth, sonnet), which travel across languages, so
// only the intent frames needed widening. A language not covered still falls
// through — disclosed, and the unwired-work refusal below is the backstop
// against invention, never a generated quotation.
const QUOTE_VERB =
  /\b(quot(?:e|ing|e me|e us)|recit(?:e|e me)|read me|cite|cite-moi|cit(?:ez|e moi)|zitier(?:e| mir)?|zitat|cita(?:me|tion)?|cítame|citami|citazione)\b/i;

const EXACTNESS =
  /\b(verbatim|word for word|word-for-word|exact(?:ly| words| text| lines)?|original(?: words| text| lines)?|actual words|as (?:he|she|they|shakespeare) wrote|mot p[oö]ur mot|texte? (?:exact|original)|w[öo]rtlich|wortw[öo]rtlich|exakte?(?:n|m|r|s)? (?:text|worte|zeilen)|palabra por palabra|texto (?:exacto|original)|parola per parola|testo (?:esatto|originale))\b/i;

const QUOTE_ME_FRAME =
  /\bquot(?:e|ing)\s+me\b|\bcite-moi\b|\bzitier\s+mir\b|\bc[ií]ta(?:me)?\b|\bcitami\b/i;

const EXACT_TEXT_OF =
  /\b(?:exact|original|full|texte? (?:exact|original)|exakte?(?:n|m|r|s)?|texto (?:exacto|original)|testo (?:esatto|originale))\s+(?:text|words|lines|passage|texte|worte|zeilen|texto|testo)\s+of\b|\btexte\s+(?:exact|original)\s+de\b|\btexto\s+(?:exacto|original)\s+de\b/i;

// Works this organ can reach mechanically today: public-domain authors whose
// primary texts live on Wikisource. The map is deliberate and small — a work
// is added by wiring its source, never by letting the model reach for one.
export const QUOTABLE_WORKS = Object.freeze([
  { match: /shakespeare/i, author: "William Shakespeare", wikisource: "William Shakespeare" },
  { match: /\bhamlet\b/i, author: "William Shakespeare", wikisource: "Hamlet" },
  { match: /\bmacbeth\b/i, author: "William Shakespeare", wikisource: "Macbeth" },
  { match: /\bsonnet\b/i, author: "William Shakespeare", wikisource: "Shakespeare's Sonnets" },
]);

// The disclosed default: the person named an author but no passage. The
// choice is pinned here — in the open, reproducible — never a model's pick.
export const DEFAULT_PASSAGE = Object.freeze({
  work: "Sonnet 18",
  author: "William Shakespeare",
  wikisource: "Shakespeare's Sonnets (1883)/Sonnet 18",
  basis: "you named no particular lines, so this is the pinned default — name a play, sonnet, or speech and those words are what gets snipped",
});

// Wikisource scaffolding that is never the verse: nav arrows, catalog
// id-lines, version lists, disambiguation frames, sister-project footers.
// Measured live: the pinned default first resolved to a versions page and
// the snip quoted the version list instead of the sonnet — so the cut
// skips these lines mechanically before cutting, never by meaning.
const BOILERPLATE_RES = [
  /^[←→]$/,
  /^for other versions of this work/i,
  /^versions of .* include/i,
  /may refer to:?\s*$/i,
  /disambiguation page/i,
  /^works entitled/i,
  /^search for titles/i,
  /^sister projects/i,
  /^in the collected/i,
  // Edition nav between sibling pieces (Sonnet 17 / Sonnet 19 flanking the
  // verse) — never the asked-for words.
  /^(sonnet|chapter|section|part)\s+\d+$/i,
  /\(ed\.\) by/i,
  /edited by/i,
  // A version-list entry: a quoted title reprinted "in" some collection,
  // or a bare catalog line trailing a year — the versions page's own rows.
  /^"[^"]*"?,?\s+in\s+/i,
  /\(\s*\d{4}\s*\)\s*$/,
  /,\s*by\s+[A-Z]/,
  /^\d{5,}\s/,
  /\b\d{5,}\b.*—.*\b(1[6-9]|20)\d{2}\b/,
];

const isBoilerplate = (line) => {
  const l = String(line ?? "").trim();
  if (!l || l.length <= 2) return true;
  return BOILERPLATE_RES.some((re) => re.test(l));
};

export const MAX_SNIP_CHARS = 600;

/**
 * Detect a mechanical-snip ask. Returns `{ work, defaulted }` or null.
 * `work` is the QUOTABLE_WORKS entry the snip should be cut from;
 * `defaulted` is true when the person named an author but no passage, so
 * the caller must disclose the pinned default.
 */
export function snipShape(task) {
  const t = String(task ?? "").trim();
  if (!t) return null;
  const wantsQuote =
    (QUOTE_VERB.test(t) && EXACTNESS.test(t)) ||
    QUOTE_ME_FRAME.test(t) ||
    EXACT_TEXT_OF.test(t);
  if (!wantsQuote) return null;
  const work = QUOTABLE_WORKS.find((w) => w.match.test(t)) ?? null;
  if (!work) {
    // A verbatim ask for a work with no wired source: not ours to serve.
    // The caller names the gap (no_source_wired) — never a model "quote".
    return { work: null, defaulted: false, gap: "no_source_wired" };
  }
  const namesPassage = /\b(hamlet|macbeth|sonnet\s*\d+|act\s+\d+|scene\s+\d+|to\s+be|shall\s+i\s+compare)\b/i.test(t);
  return { work, defaulted: !namesPassage, gap: null };
}

/**
 * Cut a bounded passage mechanically from fetched source text. The cut is
 * positional (the opening verse lines), never semantic — no model chooses
 * "the best part". Wikisource scaffolding (nav, catalog ids, version lists)
 * is skipped by fixed patterns first. Returns `{ snip, chars, longest,
 * basis }` — `longest` is the longest kept line, so the caller can tell a
 * versions/disambiguation page (no long lines, nothing to quote) from the
 * verse and keep hunting instead of snipping the scaffolding.
 */
export function cutSnip(sourceText, { maxChars = MAX_SNIP_CHARS } = {}) {
  const text = String(sourceText ?? "").replace(/\r/g, "").trim();
  if (!text) return { snip: "", chars: 0, longest: 0, basis: "empty source — nothing to cut" };
  // Skip scaffolding head-matter (title/author lines) up to the first long
  // line, then cut at a line boundary under the budget.
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => !isBoilerplate(l));
  if (!lines.length) return { snip: "", chars: 0, longest: 0, basis: "only scaffolding — nothing quotable" };
  let start = 0;
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    if (lines[i].length > 60) { start = i; break; }
  }
  let acc = "";
  for (let i = start; i < lines.length; i++) {
    const next = acc ? `${acc}\n${lines[i]}` : lines[i];
    if (next.length > maxChars) break;
    acc = next;
  }
  const snip = acc || lines.slice(start, start + 1).join("\n").slice(0, maxChars);
  const longest = snip.split("\n").reduce((m, l) => Math.max(m, l.length), 0);
  return { snip, chars: snip.length, longest, basis: `positional cut: opening lines from line ${start + 1}, ${snip.length} chars — no selection by meaning` };
}

/**
 * Format the snipped verbatim for display. The ❝ markers and the provenance
 * line are the VISUAL contract: a reader can tell at a glance this block was
 * snipped from a source, not written by the model.
 */
export function formatQuote({ snip = "", title = "", author = "", url = "" } = {}) {
  const lines = String(snip).trim().split("\n");
  const body = lines.map((l) => `❝ ${l}`).join("\n");
  const credit = `— ${author ? `${author}, ` : ""}${title}`.trim();
  const provenance = url
    ? `[snipped verbatim — non-model prose · source: ${url}]`
    : `[snipped verbatim — non-model prose]`;
  return `${body}\n${credit}\n${provenance}`;
}
