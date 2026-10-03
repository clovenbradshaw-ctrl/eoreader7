// Bounded local workspace admission. Symlinks and binary files are not followed.
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { indexDocuments } from "../../organs/territory.js";

const excluded = new Set([".git", "node_modules", ".venv", "__pycache__"]);
export async function openFolder(root, { limit = 60000, maxFileBytes = 2 * 1024 * 1024 } = {}) {
  root = await fs.realpath(root);
  const start = performance.now(), documents = [], gaps = [];
  async function walk(dir) {
    const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (documents.length >= limit) { gaps.push({ kind: "file_limit", limit }); return; }
      const abs = path.join(dir, entry.name), name = path.relative(root, abs).split(path.sep).join("/");
      if (entry.isSymbolicLink()) { gaps.push({ name, kind: "symlink_not_followed" }); continue; }
      if (entry.isDirectory()) { if (!excluded.has(entry.name)) await walk(abs); continue; }
      if (!entry.isFile()) continue;
      try {
        const stat = await fs.stat(abs);
        if (stat.size > maxFileBytes) { gaps.push({ name, kind: "file_byte_limit", maxFileBytes }); continue; }
        const bytes = await fs.readFile(abs);
        if (bytes.includes(0)) { gaps.push({ name, kind: "binary_file" }); continue; }
        let text;
        try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
        catch { gaps.push({ name, kind: "non_utf8" }); continue; }
        documents.push({ name, text });
      } catch (e) { gaps.push({ name, kind: "unreadable", reason: e.code }); }
    }
  }
  await walk(root);
  const crawled = performance.now(), index = indexDocuments(documents);
  return { root, index, documents, gaps, files: { found: documents.length }, timings: { crawl: crawled - start, stat: 0, index: performance.now() - crawled, assemble: 0 } };
}

export function readDocument(handle, n, limit = Infinity) {
  const doc = handle.documents[n];
  return doc ? { name: doc.name, text: doc.text.slice(0, limit), truncated: doc.text.length > limit } : null;
}
