# POST-MORTEM — the traffic jam (2026-09-21)

## 1. What happened

The box pegged. The heimdall dashboard read:

```
HEALTH● 4/4 UP (fleet)
FLOW    12.2 tok/s · 34 calls · 0 in flight · load 24.4 PEGGED
LINE    clear — next starts now · SLA 120s (longest 0s)
WASTE   gemma2:2b reloaded 23× (7s each) — pin one num_ctx
HORN    resting · 0 blast(s) this session
```

Swap at 92–93% (10.4 GB of 11.2 GB). Load average 24+ while the machine has ~8
cores. The fleet raised every surface repeatedly: "answers but the box has been
saturated 3 ticks (external load 11–115)". heimdall's own residency holon
stood down every cadence under `memory_pressured(swap 92%)`. A widget build
could not finish a draw; the operator's honest call was "the box cannot
sustain the model draws right now."

**Ollama was never down.** `/api/tags` answered in 3.6 ms; `/api/ps` showed
gemma2:2b resident. The jam was not a dead server — it was a box spending
its scarce seconds on **reloading the same model**, 23 times, ~7 s each,
~160 s of pure weight-loading plus swap-thrash in a 15-minute window.

## 2. Root cause — a window disagreement is a full reload

Ollama reloads a runner whenever a request's `num_ctx` differs from the
loaded window, and the reload discards the prompt cache. Measured on this box
back in 2026-09-15: `num_ctx: 8192` → reload to 8192; `num_ctx: 4096` twice →
no reload; mixed windows → a reload every switch.

On the day of the jam, the callers disagreed:

| Caller | num_ctx sent | Result |
|---|---|---|
| proxy `streamOllamaChat` (`proxy-runner.mjs:2941`) | `8192` (NUM_CTX) | loads 8192 |
| proxy keep-warm `keepModelHot` (`proxy-runner.mjs:2619`) | `8192` | loads 8192 |
| `native/organs/look.js:187` (vision) | **none** | server default |
| `native/kernel/discovery.js:91` | **none** | server default |
| heimdall `consultMind` / probe (`heimdall.mjs:2653, 3187`) | **none** | server default |
| the-fold page | **none** | server default |

And the server default disagreed with the proxy's pin **three ways**:
`setup-proxy.sh` set `OLLAMA_CONTEXT_LENGTH=16384` (launchctl, durable);
heimdall's `restartModelServer` set `OLLAMA_CONTEXT_LENGTH=4096`
(`heimdall.mjs:2594`); the live serve env read 4096. So:

- A proxy call wanted 8192.
- A vision/heimdall/fold call wanted "whatever the server default is" (4096 or 16384).
- Every interleave reloaded the weights, ~7 s each, and under swap pressure
  the reload itself thrashed the box — more load, slower reloads, more
  pressure, more standing down. A positive feedback loop the reload fed.

The 2026-09-15 fix ("declare the same window on every caller") had decayed:
declared windows only agree while every caller remembers to declare. The
vision lane, discovery, and heimdall's own mind never did.

## 3. The fix applied (2026-09-21)

**Principle: the window is decided by exactly one body — the server — and no
caller declares anything.** Ollama then loads each model once at the server's
single `OLLAMA_CONTEXT_LENGTH`, and no request can disagree with another. The
window becomes unanimous *by construction*, not by every caller remembering.

1. `proxy-runner.mjs` — removed `num_ctx` from `streamOllamaChat` and
   `keepModelHot`. Both now declare nothing, exactly like the vision lane,
   discovery, and heimdall's mind. Comments rewritten to state the law.
2. `heimdall.mjs:2594` — heimdall's model-server restart now defaults
   `OLLAMA_CONTEXT_LENGTH` to **8192** (was 4096), matching the proxy's old
   pin and gemma2:2b's trained window — big enough for the 9216-char prompt
   budget (≈3072 tokens) + 1024 output with headroom, small enough to cap the
   KV cache on a memory-starved box.
3. `setup-proxy.sh:93` — the launchctl durable default `OLLAMA_CONTEXT_LENGTH`
   from **16384 → 8192**, so the app-launched server and heimdall's restart
   agree on the same single value.

The proxy was restarted with the new code (pid 31822, was 56649 running the
old pinned-window build). The model server was **not** restarted — heimdall's
restart-window gate held, correctly, and the fix works under the running
server's default anyway (unanimity is what kills the storm, not the specific
value).

## 4. Evidence

- `window_changed` finding count in `heimdall-log.jsonl`: **0**. (See 5.2.)
- `model_server_restart_capped` ×13, `stand_down` ×26 under
  `memory_pressured(swap 92%)`, `hog_quit` ×4 — heimdall did its memory work.
- Fleet log: saturated 3-tick raises with external load 9–115.
- `num_ctx:` now appears in `proxy-runner.mjs` only inside comments.

## 5. Falsification — would these fixes hold moving forward?

A fix that cannot be attacked is a wish. Each claim below is stated with the
evidence that would break it.

### 5.1 The reload storm is dead
**Claim:** with no caller declaring a window, no request can disagree, so no
window-switch reload can occur.

**Attack 1 — a caller still declares a window.** The proxy no longer does,
but nothing *stops* a future caller (or the-fold, or an external client) from
sending `num_ctx: X` against the server's 8192. The fix makes unanimity the
default, not the only path.
**Falsifying control:** send one `num_ctx: 4096` request to the same model
that just loaded at 8192 — a reload on that request is expected and fine; the
fix's promise is only that *heimdall's own callers* stop manufacturing
disagreements. A reload on a heimdall-originated call would concede the fix.
This is verified live: after the proxy restart, `keepModelHot` sends no
`num_ctx` (`proxy-runner.mjs` diff), and `/api/ps` shows gemma2:2b still at
8192 with no switch.

