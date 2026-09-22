// canonical-sections.js — WALKING BACKWARD FROM A REAL DEFINITION
// (2026-09-22).
//
// The user, after "@0:first=title" and a handful of typographic facts:
// "that so does not teach me how to write a white paper. ok go get the
// definition of a white paper and its structure from online, and walk
// backwards to what we would need to do to extract something like that
// from the data." Everything measured until now (learnParadigmEmergent,
// necessaryFacts) was BLIND induction from typography alone — headings,
// indentation, punctuation. None of that can ever find "has an executive
// summary," because that is not a typographic fact, it is a LEXICAL one:
// does a heading's own TEXT name a known structural role.
//
// THE DEFINITION (real, fetched live 2026-09-22, corroborated across
// independent sources — never invented): a marketing/business white paper
// has eight roles, in this order —
//   Brafton, "How To Write a White Paper": brafton.com/blog/creation/how-to-write-a-white-paper
//   corroborated by (same eight roles, same order, independently):
//   Turtl (turtl.co), EduBirdie (edubirdie.com), Content Marketing
//   Institute (contentmarketinginstitute.com), ActiveCampaign
//   (activecampaign.com), Mojenta (mojenta.com), Weblium (weblium.com),
//   Venngage (venngage.com), Paperflite (paperflite.com).
// The vocabulary below is a DECLARED prior, sourced exactly as above —
// never presented as something this engine measured. What IS measured,
// by matchCanonicalSections/canonicalStructureCoverage, is whether a REAL
// document's own headings actually name these roles, and in what order —
// a mechanical, checkable fact about the bytes, using a hand-curated but
// disclosed vocabulary, the same way kernel/pos-*.json priors are declared
// grammars, not measurements.
export const WHITE_PAPER_SECTIONS = Object.freeze([
  { role: "title", order: 0 }, // handled specially: the document's own first heading/line, not matched by pattern
  { role: "executive-summary", order: 1, patterns: [/executive\s+summary/i, /^summary$/i, /^overview$/i, /\btl;?dr\b/i] },
  { role: "introduction", order: 2, patterns: [/^introduction$/i, /^background$/i, /^context$/i] },
  { role: "problem", order: 3, patterns: [/\bthe\s+problem\b/i, /\bchallenge/i, /\bthe\s+issue\b/i, /^problem\s+statement$/i] },
  { role: "evidence", order: 4, patterns: [/\bresearch\b/i, /\bfindings\b/i, /\bdata\b/i, /\bcase\s+stud/i, /\bmethodology\b/i] },
  { role: "solution", order: 5, patterns: [/\bsolution/i, /\bour\s+approach\b/i, /\bhow\s+it\s+works\b/i, /\bproposed\b/i] },
  { role: "conclusion", order: 6, patterns: [/^conclusion/i, /\bkey\s+takeaway/i, /^summary$/i] },
  { role: "cta", order: 7, patterns: [/\bcall\s+to\s+action\b/i, /\bcontact\s+us\b/i, /\bnext\s+steps\b/i, /\bget\s+started\b/i, /\brequest\s+a\s+demo\b/i, /\blearn\s+more\b/i] },
]);

/** Every heading element in a unit, in document order. */
function headingsOf(unit) {
  const elements = Array.isArray(unit) ? unit : unit?.elements ?? [];
  return elements.filter((e) => e?.cls === "heading" && typeof e.text === "string");
}

/**
 * matchCanonicalSections(unit, vocabulary) →
 *   { hasTitle, matched: [{ role, order, headingIndex, text }], missing: [role,…] }
 * A heading's text is tested against each role's patterns in declaration
 * order; the FIRST heading to match a role wins that role (a document
 * that says "Summary" twice doesn't get credited twice). "title" is
 * satisfied by the mere presence of any heading/first line — a document
 * either opens with something or it doesn't, no pattern needed.
 */
export function matchCanonicalSections(unit, vocabulary = WHITE_PAPER_SECTIONS) {
  const headings = headingsOf(unit);
  const matched = [];
  const claimed = new Set();
  for (const spec of vocabulary) {
    if (spec.role === "title") continue;
    for (let i = 0; i < headings.length; i++) {
      if (claimed.has(i)) continue;
      if (spec.patterns.some((re) => re.test(headings[i].text))) {
        matched.push({ role: spec.role, order: spec.order, headingIndex: i, text: headings[i].text });
        claimed.add(i);
        break;
      }
    }
  }
  matched.sort((a, b) => a.headingIndex - b.headingIndex);
  const hasTitle = headings.length > 0 || (Array.isArray(unit) ? unit.length > 0 : (unit?.elements?.length ?? 0) > 0);
  const foundRoles = new Set(matched.map((m) => m.role));
  const missing = vocabulary.filter((s) => s.role !== "title" && !foundRoles.has(s.role)).map((s) => s.role);
  // Order correctness: are the matched roles' own declared `order` values
  // non-decreasing in the order the headings actually appear? (a document
  // that puts "Call to Action" before "Executive Summary" fails this even
  // if both roles are present.)
  const orderOk = matched.every((m, i) => i === 0 || m.order >= matched[i - 1].order);
  return { hasTitle, matched, missing, orderOk, coverage: (hasTitle ? 1 : 0) + matched.length, total: vocabulary.length };
}

/**
 * canonicalStructureCoverage(instances, vocabulary) →
 *   { n, perRole: [{role, support}], meanCoverage, orderConsistency, basis }
 * Across many real instances: what fraction actually name each canonical
 * role, on average how many of the 8 roles are present, and how often
 * (among documents with 2+ matched roles) they appear in the right
 * relative order. This is the mechanical check for "is this the SAME KIND
 * of document the canonical definition describes" — a corpus that scores
 * near zero on this is honestly a DIFFERENT kind, not a defective
 * measurement.
 */
export function canonicalStructureCoverage(instances, vocabulary = WHITE_PAPER_SECTIONS) {
  const n = instances.length;
  if (n === 0) return { n: 0, perRole: [], meanCoverage: 0, orderConsistency: null, basis: "no instances" };
  const results = instances.map((u) => matchCanonicalSections(u, vocabulary));
  const roles = vocabulary.filter((s) => s.role !== "title");
  const perRole = roles.map((s) => ({ role: s.role, support: results.filter((r) => r.matched.some((m) => m.role === s.role)).length / n }));
  const meanCoverage = results.reduce((a, r) => a + r.coverage, 0) / n / vocabulary.length;
  const withMultiple = results.filter((r) => r.matched.length >= 2);
  const orderConsistency = withMultiple.length ? withMultiple.filter((r) => r.orderOk).length / withMultiple.length : null;
  return {
    n, perRole, meanCoverage, orderConsistency,
    basis: `${n} instance(s) checked against the ${vocabulary.length}-role canonical structure (declared, sourced — see this file's header); mean coverage ${(meanCoverage * 100).toFixed(0)}% of roles present${orderConsistency != null ? `, order-consistent in ${(orderConsistency * 100).toFixed(0)}% of the ${withMultiple.length} instance(s) with 2+ matched roles` : " (too few multi-role instances to check order)"}`,
  };
}
