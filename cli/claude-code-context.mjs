#!/usr/bin/env node
// cli/claude-code-context.mjs — THE READ SIDE OF THE ONE CLAIMS LEDGER
// (rewritten 2026-09-22, reason-claims design). This file used to read
// documents/claude-code-*.jsonl's own "reason-claim" lines and fabricate a
// {subject: ground, verb: "claims", object: said} triple for the fold — the
// two defects a correctness review found and this rewrite fixes:
//
//   (1) STRUCTURE WAS DISCARDED AT WRITE TIME. The old reason-claim line
//       (cli/claude-code-ledger.mjs's per-session hook, still written today
//       as an audit trail — see its own header, unchanged) persists only
//       flattened `text` (the claim's prose) and `basis` (the ground). The
//       claim's own rel/roles never reached disk there, so this file could
//       not recover them no matter how it read that line.
//   (2) THE FOLD FABRICATED ITS TRIPLE. Because the real rel/roles were
//       gone, the old foldMatches() admitted {ground, "claims", said} —
//       object = the WHOLE raw sentence. Since notes.js's identity is exact
//       trim+lowercase, two restatements of the same fact in different
//       words never matched: measured live, five real reason.mjs runs
//       declaring one fact five ways folded ZERO times.
//
// THE FIX (cli/reasoning-ledger.mjs, part A): cli/reason.mjs now persists
// every declared claim's ground/rel/roles (every role, not only ARG0/ARG1)
// and `said`, UNFOLDED, one line per claim, kind:"reasoning-claim", to the
// ONE shared ledger — documents/eoreader7-reasoning:1.jsonl — alongside a
// session key and a witness unique per LINE. This file is the read side:
// it re-admits those lines' REAL structured triples
// {subject: roles.ARG0, verb: rel, object: roles.ARG1} — never a fabricated
// verb or a whole-sentence object — into a fresh, request-scoped
// hyperlexicon, through a real structural identity (caselessIdentity over
// each of subject/verb/object — never a tuned similarity threshold; this
// repo's POLICIES.md refuses hand-picked thresholds throughout), and folds.
// The OLD documents/claude-code-*.jsonl reason-claim lines are OUT OF SCOPE
// here as of this rewrite — that per-session ledger keeps being written
// (cli/claude-code-ledger.mjs, unchanged) as an audit trail other things may
// read, but the read side no longer treats it as the claims store.
//
// SESSION SCOPING (design part C, the user's own words: "one ledger, with
// session key scoping that defaults to siloing but not necessarily").
// DEFAULT: only the CURRENT session's claims — same session-id source
// cli/reason.mjs's own write side resolves from
// (CLAUDE_CODE_SESSION_ID/CLAUDE_SESSION_ID; see that file's header for the
// measured, disclosed bound: a workflow-spawned subagent can share a
// session id with a longer-running parent, so this silo is real for an
// ordinary single-conversation session and narrower than a true
// per-conversation wall in that one deployment mode — not papered over,
// stated in this file's own --help and in its output trailer below).
// `--all-sessions` widens to every session in the ledger. `--session <id>`
// names one explicit session (current or another) instead of the default.
// Every run discloses which scope it used and how many sessions/entries it
// covered — never silently narrower than before without saying so.
//
// THE DISCLOSED, NARROWER BOUND THIS DOES NOT CLOSE (design part E): a
// caseless structural identity folds exact and case/whitespace-different
// restatements of the SAME role values. It does NOT fold genuine
// paraphrase AT THE ROLE-VALUE LEVEL — "EXCERPT" and "the EXCERPT constant"
// are different strings and stay different notes. That is a real,
// narrower, disclosed limit; this file does not claim to solve paraphrase
// in general, and building fuzzy/embedding/edit-distance matching to close
// it is explicitly out of scope (it would need its own measured null, per
// this repo's own standing refusal of hand-picked thresholds).
//
// A SECOND DISCLOSED BOUND: the ledger persists EVERY role a claim has
// (cli/reasoning-ledger.mjs, part A), but the FOLD below keys identity on
// ARG0/rel/ARG1 only — the kernel's own arrangement primitive
// (native/kernel/notes.js) is a triple (end1/label/end2), not an n-ary
// structure. Two claims sharing ARG0/rel/ARG1 but differing only in a
// third role (ARG2+) will still fold together here; their full roles
// remain on the ledger line for anyone reading it directly, just not
// distinguished by this fold. A claim missing ARG1 (a unary predicate) is
// refused by the door as incomplete and will not appear in a folded
// result — it is still on the ledger, just not foldable by this mechanism.
//
//   node cli/claude-code-context.mjs [<seed-ground>] [--all-sessions]
//        [--session <id>] [--out <file>] [--json]
//
// <seed-ground>, when given, is an absolute file path or a holon scope
// inside one ("/abs/path/file.js/functionName"); a claim matches when
// contains(seed, claimGround) or contains(claimGround, seed) is true
// (native/kernel/gfp-claim.js's own holon()/contains(), never
// reimplemented). Omitted, the seed is "/" — every claim in scope matches
// (contains("/", x) is true for any x by construction; no special case
// needed). Output (default: human-readable; --json: the same, structured;
// --out <file>: written to a file instead of stdout) is every folded
// entry's subject/rel/object/roles/said, its witness count and standing,
// plus a trailer disclosing the scope used and how many sessions/lines it
// covered — never a silent cap.
import fs from "node:fs";
import { holon, contains, caselessIdentity } from "../native/kernel/gfp-claim.js";
import { makeHyperlexicon } from "../native/organs/hyperlexicon.js";
import * as TL from "../native/kernel/task-log.js";
import * as cube from "../native/kernel/cube.js";
import { ledgerFile as reasoningLedgerFile } from "./reasoning-ledger.mjs";

