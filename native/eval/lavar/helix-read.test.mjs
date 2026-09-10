// helix-read.test.mjs — standalone, re-runnable checks for helix-read.mjs,
// same posture as this directory's other `*-test.mjs` files (console
// narrative + a results JSON, not wired into `npm test`'s conformance
// globs — eval/lavar is exploratory driver territory, not the pinned
// suite). `node helix-read.test.mjs` — exits 1 on any failed assertion.
//
// What each case is FOR, named up front because this project's own
// standing rule is to disclose what was and wasn't validated:
//
//   1. REAL vision escalation — the concrete deliverable: does `settle()`
//      actually find the two real gutters in a genuinely broken,
//      forced-linear OCR read of the real magazine page.
//   2. REAL concession — property 3 (revert a turn that made things
//      worse), tested against a REAL partial-read slice of the same page
//      and a deliberately bad (line-reversing) adversarial sense. This is
//      NOT a replay of the earlier session's own column-repair regression
//      (that script/output is not available to this pass) — it is a
//      fresh, real demonstration of the same mechanism: a measured
//      regression must be caught and reverted, not just an improvement.
//   3. Library free-tier reuse — a cache hit resolves a REREAD of the
//      same source with NO sense available at all.
//   4. Already-settled short-circuit — `turn`/`settle` do no work at all
//      once a ground already clears its own null.
//   5. Identity-set generalization — a light synthetic check that `turn`/
//      `settle` are not stream-specific; the identity-set statistic
//      itself is `findSurprise`, promoted unchanged and not re-validated
//      here (surprise-hunt.mjs already validated its own design).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  hyphenJoinSurprise, findSurprise, turn, settle, makeVisionSense, signatureOf, loadLibrary,
} from "./helix-read.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IMAGE = "/private/tmp/claude-501/-Users-mlacy-Documents-3-0/10e18e8f-5a2d-4a2e-be59-760fe71f3814/scratchpad/uploaded-images/img_magazine.png";
const TESSERACT = "/opt/homebrew/bin/tesseract";

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  const ok = !!cond;
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
  results.push({ name, ok, detail });
}

if (!fs.existsSync(IMAGE)) {
  console.error(`missing fixture image: ${IMAGE} — cannot run the real-data cases`);
  process.exit(1);
}

