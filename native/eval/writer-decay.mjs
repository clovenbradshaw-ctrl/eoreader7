// native/eval/writer-decay.mjs — the writer's own decay curve, read from the
// text's referring-expression forms.
//
// THE IDEA, and its givers. A writer chooses the FORM of every returning
// mention by a model of what the reader still holds: Accessibility Theory
// (Ariel) and referential distance (Givon 1983) — high-accessibility forms
// (pronouns) for referents assumed ACTIVE, low-accessibility forms (full
// names, glossed descriptions) for referents assumed decayed. The form is
// therefore the writer's broadcast of the intended reader-memory state, and
// the mapping GAP-SINCE-LAST-MENTION -> FORM-OF-RETURN is the writer's own
// decay curve, sitting in the text, measurable per material and per genre.
//
// PREDICTION, RECORDED BEFORE THE RUN (READING-POLICY P1's architecture, as
// the writer's own design rather than ours): pronoun-form returns collapse
// within a few sentences — the fast-decaying ACTIVATION layer; name-form
// returns survive gaps of hundreds of sentences — the non-decaying IDENTITY
// layer. If both hold, "activation decays, identity does not" is a fact
// about how writers write, measured, not a design choice asserted.
//
// FORMS, each from an organ this repo already has — nothing hand-listed:
//   pronoun    — bindNarrationFrames' activation arm (organ-derived, NOT
//                gold; disclosed — unresolved pronouns simply do not enter)
//   descriptor — the anchoring organ's EOAnchorEvidence (definite
//                descriptors bound to an admitted referent)
//   name       — exact cast-surface occurrence (host sessionReferents,
//                coref-primed, the constitutional cast)
//
// DIALS: none typed. Gap bins are dyadic (structural doubling). The
// "writer's window" is the widest bin in which pronoun is the MAJORITY
// return form — majority is where a plurality flips, not a tuned constant —
// and gammaFor(window) is then the MATERIAL's decay rate, derived.
//
// Usage: node native/eval/writer-decay.mjs <book.txt> [--coref <prior.json>]

import fs from "node:fs";
import { stripContainer, splitSentences } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { narrationFrames } from "../adapters/text/attribution.js";
import { castSurfaceMap, bindNarrationFrames } from "../adapters/text/perspective-claims.js";
import { resolvePronounsByActivation } from "../adapters/text/pronouns.js";
import { createActivation, gammaFor } from "../kernel/activation.js";
import { createSession, admitChunked, sessionReferents } from "../../legacy-eoreader6.1/packages/host/corpus.js";

