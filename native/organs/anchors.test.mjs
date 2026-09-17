// organs/anchors.test.mjs — the anchors organ (Tycho): a document's citations
// resolve to real byte anchors or are reported absent — never guessed.
// Pins the disciplines: field-confirmed vs field-absent vs type-absent,
// data_level for Type.id, byte offsets that are real addresses in the artifact,
// and a name that resolves across case (GetMigrations vs getMigrations).

import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorDocument, REFUSALS, CELL } from "./anchors.js";
import { loadAnchorArtifacts } from "../adapters/code/anchors.js";

// A tiny self-contained artifact set — introspection (Swarm-style) + a
// field-index (Slate-style) + an ops index + a raw bundle — so the test does
// not depend on the workspace's real files.
const artifacts = loadAnchorArtifacts([
  { id: "swarm", kind: "introspection", text: JSON.stringify({ __schema: { types: [
    { kind: "OBJECT", name: "TransformerAttributeRules", fields: [{ name: "inputFacts" }, { name: "entity" }] },
    { kind: "OBJECT", name: "Asset", fields: [{ name: "licenses" }, { name: "flows" }] },
  ] } }) },
  { id: "slate", kind: "field-index", text: JSON.stringify({ License: ["status", "registrant"], FlowStageTask: ["assetId", "paymentAmount"] }) },
  { id: "ops", kind: "ops-index", text: JSON.stringify({ rows: [
    { name: "getAngelPlatformCityAttribute", op: "query", fields: ["connectors", "lastSuccessfulPushAt"], offset: 351570 },
    { name: "getMigrations", op: "query", fields: ["id"], offset: 100 },
    { name: "fullSlateMigrationSql", op: "query", fields: ["fullSlateMigrationSql"], offset: 200 },
  ] }) },
  { id: "bundle", kind: "raw", text: "const __vite__x=1; /* WorkflowStageTask */" },
]);

const DOC = [
  "`License.registrant` and `Asset.licenses` are real, schema-level fields.",
  "`WorkflowStageTask.isPayment` — the fee mechanism exists per task.",
  "`Asset.contact` is a confirmed native field on the Asset type.",
  "`Connector.id: 84091` (\"Zoning\") targets `Attribute.entityType`.",
  "`TransformerAttributeRules` derives a `PlatformAttribute` value.",
  "`getAngelPlatformCityAttribute` carries `lastSuccessfulPushAt`.",
  "`GetMigrations` and `fullSlateMigrationSql` never contain \"Azora\".",
  "Azora appears nowhere.",
].join("\n");

test("anchors: cell is SIG at Figure grain", () => {
  assert.deepEqual(CELL, { op: "SIG", grain: "Figure" });
});

test("anchorDocument: Type.field is checked against the type's own field list", () => {
  const r = anchorDocument({ doc: DOC, artifacts });
  const t = (term) => r.terms.find((x) => x.term === term);
  assert.equal(t("License.registrant").status, "field_confirmed", "registrant is a License field in the slate field index");
  assert.equal(t("Asset.licenses").status, "field_confirmed", "licenses is an Asset field in the swarm introspection");
  assert.equal(t("Asset.contact").status, "field_absent", "contact is NOT an Asset field anywhere — absence is a result");
  assert.equal(t("WorkflowStageTask.isPayment").status, "type_absent", "WorkflowStageTask is not a type in the held artifacts; the raw bundle witnesses the string only");
});

test("anchorDocument: a Type.id is data_level, never claimed as schema", () => {
  const r = anchorDocument({ doc: DOC, artifacts });
  const t = r.terms.find((x) => x.term === "Connector");
  assert.ok(t);
  assert.equal(t.status, "data_level");
});

test("anchorDocument: an operation resolves across case and to a real bundle offset", () => {
  const r = anchorDocument({ doc: DOC, artifacts });
  const t = r.terms.find((x) => x.term === "GetMigrations");
  assert.ok(t);
  assert.equal(t.status, "anchored");
  assert.equal(t.anchor.op.name, "getMigrations", "case-folded to the real operation name");
  assert.equal(t.anchor.bundleOffset, 100);
});

test("anchorDocument: absence is a result, never a guess", () => {
  const r = anchorDocument({ doc: DOC, artifacts });
  const azora = r.terms.find((x) => x.term === "Azora");
  assert.ok(azora);
  assert.equal(azora.status, "unfound");
  assert.ok(r.unfound.includes("Azora"));
});

test("anchorDocument: typed refusals", () => {
  assert.equal(anchorDocument({ doc: "", artifacts }).gap, REFUSALS.empty_doc.gap);
  assert.equal(anchorDocument({ doc: DOC }).gap, REFUSALS.no_artifacts.gap);
});