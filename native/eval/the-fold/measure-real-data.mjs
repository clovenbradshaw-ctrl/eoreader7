// eval/measure-real-data.mjs — the measuring door against real published data.
//
// The conformance suite (measure.test.mjs) pins what the door refuses. This
// runs it on material nobody made up, to check the other half: that a real
// question, declared honestly, comes out the far side as a sentence a person
// could defend — or as a refusal they could act on.
//
// THE MATERIAL. `fixtures/santa-ana-flight-hours.csv` is the local-hour
// histogram of 1,021 Santa Ana PD drone flights, taken from the published
// aggregate in dfr-causal-analysis (`profiles/profile-santa-ana.json`,
// `schedule.hour_hist_local`, 65.6-day span). Twenty-four integers summing to
// 1,021, copied here rather than read across repos ON PURPOSE: that repo's own
// paper lists "several validation scripts read inputs by absolute path from
// directories outside the repository — those runs cannot be reproduced by a
// third party" among its limitations, and an eval that reached over there
// would inherit exactly that defect while criticising it.
//
// THE DECLARATIONS, AND WHY EACH NUMBER IS WHAT IT IS. Every one of these was
// fixed BEFORE the run and none was revisited after seeing an output — the
// eoreader6 rule ("never tune a parameter by checking what it does to a
// golden's own score") applies to a number that shapes a measurement just as
// hard as to one that shapes a reading:
//
//   as: burstiness      the largest windowed mean — "is the activity
//                       concentrated in some stretch" is the question, and
//                       this is the statistic for it.
//   broken: shuffle     keeps every count, destroys which HOUR each count
//                       landed on. That is precisely the null the question
//                       needs, and burstiness/shuffle is an established
//                       pairing in the engine's own table.
//   window: 8           one third of a 24-hour day — a patrol shift, the unit
//                       police scheduling is actually organized by. A unit of
//                       the world the material came from, not a value that
//                       scored well.
//   draws: 200          this repo's own standing declaration for a null arm
//                       (read-frankenstein's number, already what reflex.js's
//                       surprise meter uses). Giver named, nothing new chosen.
//   seed: 0             a run nobody can repeat is not a measurement.
//
// Run: node eval/measure-real-data.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import * as nul from "../../eoreader6/nul/index.js";
import { bindLinks } from "../../eoreader6/packages/engine/emergence/binding.js";
import { delimitedRows } from "../tables.js";
import { parseMeasure, phrase, runMeasurement } from "../measure.js";

const here = dirname(fileURLToPath(import.meta.url));
const table = delimitedRows(readFileSync(join(here, "fixtures", "santa-ana-flight-hours.csv"), "utf8"));

/** Drive a declaration through the same router app.js's measureTurn uses. */
function run(line) {
  const parsed = parseMeasure(line);
  if (!parsed?.decl) return `  ${phrase(parsed ?? { refused: { type: "not_a_measurement", detail: line } })}`;
  return `  ${phrase(runMeasurement(parsed.decl, table, { nul, bindLinks }))}`;
}

const CASES = [
  [
    "the question, declared",
    "/measure santa-ana-flight-hours.csv series:flights as:burstiness broken:shuffle draws:200 window:8",
  ],
  [
    "the same question with no nothing behind it — what the two null-free scripts in that repo do",
    "/measure santa-ana-flight-hours.csv series:flights as:burstiness draws:200 window:8",
  ],
  [
    "an unestablished pairing",
    "/measure santa-ana-flight-hours.csv series:flights as:burstiness broken:phase draws:200 window:8",
  ],
  [
    "the same pairing declared as a trial instead",
    "/measure santa-ana-flight-hours.csv series:flights trying:burstiness broken:phase draws:200 window:8",
  ],
  [
    "the resolution complaint from that paper's own limitations, made unsayable",
    "/measure santa-ana-flight-hours.csv series:flights as:burstiness broken:shuffle draws:12 window:8",
  ],
  [
    "every numeric column at once, without saying which tail",
    "/measure santa-ana-flight-hours.csv across:all as:burstiness broken:shuffle draws:200 window:8",
  ],
  [
    "the same, with the tail declared",
    "/measure santa-ana-flight-hours.csv across:all as:burstiness broken:shuffle draws:200 window:8 direction:above",
  ],
];

console.log(`\n1,021 Santa Ana PD drone flights by local hour · ${table.rows.length} rows · ${table.head.join(", ")}\n`);
for (const [why, line] of CASES) {
  console.log(`${why}\n  $ ${line}`);
  console.log(run(line));
  console.log();
}
