// A request to MAKE something (a page, a forum, a tracker) needs nothing from
// the web: an empty search is a fact about the world, not about the ask.
// Falsified 2026-09-27 (build battery, 1.5b): every page request the web
// search came back empty for — book club, food bank, lost pets, route 12,
// bike forum, reading log — was routed to the "void" disclosure, and the
// product shipped no artifact (0/36 checks) where the bare model scored 28/36.
// A question the web could not answer still gets the void disclosure.
import { test } from "node:test";
import assert from "node:assert";

const { detectAnswerShape } = await import("../../proxy-runner.mjs");

test("a making request stays a composition when the web search came back empty", () => {
  for (const task of [
    "I need a page where my book club can see what we're reading this month and vote on next month's book",
    "make a page with the weekday bus schedule for route 12",
    "a forum for people who restore old bicycles",
    "build a tracker where I log the minutes I read each day and see my weekly total",
  ]) {
    const shape = detectAnswerShape(task, false, true, true, [], null);
    assert.equal(shape.shape, "composition", task);
  }
});

test("a question the web could not answer is still disclosed as void", () => {
  const shape = detectAnswerShape("who won the regional chess open in Tarvin last spring", false, true, true, [], null);
  assert.equal(shape.shape, "void");
});
