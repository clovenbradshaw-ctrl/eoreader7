// eval/asserted-eval.mjs — the assertion tier's own eval harness, decoupled
// from MINE-1's bound/unbound rubric on purpose: that rubric measures exact
// triple-shape convergence between two independently-extracted readings,
// which the prior investigation showed is dominated by its own strictness
// (unbound stable at 35-39% across nine vocabulary configurations while the
// same graph scored 80% under an entailment-style rubric). This harness asks
// different questions, each mechanically scoreable or honestly labeled:
//
//   1. SYNTHETIC ADVERSARIAL SUITE — ground truth by construction. Each case
//      plants an intended edge behind a syntax shape the agency-civic golden
//      already named as extractRelations's gaps (passive voice, relative
//      clauses, coordinated verbs, fronted adverbials), plus a planted-false
//      co-occurrence case and two paraphrase cases. Scored heard /
//      mis-heard / missed / fabricated per case — no annotator needed,
//      because the author of a synthetic sentence knows what it states.
//
//   2. ORDER-ARM SEPARATION — does the per-edge word-salad count
//      (asserted.js's orderArm) actually separate syntax-borne edges from
//      mis-heard ones on this suite? Reported as the two distributions,
//      never as a cut: if they separate, a later pass can EARN a threshold;
//      if they don't, that negative result is disclosed equally.
//
//   3. REAL PROSE + BLIND SHEET — the reader run over the already-captured
//      Wikipedia War-and-Peace fixture (web.js's own extractReadable, the
//      same face a saved page gets), edges stratified by standing
//      (corroborated / single-witness), and a BLIND annotation sheet
//      emitted with every engine verdict stripped, for a hand-precision
//      pass. The hand pass itself is REQUIRED, not fabricated here —
//      agency-civic's own discipline; an LLM-proxy pass is labeled as
//      exactly that wherever it lands.
//
// DECLARED NUMBERS, fixed before the first run and not revisited
// (eoreader6.1's tune-nothing-against-the-answer rule):
//
//   · draws = 200, seed = 0 — the arm's resolution; this repo's standing
//     null-arm number (the kinds arm, the measure door, the reflex meter
//     all declare 200), giver named, nothing tuned here.
//   · WITNESS_FLOOR = 2 — structural, asserted.js's own declaration.
//   · real-prose paragraph gate: a paragraph joins the material only if the
//     engine's own splitSentences finds >= 2 sentences in it — structural,
//     tied to the witness floor (a passage that cannot hold two statements
//     cannot corroborate one), and it is also what drops the fixture's
//     navigation/caption fragments without a hand-picked byte floor.
//   · blind-sheet budget: 24 items, split evenly across the strata present
//     — an annotation budget, declared as exactly that (it bounds the hand
//     pass's cost, never any statistical claim; results are phrased k of n).
//
// Run: node eval/asserted-eval.mjs
// Writes: eval/results/asserted-eval.md, asserted-blind-sheet.json,
//         asserted-blind-key.json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { makeRelationReader } from "../hypergraph.js";
import { extractReadable } from "../web.js";
import { seededShuffle, seedFrom } from "../asserted.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, "..", "..", "eoreader7", "legacy-eoreader6.1", "packages", "engine");

const DRAWS = 200;
const SEED = 0;
const SHEET_BUDGET = 24;

const organs = async () => {
  const { splitSentences } = await import(join(ENGINE, "perceiver/text/spans.js"));
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    join(ENGINE, "perceiver/text/surfaces.js")
  );
  const { discoverRelationVocab, extractRelations } = await import(join(ENGINE, "perceiver/text/relations.js"));
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(join(ENGINE, "perceiver/text/material.js"));
  return {
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
    buildFrequencyTable,
    functionWordSet,
  };
};

