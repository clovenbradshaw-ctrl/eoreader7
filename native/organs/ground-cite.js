// native/organs/ground-cite.js — A CLAIM'S GROUND, EARNED AS A REAL CITATION
// (2026-09-22). The user: "wire into the reasoning engine claude code is
// using a grounding functionality where we can see the proper sources for
// what it is" — then "we need proper citations that are clickable to
// sources." cli/reason.mjs GFP-lints a claim SET for internal consistency
// (do the claims agree with each other) but never checks a claim's own
// `ground` against real bytes — reason.mjs's own header and
// feedback_reason_through_eoreader7 both name this plainly: "ground
// citations to files/line-numbers are never fact-checked by this tool —
// only Read/Grep verify those." This organ closes that gap, reusing what
// this repo already built and tested for exactly this move rather than
// re-deriving a weaker one (CAPACITIES doctrine):
//
//   source.js::chunkSource  — a file, addressed: byte-ranged passages, each
//                             carrying its own `ref` ("path#start-end").
//   cite.js::attribute      — the SAME statistical citer this repo uses to
//                             attach a real address to a model's prose: a
//                             phrase must beat both a minimum overlap AND a
//                             null-corpus floor (bestRival) — never a bare
//                             keyword match. Feeding it a claim's own words
//                             against chunks of the file its `ground` names
//                             is the identical move, one caller over.
//
// What is added here is small: resolving a GFP ground (which may be a CODE
// SCOPE, "/abs/path/file.js/functionName", or a non-filesystem address like
// text-mode's "/p3") down to the real file on disk it names, and turning a
// byte-range ref into a LINE number and a file:// URL a terminal or editor
// can actually open — cite.js's own refs are byte-addressed, never line-
// addressed, because line numbers are not what a passage's span IS; a
// citation meant for a human to click needs both.
//
// Pure-ish: fs reads only (real files, real bytes), no model, no network.
// The one exception is commit-ref grounds (below): those shell out to git,
// the actual source of truth for "did this happen," with argv arrays only
// — never a shell string a hash could inject into.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { holon, ancestry } from "../kernel/gfp-claim.js";
import { chunkSource, tokenize } from "./source.js";
import { attribute } from "./cite.js";

// A citation walks real bytes; a file past this is a typed decline, not a
// multi-second read+chunk+attribute pass on every reasoning turn.
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The real file a ground names, resolving a CODE SCOPE down to the file it
 * is a scope inside of: the LONGEST ancestor of the ground's own holon that
 * is an actual file on disk (gfp-claim.js::ancestry, walked deepest-first).
 * No filesystem entry is ever named "functionName" as a child of a .js
 * file, so a scoped ground never matches at its own full depth and this
 * walk finds the file one or more segments up. The filesystem root ("/")
 * is never returned — it is not a claim's ground merely because holon
 * containment says everything sits under it.
 */
export function resolveGroundFile(ground) {
  const chain = ancestry(holon(ground)).slice().reverse(); // deepest first, "/" last
  for (const h of chain) {
    if (h === "/") return null;
    try {
      if (fs.statSync(h).isFile()) return h;
    } catch {
      /* not there at this depth — keep walking up */
    }
  }
  return null;
}

/**
 * Does this ground even LOOK like a filesystem path, independent of whether
 * one currently exists there? An absolute path of some real depth ("/p3" is
 * depth 1 and is text-mode's own paragraph-addressing convention, disclosed
 * in reason.mjs's header — never a file). Used only to decide whether a
 * ground that resolved to no file is worth a finding ("missing" — you
 * addressed a real place and nothing is there) or is simply not a
 * filesystem address at all ("unaddressed" — nothing to check here, not a
 * failure of anything).
 */
export function looksLikeFilePath(ground) {
  const h = holon(ground);
  return h.startsWith("/") && h.split("/").filter(Boolean).length >= 3;
}

/** 1-based line number of a byte offset, by counting newlines up to it —
 *  what a terminal or editor actually navigates to; cite.js's own refs are
 *  byte-addressed, which nothing clickable understands. */
function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

