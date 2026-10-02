// block-profile.test.mjs — the profile block is surface-neutral: data, HTML and
// payload all come from one place, and an empty profile set renders nothing
// (so a surface that has not built profiles is byte-identical to before).
import test from "node:test";
import assert from "node:assert/strict";
import { triplesFromLinks, buildProfiles, renderProfile, renderProfileSection, profilePayload, PROFILE_BLOCK_SCHEMA } from "../the-fold/surface/block-profile.mjs";

const CS = { draws: 99, alpha: 0.05, seed: 5 };

function links() {
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    out.push({ id: `p${i}a`, kind: "born", fields: { agency: `P${i}`, place: `town${i}` }, witnessed: true });
    out.push({ id: `p${i}b`, kind: "born", fields: { agency: `P${i}`, place: `town${i}` }, witnessed: true });
    out.push({ id: `p${i}c`, kind: "works", fields: { agency: `P${i}`, place: `job${i}` }, witnessed: true });
  }
  for (let i = 0; i < 12; i += 1) {
    out.push({ id: `c${i}a`, kind: "area", fields: { agency: `C${i}`, place: `a${i}` }, witnessed: true });
    out.push({ id: `c${i}b`, kind: "mayor", fields: { agency: `C${i}`, place: `m${i}` }, witnessed: true });
  }
  return out;
}

test("triplesFromLinks: a row naming only one end asserts nothing between referents", () => {
  const t = triplesFromLinks([
    { kind: "born", fields: { agency: "P0", place: "town0" } },
    { kind: "mentioned", fields: { agency: "P0" } },
  ]);
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].subject, t[0].verb, t[0].object], ["P0", "born", "town0"]);
});

const beings = [...Array(12).keys()].map((i) => `P${i}`).concat([...Array(12).keys()].map((i) => `C${i}`));

test("buildProfiles runs kind induction over the surface's own rows", () => {
  const res = buildProfiles({ triples: triplesFromLinks(links()), beings, exposureFloor: 2, kindMethod: "characteristic-sets", kindOptions: CS });
  assert.ok(res.byId.size >= 20, JSON.stringify(res.diagnostics));
  const p = res.byId.get("P0");
  assert.ok(p && p.parameters.some((x) => x.rel === "born" && x.standing === "fixed"));
});

test("an empty profile set renders nothing at all (byte-identical guarantee)", () => {
  assert.equal(renderProfileSection(null), "");
  assert.equal(renderProfileSection([]), "");
  assert.equal(profilePayload(null), "");
});

test("a rendered profile carries the standing and the payload is valid JSON", () => {
  const res = buildProfiles({ triples: triplesFromLinks(links()), beings, exposureFloor: 2, kindMethod: "characteristic-sets", kindOptions: CS });
  const html = renderProfileSection(res);
  assert.match(html, /ep-panel/);
  assert.match(html, /ep-s-fixed/);
  const single = renderProfile(res.byId.get("P0"));
  assert.match(single, /data-entity="P0"/);
  const payload = profilePayload(res);
  const json = JSON.parse(payload.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
  assert.equal(json.schema, PROFILE_BLOCK_SCHEMA);
  assert.ok(Array.isArray(json.profiles[0].lines) && json.profiles[0].lines.length);
});
