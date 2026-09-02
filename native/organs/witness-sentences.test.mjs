import { test } from "node:test";
import assert from "node:assert/strict";
import { witnessSentences, endsFor, settledBy, rowFor } from "./witness-sentences.js";
import * as T from "../../../the-fold/testimony.js";
import { splitSentences } from "../adapters/text/spans.js";

// The live specimen (2026-09-02): one answer, two sentences — a TRUE
// paraphrase the relation tier could not bind, and a FALSE sentence whose
// verb the material never uses. The witness is a fake that answers the way
// the real select protocol is asked: by INDEX into the candidates shown.
const passages = [
  { ref: "p1", text: "After the Battle of Smolensk, the Tsar replaced the unpopular Barclay de Tolly with Mikhail Kutuzov, who on 18 August took over the army. Kutuzov strengthened the line with earthworks." },
  { ref: "p2", text: "After the Battle of Borodino, Napoleon remained on the battlefield with his army; the Imperial Russian forces retreated southwards. What followed was the French occupation of Moscow." },
];
const trueS = "Mikhail Kutuzov replaced Barclay de Tolly as commander.";
const falseS = "After the Battle of Borodino, the Russian army continued to fight.";
const claims = [
  { sentence: trueS, end1: "Mikhail Kutuzov", label: "replaced", end2: "Barclay de Tolly", verdict: "unbound" },
  { sentence: falseS, end1: "Russian army", label: "continued", end2: "to fight", verdict: "unheard" },
];
const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect };
// a witness that points at a candidate only when one literally names the replacement — and never at the twin
const selectAsk = async (messages) => {
  const user = messages.find((m) => m.role === "user").content;
  const claim = (user.match(/^Claim: "([\s\S]*?)"/) ?? [])[1] ?? "";
  const cands = [...user.matchAll(/^(\d+)\. (.*)$/gm)];
  // a DISCRIMINATING witness: yes only to the true sentence itself, pointing
  // at the candidate that names the replacement; the arm's twin gets no
  const hit = claim === trueS ? cands.find(([, , c]) => /replaced .*Barclay.*Kutuzov/.test(c)) : null;
  return hit ? { stated: "yes", sentence: Number(hit[1]) } : { stated: "no", sentence: 0 };
};
const ask = async () => ({ verdict: null, refused: "no-testimony" });

test("a true paraphrase the relation tier left unbound is witnessed as stated, by a passage's own sentence", async () => {
  const { rows, asks } = await witnessSentences([trueS], claims, passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 4 });
  if (rows[0].witness !== "states") console.log("ROW:", JSON.stringify(rows[0]));
  assert.equal(rows[0].witness, "states");
  assert.match(rows[0].decider ?? "", /replaced the unpopular Barclay de Tolly with Mikhail Kutuzov/);
  assert.ok(asks >= 1);
});
test("a false sentence nothing states is refused — marked, never convicted", async () => {
  const { rows } = await witnessSentences([falseS], claims, passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 4 });
  assert.equal(rows[0].witness, "refused");
  assert.ok(rows[0].why);
});
test("a sentence the relation tier already bound is skipped without an ask; the budget is declared and holds", async () => {
  const bound = [{ ...claims[0], verdict: "bound" }];
  const { rows, asks } = await witnessSentences([trueS, falseS], bound.concat(claims[1]), passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 0 });
  assert.equal(rows[0].witness, "skipped"); assert.equal(rows[1].witness, "skipped"); assert.equal(asks, 0);
  await assert.rejects(witnessSentences([trueS], claims, passages, { ask, selectAsk, splitSentences, testimony }), /maxAsks is declared/);
});
test("ends come from the claim when there is one, else from the sentence's own words — never invented", () => {
  assert.equal(endsFor(trueS, claims).from, "claim");
  assert.equal(endsFor("Moscow burned for days afterwards.", []).from, "longest-words");
  assert.equal(endsFor("It was.", []), null);
  assert.equal(settledBy(trueS, [{ ...claims[0], verdict: "bound" }]), true);
});

test("only the model's own 'no' is a refusal; a protocol non-verdict is a typed skip that draws nothing", () => {
  assert.equal(rowFor({ verdict: "states", because: "x" }).witness, "states");
  assert.equal(rowFor({ refused: "no-testimony", via: "select" }).witness, "refused");
  for (const r of ["decider_unrelated", "unarmed-select", "indiscriminate", "no-slice", "uncontained"]) assert.equal(rowFor({ refused: r }).witness, "skipped", r);
});
