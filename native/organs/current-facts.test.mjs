// current-facts.test.mjs — the witness store: kinds, dated links, trails,
// refresh, persistence. Real organ, no stand-ins (Wilson over Ranke).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createCurrentFactsStore, extractHolder, termFromRecord } from "./current-facts.js";
import { TERM_KIND, TERM_PARAMETER } from "../kernel/hyperlexicon-routes.js";

const NOW = () => new Date("2026-09-19T12:00:00Z");
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "er7-facts-")), "current-facts.json");

test("extractHolder: the holder a ground's own bytes name, by grammar alone", () => {
  assert.equal(extractHolder("Donald Trump is the 47th President of the United States", "president"), "Donald Trump");
  assert.equal(extractHolder("The president is Donald Trump.", "president"), "Donald Trump");
  assert.equal(extractHolder("Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", "president"), "Donald Trump");
  assert.equal(extractHolder("The mayor is Linda Gordo.", "mayor"), "Linda Gordo");
  assert.equal(extractHolder("The weather is fine.", "president"), null, "no holder named -> the honest absence");
  assert.equal(extractHolder("", "president"), null);
});

test("termFromRecord: the term a dated record names", () => {
  assert.deepEqual(termFromRecord("since 2025-01-20, term ending 2029-01-20"), { since: "2025-01-20", until: "2029-01-20" });
  assert.deepEqual(termFromRecord("nothing dated here"), { since: null, until: null });
});

test("a dated record makes the role a KIND OF THING THAT HAS TERMS, and the link carries the term", () => {
  const store = createCurrentFactsStore({ now: NOW });
  const link = store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:Q11696#P1308" });
  assert.ok(link);
  const kind = store.kindFor("president");
  assert.equal(kind.id, "kind:role:president");
  assert.equal(kind.jurisdiction, "United States");
  assert.ok(kind.parameters.includes(TERM_PARAMETER), "the kind carries the has-term parameter");
  assert.ok(kind.memberOf.includes(TERM_KIND), "the kind belongs to the meta-kind of things that have terms");
  assert.equal(link.holder, "Donald Trump");
  assert.equal(link.since, "2025-01-20");
  assert.equal(link.until, "2029-01-20");
});

test("resolve: the route is stigmergic — exact-kind hop, and the trail is deposited in the environment", () => {
  const store = createCurrentFactsStore({ now: NOW });
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:Q11696#P1308" });
  const hit = store.resolve("who is the president?", { rng: () => 1 });
  assert.equal(hit.route, "exact-kind");
  assert.equal(hit.kind.label, "president");
  assert.equal(hit.link.holder, "Donald Trump");
  const trails = store.trails();
  assert.equal(trails.president.length, 1);
  assert.equal(trails.president[0].route, "exact-kind");
  assert.equal(trails.president[0].ok, true);
  const miss = store.resolve("who is the mayor?", { rng: () => 1 });
  assert.equal(miss.ok, false);
  assert.equal(store.trails().mayor.length, 1);
  assert.equal(store.trails().mayor[0].ok, false, "a failed hop deposits its failure");
});

test("aliases are learned from questions that resolve, never invented — an admission names its giver", () => {
  const store = createCurrentFactsStore({ now: NOW });
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President, since 2025-01-20.", ref: "wikidata:Q11696#P1308" });
  assert.equal(store.resolve("who is POTUS?", { rng: () => 1 }).ok, false, "POTUS is not known yet");
  assert.equal(store.aliasTo("POTUS", "president").refused, true, "a witness-less admission is refused — every prior names its giver");
  store.aliasTo("POTUS", "president", { witness: "learner@test", because: "an ask resolved to this kind" });
  const hit = store.resolve("who is POTUS?", { rng: () => 1 });
  assert.equal(hit.route, "alias");
  assert.equal(hit.link.holder, "Donald Trump");
  const note = store.aliasNotes()[0];
  assert.equal(note.subject, "POTUS");
  assert.equal(note.object, "kind:role:president", "the note binds the surface to the REFERENT id");
  assert.equal(note.witness, "learner@test");
});

test("markVetoed: the alarm trail demotes the kind's links, the honest suspension, not deletion", () => {
  const store = createCurrentFactsStore({ now: NOW });
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President, since 2025-01-20.", ref: "wikidata:Q11696#P1308" });
  assert.equal(store.resolve("who is the president?", { rng: () => 1 }).ok, true);
  store.markVetoed("president");
  assert.equal(store.resolve("who is the president?", { rng: () => 1 }).ok, false, "a vetoed link is demoted while the alarm is fresh");
  assert.equal(store.links()[0].vetoedAt, "2026-09-19");
  assert.ok(store.trails().president.some((t) => t.route === "veto"), "the veto is an alarm deposit");
});

