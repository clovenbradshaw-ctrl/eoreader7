// peer-mesh.mjs — Heimdall's hive-mind: the registry of other heimdalls and
// the escalation state machine that asks the OPERATOR before terminating.
//
// A heimdall is a process that answers `/heimdall` on some address. A fleet is
// the set of heimdalls this one knows about: LOCAL peers (other processes on
// this box, discovered by a configured list or a probe of well-known ports)
// and REMOTE peers (a heimdall connected via the-fold's Matrix fleet room —
// the seam `heimdallRoomBody` in the-fold/matrix.js already designs).
//
// The hive-mind rule (the "should we terminate these other things?" contract):
//   - A peer that stops answering, or reports itself wedged, becomes a
//     CANDIDATE for termination.
//   - Termination is NEVER executed silently. The fleet raises to the operator
//     in chat: "should we terminate <peer>? (it is <reason>)". The operator
//     answers yes/no. Only an explicit YES terminates.
//   - A peer that answers (even if it was lagging) concedes the candidate
//     finding — the falsifying control carried on every escalation.
//
// This is a pure state machine + registry: it holds no sockets of its own and
// never spawns/kills anything. The fleet supervisor (fleet.mjs) does the
// probing and the acting; the mesh decides WHAT to escalate and WHEN an
// escalation is satisfied.
export const ESCALATION_TTL_MS = Number(process.env.ER7_HEIMDALL_ESCALATION_TTL_MS ?? 180000);
// A peer that ANSWERS while the box is externally saturated for this many
// consecutive ticks is a candidate (2026-09-20 falsification: reachability
// alone is blind to an answering-but-spinning process).
export const SATURATED_SUSPECT_TICKS = Number(process.env.ER7_HEIMDALL_SATURATED_TICKS ?? 3);

export const LOCAL_PEER_NAMES = [
  "er7", "fold-chat", "fold-8812", "fold-8819", "fold-8837",
];

export function peerFromAddress(address, { name = null, family = "er7", matrix = null } = {}) {
  return {
    name: name ?? address,
    address,
    family,
    matrix,           // the matrix room/user that carries this peer, if remote
    up: null,         // null = never probed, false = down, true = up
    reason: null,
    lastProbeAt: null,
    lastSeenAt: null,
    standing: null,   // from the peer's own /heimdall selfStanding, if disclosed
    candidate: false, // has been escalated for termination, awaiting operator
    escalation: null, // the open escalation record, if any
    probing: false,   // a probe is in flight (never probe twice at once)
  };
}

