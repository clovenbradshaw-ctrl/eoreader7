#!/usr/bin/env node
// cli/screen.mjs — read a screenshot as a page, from the shell. The same read the looking seam and the page build use
// (native/organs/look-screen.js), needing only ffmpeg and tesseract: no model, no network.
//
//   node cli/screen.mjs shot.png                     the reading: structure, regions, colours, gaps (default)
//   node cli/screen.mjs shot.png --tokens            the measured design tokens, as JSON
//   node cli/screen.mjs shot.png --html page.html    regenerate the page from the sidecar (--mode flex|abs)
//   node cli/screen.mjs shot.png --style             the CSS a page build would take from this screenshot, and what it refused
//   node cli/screen.mjs shot.png --json side.json    the whole sidecar (EOScreenLook@1)
//   --force  read it even if it does not look like a screen   --fast  skip the thorough OCR passes   --no-keep  do not store the sidecar
//
// A sidecar is stored under state/screen-looks/ by the image's sha256 (git-ignored); the next look at the same bytes is a disk read.
import fs from "node:fs";
import { lookAtScreen } from "../native/organs/look-screen.js";
import { htmlOf } from "../native/adapters/image/screen-sidecar.js";
import { styleFromScreens } from "../native/organs/screen-style.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !["flex", "abs"].includes(a) && args[args.indexOf(a) - 1] !== "--html" && args[args.indexOf(a) - 1] !== "--json" && args[args.indexOf(a) - 1] !== "--mode");
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
if (!file || flag("--help")) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 12).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(file ? 0 : 1); }

const r = await lookAtScreen(file, { force: flag("--force"), thorough: !flag("--fast"), persist: !flag("--no-keep") });
if (!r.screen) {
  console.error(`not read as a screen: ${r.reason}${r.detail ? ` — ${r.detail}` : ""}`);
  if (r.gate) console.error(`flat-region share ${r.gate.flatShare} is under the floor ${r.gate.floor} (pass --force to read it anyway)`);
  process.exit(2);
}
const sc = r.sidecar;
if (val("--html")) { fs.writeFileSync(val("--html"), htmlOf(sc, { mode: val("--mode") ?? "flex" })); console.error(`wrote ${val("--html")} (${val("--mode") ?? "flex"} layout, from the sidecar alone)`); }
if (val("--json")) { fs.writeFileSync(val("--json"), JSON.stringify(sc, null, 2)); console.error(`wrote ${val("--json")}`); }
if (flag("--tokens")) console.log(JSON.stringify(sc.tokens, null, 2));
else if (flag("--style")) {
  const st = styleFromScreens([sc]);
  console.log(st.css || "(nothing on this screenshot stands on two or more observations)");
  console.error(`\nrefused (${st.refused.length}):\n${st.refused.map((x) => `  ${x.token}: ${x.because}`).join("\n")}`);
} else if (!val("--html") && !val("--json")) console.log(r.text);
console.error(`${r.cached ? "from the stored sidecar" : "read"}${r.sidecarPath ? `: ${r.sidecarPath}` : ""}; ${sc.elements.length} elements, gaps: ${sc.gaps.map((g) => g.kind).join(", ") || "none"}`);
