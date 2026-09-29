// podcast.test.mjs — against the REAL kernel (task-log.js, cube.js,
// notes.js), the REAL ethos organ (organs/ethos.js, organs/charter.js —
// the same UDHR/Earth-charter family the rest of this tree already
// governs generation with), the REAL logos organ (the-fold/
// revision-spiral.js's own rhetorical appeal cells), and the REAL
// measured-loop DMD stop (kernel/measured-loop.js). Only the mouth is
// injected, exactly the way every organ in this tree injects its network/
// model crossing and tests the mechanism around it for real.

import test from "node:test";
import assert from "node:assert/strict";
import { makePodcast, segmentTaskId, MEASURED_LOOP_VERDICTS } from "./podcast.js";
import { checkCubeProgression } from "../../kernel/task-log.js";

const AGREEING_MOUTH = {
  async propose({ n }) {
    return {
      speaker: "Ada",
      title: `beat ${n}`,
      script: `Segment ${n}: the bridge opened in 1937.`,
      claims: [{ end1: "the bridge", label: "opened_in", end2: "1937", quote: "opened in 1937" }],
    };
  },
  async arbitrate() { throw new Error("no conflict should ever reach arbitration on this mouth"); },
  async revise() { throw new Error("no conflict, ethos issue or logos finding should ever need a revision on this mouth's plain, true, well-formed sentence"); },
};

test("openEpisode requires a valid ethos clearance BEFORE the frame is declared (DEF·Ground) — ethos comes before logos", () => {
  const api = makePodcast();
  const log = api.openEpisode({ topic: "the bridge", voices: ["Ada"], format: "solo" });
  const frame = api.ledger.frameOf(log);
  assert.equal(frame.declared.topic, "the bridge");
  assert.equal(frame.declared.ethos.cleared, true);
  assert.ok(frame.declared.ethos.charterSha256, "the charter's own hash rides the frame — the licence under which this episode was opened is on the record");
  assert.ok(frame.declared.ethos.compendiumCount > 0, "the latent mind rides the clearance");
  assert.equal(log.entries[0].operator, "DEF");
  assert.equal(log.entries[0].grain, "Ground");
});

test("a proposed segment lands INS·Figure and its claim is heard onto the same ledger; no revision is asked for when there is genuinely nothing to fix", async () => {
  const api = makePodcast();
  const { log, report } = await api.produceEpisode({
    topic: "the bridge", plan: [{ speaker: "Ada", beat: "when it opened" }],
    mouth: AGREEING_MOUTH, repairCeiling: 2,
  });
  const seg = log.entries.find((e) => e.task_id === segmentTaskId(0));
  assert.equal(seg.operator, "INS");
  assert.equal(seg.grain, "Figure");
  assert.equal(api.ledger.fold(log).length, 1);
  assert.equal(api.ledger.fold(log)[0].end2, "1937");
  assert.equal(report.openGaps.length, 0);
  assert.equal(report.warnings.length, 0);
  assert.equal(report.segments[0].stop.verdict, MEASURED_LOOP_VERDICTS.RESOLVED, "zero issues on round one resolves the segment's own repair loop immediately");
  assert.deepEqual(checkCubeProgression(log), []);
});

