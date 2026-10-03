// conformance/screen-pipeline.test.mjs — the screenshot reader as part of the pipeline (PR #144's tool, brought in).
//
// What is tested is the contract the pipeline relies on, not the tool's taste:
//   - the node read and the browser tool are ONE implementation (byte-identical output on the same pixels)
//   - a sidecar regenerates the page WITHOUT the image (byte-identical to the live model, JSON round-tripped)
//   - the gate separates a screen from a photograph, and says which number decided it
//   - a read says what it did not see (typed gaps), and never invents a value it did not measure
//   - generation refuses a single observation, a contested colour, and a scale that does not descend
//   - the looking seam carries it: lookAtImage returns a screen read with no vision model and no venv
//
// Tests that need ffmpeg / tesseract skip with a NAMED reason when the binary is absent (an unrun check is
// reported unmeasured, never passed — the discipline the repo's fixture_absent skips already hold).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// the looking seam reads its model server at import: point it nowhere, so no vision model can be reached or waited on
process.env.ER7_OLLAMA_URL = "http://127.0.0.1:1";
process.env.ER7_MNEMONIC = "0";
delete process.env.VISUAL_DETECT_PYTHON;

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(here, "../adapters/image/fixtures");
const SAMPLE = path.join(FIX, "sample-1200x820.png");

const { CV, SCREEN_SETTINGS, screenTools, readScreen, readScreenPixels, linesFromTsv, prepLine, decodeImage } = await import("../adapters/image/screen-read.js");
const { sidecarOf, htmlOf, readingTextOf, ledgerLinesOf, loadSidecar, saveSidecar, CORE_ID, slimModel } = await import("../adapters/image/screen-sidecar.js");
const { lookAtScreen, flatShareOf, FLAT_SHARE_FLOOR } = await import("../organs/look-screen.js");
const { styleFromScreens, layerStyle, MIN_WITNESSES } = await import("../organs/screen-style.js");

const tools = screenTools();
const NEEDS_DECODE = tools.ffmpeg && tools.ffprobe ? false : "ffmpeg/ffprobe not on PATH — the decode crossing is unmeasured here";
const NEEDS_OCR = NEEDS_DECODE || (tools.tesseract ? false : "tesseract not on PATH — the OCR crossing is unmeasured here");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "er7-screen-test-"));

// ── the tool and the pipeline are one implementation ─────────────────────────

test("the node read generates byte-identical HTML to the browser tool on the same pixels", { skip: NEEDS_DECODE }, async () => {
  const read = await readScreen(SAMPLE, { ocr: false });
  const html = CV.generate(read.model, { mode: "flex", title: "Converted screenshot" });
  // the fixture is what the browser tool generated from this PNG (native/tools/screenshot-to-html.html, Skip OCR, flex)
  assert.equal(html, fs.readFileSync(path.join(FIX, "sample-1200x820.noocr.flex.html"), "utf8"));
});