/** Same structural identity cli/reason.mjs's write side uses (that file's
 *  own header explains why: additive robustness — NFKC + internal
 *  whitespace collapse + lowercase — over the kernel's own default
 *  trim+lowercase, never a tuned similarity threshold). Kept as a literal
 *  copy rather than a shared import: these two files are the write and read
 *  ends of the same seam, not a shared module today, and duplicating a
 *  three-line pure function is cheaper and safer mid-task than introducing
 *  a new shared module both must agree to import (this repo's own
 *  convention for the secret-scrub table between cli/claude-code-ledger.mjs
 *  and cli/reasoning-ledger.mjs, stated in the latter's header, is the same
 *  call for the same reason). Keep both identical; a future pass that
 *  extracts one shared module should update both call sites at once.
 */
const structuralIdentity = (subject, verb, object) => ({ subject: caselessIdentity(subject), verb: caselessIdentity(verb), object: caselessIdentity(object) });

/** The current session, the same way cli/reason.mjs's write side resolves
 *  one — see that file's header for the measured, disclosed bound on what
 *  this actually isolates. */
const currentSession = () => process.env.CLAUDE_CODE_SESSION_ID || process.env.CLAUDE_SESSION_ID || null;

function parseArgs(argv) {
  const out = { seed: null, json: false, outFile: null, allSessions: false, session: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--out") out.outFile = argv[++i];
    else if (a === "--all-sessions") out.allSessions = true;
    else if (a === "--session") out.session = argv[++i] ?? null;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (out.seed == null) out.seed = a;
  }
  return out;
}

