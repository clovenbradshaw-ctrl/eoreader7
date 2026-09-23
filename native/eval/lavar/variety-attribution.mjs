// variety-attribution.mjs — Sullivan's distributed English, measured.
// Handle: Sullivan.
//
// For every variety in english-varieties.mjs: build a lens on its training
// blocks (adapters/text/variety-lens.js), cut its held-out text into
// 100-word segments, and attribute each segment across all lenses. The
// segment's own provenance is the WITNESS (it is known which corpus it came
// from); it is never used to build or tune a lens. Reported:
//   - attribution accuracy per variety, confusion, mean margin, void rate
//   - the French-lexified controls under ENGLISH-ONLY lenses: how often the
//     reader correctly says "no English lens explains this"
//   - placement of varieties too small for a lens (Jamaican, Tok Pisin,
//     Bislama, Scots)
//   - comprehension against gold tags: each variety's own tagger vs the web
//     tagger vs web+own (the additive layer), on the variety's held-out gold
//   - ablations: single words vs word pairs; the word pairs' gain on
//     scrambled segments (words permuted within each segment — the order-only
//     null); equal lens sizes; spelling model off
//   - with --embed: nomic-embed-text (local, 137M) nearest-centroid
//     attribution, the ablation arm the user asked not to dismiss
//
//   node native/eval/lavar/variety-attribution.mjs [--embed]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VARIETIES, splitUnits } from "./english-varieties.mjs";
import { wordsOf, buildLens, bitsPerWord, voidBar, attribute, trainTagger, tagAccuracy } from "../../adapters/text/variety-lens.js";
import { lcg, shuffled } from "../../kernel/rng.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEG = 100, PLACE_SEG = 50;
const chunk = (words, n, min = Math.ceil(n / 2)) => { const out = []; for (let i = 0; i < words.length; i += n) { const s = words.slice(i, i + n); if (s.length >= min) out.push(s); } return out; };
const r4 = (x) => (x == null ? null : +x.toFixed(4));

function prepare({ spelling = true, capTokens = null } = {}) {
  const lensVarieties = VARIETIES.filter((v) => v.role === "lens");
  const data = new Map();
  for (const v of lensVarieties) {
    const units = v.units();
    const { train, heldOut } = splitUnits(v, units);
    let trainUnits = train;
    if (capTokens) { const out = []; let n = 0; for (const u of train) { if (n >= capTokens) break; out.push(u); n += wordsOf(u).length; } trainUnits = out; }
    const lens = buildLens(trainUnits, { id: v.id, label: v.label, lexifier: v.lexifier, spelling });
    data.set(v.id, { variety: v, lens, trainUnits, held: chunk(heldOut.flatMap(wordsOf), SEG), trainSegs: chunk(train.flatMap(wordsOf), SEG) });
  }
  return data;
}

function evaluate(data, { order = 2, scramble = false } = {}) {
  const lenses = [...data.values()].map((d) => d.lens);
  const bars = Object.fromEntries([...data.values()].map((d) => [d.lens.id, voidBar(d.lens, d.held, { order })]));
  const perVariety = {}, confusion = {};
  let all = 0, correct = 0;
  for (const [id, d] of data) {
    let n = 0, ok = 0, voids = 0, marginSum = 0;
    confusion[id] = {};
    d.held.forEach((seg, k) => {
      const words = scramble ? shuffled(seg, lcg(1000 + k)) : seg;
      const a = attribute(words, lenses, { bars, reference: "web", order, id: `${id}#${k}` });
      n += 1; if (a.void) voids += 1; else { confusion[id][a.best] = (confusion[id][a.best] ?? 0) + 1; if (a.best === id) { ok += 1; marginSum += a.margin; } }
    });
    perVariety[id] = { segments: n, accuracy: r4(ok / n), void: r4(voids / n), meanMarginWhenRight: r4(ok ? marginSum / ok : null) };
    all += n; correct += ok;
  }
  return { accuracy: r4(correct / all), segments: all, perVariety, confusion, bars: Object.fromEntries(Object.entries(bars).map(([k, v]) => [k, r4(v)])) };
}

