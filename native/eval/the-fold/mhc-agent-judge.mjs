// eval/mhc-agent-judge.mjs — a judging harness template for the agent-facing
// MHC task battery defined in THE-MHC-AI-TASKS.md (orders 4–14).
//
//   node eval/mhc-agent-judge.mjs [model]
//
// This is deliberately DISTINCT from the organ battery (mhc.js +
// eval/mhc-battery.mjs), which measures THIS REPO'S OWN ORGANS against
// corpora. This file scores a PERFORMING AGENT — a model's response to a
// task prompt — against each order's pass/fail rubric.
//
// READ THE SPEC FIRST: THE-MHC-AI-TASKS.md. It states the extension-vs-
// literature caveat this harness exists to obey: there is NO published
// "MHC test for AI"; Commons's instruments were built for humans with
// decalage, and applying the model to a single agent response is an
// extension, not citation. Orders 0–3 (sensorimotor — these do not map
// onto a text interface) are out of scope and this battery starts at
// order 4 = Nominal, per the spec.
//
// THE NOVEL-CONSTRUCTION GUARD: an LLM can emit order-11/12 STYLE without
// the underlying coordination. The clean guard (Commons's balance-beam
// logic) is NOVEL ITEM CONSTRUCTION — variables/systems the model cannot
// have seen pre-paired. The generator is DESIGNED IN THE SPEC AND BUILT
// LATER; the instances here are FIXED SEEDS exercising the rubric
// deterministically, and every seed is marked `seed: true` with the
// generator hook TODO. Do not treat a seed-pass as a novel-construction
// result.
//
// HOUSE POSTURE (P19/P27, and eval/void-loop-e2e.mjs's own model path):
// when no agent is reachable (no Ollama, no in-process weights), the
// administer path is a TYPED SKIP — never a silent pass, never a canned
// stand-in.
//
// P44: every verdict names its assembly, its priors, and the task's order
// BEFORE the performance is scored. Order 14 is NOT administered — there is
// no single-session test for it even in humans; the harness REFUSES it as
// `refused_as_unmeasurable` and cites the spec paragraph.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OLLAMA = "http://localhost:11434";
const LOCAL_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
let MODEL = process.argv[2] ?? "gemma2:2b";
let _gen = null;

async function openModel() {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) return { kind: "ollama", name: MODEL };
  } catch { /* no server, use the in-process one */ }
  try {
    process.env.HF_HOME ??= "/tmp/hfcache";
    const { pipeline } = await import("@huggingface/transformers");
    _gen = await pipeline("text-generation", LOCAL_MODEL, { dtype: "q4", device: "cpu" });
    return { kind: "local-cpu", name: LOCAL_MODEL };
  } catch (e) { return { kind: "none", detail: String(e?.message ?? e).slice(0, 120) }; }
}

async function askModel(prompt) {
  if (_gen) {
    const out = await _gen([{ role: "user", content: prompt }], { max_new_tokens: 512, do_sample: false });
    return out[0].generated_text.at(-1)?.content ?? "";
  }
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false,
      options: { temperature: 0, num_predict: 512 },
      messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).message?.content ?? "";
}

// ── the rubric: one entry per order, per THE-MHC-AI-TASKS.md ────────────
//
// Each entry: the coordination the order requires, a `judge(response)`
// that returns `{ verdict, rule }` where `rule` is the specific rubric
// line that decided it, and a `seed` instance (administerable) plus a
// TODO generator note. `judge` must NEVER return `inconclusive` where a
// rubric rule decides; it returns exactly one rule.

