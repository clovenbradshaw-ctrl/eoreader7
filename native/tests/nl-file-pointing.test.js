// nl-file-pointing.test.js — falsification tests for the NL file mechanics
// (proxy-runner.mjs): mentions are extracted mechanically, resolved to real
// bytes or typed gaps, ranked by activation history — and the mouth-facing
// guarantee holds structurally (identity without content).
//
// Each test states a guarantee and tries to break it. A failure here is a
// real finding about the turn pipeline, never a style complaint.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  extractNlFileMentions,
  resolveMentionedFile,
  touchFileActivation,
  rankFileActivation,
  resolveBasenameMention,
  anaphorKindFilter,
  ANAPHOR_RE,
  NL_MENTION_MAX,
} from "../../proxy-runner.mjs";
import { humanizeNote } from "../../proxy-api.mjs";

function makeWorkspace(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-nl-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (typeof content === "string") fs.writeFileSync(abs, content);
    else fs.writeFileSync(abs, content.binary);
  }
  return dir;
}

// ── extraction ─────────────────────────────────────────────────────────────

test("mentions: @path, backticked, quoted, and bare path-shaped tokens extract", () => {
  const out = extractNlFileMentions('what does @src/foo.js do? and "package.json" plus `a/b.ts` and bare c/d.py');
  // Class order encodes explicitness (@ > backticked > quoted > bare), not
  // text position: an explicit address outranks an incidental filename.
  assert.deepEqual(out, ["src/foo.js", "a/b.ts", "package.json", "c/d.py"]);
});

test("mentions: bare words without path shape are not files", () => {
  assert.deepEqual(extractNlFileMentions("check the config and the package please"), []);
});

test("mentions: an email address is not a file mention", () => {
  // FALSIFIES the naive @-capture: user@example.com must not become a
  // file_mentioned/file_missing round-trip.
  assert.deepEqual(extractNlFileMentions("mail me at user@example.com about it"), []);
});

test("mentions: capped, deduped, whitespace-safe", () => {
  const many = Array.from({ length: 10 }, (_, i) => `f${i}.js`).join(" ");
  const out = extractNlFileMentions(`${many} f0.js f0.js`);
  assert.equal(out.length, NL_MENTION_MAX);
  assert.deepEqual([...new Set(out)], out);
  assert.deepEqual(extractNlFileMentions(null), []);
  assert.deepEqual(extractNlFileMentions("a b".repeat(100)), []);
});

test("mentions: non-Latin filenames extract; hostile input stays fast", () => {
  assert.deepEqual(extractNlFileMentions("read café/naïve.js for me"), ["café/naïve.js"]);
  const t0 = Date.now();
  const out = extractNlFileMentions("@" + "a".repeat(5000) + " " + "lorem ipsum dolor ".repeat(20000));
  Date.now() - t0 < 1000 || assert.fail(`extractor too slow: ${Date.now() - t0}ms`);
  assert.deepEqual(out, []);
});

// ── resolution: real bytes or typed gaps ────────────────────────────────────

