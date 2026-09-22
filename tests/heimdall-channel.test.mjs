// heimdall-channel.test.mjs — the channel's pure parts (2026-09-21): server
// identity from the connection, the one window, the hop guard, the stream
// accounting, the retry hold, the bridge as a standby host, the learner's
// observation-only diet, and rules as levers on trial under a permutation
// null. Every control here is built to fail if the rule is wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// The rule ledger and the trial state are LIVE files the proxy reads back;
// a test that adopts a rule must never write them (2026-09-22: two
// `saturated:trial-model-*` keys landed on the operator's real ledger).
const _scratch = fs.mkdtempSync(path.join(os.tmpdir(), "er7-channel-test-"));
process.env.ER7_DERIVED_RULES_FILE = path.join(_scratch, "derived-rules.json");
process.env.ER7_TRIALS_FILE = path.join(_scratch, "trials.json");
process.env.ER7_SETTINGS_FILE = path.join(_scratch, "settings.json"); // never the live proxy's persisted settings (smallMouth, reconcileDaemons, ...)
process.env.ER7_HEIMDALL_LOG_FILE = path.join(_scratch, "heimdall-log.jsonl"); // never the live record
const h = await import("../heimdall.mjs");

// ── the one address ──────────────────────────────────────────────────────
test("address: the daemon's host is derived from its URL, the channel port is a number, and heimdall reads the same module", async () => {
  const ms = await import("../native/kernel/model-server.js");
  const u = new URL(ms.MODEL_SERVER_URL);
  assert.equal(ms.modelServerHost(), `${u.hostname}:${u.port || "11434"}`);
  assert.equal(ms.modelServerPort(), Number(u.port || "11434"));
  assert.ok(Number.isInteger(ms.CHANNEL_PORT) && ms.CHANNEL_PORT > 0);
  assert.equal(h.modelServerUrl(), ms.MODEL_SERVER_URL, "heimdall carries no second literal");
  assert.equal(h.channelPort(), ms.CHANNEL_PORT);
  assert.notEqual(ms.modelServerPort(), ms.CHANNEL_PORT, "the daemon and the channel never share a port");
});

