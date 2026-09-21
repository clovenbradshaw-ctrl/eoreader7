#!/usr/bin/env bash
# eoreader7 — one-command install of the EOReader7 coding proxy.
#
#   ./setup-proxy.sh                install/link the proxy, wire opencode
#   ./setup-proxy.sh --no-link      don't npm-link the er7-proxy bin
#   ./setup-proxy.sh --no-config    don't touch opencode configs
#   ./setup-proxy.sh --no-models    don't pull the small local models
#
# Does (idempotently):
#   1. Checks Ollama (or another local model harness) is installed, running,
#      and reachable — installing it if it is not.
#   2. Pulls a few small models so the proxy has a mouth (skip: --no-models).
#   3. Installs `er7-proxy` so it's on PATH (npm link).
#   4. Starts the proxy on :11436 if it isn't already running.
#   5. Wires EVERY opencode config it can find (project + global) to the
#      er7: provider with streaming models.
#   6. Installs the er7-session opencode plugin so each conversation keeps
#      its own accumulating EOReader7 reader fold.
#
# The whole machine, one line from a fresh shell:
#   curl -fsSL https://bit.ly/install-eoreader7 | bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${ER7_PROXY_PORT:-11436}"
UPSTREAM="${ER7_UPSTREAM:-http://localhost:11434}"
MODELS="${ER7_MODELS:-gemma2:2b smollm2:1.7b qwen2.5-coder:1.5b nomic-embed-text}"
LINK=1
CONFIG=1
MODELS_ON=1

for arg in "$@"; do
  case "$arg" in
    --no-link) LINK=0 ;;
    --no-config) CONFIG=0 ;;
    --no-models) MODELS_ON=0 ;;
  esac
done

say()  { printf '\n==> %s\n' "$1"; }
ok() { printf '    %s\n' "$1"; }

say "EOReader7 setup"

# --- 0. node present ---------------------------------------------------------
command -v node >/dev/null 2>&1 || { echo "  error: node is required"; exit 1; }
ok "node $(node -v)"

# --- 0. Ollama — install if missing, then tune the daemon's memory policy ----
# eoreader7's mouth is a local model runner; without it the proxy has nothing
# to read with. On macOS the clean install is Homebrew; fall back to the
# official installer when brew is absent. The daemon env (below) is set
# through launchctl so it survives a reboot the way the shell's env cannot.
say "Checking Ollama — the local model runner the proxy reads through..."
if command -v ollama >/dev/null 2>&1; then
  ok "ollama present: $(ollama --version 2>/dev/null | head -1 || echo "installed")"
else
  say "Installing Ollama..."
  if command -v brew >/dev/null 2>&1; then
    brew install ollama >/dev/null 2>&1 && ok "installed via Homebrew" || { echo "  error: brew install ollama failed — install manually from https://ollama.com"; }
  else
    curl -fsSL https://ollama.com/install.sh | sh && ok "installed via official script" || { echo "  error: Ollama install failed — install manually from https://ollama.com"; }
  fi
fi
if ! curl -s -m 3 "$UPSTREAM/api/tags" > /dev/null 2>&1; then
  # Not answering yet — start it. Homebrew service first, then the app, then
  # warn (a first `ollama run <model>` will finish the job).
  brew services start ollama >/dev/null 2>&1 \
    || open -a "Ollama" >/dev/null 2>&1 \
    || echo "  warning: Ollama not answering at $UPSTREAM — start it (brew services start ollama)"
fi

