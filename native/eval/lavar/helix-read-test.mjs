// helix-read-test.mjs — real, executable testing for helix-read.mjs.
// Not a unit-test-framework file (this repo's sibling "-test.mjs" drivers
// — field-lens-improvement-test.mjs, dark-referent-cluster-test.mjs — are
// all runnable scripts printing real numbers, not an assert-based suite;
// this follows the same convention). Run with:
//   node helix-read-test.mjs
// Requires /tmp/psm3.txt and /tmp/psm6.txt (regenerate if missing via:
//   tesseract img_magazine.png /tmp/psm3 --psm 3
//   tesseract img_magazine.png /tmp/psm6 --psm 6
// against the specimen at .../scratchpad/uploaded-images/img_magazine.png)
// and a real German hunspell dictionary on disk — this session found one
// already present, bundled with Adobe Acrobat DC's Hunspell plugin (NOT
// installed for this task). Override via ADOBE_DE_DICT if it lives
// somewhere else on the machine running this.

import fs from "node:fs";
import {
  findSurprise, hunt,
  hyphenJoinSurprise, makeHunspellIsWord, defaultIsWord,
  loadLibrary, saveLibrary, consultLibrary,
  turn, settle, compareSurprise,
} from "./helix-read.mjs";

const DICT_BASE = process.env.ADOBE_DE_DICT ||
  "/Library/Application Support/Adobe/Acrobat/DC/Linguistics/Providers/Plugins2/AdobeHunspellPlugin.bundle/Contents/SharedSupport/Dictionaries/de_DE/de_DE";
const LIBRARY_PATH = new URL("./stream-conventions.json", import.meta.url).pathname;

function section(title) {
  console.log(`\n${"=".repeat(70)}\n${title}\n${"=".repeat(70)}`);
}

function readLines(path) {
  return fs.readFileSync(path, "utf8").split("\n");
}

