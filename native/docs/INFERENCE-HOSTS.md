# Inference hosts — who answers the next prompt

**Handle: Bifröst picker.** Landed 2026-09-21. Code: `heimdall.mjs`
("INFERENCE HOSTS" block: `pickHost`, `hostBegin`, `hostEnd`,
`hostsDisclosure`), `proxy-runner.mjs::streamOllamaChat` (the call site),
`GET /heimdall` → `hosts`, and the watch's INFERENCE SERVERS section.

## Why not plain round robin

| cost on this box (measured 2026-09-21) | size |
|---|---|
| cold load of gemma2:2b on a fresh daemon | 6.2s (then 1.6s once cached by the OS) |
| prompt eval, cold prefix, 251 tokens | 1.7–13s under contention |
| prompt eval, warm prefix (sticky repeat) | 0.35s |
| generation, 32 tokens | 4.4s |
| whole turn, sticky and resident | **0.8s** |
| whole turn, cold host | **7.0s** |

Round robin maximises cold prefixes and cold loads. The picker minimises
them and only then balances.

## The order

1. **Sticky.** Same session → same host while it is up and the model is
   resident there.
2. **Resident first.** A host with the model in its `/api/ps` outranks one
   that must load it — unless waiting for it costs more than the other
   host's wait plus that host's own measured load time.
3. **Shortest expected wait.** in-flight × measured mean turn ms for that
   model on that host. Unmeasured hosts score at the mean of the measured
   ones: tried, never starved, never preferred.
4. **Rotate ties.** An idle fleet spreads.

## What stands a host down

Only a refusal (ECONNREFUSED / EHOSTUNREACH / ENOTFOUND), from the call or
from the cadence probe. A timeout keeps the last known state. A host comes
back the moment its `/api/ps` answers (`host_back` in the ledger).

## Configure

```
ER7_OLLAMA_HOSTS="local=http://localhost:11434,mini=http://10.0.0.7:11434" node proxy.mjs
```

Unset → the one local daemon. To test on one box, run a second daemon on
another port sharing the model store:

```
OLLAMA_HOST=127.0.0.1:11435 OLLAMA_CONTEXT_LENGTH=8192 OLLAMA_KEEP_ALIVE=1h ollama serve
```

Every daemon must carry the same `OLLAMA_CONTEXT_LENGTH` (lesson 22 / the
2026-09-21 post-mortem): a different window on one host is a reload on
every switch.

## Falsifying controls

- Kill a host mid-service: its sticky sessions must land on another host
  with a typed error at worst, never a hang; `host_down` then `host_back`
  must appear in `heimdall-log.jsonl`. (Run 2026-09-21: held.)
- Two hosts hot, four concurrent new sessions: served counts must spread,
  not pin. (Run 2026-09-21: 8/6 over 14 turns.)
- A sticky repeat must be faster than its first turn by the prompt-eval
  difference. (Run 2026-09-21: 7.0s → 0.8s.)

## One box, one daemon

Two Ollama daemons on the same machine share one unified memory and cannot
see each other's residency: the second answered `/api/ps` but 500'd every
chat ("system limited"). Hosts in `ER7_OLLAMA_HOSTS` must be on different
boxes (or a LAN). A host that answers a 5xx is stood down like a refusal.

## Admission by expected wait

`admitChat` holds a turn with a typed `expected_wait` 429 and an ETA when
the least (in-flight + admitted-not-started) × measured mean over the up
hosts exceeds the SLA (12s). Unmeasured hosts never hold. Verified under a
2s SLA with a 12-prompt burst.

## Not yet

- The picker knows hosts on this box or on a LAN by URL. Room mouths
  (machines reached through the Matrix fleet room) are the same shape one
  register over — `roomPathsFor` in `heimdall.mjs` — and are still unwired.
- The current turn's session comes from `_turn`, a single global; under
  true concurrency two turns can share it for a moment and stickiness
  degrades to shortest wait. Correct, just less sticky.
