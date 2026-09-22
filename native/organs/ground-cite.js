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
import fs from "node:fs";
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
