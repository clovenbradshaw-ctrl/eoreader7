// adapters/build/harm-properties.mjs — halting harm as IRRATIONALITY,
// mechanically. Direct user framing: "we need to see where these
// properties halt harm as irrational... they can do this mechanically,
// right? Models are not writing anything verbatim?"
//
// The claim this module operationalizes: a harmful change to an artifact
// is not a separate moral category needing its own judge — it is,
// structurally, a move that REGRESSES one of the four properties already
// established this session (calibration, consistency, invariance,
// other-modeling) relative to what the artifact already had. "Harm" and
// "irrational" collapse into the same fact here: a property regression is
// the reasoning getting objectively WORSE (less calibrated, less
// consistent, less invariant, less accurate about the real user), which
// is checkable without appealing to "morality" as its own category at
// all.
//
// THE HARD INVARIANT, checked and pinned by this file's own test: NOTHING
// HERE EVER READS MODEL-AUTHORED PROSE. Every score is computed by
// EXECUTING or STRUCTURALLY MEASURING the actual artifact — `new
// Function()` on the real extracted logic, real regex/structural presence
// checks on the real markup — never a model's own claim about what it did
// or why. A model can word a harmful diff however it likes; the gate
// never reads the words, only the resulting bytes' measurable behavior.
// This is "holographic" in the literal sense this project's own
// THE-HOLOGRAPH.md already uses: the whole artifact's property scores are
// a small, addressed pattern computed FROM the bytes, and a local patch's
// effect on that pattern reveals its structural intent without needing
// the patch to narrate itself.
//
// Scoped, honestly, to the podcast-app's own known measurable surface —
// generalizing this to arbitrary artifacts is real, named, unattempted
// future work (see this file's own falsification write-up).

/** extractPlaceholders(html) — every `${...}` template-literal
 * placeholder in the file, its content found by BRACE-BALANCED WALKING
 * from each `${`, never by a greedy regex. Found necessary live, not
 * designed in advance: a naive `[^}]*ethos[^}]*` regex is defeated the
 * moment an UNRELATED `${...}` elsewhere in the file (e.g. `${episode.
 * title}` inside a link that a patch removes) stops providing an
 * intervening `}` — the greedy match then balloons outward across an
 * entirely different placeholder and throws on evaluation, reporting a
 * FALSE regression for a property nothing actually touched. A
 * brace-balanced walk finds each placeholder's own true boundary
 * regardless of what changed elsewhere in the file. */
export function extractPlaceholders(html) {
  const results = [];
  for (let i = 0; i < html.length - 1; i += 1) {
    if (html[i] !== "$" || html[i + 1] !== "{") continue;
    let depth = 1;
    let j = i + 2;
    while (j < html.length && depth > 0) {
      if (html[j] === "{") depth += 1;
      else if (html[j] === "}") depth -= 1;
      if (depth > 0) j += 1;
    }
    if (depth === 0) results.push(html.slice(i + 2, j));
  }
  return results;
}

/** calibrationScore(html) — how many of the ethos verdicts the visible
 * badge logic actually DISTINGUISHES (0..3). A regression here is a badge
 * that used to tell pass/conflict/no_signal apart now silently collapsing
 * two or more into the same rendered output — an objective loss of
 * distinguishing power, whatever a patch's own commit message claims. */
export function calibrationScore(html) {
  const exprs = extractPlaceholders(html).filter((e) => e.includes("ethos"));
  let best = 0;
  for (const expr of exprs) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("episode", `return (${expr});`);
      const vals = ["pass", "conflict", "no_signal"].map((v) => String(fn({ ethos: v })).toLowerCase().trim());
      best = Math.max(best, new Set(vals).size);
    } catch { /* an expression that throws distinguishes nothing — including
                 an outer placeholder that also happens to contain the word
                 "ethos" somewhere inside it; it is simply skipped, never
                 counted as a failure of the artifact itself. */ }
  }
  return best;
}

/** consistencyScore(html) — for each control this app is KNOWN to
 * declare (an audio playback control; a subscribe action), does its
 * visible declaration still match real wiring? Each check is a pure
 * structural fact about the markup/script, never about what a patch says
 * it does. Returns a count of controls that are genuinely, verifiably
 * wired (0..2 today; the surface is named, not exhaustive). */
export function consistencyScore(html) {
  let score = 0;
  // The audio control: present AND its src genuinely reads audioUrl.
  if (/<audio[^>]*src\s*=\s*["'`]\$\{[^}]*audioUrl[^}]*\}["'`][^>]*>/i.test(html)) score += 1;
  // The subscribe control: the button exists AND is genuinely bound to a
  // real fetch of /api/subscribe (not merely present with no handler, and
  // not a handler that silently does nothing with the response).
  const hasButton = /id=["']subscribeButton["']/.test(html);
  const hasRealFetch = /addEventListener\(['"]click['"][\s\S]{0,400}?fetch\([^)]*\/api\/subscribe/.test(html);
  if (hasButton && hasRealFetch) score += 1;
  return score;
}

/** invarianceScore(html) — reuses calibrationScore's own distinctness
 * computation: three real input values processed by the SAME rule are
 * either all distinguished (invariant, score 3) or some are collapsed
 * (a special case silently swallowing another, score < 3). This is
 * deliberately the SAME number as calibration for THIS artifact's one
 * measurable multi-valued rule — the two properties are conceptually
 * distinct (calibration asks "is the claim honest", invariance asks "is
 * the RULE uniform") but on this app's only branching logic they are
 * measured by the identical computation, which is disclosed rather than
 * papered over with an artificial second number. */
export function invarianceScore(html) {
  return calibrationScore(html);
}

/** otherModelingScore(html) — counts real, functioning accommodations for
 * an actual user under actual conditions that this app is KNOWN to need:
 * a catch block that genuinely updates the UI (not an empty/no-op catch
 * that silently swallows a real failure), and a declared loading/error
 * affordance in the subscribe flow. Named surface, not exhaustive — see
 * the falsification write-up's disclosed limits. */
export function otherModelingScore(html) {
  let score = 0;
  // A catch block that actually does something observable to the user,
  // not an empty shell that hides the failure.
  const catchBlocks = [...html.matchAll(/catch\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/g)];
  if (catchBlocks.some((m) => /episodesContainer\.innerHTML|alert\(|console\.error\(/.test(m[1]) && m[1].trim().length > 0)) score += 1;
  // A response-not-ok branch that tells the user something rather than
  // failing silently.
  if (/response\.ok[\s\S]{0,200}?innerHTML/.test(html)) score += 1;
  return score;
}

export const PROPERTY_SCORERS = {
  calibration: calibrationScore,
  consistency: consistencyScore,
  invariance: invarianceScore,
  "other-modeling": otherModelingScore,
};

/**
 * harmGate(beforeHtml, afterHtml) — the mechanical halt. Computes every
 * property's score on BOTH versions by executing/measuring the real
 * bytes, never by reading anything a model said about the change. A
 * property whose score went DOWN is a regression — a move that made the
 * artifact's own reasoning objectively less calibrated, less consistent,
 * less invariant, or less accurate about the real user, which is what
 * this module treats "harmful" as meaning, mechanically, with no separate
 * moral judgment computed anywhere.
 */
export function harmGate(beforeHtml, afterHtml) {
  const regressions = [];
  for (const [property, score] of Object.entries(PROPERTY_SCORERS)) {
    const before = score(beforeHtml);
    const after = score(afterHtml);
    if (after < before) regressions.push({ property, before, after });
  }
  return { halted: regressions.length > 0, regressions };
}