// ── EVENT CLAIMS: "committed as X" is not a file claim ─────────────────────
// A claim like "commit bb97e4b contains exactly these six files" has its
// own real, checkable ground — but the ground is git's history, not a byte
// range in a file, and a claim like this used to come back `ground_missing`
// (measured live, 2026-09-23: "no file exists at this ground — expected if
// this turn is CREATING /git/archon-holocracy/8582fff"), which is a category
// error: nothing was ever going to be a file there. `commit:<repo>#<hash>`
// is an explicit, DECLARED convention (never sniffed from a bare-looking hex
// string, which risks a false match) — the same `path#ref` shape every other
// ground in this file already uses, one register over.
//
// Why git itself, not a relation-reader pass over the commit message: tried
// that path first for a broader "event claims" check (hypergraph.js's
// engineRelationsFor) and measured it dead for this material before writing
// any of this — 0 relations on this very file's own header, 0 on a plain
// claim sentence, and the one file that returned anything gave only shallow
// copulas, never a verb relation that could tell "supports" from
// "contradicts." Git needs none of that: a commit either exists or it
// doesn't, and `--stat` gives real, structured file/line counts with zero
// NLP. Structural only, same rule as everything else here: the commit
// MESSAGE's free text is never read back, only file paths and counts.
//
// THE FORMAT IS "/commit/<repo-abs-path>#<hash>", not "commit:<repo>#<hash>".
// Measured live, 2026-09-23: gfp-claim.js's own gfpClaim() unconditionally
// runs every ground through holon(), which prepends "/" to anything not
// already absolute — silently turning "commit:/Users/..." into
// "/commit:/Users/...#hash" and breaking a "^commit:" anchor before this
// function ever saw the string. "/commit" plus an already-absolute repo
// path collapses through that SAME holon() cleanly (its own segment filter
// drops the doubled slash), so this format survives the constructor every
// claim already goes through instead of fighting it.
const COMMIT_REF_RE = /^\/commit\/(.+)#([0-9a-f]{7,40})$/i;

export function looksLikeCommitRef(ground) {
  return COMMIT_REF_RE.test(String(ground ?? ""));
}

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/**
 * citeCommit(repo, hash) — does this commit exist in this repo, and what did
 * it actually touch? `cat-file -e` is the existence check (git's own, not
 * reimplemented); `--stat --name-only` gives the real file list and
 * insertion/deletion counts. Never reads the commit MESSAGE body — only
 * structural facts (files touched, lines changed), the same discipline the
 * file-citation path holds for a file's own prose.
 */
export function citeCommit(repo, hash) {
  if (!fs.existsSync(repo) || !fs.existsSync(`${repo}/.git`)) {
    return { verdict: "missing", detail: `${repo} is not a real git repository` };
  }
  try {
    git(repo, ["cat-file", "-e", hash]);
  } catch {
    return { verdict: "missing", detail: `no commit ${hash} in ${repo}` };
  }
  let files = [], stat = "";
  try {
    files = git(repo, ["show", "--name-only", "--format=", hash]).split("\n").filter(Boolean);
    stat = git(repo, ["show", "--stat", "--format=", hash]).trim().split("\n").pop() ?? "";
  } catch { /* existence already confirmed; a stat failure just leaves these empty, disclosed by their own emptiness */ }
  return { verdict: "event", repo, hash, files, stat };
}

/** A file:// URL a terminal (OSC 8) or editor can open at the right line. */
export function fileUrl(absPath, line) {
  return `file://${absPath}${line ? `#L${line}` : ""}`;
}

/** OSC 8: a real clickable hyperlink in any terminal that supports it: no-op
 *  (prints as plain surrounding escapes, invisible) in ones that don't — safe
 *  to always emit, never a fallback branch to maintain. */
export function terminalLink(label, url) {
  return `\u001b]8;;${url}\u0007${label}\u001b]8;;\u0007`;
}

