// block-ground.mjs — THE GROUND (Void · Existence·Ground).
//
// Fold invariant: NOTHING IS CITED THAT ISN'T RETAINED, HASHED, AND
// PAGE-BRIDGED. This block acquires or verifies a document corpus: for each
// manifest doc, the PDF bytes are pinned by sha256 (never re-fetched when
// intact), a deterministic text layer is extracted, a pagemap bridges text
// bytes to PDF pages, a provenance sidecar records url/license/hashes, and
// an alternating digest pins the whole ground. Idempotent; fails loudly on
// any hash or conversion mismatch — the ground must be integral or absent.
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

export const GROUND_SCHEMA = "EOGround@1";

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
  writeFileSync(`${txtPath}.pagemap.json`, JSON.stringify(pages));
  return pages;
}

/**
 * retainGround({ manifest, dir, seedBase }) -> { schema, digest, docs }
 * `manifest.docs[]`: { id, url, pdf_sha256?, seedFrom?, extraction? }.
 * `seedBase` is the directory relative to which `seedFrom` paths resolve
 * (a verified local copy — no network). Deterministic digest: the manifest
 * order alternated with each txt's sha256.
 */
export async function retainGround({ manifest, dir, seedBase = null }) {
  mkdirSync(dir, { recursive: true });
  const parts = [];
  const docs = [];
  for (const doc of manifest.docs) {
    const base = join(dir, doc.id);
    const pdf = `${base}.pdf`;
    const txt = `${base}.txt`;
    const sidecar = `${txt}.provenance.json`;
    if (!existsSync(pdf)) {
      if (doc.seedFrom && seedBase && existsSync(join(seedBase, doc.seedFrom))) {
        copyFileSync(join(seedBase, doc.seedFrom), pdf);
        if (doc.pdf_sha256 && sha(pdf) !== doc.pdf_sha256) throw new Error(`${doc.id}: seeded copy fails pinned sha256`);
      } else {
        const tmp = `${pdf}.tmp`;
        rmSync(tmp, { force: true });
        await download(doc.url, tmp);
        const h = sha(tmp);
        if (doc.pdf_sha256 && h !== doc.pdf_sha256) throw new Error(`${doc.id}: download fails pinned sha256 (${h})`);
        if (!doc.pdf_sha256) doc.pdf_sha256 = h;
        copyFileSync(tmp, pdf);
        rmSync(tmp, { force: true });
      }
    } else if (doc.pdf_sha256 && sha(pdf) !== doc.pdf_sha256) {
      throw new Error(`${doc.id}: on-disk pdf fails pinned sha256`);
    }
    extractText(pdf, txt, doc.extraction ?? "layout");
    const pages = buildPagemap(txt);
    const chars = readFileSync(txt, "utf8").length;
    const pdf_sha256 = sha(pdf);
    const txt_sha256 = sha(txt);
    writeFileSync(sidecar, JSON.stringify({
      title: doc.title, publisher: doc.publisher, adopted: doc.adopted,
      url: doc.url, license: doc.license,
      extraction: { tool: "pdftotext", mode: doc.extraction ?? "layout" },
      pdf_sha256, txt_sha256, chars, pages: pages.length,
    }, null, 2));
    parts.push(`${doc.id}\n${txt_sha256}\n`);
    docs.push({ id: doc.id, title: doc.title, category: doc.category, scale: doc.scale,
      publisher: doc.publisher, adopted: doc.adopted, url: doc.url, license: doc.license,
      extraction: doc.extraction ?? "layout", pdf_sha256, txt_sha256, chars, pages: pages.length,
      pdfPath: pdf, txtPath: txt, sidecarPath: sidecar, pagemapPath: `${txt}.pagemap.json` });
  }
  const digest = createHash("sha256").update(parts.join("")).digest("hex");
  return { schema: GROUND_SCHEMA, digest, docs };
}

/** The alternating digest of a retained ground — recomputed from the FILES
 * at gate time (never from stored hashes), so a tampered byte anywhere in
 * the corpus changes it and the gate refuses the whole surface. */
export function groundDigest({ docs }) {
  const parts = docs.map((d) => `${d.id}\n${sha(d.txtPath)}\n`).join("");
  return createHash("sha256").update(parts).digest("hex");
}