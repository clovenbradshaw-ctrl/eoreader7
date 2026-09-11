// proxy-api.mjs — pure wire-shape module for the EOReader7 proxy.
// No fetch, no node:*, no engine imports.

export const MODEL_PREFIX = "er7:";
export const DISCOURSE_MAX_CHARS = 300;

export function prefixModel(realName) {
  return `${MODEL_PREFIX}${realName}`;
}

export function stripModelPrefix(modelId) {
  if (!modelId || typeof modelId !== "string") return null;
  if (modelId.startsWith(MODEL_PREFIX)) return modelId.slice(MODEL_PREFIX.length);
  return null;
}

export function turnFromMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (!list.length) return { error: "messages must be a non-empty array" };
  const last = list[list.length - 1];
  if (!last || last.role !== "user")
    return { error: 'the last message must have role "user" — eoreader7 answers a question, it does not continue an assistant turn' };
  const task = String(last.content ?? "").trim();
  if (!task) return { error: "the last user message has no content" };
  const rest = list.slice(0, -1);
  const chatHistory = rest
    .filter((m) => m?.role === "user" || m?.role === "assistant")
    .map((m) => ({ role: m.role, content: String(m.content ?? "") }));
  const discourse = rest
    .filter((m) => m?.role === "system")
    .map((m) => String(m.content ?? ""))
    .join(" ")
    .trim()
    .slice(0, DISCOURSE_MAX_CHARS);
  const droppedRoles = [...new Set(rest.filter((m) => !["user", "assistant", "system"].includes(m?.role)).map((m) => m.role))];
  return { task, chatHistory, discourse, droppedRoles };
}

export function parseProxyRequest(body) {
  const model = stripModelPrefix(body?.model);
  if (!model)
    return {
      error: `model must be an er7-prefixed id, e.g. "${prefixModel("llama3.1:8b")}" — got ${JSON.stringify(body?.model ?? null)}`,
    };
  const turn = turnFromMessages(body?.messages);
  if (turn.error) return { error: turn.error };
  const stream = Boolean(body?.stream);
  return { model, ...turn, stream };
}

export function toOpenAIModelList(realNames, { createdAt = 0 } = {}) {
  return {
    object: "list",
    data: realNames.map((name) => ({ id: prefixModel(name), object: "model", created: createdAt, owned_by: "eoreader7" })),
  };
}

export function reprefixOllamaTags(realTagsJson) {
  const models = Array.isArray(realTagsJson?.models) ? realTagsJson.models : [];
  return {
    models: models.map((m) => ({ ...m, name: prefixModel(m.name ?? m.model ?? ""), model: prefixModel(m.model ?? m.name ?? "") })),
  };
}

export function openAIResponse({ id, model, text, created, usage, reading }) {
  return {
    id,
    object: "chat.completion",
    created,
    model,
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: {
      prompt_tokens: usage?.promptTokens ?? 0,
      completion_tokens: usage?.completionTokens ?? 0,
      total_tokens: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
    },
    reading,
  };
}

export function openAIStreamLines({ id, model, text, created, reading }) {
  const base = { id, object: "chat.completion.chunk", created, model };
  return [
    `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }] })}\n\n`,
    `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], reading })}\n\n`,
    "data: [DONE]\n\n",
  ];
}

export function ollamaChatResponse({ model, text, createdAt, usage, reading }) {
  return {
    model,
    created_at: createdAt,
    message: { role: "assistant", content: text },
    done: true,
    done_reason: "stop",
    prompt_eval_count: usage?.promptTokens ?? 0,
    eval_count: usage?.completionTokens ?? 0,
    reading,
  };
}

export function ollamaChatStreamLines({ model, text, createdAt, usage, reading }) {
  return [
    JSON.stringify({ model, created_at: createdAt, message: { role: "assistant", content: text }, done: false }) + "\n",
    JSON.stringify({
      model,
      created_at: createdAt,
      message: { role: "assistant", content: "" },
      done: true,
      done_reason: "stop",
      prompt_eval_count: usage?.promptTokens ?? 0,
      eval_count: usage?.completionTokens ?? 0,
      reading,
    }) + "\n",
  ];
}
