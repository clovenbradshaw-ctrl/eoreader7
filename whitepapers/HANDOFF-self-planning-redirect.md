# Handoff: "let the system plan its own approach" redirect (in progress)

Status as of this checkpoint: **investigation started, no code changes yet
for the redirect itself.** The original mechanics (`archive-anchor.js`,
`whitepaper.js`, `whitepaper-html.js`, both whitepapers, the provenance
log) are already committed and pushed on this branch and are NOT being
thrown away — the redirect is about how sections/claims get PLANNED, not
about the archive-verification wall, which stays as is per the
coordinator's own point 3.

## The ask, precisely

Don't hand-write the whitepaper's section plan (which notes go in which
section, in what order) as a literal JS object the way
`whitepaper-driver.mjs` currently does. Instead, find or build a mechanism
where the SYSTEM decides that plan at run time from what's actually on the
ledger — the same "search for the organ before you hand-roll one"
discipline this codebase's own docs state everywhere.

## What I'd found in eoreader7 before checkpointing (not yet read in full)

The-fold's named planning mechanisms the coordinator listed (`grid.js`,
`void-loop.js`, `skills.js`, `holon.js`) **do not exist in this
repository** — confirmed by `find . -iname` across the whole tree. Those
are the-fold's own files (a separate, sibling repo this session does not
have checked out). eoreader7's own candidates, found by listing
`native/organs/`, not yet opened:

- `native/organs/capacities.js` + `native/organs/capacity-runner.js` —
  names suggest a capacity registry + dispatcher, possibly the
  eoreader7-side analogue of the-fold's `capacities.js`/
  `capacity-runner.js` (THE-27-CELLS.md's registry, per CLAUDE.md) — HIGH
  PRIORITY to read next, most likely candidate for "the system decides its
  own plan from what's available."
- `native/organs/distinguishing-plan.js` — name strongly suggests a
  planning organ. Not yet opened.
- `native/organs/void-holarchy.js`, `native/organs/void-outline.js` — the
  DEF/EVA/REC declare-then-fill loop the coordinator mentioned
  (`void-loop.js`) may have been ported/renamed into eoreader7 under one
  of these two names. Not yet opened.
- `native/plans/` — a directory, contents not yet listed.

## Next concrete step for whoever picks this up

1. Read `native/organs/capacities.js`, `capacity-runner.js`,
   `distinguishing-plan.js`, `void-holarchy.js`, `void-outline.js`, and
   `native/plans/*` in that order.
2. Whichever one answers "given a set of available organs/capabilities and
   the current ledger state, decide a plan for producing X" is the
   mechanism to drive the whitepaper composition through — NOT a new
   bespoke planner. If none of them fit after reading, say so explicitly
   and explain why before building anything new.
3. Rewire `native/eval/the-fold/whitepaper-driver.mjs` so the section
   list/order comes from that mechanism's own output (queried against the
   real ledger built in this driver), not from the hand-written `sections:
   [...]` array currently in the file.
4. Re-run both whitepapers through the new plan-driven path. If the plan
   the system produces differs materially from the hand-written one,
   regenerate `whitepaper-1-eoreader7.md`/`.html` and
   `whitepaper-2-stress-test.md`/`.html`. If it produces the same
   effective shape, say so and leave the existing files, rather than
   re-deriving prose that didn't change.

## Ollama — CPU, real, running

Installed and running successfully in this sandbox:

```
curl -fsSL https://ollama.com/install.sh -o /tmp/ollama-install.sh
apt-get install -y zstd   # required by the installer's extraction step, not present by default
bash /tmp/ollama-install.sh
nohup ollama serve > /tmp/ollama-serve.log &   # no systemd in this sandbox, so no service — run it directly
ollama pull gemma2:2b     # 1.6GB, pulled successfully over the network
```

Confirmed via `ollama-serve.log`: `inference compute id=cpu ... total="15.7 GiB"` — genuine CPU inference, no GPU detected (correctly falls back). `gemma2:2b` pull completed and verified (`success`). **Not yet used for an actual generation call in this session** — that's the next thing to do once the planning-mechanism question above is settled, since the model's role (if any) in the redirected pipeline depends on what that mechanism turns out to need from it (e.g. skills.js's own ladder in the-fold is mechanical-first with a model only as a constrained fallback — if eoreader7's analogue works the same way, a real generation call may only fire for the free-text pieces, not for the whole plan).

`ollama serve` is still running in this sandbox as of this checkpoint (background process, not managed by the harness — a fresh session picking this up will need to restart it with the same command above; `ollama list` will show `gemma2:2b` already pulled if the same container/filesystem persists, otherwise re-pull).
