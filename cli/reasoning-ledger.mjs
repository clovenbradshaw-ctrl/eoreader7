#!/usr/bin/env node
// cli/reasoning-ledger.mjs — THE ENGINE'S OWN DURABLE FEED FROM cli/reason.mjs
// (2026-09-22). The user's direction: ongoing engine-improvement work "should
// feed both the claude code functionality and the engine regularly" — not a
// one-off.
//
// cli/reason.mjs's own header already names the gap this closes. When a
// caller hands it `text` alongside `claims`, it reads the text
// (engineRelationsFor/buildReferents), builds a REAL hyperlexicon
// (native/organs/hyperlexicon.js over native/kernel/notes.js), and admits
// BOTH the engine's own read edges (witness `reader:engine`) and the
// reasoner's declared claims (witness `testimony:claude`) into it — but that
// ledger (the `log`/`hl` pair) lived only in cli/reason.mjs's own function
// scope, used once to compute that single run's lint findings, then
// discarded. Nothing about what was reasoned ever reached eoreader7's own
// accumulated knowledge. This module is the fix: cli/reason.mjs now hoists
// `hl`/`hlLog` out of that block and, after its own `out` is computed, hands
// them to `appendReasoningLedger` here, which folds the SAME hyperlexicon
// (both witnesses — unioned into one note where they agree, kept apart where
// they don't; neither is ever dropped for the other, because fold() itself
// never drops a witness) and appends it as EOTObservation@1 lines to
// eoreader7's own document space: documents/eoreader7-reasoning:1.jsonl. A
// NEW file, deliberately — never documents/claude-code-<sid>.jsonl (that
// ledger is Claude-Code-session-scoped, owned by cli/claude-code-ledger.mjs)
// and never an essay job's own <sid>:<turn>.jsonl (composition-scoped, owned
// by native/the-fold/document-ledger.js's own callers in proxy-runner.mjs).
//
// SCOPE, DISCLOSED HONESTLY (see the investigation this module's commit
// message/PR carries): as of this writing nothing yet globs
// documents/*.jsonl as a general "read the engine's own reasoning back into
// a live turn" corpus. The two real readers of this directory today are
// each narrowly scoped to their own concern — native/the-fold/form-referent.js
// globs every *.jsonl file but reads only role "prompt"/"void" lines (the
// "write it again" anaphor), and cli/claude-code-context.mjs globs only
// documents/claude-code-*.jsonl by filename and reads only kind
// "reason-claim" lines. Neither will misread or choke on this ledger — their
// own filters skip an unmatched shape/filename cleanly — and this module's
// choice to use the SAME schema, in the SAME directory, means a future
// general reader (one that folds reasoning notes back into a live turn)
// needs to be built once, not re-derived per ledger. This module makes the
// fact durable; it does not itself make anything read it back yet.
//
// SECRETS: the same declared, disclosed table cli/claude-code-ledger.mjs
// polices its own writes with, duplicated here rather than imported —
// claude-code-ledger.mjs does not export it, and that file is mid-edit by
// concurrent work today (a shared checkout; see this repo's own convention
// of checking `git diff --cached` before ever touching a file others are
// actively working in). Keep both tables identical; a future pass that
// extracts a shared secret-scrub module should update both call sites at
// once, never diverge them. EXTEND this table when a new secret shape is
// found; never bypass it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Mirrors cli/claude-code-ledger.mjs's own EO_LEDGER_DIR override (today's
// staged change there: a plugin's install folder is replaced on every
// update, so its ledger must live outside the repo when installed as a
// plugin) — both ledgers land in the SAME documents/ directory whichever way
// this repo is running, so a future general reader globs one place.
export const DOCS = process.env.EO_LEDGER_DIR || path.join(HERE, "..", "documents");
export const DOC_ID = "eoreader7-reasoning:1";
const EXCERPT = 4000;

// The declared table of secret shapes — identical to cli/claude-code-
// ledger.mjs's own SECRET_SHAPES. Anything matching is replaced before it
// reaches disk.
const SECRET_SHAPES = [
  [/sk-ant-[A-Za-z0-9_-]{16,}/g, "[redacted]"],                       // Anthropic keys
  [/\bsk-[A-Za-z0-9_-]{20,}/g, "[redacted]"],                          // OpenAI-style keys
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, "[redacted]"],                     // GitHub tokens
  [/\bAKIA[0-9A-Z]{16}\b/g, "[redacted]"],                             // AWS access key ids
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/g, "[redacted]"],                  // Slack tokens
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted private key]"],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/g, "Bearer [redacted]"],
  [/\b((?:api|secret|access|auth)[_-]?(?:key|token)|password|passwd)(\s*[:=]\s*)["']?[^\s"',;}]{6,}/gi, "$1$2[redacted]"],
];
const scrub = (s) => { let t = String(s ?? ""); for (const [re, rep] of SECRET_SHAPES) t = t.replace(re, rep); return t; };
const excerpt = (v) => { const t = typeof v === "string" ? v : JSON.stringify(v); return t && t.length > EXCERPT ? `${t.slice(0, EXCERPT)}… [${t.length - EXCERPT} more chars at the reasoning record address]` : (t ?? ""); };

/** The one ledger file this module ever writes to. */
export function ledgerFile(dir = DOCS) {
  return path.join(dir, `${DOC_ID}.jsonl`);
}

function nextStart(file) {
  try { return fs.statSync(file).size; } catch { return 0; }
}

function appendLine(file, line) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(line) + "\n");
}

