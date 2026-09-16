// eval/the-fold/ground-attention-controls.mjs — standalone verification of
// ground-attention.js (the new covert attention), same shape as the
// surviving archon-interview-test.mjs pattern: real organs injected, real
// material, checked against real refusal/firing/leak behavior before
// anything touches the live proxy seam.
import { groundAttention, ARCHON_TO_CRITERION_MAP } from "../../the-fold/ground-attention.js";
import { groundSelector } from "../../the-fold/ground-selector.js";
import { matchArchons, ARCHONS } from "../../organs/archon-compendium.js";
import { refuteRelation } from "../../kernel/refutation.js";
import { declareVoid } from "../../the-fold/void-shape.js";
import { cellOf } from "../../kernel/cube.js";
import { CAST, bannedHits } from "../../the-fold/earned-cast.js";

const OPTS = { draws: 199, seed: 20260812, alpha: 0.05 };
const deps = { matchArchons, groundSelector, refuteRelation, declareVoid, cellOf, groundOpts: OPTS };

const officialWire = ["A warehouse fire near the harbor caused significant damage overnight, officials said.", "The cause remains under investigation pending a structural inspection.", "Local businesses in the area were advised to expect delays through the weekend.", "A public briefing is scheduled for Thursday afternoon."];
const officialPort = ["Harbor operations were suspended following fire damage to warehouse facilities.", "Two berths remain closed pending inspection.", "The port authority has not released a damage estimate.", "A joint statement with the fire marshal is expected by end of week."];
const survivor = ["I was standing on the dock when the first explosion threw me off my feet.", "I saw the flames reach the second warehouse within minutes.", "I tried to call out to the night watchman but couldn't find him in the smoke.", "I didn't leave until the crews physically walked me back from the water line."];
const j = (s) => s.join(" ");

const FIRSTHAND_RECORDS = [
  { ref: "survivor-account.txt", text: j(survivor) },
  { ref: "wire-service.txt", text: j(officialWire) },
  { ref: "port-authority.txt", text: j(officialPort) },
];

const weather = ["Skies will be partly cloudy with a light northerly breeze through the afternoon.", "Temperatures should stay in the low sixties through the evening.", "A weak system offshore may bring scattered showers late tonight.", "Conditions are expected to clear again by midday tomorrow."];
const sports = ["The visiting team took an early lead in the second quarter.", "A late rally in the fourth fell just short of tying the game.", "The home side's defense forced three turnovers in the second half.", "Attendance was reported at just under twelve thousand."];
const NOISE_RECORDS = [
  { ref: "weather.txt", text: j(weather) },
  { ref: "sports.txt", text: j(sports) },
];

let failures = 0;
function check(name, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures += 1;
}

// 1. Too little material -> insufficient, never fabricated.
{
  const r = groundAttention({ task: "was there an eyewitness?", records: [{ ref: "a.txt", text: "hi" }] }, deps);
  check("thin material never fires", r.fired === false && r.reason === "insufficient_material");
}

// 2. No archon-relevant topic in the task -> no fire, even with real material.
{
  const r = groundAttention({ task: "what time is it", records: FIRSTHAND_RECORDS }, deps);
  check("topic-irrelevant task never fires", r.fired === false && r.reason === "no_matched_archon_names_a_criterion");
}

// 3. A witness-shaped question over the real firsthand material -> fires,
//    collapsing on "what eyes and ears witnessed", never naming Mozi.
{
  const r = groundAttention({ task: "was there an eyewitness account of the harbor fire?", records: FIRSTHAND_RECORDS }, deps);
  check("firsthand material fires", r.fired === true, JSON.stringify(r.reason ?? r.winner));
  check("fires on the right criterion", r.winner === "what eyes and ears witnessed");
  const admissionCell = r.void?.cells.find((c) => c.field === "admission");
  check("declared void's admission says undetermined (no edges offered), never a silent pass upgraded", /undetermined, not confirmed/.test(admissionCell?.declared ?? ""));
  const leaks = bannedHits(r.text ?? "");
  check("emitted fact carries zero bannedHits leaks", leaks.length === 0, JSON.stringify(leaks));
  const lower = String(r.text ?? "").toLowerCase();
  const archonLeak = ARCHONS.find((a) => lower.includes(a.handle) || lower.includes(a.name.toLowerCase()));
  check("emitted fact names no archon handle or name", !archonLeak, archonLeak?.handle);
  console.log(`  fact: "${r.text}"`);
}

// 4. Noise material, no first-person/independence signal -> refuses cleanly.
{
  const r = groundAttention({ task: "was there an eyewitness account of anything here?", records: NOISE_RECORDS }, deps);
  check("noise material does not fire", r.fired === false);
}

// 5. Nagarjuna does NOT fail things (user correction) — a real, refuting
//    edge set (a two-referent cycle, the one shape a positive-only scan
//    can state) still fires, but the declared void's admission test names
//    the counterexample instead of silently shipping past it.
{
  const cycleEdges = [
    { schema: "EOHyperedge@1", relation: "corroborates", participants: [{ standing: "referent", ref: "a" }, { standing: "referent", ref: "b" }] },
    { schema: "EOHyperedge@1", relation: "corroborates", participants: [{ standing: "referent", ref: "b" }, { standing: "referent", ref: "a" }] },
  ];
  const r = groundAttention({ task: "was there an eyewitness account of the harbor fire?", records: FIRSTHAND_RECORDS, edges: cycleEdges }, deps);
  check("a real refutation still fires — Nagarjuna words the void, never fails the fact", r.fired === true, JSON.stringify(r));
  const admissionCell = r.void?.cells.find((c) => c.field === "admission");
  check("the declared void's admission names the counterexample", /does not stand on its own/.test(admissionCell?.declared ?? "") && /cycle/.test(admissionCell?.declared ?? ""));
}

// 6. The handle table names only archons whose OWN role text is evidentiary.
{
  const ok = Object.keys(ARCHON_TO_CRITERION_MAP).every((h) => ARCHONS.some((a) => a.handle === h));
  check("every mapped handle exists in the real compendium", ok);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
