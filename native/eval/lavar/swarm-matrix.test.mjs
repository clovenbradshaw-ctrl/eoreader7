// swarm-matrix.test.mjs — the wire: a thing hardening on one device is an
// event another device folds in as a NOMINEE until its own elenchus
// corroborates it. Self-signal is never re-imported; the mirror dedupes;
// the finder's `matrix` surface comes alive with remote nominations.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { publish, receive, eventId, deviceId } from "./swarm-matrix.mjs";
import { findThings } from "./swarm-things.mjs";

const RESULTS = path.join(import.meta.dirname, "results");
const MIRROR = path.join(RESULTS, "swarm-matrix-events.jsonl");
const REMOTE = path.join(RESULTS, "swarm-matrix-breakthroughs.jsonl");

function withBackup(fn) {
  const mirrorBak = fs.existsSync(MIRROR) ? fs.readFileSync(MIRROR, "utf8") : null;
  const remoteBak = fs.existsSync(REMOTE) ? fs.readFileSync(REMOTE, "utf8") : null;
  try {
    fs.rmSync(MIRROR, { force: true }); // each test starts on a clean event stream
    fs.rmSync(REMOTE, { force: true });
    return fn();
  }
  finally {
    if (mirrorBak !== null) fs.writeFileSync(MIRROR, mirrorBak); else fs.rmSync(MIRROR, { force: true });
    if (remoteBak !== null) fs.writeFileSync(REMOTE, remoteBak); else fs.rmSync(REMOTE, { force: true });
  }
}

test("publish is content-addressed and dedupes: a second publish emits nothing new", () => {
  withBackup(() => {
    const first = publish();
    const second = publish();
    assert.equal(second, 0, "the same consequence is the same event — never re-emitted");
    assert.ok(first >= 2, "kept variants + the named thing are all emitted");
  });
});

test("self-signal is never re-imported: receive folds 0 of this device's own events", () => {
  withBackup(() => {
    publish();
    const r = receive();
    assert.equal(r.imported, 0);
    assert.ok(!fs.existsSync(REMOTE) || fs.readFileSync(REMOTE, "utf8").trim() === "");
  });
});

test("a REMOTE device's breakthrough is folded in as a nominee on the finder's matrix surface", () => {
  withBackup(() => {
    publish();
    const remoteDevice = "dev:othermachine";
    const remoteEvent = {
      schema: "SwarmMatrixEvent@1",
      id: eventId("SYN", { variant: "reread", echo: "r111", terrain: ["Atmosphere"], mhc: 10, pointer: "/other-book-ch1", shape: 0.61 }),
      op: "SYN", at: new Date().toISOString(), room: `device:${remoteDevice}`, sender: remoteDevice,
      body: { variant: "reread", echo: "r111", terrain: ["Atmosphere"], mhc: 10, pointer: "/other-book-ch1", shape: 0.61 },
    };
    fs.appendFileSync(MIRROR, JSON.stringify(remoteEvent) + "\n");
    const r = receive();
    assert.equal(r.imported, 1, "the remote breakthrough was folded into the matrix surface");
    const found = findThings({}, [
      { name: "matrix", breakthroughs: REMOTE, lineage: () => [] },
    ]);
    assert.equal(found.nominees.length, 1, "a remote breakthrough is a NOMINEE on this device, never a thing");
    assert.equal(found.nominees[0].variant, "reread");
    assert.equal(found.nominees[0].surface, "matrix");
    assert.ok(found.nominees[0].remote, "the nominee carries its originating device");
    assert.equal(found.things.length, 0, "corroboration is never imported — it is earned");
  });
});

test("a remote rerun of a remote breakthrough is folded once — the event stream is a stream, not a pile", () => {
  withBackup(() => {
    publish();
    const remoteDevice = "dev:othermachine";
    const make = (at) => ({
      schema: "SwarmMatrixEvent@1", id: eventId("SYN", { variant: "reread" }), op: "SYN", at,
      room: `device:${remoteDevice}`, sender: remoteDevice,
      body: { variant: "reread", echo: "r111", terrain: ["Atmosphere"], mhc: 10, pointer: "/other-book-ch1", shape: 0.61 },
    });
    fs.appendFileSync(MIRROR, JSON.stringify(make("2026-09-17T00:00:00Z")) + "\n");
    fs.appendFileSync(MIRROR, JSON.stringify(make("2026-09-18T00:00:00Z")) + "\n");
    const r = receive();
    const lines = fs.readFileSync(REMOTE, "utf8").trim().split("\n").filter(Boolean);
    assert.equal(lines.length, 1, "same body, same content address — one line, whatever the day");
  });
});

test("deviceId is stable per machine and never shared", () => {
  const a = deviceId();
  const b = deviceId();
  assert.equal(a, b);
  assert.ok(a.startsWith("dev:"));
});