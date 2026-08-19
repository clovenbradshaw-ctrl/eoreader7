// node eval/witness-live.mjs [model]
//
// The witness tier against a REAL local model — the exact messages and
// schema app.js's witnessProof sends, over the measured specimen (the 1960
// World Series claim that drew ✓ 3/3 from string containment while the
// page said the opposite). Verifies live what testimony.test.mjs verifies
// offline: the read lands, the pointer is contained, and the sibling arm
// flips — a witness whose verdict moves under the swap.

import {
  WITNESS_SCHEMA,
  buildWitnessMessages,
  foldTestimony,
  readTestimony,
  siblingSwap,
  witnessSlice,
} from "../testimony.js";

const MODEL = process.argv[2] ?? "gemma2:2b";
const OLLAMA = "http://localhost:11434";

const PAGE = [
  "The 1960 World Series was played between the New York Yankees of the American League and the Pittsburgh Pirates of the National League.",
  "The Pittsburgh Pirates defeated the New York Yankees in seven games to win the 1960 World Series.",
  "Bill Mazeroski ended game seven with a walk-off home run at Forbes Field, the first time a World Series ended on a home run.",
  "The Yankees outscored the Pirates 55 to 27 across the seven games, the largest run differential ever for a losing team.",
].join(" ");

const CLAIM = {
  kind: "name",
  text: "New York Yankees won the 1960 World Series",
  tokens: ["Yankees", "won", "1960"],
  sentence: "The New York Yankees won the 1960 World Series.",
};

async function ask(messages) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: false, format: WITNESS_SCHEMA, options: { num_predict: 200 } }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json()).message?.content ?? "";
}

const slice = witnessSlice(CLAIM, PAGE);
console.log(`slice (${slice.length} chars):\n  ${slice}\n`);

const t0 = Date.now();
const real = readTestimony(await ask(buildWitnessMessages(CLAIM.sentence, slice)));
console.log(`claim read (${Date.now() - t0}ms):`, real);

const swap = real ? siblingSwap(CLAIM.sentence, slice) : null;
let arm = null;
if (swap) {
  console.log(`arm: ${swap.from} ⇄ ${swap.to} → "${swap.swapped}"`);
  const t1 = Date.now();
  arm = readTestimony(await ask(buildWitnessMessages(swap.swapped, slice)));
  console.log(`arm read (${Date.now() - t1}ms):`, arm);
}

const testimony = foldTestimony({
  real,
  arm,
  armed: Boolean(swap),
  host: "en.wikipedia.org",
  slice,
  claim: CLAIM.sentence,
  swapped: swap?.swapped ?? "",
});
console.log("\ntestimony:", JSON.stringify(testimony, null, 2));

if (testimony.verdict === "contradicts" && testimony.armed) {
  console.log("\nPASS — the witness contradicts the false claim, and the arm flipped");
} else if (testimony.refused) {
  console.log(`\nREFUSED (typed, honest): ${testimony.refused} — the discipline held even though the read failed`);
} else {
  console.log("\nUNEXPECTED — inspect the verdicts above");
}
