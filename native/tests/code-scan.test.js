// tests/code-scan.test.js — adapters/code/scan.js: the what-is-this structural
// scan of a code hunk. Pins the scan's contracts: module/asset names read off
// the bundle's own bytes and classified with a disclosed basis; the vendor
// stack named only where the bytes support it (a vendored chunk names its
// package even when the bundle never writes `from "react"`); banners and
// high-information literals extracted byte-anchored; and every giant-hunk scan
// discloses exactly what it skipped.

import { test } from "node:test";
import assert from "node:assert/strict";
import { moduleMapFrom, vendorSignalsFrom, bannersFrom, distinctiveStringsFrom, scanHunk } from "../adapters/code/scan.js";

const MINI_BUNDLE = [
  'const __vite__mapDeps=(i,m,__vite__mapDeps,d=(m.f||(m.f=["assets/AppMain-ABC12345.js","assets/react-vendor-abc12345.js","assets/antd-vendor-abc12345.js","assets/apollo-vendor-abc12345.js","assets/LicenseStatus-abc12345.js","assets/Login-abc12345.js","assets/Admin-abc12345.js","assets/index-abc12345.css","assets/logo-abc12345.png"])))=>i.map(i=>d[i]);',
  'import{c as requireReact}from"./react-vendor-abc12345.js";',
  'import{h as hooks}from"./utils-vendor-abc12345.js";',
  '/*! someapp v3.2.1 | (c) 2026 Example Org | MIT License */',
  'export const SURVEY_ENDPOINT = "/api/v1/surveys/submissions";',
  'export const ROUTE = "/dashboard/admin/reports";',
  'function LicenseStatus(){ return "/api/license/status"; }',
  'function Admin(){ return "Admin Dashboard"; }',
].join("\n");

test("moduleMapFrom: vendor / feature / asset classified with a disclosed basis", () => {
  const map = moduleMapFrom(MINI_BUNDLE, { maxAssets: 50 });
  const names = new Map(map.rows.map((r) => [r.name, r.kind]));
  assert.equal(names.get("assets/react-vendor-abc12345.js"), "vendor", "vendored chunk classed vendor");
  assert.equal(names.get("assets/antd-vendor-abc12345.js"), "vendor");
  assert.equal(names.get("assets/apollo-vendor-abc12345.js"), "vendor");
  assert.equal(names.get("assets/AppMain-ABC12345.js"), "feature", "the app's own chunk classed feature");
  assert.equal(names.get("assets/LicenseStatus-abc12345.js"), "feature");
  assert.equal(names.get("assets/index-abc12345.css"), "asset", "static asset classed asset");
  assert.equal(names.get("assets/logo-abc12345.png"), "asset");
  // "utils-vendor-…" carries NO known package word — a vendor-CONVENTION
  // chunk that is the app's own infrastructure. It is disclosed as `infra`,
  // never silently asserted as a third-party vendor (or as a feature module).
  assert.equal(names.get("./utils-vendor-abc12345.js"), "infra");
  assert.ok(map.rows.every((r) => r.basis && r.basis.length > 0));
  assert.equal(map.feature, 4); // AppMain, LicenseStatus, Login, Admin
  assert.equal(map.vendor, 3); // react, antd, apollo
  assert.equal(map.asset, 2);
  assert.equal(map.infra, 1); // utils-vendor
});

test("moduleMapFrom: the cap is a disclosed cut, never a silent first-N", () => {
  const many = Array.from({ length: 30 }, (_, i) => `assets/Module${String(i).padStart(2, "0")}-abc12345.js`).join('","');
  const text = `const d=(m.f||(m.f=["${many}"]));`;
  const map = moduleMapFrom(text, { maxAssets: 10 });
  assert.equal(map.rows.length, 10);
  assert.equal(map.total, 30);
  assert.match(map.basis, /30 module\/asset names/);
});

test("scanHunk: vendored chunks name the vendor even without `from \"react\"`", () => {
  const scan = scanHunk(MINI_BUNDLE, { fileName: "mini.js" });
  const vendorNames = scan.vendors.map((v) => v.name);
  assert.ok(vendorNames.includes("Vite"), `Vite missing: ${vendorNames}`);
  assert.ok(vendorNames.includes("React"), `React (from react-vendor chunk) missing: ${vendorNames}`);
  assert.ok(vendorNames.includes("Ant Design"), `Ant Design missing: ${vendorNames}`);
  assert.ok(vendorNames.includes("Apollo Client"), `Apollo Client missing: ${vendorNames}`);
  // no bogus vendor identity is invented for unknown leading words
  assert.equal(vendorNames.includes("Utils"), false);
});

test("vendorSignalsFrom: only the bytes' own fingerprints fire", () => {
  const signals = vendorSignalsFrom('import{c}from"./react-vendor-abc12345.js";const __vite__x=1;');
  const names = signals.map((s) => s.name);
  assert.ok(names.includes("Vite"));
  assert.equal(names.includes("GraphQL"), false);
  assert.ok(signals.every((s) => Array.isArray(s.offsets) && s.offsets.every((o) => typeof o === "number")));
});

test("bannersFrom: declaration banners are byte-anchored", () => {
  const banners = bannersFrom(MINI_BUNDLE, { maxBanners: 2 });
  assert.ok(banners.length >= 1);
  assert.match(banners[0].text, /someapp v3\.2\.1/);
  assert.ok(MINI_BUNDLE.slice(banners[0].offset).startsWith("/*! someapp"));
});

test("distinctiveStringsFrom: endpoints score high, are gated, and disclose the total", () => {
  const strings = distinctiveStringsFrom(MINI_BUNDLE, { maxScanChars: 10_000, maxKeep: 10 });
  const texts = strings.rows.map((r) => r.text);
  assert.ok(texts.includes("/api/v1/surveys/submissions"), `endpoint missing: ${texts}`);
  assert.ok(texts.includes("/api/license/status"));
  assert.ok(strings.rows.every((r) => r.count >= 1 && typeof r.offset === "number"));
  assert.ok(strings.total >= strings.rows.length, "the cut count must not exceed the scored total");
  assert.match(strings.basis, /scanned 10,000 chars/);
});

test("scanHunk: every skipped byte is disclosed, never silent", () => {
  const giant = MINI_BUNDLE + "\n" + Array.from({ length: 500_000 }, () => "y").join("");
  const scan = scanHunk(giant, { fileName: "giant.js", maxScanChars: 10_000 });
  assert.equal(scan.sampled, true);
  assert.equal(scan.scannedChars, 10_000);
  assert.equal(scan.skippedChars, giant.length - 10_000);
  assert.equal(scan.scannedChars + scan.skippedChars, scan.bytes);
  assert.equal(scan.schema, "CodeHunkScan@1");
});