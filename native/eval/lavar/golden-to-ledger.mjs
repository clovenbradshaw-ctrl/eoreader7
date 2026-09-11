// golden-to-ledger.mjs — the Rosetta stone move: a hand-adjudicated,
// cross-language-keyed golden IS the good reading for a language the
// mechanical pipeline cannot yet read well (Arabic, Mandarin — see
// recurring-form-anchors.js and relation-priors-i18n.js's own disclosed
// limits). Rather than keep tuning the mechanical extractor against a
// case-less script it structurally cannot see into, this converts the
// ALREADY-CORRECT, ALREADY-SELF-VERIFIED expert reading
// (live_priors/goldens/reading/build-goldens.mjs's own P5.2 door) into a
// real ledger sidecar — the same EOTSource@1/EOTObservation@1 shape
// eot-jsonl.mjs's own mechanical readings produce, so every downstream
// consumer of a `.eot.jsonl` sidecar (the hyperlexicon door, the ledger
// block, corroboration) can use a hand-quality reading exactly as it would
// a mechanical one.
//
// WHAT IS NOT REDERIVED. build-goldens.mjs already locates every row,
// widens to a paragraph-bounded region, maps to RAW-file char coordinates,
// and self-verifies (LP3/P5.2) that the slice actually contains the row's
// own subject/relation/object words — that work is trusted, not repeated.
// This file's own job is narrower: map the golden's CHAR-space `span` into
// the ledger's own UTF-8 BYTE-space `at` (charToByte, byte-char-index.mjs —
// the SAME conversion eot-jsonl.mjs itself applies, reused not
// re-implemented), and re-verify the byte slice independently before
// writing a single line — an address is a birth, not a spelling (S80),
// and a converter is exactly the kind of code that could silently drift
// the coordinate space if it trusted the input without checking.
//
// THE ROSETTA KEY IS KEPT, NOT DROPPED. Every emitted proposition carries
// `prop`, the golden's own language-independent proposition id
// ("udhr:recognition-foundation" etc.) — this is what live_priors'
// ROSETTA-GOALS.md names as Goal 2's still-missing join key. A consumer
// can now join this ledger's own Arabic reading to the identical prop in
// the English/Spanish/Mandarin/Swahili ledgers this same script produces,
// which is the alignment-without-translation move the corpus was built
// for and, until this file, had no ledger-shaped output to actually do it
// with.
//
// PAragraph-WIDE, DISCLOSED. build-goldens.mjs's own span is a whole
// paragraph-bounded region around the row's anchor sentence, not a tight
// clause address — coarser than the mechanical pipeline's own per-clause
// addressing, and said so on every EOTSource@1 header this file writes,
// never presented as if it were clause-tight.
//
// usage: node golden-to-ledger.mjs <path-to-specimen.golden.json> <path-to-raw-source.txt> <output.eot.jsonl>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// EOREADER7_ROOT lets this script run from a scratch/test location during
// development; the real, committed copy lives at
// eoreader7/native/eval/lavar/golden-to-ledger.mjs where the default
// (three levels up from HERE) resolves correctly with no override needed.
const EOREADER7 = process.env.EOREADER7_ROOT ?? path.resolve(HERE, "..", "..", "..");

const goldenPath = process.argv[2];
const sourcePath = process.argv[3];
const outPath = process.argv[4];
if (!goldenPath || !sourcePath || !outPath) {
  console.error("usage: node golden-to-ledger.mjs <specimen.golden.json> <raw-source.txt> <output.eot.jsonl>");
  process.exit(1);
}

const { charToByte } = await import(path.join(EOREADER7, "native/eval/lavar/byte-char-index.mjs"));
const cube = await import(path.join(EOREADER7, "native/kernel/cube.js"));

const golden = JSON.parse(fs.readFileSync(path.resolve(goldenPath), "utf8"));
const raw = fs.readFileSync(path.resolve(sourcePath), "utf8");
const byteOf = charToByte(raw);

const collapse = (t) => String(t ?? "").replace(/_/g, "").replace(/\s+/g, " ").trim();

const lines = [];
let seq = 0;
const emit = (line) => { lines.push({ seq: seq++, ...line }); };
let nextId = 0;
const id = (p) => `${p}${++nextId}`;

