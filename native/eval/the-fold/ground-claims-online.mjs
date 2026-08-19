// eval/ground-claims-online.mjs — third-party corroboration for the
// checkable historical claims the adversarial-dialogue seeds assert.
//
// Per user direction: "grounding should always be from a 3rd party." This
// never checks a claim against either speaker's own seed text — that would
// be circular, the debate corroborating itself. It checks against REAL
// pages fetched from the open web, chosen by a real search
// (candidate URLs below were found live via web search, not invented),
// judged by the SAME mechanical containment rule the app's own grounding
// ladder uses (proof.js::assessPage/foldProof, reused verbatim — no new
// verdict vocabulary, no LLM asked whether a page "supports" the claim).
//
// THIS MODULE OWNS THE NETWORK the same way explore-server.mjs does for the
// app (proof.js itself stays pure and network-free); this script is the one
// crossing, and it is the only new thing here — every verdict computation
// is proof.js's own, unmodified.
//
//   node eval/ground-claims-online.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { extractReadable, hostOf, looksLikeChallenge } from "../web.js";
import { assessPage, foldProof, proofQuery } from "../proof.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = "the-fold-adversarial-dialogue-eval/0.1 (research instrument; one page per claim check)";
const FETCH_TIMEOUT_MS = 15_000;

// Claims drawn directly from the two speakers' turn-0 seed statements in
// eval/adversarial-dialogue.mjs — the only claims checked here are ones
// BOTH speakers' opening positions actually depend on being true, so a
// failure here would undercut the debate's own premises, not a strawman.
// Candidate URLs are real search results (WebSearch, 2026-08-18) for each
// claim's own words — never the seed text itself, never each other.
const CLAIMS = [
  {
    kind: "edge",
    text: "Napoleon crossed the Niemen in June 1812",
    sentence: "He delayed the invasion until late June, well past the point where he could finish a campaign before winter.",
    tokens: ["niemen", "june"],
    urls: [
      "https://www.britannica.com/event/French-invasion-of-Russia",
      "https://www.worldhistory.org/Napoleon's_Invasion_of_Russia/",
      "http://1812now.blogspot.com/2012/06/june-24-1812napoleon-crosses-niemen.html",
    ],
  },
  {
    kind: "edge",
    text: "the Battle of Borodino was fought in September 1812",
    sentence: "Barclay and Kutuzov refused to give him until Borodino in September.",
    tokens: ["borodino", "september"],
    urls: [
      "https://www.britannica.com/event/Battle-of-Borodino",
      "https://www.historyofwar.org/articles/battles_borodino.html",
      "https://www.worldhistory.org/article/2274/battle-of-borodino/",
    ],
  },
  {
    kind: "edge",
    // The most specific, least-commonly-known of the three — the real test
    // of whether "distinct hosts" corroboration means anything, versus the
    // two dates above which almost any page about 1812 will restate.
    text: "Kutuzov decided at a council at Fili to abandon Moscow without a fight",
    sentence: "Kutuzov accepted battle at Borodino only when it suited Russian interests, then abandoned Moscow rather than risk the army defending it.",
    tokens: ["kutuzov", "fili"],
    urls: [
      "https://en.wikipedia.org/wiki/Council_at_Fili",
      "https://thehistoriansmagazine.com/blogs/early-modern/the-decision-to-cede-moscow-to-napoleon",
      "https://www.prlib.ru/en/history/619536",
    ],
  },
];

async function fetchPage(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: controller.signal, redirect: "follow" });
    if (!res.ok) return { url, gap: { silence: "off-endpoint", detail: `HTTP ${res.status}` } };
    const html = await res.text();
    const { title, text } = extractReadable(html);
    if (looksLikeChallenge({ title, textChars: text.length })) {
      return { url, host: hostOf(url), gap: { silence: "challenge", detail: `bot-challenge page: "${title}"` }, challenge: true };
    }
    if (!text.trim()) return { url, host: hostOf(url), gap: { silence: "not-present", detail: "page read but no extractable text" } };
    return { url, host: hostOf(url), title, text };
  } catch (err) {
    return { url, gap: { silence: "off-endpoint", detail: String(err?.message ?? err) } };
  } finally {
    clearTimeout(t);
  }
}

const results = [];
for (const claim of CLAIMS) {
  console.log(`\n— checking: "${claim.text}" —`);
  console.log(`query (proofQuery): ${proofQuery(claim)}`);
  const pages = [];
  for (const url of claim.urls) {
    const fetched = await fetchPage(url);
    if (fetched.gap) {
      console.log(`  ${url} — GAP: ${fetched.gap.silence} (${fetched.gap.detail})`);
      pages.push(fetched);
      continue;
    }
    const assessment = assessPage(claim, fetched.text);
    console.log(`  ${fetched.host} — stated: ${assessment.stated} (context ${assessment.context.shared}/${assessment.context.of} shared words)${fetched.challenge ? " [challenge]" : ""}`);
    pages.push({ ...fetched, assessment });
  }
  const fold = foldProof(claim, { query: proofQuery(claim), pages });
  console.log(`  → ${fold.verdict}: ${fold.sentence}`);
  results.push({ claim: claim.text, tokens: claim.tokens, urls: claim.urls, fold });
}

mkdirSync(join(HERE, "results"), { recursive: true });
const outPath = join(HERE, "results", `ground-claims-online-${process.env.DIALOGUE_STAMP ?? String(process.pid)}.json`);
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nwritten to ${outPath}`);

const corroborated = results.filter((r) => r.fold.verdict === "web-corroborated").length;
console.log(`\n${corroborated}/${results.length} claims web-corroborated by independent third-party pages (never the debate's own seed text).`);
