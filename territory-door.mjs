// Workspace doorway. Reading an opened document remains the /v1/read seam.
import { randomUUID } from "node:crypto";
import { openFolder, readDocument } from "./native/adapters/sources/folder-index.js";
import { ask } from "./native/organs/territory.js";

const handles = new Map();
export async function route(req, res) {
  if (req.method !== "POST" || req.url?.split("?")[0] !== "/v1/territory") return false;
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) { res.writeHead(413); res.end(); return true; }
  }
  let body;
  try { body = JSON.parse(raw); }
  catch { res.writeHead(400); res.end(JSON.stringify({ gap: { kind: "invalid_json" } })); return true; }
  const send = (status, data) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(data)); };
  if (body.id) {
    const handle = handles.get(body.id);
    if (!handle) { send(404, { gap: { kind: "territory_absent" } }); return true; }
    if (Number.isInteger(body.document)) {
      const document = readDocument(handle, body.document);
      if (document) send(200, { id: body.id, documents: [document] });
      else send(404, { gap: { kind: "document_absent" } });
    } else if (typeof body.q === "string") send(200, { id: body.id, ...ask(handle.index, body.q) });
    else send(400, { gap: { kind: "query_required", reason: "declare q to locate documents" } });
    return true;
  }
  const root = body.root ?? req.headers["x-er7-workspace"];
  if (typeof root !== "string" || !root) { send(400, { gap: { kind: "root_required" } }); return true; }
  try {
    const handle = await openFolder(root), id = randomUUID();
    // Process-local views are bounded; callers receive a typed miss after eviction.
    if (handles.size >= 32) handles.delete(handles.keys().next().value);
    handles.set(id, handle);
    send(200, { id, files: handle.files, gaps: handle.gaps, timings: handle.timings, documents: handle.documents.map((d, n) => ({ n, name: d.name })) });
  } catch (e) { send(400, { gap: { kind: "workspace_unreadable", reason: e.code ?? e.message } }); }
  return true;
}