/**
 * appendReasoningLedger({ hl, log, declaredClaims, session, runAt, cwd,
 * grounds, ok, errors, dir }) — append this run's reasoning to the one
 * shared ledger, in TWO independent layers that never gate each other:
 *
 *   1. THE STRUCTURED CLAIMS LAYER (2026-09-22, reason-claims design part A
 *      — the root-cause fix for "structure is discarded at write time").
 *      `declaredClaims` is the run's OWN declared claims, verbatim
 *      (ground/rel/roles — EVERY role, not just ARG0/ARG1 — plus `said`,
 *      and since 2026-09-25 each claim's `polarity` and citation `verdict`),
 *      exactly as `cli/reason.mjs` already built them for its own GFP core
 *      before this call. One `kind:"reasoning-claim"` line is appended PER
 *      CLAIM, with NO folding at write time: folding a paraphrase together
 *      with an earlier run's claim is a READ-TIME decision (design part C —
 *      "the same accumulated data can be folded at different scopes with no
 *      rewriting"), never baked into what gets written. `session` (a
 *      Claude Code session id, or null when none is known) rides on every
 *      claim line so a reader can silo by it. Each claim's witness is
 *      unique PER LINE (`testimony:<session>@<runAt>#<claimIndex>`) — never
 *      a constant like reason.mjs's own `"testimony:claude"` — so N runs
 *      declaring the same fact leave N distinguishable witnesses for a
 *      read-time fold to accumulate, instead of colliding in a Set the way
 *      a repeated constant string would (the exact trap
 *      cli/claude-code-context.mjs's OLD foldMatches already found and
 *      fixed once for a different ledger; not repeating it here).
 *
 *   2. THE FOLDED-NOTES LAYER (unchanged from before today's edit, kept for
 *      whatever already depends on its shape): when `hl`/`log` are given
 *      (only when cli/reason.mjs was handed `text` to read), fold the
 *      hyperlexicon `log` through its own door `hl` — both exactly as
 *      cli/reason.mjs built them, this module never re-derives or re-admits
 *      anything — and append one line per note the fold returns, EACH
 *      CARRYING ITS OWN WITNESSES exactly as fold() unioned or kept them
 *      apart (`reader:engine` + `testimony:claude` when both voices agree,
 *      one or the other alone otherwise). This layer is a per-run,
 *      already-folded READING of one run's own text+claims together; it is
 *      NOT what cli/claude-code-context.mjs's read-time fold (design part
 *      C/D) reads — that reads layer 1's `reasoning-claim` lines.
 *
 * Either layer runs independently: `declaredClaims` with no `hl`/`log`
 * (the common case — a bare `node cli/reason.mjs spec.json --json` run with
 * no `text`) still persists layer 1; `hl`/`log` with no `declaredClaims`
 * still persists layer 2. Both empty is a no-op (`written: 0`).
 *
 * ONE RUN LINE always opens the call (when there is anything to append) —
 * the address every claim/note line below reads back through, so a later
 * reader can trace a persisted line to why it was declared without
 * re-deriving it.
 *
 * Never throws: a write failure (missing dir permissions, disk full) is
 * swallowed and reported back as {written: 0, error}, the same "additive,
 * never blocking" discipline cli/claude-code-ledger.mjs's own hook holds to
 * — a durable-feed failure must never break the reasoning check it rides on.
 * Returns {written, file, runId}.
 */
