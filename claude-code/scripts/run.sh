#!/bin/sh
# eo-reason: forward one Claude Code hook event, verbatim, to eoreader7's
# proxy ($ER7_URL, default http://127.0.0.1:11436) and relay its answer
# verbatim. What each event does is decided by eoreader7
# (claude-code-doorway.mjs), never here. If eoreader7 can't be reached the
# hook lets Claude carry on, and at session start it says so.
URL="${ER7_URL:-http://127.0.0.1:11436}"
answer="$(curl -sf -m 9 -X POST -H 'content-type: application/json' --data-binary @- "$URL/v1/hooks/claude-code" 2>/dev/null)"
status=$?
if [ "$status" -ne 0 ]; then
  if [ "$1" = "SessionStart" ]; then
    if [ "$status" -eq 22 ]; then
      why="answers at $URL but has no Claude Code doorway. Update it (git pull in your eoreader7 clone) and restart er7-proxy"
    else
      why="is not answering at $URL. Start it with er7-proxy, or run the eoreader7 installer"
    fi
    printf '{"systemMessage": "eo-reason: eoreader7 %s. Until then this session is not checked. Set ER7_URL if eoreader7 runs elsewhere."}\n' "$why"
  fi
  exit 0
fi
printf '%s' "$answer"