test("a claim with a locatable quote gets a self-verified span (P5.2)", async () => {
  const api = makePodcast();
  const { log } = await api.produceEpisode({
    topic: "the bridge", plan: [{ speaker: "Ada", beat: "when it opened" }],
    mouth: AGREEING_MOUTH, repairCeiling: 1,
  });
  const note = api.ledger.fold(log)[0];
  const [span] = note.spans;
  assert.equal(span.ref, "segment:0");
  // notes.js's own hear() keeps a span's ADDRESS (`at`, "ref#start-end")
  // and drops the raw start/end fields — the opaque P5.2 shape every note
  // on this ledger already carries. Parse it back and re-verify against
  // the segment's own bytes, exactly as a reopener would.
  const [, start, end] = span.at.match(/#(\d+)-(\d+)$/);
  const seg = log.entries.find((e) => e.task_id === "segment:0");
  assert.equal(seg.script.slice(Number(start), Number(end)), "opened in 1937");
});

test("requireAddressed refuses a claim with no locatable quote instead of admitting it unaddressed", async () => {
  const api = makePodcast();
  const mouth = {
    ...AGREEING_MOUTH,
    async propose({ n }) {
      return { speaker: "Ada", title: `beat ${n}`, script: "Segment: no quote for this one.", claims: [{ end1: "x", label: "y", end2: "z" }] };
    },
  };
  const { report } = await api.produceEpisode({
    topic: "t", plan: [{ speaker: "Ada", beat: "b" }], mouth, repairCeiling: 1, requireAddressed: true,
  });
  assert.equal(report.segments[0].heals.length, 0, "a refused, unaddressed claim never even reaches conflict-checking");
});

test("a genuine functional conflict opens a dispute (CON), the mouth arbitrates by SELECTING (never generating) a winner, and the loser is conceded (REC)", async () => {
  const api = makePodcast();
  let asked = 0;
  const mouth = {
    async propose({ n }) {
      if (n === 0) return { speaker: "Ada", title: "first", script: "The bridge opened in 1937.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1937", quote: "opened in 1937" }] };
      return { speaker: "Bo", title: "second", script: "Actually the bridge opened in 1940.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1940", quote: "opened in 1940" }] };
    },
    async arbitrate({ rival, claim }) {
      asked += 1;
      assert.equal(rival.end2, "1937");
      assert.equal(claim.end2, "1940");
      return "rival"; // the established 1937 fact wins; the new claim is wrong
    },
    async revise({ priorScript, correction }) {
      const lostHeal = correction.claimReports.find((c) => c.heal?.outcome === "rival-stands");
      assert.ok(lostHeal, "the revise ask carries what was withdrawn");
      assert.match(lostHeal.heal.rival, /opened_in\|1937$/);
      assert.equal(correction.ethos.verdict === "conflict", false);
      return { speaker: "Bo", title: "second (corrected)", script: `${priorScript} — correction: it opened in 1937, not 1940.`, claims: [] };
    },
  };
  const { log, report } = await api.produceEpisode({
    topic: "the bridge",
    plan: [{ speaker: "Ada", beat: "opening" }, { speaker: "Bo", beat: "opening, again" }],
    mouth, declaredFunctional: new Set(["opened_in"]), repairCeiling: 3,
  });
  assert.equal(asked, 1);
  const standing = api.ledger.foldWithStanding(log);
  assert.equal(standing.length, 1, "the 1940 claim was conceded, not left standing beside the true one");
  assert.equal(standing[0].end2, "1937");
  assert.equal(report.segments[1].heals[0].outcome, "rival-stands");
  // the segment itself was revised (SYN·Figure) after its own claim lost —
  // never a silent edit of the text the mouth already produced (P186).
  const revisions = log.entries.filter((e) => e.task_id === segmentTaskId(1) && e.operator === "SYN");
  assert.equal(revisions.length, 1);
  assert.match(revisions[0].script, /correction: it opened in 1937/);
  assert.equal(report.segments[1].stop.verdict, MEASURED_LOOP_VERDICTS.RESOLVED, "the revised segment made no further claims — zero issues, resolved");
  assert.deepEqual(report.openGaps, []);
  assert.equal(report.warnings.length, 0);
  assert.deepEqual(checkCubeProgression(log), []);
  // the measured stop itself is an EVA·Pattern act, landed on the ledger —
  // "did this loop converge" is a real act, not a bare in-memory decision.
  const stops = log.entries.filter((e) => e.operator === "EVA" && e.grain === "Pattern" && e.segment === segmentTaskId(1));
  assert.equal(stops.length, 1);
  assert.equal(stops[0].measuredVerdict, MEASURED_LOOP_VERDICTS.RESOLVED);
});