test("resolve: exact rel path resolves with identity, never content", () => {
  const dir = makeWorkspace({ "src/foo.js": "const x = 1;\n" });
  try {
    const r = resolveMentionedFile(dir, "src/foo.js");
    assert.equal(r.ok, true);
    assert.equal(r.rel, "src/foo.js");
    assert.ok(r.abs.endsWith("src/foo.js"));
    assert.equal(r.size, 13);
    // THE MOUTH-BLINDNESS GUARANTEE, structural: a resolution carries
    // identity (rel/abs/size/mtime) and never one byte of content.
    assert.ok(!("text" in r) && !("content" in r) && !("bytes" in r));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolve: miss, escape, dir, binary, and oversize are typed gaps", () => {
  const big = "x".repeat(50_000);
  const dir = makeWorkspace({
    "ok.js": "hi\n",
    "pic.png": { binary: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
    "big.js": big,
  });
  try {
    fs.mkdirSync(path.join(dir, "sub"), { recursive: true });
    assert.equal(resolveMentionedFile(dir, "nope.js").ok, false);
    assert.equal(resolveMentionedFile(dir, "nope.js").gap.kind, "file_missing");
    assert.equal(resolveMentionedFile(dir, "../evil.js").gap.kind, "invalid_path");
    assert.equal(resolveMentionedFile(dir, "sub").gap.kind, "not_a_file");
    const bin = resolveMentionedFile(dir, "pic.png");
    assert.equal(bin.ok, false);
    assert.equal(bin.gap.kind, "file_unreadable");
    assert.equal(bin.gap.rel, "pic.png");
    const tooBig = resolveMentionedFile(dir, "big.js");
    assert.equal(tooBig.ok, false);
    assert.equal(tooBig.gap.kind, "file_too_large");
    const noRoot = resolveMentionedFile(path.join(dir, "absent"), "ok.js");
    assert.equal(noRoot.ok, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolve: backslash separators normalize, absolute scheming stays inside", () => {
  const dir = makeWorkspace({ "src/foo.js": "x\n" });
  try {
    assert.equal(resolveMentionedFile(dir, "src\\foo.js").ok, true);
    assert.equal(resolveMentionedFile(dir, "/etc/passwd").ok, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── activation: history decides what "it" means ─────────────────────────────

function pointingSession(docs, turn = 10) {
  return { turnCount: turn, corpus: { documents: new Map(docs.map((d) => [d, {}])) }, fileActivation: null };
}

test("activation: recent + frequent outranks old + rare (Atta decay)", () => {
  const s = pointingSession(["old.js", "new.js"]);
  touchFileActivation(s, "old.js", "workspace");
  touchFileActivation(s, "old.js", "workspace");
  touchFileActivation(s, "old.js", "workspace");
  s.turnCount = 20; // ten turns later, the trail evaporated
  touchFileActivation(s, "new.js", "surfaced");
  const ranked = rankFileActivation(s).map((r) => r.sourceId);
  assert.deepEqual(ranked, ["new.js", "old.js"]);
});

test("activation: conversation sources are not pointable; dead trails stay dead", () => {
  const s = pointingSession(["real.js"]);
  touchFileActivation(s, "chat:s:turn-1", "workspace");
  touchFileActivation(s, "proxy:session:x", "workspace");
  touchFileActivation(s, "gone.js", "workspace");
  assert.ok(!s.fileActivation.has("chat:s:turn-1"));
  assert.ok(!s.fileActivation.has("proxy:session:x"));
  // gone.js was touched but is not in the corpus: unranked, never pointed at.
  assert.deepEqual(rankFileActivation(s).map((r) => r.sourceId), []);
  touchFileActivation(s, "real.js", "workspace");
  assert.deepEqual(rankFileActivation(s).map((r) => r.sourceId), ["real.js"]);
});

test("activation: basename resolves to the file in play", () => {
  const s = pointingSession(["a/package.json", "b/package.json"]);
  touchFileActivation(s, "b/package.json", "workspace");
  touchFileActivation(s, "b/package.json", "surfaced");
  assert.equal(resolveBasenameMention(s, "package.json"), "b/package.json");
  assert.equal(resolveBasenameMention(pointingSession(["x.js"]), "nope.js"), null);
});

test("anaphora: kind filters route, bare 'it' takes most-active", () => {
  assert.equal(ANAPHOR_RE.test("what does it do?"), true);
  assert.equal(ANAPHOR_RE.test("read that file for me"), true);
  assert.equal(ANAPHOR_RE.test("tell me about the weather"), false);
  const f = anaphorKindFilter("check the config");
  assert.equal(f("package.json"), true);
  assert.equal(f("src/foo.js"), false);
  assert.equal(anaphorKindFilter("run the tests")("a.test.js"), true);
  assert.equal(anaphorKindFilter("what does it do?"), null);
});

// ── display: the thinking panel shows the file work ─────────────────────────

test("humanizeNote: file moves render with names (thinking may name files; the mouth never sees them)", () => {
  assert.match(humanizeNote({ move: "file_mentioned", mentions: ["a.js"] }), /a\.js/);
  assert.match(humanizeNote({ move: "file_resolved", sourceId: "a.js", kind: "workspace", chars: 10 }), /a\.js/);
  assert.match(humanizeNote({ move: "file_missing", mention: "nope.js", reason: "no such file: nope.js" }), /nope\.js/);
  assert.match(humanizeNote({ move: "file_unreadable", rel: "p.png", reason: "not readable" }), /p\.png/);
  assert.match(humanizeNote({ move: "file_surfaced", sourceId: "a.js", chars: 3000 }), /a\.js/);
});

test("humanizeNote: sandbox moves render; unknown moves still suppressed", () => {
  assert.match(humanizeNote({ move: "agent_read", path: "v.js", contentChars: 5, turn: 1 }), /v\.js/);
  assert.match(humanizeNote({ move: "agent_write", path: "v.js", contentChars: 5, turn: 2 }), /v\.js/);
  assert.match(humanizeNote({ move: "agent_run", outputChars: 3, ok: true, turn: 3 }), /Sandbox/);
  assert.equal(humanizeNote({ move: "definitely_not_a_move" }), null);
});

test("humanizeNote: a cap-dropped file is a named gap, never silence", () => {
  assert.match(
    humanizeNote({ move: "file_dropped", sourceId: "big.js", kind: "workspace", reason: "surf cap full" }),
    /big\.js/,
  );
});

test("resolve: symlink escapes are refused, never followed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-nl-link-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "er7-nl-out-"));
  try {
    fs.writeFileSync(path.join(outside, "secret.txt"), "SECRET\n");
    let linked = false;
    try {
      fs.symlinkSync(path.join(outside, "secret.txt"), path.join(dir, "link.txt"));
      linked = true;
    } catch { /* no symlink privilege — skip */ }
    if (!linked) return;
    const r = resolveMentionedFile(dir, "link.txt");
    assert.equal(r.ok, false);
    assert.equal(r.gap.kind, "invalid_path");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
