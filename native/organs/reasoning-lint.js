// organs/reasoning-lint.js — the reasoning seed's section 4–5, run as a
// linter over the holograph (the notes ledger's projected record).
//
// Handle: Degrees Kelsen — after Hans Kelsen, the jurist who formalized how
// norms in a hierarchy resolve conflict: validity first, then lex specialis,
// then lex posterior, never a silent pick. "Degrees" because the order is a
// fixed scale read at the query time — like temperature, it is measured,
// never tuned.
//
// WHAT THIS IS. The seed ("The Reasoning Seed", 2026-09-10) says
// transitivity and circularity checks catch bad CHAINS and nothing else:
// they say nothing about whether a claim should chain classically at all
// (a contested claim), whether it is still valid now (temporal gating),
// whether it is an obligation, permission, or defeasible default (force),
// or whether two seemingly contradictory claims are just differently
// scoped. The seed's fix is a fixed precedence order — validity window →
// regime → specificity → force → recency → entrenchment — written down in
// ONE place (`organs/regime.js`), and a containment boundary
// (`regime.js::isSettled`) that a contested claim may never cross into
// classical resolution. This module is that order APPLIED: it reads the
// ledger's projection (the holograph), tags every live claim the way the
// seed says it must be tagged at admission, and reports, as typed
// findings, where the record is incoherent — a contested claim that a
// resolution would silently pick, an expired obligation still treated as
// in force, a disagreement no declared rule separates, a composition step
// nothing licensed, a support cycle that begs the question.
//
// THE LADDER OF STRICTNESS. Three declared degrees, each a superset of the
// one below it:
//
//   report   — the record's standing, disclosed: what is live, what is
//              contested, what is out of its validity window, what rests on
//              a single voice's testimony. Nothing here convicts.
//   standard — the seed's two falsifiable facts, as errors: an expired
//              obligation fails the validity-window check before it ever
//              reaches force/entrenchment, and a contested claim is never
//              silently picked as a winner (it routes to landContest —
//              contraction only, never revise). A standing contradiction
//              (two live claims at one address no declared rule separates)
//              is an error here. A derived product resting on an expired or
//              contested premise is an error here.
//   strict   — the deepening: an inference step nothing licensed is an
//              error ("by the same reasoning" over an operation no
//              declaration covers — the seed's R1), and a directed cycle in
//              the claim graph (begging the question) is an error.
//
// WHAT IS INJECTED, AND WHY. `door` is a notes/hyperlexicon bundle
// (kernel/notes.js or organs/hyperlexicon.js — the cast.js pattern), so
// the linter reads the ledger through the SAME fold the surface reads,
// never a second projection. `taskLog` is the task-log bundle whose
// `projectTasks` resolves every note to its cell (operator × grain) — the
// seed's "resolve to a cube cell before reasoning", read off the ledger,
// never re-derived. `tags` is the admission-time tag map (regime.js's
// `tagClaim` output per note id); a note with no admission-time tag is
// still linted, but its force/validity are the declared defaults and the
// finding says so — the seed's "tagged at admission, not reasoned about",
// with the skipped tag made visible rather than silent.
//
// THE ACCEPTANCE CASE (the seed's section 7). One ordinance with a sunset
// clause and one contested landContest claim in one corpus. Before this
// module: a transitivity/circularity-only layer either silently resolved
// the contest (bug 3) or had no way to expire the obligation. After:
// `expired_in_conflict`/`expired_premise` fail the expired claim on the
// validity window before force or entrenchment is ever consulted, and
// `contested_disagreement`/`route_to_landContest` never pick a winner —
// both demonstrated live by `eval/the-fold/reasoning-lint-demo.mjs` and
// pinned by `tests/reasoning-lint.test.js`.
//
// PURE. No model call anywhere; no IO; no DOM. The organs are injected,
// the ledger is read through the injected fold, and every finding carries
// the note ids and the plain-language line.

import { projectTasks } from "../kernel/task-log.js";
import {
  persistenceOf, regimeOf, forceOfClause, inValidityWindow, isSettled, precedence, FORCES,
} from "./regime.js";

// ── the strictness ladder ──────────────────────────────────────────────────

