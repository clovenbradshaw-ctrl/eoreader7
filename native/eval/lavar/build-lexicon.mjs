// build-lexicon.mjs — turn a document's own earned vocabulary into a
// standing, reusable, cross-document received prior (S99's tier; wired up
// per user direction after the "do we need it?" / "ok wire it up"
// exchange). This generalizes the one-off inline script that built
// aiw-earned-verbs.lexicon.json: any document that has been read (has
// per-chapter .prior.json files under results/) can have its verbs unioned
// into a lexicon any other document's reading can offer via --lexicon=.
//
// Deliberately does NOT touch cast. A .prior.json carries {verbs, cast}
// because within one document the same beings recur across chapters; a
// lexicon crosses documents, and S95's per-document boundary means
// identity does not transfer with it. This tool reads .prior.json files
// and writes out `{giver, verbs}` only — there is no code path here that
// even LOOKS at a `cast` field, the same guarantee eot-jsonl.mjs's
// --lexicon loader holds on the reading side.
//
// usage: node build-lexicon.mjs <bookBasename> [chapters]
//   node build-lexicon.mjs pg11_Alice_s_Adventures_in_Wonderland        (all chapters found)
//   node build-lexicon.mjs pg11_Alice_s_Adventures_in_Wonderland 1,2,3  (only these)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, "results");
const basename = process.argv[2];
if (!basename) { console.error("usage: node build-lexicon.mjs <bookBasename> [chapters]"); process.exit(1); }

const explicitChapters = (process.argv[3] ?? "").split(",").map((x) => Number(x.trim())).filter(Boolean);
const priorFiles = fs.readdirSync(RESULTS).filter((f) => f.startsWith(`${basename}-ch`) && f.endsWith(".prior.json"));
const chapterOf = (f) => Number(f.slice(basename.length + 3).replace(".prior.json", ""));
const chapters = (explicitChapters.length ? priorFiles.filter((f) => explicitChapters.includes(chapterOf(f))) : priorFiles)
  .map(chapterOf)
  .sort((a, b) => a - b);

if (!chapters.length) { console.error(`no .prior.json files found for "${basename}" under ${RESULTS}`); process.exit(2); }

const verbs = new Set();
for (const ch of chapters) {
  const p = path.join(RESULTS, `${basename}-ch${ch}.prior.json`);
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const v of d.verbs ?? []) verbs.add(v); // .cast is never read — see header
}

const out = {
  giver: `verbs earned reading ${basename} chapters ${chapters.join(",")}, unioned across each chapter's own recurrence-earned vocabulary — a received prior for a DIFFERENT document, never a same-document reread. Deliberately carries NO cast: referent identity must never cross documents (S95's per-document boundary).`,
  sourceDocument: basename,
  sourceChapters: chapters,
  verbs: [...verbs].sort(),
};
const outPath = path.join(RESULTS, `${basename}.lexicon.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`${basename}.lexicon.json: ${verbs.size} verbs from ${chapters.length} chapter(s) (${chapters.join(",")}) -> ${path.relative(process.cwd(), outPath)}`);