// ── the synthetic suite ─────────────────────────────────────────────────────
//
// SETUP is shared by every case: it establishes the cast (each name recurs)
// and puts every probe verb into the material's own measured vocabulary
// through an AFFIRMATIVE use after a DIFFERENT surface (Anatole Kuragin),
// so no case's probe edge is pre-stated by its own setup — vocabulary
// admission and extraction are thereby separable per case: a probe verb
// missing from the vocabulary would be a different failure than a probe
// sentence the extractor mis-hears.
const SETUP = {
  ref: "setup.txt#0-600",
  text:
    "Pierre Bezukhov entered the club at noon, and Pierre Bezukhov greeted nobody. " +
    "Anatole Kuragin married Mademoiselle Bourienne that spring, everyone recalled. " +
    "Helene watched the tables quietly, and Helene said little. " +
    "Dolokhov entered soon after, and Dolokhov called for cards. " +
    "Anatole Kuragin trusted his valet completely. " +
    "Anatole Kuragin wed for position, said the old countess. " +
    "Helene spoke to the countess only. Dolokhov spoke loudly of the stakes.",
};

// The filler pool stands in for the live corpus so cite.js::commonTerms can
// measure a closed class at all (CORPUS_MINIMUM) — same construction as
// hypergraph.test.mjs's own POOL, same reason.
const FILLER =
  "The house stood at the end of the road, and the road ran down to the river. " +
  "In the morning the light came over the water, and the birds rose from the reeds. " +
  "It was quiet in the garden, and the gate hung open on its hinge. " +
  "The old man walked to the market in the town, and the town was full of voices. " +
  "By the evening the lamps were lit in the windows, and the smoke stood over the roofs. " +
  "The children ran along the wall by the church, and the bell rang the hour. " +
  "A cart came up the road from the fields, and the horse was tired of the load. " +
  "The rain fell on the square for a day and a night, and the river rose under the bridge. " +
  "In the winter the snow lay on the hills, and the paths were lost until the thaw. " +
  "The letters were kept in a drawer of the desk, and the desk stood by the window.";

const CASES = [
  {
    id: "control-svo",
    category: "control",
    probes: [{ ref: "probe.txt#0-100", text: "Pierre Bezukhov married Helene in Petersburg that winter." }],
    intended: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "+" }],
    forbidden: [],
  },
  {
    id: "passive",
    category: "passive voice",
    probes: [{ ref: "probe.txt#0-100", text: "Helene was married by Pierre Bezukhov in Petersburg." }],
    intended: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "+" }],
    // The reversed hearing is the named hazard: agent and patient swapped.
    forbidden: [{ subject: "helene", verb: "married", object: "pierre", polarity: "+" }],
  },
  {
    id: "relative-clause",
    category: "relative clause",
    probes: [{ ref: "probe.txt#0-100", text: "Pierre Bezukhov, who married Helene, left at once for Moscow." }],
    intended: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "+" }],
    forbidden: [],
  },
  {
    id: "coordinated-verbs",
    category: "coordinated verbs",
    probes: [{ ref: "probe.txt#0-100", text: "Pierre Bezukhov married Helene and trusted Dolokhov completely." }],
    intended: [
      { subject: "bezukhov", verb: "married", object: "helene", polarity: "+" },
      { subject: "bezukhov", verb: "trusted", object: "dolokhov", polarity: "+" },
    ],
    // The elided-subject hazard: the second verb's nearest left neighbour is
    // the first verb's object.
    forbidden: [{ subject: "helene", verb: "trusted", object: "dolokhov", polarity: "+" }],
  },
  {
    id: "fronted-adverbial",
    category: "fronted adverbial",
    probes: [{ ref: "probe.txt#0-100", text: "In the deep winter of that year, Pierre Bezukhov married Helene." }],
    intended: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "+" }],
    forbidden: [],
  },
  {
    id: "negation",
    category: "negation",
    probes: [{ ref: "probe.txt#0-100", text: "Pierre Bezukhov never married Helene, whatever the gossips said." }],
    intended: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "-" }],
    forbidden: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "+" }],
  },
  {
    id: "planted-false",
    category: "planted co-occurrence",
    probes: [
      {
        ref: "probe.txt#0-140",
        text: "Pierre Bezukhov and Helene spoke of Dolokhov all evening. Married friends surrounded them at the club.",
      },
    ],
    intended: [{ subject: "helene", verb: "spoke", object: "dolokhov", polarity: "+" }],
    // Every token of "Pierre married Helene" is present; the text never
    // binds it. The byte tier passes this whole — only structure refuses it.
    forbidden: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "+" }],
  },
  {
    id: "paraphrase-same-verb",
    category: "paraphrase (same verb)",
    probes: [
      { ref: "probe.txt#0-100", text: "Pierre Bezukhov married Helene that winter." },
      { ref: "probe2.txt#0-100", text: "Pierre Bezukhov married Helene before the spring." },
    ],
    intended: [{ subject: "bezukhov", verb: "married", object: "helene", polarity: "+", minStatements: 2 }],
    forbidden: [],
  },
  {
    id: "paraphrase-cross-verb",
    category: "paraphrase (different verb)",
    probes: [
      { ref: "probe.txt#0-100", text: "Pierre Bezukhov married Helene that winter." },
      { ref: "probe2.txt#0-100", text: "Pierre Bezukhov wed Helene before the spring." },
    ],
    // One fact, two verbs. The reader has no synonymy organ and is expected
    // to keep them apart — this case exists to MEASURE that, not to assume
    // it, and its result is a disclosure either way.
    intended: [
      { subject: "bezukhov", verb: "married", object: "helene", polarity: "+" },
      { subject: "bezukhov", verb: "wed", object: "helene", polarity: "+" },
    ],
    forbidden: [],
  },
];

