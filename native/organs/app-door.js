// ═══ THE APP DOOR — "an app that shows X and Y" is routed to a build of apps, never to a page of invented content ═══
//
// The prompt-only run (TEACH-IT-TO-FISH §5, 2026-10-01) asked for a weather + fuel-price app and got a static page about "Booking.com": the request was taken for a writing task. This is the routing
// half of the fix, PURE (no fetch, no model, no files):
//   detectAppTask(task)       is this a request for an app that SHOWS data? (an app-word and a show-verb, in the task's own words)
//   planNeeds(task, packs)    the data the person named, each need quoted from the task, each matched to the pack that can GROUND it — or named as a gap
//
// A PACK is what the system can actually build an app for: { id, needs: { weather: [trigger words], ... } }. The triggers are the person's everyday nouns for the need (a closed, declared class; giver: ordinary usage),
// not a model's guess. A phrase the person asked for that no pack grounds is a typed GAP quoted from the task — "flight prices" — never a section of made-up content. The model may propose the needs later (it is allowed
// anywhere it helps); what it proposes is held to the same rule: each need must quote the task and name a pack, or it is dropped.
const APP_WORD = /\b(app|application|dashboard|website|web ?site|web ?page|webpage|site|tool|widget)\b/i;
const SHOW_VERB = /\b(shows?|display(?:s|ing)?|check(?:s|ing)?|see(?:s|ing)?|tracks?|tracking|lists?|compare[s]?|finds?|looks? up|lets? (?:me|you|us|people|users?) (?:see|check|find|look up|compare))\b/i;
/** the words that introduce what is shown: the data phrase runs from here to the end of the sentence */
const SHOW_HEAD = /\b(?:shows?|display(?:s|ing)?|check(?:s|ing)?|see(?:s|ing)?|tracks?|tracking|lists?|compares?|finds?|looks? up|(?:see|check|find|look up|compare))\b\s+/i;

export const detectAppTask = (task) => { const t = String(task ?? ""); return t.length >= 12 && APP_WORD.test(t) && SHOW_VERB.test(t); };

/** the phrases the person asked to be shown: from the show-verb to the sentence end, split on `and`, commas and `&`; scope words ("anywhere", "near me") are trimmed off, never read as data */
export function phrasesOf(task) {
  const t = String(task ?? ""), m = SHOW_HEAD.exec(t);
  if (!m) return [];
  const tail = t.slice(m.index + m[0].length).split(/[.!?\n]/)[0];
  return tail.split(/\s*(?:,|&|\band\b|\bplus\b|\bas well as\b)\s*/i)
    .map((p) => p.replace(/\b(anywhere|everywhere|near me|nearby|in the world|worldwide|for any (?:place|city|location)|in any (?:place|city|location)|for me|today|right now|quickly|efficiently)\b.*$/i, "").replace(/^((?:the|a|an|current|live|local)\s+)+/i, "").trim())
    .filter((p) => p.length >= 3 && /[a-z]/i.test(p));
}

/**
 * planNeeds — each phrase is matched to the pack need whose triggers it contains. -> { schema, app, needs:[{ need, pack, quote }], covered:[packId], gaps:[{ quote, why }] }
 * Every `quote` is a substring of the task (checked), so a need cannot be one the person did not say.
 */
export function planNeeds(task, packs = []) {
  const text = String(task ?? ""), needs = [], gaps = [];
  for (const phrase of phrasesOf(text)) {
    const words = phrase.toLowerCase().match(/[a-z]+/g) ?? [];
    let hit = null;
    for (const pack of packs) for (const [need, triggers] of Object.entries(pack.needs)) if (!hit && triggers.some((w) => words.includes(w))) hit = { need, pack: pack.id, quote: phrase };
    if (hit && text.toLowerCase().includes(hit.quote.toLowerCase())) needs.push(hit);
    else gaps.push({ quote: phrase, why: "no pack can ground this: there is no source and no contract for it, so nothing real could be shown" });
  }
  return { schema: "EOAppPlan@1", app: detectAppTask(text), needs, covered: [...new Set(needs.map((n) => n.pack))], gaps };
}

/** the words the door says when it will not build: what was asked, what can be grounded, and the refusal to invent */
export function describePlan(plan) {
  const got = plan.needs.map((n) => `${n.need} ("${n.quote}")`), miss = plan.gaps.map((g) => `"${g.quote}"`);
  if (!plan.covered.length) return `I can't build that app yet: ${miss.length ? `nothing I can ground in real data for ${miss.join(", ")}` : "I could not tell what data it should show"}. I won't write a page of made-up content in its place — say which data it should show, or add a source for it.`;
  return `Building an app for ${got.join(", ")}.${miss.length ? ` Not covered, so left out and not invented: ${miss.join(", ")}.` : ""}`;
}