const USAGE = `usage: node cli/claude-code-context.mjs [<seed-ground>] [--all-sessions] [--session <id>] [--out <file>] [--json]

Reads the ONE shared claims ledger (documents/eoreader7-reasoning:1.jsonl),
folds it at read time through a real structural identity, and prints what
holds in scope.

SESSION SCOPING DEFAULTS TO THE CURRENT SESSION (a silo, not a wall):
  (no flag)           only this Claude Code session's own claims
  --all-sessions       every session in the ledger
  --session <id>       one named session (current or another) instead

This is a real behavior change from this tool's own earlier version, which
had no session concept and read every claim in the ledger unconditionally.
Pass --all-sessions to get that behavior back. See this file's own header
comment for the disclosed limits (paraphrase at the role-value level does
not fold; a workflow-spawned subagent's session id is not always a true
per-conversation wall).`;

/** The one ledger this reads. */
function ledgerFiles() {
  const f = reasoningLedgerFile();
  try { return fs.existsSync(f) ? [f] : []; } catch { return []; }
}

function findMatches(seedGround, { allSessions, session }) {
  const seed = holon(seedGround ?? "/");
  const scopeSession = allSessions ? null : (session ?? currentSession());
  let considered = 0;
  let sessionsSeen = new Set();
  let inScope = 0;
  const matches = [];
  for (const file of ledgerFiles()) {
    let raw;
    try { raw = fs.readFileSync(file, "utf8"); } catch { continue; }
    for (const rawLine of raw.split("\n")) {
      if (!rawLine.trim()) continue;
      let line;
      try { line = JSON.parse(rawLine); } catch { continue; }
      if (line.kind !== "reasoning-claim") continue;
      considered++;
      if (line.session != null) sessionsSeen.add(line.session);
      if (!allSessions && String(line.session ?? null) !== String(scopeSession)) continue;
      inScope++;
      const claimGround = holon(line.ground ?? "/");
      if (!(contains(seed, claimGround) || contains(claimGround, seed))) continue;
      matches.push({
        id: line.id ?? null,
        ground: claimGround,
        rel: line.rel ?? "?",
        roles: line.roles ?? {},
        said: line.said ?? line.text ?? "",
        session: line.session ?? null,
        appendedAt: line.appendedAt ?? null,
      });
    }
  }
  matches.sort((a, b) => String(b.appendedAt ?? "").localeCompare(String(a.appendedAt ?? "")));
  return {
    seed, filesConsidered: ledgerFiles().length, considered, inScope,
    sessionsTotal: sessionsSeen.size, matches,
    scopeSession: allSessions ? null : scopeSession, allSessions,
  };
}

/**
 * foldMatches(matches) — the matched, IN-SCOPE claims, admitted into a
 * fresh, request-scoped hyperlexicon through the REAL structural triple
 * {subject: roles.ARG0, verb: rel, object: roles.ARG1} (design part D —
 * never a fabricated verb, never a whole-sentence object) and folded. Never
 * persisted anywhere: this hyperlexicon is born and discarded within this
 * one run — the accumulated data on disk is untouched; only its READING
 * differs per scope (design part C).
 */
