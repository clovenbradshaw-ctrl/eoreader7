// helix-read.mjs — surprise-driven curiosity, promoted from a validated
// scratchpad prototype into a real module, plus the HELIX loop this
// project's own architecture correction demanded on top of it.
//
// USER CORRECTION THIS FILE IMPLEMENTS, verbatim: "this needs to not be a
// rule about chapter headings. it needs to be a rule about how when there
// is something surprising in an identity set (e.g. monotonic increase) you
// must hunt to minimize surprise and try different senses" / "it needs to
// be triggered by curiosity not 'let's me be sure I get all the chapters
// right'". Nothing below knows what a chapter is. `findSurprise` takes any
// identity set plus a caller's own notion of where its members sit in
// whatever space they live in; the ONLY thing it will ever escalate on is
// a violation of a model the set's OWN regularity earned, never a
// hardcoded convention.
//
// SECOND CORRECTION, on rigor: "remember that we need to use the born
// rule, but it is an experimental question of what we count as void null"
// — no hand-set thresholds. `findSurprise`'s "is this set regular at all"
// question and `hyphenJoinSurprise`'s "did this read explain its own line
// breaks" question are both answered by redealing/reshuffling the SAME
// observed material and asking how often chance alone would look this
// good — never by a tuned constant. `alpha` is the one number here that
// isn't derived from a null (it's the null's own significance cutoff,
// same standing as `findSurprise`'s original `alpha=0.05`), and it is
// named as a parameter, never buried as a magic number in the middle of a
// comparison.
//
// THIRD CORRECTION, the architecture: escalation is a HELIX, not a LADDER.
//   1. The same operation can be revisited at a different grain after the
//      material's own constitution changes — not tried once and retired.
//   2. Termination is MEASURED (surprise stops falling relative to its own
//      null), never structural ("we've tried N senses, stop").
//   3. A turn that measurably makes the reading WORSE is CONCEDED —
//      reverted — never kept because effort was already spent on it.
//   4. The same sense is reusable later at a finer grain (page OCR, then
//      later paragraph OCR on just the still-surprising region).
// `turn`/`settle` below are the new code that encodes this; `findSurprise`
// and `hunt` are PROMOTED, not rewritten, from
// /private/tmp/claude-501/-Users-mlacy-Documents-3-0/10e18e8f-5a2d-4a2e-be59-760fe71f3814/scratchpad/surprise-hunt.mjs
// (an ephemeral, session-scoped path — this is why the logic is moved
// here rather than imported from it).
//
// REQUIRED DISCLOSURE, stated once here and repeated at the call site
// below (`compareSurprise`): the cross-turn "did this turn improve
// things" comparison has NO independently-validated null of its own. It
// reuses the single-pass shuffle/redeal null from `findSurprise` /
// `hyphenJoinSurprise` as a binary clear-or-fail-the-null decision per
// turn. That is a weaker standard than a null purpose-built to ask "is
// turn-over-turn improvement real" (which would need to account for, e.g.,
// look-elsewhere effects across a sequence of turns) — this is a known,
// disclosed limitation, not a claim of equal rigor to the validated
// single-pass statistics it's built from.
//
// GUTTER-DETECTION LESSON, applied here on purpose: this session found
// that Tesseract's own TSV layout output had already solved a column-
// detection question a from-scratch pixel detector was rebuilt four times
// to re-solve. The senses a caller hands to `turn`/`settle` should follow
// the same order of consultation — TSV / cheap structural read before a
// pixel-level fallback, pixel-level fallback before a full CV escalation
// — but that ordering is the CALLER's responsibility (senses are supplied,
// never invented here); this file only enforces that senses are tried in
// the order given and that a worse outcome is conceded.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────
// Shared RNG — identical to the prototype's, kept in one place.
// ─────────────────────────────────────────────────────────────────────────
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PROMOTED, near-verbatim, from surprise-hunt.mjs. See that file's own
// header (reproduced in the block comment above) for the prediction-error
// vs. boundary distinction this exists to protect.
// ─────────────────────────────────────────────────────────────────────────

function modalGap(sorted) {
  const gaps = new Map();
  for (let i = 1; i < sorted.length; i += 1) {
    const g = sorted[i] - sorted[i - 1];
    if (g > 0) gaps.set(g, (gaps.get(g) ?? 0) + 1);
  }
  let best = null, bestN = 0;
  for (const [g, n] of gaps) if (n > bestN) { best = g; bestN = n; }
  return { gap: best, share: sorted.length > 1 ? bestN / (sorted.length - 1) : 0 };
}

