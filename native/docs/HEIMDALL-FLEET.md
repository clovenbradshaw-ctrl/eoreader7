# Heimdall, out of the sandbox — the hive-mind supervisor

**Handle: Heimdall.** Written 2026-09-20, the morning after the incident it
answers.

## The incident it prevents

`eoreader7/proxy.mjs` (port 11436) entered an infinite microtask self-loop on
2026-09-19 night: 98.5% CPU for ~10 hours, unreachable on `/health` and
`/heimdall`, deaf to SIGTERM. The cause (from a `sample` and the logs): a
runaway promise loop hot in `String.prototype.split`, with an ESTABLISHED TCP
connection from the proxy to its own port — and Heimdall was running INSIDE
that process, so when the loop wedged, the watcher wedged with it. There was
no one outside the process to see it, and no one outside the process to ask.

## The design

Heimdall is a **hive-mind**: a fleet of watchers, each in its OWN process,
watching (a) itself, (b) its peers, and (c) raising to the operator before
terminating anything.

```
┌───────────────────────────  the box  ───────────────────────────────┐
│                                                                     │
│   ┌─────────────────────┐      ┌─────────────────────────────────┐  │
│   │  heimdall-fleet.mjs │      │  proxy.mjs (the sandbox)        │  │
│   │  port 11438         │◄────►│  port 11436 — generates, reads  │  │
│   │  watches SELF       │      │  answers /heimdall honestly     │  │
│   │  watches PEERS      │      │  does NOT self-supervise        │  │
│   │  raises to operator │      └─────────────────────────────────┘  │
│   └──────────┬──────────┘                                            │
│              │ raises "should we terminate X?"                       │
│              ▼                                                       │
│   ┌──────────────────┐                                               │
│   │ operator channel │ log | http | matrix (the-fold fleet room)    │
│   └──────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### The three layers

1. **`native/heimdall/self-health.mjs`** — watches ITS OWN process.
   - An **event-loop heartbeat** (`setInterval` firing every 1000ms) measures
     how late the loop fires. A loop busy spinning is late by seconds; a
     healthy loop fires within a few ms. `WEDGE_SAMPLES` late fires → standing
     `wedged`.
   - A **self-CPU read** (`ps -p <pid> -o %cpu`), paced, so a spin that holds
     a core at ~100% is visible.
   - Standing: `healthy | lagging | wedged`, with a **falsifying control**: a
     late heartbeat followed by an answered probe concedes `wedged`.

2. **`native/heimdall/peer-mesh.mjs`** — the registry + escalation state
   machine. A peer (any process answering `/heimdall` on an address) that
   stops answering or self-reports wedged becomes a **candidate**. Candidates
   are NEVER terminated silently — they are **escalated** to the operator, and
   only an explicit operator YES (`/decide {"allow":true}`) applies the
   decision. An answered peer **concedes** any open escalation (the falsifying
   control: absence/lag alone never kills).

3. **`native/heimdall/fleet.mjs`** + **`heimdall-fleet.mjs`** (standalone entry,
   port 11438) — the loop that ties it together. Each tick: sample SELF, probe
   every PEER, and for every candidate raise to the operator. Serves
   `GET /health`, `GET /heimdall`, `GET /pending`, `POST /decide`.

### The proxy is the sandbox

With `ER7_EXTERNAL_HEIMDALL=1`, `proxy.mjs` **does not start an in-process
watcher** — it stays a thin sandbox that answers its own `/heimdall` so the
external fleet has something honest to probe. The fleet process watches it
from outside; a wedged proxy is now visible to someone who survived the wedge.

### Matrix: the remote fleet room

The the-fold Matrix stack already designs the peer channel —
`heimdallRoomBody` in `the-fold/matrix.js` is a public-join fleet directory
room for heimdall WebRTC signaling. The `--operator matrix` channel is the
reserved seam: a remote heimdall on another box (or the operator on a phone)
reads the same `/heimdall` and answers the same raise. The client wiring is
the operator's pass when they want remote supervision; `--operator log` and
`--operator http` are live today.

## Running it

```
# the sandbox (proxy), supervised externally
ER7_EXTERNAL_HEIMDALL=1 node proxy.mjs