export const LINT_STRICTNESS = Object.freeze(["report", "standard", "strict"]);
const LEVEL_RANK = new Map(LINT_STRICTNESS.map((l, i) => [l, i]));

export const SEVERITY = Object.freeze({ INFO: "info", WARN: "warn", ERROR: "error" });

/** Would this finding surface at the requested strictness? */
const shownAt = (finding, strictness) => LEVEL_RANK.get(finding.level) <= LEVEL_RANK.get(strictness);

const finding = (kind, level, severity, detail, { at = null, note = null } = {}) => Object.freeze({ kind, level, severity, detail, ...(at ? { at } : {}), ...(note ? { note } : {}) });

// ── reading the holograph through the injected door ───────────────────────

const foldOf = (door, log) => (typeof door?.foldHyperlexicon === "function" ? door.foldHyperlexicon(log) : door?.fold?.(log) ?? []);
const cutsOf = (door, log) => (typeof door?.foldCuts === "function" ? door.foldCuts(log) : []);
const disputesOf = (door, log) => {
  try { return door?.disputesOf?.(log) ?? new Map(); } catch { return new Map(); }
};
const concededOf = (door, log) => {
  try { return door?.concededIds?.(log) ?? new Set(); } catch { return new Set(); }
};

/** The seed's tag, read at lint time for a note that carries no admission-time tag. */
function workingTag(note, task, disputed, tags, queryTime) {
  const declared = tags.get(note.id) ?? null;
  const validity = declared?.validity ?? Object.freeze({ from: null, until: null, open: true });
  return Object.freeze({
    operator: task?.operator ?? null,
    grain: task?.grain ?? null,
    cell: task?.cell ?? null,
    persistence: task?.operator ? persistenceOf(task.operator) : null,
    regime: regimeOf(disputed ? [{ source: "dispute" }] : []),
    validity,
    force: declared?.force ?? "default",
    scope: declared?.scope ?? null,
    enactedAt: declared?.enactedAt ?? null,
    inScope: inValidityWindow(validity, queryTime),
    declared,
  });
}

const foldText = (t) => String(t ?? "").trim().toLowerCase();
const addressOf = (note) => `${foldText(note.end1)}|${foldText(note.label)}`;

// ── cycle detection (begging the question, strict) ─────────────────────────

/** A directed cycle in the claim graph (end1 → end2), or null. The seed's
 * circularity check, over the holograph's own edges, never a re-derived one. */
export function findClaimCycle(notes) {
  const adj = new Map();
  for (const n of notes ?? []) {
    const a = foldText(n.end1), b = foldText(n.end2);
    if (!a || !b || a === b) continue;
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push({ to: b, id: n.id, end2: n.end2 });
  }
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map();
  const stack = [];
  const path = [];
  const dfs = (v) => {
    color.set(v, GREY);
    path.push(v);
    for (const e of adj.get(v) ?? []) {
      const c = color.get(e.to) ?? WHITE;
      if (c === GREY) { const start = path.indexOf(e.to); return { cycle: path.slice(start).concat(e.to), edge: e }; }
      if (c === WHITE) { const r = dfs(e.to); if (r) return r; }
    }
    path.pop();
    color.set(v, BLACK);
    return null;
  };
  for (const v of adj.keys()) if ((color.get(v) ?? WHITE) === WHITE) { const r = dfs(v); if (r) return r; }
  return null;
}

// ── the ledger lint ────────────────────────────────────────────────────────

/**
 * lintLedger(log, { door, taskLog, tags, queryTime, conditions, strictness })
 * — the seed's order run over the holograph. `log` is a notes ledger,
 * `door` a notes/hyperlexicon bundle (injected), `taskLog` a task-log
 * bundle whose `projectTasks` resolves cells, `tags` the admission-time tag
 * map (regime.js `tagClaim` output), `conditions` the query's declared
 * scope conditions (lex specialis), `strictness` one of LINT_STRICTNESS.
 */
