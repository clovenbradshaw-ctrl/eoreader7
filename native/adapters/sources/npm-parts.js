// adapters/sources/npm-parts.js — published parts, found on the fly: the npm
// registry's search (which states each package's license) and jsDelivr's
// version-pinned files (a package@version/path address never changes). Every
// answer is kept on disk, so a part is fetched once and a build can be
// replayed offline from what it used. No regular expressions.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const safe = (s) => String(s).split("/").join("__").split("@").join("_at_").split(":").join("--").split("?").join("_").split("&").join("_").split("=").join("_").split(" ").join("_");

/** makeNpmParts({ dir, fetch, timeoutMs }) -> { search, files, file } */
export function makeNpmParts({ dir, fetch: doFetch = globalThis.fetch, timeoutMs = 10000 } = {}) {
  const cached = async (key, get) => {
    const file = dir ? path.join(dir, `${safe(key)}.json`) : null;
    if (file && fs.existsSync(file)) { try { return JSON.parse(fs.readFileSync(file, "utf8")).value; } catch {} }
    let value = null;
    try { value = await get(); } catch { return null; }   // a failure is not kept: a later build may try again
    if (file && value != null) { try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ key, fetched: new Date().toISOString(), value })); } catch {} }
    return value;
  };
  const get = async (url, as = "json") => {
    const res = await doFetch(url, { headers: { "user-agent": "eoreader7" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`${res.status}`);
    return as === "json" ? res.json() : as === "bytes" ? res.arrayBuffer() : res.text();
  };
  return {
    /** packages matching `text`, each with the license the registry states */
    search: (text, size = 8) => cached(`search:${text}:${size}`, async () => (await get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=${size}`)).objects.map((o) => ({ name: o.package.name, version: o.package.version, license: o.package.license ?? null, description: o.package.description ?? "" }))),
    /** every file in one pinned version: [{ path, size }] */
    files: (name, version) => cached(`files:${name}@${version}`, async () => (await get(`https://data.jsdelivr.com/v1/packages/npm/${name}@${version}?structure=flat`)).files.map((f) => ({ path: f.name, size: f.size }))),
    /** one pinned file, exactly as served: { url, text, bytes (base64), sha256 of the bytes } */
    file: (name, version, p) => cached(`file:${name}@${version}${p}`, async () => {
      const url = `https://cdn.jsdelivr.net/npm/${name}@${version}${p}`;
      const raw = Buffer.from(await get(url, "bytes"));
      return { url, text: raw.toString("utf8"), bytes: raw.toString("base64"), sha256: crypto.createHash("sha256").update(raw).digest("hex") };
    }),
  };
}
