// derive-ohs.mjs — build plans/ohs/{ground,ledger} from the ohs-custody repo.
//
// The custody repo is the source of truth: raw captures in bytes/, a
// pdfminer text layer in derived/ for the PDFs, one readings/<id>.json per
// capture, and sources.structured.json carrying each entry's claim and its
// ANCHOR — "short distinctive needles for machine location, not full
// quotations".
//
// WHY THIS RE-LOCATES EVERY ANCHOR. The readings carry text_offset values
// produced by the custody runner's own extractor. Offsets are only meaningful
// against the exact text they were measured on, so importing them and
// pointing them at text WE extracted would be a citation that happens to
// contain a number. Instead this locates each anchor string inside our own
// extraction and records OUR offsets. An anchor we cannot find is not
// written — it is reported, and the row simply does not exist. The gate then
// has something it can actually check.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CUSTODY = join(HERE, "..", "..", "ohs-custody");
const OUT = join(HERE, "ohs");
const GROUND = join(OUT, "ground");
const LEDGER = join(OUT, "ledger");

const sha = (b) => createHash("sha256").update(b).digest("hex");

// ── HTML → text ───────────────────────────────────────────────────────────
// Deliberately plain: drop the parts of the page that are not the document
// (script, style, nav furniture), unwrap the rest, decode the handful of
// entities that actually appear. No DOM, no dependency, and — importantly —
// deterministic, so the same capture always yields the same offsets.
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#160": " ", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
function htmlToText(html) {
  let t = html;
  t = t.replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ");
  t = t.replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|blockquote|td)>/gi, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<li\b[^>]*>/gi, "\n• ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/&([a-zA-Z#0-9]{2,6});/g, (m, e) => (ENT[e] ?? ENT[e.toLowerCase()] ?? m));
  t = t.replace(/[ \t ]+/g, " ");
  t = t.replace(/ *\n */g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// Anchors were written by a human reading the page, so they may differ from
// the extraction in whitespace or quote characters. Matching is done on a
// normalised projection, then mapped back to real offsets in the real text.
function normalise(s) {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-").replace(/\s+/g, " ").toLowerCase();
}
function locate(text, needle) {
  const direct = text.indexOf(needle);
  if (direct !== -1) return [direct, direct + needle.length];
  // normalised search with an index map back to source offsets
  const map = [];
  let norm = "";
  let prevSpace = false;
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (/\s/.test(c)) {
      if (prevSpace) continue;
      c = " "; prevSpace = true;
    } else prevSpace = false;
    c = c.replace(/[‘’]/, "'").replace(/[“”]/, '"').replace(/[‐-―]/, "-");
    norm += c.toLowerCase();
    map.push(i);
  }
  const n = normalise(needle);
  const at = norm.indexOf(n);
  if (at === -1) return null;
  const start = map[at];
  const endIdx = Math.min(at + n.length - 1, map.length - 1);
  return [start, map[endIdx] + 1];
}

// The row shows the sentence the anchor sits in, so a reader sees a claim
// rather than a fragment — and THE SPAN IS THAT SENTENCE. A row whose span
// and whose text are different bytes is not a citation, it is a number that
// happens to sit next to a quote; the gate rejects it, and rightly.
function sentenceSpan(text, s, e) {
  let a = s, b = e;
  while (a > 0 && !/[.!?\n]/.test(text[a - 1]) && s - a < 320) a--;
  while (b < text.length && !/[.!?\n]/.test(text[b]) && b - e < 320) b++;
  if (b < text.length && /[.!?]/.test(text[b])) b++;
  while (a < b && /\s/.test(text[a])) a++;
  while (b > a && /\s/.test(text[b - 1])) b--;
  return [a, b];
}

// ── read the custody repo ────────────────────────────────────────────────
// The two manifests carry different halves of the same entry: the structured
// one has the claim, anchor, tier and status; the plain one has the doctype.
// Read both or the doctype registry renders a single empty bucket.
const structured = JSON.parse(readFileSync(join(CUSTODY, "sources.structured.json"), "utf8"));
const plain = JSON.parse(readFileSync(join(CUSTODY, "sources.json"), "utf8"));
const plainById = new Map((plain.entries ?? []).map((e) => [e.id, e]));
const byId = new Map(structured.entries.map((e) => [e.id, { ...(plainById.get(e.id) ?? {}), ...e }]));
const readingFiles = readdirSync(join(CUSTODY, "readings")).filter((f) => f.endsWith(".json"));

mkdirSync(GROUND, { recursive: true });
mkdirSync(LEDGER, { recursive: true });

const docs = [];
const rows = [];
const skipped = [];

