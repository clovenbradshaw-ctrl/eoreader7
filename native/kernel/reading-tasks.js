import { createTaskLog, append, projectTasks, ENTRY_KINDS } from "./task-log.js";
import { buildHypergraph, relevantHypergraphNeighborhood } from "./hypergraph.js";
import { compositionAffordance } from "./hyperlexicon.js";

const CLOSED = new Set(["resolved", "closed", "superseded", "retracted"]);
const REF_RE = /^(ref|ref-occ|surface|occ|lex|mention|encounter|obs|edge|expectation|obligation|identity|discourse-link|withheld-composition|composition|frame|pattern|motif|delta|op|gap|task-target|task-evidence):/;
const EXPLICIT_REF_KEYS = new Set(["ref", "edge", "expectation", "obligation", "frame", "pattern", "referent", "composition", "target"]);
const refsOf = (value, out = new Set(), key = null) => {
  if (value == null) return out;
  if (typeof value === "string") { if (REF_RE.test(value) || EXPLICIT_REF_KEYS.has(key)) out.add(value); return out; }
  if (Array.isArray(value)) { for (const v of value) refsOf(v, out, key); return out; }
  if (typeof value === "object") for (const [childKey, v] of Object.entries(value)) refsOf(v, out, childKey);
  return out;
};
const materiallyTargeted = (c) => Boolean(c && typeof c === "object" && (c.ref || c.edge || c.expectation || c.obligation || c.frame || c.pattern || c.referent || c.boundary || c.relation || c.composition || c.terrain || c.op || c.operator || c.address || c.eo));

const strategyForObligation = (obligation = {}) => {
  const id = String(obligation.id ?? "");
  const kinds = new Set((obligation.consequences ?? []).map((item) => item?.kind).filter(Boolean));
  if (id.startsWith("obligation:identity:") || id.startsWith("obligation:unresolved:")) return "identity_clarification";
  if (id.startsWith("obligation:composition:") || kinds.has("composition_permission") || kinds.has("bridge_interpretation")) return "composition_clarification";
  if (kinds.has("terrain_projection")) return "terrain_clarification";
  if (kinds.has("causal_attribution")) return "causal_clarification";
  if (kinds.has("relation_scope_or_multiplicity") || kinds.has("scope")) return "scope_clarification";
  if (kinds.has("boundary")) return "boundary_clarification";
  if (kinds.has("expectation")) return "expectation_clarification";
  if (kinds.has("contradiction")) return "contradiction_clarification";
  return "clarify";
};

const QUESTIONS = Object.freeze({
  identity_clarification: Object.freeze([
    "What witnessed structure supports treating these occurrences as one referent?",
    "What witnessed structure supports keeping them distinct or scope-separated?",
  ]),
  composition_clarification: Object.freeze([
    "What witnessed structure bears on whether these relations may be composed here?",
    "What evidence would require withholding or refusing the bridge interpretation?",
  ]),
  terrain_clarification: Object.freeze([
    "What witnessed structure supports this terrain projection in the present Fold?",
    "What later distinction, relation, or reframing would move or dissolve this projection?",
  ]),
  causal_clarification: Object.freeze(["What witnessed structure supports the proposed causal dependence?", "What competing causal structure remains live?"]),
  scope_clarification: Object.freeze(["What witnessed boundary or temporal structure separates the competing values?", "What would show they occupy one scope rather than distinct scopes?"]),
  boundary_clarification: Object.freeze(["What witnessed structure establishes or revises this boundary?", "What crosses or defeats the proposed boundary?"]),
  expectation_clarification: Object.freeze(["What witnessed structure strengthens or weakens this expectation?", "What would fulfill, violate, or reframe it?"]),
  contradiction_clarification: Object.freeze(["Which witnessed commitments are genuinely incompatible?", "Can scope, identity, or framing resolve the apparent contradiction without erasing either witness?"]),
  clarify: Object.freeze(["What additional witnessed structure bears on this unresolved distinction?", "What would defeat the current leading interpretation?"]),
});

