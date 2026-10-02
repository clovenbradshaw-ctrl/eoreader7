// seed.test.mjs — the CRISPR rung's pure organs, offline, against the REAL
// engine prior register (the closed classes are injected exactly as app.js
// injects them — no stub carries these walls). The network half lives in
// explore-server.mjs and is exercised live, the same posture every other
// P13 egress function holds; what is pinned here is everything decidable
// from bytes alone: demand detection, archetype grammar, license grading,
// file admission with counted drops, provenance shape, the forever-header,
// and provenance riding the build log through re-zeros and exports.

import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../kernel/task-log.js";
import { INDEFINITE_DETERMINERS } from "../adapters/text/priors.js";
import { makeBuildLog } from "./build-log.js";
import {
  PERMISSIVE_SPDX,
  gradeLicense,
  buildAsk,
  archetypeOf,
  admissibleFiles,
  pickSeedFile,
  seedProvenance,
  commentHeader,
  parseIngestCommand,
  INGEST_MAX_FILES,
} from "./seed.js";

const buildLog = makeBuildLog(taskLog);
const opts = { langs: new Set(["html", "svg", "python", "javascript", "css"]), indefinites: INDEFINITE_DETERMINERS };

test("buildAsk: a demand introduces its artifact (indefinite determiner + known lang); questions and langless asks do not", () => {
  assert.deepEqual(buildAsk("Make me a counter widget in html, with a plus button.", opts), { lang: "html" });
  assert.equal(buildAsk("what is a counter widget in html?", opts), null);
  assert.equal(buildAsk("Make me a counter widget.", opts), null);
  assert.equal(buildAsk("improve the html", opts), null); // no indefinite — nothing introduced
});

test("archetypeOf: grammar patterns in specificity order, the eochat-measured mechanics — never a model", () => {
  assert.equal(archetypeOf("a social media site like hacker news but for dolphins", { indefinites: INDEFINITE_DETERMINERS }), "hacker news");
  assert.equal(archetypeOf("make me a reddit clone in html", { indefinites: INDEFINITE_DETERMINERS, lang: "html" }), "reddit clone");
  assert.equal(archetypeOf("Make me a counter widget in html, with a plus button.", { indefinites: INDEFINITE_DETERMINERS, lang: "html" }), "counter widget");
  assert.equal(archetypeOf("just do it", { indefinites: INDEFINITE_DETERMINERS }), null);
});

test("gradeLicense: permissive splices, stated offers, NOASSERTION and null are unknown — and the grade never erases the signal", () => {
  assert.equal(gradeLicense("MIT").grade, "seedable");
  assert.equal(gradeLicense("CC0-1.0").grade, "seedable");
  assert.equal(gradeLicense("GPL-3.0").grade, "stated");
  assert.equal(gradeLicense("GPL-3.0").spdx, "GPL-3.0");
  assert.equal(gradeLicense("NOASSERTION").grade, "unknown");
  assert.equal(gradeLicense(null).grade, "unknown");
  assert.equal(PERMISSIVE_SPDX.has("MIT"), true);
});

test("admissibleFiles: known kinds only, machinery skipped by rule, the cap counted — never a silent drop", () => {
  const listing = [
    { type: "file", name: "index.html", path: "index.html", size: 900, download_url: "u1" },
    { type: "file", name: "app.min.js", path: "app.min.js", size: 100, download_url: "u2" },
    { type: "file", name: ".gitignore", path: ".gitignore", size: 10, download_url: "u3" },
    { type: "file", name: "package-lock.json", path: "package-lock.json", size: 10, download_url: "u4" },
    { type: "dir", name: "src", path: "src" },
    { type: "file", name: "style.css", path: "style.css", size: 300, download_url: "u5" },
    { type: "file", name: "big.html", path: "big.html", size: 999_999_999, download_url: "u6" },
  ];
  const a = admissibleFiles(listing);
  assert.deepEqual(a.files.map((f) => f.name), ["index.html", "style.css"]);
  assert.equal(a.dropped, 0);
  const many = Array.from({ length: INGEST_MAX_FILES + 3 }, (_, i) => ({ type: "file", name: `f${i}.html`, path: `f${i}.html`, size: 10, download_url: `u${i}` }));
  const capped = admissibleFiles(many);
  assert.equal(capped.files.length, INGEST_MAX_FILES);
  assert.equal(capped.dropped, 3);
});

