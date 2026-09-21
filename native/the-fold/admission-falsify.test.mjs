// admission-falsify.test.mjs — THE FALSIFICATION TIER for two laws:
//
//   "the machinery is the selector, and it knows nothing about English, about
//    essays, or about the topic of the run" (omnilingual, omnitask)
//   "a piece is matter AND motion — a selector that admits only matter emits
//    a list" (the swarm's converging verdict, 2026-09-21)
//
// Each test attacks a consequence the laws must survive. The tests that carry
// the most weight are the ones that FAILED against the predecessor: five
// scripts where the old claim core was the empty string, and a bridging
// sentence the old selector refused.
import test from "node:test";
import assert from "node:assert/strict";
import {
  segmentSentences, wordTokens, measureVariance, claimCore, bond,
  measureBondNull, scriptHasCase, nameGate, looksMeta, admit,
} from "./admission.js";

// The same material in six languages. Each is five sentences so the null has
// something to measure, and each says the same things, so a claim that folds
// in one must fold in all.
const GROUNDS = {
  eng: "The Cumberland River flows through the center of Nashville. It drains a basin of about eighteen thousand square miles. Steamboats carried cotton downriver every spring. The port handles barge traffic today. Locks and dams hold the channel open.",
  cmn: "坎伯兰河流经纳什维尔市中心。它的流域面积约为一万八千平方英里。汽船每年春天沿河运送棉花。该港口今天处理驳船运输。船闸和水坝保持航道畅通。",
  arb: "يمر نهر كمبرلاند عبر وسط ناشفيل. يصرف حوضا مساحته نحو ثمانية عشر ألف ميل مربع. كانت البواخر تنقل القطن كل ربيع. يتعامل الميناء اليوم مع حركة الصنادل. تحافظ الأهوسة والسدود على القناة مفتوحة.",
  rus: "Река Камберленд протекает через центр Нашвилла. Её бассейн занимает около восемнадцати тысяч квадратных миль. Пароходы возили хлопок вниз по реке каждую весну. Порт сегодня обслуживает баржи. Шлюзы и плотины держат фарватер открытым.",
  hin: "कंबरलैंड नदी नैशविल के बीच से बहती है। इसका बेसिन लगभग अठारह हजार वर्ग मील है। भाप नौकाएँ हर वसंत कपास ले जाती थीं। बंदरगाह आज बजरा यातायात संभालता है। ताले और बांध चैनल को खुला रखते हैं।",
  jpn: "カンバーランド川はナッシュビルの中心を流れている。その流域面積はおよそ一万八千平方マイルである。蒸気船は毎年春に綿を川下へ運んだ。港は今日はしけの輸送を扱っている。閘門とダムが水路を開いたままにしている。",
};

// ── The wall the predecessor hit ────────────────────────────────────────────

test("every script splits into its own sentences", () => {
  for (const [lang, g] of Object.entries(GROUNDS)) {
    const n = segmentSentences(g).length;
    assert.ok(n >= 4, `${lang}: split into ${n}, expected the material's own sentences`);
  }
});

test("every script yields word-like tokens", () => {
  for (const [lang, g] of Object.entries(GROUNDS)) {
    assert.ok(wordTokens(g).length >= 8, `${lang}: tokenizer returned nothing`);
  }
});

test("THE WALL: two different sentences never fold to the same claim core", () => {
  // The predecessor returned "" for every non-Latin sentence, so the second
  // sentence of any non-Latin document collided with the first and the
  // document could not exceed one sentence. This is that exact failure.
  for (const [lang, g] of Object.entries(GROUNDS)) {
    const v = measureVariance(g);
    const sents = segmentSentences(g);
    const cores = sents.map((s) => claimCore(s, v));
    for (const c of cores) assert.notEqual(c, "", `${lang}: empty claim core — the registry would refuse everything`);
    assert.equal(new Set(cores).size, cores.length, `${lang}: distinct sentences collided: ${JSON.stringify(cores)}`);
  }
});

// ── No hand-set constant ────────────────────────────────────────────────────

test("the variance vocabulary is measured from the material, not declared", () => {
  const v = measureVariance(GROUNDS.eng);
  assert.ok(v.size > 0, "no variance measured at all");
  // The subject's own name is variance IN THIS MATERIAL because the material
  // says it constantly — never because the engine was told the word "river".
  assert.ok(v.has("the") || v.has("river"), `expected the material's connective tissue, got ${[...v].join(",")}`);
  // And a word this material says once is not variance.
  assert.ok(!v.has("steamboats"), "a once-said word was called variance");
});