// FOUND DEGENERATE — a background agent building a matching implementation
// of this same design caught it empirically (9 synthetic configs, every
// null draw scoring at or above `observed`, p=1 always) and flagged it
// rather than silently "fixing" a function it was told to keep unchanged.
// The bug: this used to re-derive `lo`/`hi` from WHATEVER array it was
// handed, rather than the caller's real observed span. A null draw is a
// random SUBSET of the real span's grid points, and a random subset's own
// tightest bounding range is, on average, SMALLER than the span it was
// drawn from (shrinking further whenever the draw excludes either extreme
// point). Scoring a draw against its own self-derived denominator instead
// of the real one means every draw's own reference frame shrinks exactly
// enough to make it look tight — mechanically inflating every draw's
// occupancy regardless of the real set's own regularity. Two arrays that
// are the SAME SIZE but drawn from different underlying spans are not
// comparable on this statistic at all; they were being compared anyway.
//
// FIXED, THEN FOUND STILL DEGENERATE — a second, deeper problem, worse
// than the first. Sharing one fixed `(lo, span)` between `observed` and
// every null draw (below) was the right call for the denominator — but it
// exposed that OCCUPANCY ITSELF CANNOT VARY once count and span are both
// held fixed, which the null's own construction always does. A draw is
// built by choosing exactly `positions.length` distinct grid points out of
// exactly `span` total grid points; by that construction alone, EVERY
// draw fills exactly `positions.length` of the `span` slots — occupancy
// is just `count/span` again, a constant, carrying no information about
// WHERE the chosen points landed. Comparing a constant to itself always
// gives p=1. Verified directly: a perfectly regular, zero-gap set now
// STILL reports p=1.000 (`/private/tmp/.../scratchpad/verify-null-fix.mjs`)
// — which is wrong on its face, since a gapless set has nothing to be
// surprised about and should clear this trivially.
//
// This is not a threshold problem and it is not fixed by trying harder on
// this same statistic. Traced to the actual real-world case: P&P's own
// 59-of-60 chapters (one heading missed) has only ONE UNIT OF SLACK in
// the whole set — with that little room, no statistic built from gap
// counts or occupancy has anything left to discriminate, because
// whichever single slot goes missing, the resulting shape is
// combinatorially identical. That is a genuine limit on what a redeal
// null can establish when the anomaly is this small relative to the set,
// not a bug to code around.
//
// The honest read: once a caller already trusts `[lo, hi]` at step `gap`
// as the right grid to expect, "which slots inside it are unoccupied" is
// a DETERMINISTIC fact — P&P's missing 46 needs no p-value at all. Where
// a null legitimately belongs is one level up, on a DIFFERENT question
// this file has not yet built: should this set be read as implying a
// uniform grid in the first place. `share` (from `modalGap`, computed
// below and returned as `spacingShare`) is the live, unused candidate for
// that — the fraction of the set's own consecutive gaps that equal the
// modal gap — but it has not been null-tested itself, and doing that
// honestly is real, separate work, not attempted here. Left broken on
// purpose rather than patched a second time without having earned
// confidence in the fix — `regular` below is not currently trustworthy;
// treat any `regular:true` result from this function as unproven until
// this is redesigned.
function occupancy(positionSet, lo, gap, slotCount) {
  if (!gap || !slotCount) return 0;
  let filled = 0;
  for (let i = 0; i < slotCount; i += 1) if (positionSet.has(lo + i * gap)) filled += 1;
  return filled / slotCount;
}

