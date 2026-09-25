// extract-bundle-ops.mjs — pull the shared Slate/BuildingBlocks GraphQL
// surface out of the compiled bundle (index-px14EQkj.js), where introspection
// is blocked. The bundle carries 774 embedded operation Documents as GraphQL
// AST object literals (`XDocument={kind:"Document",definitions:[…]}`); this
// reads them directly — the same "static analysis of compiled GraphQL
// documents" the nine-jobs inventory used — and writes a byte-anchored index:
//   { name, op, fields[], vars[], offset, length, printedQuery? }
// Offsets are into the bundle; every entry is a real byte address.

import fs from "node:fs";
import path from "node:path";

const BUNDLE = process.argv[2] ?? "/Users/mlacy/Documents/3.0/index-px14EQkj.js";
const OUT = process.argv[3] ?? "/Users/mlacy/Documents/3.0/bundle-ops-index.json";

const text = fs.readFileSync(BUNDLE, "utf8");

// One operation Document:  NameDocument={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query|mutation|subscription",name:{kind:"Name",value:"OpName"}, …]
const DOC_START = /([A-Za-z_$][\w$]*?)Document=\{kind:"Document",definitions:\[\{kind:"OperationDefinition",operation:"(query|mutation|subscription)",name:\{kind:"Name",value:"([A-Za-z0-9_]+)"\}/g;

const ops = new Map();
let m;
while ((m = DOC_START.exec(text))) {
  const [, constName, op, name] = m;
  if (ops.has(name)) continue;
  const start = m.index;
  // the AST literal ends at the matching `}` of `XDocument={…}` — brace-match
  // from the first `{` after `XDocument=`
  const open = text.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  const span = text.slice(start, end === -1 ? start + 1000 : end);

  // GraphQL field selections: {kind:"Field",name:{kind:"Name",value:"X"}}
  const fields = [];
  const FIELD = /\{kind:"Field",name:\{kind:"Name",value:"([A-Za-z0-9_]+)"\}/g;
  let f;
  while ((f = FIELD.exec(span))) fields.push(f[1]);

  // variable names: {kind:"Variable",name:{kind:"Name",value:"X"}}
  const vars = [];
  const VAR = /\{kind:"Variable",name:\{kind:"Name",value:"([A-Za-z0-9_]+)"\}/g;
  let v;
  while ((v = VAR.exec(span))) vars.push(v[1]);

  // NAMED TYPES — the Slate/BB graph's type witness. Introspection is blocked
  // in this product, so the operation ASTs' `{kind:"NamedType",name:{kind:
  // "Name",value:"X"}}` refs (variable types, return types, list item types)
  // are the schema surface the bundle actually speaks; a type cited in a doc
  // that is absent from the Swarm introspection resolves HERE if the bundle
  // ever references it.
  const types = [];
  const TYPE = /\{kind:"NamedType",name:\{kind:"Name",value:"([A-Za-z0-9_]+)"\}/g;
  let ty;
  while ((ty = TYPE.exec(span))) types.push(ty[1]);

  ops.set(name, { name, op, constName, fields: [...new Set(fields)], vars: [...new Set(vars)], types: [...new Set(types)], offset: start, length: (end === -1 ? 1000 : end - start) });
}

// printed query strings keyed to the Documents:  "...query X(...){...}":XDocument
const PRINTED = /"((?:\\"|[^"\\])*?(?:query|mutation|subscription)\s+([A-Za-z0-9_]+)[^"]*?[{}])"\s*:\s*([A-Za-z_$][\w$]*)Document/g;
let p;
while ((p = PRINTED.exec(text))) {
  const name = p[2];
  const rec = ops.get(name);
  if (rec && !rec.printedQuery) rec.printedQuery = p[1].replace(/\\"/g, '"');
}

const rows = [...ops.values()].sort((a, b) => a.offset - b.offset);
const out = {
  schema: "BundleOpsIndex@1",
  source: path.basename(BUNDLE),
  bytes: text.length,
  operations: rows.length,
  byOp: { query: rows.filter((r) => r.op === "query").length, mutation: rows.filter((r) => r.op === "mutation").length, subscription: rows.filter((r) => r.op === "subscription").length },
  printedQueries: rows.filter((r) => r.printedQuery).length,
  rows,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${OUT}: ${rows.length} operations (${out.byOp.query} query / ${out.byOp.mutation} mutation / ${out.byOp.subscription} subscription), ${out.printedQueries} printed queries, ${text.length} bundle bytes`);