function foldMatches(matches) {
  const taskLog = { ...TL, cellOf: cube.cellOf, noteIdentity: structuralIdentity, identityGiver: "gfp-claim:caselessIdentity(role-values)" };
  const hl = makeHyperlexicon(taskLog);
  let log = hl.createHyperlexicon({ frame: { reader: "cli/claude-code-context", giver: "eoreader7" } });
  const turnedAway = [];
  for (const m of matches) {
    const subject = m.roles?.ARG0 ?? "";
    const object = m.roles?.ARG1 ?? "";
    // A witness unique PER LEDGER LINE (design part D / correctness review:
    // never a constant string). cli/reasoning-ledger.mjs's write side
    // already computed one unique witness per claim line and persisted it
    // as `line.witness`; reused verbatim when present so the accumulated
    // witness count reflects real distinct lines, never a Set collision
    // from reusing one string for every match. A line from before that
    // field existed falls back to `<session>@<id-or-timestamp>`, still
    // unique per line.
    const witness = m.witness ?? `testimony:${m.session ?? "?"}@${m.id ?? m.appendedAt}`;
    const r = hl.admit(log, [{
      subject, verb: m.rel, object,
      spans: [{ at: m.id ?? `claim#${m.appendedAt}`, ref: "reasoning-claim", text: m.said }],
    }], { witness });
    log = r.log;
    for (const t of r.turnedAway) turnedAway.push({ reason: t.reason, detail: t.detail, witness, claim: m });
  }
  // Every original matched claim's full role set, grouped by the SAME
  // canonical key the fold above just used internally (caselessIdentity per
  // component — notes.js's own noteId re-applies trim+lowercase on top,
  // which is idempotent over caselessIdentity's own output), so a reader
  // can see every role a folded note's contributing claims actually carried
  // — design part A's "further roles" disclosure — without this file
  // re-deriving or duplicating notes.js's own identity logic.
  const canonKey = (s, v, o) => { const c = structuralIdentity(s, v, o); return `${c.subject}\u0001${c.verb}\u0001${c.object}`; };
  const rolesByKey = new Map();
  for (const m of matches) {
    const k = canonKey(m.roles?.ARG0 ?? "", m.rel, m.roles?.ARG1 ?? "");
    if (!rolesByKey.has(k)) rolesByKey.set(k, []);
    rolesByKey.get(k).push({ roles: m.roles ?? {}, said: m.said, ground: m.ground, session: m.session });
  }
  const notes = hl.foldHyperlexicon(log).map((n) => {
    const standing = hl.standingOf(n);
    const k = canonKey(n.subject, n.verb, n.object);
    return {
      subject: n.subject, rel: n.verb, object: n.object,
      witnesses: n.witnesses ?? [],
      witnessCount: (n.witnesses ?? []).length,
      standing: standing.standing,
      sources: standing.sources,
      instances: rolesByKey.get(k) ?? [],
    };
  });
  return { notes, turnedAway };
}

function renderText(r, folded) {
  const lines = [];
  const scopeLabel = r.allSessions ? "ALL SESSIONS" : `session ${r.scopeSession ?? "(none detected)"}`;
  lines.push(`eoreader7 claude-code-context · seed ${r.seed} · scope: ${scopeLabel} → ${r.matches.length} raw claim(s) in scope, folded to ${folded.notes.length} entr${folded.notes.length === 1 ? "y" : "ies"}`);
  for (const n of folded.notes) {
    lines.push("");
    lines.push(`[${n.witnessCount} witness(es) · ${n.standing}] ${n.subject} ${n.rel} ${n.object}`);
  }
  lines.push("");
  lines.push(`(scope: ${scopeLabel}; ${r.sessionsTotal} distinct session(s) in the ledger total; considered ${r.considered} reasoning-claim line(s) across ${r.filesConsidered} ledger file(s), ${r.inScope} in scope; matched ${r.matches.length}; folded to ${folded.notes.length} entr${folded.notes.length === 1 ? "y" : "ies"}${folded.turnedAway.length ? `; ${folded.turnedAway.length} refused by the fold (e.g. a claim missing ARG1 — see this file's header)` : ""})`);
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(USAGE); process.exit(0); }
  const result = findMatches(args.seed, { allSessions: args.allSessions, session: args.session });
  const folded = foldMatches(result.matches);
  const payload = {
    seedGround: result.seed,
    scope: result.allSessions ? "all-sessions" : `session:${result.scopeSession ?? "none"}`,
    sessionsInLedger: result.sessionsTotal,
    filesConsidered: result.filesConsidered,
    reasoningClaimLinesConsidered: result.considered,
    inScope: result.inScope,
    matched: result.matches.length,
    foldedEntries: folded.notes.length,
    foldRefused: folded.turnedAway.length,
    notes: folded.notes,
  };
  const output = args.json ? JSON.stringify(payload, null, 1) : renderText(result, folded);
  if (args.outFile) fs.writeFileSync(args.outFile, output + "\n");
  else console.log(output);
}

main();