export function appendReasoningLedger({ hl = null, log = null, declaredClaims = [], session = null, runAt = null, cwd = process.cwd(), grounds = [], ok = null, errors = null, dir = DOCS } = {}) {
  let notes = [];
  if (hl && log) {
    try { notes = hl.foldHyperlexicon(log); } catch (e) { return { written: 0, error: `fold failed: ${e?.message ?? e}` }; }
  }
  if (!notes.length && !declaredClaims.length) return { written: 0, error: null };
  let file;
  try {
    const at = runAt ?? new Date().toISOString();
    file = ledgerFile(dir);
    const runId = `${DOC_ID}:run:${crypto.createHash("sha1").update(`${at}\n${cwd}\n${process.pid}`).digest("hex").slice(0, 16)}`;

    // ONE RUN LINE — the address every claim/note line below reads back through.
    const runText = scrub(excerpt(`eoreader7 reason run · ${declaredClaims.length} claim(s), ${notes.length} note(s) folded from the hyperlexicon · ok=${ok === null ? "?" : ok}${errors != null ? ` errors=${errors}` : ""}`));
    const runBasis = scrub(`cwd:${cwd} grounds:${JSON.stringify(grounds)}${session ? ` session:${session}` : ""}`);
    {
      const start = nextStart(file);
      appendLine(file, {
        schema: "EOTObservation@1", id: runId, at: [start, start + runText.length],
        role: "run", kind: "reasoning-run", title: `/reason/${at}`,
        text: runText, supersedes: null, giver: "eoreader7-reason", basis: runBasis,
        session, appendedAt: new Date().toISOString(),
      });
    }

    let written = 1;

    // ── LAYER 1: one line per DECLARED CLAIM, structure kept whole ─────────
    for (let i = 0; i < declaredClaims.length; i++) {
      const c = declaredClaims[i];
      const ground = String(c?.ground ?? "/");
      const rel = scrub(String(c?.rel ?? "?"));
      // EVERY role, not just ARG0/ARG1 (design part A: "plus any further
      // roles present, do not assume only two") — scrubbed and length-
      // bounded value-by-value, same discipline as everything else this
      // file ever writes. Nothing here is thrown away; see this file's own
      // header for the disclosed, narrower bound on what a READ-TIME fold
      // can actually key identity on (ARG0/rel/ARG1 — the kernel's
      // arrangement primitive is a triple, not an n-ary structure).
      const roles = Object.fromEntries(Object.entries(c?.roles ?? {}).map(([k, v]) => [k, scrub(excerpt(v))]));
      const said = scrub(excerpt(c?.said ?? `${roles.ARG0 ?? "?"} ${rel} ${roles.ARG1 ?? "?"}`));
      const witness = `testimony:${session ?? "nosession"}@${at}#${i}`;
      // POLARITY AND GROUNDING (2026-09-25). Without both, a read-time fold
      // cannot tell a retraction from a restatement, or a cited claim from
      // one whose ground is missing — measured in an isolated ledger: "+"
      // then "-" of one claim, and a claim grounded at a nonexistent file
      // stated twice, each folded to "corroborated". `verdict` is the
      // citation verdict cli/reason.mjs's citeGround already earned for this
      // claim. Persisted exactly as handed, null when a caller did not say —
      // the same reading a line written before these fields existed gets
      // (cli/claude-code-context.mjs reads null polarity as "+" and a null
      // verdict as ungrounded).
      const polarity = c?.polarity === "+" || c?.polarity === "-" ? c.polarity : null;
      const verdict = typeof c?.verdict === "string" && c.verdict ? c.verdict : null;
      const claimId = `${DOC_ID}:obs:${crypto.createHash("sha1").update(`${at}\n${process.pid}\nclaim\n${i}\n${ground}\n${rel}`).digest("hex").slice(0, 16)}`;
      const start = nextStart(file);
      // fingerprint/source (2026-09-25, mechanical-shortcuts first slice):
      // pass-through only — cli/reason.mjs is the one place that computes
      // fingerprintOf (it has the built gfpClaim + declare table this
      // module never sees) and resolves source from a claim's own
      // derivedBy tag; this module just persists whatever it's handed,
      // defaulting to null/"hand-authored" so every existing caller and
      // test that predates this addition (which never sets these fields)
      // is unaffected.
      const fingerprint = c?.fingerprint ?? null;
      const source = c?.source ?? "hand-authored";
      appendLine(file, {
        schema: "EOTObservation@1", id: claimId, at: [start, start + said.length],
        role: "claim", kind: "reasoning-claim", title: `/reason/${at}/claim/${i}`,
        text: said, supersedes: null, giver: "eoreader7-reason",
        basis: scrub(`reason:${at}#${ground}`),
        ground, rel, roles, said, session, witness, polarity, verdict, fingerprint, source,
        appendedAt: new Date().toISOString(),
      });
      written++;
    }

    // ── LAYER 2: one line per FOLDED NOTE (unchanged behavior) ─────────────
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const witnesses = n.witnesses ?? [];
      // A note's spans carry each witness's own text (the reading's verbatim
      // snippet for reader:engine, the claim's own `said` for testimony:
      // claude) — the first non-empty one, for a short, readable line; the
      // SVO clause always leads so the line is meaningful even with no span.
      const spanText = (n.spans ?? []).map((s) => s?.text).find(Boolean) ?? "";
      const svo = `${n.subject ?? "?"} ${n.verb ?? "?"} ${n.object ?? "?"}`.trim();
      const raw = spanText && spanText !== svo ? `${svo} — "${spanText}"` : svo;
      const clean = scrub(excerpt(raw));
      const spanAt = n.spans?.[0]?.at ?? "/";
      const noteId = `${DOC_ID}:obs:${crypto.createHash("sha1").update(`${at}\n${process.pid}\nnote\n${i}\n${n.id ?? ""}`).digest("hex").slice(0, 16)}`;
      const start = nextStart(file);
      appendLine(file, {
        schema: "EOTObservation@1", id: noteId, at: [start, start + clean.length],
        role: "assertion", kind: "reasoning-note", title: `/reason/${at}/note/${i}`,
        text: clean, supersedes: null, giver: "eoreader7-reason",
        basis: scrub(`reason:${at}@${spanAt} witnesses:${witnesses.length ? witnesses.join("+") : "none"}`),
        session, appendedAt: new Date().toISOString(),
      });
      written++;
    }
    return { written, file, runId };
  } catch (e) {
    return { written: 0, error: `${e?.message ?? e}`, file };
  }
}