test("refreshStale: stale links are re-checked through the live doors and the outcome is deposited", async () => {
  const store = createCurrentFactsStore({ now: NOW });
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20.", ref: "wikidata:Q11696#P1308" });
  // make it stale: an expired term no longer covers now, and the door's
  // refresh date is long past
  const links = store.links();
  store.upsertLink({ ...links[0], at: "2020-01-01", until: "2020-06-01" });
  let calls = 0;
  const datedLookup = async ({ role, jurisdiction }) => { calls += 1; return { found: true, text: "Wikidata lists Kamala Harris as the current President of the United States, since 2029-01-20, term ending 2033-01-20.", ref: "wikidata:Q11696#P1308" }; };
  const out = await store.refreshStale({ ttlDays: 30, datedLookup, searchFn: null });
  assert.equal(out.checked, 1);
  assert.equal(out.changed, 1);
  assert.equal(calls, 1, "a kind with a jurisdiction refreshes through the dated record door");
  assert.equal(store.resolve("who is the president?", { rng: () => 1 }).link.holder, "Kamala Harris");
});

test("persistence: the environment survives a restart — kinds, links, trails, terms", () => {
  const file = tmpFile();
  const a = createCurrentFactsStore({ file, now: NOW });
  a.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:Q11696#P1308" });
  a.resolve("who is the president?", { rng: () => 1 });
  a.save();
  const b = createCurrentFactsStore({ file, now: NOW });
  assert.equal(b.resolve("who is the president?", { rng: () => 1 }).link.holder, "Donald Trump");
  const kind = b.kindFor("president");
  assert.ok(kind.parameters.includes(TERM_PARAMETER));
  assert.ok(b.trails().president.length >= 1, "trails persist too");
});

test("persistence: per-call disclosures never reach the file — a refused admission is a return value, not a stored row", () => {
  const file = tmpFile();
  const a = createCurrentFactsStore({ file, now: NOW });
  a.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President, since 2025-01-20.", ref: "wikidata:Q11696#P1308" });
  const k = a.upsertKind({ label: "president", aliases: ["POTUS"] });
  assert.equal(k.refusedAliases.length, 1, "the refusal is on the RETURN VALUE");
  a.save();
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(JSON.stringify(raw).includes("refusedAliases"), false, "the environment file never carries a per-call disclosure");
  const b = createCurrentFactsStore({ file, now: NOW });
  assert.deepEqual(b.aliasNotes(), [], "no witness-less admission was silently persisted");
});

test("notes(): the ledger projection — kind memberships and dated holds-office links", () => {
  const store = createCurrentFactsStore({ now: NOW });
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:Q11696#P1308" });
  const { kinds, links } = store.notes();
  assert.equal(kinds.length, 2, "the role membership and the has-term meta-membership");
  assert.equal(links.length, 1);
  assert.equal(links[0].subject, "the president");
  assert.equal(links[0].verb, "holds-office");
  assert.equal(links[0].object, "Donald Trump");
  assert.match(links[0].because, /since 2025-01-20, until 2029-01-20/);
});

test("adoptWebFinding: an undated web finding still earns a kind and a link (current by refresh)", () => {
  const store = createCurrentFactsStore({ now: NOW });
  const link = store.adoptWebFinding({ head: "mayor", groundText: "From a search for \"mayor\":\n1. Linda Gordo is the mayor of Nashville", query: "who is the mayor of Nashville?" });
  assert.equal(link.holder, "Linda Gordo");
  const kind = store.kindFor("mayor");
  assert.equal(kind.jurisdiction, "Nashville");
  assert.ok(!kind.parameters.includes(TERM_PARAMETER), "no dates, no term structure — the honest kind");
  assert.equal(store.resolve("who is the mayor?", { rng: () => 1 }).link.holder, "Linda Gordo");
});

// FOUND LIVE 2026-09-19 (battery): under the /iu flag \p{Lu} matches lowercase, so a search snippet's DEFINITION of an
// office was learned as its holder, and the gate then answered "the president of the United States is the head of
// state and head". A holder is a NAME: its capital is checked on the original bytes.
import { extractHolder as _extractHolder } from "./current-facts.js";
test("a definition of the office is never its holder — the capital is checked on the original bytes", () => {
  const snippet = "The president of the United States is the head of state and head of government of the United States.";
  assert.equal(_extractHolder(snippet, "president"), null, "a common-noun phrase is not a holder");
  assert.equal(_extractHolder("The pope is the head of the Catholic Church.", "pope"), null);
  assert.equal(_extractHolder("The prime minister of the United Kingdom is the principal minister of the Crown.", "prime minister"), null);
  // controls: real holders in the same three shapes still extract
  assert.equal(_extractHolder("Donald Trump is the 47th President of the United States", "president"), "Donald Trump");
  assert.equal(_extractHolder("The president is Donald Trump.", "president"), "Donald Trump");
  assert.equal(_extractHolder("Wikidata lists Andy Burnham as the current Prime Minister of the United Kingdom, since 2026-07-20.", "prime minister"), "Andy Burnham");
  // a rejected candidate does not end the scan: the real name later in the ground is still found
  assert.equal(_extractHolder("The president is the head of state. Donald Trump is the president.", "president"), "Donald Trump");
});
