// native/adapters/text/occupancy-testimony.js — the material's own testimony
// that a participant came to HOLD a position (2026-09-27). Text adapter; the
// kernel it feeds (kernel/sequence.js) is medium-blind.
//
// WHY. kernel/sequence.js (READING-SPEC S21) already holds the law — "positions
// are temporal; occupants are not" — and refutes a pooled locus, but nothing
// fed it from material: its one caller is the Wikidata eval. Identity work on
// War and Peace kept conflating a POSITION with a PARTICIPANT ("Count
// Bezukhov" is a title held by the father and then by Pierre; Ostrom's IAD
// keeps position and participant apart for the same reason). Under the grain
// theorem a corpus can refute a locus and never establish one, so a locus
// needs a giver; the material's own statement of becoming, appointment or
// succession is that giver, addressed to the sentence that says it.
//
// WHAT COUNTS. A declared closed class of English occupancy transitions
// (giver below), each followed by a complement typed STRUCTURALLY, never by a
// list of role words:
//   locus     definite-led ("the captain of his company") or title-cased
//             ("President of the United States", "Count Bezukhov") — a
//             candidate position
//   kind      indefinite-led ("a lawyer") — membership of a kind, an INS
//             Pattern act, not occupancy: refused, typed
//   state     anything else ("close", "engaged", "clear") — refused, typed
// and REALIS only: a modal, a negation or an infinitive "to" before the
// transition ("would become", "never became", "hoped to become") is refused as
// irrealis — a rule, a wish or a denial is not testimony that anyone held
// anything (rules belong to kernel/obligations.js, the Paradigm cell).
// The occupant is the capitalised run just before the transition, or a
// typed gap (a pronoun is never guessed here).
//
// Every candidate carries its address (source#sentence) and, only if the
// sentence states a year, an order key. Undated standings are real
// standings; kernel/sequence.js's refuteLocus cannot testify about them, and
// says so.

export const OCCUPANCY_TRANSITIONS_EN = Object.freeze({
  become: ["became", "becomes", "become", "becoming"],
  passive: ["appointed", "elected", "named", "made", "chosen", "promoted", "sworn in", "installed", "crowned", "proclaimed", "nominated", "designated"],
  succeed: ["succeeded"],
  assume: ["took office as", "assumed the office of", "assumed the post of", "assumed the title of", "assumed office as"],
});
export const OCCUPANCY_TRANSITIONS_EN_META = Object.freeze({
  giver: "declared closed class, lang/en; reference: VerbNet classes become-109.1, appoint-29.1, succeed-? (Levin 1993 §29.1 'appoint verbs')",
  scope: "entry into a position only; exits (resigned, deposed, died) are named future work",
});
const BE_AUX = new Set(["was", "were", "is", "are", "been", "being", "be", "had been", "has been", "have been"]);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const W = "\\p{L}[\\p{L}’'.-]*";          // any word
const CAP = "\\p{Lu}[\\p{L}’'.-]*";       // a capitalised word

/**
 * readOccupancyTestimony(sentences, { source, determiners, modals, negation,
 *   transitions, posPrior })
 * sentences: [{ text, at }]; determiners: { definite, indefinite } (priors.js);
 * modals / negation: closed classes (declared by the caller with givers).
 * -> { candidates, refused }
 */