for (const rf of readingFiles) {
  const r = JSON.parse(readFileSync(join(CUSTODY, "readings", rf), "utf8"));
  const id = r.id;
  const entry = byId.get(id);
  const isPdf = String(r.media_type || "").includes("pdf");

  // the text: pdfminer's layer where the custody repo produced one, else our
  // own extraction from the retained bytes
  let text = null;
  let extraction = null;
  const derivedTxt = join(CUSTODY, "derived", `${id}.txt`);
  const renderedTxt = join(CUSTODY, "derived", `${id}.rendered.txt`);
  if (existsSync(derivedTxt)) { text = readFileSync(derivedTxt, "utf8"); extraction = "pdf-text-layer (custody)"; }
  else if (existsSync(renderedTxt)) { text = readFileSync(renderedTxt, "utf8"); extraction = "rendered (custody)"; }
  else {
    const binPath = join(CUSTODY, r.path || `bytes/${id}.bin`);
    if (!existsSync(binPath)) { skipped.push([id, "no bytes retained"]); continue; }
    const raw = readFileSync(binPath);
    if (isPdf) { skipped.push([id, "pdf with no extracted text layer"]); continue; }
    text = htmlToText(raw.toString("utf8"));
    extraction = "html-to-text (deterministic, this script)";
  }
  if (!text || text.trim().length < 200) { skipped.push([id, `text too short (${text ? text.length : 0} chars)`]); continue; }

  const txtPath = join(GROUND, `${id}.txt`);
  writeFileSync(txtPath, text);

  // page map: the custody pages.json when it exists, else one page
  let pagemap = [{ page: 1, byteStart: 0, byteEnd: text.length }];
  const pagesJson = join(CUSTODY, "derived", `${id}.pages.json`);
  if (existsSync(pagesJson)) {
    try {
      const pages = JSON.parse(readFileSync(pagesJson, "utf8"));
      const arr = Array.isArray(pages) ? pages : pages.pages;
      if (Array.isArray(arr) && arr.length) {
        pagemap = arr.map((p, i) => ({
          page: p.page ?? i + 1,
          byteStart: p.start ?? p.text_offset ?? 0,
          byteEnd: p.end ?? (((p.text_offset ?? 0) + (p.text_length ?? 0)) || text.length),
        }));
      }
    } catch { /* one page stands */ }
  }
  writeFileSync(`${txtPath}.pagemap.json`, JSON.stringify(pagemap));

  const prov = {
    id,
    title: (entry?.label || id).replace(/\s*—.*$/, ""),
    source_url: r.source_url ?? entry?.url ?? "",
    final_url: r.final_url ?? "",
    media_type: r.media_type ?? "",
    retrieved_at: r.retrieved_at ?? "",
    wayback_timestamp: r.wayback_timestamp ?? "",
    capture: [{ sha256: r.sha256 ?? "", bytes: r.bytes ?? 0 }],
    txt: { sha256: sha(text), chars: text.length },
    extraction,
    tier: entry?.tier ?? "",
    doctype: entry?.doctype ?? "",
    license: "public record — captured for custody",
  };
  writeFileSync(`${txtPath}.provenance.json`, JSON.stringify(prov, null, 1));

  docs.push({ id, title: prov.title, chars: text.length, pages: pagemap.length, tier: prov.tier, doctype: prov.doctype });

  // ── the ledger row: the anchor, located in OUR text ────────────────────
  const anchor = entry?.anchor;
  if (!anchor) { skipped.push([id, "no anchor declared"]); continue; }
  const span = locate(text, anchor);
  if (!span) { skipped.push([id, `anchor not found in our extraction: "${String(anchor).slice(0, 48)}…"`]); continue; }
  const cite = sentenceSpan(text, span[0], span[1]);
  const page = (pagemap.find((p) => cite[0] >= p.byteStart && cite[0] < p.byteEnd) ?? pagemap[0]).page;
  rows.push({
    id: `ohs:${id}`,
    doc: `ohs/ground/${id}.txt`,
    at: cite,
    // The span is the exact bytes; the verbatim is those bytes as the
    // resolver renders them (snipAt collapses whitespace), so the gate is
    // comparing like with like rather than punishing a line break.
    verbatim: text.slice(cite[0], cite[1]).replace(/\s+/g, " ").trim(),
    kind: "claim",
    page,
    fields: {
      agency: entry?.used_for ? "" : "",
      tier: entry?.tier ?? "",
      status: entry?.status ?? "",
      used_for: entry?.used_for ?? "",
      claim: entry?.claim ?? "",
    },
    basis: `anchor located in the retained text · ${prov.extraction}`,
  });
}

writeFileSync(join(LEDGER, "plans-ohs.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(LEDGER, "summary.json"), JSON.stringify({
  built_at: new Date().toISOString(),
  source: "ohs-custody",
  docs: docs.length,
  rows: rows.length,
  skipped: skipped.length,
  skipped_detail: skipped.map(([id, why]) => ({ id, why })),
}, null, 1));

console.log(`ground: ${docs.length} documents`);
console.log(`ledger: ${rows.length} anchored rows`);
console.log(`skipped: ${skipped.length}`);
for (const [id, why] of skipped.slice(0, 12)) console.log(`  · ${id} — ${why}`);
if (skipped.length > 12) console.log(`  … ${skipped.length - 12} more, all listed in ledger/summary.json`);
