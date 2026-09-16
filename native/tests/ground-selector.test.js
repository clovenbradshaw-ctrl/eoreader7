import test from "node:test";
import assert from "node:assert/strict";
import { groundSelector, GROUND_CRITERIA } from "../the-fold/ground-selector.js";

const OPTS = { draws: 199, seed: 20260812, alpha: 0.05 };
const j = (s) => s.join(" ");

test("groundSelector: declared draws/seed/alpha are required (II.23)", () => {
  assert.throws(() => groundSelector([{ ref: "a", text: "x" }], {}), /must be declared/);
  assert.throws(() => groundSelector([{ ref: "a", text: "x" }], { draws: 10, seed: 1 }), /alpha/);
});

test("groundSelector: fewer than two records is insufficient, never a fabricated verdict", () => {
  const r = groundSelector([{ ref: "a", text: "one record alone" }], OPTS);
  assert.equal(r.standing, "insufficient");
});

test("groundSelector: four real criteria are exposed for a router to map against", () => {
  assert.deepEqual(GROUND_CRITERIA, ["distinct sources", "independent voices", "what eyes and ears witnessed", "doubt carried forward"]);
});

test("groundSelector: a genuinely first-person account collapses on \"what eyes and ears witnessed\"", () => {
  const survivor = j(["I was standing on the dock when the first explosion threw me off my feet.", "I saw the flames reach the second warehouse within minutes.", "I tried to call out to the night watchman but couldn't find him in the smoke.", "I didn't leave until the crews physically walked me back from the water line."]);
  const officialWire = j(["A warehouse fire near the harbor caused significant damage overnight, officials said.", "The cause remains under investigation pending a structural inspection.", "Local businesses in the area were advised to expect delays through the weekend.", "A public briefing is scheduled for Thursday afternoon."]);
  const officialPort = j(["Harbor operations were suspended following fire damage to warehouse facilities.", "Two berths remain closed pending inspection.", "The port authority has not released a damage estimate.", "A joint statement with the fire marshal is expected by end of week."]);
  const r = groundSelector([
    { ref: "survivor-account.txt", text: survivor },
    { ref: "wire-service.txt", text: officialWire },
    { ref: "port-authority.txt", text: officialPort },
  ], OPTS);
  assert.equal(r.standing, "collapse");
  assert.equal(r.winner, "what eyes and ears witnessed");
});

test("groundSelector: a witness pronoun anywhere in a sentence is detected, not only sentence-initial (falsification #1, fixed)", () => {
  const natural = j(["The explosion knocked me clean off my feet before I even registered the sound.", "Smoke was already thick when I looked up toward the second warehouse.", "My hands were shaking too badly to hold my phone steady.", "Nobody came to help until the crews reached the water line where I was standing."]);
  const wire = j(["A warehouse fire near the harbor caused significant damage overnight, officials said.", "The cause remains under investigation pending a structural inspection.", "Local businesses in the area were advised to expect delays through the weekend.", "A public briefing is scheduled for Thursday afternoon."]);
  const port = j(["Harbor operations were suspended following fire damage to warehouse facilities.", "Two berths remain closed pending inspection.", "The port authority has not released a damage estimate.", "A joint statement with the fire marshal is expected by end of week."]);
  const r = groundSelector([
    { ref: "survivor-natural.txt", text: natural },
    { ref: "wire.txt", text: wire },
    { ref: "port.txt", text: port },
  ], OPTS);
  assert.equal(r.standing, "collapse");
  assert.equal(r.winner, "what eyes and ears witnessed");
});

test("groundSelector: a second, independent witness does not raise the ceiling out of reach (falsification #2, fixed) — the statistic is a SHARE of the total, not a fraction of one record's own sentences", () => {
  const witnessA = j(["I was standing on the dock when the first explosion threw me off my feet.", "I saw the flames reach the second warehouse within minutes.", "I tried to call out to the night watchman but couldn't find him in the smoke.", "I didn't leave until the crews physically walked me back from the water line."]);
  const witnessB = j(["I was walking the dock before 11 and smelled smoke well before the alarm went off.", "I saw sparks near the first warehouse minutes before anyone else reacted.", "I told the night watchman myself, right at the start of it.", "I stayed until the second crew arrived."]);
  const wire = j(["A warehouse fire near the harbor caused significant damage overnight, officials said.", "The cause remains under investigation pending a structural inspection.", "Local businesses in the area were advised to expect delays through the weekend.", "A public briefing is scheduled for Thursday afternoon."]);
  const port = j(["Harbor operations were suspended following fire damage to warehouse facilities.", "Two berths remain closed pending inspection.", "The port authority has not released a damage estimate.", "A joint statement with the fire marshal is expected by end of week."]);
  // Two co-equal witnesses genuinely SHARE the first-person content, so no
  // single record disproportionately stands apart — the observed share
  // must land near 0.5, not collapse toward 0 the way the pre-fix
  // per-record-fraction statistic's null did as evidence accumulated.
  const r = groundSelector([
    { ref: "witness-a.txt", text: witnessA },
    { ref: "witness-b.txt", text: witnessB },
    { ref: "wire.txt", text: wire },
    { ref: "port.txt", text: port },
  ], OPTS);
  const witnessResult = r.results.find((x) => x.id === "what eyes and ears witnessed");
  assert.equal(witnessResult.observed, 0.5);
});

test("groundSelector: unrelated third-person material refuses on every criterion", () => {
  const weather = j(["Skies will be partly cloudy with a light northerly breeze through the afternoon.", "Temperatures should stay in the low sixties through the evening.", "A weak system offshore may bring scattered showers late tonight.", "Conditions are expected to clear again by midday tomorrow."]);
  const sports = j(["The visiting team took an early lead in the second quarter.", "A late rally in the fourth fell just short of tying the game.", "The home side's defense forced three turnovers in the second half.", "Attendance was reported at just under twelve thousand."]);
  const market = j(["Shares closed mixed after a choppy trading session.", "Trading volume was lighter than the weekly average.", "Analysts pointed to caution ahead of next week's data release.", "A handful of small-cap names posted modest gains."]);
  const r = groundSelector([
    { ref: "weather.txt", text: weather },
    { ref: "sports.txt", text: sports },
    { ref: "market.txt", text: market },
  ], OPTS);
  assert.equal(r.standing, "refusal");
});
