import test from "node:test";
import assert from "node:assert/strict";
import { tagsOf, imageCandidates, linksOf, relevance, licenseSignals, robotsAllows, screenShaped, uiLikeness, dHash, hamming, ngrams, likenessOf, NEAR_COPY_BITS } from "./comp-research.js";

test("tagsOf reads quoted attributes whose values contain '>' (a srcset, a JSON blob) without ending the tag early", () => {
  const html = `<img alt="a > b" data-x='{"a":">"}' src="/s/1.png" width=320><p>x</p>`;
  const [t] = tagsOf(html, "img");
  assert.equal(t.attrs.alt, "a > b");
  assert.equal(t.attrs.src, "/s/1.png");
  assert.equal(t.attrs.width, "320");
  assert.equal(tagsOf(html, "p").length, 1);
  assert.equal(tagsOf("<imgx src=a.png>", "img").length, 0, "a tag NAME that merely begins with img is not an img");
});

test("imageCandidates: img src/data-src/srcset, og:image, and links to image files — absolute, deduped, with where they sat", () => {
  const html = `<meta property="og:image" content="/og.png"><a href="/big/shot.jpg" title="full size">x</a>
    <img src="/a.png" alt="Screenshot 1"><img data-src="/b.webp" src="/lazy.gif"><img srcset="/c-1x.png 1x, /c-2x.png 2x"><img src="data:image/png;base64,AAAA"><img src="/a.png">`;
  const c = imageCandidates(html, "https://site.test/app/page");
  const urls = c.map((x) => x.url);
  assert.deepEqual(urls.sort(), ["https://site.test/a.png", "https://site.test/b.webp", "https://site.test/big/shot.jpg", "https://site.test/c-2x.png", "https://site.test/og.png"].sort());
  assert.equal(c.find((x) => x.url.endsWith("/a.png")).alt, "Screenshot 1");
  assert.ok(c.every((x) => x.from === "https://site.test/app/page" && typeof x.at === "number"));
});

test("linksOf keeps the anchor text and drops fragments, mailto and javascript links", () => {
  const l = linksOf(`<a href="#top">top</a><a href="/packages/x/"><span>Clima</span> <b>weather</b></a><a href="mailto:a@b">m</a><a href="javascript:void(0)">j</a><a href="/packages/x/">again</a>`, "https://f.test/cat/");
  assert.deepEqual(l, [{ url: "https://f.test/packages/x/", text: "Clima weather" }]);
});

test("relevance is the share of the need's words found in the candidate's own words — and a need word matches inside a run-together file name", () => {
  const need = "weather app screenshot forecast";
  assert.equal(relevance({ url: "https://x.test/repo/app.id/en-US/phoneScreenshots/1.png", alt: "", context: "Clima weather app" }, need).hits.includes("screenshot"), true, "screenshot is found inside phoneScreenshots");
  assert.equal(relevance({ url: "https://x.test/logo.png", alt: "", context: "" }, need).score, 0);
  assert.ok(relevance({ url: "https://x.test/a.png", alt: "weather forecast", context: "" }, need).score > 0.4);
});

test("licenseSignals reads what a page STATES and never assumes one: permissive / copyleft / restrictive / unknown", () => {
  assert.equal(licenseSignals("Source code is available under the MIT License.").standing, "permissive");
  assert.equal(licenseSignals("License: MPL-2.0").standing, "copyleft");
  assert.equal(licenseSignals("Licensed GPL-3.0-or-later, see COPYING").standing, "copyleft");
  assert.equal(licenseSignals("This template is a premium product. All rights reserved.").standing, "restrictive");
  const none = licenseSignals("A nice weather app.");
  assert.equal(none.standing, "unknown");
  assert.equal(none.id, null);
  assert.match(licenseSignals("MIT License applies").basis, /MIT License/, "the words it read are kept as the basis");
});

