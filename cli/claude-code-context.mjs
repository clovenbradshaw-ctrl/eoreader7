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
// POLARITY AND GROUNDING (2026-09-25). "Standing" used to count every ledger
// line as a witness, whatever it said and whatever grounded it. Measured in
// an isolated ledger: a claim then its own retraction (polarity "-") folded
// to one note with two witnesses, "corroborated" — the retraction counted as
// support — and a claim whose ground was unattributed, or a file that does
// not exist, stated twice read "corroborated" exactly like a cited one. The
// recall hook (cli/claude-code-recall.mjs) injected those as claims "left
// standing". Two read-time fixes:
//
//   (1) POLARITY IS PART OF THE FOLD. A "-" line is admitted as the kernel's
//       own CUT (native/kernel/notes.js: a denial shares its link's ends and
//       never its id, so it can never become a witness of the link it
//       denies; meeting the link lands the contest). A proposition both
//       asserted and denied on the record reads "contested" — whichever
//       came first, however each side was grounded: withdrawing support
//       needs no citation. One only ever denied is a standing denial,
//       polarity "-", and is rendered as one.
//   (2) ONLY A GROUNDED RUN CORROBORATES. A witness counts toward standing
//       only when its run's citation verdict is in GROUNDED_VERDICTS.
//       Every other restatement stays on the entry — `witnesses` and
//       `witnessCount` still count every line; `grounded`, `ungrounded`
//       and `verdicts` split them — and an entry with no grounded witness
//       at all reads "ungrounded", however often it was stated.
//
// Lines written before these fields existed read as "+" with verdict
// "unrecorded", so they never corroborate anything; a retraction made then
// is not recoverable (its polarity was never persisted). The kernel's own
// standingOf is untouched — by its own contract it reads a disputed note
// exactly as before; what a contest or a missing ground does to standing is
// this consumer's decision, made here.
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

/** The citation verdicts (native/organs/ground-cite.js citeGround) that let
 *  a run count as a corroborating witness: "cited" (a real chunk of the
 *  named file beat chance for the claim's own words) and "event" (a real
 *  commit). ground-cite.js's own header bounds even these — a citation is
 *  PRESENCE at the address, never support (polarityControl finds most
 *  cannot tell a claim from its denial) — so this is a floor a witness must
 *  clear, not a proof that clearing it confirms anything. Everything else
 *  ("unattributed", "missing", "unaddressed", "unreadable", "too_large",
 *  or "unrecorded" on an older line) is a restatement: kept and counted,
 *  never standing. */
export const GROUNDED_VERDICTS = Object.freeze(new Set(["cited", "event"]));

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
per-conversation wall).

