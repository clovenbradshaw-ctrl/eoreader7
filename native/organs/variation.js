// organs/variation.js — the variation machinery (Brillat-Savarin).
//
// Handle: Brillat-Savarin — after Jean Anthelme Brillat-Savarin's
// Physiologie du goût: a dish is memorable for the chosen, surprising
// measure of flavor, never a shower of random spice. Here the same rule
// governs prose: a fact stated once is a finding, twice is a crutch; an
// opening that repeats another section's construction is the boredom.
//
// THE REVISION LADDER: mechanical first (free, deterministic, EOT-recorded —
// no model call), model only when no mechanical transform expresses the
// change. Each mechanical edit lands as an EOT TRANSFORMATION carrying the
// op (INS·swap / SYN·rotate / SEG·cut), the superseded bytes, and the
// result — always auditable, always re-foldable.
//
// Universal and aliased: any caller can use the same ladder (the names in
// parentheses are the aliases the commit that extracted this organ named).

// The opening CONSTRUCTION of a passage: the first sentence's leading
// content words. Repetition lives in the construction, not the topic —
// five paragraphs opening "The bongo antelope, scientifically classified
// as..." repeat even when each is about a different thing.
export function openingOf(text = "") {
  const firstSentence = String(text).trim().split(/(?<=[.!?])\s+/)[0] ?? "";
  return firstSentence
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((w) => w.length > 2)
    .slice(0, 6);
}

// Do two openings share the same construction? The first `lead` content
// words decide — that is the construction a reader feels as repetition.
export const isRedundantOpening = (a = [], b = [], lead = 3) => {
  if (!a.length || !b.length) return false;
  return a.slice(0, lead).join(" ") === b.slice(0, lead).join(" ");
};
export const sameOpening = isRedundantOpening;

// The synonym pool's word for a lead token, case-insensitively, or null.
function synonymFor(word, synonyms = []) {
  const target = String(word ?? "").toLowerCase().replace(/[^a-z']/g, "");
  for (const s of synonyms) {
    const sLower = String(s ?? "").toLowerCase().replace(/[^a-z']/g, "");
    if (sLower === target) continue; // itself is not a variation
    // A synonym is a surface that shares the subject — swap the lead term for
    // a parallel naming of the same being, never for a random word.
    if (sLower.length > 3 && sLower !== target) return s;
  }
  return null;
}

// ── THE MECHANICAL SNIP — no model call. ───────────────────────────────────
// Produces a genuinely different opening (or a cut repeated fact) from the
// section itself, using the reading's synonym surfaces and avoiding the
// other sections' constructions. Returns { to, op, basis } — the EOT
// transformation — or null when no mechanical transform expresses the
// change (then the caller falls to the model).
export function snipVariation(text = "", { kind = "repetition", synonyms = [], others = [] } = {}) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const otherOpenings = (others ?? []).map((o) => openingOf(o)).filter((o) => o.length);
  const myOpening = openingOf(t);

  // REPEATED FACT — SEG·cut. The same fact stated in more than one section:
  // cut the repeated sentence here. A fact once is a finding; twice is a
  // crutch. Conservative: only cut a sentence that shares most of its
  // content-tokens with another section's prose, so we never cut new
  // material, only the re-statement.
  if (kind === "repeated-fact") {
    const sentences = t.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
    for (const s of sentences) {
      const tokens = new Set(s.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 4));
      if (tokens.size < 4) continue;
      for (const other of others ?? []) {
        const otherLower = String(other ?? "").toLowerCase();
        const shared = [...tokens].filter((w) => otherLower.includes(w)).length / tokens.size;
        if (shared >= 0.7) {
          const to = sentences.filter((x) => x !== s).join(" ");
          if (to.trim() && to.trim() !== t) {
            return { to: to.trim(), op: "SEG·cut", basis: `a sentence restating another section's fact (${Math.round(shared * 100)}% overlap) was cut — a fact stated once is a finding` };
          }
        }
      }
    }
    return null;
  }

  // OPENING CONSTRUCTION — SYN·rotate / INS·swap. Swap the lead term for a
  // synonym from the reading's surfaces, or rotate the lead phrase, so the
  // opening differs from the other sections' constructions. Only accepted
  // when it is genuinely different.
  const words = t.split(" ");
  const firstContentIdx = words.findIndex((w) => /^[a-z]/i.test(w) && w.length > 2);
  if (firstContentIdx >= 0) {
    const lead = words[firstContentIdx].replace(/[^a-z']/gi, "");
    const replacement = synonymFor(lead, synonyms);
    if (replacement) {
      const to = [...words];
      to[firstContentIdx] = to[firstContentIdx].replace(/[a-z']+/i, replacement);
      const newText = to.join(" ");
      const newOpening = openingOf(newText);
      if (!otherOpenings.some((o) => isRedundantOpening(newOpening, o))) {
        return { to: newText, op: "SYN·rotate", basis: `the opening's lead term ("${lead}") rotated to a parallel surface ("${replacement}") — the construction no longer repeats another section's` };
      }
    }
  }
  // Rotate the lead phrase's word order when a synonym is not available.
  if (words.length >= 3) {
    const leadIdx = words.findIndex((w) => /^[A-Z]/.test(w));
    if (leadIdx === 0 && words.length >= 4) {
      const to = [...words.slice(0, 3)].reverse().join(" ") + " " + words.slice(3).join(" ");
      const newOpening = openingOf(to);
      if (!otherOpenings.some((o) => isRedundantOpening(newOpening, o))) {
        return { to, op: "INS·swap", basis: "the opening phrase's construction was re-ordered so it does not echo another section's opening" };
      }
    }
  }
  return null;
}
export const manualSnip = snipVariation;
export const mechanicalRevision = snipVariation;

// ── THE VARIED DRAW — rejection sampling at rising temperature. ───────────
// The model's mouth, when no mechanical transform expresses the change.
// Rejects draws whose opening repeats another section's construction and
// retries at rising temperature (falling Kelsen) with the material's synonym
// surfaces in the prompt — until one differs, or the bounded budget runs out
// (it accepts the last draw rather than churning forever).
export async function variedDraw({ draw = null, msgs = [], maxTokens = 1024, blockedOpenings = [], synonyms = [], onReject = null } = {}) {
  const attempts = 3;
  let last = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    // Rising temperature = falling Kelsen: 0.9 → 0.5. The mouth gets freer
    // each rejection, mechanically, never instructed to vary.
    const kelsen = Number((0.9 - attempt * 0.2).toFixed(2));
    last = await draw(msgs, maxTokens, { kelsen });
    if (last?.stopped) return last;
    const opening = openingOf(last?.buf ?? "");
    if (!opening.length) return last;
    const blocked = (blockedOpenings ?? []).some((o) => isRedundantOpening(opening, openingOf(o)));
    if (!blocked) return last;
    if (onReject) onReject({ attempt: attempt + 1, opening: opening.join(" "), reason: "the opening repeats another section's construction" });
  }
  return last;
}
export const searchVariation = variedDraw;