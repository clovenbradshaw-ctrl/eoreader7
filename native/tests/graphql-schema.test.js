// tests/graphql-schema.test.js — adapters/code/graphql.js: the what-organ's
// schema skeleton (S129). Pins the schema scan's contract: every figure comes
// from the introspection document's own bytes, root operations are listed with
// full counts disclosed, Connection/Payload/enum/union conventions are
// detected, the domain vocabulary is a tally of the schema's OWN type names
// (never a word list about the domain), mutation verbs are measured, and
// anything that is not a GraphQL schema is refused typed rather than guessed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isGraphqlSchema, schemaScan } from "../adapters/code/graphql.js";

const DOC = {
  __schema: {
    queryType: { name: "RootQueryType" },
    mutationType: { name: "RootMutationType" },
    subscriptionType: { name: "RootSubscriptionType" },
    types: [
      { kind: "OBJECT", name: "RootQueryType", fields: [
        { name: "surveyAssignments", args: [], type: { kind: "OBJECT", name: "SurveyAssignmentConnection" } },
        { name: "licenses", args: [], type: { kind: "NON_NULL", ofType: { kind: "OBJECT", name: "LicenseConnection" } } },
        { name: "assets", args: [], type: { kind: "OBJECT", name: "AssetConnection" } },
      ] },
      { kind: "OBJECT", name: "RootMutationType", fields: [
        { name: "createSurveyAssignment", args: [{ name: "input", type: { kind: "NON_NULL", ofType: { kind: "INPUT_OBJECT", name: "SurveyAssignmentInput" } } }], type: { kind: "OBJECT", name: "SurveyAssignmentPayload" } },
        { name: "updateLicense", args: [], type: { kind: "OBJECT", name: "LicensePayload" } },
        { name: "submitSurvey", args: [], type: { kind: "OBJECT", name: "SubmitSurveyPayload" } },
      ] },
      { kind: "OBJECT", name: "RootSubscriptionType", fields: [
        { name: "surveySubmissionUpdated", args: [], type: { kind: "OBJECT", name: "SurveySubmission" } },
      ] },
      { kind: "OBJECT", name: "SurveyAssignmentConnection", fields: [{ name: "edges", type: { kind: "OBJECT", name: "SurveyAssignmentEdge" } }] },
      { kind: "OBJECT", name: "LicenseConnection", fields: [] },
      { kind: "OBJECT", name: "AssetConnection", fields: [] },
      { kind: "OBJECT", name: "SurveyAssignmentPayload", fields: [] },
      { kind: "OBJECT", name: "LicensePayload", fields: [] },
      { kind: "OBJECT", name: "SubmitSurveyPayload", fields: [] },
      { kind: "OBJECT", name: "SurveyAssignment", fields: [] },
      { kind: "OBJECT", name: "License", fields: [] },
      { kind: "OBJECT", name: "Asset", fields: [] },
      { kind: "OBJECT", name: "PageInfo", fields: [] },
      { kind: "ENUM", name: "SurveyStatus", enumValues: [{ name: "DRAFT" }, { name: "OPEN" }, { name: "CLOSED" }] },
      { kind: "ENUM", name: "LicenseState", enumValues: [{ name: "ACTIVE" }, { name: "EXPIRED" }] },
      { kind: "UNION", name: "AssetResult", possibleTypes: [] },
      { kind: "INPUT_OBJECT", name: "SurveyAssignmentInput", inputFields: [] },
      { kind: "SCALAR", name: "ID" },
      { kind: "SCALAR", name: "String" },
      { kind: "SCALAR", name: "DateTime" },
    ],
  },
};
const TEXT = JSON.stringify(DOC, null, 2);

test("isGraphqlSchema: introspection JSON is a schema; prose, non-JSON, and other JSON are not", () => {
  assert.equal(isGraphqlSchema(TEXT), true);
  assert.equal(isGraphqlSchema('{"a": 1}'), false, "JSON without __schema.types is not a schema");
  assert.equal(isGraphqlSchema("not json at all"), false);
  assert.equal(isGraphqlSchema("It was the best of times."), false);
  assert.equal(isGraphqlSchema(""), false);
});