test("robotsAllows: longest matching rule wins, a named agent's group beats *, no rule means allowed", () => {
  const txt = "User-agent: *\nDisallow: /private/\nAllow: /private/ok\n\nUser-agent: badbot\nDisallow: /\n";
  assert.equal(robotsAllows(txt, "/public", "eoreader7").allowed, true);
  assert.equal(robotsAllows(txt, "/private/x", "eoreader7").allowed, false);
  assert.equal(robotsAllows(txt, "/private/ok/1", "eoreader7").allowed, true, "the longer Allow outranks the shorter Disallow");
  assert.equal(robotsAllows(txt, "/anything", "badbot/1.0").allowed, false);
  assert.equal(robotsAllows("", "/x").allowed, true);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*.json$\n", "/a/b.json").allowed, false);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*.json$\n", "/a/b.html").allowed, true);
});

test("screenShaped refuses an icon and a banner, accepts a screen, and says why", () => {
  assert.equal(screenShaped(1080, 1920).ok, true);
  assert.match(screenShaped(96, 96).reason, /icon/);
  assert.match(screenShaped(2000, 400).reason, /banner/);
  assert.equal(screenShaped(0, 0).ok, false);
});

test("uiLikeness counts components, words and value-bearing words — a screen scores high, a logo low", () => {
  const screen = { width: 1000, height: 800, rects: Array.from({ length: 9 }, (_, i) => ({ id: `r${i}` })), words: Array.from({ length: 40 }, (_, i) => ({ text: i % 4 ? "label" : `${i}°`, w: 40, h: 14 })) };
  const logo = { width: 1000, height: 800, rects: [], words: [{ text: "Brand", w: 200, h: 60 }] };
  assert.ok(uiLikeness(screen).score > 0.8);
  assert.ok(uiLikeness(logo).score < 0.2);
});

test("dHash/hamming: a brightness-shifted copy stays within a few bits, an unrelated picture does not", () => {
  const a = Array.from({ length: 72 }, (_, i) => (i * 37) % 251);
  const brighter = a.map((v) => Math.min(255, v + 10));
  const other = Array.from({ length: 72 }, (_, i) => (i * 91 + 13) % 253);
  assert.ok(hamming(dHash(a), dHash(brighter)) <= 2);
  assert.ok(hamming(dHash(a), dHash(other)) > NEAR_COPY_BITS);
  assert.throws(() => dHash([1, 2, 3]), /72/);
});

test("likenessOf: a verbatim 4-word run from a seen source is FLAGGED; a generic shared label is not; an unrelated seen page stays clean", () => {
  const seen = [
    { id: "comp", url: "https://a.test/shot", texts: ["Feels like 70 degrees with light wind from the west", "Humidity", "Wind"], hash: null },
    { id: "other", url: "https://b.test/x", texts: ["Completely unrelated text about cooking pasta"], hash: null },
  ];
  const copy = likenessOf({ output: { texts: ["Today: feels like 70 degrees with light wind from the west"] }, seen });
  assert.equal(copy.verdict, "flagged");
  assert.equal(copy.flagged[0].id, "comp");
  assert.ok(copy.flagged[0].sharedRuns.length > 0);
  const own = likenessOf({ output: { texts: ["Humidity", "Wind", "Current conditions in your city"] }, seen });
  assert.equal(own.verdict, "no verbatim run and no near-copy found", "bare labels are common words, not a copied passage");
  assert.equal(own.compared, 2);
});

test("likenessOf: a near-copy hash is flagged only when it is ALSO closer than every unrelated image (the null)", () => {
  const h = (n) => "0".repeat(n) + "1".repeat(64 - n);
  const seen = [{ id: "comp", url: "u", texts: [], hash: h(32) }];
  const near = likenessOf({ output: { texts: [], hash: h(33) }, seen, nulls: [h(10), h(50)] });
  assert.equal(near.verdict, "flagged", "distance 1 <= 10 bits and below the nearest unrelated (distance 23)");
  const farFromBoth = likenessOf({ output: { texts: [], hash: h(0) }, seen, nulls: [h(10)] });
  assert.equal(farFromBoth.flagged.length, 0);
  assert.equal(farFromBoth.nullMinDistance, 10);
});

test("ngrams are over content words, so a shared run is a shared PASSAGE, not a shared stopword", () => {
  assert.ok(ngrams("the quick brown fox jumps over the lazy dog").size >= 1);
  assert.equal(ngrams("a b").size, 0);
});