export function createMesh({ peers = [], escalationTtlMs = ESCALATION_TTL_MS } = {}) {
  const registry = new Map(peers.map((p) => [p.name ?? p.address, p]));

  const ts = () => new Date().toISOString();

  function upsertPeer(peer) {
    const existing = registry.get(peer.name ?? peer.address);
    if (!existing) { registry.set(peer.name ?? peer.address, peer); return peer; }
    // keep candidate/escalation state across a re-register; refresh address
    peer.candidate = existing.candidate;
    peer.escalation = existing.escalation;
    registry.set(peer.name ?? peer.address, peer);
    return peer;
  }

  /** Record the outcome of a probe. Returns the peer (post-update). */
  function recordProbe(peer, { ok, status = null, body = null, reason = null }) {
    peer.lastProbeAt = Date.now();
    peer.probing = false;
    if (ok) {
      peer.up = true;
      peer.reason = null;
      peer.lastSeenAt = Date.now();
      // a peer that answers concedes any standing it claimed; a lagging-but-
      // answering peer is healthy — the falsifying control on "wedged".
      if (peer.escalation) {
        peer.escalation.conceded = true;
        peer.escalation.concededAt = ts();
        peer.escalation.concededReason = "peer answered a probe after escalation — the falsifying control concedes wedged";
        peer.escalation.reason = peer.escalation.concededReason;
      }
      peer.candidate = false;
      // If the peer discloses its own self-standing, honor it.
      if (body?.self?.standing) peer.standing = body.self.standing;
      else if (body?.self?.eventLoopLagMs != null) peer.standing = "ok";
      else peer.standing = "ok";
      return peer;
    }
    peer.up = false;
    peer.reason = reason ?? `probe_${status ?? "failed"}`;
    return peer;
  }

  /**
   * EVA: is this peer a candidate for termination right now?
   * A peer is a candidate when EITHER:
   *   - it is down (or self-reports wedged) for a sustained reason, OR
   *   - the box is EXTERNALLY saturated and the peer claims healthy while
   *     answering — the 2026-09-20 falsification: the wedged proxy answered
   *     its /heimdall probe 200 while spinning at 98.5% CPU, so reachability
   *     alone is blind. External load (read by the fleet, immune to the
   *     peer's own wedge) is the counter-signal.
   * AND it is not already under an open, unconceded escalation.
   * The falsifying control: a peer that answers a probe (or whose own
   * selfStanding is healthy) while the box is NOT saturated is never a
   * candidate.
   */
  function isCandidate(peer) {
    if (!peer) return false;
    const downOrWedged = peer.up !== false && peer.standing !== "wedged" ? false : true;
    const saturatedSuspect = peer.up === true && peer.saturatedTicks >= SATURATED_SUSPECT_TICKS;
    if (!downOrWedged && !saturatedSuspect) return false;
    if (peer.escalation && !peer.escalation.conceded) return false; // already asking
    return true;
  }

  /**
   * Feed the EXTERNAL box-load signal (the fleet reads load itself; no single
   * peer's wedge can hide it). A peer that answers while the box is saturated
   * accumulates suspect ticks; sustained saturation makes it a candidate even
   * though it answers.
   */
  function recordLoad({ saturated = false } = {}) {
    for (const peer of registry.values()) {
      if (peer.up === true) {
        peer.saturatedTicks = saturated ? (peer.saturatedTicks ?? 0) + 1 : 0;
      }
    }
  }

  /** REC: raise a candidate to the operator. Returns the escalation record. */
  function escalate(peer, { reason, ask = null }) {
    const esc = {
      id: `${peer.name}-${Date.now().toString(36)}`,
      peer: peer.name,
      address: peer.address,
      reason,
      ask: ask ?? `should we terminate ${peer.name}? (${reason})`,
      raisedAt: ts(),
      status: "pending", // pending | conceded | allowed | denied | expired
      decision: null,
      conceded: false,
      concededAt: null,
      decidedAt: null,
    };
    peer.escalation = esc;
    peer.candidate = true;
    return esc;
  }

  /** Operator's answer. Returns the peer + escalation after the decision. */
  function decide(peer, allow) {
    const esc = peer.escalation;
    if (!esc || esc.status !== "pending") return { peer, escalation: esc, applied: false };
    if (esc.conceded) return { peer, escalation: esc, applied: false };
    esc.status = allow ? "allowed" : "denied";
    esc.decision = allow;
    esc.decidedAt = ts();
    peer.candidate = false;
    return { peer, escalation: esc, applied: allow };
  }

  /** A peer that reappeared after an escalation concedes it. */
  function concede(peer, reason) {
    if (peer.escalation) {
      peer.escalation.conceded = true;
      peer.escalation.concededAt = ts();
      peer.escalation.reason = reason;
    }
    peer.candidate = false;
  }

  function expirePending() {
    const now = Date.now();
    for (const peer of registry.values()) {
      const esc = peer.escalation;
      if (esc && esc.status === "pending" && !esc.conceded && now - new Date(esc.raisedAt).getTime() > escalationTtlMs) {
        esc.status = "expired";
        esc.decidedAt = ts();
        peer.candidate = false; // expired = no longer a live ask; re-raise later
      }
    }
  }

  /** All peers with an open pending escalation awaiting the operator. */
  function pending() {
    expirePending();
    return [...registry.values()].filter((p) => p.escalation && p.escalation.status === "pending" && !p.escalation.conceded);
  }

  function all() { return [...registry.values()]; }

  return {
    registry, upsertPeer, recordProbe, recordLoad, isCandidate, escalate, decide, concede, pending, all, expirePending,
  };
}