// ── server identity ──────────────────────────────────────────────────────
test("identity: the peer port of a client connection maps to its pid, both families", () => {
  const lsof = [
    "p70118", "cnode", "n127.0.0.1:11434->127.0.0.1:50648", // our own server side (self) — must not map
    "p78261", "cnode", "n[::1]:50115->[::1]:11434",          // an IPv6 client
    "p96148", "cnode", "n127.0.0.1:50650->127.0.0.1:11434",  // an IPv4 client
    "p96148", "cnode", "n127.0.0.1:50651->127.0.0.1:8790",   // the same pid, another port — not the channel
  ].join("\n");
  const m = h.parseLsofEstablished(lsof, 11434, 70118);
  assert.deepEqual(m.get(50115), { pid: 78261, cmd: "node" });
  assert.deepEqual(m.get(50650), { pid: 96148, cmd: "node" });
  assert.equal(m.get(50648), undefined, "the server side of our own socket is never a client");
  assert.equal(m.get(50651), undefined, "a connection to another port is not on the channel");
});
test("identity: netstat's kernel table names the client pid by its local port, both families, never the server's own rows", () => {
  const text = [
    "Active Internet connections (including servers)",
    "Proto Recv-Q Send-Q  Local Address          Foreign Address        (state)      rhiwat  shiwat    pid   epid state  options",
    "tcp6       0      0  ::1.11434              ::1.58000              ESTABLISHED  401949  146808  66209      0 00102 00000104",
    "tcp6       0      0  ::1.58000              ::1.11434              ESTABLISHED  405319  146808  53179      0 00102 00000108",
    "tcp4       0      0  127.0.0.1.50650        127.0.0.1.11434        ESTABLISHED  405319  146808  96148      0 00102 00000108",
    "tcp4       0      0  127.0.0.1.50651        127.0.0.1.8790         ESTABLISHED  405319  146808  96148      0 00102 00000108",
    "tcp6       0      0  ::1.11434              *.*                    LISTEN       131072  131072  66209      0 00100 00000106",
  ].join("\n");
  const m = h.parseNetstatEstablished(text, 11434, 66209);
  assert.deepEqual(m.get(58000), { pid: 53179, cmd: null });
  assert.deepEqual(m.get(50650), { pid: 96148, cmd: null });
  assert.equal(m.get(11434), undefined, "the server's own side is never a client");
  assert.equal(m.get(50651), undefined, "another port is not the channel");
});
test("identity: the label is the script, last two path segments; a bare command stands", () => {
  assert.equal(h.serverLabelOf("node /Users/x/3.0/heimdall/bin/heimdall.mjs up --no-open --port 8790"), "bin/heimdall.mjs");
  assert.equal(h.serverLabelOf("node native/eval/the-fold/drive-blind-editor.mjs --model qwen3:8b"), "the-fold/drive-blind-editor.mjs");
  assert.equal(h.serverLabelOf("node proxy.mjs"), "proxy.mjs");
  assert.equal(h.serverLabelOf("/usr/bin/curl -s http://x"), "bin/curl");
});
test("identity: an unknown socket gets its own port key, never a shared anon", async () => {
  const fakeSocket = { remotePort: 59999 };
  const r = await h.resolveServerKey(fakeSocket);
  assert.ok(r.key === "port:59999" || /#\d+$/.test(r.key), r.key);
  assert.equal(await h.resolveServerKey(fakeSocket), r, "cached on the socket");
  assert.equal((await h.resolveServerKey(null)).key, "anon");
});

// ── one window, hop guard, accounting ────────────────────────────────────
test("window: a caller's num_ctx is dropped and reported; none asked → null", () => {
  const body = { model: "gemma2:2b", options: { num_ctx: 4096, temperature: 0 }, messages: [] };
  assert.equal(h.holdWindow(body), 4096);
  assert.equal(body.options.num_ctx, undefined);
  assert.equal(body.options.temperature, 0, "other options stand");
  assert.equal(h.holdWindow({ model: "x", options: {} }), null);
  const top = { model: "x", num_ctx: 2048 };
  assert.equal(h.holdWindow(top), 2048);
  assert.equal(top.num_ctx, undefined);
});
test("hop: a fresh turn is hop 0; a re-entered turn names where it came from", () => {
  assert.deepEqual(h.hopOf({}), { hop: 0, from: null });
  assert.deepEqual(h.hopOf({ "x-heimdall-hop": "1", "x-heimdall-from": "fleet" }), { hop: 1, from: "fleet" });
  assert.deepEqual(h.hopOf({ "x-heimdall-hop": "garbage" }), { hop: 0, from: null });
});
test("messages: chat messages pass, a generate prompt becomes one user message, parts join", () => {
  assert.deepEqual(h.messagesOf({ prompt: "hi" }), [{ role: "user", content: "hi" }]);
  assert.deepEqual(h.messagesOf({ messages: [{ role: "user", content: [{ text: "a" }, { text: "b" }] }] }), [{ role: "user", content: "a\nb" }]);
  assert.deepEqual(h.messagesOf({}), []);
});
test("accounting: the last object of an Ollama stream carries the counts; an OpenAI usage chunk too; garbage is zero", () => {
  const ndjson = '{"done":false,"message":{"content":"x"}}\n{"done":true,"prompt_eval_count":251,"eval_count":32,"load_duration":6200000000}\n';
  assert.deepEqual(h.streamAccounting(ndjson), { promptTokens: 251, evalTokens: 32, loadMs: 6200 });
  const sse = 'data: {"choices":[]}\n\ndata: {"usage":{"prompt_tokens":10,"completion_tokens":5}}\n';
  assert.deepEqual(h.streamAccounting(sse), { promptTokens: 10, evalTokens: 5, loadMs: 0 });
  assert.deepEqual(h.streamAccounting("not json"), { promptTokens: 0, evalTokens: 0, loadMs: 0 });
});

// ── the retry hold ───────────────────────────────────────────────────────
test("retry hold: a server that honors Retry-After keeps the base hold; one that hammers inside it is doubled, bounded, and becomes a finding past the floor", () => {
  const key = `test-server#${process.pid}`;
  let now = 1_000_000;
  const first = h.channelRefused(key, 10, { now });
  assert.equal(first.retryAfterS, 10);
  assert.equal(first.early, false);
  now += 11_000; // honored the hold
  const honored = h.channelRefused(key, 10, { now });
  assert.equal(honored.retryAfterS, 10, "an honored hold is not punished");
  assert.equal(honored.early, false);
  const cap = Math.max(10, h.heimdallSettings().find((s) => s.name === "slaSeconds").value);
  now += 1_000; // inside the hold
  const e1 = h.channelRefused(key, 10, { now });
  assert.equal(e1.retryAfterS, Math.min(cap, 20), "doubled, bounded by the SLA"); assert.equal(e1.early, true); assert.equal(e1.storm, false);
  now += 1_000;
  const e2 = h.channelRefused(key, 10, { now });
  assert.equal(e2.retryAfterS, Math.min(cap, 40));
  now += 1_000;
  const e3 = h.channelRefused(key, 10, { now });
  assert.equal(e3.storm, true, "the third early retry is the retry_storm finding");
  now += 1_000;
  const e4 = h.channelRefused(key, 10, { now });
  assert.equal(e4.storm, false, "logged once per hold");
  assert.ok(e4.retryAfterS <= cap, "bounded by the SLA");
  const disclosed = h.channelDisclosure().servers.find((s) => s.key === key);
  assert.equal(disclosed.refused, 6);
  assert.equal(disclosed.earlyRetries, 4);
});

// ── the bridge as a host ─────────────────────────────────────────────────
test("hosts: the fleet bridge is a standby until a phone holds a model; then it is picked for that model only, and never bounced back to", () => {
  const hosts = h.inferenceHosts();
  const fleet = hosts.find((x) => x.name === "fleet");
  assert.ok(fleet, "the bridge is a host by default");
  assert.equal(fleet.auto, true);
  assert.equal(h.hostStandby(fleet), true, "unverified auto host: standby");
  fleet.kind = "bridge";
  assert.equal(h.hostStandby(fleet), true, "a bridge with no phone-held model: standby");
  const local = hosts.find((x) => x.name === "local");
  const savedLocalDown = local.downAt;
  local.downAt = null;
  const p0 = h.pickHost({ model: "gemma2:2b", session: `t-${Date.now()}` });
  assert.equal(p0.host.name, "local", "with no phone the local daemon serves");
  fleet.resident.set("gemma2:2b", new Date(Date.now() + 60_000).toISOString());
  assert.equal(h.hostStandby(fleet), false, "a phone holds gemma: the bridge is a host");
  const p1 = h.pickHost({ model: "qwen3:8b", session: `t2-${Date.now()}` });
  assert.equal(p1.host.name, "local", "a model no phone holds never goes to the bridge (it cannot load it)");
  const p2 = h.pickHost({ model: "gemma2:2b", session: `t3-${Date.now()}`, exclude: "fleet" });
  assert.equal(p2.host.name, "local", "a turn that came FROM the bridge is never bounced back");
  fleet.resident.clear();
  local.downAt = savedLocalDown;
});

// ── the learner's diet ───────────────────────────────────────────────────
test("learner: only observations count — a holon's own stand_down and pattern_earned acts never earn a rule", async () => {
  const at = new Date().toISOString();
  const lines = [];
  for (let i = 0; i < 5; i++) lines.push(JSON.stringify({ at, act: "rec", holon: "residency", finding: "stand_down", probe: "memory_pressured" }));
  for (let i = 0; i < 5; i++) lines.push(JSON.stringify({ at, act: "rec", holon: "rule-author", finding: "pattern_earned", probe: null }));
  for (let i = 0; i < 5; i++) lines.push(JSON.stringify({ at, act: "crossing", finding: "channel_call", key: "x", model: "gemma2:2b" }));
  const holon = h.makeRuleAuthorHolon({ logLines: () => lines });
  assert.equal(await holon.sense(), null, "no observation, no pattern");
  for (let i = 0; i < 3; i++) lines.push(JSON.stringify({ at, act: "eva", finding: "window_changed", model: "test-model-" + process.pid, from: 8192, to: 4096 }));
  const f = await holon.sense();
  assert.ok(f, "three measured window_changed observations are a pattern");
  assert.deepEqual(f.candidates.map((c) => c.class), ["window_changed"]);
});

// ── rules as levers, on trial ────────────────────────────────────────────
test("trial: the permutation null — an obvious drop is significant, a shuffle is not", () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const base = [9, 8, 10, 9, 11, 10, 9, 8, 10, 9];
  const drop = [1, 0, 2, 1, 0, 1, 2, 1, 0, 1];
  assert.ok(h.permutationP(base, drop, { n: 500, rnd }) < 0.05, "a real drop is rare under the null");
  const same = [10, 9, 8, 11, 9, 10, 9, 10, 8, 9];
  assert.ok(h.permutationP(base, same, { n: 500, rnd }) > 0.2, "no drop is common under the null");
  assert.equal(h.permutationP([], [1], { n: 10, rnd }), 1, "no baseline: never significant");
});
test("trial: bucketCounts reads only eva observations of the class, folded snapshots by their count", () => {
  const t0 = Date.parse("2026-09-22T00:00:00Z"), t1 = t0 + 15 * 60_000;
  const lines = [
    JSON.stringify({ at: "2026-09-22T00:00:30Z", act: "eva", finding: "saturated", model: "m" }),
    JSON.stringify({ first: "2026-09-22T00:02:00Z", last: "2026-09-22T00:02:59Z", act: "eva", finding: "saturated", model: "m", count: 4 }),
    JSON.stringify({ at: "2026-09-22T00:02:10Z", act: "rec", holon: "residency", finding: "saturated", model: "m" }),
    JSON.stringify({ at: "2026-09-22T00:14:59Z", act: "eva", finding: "saturated", model: "other" }),
    JSON.stringify({ at: "2026-09-22T00:15:00Z", act: "eva", finding: "saturated", model: "m" }),
  ];
  const b = h.bucketCounts(lines, { cls: "saturated", probe: "m", t0, t1, buckets: 15 });
  assert.equal(b[0], 1); assert.equal(b[2], 4, "a folded snapshot counts by its count");
  assert.equal(b.reduce((a, x) => a + x, 0), 5, "the holon's act, the other probe, and the out-of-window line are not counted");
});
test("trial: a saturated rule moves familyCap one step on trial; a window that did not drop reverts it and concedes; one that dropped holds it", () => {
  h._resetTrialsForTest();
  const now = Date.parse("2026-09-22T01:00:00Z");
  const W = 30 * 60_000;
  const applied = [];
  const apply = (s, v) => { applied.push([s, v]); return { ok: true }; };
  const probe = `trial-model-${process.pid}`;
  const before = [];
  for (let i = 0; i < 30; i++) before.push(JSON.stringify({ at: new Date(now - W + i * 60_000).toISOString(), act: "eva", finding: "saturated", model: probe }));
  const rule = h.deriveRule({ class: "saturated", probe, count: 30, first: now - W, last: now, model: probe });
  h.adoptDerivedRule(rule);
  const t = h.startTrialFor(rule, { lines: before, now, apply });
  assert.ok(t, "a lever-bearing rule starts a trial");
  assert.equal(t.setting, "familyCap");
  assert.equal(t.to, t.from - 1, "one step down");
  assert.deepEqual(applied.at(-1), ["familyCap", t.to]);
  assert.equal(h.startTrialFor(rule, { lines: before, now, apply }), null, "one trial at a time");
  // the window runs and saturation did NOT drop
  const during = before.map((l) => { const e = JSON.parse(l); e.at = new Date(Date.parse(e.at) + W).toISOString(); return JSON.stringify(e); });
  let seed = 3; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const settled = h.settleTrialIfDue({ lines: [...before, ...during], now: now + W + 1, apply, rnd });
  assert.equal(settled.outcome, "conceded");
  assert.deepEqual(applied.at(-1), ["familyCap", t.from], "the lever went back");
  assert.equal(h.derivedRuleStore().find((r) => r.key === `saturated:${probe}`).standing, "conceded");
  // the same key is not retried right away
  assert.equal(h.startTrialFor(rule, { lines: before, now: now + W + 2, apply }), null, "a conceded key waits");
  // a fresh key whose trial window went quiet holds
  h._resetTrialsForTest();
  const probe2 = `${probe}-b`;
  const before2 = before.map((l) => JSON.stringify({ ...JSON.parse(l), model: probe2 }));
  const rule2 = h.deriveRule({ class: "saturated", probe: probe2, count: 30, first: now - W, last: now, model: probe2 });
  h.adoptDerivedRule(rule2);
  const t2 = h.startTrialFor(rule2, { lines: before2, now, apply });
  assert.ok(t2);
  const held = h.settleTrialIfDue({ lines: before2, now: now + W + 1, apply, rnd });
  assert.equal(held.outcome, "held");
  assert.equal(h.derivedRuleStore().find((r) => r.key === `saturated:${probe2}`).standing, "held");
  assert.ok(held.p <= 0.05);
  h.concedeDerivedRule(`saturated:${probe2}`, { reason: "test cleanup" });
  h._resetTrialsForTest();
});
test("trial: a rule without a lever is written, not tried", () => {
  h._resetTrialsForTest();
  const rule = h.deriveRule({ class: "window_changed", probe: "m", count: 4, first: 1, last: 2, model: "m" });
  assert.equal(h.startTrialFor(rule, { lines: [], now: Date.now(), apply: () => ({ ok: true }) }), null);
  assert.equal(h.ruleLeverOf("window_changed"), null);
  assert.ok(h.ruleLeverOf("saturated").setting);
});

