// native/organs/reasoning-record.js — THE REASONING, REVIEWABLE IN THE REAL
// NOTATION, NEVER IN THE MODEL'S OWN WORDS (2026-09-22).
//
// The user: "mechanically generated content [must] appear somewhere that
// never touch the model, that's where verbatim content appears" — and "we
// also need to be able to review the reasoning logic in the real EOT."
// cli/reason.mjs prints a summary Claude Code itself reads back as a tool
// result; anything verbatim in that stream is one retyping away from
// becoming the model's own paraphrase of it — source.js's own header names
// exactly this risk for citations ("the model never needs to see or write
// the token for that to work, so it never gets the chance to fake one").
//
// So the reasoning record — the claims in their real GFP notation
// (kernel/gfp-claim.js::render, case-marked: every token wears its own
// role, order carries no meaning, never English prose) and the findings
// exactly as lintGfp/lintInferences typed them — is written STRAIGHT TO A
// FILE, mechanically, and reason.mjs's own console output never repeats
// its content, only the path to it, for a caller (Claude Code's own
// show_pane, a person's editor) to open directly.
//
// A grounding verdict carries no copied excerpt at all, for the same
// reason: the one honest verbatim home for a claim's ground is the
// ORIGINAL FILE AT ITS OWN LINE, opened live, never a snapshot that can
// drift out of sync with it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { render } from "../kernel/gfp-claim.js";

export const RECORD_SCHEMA = "EOReasoningRecord@1";
export const RECORD_DIR = path.join(os.homedir(), ".claude", "eo-reason");

/**
 * The record path for a given cwd — never one fixed global file. LIVE BUG,
 * caught the same session this shipped in (2026-09-22): a single
 * "last-reasoning.json", mirroring reason.mjs's own last.json marker, was
 * silently overwritten mid-turn by an unrelated concurrent session working
 * in a different repo (grounds /the-fold-falsify-suite,
 * /detectParadigmPlurality-*). last.json tolerates that — nothing reads it
 * back later, it is a same-breath convenience. This record is MEANT to be
 * read back later in a turn (that is its whole point — see this file's own
 * header), so the same shortcut is a real bug here, not a harmless
 * borrowing. Fixed by slugging the calling process's own cwd into the
 * filename — the same sanitize-don't-hash style
 * cli/claude-code-state.mjs's own sidOf already uses for session ids.
 *
 * DISCLOSED, NOT CLAIMED SOLVED: this fixes the observed cross-repo
 * collision. It does not protect two sessions concurrently reasoning in
 * the SAME repo — reason.mjs is invoked as a bare CLI with no session id
 * available to scope by (only a hook event carries one, and reason.mjs is
 * never handed hook JSON). A same-repo collision is still possible.
 */
/** The same sanitize-don't-hash slug, exported so any other cwd-scoped
 *  convenience file (e.g. cli/claude-code-ledger.mjs's generated surface
 *  HTML) lands next to this one under the same naming rule instead of
 *  reimplementing it. */
export function cwdSlug(cwd = process.cwd()) {
  return String(cwd).replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "root";
}

/**
 * The nearest enclosing PROJECT root of `cwd` — the first ancestor
 * directory (inclusive) that has its own `.git`. Generalizes the earlier
 * REPO_ROOT fix rather than replacing it: for any cwd already inside
 * eoreader7, this returns eoreader7's own root (its nearest `.git` is
 * always eoreader7's own), byte-identical to what the earlier fix hardcoded
 * — so nothing already correct changes. What it adds is the case that fix
 * couldn't cover: the eo-reason PLUGIN's proxy server is ONE process
 * serving requests from potentially MANY calling projects (claude-code/
 * bin/eo-reason sends the caller's own cwd as `x-er7-cwd`), and a route
 * scoping by a hardcoded eoreader7 root would ignore which project a
 * request was actually about — the same class of bug the REPO_ROOT fix
 * closed, one level up. Falls back to the given cwd, resolved, when no
 * `.git` is found anywhere above it (a plain directory, not a repo) —
 * disclosed as a fallback, never silently wrong.
 */
export function projectRootOf(cwd = process.cwd()) {
  let dir = path.resolve(String(cwd));
  for (;;) {
    try {
      if (fs.existsSync(path.join(dir, ".git"))) return dir;
    } catch { /* unreadable at this level — keep walking up */ }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(String(cwd));
    dir = parent;
  }
}

export function recordFileFor(cwd = process.cwd()) {
  const slug = cwdSlug(projectRootOf(cwd));
  return path.join(RECORD_DIR, `last-reasoning-${slug}.json`);
}

/**
 * The nine-terrain / citation-terminal surface's own path for a given cwd —
 * the one naming convention `cli/claude-code-ledger.mjs`'s spawnSurface
 * (the writer) and `claude-code-doorway.mjs`'s GET /v1/surface (the reader,
 * for the portable plugin path) both need to agree on. Shares RECORD_DIR
 * (the same `~/.claude/eo-reason/` convenience directory) and the same
 * projectRootOf(cwd) scoping key recordFileFor uses, so a request made
 * from a given project always resolves to the same file a run made from
 * that project just wrote — never a separately-typed copy of this string
 * drifting out of sync with the writer's own.
 */
export function surfaceFileFor(cwd = process.cwd()) {
  const slug = cwdSlug(projectRootOf(cwd));
  return path.join(RECORD_DIR, `last-surface-${slug}.html`);
}

/**
 * One claim in the real notation: case-marked (kernel/gfp-claim.js's own
 * order-free lens — every token tagged with its role, so it reads back
 * unambiguously regardless of the order it was declared in). The claim's
 * OWN words — its relation name and role values, exactly as declared —
 * never a paraphrase of what they mean.
 */
export function notationOf(claim) {
  try {
    return render(claim, "case-marked");
  } catch {
    return null; // a claim missing a role/rel: render() itself declines; never guessed here
  }
}

/**
 * writeReasoningRecord({claims, findings, sources, cwd}) — persists one
 * run's own claims (ground + real GFP notation), typed findings, and
 * grounding verdicts (STRUCTURAL only: ground/file/line/url/verdict/score/
 * ref — an `excerpt` field is dropped before writing, whichever caller's
 * shape it arrived in) to recordFileFor(cwd), overwriting that cwd's
 * previous run only. Returns the path so a caller can point at it without
 * repeating its content; returns
 * null on any write failure (the record is a convenience surface — the
 * run's own pass/fail verdict stands without it, the same discipline
 * reason.mjs's own last.json marker already holds).
 */
export function writeReasoningRecord({ claims = [], findings = [], sources = [], cwd = process.cwd() } = {}) {
  const record = {
    schema: RECORD_SCHEMA,
    at: new Date().toISOString(),
    cwd,
    claims: claims.map((c) => ({ id: c.id, ground: c.ground, notation: notationOf(c), polarity: c.polarity, force: c.force })),
    findings,
    sources: sources.map(({ excerpt, ...structural }) => structural),
  };
  const file = recordFileFor(cwd);
  try {
    fs.mkdirSync(RECORD_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(record, null, 1));
    return file;
  } catch {
    return null;
  }
}
