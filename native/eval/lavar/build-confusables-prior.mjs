// native/eval/lavar/build-confusables-prior.mjs — derive the confusables prior
// from Unicode's OWN data (UTS #39, confusables.txt). The map is NOT hand-typed:
// it is a projection of the standard's own table, restricted to the attack case
// this engine must resolve — a single non-Latin glyph standing in for a single
// ASCII alphanumeric (Cyrillic "к е у о", Greek "ο α", full-width forms, etc.).
//
//   node native/eval/lavar/build-confusables-prior.mjs [confusables.txt] [out.json]
//
// Fetch the source first (public, licensed):
//   curl -s https://www.unicode.org/Public/security/latest/confusables.txt -o /tmp/confusables.txt
import fs from "node:fs";

const SRC = process.argv[2] ?? "/tmp/confusables.txt";
const OUT = process.argv[3] ?? new URL("../../../../live_priors/derived-priors/confusables-prior-v1.json", import.meta.url).pathname;

const ASCII_ALNUM = (cp) => (cp >= 48 && cp <= 57) || (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122);

const txt = fs.readFileSync(SRC, "utf8");
const mappings = {};
for (const line of txt.split("\n")) {
  const body = line.split("#")[0].trim();
  if (!body) continue;
  const parts = body.split(";").map((s) => s.trim());
  if (parts.length < 2) continue;
  const src = parts[0].split(/\s+/), tgt = parts[1].split(/\s+/);
  if (src.length !== 1 || tgt.length !== 1) continue; // single glyph -> single glyph only
  const sc = parseInt(src[0], 16), tc = parseInt(tgt[0], 16);
  if (!Number.isFinite(sc) || !Number.isFinite(tc)) continue;
  if (!ASCII_ALNUM(tc)) continue; // only homoglyphs that resolve to an ASCII alphanumeric
  mappings[String(sc)] = tc;
}

const prior = {
  schema: "ConfusablesPrior@1",
  giver: {
    name: "Unicode Security Mechanisms — confusables.txt (UTS #39)",
    url: "https://www.unicode.org/Public/security/latest/confusables.txt",
    license: "Unicode License (https://www.unicode.org/terms_of_use.html)",
    note: "projection restricted to single-codepoint homoglyphs resolving to a single ASCII alphanumeric — the cross-script confusable attack case",
  },
  count: Object.keys(mappings).length,
  mappings,
};
fs.writeFileSync(OUT, JSON.stringify(prior));
console.log(`wrote ${OUT}: ${prior.count} single-glyph → ASCII-alphanumeric mappings`);