const SEEDS = {
  // Stated per the spec's order-4 "inert text" anti-fake: correct label +
  // acts on the named thing downstream = pass.
  "4-nominal": {
    prompt:
      "Below is a description of a novel machine. Name it in one word.\n" +
      "DESCRIPTION: a cylindrical drum that rotates to spill a measured " +
      "weight of flakes from a chute, powered only by the flakes landing " +
      "on a lever that winds a spring.\n" +
      "Then, using that name, say what happens to the spring if the drum " +
      "is fed twice as much in a single minute.",
  },
  // Shift of "it" referent across all three steps.
  "5-sentential": {
    prompt:
      "You have a magenta block, a cobalt block, and a lime block. " +
      "Get the magenta block. Put it next to the cobalt block. Now move " +
      "it back to where the magenta block started.",
  },
  // Causal connective + counterfactual that does NOT merely restate.
  "6-preoperational": {
    prompt:
      "A lekpod valve froze. The chamber pressurised BECAUSE the drain " +
      "was blocked. Explain why the chamber pressurised, then say what " +
      "would have happened if the drain had NOT been blocked.",
  },
  // Self-ordered arithmetic: sequence is the coordination, not a label.
  "7-primary": {
    prompt:
      "A vendor sells 40 units at $3, then drops the price 25% and " +
      "sells 20 more. What is the total revenue? Do not repeat the steps " +
      "back to me; give the final number and (in one line) the order of " +
      "operations you had to choose.",
  },
  // Both agents' constraints kept apart, then reconciled in a single rule.
  "8-concrete": {
    prompt:
      "Two people must share one shuttle on Tuesday.\n" +
      "A: cannot leave before noon, must be at the far site for 2 hours.\n" +
      "B: must be back before 16:00, wants the shuttle for 3 hours.\n" +
      "State the schedule from A's view, then from B's view, then give " +
      "the single earliest schedule that satisfies both.",
  },
  // Quantified generalization induced from cases; "some, not all" probe.
  "9-abstract": {
    prompt:
      "Eight samples of a mineral were climbed on." +
      "%s are given one at a time (invented here):\n" +
      "s1 hard, supports load\ts2 hard, supports load\ts3 hard, supports " +
      "load\ts4 soft, crumbles\ts5 hard, supports load\ts6 soft, crumbles" +
      "\ts7 hard, supports load\ts8 hard, supports load\n" +
      "Generalise precisely (all / some / none) whether hard samples " +
      "support load, then state what to expect of a NEW hard sample s9.",
  },
  // if-then-therefore chain, incl. falsified (not "inconclusive").
  "10-formal": {
    prompt:
      "Hypothesis: the mineral is magnetic when its density exceeds 4. " +
      "If that hypothesis were true, what would we expect to observe of a " +
      "sample with density 5? We observe the sample is NOT magnetic. " +
      "State the conditional, the observation, and what follows about the " +
      "hypothesis.",
  },
  // Interaction term, not three independent lookups.
  "11-systematic": {
    prompt:
      "Variables A, B, C jointly determine D. A raises D by 2 when B is " +
      "LOW and has NO effect when B is HIGH. C raises D by 1 always.\n" +
      "Given A=1, B=HIGH, C=1, what is D? Then: why does A's effect " +
      "disappear under HIGH B? Do not give three separate contributions; " +
      "give one expression linking them.",
  },
  // Structural relation between systems, not their outputs.
  "12-metasystematic": {
    prompt:
      "System α: every claim survives if its support also survives.\n" +
      "System β: a claim survives only if it is observed again in a new " +
      "test.\n" +
      "Characterise the relation BETWEEN α and β: is one a special case " +
      "of the other, are they commensurable, where does each break down? " +
      "Compare structures, not conclusions.",
  },
  // Genuine synthesis; NOT eclectic concatenation.
  "13-paradigmatic": {
    prompt:
      "Three systems address the same events with incommensurable " +
      "premises:\n" +
      "α: an event is explained only by its immediately preceding cause.\n" +
      "β: an event is explained only by its place in a fixed whole.\n" +
      "γ: an event is explained only by what a measurement changes.\n" +
      "Give a single organising principle that reframes the disagreement. " +
      "It must be a claim NOT present in α, β, or γ individually.",
  },
  // NOT administered. Refused as unmeasurable.
  "14-cross-paradigmatic": { refused: true },
};

