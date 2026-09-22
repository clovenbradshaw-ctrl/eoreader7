#!/bin/sh
# eo-reason: run one of eoreader7's Claude Code hook scripts from your
# eoreader7 clone ($ER7_DIR, default ~/eoreader7). The plugin carries no copy
# of the engine. A missing clone or script never blocks Claude: the hook exits
# 0, and the SessionStart check (--check) says what is missing.
ER7="${ER7_DIR:-$HOME/eoreader7}"

if [ "$1" = "--check" ]; then
  missing=""
  for s in claude-code-ledger.mjs claude-code-reason-gate.mjs claude-code-steer.mjs reason.mjs; do
    [ -f "$ER7/cli/$s" ] || missing="$missing cli/$s"
  done
  [ -d "$ER7/node_modules/mathjs" ] || missing="$missing node_modules/mathjs"
  [ -z "$missing" ] && exit 0
  printf '{"systemMessage": "eo-reason: eoreader7 at %s is missing%s. Run the eoreader7 installer (curl -fsSL https://bit.ly/install-eoreader7 | bash), or git pull and npm ci in your clone, or set ER7_DIR to where your clone is."}\n' "$ER7" "$missing"
  exit 0
fi

[ -f "$ER7/cli/$1" ] || exit 0
exec node "$ER7/cli/$1"
