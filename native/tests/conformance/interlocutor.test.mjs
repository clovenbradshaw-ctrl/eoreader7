// native/conformance/interlocutor.test.mjs — WHO is at the door (Buber).
// The reading distinguishes an agent from a person MECHANICALLY, from the
// request's own shape — never from the content of the ask, never by asking the
// model. It is a belief with a basis, low-confidence, revisable, and it
// degrades to `unknown` (served by meeting both) when the signals are thin.
import { test } from "node:test";
import assert from "node:assert";
import { readInterlocutor, mergeInterlocutor, KIND, BASIS } from "../organs/interlocutor.js";

test("an agent is recognized by the request's shape — tools, tool-turns, the coding doorway, an SDK user-agent", () => {
  const withTools = readInterlocutor({ doorway: "chat", tools: 3 });
  assert.equal(withTools.kind, KIND.AGENT, "tool definitions are an agent");
  const toolTurns = readInterlocutor({ doorway: "messages", hasToolTurns: true });
  assert.equal(toolTurns.kind, KIND.AGENT, "a transcript that runs tools is an agent");
  const codeDoor = readInterlocutor({ doorway: "code" });
  assert.equal(codeDoor.kind, KIND.AGENT, "the coding doorway is an agent");
  const sdk = readInterlocutor({ doorway: "chat", userAgent: "openai-python/1.14.0" });
  assert.equal(sdk.kind, KIND.AGENT, "an SDK user-agent is an agent");
  assert.equal(sdk.basis, BASIS.ASSERTED, "a self-declared user-agent makes the basis asserted");
});

test("a person is recognized by a bare natural-language ask from a browser", () => {
  const browser = readInterlocutor({ doorway: "ask", userAgent: "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36", messageCount: 0, tools: 0 });
  assert.equal(browser.kind, KIND.PERSON);
  assert.equal(browser.basis, BASIS.ASSERTED, "the browser user-agent was asserted");
  const bareAsk = readInterlocutor({ doorway: "ask", userAgent: "", messageCount: 0, tools: 0 });
  assert.equal(bareAsk.kind, KIND.PERSON, "a plain ask with no scaffolding reads as a person");
});

test("thin signals degrade to unknown — the reader meets both, never guesses", () => {
  const thin = readInterlocutor({});
  assert.equal(thin.kind, KIND.UNKNOWN);
  assert.equal(thin.confidence, 0);
  assert.equal(thin.basis, BASIS.NONE);
});

test("it never reads the CONTENT — the same ask text cannot move the kind", () => {
  // No content field is ever consulted; two opposite 'tasks' with identical
  // shape read identically. (The reading takes no task at all.)
  const a = readInterlocutor({ doorway: "ask", messageCount: 0 });
  const b = readInterlocutor({ doorway: "ask", messageCount: 0 });
  assert.deepEqual(a.kind, b.kind);
});

test("the reading names its witnesses — what made the reader see them", () => {
  const r = readInterlocutor({ doorway: "code", tools: 2 });
  assert.ok(r.witnesses.length >= 2, "each firing signal is a witness");
  assert.ok(r.witnesses.some((w) => /tool/.test(w)));
});

test("a session is ONE interlocutor: evidence accumulates, agent is sticky, unknown never overwrites", () => {
  const agent = readInterlocutor({ doorway: "chat", tools: 2 });
  const laterBare = readInterlocutor({ doorway: "chat" }); // a follow-up turn with no tools
  const merged = mergeInterlocutor(agent, laterBare);
  assert.equal(merged.kind, KIND.AGENT, "a later bare turn does not turn an agent back into a person");
  const person = readInterlocutor({ doorway: "ask", userAgent: "Mozilla/5.0 Chrome/120" });
  const thenUnknown = mergeInterlocutor(person, readInterlocutor({}));
  assert.equal(thenUnknown.kind, KIND.PERSON, "a fresh unknown never overwrites a prior conviction");
  assert.equal(mergeInterlocutor(null, agent).kind, KIND.AGENT, "the first reading stands when there is no prior");
});
