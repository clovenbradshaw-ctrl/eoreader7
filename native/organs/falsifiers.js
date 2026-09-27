// native/organs/falsifiers.js — Popper's second face: what would prove this
// answer wrong.
//
// Handle: Popper. blindspot.js is his first face (a TEST that cannot fail was
// never a test, read off code). This is the same law read off an ANSWER: a
// claim earns its standing only by being exposed to refutation, so every
// answer the instrument hands a person says, in plain words, what would
// refute it — and says so loudest when the honest answer is "nothing here
// would notice." User direction (2026-09-27): the fold's outputs must keep
// people grounded in reality and away from the closed loop of two voices
// confirming each other; Popper is the archon of that — "what could be true
// that would prove us wrong?" — wired to every surface.
//
// MECHANICAL, NEVER AUTHORED. The model never writes a falsifier. Each line
// is DERIVED from the ground tier a sentence already earned (ground-ladder.js
// — bound / witnessed / recorded / derived / contested / named / self), so a
// falsifier can never claim more exposure than the reading actually did.
// This is L5: a compliance-critical fact is never left to the mouth.
//
// PURE. No imports. What counts as a checkable sentence (a figure, a name, a
// bound relation) is INJECTED as `isCheckable` — grounding.js::extractAtoms
// at every real call site, so there is one definition of "checkable" across
// the instrument; the fallback below exists only so this module never throws
// in a bare test.
//
// WHAT IT NEVER DOES. It never convicts (a falsifier says what WOULD refute,
// never that anything has), never ranks the answer's truth, never shows a
// score, and never draws for a sentence with nothing checkable in it — "Hi,
// how can I help?" asserts nothing and gets no line. An answer that asserts
// nothing gets `null`, not a lecture.

export const POPPER = Object.freeze({ handle: "Popper", organ: "falsifiers", law: "a claim that cannot fail was never tested — every answer says what would prove it wrong" });

/** The mark that opens the one inline line a plain-text surface carries.
 *  ⟂ is the logician's falsum — "the false" — and nothing else in this
 *  instrument uses it, so a client resending history can strip the line
 *  exactly (stripPopperLine) and it never reaches a model as prompt text. */
export const POPPER_MARK = "⟂";
export const POPPER_LEAD = "What would prove this wrong:";

const GROUNDED = new Set(["verbatim", "bound", "witnessed", "recorded", "derived"]);

function fallbackCheckable(sentence) {
  const s = String(sentence ?? "");
  // A figure, or a capitalized word after the first — the weak shape of
  // extractAtoms, used ONLY when no organ was injected.
  return /\d/.test(s) || /\s[A-Z][a-z]/.test(s);
}

function addrList(addresses = [], max = 2) {
  const list = [...new Set((addresses ?? []).filter(Boolean).map(String))];
  if (!list.length) return null;
  const shown = list.slice(0, max).join(", ");
  return list.length > max ? `${shown} and ${list.length - max} more` : shown;
}

function sourceCount(addresses = []) {
  return new Set((addresses ?? []).map((a) => String(a).split("#")[0].split("~")[0]).filter(Boolean)).size;
}

/** One sentence's falsifier, from its ground row alone. null when the row's
 *  tier is one this module does not know (an unknown tier is never guessed). */
export function falsifierFor(row) {
  const tier = row?.tier ?? null;
  const at = addrList(row?.addresses);
  switch (tier) {
    case "verbatim":
      return at ? `wrong only if the source itself (${at}) is wrong — these are its own words` : "wrong only if the source itself is wrong — these are its own words";
    case "bound":
      return `wrong if ${at ?? "the source it rests on"} is misread here, or another source says otherwise`;
    case "witnessed":
      return `wrong if ${at ? `the passage at ${at}` : "the passage it points to"} doesn't really say this on a careful reading, or another source says otherwise`;
    case "recorded": {
      const n = sourceCount(row?.addresses);
      return n >= 2
        ? `wrong if the ${n} sources that state it are all mistaken, or all repeat one origin`
        : `rests on one source${at ? ` (${at})` : ""} — a second source saying otherwise would prove it wrong`;
    }
    case "derived":
      return "worked out, not stated by any source — wrong if any claim it was worked out from is refuted, or the rule that combined them doesn't hold";
    case "contested":
      return `already in dispute${row?.detail ? ` (${row.detail})` : ""} — it stands or falls on which source holds up`;
    case "named":
      return "the names are in the sources, but this claim about them is not — any source saying otherwise would prove it wrong";
    case "self":
      return "nothing checked this — any source saying otherwise would prove it wrong, and nothing here would notice";
    default:
      return null;
  }
}

/**
 * The falsifiers for one answer.
 *
 *   rows          the per-sentence ground rows (reading-surface.js's shape,
 *                 or the fold's own groundOf results): {sentence, tier,
 *                 addresses, detail}
 *   isCheckable   (sentence) => boolean — grounding.js::extractAtoms-based at
 *                 real call sites; a row whose sentence is not checkable and
 *                 carries no bound claim is skipped (nothing to refute)
 *   checkingOff   the person turned checking off — nothing was held to a source
 *   unchecked     the engine's own groundingGate verdict: no mechanism settled
 *                 the question and no claim bound (proxy-api.mjs)
 *   verbatim      the answer IS the source's own words (a snip / a quote)
 *   computed      a mechanism settled the answer (arithmetic, a puzzle solver)
 *                 and the model's draft was superseded — the rows, if any,
 *                 describe that draft, so they are not read
 *   whatWouldSettle  the void's own named settler, carried verbatim
 *
 * Returns `{ archon, headline, lines, counts, whatWouldSettle }`, or `null`
 * when the answer asserts nothing checkable.
 */
