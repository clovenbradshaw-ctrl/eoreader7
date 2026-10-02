# Penelope generation pointer

This is the current EOReader 7 ↔ Penelope boundary, recorded for the
2026-10-01 generation-pipeline change.

## Where generation happens

Application generation lives in the sibling private repository:

`../penelope/`

EOReader 7 is the **voyage/door/ground** side. Penelope is the **loom**:
it owns the weaving/unweaving pipeline that turns a library specification
and traced fields into an application and removes work that does not verify.

Do not copy Penelope's generation implementation into this repository.
When changing generation behavior, inspect Penelope first and preserve this
boundary.

## How the connection works

Penelope calls EOReader 7 doors. EOReader 7 owns:

- admission / Heimdall;
- the shared model mouth;
- witness grammar and grounding;
- the native organs and build adapters;
- the HTTP protocol surfaces used by Penelope.

The canonical EOReader 7 connection surface is `proxy.mjs`. The relevant
doors are documented in the root README.

For the current Penelope gym arrangement:

- chat draws use the admitted shared mouth;
- the Penelope gym session is `penelope-gym`;
- the shared model identity is `er7:gemma2:2b`;
- bounded 429/503 backoff is part of the connection contract;
- code-generation draws are intentionally kept on the direct Ollama path
  until the Penelope-side consolidation is completed.

These are recent measurements/decisions, not historical assumptions.

## Application birth versus patching

There is an important capability distinction.

`POST /v1/code` is the existing bounded **patch** door. It expects real,
already-existing files and mechanically applies model-proposed byte edits.

A new autonomous application needs a **create-capable build path**. The
2026-10-01 Penelope measurement showed that treating `/v1/code` as an
application-birth interface is insufficient: a two-prompt birth attempt
returned `done:false` and produced the intended bytes under the wrong path.

Therefore an application-birth flow must explicitly establish the file
skeleton/path authority before the model is allowed to populate it. The
intended integration choices recorded by Penelope are:

1. skeleton-first, followed by the existing patch loop; or
2. a dedicated `/v1/build` / `/v1/agent` create-capable route.

Do not silently reinterpret `/v1/code` as create-capable.

## Test target: Gmail-like UI backed by Matrix

The autonomy test that motivated this pointer is:

> Build a Gmail-like application backed by Matrix instead of email.

The model/agent should receive the goal and investigate the architecture,
Matrix protocol/SDK choices, room-to-inbox mapping, state/event handling,
compose/send flow, and tests itself.

EOReader 7's role in this experiment is to provide the doors, grounding,
real test execution, and audit trail. It should **coach/steer rather than
supply the implementation**.

Useful coaching points are directional, not code solutions. For example:

- identify how an inbox conversation maps onto a Matrix room;
- trace the complete send path from compose action to Matrix event;
- distinguish Matrix room state from timeline events;
- test the real boundary rather than mocking away the integration;
- when a test fails, name the subsystem to inspect instead of writing the fix.

## Verification rule

A green generation turn is not enough. The generated application must
survive its declared real test command, and the resulting files must be at
the intended paths.

The audit should record:

- task prompt;
- model used;
- files created/changed;
- tests actually run;
- failures and retries;
- coaching interventions;
- whether the model independently recovered;
- whether unrelated behavior regressed.

This pointer is intentionally factual and dated. If Penelope changes its
generation boundary, update this file and the root `PENELOPE.md` together.
