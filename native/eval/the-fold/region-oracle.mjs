// region-oracle.mjs — an INDEPENDENT ground truth for "what kind of region is
// this line", built from structure the reader never sees.
//
// WHY THIS IS AN HONEST ORACLE. `extractReadable` throws the HTML's structure
// away and hands the reader a flat text face. So the HTML's own class names
// (navbox, infobox, hatnote, catlinks, table) are information no reader in
// this project has access to, at any tier — which is exactly what an oracle
// has to be. It is not a second reader; it is the document's own author
// declaring what each block is, in a channel the reader is blind to.
//
// THE METHOD, chosen because it needs no HTML parser. For each region kind,
// remove every block of that kind from the HTML, re-extract, and see which
// lines vanish. A line that disappears when the navboxes are removed was in a
// navbox. Nothing here reasons about what a line looks like — that is the
// question being asked, and an oracle that answered it by looking would be
// the reader wearing a costume.
//
// WHAT IT IS NOT. The oracle carries Wikipedia's own vocabulary because
// Wikipedia is the material. Nothing downstream may consume these names as
// categories to detect — they exist to SCORE a reader that has never heard
// them. The moment a reader takes `navbox` as an input, this stops being an
// oracle and becomes a leak.
import { readFileSync, writeFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);

/** Remove every balanced block whose opening tag matches `open`. Depth-counted, so nesting is handled. */
function stripBlocks(html, openRe, tag) {
  let out = html, guard = 0;
  for (;;) {
    if (guard += 1, guard > 2000) break;
    openRe.lastIndex = 0;
    const m = openRe.exec(out);
    if (!m) break;
    const start = m.index;
    let i = openRe.lastIndex, depth = 1;
    const opener = new RegExp(`<${tag}\\b`, "gi"), closer = new RegExp(`</${tag}\\s*>`, "gi");
    while (depth > 0 && i < out.length) {
      opener.lastIndex = i; closer.lastIndex = i;
      const o = opener.exec(out), c = closer.exec(out);
      if (!c) { i = out.length; break; }
      if (o && o.index < c.index) { depth += 1; i = o.index + 1; }
      else { depth -= 1; i = c.index + c[0].length; }
    }
    out = out.slice(0, start) + out.slice(i);
  }
  return out;
}

const REGIONS = [
  { kind: "navbox", tag: "div", re: () => /<div[^>]*class="[^"]*\bnavbox\b[^"]*"[^>]*>/gi },
  { kind: "infobox", tag: "table", re: () => /<table[^>]*class="[^"]*\binfobox\b[^"]*"[^>]*>/gi },
  { kind: "hatnote", tag: "div", re: () => /<div[^>]*class="[^"]*\bhatnote\b[^"]*"[^>]*>/gi },
  { kind: "catlinks", tag: "div", re: () => /<div[^>]*(?:id|class)="[^"]*\bcatlinks\b[^"]*"[^>]*>/gi },
  { kind: "reflist", tag: "ol", re: () => /<ol[^>]*class="[^"]*\breferences\b[^"]*"[^>]*>/gi },
  { kind: "table", tag: "table", re: () => /<table\b[^>]*>/gi },
];

const norm = (s) => String(s).replace(/\s+/g, " ").trim();

export function oracleFor(html) {
  const full = extractReadable(html).text.split("\n").map(norm).filter(Boolean);
  const kindOf = new Map();          // normalized line -> kind (first claimer wins)
  const counts = {};
  for (const r of REGIONS) {
    const stripped = extractReadable(stripBlocks(html, r.re(), r.tag)).text.split("\n").map(norm).filter(Boolean);
    const remaining = new Map();
    for (const l of stripped) remaining.set(l, (remaining.get(l) ?? 0) + 1);
    let n = 0;
    for (const l of full) {
      const left = remaining.get(l) ?? 0;
      if (left > 0) { remaining.set(l, left - 1); continue; }   // survived the strip: not this kind
      if (!kindOf.has(l)) { kindOf.set(l, r.kind); n += 1; }
    }
    counts[r.kind] = n;
  }
  const lines = full.map((text, i) => ({ i, text, kind: kindOf.get(text) ?? "prose" }));
  counts.prose = lines.filter((l) => l.kind === "prose").length;
  return { lines, counts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const REF = process.env.PAGE ?? "wikipedia-battle-of-borodino.html";
  const { lines, counts } = oracleFor(readFileSync(`${FIX}${REF}`, "utf8"));
  console.log(`${REF}: ${lines.length} extracted lines`);
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1]))
    console.log(`  ${k.padEnd(9)} ${String(v).padStart(4)}  (${(100 * v / lines.length).toFixed(1)}%)`);
  console.log(`\nfirst 30 lines, as the oracle sees them:`);
  for (const l of lines.slice(0, 30)) console.log(`  ${String(l.i).padStart(4)} [${l.kind.padEnd(8)}] ${l.text.slice(0, 88)}`);
  console.log(`\nlast 12:`);
  for (const l of lines.slice(-12)) console.log(`  ${String(l.i).padStart(4)} [${l.kind.padEnd(8)}] ${l.text.slice(0, 88)}`);
  writeFileSync(new URL(`./results/region-oracle-${REF.replace(/\W+/g, "-")}.json`, import.meta.url), JSON.stringify({ ref: REF, counts, lines }, null, 1));
}
