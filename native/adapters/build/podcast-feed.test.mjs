// podcast-feed.test.mjs — against a REAL, live-fetched public podcast feed
// (NPR's Planet Money RSS, trimmed to two items and committed as
// fixtures/planet-money-excerpt.xml — not a hand-typed fixture: this is
// the actual bytes a real GET returned, so a structural surprise in real
// feed XML shows up here rather than only in production), and against the
// REAL kernel ledger (kernel/notes.js) — the same one podcast.js uses.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { makeNotes } from "../../kernel/notes.js";
import { parseFeed, makeLibrary, SHOW_LABEL, EPISODE_LABEL } from "./podcast-feed.js";

const FIXTURE = fs.readFileSync(fileURLToPath(new URL("./fixtures/planet-money-excerpt.xml", import.meta.url)), "utf8");
const FEED_URL = "https://feeds.npr.org/510289/podcast.xml";

test("parseFeed reads a real RSS 2.0 podcast feed: channel title, and every item with its enclosure", () => {
  const feed = parseFeed(FIXTURE);
  assert.equal(feed.schema, "rss2");
  assert.equal(feed.title, "Planet Money");
  assert.equal(feed.items.length, 2);
  const [first] = feed.items;
  assert.equal(first.title, "Middlegarchs are the new Oligarchs");
  assert.ok(first.pubDate);
  assert.ok(first.guid);
  assert.match(first.enclosureUrl, /^https:\/\//);
  assert.equal(first.enclosureType, "audio/mpeg");
  assert.ok(first.description.length > 50, "the real CDATA description is decoded, not left wrapped");
  assert.ok(!/<em>|<br/.test(first.description) === false || first.description.includes("<"), "HTML entities inside the CDATA are decoded, not stripped — this organ parses feed structure, not prose");
});

test("parseFeed self-verification: each item's `raw` block genuinely contains that item's own title, at the offset a caller would compute", () => {
  const feed = parseFeed(FIXTURE);
  for (const item of feed.items) {
    const at = item.raw.indexOf(item.title);
    assert.ok(at >= 0, `"${item.title}" must be locatable inside its own raw block`);
    assert.equal(item.raw.slice(at, at + item.title.length), item.title);
  }
});

test("subscribing lands the subscription as an ordinary heard arrangement, on the SAME ledger; unsubscribing concedes it (REC) with a required trigger", () => {
  const notes = makeNotes();
  const lib = makeLibrary({ notes });
  let log = notes.createNotes();
  const sub = lib.subscribe(log, { url: FEED_URL, title: "Planet Money" });
  log = sub.log;
  let subs = lib.subscriptions(log);
  assert.equal(subs.length, 1);
  assert.equal(subs[0].label, SHOW_LABEL);
  assert.equal(subs[0].end2, "Planet Money");
  assert.equal(subs[0].witnesses[0], FEED_URL);

  const noTrigger = notes.concede(log, sub.id, {});
  assert.equal(noTrigger.refused.type, "no_trigger", "concede itself enforces a trigger — checked directly since unsubscribe forwards to it");
  const un = lib.unsubscribe(log, "Planet Money", { trigger: "no longer interested" });
  assert.equal(un.refused, null);
  log = un.log;
  subs = lib.subscriptions(log);
  assert.equal(subs.length, 0, "a conceded subscription no longer folds as a live subscription");
});

test("syncFeed subscribes AND hears every real episode from the fixture, each self-verified and witnessed by the feed URL; a second sync of identical bytes adds nothing new", () => {
  const notes = makeNotes();
  const lib = makeLibrary({ notes });
  let log = notes.createNotes();

  const first = lib.syncFeed(log, { url: FEED_URL, xml: FIXTURE });
  log = first.log;
  assert.equal(first.show.title, "Planet Money");
  assert.equal(first.added, 2);
  assert.equal(first.show.episodeCount, 2);

  const episodes = lib.episodesOf(log, "Planet Money");
  assert.equal(episodes.length, 2);
  for (const ep of episodes) {
    assert.equal(ep.label, EPISODE_LABEL);
    assert.equal(ep.witnesses[0], FEED_URL);
    assert.equal(ep.spans.length, 1, "each episode is addressed into the raw feed bytes it came from");
  }
  assert.ok(episodes.some((e) => e.end2 === "Middlegarchs are the new Oligarchs"));

  const second = lib.syncFeed(log, { url: FEED_URL, xml: FIXTURE });
  assert.equal(second.added, 0, "hearing the identical bytes again adds nothing — notes.hear's own no-op-on-nothing-new rule");
  assert.equal(second.show.episodeCount, 2);
});

test("a malformed/empty feed refuses episodes by name rather than crashing or inventing one", () => {
  const notes = makeNotes();
  const lib = makeLibrary({ notes });
  let log = notes.createNotes();
  const r = lib.hearEpisode(log, { showTitle: "X", feedUrl: "https://x", item: { title: null } });
  assert.equal(r.refused.type, "no_title");
});
