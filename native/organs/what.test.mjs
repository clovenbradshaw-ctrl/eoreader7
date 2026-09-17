// organs/what.test.mjs — the what organ (Cuvier): reconstructing what a giant
// code hunk IS from its own structural bytes. Pins the organ's contract: the
// account is byte-supported (it names what the material declares, never a
// product the bytes do not state), it composes codeGist with dmdCut injected,
// and it refuses typed rather than guessing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { whatIsThis, REFUSALS, CELL } from "./what.js";
import { findCapacity } from "./capacities.js";
import { dmdCut } from "../the-fold/resolutions.js";

const MINI_BUNDLE = [
  'const __vite__mapDeps=(i,m,d)=(m.f||(m.f=["assets/AppMain-ABC12345.js","assets/react-vendor-abc12345.js","assets/antd-vendor-abc12345.js","assets/LicenseStatus-abc12345.js","assets/Login-abc12345.js","assets/Admin-abc12345.js","assets/index-abc12345.css"]))=>i.map(i=>d[i]);',
  'import{c as requireReact}from"./react-vendor-abc12345.js";',
  '/*! someapp v3.2.1 | (c) 2026 Example Org | MIT License */',
  'export const SURVEY_ENDPOINT = "/api/v1/surveys/submissions";',
  'function LicenseStatus(){ return "/api/license/status"; }',
  'function Admin(){ return "Admin Dashboard"; }',
].join("\n");

const PROSE = "It was the best of times, it was the worst of times.";

test("whatIsThis: cell is DEF at Figure grain (the Lens terrain it shares with interlocutor/priors)", () => {
  assert.deepEqual(CELL, { op: "DEF", grain: "Figure" });
});

test("capacities: the `what` row is registered, domain-legal, and resolves to this organ", () => {
  const cap = findCapacity("what");
  assert.ok(cap, "the what capacity must be registered");
  assert.equal(cap.fn, "whatIsThis");
  assert.equal(cap.op, "DEF");
  // DEF is Differentiate·Interpretation; at Figure grain its terrain is Lens
  // (TERRAIN_BY_DOMAIN, kernel/cube.js) — the same hand-check the table's own
  // header demands of every row.
  assert.equal(cap.terrain, "Lens");
});

test("whatIsThis: the account names only what the bytes declare", () => {
  const r = whatIsThis({ text: MINI_BUNDLE, fileName: "mini.js", dmdCut });
  assert.equal(r.schema, "WhatIsThis@1");
  assert.equal(r.fileName, "mini.js");
  const accountText = r.account.map((l) => l.text).join("\n");
  // the vendor stack the bytes support
  assert.match(accountText, /Vite/);
  assert.match(accountText, /React/);
  assert.match(accountText, /Ant Design/);
  // the module map's own feature modules
  assert.match(accountText, /feature modules/);
  assert.match(accountText, /LicenseStatus/);
  // the endpoint literals
  assert.match(accountText, /\/api\/v1\/surveys\/submissions/);
  // the declaration banner, verbatim
  assert.match(accountText, /someapp v3\.2\.1/);
  // what the bytes do NOT support must not be named as a claim — "Example Org"
  // appears only inside the quoted banner, never as a standalone assertion
  const bannerLine = r.account.find((l) => l.claim === "banner");
  assert.ok(bannerLine, "a banner claim must be present");
  assert.equal(r.account.some((l) => l.claim !== "banner" && /Example Org/.test(l.text)), false);
});

test("whatIsThis: every claim carries byte-anchored evidence", () => {
  const r = whatIsThis({ text: MINI_BUNDLE, fileName: "mini.js", dmdCut });
  assert.ok(r.evidence.length >= 1);
  for (const e of r.evidence) {
    assert.ok(e.claim && e.basis && e.basis.length > 0);
  }
  const platform = r.evidence.find((e) => e.claim === "platform");
  assert.match(platform.basis, /module map/);
  const banner = r.evidence.find((e) => e.claim === "banner");
  assert.equal(typeof banner.offsets[0], "number");
  assert.ok(MINI_BUNDLE.slice(banner.offsets[0]).startsWith("/*! someapp"));
});

test("whatIsThis: a giant hunk is scanned within a declared window, every skip disclosed", () => {
  const giant = MINI_BUNDLE + "\n" + Array.from({ length: 300_000 }, () => "z").join("");
  const r = whatIsThis({ text: giant, fileName: "giant.js", dmdCut, maxScanChars: 8_000 });
  assert.equal(r.scan.scannedChars, 8_000);
  assert.equal(r.scan.skippedChars, giant.length - 8_000);
  assert.equal(r.disclosure.sampled, true);
  assert.match(r.disclosure.basis, /skipped/);
});