test("when the new claim wins arbitration, the RIVAL (the established note) is conceded instead", async () => {
  const api = makePodcast();
  const mouth = {
    async propose({ n }) {
      if (n === 0) return { speaker: "Ada", title: "first", script: "The bridge opened in 1940.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1940", quote: "opened in 1940" }] };
      return { speaker: "Bo", title: "second", script: "Records actually show it opened in 1937.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1937", quote: "opened in 1937" }] };
    },
    async arbitrate() { return "claim"; }, // the newer, corrected claim wins
    async revise() { throw new Error("no revision needed — the new claim won, so segment 1 has zero issues"); },
  };
  const { log, report } = await api.produceEpisode({
    topic: "the bridge",
    plan: [{ speaker: "Ada", beat: "opening" }, { speaker: "Bo", beat: "correction" }],
    mouth, declaredFunctional: new Set(["opened_in"]), repairCeiling: 2,
  });
  const standing = api.ledger.foldWithStanding(log);
  assert.equal(standing.length, 1);
  assert.equal(standing[0].end2, "1937");
  assert.equal(report.segments[1].heals[0].outcome, "claim-stands");
  // segment 0 was never re-landed — the FACT was withdrawn (REC on the
  // note), not the segment's own script silently rewritten.
  assert.equal(log.entries.filter((e) => e.task_id === segmentTaskId(0)).length, 1);
});

// A real, VERIFIED specimen (checked live against the armed charter.js
// GFP adapter, not assumed): a plainly prescriptive sentence that
// genuinely returns `verdict: "conflict"` against this repo's own
// committed priors — near-verbatim against the UDHR fallback excerpt's
// own Article 4 ("slavery and the slave trade shall be prohibited").
const CHARTER_CONFLICT_SCRIPT = "Slavery and the slave trade should be permitted in all their forms.";

test("a charter conflict alone (no factual collision at all) still drives the same repair loop, via the REAL ethos organ", async () => {
  const api = makePodcast();
  let revised = false;
  const mouth = {
    async propose() {
      return {
        speaker: "Ada", title: "a",
        // charterGate is the SAME seam the rest of this tree already
        // governs generation with; this is not a second check invented here.
        script: CHARTER_CONFLICT_SCRIPT,
        claims: [],
      };
    },
    async arbitrate() { throw new Error("no factual conflict exists here"); },
    async revise({ correction }) {
      revised = true;
      assert.equal(correction.ethos.verdict, "conflict", "the revise ask is told exactly what the charter found");
      return { speaker: "Ada", title: "a (revised)", script: "The collective's founding meeting is remembered as a calm evening.", claims: [] };
    },
  };
  const { report } = await api.produceEpisode({
    topic: "the collective", plan: [{ beat: "opening" }], mouth, repairCeiling: 3,
  });
  assert.equal(revised, true);
  assert.equal(report.segments[0].stop.verdict, MEASURED_LOOP_VERDICTS.RESOLVED);
});

test("a real logos finding (Williams' false-tension probe, the-fold/revision-spiral.js) alone drives a revision, with no factual or ethos issue at all", async () => {
  const api = makePodcast();
  let sawLogos = false;
  const mouth = {
    async propose() {
      return {
        speaker: "Ada", title: "a",
        // a real, mechanically-detected false-tension connector — see this
        // file's own header: the-fold/revision-spiral.js's Williams cell.
        script: "Despite the bridge opening in 1937, it is very clearly quite obviously still standing.",
        claims: [],
      };
    },
    async arbitrate() { throw new Error("no factual conflict exists here"); },
    async revise({ correction }) {
      sawLogos = true;
      assert.ok(correction.logos.length > 0, "a real Williams false-tension finding rides the revise ask");
      return { speaker: "Ada", title: "a (revised)", script: "The bridge opened in 1937. It still stands today.", claims: [] };
    },
  };
  const { report } = await api.produceEpisode({ topic: "the bridge", plan: [{ beat: "opening" }], mouth, repairCeiling: 3 });
  assert.equal(sawLogos, true);
  assert.equal(report.segments[0].stop.verdict, MEASURED_LOOP_VERDICTS.RESOLVED);
});