test("the same measurement over different material yields a different vocabulary", () => {
  const a = measureVariance(GROUNDS.eng);
  const b = measureVariance("The bongo is a forest antelope. The bongo hides in dense forest. Forest cover is shrinking. Antelope numbers fall with it. Poaching takes the rest.");
  assert.notDeepEqual([...a].sort(), [...b].sort(), "the vocabulary did not follow the material");
});

test("a measured null is stable across runs over the same ground", () => {
  const a = measureBondNull(GROUNDS.eng, undefined, measureVariance(GROUNDS.eng));
  const b = measureBondNull(GROUNDS.eng, undefined, measureVariance(GROUNDS.eng));
  assert.deepEqual(a, b, "the null moved between runs — as arbitrary as a hand-set cut");
});

// ── The name gate names its own ceiling ─────────────────────────────────────

test("caseness is read off the script, and the gate says which one guards", () => {
  assert.equal(scriptHasCase(GROUNDS.eng), true);
  assert.equal(scriptHasCase(GROUNDS.rus), true, "Cyrillic has case");
  for (const lang of ["cmn", "arb", "hin", "jpn"]) {
    assert.equal(scriptHasCase(GROUNDS[lang]), false, `${lang} was treated as cased`);
    assert.equal(nameGate(GROUNDS[lang]).gate, "referent-index", `${lang}: a capitalization gate here is a silent no-op`);
  }
  assert.equal(nameGate(GROUNDS.eng).gate, "capitalization");
});

// ── Meta, without a list of English phrases ─────────────────────────────────

test("a sentence about the task is meta in any language, by measurement", () => {
  const instruction = "Write an essay about the role of the Cumberland River in Nashville's growth.";
  assert.equal(looksMeta("This essay will explore the role of the river in Nashville's growth.", { instruction, ground: GROUNDS.eng }), true);
  assert.equal(looksMeta("Steamboats carried cotton downriver every spring.", { instruction, ground: GROUNDS.eng }), false);
});

test("meta detection carries to a script the old regex could not see", () => {
  const instruction = "坎伯兰河在纳什维尔发展中的作用。请写一篇文章。";
  assert.equal(looksMeta("请写一篇文章，这篇文章将探讨作用。", { instruction, ground: GROUNDS.cmn }), true);
  assert.equal(looksMeta("汽船每年春天沿河运送棉花。", { instruction, ground: GROUNDS.cmn }), false);
});

// ── Two roads: the defect that made the essay a list ────────────────────────

const CTX = () => {
  const ground = GROUNDS.eng;
  const variance = measureVariance(ground);
  return { ground, variance, bondNull: measureBondNull(ground, undefined, variance), registry: new Set() };
};

test("MATTER: a grounded, unrepeated sentence is admitted on the matter road", () => {
  const r = admit("Locks and dams hold the channel open.", { ...CTX(), isGrounded: () => true });
  assert.equal(r.admit, true);
  assert.equal(r.road, "matter");
});

test("MOTION: a sentence that turns the piece is admitted though it grounds to nothing", () => {
  // This is the sentence the predecessor refused. It resolves to no referent —
  // it is a turn, not an assertion — and under the old selector every such
  // sentence died, which is why the piece never moved.
  const ctx = CTX();
  const priorLanding = "Steamboats carried cotton downriver every spring.";
  const cand = "That cotton traffic, though, carried a cost the steamboats never paid.";
  const r = admit(cand, { ...ctx, priorLanding, isGrounded: () => false });
  assert.equal(r.admit, true, `refused: ${JSON.stringify(r.refused)}`);
  assert.equal(r.road, "motion");
  assert.ok(r.bond > r.nullMax, "admitted without clearing the null");
});

test("a sentence bonded to nothing is still refused — motion is not a free pass", () => {
  const r = admit("Quarterly earnings guidance disappointed analysts again.", {
    ...CTX(), priorLanding: "Steamboats carried cotton downriver every spring.", isGrounded: () => false,
  });
  assert.equal(r.admit, false);
  assert.equal(r.refused[0].kind, "ungrounded");
});

