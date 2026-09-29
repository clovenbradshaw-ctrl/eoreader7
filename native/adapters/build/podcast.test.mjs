// podcast.test.mjs — against the REAL kernel (task-log.js, cube.js,
// notes.js). Only the mouth is injected, exactly the way every organ in
// this tree injects its network/model crossing and tests the mechanism
// around it for real. The mouths below are deterministic scripts, not
// mocks of the kernel — every append, dispute, settle and concede in these
// tests is the genuine kernel function running against a genuine log.

import test from "node:test";
import assert from "node:assert/strict";
import { makePodcast, segmentTaskId } from "./podcast.js";
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
  async revise() { throw new Error("no conflict should ever need a revision on this mouth"); },
};

test("openEpisode declares the frame (DEF·Ground) before anything is proposed", () => {
  const api = makePodcast();
  const log = api.openEpisode({ topic: "the bridge", voices: ["Ada"], format: "solo" });
  const frame = api.ledger.frameOf(log);
  assert.equal(frame.declared.topic, "the bridge");
  assert.equal(log.entries[0].operator, "DEF");
  assert.equal(log.entries[0].grain, "Ground");
});

test("a proposed segment lands INS·Figure and its claim is heard onto the same ledger", async () => {
  const api = makePodcast();
  const { log, report } = await api.produceEpisode({
    topic: "the bridge", plan: [{ speaker: "Ada", beat: "when it opened" }],
    mouth: AGREEING_MOUTH, maxRepairsPerSegment: 2,
  });
  const seg = log.entries.find((e) => e.task_id === segmentTaskId(0));
  assert.equal(seg.operator, "INS");
  assert.equal(seg.grain, "Figure");
  assert.equal(api.ledger.fold(log).length, 1);
  assert.equal(api.ledger.fold(log)[0].end2, "1937");
  assert.equal(report.openGaps.length, 0);
  assert.deepEqual(checkCubeProgression(log), []);
});

test("a claim with a locatable quote gets a self-verified span (P5.2)", async () => {
  const api = makePodcast();
  const { log } = await api.produceEpisode({
    topic: "the bridge", plan: [{ speaker: "Ada", beat: "when it opened" }],
    mouth: AGREEING_MOUTH, maxRepairsPerSegment: 1,
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
    topic: "t", plan: [{ speaker: "Ada", beat: "b" }], mouth, maxRepairsPerSegment: 1, requireAddressed: true,
  });
  assert.equal(report.segments[0].claims[0].refused.type, "unaddressed");
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
      assert.equal(correction.end2, "1937");
      return { speaker: "Bo", title: "second (corrected)", script: `${priorScript} — correction: it opened in 1937, not 1940.`, claims: [] };
    },
  };
  const { log, report } = await api.produceEpisode({
    topic: "the bridge",
    plan: [{ speaker: "Ada", beat: "opening" }, { speaker: "Bo", beat: "opening, again" }],
    mouth, declaredFunctional: new Set(["opened_in"]), maxRepairsPerSegment: 2,
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
  assert.deepEqual(report.openGaps, []);
  assert.deepEqual(checkCubeProgression(log), []);
});

test("when the new claim wins arbitration, the RIVAL (the established note) is conceded instead", async () => {
  const api = makePodcast();
  const mouth = {
    async propose({ n }) {
      if (n === 0) return { speaker: "Ada", title: "first", script: "The bridge opened in 1940.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1940", quote: "opened in 1940" }] };
      return { speaker: "Bo", title: "second", script: "Records actually show it opened in 1937.", claims: [{ end1: "the bridge", label: "opened_in", end2: "1937", quote: "opened in 1937" }] };
    },
    async arbitrate() { return "claim"; }, // the newer, corrected claim wins
    async revise() { throw new Error("no revision needed — the new claim won"); },
  };
  const { log, report } = await api.produceEpisode({
    topic: "the bridge",
    plan: [{ speaker: "Ada", beat: "opening" }, { speaker: "Bo", beat: "correction" }],
    mouth, declaredFunctional: new Set(["opened_in"]), maxRepairsPerSegment: 2,
  });
  const standing = api.ledger.foldWithStanding(log);
  assert.equal(standing.length, 1);
  assert.equal(standing[0].end2, "1937");
  assert.equal(report.segments[1].heals[0].outcome, "claim-stands");
  // segment 0 was never re-landed — the FACT was withdrawn (REC on the
  // note), not the segment's own script silently rewritten.
  assert.equal(log.entries.filter((e) => e.task_id === segmentTaskId(0)).length, 1);
});

test("the repair budget is bounded — a mouth that always conflicts stops healing after maxRepairsPerSegment rather than spinning", async () => {
  const api = makePodcast();
  let arbitrations = 0;
  const mouth = {
    async propose({ n }) {
      // segment 0 seeds the fact; every later segment restates it differently.
      return { speaker: "Ada", title: `beat ${n}`, script: `Beat ${n}: the bridge opened in ${1930 + n}.`, claims: [{ end1: "the bridge", label: "opened_in", end2: String(1930 + n), quote: `opened in ${1930 + n}` }] };
    },
    async arbitrate() { arbitrations += 1; return "rival"; },
    async revise({ priorScript }) { return { speaker: "Ada", title: "fixed", script: `${priorScript} (withdrawn)`, claims: [] }; },
  };
  const { report } = await api.produceEpisode({
    topic: "the bridge",
    plan: [{ beat: "0" }, { beat: "1" }, { beat: "2" }, { beat: "3" }],
    mouth, declaredFunctional: new Set(["opened_in"]), maxRepairsPerSegment: 1,
  });
  // segments 1..3 each collide once; the budget is PER SEGMENT (1), so all three heal.
  assert.equal(arbitrations, 3);
  for (const seg of report.segments.slice(1)) assert.equal(seg.heals[0].outcome, "rival-stands");
});

test("the app is a fold at any given cursor: an earlier cursor shows neither a later segment nor a later concession", async () => {
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
    mouth, declaredFunctional: new Set(["opened_in"]), maxRepairsPerSegment: 1,
  });

  const seg1Seq = log.entries.find((e) => e.task_id === segmentTaskId(1)).seq;
  const early = api.renderEpisodeAt(log, seg1Seq - 1);
  assert.equal(early.segments.length, 1, "segment 1 has not been proposed yet at this cursor");
  assert.equal(early.standing.length, 1);
  assert.equal(early.standing[0].end2, "1937");
  assert.deepEqual(early.openDisputes, [], "no dispute has happened yet at this cursor");

  const full = api.renderEpisodeAt(log, undefined);
  assert.equal(full.segments.length, 2);
  assert.equal(full.standing.length, 1, "the 1940 claim is conceded by the final cursor");
  assert.equal(full.standing[0].end2, "1937");
  assert.match(full.segments[1].script, /corrected/);

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
    mouth, declaredFunctional: new Set(), maxRepairsPerSegment: 1,
  });
  assert.equal(api.ledger.fold(log).length, 2, "both colour claims stand — an undeclared relation is never checked");
});
