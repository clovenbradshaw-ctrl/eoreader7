// falsify/split.mjs — 2026-09-28: the host merges Cyril with the title "Count Bezukhov"; blank the title from
// the bytes and the merge dissolves while Pierre stays separate. The conflation is the position-surface, not the men.
// Claim: removing the position's surfaces from the name pool leaves Pierre and Cyril as distinct beings
// (i.e. the merge is the title's doing, not the men's). Host over the first 400KB of the book, twice.
import { readFileSync } from "node:fs";
const N = new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");
const { createSession, admitChunked, sessionCast } = await import(`${N}/legacy-ported/packages/host/corpus.js`);
const text = readFileSync("/home/user/live_priors/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt", "utf8").replace(/\r\n/g, "\n").slice(0, 400000);
const run = (t, label) => { const s = createSession(); admitChunked(s, { text: t, sourceId: label, language: "en" }); const c = sessionCast(s, { sourceId: label }); return c.referents.filter((r) => r.surfaces.some((x) => /Pierre|Bez[uú]khov|Cyril/.test(x))).map((r) => r.surfaces.join("|")); };
console.log("as written:      ", run(text, "a"));
// the control: the title erased from the bytes (the position's surface, not the men's names)
console.log("title blanked:   ", run(text.replace(/Count Bez[uú]khov/g, "the count"), "b"));
