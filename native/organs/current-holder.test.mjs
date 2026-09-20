// current-holder.test.mjs — the dated ground for "who holds this office?", against Wikidata's REAL response shape.
// The network is faked at the fetch boundary with the shape captured live 2026-09-19 (P1308 on Q11696).
import test from "node:test";
import assert from "node:assert/strict";
import { currentHolder, pickCurrent } from "./current-holder.js";

const stmt = (id, start, end, rank = "normal") => ({ rank, mainsnak: { snaktype: "value", datavalue: { value: { id } } }, qualifiers: { ...(start ? { P580: [{ datavalue: { value: { time: start } } }] } : {}), ...(end ? { P582: [{ datavalue: { value: { time: end } } }] } : {}) } });
const CLAIMS = [stmt("Q6279", "+2021-01-20T00:00:00Z", "+2025-01-20T00:00:00Z"), stmt("Q22686", "+2025-01-20T00:00:00Z", "+2029-01-20T00:00:00Z", "preferred")];

test("the holder is the statement whose interval contains today — including one with a scheduled end date", () => {
  assert.equal(pickCurrent(CLAIMS, new Date("2026-09-19"))?.mainsnak.datavalue.value.id, "Q22686");
  assert.equal(pickCurrent(CLAIMS, new Date("2023-06-01"))?.mainsnak.datavalue.value.id, "Q6279", "control: the same data, asked for a different day, names the other holder");
  assert.equal(pickCurrent(CLAIMS, new Date("2031-01-01")), null, "past every recorded term: no ground, never a guess");
  assert.equal(pickCurrent([{ ...CLAIMS[0], rank: "deprecated" }], new Date("2022-01-01")), null, "a deprecated statement is not ground");
});

function wikidata(searchHits) {
  return async (url) => {
    const u = new URL(url); const a = u.searchParams.get("action");
    const body = a === "wbsearchentities" ? { search: searchHits }
      : u.searchParams.get("ids") === "Q11696" ? { entities: { Q11696: { labels: { en: { value: "President of the United States" } }, claims: { P1308: CLAIMS } } } }
      : { entities: { Q22686: { labels: { en: { value: "Donald Trump" } } } } };
    return { ok: true, status: 200, json: async () => body };
  };
}

test("the position is found by its exact label; a fictional namesake and a near-miss label are not it", async () => {
  const hits = [
    { id: "Q125680992", label: "President of the United States", description: "fictional position in the Grand Theft Auto video game series (HD)" },
    { id: "Q11699", label: "Vice President of the United States", description: "second-highest constitutional office" },
    { id: "Q11696", label: "President of the United States", description: "head of state and head of government of the United States of America" },
  ];
  const r = await currentHolder({ role: "president", jurisdiction: "the United States", fetchImpl: wikidata(hits), now: new Date("2026-09-19") });
  assert.equal(r.found, true);
  assert.equal(r.holder, "Donald Trump");
  assert.equal(r.qid, "Q11696");
  assert.match(r.text, /Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20/);
  const none = await currentHolder({ role: "president", jurisdiction: "the Moon", fetchImpl: wikidata(hits), now: new Date("2026-09-19") });
  assert.equal(none.found, false, "no exact label, no ground");
});

test("it never throws: a dead network is a typed gap", async () => {
  const r = await currentHolder({ role: "president", jurisdiction: "the United States", fetchImpl: async () => { throw new Error("offline"); } });
  assert.deepEqual([r.found, r.why], [false, "offline"]);
  assert.equal((await currentHolder({ role: "", jurisdiction: "x" })).found, false);
});
