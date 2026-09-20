#!/usr/bin/env node
// heimdall-fleet.mjs — the hive-mind supervisor, OUTSIDE the sandbox.
//
// Run this as its own process; it watches the proxy (and any peer heimdall)
// from outside, so a wedged proxy cannot take the watcher down with it — the
// 2026-09-20 lesson (a 10-hour 98.5%-CPU proxy self-loop that was invisible
// because heimdall ran inside the same process).
//
//   node heimdall-fleet.mjs [--port 11438] [--operator log|http]
//        --operator http  post raises to ER7_HEIMDALL_OPERATOR_URL (a chat/
//                         decision endpoint the operator watches)
//        --operator matrix  (reserved) the-fold fleet room — the seam exists
//
// It serves:
//   GET  /health            liveness
//   GET  /heimdall          full fleet status: self standing + every peer
//   GET  /pending           open escalations awaiting the operator
//   POST /decide            { "id": "...", "allow": true|false } — the
//                           operator's answer; only allow:true terminates
//
// Nothing is ever terminated silently. A peer that stops answering or
// self-reports wedged is raised to the operator first; the operator's answer
// (via /decide, or the chat raise for --operator http) is the ONLY thing that
// applies a termination decision. An answered peer concedes the raise.
import http from "node:http";
import { createFleet } from "./native/heimdall/fleet.mjs";
import { startHeartbeat, readSelfCpu, selfSnapshot } from "./native/heimdall/self-health.mjs";

const PORT = Number(process.env.ER7_HEIMDALL_FLEET_PORT ?? 11438);
const TICK_MS = Number(process.env.ER7_HEIMDALL_FLEET_TICK_MS ?? 10000);
const OPERATOR = process.env.ER7_HEIMDALL_OPERATOR ?? "log";

// ── self-health: the fleet's own heartbeat ───────────────────────────────────
startHeartbeat();
const selfHealth = async () => {
  const cpu = await readSelfCpu();
  return { ...selfSnapshot(), cpuPct: cpu };
};

const fleet = createFleet({
  tickMs: TICK_MS,
  operatorChannel: OPERATOR,
  self: selfHealth,
});

const server = http.createServer(async (req, res) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("access-control-allow-origin", "*");
  if (req.method === "GET" && req.url === "/health") {
    res.end(JSON.stringify({ status: "ok", fleet: true, at: new Date().toISOString() }));
    return;
  }
  if (req.method === "GET" && req.url === "/heimdall") {
    res.end(JSON.stringify(fleet.status()));
    return;
  }
  if (req.method === "GET" && req.url === "/pending") {
    res.end(JSON.stringify({ pending: fleet.pending().map((p) => p.escalation) }));
    return;
  }
  if (req.method === "POST" && req.url === "/decide") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end(JSON.stringify({ error: "bad json" })); return; }
      const peer = [...fleet.mesh.registry.values()].find((p) => p.escalation?.id === parsed.id);
      if (!peer) { res.writeHead(404); res.end(JSON.stringify({ error: `no such escalation: ${parsed.id}` })); return; }
      const { applied } = fleet.decide(peer, parsed.allow === true);
      res.end(JSON.stringify({ escalation: peer.escalation, applied }));
      if (applied) {
        process.stderr.write(`[heimdall:raise] operator consented — terminating ${peer.name} (${peer.escalation.reason})\n`);
        // The fleet reports the decision; the actual terminate op is owned by
        // the caller (the proxy / a supervisor script) via the decision it
        // just recorded. Never run a kill inside this HTTP handler.
      }
    });
    return;
  }
  res.writeHead(404); res.end(JSON.stringify({ error: "no such route" }));
});

// ── the loop ─────────────────────────────────────────────────────────────────
let ticking = false;
async function tickLoop() {
  if (ticking) return;
  ticking = true;
  try { await fleet.tick(); }
  catch (err) { process.stderr.write(`[heimdall:fleet] tick error: ${err.message}\n`); }
  finally { ticking = false; }
  setTimeout(tickLoop, TICK_MS);
}

server.listen(PORT, "127.0.0.1", () => {
  process.stderr.write(`[heimdall:fleet] hive-mind on http://127.0.0.1:${PORT} (operator channel: ${OPERATOR})\n`);
  process.stderr.write(`[heimdall:fleet] watching: ${fleet.mesh.all().map((p) => p.name).join(", ")}\n`);
  tickLoop();
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    process.stderr.write(`[heimdall:fleet] ${sig} — shutting down\n`);
    server.close(() => process.exit(0));
  });
}