function controlsUnderEnglishOnly(data) {
  const eng = [...data.values()].filter((d) => d.variety.lexifier === "English");
  const lenses = eng.map((d) => d.lens);
  const bars = Object.fromEntries(eng.map((d) => [d.lens.id, voidBar(d.lens, d.held)]));
  const rate = (segs) => { const v = segs.map((s) => attribute(s, lenses, { bars, reference: "web" })); return { segments: v.length, void: r4(v.filter((a) => a.void).length / v.length) }; };
  const out = {};
  for (const [id, d] of data) out[id] = { lexifier: d.variety.lexifier, ...rate(d.held) };
  return out;
}

function placement(data) {
  const lenses = [...data.values()].map((d) => d.lens);
  const bars = Object.fromEntries([...data.values()].map((d) => [d.lens.id, voidBar(d.lens, d.held)]));
  const out = {};
  for (const v of VARIETIES.filter((x) => x.role === "placement")) {
    const segs = chunk(v.units().flatMap(wordsOf), PLACE_SEG);
    const verdicts = segs.map((s, k) => attribute(s, lenses, { bars, reference: "web", id: `${v.id}#${k}` }));
    const counts = {};
    for (const a of verdicts) { const key = a.void ? `void (nearest ${a.best})` : a.best; counts[key] = (counts[key] ?? 0) + 1; }
    out[v.id] = { segments: segs.length, landedOn: counts, meanBestBits: r4(verdicts.reduce((s, a) => s + a.bits, 0) / verdicts.length), example: verdicts[0]?.verdict };
  }
  return out;
}

function comprehension() {
  const web = VARIETIES.find((v) => v.id === "web").gold();
  const webTagger = trainTagger(web.train);
  const out = { web: { heldOutSentences: web.test.length, webTagger: r4(tagAccuracy(webTagger, web.test)) } };
  for (const v of VARIETIES.filter((x) => x.gold && x.id !== "web")) {
    const g = v.gold();
    out[v.id] = { heldOutSentences: g.test.length, trainSentences: g.train.length, webTagger: r4(tagAccuracy(webTagger, g.test)), ownTagger: r4(tagAccuracy(trainTagger(g.train), g.test)), webPlusOwn: r4(tagAccuracy(trainTagger([...g.train, ...web.train]), g.test)) };
  }
  return out;
}

async function embeddingArm(data) {
  const embed = async (texts) => {
    const out = [];
    for (let i = 0; i < texts.length; i += 64) {
      const r = await fetch("http://localhost:11434/api/embed", { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 64) }) });
      if (!r.ok) throw new Error(`embed ${r.status}`);
      out.push(...(await r.json()).embeddings);
    }
    return out;
  };
  const norm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
  const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const centroids = new Map();
  for (const [id, d] of data) {
    const train = d.trainSegs.filter((_, i) => i % Math.max(1, Math.floor(d.trainSegs.length / 150)) === 0).slice(0, 150);
    const E = (await embed(train.map((s) => s.join(" ")))).map(norm);
    centroids.set(id, norm(E[0].map((_, j) => E.reduce((s, e) => s + e[j], 0) / E.length)));
  }
  const lenses = [...data.values()].map((d) => d.lens);
  const bars = Object.fromEntries([...data.values()].map((d) => [d.lens.id, voidBar(d.lens, d.held)]));
  const per = {};
  let n = 0, embOk = 0, lensOk = 0, agree = 0, agreeOk = 0;
  for (const [id, d] of data) {
    const E = (await embed(d.held.map((s) => s.join(" ")))).map(norm);
    let k = 0, ok = 0;
    d.held.forEach((seg, i) => {
      const pick = [...centroids].map(([cid, c]) => [cid, cos(E[i], c)]).sort((a, b) => b[1] - a[1])[0][0];
      const lensPick = attribute(seg, lenses, { bars }).best;
      k += 1; n += 1;
      if (pick === id) { ok += 1; embOk += 1; }
      if (lensPick === id) lensOk += 1;
      if (pick === lensPick) { agree += 1; if (pick === id) agreeOk += 1; }
    });
    per[id] = { segments: k, embeddingAccuracy: r4(ok / k) };
  }
  return { model: "nomic-embed-text (Ollama, local)", segments: n, embeddingAccuracy: r4(embOk / n), lensAccuracyIgnoringVoid: r4(lensOk / n), agreement: r4(agree / n), accuracyWhereTheyAgree: r4(agreeOk / Math.max(1, agree)), perVariety: per };
}

