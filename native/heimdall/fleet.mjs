// fleet.mjs — the hive-mind supervisor. Heimdall OUT of the sandbox.
//
// The 2026-09-20 incident: the proxy (with heimdall wired in-process) wedged
// into a 10-hour 98.5% CPU self-loop. Nothing outside the process could see
// it, and the process itself could not see its own spin. This module is the
// counter: a heimdall that runs OUTSIDE the proxy, in its own process, and
// answers one question per tick honestly:
//
//   1. SELF — is THIS process healthy? (self-health.mjs: event-loop lag +
//      own CPU. A fleet that cannot watch itself cannot watch anything.)
//   2. PEERS — are the heimdalls I know (local surfaces + Matrix fleet room)
//      answering? (peer-mesh.mjs)
//   3. ESCALATE — anything that needs terminating is raised to the operator
//      IN CHAT first: "should we terminate <peer>? (reason)". Only an explicit
//      YES from the operator terminates. No silent kills.
//
// The fleet is deliberately thin and dependency-light: it speaks plain HTTP
// probes (GET /heimdall on a peer address), reads its own health, and pushes
// escalations to an operator channel (default: a log line + an HTTP decision
// endpoint; the proxy chat surface / the-fold Matrix fleet room are the wired
// channels). It never imports the proxy, never runs a model, and never holds
// a socket it does not own — a wedged proxy cannot take it down, and it does
// not need the proxy to serve to be the proxy's watcher.
import { createMesh, peerFromAddress, SATURATED_SUSPECT_TICKS } from "./peer-mesh.mjs";
import { selfSnapshot } from "./self-health.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FLEET_TICK_MS = Number(process.env.ER7_HEIMDALL_FLEET_TICK_MS ?? 10000);
export const PROBE_TIMEOUT_MS = Number(process.env.ER7_HEIMDALL_PROBE_TIMEOUT_MS ?? 4000);
export const OPERATOR_CHANNEL = process.env.ER7_HEIMDALL_OPERATOR ?? "log"; // log | http | matrix

// Well-known local addresses to probe for peer heimdalls. The proxy's own
// /heimdall answers at :11436 (its own port); a standalone fleet answers at
// :11437 (ER7_HEIMDALL_PORT). Other fold surfaces are peers too.
const WELL_KNOWN = [
  { name: "er7", address: "http://127.0.0.1:11436" },
  { name: "heimdall-alias", address: "http://127.0.0.1:11437" },
];

/** Extend the well-known peers with configured ones. The config lives in the
 *  environment (ER7_HEIMDALL_PEERS, comma-separated "name=address[,name=...]"),
 *  and — so a managed restart (`er7-proxy restart`) does not lose the mesh —
 *  falls back to the peers file written beside the pid (see fleetPeersFile in
 *  er7-proxy.mjs). This is what lets MULTIPLE heimdall fleets coordinate across
 *  restarts: each fleet peers with the proxy AND with the other fleets, so a
 *  fleet that stops ticking or self-reports wedged is raised by its peers, not
 *  just by the proxy it watches. */
export function configuredPeers() {
  const raw = String(process.env.ER7_HEIMDALL_PEERS ?? "").trim()
    || readPeersFile();
  const extra = [];
  for (const spec of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const eq = spec.indexOf("=");
    if (eq === -1) { extra.push({ name: spec, address: spec.startsWith("http") ? spec : `http://127.0.0.1:${spec}` }); continue; }
    const name = spec.slice(0, eq).trim();
    const addr = spec.slice(eq + 1).trim();
    extra.push({ name, address: addr.startsWith("http") ? addr : `http://127.0.0.1:${addr}` });
  }
  return [...WELL_KNOWN, ...extra];
}

/** Read the persisted peer config (if the launcher wrote one). */
function readPeersFile() {
  try {
    const p = process.env.ER7_HEIMDALL_PEERS_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".er7-fleet.peers");
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return "";
  }
}

