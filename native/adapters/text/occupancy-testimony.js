// native/adapters/text/occupancy-testimony.js — the material's own testimony
// that a participant came to HOLD a position (2026-09-27; rebuilt on the
// reading pipeline's own mentions 2026-09-28). Text adapter; the kernel it
// feeds (kernel/sequence.js) is medium-blind.
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
// THE OCCUPANT IS A MENTION THE PIPELINE MADE. The first cut found the
// occupant as the capitalised run before the transition and the registered
// run (eval/identity/results/occupancy-eval-RESULTS.md) read the cost off its
// own rows: "He", "Several", "Claims", "Loping" taken as names — L2 broken by
// rebuilding a name finder beside the engine's referent organs, which already
// refuse a sentence-initial capital. So the reader now takes `mentions`: for
// each sentence, the spans the reading pipeline established — a referent's
// surface occurrence, a pronoun the pipeline bound — each carrying the
// referent it names and how (`via`). The occupant is the LAST such mention
// before the transition in the clause, with at most two words between them,
// READ rather than skipped (an adverb passes; a modal, a negation or an
// infinitive "to" is irrealis). No mention there -> a typed refusal. The
// capitalised-run finder survives only as the declared ablation arm
// (`mentions` omitted), so the difference can be measured, never assumed.
//
// WHAT COUNTS. A declared closed class of English occupancy transitions
// (giver below), each followed by a complement typed STRUCTURALLY, never by a
// list of role words:
//   locus     definite-led ("the captain of his company") or title-cased
//             ("President of the United States", "Count Bezukhov") — a
//             candidate position
//   kind      indefinite-led ("a lawyer") — membership of a kind, an INS
//             Pattern act, not occupancy: refused, typed
//   state     anything else ("close", "engaged", "chaplain to the Infirmary")
//             — refused, typed. A bare-noun office is a known cost of this
//             typing, registered in occupancy-host-eval.mjs H5b.
// and REALIS only: a rule, a wish or a denial is not testimony that anyone
// held anything (rules belong to kernel/obligations.js, the Paradigm cell).
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
/** Between an occupant mention and its transition: at most this many words, each read. */
export const OCCUPANT_GAP_MAX = 2;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const W = "\\p{L}[\\p{L}’'.-]*";          // any word
const CAP = "\\p{Lu}[\\p{L}’'.-]*";       // a capitalised word

/**
 * readOccupancyTestimony(sentences, { source, determiners, modals, negation,
 *   transitions, mentions, resolveLocus })
 * sentences: [{ text, at }]; determiners: { definite, indefinite } (priors.js);
 * modals / negation: closed classes (declared by the caller with givers);
 * mentions(sentence) -> [{ start, end, referent, via }] in the sentence's own
 *   coordinates — the reading pipeline's mentions; omitted = the ablation arm
 * pronouns: a received closed class (priors.js SUBJECT_PRONOUNS, lang/en); a
 *   pronoun in the gap the pipeline did not bind refuses the standing
 * resolveLocus(sentence, span, surface) -> { referent, via } | null
 * -> { candidates, refused, arm }
 */