// FIXED, ONE LEVEL UP — the redesign the comment above named as real,
// separate, unattempted work. Independently re-derived and verified
// against a background agent's own investigation, which reached the exact
// same diagnosis and the exact same stopping point (P&P's 59-of-60 case,
// one unit of slack, no slot-count statistic has anything left to
// discriminate) before disclosing `regular` as untrustworthy rather than
// patching a second time without confidence.
//
// The fix is not a better slot-count statistic — `share` was tried next
// (the fraction of consecutive gaps matching the modal gap) and it is
// genuinely non-degenerate for sparse/clustered inputs, but it is STILL
// powerless for the module's actual primary case: 20 trials each at 1
// through 40 randomly-placed holes in a 200-slot run all still returned
// p=1 or close to it. Traced to the same root cause named above, restated
// generally: ANY statistic built from which of a FIXED, SMALL candidate
// set of slots got chosen has too few distinguishable outcomes once the
// candidate set is barely bigger than the member count — this is true of
// occupancy, true of share, and provably true of anything else built the
// same way, because it's a property of the REDEAL being discrete over a
// near-full lattice, not of any one statistic computed on it.
//
// The actual fix: stop discretizing the redeal. The two real endpoints
// (lo, hi) are given — the set really does start and end there — so only
// the interior N-2 members need redealing, and there is no reason they
// have to land on the SAME gap-multiple lattice `occupancy` walks for
// `surprises`/`edges` below. Redealt as CONTINUOUS Uniform(lo, hi) reals
// instead, the null has infinitely many ways to place N-2 points no matter
// how little slack the discrete lattice has — it cannot collapse to a
// forced tie the way a discrete redeal-of-a-near-full-lattice provably
// must. Scored via the coefficient of variation of consecutive gaps
// (stddev/mean — scale-free, with a known real distribution: interior
// spacings of a uniform sample are approximately Exponential, CV≈1; a
// genuinely regular/periodic sequence's gaps cluster tightly near their
// mean, CV≈0). Verified on the real, actual specimen this file's own prior
// comment named: P&P's 59-of-60 chapter numerals (hole at 46) now resolves
// `regular:true`, p=0.001, and correctly reports the surprise at 46. Also
// verified across 20 trials each at 1 through 40 randomly-placed holes in
// a 200-slot run (all 20/20, `native/eval/lavar/find-surprise.test.mjs`)
// and against an adversarial battery (wide random scatter, tightly
// clustered-but-widely-separated triples) that must still correctly fail.
//
// CONTINUITY CORRECTION, found by calibration testing rather than assumed:
// real callers hand this integers (chapter numbers, line numbers) — a
// quantized process with a hard floor on gap size (never below one unit)
// that the null's continuous draws don't share. Left uncorrected, this
// measurably inflates false positives: 900 genuinely-random synthetic
// trials at alpha=0.05 gave 9% "regular" (should be ~5%), traced by
// directly comparing average CV of integer-random data against the null's
// own simulated continuous draws at matching N/domain (integer data ran
// 4-6% lower, purely from the discreteness floor, not from any real
// pattern). Jittering the observed INTERIOR positions by +-half a
// gap-unit before scoring — using the same seeded RNG, so this stays
// reproducible — removes the artificial floor (re-measured at ~4.7% on
// the same battery, within Monte Carlo noise of the 5% target) without
// disturbing a genuinely regular set's low CV, since the jitter is far
// smaller than the spread any real irregularity would produce. The two
// true endpoints are scored unjittered, matching the null, which also
// conditions on them exactly.
function gapsOf(sorted) {
  const gaps = [];
  for (let i = 1; i < sorted.length; i += 1) gaps.push(sorted[i] - sorted[i - 1]);
  return gaps;
}
function coefficientOfVariation(values) {
  const n = values.length;
  if (n === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(variance) / mean;
}

/**
 * @param members    whatever the reading collapsed together
 * @param positionOf member -> a number locating it in the set's own space
 * @param opts       { draws, seed, alpha } — the null, declared not defaulted
 */
export function findSurprise(members, positionOf, { draws = 200, seed = 1, alpha = 0.05 } = {}) {
  const placed = members.map((m) => ({ m, p: positionOf(m) })).filter((x) => Number.isFinite(x.p));
  if (placed.length < 3) return { regular: false, reason: "too few placed members to induce a model", surprises: [], edges: [] };

  const positions = placed.map((x) => x.p).sort((a, b) => a - b);
  const { gap, share } = modalGap(positions);
  if (!gap) return { regular: false, reason: "no positive spacing between members", surprises: [], edges: [] };

  // `lo`/`span` are the ONE reference frame for the discrete lattice —
  // computed once, from the real observed positions — used by `occupancy`
  // (a descriptive stat, and the walk below that finds WHERE the surprises
  // are) but no longer by the regularity decision itself; see the redesign
  // note on occupancy() above for why.
  const lo = positions[0], hi = positions[positions.length - 1];
  const span = Math.max(1, Math.round((hi - lo) / gap) + 1);
  const observed = occupancy(new Set(positions), lo, gap, span);

  // THE NULL — continuous, not discrete (see occupancy()'s own comment for
  // the full derivation of why). Fix the two known endpoints; redeal the
  // interior N-2 members as continuous Uniform(lo, hi) reals; score via
  // coefficient of variation of consecutive gaps. A continuity-corrected
  // jitter is applied to the OBSERVED interior positions before scoring
  // them, since real callers hand this quantized (integer) data being
  // compared against a continuous null.
  const rnd = mulberry(seed);
  const jitterAmt = () => (rnd() - 0.5) * gap;
  const observedForCV = [lo, ...positions.slice(1, -1).map((x) => x + jitterAmt()), hi].sort((a, b) => a - b);
  const observedCV = coefficientOfVariation(gapsOf(observedForCV));

  let atOrBelow = 0;
  const interiorCount = positions.length - 2;
  for (let d = 0; d < draws; d += 1) {
    const drawn = [lo, hi];
    for (let i = 0; i < interiorCount; i += 1) drawn.push(lo + rnd() * (hi - lo));
    drawn.sort((a, b) => a - b);
    if (coefficientOfVariation(gapsOf(drawn)) <= observedCV) atOrBelow += 1;
  }
  const p = (atOrBelow + 1) / (draws + 1);
  const regular = p <= alpha;

  if (!regular) {
    return { regular: false, reason: `regularity indistinguishable from a redeal (p=${p.toFixed(3)}, cv=${observedCV.toFixed(3)})`, observed, gap, p, cv: observedCV, surprises: [], edges: [] };
  }

  const set = new Set(positions);
  const surprises = [];
  for (let q = lo; q <= hi; q += gap) {
    if (set.has(q)) continue;
    const before = placed.filter((x) => x.p < q).sort((a, b) => b.p - a.p)[0] ?? null;
    const after = placed.filter((x) => x.p > q).sort((a, b) => a.p - b.p)[0] ?? null;
    surprises.push({ kind: "prediction-error", position: q, between: [before?.m ?? null, after?.m ?? null] });
  }

  const edges = [
    { kind: "boundary", side: "below", position: lo - gap, neighbour: placed.find((x) => x.p === lo)?.m ?? null },
    { kind: "boundary", side: "above", position: hi + gap, neighbour: placed.find((x) => x.p === hi)?.m ?? null },
  ];

  return { regular: true, gap, spacingShare: share, occupancy: observed, p, cv: observedCV, surprises, edges };
}

/**
 * The hunt. A surprise is handed to each sense IN TURN; the hunt stops as
 * soon as one settles it. Senses are injected — this module has no idea
 * what senses exist, which is what keeps it from becoming a rule about any
 * one medium.
 */
export async function hunt(surprise, senses) {
  const tried = [];
  for (const sense of senses) {
    let out;
    try { out = await sense.look(surprise); }
    catch (err) { tried.push({ sense: sense.name, settled: false, reason: `threw: ${err.message}` }); continue; }
    tried.push({ sense: sense.name, ...out });
    if (out?.settled) return { settled: true, by: sense.name, finding: out, tried };
  }
  return { settled: false, tried };
}

// ─────────────────────────────────────────────────────────────────────────
// hyphenJoinSurprise — generalizes the validated iX-magazine hyphen-join
// statistic into a reusable primitive. Validated numbers this was checked
// against (real specimen, `tesseract img_magazine.png /tmp/psm3 --psm 3`
// vs `--psm 6`): psm3 resolves 6/28 trailing-hyphen line-endings into real
// words against its own line-shuffle null (p≈0.005, 200 shuffles); psm6
// resolves 0/8 and matches its own null 200/200 times (p≈1.000). See this
// module's test harness (helix-read-test.mjs) for the reproduction run and
// its real, current numbers — draw count and seed will not reproduce the
// SAME p-values, only the same qualitative result.
// ─────────────────────────────────────────────────────────────────────────

const LETTER = "\\p{L}";
const TRAILING_HYPHEN_LETTER = new RegExp(`(${LETTER}+)-\\s*$`, "u");
const LEADING_JUNK = /^[\s'"‘’“”"«»\-–—.,:;()[\]|]+/u;
const LEADING_LETTERS = new RegExp(`^(${LETTER}+)`, "u");

function trailingFragment(line) {
  const m = TRAILING_HYPHEN_LETTER.exec(line ?? "");
  return m ? m[1] : null;
}
function leadingFragment(line) {
  const stripped = (line ?? "").replace(LEADING_JUNK, "");
  const m = LEADING_LETTERS.exec(stripped);
  return m ? m[1] : "";
}

// hyphenJoinSurprise's ACTUAL default "is this a real word" oracle is
// makeSelfAttestedIsWord, below: does the joined candidate already appear
// as a token somewhere ELSE in the same document. No external wordlist,
// no language guess — this generalizes to any language the material
// happens to be in, for free, which is exactly why it reproduces the
// validated real result on the German magazine specimen bit-for-bit
// (p=0.004975124378109453, six real joins: "kiinstlicher", "Modellen"
// (twice), "Bericht", "Prozent", "Abfragen") with zero dictionary of any
// kind. Disclosed limitation, distinct from but analogous to a wordlist's
// own weakness on unfamiliar languages: a real word that occurs EXACTLY
// ONCE in the whole document — only at the hyphen break itself — can never
// resolve this way, because there is no second occurrence anywhere else to
// attest it. This under-counts on short or non-repetitive material; it
// does not fabricate matches on any material.
//
// defaultIsWord (an English wordlist at /usr/share/dict/words, checked for
// first per this project's "search for the organ before you write one"
// discipline — no existing wordlist/dictionary resource was found in this
// repo) and makeHunspellIsWord (a real external dictionary, e.g. the
// German one this session found already present on disk) remain here as
// explicit, callable alternatives for material too short or non-repetitive
// for self-attestation to have anything to attest against — pass either as
// `isWord` to opt in.
let _defaultWordlist = null;
function loadDefaultWordlist() {
  if (_defaultWordlist) return _defaultWordlist;
  const candidates = [process.env.HYPHEN_JOIN_WORDLIST, "/usr/share/dict/words"].filter(Boolean);
  for (const p of candidates) {
    try {
      const text = fs.readFileSync(p, "utf8");
      const set = new Set(text.split("\n").map((w) => w.trim().toLowerCase()).filter(Boolean));
      set.__source = p;
      _defaultWordlist = set;
      return set;
    } catch { /* try next candidate */ }
  }
  const empty = new Set();
  empty.__source = null;
  _defaultWordlist = empty;
  return empty;
}

export function defaultIsWord(word) {
  const set = loadDefaultWordlist();
  if (!set.__source) return false;
  return set.has(String(word).toLowerCase());
}
defaultIsWord.warm = () => {}; // Set lookups are already O(1); nothing to precompute.
defaultIsWord.describe = () => {
  const set = loadDefaultWordlist();
  return set.__source
    ? `english wordlist at ${set.__source} (${set.size} entries) — will not usefully discriminate non-English material`
    : "no wordlist found on this machine — every join scored unresolved (conservative default: never fabricates a match)";
};

/**
 * A real dictionary-backed checker via the system `hunspell` binary,
 * following the SAME discipline visual-rec.mjs already established for
 * VISUAL_DETECT_PYTHON: the location of a real external resource is
 * supplied explicitly (never guessed, never silently substituted), and
 * this refuses loudly rather than degrade quietly if it can't find one.
 * `dictBase` is a hunspell dictionary path WITHOUT its .dic/.aff
 * extension — e.g. a real German dictionary this session found already
 * present on disk (bundled with Adobe Acrobat's Hunspell plugin, not
 * anything installed for this task):
 *   "/Library/Application Support/Adobe/Acrobat/DC/Linguistics/Providers/
 *    Plugins2/AdobeHunspellPlugin.bundle/Contents/SharedSupport/
 *    Dictionaries/de_DE/de_DE"
 * `.warm(words)` batches every distinct candidate through ONE hunspell
 * subprocess call (hunspell's own pipe mode accepts one word per line) —
 * required for real use, since a redeal null calls `isWord` thousands of
 * times and a per-call subprocess spawn would make that impractically
 * slow; a naive per-word implementation was tried first and measured at
 * >4000 subprocess spawns for this module's own 30-line-ending test
 * specimen before `.warm` replaced it with one.
 */
export function makeHunspellIsWord(dictBase, { hunspellBin = process.env.HUNSPELL_BIN || "hunspell" } = {}) {
  if (!dictBase) {
    throw new Error(
      "makeHunspellIsWord requires an explicit dictBase (a real .dic/.aff pair, no extension) — " +
      "refusing to guess a system dictionary path, same discipline visual-rec.mjs uses for VISUAL_DETECT_PYTHON."
    );
  }
  const cache = new Map();

  function parseBatch(words, output) {
    const resultLines = output.split("\n").filter((l) => l.length > 0);
    // hunspell's pipe mode emits exactly one non-empty result line per
    // input word, in order (a leading banner line "Hunspell x.y.z" only
    // appears on some builds/invocations — strip it if present).
    const lines = resultLines[0]?.startsWith("Hunspell") ? resultLines.slice(1) : resultLines;
    words.forEach((w, i) => {
      const line = lines[i] ?? "";
      const ok = line.startsWith("*") || line.startsWith("+") || line.startsWith("-");
      cache.set(w, ok);
    });
  }

  function isWord(word) {
    if (!word) return false;
    if (cache.has(word)) return cache.get(word);
    try {
      const out = execFileSync(hunspellBin, ["-d", dictBase, "-i", "utf-8"], { input: word + "\n", encoding: "utf8" });
      parseBatch([word], out);
    } catch {
      cache.set(word, false);
    }
    return cache.get(word) ?? false;
  }

  isWord.warm = (words) => {
    const toQuery = [...new Set(words.filter(Boolean))].filter((w) => !cache.has(w));
    if (!toQuery.length) return;
    try {
      const out = execFileSync(hunspellBin, ["-d", dictBase, "-i", "utf-8"], {
        input: toQuery.join("\n") + "\n",
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      });
      parseBatch(toQuery, out);
    } catch {
      toQuery.forEach((w) => cache.set(w, false));
    }
  };
  isWord.describe = () => `hunspell -d ${dictBase}`;
  return isWord;
}

/**
 * The real default (see the disclosure above `defaultIsWord`): built fresh
 * from the SAME `lines` being analyzed, so it needs no external resource
 * and works in whatever language the material is actually in. Case-folded,
 * split on non-letter runs (Unicode-aware) so it does not need to know
 * this material's own punctuation conventions either.
 */
export function makeSelfAttestedIsWord(lines) {
  const tokens = new Set(
    lines.join(" ").split(/[^\p{L}]+/u).filter(Boolean).map((w) => w.toLowerCase())
  );
  const isWord = (word) => tokens.has(String(word).toLowerCase());
  isWord.warm = () => {}; // Set lookups are already O(1); nothing to precompute.
  isWord.describe = () => `self-attested against this document's own ${tokens.size} distinct tokens (no external dictionary)`;
  return isWord;
}

/**
 * @param lines OCR'd lines, in reading order
 * @param opts  { draws, seed, alpha, isWord } — isWord defaults to
 *              makeSelfAttestedIsWord(lines) (see disclosure above); pass
 *              defaultIsWord or makeHunspellIsWord(...) explicitly for
 *              material too short/non-repetitive to self-attest. draws/
 *              seed/alpha are the null, declared not defaulted to a
 *              hand-tuned value — same standing as findSurprise's alpha.
 */
export function hyphenJoinSurprise(lines, { draws = 200, seed = 1, alpha = 0.05, isWord } = {}) {
  const checkWord = isWord ?? makeSelfAttestedIsWord(lines);
  const n = lines.length;
  const hyphenIdx = [];
  for (let i = 0; i < n; i += 1) if (trailingFragment(lines[i])) hyphenIdx.push(i);

  if (!hyphenIdx.length) {
    return {
      total: 0, resolved: 0, resolvedJoins: [], unresolvedJoins: [],
      regular: false, clearsNull: false, p: null,
      reason: "no trailing-hyphen line-endings in this material",
      wordCheck: checkWord.describe ? checkWord.describe() : "custom isWord",
    };
  }

  // Precompute the full candidate universe ONCE: every hyphen-ending
  // line's fragment crossed with every line's leading fragment (the full
  // population a permutation could ever pair it with), then warm the
  // dictionary in a single batch call rather than one per lookup.
  const frag1ByIdx = hyphenIdx.map((i) => trailingFragment(lines[i]));
  const frag2ByIdx = lines.map((l) => leadingFragment(l));
  const candidateWords = [];
  for (const f1 of frag1ByIdx) for (const f2 of frag2ByIdx) if (f2) candidateWords.push(f1 + f2);
  if (checkWord.warm) checkWord.warm(candidateWords);

  function countResolved(order) {
    // order: an array of line indices in some sequence (identity for the
    // observed pass, a permutation for the null). Returns { count, joins }
    // where joins pairs each hyphen-ending line (by its ORIGINAL index —
    // hyphen-endings are intrinsic to a line's own text, unaffected by
    // reordering) with whichever line the shuffled order placed next.
    const posOfLine = new Map(order.map((origIdx, pos) => [origIdx, pos]));
    const joins = [];
    for (const origIdx of hyphenIdx) {
      const pos = posOfLine.get(origIdx);
      const nextPos = pos + 1;
      if (nextPos >= order.length) { joins.push({ line: origIdx, next: null, joined: null, resolved: false }); continue; }
      const nextOrigIdx = order[nextPos];
      const f1 = trailingFragment(lines[origIdx]);
      const f2 = frag2ByIdx[nextOrigIdx];
      if (!f2) { joins.push({ line: origIdx, next: nextOrigIdx, joined: f1, resolved: false }); continue; }
      const joined = f1 + f2;
      const resolved = checkWord(joined);
      joins.push({ line: origIdx, next: nextOrigIdx, joined, resolved });
    }
    return { count: joins.filter((j) => j.resolved).length, joins };
  }

  const identityOrder = lines.map((_, i) => i);
  const { count: observedCount, joins: observedJoins } = countResolved(identityOrder);

  const rnd = mulberry(seed);
  let atOrAbove = 0;
  for (let d = 0; d < draws; d += 1) {
    const shuffled = identityOrder.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const { count } = countResolved(shuffled);
    if (count >= observedCount) atOrAbove += 1;
  }
  const p = (atOrAbove + 1) / (draws + 1);
  const clearsNull = p <= alpha;

  return {
    total: hyphenIdx.length,
    resolved: observedCount,
    resolvedJoins: observedJoins.filter((j) => j.resolved),
    unresolvedJoins: observedJoins.filter((j) => !j.resolved),
    regular: clearsNull, // named to match findSurprise's "regular" field for measure()'s dispatcher
    clearsNull,
    p,
    draws,
    alpha,
    wordCheck: checkWord.describe ? checkWord.describe() : "custom isWord",
  };
}

// ─────────────────────────────────────────────────────────────────────────
// The library — stream-conventions.json, sitting beside this file.
// Modeled on heading-conventions.json's own shape and structure-rec.mjs's
// tier1 consult-first pattern, but the match key is deliberately simpler
// than an earlier draft of this file used: a SIGNATURE, not a fuzzy
// multi-field "shape" comparison. `signatureOf(ground, statisticName)` is
// `` `${statisticName}::${ground.sourceId}` `` — source-scoped on purpose
// (a caller-declared `sourceId`, e.g. an image path plus which OCR pass
// produced these lines). This is deliberately narrow: it answers "have we
// resolved THIS EXACT source before", not "does this look like a shape
// we've handled" — the latter is real, harder, unbuilt future work (see
// this file's own header on locality/regime-matching for why a fuzzier
// match needs its own null before it can be trusted, same as everything
// else in this module).
//
// What gets cached is the ACTUAL RESOLVED RESULT (e.g. the corrected
// `lines`), not "which sense to call again" — the whole point is that a
// reread costs nothing further once the expensive escalation has already
// paid for itself once, matching this session's own request: "in the
// future when we get a stream which has a certain shape... it triggers
// those same reading rules so we don't need to do computer vision this
// time." `turn()` ALWAYS persists a successful sense-driven resolution to
// this canonical on-disk file (merged in by signature, never clobbering
// unrelated entries), regardless of whether the caller also passed its own
// in-memory `library` option — the disk copy is the shared, durable
// record; an in-memory `library` object is only for a caller's own
// synchronous bookkeeping within one process.
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_LIBRARY_PATH = path.join(HERE, "stream-conventions.json");

function statisticNameFor(kind) {
  if (kind === "stream") return "hyphen-join";
  if (kind === "identity-set") return "identity-set";
  return null;
}

export function signatureOf(ground, statisticName) {
  return `${statisticName}::${ground?.sourceId ?? "unknown-source"}`;
}

function readDiskLibrary() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DEFAULT_LIBRARY_PATH, "utf8"));
    if (Array.isArray(parsed?.conventions)) return parsed;
  } catch { /* missing, unreadable, or pre-dates this schema — treat as empty */ }
  return {
    _disclosure:
      "A growing, disclosed, source-scoped record of stream-shaped reading problems this helix loop has " +
      "actually resolved against real material — modeled on heading-conventions.json's own provenance " +
      "discipline. Each entry names the exact source signature that needed escalation, the resolved result, " +
      "and which sense found it. See helix-read.mjs's own header for signatureOf()'s exact key.",
    conventions: [],
  };
}