const POS_PRIOR = JSON.parse(fs.readFileSync(new URL("../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));
const PRONOUN_RECALL = { minActivation: 0.05, minMargin: 0.2 };  // host/corpus.js's own operating point, cited not invented
const PRONOUN_PRESENT = { window: 8, minActivation: 0.2, minMargin: 0.2, createActivation };

const arg = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; };
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function main() {
  const path = process.argv[2];
  if (!path) throw new TypeError("usage: node native/eval/writer-decay.mjs <book.txt> [--coref <prior.json>]");
  const raw = fs.readFileSync(path, "utf8");
  const stripped = stripContainer(raw);
  const prior = arg("--coref") ? JSON.parse(fs.readFileSync(arg("--coref"), "utf8")) : null;
  const sourceId = `file:${path.split("/").pop()}`;
  const sentences = splitSentences(stripped.text);

  // sentence index by offset, for pronoun bindings that arrive as offsets
  const orderAt = (offset) => {
    let lo = 0, hi = sentences.length - 1, ans = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (sentences[mid].offset <= offset) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return sentences[ans].order;
  };

  // the constitutional cast
  const session = createSession();
  admitChunked(session, { text: raw, sourceId, language: "en" });
  const cast = sessionReferents(session, { sourceId, priors: prior ? [prior] : [], limit: 200 });
  const surfaceToReferent = castSurfaceMap(cast.referents ?? []);

  // mentions: (referent, sentenceOrder, form)
  const mentions = [];

  // name mentions — exact cast surfaces, word-boundary, one per sentence per referent
  const bySurfaceLen = [...surfaceToReferent.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  const matcher = bySurfaceLen.length ? new RegExp(`\\b(${bySurfaceLen.map(escapeRe).join("|")})\\b`, "giu") : null;
  for (const s of sentences) {
    if (!matcher) break;
    matcher.lastIndex = 0;
    const seen = new Set();
    let m;
    while ((m = matcher.exec(s.text))) {
      const ref = surfaceToReferent.get(m[1]) ?? surfaceToReferent.get(m[1].toLowerCase());
      if (ref && !seen.has(ref)) { seen.add(ref); mentions.push({ ref, order: s.order, form: "name" }); }
    }
  }

  // descriptor mentions — the anchoring organ's own evidence, from one perceiver pass
  const encounters = textEncounters(stripped.text, { source: sourceId, offset: stripped.offset });
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS_PRIOR, descriptorAnchoring: PRONOUN_RECALL });
  for (const enc of encounters) {
    const out = (await perceiver.perceive(enc, {})) ?? [];
    for (const x of out) for (const g of x.candidate?.graphEntries ?? []) {
      if (g?.schema === "EOAnchorEvidence@1" && g.referent != null && g.sentenceOrder != null)
        mentions.push({ ref: g.referent, order: g.sentenceOrder, form: "descriptor" });
    }
  }

  // pronoun mentions — the activation arm's bindings (organ-derived, not gold)
  const narration = narrationFrames(stripped.text, { framePrior: prior, offset: stripped.offset });
  const arm = bindNarrationFrames({
    frames: narration.frames, text: stripped.text, offset: stripped.offset,
    surfaceToReferent, recall: PRONOUN_PRESENT, resolve: (a, b, c) => resolvePronounsByActivation(a, b, c),
  });
  for (const b of arm.boundSentences ?? []) {
    mentions.push({ ref: b.referentId, order: orderAt(b.start - stripped.offset), form: "pronoun" });
  }

  // the curve: for each RETURN, gap since the same referent's previous mention
  const byRef = new Map();
  for (const m of mentions) { if (!byRef.has(m.ref)) byRef.set(m.ref, []); byRef.get(m.ref).push(m); }
  const binOf = (gap) => 1 << Math.floor(Math.log2(Math.max(1, gap)));   // dyadic, structural
  const bins = new Map();  // binFloor -> {pronoun, name, descriptor}
  let returns = 0;
  for (const list of byRef.values()) {
    list.sort((a, b) => a.order - b.order);
    for (let i = 1; i < list.length; i += 1) {
      const gap = list[i].order - list[i - 1].order;
      if (gap < 1) continue;                                  // same sentence: not a return
      const b = binOf(gap);
      if (!bins.has(b)) bins.set(b, { pronoun: 0, name: 0, descriptor: 0 });
      bins.get(b)[list[i].form] += 1;
      returns += 1;
    }
  }

  const rows = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([floor, c]) => {
    const total = c.pronoun + c.name + c.descriptor;
    return {
      gapBin: floor === 1 ? "1" : `${floor}-${floor * 2 - 1}`,
      returns: total,
      pronounShare: Number((c.pronoun / total).toFixed(3)),
      nameShare: Number((c.name / total).toFixed(3)),
      descriptorShare: Number((c.descriptor / total).toFixed(3)),
    };
  });

  // the writer's window: widest dyadic bin where pronoun is the majority form
  let window = null;
  for (const [floor, c] of [...bins.entries()].sort((a, b) => a[0] - b[0])) {
    const total = c.pronoun + c.name + c.descriptor;
    if (total && c.pronoun / total > 0.5) window = floor * 2 - 1;        // the bin's ceiling
  }

  console.log(JSON.stringify({
    schema: "EOWriterDecayRun@1",
    book: path.split("/").pop(),
    givers: {
      theory: "Accessibility Theory (Ariel); referential distance (Givon 1983): referring-expression form encodes the writer's model of the reader's activation",
      forms: { pronoun: "bindNarrationFrames activation arm — organ-derived, NOT gold, disclosed", descriptor: "anchoring organ EOAnchorEvidence", name: "constitutional cast surfaces (host, coref-primed)" },
    },
    declared: { bins: "dyadic — structural doubling, never chosen", window: "widest bin where pronoun is the MAJORITY return form — majority is where a plurality flips, not a tuned constant", PRONOUN_PRESENT, PRONOUN_RECALL },
    cast: cast.referents?.length ?? 0,
    mentions: mentions.length,
    returns,
    curve: rows,
    writerWindow: window,
    gamma: window != null && window > 1 ? Number(gammaFor(window).toFixed(4)) : null,
    prediction: "recorded before the run: pronoun returns collapse within a few sentences (activation layer); name returns survive gaps of hundreds WITHOUT re-gloss (identity layer)",
  }, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
