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

## The channel — one door on the box (2026-09-21, later the same day)

**Handle: the channel.** Code: `native/kernel/model-server.js` (the one
address), `proxy.mjs` (`handleChannel`, `bootChannel`, the driver lock),
`heimdall.mjs` (`reconcileModelServers`, `ensureModelServer`,
`resolveServerKey`, `channelObserve`, `channelRefused`, `hostStandby`,
rules-as-levers), tests in `tests/heimdall-channel.test.mjs`.

What the evening measured before the change: two Ollama installs on one
port (homebrew on `127.0.0.1:11434`, Ollama.app on `[::]:11434`), and
`localhost` resolving to `::1` on this box — so half the callers reached one
daemon and half the other, each daemon reloading what the other had
resident; 105 files across eoreader7, the-fold and heimdall calling the
daemon directly with no admission at all; two proxies in one checkout
writing one ledger; a watchdog that read a probe timeout at 93% swap as a
wedge and restarted the daemon, which bred the second one.

The arrangement now:

1. **The daemon is private.** `ollama serve` binds the address derived from
   `MODEL_SERVER_URL` (default `127.0.0.1:11435`). Only Heimdall speaks to
   it; the proxy's own draws go straight there.
2. **Heimdall holds 11434, both families.** `127.0.0.1` and `::1`, so
   `localhost` and the dotted address land on the same door. Every one of
   the 105 direct callers lands on the channel unchanged.
3. **The channel admits per SERVER.** The calling process is resolved from
   the connection (lsof: peer port → pid → argv, cached per socket) and
   presented to the same line as `x-er7-caller`; a script that sends no
   header is still its own place in the round-robin, on the batch ration
   behind interactive work. A refused server gets `Retry-After` and a
   position; one that retries inside its hold doubles the hold (bounded by
   the SLA) and past the floor is the `retry_storm` finding.
4. **One window.** A caller's `num_ctx` is dropped and disclosed
   (`x-heimdall-window: held (asked N)`, `window_held` on the ledger); the
   daemon's single `OLLAMA_CONTEXT_LENGTH` is the window per model.
5. **The gate runs here too.** `antistrauss.gate` before every
   answer-generating call on the channel; embeddings excepted.
6. **The picker decides the host.** Sticky per server, resident first,
   shortest wait, rotate ties — and the fleet bridge (`heimdall up`, port
   8790) is a host by default: `bridge` by measurement (`/bridge/hello`),
   a **standby** until a phone behind it holds a model, a candidate for
   exactly the models the phones hold, never a cold candidate, never the
   target of a turn that came from it (hop mark, or the caller's pid owning
   the bridge's port).
7. **Every call is measured per server** — tokens in and out, wall, load —
   and disclosed at `GET /heimdall` → `channel.servers`.
8. **Multiple daemons → quit and reconcile** (the operator's rule). The
   collision probe finds a second `ollama serve` on the daemon's port, or any
   on the channel's, and `reconcileModelServers` keeps the oldest on the
   private port, quits the rest, quits the Ollama.app respawner, reaps
   orphaned runners, then ensures the daemon. Never on an unverified lsof
   (nothing quit; the probe retries). `reconcileDaemons` is the off switch.
9. **One driver per checkout.** `state/heimdall-driver.lock` names the proxy
   that drives holons, reaper, watchdog and channel; a second proxy in the
   same directory is a door only.
10. **A probe timeout under memory pressure is memory, not a wedge**; the
    watchdog stands down (`probe_timeout_under_pressure`), and
    `restartModelServer` refuses under pressure — a restart cannot make
    memory.
11. **Rules as levers.** A derived rule whose class names a lever
    (`saturated`/`expected_wait` → `familyCap` −1; `memory_pressured` →
    evict the least-recent resident) is applied on trial for one window; the
    finding's rate per bucket after is judged against the window before by a
    permutation null (α 0.05, the one disclosed constant); held → the lever
    stays and the rule stands `held`; not → reverted and conceded; a
    conceded key waits four windows. The learner reads observations only
    (act `eva`, or a snapshot folded from them) — never a holon's own acts.

Measured on the first boot (22:49): reconcile quit two daemons, the
menu-bar app and their runners; one daemon on 11435 (ctx 8192, 2 slots);
channel bound on both families; free memory 49 MB → 3.8 GB, compressor
9.6 GB → 3.4 GB, swap-out 2,732 pg/s → 0 within a minute; two eval
processes from other sessions admitted per pid, one of them held for
retrying inside its Retry-After.

Falsifying controls, run:
- `localhost` and `127.0.0.1` on 11434 must both answer with
  `x-heimdall-channel`. (Held.)
- A caller's `num_ctx` must not change the loaded window. (Held:
  `x-heimdall-window: held (asked 4096)`.)
- A model no phone holds must never be sent to the bridge. (Held: 404 from
  `local`, `x-heimdall-host: local`.)
- Two daemons after a reconcile would concede the act. (None found on the
  next probe.)

## The mouth — the fastest on-device model answers, and says so (2026-09-22)

User direction: use whatever model and system will be fastest for the
person, with little control on the surface, except anything that leaves the
device, which stays theirs. Six rules, each measured before it landed.

**Leaves the device is a prefix list, never a substring.** The fast pass
(`isUngatedModel` → `leavesDevice`) keys on `online/`, `anthropic/`,
`opencode/`, `deepseek/`, `openai/`, `openrouter/`, `claude-`. A model the
daemon has installed is on the device whatever its name. The old substring
list waved the local DeepSeek MoE (`deepseek-v2:16b-lite-chat-q4_0`) past
every local gate while it loaded onto this box.

**One decision, `mouthFor`, for the engine and the channel.** The engine's
own draws (`streamOllamaChat`) used to change only the host, so a cold model
meant a load and a busy one meant the queue. Now every local draw asks: the
asked model answers when it is resident inside the promise; else a WARM
on-device mouth answers when it is inside the promise AND sooner than the
asked model's measured time (its queue if resident, its measured load cost if
cold; an unmeasured load, a load into a pressured box, or a model the daemon
does not hold never counts as sooner). Never substituted: `x-er7-tier:
exact`, a model the person named in words, a draw with a logit bias, or a
model that leaves the device. Sticky per turn, so one voice finishes it. The
channel asks the same question before admission for a page (interactive) or
`tier: any` caller, never for embeddings or a request carrying images.