test("the browser tool loads the shared core, not a copy of it", () => {
  const page = fs.readFileSync(path.resolve(here, "../tools/screenshot-to-html.html"), "utf8");
  assert.match(page, /<script src="\.\.\/adapters\/image\/screen-core\.cjs"><\/script>/);
  assert.doesNotMatch(page, /function analyze\(|function findBoxes\(/, "the core's functions must not be duplicated inline in the page");
});

// ── the sidecar keeps the read ───────────────────────────────────────────────

test("a sidecar regenerates the page without the image: JSON round trip, both layouts, byte-identical to the live model", { skip: NEEDS_DECODE }, async () => {
  const read = await readScreen(SAMPLE, { ocr: false });
  const stored = JSON.parse(JSON.stringify(sidecarOf(read)));
  for (const mode of ["flex", "abs"]) {
    assert.equal(htmlOf(stored, { mode }), CV.generate(read.model, { mode, title: stored.source.name }), `${mode} layout differs from the live model`);
  }
});

test("the round trip holds at another density: a 2x read carries its unit through the sidecar", { skip: NEEDS_DECODE }, async () => {
  const read = await readScreen(SAMPLE, { ocr: false, dpr: 2 });
  assert.equal(read.model.unit, 0.5, "original pixels per prepared pixel over density");
  const stored = JSON.parse(JSON.stringify(sidecarOf(read)));
  assert.equal(htmlOf(stored, { mode: "flex" }), CV.generate(read.model, { mode: "flex", title: stored.source.name }));
  assert.notEqual(htmlOf(stored, { mode: "flex" }), CV.generate({ ...read.model, unit: 1 }, { mode: "flex", title: stored.source.name }), "the unit must change the page (else this test cannot see it)");
  assert.equal(stored.tokens.viewport.width, 600, "tokens are CSS px: 1200 original px at 2x");
});

test("a sidecar is keyed by the bytes: same image, same sha256; a different instrument is a different sidecar", { skip: NEEDS_DECODE }, async () => {
  const read = await readScreen(SAMPLE, { ocr: false });
  const sc = sidecarOf(read);
  assert.equal(sc.source.sha256.length, 64);
  assert.equal(sc.core, CORE_ID);
  const dir = tmp();
  const f = saveSidecar(sc, { dir });
  assert.equal(loadSidecar(sc.source.sha256, { dir })?.source.sha256, sc.source.sha256);
  const torn = JSON.parse(fs.readFileSync(f, "utf8")); torn.core = "someotherinstr";
  fs.writeFileSync(f, JSON.stringify(torn));
  assert.equal(loadSidecar(sc.source.sha256, { dir }), null, "a sidecar made by a different measuring core must not be read back as this one's");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a read says what it did not see: typed gaps, and no token without an observation behind it", { skip: NEEDS_DECODE }, async () => {
  const sc = sidecarOf(await readScreen(SAMPLE, { ocr: false }));
  const kinds = sc.gaps.map((g) => g.kind);
  assert.ok(kinds.includes("ocr_absent"), "OCR did not run: that is a named gap");
  assert.ok(kinds.includes("image_regions_unread"), "image regions are a colour, not a picture — a named gap");
  assert.equal(sc.tokens.ink, null, "no text was read, so no ink colour was measured");
  assert.equal(sc.tokens.type, null, "no text was read, so no type scale was measured");
  assert.match(sc.standing, /No vision model ran/);
});

test("the settings in force are named with their givers (II.11): every one set by hand, none measured", () => {
  for (const [name, s] of Object.entries(SCREEN_SETTINGS)) {
    assert.ok(s.giver && s.basis, `${name} has no giver/basis`);
    assert.match(s.giver, /set by hand/, `${name} must not pass as measured`);
  }
});

// ── the read's crossings ─────────────────────────────────────────────────────

test("tesseract TSV -> lines: words grouped by line, boxes unioned, non-words dropped", () => {
  const tsv = [
    "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext",
    "1\t1\t0\t0\t0\t0\t0\t0\t400\t100\t-1\t",
    "5\t1\t1\t1\t1\t1\t10\t20\t50\t12\t96.5\tHello",
    "5\t1\t1\t1\t1\t2\t70\t22\t60\t12\t90\tworld",
    "5\t1\t1\t1\t2\t1\t10\t50\t40\t12\t80\tSecond",
    "5\t1\t1\t1\t2\t2\t60\t50\t10\t12\t80\t   ",
  ].join("\n");
  const lines = linesFromTsv(tsv);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, "Hello world");
  assert.deepEqual(lines[0].bbox, { x0: 10, y0: 20, x1: 130, y1: 34 });
  assert.equal(lines[0].words.length, 2);
  assert.equal(lines[1].text, "Second", "a blank word is not a word");
});

test("prepLine sets the MINORITY class as ink whichever polarity the text has (light on a fill, dark on a page)", () => {
  const mk = (bg, fg) => { // 60x20 region, a 12x6 block of fg on bg
    const W = 60, H = 20, data = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { const x = i % W, y = (i / W) | 0, on = x >= 20 && x < 32 && y >= 7 && y < 13, c = on ? fg : bg; data.set([...c, 255], i * 4); }
    return { width: W, height: H, data };
  };
  for (const [bg, fg, label] of [[[37, 99, 235], [255, 255, 255], "white on blue"], [[244, 246, 251], [20, 20, 20], "dark on light"]]) {
    const p = prepLine(mk(bg, fg), { x: 0, y: 0, w: 60, h: 20 }, 1, 2);
    const at = (x, y) => p.gray[(y + p.pad) * p.w + x + p.pad];
    assert.equal(at(26, 10), 0, `${label}: the text block must be ink (black)`);
    assert.equal(at(2, 2), 255, `${label}: the fill/page must be paper (white)`);
  }
});

// ── the gate ─────────────────────────────────────────────────────────────────

test("the gate: a screen passes and noise does not, and the floor names the measurement it came from", { skip: NEEDS_DECODE }, async () => {
  const { img } = await decodeImage(SAMPLE);
  assert.ok(flatShareOf(img).share >= FLAT_SHARE_FLOOR.value, "the generated UI sample is a screen");
  const W = 300, H = 300, data = new Uint8ClampedArray(W * H * 4);
  let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 255;
  for (let i = 0; i < W * H; i++) data.set([rnd(), rnd(), rnd(), 255], i * 4);
  assert.ok(flatShareOf({ width: W, height: H, data }).share < FLAT_SHARE_FLOOR.value, "noise has no flat regions to measure");
  // the floor must sit inside the gap its own basis records (UI min 0.861, photographic max 0.676) — noise scores ~0 and cannot pin it
  assert.ok(FLAT_SHARE_FLOOR.value > 0.676 && FLAT_SHARE_FLOOR.value < 0.861, `floor ${FLAT_SHARE_FLOOR.value} is outside the measured gap 0.676-0.861`);
  assert.match(FLAT_SHARE_FLOOR.giver, /measured/);
  assert.match(FLAT_SHARE_FLOOR.basis, /12 UI screenshots.*17 photographic/s);
});

test("lookAtScreen: a screen is read and kept, a repeat is a cache hit, a non-screen is refused with its number", { skip: NEEDS_OCR }, async () => {
  const dir = tmp();
  const first = await lookAtScreen(SAMPLE, { dir });
  assert.equal(first.screen, true);
  assert.equal(first.cached, false);
  assert.match(first.text, /Acme Labs/, "the header's text was read");
  assert.match(first.text, /Structure, top to bottom:/);
  assert.ok(first.factLines.some((l) => /Acme Labs/.test(l)), "the vision read is judged against these");
  assert.ok(first.ledgerLines.every((l) => l.schema === "EOTObservation@1" && Array.isArray(l.at.region) && l.at.region.length === 4));
  const second = await lookAtScreen(SAMPLE, { dir });
  assert.equal(second.cached, true, "the look is done once per (bytes, instrument)");
  // noise as a file
  const W = 320, H = 320, px = Buffer.alloc(W * H * 3);
  let s = 99; for (let i = 0; i < px.length; i++) px[i] = (s = (s * 1103515245 + 12345) & 0x7fffffff) >> 7 & 255;
  const noise = path.join(dir, "noise.ppm"); fs.writeFileSync(noise, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), px]));
  const r = await lookAtScreen(noise, { dir });
  assert.equal(r.screen, false);
  assert.equal(r.reason, "not_a_screen");
  assert.ok(r.gate.flatShare < r.gate.floor, "the refusal carries the number that decided it");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("ER7_SCREEN=0 turns the screen sense off, loudly named", async () => {
  process.env.ER7_SCREEN = "0";
  try { const r = await lookAtScreen(SAMPLE, { dir: tmp() }); assert.equal(r.screen, false); assert.equal(r.reason, "disabled"); }
  finally { delete process.env.ER7_SCREEN; }
});