# --- 0b. Ollama daemon memory policy — the "do not evict" rule, server-side --
# These are the durable dials the research (2026-09-17) said matter most on a
# shared box:
#   OLLAMA_KEEP_ALIVE          — hold models resident (eviction is the cost the
#                                next caller pays; the proxy already sends its
#                                own per-request keep_alive on top of this).
#   OLLAMA_MAX_LOADED_MODELS   — allow more than one model to co-reside so a
#                                second caller is not forced to evict the first.
#   OLLAMA_CONTEXT_LENGTH      — THE one window for the whole box (2026-09-21):
#                                every caller declares no num_ctx, so Ollama
#                                loads each model once at this single value and
#                                no request can disagree with another — the
#                                reload storm (measured 23 full reloads in one
#                                session) dies by construction. Sized to cover
#                                the proxy's prompt budget + output (8192 >=
#                                3072 prompt + 1024 output), not larger: a big
#                                KV cache starves the memory-starved box.
#   OLLAMA_NUM_PARALLEL        — slots per model; memory scales as slots x ctx.
# launchctl setenv applies to launchd-launched processes (the Ollama.app
# server is one), so this survives reboots. It does NOT change a running
# server until that server restarts — disclosed, never a silent surprise.
say "Tuning the Ollama daemon's memory policy (launchctl, durable)..."
launchctl setenv OLLAMA_KEEP_ALIVE "${OLLAMA_KEEP_ALIVE:-1h}" 2>/dev/null && ok "OLLAMA_KEEP_ALIVE=${OLLAMA_KEEP_ALIVE:-1h}"
launchctl setenv OLLAMA_MAX_LOADED_MODELS "${OLLAMA_MAX_LOADED_MODELS:-3}" 2>/dev/null && ok "OLLAMA_MAX_LOADED_MODELS=${OLLAMA_MAX_LOADED_MODELS:-3}"
launchctl setenv OLLAMA_CONTEXT_LENGTH "${OLLAMA_CONTEXT_LENGTH:-8192}" 2>/dev/null && ok "OLLAMA_CONTEXT_LENGTH=${OLLAMA_CONTEXT_LENGTH:-8192}"
launchctl setenv OLLAMA_NUM_PARALLEL "${OLLAMA_NUM_PARALLEL:-4}" 2>/dev/null && ok "OLLAMA_NUM_PARALLEL=${OLLAMA_NUM_PARALLEL:-4}"

# --- 1b. pull a few small models so the proxy has a mouth ----------------------
# Without a local model the proxy refuses everything. Default set is deliberately
# small (each under ~2 GB) so a fresh box is usable in minutes: a tiny general
# reader, a tiny coder, and a tiny embedding model. ER7_MODELS overrides the
# whole list (space-separated tags); pulls are skipped when already present.
if [ "$MODELS_ON" = "1" ]; then
  say "Ensuring the small local models are pulled (ER7_MODELS to override)..."
  if ! curl -s -m 3 "$UPSTREAM/api/tags" > /dev/null 2>&1; then
    echo "  warning: Ollama not answering at $UPSTREAM yet — skipping model pulls (start it, then re-run setup-proxy.sh)"
  else
    PRESENT="$(ollama list 2>/dev/null | awk '{print $1}')"
    for m in $MODELS; do
      if printf '%s\n' "$PRESENT" | grep -qx "$m"; then
        ok "$m already present"
      else
        echo "    pulling $m ..."
        ollama pull "$m" || echo "  warning: pull of $m failed (skip with --no-models)"
      fi
    done
  fi
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

# --- 3. run the proxy + external heimdall fleet ---------------------------------
# `er7-proxy start` brings up the fleet (heimdall-fleet.mjs, port 11438) first,
# then the proxy as a thin sandbox — a wedged proxy can never take its own
# watcher down (the 2026-09-20 lesson). The bare-node fallback below mirrors
# that: fleet up first, then proxy with ER7_EXTERNAL_HEIMDALL=1.
say "Starting EOReader7 proxy on port $PORT..."
if command -v er7-proxy >/dev/null 2>&1; then
  er7-proxy start || true
else
  if lsof -i :"$PORT" > /dev/null 2>&1; then
    ok "proxy already running on :$PORT"
  else
    (cd "$REPO_DIR" && ER7_EXTERNAL_HEIMDALL=1 nohup node heimdall-fleet.mjs --operator log > heimdall-fleet.log 2>&1 &)
    (cd "$REPO_DIR" && ER7_EXTERNAL_HEIMDALL=1 nohup node proxy.mjs > proxy.log 2>&1 &)
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
      er.models["er7:olmo2:7b"] = { name: "EOReader7 OLMo 2 7B (Grounded)" };
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
echo "  model       er7/er7:olmo2:7b"
echo "  commands    er7-proxy {start|stop|restart|status|log}"
echo "  fleet       er7-proxy {fleet:start|fleet:stop|fleet:status|fleet:log}"
echo "  one line    curl -fsSL https://bit.ly/install-eoreader7 | bash   (also https://bit.ly/install-the-fold)"
echo
echo "  Restart opencode, then pick the er7 model (e.g. er7/er7:olmo2:7b)."