function writeDiskLibrary(lib) {
  fs.writeFileSync(DEFAULT_LIBRARY_PATH, JSON.stringify(lib, null, 2) + "\n");
}

/** The canonical, on-disk, shared library — always current, always source-scoped. */
export function loadLibrary() {
  return readDiskLibrary();
}

function persistResolution(signature, entry) {
  const disk = readDiskLibrary();
  const idx = disk.conventions.findIndex((c) => c.signature === signature);
  if (idx >= 0) disk.conventions[idx] = entry; else disk.conventions.push(entry);
  writeDiskLibrary(disk);
}

// ─────────────────────────────────────────────────────────────────────────
// turn / settle — the helix loop itself.
//
// A `ground` is whatever the reading currently believes, plus enough to
// measure it:
//   { kind: "identity-set", members, positionOf, surpriseOpts, sourceId?, ... }
//   { kind: "stream", lines, image?, surpriseOpts, sourceId?, failedAttempts?, ... }
// `sourceId` is what library lookups key on (see signatureOf above) —
// optional; without it, library consultation is simply skipped for that
// ground. `failedAttempts` (an array of sense names) lives ON the ground
// itself, not in a side table, so a sense's own eligibility travels with
// whatever ground it was actually tried against — the mechanism that
// keeps this a HELIX: once an accepted turn genuinely changes the ground,
// `failedAttempts` is cleared on the new ground, so a sense that failed
// against the OLD constitution is eligible again against the new one.
//
// A `sense` is { name, async look(surprise, ground) => { settled, ground } }.
// `look` PROPOSES a candidate ground; it does not get to decide whether
// that candidate is accepted — `turn()` independently re-measures the
// candidate and compares it to the pre-turn reading via `compareSurprise`.
// This is deliberate: a sense that lies about `settled` (or is simply
// wrong) is still caught, because acceptance is never based on what the
// sense claims, only on what the statistic says before and after.
// ─────────────────────────────────────────────────────────────────────────

