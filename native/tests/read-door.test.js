import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

test("the real proxy starts without a model; its reading door discloses prefix bounds and preserves source coordinates", { timeout: 20000 }, async () => {
  const reserve = net.createServer();
  reserve.listen(0, "127.0.0.1"); await once(reserve, "listening");
  const port = reserve.address().port;
  await new Promise((resolve) => reserve.close(resolve));
  const child = spawn(process.execPath, ["proxy.mjs"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { ...process.env, ER7_PROXY_PORT: String(port), ER7_HEIMDALL_PORT: "0", ER7_CHANNEL_PORT: "0", ER7_EXTERNAL_HEIMDALL: "1", ER7_MODEL_WATCHDOG: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (c) => { output += c; });
  child.stderr.on("data", (c) => { output += c; });
  try {
    const deadline = Date.now() + 12000;
    while (!output.includes("proxy listening") && child.exitCode === null && Date.now() < deadline)
      await new Promise((r) => setTimeout(r, 50));
    assert.equal(child.exitCode, null, "proxy must survive startup");
    assert.ok(output.includes("proxy listening"), "proxy must actually listen");
    const text = "  Alice met Bob. Alice told Bob about Carol. Bob met Alice.";
    const read = async (extra) => {
      const r = await fetch(`http://127.0.0.1:${port}/v1/read`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "door-test", text, ...extra }), signal: AbortSignal.timeout(5000),
      });
      return { status: r.status, data: await r.json() };
    };
    const full = await read({});
    assert.equal(full.status, 200);
    assert.equal(full.data.schema, "EORead@1");
    assert.equal(full.data.truncated, false);
    assert.equal(full.data.readCharacters, text.length);
    assert.ok(full.data.stagesNotRun.length);
    const prefix = await read({ maxCharacters: 35 });
    assert.equal(prefix.status, 200);
    assert.equal(prefix.data.truncated, true);
    assert.equal(prefix.data.sourceCharacters, text.length);
    assert.equal(prefix.data.readCharacters, 35);
    assert.ok(prefix.data.gaps.some((g) => g.startsWith("input_truncated:")));
    assert.equal((await read({ maxCharacters: -1 })).status, 400);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 2000);
      await exited;
      clearTimeout(timer);
    }
  }
});