export function lintLedger(log, { door, taskLog, tags = new Map(), queryTime = Date.now(), conditions = [], strictness = "standard" } = {}) {
  if (!door || !taskLog || typeof taskLog.projectTasks !== "function")
    throw new TypeError("reasoning-lint.lintLedger: door (notes bundle) and taskLog (with projectTasks) are injected");
  const findings = [];
  const fold = foldOf(door, log);
  const cuts = cutsOf(door, log);
  const disputed = disputesOf(door, log);
  const conceded = concededOf(door, log);
  const tasks = new Map(taskLog.projectTasks(log).map((t) => [t.task_id, t]));
  const byId = new Map(fold.map((n) => [n.id, n]));

  // The seed's "resolve to a cube cell before reasoning": every live note
  // resolves to a cell (operator × grain), read off the ledger.
  for (const n of fold) {
    const task = tasks.get(n.id);
    if (!task?.operator || !task?.grain || !task?.cell) {
      findings.push(finding("unresolved_cell", "report", SEVERITY.INFO,
        `"${n.end1} —${n.label}→ ${n.end2}" never resolved to a cube cell (operator × grain) — it cannot participate in ordered reasoning until it does`,
        { at: n.id, note: n.id }));
    }
  }

  // The seed's regime boundary, disclosed at report: what is contested, and
  // what is out of its validity window, are named — never resolved, never
  // silently assumed still in force.
  const contestedNotes = new Set();
  for (const n of fold) {
    const disp = disputed.get(n.id) ?? [];
    const tag = workingTag(n, tasks.get(n.id), disp.length > 0, tags, queryTime);
    if (disp.length > 0) {
      contestedNotes.add(n.id);
      findings.push(finding("contested_open", "report", SEVERITY.WARN,
        `"${n.end1} —${n.label}→ ${n.end2}" is under an open contest (${disp.map((d) => d.source).join(", ")}) — route to landContest (contraction only), never resolve it`,
        { at: n.id, note: n.id }));
    }
    if (tag.validity && tag.validity.open === false && !tag.inScope) {
      findings.push(finding("expired_out_of_scope", "report", SEVERITY.WARN,
        `"${n.end1} —${n.label}→ ${n.end2}" is out of its validity window at the query time — it fails the validity-window check before force or entrenchment is ever consulted`,
        { at: n.id, note: n.id }));
    }
    if (n.witnesses?.length && (n.witnesses ?? []).every((w) => String(w).startsWith("testimony:")) && new Set(n.witnesses.map((w) => String(w).split("#")[0].split("~")[0])).size === 1) {
      findings.push(finding("testimony_only", "report", SEVERITY.INFO,
        `"${n.end1} —${n.label}→ ${n.end2}" rests on a single voice's testimony (${n.witnesses.join(", ")}) — an account, never corroboration`,
        { at: n.id, note: n.id }));
    }
  }

  // The seed's section 4: two claims at one address that disagree are
  // resolved by the FIXED order, stop at the first rule that applies. The
  // linter runs the order and reports its outcome; a disagreement the order
  // routes to landContest but no dispute records, or ties it cannot break,
  // is a standing contradiction.
  const byAddress = new Map();
  for (const n of fold) {
    if (conceded.has(n.id)) continue;
    const key = addressOf(n);
    if (!byAddress.has(key)) byAddress.set(key, []);
    byAddress.get(key).push(n);
  }
  for (const [address, group] of byAddress) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
      const a = group[i], b = group[j];
      if (foldText(a.end2) === foldText(b.end2)) continue;
      const aDisputed = contestedNotes.has(a.id), bDisputed = contestedNotes.has(b.id);
      const aTag = workingTag(a, tasks.get(a.id), aDisputed, tags, queryTime);
      const bTag = workingTag(b, tasks.get(b.id), bDisputed, tags, queryTime);
      if (!aDisputed && !bDisputed && aTag.cell && bTag.cell && aTag.grain && bTag.grain) {
        const r = precedence({ tag: aTag, grain: aTag.grain }, { tag: bTag, grain: bTag.grain }, { queryTime, conditions });
        if (r.reason === "tied") {
          findings.push(finding("standing_contradiction", "standard", SEVERITY.ERROR,
            `two live claims at "${address}" disagree (${a.end2} vs ${b.end2}) and no declared rule separates them — ${r.detail} — a caller-declared tiebreak or a landContest is required, never a silent pick`,
            { at: `${a.id}+${b.id}` }));
        } else if (r.reason === "validity_window") {
          const loser = r.winner === "a" ? b : a;
          findings.push(finding("expired_in_conflict", "standard", SEVERITY.ERROR,
            `at "${address}", precedence resolved by validity_window (the ${r.winner === "a" ? "second" : "first"} claim is out of its window) — the expired claim fails BEFORE force or entrenchment is consulted`,
            { at: `${a.id}+${b.id}` }));
        } else {
          const reason = r.reason === "force" ? "force (O beats default beats P)"
            : r.reason === "specificity" ? "specificity (lex specialis)"
            : r.reason === "recency" ? "recency (lex posterior)"
            : r.reason === "entrenchment" ? "entrenchment (grain as Spohn rank)" : r.reason;
          findings.push(finding("resolved_by_order", "standard", SEVERITY.INFO,
            `at "${address}", precedence resolved ${a.end2} vs ${b.end2} by ${reason} in favour of the ${r.winner === "a" ? "first" : "second"} claim`,
            { at: `${a.id}+${b.id}` }));
        }
      } else if (aDisputed || bDisputed) {
        // The seed's bug 3, live: a contested claim in a disagreement must
        // route to landContest, never be picked as the winner.
        findings.push(finding("contested_disagreement", "report", SEVERITY.WARN,
          `at "${address}", ${aDisputed ? a.end2 : b.end2} is under contest — precedence refuses to pick a winner here; route to landContest (contraction only)`,
          { at: `${a.id}+${b.id}` }));
      }
    }
  }

  // A denial (cut) whose link carries no live dispute was heard but never
  // routed: the contest the seed says must be landed was not.
  for (const c of cuts) {
    const link = byId.get(c.link);
    if (link && !(disputed.get(link.id)?.length)) {
      findings.push(finding("unrouted_cut", "standard", SEVERITY.ERROR,
        `"${c.end1} —${c.label}→ ${c.end2}" was denied (cut) but no contest is on the record for the link — the denial was heard and dropped, exactly the silence the seed's section 5 forbids`,
        { at: c.id, note: link.id }));
    }
  }

  // Derived products: a product resting on an expired or contested premise
  // is the seed's acceptance case at the composition tier. The ledger's own
  // `restsOn` already counts contested grounds (derivation.js); a product
  // that names no contested ground while standing on one claims a settled
  // base it does not have.
  for (const t of tasks.values()) {
    if (!t.derived || !t.premises?.length) continue;
    const restsOnContested = t.restsOn?.contested ?? 0;
    for (const pid of t.premises) {
      const premise = byId.get(pid);
      if (!premise) continue;
      const pDisputed = disputed.has(pid);
      const pTag = workingTag(premise, tasks.get(pid), pDisputed, tags, queryTime);
      if (pTag.validity && pTag.validity.open === false && !pTag.inScope) {
        findings.push(finding("expired_premise", "standard", SEVERITY.ERROR,
          `the derived product "${t.description ?? t.task_id}" rests on "${premise.end1} —${premise.label}→ ${premise.end2}", which is out of its validity window at the query time — the sunset clause had to expire it before it was built on`,
          { at: t.task_id, note: pid }));
      }
      if (pDisputed && restsOnContested === 0) {
        findings.push(finding("contested_premise", "standard", SEVERITY.ERROR,
          `the derived product "${t.description ?? t.task_id}" rests on the contested note "${premise.end1} —${premise.label}→ ${premise.end2}" and records no contested ground (restsOn.contested = 0) — it claims a settled base it does not have`,
          { at: t.task_id, note: pid }));
      }
    }
  }

  // Circularity (strict): a directed cycle in the claim graph is begging
  // the question — the claims justify each other in a loop.
  const cyc = findClaimCycle(fold.filter((n) => !conceded.has(n.id)));
  if (cyc) {
    findings.push(finding("circular", "strict", SEVERITY.ERROR,
      `the claim graph contains a directed cycle: ${cyc.cycle.join(" → ")} — the claims justify each other in a loop (begging the question)`,
      { at: cyc.edge?.id ?? cyc.cycle[0] }));
  }

  const visible = findings.filter((f) => shownAt(f, strictness));
  return Object.freeze({
    ok: !visible.some((f) => f.severity === SEVERITY.ERROR),
    strictness,
    findings: Object.freeze(visible),
    counts: Object.freeze(countFindings(visible)),
    contested: Object.freeze([...contestedNotes]),
  });
}

