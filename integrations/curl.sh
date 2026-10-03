#!/bin/sh
# The four doorways in one script. Run ./local-up.sh first.
BASE="http://127.0.0.1:11436"

echo "== roster =="
curl -s "$BASE/v1/models" | jq -r '.data[].id'

echo "== openai chat =="
curl -s "$BASE/v1/chat/completions" -H 'content-type: application/json' -d '{
  "model": "fold:gemma2:2b",
  "messages": [{"role": "user", "content": "Reply with exactly: fold ok"}]
}' | jq -r '.choices[0].message.content'

echo "== simplest door =="
curl -s "$BASE/v1/ask" -H 'content-type: application/json' \
  -d '{"task": "Reply with exactly: fold ok"}' | jq -r '.answer'

echo "== model-free read =="
curl -s "$BASE/v1/read" -H 'content-type: application/json' \
  -d '{"name": "sample", "text": "The cat sat on the mat."}' | jq '{schema, referents: (.referents|length)}'

echo "== ollama door =="
curl -s "$BASE/api/chat" -H 'content-type: application/json' \
  -d '{"model": "fold:gemma2:2b", "messages": [{"role": "user", "content": "hi"}]}' | jq -r '.message.content'