function measure(ground) {
  if (ground.kind === "identity-set") {
    const raw = findSurprise(ground.members, ground.positionOf, ground.surpriseOpts ?? {});
    const unresolved = raw.regular ? raw.surprises.filter((s) => s.kind === "prediction-error").length : null;
    return { clearsNull: raw.regular, p: raw.p ?? 1, unresolved, raw };
  }
  if (ground.kind === "stream") {
    const raw = hyphenJoinSurprise(ground.lines, ground.surpriseOpts ?? {});
    const unresolved = raw.total > 0 ? raw.total - raw.resolved : null;
    return { clearsNull: raw.clearsNull, p: raw.p ?? 1, unresolved, raw };
  }
  throw new Error(`measure: unknown ground.kind "${ground.kind}"`);
}

/**
 * Compare a before/after surprise reading. See this file's header for the
 * required disclosure: this comparison reuses each statistic's OWN
 * single-pass null as a binary clear/fail signal per turn — it is not
 * itself a null purpose-built for "is turn-over-turn improvement real."
 */
export function compareSurprise(before, after) {
  if (before.unresolved === null && after.unresolved === null) {
    if (after.p < before.p) return { improved: true, reason: `neither reading beats its null yet, but p moved toward significance (${before.p.toFixed(3)} -> ${after.p.toFixed(3)}) — weak signal, disclosed` };
    return { improved: false, reason: "neither reading establishes a real (null-beating) model yet — no basis to call this an improvement" };
  }
  if (after.clearsNull && !before.clearsNull) {
    return { improved: true, reason: `reading now beats its own null (p=${after.p.toFixed(3)}) where it didn't before (p=${before.p.toFixed(3)})` };
  }
  if (before.clearsNull && !after.clearsNull) {
    return { improved: false, reason: `reading no longer beats its own null (p ${before.p.toFixed(3)} -> ${after.p.toFixed(3)}) — regression` };
  }
  if (after.clearsNull && before.clearsNull) {
    if (after.unresolved < before.unresolved) return { improved: true, reason: `unresolved count fell ${before.unresolved} -> ${after.unresolved}` };
    if (after.unresolved > before.unresolved) return { improved: false, reason: `unresolved count rose ${before.unresolved} -> ${after.unresolved}` };
    if (after.p < before.p) return { improved: true, reason: `same unresolved count, null-clearance strengthened (p ${before.p.toFixed(3)} -> ${after.p.toFixed(3)})` };
    return { improved: false, reason: "no measurable change" };
  }
  return { improved: false, reason: "no measurable change" };
}