export function falsifiersFor({ rows = [], isCheckable = null, checkingOff = false, unchecked = false, verbatim = false, computed = false, whatWouldSettle = null } = {}) {
  if (computed) {
    return {
      archon: POPPER.handle,
      headline: "This was computed, not generated — it would be wrong only if the question was read wrongly or the method doesn't fit it.",
      lines: [], counts: { total: 0, grounded: 0, contested: 0, open: 0 }, whatWouldSettle: whatWouldSettle ? String(whatWouldSettle).trim() : null,
    };
  }
  const checkable = typeof isCheckable === "function" ? isCheckable : fallbackCheckable;
  const lines = [];
  for (const row of rows ?? []) {
    const sentence = String(row?.sentence ?? "").trim();
    if (!sentence) continue;
    const bound = (row?.boundClaims ?? []).length > 0 || (row?.edges ?? []).length > 0;
    let ok = bound;
    if (!ok) { try { ok = Boolean(checkable(sentence)); } catch { ok = false; } }
    if (!ok) continue;
    const tier = checkingOff ? "self" : (row?.tier ?? "self");
    const falsifier = falsifierFor({ ...row, tier });
    if (!falsifier) continue;
    lines.push({ sentence, tier, falsifier, addresses: [...(row?.addresses ?? [])] });
  }
  const settle = whatWouldSettle ? String(whatWouldSettle).trim() : null;

  if (verbatim) {
    return {
      archon: POPPER.handle,
      headline: "These are a source's own words, cut out unchanged — wrong only if that source is wrong, so check who wrote it.",
      lines, counts: countsOf(lines), whatWouldSettle: settle,
    };
  }
  if (!lines.length) {
    // Nothing checkable asserted. The one exception is the engine's own
    // unchecked verdict on a substantive answer: say it even with no atoms.
    if (!unchecked && !checkingOff) return null;
    return {
      archon: POPPER.handle,
      headline: checkingOff
        ? "Checking is off, so nothing here was held to a source — if any of it is wrong, nothing here would notice."
        : "Nothing settled this and nothing in it was tied to a source — it could be wrong, and nothing here would notice. Check it somewhere else before relying on it.",
      lines, counts: countsOf(lines), whatWouldSettle: settle,
    };
  }
  const counts = countsOf(lines);
  let headline;
  if (checkingOff) {
    headline = "Checking is off, so nothing here was held to a source — if any of it is wrong, nothing here would notice.";
  } else if (counts.grounded === 0 && counts.contested === 0) {
    headline = "Nothing in this answer was checked against a source. Any of it could be wrong and nothing here would notice — check it somewhere else before relying on it.";
  } else if (counts.open === 0 && counts.contested === 0) {
    headline = "Every checkable sentence rests on a source — it would be wrong if those sources are misread, mistaken, or contradicted by another.";
  } else {
    const parts = [];
    if (counts.grounded) parts.push(`${counts.grounded} of ${counts.total} checkable sentence${counts.total === 1 ? "" : "s"} rest${counts.grounded === 1 ? "s" : ""} on a source`);
    if (counts.contested) parts.push(`${counts.contested} ${counts.contested === 1 ? "is" : "are"} already in dispute`);
    if (counts.open) parts.push(`${counts.open} ${counts.open === 1 ? "is" : "are"} the model's own words, and nothing here would catch ${counts.open === 1 ? "it" : "them"} being wrong`);
    headline = `${parts.join("; ")}.`;
    headline = headline.charAt(0).toUpperCase() + headline.slice(1);
  }
  return { archon: POPPER.handle, headline, lines, counts, whatWouldSettle: settle };
}

function countsOf(lines) {
  let grounded = 0, contested = 0, open = 0;
  for (const l of lines) {
    if (GROUNDED.has(l.tier)) grounded += 1;
    else if (l.tier === "contested") contested += 1;
    else open += 1;
  }
  return { total: lines.length, grounded, contested, open };
}

/** The one plain-text line a surface with no reading channel carries (an
 *  OpenAI/Ollama/Anthropic client, a terminal). Separated from the answer by
 *  a blank line and opened with POPPER_MARK, so it reads as the instrument's
 *  disclosure BESIDE the mouth's words, never an edit of them (P186). */
export function popperInline(f) {
  if (!f?.headline) return "";
  const settle = f.whatWouldSettle ? ` What would settle it: ${f.whatWouldSettle}` : "";
  return `${POPPER_MARK} ${POPPER_LEAD} ${f.headline}${settle}`;
}

/** Remove a trailing Popper line (and the blank line before it) from a
 *  message a client resent as history — the disclosure is for the person,
 *  never prompt material for the next turn. Idempotent; text without the
 *  mark comes back unchanged. */
export function stripPopperLine(text) {
  const s = String(text ?? "");
  const i = s.lastIndexOf(`\n\n${POPPER_MARK} ${POPPER_LEAD}`);
  if (i >= 0) return s.slice(0, i).replace(/\s+$/, "");
  return s.startsWith(`${POPPER_MARK} ${POPPER_LEAD}`) ? "" : s;
}
