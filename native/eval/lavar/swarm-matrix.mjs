// swarm-matrix.mjs — the swarm on the wire. A thing hardening on one device
// is emitted as a Matrix event; another device folds it in as a NOMINEE until
// ITS OWN elenchus corroborates it (chapter-swarm: nomination is never
// licensing). The event grammar is matrix-events' own nine operators:
//   INS  a variant was kept (an instance exists)
//   SYN  a breakthrough was preserved (the composite finding)
//   DEF  a thing was named (self-name + label bound to the variant)
//
// TRANSPORT. The default transport is a LOCAL EVENT MIRROR — an append-only
// event stream (results/swarm-matrix-events.jsonl) that the finder's
// `matrix` surface reads after `receive`. The LIVE transport is declared as
// an extension point: `--transport live` loads matrix-events
// (~/Documents/matrix-events) and logs into your homeserver from
// MATRIX_HOMESERVER / MATRIX_USER / MATRIX_PASSWORD; the same events are then
// real E2EE timeline events in a device room. The mirror is what makes the
// bridge testable and live-ready without credentials.
//
// usage:
//   node swarm-matrix.mjs publish   — emit this device's kept winners + named things
//   node swarm-matrix.mjs receive   — fold remote events in as remote nominations
//   node swarm-matrix.mjs --transport live publish
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readBreakthroughs, harden } from "./swarm-things.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const MIRROR = path.join(RESULTS, "swarm-matrix-events.jsonl");       // append-only event stream
const REMOTE = path.join(RESULTS, "swarm-matrix-breakthroughs.jsonl"); // the finder's `matrix` surface
const DEVICE_ID_FILE = path.join(RESULTS, ".device-id");

/** deviceId() — this device's stable identity, created once: a content hash
 * of first-run entropy, the "fold at a point" the device's history grows
 * from. Deterministic per machine; never shared. */
export function deviceId() {
  if (fs.existsSync(DEVICE_ID_FILE)) return fs.readFileSync(DEVICE_ID_FILE, "utf8").trim();
  const seed = `${Date.now()}-${Math.random()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const id = `dev:${(h >>> 0).toString(36)}`;
  fs.writeFileSync(DEVICE_ID_FILE, id + "\n");
  return id;
}

/** eventId(op, body) — the event's content address: dedupes, never replays. */
export function eventId(op, body) {
  const record = `${op}|${JSON.stringify(body)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < record.length; i += 1) { h ^= record.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${op}:${(h >>> 0).toString(36)}`;
}

/** The local winners this device broadcasts: kept variants (INS) and named
 * things (DEF). Both carry the self-name and the material pointer. */
export function localEvents(device = deviceId()) {
  const out = [];
  for (const e of readBreakthroughs()) {
    out.push({ op: "INS", body: { variant: e.variant, echo: e.echo, terrain: e.terrain, mhc: e.mhc, pointer: e.shadow?.pointer, shape: e.shape } });
  }
  const { things } = harden(readBreakthroughs());
  for (const t of things) {
    out.push({ op: "DEF", body: { name: t.name, label: t.label, variant: t.variant, stance: t.stance, witnesses: t.witnesses } });
  }
  return out;
}

/** publish({ transport }) — emit this device's events to the transport.
 * The mirror is append-only and content-deduped. Live is declared. */
export function publish({ transport = "mirror" } = {}) {
  const device = deviceId();
  const events = localEvents(device).map((ev) => ({
    schema: "SwarmMatrixEvent@1", id: eventId(ev.op, ev.body), op: ev.op,
    at: new Date().toISOString(), room: `device:${device}`, sender: device,
    body: ev.body, transport,
  }));
  if (transport === "live") {
    // THE LIVE EXTENSION POINT. matrix-events (client.js/operators.js) is the
    // transport: login from env, then ins/syn/def into a device room. Not
    // wired here so the mirror stays the default; a live deployment replaces
    // the fs.appendFileSync below with operator emits over the room timeline.
    throw new Error("transport=live is declared, not yet bound: set MATRIX_HOMESERVER/USER/PASSWORD and wire login() + operators here");
  }
  const seen = new Set((fs.existsSync(MIRROR) ? fs.readFileSync(MIRROR, "utf8") : "").split("\n").filter(Boolean).map((l) => JSON.parse(l).id));
  let emitted = 0;
  for (const ev of events) {
    if (seen.has(ev.id)) continue;
    fs.appendFileSync(MIRROR, JSON.stringify(ev) + "\n");
    seen.add(ev.id);
    emitted += 1;
  }
  return emitted;
}

/** receive({ transport }) — fold REMOTE events (senders other than this
 * device) into the finder's `matrix` surface as nominations. Each remote
 * breakthrough becomes a line in swarm-matrix-breakthroughs.jsonl carrying
 * its originating device; it stays a NOMINEE until this device's own store
 * corroborates it (>=2 independent materials), because corroboration is
 * never imported — it is earned. */
export function receive({ transport = "mirror" } = {}) {
  const device = deviceId();
  if (!fs.existsSync(MIRROR)) return { imported: 0, remote: 0 };
  const remote = new Map();
  for (const line of fs.readFileSync(MIRROR, "utf8").split("\n").filter(Boolean)) {
    const ev = JSON.parse(line);
    if (ev.sender === device) continue; // never re-import your own signal
    if (ev.op !== "SYN" && ev.op !== "INS") continue;
    const key = JSON.stringify(ev.body);
    if (!remote.has(key)) remote.set(key, { ...ev, importedFrom: ev.sender });
  }
  const before = (fs.existsSync(REMOTE) ? fs.readFileSync(REMOTE, "utf8") : "").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const have = new Set(before.map((l) => JSON.stringify(l)));
  const added = [];
  for (const r of remote.values()) {
    const line = JSON.stringify({ schema: "SwarmBreakthrough@1", ...r.body, remote: r.importedFrom, at: r.at });
    if (have.has(line)) continue;
    fs.appendFileSync(REMOTE, line + "\n");
    have.add(line);
    added.push(line);
  }
  return { imported: added.length, remote: remote.size };
}

// ── CLI ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  const transport = process.argv.find((a) => a.startsWith("--transport="))?.split("=")[1] ?? "mirror";
  if (cmd === "publish") { const n = publish({ transport }); console.log(`published ${n} events from ${deviceId()} (${transport})`); }
  else if (cmd === "receive") { const r = receive({ transport }); console.log(`folded ${r.imported} remote event(s), ${r.remote} distinct remote signal(s)`); }
  else {
    console.error("usage: node swarm-matrix.mjs publish|receive [--transport mirror|live]");
    process.exit(1);
  }
}