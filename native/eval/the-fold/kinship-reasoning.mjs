// eval/kinship-reasoning.mjs — mechanical reasoning that genuinely is NOT
// "just in the text": a two-hop, CROSS-RELATION-TYPE derivation (child-of
// composed with has-child yields sibling-of; child-of composed with the
// FRESHLY DERIVED sibling-of yields an aunt/uncle relation Wikidata has no
// property for at all), over real, live-fetched family data.
//
// WHY THIS IS A DIFFERENT SHAPE FROM eval/mechanical-reasoning.mjs, on
// purpose. That driver's chemistry is `closureAffordances({base, yields,
// giver})` — the transitive closure of ONE relation with itself
// (replaces(c,b) ∘ replaces(b,a) => after(c,a)). A careful reader could
// derive that by eye from two ADJACENT sentences on two adjacent
// succession-box entries. This driver declares two affordance rows by
// hand, each combining TWO DIFFERENT relations (child-of ∘ has-child =>
// sibling-of; child-of ∘ sibling-of => aunt/uncle-of), and the second row
// consumes the FIRST row's own derived output — genuine depth-2
// composition across relation types, not one relation's self-closure. No
// single fetched Wikidata page states either derived fact: siblinghood is
// never asserted on the same page as a shared parent's OTHER children (it
// requires reading TWO separate people's pages and noticing they name the
// same mother), and Wikidata has no aunt/uncle property at all — nothing
// to even misread as "in the text".
//
// THE FAMILY: Queen Victoria (Q9439) -> her daughter Victoria, Princess
// Royal ("Vicky", Q116728) -> Vicky's son Wilhelm II (Q2677), plus
// Victoria's other son Edward VII (Q20875) as the specimen aunt/uncle
// fact this write-up narrates. Verified live before writing any code
// (curl, by hand): Vicky's own P25=Q9439, Wilhelm's own P25=Q116728,
// Edward VII's own P25=Q9439 too — a real, self-consistent three-
// generation fragment, not invented.
//
// THE ORACLE. Wikidata separately carries P3373 (sibling) on both Vicky's
// and Edward VII's own pages, each listing the other. That property is
// NEVER fed into the reasoning substrate below — it is fetched and read
// only AFTER the derivation, as an independent check on whether the
// mechanically-derived sibling-of set agrees with what the giver
// separately, directly states. Precision/recall against it is reported.
// The aunt/uncle fact has no such oracle to check against — Wikidata
// genuinely does not have the property — so it is checked the other way:
// grepped for in every raw fetched byte to confirm it is nowhere stated.
//
// THE MODEL COMPARISON. A real local model (onnx-community/
// Qwen2.5-0.5B-Instruct, or a live Ollama if one answers — the exact
// fallback eval/void-loop-e2e.mjs already established) is given ONLY the
// three raw facts the derivation itself starts from (never the words
// "sibling" or "uncle"/"aunt") and asked whether Edward VII was an uncle
// of Wilhelm II. This is the honest comparison: can an LLM chain two
// hops of kinship logic on its own, or does it need the mechanical
// apparatus this driver exercises.
//
// Re-runnable eval driver (P19/P27's own posture), not a committed
// regression test. Writes eval/results/kinship-reasoning.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../eoreader7/native/kernel/task-log.js";
import { GRAINS } from "../../eoreader7/native/kernel/cube.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../../eoreader7/native/kernel/hyperlexicon.js";
import { createReactionSubstrate } from "../../eoreader7/native/kernel/reaction.js";
import { auditChemistry } from "../../eoreader7/native/kernel/refutation.js";

import { makeHyperlexicon } from "../hyperlexicon.js";
import { adaptTaskLog } from "../consequence.js";
import { assertionEdges } from "../predigest.js";
import { entityUrl, isQid } from "../wikidata.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "results", "kinship-reasoning.json");
const CACHE_DIR = "/tmp/kinship-reasoning-cache";
const UA = "the-fold-kinship-reasoning-eval/1.0 (https://github.com/clovenbradshaw-ctrl/the-fold)";

const CHEM_GIVER = "en.wikipedia.org/wiki/Kinship — ordinary English kinship terminology: a person's parent's sibling is their aunt or uncle; declared as two affordance rows by eval/kinship-reasoning.mjs (this driver names its own risk, no giver in the received register vouches for it)";

// ── entities ─────────────────────────────────────────────────────────────
const VICTORIA = "Q9439";
const VICKY = "Q116728";
const WILHELM = "Q2677";
const EDWARD_VII = "Q20875"; // fetched only for the P3373 oracle + labels, never for the derivation itself

// ── fetch, cached under /tmp so a re-run does not hammer the API ──────────
async function fetchEntity(qid) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${qid}.json`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf8");
  const res = await fetch(entityUrl(qid), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`fetch ${qid}: HTTP ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(cachePath, text);
  return text;
}