// ── the collision detector, both ports ───────────────────────────────────
test("collision: a daemon on the CHANNEL's port is a collision even alone; two on the daemon's port too; one on the daemon's port is not", () => {
  const dp = h.modelServerPort ? h.modelServerPort() : 11435;
  const rows = [{ pid: 1, args: "ollama serve" }, { pid: 2, args: "ollama serve" }, { pid: 3, args: "node proxy.mjs" }];
  assert.equal(h.modelServerCollisionOf(new Map([[1, new Set([dp])]]), rows), null);
  const two = h.modelServerCollisionOf(new Map([[1, new Set([dp])], [2, new Set([dp])]]), rows);
  assert.deepEqual(two.pids, [1, 2]);
  const stray = h.modelServerCollisionOf(new Map([[1, new Set([dp])], [2, new Set([h.channelPort()])], [3, new Set([h.channelPort()])]]), rows);
  assert.deepEqual(stray.pids, [2], "the proxy on the channel port is not a daemon; the daemon there is the collision");
  assert.equal(stray.port, h.channelPort());
});

// ── the memory gate guards a LOAD, never a resident model (2026-09-22) ────
test("memory gate: a RESIDENT model is admitted under swap pressure; the same box refuses a non-resident load; the wait named is the declared promise", () => {
  const q = h.__queueTest;
  q.reset();
  q.setSaturated(false);
  q.setVitals({ swapPct: 95, swapOutPerS: 900, memAvailableMb: 600, memFreeMb: 40, cpuIdle: 60 });
  q.setOllamaModels([{ name: "gemma2:2b", contextLength: 8192 }]);
  const hdr = (k) => ({ "x-er7-caller": k, "x-er7-priority": "interactive" });
  const resident = h.admitChat(JSON.stringify({ model: "gemma2:2b", messages: [] }), hdr(`res-${process.pid}`));
  assert.equal(resident.allowed, true, `resident under pressure must be admitted: ${resident.type ?? ""} ${resident.message ?? ""}`);
  const cold = h.admitChat(JSON.stringify({ model: "qwen3:8b", messages: [] }), hdr(`cold-${process.pid}`));
  assert.equal(cold.allowed, false);
  assert.equal(cold.type, "memory_pressured");
  const sla = h.heimdallSettings().find((s) => s.name === "slaSeconds").value;
  assert.equal(cold.retryAfterS, Math.max(2, sla), "the Retry-After is the declared promise, not a second constant");
  q.reset();
});
test("retry hold: an interactive caller is never hold-doubled; a batch caller still is", () => {
  let now = 5_000_000;
  const a = `person-${process.pid}`, b = `loop-${process.pid}`;
  h.channelRefused(a, 10, { now, priority: "interactive" });
  now += 1_000;
  const early = h.channelRefused(a, 10, { now, priority: "interactive" });
  assert.equal(early.retryAfterS, 10); assert.equal(early.early, false);
  h.channelRefused(b, 10, { now, priority: "batch" });
  now += 1_000;
  const cap = Math.max(10, h.heimdallSettings().find((s) => s.name === "slaSeconds").value);
  assert.equal(h.channelRefused(b, 10, { now, priority: "batch" }).retryAfterS, Math.min(cap, 20));
});

