// pull-nashville-plans.mjs — acquire the five Nashville plan PDFs into a
// byte-addressable ground: .pdf (pinned sha256), .txt (deterministic text
// layer), .txt.pagemap.json (text byte -> PDF page), .txt.provenance.json.
//
// Idempotent: never re-fetches or re-extracts an intact ground. Fails loudly
// (non-zero exit, no partial manifest) on any hash or conversion mismatch —
// the ground must be integral or absent.
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(HERE, "nashville", "manifest.json");
const GROUND = join(HERE, "nashville", "ground");

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download failed ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

function extractText(pdfPath, txtPath, mode) {
  if (existsSync(txtPath)) return; // intact ground stays
  execFileSync("pdftotext", mode === "raw" ? ["-raw", pdfPath, txtPath] : ["-layout", pdfPath, txtPath], { stdio: "pipe" });
}

function buildPagemap(txtPath) {
  const t = readFileSync(txtPath, "utf8");
  const breaks = [...t.matchAll(/\f/g)].map((m) => m.index);
  const pages = [];
  let from = 0;
  for (let i = 0; i <= breaks.length; i++) {
    const to = i < breaks.length ? breaks[i] : t.length;
    pages.push({ page: i + 1, byteStart: from, byteEnd: to });
    from = to + 1;
  }
  writeFileSync(txtPath + ".pagemap.json", JSON.stringify(pages));
  return pages;
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
mkdirSync(GROUND, { recursive: true });

for (const doc of manifest.docs) {
  const base = join(GROUND, doc.id);
  const pdf = `${base}.pdf`;
  const txt = `${base}.txt`;
  const sidecar = `${txt}.provenance.json`;

  // 1) acquire the PDF: intact on disk -> reuse; seeded copy -> verify; else fetch.
  if (existsSync(pdf) && (!doc.pdf_sha256 || sha(pdf) === doc.pdf_sha256)) {
    // already intact
  } else if (doc.seedFrom && existsSync(join(HERE, doc.seedFrom))) {
    copyFileSync(join(HERE, doc.seedFrom), pdf);
    if (doc.pdf_sha256 && sha(pdf) !== doc.pdf_sha256) throw new Error(`${doc.id}: seeded copy fails pinned sha256`);
  } else {
    const tmp = `${pdf}.tmp`;
    rmSync(tmp, { force: true });
    const bytes = await download(doc.url, tmp);
    const h = sha(tmp);
    if (doc.pdf_sha256 && h !== doc.pdf_sha256) throw new Error(`${doc.id}: download fails pinned sha256 (${h})`);
    if (!doc.pdf_sha256) doc.pdf_sha256 = h;
    copyFileSync(tmp, pdf);
    rmSync(tmp, { force: true });
    console.log(`  fetched ${doc.id} (${(bytes / 1e6).toFixed(1)} MB)`);
  }

  // 2) deterministic text layer.
  extractText(pdf, txt, doc.extraction ?? "layout");
  const pages = buildPagemap(txt);
  const chars = readFileSync(txt, "utf8").length;

  // 3) provenance sidecar (canon pattern, extended).
  writeFileSync(sidecar, JSON.stringify({
    title: doc.title, publisher: doc.publisher, adopted: doc.adopted,
    url: doc.url, license: doc.license,
    extraction: { tool: "pdftotext", mode: doc.extraction ?? "layout" },
    pdf_sha256: sha(pdf), txt_sha256: sha(txt), chars, pages: pages.length,
  }, null, 2));

  console.log(`  ${doc.id}: ${(existsSync(pdf) ? "" : "OK ")}${chars} chars / ${pages.length} pages / pdf ${sha(pdf).slice(0, 12)}`);
}

// Manifest only written after every doc is integral.
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log("\nground integral — 5 docs in", GROUND);