export function readOccupancyTestimony(sentences, { source, determiners, modals, negation, transitions = OCCUPANCY_TRANSITIONS_EN, mentions = null, pronouns = null, resolveLocus = null, complementTyping = "structural" } = {}) {
  for (const [k, v] of Object.entries({ source, determiners, modals, negation })) if (v == null) throw new TypeError(`occupancy-testimony: '${k}' must be declared`);
  const def = determiners.definite, indef = determiners.indefinite;
  const alt = (xs) => xs.map(esc).join("|");
  const AUX = `(?:(?:${[...BE_AUX].map(esc).join("|")})\\s+)`;
  // the transition and its complement; what stands before it is decided by the mentions
  const patterns = [
    { kind: "succeed", re: new RegExp(`(?<![\\p{L}’'])(?:${alt(transitions.succeed)})\\s+(?<pred>${W}(?:\\s+${W}){0,3}?)\\s+as\\s+(?<comp>.+)`, "u") },
    { kind: "assume", re: new RegExp(`(?<![\\p{L}’'])(?:${alt(transitions.assume)})\\s+(?<comp>.+)`, "u") },
    { kind: "passive", re: new RegExp(`(?<![\\p{L}’'])${AUX}(?:${alt(transitions.passive)})(?:\\s+as|\\s+to\\s+be)?\\s+(?<comp>.+)`, "u") },
    { kind: "become", re: new RegExp(`(?<![\\p{L}’'])${AUX}?(?:${alt(transitions.become)})\\s+(?<comp>.+)`, "u") },
  ];
  // the ablation arm: a capitalised run ending right before the transition
  const capRun = new RegExp(`(?<occ>${CAP}(?:\\s+(?:of\\s+|de\\s+|von\\s+)?${CAP})*)\\s*$`, "u");
  const candidates = [], refused = [];
  const clean = (w) => w.toLowerCase().replace(/[^\p{L}’']/gu, "");
  const irrealisIn = (words) => words.some((w) => modals.has(w) || negation.has(w)) || words.includes("to");
  for (const sentence of sentences) {
    const { text, at } = sentence;
    const ms = mentions ? [...(mentions(sentence) ?? [])].sort((a, b) => a.start - b.start) : null;
    let clauseStart = 0;
    for (const clause of String(text).split(/[;:]|(?:,\s+(?=(?:and|but|while|when|after|before)\s))/u)) {
      const here = text.indexOf(clause, clauseStart); if (here >= 0) clauseStart = here;
      const cStart = clauseStart;
      for (const p of patterns) {
        const m = p.re.exec(clause); if (!m) continue;
        const before = clause.slice(0, m.index);
        // the occupant: the pipeline's last mention before the transition, or the ablation's run
        let occupant, occupantSurface, occupantVia, gapWords;
        if (ms) {
          const tStart = cStart + m.index;
          const prior = ms.filter((x) => x.end <= tStart && x.start >= cStart);
          const last = prior.at(-1);
          const gap = last ? text.slice(last.end, tStart) : before;
          gapWords = gap.split(/\s+/).map(clean).filter(Boolean);
          if (!last || gapWords.length > OCCUPANT_GAP_MAX) { refused.push({ at, reason: "occupant_not_a_referent", occupant: before.trim().split(/\s+/).slice(-3).join(" "), clause: clause.trim().slice(0, 160) }); break; }
          // Two structural walls between the mention and the transition
          // (amended 2026-09-28 from the registered run's own rows, never a
          // word list): a PRONOUN the pipeline did not bind is the subject,
          // not the mention before it ("...German universities, he was
          // appointed" is not testimony about "German"); and a COMMA closes
          // the mention's phrase ("In December 2015, Merkel was named" is not
          // testimony about "December").
          if (pronouns && gapWords.some((w) => pronouns.has(w))) { refused.push({ at, reason: "pronoun_unbound", occupant: gapWords.find((w) => pronouns.has(w)), clause: clause.trim().slice(0, 160) }); break; }
          if (/[,;:—()]/.test(gap)) { refused.push({ at, reason: "occupant_not_a_referent", occupant: before.trim().split(/\s+/).slice(-3).join(" "), clause: clause.trim().slice(0, 160) }); break; }
          occupant = last.referent; occupantVia = last.via; occupantSurface = text.slice(last.start, last.end);
        } else {
          const run = capRun.exec(before.replace(/\s+(?:\p{Ll}[\p{L}’']*)(?:\s+\p{Ll}[\p{L}’']*)?\s*$/u, ""));
          if (!run) { refused.push({ at, reason: "occupant_not_a_referent", occupant: before.trim().split(/\s+/).slice(-3).join(" "), clause: clause.trim().slice(0, 160) }); break; }
          occupant = occupantSurface = run.groups.occ; occupantVia = "surface";
          gapWords = before.slice(run.index + run.groups.occ.length).split(/\s+/).map(clean).filter(Boolean);
          const first = occupant.split(/\s+/)[0].toLowerCase();
          if (def.has(first) || indef.has(first)) { refused.push({ at, reason: "occupant_is_description", occupant, clause: clause.trim().slice(0, 160) }); break; }
        }
        // the words between, and the two before the occupant, READ for mood
        const lead = before.slice(0, Math.max(0, before.length - occupantSurface.length - gapWords.join(" ").length - 2)).split(/\s+/).filter(Boolean).slice(-2).map(clean);
        if (irrealisIn(gapWords) || irrealisIn(lead)) { refused.push({ at, reason: "irrealis", occupant: occupantSurface, clause: clause.trim().slice(0, 160) }); break; }
        const predecessor = m.groups.pred ?? null;
        let comp = m.groups.comp.trim().replace(/^[“"‘']+/u, "");
        comp = comp.split(/\s+(?:and|but|while|which|who|in|on|at|from|after|until|when|during|for|by|with)\s+(?=\p{Ll}|\d)|,|\(|\[|—|\.\s/u)[0].trim();
        const first = comp.split(/\s+/)[0] ?? "";
        const fl = first.toLowerCase();
        let type;
        if (indef.has(fl)) type = "kind";
        else if (def.has(fl) || /^\p{Lu}/u.test(first)) type = "locus";
        else type = "state";
        // complementTyping "none" (an experiment's arm, 2026-09-28): every
        // complement is a candidate locus and positionsByPattern decides —
        // the structural typing reads capitalisation as the signal (L2) and
        // refuses "became vice president" as a state; the pattern (a locus
        // recurring across occupants) is the honest test of position-hood.
        if (type !== "locus" && complementTyping === "structural") { refused.push({ at, reason: type === "kind" ? "kind_membership" : "state_not_position", occupant: occupantSurface, complement: comp.slice(0, 80) }); break; }
        const locus = comp.replace(new RegExp(`^(?:${[...def].map(esc).join("|")})\\s+`, "iu"), "").replace(/[.”"’']+$/u, "").trim();
        const year = /\b(1[0-9]{3}|20[0-9]{2})\b/u.exec(clause)?.[1] ?? null;
        const compStart = cStart + clause.indexOf(m.groups.comp);
        const where = resolveLocus ? resolveLocus(sentence, { start: compStart, end: compStart + comp.length }, locus) : null;
        let pred = predecessor;
        if (predecessor && ms) { const ps = cStart + clause.indexOf(predecessor); const hit = ms.find((x) => x.start >= ps && x.end <= ps + predecessor.length); if (hit) pred = hit.referent; }
        candidates.push({ occupant, occupantVia, occupantSurface, locus: where?.referent ?? locus, locusVia: where?.via ?? "surface", locusSurface: locus, predecessor: pred, pattern: p.kind, at, address: `${source}#s${at}`, year, clause: clause.trim().slice(0, 200) });
        break;
      }
    }
  }
  return { candidates, refused, arm: mentions ? "mentions" : "capitalised-run (ablation)", giver: OCCUPANCY_TRANSITIONS_EN_META.giver };
}

/**
 * positionsByPattern(candidates) — a locus is a POSITION only with pattern
 * evidence: it recurs across two distinct occupant referents, or a standing
 * in it names a predecessor. A definite description held once ("the first
 * human to walk") is a Figure, not a position, and stays a description.
 */
export function positionsByPattern(candidates) {
  const by = new Map();
  for (const c of candidates) { const k = String(c.locus).toLowerCase(); if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
  const positions = [], descriptions = [];
  for (const [locus, cs] of by) {
    const occupants = new Set(cs.map((c) => c.occupant));
    const pointer = cs.some((c) => c.predecessor);
    (occupants.size >= 2 || pointer ? positions : descriptions).push({ locus, occupants: [...occupants], standings: cs.length, evidence: occupants.size >= 2 ? "two_occupants" : pointer ? "succession_pointer" : "held_once" });
  }
  return { positions, descriptions };
}

/** A position key a caller may use for kernel/sequence.js: the material's own
 *  address of the testimony, distinct per standing (a thing may hold one
 *  locus twice). */
export const testimonyRecord = (c) => ({ locus: c.locus.toLowerCase(), occupant: c.occupant, key: c.address, predecessor: c.predecessor, year: c.year });