const fold = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const containsHead = (endpointText, head) => fold(endpointText).includes(fold(head));

const scoreCase = (reader, kase) => {
  const probeRefs = new Set(kase.probes.map((p) => p.ref));
  const probeEdges = reader.edges.filter((e) => e.refs.some((r) => probeRefs.has(r)));
  const results = { heard: [], misheard: [], missed: [], fabricated: [] };

  for (const want of kase.intended) {
    const inVocab = reader.vocabulary.verbs > 0;
    const exact = probeEdges.find(
      (e) =>
        (e.label ?? e.verb) === want.verb &&
        containsHead((e.end1 ?? e.subject), want.subject) &&
        containsHead((e.end2 ?? e.object), want.object) &&
        e.polarity === want.polarity &&
        (!want.minStatements || e.assertion.statements >= want.minStatements),
    );
    if (exact) {
      results.heard.push({ want, edge: exact });
      continue;
    }
    const sameVerb = probeEdges.filter((e) => (e.label ?? e.verb) === want.verb);
    if (sameVerb.length) {
      results.misheard.push({ want, heardInstead: sameVerb });
    } else {
      results.missed.push({ want, vocabularyMeasured: inVocab });
    }
  }
  for (const bad of kase.forbidden) {
    const hit = probeEdges.find(
      (e) =>
        (e.label ?? e.verb) === bad.verb &&
        containsHead((e.end1 ?? e.subject), bad.subject) &&
        containsHead((e.end2 ?? e.object), bad.object) &&
        e.polarity === bad.polarity,
    );
    if (hit) results.fabricated.push({ bad, edge: hit });
  }
  return { probeEdges, results };
};

// ── run ─────────────────────────────────────────────────────────────────────

const o = await organs();
const make = makeRelationReader(o);
const lines = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};

say("# asserted-eval — the assertion tier measured");
say("");
say(`Declared before running: draws=${DRAWS}, seed=${SEED}, sheet budget=${SHEET_BUDGET}.`);
say("");

// Part 1 + 2: the synthetic suite, armed.
say("## 1. Synthetic adversarial suite (ground truth by construction)");
say("");
const armTrue = [];
const armErrant = [];
let tally = { heard: 0, misheard: 0, missed: 0, fabricated: 0, forbiddenRefused: 0 };

