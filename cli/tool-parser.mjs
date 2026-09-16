// tool-parser.mjs — pure parser for the coding agent's explicit tool-call
// protocol. No I/O, no engine import: safe to unit-test in isolation.
//
// WHY an explicit format instead of Ollama's native `tools` API param: this
// repo's whole model roster is small instruct models (gemma2:2b, llama3.2,
// phi3:mini — see the-fold/model-routing.js's own amendment history), and
// native function-calling support is inconsistent across them. Rather than
// find that out live mid-loop, the model is instructed (system prompt, see
// agent-loop.mjs) to always answer with ONE fenced JSON block:
//
//   ```json
//   {"tool": "read_file", "args": {"path": "foo.js"}}
//   ```
//
// "final_answer" is a tool name like any other — {"tool": "final_answer",
// "args": {"text": "..."}} — so the loop has exactly one exit shape to
// check for, not a second free-text branch. A response that does not
// parse is never a crash: it comes back as {ok: false, error, raw}, a
// typed gap the loop surfaces to both the transcript and the model itself
// (told to retry), matching this repo's standing convention (proxy-api.mjs's
// humanizeNote, code-loop.js's PATCH derivation) of naming a gap rather
// than guessing past it.
//
// Ollama's native `tools` parameter is NOT wired here at all (not even as
// a secondary attempt) — a deliberate scope cut, not an oversight, kept
// this way so there is exactly one call path to test and reason about.

export const KNOWN_TOOLS = Object.freeze([
  "read_file",
  "list_dir",
  "grep",
  "write_file",
  "run_command",
  "final_answer",
]);

/** Pull the first fenced code block's contents out of `text`, preferring one
 * tagged json/tool_call, else the first fenced block of any kind, else the
 * whole text (a model that forgets the fence but still emits raw JSON). */
function extractCandidate(text) {
  const fenced = [...text.matchAll(/```(\w*)\n([\s\S]*?)```/g)];
  if (fenced.length) {
    const tagged = fenced.find((m) => /^(json|tool_call|tool)$/i.test(m[1]));
    return (tagged ?? fenced[0])[2].trim();
  }
  return text.trim();
}

/** Find the first balanced {...} substring — a defensive fallback for a
 * model that pads its JSON with stray prose before/after it. */
function firstBalancedObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parse one model turn into a tool call. Returns:
 *   { ok: true, tool, args }              — a recognized, well-formed call
 *   { ok: false, error, raw }             — malformed or unrecognized; the
 *                                            loop surfaces this, never throws
 */
export function parseToolCall(rawText) {
  const raw = String(rawText ?? "");
  const candidate = extractCandidate(raw);

  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const balanced = firstBalancedObject(candidate) ?? firstBalancedObject(raw);
    if (!balanced) return { ok: false, error: "no JSON object found in the model's response", raw };
    try {
      parsed = JSON.parse(balanced);
    } catch (err) {
      return { ok: false, error: `JSON did not parse: ${err.message}`, raw };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "parsed value is not a JSON object", raw };
  }
  const { tool, args } = parsed;
  if (typeof tool !== "string" || !tool) {
    return { ok: false, error: 'missing required string field "tool"', raw };
  }
  if (!KNOWN_TOOLS.includes(tool)) {
    return { ok: false, error: `unknown tool "${tool}" — must be one of: ${KNOWN_TOOLS.join(", ")}`, raw };
  }
  if (args !== undefined && (typeof args !== "object" || args === null || Array.isArray(args))) {
    return { ok: false, error: '"args" must be an object when present', raw };
  }
  return { ok: true, tool, args: args ?? {} };
}
