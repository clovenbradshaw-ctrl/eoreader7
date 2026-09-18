// create-learn.mjs — a model-free build: create something, learn against
// what fails. No mouth anywhere in this driver (no runProxyTurn, no model,
// no prompt): failing tests propose, mechanical remedies dispose, and the
// forecast prior learns P(green) per remedy shape across steps.
//
// The task: a tip-calculator workspace with three defects spanning the
// remedy table — an unimportable name (stub synthesis), a stdlib
// NameError (import fix), and a stubbed body no mechanics can write
// (novel logic — the run stops here WITH the typed residual, which IS
// the finding: the exact boundary of the mouth's job).
//
// Arbiter: the workspace's own `python3 test_bill.py` (unittest, stdlib).
// Physics: applyOps exact bytes, pyCheckSyntax pre-write, forecast
// predict→observe per remedy. Usage: node native/eval/the-fold/create-learn.mjs

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keywordSetOf, loadCodeKeywordPrior } from "../../adapters/text/code-structure.js";
import { importSpans } from "../../adapters/code/scan.js";
import { callArityOf, synthesizeStub, importAnchor } from "../../adapters/code/mechanical.js";
import { pyCheckSyntax, suggestImportFix } from "../../adapters/code/py-engine.js";
import { readOps, applyOps } from "../../the-fold/patch.js";
import { emptyForecast, forecastKey, forecast, observe, forecastError } from "../../the-fold/forecast.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PY_PRIOR = loadCodeKeywordPrior("python");
const PY_KW = keywordSetOf(PY_PRIOR);
const STDLIB = PY_PRIOR?.stdlibModules ?? [];

const APP_BROKEN = `"""Tip calculator."""

def total(bill, pct):
    return share(bill, pct) + bill


def share(bill, pct):
    return bill * pct / 100


def receipt(bill):
    return json.dumps({"t": bill})
`;

const TEST_BILL = `import unittest
from app import total, share, serve, receipt


class TestBill(unittest.TestCase):
    def test_share(self):
        self.assertEqual(share(100, 15), 15)

    def test_total(self):
        self.assertEqual(total(100, 15), 115)

    def test_receipt(self):
        self.assertEqual(receipt(115), '{"t": 115}')

    def test_serve(self):
        self.assertEqual(serve(100, 15), 115)


if __name__ == "__main__":
    unittest.main()
`;

const IMPORT_ERROR_RE = /cannot import name '([A-Za-z_]\w*)' from '([A-Za-z_]\w*)'/;
const NAME_ERROR_RE = /NameError:\s*name\s+'([A-Za-z_]\w*)'\s+is not defined/;

function runTests(ws) {
  try {
    const output = execSync("python3 test_bill.py", { cwd: ws, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] });
    return { exitCode: 0, output };
  } catch (err) {
    return { exitCode: typeof err.status === "number" ? err.status : 1, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function main() {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "create-learn-"));
  const appPath = path.join(ws, "app.py");
  fs.writeFileSync(appPath, APP_BROKEN);
  fs.writeFileSync(path.join(ws, "test_bill.py"), TEST_BILL);
  const steps = [];
  let prior = emptyForecast();
  let appText = APP_BROKEN;

  for (let step = 1; step <= 6; step += 1) {
    const tested = runTests(ws);
    if (tested.exitCode === 0) {
      steps.push({ step, outcome: "green", detail: "suite passes — build complete, no mouth ever woke" });
      return report(ws, steps, prior, true);
    }
    const firstLine = (tested.output.match(/^(ImportError|NameError|SyntaxError).*/m) ?? [null])[0];
    // Remedy 1: unimportable name → stub from the TEST's own call sites.
    let m = IMPORT_ERROR_RE.exec(tested.output);
    if (m) {
      const [, name] = m;
      // Arity from the TEST's own call sites (the callee is missing by
      // definition, so the entity table can never contain it — callArityOf
      // searches the name directly, import lines blanked).
      const sites = callArityOf(TEST_BILL, "test_bill.py", name);
      const arity = sites.arities.length ? Math.max(...sites.arities) : 0;
      const stub = synthesizeStub({ name, arity, kind: "function", language: "python", keywords: PY_KW });
      if (!stub.ok) {
        steps.push({ step, outcome: "refused", detail: stub.gap });
        return report(ws, steps, prior, false);
      }
      const lines = appText.trimEnd().split("\n");
      const find = lines[lines.length - 1];
      const add = `${find}\n\n\n${stub.add}\n`;
      const rec = land(ws, appPath, appText, find, add, `stub ${name}/${arity} from test call sites`,
        (output) => !output.includes(`cannot import name '${name}'`));
      appText = rec.appText;
      steps.push({ ...rec.step, prediction: rec.prediction });
      prior = rec.prior;
      continue;
    }
    // Remedy 2: stdlib NameError → import fix from the received list.
    m = NAME_ERROR_RE.exec(tested.output);
    if (m) {
      const fix = suggestImportFix({ failureOutput: tested.output, fileText: appText, stdlibModules: STDLIB });
      if (!fix.ok) {
        steps.push({ step, outcome: "refused", detail: fix.gap });
        return report(ws, steps, prior, false);
      }
      const rec = land(ws, appPath, appText, fix.find, fix.add, fix.basis,
        (output) => !NAME_ERROR_RE.test(output));
      appText = rec.appText;
      steps.push({ ...rec.step, prediction: rec.prediction });
      prior = rec.prior;
      continue;
    }
    // No remedy matched: the residual. Name it, stop, do not guess.
    steps.push({
      step, outcome: "residual",
      firstFailure: firstLine,
      detail: "no mechanical remedy matches — a stubbed body no table can write (novel logic). This is the mouth's doorway, measured as the remainder, never crossed here.",
    });
    return report(ws, steps, prior, false);
  }
  steps.push({ step: "cap", outcome: "unfinished", detail: "step budget exhausted" });
  return report(ws, steps, prior, false);

  function land(wsDir, file, before, find, add, basis, goneWhen) {
    const ops = readOps([{ find, add }]);
    const applied = ops ? applyOps(before, ops) : { ok: false, gap: { kind: "malformed" } };
    if (!applied.ok) {
      return { appText: before, prior, step: { outcome: "gap", detail: applied.gap }, prediction: null };
    }
    const key = forecastKey({ op: ops[0].op, language: "python", syntax: "checked" });
    const fc = forecast(prior, key);
    const syntax = pyCheckSyntax(applied.code, "app.py");
    if (syntax !== null && !syntax.ok) {
      return { appText: before, prior, step: { outcome: "gap", detail: syntax.error }, prediction: null };
    }
    fs.writeFileSync(file, applied.code);
    const tested = runTests(wsDir);
    // Outcome granularity: did THIS remedy clear ITS named failure?
    // (The suite may still be red elsewhere — per-remedy success is the
    // honest unit, same as per-behavior gates.)
    const won = goneWhen(tested.output) || tested.exitCode === 0;
    const err = forecastError(fc.p, won);
    return {
      appText: applied.code,
      prior: observe(prior, key, won),
      step: { outcome: won ? "remedy-green" : "remedy-partial", basis, op: ops[0].op, suiteExit: tested.exitCode },
      prediction: { key, p: fc.p, trials: fc.trials, error: err },
    };
  }
}

function report(ws, steps, prior, done) {
  const out = { workspace: ws, done, steps, prior: prior.keys };
  console.log(JSON.stringify(out, null, 1));
}

main();