export const createReadingTaskState = (log = null) => log ?? createTaskLog();
export function obligationMakesDifference(obligation = {}) {
  if (!obligation?.id || CLOSED.has(obligation.status)) return false;
  const materiality = obligation?.distinction?.materiality;
  if (materiality?.makesDifference === false) return false;
  if (materiality?.makesDifference === true) return true;
  return refsOf(obligation.consequences).size > 0 || (obligation.consequences ?? []).some(materiallyTargeted);
}
export function taskForObligation(obligation, { sequence = 0 } = {}) {
  if (!obligationMakesDifference(obligation)) return null;
  const targets = [...refsOf([obligation.distinction, obligation.grounds, obligation.alternatives, obligation.consequences])];
  if (!targets.length) return null;
  const strategy = strategyForObligation(obligation);
  return Object.freeze({
    kind: ENTRY_KINDS.PROPOSE,
    task_id: `task:obligation:${obligation.id}`,
    description: `Clarify unresolved distinction: ${typeof obligation.distinction === "string" ? obligation.distinction : obligation.id}`,
    obligation_id: obligation.id,
    grounds: Object.freeze([...(obligation.grounds ?? [])]),
    targets: Object.freeze(targets),
    questions: QUESTIONS[strategy] ?? QUESTIONS.clarify,
    consequences: Object.freeze([...(obligation.consequences ?? [])]),
    openedAt: obligation.openedAt ?? sequence,
    persistence: obligation.persistence ?? 0,
    priority: Object.freeze({ consequence: Math.max(1, (obligation.consequences ?? []).length), persistence: obligation.persistence ?? 0, uncertainty: 1 }),
    scope: Object.freeze({ seenThrough: sequence, futureAllowed: false, retrospectiveAllowed: true }),
    strategy,
    wake: Object.freeze({ refs: Object.freeze(targets) }),
    depends_on: [],
    evidence: Object.freeze([...(obligation.grounds ?? [])]),
    status: "open",
  });
}
export const taskPriority = (task, fold = {}) => (task?.priority?.consequence ?? 0) * (1 + Math.max(task?.persistence ?? 0, task?.openedAt == null ? 0 : (fold?.sequence ?? 0) - task.openedAt)) * (task?.priority?.uncertainty ?? 1);
export function scheduleTasks(tasks = [], fold = {}, { limit = 4 } = {}) { return Object.freeze([...tasks].filter(t => !CLOSED.has(t.status) && (t?.priority?.consequence ?? 0) > 0 && (t?.targets?.length ?? 0) > 0).map(t => ({ task: t, score: taskPriority(t, fold) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score || String(a.task.task_id).localeCompare(String(b.task.task_id))).slice(0, limit).map(x => x.task)); }
export function reconcileObligationTasks(log, fold) { let next = log; const by = new Map((fold?.obligations ?? []).map(o => [o.id, o])); for (const task of projectTasks(next)) { if (!task?.obligation_id) continue; const o = by.get(task.obligation_id); if (o && !CLOSED.has(o.status) && obligationMakesDifference(o)) continue; next = append(next, { kind: ENTRY_KINDS.RETRACT, task_id: task.task_id, description: `Underlying obligation ${task.obligation_id} no longer requires attention`, evidence: [...(o?.resolutionRefs ?? [])] }); } return next; }
export function proposeObligationTasks(log, fold) { let next = reconcileObligationTasks(log, fold); const active = new Set(projectTasks(next).filter(t => !CLOSED.has(t.status)).map(t => t.task_id)); const proposed = []; for (const o of fold?.obligations ?? []) { const entry = taskForObligation(o, { sequence: fold?.sequence ?? 0 }); if (!entry || active.has(entry.task_id)) continue; next = append(next, entry); active.add(entry.task_id); proposed.push(entry.task_id); } return Object.freeze({ log: next, proposed: Object.freeze(proposed), tasks: Object.freeze(projectTasks(next)) }); }
export function wakeTasks(tasks = [], observations = []) { const encountered = refsOf(observations); return Object.freeze(tasks.filter(task => !CLOSED.has(task.status) && (task?.priority?.consequence ?? 0) > 0 && (task?.wake?.refs ?? task?.targets ?? []).some(ref => encountered.has(ref)))); }

export async function executeClarificationTask({ task, fold, observations = [], graph = null, hyperlexicon = null } = {}) {
  if (!task?.task_id) throw new TypeError("executeClarificationTask requires a task");
  const working = graph ?? buildHypergraph([...(fold?.graphEntries ?? []), ...observations.flatMap(o => [o, ...(o?.hyperedges ?? []), ...(o?.graphEntries ?? [])])]);
  const depth = task.strategy === "identity_clarification" || task.strategy === "composition_clarification" ? 5 : 3;
  const n = relevantHypergraphNeighborhood(working, [...(task.targets ?? []), ...observations], { maxHops: depth });
  const candidates = n.entries.filter(e => e?.id && !CLOSED.has(e?.status));
  const evidenceSchemas = new Set([
    "Observation@1", "EOHyperedge@1", "EOMention@1", "EOLexicalOccurrence@1", "EOTaskTargetOccurrence@1",
    "EOReferentOccurrence@1", "EODiscourseIdentityLink@1", "EOCanonicalHyperedge@1", "EOPronounBinding@1",
  ]);
  const evidence = candidates.filter(e => evidenceSchemas.has(e.schema)).map(e => e.id);
  let detail = null;
  if (task.strategy === "composition_clarification") {
    const withheld = candidates.find(e => e?.schema === "EOWithheldComposition@1") ?? null;
    if (withheld) {
      const affordance = compositionAffordance(hyperlexicon, withheld.leftPredicate, withheld.rightPredicate);
      detail = Object.freeze({
        composition: withheld.id,
        leftPredicate: withheld.leftPredicate,
        rightPredicate: withheld.rightPredicate,
        standing: affordance.standing,
        giver: affordance.giver,
        note: "Hyperlexicon standing conditions the question but is not witness evidence.",
      });
    }
  }
  return Object.freeze({
    disposition: evidence.length ? "evidence_found" : "unresolved",
    evidence: Object.freeze([...new Set(evidence)]),
    candidates: Object.freeze(candidates),
    questions: Object.freeze([...(task.questions ?? [])]),
    strategy: task.strategy ?? "clarify",
    depth,
    detail,
  });
}
export function appendTaskResult(log, task, result = {}) { let next = log; const evidence = [...(result.evidence ?? [])]; if (evidence.length) next = append(next, { kind: ENTRY_KINDS.EVIDENCE, task_id: task.task_id, evidence, description: task.description }); return append(next, { kind: ENTRY_KINDS.RESULT, task_id: task.task_id, status: "open", result: Object.freeze({ ...result, evidence: Object.freeze(evidence) }), evidence, description: task.description }); }
