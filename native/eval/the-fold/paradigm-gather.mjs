// Gather instance corpora for the paradigm study: MediaWiki category members
// as raw wikitext (recipes, obituaries), Wikipedia intros (background prose),
// and local man pages. One file per unit under corpus/<form>/.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const C = process.env.PARADIGM_CORPUS ?? path.join(path.dirname(new URL(import.meta.url).pathname), "results/paradigm-2026-09-22/corpus"); // Gutenberg texts: curl the pg1041/pg2002/pg982 plain-text files into it
const UA = { "user-agent": "the-fold-explore/0.1 (local research instrument; eoreader7 paradigm study)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Polite: one request at a time, a pause between, and a real backoff on 429.
const get = async (url) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(400);
    const r = await fetch(url, { headers: UA });
    if (r.status === 429) { const wait = Number(r.headers.get("retry-after")) * 1000 || 5000 * (attempt + 1); console.error(`429, waiting ${wait}ms`); await sleep(wait); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return r;
  }
  throw new Error(`gave up after 429s: ${url}`);
};
const save = (form, name, text) => { const d = path.join(C, form); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, name.replace(/[^\w.-]+/g, "_").slice(0, 80) + ".txt"), text); };

async function category(host, cat, form, max, { depthOne = false } = {}) {
  let cont = null, got = 0; const titles = [];
  do {
    const u = `https://${host}/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(cat)}&cmlimit=100&cmtype=page&format=json${cont ? `&cmcontinue=${encodeURIComponent(cont)}` : ""}`;
    const j = await (await get(u)).json();
    for (const m of j.query.categorymembers) if (m.ns === 0 || m.ns === 102) titles.push(m.title);
    cont = j.continue?.cmcontinue ?? null;
  } while (cont && titles.length < max * 1.5);
  for (const t of titles) {
    if (got >= max) break;
    try {
      const raw = await (await get(`https://${host}/w/index.php?title=${encodeURIComponent(t)}&action=raw`)).text();
      if (raw.length < 300 || /^#REDIRECT/i.test(raw)) continue;
      save(form, t, raw); got++;
    } catch (e) { console.error("skip", t, e.message); }
  }
  console.log(form, got, "of", titles.length, "listed");
}

const which = process.argv.slice(2);
if (which.includes("recipes")) await category("en.wikibooks.org", "Category:Recipes", "recipes", 80);
if (which.includes("obits")) await category("en.wikisource.org", "Category:Obituaries", "obits", 80);
if (which.includes("prose")) {
  let n = 0;
  for (let k = 0; k < 4; k++) {
    const j = await (await get("https://en.wikipedia.org/w/api.php?action=query&generator=random&grnnamespace=0&grnlimit=20&prop=extracts&exintro=1&explaintext=1&format=json")).json();
    for (const p of Object.values(j.query.pages)) if ((p.extract ?? "").split(/\s+/).length > 60) { save("prose", p.title, p.extract); n++; }
  }
  console.log("prose", n);
}
if (which.includes("man")) {
  const names = fs.readdirSync("/usr/share/man/man1").filter((f) => /\.1$/.test(f)).map((f) => f.replace(/\.1$/, ""));
  let n = 0;
  for (let i = 0; i < names.length && n < 120; i += Math.max(1, Math.floor(names.length / 150))) {
    try {
      const out = execFileSync("sh", ["-c", `MANPAGER=cat MANWIDTH=80 man 1 '${names[i].replace(/'/g, "")}' 2>/dev/null | col -b`], { encoding: "utf8", timeout: 8000 });
      if (out.split("\n").length > 15) { save("man", names[i], out); n++; }
    } catch {}
  }
  console.log("man", n);
}