test("motion cannot re-say a deposited claim", () => {
  const ctx = CTX();
  const prior = "Steamboats carried cotton downriver every spring.";
  const core = claimCore(prior, ctx.variance);
  const r = admit(prior, { ...ctx, registry: new Set([core]), priorLanding: prior, isGrounded: () => true });
  assert.equal(r.admit, false);
  assert.equal(r.refused[0].kind, "repeat");
});

test("both roads are open in every script", () => {
  for (const [lang, g] of Object.entries(GROUNDS)) {
    const v = measureVariance(g);
    const sents = segmentSentences(g);
    const ctx = { ground: g, variance: v, bondNull: measureBondNull(g, undefined, v), registry: new Set() };
    const m = admit(sents[2], { ...ctx, isGrounded: () => true });
    assert.equal(m.admit, true, `${lang}: matter road closed`);
    const n = admit(sents[3], { ...ctx, priorLanding: sents[3], isGrounded: () => false });
    assert.equal(n.road, "motion", `${lang}: motion road closed (${JSON.stringify(n.refused)})`);
  }
});

test("every refusal names its kind and its given", () => {
  const r = admit("Quarterly earnings guidance disappointed analysts again.", { ...CTX(), isGrounded: () => false });
  for (const ref of r.refused) {
    assert.ok(ref.kind, "a refusal with no kind");
    assert.equal(ref.given, "model", "a refusal held unattributed");
  }
});

// ── falsified LIVE 2026-09-21: paraphrase past the six-word core ────────────
import { matterWords, deposit } from "./admission.js";

test("LIVE: a sentence that brings no new matter word is a repeat, whatever its sixth word", () => {
  // The live pair: "...shaping the city's growth" then "...shaping the city's
  // development". The ground never says "development", so the second
  // sentence's only unshared word is not matter — it asserts nothing the
  // material holds that the first did not.
  // On a five-sentence ground every word two sentences share is variance,
  // and bond strips variance, so the ceiling is zero by construction and the
  // fraction rule reduces to "no new matter at all" — which still catches
  // this pair. The ceiling above zero is tested on real material below.
  const ground = "The Cumberland River carved its path through the landscape. The landscape along the river shaped the city's growth. The river is a major waterway of the southeastern United States. Steamboats carried cotton downriver on the river. The port on the river handles barge traffic today.";
  const v = measureVariance(ground);
  const ctx = { ground, variance: v, bondNull: measureBondNull(ground, undefined, v), registry: new Set(), isGrounded: () => true };
  const first = admit("The Cumberland River carved its path through the landscape, shaping the city's growth.", ctx);
  assert.equal(first.admit, true);
  deposit(ctx.registry, first);
  const para = admit("It carved its path through the landscape, shaping the city's development.", ctx);
  assert.equal(para.admit, false, "the paraphrase was admitted");
  assert.equal(para.refused[0].kind, "repeat");
  // ONE new grounded word licenses a sentence: it asserts something new.
  const fresh = admit("Steamboats carried cotton downriver from that landscape.", ctx);
  assert.equal(fresh.admit, true, `fresh matter refused: ${JSON.stringify(fresh.refused)}`);
});

test("the edge, stated: when the ground DOES hold the differing word, the sentence brings new matter and is admitted", () => {
  const ground = "The Cumberland River carved its path through the landscape. It shaped the city's growth and development. The river is a major waterway. Steamboats carried cotton downriver. The port handles barge traffic today.";
  const v = measureVariance(ground);
  const ctx = { ground, variance: v, bondNull: measureBondNull(ground, undefined, v), registry: new Set(), isGrounded: () => true };
  deposit(ctx.registry, admit("The river carved its path through the landscape, shaping the city's growth.", ctx));
  const r = admit("It carved its path through the landscape, shaping the city's development.", ctx);
  assert.equal(r.admit, true, "a sentence asserting a grounded word not yet said is new matter — the fold, not the selector, decides whether it earns its place");
});

test("a sentence with no deposited matter is never judged a repeat on matter — the motion road admits the turn", () => {
  const ground = "The Cumberland River carved its path through the landscape. It shaped the city's growth. The river is a major waterway. Steamboats carried cotton downriver. The port handles barge traffic today.";
  const v = measureVariance(ground);
  const ctx = { ground, variance: v, bondNull: measureBondNull(ground, undefined, v), registry: new Set(["w:carved", "w:landscape"]), isGrounded: () => false };
  const turn = admit("But that, though, was never the whole of it.", { ...ctx, priorLanding: "But the whole of it was never that." });
  assert.equal(turn.admit, true, `turn refused: ${JSON.stringify(turn.refused)}`);
  assert.equal(turn.road, "motion");
  // "it" is in the ground once, so by the measure it IS a grounded
  // non-variance word — the measure holds no stoplist, in any language.
  assert.ok(matterWords("But that, though, was never the whole of it.", ground, v).every((w) => ["it"].includes(w)));
});

