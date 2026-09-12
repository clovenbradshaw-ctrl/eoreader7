// score-multilingual.mjs — score an eot-jsonl.mjs `--whole` ledger against a
// live_priors hand-adjudicated golden's `.tuples.jsonl` (subject/relation/
// object rows, RULE.md-style), for languages the corpus's existing scorer
// (`live_priors/goldens/reading/diff-golden.mjs`) does not cover — that
// driver runs its OWN pipeline call (loadOrgans/relationsFor) against a
// golden's raw window and only ever imports `hand-readings.mjs`'s
// {subject,relation,object} rows for eng/spa-shaped specimens; it does not
// read a ledger's EOTObservation@1 lines at all, so it cannot score this
// session's arb/cmn_hans `--whole` reads without being rewired end to end.
// This file exists because that rewiring was out of scope: it is the
// smallest possible bridge between an actual ledger file and an actual
// golden file, written new rather than duplicated from diff-golden.mjs's
// live-pipeline call (searched for first: `native/`, `live_priors/goldens/
// reading/`, `live_priors/scripts/` all grepped for "tuples.jsonl" before
// writing this — nothing consumed that format yet).
//
// MATCHING: normalised-substring containment on subject/object, both
// orders (same rule diff-golden.mjs and this session's earlier Spanish
// score already used: RULE.md Part IV's own method) — no relation-label
// check, since the ledger's `label` and the golden's `relation` are hand-
// segmented independently and a byte-for-byte match on that field was
// already shown (S104, LAVAR.md) to under-count real, correct content.
//
// SCRIPT-NEUTRAL BY CONSTRUCTION. Containment is a substring test over
// Unicode codepoints; it does not care whether the text is LTR or RTL
// (Arabic) or has no whitespace word boundaries (Mandarin) — the golden's
// own subject/object cells and the ledger's own end1/end2 cells came out
// of the SAME underlying byte range, so if the ledger ever captures the
// right span, the substring test finds it regardless of script. What it
// does NOT do is anything RTL/CJK-specific: no word segmentation, no
// bidi reordering. Disclosed, not silently assumed correct.

import fs from "node:fs";

const [, , ledgerPath, goldenTuplesPath] = process.argv;
if (!ledgerPath || !goldenTuplesPath) {
  console.error("usage: node score-multilingual.mjs <ledger.eot.jsonl> <golden.tuples.jsonl>");
  process.exit(1);
}

const norm = (s) => String(s ?? "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

const contains = (haystack, needle) => {
  const h = norm(haystack), n = norm(needle);
  if (!h || !n) return false;
  return h.includes(n) || n.includes(h);
};

const ledgerLines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const props = ledgerLines.filter((o) => o.schema === "EOTObservation@1" && o.end1 != null && o.end2 != null);

const goldenRows = fs.readFileSync(goldenTuplesPath, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const scorable = goldenRows.filter((r) => r.subject && r.object);

let matched = 0;
const matches = [];
const misses = [];
for (const row of scorable) {
  const hit = props.find((p) =>
    (contains(p.end1, row.subject) && contains(p.end2, row.object)) ||
    (contains(p.end2, row.subject) && contains(p.end1, row.object))
  );
  if (hit) { matched += 1; matches.push({ prop: row.prop, subject: row.subject, object: row.object, ledgerEnd1: hit.end1, ledgerEnd2: hit.end2 }); }
  else misses.push({ prop: row.prop, subject: row.subject, object: row.object });
}

const result = {
  ledgerPath, goldenTuplesPath,
  ledgerPropositions: props.length,
  goldenScorableRows: scorable.length,
  goldenTotalRows: goldenRows.length,
  matched,
  recall: scorable.length ? `${matched}/${scorable.length}` : "0/0",
  recallPct: scorable.length ? +(100 * matched / scorable.length).toFixed(1) : 0,
  matches,
  misses: misses.slice(0, 5),
  missesOmitted: Math.max(0, misses.length - 5),
};
console.log(JSON.stringify(result, null, 2));