**The warm tier.** Beside the declared small mouth and the person's own
phone, any resident general-purpose model on a daemon (never an embedder, a
vision model, or a coder) is a substitute, ranked after the small mouth.

**The small mouth warms only onto an idle daemon.** On this box the daemon
had room for one model: a small-mouth warm beside a resident gemma2:2b
evicted it within 24 s, and the next gemma2:2b call evicted the small mouth
18 s later, 25 small-mouth loads in one hour. The warm now stands down
(`would_evict`) while any other generative model is resident.

**The liveness probe never loads a model.** Its own comment said "a small
resident model"; its code asked gemma2:2b every 30 s whether or not it was
loaded, with no keep-alive, so the idle watchdog loaded it (evicting
whatever was warm) and cut a resident model's keep-alive to the daemon's
10-minute default. It now asks only a model `/api/ps` says is resident,
carrying that model's remaining keep-alive; with nothing resident, tags
answering is the check.

**What is marked hot is what served.** The residency holon re-warms every
hot model it finds missing (45 s cadence). Marking the ASKED model hot at
turn start loaded it mid-turn even while a warm model was answering; each
draw now marks its own mouth, and only a model that will serve as asked is
marked at turn start.

**A page with a warm in-tab model is told at once.** A page that sends
`x-er7-in-tab: warm` is not held when admission measures the box past the
promise (`expected_wait`, `memory_pressured`, `model_diversity_capped`) and
no warm mouth answered: it gets the refusal immediately with
`x-heimdall-in-tab: answer-in-tab` and answers in its own tab. Fairness
refusals that clear inside the promise are still held.

**Disclosure.** Every substitution is logged (`mouth_substituted`), noted
once per turn (`move: "mouth"`), and returned as `served` on `/v1/ask`,
`/v1/chat/completions` (streamed and not), `/api/chat` and `/v1/messages`:
who answered each draw and one plain line when a stand-in spoke. The fold
names the mouth that actually spoke in its turn line.

Measured live the same day, a cold OLMo-2 1B asked with gemma2:2b warm:

| path | answered by | loads | note |
|---|---|---|---|
| channel, page origin | gemma2:2b (`ladder:warm`, provisional, revision id) | 0 | load 3 ms |
| engine `/v1/ask` | gemma2:2b (`served.provisional: true`) | 0 | model time 7.4 s of 37.7 s wall |

Controls, run: a busy small mouth loses to a measured faster cold load; a
pressured box never counts a load as sooner; a pinned tier, a spoken switch,
and a logit bias are never substituted; a remote model is never counted as a
local draw; a vision or coder model is never offered; a peek records
nothing; the probe sends no chat when nothing is resident (stub daemon).

## Not yet

- The engine's own pre-model stages took 30 s of the 37.7 s turn above; the
  mouth cannot touch that time.
- A phone-served call end to end: the phone was mid-relink when the bridge
  restarted, so the bridge read as standby (correct) and the proof is owed.
- Room mouths registered directly (`roomPathsFor`) are still unwired; today
  "across Matrix" reaches the picker through the bridge's `/api/ps`.
- The current turn's session comes from `_turn`, a single global; under
  true concurrency two turns can share it for a moment and stickiness
  degrades to shortest wait. Correct, just less sticky.
- The channel's server identity is `port:<n>` when lsof cannot answer in
  time on a loaded box; still a distinct place in line, just unnamed.
