# ablation-pressure-calibration.mjs — still not run (2026-09-23)

**Status: the calibration falsification test has never run.** Two
independent attempts this session, both blocked upstream of it, at the
offline centroid-prior build.

## What was attempted

The required sequence, per `ablation-grain-pressure.js`'s own contract:
check Ollama reachable → `native/scripts/build-ablation-grain-prior.mjs`
(offline centroid build) → `ablation-pressure-calibration.mjs` (the
falsification test) → wire `ablationPressureFor` live only if calibration
confirms the confidence field is meaningful per case, not merely real in
aggregate.

**Attempt 1** (delegated background agent): Ollama's control plane
answered instantly (`curl /api/tags` → HTTP 200) throughout, but every one
of the prior-builder's own 5 documented retries against `/api/embed`
(model `nomic-embed-text`) failed — 2 client-side timeouts, 3 explicit
Heimdall `503 memory_pressured` refusals citing 3.7–5.4GB "available"
against an undisclosed floor. `vm_stat` independently confirmed genuine
system-wide scarcity at that moment (~47MB truly free pages), driven by
other concurrently active sessions' resident models. A concurrent peer
process (PID 92354) attempting the identical build in parallel also
failed, with no prior written. No other session's model or process was
touched to force this through.

**Attempt 2** (this session, after observed improvement): re-checked
`vm_stat` directly before retrying — genuinely different this time, ~3.4GB
free pages (vs. ~47MB during attempt 1). Ran the build again. It still
failed, but with a **different** failure shape: all 5 retries hit
`UND_ERR_HEADERS_TIMEOUT` through Heimdall's own "local" route (a 502, not
a 503 — the request reached the host and was accepted, but nothing came
back), rather than an explicit memory-pressure refusal.

## Why this matters more than either failure alone

Two independent attempts, at two different times, with genuinely
different measured system conditions (near-zero free memory vs. several
GB free), and two *different* specific failure modes at the same
endpoint, is stronger evidence of **persistent contention on this shared
local inference host** than either attempt would be alone. It rules out
the simplest explanation ("it was just busy for five minutes") without
ruling in a specific root cause — the second failure's headers-timeout
shape is consistent with the model still being evicted/reloaded under
load from other concurrent sessions on this same host, but that is an
inference, not something measured directly this session.

No centroid prior JSON exists anywhere in this repository as of this
writing (checked via `find . -iname "*ablation*prior*.json"`).

## Consequence

`ablation-pressure-calibration.mjs` requires the prior as its first read
and has therefore still never been invoked. Running it without a real
prior would fabricate a result. `ablationPressureFor` (`grain-typing.js`)
remains correctly unwired in every live consumer: the precondition for
wiring it — calibration confirming the `cosine`/`margin` confidence
fields are meaningful *per case*, not merely real in aggregate (the
already-measured 29% vs. 7.7% chance, p=6e-15, from
`ablation-delta-catalog-RESULTS.md`) — has never been reached.

## What would actually resolve this

Not more retries against the same contended host at the same moment.
Either: run the builder when this host is genuinely idle (check `vm_stat`
and `ollama ps` immediately before, not just Ollama's bare `/api/tags`
reachability, which answers even when the model itself cannot load); or
point `embed()` at a different, uncontended Ollama instance if one is
available; or accept the aggregate-only evidence as the ceiling of what
this environment can currently establish and leave the confidence fields
disclosed as uncalibrated indefinitely (already done, in
`ablation-grain-pressure.js`'s own header STATUS block).
