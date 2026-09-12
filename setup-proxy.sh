#!/usr/bin/env bash
# eoreader7 — one-command install of the EOReader7 coding proxy.
#
#   ./setup-proxy.sh                install/link the proxy, wire opencode
#   ./setup-proxy.sh --no-link      don't npm-link the er7-proxy bin
#   ./setup-proxy.sh --no-config    don't touch opencode configs
#
# Does (idempotently):
#   1. Checks Ollama upstream is reachable.
#   2. Installs `er7-proxy` so it's on PATH (npm link).
#   3. Starts the proxy on :11436 if it isn't already running.
#   4. Wires EVERY opencode config it can find (project + global) to the
#      er7: provider with streaming models.
#   5. Installs the er7-session opencode plugin so each conversation keeps
#      its own accumulating EOReader7 reader fold.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${ER7_PROXY_PORT:-11436}"
UPSTREAM="${ER7_UPSTREAM:-http://localhost:11434}"
LINK=1
CONFIG=1

for arg in "$@"; do
  case "$arg" in
    --no-link) LINK=0 ;;
    --no-config) CONFIG=0 ;;
  esac
done

say()  { printf '\n==> %s\n' "$1"; }
ok() { printf '    %s\n' "$1"; }

say "EOReader7 setup"

# --- 0. node present ---------------------------------------------------------
command -v node >/dev/null 2>&1 || { echo "  error: node is required"; exit 1; }
ok "node $(node -v)"

# --- 1. Ollama upstream ------------------------------------------------------
say "Checking Ollama upstream at $UPSTREAM..."
if curl -s -m 3 "$UPSTREAM/api/tags" > /dev/null 2>&1; then
  ok "upstream reachable (models listed on /api/tags)"
else
  echo "  warning: Ollama not responding at $UPSTREAM — start it (brew services start ollama)"
fi

# --- 2. link er7-proxy onto PATH ---------------------------------------------
if [ "$LINK" = "1" ]; then
  say "Installing er7-proxy command (npm link, eoreader7-cli)..."
  (cd "$REPO_DIR/cli" && npm link >/dev/null 2>&1) || true
  if command -v er7-proxy >/dev/null 2>&1; then
    ok "er7-proxy installed: $(command -v er7-proxy)"
  else
    echo "  warning: npm link failed — run 'npm link' in $REPO_DIR/cli manually; proxy will still run via node."
  fi
fi

# --- 3. run the proxy ----------------------------------------------------------
say "Starting EOReader7 proxy on port $PORT..."
if command -v er7-proxy >/dev/null 2>&1; then
  er7-proxy start || true
else
  if lsof -i :"$PORT" > /dev/null 2>&1; then
    ok "proxy already running on :$PORT"
  else
    (cd "$REPO_DIR" && nohup node proxy.mjs > proxy.log 2>&1 &)
    sleep 1
  fi
fi
curl -s -m 3 "http://127.0.0.1:$PORT/health" && echo || echo "  warning: proxy not answering yet"

# --- 4. wire opencode configs ---------------------------------------------------
if [ "$CONFIG" = "1" ]; then
  say "Wiring opencode configs to the er7: provider..."

  CONFIG_FILES=()
  # global config
  for f in "$HOME/.config/opencode/opencode.json" "$HOME/.config/opencode/opencode.jsonc"; do
    [ -f "$f" ] && CONFIG_FILES+=("$f")
  done
  if [ "${#CONFIG_FILES[@]}" = "0" ]; then
    CONFIG_FILES+=("$HOME/.config/opencode/opencode.json")
  fi
  # project configs (this repo + the-fold workspaces)
  while IFS= read -r -d '' f; do
    case "$f" in
      *node_modules*|*/the-fold*/*) continue ;;
    esac
    CONFIG_FILES+=("$f")
  done < <(find "$REPO_DIR" /Users/mlacy/Documents/3.0 -name opencode.json -o -name opencode.jsonc 2>/dev/null | sort -u)

  for cfg in "${CONFIG_FILES[@]}"; do
    echo "    updating $cfg"
    PORT="$PORT" node -e '
      const fs = require("fs");
      const file = process.argv[1];
      const port = process.env.PORT;
      let text = fs.readFileSync(file, "utf8");
      let data;
      try { data = JSON.parse(text); }
      catch { console.error("    (skip, unparsable json)"); process.exit(0); }
      data.$schema = data.$schema ?? "https://opencode.ai/config.json";
      data.provider = data.provider ?? {};
      const er = data.provider.er7 ?? {};
      er.name = "EOReader7";
      er.options = er.options ?? {};
      er.options.baseURL = `http://127.0.0.1:${port}/v1`;
      er.api = "openai";
      er.models = er.models ?? {};
      er.models["er7:gemma2:2b"] = { name: "EOReader7 Gemma 2 2B (Grounded)" };
      er.models["er7:llama3.1:8b"] = { name: "EOReader7 Llama 3.1 8B (Grounded)" };
      er.models["er7:qwen2.5-coder:7b"] = { name: "EOReader7 Qwen2.5 Coder 7B (Grounded)" };
      er.models["er7:qwen3:8b"] = { name: "EOReader7 Qwen3 8B (Grounded)" };
      data.provider.er7 = er;
      fs.writeFileSync(file, text.startsWith("{") && text.includes("//") ? JSON.stringify(data, null, 2) + "\n" : JSON.stringify(data, null, 2) + "\n");
    ' "$cfg"
  done
  ok "${#CONFIG_FILES[@]} config file(s) updated"

  # --- 4b. install the session plugin ----------------------------------------------
  PLUGIN_SRC="$REPO_DIR/opencode/er7-session.mjs"
  PLUGIN_DIRS=(
    "$HOME/.config/opencode/plugin"
  )
  say "Installing er7-session opencode plugin (per-conversation reader memory)..."
  for d in "${PLUGIN_DIRS[@]}"; do
    mkdir -p "$d"
    cp "$PLUGIN_SRC" "$d/er7-session.mjs"
    ok "installed → $d/er7-session.mjs"
  done
fi

say "Done."
echo
echo "  proxy       http://127.0.0.1:$PORT/v1   (health: http://127.0.0.1:$PORT/health)"
echo "  model       er7/er7:gemma2:2b"
echo "  commands    er7-proxy {start|stop|restart|status|log}"
echo "  remote      curl -fsSL https://raw.githubusercontent.com/clovenbradshaw-ctrl/eoreader7/main/setup-proxy.sh | bash"
echo
echo "  Restart opencode, then pick the er7 model (e.g. er7/er7:gemma2:2b)."