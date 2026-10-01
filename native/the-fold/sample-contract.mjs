// ═══ LOVELACE · TEACH IT TO FISH ═══ FROM A REAL SAMPLE TO A CONTRACT — the model POINTS, the bytes decide, the species fill.
//   node native/the-fold/sample-contract.mjs --sample-dir <find-samples out> --fields "pm2.5,pm10" --out <dir>
// Takes the sample find-samples kept (a URL and its bytes), makes REAL variants of the same call (the numeric place parameters moved by declared
// offsets, each fetched — never computed), and for each field the person named asks the local model ONE thing: which of these numbered paths holds it.
// The model points at a path the system gathered; it never writes a path. Then:
//   name evidence   the field's words (punctuation stripped) must appear in the chosen path's keys — a pointer with no name behind it is a typed gap, not a guess
//   Tracing         the path must exist in EVERY variant and its value there is the oracle's `want` — the bytes are the answer key, nobody typed one
//   species         cheapFill rediscovers the path from the values alone over held-out variants; if it disagrees with the pointer, that is recorded, never smoothed
// The control (II.23): the same fields with the pointers REDEALT among themselves must be refused by name evidence; a run where they are not is unlicensed.
import fs from "node:fs";
import path from "node:path";
import { cultivate } from "../organs/cultivating.js";
import { leavesOf, traceSample, indexGround, traceClaim } from "../organs/tracing.js";
import { cheapFill } from "./fielded-swarm.mjs";
import { makeFetcher, openSeenLedger } from "./comp-research.mjs";
import { sampleCheck } from "./find-samples.mjs";

/** declared offsets (degrees) applied to the call's own latitude/longitude parameters to get other real places; set by hand, not tuned */
export const PLACE_OFFSETS = Object.freeze([[10, 20], [-15, -40], [30, 100], [-33, 150]]);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const kindOf = (p) => p.replace(/\[\d+\]/g, "[]");

/** the call's variants: the same URL with each latitude-like and longitude-like parameter moved. -> [url] */
export function variantsOf(url) {
  const u = new URL(url), out = [];
  for (const [dLat, dLon] of PLACE_OFFSETS) {
    const v = new URL(url); let moved = false;
    for (const [k, val] of u.searchParams) {
      const n = Number(val); if (!Number.isFinite(n)) continue;
      if (/^lat/i.test(k)) { v.searchParams.set(k, String(Math.round(Math.max(-80, Math.min(80, n + dLat)) * 100) / 100)); moved = true; }
      else if (/^(lon|lng)/i.test(k)) { v.searchParams.set(k, String(Math.round((((n + dLon + 540) % 360) - 180) * 100) / 100)); moved = true; }
    }
    if (moved) out.push(v.toString());
  }
  return out;
}

/** the numbered candidates the model may point at: each numeric path-kind of the first document, as its first-element path */
export function candidatePaths(doc) {
  const seen = new Map();
  for (const l of leavesOf(doc)) if (typeof l.value === "number") { const k = kindOf(l.path); if (!seen.has(k)) seen.set(k, l.path.replace(/\[\d+\]/g, (m, i) => m)); }
  return [...seen.entries()].map(([kind, first]) => ({ kind, path: first }));
}

/** name evidence: every word of the field phrase (alphanumerics only) appears in the path's own keys */
export function nameEvidence(field, p) {
  const words = String(field).toLowerCase().match(/[a-z]+\d*[._]?\d*/g)?.map(norm).filter(Boolean) ?? [], hay = norm(p);
  return words.length > 0 && words.every((w) => hay.includes(w));
}

