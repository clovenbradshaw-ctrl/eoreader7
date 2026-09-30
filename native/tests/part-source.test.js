// part-source.test.js — a page's stylesheet snipped, not written. Fixed
// snapshots (fixtures/part-source, each beside its own license). Controls,
// each built to fail if the snipping is wrong:
//   - a block's byte range is exactly its bytes; a selector's elements leave
//     out classes, ids, pseudos and attributes (".nav" is not <nav>);
//   - the snip keeps only rules that reach an element the page emits, and is
//     exactly the concatenation of its ranges in the pinned file;
//   - the license gate: a copyleft candidate that would reach MORE elements
//     is still refused, and the refusal is on the record;
//   - coverage decides between permitted candidates, not order;
//   - the page: with a snip, every byte of its CSS after the provenance
//     comment is the source's own, the license notice travels with it, the
//     hash is the file's, and no hand-written rule is on the page;
//   - no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { cssBlocks, selectorElements, snipCss, sourcePart, provenanceComment, PERMISSIVE, readLicense } from "../organs/part-source.js";
import { renderBelief, RENDERED_ELEMENTS } from "../adapters/build/belief-page.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");
const fx = (f) => fs.readFileSync(path.join(HERE, "fixtures", "part-source", f), "utf8");
const NEW = fx("new.css"), SAKURA = fx("sakura.css");
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

// an npm adapter over the fixtures (and one copyleft package that is never on disk)
function fixtureNpm({ gpl = false } = {}) {
  const found = JSON.parse(fx("search-classless-css.json")).filter((p) => ["@exampledev/new.css", "sakura.css"].includes(p.name));
  if (gpl) found.unshift({ name: "copyleft-css", version: "1.0.0", license: "GPL-3.0", description: "reaches everything" });
  const texts = { "@exampledev/new.css": { "/new.css": NEW, "/LICENSE": fx("new.css.LICENSE") }, "sakura.css": { "/css/sakura.css": SAKURA, "/LICENSE.txt": fx("sakura.css.LICENSE") }, "copyleft-css": { "/all.css": RENDERED_ELEMENTS.map((e) => `${e} { color: red; }`).join("\n") } };
  return {
    search: async () => found,
    files: async (name) => name === "@exampledev/new.css" ? JSON.parse(fx("new.css@1.1.3.files.json")) : name === "sakura.css" ? JSON.parse(fx("sakura.css@1.5.1.files.json")) : [{ path: "/all.css", size: 500 }],
    file: async (name, version, p) => { const text = texts[name]?.[p]; if (text == null) return null; const raw = Buffer.from(text, "utf8"); return { url: `https://cdn.jsdelivr.net/npm/${name}@${version}${p}`, text, bytes: raw.toString("base64"), sha256: sha(raw) }; },
  };
}

test("blocks and selectors: exact byte ranges; classes are not elements", () => {
  for (const b of cssBlocks(NEW)) {
    const bytes = NEW.slice(b.start, b.end);
    assert.ok(bytes.startsWith(b.head.slice(0, 5)) && bytes.endsWith("}"), `range ${b.start}-${b.end} is not its block`);
  }
  assert.deepEqual([...selectorElements("nav a:hover, .card > h3")].sort(), ["a", "h3", "nav"]);
  assert.deepEqual([...selectorElements(".nav, #main, [type=text]")], []);
  assert.deepEqual([...selectorElements(":root")], [":root"]);
});

test("the snip keeps only what reaches the page, and is exactly its ranges", () => {
  const s = snipCss(NEW, RENDERED_ELEMENTS);
  assert.equal(s.css, s.ranges.map(([a, z]) => NEW.slice(a, z)).join("\n"));
  const kept = cssBlocks(NEW).filter((b) => s.ranges.some(([a, z]) => a === b.start && z === b.end));
  for (const b of kept.filter((b) => !b.head.startsWith("@"))) {
    const reach = [...selectorElements(b.head)];
    assert.ok(reach.some((e) => RENDERED_ELEMENTS.includes(e) || [":root", "html", "body", "*"].includes(e)), `kept a rule that styles nothing on the page: ${b.head}`);
  }
  assert.ok(s.css.length < NEW.length, "rules for elements the page never emits are left out");
});

test("the license gate refuses a copyleft candidate even when it reaches more", async () => {
  const part = await sourcePart({ need: "stylesheet", elements: RENDERED_ELEMENTS, npm: fixtureNpm({ gpl: true }) });
  assert.ok(PERMISSIVE.has(part.provenance.license));
  assert.notEqual(part.provenance.package, "copyleft-css");
  assert.deepEqual(part.provenance.candidates.find((c) => c.name === "copyleft-css"), { name: "copyleft-css", version: "1.0.0", license: "GPL-3.0", kept: false });
  // coverage chose between the permitted ones
  const cover = (t) => snipCss(t, RENDERED_ELEMENTS).reached.length;
  assert.equal(part.provenance.package, cover(NEW) >= cover(SAKURA) ? "@exampledev/new.css" : "sakura.css");
});