test("loops on loops, bounded by a REAL DMD test: a mouth whose revision never actually changes anything is stopped as CONVERGED (measurably not doing anything), not merely by exhausting a generous ceiling", async () => {
  const api = makePodcast();
  let revisions = 0;
  const mouth = {
    // the same real charter conflict every single time — the mouth never
    // actually fixes what was flagged, so every round's issue count is a
    // flat, unmoving 1.
    async propose() { return { speaker: "Ada", title: "a", script: CHARTER_CONFLICT_SCRIPT, claims: [] }; },
    async arbitrate() { throw new Error("no factual conflict here"); },
    async revise() { revisions += 1; return { speaker: "Ada", title: "a", script: CHARTER_CONFLICT_SCRIPT, claims: [] }; },
  };
  const { report } = await api.produceEpisode({ topic: "t", plan: [{ beat: "0" }], mouth, repairCeiling: 50 });
  const stop = report.segments[0].stop;
  assert.equal(stop.verdict, MEASURED_LOOP_VERDICTS.CONVERGED, "an unmoving issue count is measured as converged, not endlessly retried");
  assert.equal(stop.growth, 0);
  assert.ok(stop.rounds < 50, "caught by the measure long before the 50-round safety ceiling");
  assert.equal(revisions, stop.rounds - 1);
  assert.equal(report.warnings.length, 0, "converged is not a warning — diverging and ceiling are");
});

test("loops on loops: the ceiling is the named safety floor, distinct from a genuine measured convergence — a low ceiling on the SAME unmoving loop stops earlier, and is flagged as never having demonstrably finished", async () => {
  const api = makePodcast();
  const mouth = {
    async propose() { return { speaker: "Ada", title: "a", script: CHARTER_CONFLICT_SCRIPT, claims: [] }; },
    async arbitrate() { throw new Error("no factual conflict here"); },
    async revise() { return { speaker: "Ada", title: "a", script: CHARTER_CONFLICT_SCRIPT, claims: [] }; },
  };
  // dmd-stream.js's own floor needs >= 2 pairs (>= 3 rounds) before it can
  // measure anything at all — a ceiling of 2 forces the safety floor to
  // fire before the DMD test ever gets a chance to read this loop's own
  // (genuinely flat) trajectory.
  const { report } = await api.produceEpisode({ topic: "t", plan: [{ beat: "0" }], mouth, repairCeiling: 2 });
  const stop = report.segments[0].stop;
  assert.equal(stop.verdict, MEASURED_LOOP_VERDICTS.CEILING);
  assert.equal(stop.rounds, 2);
  assert.equal(report.warnings.length, 1);
  assert.match(report.warnings[0].warning, /never demonstrably finished/);
});

test("the app is a fold at any given cursor: an earlier cursor shows neither a later segment nor a later concession, and the measured stop for that segment has not landed yet either", async () => {
  const api = makePodcast();
  const mouth = {
    async propose({ n }) {
      if (n === 0) return { speaker: "Ada", title: "first", script: "The bridge opened in 1937.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1937", quote: "opened in 1937" }] };
      return { speaker: "Bo", title: "second", script: "It opened in 1940.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1940", quote: "opened in 1940" }] };
    },
    async arbitrate() { return "rival"; },
    async revise({ priorScript }) { return { speaker: "Bo", title: "fixed", script: `${priorScript} (corrected)`, claims: [] }; },
  };
  const { log } = await api.produceEpisode({
    topic: "the bridge", plan: [{ beat: "0" }, { beat: "1" }],
    mouth, declaredFunctional: new Set(["opened_in"]), repairCeiling: 3,
  });

  const seg1Seq = log.entries.find((e) => e.task_id === segmentTaskId(1)).seq;
  const early = api.renderEpisodeAt(log, seg1Seq - 1);
  assert.equal(early.segments.length, 1, "segment 1 has not been proposed yet at this cursor");
  assert.equal(early.standing.length, 1);
  assert.equal(early.standing[0].end2, "1937");
  assert.deepEqual(early.openDisputes, [], "no dispute has happened yet at this cursor");
  assert.equal(early.measuredStops.length, 1, "only segment 0's own measured stop has landed by this cursor");

  const full = api.renderEpisodeAt(log, undefined);
  assert.equal(full.segments.length, 2);
  assert.equal(full.standing.length, 1, "the 1940 claim is conceded by the final cursor");
  assert.equal(full.standing[0].end2, "1937");
  assert.match(full.segments[1].script, /corrected/);
  assert.equal(full.measuredStops.length, 2);

  const transcript = api.transcriptOf(full);
  assert.match(transcript, /Ada: The bridge opened in 1937\./);
  assert.match(transcript, /corrected/);
});