/**
 * One helix turn. Order of consultation: (1) is `ground` already settled —
 * if so, do nothing, there is nothing to escalate for; (2) does the shared
 * library already hold a resolved result for this EXACT source — if so,
 * apply it directly (no sense needed) and independently re-measure before
 * trusting it (a stale cached entry is conceded, not blindly reapplied);
 * (3) try the first still-eligible sense (one whose name is not already in
 * `ground.failedAttempts`), propose a candidate, and independently
 * re-measure it — accept only if `compareSurprise` says it's genuinely
 * better, concede (revert, record the failure on the ground) otherwise.
 */
export async function turn(ground, senses, { library } = {}) {
  const before = measure(ground);
  if (before.clearsNull) {
    return { moved: false, conceded: false, ground, before, after: before, reason: "already settled" };
  }

  const statistic = statisticNameFor(ground.kind);
  const canUseLibrary = Boolean(statistic && ground.sourceId);
  const lib = library ?? (canUseLibrary ? readDiskLibrary() : null);
  const signature = canUseLibrary ? signatureOf(ground, statistic) : null;

  if (canUseLibrary && lib) {
    const hit = lib.conventions?.find((c) => c.signature === signature);
    if (hit) {
      const candidateGround = { ...ground, lines: hit.lines, failedAttempts: [] };
      const after = measure(candidateGround);
      const cmp = compareSurprise(before, after);
      if (cmp.improved) {
        return {
          moved: true, conceded: false, ground: candidateGround, before, after,
          via: { source: "library", signature, foundVia: hit.foundVia ?? null },
          reason: `resolved from the library — this exact source was already resolved via "${hit.foundVia}"`,
        };
      }
      return {
        moved: false, conceded: true, ground, before, after,
        via: { source: "library", signature, stale: true },
        reason: `library-recorded fix did not improve THIS reading (${cmp.reason}) — stale entry, not trusted blindly`,
      };
    }
  }

  const failed = new Set(ground.failedAttempts ?? []);
  const eligible = senses.filter((s) => !failed.has(s.name));
  if (!eligible.length) {
    return { moved: false, conceded: false, ground, before, after: before, reason: "no sense produced a candidate" };
  }

  const sense = eligible[0];
  let proposal;
  try {
    proposal = await sense.look(before.raw, ground);
  } catch (err) {
    proposal = { settled: false, ground, reason: `sense threw: ${err.message}` };
  }
  const candidateGround = proposal?.ground ?? ground;
  const after = measure(candidateGround);
  const cmp = compareSurprise(before, after);

  if (!cmp.improved) {
    const reverted = { ...ground, failedAttempts: [...(ground.failedAttempts ?? []), sense.name] };
    return { moved: false, conceded: true, ground: reverted, before, after, reason: cmp.reason };
  }

  const settledGround = { ...candidateGround, failedAttempts: [] };
  if (canUseLibrary) {
    const entry = {
      signature, sourceId: ground.sourceId, foundVia: sense.name,
      lines: settledGround.lines, foundAt: new Date().toISOString().slice(0, 10),
    };
    if (library) library.conventions.push(entry); // caller's own in-memory object — immediate, synchronous visibility
    persistResolution(signature, entry); // the canonical, shared, on-disk copy — ALWAYS, independent of the option above
  }

  return { moved: true, conceded: false, ground: settledGround, before, after, via: { source: "sense", name: sense.name }, reason: cmp.reason };
}

