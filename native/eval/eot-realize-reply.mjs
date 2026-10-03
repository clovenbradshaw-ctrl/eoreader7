// eval/eot-realize-reply.mjs — REPLYING TO US: one conversational turn, the
// response determined by the INTENT and composed from measured state — never a
// hardcoded answer. A follow-up that names nothing of its own binds to the
// thread's being (the referent id we were already talking about).
import { needOf } from "./eot-realize-need.mjs";
import { GIVER } from "./eot-realize-lens.en.mjs";
import { answer } from "./eot-realize-answer.mjs";
import { intentOf, composeSocial } from "./eot-realize-intent.mjs";

export function reply({ store, index, field, referents, forms, params, prompt, last = null, state = {} }) {
  const intent = intentOf(prompt);
  if (intent) {
    const replyText = composeSocial(intent, state);
    return { void: { kind: intent.kind, needWords: [] }, lens: GIVER, answer: null, reply: replyText, thread: { void: { kind: intent.kind }, answer: replyText, voidReferent: null } };
  }
  const void_ = needOf(prompt);
  const ownIds = new Set();
  for (const w of void_.needWords) for (const id of referents?.resolveName?.(w) ?? []) ownIds.add(id);
  const bound = !ownIds.size && last?.voidReferent?.ids?.length ? last.voidReferent.ids : null;
  const boundVoid = bound ? { ...void_, needWords: [], boundRefs: bound } : void_;
  const a = answer({ store, index, field, referents, forms, params, prompt, boundVoid });
  return { ...a, lens: GIVER, reply: a.answer ?? a.finding, thread: { void: boundVoid, answer: a.answer ?? a.finding, refs: a.hunt?.passages?.map((h) => h.ref) ?? [], voidReferent: a.voidReferent } };
}
