# eo-reason: eoreader7 for Claude Code

Claude Code as a client of eoreader7's pipeline, the same way the TUI and the browser surface are.

Owner: Lovelace (archon-holocracy `role:lovelace`, Coding Capability Circle).

## How it works

The plugin holds no eoreader7 logic. `scripts/run.sh` forwards every Claude Code hook event to the proxy's `POST /v1/hooks/claude-code` and relays the answer back unchanged. `bin/eo-reason` sends reasoning checks to `POST /v1/reason`. What each event does is decided in eoreader7, in `claude-code-doorway.mjs`, so the plugin doesn't change when eoreader7 gains a capability. `git pull` and a restart of `er7-proxy` are the whole update.

Today the engine's table does this:

- **Ledger.** Every prompt, tool call and turn end goes onto an eoreader7 ledger in the clone's `documents/`, with secrets replaced first by a declared table. Nothing leaves your machine.
- **Reasoning gate** (Stop). A turn can end only after a reasoning check has run in it, and every file the turn changed must be covered by a passing claim grounded at that file. It blocks once per turn.
- **Edit steering** (PreToolUse). An edit, a file-writing Bash command, or a `git commit` is denied until a passing check covers the files involved.

## Install

eoreader7's installer clones the repo, starts the proxy, and adds this plugin when `claude` is on your PATH:

```bash
curl -fsSL https://bit.ly/install-eoreader7 | bash
```

With eoreader7 already running:

```bash
claude plugin marketplace add clovenbradshaw-ctrl/eoreader7 --sparse .claude-plugin claude-code
claude plugin install eo-reason@eoreader7
```

Restart Claude Code afterwards. The plugin talks to `http://127.0.0.1:11436`; set `ER7_URL` in the environment Claude Code starts from if your proxy runs elsewhere. It needs `curl` and `sh`, nothing else. If the proxy can't be reached, or is too old to have the doorway, the hooks let Claude carry on and the session start says what to do.

## Turning it down or off

- Keep the ledger but stop the gate and the steering: `touch ~/.claude/eo-reason/steer.off`. Delete the file to turn them back on.
- Turn everything off: `claude plugin disable eo-reason@eoreader7`.
