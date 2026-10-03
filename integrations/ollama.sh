#!/bin/sh
# Use the ollama CLI against The Fold.
#
#   11434 — the gated channel (walks Heimdall's admission; recommended)
#   11435 — the raw daemon (skips the gate; plain models only)
export OLLAMA_HOST="http://127.0.0.1:11434"
# Model ids are fold-prefixed through the gate:
#   ollama run fold:gemma2:2b
#   ollama list
exec ollama "$@"