const countFindings = (fs) => {
  const by = {};
  for (const f of fs) by[f.kind] = (by[f.kind] ?? 0) + 1;
  return by;
};

// ── the inference tier (strict) ────────────────────────────────────────────

/**
 * lintInferences(inferences, { licenses, verify, refute, strictness })
 * — a claim that is an INFERENCE ("therefore", "by the same reasoning",
 * a universal, a tautology) is the seed's R1 territory: structure never
 * licenses composition; only a named giver can. `licenses` is a Set of
 * `relation→yields` pairs a giver declared (e.g. ">→>" for transitivity of
 * order). `verify`/`refute` are the caller's injected oracles for
 * equation claims and universal claims respectively.
 *
 * `inferences` are DECLARED by the caller (the reading pipeline does not
 * classify "therefore" as an inference — the grammar lens refuses it, P56),
 * each: { kind, end1, label, end2, relation, yields, spans, ref } where
 * kind ∈ "deduction" | "same-reasoning" | "universal" | "vacuous" |
 * "equation".
 */
export async function lintInferences(inferences = [], { licenses = null, verify = null, refute = null, strictness = "standard" } = {}) {
  const findings = [];
  const licenceOf = typeof licenses === "function" ? licenses : (rel, yields) => licenses instanceof Set && licenses.has(`${rel}→${yields}`);
  // The oracle may be SYNC (the demo's hand-typed JS, the tests' stubs) or
  // ASYNC (lib/sympy-math-oracle.mjs — pyodide boots asynchronously). Await a
  // thenable so both work; a sync oracle's value passes through unchanged.
  const resolve = async (x) => (x && typeof x.then === "function" ? await x : x);
  for (const inf of inferences ?? []) {
    const at = inf.ref ?? inf.end1;
    switch (inf.kind) {
      case "deduction":
      case "same-reasoning": {
        const licensed = licenceOf(inf.relation, inf.yields);
        if (!licensed) {
          findings.push(finding("unlicensed_inference", "strict", SEVERITY.ERROR,
            `"${inf.end1} ${inf.label} ${inf.end2}" composes ${inf.relation} into ${inf.yields ?? "…"} with no declared licence — structure never licenses composition; only a named giver can (R1)`,
            { at }));
        } else {
          findings.push(finding("licensed_inference", "strict", SEVERITY.INFO,
            `"${inf.end1} ${inf.label} ${inf.end2}" is licensed (${inf.relation}→${inf.yields}) by a declared giver`,
            { at }));
        }
        break;
      }
      case "universal": {
        if (typeof refute !== "function") break;
        const r = await resolve(refute(inf));
        if (r?.refuted) {
          findings.push(finding("universal_refuted", "standard", SEVERITY.ERROR,
            `"${inf.end1} ${inf.label} ${inf.end2}" claims to hold universally and a counterexample refutes it (${r.detail}) — refutation is a veto, never a licence, and here it vetoes`,
            { at }));
        } else if (r?.detail) {
          findings.push(finding("universal_checked", "report", SEVERITY.INFO,
            `"${inf.end1} ${inf.label} ${inf.end2}" survived the declared counterexample search (${r.detail})`,
            { at }));
        }
        break;
      }
      case "vacuous":
        findings.push(finding("vacuous_support", "report", SEVERITY.INFO,
          `"${inf.end1} ${inf.label} ${inf.end2}" justifies by a tautology (${inf.detail ?? "X = X"}) — the stated reason adds nothing the step does not already assert`,
          { at }));
        break;
      case "equation": {
        if (typeof verify !== "function") break;
        const v = await resolve(verify(inf));
        if (v?.verdict === "false" || v?.ok === false) {
          findings.push(finding("claim_fails_oracle", "standard", SEVERITY.ERROR,
            `"${inf.statement ?? inf.end1}" — the material asserts it, the declared oracle refutes it (${v.detail})`,
            { at }));
        } else if (v?.verdict === "ambiguous") {
          findings.push(finding("convention_dispute", "report", SEVERITY.INFO,
            `"${inf.statement ?? inf.end1}" — ${v.detail} — a convention, not a settled value`,
            { at }));
        } else if (v?.verdict === "undefined") {
          findings.push(finding("undefined_claim", "standard", SEVERITY.ERROR,
            `"${inf.statement ?? inf.end1}" — ${v.detail}`,
            { at }));
        } else if (v?.verdict === "holds") {
          findings.push(finding("claim_holds", "report", SEVERITY.INFO,
            `"${inf.statement ?? inf.end1}" — the declared oracle confirms it (${v.detail ?? "holds"})`,
            { at }));
        } else if (v?.verdict === "unchecked") {
          // A claim the oracle cannot reach is a GAP, never a conviction: it
          // is disclosed and withheld, exactly the R19 posture (a verifier
          // that cannot compute the truth of a claim never guesses it).
          findings.push(finding("oracle_withheld", "report", SEVERITY.INFO,
            `"${inf.statement ?? inf.end1}" — the oracle cannot compute this claim (${v.detail}) — disclosed, never guessed`,
            { at }));
        }
        break;
      }
      default:
        findings.push(finding("unknown_inference_kind", "report", SEVERITY.WARN,
          `an inference was declared with kind "${inf.kind}" — the linter knows deduction | same-reasoning | universal | vacuous | equation, never a guessed one`,
          { at }));
    }
  }
  const visible = findings.filter((f) => shownAt(f, strictness));
  return Object.freeze({ ok: !visible.some((f) => f.severity === SEVERITY.ERROR), strictness, findings: Object.freeze(visible), counts: Object.freeze(countFindings(visible)) });
}