// P5.2: every address is self-verified against the received bytes before
// use, exactly as eval/mechanical-reasoning.mjs's own addressOf does.
function addressOf(raw, qid) {
  const needle = `"id":"${qid}"`;
  const start = raw.indexOf(needle);
  if (start < 0) return null;
  if (raw.slice(start, start + needle.length) !== needle) throw new Error(`address self-verification failed for ${qid}`);
  return { ref: null, start, end: start + needle.length, text: needle }; // ref filled in per-file below
}

const mainId = (claim) => claim?.mainsnak?.datavalue?.value?.id ?? null;
const qualId = (claim, prop) => claim?.qualifiers?.[prop]?.[0]?.datavalue?.value?.id ?? null;

function labelOf(rawJson) {
  const e = Object.values(JSON.parse(rawJson).entities)[0];
  return e.labels?.en?.value ?? null;
}

// ── run ─────────────────────────────────────────────────────────────────
async function main() {
  console.error("fetching Victoria, Vicky, Wilhelm II, Edward VII (live, cached under /tmp)...");
  const [victoriaRaw, vickyRaw, wilhelmRaw, edwardRaw] = await Promise.all(
    [VICTORIA, VICKY, WILHELM, EDWARD_VII].map(fetchEntity),
  );
  // Keyed lowercase: predigest.js::assertionEdges normalizes every endpoint
  // to lowercase before it becomes a derived edge's participant ref
  // (normalizeEnd), so a derived fact's own from/to are lowercase qids —
  // the lookup must match that or every derived label silently misses.
  const labels = new Map([
    [VICTORIA, labelOf(victoriaRaw)],
    [VICKY, labelOf(vickyRaw)],
    [WILHELM, labelOf(wilhelmRaw)],
    [EDWARD_VII, labelOf(edwardRaw)],
  ].map(([qid, label]) => [qid.toLowerCase(), label]));
  const labelFor = (qid) => labels.get(String(qid ?? "").toLowerCase()) ?? `${qid} (fetched separately, label not held here)`;

  const victoriaEntity = Object.values(JSON.parse(victoriaRaw).entities)[0];
  const vickyEntity = Object.values(JSON.parse(vickyRaw).entities)[0];
  const wilhelmEntity = Object.values(JSON.parse(wilhelmRaw).entities)[0];
  const edwardEntity = Object.values(JSON.parse(edwardRaw).entities)[0];

  // ── the raw assertions this driver starts from — three real facts ──────
  const offered = [];

  // childOf(Vicky, Victoria) — Vicky's own P25 (mother)
  const vickyP25 = (vickyEntity.claims?.P25 ?? []).find((c) => mainId(c) === VICTORIA);
  if (!vickyP25) throw new Error("Vicky's own page does not state Victoria as mother — cannot build this demo");
  const vickyP25Addr = addressOf(vickyRaw, VICTORIA);
  vickyP25Addr.ref = `wikidata/${VICKY}.json`;
  offered.push({ subject: VICKY, verb: "childOf", object: VICTORIA, spans: [vickyP25Addr], witness: vickyP25Addr.ref });

  // childOf(Wilhelm, Vicky) — Wilhelm's own P25 (mother)
  const wilhelmP25 = (wilhelmEntity.claims?.P25 ?? []).find((c) => mainId(c) === VICKY);
  if (!wilhelmP25) throw new Error("Wilhelm II's own page does not state Vicky as mother — cannot build this demo");
  const wilhelmP25Addr = addressOf(wilhelmRaw, VICKY);
  wilhelmP25Addr.ref = `wikidata/${WILHELM}.json`;
  offered.push({ subject: WILHELM, verb: "childOf", object: VICKY, spans: [wilhelmP25Addr], witness: wilhelmP25Addr.ref });

  // hasChild(Victoria, X) — every one of Victoria's real P40 (child) entries
  const victoriaChildren = (victoriaEntity.claims?.P40 ?? []).map(mainId).filter(Boolean);
  for (const childQid of victoriaChildren) {
    const addr = addressOf(victoriaRaw, childQid);
    if (!addr) continue; // disclosed, not silently skipped — reported below
    addr.ref = `wikidata/${VICTORIA}.json`;
    offered.push({ subject: VICTORIA, verb: "hasChild", object: childQid, spans: [addr], witness: addr.ref });
  }
  const unaddressedChildren = victoriaChildren.filter((q) => !addressOf(victoriaRaw, q));

  // ── admit through the-fold's own P57 door ───────────────────────────────
  const foldHl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS }), projectTasks });
  let log = foldHl.createHyperlexicon();
  const turnedAwayAll = [];
  for (const assertion of offered) {
    const result = foldHl.admit(log, [assertion], { witness: assertion.witness });
    log = result.log;
    turnedAwayAll.push(...result.turnedAway);
  }
  const folded = foldHl.foldHyperlexicon(log);

  const { edges, skipped } = assertionEdges(folded, { hyperedge, source: "wikidata-live" });

  // ── the chemistry: two hand-declared, cross-relation-type rows ─────────
  // NOT closureAffordances — that helper is specifically the SAME-relation
  // transitive case. This is two DIFFERENT declared rows, the second
  // consuming the first's own derived product.
  let chemistry = createHyperlexicon();
  chemistry = giveHyperlexiconAffordance(chemistry, {
    left: "childOf", right: "hasChild", giver: CHEM_GIVER,
    witnesses: [], meta: { yields: "siblingOf", basis: "shared parent: X child-of P, P has-child Y => X sibling-of Y" },
  });
  chemistry = giveHyperlexiconAffordance(chemistry, {
    left: "childOf", right: "siblingOf", giver: CHEM_GIVER,
    witnesses: [], meta: { yields: "hasAuntOrUncle", basis: "X child-of P, P sibling-of Y => Y is aunt/uncle of X (via depth-2 composition on the FIRST row's own product)" },
  });

  // ── control: no chemistry given, nothing derives ────────────────────────
  const control = createReactionSubstrate({ entries: edges, hyperlexicon: createHyperlexicon(), window: null })
    .settle({ cue: null, floor: null, maxSteps: 8 });

  // ── react: full closure (cue: null is the disclosed ungated control arm
  // for the CUE specifically — the gate this driver is testing is the
  // CHEMISTRY, not the physics, so the physics gate is left open here) ────
  const substrate = createReactionSubstrate({ entries: edges, hyperlexicon: chemistry, window: null });
  const preAudit = auditChemistry(edges, chemistry);
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 8 });
  const postAudit = auditChemistry(substrate.edges(), chemistry);
  const selfRefuted = postAudit.filter((row) => row.refuted);

  const derivedSiblingOf = settled.derived.filter((d) => d.relation === "siblingOf");
  const derivedAuntUncle = settled.derived.filter((d) => d.relation === "hasAuntOrUncle");

  const edgeById = new Map(edges.map((e) => [e.id, e]));
  for (const d of settled.derived) edgeById.set(d.edge.id, d.edge);
  const provenanceOf = (edgeId, acc = []) => {
    const edge = edgeById.get(edgeId);
    if (!edge?.meta?.derived) { acc.push(edge.witness); return acc; }
    for (const parent of edge.meta.parents) provenanceOf(parent, acc);
    return acc;
  };

  // ── the oracle: Wikidata's own P3373 on Vicky's and Edward's pages,
  // fetched and read ONLY here, never handed to the reasoning substrate ──
  // Compared lowercase on both sides — derivedSiblingOf's own `to` field is
  // already lowercase (predigest.js normalization); Wikidata's raw P3373
  // values are not, and comparing them un-normalized would report a false
  // total disagreement (caught live: the first run of this driver did
  // exactly that before this normalization was added).
  const vickyP3373 = (vickyEntity.claims?.P3373 ?? []).map(mainId).filter(Boolean).map((q) => q.toLowerCase());
  const derivedSiblingSet = new Set(derivedSiblingOf.map((d) => d.to));
  const oracleAgree = [...derivedSiblingSet].filter((q) => vickyP3373.includes(q));
  const oracleMissed = vickyP3373.filter((q) => q !== VICKY.toLowerCase() && !derivedSiblingSet.has(q)); // Wikidata states, we didn't derive
  const oracleExtra = [...derivedSiblingSet].filter((q) => !vickyP3373.includes(q)); // we derived, Wikidata's P3373 doesn't state

  // ── confirm the aunt/uncle fact is genuinely nowhere in the raw bytes ───
  // Wikidata has no aunt/uncle property; this is a mechanical grep-level
  // check, not an assumption, over every byte fetched for this run.
  const allRaw = [victoriaRaw, vickyRaw, wilhelmRaw, edwardRaw].join("\n");
  const auntUncleWordsPresent = /aunt|uncle/i.test(allRaw);

  // ── the specimen sentence, narrated for the write-up ────────────────────
  const specimen = derivedAuntUncle.find((d) => d.to === EDWARD_VII.toLowerCase()) ?? null;
  const specimenSentence = specimen
    ? `${labelFor(specimen.from)}'s aunt/uncle is ${labelFor(specimen.to)} — derived (depth ${specimen.depth}), stated by no single fetched page, provenance: ${[...new Set(provenanceOf(specimen.edge.id))].join(" + ")}`
    : null;

  // ── ask a real local model the same two-hop question, unaided ──────────
  const OLLAMA = "http://localhost:11434";
  const LOCAL_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
  let MODEL = LOCAL_MODEL;
  let _gen = null;
  async function openModel() {
    try {
      const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { MODEL = "gemma2:2b"; return { kind: "ollama", name: MODEL }; }
    } catch { /* no server, use the in-process one */ }
    try {
      process.env.HF_HOME ??= "/tmp/hfcache";
      const { pipeline } = await import("@huggingface/transformers");
      _gen = await pipeline("text-generation", LOCAL_MODEL, { dtype: "q4", device: "cpu" });
      return { kind: "local-cpu", name: LOCAL_MODEL };
    } catch (e) { return { kind: "none", detail: String(e?.message ?? e).slice(0, 160) }; }
  }
  async function askModel(prompt) {
    if (_gen) {
      const out = await _gen([{ role: "user", content: prompt }], { max_new_tokens: 96, do_sample: false });
      return out[0].generated_text.at(-1)?.content ?? "";
    }
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, stream: false,
        options: { temperature: 0, num_predict: 96 }, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).message?.content ?? "";
  }

  console.error("loading local model...");
  const modelInfo = await openModel();
  let modelArm = { model: modelInfo };
  if (modelInfo.kind !== "none") {
    // Deliberately gives ONLY the three raw facts the derivation itself
    // starts from — never the word "sibling", never "aunt"/"uncle" as a
    // concept to compute, so a correct answer means the model chained the
    // two-hop kinship logic itself, unaided.
    const prompt = `Here are three facts:
1. ${labelFor(VICKY)}'s mother was ${labelFor(VICTORIA)}.
2. ${labelFor(WILHELM)}'s mother was ${labelFor(VICKY)}.
3. ${labelFor(VICTORIA)}'s children included ${labelFor(EDWARD_VII)}.

Question: was ${labelFor(EDWARD_VII)} an uncle of ${labelFor(WILHELM)}? Answer yes or no, then explain your reasoning in one sentence.`;
    console.error("asking the model...");
    const answer = await askModel(prompt);
    const said = /\byes\b/i.test(answer) && !/\bno\b.{0,20}\byes\b/i.test(answer);
    modelArm = { model: modelInfo, prompt, answer: answer.trim(), saidYes: said, correct: said === true };
  }

  // ── report ───────────────────────────────────────────────────────────────
  const out = {
    schema: "EOKinshipReasoning@1",
    declared: { chemGiver: CHEM_GIVER, maxSteps: 8, cue: null, floor: null },
    material: {
      entities: [VICTORIA, VICKY, WILHELM, EDWARD_VII].map((q) => ({ qid: q, label: labelFor(q) })),
      victoriaChildren: victoriaChildren.length,
      unaddressedChildren,
      offered: offered.length,
    },
    admission: { turnedAway: turnedAwayAll, notes: folded.length, projected: { edges: edges.length, skipped } },
    control: { derived: control.derived.length, withheld: control.withheld.length, quiescent: control.quiescent },
    chemistry: {
      rows: 2,
      quiescent: settled.quiescent,
      steps: settled.steps,
      derivedSiblingOf: derivedSiblingOf.map((d) => ({ from: labelFor(d.from), to: labelFor(d.to), depth: d.depth, witnesses: [...new Set(provenanceOf(d.edge.id))] })),
      derivedAuntUncle: derivedAuntUncle.map((d) => ({ nephewNiece: labelFor(d.from), auntUncle: labelFor(d.to), depth: d.depth, witnesses: [...new Set(provenanceOf(d.edge.id))] })),
      withheld: settled.withheld,
    },
    oracle: {
      note: "Wikidata's own P3373 (sibling), fetched separately, NEVER fed into the reasoning substrate — a check on the derivation, not an input to it",
      vickyP3373Labels: vickyP3373.map(labelFor),
      agree: oracleAgree.map(labelFor),
      missedByDerivation: oracleMissed.map(labelFor),
      derivedButNotInP3373: oracleExtra.map(labelFor),
      precisionRecallNote: oracleExtra.length === 0 && oracleMissed.length === 0
        ? "exact agreement: every derived sibling matches Wikidata's own directly-stated P3373, and nothing stated there was missed"
        : "disagreement — see missedByDerivation/derivedButNotInP3373 above",
    },
    neverStatedCheck: {
      wordsAuntOrUncleAppearInRawBytes: auntUncleWordsPresent,
      reading: auntUncleWordsPresent
        ? "the words 'aunt'/'uncle' DO appear somewhere in the raw fetched bytes — investigate before trusting the 'never stated' claim"
        : "confirmed: neither 'aunt' nor 'uncle' appears anywhere in the four raw fetched Wikidata entity dumps — the derived fact is genuinely never stated in the material",
    },
    audit: {
      preSettleRefuted: preAudit.filter((r) => r.refuted).length,
      postSettleRefuted: selfRefuted.length,
      selfConsistent: selfRefuted.length === 0,
    },
    specimen: specimenSentence,
    modelComparison: modelArm,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