for (const kase of CASES) {
  const material = [SETUP, ...kase.probes];
  const pool = [
    ...material,
    ...FILLER.split(". ").map((s, i) => ({ ref: `filler.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
  ];
  const reader = make(material, { pool, assert: { draws: DRAWS, seed: SEED } });
  const { probeEdges, results } = scoreCase(reader, kase);

  tally.heard += results.heard.length;
  tally.misheard += results.misheard.length;
  tally.missed += results.missed.length;
  tally.fabricated += results.fabricated.length;
  tally.forbiddenRefused += kase.forbidden.length - results.fabricated.length;

  say(`### ${kase.id} (${kase.category})`);
  for (const h of results.heard) {
    const a = h.edge.assertion;
    say(
      `- HEARD: ${h.want.subject} —${h.want.verb}${h.want.polarity === "-" ? " (negated)" : ""}→ ${h.want.object}` +
        ` · standing ${a.standing}, ${a.statements} statement(s), salad ${a.orderArm.fired}/${a.orderArm.draws}`,
    );
    armTrue.push({ case: kase.id, verb: (h.edge.label ?? h.edge.verb), fired: a.orderArm.fired });
  }
  for (const m of results.misheard) {
    say(
      `- MIS-HEARD: wanted ${m.want.subject} —${m.want.verb}→ ${m.want.object}; heard instead ` +
        m.heardInstead.map((e) => `"${(e.end1 ?? e.subject)}" —${(e.label ?? e.verb)}${e.polarity === "-" ? " (neg)" : ""}→ "${(e.end2 ?? e.object)}" [salad ${e.assertion.orderArm.fired}/${DRAWS}]`).join("; "),
    );
    for (const e of m.heardInstead) armErrant.push({ case: kase.id, verb: (e.label ?? e.verb), fired: e.assertion.orderArm.fired });
  }
  for (const m of results.missed)
    say(`- MISSED: ${m.want.subject} —${m.want.verb}→ ${m.want.object} (vocabulary measured: ${m.vocabularyMeasured})`);
  for (const f of results.fabricated) {
    say(
      `- FABRICATED (forbidden edge heard): "${(f.edge.end1 ?? f.edge.subject)}" —${(f.edge.label ?? f.edge.verb)}→ "${(f.edge.end2 ?? f.edge.object)}" [salad ${f.edge.assertion.orderArm.fired}/${DRAWS}]`,
    );
    armErrant.push({ case: kase.id, verb: (f.edge.label ?? f.edge.verb), fired: f.edge.assertion.orderArm.fired });
  }
  if (!results.heard.length && !results.misheard.length && !results.missed.length && !results.fabricated.length)
    say("- (no intended or forbidden edges scored)");
  // Every probe edge not accounted for above is disclosure too — what else
  // the reader asserted about the probe sentences.
  const accounted = new Set([
    ...results.heard.map((h) => h.edge),
    ...results.misheard.flatMap((m) => m.heardInstead),
    ...results.fabricated.map((f) => f.edge),
  ]);
  for (const e of probeEdges.filter((e) => !accounted.has(e)))
    say(
      `- also asserted: "${(e.end1 ?? e.subject)}" —${(e.label ?? e.verb)}${e.polarity === "-" ? " (neg)" : ""}→ "${(e.end2 ?? e.object)}" · ${e.assertion.standing}, salad ${e.assertion.orderArm.fired}/${DRAWS}`,
    );
  say("");
}

say(`**Tally:** heard ${tally.heard}, mis-heard ${tally.misheard}, missed ${tally.missed}, ` +
  `fabricated ${tally.fabricated} (forbidden edges correctly refused: ${tally.forbiddenRefused}).`);
say("");

say("## 2. Order-arm separation (counts, never a cut)");
say("");
const dist = (rows) =>
  rows.length
    ? `n=${rows.length}, fired: [${rows.map((r) => r.fired).sort((a, b) => a - b).join(", ")}] of ${DRAWS}`
    : "n=0";
say(`- syntax-borne (heard-as-intended) edges: ${dist(armTrue)}`);
say(`- errant (mis-heard or fabricated) edges: ${dist(armErrant)}`);
say("");
say(
  "No threshold is drawn from these counts here: earning a cut needs more material than one synthetic suite, " +
    "and tuning one against this suite's own construction would be calibrating on the answer key.",
);
say("");
say(
  "Disclosed confound, visible in the counts themselves: an edge's fired count scales with how many " +
    "sentences carry its words (each is another shuffle that can luck into shape), so raw counts are not " +
    "comparable across edges with different witness counts — a corroborated edge fires more, not because it " +
    "is weaker but because it is stated more. Any earned cut would have to condition on that.",
);
say("");

// Part 3: real prose.
say("## 3. Real prose — Wikipedia War and Peace fixture, blind sheet emitted");
say("");
const html = readFileSync(join(HERE, "fixtures", "wikipedia-war-and-peace.html"), "utf8");
const { text } = extractReadable(html);
const paras = text
  .split(/\n+/)
  .map((p) => p.trim())
  .filter((p) => {
    try {
      return o.splitSentences(p).length >= 2; // structural gate, declared above
    } catch {
      return false;
    }
  });
const passages = paras.map((p, i) => ({ ref: `wp-wiki#p${i}`, text: p }));
say(`Paragraphs admitted by the two-sentence gate: ${passages.length}.`);

const t0 = Date.now();
const wiki = make(passages, { pool: passages, assert: { draws: DRAWS, seed: SEED } });
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const strata = { corroborated: [], "single-witness": [] };
for (const e of wiki.edges) strata[e.assertion.standing]?.push(e);
say(
  `Edges: ${wiki.edges.length} (corroborated ${strata.corroborated.length}, single-witness ${strata["single-witness"].length}) · ` +
    `vocabulary ${wiki.vocabulary.verbs} verbs · armed at ${DRAWS} draws in ${elapsed}s.`,
);
const salads = wiki.edges.map((e) => e.assertion.orderArm.fired).sort((a, b) => a - b);
const mid = salads.length ? salads[Math.floor(salads.length / 2)] : null;
say(`Salad counts across all edges: median ${mid}/${DRAWS}, max ${salads[salads.length - 1] ?? "—"}/${DRAWS}.`);
say("");

// The blind sheet: stratified, deterministic, verdicts stripped.
const perStratum = Math.floor(SHEET_BUDGET / Object.keys(strata).filter((k) => strata[k].length).length || 1);
const sheet = [];
const key = [];
for (const [standing, edges] of Object.entries(strata)) {
  const picked = seededShuffle(edges, seedFrom(`sheet:${standing}`)).slice(0, perStratum);
  for (const e of picked) {
    const ref = e.refs[0];
    const passage = passages.find((p) => p.ref === ref);
    const id = `e${key.length}`;
    sheet.push({
      id,
      context: passage?.text ?? "",
      statement: `${(e.end1 ?? e.subject)} —${(e.label ?? e.verb)}${e.polarity === "-" ? " (negated)" : ""}→ ${(e.end2 ?? e.object)}`,
      question:
        "Does the context passage state this subject-verb-object relation (with this polarity)? Answer YES, NO, or UNCLEAR.",
    });
    key.push({ id, standing, statements: e.assertion.statements, orderArm: e.assertion.orderArm, refs: e.refs, verbSupport: e.assertion.verbSupport });
  }
}
// The sheet's order is shuffled so stratum cannot be read off position.
const order = seededShuffle([...sheet.keys()], seedFrom("sheet:order"));
const shuffledSheet = order.map((i) => sheet[i]);

mkdirSync(join(HERE, "results"), { recursive: true });
writeFileSync(join(HERE, "results", "asserted-blind-sheet.json"), JSON.stringify({ items: shuffledSheet }, null, 2));
writeFileSync(join(HERE, "results", "asserted-blind-key.json"), JSON.stringify({ items: key }, null, 2));
say(`Blind sheet: ${shuffledSheet.length} items (${perStratum} per stratum) → eval/results/asserted-blind-sheet.json`);
say("The key (standings, arm counts) is kept apart in asserted-blind-key.json so an annotator never sees a verdict.");
say(
  "A hand-precision pass over the sheet is REQUIRED before any precision-by-standing number is reported as a finding; " +
    "an LLM-proxy pass must be labeled as exactly that (agency-civic's own discipline).",
);
say("");

writeFileSync(join(HERE, "results", "asserted-eval.md"), lines.join("\n") + "\n");
console.log("\nwrote eval/results/asserted-eval.md");
