# The Fold — canonical ports and doors

One map, so any client (opencode, Ollama, curl, an SDK) knows where to point.
Everything below is loopback unless noted. Override any port with the env var
in the right-hand column.

## The pipeline

| port | who | what it is | env var |
|------|-----|------------|---------|
| **11436** | `proxy.mjs` | **the API** — OpenAI (`/v1/*`), Ollama (`/api/*`), Anthropic (`/v1/messages`), plus the native doors (`/v1/ask`, `/v1/read`, `/v1/swarm`, `/v1/documents`, `/v1/territory`, `/v1/code`, `/v1/agent`, `/v1/reason`). `GET /` is the self-describing map. | `ER7_PROXY_PORT` |
| 11437 | `proxy.mjs` | Heimdall alias (the watcher, inside the proxy process) | `ER7_STEER_ALIAS_PORT` |
| 11438 | `heimdall-fleet.mjs` | the external fleet supervisor (runs outside the proxy so a wedged proxy can't take its watcher down) | `ER7_HEIMDALL_FLEET_PORT` |
| 11439 | `penelope/mouth/server.mjs` | **the mouth** — admission + kind→wire routing for every model draw | `PENELOPE_MOUTH_PORT` |

## The model hosts

| port | who | what it is | env var |
|------|-----|------------|---------|
| **11435** | Ollama daemon | the real model runner (direct; skips the gate) | `ER7_OLLAMA_PORT` |
| **11434** | `proxy.mjs` channel | the gated Ollama-compatible door — forwards to 11435, answers `HEAD /` so `ollama run` works; OpenAI/Ollama clients walk the gate here | `ER7_CHANNEL_PORT` |
| 4096 | `opencode serve` | the second mouth — frontier models drawn through the opencode server's HTTP API (basic-auth; the proxy discovers its credentials) | `ER7_OPENCODE_URL`, `ER7_OPENCODE_PORT` |

## Pointing a client

- **OpenAI SDK / opencode / LibreChat / Continue** — base URL `http://127.0.0.1:11436/v1`, model `fold:<real-model>` (e.g. `fold:gemma2:2b`, `fold:opencode/claude-sonnet-4-6`).
- **Ollama clients** — `OLLAMA_HOST=http://127.0.0.1:11434` to walk the gate, or `http://127.0.0.1:11435` to skip it. Model `fold:<real-model>` through the gate.
- **Anthropic SDK / Claude Code** — base URL `http://127.0.0.1:11436`, `POST /v1/messages`.
- **Anything that just wants an answer** — `POST http://127.0.0.1:11436/v1/ask { "task": "..." }`.

The public model prefix is **`fold:`**. The legacy **`er7:`** prefix is still
accepted on every door, so older configs keep working.

## Start / stop

```
./local-up.sh          # foreground, logs to proxy.log (this box's way)
./local-up.sh bg       # background
er7-proxy start|stop|restart|status|log
er7-proxy fleet:start|fleet:stop|fleet:status|fleet:log
```

`local-up.sh` discovers the running `opencode serve` credentials itself, so the
frontier lane is offered without hardcoding secrets.
