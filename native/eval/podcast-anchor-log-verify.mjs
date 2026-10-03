#!/usr/bin/env node
// podcast-anchor-log-verify.mjs — a real, live, functional check of the
// pipeline's OWN promise ("get it so that in the future we can do it with
// a single prompt"): does the HTML podcast-anchor-log-drive.mjs just
// produced actually work when driven through a real browser against a
// real running server and a real, live-fetched podcast feed?
//
// NOT a unit test — this drives podcast-anchor-log-server.mjs (which must
// already be running on :8940) through a real CDP connection (a headless
// Chrome must already be listening on :9222, the same precondition every
// other podcast-*-read.mjs script in this file already assumes). It exists
// because every prior "looks clean" signal in this pass (a passing
// mechanical contract, `clean: true` from foldCode's own lint) individually
// missed a real, live-reproduced defect — the contract and lint layers are
// real and worth keeping, but they are NOT a substitute for actually
// loading the page and clicking it, which is how every bug this pass fixed
// (missing background-color, a visible-when-hidden player, a crash on a
// null field, a wrong element selector, a wrong class name, HTML entities
// showing up literally, a corrupted "&"-bearing audio URL) was actually
// found.
import { cdpSession } from "./podcast-cdp-lib.mjs";
import fs from "node:fs";

const APP_URL = process.env.PODCAST_APP_URL ?? "http://127.0.0.1:8940/";
const CDP_URL = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const FEED_URL = "https://feeds.npr.org/510289/podcast.xml";

function check(name, ok, detail) {
  console.log(`  ${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
  return ok;
}

async function main() {
  const { send, close } = await cdpSession(CDP_URL);
  let allOk = true;
  try {
    await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: APP_URL });
    await new Promise((r) => setTimeout(r, 500));

    // A real subscribe, against a real live NPR feed — the whole point of
    // this check is verifying real behavior, not a canned fixture.
    await send("Runtime.evaluate", { expression: `document.getElementById("feed-url").value = ${JSON.stringify(FEED_URL)}` });
    await send("Runtime.evaluate", { expression: "subscribe()" });
    await new Promise((r) => setTimeout(r, 2500));

    const state = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        bg: getComputedStyle(document.body).backgroundColor,
        episodeCount: document.querySelectorAll(".episode").length,
        firstTitle: document.querySelector(".episode h3")?.textContent ?? null,
        playerHiddenBeforeClick: document.getElementById("now-playing").hidden,
      })`,
      returnByValue: true,
    });
    const s = JSON.parse(state.result?.result?.value ?? "{}");

    allOk &= check("page background is dark (not the browser default white)", s.bg !== "rgba(0, 0, 0, 0)" && s.bg !== "rgb(255, 255, 255)", s.bg);
    allOk &= check("real episodes rendered from the real feed", s.episodeCount > 0, `${s.episodeCount} episode(s)`);
    allOk &= check("a real title displays with real characters, not literal HTML entities", s.firstTitle && !/&quot;|&#39;|&amp;/.test(s.firstTitle), s.firstTitle);
    allOk &= check("the persistent player bar starts hidden", s.playerHiddenBeforeClick === true);

    // Click the first episode's row and verify the whole play path.
    await send("Runtime.evaluate", { expression: `document.querySelector(".episode").click()` });
    await new Promise((r) => setTimeout(r, 400));
    const after = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        hidden: document.getElementById("now-playing").hidden,
        audioSrc: document.getElementById("now-playing-audio").src,
        title: document.getElementById("now-playing-title").textContent,
      })`,
      returnByValue: true,
    });
    const a = JSON.parse(after.result?.result?.value ?? "{}");

    allOk &= check("the persistent player bar becomes visible on click", a.hidden === false);
    allOk &= check("the audio src is a real URL with NO corrupted \"&amp;\" in place of \"&\"", a.audioSrc && a.audioSrc.startsWith("http") && !a.audioSrc.includes("&amp;"), a.audioSrc?.slice(0, 80));
    allOk &= check("the now-playing title shows real characters, not literal HTML entities", a.title && !/&quot;|&#39;|&amp;/.test(a.title), a.title);

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const outPath = new URL("./podcast-anchor-log-verify.png", import.meta.url).pathname;
    fs.writeFileSync(outPath, Buffer.from(shot.result.data, "base64"));
    console.log(`\n  screenshot written to ${outPath}`);
  } finally {
    close();
  }
  console.log(`\n${allOk ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  process.exitCode = allOk ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
