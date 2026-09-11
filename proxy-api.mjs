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
  // Off by default: the reading pipeline (surf, fold, resolutions,
  // hyperlexicon) still runs — it just does its work UNCONSCIOUSLY, the
  // model gets the grounded prompt and answers, no narration in between.
  // Pass discloseThinking: true to see it (humanized — see humanizeNote,
  // never a raw JSON dump).
  const discloseThinking = body?.discloseThinking === true;
  return { model, ...turn, stream, discloseThinking };
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

// humanizeNote — turns one internal reading-pipeline note ({move, ...})
// into a plain-English line, or null to suppress it as noise.
// This is what a client renders as "reasoning" — prose, never a JSON dump.
// `move` names the actual reasoning step (searching, reading, surfacing,
// composing, resolving, answering) — no artificial span/kind taxonomy.
export function humanizeNote(note) {
  const { move } = note ?? {};
  switch (move) {
    case "upstream_down":
      return `Ollama isn't responding at ${note.target}.`;
    case "model_missing":
      return `Model "${note.model}" isn't pulled — available: ${(note.available ?? []).join(", ") || "(none)"}.`;
    case "reader_note":
      return note.description ? `Reader note: ${note.description}${note.result ? ` — ${note.result}` : ""}` : null;
    case "scanning":
      return `Scanning workspace: ${note.root}`;
    case "files_found":
      return `Found ${note.count} file(s), ${note.chars.toLocaleString()} chars.`;
    case "admitted":
      return `Admitted ${note.files} file(s) into the reading.`;
    case "conversation_folded":
      return `Folded ${note.chars} new char(s) of the conversation into the reading.`;
    case "read_error":
      return `Couldn't read ${note.rel}: ${note.error}`;
    case "reading":
      return `Reading: ${note.count} encounter(s) across ${note.chars} chars.`;
    case "open_question":
      return note.description ? `Open question noticed while reading: ${note.description}` : null;
    case "referent_index":
      return `Referent index: ${note.referents} referent(s) from ${note.encounters} encounter(s) (${note.ms}ms).`;
    case "resolutions_failed":
      return `Resolutions failed: ${note.error}`;
    case "resolutions":
      return `Resolved the discourse at level ${note.level} (${note.ms}ms); active referents: ${note.active?.length ?? 0}.`;
    case "surfaced":
      return note.operator === "FIELD"
        ? `Recalled ${note.fan} passage(s) by resemblance (the field; above its null band).`
        : note.operator === "FIELD+SEG"
          ? `Surfaced via the address ladder + the field's resemblance (${note.fan} total, ${note.boost} by resemblance).`
          : `Surfaced material via ${note.operator} (${note.fan} candidate window(s)).`;
    case "void":
      return `Nothing addressed the question (${note.gap}${note.reason ? `: ${note.reason}` : ""}).`;
    case "composed":
      return `Composed ${note.relations} relation edge(s), ${note.bindings} referent binding(s), ${note.hyperlexicon} hyperlexicon entr${note.hyperlexicon === 1 ? "y" : "ies"}.`;
    case "wiki_lookup":
      return `Looked up background on: ${(note.notes ?? []).join(", ")}`;
    case "prompt_budget":
      return `Prompt: system ${note.system}c + chat ${note.chatChars}c (${note.chat} msg) + material ${note.materialChars}c (${note.materialSegments} seg) + task ${note.taskChars}c, of ${note.max}c max.`;
    case "post_note":
      return note.message ?? null;
    case "post_timeout":
      return `Post-processing timed out — returned the model's original text.`;
    case "web_searched":
      return `Searched the web: ${note.pages} page(s) fetched, ${note.chars?.toLocaleString() ?? 0} chars admitted.`;
    case "gore_boundary":
      return `Gore's gather boundary: kept ${note.kept} of ${note.of} result(s) — ${note.basis}.`;
    case "gore":
      return `Gore: gathering sources on "${note.cue}".`;
    case "gore_landed":
      return `Gore's strike on "${note.cue}" landed: ${note.pages} page(s) folded into the reading while the section was being written.`;
    case "strike_revision":
      return `Revision: the reading grew — "${note.section}" rewritten with the new material (${note.reason}).`;
    case "competency":
      return note.reached
        ? `Competency reached: the reading was no longer meaningfully surprised by ${note.url} (${note.salient} salient, ${note.noise} noise) — we understand why, more sources would add noise.`
        : `Still learning from ${note.url} (${note.salient} salient, ${note.noise} noise).`;
    case "ignored":
      return `Ignored ${note.url}: shares only ${note.score} of the question's words — retained, not read.`;
    case "eot_ized":
      return `EOT-ized ${note.url} at ${note.resolution} resolution (${note.salient} salient moves).`;
    case "web_blocked":
      return `Web search blocked by bot-challenge.`;
    case "web_no_results":
      return `Web search returned no results.`;
    case "web_skipped":
      return `Skipped a page that isn't content: ${note.url} (${note.why}${note.basis ? ` — ${note.basis}` : ""}).`;
    case "web_error":
      return `Web search error: ${note.detail}`;
    case "code_gist":
      return `Code structure: ${note.entities} entit${note.entities === 1 ? "y" : "ies"}, ${note.edges} edge(s).`;
    case "composing_section":
      return `Composing section ${note.index} of ${note.of}: ${note.section}`;
    case "composing_skip":
      return `Skipped section "${note.section}": ${note.because}`;
    case "document_ledger":
      return `Document ledger ${note.docId}: ${note.parts} part(s) admitted. Declared shape: ${note.declared}`;
    case "answer_shape":
      return `Answer shape: ${note.shape} (${note.modality}).`;
    case "shape_check":
      return `Shape check: ${note.ok ? "the piece matches its declared form." : `missing — ${(note.failures ?? []).join("; ")}`}`;
    case "shape_recheck":
      return `Shape recheck: ${note.ok ? "the piece now matches its declared form." : `still missing — ${(note.failures ?? []).join("; ")}`}`;
    case "outline_evolved":
      return `Outline evolved: the reading established "${note.added}" — added as a section (${note.total} total).`;
    // Deliberately suppressed: per-file scan skips, per-segment surf detail,
    // and raw ollama request/streaming bookkeeping — all noise, no signal.
    default:
      return null;
  }
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