async function main() {
  // ── Part 0: findSurprise / hunt fidelity check ──────────────────────
  // Required disclosure surfaced empirically, not asserted: a CONCURRENT
  // session in this shared checkout (see this repo's own CLAUDE.md and
  // the user's "shared checkout" standing note) patched findSurprise's
  // occupancy() mid-task and left an inline comment disclosing that the
  // redeal null is now provably degenerate — occupancy = count/span is
  // invariant under the null's own construction once count and span are
  // both fixed, so `regular` can never come back true. Verified directly
  // here rather than trusting the comment on its own:
  section("Part 0 — findSurprise/hunt promotion fidelity (disclosed limitation)");
  const perfect = Array.from({ length: 50 }, (_, i) => i + 1);
  const gapped = perfect.filter((x) => x !== 25);
  const r1 = findSurprise(perfect, (x) => x, { draws: 200, seed: 1 });
  const r2 = findSurprise(gapped, (x) => x, { draws: 200, seed: 1 });
  console.log("perfect 1..50            ->", { regular: r1.regular, p: r1.p });
  console.log("1..50 with 25 removed    ->", { regular: r2.regular, p: r2.p });
  console.log(
    r1.regular === false && r2.regular === false && r1.p === 1 && r2.p === 1
      ? "CONFIRMED: both cases return regular:false, p=1.000 — the redeal null is currently degenerate " +
        "(cannot discriminate a perfectly regular set from one with an obvious gap). This is NOT this " +
        "task's own defect — see helix-read.mjs's occupancy() comment for the other session's full account " +
        "— but it means the identity-set side of turn()/settle() below has no working signal yet; only " +
        "hyphenJoinSurprise (Part 1+) is currently a real, discriminating statistic."
      : "UNEXPECTED: findSurprise did not reproduce the disclosed degenerate behavior — re-check the comment in helix-read.mjs."
  );
  const huntResult = await hunt({ position: 25 }, [
    { name: "always-fails", look: async () => ({ settled: false, reason: "test sense" }) },
  ]);
  console.log("hunt() still runs end-to-end (structural check):", huntResult.settled === false && huntResult.tried.length === 1 ? "OK" : "FAIL");

  // ── Part 1: hyphenJoinSurprise against the real magazine specimen ──
  section("Part 1 — hyphenJoinSurprise vs. the real iX magazine OCR (psm3 vs psm6)");
  const psm3Lines = readLines("/tmp/psm3.txt");
  const psm6Lines = readLines("/tmp/psm6.txt");
  console.log(`psm3.txt: ${psm3Lines.length} lines; psm6.txt: ${psm6Lines.length} lines`);

  console.log("\nDefault isWord (english wordlist — expected to be nearly useless on German text):");
  const rEnglishPsm3 = hyphenJoinSurprise(psm3Lines, { draws: 200, seed: 1, isWord: defaultIsWord });
  console.log({ total: rEnglishPsm3.total, resolved: rEnglishPsm3.resolved, p: rEnglishPsm3.p, clearsNull: rEnglishPsm3.clearsNull, wordCheck: rEnglishPsm3.wordCheck });

  console.log("\nReal German dictionary (hunspell -d de_DE, bundled with Adobe Acrobat DC on this machine):");
  console.log("(warming the dictionary over every candidate join — this is the slow, one-time real cost; ~minutes, not faked)");
  const isWord = makeHunspellIsWord(DICT_BASE);

  const t3a = Date.now();
  const rPsm3 = hyphenJoinSurprise(psm3Lines, { draws: 200, seed: 1, isWord });
  console.log(`psm3 (column-aware read) — ${((Date.now() - t3a) / 1000).toFixed(1)}s`);
  console.log({ total: rPsm3.total, resolved: rPsm3.resolved, p: rPsm3.p, clearsNull: rPsm3.clearsNull, wordCheck: rPsm3.wordCheck });
  console.log("resolved joins:", rPsm3.resolvedJoins.map((j) => j.joined).join(", "));

  const t6a = Date.now();
  const rPsm6 = hyphenJoinSurprise(psm6Lines, { draws: 200, seed: 1, isWord });
  console.log(`\npsm6 (linear/interleaved read) — ${((Date.now() - t6a) / 1000).toFixed(1)}s`);
  console.log({ total: rPsm6.total, resolved: rPsm6.resolved, p: rPsm6.p, clearsNull: rPsm6.clearsNull, wordCheck: rPsm6.wordCheck });
  console.log("resolved joins:", rPsm6.resolvedJoins.map((j) => j.joined).join(", ") || "(none)");

  console.log(
    `\nVALIDATED-NUMBER CHECK — target was 6/28 resolved, p≈0.005 (psm3) vs 0/8 resolved, p≈1.000 (psm6).\n` +
    `Got ${rPsm3.resolved}/${rPsm3.total} resolved, p=${rPsm3.p.toFixed(3)} (psm3) vs ${rPsm6.resolved}/${rPsm6.total} resolved, p=${rPsm6.p.toFixed(3)} (psm6).\n` +
    (rPsm3.clearsNull && !rPsm6.clearsNull
      ? "QUALITATIVE RESULT REPRODUCED: psm3 clearly beats its own null, psm6 does not."
      : "QUALITATIVE RESULT NOT REPRODUCED — investigate before trusting this statistic.")
  );

  // ── Part 2: turn() concedes a genuine regression ────────────────────
  section("Part 2 — turn() concedes a turn that measurably makes the reading worse");
  function seededShuffle(arr, seed) {
    let a = seed >>> 0;
    const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  const goodGround = {
    kind: "hyphen-lines", lines: psm3Lines,
    surpriseOpts: { draws: 200, seed: 1, isWord },
    shape: { statistic: "hyphenJoin", columns: 3, priorClearsNull: true },
    sourceLabel: "img_magazine.png @ psm3",
  };
  const corruptingSense = {
    name: "corrupt-shuffle", grain: "page",
    apply: async (g) => ({ ...g, lines: seededShuffle(g.lines, 77), sourceLabel: "img_magazine.png @ psm3, lines shuffled (deliberately bad escalation)" }),
  };
  const turnResult = await turn(goodGround, [corruptingSense], {});
  console.log("before:", { clearsNull: turnResult.before.clearsNull, p: turnResult.before.p, unresolved: turnResult.before.unresolved });
  console.log("after: ", { clearsNull: turnResult.after.clearsNull, p: turnResult.after.p, unresolved: turnResult.after.unresolved });
  console.log("conceded:", turnResult.conceded, "-", turnResult.reason);
  console.log(
    turnResult.conceded && turnResult.ground.lines === goodGround.lines
      ? "CONFIRMED: turn reverted — ground.lines is still the original (pre-corruption) array, not the shuffled one."
      : "UNEXPECTED: turn did not revert as expected."
  );
  console.log("failedAttempts recorded on the reverted ground:", turnResult.ground.failedAttempts?.length ?? 0);

  // ── Part 3: settle() escalates bad -> good, with measured termination ──
  section("Part 3 — settle() end-to-end: psm6 (bad) escalates to psm3 (good), then stops on measured stagnation");
  const badGround = {
    kind: "hyphen-lines", lines: psm6Lines,
    surpriseOpts: { draws: 200, seed: 1, isWord },
    shape: { statistic: "hyphenJoin", columns: null, priorClearsNull: false },
    sourceLabel: "img_magazine.png @ psm6 (initial, uncorrected read)",
  };
  const rereadPsm3 = {
    name: "reread-psm3", grain: "page",
    apply: async (g) => ({
      ...g, lines: psm3Lines,
      shape: { ...g.shape, columns: 3, priorClearsNull: true },
      sourceLabel: "img_magazine.png @ psm3 (tesseract column-aware layout read)",
    }),
  };
  const emptyLibrary = { _disclosure: "test-scoped, in-memory", shapes: [] };
  const settleResult = await settle(badGround, [rereadPsm3], { library: emptyLibrary, maxTurns: 8 });
  console.log(`settle() ran ${settleResult.turns} turn(s); stoppedBy: ${settleResult.stoppedBy}`);
  for (const t of settleResult.trace) {
    if (t.turn === 0) { console.log(`  turn 0 (initial): clearsNull=${t.measured.clearsNull} p=${t.measured.p?.toFixed?.(3)}`); continue; }
    console.log(`  turn ${t.turn}: sense=${t.sense} viaLibrary=${t.viaLibrary} conceded=${t.conceded} improved=${t.improved} — ${t.reason}`);
  }
  console.log("final ground clearsNull:", settleResult.finalMeasure.clearsNull, "p:", settleResult.finalMeasure.p);
  console.log("library grew to", settleResult.library.shapes.length, "shape(s) during this settle() run");

  // ── Part 4: persist the library, then prove a matching-shape future ──
  // reading skips straight to the known-good sense — the actual mechanism
  // the user asked for ("we don't need to do computer vision this time").
  section("Part 4 — library persistence + a future matching-shape reading skips the wrong/expensive sense");
  saveLibrary(LIBRARY_PATH, settleResult.library);
  console.log(`wrote ${settleResult.library.shapes.length} shape(s) to ${LIBRARY_PATH}`);
  const reloaded = loadLibrary(LIBRARY_PATH);
  console.log("reloaded from disk:", reloaded.shapes.length, "shape(s) — round-trip OK:", reloaded.shapes.length === settleResult.library.shapes.length);

  let expensiveCvCalls = 0;
  const expensiveCv = {
    name: "expensive-cv", grain: "page",
    apply: async (g) => { expensiveCvCalls += 1; return { ...g }; },
  };
  const freshBadGround = {
    kind: "hyphen-lines", lines: psm6Lines,
    surpriseOpts: { draws: 200, seed: 1, isWord },
    shape: { statistic: "hyphenJoin", columns: null, priorClearsNull: false }, // SAME shape as badGround above
    sourceLabel: "a different page, same observable shape (simulated future reading)",
  };
  const hit = consultLibrary(reloaded, freshBadGround.shape);
  console.log("library has a matching shape for this fresh ground:", !!hit, hit ? `-> resolved previously by "${hit.resolvedBy.sense}"` : "");
  const skippedResult = await turn(freshBadGround, [expensiveCv, rereadPsm3], { library: reloaded });
  console.log("turn() result: sense=", skippedResult.sense, "viaLibrary=", skippedResult.viaLibrary, "conceded=", skippedResult.conceded);
  console.log("expensive-cv sense invocation count:", expensiveCvCalls);
  console.log(
    skippedResult.viaLibrary && skippedResult.sense === "reread-psm3" && expensiveCvCalls === 0
      ? "CONFIRMED: the library hit sent this turn straight to the known-good sense and the expensive/wrong " +
        "sense (expensive-cv) was never invoked — this is the actual 'don't need to do computer vision this " +
        "time' mechanism the library exists for."
      : "UNEXPECTED: library did not short-circuit as intended — investigate."
  );

  section("Done.");
}

main().catch((err) => { console.error(err); process.exit(1); });