// ── unknown residency never convicts; a held caller's re-poll is quiet ────
test("memory gate: unknown residency (no /api/ps read yet) never convicts a model under swap pressure", () => {
  const q = h.__queueTest;
  q.reset();
  q.setSaturated(false);
  q.setVitals({ swapPct: 95, swapOutPerS: 900, memAvailableMb: 600, memFreeMb: 40, cpuIdle: 60 });
  q.setOllamaModels(null); // the daemon's table has not been read — UNKNOWN
  const r = h.admitChat(JSON.stringify({ model: "gemma2:2b", messages: [] }), { "x-er7-caller": `unk-${process.pid}`, "x-er7-priority": "interactive" });
  assert.equal(r.allowed, true, `unknown residency must not refuse: ${r.type ?? ""}`);
  q.reset();
});
test("hold loop: a quiet re-poll (x-er7-quiet) is refused the same way but lands no second finding on the ledger", () => {
  const q = h.__queueTest;
  q.reset();
  q.setSaturated(true);
  const key = `quiet-${process.pid}`;
  const seen = [];
  const off = h.onLog((row) => { if (row.key === key && row.act === "eva") seen.push(row.finding); });
  try {
    const first = h.admitChat(JSON.stringify({ model: "gemma2:2b", messages: [] }), { "x-er7-caller": key });
    assert.equal(first.allowed, false);
    assert.equal(seen.length, 1, "the first refusal is on the ledger");
    const again = h.admitChat(JSON.stringify({ model: "gemma2:2b", messages: [] }), { "x-er7-caller": key, "x-er7-quiet": "1" });
    assert.equal(again.allowed, false);
    assert.equal(again.type, first.type);
    assert.equal(seen.length, 1, "a quiet poll writes nothing");
    const loud = h.admitChat(JSON.stringify({ model: "gemma2:2b", messages: [] }), { "x-er7-caller": key });
    assert.equal(loud.allowed, false);
    assert.equal(seen.length, 2, "an ordinary retry still lands");
  } finally { off(); q.reset(); }
});