export async function run({ embed = false } = {}) {
  const data = prepare();
  const sizes = Object.fromEntries([...data].map(([id, d]) => [id, { trainWords: d.lens.tokens, types: d.lens.types, heldOutSegments: d.held.length }]));
  const main = evaluate(data);
  const unigram = evaluate(data, { order: 1 });
  const scrambled = evaluate(data, { scramble: true });
  const pairGain = {};
  for (const [id, d] of data) {
    const g = (segs) => segs.reduce((s, seg) => s + (bitsPerWord(d.lens, seg, { order: 1 }) - bitsPerWord(d.lens, seg, { order: 2 })), 0) / segs.length;
    pairGain[id] = { real: r4(g(d.held)), scrambled: r4(g(d.held.map((seg, k) => shuffled(seg, lcg(1000 + k))))) };
  }
  const minTrain = Math.min(...[...data.values()].map((d) => d.lens.tokens));
  const equalSize = evaluate(prepare({ capTokens: minTrain }));
  const noSpelling = evaluate(prepare({ spelling: false }));
  const sample = Object.fromEntries([...data].map(([id, d]) => { const a = attribute(d.held[0] ?? [], [...data.values()].map((x) => x.lens), { bars: main.bars, reference: "web", id: `${id}#0` }); return [id, { verdict: a.verdict, claim: a.claim }]; }));
  const result = {
    at: new Date().toISOString().slice(0, 10),
    segmentWords: SEG,
    sizes,
    attribution: main,
    controlsUnderEnglishOnlyLenses: controlsUnderEnglishOnly(data),
    placement: placement(data),
    comprehensionAgainstGold: comprehension(),
    ablations: {
      singleWordsOnly: { accuracy: unigram.accuracy },
      wordPairsOnScrambledSegments: { accuracy: scrambled.accuracy },
      wordPairGainBitsPerWord: pairGain,
      equalLensSize: { capTrainWords: minTrain, accuracy: equalSize.accuracy, perVariety: Object.fromEntries(Object.entries(equalSize.perVariety).map(([k, v]) => [k, v.accuracy])) },
      spellingModelOff: { accuracy: noSpelling.accuracy, perVariety: Object.fromEntries(Object.entries(noSpelling.perVariety).map(([k, v]) => [k, v.accuracy])) },
    },
    sampleVerdicts: sample,
  };
  if (embed) result.embeddingArm = await embeddingArm(data);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await run({ embed: process.argv.includes("--embed") });
  fs.writeFileSync(path.join(HERE, "results", "variety-attribution.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ attribution: { accuracy: result.attribution.accuracy, perVariety: result.attribution.perVariety }, controls: result.controlsUnderEnglishOnlyLenses, placement: result.placement, comprehension: result.comprehensionAgainstGold, ablations: { ...result.ablations, equalLensSize: { ...result.ablations.equalLensSize, perVariety: undefined }, spellingModelOff: { accuracy: result.ablations.spellingModelOff.accuracy } }, embeddingArm: result.embeddingArm && { ...result.embeddingArm, perVariety: undefined } }, null, 1));
}
