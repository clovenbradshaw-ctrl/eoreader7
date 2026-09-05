// web-gateways.test.js — the public-gateway fall-through's pure half (the-fold P110).
//
// Offline, no network: address builders, body readers, the blocked shape,
// and the fold over the record's own `web-gateway` lines that decides the
// order gateways are tried in. The order is LEARNED — a gateway that has
// only failed ranks below one never tried, one that has answered most
// ranks first — and the roster is never pruned by the instrument: every
// gateway stays tryable, the record just says what happened last time.
import test from "node:test";
import assert from "node:assert/strict";
import { GATEWAYS, GATEWAY_IDS, gatewayOf, BLOCKED_STATUSES, blockedShape, readGatewayBody, foldGateways, rankGateways, gatewayLines, parseEchoHeaders, parseEchoIp, leakVerdict, ADDRESS_HEADERS } from "../organs/web.js";

test("the roster: every gateway names its kind, what it sees, an address builder and a reader; ids are unique; none is the maintainer's", () => {
  assert.ok(GATEWAYS.length >= 4);
  assert.equal(new Set(GATEWAY_IDS).size, GATEWAY_IDS.length);
  for (const g of GATEWAYS) {
    assert.ok(["archive", "reader", "relay"].includes(g.kind), g.id);
    assert.ok(g.sees.length > 20, `${g.id} says what it sees`);
    const a = g.address("https://example.org/a?b=1&c=2");
    assert.match(a, /^https:\/\//);
    assert.ok(a.includes("example.org"), `${g.id} carries the address`);
    assert.ok(!/intelechia|n8n/.test(a), `${g.id} is a public gateway, not the maintainer's relay`);
    assert.ok(["raw", "jina-markdown", "wayback-available"].includes(g.read));
  }
  assert.equal(gatewayOf("no-such"), null);
});

test("the blocked shape: a refusal of THIS reader is typed; an absent page, a good page and a DNS failure are not", () => {
  for (const s of BLOCKED_STATUSES) assert.equal(blockedShape({ status: s }), `status-${s}`);
  assert.equal(blockedShape({ status: 404 }), null);
  assert.equal(blockedShape({ status: 200 }), null);
  assert.equal(blockedShape({ status: 200, challenge: true }), "challenge-page");
  assert.equal(blockedShape({ error: "The operation was aborted due to timeout" }), "no-answer");
  assert.equal(blockedShape({ error: "read ECONNRESET" }), "no-answer");
  assert.equal(blockedShape({ error: "getaddrinfo ENOTFOUND nowhere.invalid" }), null);
  assert.equal(blockedShape({ status: 200, html: true, textChars: 0 }), "empty-face");
  assert.equal(blockedShape({ status: 200, html: true, textChars: 812 }), null);
  assert.equal(blockedShape({ status: 200, html: false, textChars: 0 }), null, "an empty non-html body is not a shell");
});

test("readers: the Wayback availability answer yields the snapshot's raw face; the reader's markdown yields text and title; an empty relay body is refused", () => {
  const wb = readGatewayBody("wayback-available", { status: 200, body: JSON.stringify({ archived_snapshots: { closest: { available: true, url: "http://web.archive.org/web/20250101000000/https://example.org/", timestamp: "20250101000000" } } }) });
  assert.equal(wb.ok, true);
  assert.equal(wb.next, "http://web.archive.org/web/20250101000000id_/https://example.org/");
  assert.equal(readGatewayBody("wayback-available", { status: 200, body: JSON.stringify({ archived_snapshots: {} }) }).ok, false);
  assert.equal(readGatewayBody("wayback-available", { status: 200, body: "<html>" }).ok, false);
  const j = readGatewayBody("jina-markdown", { status: 200, body: "Title: A page\n\nURL Source: https://example.org/\n\nMarkdown Content:\n# A page\n\nSome text." });
  assert.equal(j.ok, true);
  assert.equal(j.title, "A page");
  assert.match(j.text, /^# A page/);
  assert.equal(readGatewayBody("raw", { status: 200, body: "   " }).ok, false);
  assert.equal(readGatewayBody("raw", { status: 502, body: "<html>bad gateway</html>" }).ok, false);
  assert.equal(readGatewayBody("raw", { status: 200, contentType: "text/html", body: "<html><p>hi</p></html>" }).html, "<html><p>hi</p></html>");
});

test("the fold and the order: learned off the record, never asserted — most-answered first, untried before always-failed, faster among equals", () => {
  const ev = (gateway, ok, ms, at = "2026-09-05T10:00:00.000Z") => ({ event: "web-gateway", gateway, ok, status: ok ? 200 : 403, ms, at });
  const nothing = foldGateways([]);
  assert.equal(nothing.length, GATEWAY_IDS.length);
  assert.ok(nothing.every((t) => t.tried === 0 && t.rate === null && t.last === null));
  assert.deepEqual(rankGateways(nothing), [...GATEWAY_IDS], "with no record the roster's own order stands");

  const events = [
    ev("archive-today", false, 900), ev("archive-today", false, 800),
    ev("jina", true, 400), ev("jina", true, 500), ev("jina", false, 300),
    ev("allorigins", true, 200),
    ev("wayback", true, 1200), ev("wayback", true, 1100),
  ];
  const fold = foldGateways(events);
  const by = Object.fromEntries(fold.map((t) => [t.id, t]));
  assert.equal(by.jina.tried, 3); assert.equal(by.jina.ok, 2); assert.equal(by.jina.last, "closed");
  assert.equal(by.allorigins.rate, 1); assert.equal(by.wayback.meanMs, 1150);
  assert.equal(by["archive-today"].rate, 0);
  const order = rankGateways(fold);
  // always answered (allorigins 1/1 fast, wayback 2/2 slower) first — fewer tries first among equal rates, then faster
  assert.deepEqual(order.slice(0, 2), ["allorigins", "wayback"]);
  assert.ok(order.indexOf("jina") < order.indexOf("corsproxy"), "2/3 answered ranks above never tried");
  assert.ok(order.indexOf("corsproxy") < order.indexOf("archive-today"), "never tried ranks above always failed");
  assert.equal(order.at(-1), "archive-today");
  assert.equal(new Set(order).size, GATEWAY_IDS.length, "the roster is never pruned");
  // the control that can fail: one more refusal moves a gateway down
  const worse = rankGateways(foldGateways([...events, ev("allorigins", false, 50), ev("allorigins", false, 50)]));
  assert.notEqual(worse[0], "allorigins");
  assert.equal(worse[0], "wayback");
  const lines = gatewayLines(fold);
  assert.equal(lines.length, GATEWAY_IDS.length);
  assert.match(lines.find((l) => l.startsWith("jina")), /2\/3 answered · last closed/);
  assert.match(lines.find((l) => l.startsWith("corsproxy")), /never tried/);
});

test("the leak probe: what a gateway forwards is read off an echo, the person's own address decides the verdict, and the table says it", () => {
  const echo = JSON.stringify({ headers: { Host: "httpbin.org", "User-Agent": "relay/1", "X-Forwarded-For": "203.0.113.9, 198.51.100.4" } });
  const h = parseEchoHeaders(echo);
  assert.equal(h.host, "httpbin.org");
  assert.equal(parseEchoHeaders("<html>"), null);
  assert.equal(parseEchoIp(JSON.stringify({ origin: "203.0.113.9" })), "203.0.113.9");
  assert.equal(parseEchoIp("nope"), null);
  assert.ok(ADDRESS_HEADERS.includes("x-forwarded-for"));
  const leaks = leakVerdict(h, "203.0.113.9");
  assert.equal(leaks.forwardsAddress, true);
  assert.deepEqual(leaks.carriers.map((c) => c.name), ["x-forwarded-for"]);
  assert.equal(leakVerdict(h, "192.0.2.1").forwardsAddress, false, "another address in the carrier is not the person's");
  assert.equal(leakVerdict(parseEchoHeaders(JSON.stringify({ headers: { Host: "httpbin.org" } })), "203.0.113.9").forwardsAddress, false);
  assert.equal(leakVerdict(null, "203.0.113.9").forwardsAddress, null);
  assert.equal(leakVerdict(h, null).forwardsAddress, null);
  const fold = foldGateways([
    { event: "web-gateway", gateway: "jina", ok: true, status: 200, ms: 300, at: "2026-09-05T10:00:00.000Z" },
    { event: "web-gateway-leak", gateway: "jina", forwardsAddress: true, carriers: [{ name: "x-forwarded-for", value: "203.0.113.9" }], at: "2026-09-05T10:00:01.000Z" },
    { event: "web-gateway-leak", gateway: "allorigins", forwardsAddress: false, carriers: [], at: "2026-09-05T10:00:02.000Z" },
  ]);
  const lines = gatewayLines(fold);
  assert.match(lines.find((l) => l.startsWith("jina")), /forwards your address: YES \(x-forwarded-for\)/);
  assert.match(lines.find((l) => l.startsWith("allorigins")), /forwards your address: no/);
  assert.match(lines.find((l) => l.startsWith("corsproxy")), /not measured/);
  assert.match(lines.find((l) => l.startsWith("wayback")), /never hears from you/);
});
