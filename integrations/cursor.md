# The Fold in Cursor

Cursor routes custom OpenAI-compatible models through its OpenAI key settings.

1. **Settings → Models → OpenAI API Key**
2. Turn on **Override OpenAI Base URL** and set it to:
   `http://127.0.0.1:11436/v1`
3. Set the API key to any non-empty string (the proxy ignores it).
4. **Add model** and enter a fold-prefixed id, e.g. `fold:gemma2:2b` or
   `fold:opencode/claude-sonnet-4-6`.

The pipeline must be running: `./local-up.sh` in the eoreader7 repo.

Note: Cursor sends tool schemas for agent mode. The Fold is a text draw — use it
for chat/ask, not agentic edits. For real file edits, call `POST /v1/code`
directly with a `workspace` and a `testCommand`.
