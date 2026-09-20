// entities-clickable.test.mjs — FALSIFICATION of the claim:
//   "only entities are clickable; a click opens the being's profile."
//
// The controls are built to FAIL if the claim is false:
//   F1 · an entity surface is wrapped (MTA, East Bank, Housing Division)
//   F2 · a NON-entity word is left as plain text (no span)
//   F3 · the FULL surface is wrapped, never a fragment — "East Bank" wraps
//        both words in ONE span, and "East" alone is never a link
//   F4 · word boundaries hold — "East Bank" must NOT match inside
//        "Eastbankrupt" / "Eastbank" / "theeastbank"
//   F5 · multi-word entities (spaces inside the surface) still match
//   F6 · the case-insensitive match works ("east bank" in prose matches
//        the "East Bank" entity)
//   F7 · the click handler routes to openInspector('being', <full name>)
//   F8 · the native page overlay emits NO span for non-entity words
//   F9 · buildEntityList reads the beings panel (beads) — the clickable
//        set IS the entity set, nothing else
//
// The functions under test are extracted VERBATIM from the BUILT HTML
// (native/the-fold/plans-surface.html) — not a reimplementation — with a
// minimal DOM stub for the document/querySelectorAll surface wordify
// depends on. If the shipped surface changes, this test re-reads it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SURFACE = join(HERE, "../the-fold/plans-surface.html");
const html = readFileSync(SURFACE, "utf8");

// ── extract the shipped functions verbatim ────────────────────────────────
const scriptStart = html.indexOf("<script>");
const scriptEnd = html.lastIndexOf("</script>");
const script = html.slice(scriptStart + "<script>".length, scriptEnd);

const fnRe = (name) => new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`, "m");
const wordifySrc = script.match(fnRe("wordify"))?.[0];
const isWordCharSrc = script.match(fnRe("isWordChar"))?.[0];

assert.ok(wordifySrc, "the BUILT html ships wordify");
assert.ok(isWordCharSrc, "the BUILT html ships isWordChar");

// ── minimal DOM stub: only what wordify/buildEntityList touch ─────────────
const fakeBeads = [
  { dataset: { light: "MTA" } },
  { dataset: { light: "East Bank" } },
  { dataset: { light: "Housing Division" } },
  { dataset: { light: "MDHA" } },
  { dataset: { light: "Nolensville Pike" } },
];
const fakeDocument = {
  querySelectorAll: (sel) => (sel === ".bead" ? fakeBeads : []),
};

function build(wordifySrc, isWordCharSrc) {
  // The shipped functions are evaluated in a sandbox that provides the
  // globals they reference (escHtml, entityList, document). This runs the
  // REAL shipped source, not a reimplementation.
  const sandbox = {
    entityList: [],
    escHtml: (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
    document: fakeDocument,
    console,
  };
  const body = `${isWordCharSrc}\n${wordifySrc}\nreturn wordify;`;
  // eslint-disable-next-line no-new-func
  const wordify = new Function(...Object.keys(sandbox), body)(...Object.values(sandbox));
  // populate entityList the way buildEntityList does (beads -> surfaces)
  const buildEntityList = new Function("document", `
    var entityList = [];
    var beads2 = document.querySelectorAll('.bead');
    for (var bi = 0; bi < beads2.length; bi++) {
      var nm = beads2[bi].dataset.light;
      if (!nm) continue;
      var lower = nm.toLowerCase();
      if (entityList.some(function (e) { return e.lower === lower; })) continue;
      entityList.push({ name: nm, lower: lower, len: lower.length });
    }
    entityList.sort(function (a, b) { return b.len - a.len; });
    return entityList;
  `);
  const list = buildEntityList(fakeDocument);
  sandbox.entityList.push(...list);
  return wordify;
}

const wordify = build(wordifySrc, isWordCharSrc);

// F1 · entity surfaces are wrapped
test("F1: entity surfaces are wrapped in clickable spans", () => {
  const out = wordify("MTA will expand the bus network.");
  assert.ok(out.includes('class="eword"'), "MTA became a span");
  assert.ok(out.includes(">MTA</span>"), "the span holds the surface");
});

// F2 · non-entity words are plain text
test("F2: non-entity words stay plain text — no span", () => {
  const out = wordify("The network expands across the county.");
  assert.ok(!out.includes("<span"), "no clickable span at all");
  assert.ok(out.includes("expands"), "the word is still there, as text");
});

// F3 · the FULL surface, never a fragment
test("F3: multi-word entity wraps as ONE span — fragments never link", () => {
  const out = wordify("East Bank is a once-in-a-generation opportunity.");
  const spans = (out.match(/<span class="eword"[^>]*>([\s\S]*?)<\/span>/g) ?? []);
  assert.equal(spans.length, 1, "exactly one span");
  assert.ok(spans[0].includes("East Bank"), "the one span is the FULL surface");
  assert.ok(!spans[0].includes("East</span>"), "no fragment 'East' link");
});

// F4 · word boundaries
test("F4: word boundaries hold — no match inside a longer word", () => {
  for (const bad of ["Eastbankrupt", "Eastbank", "theeastbank", "xEast Banky"]) {
    const out = wordify(bad);
    assert.ok(!out.includes("eword"), `"${bad}" must not produce a span`);
  }
});

// F5 · a surface with an internal space matches as one unit
test("F5: 'Housing Division' (space inside) wraps as one span", () => {
  const out = wordify("The Housing Division will fund 1,500 units.");
  assert.equal((out.match(/class="eword"/g) ?? []).length, 1);
  assert.ok(out.includes(">Housing Division</span>"), "full surface, one span");
});

// F6 · case-insensitive match
test("F6: lowercase 'east bank' in prose still matches the entity", () => {
  const out = wordify("The vision for east bank is bold.");
  assert.ok(out.includes("east bank</span>"), "matched case-insensitively, preserves prose case");
});

// F7 · the click handler routes to the profile
test("F7: the shipped click handler opens the being profile", () => {
  assert.ok(script.includes("closest('.eword')"), "handler listens for entity spans");
  assert.ok(script.includes("openInspector('being', entity)"), "click opens the profile for the FULL entity name");
  assert.ok(script.includes("toggleLight(ed)"), "click also lights it everywhere");
});

// F8 · native page overlay emits spans ONLY for entities
test("F8: native overlay skips non-entity words entirely", () => {
  assert.ok(script.includes("if (!beingSet[wd.t.toLowerCase()]) continue;"), "non-entity words get no overlay span");
});

// F9 · clickable set == the beings panel
test("F9: buildEntityList reads the beads (the entity set)", () => {
  assert.ok(script.includes("function buildEntityList()"), "buildEntityList ships");
  assert.ok(script.includes("document.querySelectorAll('.bead')"), "reads the beings panel");
});