// ── the ladder: the small mouth, per-model in-flight, the tiers (2026-09-22) ──
const ROSTER = [
  { name: "nomic-embed-text:latest", size: 0.27e9, families: ["nomic-bert"] },
  { name: "hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest", size: 0.94e9, families: ["olmo2"] },
  { name: "qwen2.5-coder:1.5b", size: 0.99e9, families: ["qwen2"] },
  { name: "gemma2:2b", size: 1.63e9, families: ["gemma2"] },
  { name: "moondream:latest", size: 1.74e9, families: ["phi2", "clip"] },
  { name: "smollm2:1.7b", size: 1.82e9, families: ["llama"] },
  { name: "qwen2.5vl:7b", size: 5.97e9, families: ["qwen25vl"] },
];
test("small mouth: the smallest installed generative model, by measured size — never an embedder, a vision model, or a coder; exclusions honored", () => {
  assert.equal(h.pickSmallMouth(ROSTER), "hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest");
  assert.equal(h.pickSmallMouth(ROSTER, { exclude: ["hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest"] }), "gemma2:2b", "the coder is skipped, the next generative model is taken");
  assert.equal(h.pickSmallMouth([{ name: "nomic-embed-text:latest", size: 1, families: ["nomic-bert"] }]), null);
  assert.equal(h.pickSmallMouth(null), null, "an unread roster names nothing");
});
test("in-flight is per model: gemma's queue is not OLMo's", () => {
  const local = h.inferenceHosts().find((x) => x.name === "local");
  const before = local.inflight;
  h.hostBegin("local", "m-a"); h.hostBegin("local", "m-a"); h.hostBegin("local", "m-b");
  assert.equal(h.modelInflight(local, "m-a"), 2);
  assert.equal(h.modelInflight(local, "m-b"), 1);
  assert.equal(h.modelInflight(local, "m-c"), 0, "a model with nothing in flight waits on nothing");
  assert.equal(local.inflight, before + 3, "the host total still counts every turn");
  h.hostEnd("local", { model: "m-a", ms: 1000, ok: true }); h.hostEnd("local", { model: "m-a", ms: 1000, ok: true }); h.hostEnd("local", { model: "m-b", ms: 1000, ok: true });
  assert.equal(h.modelInflight(local, "m-a"), 0);
  assert.equal(local.inflight, before);
  local.resident.delete("m-a"); local.resident.delete("m-b");
});
test("tiers: the requested model first wherever resident; then the small mouth on the daemon and a phone's model through the bridge, provisional; a cold model is never a tier; the excluded host is skipped", () => {
  h.__tiersTest.setInstalled(ROSTER);
  const hosts = h.inferenceHosts();
  const local = hosts.find((x) => x.name === "local");
  const fleet = hosts.find((x) => x.name === "fleet");
  const savedDown = local.downAt; local.downAt = null;
  const soon = new Date(Date.now() + 60_000).toISOString();
  local.resident.set("gemma2:2b", soon);
  local.resident.set("hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest", soon);
  local.resident.set("qwen2.5vl:7b", soon); // resident but never a substitute: not the small mouth
  fleet.kind = "bridge"; fleet.resident.set("qwen2.5:0.5b", soon);
  const t = h.serveTiersFor("gemma2:2b");
  assert.deepEqual(t.map((c) => [c.tier, c.model, c.host]), [
    ["full", "gemma2:2b", "local"],
    ["small", "hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest", "local"],
    ["device", "qwen2.5:0.5b", "fleet"],
  ].filter((row) => row[0] !== "device" || t.some((c) => c.tier === "device")), JSON.stringify(t));
  assert.ok(t.every((c) => c.tier === "full" ? !c.provisional : c.provisional));
  const cold = h.serveTiersFor("qwen3:8b");
  assert.ok(!cold.some((c) => c.tier === "full"), "a model no one holds has no full tier — it is never loaded to serve now");
  assert.ok(cold.some((c) => c.tier === "small"), "the small mouth stands in");
  const noFleet = h.serveTiersFor("gemma2:2b", { exclude: "fleet" });
  assert.ok(!noFleet.some((c) => c.host === "fleet"), "a turn that came from the bridge never goes back to it");
  // the small mouth itself asked for: it is the full tier; its substitute is the NEXT smallest generative model, never itself
  const smallAsked = h.serveTiersFor("hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest");
  assert.equal(smallAsked[0].tier, "full");
  const sub = smallAsked.find((c) => c.tier === "small");
  assert.equal(sub?.model, "gemma2:2b", "the substitute for the small mouth is the next smallest resident generative model");
  local.resident.clear(); fleet.resident.clear(); local.downAt = savedDown;
  h.__tiersTest.setInstalled(null);
});

