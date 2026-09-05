// lib/door-probe.mjs — the hyperlexicon door probe (P73's measurement), as
// ONE implementation shared by `eval/the-fold/hyperlexicon-door-probe.mjs`
// (prints) and `native/tests/hyperlexicon-door-probe.test.js` (reads it on
// every suite run). the-fold P95 / S65: the computation is the driver's,
// moved verbatim; the caller hands in the modules so the probe keeps
// mirroring the LIVE turn (the-fold's own reader/hyperlexicon/lens) rather
// than a second copy of it.
//
// What the 2026-09-05 re-run found, and why one more column exists here:
// the doc (2026-09-01) read arm C as "0 of 10 closed-class labels"; live it
// is 0 of 12 — the two new notes are `Война —и→ мир` / `Война —и→ миръ`,
// the article's Russian title, whose connector is Cyrillic "и" ("and"): a
// closed-class label the probe's English hand list cannot see and the
// English POS prior cannot classify. So beside the hand-list count the
// probe now reports `unattestedLabels` — notes whose connector the prior
// has no entry for at all — measured mechanically, never listed by hand.
// Read it as "the prior could not tell": the same column holds "discusses"
// (a real verb UD_English-EWT lacks) beside "и"; it is the prior's reach on
// this material, not a verdict on the label.

/**
 * @param {object} m — modules and material, assembled by the caller:
 *   readerFor(withPrior) → relationsFor; hyperlexiconFor (makeHyperlexicon
 *   product); lens (grammar lens or null); retrieve; allChunks; questions;
 *   closed (the probe's disclosed hand list); posPrior (or null).
 * @returns {{A, B, C}} — per arm: verdicts, offered, away, notes, closedLabels,
 *   corroborated, unattestedLabels
 */
export function runDoorProbe(m) {
  const { readerFor, hyperlexiconFor, lens, retrieve, allChunks, questions, closed, posPrior } = m;
  function runArm({ withPrior, gate }) {
    const relationsFor = readerFor(withPrior);
    let log = null;
    let offered = 0;
    const verdicts = {};
    const away = {};
    for (const q of questions) {
      const passages = retrieve(allChunks, q, 3);
      const relations = relationsFor(passages, { pool: passages });
      for (const p of passages) {
        const claims = relations.read(String(p.text ?? ""))?.claims ?? [];
        for (const c of claims) verdicts[c.verdict] = (verdicts[c.verdict] ?? 0) + 1;
        const edges = claims.filter((c) => c.verdict === "bound")
          .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] })); // claims carry the earned names since the wipe; the ledger keeps its own subject/verb/object shape
        if (!edges.length) continue;
        offered += edges.length;
        const r = hyperlexiconFor.admit(log ?? hyperlexiconFor.createHyperlexicon(), edges, {
          witness: p.ref ?? null,
          classifyConnector: gate ? lens : null,
        });
        log = r.log;
        for (const t of r.turnedAway ?? []) away[t.reason ?? "?"] = (away[t.reason ?? "?"] ?? 0) + 1;
      }
    }
    const folded = log ? hyperlexiconFor.foldHyperlexicon(log) : [];
    const notes = folded.map((n) => ({ subject: n.subject, verb: n.verb, object: n.object, witnesses: n.witnesses.length }));
    const closedLabels = folded.filter((n) => closed.has(String(n.verb).toLowerCase()));
    const corroborated = folded.filter((n) => n.witnesses.length >= 2);
    const unattestedLabels = posPrior ? folded.filter((n) => !posPrior.forms?.[String(n.verb).toLowerCase()]) : [];
    return { verdicts, offered, away, notes, closedLabels: closedLabels.length, corroborated: corroborated.length, unattestedLabels: unattestedLabels.map((n) => n.verb) };
  }
  return {
    A: runArm({ withPrior: false, gate: false }),
    B: runArm({ withPrior: true, gate: false }),
    C: runArm({ withPrior: true, gate: true }),
  };
}

export const ARM_LABELS = {
  A: "A — no prior, no gate (pre-P73 live config)",
  B: "B — prior on the reader, gate off (the ride-along alone)",
  C: "C — prior + door gate (P73 live config)",
};

/** The probe's own closed-class hand list — a measurement instrument, disclosed, never reading code. */
export function probeClosedList(enginePriors) {
  return new Set([
    ...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS, ...enginePriors.NEGATION_WORDS,
    "and", "or", "of", "to", "in", "on", "at", "with", "for", "by", "from", "as", "i", "himself",
  ]);
}

export const QUESTIONS = [
  "Who commanded the Russian army at the Battle of Borodino?",
  "Who wrote War and Peace and when was it published?",
  "What happened to Napoleon's army at Borodino?",
];

/**
 * Assemble the live-turn modules the way the driver always did. `fold` and
 * `native` are absolute directory paths (trailing slash optional).
 */
export async function assembleDoorProbe({ fold, native, fixtures, readFileSync, existsSync }) {
  const { makeRelationReader } = await import(`${fold}/hypergraph.js`);
  const { makeHyperlexicon } = await import(`${fold}/hyperlexicon.js`);
  const { adaptTaskLog } = await import(`${fold}/consequence.js`);
  const { makeGrammarLens } = await import(`${fold}/grammar-lens.js`);
  const { chunkSource, retrieve, tokenize, blankLabelRows } = await import(`${fold}/source.js`);
  const { extractReadable } = await import(`${fold}/web.js`);
  const { splitSentences } = await import(`${native}/adapters/text/spans.js`);
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${native}/adapters/text/surfaces.js`);
  const { resolvePronouns } = await import(`${native}/adapters/text/pronouns.js`);
  const { discoverRelationVocab, extractRelations } = await import(`${native}/adapters/text/relations.js`);
  const enginePriors = await import(`${native}/adapters/text/priors.js`);
  const { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } = await import(`${native}/adapters/text/wordclass.js`);
  const { cellOf, GRAINS } = await import(`${native}/kernel/cube.js`);
  const nativeTaskLog = await import(`${native}/kernel/task-log.js`);

  // The shipped prior, read the way the page's own fetch would resolve it.
  const posPath = `${fold}/priors-data/pos-prior-eng.json`;
  const posPrior = existsSync(posPath) ? JSON.parse(readFileSync(posPath, "utf8")) : null;

  const readerFor = (withPrior) => makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize,
    posPriorFor: () => (withPrior ? posPrior : null),
    determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]),
    negationWords: enginePriors.NEGATION_WORDS,
    blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
    resolvePronouns,
  });
  const hyperlexiconFor = makeHyperlexicon({
    ...adaptTaskLog({
      createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append,
      ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS,
    }),
    projectTasks: nativeTaskLog.projectTasks,
    cellOf,
  });
  const lens = posPrior ? makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META }) : null;

  // material: two real committed Wikipedia pages
  const allChunks = [];
  for (const name of ["battle-of-borodino", "war-and-peace"]) {
    const html = readFileSync(`${fixtures}/wikipedia-${name}.html`, "utf8");
    const face = extractReadable(html);
    const text = typeof face === "string" ? face : face?.text ?? "";
    allChunks.push(...chunkSource(`${name}.txt`, text));
  }
  return { readerFor, hyperlexiconFor, lens, retrieve, allChunks, questions: QUESTIONS, closed: probeClosedList(enginePriors), posPrior };
}
