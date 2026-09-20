#!/usr/bin/env bash
# eoreader7 — one line from a fresh shell, and the whole machine is on.
#
#   curl -fsSL https://raw.githubusercontent.com/clovenbradshaw-ctrl/eoreader7/main/install.sh | bash
#
# Does:
#   1. Clones eoreader7 into $ER7_DIR (default ~/eoreader7) if not already there.
#   2. Checks the local model harness — Ollama first, the others (opencode serve,
#      Anthropic lane) reported if reachable.
#   3. Installs Ollama if no model harness is present (Homebrew, else the
#      official installer; on macOS the app is launched).
#   4. Hands off to setup-proxy.sh, which pulls a few small models, links
#      `er7-proxy` onto PATH, starts the external heimdall fleet supervisor
#      (port 11438) and the proxy on :11436, and wires opencode.
#
# Overrides:
#   ER7_DIR        where to clone/expect the repo        (default ~/eoreader7)
#   ER7_MODELS     space-separated models to pull        (small default set)
#   ER7_PROXY_PORT proxy port                            (default 11436)
#   ER7_UPSTREAM   Ollama base URL                       (default http://localhost:11434)
set -e

DEFAULT_DIR="$HOME/eoreader7"
ER7_DIR="${ER7_DIR:-$DEFAULT_DIR}"
REPO="https://github.com/clovenbradshaw-ctrl/eoreader7.git"
UPSTREAM="${ER7_UPSTREAM:-http://localhost:11434}"

say()  { printf '\n==> %s\n' "$1"; }
ok() { printf '    %s\n' "$1"; }

say "eoreader7 — one-line install"

# --- 0. the repo --------------------------------------------------------------
if [ -f "$ER7_DIR/setup-proxy.sh" ]; then
  ok "repo already present at $ER7_DIR"
  if [ -d "$ER7_DIR/.git" ]; then
    say "Pulling latest so the installer is current..."
    git -C "$ER7_DIR" pull --ff-only >/dev/null 2>&1 && ok "pulled latest" || ok "(pull failed; using what's there)"
  fi
elif [ -d "$ER7_DIR/.git" ]; then
  ok "git repo at $ER7_DIR — pulling latest"
  git -C "$ER7_DIR" pull --ff-only >/dev/null 2>&1 || ok "(pull failed; using what's there)"
elif [ -n "$(ls -A "$ER7_DIR" 2>/dev/null)" ]; then
  say "error: $ER7_DIR exists and is not empty — set ER7_DIR to an empty target, or remove it"
  exit 1
else
  say "Cloning eoreader7 into $ER7_DIR ..."
  mkdir -p "$(dirname "$ER7_DIR")"
  git clone "$REPO" "$ER7_DIR"
  ok "cloned $REPO"
fi
cd "$ER7_DIR"

# --- 0. node ------------------------------------------------------------------
command -v node >/dev/null 2>&1 || {
  say "Installing node (required) ..."
  if command -v brew >/dev/null 2>&1; then
    brew install node >/dev/null 2>&1 && ok "node installed via Homebrew" \
      || { echo "  error: brew install node failed — install node from https://nodejs.org"; exit 1; }
  else
    echo "  error: node is required — install it from https://nodejs.org"
    exit 1
  fi
}
ok "node $(node -v)"

# --- 1. the model harness -------------------------------------------------------
# Ollama is the one the proxy reads through. If it is already answering, that is
# the harness; otherwise install it and let setup-proxy.sh start it. The other
# harnesses (opencode serve, the Anthropic lane) are optional mouths — reported,
# never required.
OLLAMA_OK=0
if command -v ollama >/dev/null 2>&1 && curl -s -m 3 "$UPSTREAM/api/tags" > /dev/null 2>&1; then
  OLLAMA_OK=1
fi

if command -v ollama >/dev/null 2>&1; then
  ok "ollama present: $(ollama --version 2>/dev/null | head -1 || echo installed)"
else
  say "Installing Ollama — the local model harness the proxy reads through..."
  if command -v brew >/dev/null 2>&1; then
    brew install ollama >/dev/null 2>&1 && ok "installed via Homebrew" \
      || { echo "  error: brew install ollama failed — install manually from https://ollama.com"; exit 1; }
  else
    curl -fsSL https://ollama.com/install.sh | sh && ok "installed via official script" \
      || { echo "  error: Ollama install failed — install manually from https://ollama.com"; exit 1; }
  fi
fi

if [ "$OLLAMA_OK" = "0" ]; then
  curl -s -m 3 "$UPSTREAM/api/tags" > /dev/null 2>&1 \
    || brew services start ollama >/dev/null 2>&1 \
    || open -a "Ollama" >/dev/null 2>&1 \
    || true
fi

# Other harnesses, if reachable — informational only.
curl -s -m 2 http://127.0.0.1:4096 > /dev/null 2>&1 && ok "opencode serve: reachable on :4096 (optional lane)" || true
curl -s -m 2 http://127.0.0.1:11438/health > /dev/null 2>&1 && ok "heimdall fleet: already watching on :11438" || ok "heimdall fleet: will be started by setup-proxy.sh (:11438)"

# --- 2. hand off to the real installer -----------------------------------------
say "Running setup-proxy.sh (models + proxy + opencode wiring)..."
"$ER7_DIR/setup-proxy.sh" "$@"