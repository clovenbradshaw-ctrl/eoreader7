// lib/reasoning-e2e.mjs — "how far without an LLM", as ONE implementation
// shared by `eval/the-fold/reasoning-e2e-no-llm.mjs` (prints) and
// `native/tests/reasoning-e2e.test.js` (reads every tier's verdict on each
// suite run). the-fold P95 / S65.
//
// WHAT THE 2026-09-05 RE-RUN FOUND. Every VERDICT in
// `results/reasoning-e2e-no-llm-RESULTS.md` reproduced — Tier 1's four,
// Tier 5's six-row "after" table, Tier 6, Tier 7, the two composed
// answers — while the driver printed `undefined —undefined→ undefined` for
// all nine of the material's edges, every "read as:" line and every
// "nearest:" edge. It read `e.subject / e.verb / e.object` off edges that
// have carried `end1 / label / end2` since the SVO wipe (2026-09-02,
// the-fold P76/P80) — the identical unmigrated read S64 found at 47 sites
// in the MHC battery, in a second driver. The reads are migrated here, at
// the seam, and the material is by construction (three passages written
// for the driver), so its verdicts are legitimately pinnable.
//
// The organs are handed in (the coref-agreement.mjs posture) so the driver
// can read through the frozen provider where it is checked out and the
// test through the engine's own adapters; both are reported.

const T = (c) => (c ? `${c.end1} —${c.label}${c.polarity === "-" ? "[negated]" : ""}→ ${c.end2}` : "(no claim extracted)");

