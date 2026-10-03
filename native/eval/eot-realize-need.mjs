// eval/eot-realize-need.mjs — REASONING ABOUT WHAT A PROMPT NEEDS AND WHAT
// WOULD SATISFY IT, MECHANICALLY, ON THE RECORD. The need is parsed by
// closed-class grammar; the satisfaction check is arithmetic over the recalled
// record's own nodes; every step is a line the reply discloses.
import { GREETING, THANKS, GOODBYE, HELP, TOPIC_ASK } from "./eot-realize-lens.en.mjs";

const WH = /^(who|whom|whose|what|which|when|where|why|how)\b/i;
const IMPERATIVE = /^(tell|show|describe|explain|give|name|list|say|speak|read|recall|find|search)\b/i;
const ABOUT = /\b(about|regarding|concerning|on the subject of)\b/i;
export const STOP = new Set(("the a an and of to in for i you he she it we they me my your his her our their is are was were be been have has had do does did not no yes but so then when that this there here from with at on as or if about what why how who whom whose which tell show describe explain give name list say speak read recall find search me us please can would could should will shall do does did it").split(" "));

/** needOf(prompt) -> { kind, opener, needWords, satisfiedBy } — no model. */
export function needOf(prompt) {
  const text = String(prompt ?? "").trim();
  const opener = (WH.exec(text)?.[0] ?? IMPERATIVE.exec(text)?.[0] ?? null)?.toLowerCase();
  const isAction = /(did|does|do|happened|happen|became|said|didn.t|doing|goes|went)\b/i.test(text);
  const words = text.split(/\s+/).filter(Boolean).length;
  const kind = words <= 6 && GOODBYE.test(text) ? "goodbye"
    : words <= 6 && THANKS.test(text) ? "thanks"
      : HELP.test(text) ? "help"
        : TOPIC_ASK.test(text) ? "topic"
          : words <= 6 && GREETING.test(text) ? "greeting"
            : WH.test(text) ? (opener === "what" && isAction ? "action" : opener)
              : IMPERATIVE.test(text) ? "imperative" : ABOUT.test(text) ? "about" : "cue";
  const needWords = text.toLowerCase().split(/\W+/).filter((w) => w.length >= 2 && !STOP.has(w));
  const satisfiedBy = { name: false, date: false, place: false, action: kind === "action", words: needWords.length ? Math.max(1, Math.min(needWords.length, 2)) : 0 };
  if (opener === "who" || opener === "whom" || opener === "whose") satisfiedBy.name = true;
  if (opener === "when") satisfiedBy.date = true;
  if (opener === "where") satisfiedBy.place = true;
  return { kind, opener, needWords, satisfiedBy };
}
