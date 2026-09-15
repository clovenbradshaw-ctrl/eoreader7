// claims.test.mjs — the claim ledger's walls: one key per claim, latest
// note per aspect standing, projections phrased no stronger than counted,
// listeners fired per key. The measured case that earned the module is
// pinned last: material-unbound and web-corroborated COMPOSE.

import { test } from "node:test";
import assert from "node:assert/strict";

import { claimKey, claimNature, createClaimLedger, composedSentence } from "./claims.js";

test("claimKey: tokens when present, content words of text otherwise — one construction", () => {
  assert.equal(claimKey({ tokens: ["Borodino", "matter", "debate"] }), "borodino matter debate");
  assert.equal(claimKey({ text: "a matter of much debate" }), "matter much debate");
  assert.equal(claimKey({ text: "" }), "");
});

test("notes fold per aspect, latest standing; the record keeps every entry", () => {
  const led = createClaimLedger();
  const claim = { kind: "number", text: "70,000", tokens: ["70000"], sentence: "casualties around 70,000" };
  led.note(claim, "corroboration", { refs: 1, sources: 1 });
  led.note(claim, "web", { verdict: "web-uncorroborated", consulted: 3 });
  led.note(claim, "web", { verdict: "web-corroborated", consulted: 3, stating: [{}, {}], independence: { hosts: 2 } });
  const s = led.state(claimKey(claim));
  assert.equal(s.web.verdict, "web-corroborated", "the latest whole-check result stands");
  assert.equal(led.entries().length, 3, "but every note stays on the record");
});

test("subscribe fires on each note for that key alone", () => {
  const led = createClaimLedger();
  const seen = [];
  led.subscribe("70000", (s) => seen.push(s.web?.verdict ?? "none"));
  led.note({ tokens: ["70000"] }, "web", { verdict: "web-corroborated", consulted: 3, stating: [{}], independence: { hosts: 1 } });
  led.note({ tokens: ["kutuzov"] }, "web", { verdict: "web-uncorroborated", consulted: 2 });
  assert.deepEqual(seen, ["web-corroborated"], "the other claim's note stays silent here");
});

test("composedSentence: the measured case — unbound AND web-backed, both said, neither inflated", () => {
  const led = createClaimLedger();
  // A world claim: the material's silence and the web's count compose as-is.
  const claim = { kind: "edge", text: "Pierre married Helene", tokens: ["pierre", "married", "helene"] };
  led.note(claim, "material", { verdict: "unbound" });
  led.note(claim, "web", { verdict: "web-corroborated", consulted: 3, stating: [{}, {}], independence: { hosts: 2 } });
  const line = composedSentence(led.state(claimKey(claim)));
  assert.equal(line, "your material never says this · the web states it: 2 of 3 page(s) (2 site(s))");
});

test("composedSentence: absent tiers say nothing; a gap is not a zero", () => {
  const led = createClaimLedger();
  const claim = { tokens: ["kutuzov"] };
  led.note(claim, "corroboration", { refs: 1, sources: 1 });
  assert.equal(composedSentence(led.state("kutuzov")), "backed by one source in your material");
  led.note(claim, "web", { verdict: "not-consulted", gap: { silence: "not-present" } });
  assert.match(composedSentence(led.state("kutuzov")), /the web was not reached/);
});

test("composedSentence: the primary tier phrases counted sources, never the raw verdict word", () => {
  const led = createClaimLedger();
  const claim = { tokens: ["borodino"] };
  // rankPrimary ranks every citation class, "other" included (a tertiary
  // essay site is a real candidate per primary.test.mjs) — the projection
  // must not read "a primary source states it" for a class that was never
  // checked, only the counted form CLAUDE.md's grounding ladder names.
  led.note(claim, "primary", { verdict: "stated-by-primary", read: 3, stating: 1 });
  assert.equal(composedSentence(led.state("borodino")), "stated by 1 of 3 source(s) the article cites");
  led.note(claim, "primary", { verdict: "unstated-by-consulted", read: 2, stating: 0 });
  assert.equal(composedSentence(led.state("borodino")), "2 source(s) the article cites were read; none states it");
});

test("nature: a discourse claim is typed and its material verdict re-scoped in the projection", () => {
  assert.equal(claimNature({ text: "a matter of much debate" }), "about-the-discourse");
  assert.equal(claimNature({ text: "Napoleon led the French" }), "about-the-world");
  const led = createClaimLedger();
  const claim = { kind: "edge", text: "a matter of much debate", tokens: ["matter", "much", "debate"] };
  led.note(claim, "material", { verdict: "unbound" });
  const line = composedSentence(led.state(claimKey(claim)));
  assert.match(line, /one document can't settle it/);
  assert.ok(!line.includes("never says this"), "the category error stays fixed");
});

test("revision is a first-class event with its from→to kept", () => {
  const led = createClaimLedger();
  const claim = { tokens: ["70000"] };
  led.note(claim, "web", { verdict: "web-uncorroborated", consulted: 3 });
  led.note(claim, "web", { verdict: "web-corroborated", consulted: 6, stating: [{}, {}], independence: { hosts: 2 } });
  const s = led.state("70000");
  assert.deepEqual(s.revisions, [{ aspect: "web", from: "web-uncorroborated", to: "web-corroborated" }]);
  assert.ok(led.entries().some((e) => e.revised?.from === "web-uncorroborated"));
});