test("functionalConflict is declared, never inferred — an undeclared label never flags a collision", async () => {
  const api = makePodcast();
  const mouth = {
    async propose({ n }) {
      if (n === 0) return { speaker: "Ada", title: "a", script: "The bridge is painted red.", claims: [{ end1: "the bridge", label: "colour", end2: "red", quote: "painted red" }] };
      return { speaker: "Bo", title: "b", script: "The bridge is painted blue.", claims: [{ end1: "the bridge", label: "colour", end2: "blue", quote: "painted blue" }] };
    },
    async arbitrate() { throw new Error("colour was never declared functional — this should never be asked"); },
    async revise() { throw new Error("unreachable"); },
  };
  const { log } = await api.produceEpisode({
    topic: "the bridge", plan: [{ beat: "0" }, { beat: "1" }],
    mouth, declaredFunctional: new Set(), repairCeiling: 1,
  });
  assert.equal(api.ledger.fold(log).length, 2, "both colour claims stand — an undeclared relation is never checked");
});

test("every steering prompt is auditable: propose/arbitrate/revise asks land on the SAME ledger verbatim (SIG·Ground), with the exact request/response, reconstructable at any fold cursor", async () => {
  const api = makePodcast();
  const proposeAudit = { request: [{ role: "user", content: "write segment 0 about the bridge" }], rawResponse: '{"title":"first"}', durationMs: 12, model: "test-model" };
  const arbitrateAudit = { request: [{ role: "user", content: "rival says 1937, claim says 1940 — which is right?" }], rawResponse: '{"pick":"rival"}', durationMs: 7, model: "test-model" };
  const reviseAudit = { request: [{ role: "user", content: "your answer was wrong (1940) — the record says 1937, fix it" }], rawResponse: '{"title":"fixed"}', durationMs: 9, model: "test-model" };
  const mouth = {
    async propose({ n }) {
      if (n === 0) return { speaker: "Ada", title: "first", script: "The bridge opened in 1937.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1937", quote: "opened in 1937" }], audit: proposeAudit };
      return { speaker: "Bo", title: "second", script: "It opened in 1940.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1940", quote: "opened in 1940" }], audit: { ...proposeAudit, rawResponse: '{"title":"second"}' } };
    },
    async arbitrate() { return { pick: "rival", audit: arbitrateAudit }; },
    async revise({ priorScript }) { return { speaker: "Bo", title: "fixed", script: `${priorScript} (corrected)`, claims: [], audit: reviseAudit }; },
  };
  const { log } = await api.produceEpisode({
    topic: "the bridge", plan: [{ beat: "0" }, { beat: "1" }],
    mouth, declaredFunctional: new Set(["opened_in"]), repairCeiling: 2,
  });
  const audits = log.entries.filter((e) => typeof e.task_id === "string" && e.task_id.startsWith("audit:"));
  // 2 proposes (segment 0, segment 1) + 1 arbitrate + 1 revise = 4
  assert.equal(audits.length, 4);
  const byKind = Object.fromEntries(["propose", "arbitrate", "revise"].map((k) => [k, audits.filter((a) => a.promptKind === k)]));
  assert.equal(byKind.propose.length, 2);
  assert.equal(byKind.arbitrate.length, 1);
  assert.equal(byKind.revise.length, 1);
  assert.deepEqual(byKind.arbitrate[0].request, arbitrateAudit.request, "the exact steering prompt sent to the mouth is on the record, verbatim");
  assert.equal(byKind.arbitrate[0].rawResponse, arbitrateAudit.rawResponse, "the exact raw response, before any JSON.parse, is on the record");
  assert.equal(byKind.revise[0].request[0].content, "your answer was wrong (1940) — the record says 1937, fix it");
  assert.equal(byKind.revise[0].operator, "SIG");
  assert.equal(byKind.revise[0].grain, "Ground");

  // Reconstructable at any fold cursor, exactly like every other act.
  const beforeRevise = api.renderEpisodeAt(log, byKind.arbitrate[0].seq);
  assert.equal(beforeRevise.mouthAudit.length, 3, "propose x2 + arbitrate, before the revise prompt was ever sent");
  const full = api.renderEpisodeAt(log);
  assert.equal(full.mouthAudit.length, 4);
});
