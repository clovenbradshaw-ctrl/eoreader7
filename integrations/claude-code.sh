#!/bin/sh
# Run Claude Code through The Fold's Anthropic-compatible door.
#   sh claude-code.sh
export ANTHROPIC_BASE_URL="http://127.0.0.1:11436"
# The pipeline's model id; the mouth routes it to the real upstream.
export ANTHROPIC_MODEL="fold:opencode/claude-sonnet-4-6"
export ANTHROPIC_SMALL_FAST_MODEL="fold:opencode/claude-haiku-4-5"
# Any non-empty value; the proxy ignores the key.
export ANTHROPIC_API_KEY="not-needed"
exec claude "$@"
