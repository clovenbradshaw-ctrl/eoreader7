// eval/reasoning-e2e-no-llm.mjs — how far can a question get answered,
// including a genuinely NOVEL answer never stated as one sentence, using
// only the mechanical organs already in this repo: hypergraph.js's real
// extraction/judgment (makeRelationReader), its direct graph query door
// (queryEdges/queryFillers), verification.js's nine-cell taxonomy, and —
// added in the second pass — capacity-runner.js's real evaluate door, the
// top of this repo's own mechanical checking ladder (squarePolarity +
// checkObjectSpecificity). Zero model calls anywhere in this file.
//
// Not a committed regression test (no golden score to chase) — a driver,
// matching the posture eval/mine-1-*.mjs and eval/witness-batch-eval.mjs
// already hold in this repo: re-runnable, and its output is the evidence.
// What it MEASURES that turned out to be worth pinning has been lifted
// into hypergraph.test.mjs and verification.test.mjs as real regressions.
//
// Run: node eval/reasoning-e2e-no-llm.mjs

import * as operators from "../../eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";
import { makeRelationReader, queryFillers } from "../hypergraph.js";
import { verificationTasksFor, verificationSummary } from "../verification.js";
import { makeReferentIndex } from "../cast.js";
import { makeCapacityRunner, landAct } from "../capacity-runner.js";
import { makeGrid } from "../grid.js";
import { findCapacity, unresolvedCapacity } from "../capacities.js";

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

// Two RECEIVED closed classes, each with its giver named in the engine's
// own prior register (perceiver/text/priors.js, giver "lang/en") — never a
// word list typed here. Kept separate from the organ bundle above so Tiers
// 5 and 6 can run the SAME material through readers with and without them
// and show what each one changes, rather than asserting it. app.js injects
// both for real (see its own call site's comment).
async function receivedClasses() {
  const { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, NEGATION_WORDS } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/priors.js"
  );
  return {
    determiners: new Set([...DEFINITE_DETERMINERS, ...INDEFINITE_DETERMINERS]),
    negationWords: NEGATION_WORDS,
  };
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

function tripleOf(c) {
  return c ? `${c.subject} —${c.verb}${c.polarity === "-" ? "[negated]" : ""}→ ${c.object}` : "(no claim extracted)";
}