// ── content → EOT → holograph → lint ───────────────────────────────────────

/**
 * lintContent({ text, convert, source, makeLedger, frame, strictness, queryTime, tagsOf, conditions, verify, refute, licenses })
 * — the full door for NEW content or content the system itself generated.
 * `convert(text)` (the caller's reading pipeline, injected) returns
 * arrangements `{end1, label, end2, spans, witness, polarity?}` plus the
 * caller's declared `inferences`. `makeLedger()` builds a fresh notes/
 * hyperlexicon bundle (the caller's), the arrangements are admitted, and
 * both lints run over the resulting holograph.
 *
 * `tagsOf(id, note)` may supply the admission-time tag per note (the
 * seed's "tagged at admission, not reasoned about").
 */
export async function lintContent({ text, convert, source = "lint-source", makeLedger, frame = null, strictness = "standard", queryTime = Date.now(), conditions = [], tagsOf = null, verify = null, refute = null, licenses = null, taskLog = { projectTasks } } = {}) {
  if (typeof convert !== "function" || typeof makeLedger !== "function")
    throw new TypeError("reasoning-lint.lintContent: convert (text → arrangements) and makeLedger (fresh notes bundle) are injected");
  const { arrangements = [], inferences = [] } = convert(String(text ?? ""), { source }) ?? {};
  const { door, log } = makeLedger({ frame });
  if (!door || !log) throw new TypeError("reasoning-lint.lintContent: makeLedger must return { door, log }");
  const tags = new Map();
  const admitted = door.admit ? door.admit(log, arrangements, { witness: source }) : { log, heard: [] };
  if (tagsOf) for (const h of admitted.heard ?? []) { const t = tagsOf(h.id, h); if (t) tags.set(h.id, t); }
  const ledger = lintLedger(admitted.log, { door, taskLog, tags, queryTime, conditions, strictness });
  const inference = await lintInferences(inferences, { licenses, verify, refute, strictness });
  const findings = [...ledger.findings, ...inference.findings];
  return Object.freeze({
    ok: ledger.ok && inference.ok,
    strictness,
    findings: Object.freeze(findings),
    counts: Object.freeze(countFindings(findings)),
    ledger,
    inference,
    admitted: Object.freeze({ heard: admitted.heard ?? [], turnedAway: admitted.turnedAway ?? [] }),
  });
}

// ── the report ─────────────────────────────────────────────────────────────

/** One plain line per finding, grouped by severity — what a reader sees. */
export function lintReport(result) {
  const lines = [];
  const seen = new Set();
  for (const f of result?.findings ?? []) {
    if (seen.has(f.kind + f.detail)) continue;
    seen.add(f.kind + f.detail);
    lines.push(`  [${f.level}·${f.severity}] ${f.kind}: ${f.detail}`);
  }
  return lines;
}

export { FORCES };