test("pickSeedFile: exactly one file of the asked kind, or the conventional index — ambiguity refuses, never guesses", () => {
  const one = [{ type: "file", name: "counter.html", path: "counter.html", size: 10, download_url: "u" }];
  assert.equal(pickSeedFile(one, "html").name, "counter.html");
  const many = [
    { type: "file", name: "a.html", path: "a.html", size: 10, download_url: "u" },
    { type: "file", name: "b.html", path: "b.html", size: 10, download_url: "u" },
  ];
  assert.equal(pickSeedFile(many, "html"), null);
  const withIndex = [...many, { type: "file", name: "index.html", path: "index.html", size: 10, download_url: "u" }];
  assert.equal(pickSeedFile(withIndex, "html").name, "index.html");
  assert.equal(pickSeedFile(one, "python"), null);
});

test("parseIngestCommand reads the door mechanically: url or owner/name, nothing else", () => {
  assert.deepEqual(parseIngestCommand("/ingest https://github.com/d11z/asperitas"), { repo: "d11z/asperitas" });
  assert.deepEqual(parseIngestCommand("/ingest d11z/asperitas"), { repo: "d11z/asperitas" });
  assert.equal(parseIngestCommand("/ingest not-a-repo"), null);
  assert.equal(parseIngestCommand("/ingest"), null);
});

test("provenance is forever: it rides the birth, survives the re-zero onto the new ground, and stamps every export", () => {
  const prov = seedProvenance({ repo: "x/y", path: "index.html", url: "https://github.com/x/y/blob/HEAD/index.html", license: "MIT", stars: 12, retrievedAt: "2026-08-17T12:00:00Z" });
  assert.equal(prov.licenseGrade, "seedable");
  let log = buildLog.proposeBuild({
    n: 1, turn: 1, caption: "counter widget",
    seg: { type: "code", lang: "html", code: "<p>seed</p>" },
    instruction: "make me a counter widget", received: prov,
  });
  assert.deepEqual(buildLog.foldBuild(log).received, prov);
  // Through a patch, a re-zero, and another patch — ancestry never resets.
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "seed", add: "v2" }] }).log;
  log = buildLog.rezeroBuild(log, { code: "<p>fresh</p>", seg: { type: "code", lang: "html", code: "<p>fresh</p>" }, trigger: "I don't like it" });
  const b = buildLog.foldBuild(log);
  assert.equal(b.ground, 2);
  assert.deepEqual(b.received, prov);
  // The export carries the forever-line on its face, at every cursor.
  const out = buildLog.exportAt(log, undefined, { toDocument: null });
  assert.match(out.text, /^<!-- seeded from https:\/\/github\.com\/x\/y\/blob\/HEAD\/index\.html · MIT · 2026-08-17 -->\n/);
  // An unseeded build exports exactly as before — no header, no change.
  const plain = buildLog.proposeBuild({ n: 2, turn: 1, caption: "w", seg: { type: "code", lang: "html", code: "<p>x</p>" } });
  assert.equal(buildLog.exportAt(plain, undefined, {}).text, "<p>x</p>");
});

test("commentHeader speaks each language's own comment or stays silent — never a corrupted file", () => {
  const prov = { url: "https://github.com/x/y", license: null, retrievedAt: "2026-08-17T12:00:00Z" };
  assert.match(commentHeader("html", prov), /^<!-- seeded from .+ · license unknown · 2026-08-17 -->\n$/);
  assert.match(commentHeader("python", prov), /^# seeded from /);
  assert.match(commentHeader("javascript", prov), /^\/\* seeded from /);
  assert.equal(commentHeader("json", prov), "");
  assert.equal(commentHeader("html", null), "");
});
