import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCausalTextPerceiver, textEncounters } from "./native/adapters/text/recursive.js";
import { reviseTextFold } from "./native/adapters/text/revision.js";
import { createRecursiveReader } from "./native/kernel/reading.js";
import { createHyperlexicon, admitHyperlexiconCandidates } from "./native/kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "./native/kernel/relation-composition.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GIVER = "reader:eoreader7-proxy";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 };
const DEFAULT_POS_PRIOR = path.join(HERE, "legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json");

export const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";

function normalizePosPrior(prior, sourcePath) {
  if (!prior || prior.schema !== "POSPrior@1") throw new Error(`${sourcePath} is not a POSPrior@1 file`);
  if (prior.provenance?.source) return prior;
  if (prior.giver?.resource) {
    return { ...prior, provenance: { source: prior.giver.resource, url: prior.giver.url, license: prior.giver.resourceLicense, note: prior.giver.note } };
  }
  throw new Error(`${sourcePath} has neither provenance.source nor giver.resource`);
}

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

let cachedReader = null;
function getReader() {
  if (cachedReader) return cachedReader;
  let posPriorPath = DEFAULT_POS_PRIOR;
  if (!fs.existsSync(posPriorPath)) {
    throw new Error(`POS prior not found at ${posPriorPath}`);
  }
  const POS_PRIOR = normalizePosPrior(JSON.parse(fs.readFileSync(posPriorPath, "utf8")), posPriorPath);
  const adapters = {
    revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: CANONICALIZATION_FLOOR }),
    retrieve: emptyRetrieve,
  };
  const perceivers = [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: POS_PRIOR, descriptorAnchoring: ANCHORING })];
  cachedReader = createRecursiveReader({ perceivers, adapters });
  return cachedReader;
}

export async function offeredOllamaModels() {
  const res = await fetch(`${OLLAMA}/api/tags`);
  if (!res.ok) throw new Error(`ollama /api/tags: ${res.status}`);
  return res.json();
}

const CALL_MAX_TOKENS = 512;
const CALL_RETRIES = 2;

function makeOllamaCall(model, usage) {
  return async function call(messages, { maxTokens, json } = {}) {
    for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
      try {
        const res = await fetch(`${OLLAMA}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            ...(json ? { format: json === true ? "json" : json } : {}),
            options: { num_predict: maxTokens ?? CALL_MAX_TOKENS },
          }),
        });
        if (!res.ok) throw new Error(`ollama ${res.status}`);
        const data = await res.json();
        usage.promptTokens += data.prompt_eval_count ?? 0;
        usage.completionTokens += data.eval_count ?? 0;
        return data.message?.content ?? "";
      } catch (err) {
        if (attempt === CALL_RETRIES - 1) throw err;
      }
    }
  };
}

export async function runProxyTurn({ model, task, chatHistory = [], discourse = "" }) {
  const usage = { promptTokens: 0, completionTokens: 0 };
  
  // 1. Run EOReader7 reading pipeline over conversation material
  const materialLines = [];
  if (discourse) materialLines.push(`[System Context]: ${discourse}`);
  for (const m of chatHistory) {
    materialLines.push(`[${m.role}]: ${m.content}`);
  }
  materialLines.push(`[user]: ${task}`);
  const materialText = materialLines.join("\n\n");

  const encounters = textEncounters(materialText, { source: "proxy:turn", offset: 0 });
  const reader = getReader();
  for (const enc of encounters) {
    await reader.step(enc);
  }
  const fold = reader.getFold();
  const rawEntries = fold.graphEntries ?? [];
  const ledger = createRelationCompositionLedger(rawEntries);
  const stats = ledger.diagnostics();
  const observed = acquireCompositionCandidates(rawEntries, { minWitnesses: 1 });
  const hyperlexicon = admitHyperlexiconCandidates(createHyperlexicon(), observed.map((c) => ({
    left: c.left, right: c.right, giver: GIVER,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));
  const composition = Object.values(hyperlexicon.composition);

  // 2. Format reading findings digest to ground Ollama
  const digestParts = [];
  if (stats.relationEdges > 0 || stats.referentBindings > 0) {
    digestParts.push(`[EOReader7 Grounding: relations=${stats.relationEdges}, bindings=${stats.referentBindings}, hyperlexicon_entries=${composition.length}]`);
  }
  const readingDigest = digestParts.join("\n");

  // 3. Build messages for Ollama
  const ollamaMessages = [];
  let systemContent = "You are EOReader7, a precise reading instrument. Answer accurately based on the material provided.";
  if (discourse) systemContent += `\nContext: ${discourse}`;
  if (readingDigest) systemContent += `\n${readingDigest}`;
  
  ollamaMessages.push({ role: "system", content: systemContent });
  for (const m of chatHistory) {
    ollamaMessages.push({ role: m.role, content: m.content });
  }
  ollamaMessages.push({ role: "user", content: task });

  const call = makeOllamaCall(model, usage);
  const text = await call(ollamaMessages, { maxTokens: CALL_MAX_TOKENS });

  return {
    text,
    relationEdges: stats.relationEdges,
    referentBindings: stats.referentBindings,
    hyperlexiconCandidates: composition.length,
    usage,
  };
}