async function main() {
  const base = await organs();
  const classes = await receivedClasses();
  // The SHIPPING configuration: app.js injects both received classes at its
  // own makeRelationReader call site, so this driver reads the way the live
  // app reads. `bare` is the same organs WITHOUT them, kept so Tiers 5 and 6
  // can show each defect and its close side by side on identical material.
  const relationsFor = makeRelationReader({ ...base, ...classes });
  const bareFor = makeRelationReader(base);
  const bare = bareFor(PASSAGES, { pool: PASSAGES });
  // `pool` is the corpus the passages were retrieved from. Three passages
  // is UNDER cite.js's own declared CORPUS_MINIMUM (10), so the
  // corpus-scale function-word filter does not run at all here — that
  // floor is declared, not a bug, and Tier 6 measures what it costs.
  const report = relationsFor(PASSAGES, { pool: PASSAGES });

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
    line(
      `  "${c}" -> ${v?.verdict ?? "no claim extracted"}` +
        `${v?.endpoints ? ` (subject: ${v.endpoints.subject}, object: ${v.endpoints.object})` : ""}` +
        `${v?.nearest?.[0] ? ` (nearest: ${v.nearest[0].subject} —${v.nearest[0].verb}→ ${v.nearest[0].object})` : ""}`,
    );
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
  // actually goes on a bound claim vs. a claim whose object this material
  // has never heard of. ────────────────────────────────────────────────
  line("== Tier 4: verification.js's nine-cell taxonomy, real cursor ==");
  const cases = [
    { label: "Lincoln appointed Seward (bound)", hgClaim: judged[0] },
    { label: "Lincoln appointed Napoleon (object nowhere in this material)", hgClaim: judged[3] },
  ];
  for (const { label, hgClaim } of cases) {
    const tasks = verificationTasksFor({ hgReport: report, hgClaim, cursor: "eval-reasoning-e2e" });
    const summary = verificationSummary(tasks);
    line(`  ${label}:`);
    for (const t of tasks) line(`    ${t.terrain}: ${t.verdict}${t.reason ? ` — ${t.reason}` : ""}`);
    line(`    summary: ${JSON.stringify(summary)}`);
  }
  line("");

  // ── Tier 5: negation, MEASURED rather than assumed. The first pass of
  // this driver concluded that negation-as-contradiction "lives only in
  // capacity-runner.js, not in bare read()". That conclusion was drawn
  // from one specimen, and it is wrong: judge() returns `contradicted`
  // perfectly well through bare read() — the specimen just happened to
  // use the ONE English negation shape the extractor cannot see. The
  // engine's own negation gate is `negationBeforeVerbFor` (relations.js):
  // the negation word must sit BEFORE the verb it negates. ─────────────
  //
  // What the extractor cannot read, it must not be allowed to judge. When
  // the negation lands inside the OBJECT span instead, polarity stays "+"
  // on a claim that means the opposite — and the last row below is the
  // sharpest case in this whole driver: NOT a missed contradiction but an
  // INVERTED one, bound and cited to the very passage that refutes it.
  line("== Tier 5: negation — read correctly, or withheld; never judged unread ==");
  for (const c of [
    "Seward never negotiated the Alaska purchase", // pre-verbal, closed class
    "Seward hardly negotiated the Alaska purchase", // pre-verbal, same class, different word
    "Seward did not negotiate the Alaska purchase", // periphrastic: "did" takes the verb slot
    "Seward didn't negotiate the Alaska purchase", // contracted: nothing extracts at all
    "Seward negotiated not the Alaska purchase", // post-verbal: outside the gate entirely
    "Lincoln did dismiss Seward", // the material says he did NOT — inverted, and cited
  ]) {
    const off = bare.read(c).claims[0];
    const on = report.read(c).claims[0];
    const cite = off?.refs?.length ? ` [${off.refs.join("; ")}]` : "";
    line(
      `  "${c}"\n` +
        `     read as: ${tripleOf(off)}\n` +
        `     no negation class -> ${off?.verdict ?? "no claim extracted"}${cite}   |   received class injected -> ${on?.verdict ?? "no claim extracted"}`,
    );
  }
  line(`  (the engine's own gate is relations.js::negationBeforeVerbFor — the negation word must precede the verb)`);
  line("");

  // ── Tier 6: what the corpus floor costs on the OBJECT side. cite.js's
  // commonTerms declares its own floor (CORPUS_MINIMUM chunks) below
  // which the function-word filter does not run — a declared limit whose
  // disclosed residue is "auxiliary noise in the vocabulary", i.e. it can
  // only widen what the reader HEARS. Below, measured on this same
  // material, it does something that disclosure does not cover. ────────
  line("== Tier 6: a shared definite article is not evidence (received closed class, giver named) ==");
  {
    for (const c of ["Seward negotiated the Suez canal", "Seward negotiated Suez canal", "Seward negotiated the Alaska purchase"]) {
      const off = bare.read(c).claims[0];
      const on = report.read(c).claims[0];
      line(`  "${c}"\n     no determiner organ -> ${off?.verdict ?? "none"}   |   received class injected -> ${on?.verdict ?? "none"}`);
    }
    line(`  (the article alone was the whole binding: the same claim without "the" was already unbound)`);
  }
  line("");

  // ── Tier 7: the full mechanical ladder — capacity-runner.js's evaluate
  // door. Same organs, still zero model calls, but now judge()'s raw
  // verdict is SQUARED against its own negation and checked for object
  // specificity before anything is allowed to land as a verdict. ───────
  //
  // Run against the BARE reader on purpose — the two received classes are
  // now injected in the shipping app, so this tier answers the separate
  // question of what the ladder catches on its own, without them. Both
  // defenses are real and independent: Tier 6's fabricated object never
  // gets produced once the determiner class is in, and it is still caught
  // one rung up when it is not.
  line("== Tier 7: the whole checking ladder, WITHOUT the received classes (evaluate + squarePolarity + checkObjectSpecificity) ==");
  {
    const referentIndexFor = makeReferentIndex(base);
    const runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor: bareFor });
    const grid = makeGrid({ operators, taskLog });
    grid.withCapacities({ findCapacity, unresolvedCapacity });
    const sources = { "cabinet.txt": PASSAGES.map((p) => p.text).join(" ") };
    let log = grid.createLog();
    for (const claim of [
      "Seward negotiated the Alaska purchase", // true, stated
      "Seward never negotiated the Alaska purchase", // false, negation of a stated edge
      "Seward negotiated the Suez canal", // Tier 6's fabricated object, one rung up
    ]) {
      const landed = landAct(grid, log, `evaluate "${claim}" at Link from differentiate ground cabinet.txt broken:rotation`, {
        sources,
        runCapacity,
      });
      if (!landed.ok) {
        line(`  "${claim}" -> REFUSED AT THE GRAMMAR: ${landed.refusal.type} — ${landed.refusal.detail}`);
        continue;
      }
      log = landed.log;
      const eva = grid.foldGrid(log).acts.filter((a) => a.operator === "EVA").pop();
      const raw = eva?.result?.rawVerdict ?? "(none)";
      const objectCheck = eva?.result?.objectCheck;
      line(
        `  "${claim}"\n` +
          `     raw judge(): ${raw} | squared: ${eva?.result?.squaring?.trusted ?? "n/a"}` +
          `${objectCheck ? ` | object specific: ${objectCheck.trusted}` : ""}\n` +
          `     landed verdict: ${eva?.verdict ?? "undetermined — withheld, never guessed"}`,
      );
    }
  }

  return { report, judged };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