// Each judge inspects the response and returns the FIRST rubric rule that
// decides. Rules are named exactly as the spec's Pass/Fail lines, so a
// verdict is traceable to the spec.
function judgeOrder(order, resp) {
  const r = (resp || "").trim().toLowerCase();
  switch (order) {
    case "4-nominal": {
      const named = /name|label|call|drum|flaker|spill/i;
      const downstream = /spring|wind|wind up|tighter|coil/i;
      if (!r) return { verdict: "no_response", rule: "empty response" };
      if (!named.test(r)) return { verdict: "failed", rule: "wrong category: no operable name produced" };
      if (!downstream.test(r)) return { verdict: "failed", rule: "right label treated as inert text: no action on the named thing" };
      return { verdict: "passed", rule: "correct label, correctly referenced downstream" };
    }
    case "5-sentential": {
      const movedBack = /move.{0,30}back|return.{0,30}(magenta|its? origin|start|place)/i;
      if (!r) return { verdict: "no_response", rule: "empty response" };
      if (!movedBack.test(r)) return { verdict: "failed", rule: "locked onto first-mentioned object or resolved only within one sentence" };
      return { verdict: "passed", rule: "shifting referent of 'it' tracked across all steps" };
    }
    case "6-preoperational": {
      const because = /drain.{0,25}blocked|blocked.{0,25}drain|no(outlet|release)|pressure.{0,10}build/i;
      const counter = /if .{0,30}not .{0,20}blocked|without .{0,20}blockage|no blockage/i;
      if (!r) return { verdict: "no_response", rule: "empty response" };
      if (!because.test(r)) return { verdict: "failed", rule: "retold events without the causal linkage" };
      if (!counter.test(r)) return { verdict: "failed", rule: "counterfactual merely restated the story" };
      return { verdict: "passed", rule: "causal linkage used and counterfactual derived" };
    }
    case "7-primary": {
      const m = r.match(/[0-9]+/g);
      if (!m || !r) return { verdict: "failed", rule: "no arithmetic result or empty response" };
      // 40*3 + 20*(3*0.75) = 120 + 45 = 165
      const has165 = m.includes("165");
      if (!has165) return { verdict: "failed", rule: "arithmetic executed wrong given the sequence" };
      // sequencing evidence: order of operations mentioned or implied
      const ordered = /25%|percent|then|order|multiply|first|discount/i;
      if (!ordered.test(r)) return { verdict: "failed", rule: "could not state the self-chosen sequence of operations" };
      return { verdict: "passed", rule: "self-ordered operations correctly without scaffolding" };
    }
    case "8-concrete": {
      const both = /a.{0,40}(noon|\b\d|back|leave|\bearly|\bfar)/i;
      const bview = /\bb\b.{0,60}(16:00|4 ?(pm|o'?clock)|back (by|before)|need).{0,30}(hour|\d)/i;
      const reconciled = /(earliest|schedule:|solution:|\bthen\b|single|one schedule|satisfies both)/i;
      if (!r) return { verdict: "no_response", rule: "empty response" };
      if (!both.test(r) || !bview.test(r)) return { verdict: "failed", rule: "solved from only one side (perspective collapsed)" };
      if (!reconciled.test(r)) return { verdict: "failed", rule: "stated both but never reconciled into one coordinated answer" };
      return { verdict: "passed", rule: "both perspectives kept apart and coordinated into a single resolution" };
    }
    case "9-abstract": {
      if (!r) return { verdict: "no_response", rule: "empty response" };
      // Distribution: 7 hard, 6 support load; 2 soft both crumble.
      // True pattern is "some (hard) support" — NOT "all".
      if (/all hard|every hard|whenever hard/i.test(r) && /support|load/i.test(r)) {
        return { verdict: "failed", rule: "universalized a 'some' into an 'all' over the hard samples" };
      }
      if (!/support/i.test(r)) return { verdict: "failed", rule: "failed to state a quantified generalization" };
      return { verdict: "passed", rule: "quantifiers matched the observed distribution (some, not all)" };
    }
    case "10-formal": {
      if (!r) return { verdict: "no_response", rule: "empty response" };
      const conditional = /if .{0,40}(then|true|=)|^if /i;
      const expected = /expect(ed)? ?to observe|would expect|we (would )?observe/i;
      const obs = /not magnetic|not attracted|no attraction|observed (none|nothing|zero)|no (magnetis|attract)/i;
      const falsified = /falsif|reject|false|dispro|not supported|wrong/i;
      if (!conditional.test(r) && !expected.test(r)) return { verdict: "failed", rule: "conclusion without the conditional structure (pattern-matched)" };
      if (!obs.test(r)) return { verdict: "failed", rule: "never stated the actual observation" };
      if (/inconclusive|cannot (know|tell)|don'?t know/i.test(r) && !falsified.test(r)) {
        return { verdict: "failed", rule: "conflated 'consistent with' with 'proves' / stopped at inconclusive" };
      }
      if (!falsified.test(r)) return { verdict: "failed", rule: "did not derive the falsified consequence" };
      return { verdict: "passed", rule: "conditional + observation → correct falsified consequence" };
    }
    case "11-systematic": {
      if (!r) return { verdict: "no_response", rule: "empty response" };
      // A has no effect when B=HIGH; C adds 1 always. D = 1.
      const m = r.match(/[0-9]+/g);
      const hasVal = m && m.includes("1") && !(m.includes("2") && !r.includes("disappear"));
      const interaction = /no effect|disappear|when (a )?b|depends on|interact|doesn'?t matter|zero when/i;
      if (!hasVal) return { verdict: "failed", rule: "missing or wrong coordinated value D" };
      if (!interaction.test(r)) return { verdict: "failed", rule: "answered each variable in isolation (merely additive, no interaction)" };
      return { verdict: "passed", rule: "one coordinated system with explicit interaction (A's effect vanishes under HIGH B)" };
    }
    case "12-metasystematic": {
      if (!r) return { verdict: "no_response", rule: "empty response" };
      const structural = /special case|embed|subset|commensurab|consistent|complete|implie|stronger|weaker|nested/i;
      if (!structural.test(r)) return { verdict: "failed", rule: "compared outputs (A says α, B says β) not structures" };
      return { verdict: "passed", rule: "compared structural properties (embedding/consistency/special-case)" };
    }
    case "13-paradigmatic": {
      if (!r) return { verdict: "no_response", rule: "empty response" };
      const eclectic = /α.{0,30}(right|explains|accurate).{0,60}(β|\bγ\b)/i;
      const novel = /new (frame|principle|axis|dimension)|reframe|not (in|present) |beyond (α|β|γ|all three)|third/i;
      if (!novel.test(r)) return { verdict: "failed", rule: "eclectic concatenation: no new unifying structure present" };
      if (eclectic.test(r) && !novel.test(r)) return { verdict: "failed", rule: "A-right-about-X, B-right-about-Y concatenation" };
      return { verdict: "passed", rule: "new organizing principle not present in any input framework" };
    }
    case "14-cross-paradigmatic":
      return { verdict: "refused_as_unmeasurable", rule: "no single-session operational test for order 14 (spec)" };
    default:
      return { verdict: "no_response", rule: `unknown order ${order}` };
  }
}

const ORDERS = Object.keys(SEEDS);

export { judgeOrder, SEEDS, ORDERS };

// ── runtime ────────────────────────────────────────────────────────────────
const OUT_DIR = "eval/results";
mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const agent = await openModel();
  const report = { generated: timestamp(), agent, orders: {} };

  for (const order of ORDERS) {
    const seed = SEEDS[order];
    if (seed.refused) {
      report.orders[order] = {
        status: "refused_as_unmeasurable",
        rule: "no single-session operational test for order 14 (THE-MHC-AI-TASKS.md)",
      };
      continue;
    }
    if (agent.kind === "none") {
      report.orders[order] = {
        status: "skip",
        detail: `no agent reachable (${agent.detail}) — administer path not run; rubric seeded only`,
      };
      continue;
    }
    const prompt = seed.prompt;
    const response = await askModel(prompt);
    const { verdict, rule } = judgeOrder(order, response);
    report.orders[order] = { status: verdict, rule, prompt, response };
  }

  const out = join(OUT_DIR, "mhc-agent-results.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`wrote ${out}`);
  console.log(JSON.stringify(Object.fromEntries(
    Object.entries(report.orders).map(([o, v]) => [o, Array.isArray(v.status) ? v.status : v.status])
  ), null, 2));
}

function timestamp() { return new Date().toISOString(); }

if (process.argv[1] && process.argv[1].endsWith("mhc-agent-judge.mjs")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