/**
 * citeGround(claim, said) — earn a real, byte-addressed, line-numbered
 * citation for one declared claim: the SAME attribution test cite.js uses
 * for a model's prose, run on the claim's own words against chunks of the
 * file its own `ground` names.
 *
 * Returns one of five typed verdicts — never a bare boolean, because
 * "nothing here confirms it" and "there was nothing addressable to check"
 * are different facts (the same distinction checkGrounding's own
 * examined/clean split makes, one level up):
 *
 *   "cited"        a real chunk of the file earned the citation (attribute()
 *                  returned a ref, beating both the overlap floor and the
 *                  null-corpus floor). `file`, `line`, `url`, `excerpt`.
 *   "unattributed" the file is real, but the claim's own words do not beat
 *                  chance against it — the address exists; nothing here
 *                  confirms THIS claim's content is actually there.
 *   "missing"      the ground looks like a real path (looksLikeFilePath) but
 *                  nothing resolves — expected for a file this very turn is
 *                  about to create; otherwise the address may be wrong.
 *   "unaddressed"  the ground is not a filesystem path at all (a text-mode
 *                  paragraph address like "/p3", or any other non-file
 *                  scheme) — not a failure of anything, simply out of this
 *                  check's reach.
 *   "unreadable" / "too_large"  the file exists but could not be read.
 *
 * KNOWN LIMIT, disclosed rather than hidden: attribute()'s null floor
 * (bestRival) is a real statistical test, and like any such test it needs a
 * corpus to be meaningful — a very short file chunks to very few passages,
 * and "common terms" computed over a one-chunk corpus can degrade toward
 * "everything in it," pushing scores down. Measured against this repo's own
 * files in ground-cite.test.js; not assumed.
 */
// A run reasoning about hundreds of claims routinely grounds many of them
// at the SAME file — a shared header, a shared module. Without this, every
// one of those claims re-read and re-chunked that file from scratch
// (confirmed empty before this: no cache existed anywhere in this module).
// Keyed by the resolved absolute path, scoped to this process's lifetime —
// each CLI invocation is a fresh process, so there is no cross-run
// staleness to guard against; a file edited mid-run (rare, and already a
// race against anything else reading it) is the one disclosed edge this
// does not chase.
const _fileCache = new Map();
function readAndChunk(file) {
  if (_fileCache.has(file)) return _fileCache.get(file);
  let result;
  try {
    const size = fs.statSync(file).size;
    if (size > MAX_BYTES) result = { tooLarge: true, size };
    else {
      const body = fs.readFileSync(file, "utf8");
      result = { body, chunks: chunkSource(file, body) };
    }
  } catch (e) {
    result = { unreadable: true, detail: e.message };
  }
  _fileCache.set(file, result);
  return result;
}

export function citeGround(claim, said) {
  const text = [claim.rel, ...Object.values(claim.roles ?? {}), said].filter(Boolean).join(" ");
  const commitMatch = COMMIT_REF_RE.exec(String(claim.ground ?? ""));
  if (commitMatch) {
    // The matched repo segment lost its own leading "/" to holon()'s
    // collapse (see this constant's own header) — restored here, the one
    // place that reconstruction needs to happen.
    const [, repoSegment, hash] = commitMatch;
    return { ground: claim.ground, ...citeCommit(`/${repoSegment}`, hash) };
  }
  const file = resolveGroundFile(claim.ground);
  if (!file) {
    return {
      verdict: looksLikeFilePath(claim.ground) ? "missing" : "unaddressed",
      ground: claim.ground,
      file: null,
    };
  }
  const cached = readAndChunk(file);
  if (cached.tooLarge) return { verdict: "too_large", ground: claim.ground, file, detail: `${cached.size} bytes` };
  if (cached.unreadable) return { verdict: "unreadable", ground: claim.ground, file, detail: cached.detail };
  const { body, chunks } = cached;
  if (!chunks.length) return { verdict: "unattributed", ground: claim.ground, file, score: 0, floor: 0 };

  const [{ ref, score, floor }] = attribute(text, chunks);
  if (!ref) return { verdict: "unattributed", ground: claim.ground, file, score, floor };

  const m = /#(\d+)-(\d+)$/.exec(ref);
  const start = m ? Number(m[1]) : 0;
  const end = m ? Number(m[2]) : start;
  // attribute() earns the right CHUNK — statistically, against a null floor.
  // A chunk can span many lines (a whole paragraph), which is too coarse for
  // a link meant to be clicked, so this is a SECOND, purely local, never a
  // correctness test: which line INSIDE the already-earned chunk actually
  // carries one of the claim's own terms. Falls back to the chunk's own
  // first line when none of them land on any single line (a term split
  // across a wrap, or the match was in the claim's relation name alone).
  const claimTerms = new Set(tokenize(text));
  const chunkLines = body.slice(start, end).split("\n");
  const hitAt = chunkLines.findIndex((l) => tokenize(l).some((t) => claimTerms.has(t)));
  const line = lineAt(body, start) + (hitAt >= 0 ? hitAt : 0);
  return {
    verdict: "cited",
    ground: claim.ground,
    file,
    ref,
    line,
    url: fileUrl(file, line),
    excerpt: (hitAt >= 0 ? chunkLines[hitAt] : body.slice(start, end)).trim().slice(0, 240),
    score,
    floor,
  };
}