async function probePeer(peer, { timeoutMs = PROBE_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${peer.address}/heimdall`, { signal: ctrl.signal });
    const ok = res.ok;
    let body = null;
    if (ok) { try { body = await res.json(); } catch { body = null; } }
    clearTimeout(t);
    return { ok, status: res.status, body };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, status: null, reason: err?.cause?.code ?? err?.message ?? "probe_failed" };
  }
}

/**
 * The operator channel. Default "log": print the raise to stderr (the fleet
 * runs under a supervisor/launchd that can see it) and keep it in the mesh
 * for a decision endpoint. "http": POST the raise to ER7_HEIMDALL_OPERATOR_URL
 * (a chat/decision endpoint the operator watches). "matrix": reserved for the
 * the-fold fleet room (the seam exists; the client is wired by the operator).
 */
async function raiseToOperator(mesh, esc, { channel = OPERATOR_CHANNEL } = {}) {
  const line = `[heimdall:raise] ${esc.ask} [id=${esc.id}] pending`;
  if (channel === "http" && process.env.ER7_HEIMDALL_OPERATOR_URL) {
    try {
      await fetch(process.env.ER7_HEIMDALL_OPERATOR_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "heimdall_escalation", escalation: esc }),
      });
      return { channel, sent: true };
    } catch (err) {
      process.stderr.write(`${line} (http raise failed: ${err.message})\n`);
      return { channel, sent: false };
    }
  }
  process.stderr.write(`${line}\n`);
  return { channel, sent: true };
}

import { execFile } from "node:child_process";

const execOut = (cmd, args, ms) => new Promise((resolve) => {
  execFile(cmd, args, { encoding: "utf8", timeout: ms, maxBuffer: 1_000_000 }, (err, stdout) => {
    resolve(err ? null : String(stdout ?? ""));
  });
});

/** External box load — read by the FLEET, immune to any single peer's wedge.
 *  A wedged proxy that answers its own /heimdall cannot hide the box's load
 *  from this read. Returns load1 and whether it reads saturated. */
async function readBoxLoad({ floor = Number(process.env.ER7_HEIMDALL_LOAD_FLOOR ?? 8) } = {}) {
  try {
    const out = await execOut("sysctl", ["-n", "vm.loadavg"], 2000);
    if (!out) return { load1: null, saturated: false };
    const m = /([\d.]+)/.exec(out);
    const load1 = m ? Number(m[1]) : null;
    return { load1, saturated: load1 != null && load1 >= floor };
  } catch {
    return { load1: null, saturated: false };
  }
}

export function createFleet({
  peers = [],
  tickMs = FLEET_TICK_MS,
  probeTimeoutMs = PROBE_TIMEOUT_MS,
  operatorChannel = OPERATOR_CHANNEL,
  self = selfSnapshot,
  probe = probePeer,
  raise = raiseToOperator,
  boxLoad = readBoxLoad,
} = {}) {
  const mesh = createMesh({ peers });
  // seed the registry with the well-known local peers (and any caller peers),
  // plus env-configured peer heimdalls so fleets watch each other
  for (const wk of configuredPeers()) {
    if (![...mesh.registry.keys()].includes(wk.name)) mesh.upsertPeer(peerFromAddress(wk.address, { name: wk.name }));
  }

  const state = {
    ticks: 0,
    lastSelf: null,
    lastProbes: null,
    lastRaised: null,
    lastBoxLoad: null,
    startedAt: Date.now(),
  };

  async function tick() {
    state.ticks += 1;
    state.lastTickAt = new Date().toISOString();
    state.lastSelf = await self();
    // EXTERNAL LOAD: read the box's load — immune to any single peer's wedge.
    state.lastBoxLoad = await boxLoad();
    const results = [];
    for (const peer of mesh.all()) {
      if (peer.probing) continue; // never probe twice at once
      peer.probing = true;
      const r = await probe(peer, { timeoutMs: probeTimeoutMs });
      mesh.recordProbe(peer, r);
      results.push({ name: peer.name, up: peer.up, reason: peer.reason, standing: peer.standing });
    }
    // Feed the load AFTER the probes, so a peer that answers this tick counts
    // as an answering-under-saturation suspect from this same tick (no
    // off-by-one: the first saturated answer is suspect #1).
    mesh.recordLoad({ saturated: state.lastBoxLoad.saturated });
    state.lastProbes = results;
    // EVA -> REC: candidates get raised to the operator; nothing is killed here.
    for (const peer of mesh.all()) {
      if (mesh.isCandidate(peer) && !peer.escalation) {
        const reason = peer.reason ?? (peer.saturatedTicks >= SATURATED_SUSPECT_TICKS
          ? `answers but the box has been saturated ${peer.saturatedTicks} ticks (external load ${state.lastBoxLoad?.load1 ?? "?"})`
          : `no answer / self-wedged (standing=${peer.standing})`);
        const esc = mesh.escalate(peer, { reason });
        const sent = await raise(mesh, esc, { channel: operatorChannel });
        state.lastRaised = { id: esc.id, peer: peer.name, sent: sent.sent };
      }
    }
    mesh.expirePending();
    return state;
  }

  function status() {
    return {
      at: new Date().toISOString(),
      ticks: state.ticks,
      lastTickAt: state.lastTickAt,
      self: state.lastSelf,
      boxLoad: state.lastBoxLoad,
      peers: mesh.all().map((p) => ({
        name: p.name, address: p.address, up: p.up, reason: p.reason,
        standing: p.standing, lastSeenAt: p.lastSeenAt, candidate: p.candidate,
        saturatedTicks: p.saturatedTicks ?? 0,
        escalation: p.escalation ? { id: p.escalation.id, status: p.escalation.status, reason: p.escalation.reason } : null,
      })),
      pendingEscalations: mesh.pending().map((p) => p.escalation),
      lastRaised: state.lastRaised,
      operatorChannel,
      falsifyingControl: "an answered probe concedes any escalation; lag alone never terminates; an answering peer under sustained box saturation IS a suspect",
    };
  }

  return {
    mesh, tick, status, state,
    // expose for a decision endpoint (the operator's answer)
    decide: mesh.decide,
    pending: mesh.pending,
  };
}