export function readOccupancyTestimony(sentences, { source, determiners, modals, negation, transitions = OCCUPANCY_TRANSITIONS_EN, posPrior = null } = {}) {
  for (const [k, v] of Object.entries({ source, determiners, modals, negation })) if (v == null) throw new TypeError(`occupancy-testimony: '${k}' must be declared`);
  const def = determiners.definite, indef = determiners.indefinite;
  const passive = transitions.passive.map(esc).join("|");
  const become = transitions.become.map(esc).join("|");
  const assume = transitions.assume.map(esc).join("|");
  const succeed = transitions.succeed.map(esc).join("|");
  // occupant: a capitalised run ending right before the transition
  const NAME = `(?<occ>${CAP}(?:\\s+(?:of\\s+|de\\s+|von\\s+)?${CAP})*)`;
  // up to two lowercase words between the occupant and the transition, READ
  // rather than skipped: an adverb ("soon") passes, a modal / negation /
  // infinitive "to" is a refusal the organ reached ("would become", "never
  // became", "hoped to become")
  const MID = `(?<mid>(?:\\s+\\p{Ll}[\\p{L}’']*){0,2}?)`;
  const AUX = `(?:(?:${[...BE_AUX].map(esc).join("|")})\\s+)`;
  const patterns = [
    { kind: "succeed", re: new RegExp(`${NAME}${MID}\\s+(?:${succeed})\\s+(?<pred>${W}(?:\\s+${W}){0,3}?)\\s+as\\s+(?<comp>.+)`, "u") },
    { kind: "assume", re: new RegExp(`${NAME}${MID}\\s+(?:${assume})\\s+(?<comp>.+)`, "u") },
    { kind: "passive", re: new RegExp(`${NAME}${MID}\\s+${AUX}(?:${passive})(?:\\s+as|\\s+to\\s+be)?\\s+(?<comp>.+)`, "u") },
    { kind: "become", re: new RegExp(`${NAME}${MID}\\s+${AUX}?(?:${become})\\s+(?<comp>.+)`, "u") },
  ];
  const candidates = [], refused = [];
  const clean = (w) => w.toLowerCase().replace(/[^\p{L}’']/gu, "");
  for (const { text, at } of sentences) {
    for (const clause of String(text).split(/[;:]|(?:,\s+(?=(?:and|but|while|when|after|before)\s))/u)) {
      for (const p of patterns) {
        const m = p.re.exec(clause); if (!m) continue;
        const occupant = m.groups.occ;
        const mid = m.groups.mid.trim().split(/\s+/).filter(Boolean).map(clean);
        const before = clause.slice(0, m.index).split(/\s+/).filter(Boolean).slice(-2).map(clean);
        const irrealis = [...mid, ...before].some((w) => modals.has(w) || negation.has(w)) || mid.includes("to") || before.at(-1) === "to";
        if (irrealis) { refused.push({ at, reason: "irrealis", clause: clause.trim().slice(0, 160) }); break; }
        const occFirst = occupant.split(/\s+/)[0].toLowerCase();
        if (def.has(occFirst) || indef.has(occFirst)) { refused.push({ at, reason: "occupant_is_description", occupant, clause: clause.trim().slice(0, 160) }); break; }
        const predecessor = m.groups.pred ?? null;
        let comp = m.groups.comp.trim().replace(/^[“"‘']+/u, "");
        comp = comp.split(/\s+(?:and|but|while|which|who|in|on|at|from|after|until|when|during|for|by|with)\s+(?=\p{Ll}|\d)|,|\(|\[|—|\.\s/u)[0].trim();
        const first = comp.split(/\s+/)[0] ?? "";
        const fl = first.toLowerCase();
        let type;
        if (indef.has(fl)) type = "kind";
        else if (def.has(fl) || /^\p{Lu}/u.test(first)) type = "locus";
        else type = "state";
        if (type !== "locus") { refused.push({ at, reason: type === "kind" ? "kind_membership" : "state_not_position", occupant, complement: comp.slice(0, 80) }); break; }
        const locus = comp.replace(new RegExp(`^(?:${[...def].map(esc).join("|")})\\s+`, "iu"), "").replace(/[.”"’']+$/u, "").trim();
        const year = /\b(1[0-9]{3}|20[0-9]{2})\b/u.exec(clause)?.[1] ?? null;
        candidates.push({ occupant, locus, predecessor, pattern: p.kind, at, address: `${source}#s${at}`, year, clause: clause.trim().slice(0, 200) });
        break;
      }
    }
  }
  return { candidates, refused, giver: OCCUPANCY_TRANSITIONS_EN_META.giver };
}

/** A position key a caller may use for kernel/sequence.js: the material's own
 *  address of the testimony, distinct per standing (a thing may hold one
 *  locus twice). */
export const testimonyRecord = (c) => ({ locus: c.locus.toLowerCase(), occupant: c.occupant, key: c.address, predecessor: c.predecessor, year: c.year });
