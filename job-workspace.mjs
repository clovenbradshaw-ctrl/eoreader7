// job-workspace.mjs — a document job's workspace, from documents a surface holds in memory (2026-09-30).
//
// POST /v1/documents accepted a `workspace` filesystem path and nothing else, so a surface whose sources live in a
// browser (holodeck) could never give a job its ground. A surface now sends `documents: [{ name, text }]`; this writes
// them into one per-job directory and the job reads that directory exactly as it reads any workspace. The capability
// lives here, in the proxy; the surface stays a thin client.
//
// A NAME COMES FROM OUTSIDE THE MACHINE. It is data, never a path: reduced to a basename of [A-Za-z0-9._-], bounded,
// and de-duplicated in order, so two sources with one title both survive. Limits are typed refusals, never a silent
// truncation. A write that fails removes what it made, so a job never reads half a workspace.
import fs from "node:fs";
import path from "node:path";

export class JobWorkspaceError extends Error { constructor(message, type) { super(message); this.name = "JobWorkspaceError"; this.type = type; } }

export const DEFAULT_LIMITS = Object.freeze({ maxDocs: 200, maxDocChars: 1_000_000, maxTotalChars: 8_000_000 });

export function safeName(name) {
  const base = String(name ?? "").replace(/\0/g, "").split(/[\\/]/).pop() ?? "";
  let n = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "").slice(0, 80);
  if (/^_*$/.test(n) || /^\.+$/.test(n)) n = "document";
  return n;
}

const withExt = (n) => (/\.[A-Za-z0-9]{1,5}$/.test(n) ? n : n + ".txt");

/**
 * writeJobWorkspace({ dir, documents, limits }) → { dir, files: [{ file, name, chars }] }
 * Every refusal it can see is raised, typed, before anything is written.
 */
export function writeJobWorkspace({ dir, documents, limits = {} } = {}) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  if (!Array.isArray(documents)) throw new JobWorkspaceError("documents must be a list of { name, text }", "documents_not_a_list");
  if (!documents.length) throw new JobWorkspaceError("documents is empty: nothing to hand over", "no_documents");
  if (documents.length > L.maxDocs) throw new JobWorkspaceError(`${documents.length} documents exceed the limit of ${L.maxDocs}`, "too_many_documents");
  let total = 0;
  for (const d of documents) {
    if (typeof d?.name !== "string") throw new JobWorkspaceError("every document needs a string name", "document_without_name");
    if (typeof d?.text !== "string") throw new JobWorkspaceError(`document "${String(d.name).slice(0, 40)}" has no text`, "document_without_text");
    if (d.text.length > L.maxDocChars) throw new JobWorkspaceError(`document "${d.name.slice(0, 40)}" is ${d.text.length} characters, over the limit of ${L.maxDocChars}`, "document_too_large");
    total += d.text.length;
  }
  if (total > L.maxTotalChars) throw new JobWorkspaceError(`${total} characters in all exceed the limit of ${L.maxTotalChars}`, "documents_too_large");

  const used = new Map(), files = [];
  try {
    fs.mkdirSync(dir, { recursive: true });
    for (const d of documents) {
      let file = withExt(safeName(d.name));
      const k = (used.get(file) ?? 0) + 1; used.set(file, k);
      if (k > 1) file = file.replace(/(\.[A-Za-z0-9]{1,5})$/, `_${k}$1`);
      fs.writeFileSync(path.join(dir, file), d.text, "utf8");
      files.push({ file, name: d.name, chars: d.text.length });
    }
  } catch (e) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    throw e instanceof JobWorkspaceError ? e : new JobWorkspaceError(`could not write the workspace: ${e.message}`, "workspace_write_failed");
  }
  return { dir, files };
}