**Attack 2 — the server default is not actually what we think.** The fix's
guarantee rests on `OLLAMA_CONTEXT_LENGTH` being one agreed value. The live
serve env currently reads 4096 (from heimdall's earlier restart); the proxy
fix runs under that, unanimous. After the next server restart it will read
8192. If an operator sets `ER7_OLLAMA_CTX` or the launchctl value differently
from setup-proxy.sh, the two configs drift again.
**Falsifying control:** after the next `restartModelServer`, `ps eww` on the
serve process must show `OLLAMA_CONTEXT_LENGTH=8192`, and `/api/ps` must show
gemma2:2b loaded at 8192 with **zero** window switches across a full working
session. A `window_changed` finding after that restart concedes the fix.
(Not yet observed — the server has not restarted since the change. Status:
**unverified, pending the next restart.**)

**Attack 3 — the budget.** The prompt budget (9216 chars ≈ 3072 tokens) +
1024 output needs the window ≥ 4096. 8192 covers it. A deployment that sets
`OLLAMA_CONTEXT_LENGTH` below the budget gets silent truncation instead of a
typed refusal.
**Falsifying control:** run the largest legal prompt at 8192 and confirm no
truncation. A budget larger than the window would truncate silently — this is
why the docs say the ONE value must be ≥ PROMPT_MAX_CHARS/3 + output.

### 5.2 The watcher saw nothing — the detector was blind (CLOSED)
**The strongest dissent.** `refreshOllamaModels` — the eye that fires
`window_changed` — runs only inside the in-process watcher
(`heimdall.mjs:2022` is in `startWatcher`'s tick). Under
`ER7_EXTERNAL_HEIMDALL=1` (the operator's live config), that watcher never
starts (`proxy.mjs:2197`), and `heimdall-fleet.mjs` probes peer `/heimdall`
endpoints only — it never reads Ollama `/api/ps`. So during the 23-reload
jam, the one instrument built to see window churn was **off**, and
`window_changed` fired 0 times. The dashboard's WASTE line was built from
`observeCall` (per-call `load_duration`), which is why the storm was visible
at all.

**Claim:** heimdall will catch the next window war.
**Falsifying control:** in external mode, force a window disagreement (one
caller declares a different `num_ctx`); a `window_changed` escalation must
appear.
**CLOSED 2026-09-21:** `refreshOllamaModels` is now exported and driven by the
external holon driver (`proxy.mjs:2374`), the same cadence that already ran
the holon tree in fleet mode. Verified live: the proxy logs "holon tree +
window eye driven locally every 30000ms". The eye that was off during the jam
now runs on the operator's exact configuration. The falsifying control above
is the standing check.

### 5.3 The box was pegged — reloads were not the whole story
**Claim:** removing the reload storm unblocks the box.
**Attack:** the reloads were ~160 s of waste, but the box was also saturated
by external load (the fleet read 11–115 across the session; a Brave renderer
at 12%, OpenCode helper at 54%, WindowServer at 44% on top of the draws) and
swap at 92%. With zero reloads, a 24-load box is still slow.
**Falsifying control:** run the same build with the fix and no external load;
it must complete. Run it under a 20+ load with the fix and it will still be
slow — the fix removes the self-inflicted reloading, **not** the box's other
residents. This is disclosed, not a failure: the jam had two causes, and this
fix addresses the one heimdall can (the caller behavior), not the one the
operator controls (other processes). heimdall's `hog_quit` ×4 and the memory
holon's standing down were the correct handles on the other half.

### 5.4 The restart window held (a control, passing)
**Claim:** heimdall correctly refused to restart a busy-but-alive server.
**Evidence:** `model_server_healthy_refused` and `model_server_restart_capped`
×13, and the probe now hits a real generate (lesson 22), not `/api/tags`.
**Falsifying control:** a wedged server (tags answers, generate hangs) must
still be restarted despite the cap; a merely busy server must never be.
Standing: the 2026-09-21 result confirmed the probe catches the wedge and
heimdall self-remedies.

## 6. What survives

- **The one-window rule is now structurally unanimous** for every heimdall
  caller, because nobody sends a window. This is the durable fix: it does not
  depend on future callers remembering to agree.
- **Budget and KV are sized to the same number** (8192) in both places that
  can start the model server.
- **The restart gate and the real-generate probe** held throughout; they are
  not in question.

## 7. What does not survive — named, with owners

1. **CLOSED — the window detector was off in fleet mode** (5.2). Now driven
   by the external holon driver; verified live. Standing falsifying control:
   a forced window disagreement must produce a `window_changed` escalation in
   external mode.
2. **The two server-config sources can drift** (5.1, Attack 2). setup-proxy.sh
   and heimdall's `modelServerConfig` both own `OLLAMA_CONTEXT_LENGTH`; a
   change to one without the other re-opens the disagreement. Owner:
   operator/heimdall — the pending restart is the live falsifying control.
3. **Silent truncation risk if the window is set under the budget** (5.1,
   Attack 3). Owner: documentation, once 5.2/5.1 are closed.

## 8. The one-line summary

Ollama was healthy; the box was being reloaded to death by its own callers
declaring disagreeing windows while the detector built to see that
disagreement was switched off in fleet mode. The fix makes the window a
single server-side fact no caller can contradict; the detector that would
have caught this class of failure remains off and is the named follow-up.