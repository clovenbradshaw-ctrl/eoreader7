# eo-reason: eoreader7 for Claude Code

A Claude Code plugin in which eoreader7 does the reasoning and Claude is the mouth.

Owner: Lovelace (archon-holocracy `role:lovelace`, Coding Capability Circle).

## Install

The plugin runs eoreader7 from your own clone, so it needs one. eoreader7's installer clones the repo, installs its dependencies, and adds this plugin when `claude` is on your PATH:

```bash
curl -fsSL https://bit.ly/install-eoreader7 | bash
```

If you already have a clone, run `npm ci` in it, then:

```bash
claude plugin marketplace add clovenbradshaw-ctrl/eoreader7 --sparse .claude-plugin claude-code
claude plugin install eo-reason@eoreader7
```

Restart Claude Code afterwards. The plugin looks for the clone at `~/eoreader7`. If yours is somewhere else, set `ER7_DIR` to its path in the environment Claude Code starts from. You also need `node` on your PATH.

When a session starts, the plugin checks the clone. If the clone, one of the hook scripts or mathjs is missing, it tells you what to run.

## What it does

- **Ledger.** Every prompt, tool call and turn end becomes one line on an eoreader7 ledger in the clone's `documents/` folder, where the engine reads its ledgers. Each line holds a bounded excerpt plus a pointer to the full event in Claude Code's transcript. Anything that matches the declared table of secret shapes (API keys, tokens, private keys, passwords) is replaced before it reaches disk. Nothing leaves your machine.
- **Reasoning gate** (Stop hook). A turn can end only after `cli/reason.mjs` has run in it. Every file the turn changed must be covered by a passing run that states a claim grounded at that file. The gate blocks once per turn, so the second stop always goes through.
- **Edit steering** (PreToolUse hook). An Edit, Write, NotebookEdit, or a Bash command that writes a file, is denied until a passing run covers that file. A `git commit` requires every file the turn changed to be covered.
- **`reason` skill** and an **`eo-reason`** command on the Bash PATH, which Claude uses to state its claims and run the check.

## Updating

The engine updates with `git pull` in your clone. The plugin's wiring updates with:

```bash
claude plugin marketplace update eoreader7
claude plugin update eo-reason@eoreader7
```

## Turning it down or off

- Keep the ledger but stop the gate and the steering: `touch ~/.claude/eo-reason/steer.off`. Delete that file to turn them back on.
- Turn everything off: `claude plugin disable eo-reason@eoreader7`.

The hooks fail open. A missing clone or script lets Claude carry on, and a hook that crashes logs to `~/.claude/eo-reason/errors.log`, so a broken hook can never lock you out of fixing it.
