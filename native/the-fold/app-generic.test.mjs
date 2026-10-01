import test from "node:test";
import assert from "node:assert/strict";
import { namedFields, askedFields, unitOf } from "./app-generic.mjs";
const DOC = { latitude: 1, current_units: { pm10: "μg/m³", pm2_5: "μg/m³" }, current: { time: "t", pm10: 20.1, pm2_5: 9.3, dust: 1.2 } };
test("fields the person named are the numeric paths whose key appears in the prompt, punctuation stripped", () => {
  assert.deepEqual(namedFields("show pm2.5 and dust", DOC).map((f) => f.path), ["current.pm2_5", "current.dust"]);
  assert.deepEqual(namedFields("sunset times", DOC, { strings: true }), [], "the word `times` is not the key `time`: only a whole token equal to the key is a name");
  assert.deepEqual(namedFields("show the air quality", DOC), []);
});
test("with none named, the sample's own request names them", () => {
  assert.deepEqual(askedFields("https://x/y?latitude=1&current=pm10,pm2_5", DOC).map((f) => f.path), ["current.pm10", "current.pm2_5"]);
});
test("a field's unit is the string leaf under the same key in its units container — or null", () => {
  assert.equal(unitOf(DOC, "current.pm10").value, "μg/m³");
  assert.equal(unitOf(DOC, "current.dust"), null);
});

import { contractFromSample } from "./sample-contract.mjs";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
test("the model is only asked to choose among paths whose own keys carry the field's name; a name no path carries is a typed gap, and a pick outside the shortlist cannot happen", async () => {
  const doc = JSON.stringify({ latitude: 1, hourly_units: { pm10: "ug" }, hourly: { time: ["a", "b"], pm10: [1, 2], pm2_5: [3, 4] }, current: { pm10: 9 } });
  const asked = [];
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sc-"));
  const fetcher = async () => ({ ok: false, status: 0 }); // no variants: this checks the shortlist only
  const r = await contractFromSample({ url: "https://x/y?hourly=pm10", bytes: doc, fields: ["pm10", "pm2_5", "ozone"], out, fetcher, point: async (_m, f, cands) => { asked.push(cands.map((c) => c.path)); return 1; } });
  assert.deepEqual(asked, [["hourly.pm10[0]", "current.pm10"]], "pm10 has two name-bearing paths (units excluded); pm2_5 has one and ozone none, neither asks the model");
  assert.equal(r.fields.find((f) => f.field === "pm10").pointed, "current.pm10");
  assert.equal(r.fields.find((f) => f.field === "pm2_5").pointed, "hourly.pm2_5[0]");
  assert.match(r.fields.find((f) => f.field === "ozone").why, /no path in the sample carries/);
});