# the hive-mind supervisor, in its own process
node heimdall-fleet.mjs --operator log          # raises to stderr
node heimdall-fleet.mjs --operator http         # POSTs raises to ER7_HEIMDALL_OPERATOR_URL
```

```
GET  http://127.0.0.1:11438/heimdall     # self standing + every peer
GET  http://127.0.0.1:11438/pending      # open escalations awaiting the operator
POST http://127.0.0.1:11438/decide       # { "id": "...", "allow": true|false }
```

## Tests

`native/heimdall/*.test.mjs` — 19 tests:
- self-health: heartbeat lag → healthy/lagging/wedged; falsifying control
- peer-mesh: candidate only when down/wedged AND not already asked; answered
  peer concedes; only operator YES terminates; NO denies; TTL expiry
- fleet: probes all peers; raises down peers once; concede on answer; quiet
  when healthy

```
cd native && npm run test:heimdall
```

## Rules carried

- **Never terminate silently.** A candidate is raised; only an explicit
  operator YES applies a termination decision.
- **Never convict on absence alone.** An answered probe concedes the raise.
- **A watcher that cannot watch itself cannot watch anything.** The fleet
  samples its own event-loop lag and CPU every tick.
- **Out of the sandbox.** The watcher runs in its own process; a wedged
  sandbox cannot take the watcher down with it.

## The falsifying control that would break this whole design

A fleet process that itself wedges (its own event-loop spins, it stops
answering `/heimdall`) and no OTHER fleet process or operator notices — that
concedes the self-watch claim. The answer is the fleet-room peer: another
heimdall (local or Matrix) watches this one, exactly as this one watches the
proxy. That is the hive-mind: no single watcher is unreachable.

## Falsified and fixed (2026-09-20, the standing rule run)

The falsifying control was RUN, and it held twice — then the holes were fixed.

**Falsification 1 — self-health cannot see its own hard wedge.** A wedged
event loop starves the very heartbeat that measures it: the `setInterval`
callback never fires, so `lateCount` stays 0 and standing reads `healthy` on
a process pegged at 98.5%. This is a real false negative on the self-watch
claim. Honest boundary, not fixed away: a fleet cannot watch its own thread.
The fix is that `fleet.status()` discloses **`lastTickAt`** — an external
peer/operator can see a fleet that stopped ticking, even though the fleet
cannot see it. That is the out-of-sandbox premise, pinned by
`falsify-self-health.test.mjs` and `falsify-fixed.test.mjs`.

**Falsification 2 — an answering-but-spinning peer is invisible.** The
incident proxy answered its own `/heimdall` 200 while spinning at 98.5% CPU
for ten hours. Reachability alone was blind: `up: true`, no escalation. The
fix is **external box load**: the fleet reads `vm.loadavg` itself (immune to
any single peer's wedge) every tick, and a peer that answers while the box
stays saturated for `SATURATED_SUSPECT_TICKS` (default 3) becomes a suspect —
raised as *"should we terminate er7? (answers but the box has been saturated
N ticks, external load M)"* — pending the operator's decision. The falsifying
control on the fix: saturation that clears resets the suspect count; a single
spike never convicts. Pinned by `falsify-fixed.test.mjs`.

Rules now carried, updated by the run:
- **Never convict on a single spike.** Sustained saturation (3 ticks) is the
  threshold; a cleared load resets it.
- **Reachability is not health.** An answering peer under sustained box
  saturation IS a suspect.
- **A fleet discloses its own last tick.** Self-watch is bounded by the loop;
  the out-of-sandbox peer is what closes it.