/**
 * A mechanical wrapper around a claim's text — no NLG, no model, no
 * attempt at grammatical correctness (the scorer below is bag-of-words
 * and does not need one). `negating: true` flips polarity and marks the
 * words with a denial wrapper; `negating: false` applies a same-shaped
 * wrapper that does NOT deny anything, as a paired control.
 *
 * BOTH VARIANTS EXIST BECAUSE ONE ALONE LIES. First version of this
 * function had only the negating wrapper, and it "worked" — negating a
 * real claim (native/organs/ground-cite.js's own self-citation) flipped
 * `cited` to `unattributed`. Measured before trusting that: an
 * AFFIRMING wrapper of the identical shape ("AFFIRM(rel)" / "THE CLAIM:
 * said", no denial anywhere in it) flipped the SAME verdict the SAME
 * way. The flip was dilution — any added, non-matching words can push a
 * marginal citation below its null floor — not negation-detection. A
 * control built from the negating wrapper alone would have reported
 * "reachable: true" as false reassurance that this checker caught
 * something it structurally cannot see: `citeGround`'s scored text is
 * `[rel, ...roles, said].join(" ")`, `claim.polarity` never enters it,
 * and source.js's own STOPWORDS list strips both "not" and "no" before
 * overlap is even scored.
 */
function polarityVariant(claim, said, { negating }) {
  return {
    claim: { ...claim, rel: `${negating ? "NEG" : "AFFIRM"}(${claim.rel})`, polarity: negating ? (claim.polarity === "-" ? "+" : "-") : claim.polarity },
    said: said ? `${negating ? "THE DENIAL" : "THE CLAIM"}: ${said}` : said,
  };
}

/**
 * polarityControl(claim, said, originalResult?) — the paired test: rerun
 * citeGround on the claim's denial AND on a same-shaped non-denying
 * control, and report the guard reachable only when they disagree.
 * `originalResult` lets a caller that already ran citeGround once
 * (reason.mjs always has) pass it in rather than repeating that call.
 *
 * THE-NULL-STATES.md names the failure this checks for: "The meta-null is
 * the one to fear. EVA·Figure's unreachable guard is the null of the
 * instrument rather than of the material — a wall that is a comment. It
 * is found only by asking whether the wall was ever reached."
 * `reachable: false` is that answer, and — per this function's own
 * header — it is the expected, honest answer on nearly every claim: a
 * "cited" verdict here means presence, never support, the exact
 * distinction CON·Figure's relation-binding check (hypergraph.js) exists
 * to make and this lexical one structurally cannot.
 *
 * Only meaningful for a "cited" verdict (`checked: false` otherwise — a
 * missing/unaddressed/unattributed ground has no citation to interrogate).
 */
export function polarityControl(claim, said, originalResult = null) {
  const original = originalResult ?? citeGround(claim, said);
  if (original.verdict !== "cited") return { checked: false, reason: "control only applies to a cited verdict" };
  const neg = polarityVariant(claim, said, { negating: true });
  const aff = polarityVariant(claim, said, { negating: false });
  const negated = citeGround(neg.claim, neg.said);
  const affirmed = citeGround(aff.claim, aff.said);
  const reachable = negated.verdict !== affirmed.verdict || negated.ref !== affirmed.ref;
  return {
    checked: true,
    reachable,
    negatedVerdict: negated.verdict,
    affirmedVerdict: affirmed.verdict,
    detail: reachable
      ? "negating this claim changed the verdict differently than a same-shaped non-negating rewrite did — the closest evidence this lexical check can give that it saw the difference"
      : "negating this claim changed the verdict exactly the way a same-shaped non-negating rewrite did (or neither changed) — this checker cannot distinguish this claim from its own denial; a cited verdict here means presence, never support",
  };
}