const crypto = await import("node:crypto");
const sha256 = crypto.createHash("sha256").update(raw, "utf8").digest("hex");

emit({
  schema: "EOTSource@1",
  path: golden.path,
  sha256,
  bytes: byteOf(raw.length),
  newlines: raw.includes("\r\n") ? "crlf" : "lf",
  addressing: "every `at` below is [start,end) UTF-8 BYTE offsets into this source's real bytes, mapped from goldens/reading's own golden.json char-space spans via byte-char-index.mjs::charToByte — the same conversion eot-jsonl.mjs applies to its own mechanical readings.",
});

emit({
  schema: "EOTRecipe@1",
  recipeId: `golden-to-ledger:${golden.specimen}`,
  reader: "NOT a mechanical reading — every subject/relation/object/phasepost/because below is a HAND-ADJUDICATED reading (live_priors/goldens/reading/RULE.md, live_priors/goldens/reading/hand-udhr-*.mjs), converted from its own self-verified golden.json (build-goldens.mjs, P5.2/LP3) into this ledger's shape. A row's 'at' address is PARAGRAPH-WIDE (the golden's own construction — build-goldens.mjs widens to the enclosing blank-line-bounded region), coarser than this pipeline's own per-clause mechanical addressing; never presented as clause-tight.",
  language: golden.specimen,
  rosettaKey: "every proposition below carries 'prop', the language-independent id shared across every sibling language's own golden — the join key live_priors/goldens/reading/ROSETTA-GOALS.md's own Goal 2 names.",
});

let refused = 0;
for (const row of golden.rows ?? []) {
  const { span, prop, subject, relation, object, phasepost, because, ground, role, polarity, resolution, alternate } = row;
  if (!span || !relation) { refused += 1; continue; }
  const bStart = byteOf(span.start), bEnd = byteOf(span.end);
  // RE-VERIFY, independently of build-goldens.mjs's own check: the byte
  // slice (decoded back to a string) must still contain the relation's
  // own words, exactly as build-goldens.mjs already required at the
  // golden's own door — never trust a coordinate conversion silently.
  const sliceBuf = Buffer.from(raw, "utf8").subarray(bStart, bEnd);
  const slice = collapse(sliceBuf.toString("utf8"));
  // Case-INSENSITIVE containment: a sentence-initial English relation word
  // ("Proclaims") is capitalised in the real bytes but hand-typed lowercase
  // in the golden — a real bug found running this on udhr.golden.json
  // itself (English row 16 refused on exactly this), not a defect in the
  // address. build-goldens.mjs's own self-verify (collapse + toLowerCase
  // on both sides) already makes this comparison case-insensitive; this
  // re-verification now matches that discipline instead of being stricter
  // than the door it is re-checking.
  const relHead = collapse(relation).split(" ").pop();
  if (relHead && !slice.toLowerCase().includes(relHead.toLowerCase())) {
    emit({ schema: "EOTRefusal@1", at: [bStart, bEnd], role: "proposition", reason: "byte_reslice_lost_relation_word", label: relation });
    refused += 1;
    continue;
  }
  const cell = phasepost?.op && phasepost?.grain ? cube.cellOf(phasepost.op, phasepost.grain) : null;
  emit({
    schema: "EOTObservation@1", id: id("o"), at: [bStart, bEnd], role: "proposition",
    end1: subject ?? null, label: relation, end2: object ?? null,
    subjectBasis: resolution ? "resolved" : "stated",
    ...(resolution ? { resolutionNote: resolution } : {}),
    prop, ground: ground ?? null, propRole: role ?? null, polarity: polarity ?? "+",
    ...(cell ? { operator: phasepost.op, grain: phasepost.grain, terrain: cell.terrain, stance: cell.stance } : {}),
    because: because ?? null,
    ...(alternate ? { alternate } : {}),
    handAdjudicated: true,
  });
}

fs.writeFileSync(path.resolve(outPath), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
console.log(`${path.basename(outPath)}: ${lines.length} lines (${lines.filter((l) => l.schema === "EOTObservation@1").length} propositions, ${refused} refused) from ${golden.rows?.length ?? 0} golden rows -> ${outPath}`);
