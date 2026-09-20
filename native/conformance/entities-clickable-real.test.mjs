// entities-clickable-real.test.mjs — FALSIFICATION against the REAL surface.
//
// The harness test (entities-clickable.test.mjs) proves the shipped
// functions behave on synthetic input with a fake beads list. This file
// goes further: it runs the shipped `wordify` over REAL retained corpus
// prose with the REAL entity list extracted from the BUILT surface, and
// verifies two properties that could genuinely fail at production scale:
//
//   R1 · every span wordify emits corresponds to a real entity surface —
//        there is no span whose text is not in the entity list, and no
//        entity surface is emitted as a fragment of itself
//   R2 · on the full retained corpus, NO non-entity span is emitted — the
//        count of spans over all five documents equals the count of entity
//        surfaces present in the text (exact-match accounting)
//
// If the claim "only entities are clickable" is false in production — a
// mismatch between the function's view and the surface's actual entities,
// a fragment leak, a boundary bug on real prose — one of these controls
// fails.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const SURFACE = join(ROOT, "native/the-fold/plans-surface.html");
const html = readFileSync(SURFACE, "utf8");

const scriptStart = html.indexOf("<script>");
const scriptEnd = html.lastIndexOf("</script>");
const script = html.slice(scriptStart + "<script>".length, scriptEnd);

const fnRe = (name) => new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`, "m");
const wordifySrc = script.match(fnRe("wordify"))?.[0];
const isWordCharSrc = script.match(fnRe("isWordChar"))?.[0];
assert.ok(wordifySrc && isWordCharSrc, "shipped functions present");

// ── the REAL entity list, from the built surface's beads ──────────────────
const beadRe = /class="bead[^"]*" data-light="([^"]+)"/g;
const entityList = [];
{ const seen = new Set(); let m; while ((m = beadRe.exec(html))) { const lower = m[1].toLowerCase(); if (seen.has(lower)) continue; seen.add(lower); entityList.push({ name: m[1], lower, len: lower.length }); } }
entityList.sort((a, b) => b.len - a.len);
assert.ok(entityList.length > 5, `real entity list is populated (${entityList.length})`);

const sandbox = {
  entityList,
  escHtml: (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  document: { querySelectorAll: () => [] },
  console,
};
// eslint-disable-next-line no-new-func
const wordify = new Function(...Object.keys(sandbox), `${isWordCharSrc}\n${wordifySrc}\nreturn wordify;`)(...Object.values(sandbox));

const DOCS = ["nashvillenext-access-v5", "nmotion-final", "east-bank-exec", "uhs-full-report", "carp-final"];
const corpus = DOCS.map((id) => ({ id, text: readFileSync(join(ROOT, `plans/nashville/ground/${id}.txt`), "utf8") }));

function emittedSpans(text) {
  const out = wordify(text);
  const spans = [];
  const re = /<span class="eword"[^>]*>([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(out))) spans.push(m[1]);
  return spans;
}

// R1 · every emitted span text IS a full entity surface
test("R1: every span emitted by wordify is a real entity surface (full, not a fragment)", () => {
  for (const doc of corpus) {
    const spans = emittedSpans(doc.text);
    for (const s of spans) {
      const lower = s.toLowerCase();
      const hit = entityList.find((e) => e.lower === lower);
      assert.ok(hit, `span "${s}" in ${doc.id} is NOT an entity surface`);
      assert.equal(hit.lower, lower, `span "${s}" must be the FULL surface, not a fragment`);
    }
  }
});

// R2 · exact accounting on the real corpus: every entity occurrence in the
// text yields exactly one span; non-entity words yield none.
test("R2: exact span accounting over the real corpus — no phantom spans, no missed entities", () => {
  for (const doc of corpus) {
    const text = doc.text;
    const spans = emittedSpans(text);
    // count real entity occurrences: each surface, case-insensitive, at
    // word boundaries, longest-first so overlapping surfaces count once
    let expected = 0;
    const consumed = new Array(text.length).fill(false);
    for (const e of entityList) {
      const low = text.toLowerCase();
      let at = 0;
      const re = new RegExp(`\\b${e.lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      let m;
      while ((m = re.exec(low))) {
        // skip if already consumed by a longer surface
        let overlap = false;
        for (let i = m.index; i < m.index + e.len; i++) if (consumed[i]) { overlap = true; break; }
        if (overlap) continue;
        for (let i = m.index; i < m.index + e.len; i++) consumed[i] = true;
        expected++;
        at = m.index + 1;
        re.lastIndex = at;
      }
    }
    assert.equal(spans.length, expected, `${doc.id}: emitted ${spans.length} spans, exact-match accounting says ${expected}`);
  }
});