/**
 * The outer helix loop. Calls turn() until the ground is already settled
 * at the top of an iteration (MEASURED termination — the intended stop) or
 * a turn() call reports it could do NOTHING at all — no eligible sense,
 * no library hit ("senses-exhausted-at-this-ground-state" — a real,
 * distinct stop, not a fallback). `maxTurns` is a hard SAFETY BACKSTOP,
 * never the intended termination condition, and is reported as such.
 *
 * HELIX not ladder: `failedAttempts` lives on the ground, not in a
 * separate bookkeeping table here — so the moment an ACCEPTED turn
 * genuinely changes the ground's own lines (`turn()` clears
 * `failedAttempts` on any accepted candidate), every sense — including one
 * that just failed against the OLD constitution — is eligible again
 * against the new one, with no extra logic needed in this loop. What this
 * loop does NOT do on its own: automatically narrow a finer-grained retry
 * to just the still-surprising region — that information is available to
 * a sense's own `look` (via `before.raw`/`after.raw`, which carry the
 * actual unresolved joins / surprise positions), but composing "retry, but
 * only on the suspect part" is the sense's job, not this loop's. Disclosed
 * gap, not silently assumed away.
 */
export async function settle(ground, senses, { library, maxTurns = 12 } = {}) {
  let current = ground;
  let turns = 0;
  let stoppedBy = null;
  const trace = [];

  while (turns < maxTurns) {
    if (measure(current).clearsNull) { stoppedBy = "settled"; break; }

    const result = await turn(current, senses, { library });
    current = result.ground;

    if (!result.moved && !result.conceded) {
      stoppedBy = "senses-exhausted-at-this-ground-state";
      break;
    }

    turns += 1;
    trace.push({ turn: turns, moved: result.moved, conceded: result.conceded, via: result.via ?? null, reason: result.reason });
  }

  if (!stoppedBy) stoppedBy = "maxTurns-backstop (safety limit reached — NOT the intended termination condition)";
  const settled = measure(current).clearsNull;
  return { ground: current, trace, turns, settled, stoppedBy };
}