// ── the fraction rule on REAL material (the workspace ground, 25 sentences) ──
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));
const REAL = readFileSync(join(HERE, "fixtures", "cumberland-ground.md"), "utf8").replace(/^#.*$/m, "");

test("REAL GROUND: the ceiling is above zero, and a one-fresh-word restatement falls under it", () => {
  const v = measureVariance(REAL);
  const nul = measureBondNull(REAL, undefined, v);
  assert.ok(nul.max > 0, `real material measured a zero ceiling (${nul.pairs} pairs)`);
  const ctx = { ground: REAL, variance: v, bondNull: nul, registry: new Set(), isGrounded: () => true };
  const first = admit("Steamboats reached Nashville in 1819, and the river became the city's link to the cotton and tobacco markets of New Orleans.", ctx);
  assert.equal(first.admit, true);
  deposit(ctx.registry, first);
  // Same claim, re-worded, one grounded word swapped in ("lumber" is in the ground).
  const restated = admit("Steamboats reached Nashville in 1819, and the river became the city's link to the cotton and lumber markets of New Orleans.", ctx);
  assert.equal(restated.admit, false, `restatement admitted: ${JSON.stringify(restated)}`);
  assert.match(restated.refused[0].basis ?? "", /within the null ceiling|no new matter|same claim core/);
  // A genuinely new grounded sentence is not.
  const novel = admit("Wolf Creek Dam, completed in 1951, created Lake Cumberland.", ctx);
  assert.equal(novel.admit, true, `novel refused: ${JSON.stringify(novel.refused)}`);
});

test("LIVE: a sentence that echoes the void cell's own question is meta, when the question rides in the instruction", () => {
  const v = measureVariance(REAL);
  const nul = measureBondNull(REAL, undefined, v);
  const task = "Write an essay on the role of the Cumberland River in Nashville's growth.";
  const cell = "What KIND is the role of the Cumberland River in Nashville's growth — and do its kinds hold as kinds against the material, or are they unresolved?";
  const leak = "Is it a kind that holds firm against the material, a kind with a history of enduring, or is it a kind that is unresolved, its true nature a question mark?";
  const ctx = { ground: REAL, variance: v, bondNull: nul, registry: new Set(), isGrounded: () => true };
  assert.equal(admit(leak, { ...ctx, instruction: `${task}\n${cell}` }).refused?.[0]?.kind, "meta", "the leaked question was not read as meta");
  // and a real sentence of the piece still bonds to the ground, not the question
  const real = admit("Donelson led a flotilla of flatboats carrying families up the Cumberland in the winter of 1779.", { ...ctx, instruction: `${task}\n${cell}` });
  assert.equal(real.admit, true, `a real sentence was called meta: ${JSON.stringify(real.refused)}`);
});

test("FALSIFIED OFFLINE: a sentence about the subject is not meta just because the task names the subject", () => {
  const six = segmentSentences(REAL).slice(0, 6).join(" ");
  const task = "Write an essay on the role of the Cumberland River in Nashville's growth.";
  const cell = "What KIND is the role of the Cumberland River in Nashville's growth — and do its kinds hold as kinds against the material, or are they unresolved?";
  // A sentence whose content the ground holds is not meta; on a six-sentence
  // ground that never mentions growth, a sentence about growth is closer to
  // the task than to the material — and that verdict is correct.
  assert.equal(looksMeta("The Cumberland River flows from the Appalachian foothills of eastern Kentucky.", { instruction: `${task}\n${cell}`, ground: six, variance: measureVariance(six) }), false, "a subject sentence was called meta");
  assert.equal(looksMeta("The river drains a basin of about 18,000 square miles.", { instruction: `${task}\n${cell}`, ground: six, variance: measureVariance(six) }), false);
  assert.equal(looksMeta("Is it a kind that holds firm against the material, or is it unresolved?", { instruction: `${task}\n${cell}`, ground: six }), true, "the leaked scaffolding was not caught");
  assert.equal(looksMeta("This essay will explore the river's role.", { instruction: task, ground: six, variance: measureVariance(six) }), true);
});

test("a turn whose connectives are scaffold words is admitted on motion, not refused as meta", () => {
  const v = measureVariance(REAL);
  const nul = measureBondNull(REAL, undefined, v);
  const task = "Write an essay on the role of the Cumberland River in Nashville's growth.";
  const cell = "What KIND is the role — and do its kinds hold as kinds against the material, or are they unresolved?";
  const prior = "The flood of May 2010 crested at 51.86 feet and put the downtown riverfront under water.";
  // The turn must actually continue the prior — share its matter harder than
  // two arbitrary passages of this material do (the ceiling here is 0.333,
  // because the material repeats itself). A sentence that shares one word
  // with the prior is not a turn by the measure, and the first draft of this
  // test wrote exactly that.
  const turn = "But 51.86 feet of water in 2010 were not the whole of it, as the river that crested would show.";
  assert.ok(admit(turn, { ground: REAL, variance: v, bondNull: nul, registry: new Set(), priorLanding: prior, isGrounded: () => false }).bond > nul.max, "the test's own turn must clear the ceiling");
  const r = admit(turn, { ground: REAL, variance: v, bondNull: nul, registry: new Set(), priorLanding: prior, instruction: `${task}\n${cell}`, isGrounded: () => false });
  assert.equal(r.admit, true, `turn refused: ${JSON.stringify(r.refused)}`);
  assert.equal(r.road, "motion");
});

// ── falsified LIVE 2026-09-21: overlapping chunks pinned the ceiling to 1 ──
import { distinctSentences } from "./admission.js";
test("LIVE: a ground that repeats its sentences (overlapping chunks) does not pin the bond ceiling to 1", () => {
  const once = REAL;
  const chunked = REAL + "\n" + REAL + "\n" + segmentSentences(REAL).slice(3, 12).join(" ");
  const v1 = measureVariance(once), v2 = measureVariance(chunked);
  assert.deepEqual([...v2].sort(), [...v1].sort(), "duplicated chunks changed the variance vocabulary");
  const n1 = measureBondNull(once, undefined, v1), n2 = measureBondNull(chunked, undefined, v2);
  assert.ok(n2.max < 1, `ceiling pinned at ${n2.max}`);
  assert.equal(n2.max, n1.max, "duplicated chunks moved the ceiling");
  assert.equal(distinctSentences(chunked).length, distinctSentences(once).length);
});

test("LIVE: sentence fragments from chunk boundaries are not passages, and cannot pin the ceiling", () => {
  const sents = segmentSentences(REAL);
  const fragments = sents.slice(0, 12).map((x) => x.split(" ").slice(0, Math.max(3, Math.floor(x.split(" ").length / 2))).join(" ") + ".");
  const chunked = REAL + "\n" + fragments.join(" ") + "\n" + REAL;
  const v = measureVariance(chunked);
  const n = measureBondNull(chunked, undefined, v);
  const n0 = measureBondNull(REAL, undefined, measureVariance(REAL));
  assert.ok(n.max < 1, `ceiling pinned at ${n.max}`);
  assert.equal(n.max, n0.max, `fragments moved the ceiling (${n.max} vs ${n0.max})`);
});

test("LIVE: a sentence whose claim words all sit inside another's (bond 1 after variance) does not pin the ceiling", () => {
  const sents = segmentSentences(REAL);
  // The same claim words as sentence 4, wrapped in variance words only.
  const v0 = measureVariance(REAL);
  const core = wordTokens(sents[4]).filter((w) => !v0.has(w)).join(" ");
  const wrapped = `The ${core} of the river.`;
  const chunked = REAL + "\n" + wrapped;
  const n = measureBondNull(chunked, undefined, measureVariance(chunked));
  assert.ok(n.max < 1, `ceiling pinned at ${n.max}`);
});

test("LIVE: chunk variants differing by one boundary token are one passage, not a pair", () => {
  const sents = segmentSentences(REAL);
  const variants = sents.slice(0, 10).map((x) => "Then " + x) .concat(sents.slice(0, 10).map((x) => x.replace(/\.$/, " there.")));
  const chunked = REAL + "\n" + variants.join(" ");
  const n = measureBondNull(chunked, undefined, measureVariance(chunked));
  const n0 = measureBondNull(REAL, undefined, measureVariance(REAL));
  assert.ok(n.max <= n0.max + 1e-9, `variants raised the ceiling (${n.max} vs ${n0.max})`);
});

test("LIVE: a sentence that both asserts and answers is counted on BOTH roads", () => {
  // Read off two finished runs, both of which reported "0 motion" in every
  // section and spent a redraw on it: the grounded branch returned before the
  // turn was ever tested, so motion could only ever be reported for a
  // sentence that grounded to nothing.
  const v = measureVariance(REAL);
  const nul = measureBondNull(REAL, undefined, v);
  const prior = "Steamboats reached Nashville in 1819, and the river became the city's link to the cotton and tobacco markets of New Orleans.";
  const cand = "By the 1850s that steamboat link had made Nashville a major river port, and warehouses lined the waterfront.";
  // Motion is referent continuity: both sentences speak of the steamboats and
  // the river link. The caller supplies that judgement from its index; here a
  // stand-in reads the shared referent directly.
  const continues = (a, b) => /steamboat/i.test(a) && /steamboat/i.test(b);
  const ctx = { ground: REAL, variance: v, bondNull: nul, registry: new Set(), priorLanding: prior, instruction: "Write an essay.", continues };
  const r = admit(cand, { ...ctx, isGrounded: () => true });
  assert.equal(r.admit, true, `refused: ${JSON.stringify(r.refused)}`);
  assert.equal(r.road, "both", "a grounded turn was not recorded as a turn");
  // and the two pure cases still report their single road
  assert.equal(admit("Wolf Creek Dam, completed in 1951, created Lake Cumberland.", { ...ctx, priorLanding: "", isGrounded: () => true }).road, "matter");
  // A sentence that takes up nothing the prior put down is matter alone.
  assert.equal(admit("Wolf Creek Dam, completed in 1951, created Lake Cumberland.", { ...ctx, isGrounded: () => true }).road, "matter");
});

test("the draft gate counts a 'both' sentence toward matter AND motion", async () => {
  const { draftGate } = await import("./spiral-contract.js");
  const high = draftGate.high({ survivors: ["a"], roads: ["both"], refusals: [] }, { isOpening: false });
  assert.equal(high.pass, true, `a section carrying a grounded turn still failed: ${high.basis}`);
  assert.equal(high.matter, 1);
  assert.equal(high.motion, 1);
});

test("MEASURED, NOT ASSUMED: lexical overlap cannot tell a continuation from an arbitrary pair", () => {
  // The falsifying measurement that retired the string test. The source's own
  // ADJACENT sentences are true continuations by construction; the variance
  // strip removes the pronoun and the repeated topic noun, which is where
  // cohesion actually lives, so every true pair scores zero.
  const v = measureVariance(REAL);
  const nul = measureBondNull(REAL, undefined, v);
  const G = distinctSentences(REAL);
  let fired = 0;
  for (let i = 1; i < G.length; i++) if (bond(G[i], G[i - 1], undefined, v) > nul.max) fired++;
  assert.equal(fired, 0, "the string rule was expected to fire on none of the true continuations");
  // And with the variance counted back in, true and arbitrary pairs overlap.
  const none = new Set();
  const trues = []; const falses = [];
  for (let i = 1; i < G.length; i++) trues.push(bond(G[i], G[i - 1], undefined, none));
  for (let i = 0; i < G.length; i++) for (let j = 0; j < G.length; j++) if (Math.abs(i - j) >= 3) falses.push(bond(G[i], G[j], undefined, none));
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(mean(trues) - mean(falses) < 0.05, `the two populations separated after all (${mean(trues)} vs ${mean(falses)}) — the referent test may no longer be needed`);
});

test("FOUND BY A TEST: a ground too small to measure a null does not refuse every sentence", () => {
  const tiny = "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s.";
  const v = measureVariance(tiny);
  const nul = measureBondNull(tiny, undefined, v);
  assert.equal(nul.pairs, 0, "the premise: a two-sentence ground has no pairs to measure");
  const r = admit("Steamboats reached Nashville and carried cotton to New Orleans.", { ground: tiny, variance: v, bondNull: nul, registry: new Set(), isGrounded: () => true });
  assert.equal(r.admit, true, `refused on an unmeasured null: ${JSON.stringify(r.refused)}`);
});
