// eval/reasoning-e2e-no-llm.mjs — how far can a question get answered,
// including a genuinely NOVEL answer never stated as one sentence, using
// only the mechanical organs already in this repo: hypergraph.js's real
// extraction/judgment (makeRelationReader), its direct graph query door
// (queryEdges/queryFillers), and verification.js's nine-cell taxonomy —
// zero model calls anywhere in this file.
//
// Not a committed regression test (no golden score to chase) — a driver,
// matching the posture eval/mine-1-*.mjs and eval/witness-batch-eval.mjs
// already hold in this repo: re-runnable, and its output is the evidence.
//
// Run: node eval/reasoning-e2e-no-llm.mjs

import { makeRelationReader, queryEdges, queryFillers } from "../hypergraph.js";
import { verificationTasksFor, verificationSummary } from "../verification.js";

async function organs() {
  const { splitSentences } = await import("../../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../../eoreader6.1/packages/engine/perceiver/text/material.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize };
}

// Real, self-contained prose — enough recurrence for the cast/vocabulary
// gates to establish real referents and a real closed vocabulary, and
// deliberately built so a two-hop chain exists that no single sentence
// states (the "novel answer" test below composes it from two real edges).
const PASSAGES = [
  {
    ref: "cabinet.txt#0-260",
    text:
      "Lincoln appointed Seward. " +
      "Historians still argue over how much Lincoln trusted Seward. " +
      "Seward negotiated the Alaska purchase. " +
      "Seward negotiated the Alaska purchase again the following spring.",
  },
  {
    ref: "cabinet.txt#260-520",
    text:
      "Lincoln nominated Chase. " +
      "The choice of Chase surprised Lincoln's own cabinet. " +
      "Chase administered the oath to Grant. " +
      "Chase administered the oath to Grant a second time, at a smaller ceremony.",
  },
  {
    ref: "cabinet.txt#520-620",
    text: "Lincoln did not dismiss Seward, whatever the newspapers printed about Lincoln that year.",
  },
];

function line(s) {
  console.log(s);
}

async function main() {
  const relationsFor = makeRelationReader(await organs());
  const report = relationsFor(PASSAGES, { pool: PASSAGES.map((p) => p.text) });

  line(`material examined: ${report.examined}`);
  line(`edges the material itself binds: ${report.edges.length}`);
  for (const e of report.edges) {
    line(`  ${e.subject} —${e.verb}${e.polarity === "-" ? " (negated)" : ""}→ ${e.object}  [${e.refs.join("; ")}]`);
  }
  line("");

  // ── Tier 1: direct claim verification (judge() via read()) ───────────
  const claims = [
    "Lincoln appointed Seward",
    "Lincoln appointed Chase", // near miss: material says NOMINATED, not appointed
    "Seward did not negotiate the Alaska purchase", // negation of a real, stated edge
    "Lincoln appointed Napoleon", // no such referent in this material at all
  ];

  line("== Tier 1: direct claim verification (no model, judge() only) ==");
  const judged = [];
  for (const c of claims) {
    const { claims: verdicts } = report.read(c);
    const v = verdicts[0];
    judged.push(v);
    line(`  "${c}" -> ${v?.verdict ?? "no claim extracted"}${v?.nearest?.[0] ? ` (nearest: ${v.nearest[0].subject} —${v.nearest[0].verb}→ ${v.nearest[0].object})` : ""}`);
  }
  line("");

  // ── Tier 2: direct graph query (queryFillers) — an answer to a
  // question that was never itself a stated sentence, read straight off
  // the material's own edges, still zero model calls. ──────────────────
  line("== Tier 2: direct graph queries (queryFillers over report.edges) ==");
  const whoDidLincolnAppoint = queryFillers(report.edges, { subject: "Lincoln", verb: "appointed" });
  line(`  who did Lincoln appoint? -> ${whoDidLincolnAppoint.map((f) => f.subject ?? f.object).join(", ")}`);
  const whoDidLincolnNominate = queryFillers(report.edges, { subject: "Lincoln", verb: "nominated" });
  line(`  who did Lincoln nominate? -> ${whoDidLincolnNominate.map((f) => f.subject ?? f.object).join(", ")}`);
  line("");

  // ── Tier 3: a genuinely NOVEL answer — a two-hop composition over the
  // graph that no single sentence in the material states. This is the
  // heart of "how far without an LLM": mechanical graph composition, not
  // generation. ──────────────────────────────────────────────────────────
  line("== Tier 3: novel answers — mechanical two-hop composition, stated nowhere as one sentence ==");
  {
    const appointee = queryFillers(report.edges, { subject: "Lincoln", verb: "appointed" })[0];
    if (appointee) {
      const secondHop = queryFillers(report.edges, { subject: appointee.object, verb: "negotiated" });
      for (const hop of secondHop) {
        line(
          `  Q: what did Lincoln's Secretary of State go on to negotiate?\n` +
            `     Lincoln —appointed→ ${appointee.object} [${appointee.refs.join("; ")}]\n` +
            `     ${appointee.object} —negotiated→ ${hop.object} [${hop.refs.join("; ")}]\n` +
            `     A (composed, never stated as one sentence): Lincoln's appointee ${appointee.object} negotiated ${hop.object}.`,
        );
      }
    }
  }
  {
    const officiant = queryFillers(report.edges, { object: "Grant", verb: "administered" })[0];
    if (officiant) {
      const whoPickedThem = queryFillers(report.edges, { object: officiant.subject, verb: "nominated" })[0];
      if (whoPickedThem) {
        line(
          `  Q: who chose the person who administered Grant's oath?\n` +
            `     ${officiant.subject} —administered→ Grant [${officiant.refs.join("; ")}]\n` +
            `     ${whoPickedThem.subject} —nominated→ ${officiant.subject} [${whoPickedThem.refs.join("; ")}]\n` +
            `     A (composed): ${whoPickedThem.subject} nominated the person (${officiant.subject}) who later administered Grant's oath.`,
        );
      }
    }
  }
  line("");

  // ── Tier 4: the verification taxonomy — how far the nine-cell grid
  // actually goes on a bound claim vs. a claim whose referent fails. ────
  line("== Tier 4: verification.js's nine-cell taxonomy, real cursor ==");
  const cases = [
    { label: "Lincoln appointed Seward (bound)", hgClaim: judged[0] },
    { label: "Lincoln appointed Napoleon (no referent)", hgClaim: judged[3] },
  ];
  for (const { label, hgClaim } of cases) {
    const tasks = verificationTasksFor({ hgReport: report, hgClaim, cursor: "eval-reasoning-e2e" });
    const summary = verificationSummary(tasks);
    line(`  ${label}:`);
    for (const t of tasks) line(`    ${t.terrain}: ${t.verdict}${t.reason ? ` — ${t.reason}` : ""}`);
    line(`    summary: ${JSON.stringify(summary)}`);
  }

  return { report, judged };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
