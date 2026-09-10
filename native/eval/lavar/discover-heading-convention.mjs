// discover-heading-convention.mjs — testing the idea raised after fixing the
// Dorian Gray heading bug by hand: could the SAME discovery organ that found
// "chrome" as a regularity of arrangement (the-fold's discovered-reading-
// kinds.mjs, corrected 2026-09-03 away from "a model proposes a rule" toward
// "the organ discovers what recurs") have found the title-line convention
// too, instead of me hand-patching a regex once I saw it fail?
//
// THE ORGAN, UNMODIFIED. kind-standing.js::discoverCompanyKinds groups a
// vocabulary of line-shapes by the dominant shape that comes BEFORE each one,
// at a declared share floor, gated by a null arm that shuffles each
// document's own line order (marginals kept, sequence destroyed). Nothing
// about "chapter" or "title" is named to it.
//
// ONLY THE STREAM CHANGES, and even that is the same lineShape() function
// discovered-reading-kinds.mjs already uses (characters collapsed to
// classes, length-bucketed, blind to language). The one seam: the question
// here is "what dominantly comes AFTER a heading line", and the organ only
// ever asks "before". Composed, not modified: reverse the document's line
// sequence before handing it to the organ, and "before" in reversed order is
// exactly "after" in the real reading order — a legitimate reuse of an
// unmodified organ, the same posture omnimodal-discovery.mjs uses to point
// it at four different media without touching a line of its code.
//
// usage: node discover-heading-convention.mjs <bookPath>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..", "..");
const { discoverCompanyKinds } = await import(path.join(NATIVE, "organs", "kind-standing.js"));

const CAP = 4;
const lineShape = (s) => {
  const cls = String(s).trim().replace(/[\p{L}\p{M}]+/gu, "a").replace(/\p{N}+/gu, "0").replace(/\s+/gu, "_").replace(/[^a0_]+/gu, ".");
  const n = String(s).trim().length;
  return `${n < 24 ? "S" : n < 72 ? "M" : "L"}${cls.replace(/(.)\1+/g, "$1").slice(0, CAP)}`;
};

const bookPath = process.argv[2];
if (!bookPath) { console.error("usage: node discover-heading-convention.mjs <bookPath>"); process.exit(1); }
const raw = fs.readFileSync(bookPath, "utf8");
const lines = raw.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);

const headingRE = /^CHAPTER [IVXLC]+\.?$/;
const headingLines = lines.filter((l) => headingRE.test(l));
if (!headingLines.length) { console.log("no 'CHAPTER <roman>' lines found at all"); process.exit(0); }
const headingShape = lineShape(headingLines[0]);
console.log(`${path.basename(bookPath)}: ${headingLines.length} heading lines found, all sharing shape "${headingShape}": ${new Set(headingLines.map(lineShape)).size === 1}`);

const shapes = lines.map(lineShape);
const reversedShapes = [...shapes].reverse();
const vocabulary = [...new Set(shapes)];
const sentences = [{ text: reversedShapes.join(" ") }];

const DRAWS = 200, ALPHA = 0.05, SEED = 0;
const kinds = discoverCompanyKinds(sentences, vocabulary, {
  minMentions: 4, minShare: 0.4, minMembers: 2,
  clean: (t) => t, // identity — a shape is not text (same seam omnimodal-discovery.mjs declares)
  nullArm: { draws: DRAWS, seed: SEED, alpha: ALPHA },
});

console.log(`${kinds.length} kinds cleared the null arm (draws ${DRAWS}, alpha ${ALPHA})`);
const owning = kinds.find((k) => k.members.includes(headingShape));
if (owning) {
  console.log(`DISCOVERED: the heading shape "${headingShape}" is a member of ${owning.name}`);
  console.log(`  -> in real reading order, this means: "${headingShape}" is dominantly FOLLOWED by a line of shape "${owning.signature.replace("before=", "")}", share ${owning.share.get(headingShape).toFixed(3)} (null ceiling ${owning.nullCeiling.get(headingShape)?.toFixed(3)})`);
} else {
  console.log(`NOT DISCOVERED: no kind containing "${headingShape}" cleared the null arm — no consistent line-shape dominantly follows a chapter heading in this book, at these floors.`);
}

// What ACTUALLY follows each heading, for a human to check the verdict against.
const afterHeading = [];
for (let i = 0; i < lines.length - 1; i += 1) if (headingRE.test(lines[i])) afterHeading.push(lineShape(lines[i + 1]));
const tally = new Map();
for (const s of afterHeading) tally.set(s, (tally.get(s) ?? 0) + 1);
console.log(`ground truth — shape immediately after each heading line: ${[...tally.entries()].map(([s, n]) => `${s}=${n}`).join(", ")}`);
