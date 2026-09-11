#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${ER7_PROXY_PORT:-11436}"
UPSTREAM="${ER7_UPSTREAM:-http://localhost:11434}"

echo "==> Setting up EOReader7 Proxy for OpenCode..."

# 1. Check Ollama upstream
echo "==> Checking Ollama upstream at $UPSTREAM..."
if ! curl -s "$UPSTREAM/api/tags" > /dev/null; then
  echo "Warning: Ollama is not responding at $UPSTREAM. Make sure Ollama is running."
else
  echo "    Ollama upstream is reachable."
fi

# 2. Start proxy in background if not already running
if lsof -i :"$PORT" > /dev/null 2>&1; then
  echo "==> EOReader7 Proxy is already running on port $PORT."
else
  echo "==> Starting EOReader7 Proxy on port $PORT..."
  cd "$REPO_DIR"
  nohup node proxy.mjs > proxy.log 2>&1 &
  sleep 1
  if lsof -i :"$PORT" > /dev/null 2>&1; then
    echo "    Proxy started successfully (PID: $!)."
  else
    echo "Error: Failed to start proxy. Check proxy.log for details."
    exit 1
  fi
fi

# 3. Update OpenCode configuration files
CONFIG_FILES=(
  "/Users/mlacy/Documents/3.0/the-fold/opencode.json"
  "/Users/mlacy/Documents/3.0/the-fold-loops/opencode.json"
  "/Users/mlacy/Documents/3.0/the-fold-latest/opencode.json"
)

for cfg in "${CONFIG_FILES[@]}"; do
  if [ -f "$cfg" ]; then
    echo "==> Updating OpenCode config at $cfg..."
    # We can use node to safely update json
    node -e '
      const fs = require("fs");
      const file = process.argv[1];
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      data.model = "ollama/er7:gemma2:2b";
      data.small_model = "ollama/er7:gemma2:2b";
      data.provider = data.provider || {};
      data.provider.ollama = data.provider.ollama || {};
      data.provider.ollama.options = data.provider.ollama.options || {};
      data.provider.ollama.options.baseURL = "http://localhost:'"$PORT"'";
      data.provider.ollama.models = data.provider.ollama.models || {};
      data.provider.ollama.models["er7:gemma2:2b"] = { name: "EOReader7 Gemma 2 2B (Grounded)", tool_call: true };
      data.provider.ollama.models["er7:llama3.1:8b"] = { name: "EOReader7 Llama 3.1 8B (Grounded)", tool_call: true };
      data.provider.ollama.models["er7:qwen2.5:14b-instruct-q4_K_M"] = { name: "EOReader7 Qwen 2.5 14B (Grounded)", tool_call: true };
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
    ' "$cfg"
  fi
done

echo ""
echo "==> Setup complete!"
echo "    - EOReader7 Proxy: http://localhost:$PORT"
echo "    - OpenCode configs updated with er7: models."
echo "    - Test health: curl http://localhost:$PORT/health"