// Real, self-contained prose — enough recurrence for the cast/vocabulary
// gates to establish real referents and a real closed vocabulary, and
// deliberately built so a two-hop chain exists that no single sentence
// states (the "novel answer" test below composes it from two real edges).
export const PASSAGES = [
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

export const TIER1_CLAIMS = [
  "Lincoln appointed Seward",
  "Lincoln appointed Chase", // near miss: material says NOMINATED, not appointed
  "Seward did not negotiate the Alaska purchase", // negation of a real, stated edge
  "Lincoln appointed Napoleon", // no such referent in this material at all
];
export const TIER5_CLAIMS = [
  "Seward never negotiated the Alaska purchase", // pre-verbal, closed class
  "Seward hardly negotiated the Alaska purchase", // pre-verbal, same class, different word
  "Seward did not negotiate the Alaska purchase", // periphrastic: "did" takes the verb slot
  "Seward didn't negotiate the Alaska purchase", // contracted: nothing extracts at all
  "Seward negotiated not the Alaska purchase", // post-verbal: outside the gate entirely
  "Lincoln did dismiss Seward", // the material says he did NOT — inverted, and cited
];
export const TIER6_CLAIMS = ["Seward negotiated the Suez canal", "Seward negotiated Suez canal", "Seward negotiated the Alaska purchase"];
export const TIER7_CLAIMS = [
  "Seward negotiated the Alaska purchase", // true, stated
  "Seward never negotiated the Alaska purchase", // false, negation of a stated edge
  "Seward negotiated the Suez canal", // Tier 6's fabricated object, one rung up
];

/**
 * @param {object} p
 * @param {object} p.organs — { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize }
 * @param {object} p.classes — { determiners, negationWords } (the received closed classes app.js injects)
 * @param {object} p.modules — { makeRelationReader, queryFillers, verificationTasksFor, verificationSummary, makeReferentIndex, makeCapacityRunner, landAct, makeGrid, findCapacity, unresolvedCapacity, gridOperators, taskLog }
 */
export function runReasoningE2E({ organs, classes, modules }) {
  const { makeRelationReader, queryFillers, verificationTasksFor, verificationSummary, makeReferentIndex, makeCapacityRunner, landAct, makeGrid, findCapacity, unresolvedCapacity, gridOperators, taskLog } = modules;
  const lines = [];
  const line = (s) => lines.push(s);

  // The SHIPPING configuration: app.js injects both received classes at its
  // own makeRelationReader call site, so this reads the way the live app
  // reads. `bare` is the same organs WITHOUT them, kept so Tiers 5 and 6
  // can show each defect and its close side by side on identical material.
  const relationsFor = makeRelationReader({ ...organs, ...classes });
  const bareFor = makeRelationReader(organs);
  const bare = bareFor(PASSAGES, { pool: PASSAGES });
  // `pool` is the corpus the passages were retrieved from. Three passages
  // is UNDER cite.js's own declared CORPUS_MINIMUM (10), so the
  // corpus-scale function-word filter does not run at all here — that
  // floor is declared, not a bug, and Tier 6 measures what it costs.
  const report = relationsFor(PASSAGES, { pool: PASSAGES });

  const edges = report.edges.map((e) => ({ end1: e.end1, label: e.label, end2: e.end2, polarity: e.polarity, refs: e.refs }));
  line(`material examined: ${report.examined}`);
  line(`edges the material itself binds: ${edges.length}`);
  for (const e of edges) line(`  ${e.end1} —${e.label}${e.polarity === "-" ? " (negated)" : ""}→ ${e.end2}  [${e.refs.join("; ")}]`);
  line("");

  // ── Tier 1: direct claim verification (judge() via read()) ───────────
  line("== Tier 1: direct claim verification (no model, judge() only) ==");
  const tier1 = [];
  const judged = [];
  for (const c of TIER1_CLAIMS) {
    const { claims: verdicts } = report.read(c);
    const v = verdicts[0];
    judged.push(v);
    const nearest = v?.nearest?.[0] ? { end1: v.nearest[0].end1, label: v.nearest[0].label, end2: v.nearest[0].end2 } : null;
    tier1.push({ claim: c, verdict: v?.verdict ?? "no claim extracted", endpoints: v?.endpoints ?? null, nearest });
    line(
      `  "${c}" -> ${v?.verdict ?? "no claim extracted"}` +
        `${v?.endpoints ? ` (subject: ${v.endpoints.subject}, object: ${v.endpoints.object})` : ""}` +
        `${nearest ? ` (nearest: ${nearest.end1} —${nearest.label}→ ${nearest.end2})` : ""}`,
    );
  }
  line("");

  // ── Tier 2: direct graph query (queryFillers) ─────────────────────────
  line("== Tier 2: direct graph queries (queryFillers over report.edges) ==");
  const fill = (f) => f.subject ?? f.object;
  const appointed = queryFillers(report.edges, { subject: "Lincoln", verb: "appointed" }).map(fill);
  const nominated = queryFillers(report.edges, { subject: "Lincoln", verb: "nominated" }).map(fill);
  line(`  who did Lincoln appoint? -> ${appointed.join(", ")}`);
  line(`  who did Lincoln nominate? -> ${nominated.join(", ")}`);
  line("");
  const tier2 = { appointed, nominated };

  // ── Tier 3: a genuinely NOVEL answer — two-hop composition ───────────
  line("== Tier 3: novel answers — mechanical two-hop composition, stated nowhere as one sentence ==");
  const tier3 = [];
  {
    const appointee = queryFillers(report.edges, { subject: "Lincoln", verb: "appointed" })[0];
    if (appointee) {
      const secondHop = queryFillers(report.edges, { subject: appointee.object, verb: "negotiated" });
      for (const hop of secondHop) {
        tier3.push({ q: "what did Lincoln's Secretary of State go on to negotiate?", chain: [["Lincoln", "appointed", appointee.object], [appointee.object, "negotiated", hop.object]], answer: `Lincoln's appointee ${appointee.object} negotiated ${hop.object}.` });
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
        tier3.push({ q: "who chose the person who administered Grant's oath?", chain: [[officiant.subject, "administered", "Grant"], [whoPickedThem.subject, "nominated", officiant.subject]], answer: `${whoPickedThem.subject} nominated the person (${officiant.subject}) who later administered Grant's oath.` });
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

  // ── Tier 4: the verification taxonomy ────────────────────────────────
  line("== Tier 4: verification.js's nine-cell taxonomy, real cursor ==");
  const tier4 = [];
  for (const { label, hgClaim } of [
    { label: "Lincoln appointed Seward (bound)", hgClaim: judged[0] },
    { label: "Lincoln appointed Napoleon (object nowhere in this material)", hgClaim: judged[3] },
  ]) {
    const tasks = verificationTasksFor({ hgReport: report, hgClaim, cursor: "eval-reasoning-e2e" });
    const summary = verificationSummary(tasks);
    tier4.push({ label, summary, cells: tasks.map((t) => ({ terrain: t.terrain, verdict: t.verdict })) });
    line(`  ${label}:`);
    for (const t of tasks) line(`    ${t.terrain}: ${t.verdict}${t.reason ? ` — ${t.reason}` : ""}`);
    line(`    summary: ${JSON.stringify(summary)}`);
  }
  line("");

  // ── Tier 5: negation, MEASURED rather than assumed ───────────────────
  line("== Tier 5: negation — read correctly, or withheld; never judged unread ==");
  const tier5 = [];
  for (const c of TIER5_CLAIMS) {
    const off = bare.read(c).claims[0];
    const on = report.read(c).claims[0];
    const cite = off?.refs?.length ? ` [${off.refs.join("; ")}]` : "";
    tier5.push({ claim: c, readAs: T(off), off: off?.verdict ?? "no claim extracted", on: on?.verdict ?? "no claim extracted" });
    line(
      `  "${c}"\n` +
        `     read as: ${T(off)}\n` +
        `     no negation class -> ${off?.verdict ?? "no claim extracted"}${cite}   |   received class injected -> ${on?.verdict ?? "no claim extracted"}`,
    );
  }
  line(`  (the engine's own gate is relations.js::negationBeforeVerbFor — the negation word must precede the verb)`);
  line("");

  // ── Tier 6: a shared definite article is not evidence ────────────────
  line("== Tier 6: a shared definite article is not evidence (received closed class, giver named) ==");
  const tier6 = [];
  for (const c of TIER6_CLAIMS) {
    const off = bare.read(c).claims[0];
    const on = report.read(c).claims[0];
    tier6.push({ claim: c, off: off?.verdict ?? "none", on: on?.verdict ?? "none" });
    line(`  "${c}"\n     no determiner organ -> ${off?.verdict ?? "none"}   |   received class injected -> ${on?.verdict ?? "none"}`);
  }
  line(`  (the article alone was the whole binding: the same claim without "the" was already unbound)`);
  line("");

  // ── Tier 7: the full mechanical ladder, WITHOUT the received classes ─
  line("== Tier 7: the whole checking ladder, WITHOUT the received classes (evaluate + squarePolarity + checkObjectSpecificity) ==");
  const tier7 = [];
  {
    const referentIndexFor = makeReferentIndex(organs);
    const runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor: bareFor });
    const grid = makeGrid({ operators: gridOperators, taskLog });
    grid.withCapacities({ findCapacity, unresolvedCapacity });
    const sources = { "cabinet.txt": PASSAGES.map((p) => p.text).join(" ") };
    let log = grid.createLog();
    for (const claim of TIER7_CLAIMS) {
      const landed = landAct(grid, log, `evaluate "${claim}" at Link from differentiate ground cabinet.txt broken:rotation`, { sources, runCapacity });
      if (!landed.ok) {
        tier7.push({ claim, refused: landed.refusal });
        line(`  "${claim}" -> REFUSED AT THE GRAMMAR: ${landed.refusal.type} — ${landed.refusal.detail}`);
        continue;
      }
      log = landed.log;
      const eva = grid.foldGrid(log).acts.filter((a) => a.operator === "EVA").pop();
      const raw = eva?.result?.rawVerdict ?? "(none)";
      const objectCheck = eva?.result?.objectCheck;
      const landedVerdict = eva?.verdict ?? "undetermined — withheld, never guessed";
      tier7.push({ claim, raw, squared: eva?.result?.squaring?.trusted ?? "n/a", objectSpecific: objectCheck ? objectCheck.trusted : null, landed: landedVerdict });
      line(
        `  "${claim}"\n` +
          `     raw judge(): ${raw} | squared: ${eva?.result?.squaring?.trusted ?? "n/a"}` +
          `${objectCheck ? ` | object specific: ${objectCheck.trusted}` : ""}\n` +
          `     landed verdict: ${landedVerdict}`,
      );
    }
  }

  return { lines, edges, tier1, tier2, tier3, tier4, tier5, tier6, tier7 };
}

/**
 * The organs, resolved the way the driver always did: the frozen provider
 * (`legacy-eoreader6.1`) where it is checked out, else the engine's own
 * adapters — and which one, returned, so it is printed beside the numbers.
 */
export async function resolveOrgans({ native, legacy, existsSync }) {
  const base = legacy && existsSync(`${legacy}/packages/engine/perceiver/text/spans.js`) ? `${legacy}/packages/engine/perceiver/text` : `${native}/adapters/text`;
  const provider = base.includes("legacy-eoreader6.1") ? "legacy-eoreader6.1 (frozen provider)" : "native adapters/text (engine)";
  const { splitSentences } = await import(`${base}/spans.js`);
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${base}/surfaces.js`);
  const { discoverRelationVocab, extractRelations } = await import(`${base}/relations.js`);
  const { tokenize } = await import(`${base}/material.js`);
  const { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, NEGATION_WORDS } = await import(`${base}/priors.js`);
  return {
    provider,
    organs: { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize },
    classes: { determiners: new Set([...DEFINITE_DETERMINERS, ...INDEFINITE_DETERMINERS]), negationWords: NEGATION_WORDS },
  };
}

/** The modules: the engine's organs, the-fold's verification grid and terminal grammar, app.js's own grid wiring. */
export async function resolveModules({ native, fold }) {
  const { makeRelationReader, queryFillers, makeReferentIndex, makeCapacityRunner, landAct, findCapacity, unresolvedCapacity } = await import(`${native}/organs/index.js`);
  const { verificationTasksFor, verificationSummary } = await import(`${fold}/verification.js`);
  const { makeGrid } = await import(`${fold}/grid.js`);
  const { TERRAIN_BY_DOMAIN, isCurrentOperator } = await import(`${native}/kernel/cube.js`);
  const taskLog = await import(`${native}/kernel/task-log.js`);
  return { makeRelationReader, queryFillers, verificationTasksFor, verificationSummary, makeReferentIndex, makeCapacityRunner, landAct, makeGrid, findCapacity, unresolvedCapacity, gridOperators: { TERRAIN_BY_DOMAIN, isCurrentOperator }, taskLog };
}