test("the page: every CSS byte is the source's, the notice travels, nothing is written by hand", async () => {
  const part = await sourcePart({ need: "stylesheet", elements: RENDERED_ELEMENTS, npm: fixtureNpm() });
  const comment = provenanceComment(part.provenance);
  const page = renderBelief([{ id: "site#1", kind: "site", name: "Pod Chat", props: [{ label: "total vote count", value: "47", derived: true }], children: [], parent: null }], { style: { css: part.css, comment } });
  const style = page.slice(page.indexOf("<style>") + 7, page.indexOf("</style>"));
  const afterComment = style.slice(style.indexOf("*/") + 2).trim();
  assert.equal(afterComment, part.css.trim(), "the page's CSS is exactly the snip");
  const source = part.provenance.package === "sakura.css" ? SAKURA : NEW;
  const raw = Buffer.from(source, "utf8");
  assert.equal(afterComment, part.provenance.ranges.map(([a, z]) => raw.subarray(a, z).toString("utf8")).join("\n").trim(), "and the snip is exactly the source's BYTES at its ranges");
  assert.equal(part.provenance.sha256, sha(source));
  assert.ok(comment.includes("Permission is hereby granted"), "the license notice travels with the snip");
  assert.ok(comment.startsWith("/*!"), "in a comment minifiers keep");
  assert.ok(!page.includes("--accent") && !page.includes("fallback, written by hand"), "no hand-written rule is on the page");
  assert.ok(page.includes('title="computed from the parts on this page"'), "a computed value is still marked, in plain HTML");
});

test("byte ranges stay exact past a multi-byte character", async () => {
  // new.css carries "→" (3 bytes) at character 5731: every range after it must
  // still be the file's own bytes, not string indices that drift by two
  assert.ok(NEW.indexOf("→") > 0);
  const part = await sourcePart({ need: "stylesheet", elements: RENDERED_ELEMENTS, npm: fixtureNpm() });
  const raw = Buffer.from(NEW, "utf8");
  const after = part.provenance.ranges.filter(([a]) => a > Buffer.byteLength(NEW.slice(0, NEW.indexOf("→"))));
  assert.ok(after.length > 0, "the fixture has ranges after the arrow");
  for (const [a, z] of after) assert.ok(raw.subarray(a, z).toString("utf8").trimStart()[0] !== "\n" && raw.subarray(a, z).toString("utf8").endsWith("}"), `range ${a}-${z} is not a whole block in bytes`);
  assert.equal(part.provenance.bytes, raw.length);
});

test("a quoted brace is text, not the end of a block", () => {
  const css = 'a::after{content:"}"} p{color:red} h1{margin:0}';
  const blocks = cssBlocks(css);
  assert.deepEqual(blocks.map((b) => b.head), ["a::after", "p", "h1"]);
  assert.deepEqual(snipCss(css, ["p", "h1"]).reached.sort(), ["h1", "p"]);
});

test("license strings are read as SPDX; a notice-bound license with no text is refused", async () => {
  assert.equal(readLicense("MIT").ok, true);
  assert.equal(readLicense("mit").chosen, "MIT");
  assert.equal(readLicense({ type: "ISC" }).chosen, "ISC");
  assert.equal(readLicense("(MIT OR GPL-3.0)").chosen, "MIT", "an OR lets the permissive one be chosen");
  assert.equal(readLicense("MIT AND GPL-3.0").ok, false, "an AND binds both");
  assert.equal(readLicense("GPL-3.0").ok, false);
  const npm = fixtureNpm();
  const noLicense = { ...npm, files: async (name, v) => (await npm.files(name, v)).filter((f) => !f.path.toLowerCase().includes("licen")) };
  const part = await sourcePart({ need: "stylesheet", elements: RENDERED_ELEMENTS, npm: noLicense });
  assert.equal(part.css, null);
  assert.ok(part.refused.includes("asks for its notice"));
});

test("part-source and its adapter contain no regular expression", () => {
  for (const f of ["organs/part-source.js", "adapters/sources/npm-parts.js"]) {
    const found = scanRegexes(fs.readFileSync(path.join(NATIVE, f), "utf8"));
    assert.equal(found.length, 0, `${f}: ${JSON.stringify(found).slice(0, 200)}`);
  }
});