STANDING counts only runs whose citation verdict was cited or event. A
claim both asserted and denied reads "contested"; one never grounded reads
"ungrounded" however often it was stated.`;

/** The one ledger this reads. */
function ledgerFiles() {
  const f = reasoningLedgerFile();
  try { return fs.existsSync(f) ? [f] : []; } catch { return []; }
}

export function findMatches(seedGround, { allSessions, session }) {
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
        // The write side's own per-run witness (cli/reasoning-ledger.mjs),
        // which foldMatches below always meant to reuse and never received:
        // without it every LINE was its own source, so one run stating a
        // claim twice read as two corroborating witnesses.
        witness: line.witness ?? null,
        polarity: line.polarity === "-" ? "-" : "+",
        verdict: line.verdict ?? null,
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
 *
 * One entry per proposition (this file's header, POLARITY AND GROUNDING):
 * `polarity` "+" asserted, "-" only ever denied, "±" both on the record;
 * `standing` "contested" for "±", "ungrounded" when no witness came from a
 * grounded run, else the kernel's own standingOf over the grounded
 * witnesses alone. `witnesses`/`witnessCount` are every line on the side
 * the entry holds (the denying side for "-"); `grounded`/`ungrounded`/
 * `verdicts` split them by their run's citation verdict; `sources` is how
 * many distinct grounded runs; `against` is the denying side of a "±";
 * `latest` is the polarity of the most recent statement.
 */
export function foldMatches(matches) {
  const taskLog = { ...TL, cellOf: cube.cellOf, noteIdentity: structuralIdentity, identityGiver: "gfp-claim:caselessIdentity(role-values)" };
  const hl = makeHyperlexicon(taskLog);
  let log = hl.createHyperlexicon({ frame: { reader: "cli/claude-code-context", giver: "eoreader7" } });
  const turnedAway = [];
  // witness -> the citation verdict of the run that line came from.
  const verdictOf = new Map();
  for (const m of matches) {
    const subject = m.roles?.ARG0 ?? "";
    const object = m.roles?.ARG1 ?? "";
    // A witness unique PER LEDGER LINE (design part D / correctness review:
    // never a constant string): cli/reasoning-ledger.mjs's own
    // `testimony:<session>@<runAt>#<claimIndex>`, reused verbatim, so the
    // witness count reflects real distinct lines, never a Set collision.
    // The kernel's SOURCE is that string minus its `#address` — one run is
    // one source, so a run restating a claim adds a witness, never a second
    // corroborating source. A line from before that field existed falls
    // back to `<session>@<id-or-timestamp>`, unique per line.
    const witness = m.witness ?? `testimony:${m.session ?? "?"}@${m.id ?? m.appendedAt}`;
    verdictOf.set(witness, m.verdict ?? null);
    const r = hl.admit(log, [{
      subject, verb: m.rel, object,
      // "-" is the kernel's cut: never a witness of the link it denies.
      polarity: m.polarity === "-" ? "-" : "+",
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
    rolesByKey.get(k).push({ roles: m.roles ?? {}, said: m.said, ground: m.ground, session: m.session, polarity: m.polarity ?? "+", verdict: m.verdict ?? null, appendedAt: m.appendedAt ?? null });
  }
  // Both folds, joined on the same canonical key: the links (every "+"
  // hearing) and the cuts (every "-"). A key on both sides is contested.
  const sides = new Map();
  for (const n of hl.foldHyperlexicon(log)) sides.set(canonKey(n.subject, n.verb, n.object), { link: n, cut: null });
  for (const c of hl.foldCuts(log)) {
    const k = canonKey(c.subject, c.verb, c.object);
    sides.set(k, { link: sides.get(k)?.link ?? null, cut: c });
  }
  const groundedOf = (ws) => ws.filter((w) => GROUNDED_VERDICTS.has(verdictOf.get(w)));
  const rank = (n) => (n.standing === "contested" ? 1 : n.standing === "ungrounded" ? 2 : 0);
  const notes = [...sides].map(([k, { link, cut }]) => {
    const held = link ?? cut;
    const against = link && cut ? cut : null;
    const witnesses = held.witnesses ?? [];
    const grounded = groundedOf(witnesses);
    const verdicts = {};
    for (const w of witnesses) { const v = verdictOf.get(w) ?? "unrecorded"; verdicts[v] = (verdicts[v] ?? 0) + 1; }
    const kernel = hl.standingOf({ witnesses: grounded });
    const instances = rolesByKey.get(k) ?? [];
    const latest = instances.reduce((a, b) => (a && String(a.appendedAt ?? "") >= String(b.appendedAt ?? "") ? a : b), null);
    return {
      subject: held.subject, rel: held.verb, object: held.object,
      polarity: against ? "±" : link ? "+" : "-",
      witnesses,
      witnessCount: witnesses.length,
      grounded: grounded.length,
      ungrounded: witnesses.length - grounded.length,
      verdicts,
      standing: against ? "contested" : grounded.length ? kernel.standing : "ungrounded",
      sources: kernel.sources,
      against: against ? { witnessCount: (against.witnesses ?? []).length, grounded: groundedOf(against.witnesses ?? []).length } : null,
      latest: latest?.polarity ?? null,
      instances,
      key: k,
    };
  });
  notes.sort((a, b) => rank(a) - rank(b) || b.sources - a.sources || b.witnessCount - a.witnessCount || a.key.localeCompare(b.key));
  for (const n of notes) delete n.key;
  return { notes, turnedAway };
}

/** One folded entry as one line — this CLI's rendering and
 *  cli/claude-code-recall.mjs's, so the two never describe standing
 *  differently. A denial reads "NOT"; a contested entry names both sides
 *  and which way the latest statement went; grounded runs always ride
 *  beside raw restatements, so "stated six times" never reads as
 *  "witnessed six times". */
export function describeNote(n) {
  const prop = `${n.subject} ${n.rel} ${n.object}`;
  if (n.standing === "contested") {
    return `[contested · asserted ${n.witnessCount}× (${n.grounded} grounded), denied ${n.against?.witnessCount ?? 0}× (${n.against?.grounded ?? 0} grounded); latest ${n.latest === "-" ? "denied" : "asserted"}] ${prop}`;
  }
  const tag = n.standing === "ungrounded"
    ? `ungrounded · stated ${n.witnessCount}×, no run cited its ground`
    : `${n.standing} · ${n.sources} grounded run(s)${n.ungrounded ? `, +${n.ungrounded} ungrounded restatement(s)` : ""}`;
  return `[${tag}] ${n.polarity === "-" ? "NOT: " : ""}${prop}`;
}

function renderText(r, folded) {
  const lines = [];
  const scopeLabel = r.allSessions ? "ALL SESSIONS" : `session ${r.scopeSession ?? "(none detected)"}`;
  lines.push(`eoreader7 claude-code-context · seed ${r.seed} · scope: ${scopeLabel} → ${r.matches.length} raw claim(s) in scope, folded to ${folded.notes.length} entr${folded.notes.length === 1 ? "y" : "ies"}`);
  for (const n of folded.notes) {
    lines.push("");
    lines.push(describeNote(n));
  }
  const c = classCounts(folded.notes);
  lines.push("");
  lines.push(`(scope: ${scopeLabel}; ${r.sessionsTotal} distinct session(s) in the ledger total; considered ${r.considered} reasoning-claim line(s) across ${r.filesConsidered} ledger file(s), ${r.inScope} in scope; matched ${r.matches.length}; folded to ${folded.notes.length} entr${folded.notes.length === 1 ? "y" : "ies"} — ${c.standing} standing on a grounded run, ${c.contested} contested, ${c.ungrounded} never grounded${folded.turnedAway.length ? `; ${folded.turnedAway.length} refused by the fold (e.g. a claim missing ARG1 — see this file's header)` : ""})`);
  return lines.join("\n");
}

/** How many folded entries stand on a grounded run, are contested, or were never grounded. */
export function classCounts(notes) {
  const contested = notes.filter((n) => n.standing === "contested").length;
  const ungrounded = notes.filter((n) => n.standing === "ungrounded").length;
  return { standing: notes.length - contested - ungrounded, contested, ungrounded };
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
    classes: classCounts(folded.notes),
    notes: folded.notes,
  };
  const output = args.json ? JSON.stringify(payload, null, 1) : renderText(result, folded);
  if (args.outFile) fs.writeFileSync(args.outFile, output + "\n");
  else console.log(output);
}

// Guarded (2026-09-25, cli/claude-code-recall.mjs's own header explains
// why): findMatches/foldMatches are now exported for that file to import as
// a library, and an unconditional call here would re-run this CLI's own
// main() — argv parsing, stdout/file output, process.exit — on every such
// import. Same guard idiom cli/claude-code-shape-gate.mjs already uses for
// the identical reason (its own shapeGateDecision is importable without
// firing its main()). Transparent to running this file directly (node
// cli/claude-code-context.mjs still matches and calls main() exactly as
// before) and to tests/reasoning-claims-ledger.test.mjs, which only ever
// spawns this file as its own subprocess.
if (import.meta.url === `file://${process.argv[1]}`) main();
