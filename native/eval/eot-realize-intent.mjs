// eval/eot-realize-intent.mjs — DETERMINING WHAT THE USER WANTS, THEN HOW TO
// RESPOND: a reasoning pipeline, no hardcoded answer strings. The social
// intent's response is COMPOSED from the machine's measured state.
import { GREETING, THANKS, GOODBYE, HELP } from "./eot-realize-lens.en.mjs";
import { needOf } from "./eot-realize-need.mjs";

const HOW_ARE_YOU = /\bhow\s+are\s+you\b/i;

/** intentOf(prompt) -> the social intent or null (an ask — the loop owns it). */
export function intentOf(prompt) {
  const text = String(prompt ?? "").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const isPhatic = HOW_ARE_YOU.test(text);
  const kind = words <= 6 && GOODBYE.test(text) ? "goodbye"
    : words <= 6 && THANKS.test(text) ? "thanks"
      : HELP.test(text) ? "help"
        : words <= 6 && GREETING.test(text) ? "greeting" : null;
  return kind ? { kind, phatic: isPhatic && kind === "greeting" } : null;
}

/** Compose a social response from the machine's own measured state — no fixed
 *  strings: every sentence carries a real number, register, or last turn. */
export function composeSocial(intent, state = {}) {
  const regs = state.registers ?? [];
  const shown = regs.slice(0, 5).map((r) => r.name).join(", ");
  const names = `${shown}${regs.length > 5 ? `, and ${regs.length - 5} more` : ""}`;
  const at = state.loaded ? `${state.register ?? "this register"}, ${state.loaded.sentences} passages, ${state.loaded.addressed} addressed` : null;
  switch (intent.kind) {
    case "greeting": {
      const how = intent.phatic ? ` "how are you" asks for a state to report — I have no feelings, only an operational one: ${at ?? `reading ${state.register ?? "a register"}`}.` : "";
      return `A greeting, classified from the closed-class register.${how} I can reason over ${regs.length} live_priors registers (${names || "none loaded"}) — ask what a thing is, what it did, when or where it happened, or switch register to hear the not-quite-proper English.`;
    }
    case "thanks": {
      const last = state.last;
      return `Acknowledged: ${last ? `the ${last.kind ?? "turn"}${last.referent ? ` on ${last.referent}` : ""}` : "the last exchange"}. The reading stays open — ask the next thing.`;
    }
    case "goodbye":
      return `A closing, acknowledged. ${at ? `The reading stays at its address (${at}).` : "The reading stays where it was."} Come back when you want it again.`;
    case "help":
      return `A request for capability. A response can reason over ${regs.length} registers (${names || "none loaded"}): the void (your ask, parsed by closed-class grammar), the hunt (every passage holding the referent's words, by address), the admit (a definition connects only when its subject binds to the same referent — aliases fold onto one id), and the answer or refusal. No model on that leg. Ask who/what/when/where, or a dialect register (cosem, ubuntu-irc) for the not-quite-proper English.`;
    default:
      return "That move is not one of the registers I hold. Ask who/what/when/where.";
  }
}