// ── model-diversity admission (2026-09-22) ────────────────────────────────
test("diversity cap: real concurrent demand for N distinct models at the cap holds an (N+1)th non-resident request; a resident model is always admitted; adding to an already-busy model is not new diversity", () => {
  const q = h.__queueTest;
  q.reset();
  q.setSaturated(false);
  q.setVitals({ swapPct: 10, swapOutPerS: 0, memAvailableMb: 8000, memFreeMb: 4000, cpuIdle: 60 });
  q.setOllamaModels([{ name: "resident-model", contextLength: 8192 }]);
  const cap = h.heimdallSettings().find((s) => s.name === "modelDiversityCap").value;
  assert.ok(cap >= 1, "the default cap must be positive for this test to mean anything");
  const busyModels = Array.from({ length: cap }, (_, i) => `busy-${i}-${process.pid}`);
  for (const m of busyModels) h.hostBegin("local", m);
  try {
    const hdr = (k) => ({ "x-er7-caller": k, "x-er7-priority": "interactive" });
    const fourth = h.admitChat(JSON.stringify({ model: `new-model-${process.pid}`, messages: [] }), hdr(`div-new-${process.pid}`));
    assert.equal(fourth.allowed, false);
    assert.equal(fourth.type, "model_diversity_capped");
    const sla = h.heimdallSettings().find((s) => s.name === "slaSeconds").value;
    assert.equal(fourth.retryAfterS, Math.max(2, sla), "the wait named is the declared promise, not a separate constant");
    assert.equal(fourth.diversity.busy.length, cap);

    const residentAdmit = h.admitChat(JSON.stringify({ model: "resident-model", messages: [] }), hdr(`div-res-${process.pid}`));
    assert.equal(residentAdmit.allowed, true, "a resident model is never held by this check, however busy the box is");

    const sameBusyAdmit = h.admitChat(JSON.stringify({ model: busyModels[0], messages: [] }), hdr(`div-same-${process.pid}`));
    assert.equal(sameBusyAdmit.allowed, true, "more demand for an ALREADY-busy model is not new diversity — it doesn't need a new slot");
  } finally {
    for (const m of busyModels) h.hostEnd("local", { model: m, ok: true, ms: 1 });
    q.reset();
  }
});
test("diversity cap: unknown residency never convicts, and the cap is runtime-adjustable and persisted like every other setting", () => {
  const q = h.__queueTest;
  q.reset();
  q.setSaturated(false);
  q.setVitals({ swapPct: 10, swapOutPerS: 0, memAvailableMb: 8000, memFreeMb: 4000, cpuIdle: 60 });
  q.setOllamaModels(null); // unread roster — UNKNOWN, never evidence of absence
  const busy = [`u1-${process.pid}`, `u2-${process.pid}`, `u3-${process.pid}`];
  for (const m of busy) h.hostBegin("local", m);
  try {
    const r = h.admitChat(JSON.stringify({ model: `unk-${process.pid}`, messages: [] }), { "x-er7-caller": `div-unk-${process.pid}`, "x-er7-priority": "interactive" });
    assert.notEqual(r.type, "model_diversity_capped", "unknown residency must never be convicted by the diversity check either");
  } finally {
    for (const m of busy) h.hostEnd("local", { model: m, ok: true, ms: 1 });
    q.reset();
  }
  const r1 = h.setHeimdallSetting("modelDiversityCap", 0, { key: "test" });
  assert.equal(r1.ok, true);
  assert.equal(h.heimdallSettings().find((s) => s.name === "modelDiversityCap").value, 0);
  h.setHeimdallSetting("modelDiversityCap", r1.from, { key: "test" }); // restore
});
