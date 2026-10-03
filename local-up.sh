#!/bin/sh
# The Fold — local-up.sh: the durable way to start the pipeline on THIS box.
#
#   ./local-up.sh          foreground (logs to proxy.log)
#   ./local-up.sh bg       background
#
# One model host by default (the native Ollama daemon on 11435). The fleet
# bridge is opt-in only (ER7_FLEET_URL); the channel holds 11434 on both
# loopback families and forwards to the daemon.
#
# Canonical port map: docs/PORTS.md (and printed below on every start).
#
# The three rules this box runs by:
#   1. local → the native daemon (127.0.0.1:11435) — the only required host.
#   2. No ER7_OLLAMA_HOSTS override beyond that: the fleet bridge is NOT added
#      unless ER7_FLEET_URL names it (the proxy then adds it as a standby).
#   3. The channel holds 11434; the daemon is private at 11435. Point plain
#      ollama clients at 11435 to skip the gate, at 11434 to walk through it.
set -eu
cd "$(dirname "$0")"

# ── canonical ports (override any with the matching env var) ────────────────
PROXY_PORT="${ER7_PROXY_PORT:-11436}"
CHANNEL_PORT="${ER7_CHANNEL_PORT:-11434}"
OLLAMA_PORT="${ER7_OLLAMA_PORT:-11435}"
MOUTH_PORT="${PENELOPE_MOUTH_PORT:-11439}"
FLEET_PORT="${ER7_HEIMDALL_FLEET_PORT:-11438}"
OPENCODE_PORT="${ER7_OPENCODE_PORT:-4096}"

export ER7_OLLAMA_HOSTS="local=http://127.0.0.1:${OLLAMA_PORT}"
export ER7_FLEET_URL="${ER7_FLEET_URL:-}"
export ER7_OPENCODE_URL="http://127.0.0.1:${OPENCODE_PORT}"

# If the external heimdall fleet is already watching, run the proxy as a thin
# sandbox under it (a wedged proxy can then never take its own watcher down).
if curl -s -m 1 "http://127.0.0.1:${FLEET_PORT}/health" >/dev/null 2>&1; then
  export ER7_EXTERNAL_HEIMDALL=1
fi

# The second lane (`opencode serve`) draws frontier models through the
# opencode server's own HTTP API, which is basic-auth protected. Discover the
# running server's credentials from its process env rather than hardcoding
# them; a box with no server simply offers no frontier ids.
if [ -z "${OPENCODE_SERVER_PASSWORD:-}" ]; then
  OCPID="$(pgrep -f 'opencode serve' 2>/dev/null | head -1 || true)"
  if [ -n "${OCPID:-}" ]; then
    PW="$(ps eww -p "$OCPID" 2>/dev/null | tr ' ' '\n' | sed -n 's/^OPENCODE_SERVER_PASSWORD=//p' | head -1)"
    US="$(ps eww -p "$OCPID" 2>/dev/null | tr ' ' '\n' | sed -n 's/^OPENCODE_SERVER_USERNAME=//p' | head -1)"
    [ -n "$PW" ] && export OPENCODE_SERVER_PASSWORD="$PW"
    [ -n "$US" ] && export OPENCODE_SERVER_USERNAME="$US"
  fi
fi

print_map() {
  cat <<EOF

The Fold pipeline
  proxy (OpenAI · Ollama · Anthropic)  http://127.0.0.1:${PROXY_PORT}/v1
  self-describing map                  http://127.0.0.1:${PROXY_PORT}/
  health                               http://127.0.0.1:${PROXY_PORT}/health
  model prefix                         fold:<real-model>   (er7: still accepted)
  ollama daemon (direct)               http://127.0.0.1:${OLLAMA_PORT}
  ollama channel (gated)               http://127.0.0.1:${CHANNEL_PORT}
  penelope mouth                       http://127.0.0.1:${MOUTH_PORT}
  heimdall fleet                       http://127.0.0.1:${FLEET_PORT}
  opencode server (second mouth)       http://127.0.0.1:${OPENCODE_PORT}
EOF
}

if curl -s -m 1 "http://127.0.0.1:${PROXY_PORT}/health" >/dev/null 2>&1; then
  echo "proxy already up on http://127.0.0.1:${PROXY_PORT}"
  print_map
  exit 0
fi

if [ "${1:-}" = "bg" ]; then
  nohup node proxy.mjs >> proxy.log 2>&1 &
  echo "proxy starting in background (pid $!), logging to proxy.log"
  print_map
else
  print_map
  exec node proxy.mjs >> proxy.log 2>&1
fi