// ── the looking seam carries it ──────────────────────────────────────────────

test("lookAtImage returns a screen read with no vision model and no OpenCV venv, and discloses both as missing", { skip: NEEDS_OCR }, async () => {
  const dir = tmp(); process.env.ER7_SCREEN_DIR = dir;
  try {
    const { lookAtImage } = await import("../organs/look.js");
    const r = await lookAtImage(SAMPLE, { name: "sample.png" });
    assert.equal(r.screen.applies, true);
    assert.match(r.text, /Acme Labs/);
    assert.ok(r.sidecar && r.sidecar.elements.length > 10);
    assert.ok(r.visionError, "the vision model's absence is disclosed, not hidden");
    assert.ok(r.detectorError, "the OpenCV detector's absence is disclosed, not hidden");
    assert.ok(r.ledgerLines.some((l) => l.role === "visual-box" && /screen-read/.test(l.witnesses[0])));
    assert.ok(r.fold.boxes.size > 5, "the fold sees the screen's boxes");
    assert.match(r.standing, /SCREEN READ \(mechanical, no vision model\)/);
  } finally { delete process.env.ER7_SCREEN_DIR; fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the reading text lists structure with pixel regions, the measured colours, and its gaps — and only what was measured", { skip: NEEDS_OCR }, async () => {
  const sc = sidecarOf(await readScreen(SAMPLE));
  const t = readingTextOf(sc);
  assert.match(t, /no vision model/);
  assert.match(t, /Colours: background #[0-9a-f]{6}/);
  assert.match(t, /- header \[0,0,1200,\d+\]/);
  assert.match(t, /\(content not read\)/, "an unread image region is labelled unread");
  // every quoted string in the reading (past the first line, which names the file) is text that was actually read off the pixels
  const read = new Set([...sc.elements.filter((e) => e.text).map((e) => e.text), ...sc.gaps.filter((g) => g.text).map((g) => g.text)]);
  const quoted = [...t.split("\n").slice(1).join("\n").matchAll(/"([^"\n]+)"/g)].map((m) => m[1]);
  assert.ok(quoted.length > 8, "the reading quotes the text it found");
  for (const q of quoted) assert.ok(read.has(q), `the reading quotes "${q}", which was not read from the image`);
  assert.equal(ledgerLinesOf(sc).filter((l) => l.role === "visual-region").every((l) => l.label === ""), true, "an image region is addressed, never labelled");
});

// ── generation: what a screenshot may and may not style ──────────────────────

const fake = (name, tokens) => ({ source: { name, sha256: name.padEnd(64, "0") }, core: "testcore", tokens: { background: null, surface: null, ink: null, accent: null, type: null, radius: {}, spacing: {}, border: null, buttonPadding: null, ...tokens } });
const tk = (over = {}) => fake(over.name ?? "a.png", {
  background: { hex: over.bg ?? "#f4f6fb" }, surface: { hex: "#ffffff", n: 3 }, ink: { hex: "#1c1b19", n: 9 },
  accent: { hex: over.accent ?? "#2563eb", n: 3, spread: 198, ink: "#ffffff" },
  type: { body: { px: 16, n: 8 }, h1: { px: 48, n: 2 }, h2: { px: 24, n: 3 }, h3: { px: 20, n: 2 }, lineHeight: { ratio: 1.5, n: 4 } },
  radius: { box: { px: 8, n: 5 }, button: { px: 9, n: 2 } }, spacing: { vertical: { px: 24, n: 6 }, padX: { px: 24, n: 4 }, padY: { px: 24, n: 4 } }, border: null, ...over.tokens,
});

test("two references that agree: colours are synthesised and applied, lengths are in ems of the body", () => {
  const st = styleFromScreens([tk({ name: "a.png" }), tk({ name: "b.png", bg: "#f5f7fc" })]);
  // reference-fit's per-channel median of (244,246,251) and (245,247,252) is 244.5/246.5/251.5, rounded up
  assert.match(st.css, /body\{background:#f5f7fc;color:#1c1b19;line-height:1\.5\}/, "the median of two close references");
  assert.match(st.css, /h1\{font-size:3em\}/, "48px over a 16px body");
  assert.match(st.css, /article\{background:#ffffff;border-radius:0\.5em;padding:1\.5em 1\.5em\}/);
  assert.match(st.css, /button\{background:#2563eb;color:#ffffff;border:0;/);
  assert.match(st.css, /\.grid\{gap:1\.5em\}/, "only the measured gap is set for the grid; its widths are the base sheet's");
  assert.doesNotMatch(st.css, /\d+px/, "no absolute pixel length: density is unknown, proportions are not");
  assert.deepEqual(st.provenance.license, "measured facts only (colours, sizes); no pixels and no text are carried");
});

test("references that disagree: the colour is REFUSED as contested, never averaged", () => {
  const st = styleFromScreens([tk({ name: "a.png", bg: "#f4f6fb" }), tk({ name: "b.png", bg: "#111827" })]);
  assert.ok(st.refused.some((r) => r.token === "background" && /contested/.test(r.because)));
  assert.doesNotMatch(st.css, /body\{[^}]*background:/, "no background may be invented between a light and a dark page");
});

test("a single observation cannot corroborate itself: it is reported and not applied", () => {
  const one = tk({ tokens: { accent: { hex: "#ec0000", n: 1, spread: 236, ink: "#fff" }, type: { body: { px: 16, n: 8 }, h1: { px: 228, n: 1 }, h2: { px: 24, n: 3 } } } });
  const st = styleFromScreens([one]);
  assert.ok(st.refused.some((r) => r.token === "accent" && /1 observation/.test(r.because)));
  assert.ok(st.refused.some((r) => r.token === "type.h1" && /1 observation/.test(r.because)));
  assert.doesNotMatch(st.css, /#ec0000|h1\{/);
  assert.equal(MIN_WITNESSES.value, 2);
});

test("a type scale that does not descend is noise: the offending heading is not applied, the body stays", () => {
  const st = styleFromScreens([tk({ tokens: { type: { body: { px: 16, n: 8 }, h2: { px: 12, n: 3 } } } })]);
  assert.ok(st.refused.some((r) => /type\.h2\/body/.test(r.token) && /does not descend|not larger/.test(r.because)));
  assert.doesNotMatch(st.css, /h2\{/);
  assert.match(st.css, /article\{/, "the lengths that stand are still applied, in ems of the body");
});

test("no body size, no lengths: nothing to express them against", () => {
  const st = styleFromScreens([tk({ tokens: { type: null } })]);
  assert.doesNotMatch(st.css, /em[;}]/, "no length may be written without a body to be relative to");
  assert.ok(st.refused.some((r) => /nothing to express this length against/.test(r.because)));
});

test("a screenshot's style is layered over a base sheet, and adds no words to the page", async () => {
  const { renderBeliefMapped, FALLBACK_STYLE } = await import("../adapters/build/belief-page.js");
  const thing = (id, kind, name, parent = null, children = []) => ({ id, kind, name, nameNote: `n-${id}`, existsNote: `x-${id}`, props: [], children, parent });
  const belief = [thing("s", "site", "Acme", null, ["c"]), thing("c", "feature", "Fast", "s")];
  const screen = styleFromScreens([tk({ name: "a.png" }), tk({ name: "b.png" })]);
  const layered = layerStyle(FALLBACK_STYLE, screen);
  const plain = renderBeliefMapped(belief, {}), styled = renderBeliefMapped(belief, { style: layered });
  assert.ok(styled.artifact.includes("the engine's own base stylesheet") && styled.artifact.includes("measured, not written"), "both sheets, named");
  assert.ok(styled.artifact.indexOf("base stylesheet") < styled.artifact.indexOf("measured, not written"), "the measured values come after the base, so they win");
  assert.deepEqual(styled.map.map((m) => m.text), plain.map.map((m) => m.text), "a screenshot changes how the page looks, never what it says");
  assert.equal(layerStyle(null, null), null);
});

// ── the intake paths ─────────────────────────────────────────────────────────

const blankSession = () => ({ reader: null, corpus: null, corpusIndex: null, lookIndex: null, lastChatText: "", turnCount: 0, referents: null, webLedger: null, webSources: new Map(), field: null, shadow: [], pii: [], fileActivation: null, clearance: null });
const leftovers = () => fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith("er7-attach-"));

test("an ATTACHED screenshot is read as a page, left on the session as a style reference, and keeps nothing on disk", { skip: NEEDS_OCR }, async () => {
  const dir = tmp(); process.env.ER7_SCREEN_DIR = dir;
  try {
    const pr = await import("../../proxy-runner.mjs");
    const before = leftovers().length;
    const session = {}, notes = [];
    const text = await pr.lookAttachedScreen(session, "pasted.png", fs.readFileSync(SAMPLE), (n) => notes.push(n));
    assert.match(text, /Looking at "pasted\.png"/);
    assert.match(text, /Structure, top to bottom:/);
    assert.equal(session.screens.get("pasted.png").source.name, "pasted.png", "the sidecar is on the session, where the page build finds it");
    assert.deepEqual(fs.readdirSync(dir), [], "an attachment's text is not kept: no sidecar on disk");
    assert.equal(leftovers().length, before, "the temp copy the tools needed is gone");
    assert.ok(notes.some((n) => n.move === "attachment_screen_read"));
    assert.equal(await pr.lookAttachedScreen(session, "notes.txt", Buffer.from("not an image")), null, "a non-image is left to ingest");
  } finally { delete process.env.ER7_SCREEN_DIR; fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a workspace's screenshot is admitted as a ::look source and kept as a style reference; a non-screen image leaves nothing", { skip: NEEDS_OCR }, async () => {
  const dir = tmp(), ws = path.join(dir, "ws"); fs.mkdirSync(ws); process.env.ER7_SCREEN_DIR = path.join(dir, "sc");
  try {
    fs.copyFileSync(SAMPLE, path.join(ws, "app.png"));
    const W = 320, H = 320, px = Buffer.alloc(W * H * 3); let s = 7; for (let i = 0; i < px.length; i++) px[i] = (s = (s * 1103515245 + 12345) & 0x7fffffff) >> 7 & 255;
    fs.writeFileSync(path.join(dir, "noise.ppm"), Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), px]));
    const { execFileSync } = await import("node:child_process");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(dir, "noise.ppm"), path.join(ws, "aerial.png")]);
    const pr = await import("../../proxy-runner.mjs");
    const session = { ...blankSession(), reader: pr.createSessionReader() }, notes = [];
    const out = await pr.lookWorkspaceImages(session, ws, (n) => notes.push(n));
    assert.equal(out.looked, 1, "the screenshot was looked at; the noise image gave the reading nothing");
    assert.deepEqual([...session.screens.keys()], ["app.png"], "only the screen is a style reference");
    assert.ok(session.corpus.documents.has("app.png::look"), "its reading is a source in the corpus");
    const n = notes.find((x) => x.move === "look_image");
    assert.equal(n.rel, "app.png"); assert.ok(n.screen.elements > 10);
  } finally { delete process.env.ER7_SCREEN_DIR; fs.rmSync(dir, { recursive: true, force: true }); }
});