test("schemaScan: the type inventory comes straight off __schema.types", () => {
  const scan = schemaScan(TEXT);
  assert.equal(scan.schema, "GraphQLSchemaScan@1");
  assert.equal(scan.counts.total, 20);
  assert.equal(scan.counts.object, 13);
  assert.equal(scan.counts.enum, 2);
  assert.equal(scan.counts.union, 1);
  assert.equal(scan.counts.input, 1);
  assert.equal(scan.counts.scalar, 3);
  assert.deepEqual(scan.root, { query: "RootQueryType", mutation: "RootMutationType", subscription: "RootSubscriptionType" });
});

test("schemaScan: root fields are listed with their return types and arg requirements", () => {
  const scan = schemaScan(TEXT);
  const query = scan.queryFields;
  assert.equal(query.length, 3);
  assert.equal(query[1].name, "licenses");
  assert.equal(query[1].returns, "LicenseConnection", "a NON_NULL wrapper resolves to its leaf name");
  const create = scan.mutationFields.find((f) => f.name === "createSurveyAssignment");
  assert.equal(create.returns, "SurveyAssignmentPayload");
  assert.equal(create.args[0].required, true);
  assert.equal(scan.subscriptionFields.length, 1);
  assert.equal(scan.subscriptionFields[0].name, "surveySubmissionUpdated");
});

test("schemaScan: Connection pagination and Payload conventions are detected", () => {
  const scan = schemaScan(TEXT);
  assert.equal(scan.connectionTotal, 3);
  assert.deepEqual(scan.connections.map((c) => c.name).sort(), ["AssetConnection", "LicenseConnection", "SurveyAssignmentConnection"].sort());
  assert.equal(scan.payloadTotal, 3);
  assert.ok(scan.payloads.includes("SubmitSurveyPayload"));
});

test("schemaScan: enums carry their value counts, unions and inputs are listed", () => {
  const scan = schemaScan(TEXT);
  assert.equal(scan.enumTotal, 2);
  const status = scan.enums.find((e) => e.name === "SurveyStatus");
  assert.deepEqual(status.values, ["DRAFT", "OPEN", "CLOSED"]);
  assert.ok(scan.unions.includes("AssetResult"));
  assert.ok(scan.inputs.includes("SurveyAssignmentInput"));
});

test("schemaScan: the domain vocabulary is the schema's OWN type-name words, convention tails excluded", () => {
  const scan = schemaScan(TEXT);
  const words = scan.domain.map((d) => d.word);
  assert.ok(words.includes("Survey"));
  assert.ok(words.includes("License"));
  assert.ok(words.includes("Asset"));
  // Root*/PageInfo and pure convention tails never pollute the tally
  assert.equal(words.includes("Root"), false);
  assert.equal(words.includes("PageInfo"), false);
  assert.equal(words.includes("Connection"), false);
});

test("schemaScan: root mutation verbs are measured, not listed", () => {
  const scan = schemaScan(TEXT);
  const verbs = new Map(scan.verbs.map((v) => [v.verb, v.n]));
  assert.equal(verbs.get("create"), 1);
  assert.equal(verbs.get("update"), 1);
  assert.equal(verbs.get("submit"), 1);
});

test("schemaScan: evidence anchors and disclosure are present and honest", () => {
  const scan = schemaScan(TEXT);
  assert.ok(scan.evidenceAnchors.length >= 3);
  for (const a of scan.evidenceAnchors) {
    assert.ok(a.offset >= 0, `${a.name} must resolve to a real byte offset`);
    assert.equal(TEXT.slice(a.offset).startsWith(`"${a.name}"`), true, "the anchor lands on the type's own quoted name");
  }
  assert.equal(scan.disclosure.queryFieldsTotal, 3);
  assert.equal(scan.disclosure.mutationFieldsTotal, 3);
  assert.equal(scan.disclosure.subscriptionFieldsTotal, 1);
  assert.equal(scan.bytes, TEXT.length);
});

test("schemaScan: refuses non-schema input typed, never guessed", () => {
  assert.throws(() => schemaScan("not json"), /not JSON/);
  assert.throws(() => schemaScan('{"a":1}'), /not a GraphQL introspection document/);
});