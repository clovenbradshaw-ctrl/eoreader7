// eval/the-fold/ground-selector-controls.mjs — four control worlds for
// ground-selector.js, rebuilt fresh (the original fixtures were lost along
// with the original script; only grounds-final.log's verdicts survived).
// Verifies the QUALITATIVE verdict pattern the log recorded:
//   A. real disputed material   -> REFUSAL
//   B. planted reprint          -> ambiguous / no clean collapse on "eyes and ears"
//   C. planted firsthand        -> COLLAPSE on "what eyes and ears witnessed"
//   D. pure noise (built to fail) -> REFUSAL
import { groundSelector } from "../../the-fold/ground-selector.js";

const OPTS = { draws: 199, seed: Number(process.env.GS_SEED ?? 20260812), alpha: 0.05 };

// Each world has enough records and enough sentences per record for the
// null (which redraws at this same scale) to have room to show separation
// — a 3-record, 1-sentence-each toy corpus was tried first and every
// criterion refused on every world, including the planted firsthand case,
// because a base rate that high in a pool that small survives almost any
// reshuffle by pure chance. That is an honest, disclosable property of a
// null-tested statistic (small samples lack power), not a bug — but it
// means the control worlds have to be corpus-scale to demonstrate anything.
const council = [
  "The council met on Tuesday and the vote was recorded as six to three.",
  "Minutes were filed with the clerk the same afternoon.",
  "One member requested the tally be read back before adjournment.",
  "The session ran roughly ninety minutes, longer than usual for a routine vote.",
];
const gazette = [
  "Reports from the council session describe a divided vote.",
  "The exact tally printed in the morning edition differs from the clerk's own filing.",
  "A follow-up correction was promised but had not run by press time.",
  "Two council members declined to comment when reached afterward.",
];
const clerkFile = [
  "The filed minutes show six votes in favor and three against.",
  "One member was recorded absent from the roll.",
  "A procedural objection was noted but not sustained.",
  "The minutes were countersigned by the deputy clerk before filing.",
];

const fireWire = "A fire broke out near the harbor warehouses shortly after midnight and spread to two adjacent buildings before crews arrived. Damage estimates were not immediately available. Port traffic was rerouted for the remainder of the night. No injuries were reported among dock workers.";
const firePort = "Harbor operations were suspended for six hours following overnight fire damage to two warehouse structures. A full damage assessment is expected within the week. Insurance adjusters were on site by mid-morning. Normal shipping schedules resumed shortly after noon.";

const survivor = [
  "I was standing on the dock when the first explosion threw me off my feet.",
  "I saw the flames reach the second warehouse within minutes.",
  "I tried to call out to the night watchman but couldn't find him in the smoke.",
  "I didn't leave until the crews physically walked me back from the water line.",
];
const officialWire = [
  "A warehouse fire near the harbor caused significant damage overnight, officials said.",
  "The cause remains under investigation pending a structural inspection.",
  "Local businesses in the area were advised to expect delays through the weekend.",
  "A public briefing is scheduled for Thursday afternoon.",
];
const officialPort = [
  "Harbor operations were suspended following fire damage to warehouse facilities.",
  "Two berths remain closed pending inspection.",
  "The port authority has not released a damage estimate.",
  "A joint statement with the fire marshal is expected by end of week.",
];

const recipe = ["Combine the flour and butter until the mixture resembles coarse crumbs.", "Chill the dough for thirty minutes before rolling it out.", "Bake at 375 degrees until the edges just turn golden.", "Let the tray cool for five minutes before transferring to a rack."];
const weather = ["Skies will be partly cloudy with a light northerly breeze through the afternoon.", "Temperatures should stay in the low sixties through the evening.", "A weak system offshore may bring scattered showers late tonight.", "Conditions are expected to clear again by midday tomorrow."];
const sports = ["The visiting team took an early lead in the second quarter.", "A late rally in the fourth fell just short of tying the game.", "The home side's defense forced three turnovers in the second half.", "Attendance was reported at just under twelve thousand."];
const market = ["Shares closed mixed after a choppy trading session.", "Trading volume was lighter than the weekly average.", "Analysts pointed to caution ahead of next week's data release.", "A handful of small-cap names posted modest gains."];

const j = (s) => s.join(" ");

const WORLDS = {
  "A. real disputed material": [
    { ref: "gazette.txt", text: j(gazette) },
    { ref: "council-record.txt", text: j(council) },
    { ref: "clerk-file.txt", text: j(clerkFile) },
  ],
  "B. planted reprint": [
    { ref: "wire-service.txt", text: fireWire },
    { ref: "morning-paper.txt", text: fireWire },
    { ref: "evening-paper.txt", text: fireWire },
    { ref: "port-authority.txt", text: firePort },
  ],
  "C. planted firsthand": [
    { ref: "survivor-account.txt", text: j(survivor) },
    { ref: "wire-service.txt", text: j(officialWire) },
    { ref: "port-authority.txt", text: j(officialPort) },
  ],
  "D. pure noise (built to fail)": [
    { ref: "recipe.txt", text: j(recipe) },
    { ref: "weather.txt", text: j(weather) },
    { ref: "sports.txt", text: j(sports) },
    { ref: "market.txt", text: j(market) },
  ],
};

console.log("GROUND SELECTOR — control worlds");
console.log(`draws ${OPTS.draws}, alpha ${OPTS.alpha}, seed ${OPTS.seed}\n`);

for (const [name, records] of Object.entries(WORLDS)) {
  const result = groundSelector(records, OPTS);
  console.log(name);
  for (const r of result.results ?? []) {
    console.log(`  ${r.id.padEnd(30)} observed ${String(r.observed).padStart(6)}  ceiling ${r.ceiling.toFixed(3).padStart(7)}  sep ${r.separation.toFixed(3)}  ${r.clears ? "CLEARS" : ""}`);
  }
  console.log(`  -> ${result.standing.toUpperCase()}${result.winner ? ": " + result.winner : ""}${result.winners ? ": " + result.winners.join(" / ") : ""}${result.reason ? " — " + result.reason : ""}`);
  console.log();
}