const PICK = { type: "object", properties: { pick: { type: "integer" } }, required: ["pick"] };
export async function pointAt(model, field, cands, { ollama = "http://127.0.0.1:11434" } = {}) {
  const list = cands.map((c, i) => `${i}: ${c.path}`).join("\n");
  const body = { model, stream: false, format: PICK, options: { temperature: 0, num_ctx: 4096 }, messages: [{ role: "user", content: `Numbered paths of numbers in a JSON response:\n${list}\n\nWhich number is the path that holds: ${field}?` }] };
  const r = await fetch(`${ollama}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json(); let pick = null; try { pick = JSON.parse(j.message.content).pick; } catch {}
  return Number.isInteger(pick) && pick >= 0 && pick < cands.length ? pick : null;
}

/**
 * contractFromSample({ url, bytes, fields, model, out, fetcher }) -> { status, fields:[{field, pointed, path, evidence, traced, species, js}], docs, contract }
 */
export async function contractFromSample({ url, bytes, fields, model = "qwen2.5-coder:1.5b", out, fetcher = makeFetcher(), point = pointAt, log = () => {} }) {
  const L = openSeenLedger(out), first = JSON.parse(bytes), cands = candidatePaths(first);
  L.see("contract-begin", { url, fields, model, candidates: cands.length, offsets: PLACE_OFFSETS });
  const vs = variantsOf(url).map((u) => ({ id: u, url: u, get: async () => { const r = await fetcher(u, { accept: "application/json" }); L.see("variant-fetch", { url: u, status: r.status, bytes: r.bytes ?? 0 }); if (!r.ok) throw new Error(`status ${r.status}`); return r.text; } }));
  const got = await cultivate({ candidates: vs, check: sampleCheck([], 6, 3), need: vs.length, budget: vs.length });
  const docs = [{ id: url, bytes }, ...got.kept.map((k) => ({ id: k.id, bytes: k.bytes }))];
  L.see("variants", { wanted: vs.length, kept: got.kept.length, losers: got.losers });
  const index = indexGround(docs), rows = [];
  for (const field of fields) {
    const pick = await point(model, field, cands), row = { field, pointed: pick == null ? null : cands[pick].path };
    if (pick == null) { row.status = "gap"; row.why = "the model pointed at no listed path"; rows.push(row); L.see("field", row); continue; }
    row.evidence = nameEvidence(field, row.pointed);
    if (!row.evidence) { row.status = "gap"; row.why = "no name evidence: the field's words are not in the pointed path's keys"; rows.push(row); L.see("field", row); continue; }
    const traced = docs.map((d) => traceClaim({ path: row.pointed, value: (leavesOf(JSON.parse(d.bytes)).find((l) => l.path === row.pointed) ?? {}).value }, index));
    row.traced = traced.every((t) => t.status === "traced"); row.status = row.traced && docs.every((d) => leavesOf(JSON.parse(d.bytes)).some((l) => l.path === row.pointed)) ? "bound" : "gap"; if (row.status === "gap") row.why = "the pointed path is not in every variant";
    rows.push(row); L.see("field", row);
  }
  // the oracle is the bytes: want = the value at the pointed path in each variant
  const bound = rows.filter((r) => r.status === "bound"), name = "fromSample";
  const runs = docs.map((d, i) => { const dd = JSON.parse(d.bytes), v = (p) => (leavesOf(dd).find((l) => l.path === p) ?? {}).value; return { name: i ? `variant ${i}` : "the shown one", args: () => [JSON.parse(d.bytes)], want: () => Object.fromEntries(bound.map((r) => [r.field.replace(/[^a-zA-Z0-9]+/g, "_"), v(r.pointed)])) }; });
  const contract = { name, params: ["doc"], runs };
  let cheap = {}; if (bound.length >= 1 && docs.length >= 4) { try { cheap = cheapFill(contract); } catch (e) { L.see("species-error", { error: String(e.message).slice(0, 120) }); } }
  for (const r of bound) { const k = r.field.replace(/[^a-zA-Z0-9]+/g, "_"); r.species = cheap[k]?.species ?? null; r.js = cheap[k]?.js ?? null; r.speciesAgrees = r.js ? runs.every((x) => { try { return Function("doc", `return ${r.js}`)(x.args()[0]) === x.want()[k]; } catch { return false; } }) : null; L.see("species", { field: r.field, species: r.species, js: r.js, agrees: r.speciesAgrees }); }
  // the control: the pointers redealt among the fields must be refused by name evidence
  const redealt = rows.filter((r) => r.pointed).map((r, i, a) => ({ field: r.field, pointed: a[(i + 1) % a.length].pointed })), controlRefused = redealt.length < 2 || redealt.every((r, i) => !nameEvidence(r.field, r.pointed) || r.pointed === rows.filter((x) => x.pointed)[i].pointed);
  L.see("control", { redealt, refused: controlRefused });
  return { status: bound.length === fields.length ? "bound" : bound.length ? "partial" : "gap", fields: rows, docs: docs.length, controlRefused, ledger: L.file, contract: { name, params: contract.params, fields: bound.map((r) => ({ field: r.field, path: r.pointed, js: r.js })) } };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const dir = path.resolve(arg("sample-dir")), seen = fs.readFileSync(path.join(dir, "seen.jsonl"), "utf8").trim().split("\n").map(JSON.parse), kept = seen.find((e) => e.event === "kept" && /hourly|current/.test(e.url) && (arg("prefer", "hourly") && e.url.includes(arg("prefer", "hourly"))));
  const k = kept ?? seen.find((e) => e.event === "kept"), r = await contractFromSample({ url: k.url, bytes: fs.readFileSync(path.join(dir, k.file), "utf8"), fields: arg("fields").split(",").map((s) => s.trim()), model: arg("model", "qwen2.5-coder:1.5b"), out: path.resolve(arg("out", "./sample-contract-out")) });
  console.log(JSON.stringify(r, null, 1));
}