test("whatIsThis: prose is refused typed, not guessed at", () => {
  const r = whatIsThis({ text: PROSE, fileName: "novel.txt", dmdCut });
  assert.equal(r.gap, REFUSALS.not_code_hunk.gap);
  assert.match(r.detail, /prose reader/);
});

test("whatIsThis: empty material is refused typed", () => {
  const r = whatIsThis({ text: "   ", fileName: "x.js", dmdCut });
  assert.equal(r.gap, REFUSALS.empty.gap);
});

test("whatIsThis: dmdCut is injected, never re-derived", () => {
  const r = whatIsThis({ text: MINI_BUNDLE, fileName: "mini.js" });
  assert.equal(r.gap, REFUSALS.dmd_cut_injected.gap);
});

test("whatIsThis: a GraphQL schema artifact routes to the schema account (S129), never the not_code_hunk refusal", () => {
  const schema = {
    __schema: {
      queryType: { name: "RootQueryType" },
      mutationType: { name: "RootMutationType" },
      subscriptionType: { name: "RootSubscriptionType" },
      types: [
        { kind: "OBJECT", name: "RootQueryType", fields: [{ name: "licenses", args: [], type: { kind: "OBJECT", name: "LicenseConnection" } }] },
        { kind: "OBJECT", name: "RootMutationType", fields: [{ name: "updateLicense", args: [], type: { kind: "OBJECT", name: "LicensePayload" } }] },
        { kind: "OBJECT", name: "RootSubscriptionType", fields: [{ name: "licenseUpdated", args: [], type: { kind: "OBJECT", name: "License" } }] },
        { kind: "OBJECT", name: "LicenseConnection", fields: [] },
        { kind: "OBJECT", name: "LicensePayload", fields: [] },
        { kind: "OBJECT", name: "License", fields: [] },
        { kind: "ENUM", name: "LicenseState", enumValues: [{ name: "ACTIVE" }, { name: "EXPIRED" }] },
        { kind: "SCALAR", name: "ID" },
      ],
    },
  };
  const r = whatIsThis({ text: JSON.stringify(schema), fileName: "schema.json", dmdCut });
  assert.equal(r.kind, "graphql_schema");
  assert.equal(r.schema, "WhatIsThis@1");
  const accountText = r.account.map((l) => l.text).join("\n");
  assert.match(accountText, /GraphQL schema — 8 types total: 6 object types, 1 enums, 0 unions, 0 input types, 1 scalars/);
  assert.match(accountText, /query on RootQueryType \(1 fields\)/);
  assert.match(accountText, /mutation on RootMutationType \(1 fields\)/);
  assert.match(accountText, /Connection/);
  assert.match(accountText, /Payload/);
  assert.match(accountText, /LicenseState \(2 values\)/);
  assert.match(accountText, /update \(1\)/);
  assert.equal(r.disclosure.sampled, false);
  assert.equal(r.gist, null);
  assert.ok(r.evidence.length >= 1);
});

test("whatIsThis: JSON that is not a schema is still refused typed, never guessed", () => {
  const r = whatIsThis({ text: '{"a": 1}', fileName: "data.json", dmdCut });
  assert.equal(r.gap, REFUSALS.not_code_hunk.gap);
});

test("whatIsThis: codeGist is composed, generic names dropped when a prior is loaded", () => {
  const prior = { names: { main: { repos: 5 }, init: { repos: 8 } } };
  const text = [
    'const __vite__mapDeps=(i,m)=>(m.f||(m.f=["assets/A-abc12345.js"]));',
    "function main(){ init(); LicenseStatus(); }",
    "function init(){ return; }",
    "function LicenseStatus(){ return '/api/license/status'; }",
  ].join("\n");
  const r = whatIsThis({ text, fileName: "k.js", dmdCut, prior });
  assert.equal(r.disclosure.priorLoaded, true);
  const declaredClaim = r.account.find((l) => l.claim === "declared");
  assert.ok(declaredClaim, "a declared claim must exist");
  assert.match(declaredClaim.text, /LicenseStatus/);
  assert.equal(declaredClaim.text.includes("main"), false, "a generic name attested across the prior is dropped before the account");
  assert.equal(declaredClaim.text.includes("init"), false);
});