// ─────────────────────────────────────────────────────────────────────────
// makeVisionSense — the concrete vision-escalation sense for a "stream"
// ground backed by a real source image: re-reads `ground.image` via
// Tesseract's own TSV layout output at a DIFFERENT --psm than whatever
// produced the current (surprising) lines, reconstructing lines by
// block/paragraph/line grouping — the SAME organ this session's own
// gutter-detection work found already solved column recovery, reused here
// rather than a from-scratch pixel detector. `psm=3` (Tesseract's automatic
// page-segmentation mode, real column-aware layout analysis) is the
// concrete, validated escalation target for the real specimen this module
// was built against (a forced-linear `--psm 6` read failing to explain its
// own line breaks); a caller reading different material is free to build
// its own sense with a different candidate psm — this file does not decide
// senses for a caller, only how a proposed candidate gets judged.
// ─────────────────────────────────────────────────────────────────────────

function tsvLinesFromImage(image, psm, { tesseractBin } = {}) {
  const bin = tesseractBin || process.env.TESSERACT_BIN || "tesseract";
  const out = execFileSync(bin, [image, "stdout", "--psm", String(psm), "tsv"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  const rows = out.split("\n").filter(Boolean);
  const header = rows[0].split("\t");
  const words = rows.slice(1)
    .map((line) => {
      const cols = line.split("\t");
      const o = {};
      header.forEach((h, i) => { o[h] = cols[i]; });
      return o;
    })
    .filter((r) => r.level === "5" && r.text && r.text.trim());
  const order = [];
  const byLine = new Map();
  for (const w of words) {
    const key = `${w.block_num}.${w.par_num}.${w.line_num}`;
    if (!byLine.has(key)) { byLine.set(key, []); order.push(key); }
    byLine.get(key).push(w.text);
  }
  return order.map((k) => byLine.get(k).join(" "));
}

export function makeVisionSense({ psm = 3, tesseractBin, name } = {}) {
  return {
    name: name ?? `vision-tsv-relayout(psm${psm})`,
    async look(_surprise, ground) {
      if (!ground.image) {
        return { settled: false, ground, reason: "no image on this ground — vision escalation needs a source image to re-read" };
      }
      let lines;
      try {
        lines = tsvLinesFromImage(ground.image, psm, { tesseractBin });
      } catch (err) {
        return { settled: false, ground, reason: `tesseract invocation failed: ${err.message}` };
      }
      return {
        settled: true,
        ground: { ...ground, lines, sourceId: `${ground.image}::psm${psm}(column-aware-tsv)` },
      };
    },
  };
}
