// derive-hard-meaning.mjs — re-fetches the real URLs the surf-wp-fwd-b run's
// own SURF-stage ledger line recorded as fetched (documents/surf-wp-fwd-b:1.jsonl),
// using surf.js's own liveWeb() fetch (the same organ the pipeline used, not
// a stand-in), and runs the real detectHardMeaning (hard-meaning.mjs) on
// each page's real re-fetched text. The ledger's own surfLines() detail
// records only host/chars/url per source, never the fetched body, so the
// text has to be re-derived by re-fetching, not read back verbatim.
import fs from "node:fs";
import path from "node:path";
import { liveWeb } from "../../../the-fold/surf.js";
import { detectHardMeaning } from "../../lavar/hard-meaning.mjs";

const DOC = path.join(process.cwd(), "documents", "surf-wp-fwd-b:1.jsonl");

function loadSurfSources(docPath) {
  const lines = fs.readFileSync(docPath, "utf8").split("\n").filter(Boolean);
  let surfText = null;
  for (const line of lines) {
    const d = JSON.parse(line);
    if (d.role === "surf" && !d.title?.startsWith("Surf: not run")) surfText = d.text; // last surf line wins (should be only one live run)
  }
  if (!surfText) throw new Error("no surf ledger line with a real run found");
  const urls = [];
  for (const raw of surfText.split("\n")) {
    // "  fetched      host.name    12345 chars  https://url..." — only status=fetched rows carry a URL worth re-fetching.
    const m = raw.match(/^\s*fetched\s+(\S+)\s+(\d+)\s+chars\s+(\S+)/);
    if (m) urls.push({ host: m[1], chars: Number(m[2]), url: m[3] });
  }
  return urls;
}

const sources = loadSurfSources(DOC);
console.error(`re-fetching ${sources.length} source(s) the surf ledger line marked "fetched"...`);

const web = liveWeb();
const report = [];
for (const s of sources) {
  try {
    const page = await web.fetch(s.url);
    const text = String(page?.text ?? "");
    const hard = detectHardMeaning({ task: "", texts: [{ text }] });
    report.push({ url: s.url, host: s.host, ledgerChars: s.chars, refetchedChars: text.length, hard });
  } catch (e) {
    report.push({ url: s.url, host: s.host, ledgerChars: s.chars, error: String(e?.message ?? e) });
  }
}

console.log(JSON.stringify(report, null, 2));