function tsvLines(psm) {
  const out = execFileSync(TESSERACT, [IMAGE, "stdout", "--psm", String(psm), "tsv"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  const rows = out.split("\n").filter(Boolean);
  const header = rows[0].split("\t");
  const words = rows.slice(1)
    .map((line) => { const cols = line.split("\t"); const o = {}; header.forEach((h, i) => { o[h] = cols[i]; }); return o; })
    .filter((r) => r.level === "5" && r.text && r.text.trim());
  const order = [];
  const byLine = new Map();
  for (const w of words) {
    const key = `${w.block_num}.${w.par_num}.${w.line_num}`;
    if (!byLine.has(key)) { byLine.set(key, []); order.push(key); }
    byLine.get(key).push(w.text);
  }
  return order.map((k) => byLine.get(k).join(" "));
}

// ── 1. REAL VISION ESCALATION ─────────────────────────────────────────────
console.log("\n=== 1. real vision escalation (interleaved -> column-aware) ===");
const brokenLines = tsvLines(6); // psm 6 forces a single block — the same interleaved failure mode named in the task
const brokenGround = { kind: "stream", lines: brokenLines, image: IMAGE, sourceId: `${IMAGE}::psm6(forced-linear)` };
const before1 = hyphenJoinSurprise(brokenGround.lines, {});
console.log(`before: resolved ${before1.resolved}/${before1.total}, p=${before1.p}`);
check("broken (forced-linear) read fails its own shuffle null", before1.regular === false, `p=${before1.p}`);

const settleOut = await settle(brokenGround, [makeVisionSense()], {});
const after1 = hyphenJoinSurprise(settleOut.ground.lines, {});
console.log(`settle(): settled=${settleOut.settled} turns=${settleOut.turns} reason="${settleOut.reason}"`);
console.log(`after: resolved ${after1.resolved}/${after1.total}, p=${after1.p}`);
check("settle() finds a reading that clears its own null", settleOut.settled === true, `p=${after1.p}`);
check("settle() did it in exactly one turn (single vision escalation)", settleOut.turns === 1, `turns=${settleOut.turns}`);
check("the resolved reading has more real lines than the interleaved one", settleOut.ground.lines.length > brokenGround.lines.length, `${settleOut.ground.lines.length} vs ${brokenGround.lines.length}`);

// ── 2. REAL CONCESSION ────────────────────────────────────────────────────
console.log("\n=== 2. concession — a turn that makes things worse is reverted ===");
const goodLines = tsvLines(3); // psm 3 (auto) — real column-aware layout analysis
const slice15 = goodLines.slice(0, 15);
const before2 = hyphenJoinSurprise(slice15, {});
console.log(`before (15-line real slice): resolved ${before2.resolved}/${before2.total}, p=${before2.p}`);
check("the 15-line slice is a real, not-yet-settled ground (narrowly fails its null)", before2.regular === false, `p=${before2.p}`);

const worseningSense = {
  name: "adversarial-reverse-order",
  look(_surprise, ground) {
    // stands in for the session's own real "repair that made it worse"
    // (re-segmenting into columns, measured worse than the broken input)
    // — a concrete, reproducible bad transform: reversing line order
    // destroys whatever adjacency the real read had.
    return { settled: true, ground: { ...ground, lines: ground.lines.slice().reverse(), sourceId: `${ground.sourceId}::reversed` } };
  },
};
const concedeGround = { kind: "stream", lines: slice15, sourceId: `${IMAGE}::psm3-slice15` };
const turnOut = await turn(concedeGround, [worseningSense], {});
const reversedCheck = hyphenJoinSurprise(worseningSense.look(null, concedeGround).ground.lines, {});
console.log(`the adversarial candidate alone: resolved ${reversedCheck.resolved}/${reversedCheck.total}, p=${reversedCheck.p}`);
console.log(`turn(): moved=${turnOut.moved} conceded=${turnOut.conceded} reason="${turnOut.reason}"`);
check("the adversarial candidate really is worse (higher p) than the original", reversedCheck.p > before2.p, `${reversedCheck.p} vs ${before2.p}`);
check("turn() concedes rather than accepting a worse candidate", turnOut.conceded === true && turnOut.moved === false);
check("the conceded ground keeps the ORIGINAL lines, not the reversed ones", JSON.stringify(turnOut.ground.lines) === JSON.stringify(slice15));
check("the failed sense is recorded on the returned ground so it isn't retried blindly", (turnOut.ground.failedAttempts ?? []).includes("adversarial-reverse-order"), JSON.stringify(turnOut.ground.failedAttempts));

// same ground, same sense, called again: must not retry the already-failed sense
const turnOut2 = await turn(turnOut.ground, [worseningSense], {});
check("a second turn against the SAME conceded ground does not re-try the blocked sense", turnOut2.moved === false && turnOut2.reason === "no sense produced a candidate");

// ── 3. LIBRARY FREE-TIER REUSE ────────────────────────────────────────────
console.log("\n=== 3. library — a reread of the same source is resolved for free ===");
const library = { conventions: [] };
const primeGround = { kind: "stream", lines: brokenLines, image: IMAGE, sourceId: `${IMAGE}::psm6(forced-linear)` };
const primeTurn = await turn(primeGround, [makeVisionSense()], { library });
check("a real turn that resolves via a sense is recorded into the library", library.conventions.length === 1, `signature=${library.conventions[0]?.signature}`);

const rereadGround = { kind: "stream", lines: brokenLines.slice(), image: IMAGE, sourceId: `${IMAGE}::psm6(forced-linear)` }; // same source, fresh object — a genuine reread
const rereadTurn = await turn(rereadGround, [], { library }); // NO senses at all
console.log(`reread turn(): moved=${rereadTurn.moved} via=${JSON.stringify(rereadTurn.via)}`);
check("a reread of the SAME source resolves via the library with zero senses available", rereadTurn.moved === true && rereadTurn.via?.source === "library");
check("the library-served reading is the same fix already found", JSON.stringify(rereadTurn.ground.lines) === JSON.stringify(primeTurn.ground.lines));

// the real stream-conventions.json on disk (seeded this pass from this
// same real magazine case) round-trips through loadLibrary the same way.
const diskLibrary = loadLibrary();
check("stream-conventions.json on disk carries the real, confirmed magazine resolution", diskLibrary.conventions.some((c) => c.signature === signatureOf(primeGround, "hyphen-join")));
const diskRereadTurn = await turn({ kind: "stream", lines: brokenLines.slice(), image: IMAGE, sourceId: primeGround.sourceId }, [], { library: diskLibrary });
check("a reread against the ON-DISK library also resolves for free", diskRereadTurn.moved === true && diskRereadTurn.via?.source === "library");

// signature is source-scoped, not a cross-document rule — a DIFFERENT
// source must NOT get a free hit from this same library.
const differentSourceGround = { kind: "stream", lines: brokenLines.slice(), image: "/some/other/image.png", sourceId: "/some/other/image.png::psm6(forced-linear)" };
const differentTurn = await turn(differentSourceGround, [], { library });
check("a library entry does not generalize to a different source (deliberately narrow key)", differentTurn.moved === false, signatureOf(differentSourceGround, "hyphen-join"));

// ── 4. ALREADY-SETTLED SHORT-CIRCUIT ──────────────────────────────────────
console.log("\n=== 4. already-settled ground does no work ===");
const settledGround = { kind: "stream", lines: settleOut.ground.lines, sourceId: "already-good" };
const noopTurn = await turn(settledGround, [], {});
check("turn() on an already-settled ground does nothing (moved=false, conceded=false)", noopTurn.moved === false && noopTurn.conceded === false);
const noopSettle = await settle(settledGround, [], {});
check("settle() on an already-settled ground returns immediately at turns=0", noopSettle.settled === true && noopSettle.turns === 0);

// ── 5. IDENTITY-SET GENERALIZATION (light) ────────────────────────────────
// Formerly a disclosed-broken finding (the redeal null could never certify
// "regular:true" for ANY input — proven, not just observed: `observed`
// occupancy is anchored to the member set's own global min/max, the
// theoretical MINIMUM occupancy achievable for that count/span, so no
// redeal draw's own self-referential occupancy could ever score lower).
// Fixed in `helix-read.mjs` (see the block comment on `occupancy()` there
// for the full derivation and the real specimen it was verified against —
// P&P's 59-of-60 chapter numerals, hole at 46, now correctly resolves
// `regular:true` and finds the gap). `find-surprise.test.mjs` pins that
// recovery directly; this case is kept as-is because it is STILL a
// legitimate `regular:false` under the fix — just for an honest reason
// now (limited statistical power at small N: 5 members is little enough
// evidence that a single interior hole can't clear alpha=0.05), not the
// old tautology. Exercises the same `turn`/`settle` dispatch-and-concede
// path either way.
console.log("\n=== 5. turn/settle generalize to the identity-set statistic ===");
const withGap = [2, 4, 6, 10, 12]; // regular spacing of 2, missing 8 — small N, honestly low power
const idBefore = findSurprise(withGap, (m) => m, { draws: 200, seed: 1, alpha: 0.05 });
console.log(`identity-set before: regular=${idBefore.regular} p=${idBefore.p}`);
check("small-N set with one hole honestly fails to clear alpha (limited power, not the old tautology)", idBefore.regular === false, `p=${idBefore.p}`);

const idGround = { kind: "identity-set", members: withGap, positionOf: (m) => m };
const idTurn = await turn(idGround, [], {}); // no sense CAN help an irregular set — "irregular" isn't a prediction-error surprise a sense targets
check("turn() on an identity-set ground dispatches to findSurprise without crashing", typeof idTurn === "object");
check("turn() correctly reports no productive move rather than fabricating one", idTurn.moved === false && idTurn.conceded === false);
const idSettle = await settle(idGround, [], { maxTurns: 3 });
check("settle() reports settled:false honestly for a ground its own statistic cannot currently certify as regular", idSettle.settled === false);

// ── summary ────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${fail} failed`);
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
fs.writeFileSync(path.join(HERE, "results", "helix-read-test.json"), JSON.stringify({ pass, fail, results }, null, 1));
if (fail > 0) process.exit(1);
