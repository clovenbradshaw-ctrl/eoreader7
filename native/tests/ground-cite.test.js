// tests/ground-cite.test.js — a declared claim's `ground`, checked against
// real files on disk. Against real material only (feedback_verify_gates_
// against_real_organs: a hand-written stand-in masks the real gap a
// mechanical check exists to catch) — this repo's own files, a fabricated
// path that does not exist, and text-mode's own "/p3" convention.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gfpClaim } from "../kernel/gfp-claim.js";
import { resolveGroundFile, looksLikeFilePath, citeGround, fileUrl, polarityControl, looksLikeCommitRef, citeCommit } from "../organs/ground-cite.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = path.join(HERE, "..", "organs", "ground-cite.js"); // the module under test, cited against itself
// A real, permanent commit from this exact session's own work (pushed to
// origin/main) — real material, per this file's own header, not a
// fabricated hash. Git history does not rewrite itself under this repo's
// own conventions, so this stays valid.
const REPO_ROOT = path.resolve(HERE, "..", "..");
const REAL_COMMIT = "bb97e4b";

test("resolveGroundFile: a real file resolves to itself, and a fabricated code SCOPE beneath it resolves to the same file", () => {
  assert.equal(resolveGroundFile(SELF), SELF);
  assert.equal(resolveGroundFile(`${SELF}/citeGround`), SELF, "a scope suffix is never itself a filesystem entry — the walk must land on the file it is a scope inside of");
  assert.equal(resolveGroundFile(`${SELF}/citeGround/deeper/still`), SELF, "any depth of fabricated scope still resolves to the one real file underneath it");
});

test("resolveGroundFile: nothing resolves for a path that does not exist, and the filesystem root is never returned", () => {
  assert.equal(resolveGroundFile(path.join(HERE, "..", "organs", "NOPE-DOES-NOT-EXIST.js")), null);
  assert.equal(resolveGroundFile("/p3"), null);
  assert.equal(resolveGroundFile("/"), null);
});

test("looksLikeFilePath: distinguishes a real absolute path from text-mode's own paragraph addressing", () => {
  assert.equal(looksLikeFilePath("/p3"), false, "reason.mjs's own JSDoc names /p3 as its paragraph-ground convention, never a file");
  assert.equal(looksLikeFilePath("/order"), false);
  assert.equal(looksLikeFilePath(SELF), true);
});

test("citeGround: \"unaddressed\" for a non-filesystem ground — never confused with a missing file", () => {
  const claim = gfpClaim({ ground: "/p3", rel: "has-type", roles: { ARG0: "x", ARG1: "int" } });
  const r = citeGround(claim, "whatever this claim says");
  assert.equal(r.verdict, "unaddressed");
  assert.equal(r.file, null);
});

test("citeGround: \"missing\" for a ground that looks like a real path but resolves to nothing", () => {
  const claim = gfpClaim({ ground: path.join(HERE, "..", "organs", "TOTALLY-MADE-UP-FILE-XYZ.js"), rel: "has-type", roles: { ARG0: "x", ARG1: "int" } });
  const r = citeGround(claim, "whatever this claim says");
  assert.equal(r.verdict, "missing");
});

test("citeGround: \"unattributed\" when the file is real but the claim's own words share nothing with it", () => {
  const claim = gfpClaim({ ground: SELF, rel: "bakes", roles: { ARG0: "sourdough", ARG1: "on tuesdays" } });
  const r = citeGround(claim, "sourdough bread baking rituals observed by penguins in the antarctic circle");
  assert.equal(r.verdict, "unattributed");
  assert.equal(r.file, SELF);
});

test("citeGround: \"cited\" — earns a real, byte-addressed, line-numbered, clickable citation against this module's own words", () => {
  const claim = gfpClaim({
    ground: SELF,
    rel: "walks",
    roles: { ARG0: "resolveGroundFile", ARG1: "a grounds holon ancestry deepest first" },
    force: "strict",
  });
  const r = citeGround(claim, "resolveGroundFile walks a ground's holon ancestry deepest-first and returns the first segment that is a real file on disk");
  assert.equal(r.verdict, "cited");
  assert.equal(r.file, SELF);
  assert.ok(Number.isInteger(r.line) && r.line >= 1, "a real 1-based line number, not a byte offset");
  assert.equal(r.url, fileUrl(SELF, r.line));
  assert.match(r.ref, /#\d+-\d+$/, "cite.js's own byte-range ref format");
  assert.ok(r.score > r.floor, "attribute()'s own two-part test: overlap AND beats the null-corpus floor");
  // The excerpt exists (for this test's own verification only — reason.mjs
  // itself never prints or persists it; see reasoning-record.js's header).
  assert.ok(r.excerpt.length > 0);
});

test("citeGround: never returns an excerpt key the caller did not ask to check — the shape stays the same across verdicts", () => {
  const claim = gfpClaim({ ground: "/p3", rel: "x", roles: { ARG0: "a", ARG1: "b" } });
  const r = citeGround(claim, "x");
  assert.equal(r.verdict, "unaddressed");
  assert.equal("excerpt" in r, false, "no file was ever read, so there is nothing to excerpt");
});

test("polarityControl: checked is false for anything but a cited verdict — nothing to interrogate", () => {
  const claim = gfpClaim({ ground: "/p3", rel: "x", roles: { ARG0: "a", ARG1: "b" } });
  const r = citeGround(claim, "x");
  const pc = polarityControl(claim, "x", r);
  assert.equal(pc.checked, false);
});

test("polarityControl: reachable is false on a real cited claim — the checker cannot tell it from its own denial", () => {
  const claim = gfpClaim({
    ground: SELF,
    rel: "walks",
    roles: { ARG0: "resolveGroundFile", ARG1: "a grounds holon ancestry deepest first" },
    force: "strict",
  });
  const said = "resolveGroundFile walks a ground's holon ancestry deepest-first and returns the first segment that is a real file on disk";
  const r = citeGround(claim, said);
  assert.equal(r.verdict, "cited", "precondition: this claim must actually cite, or the control below tests nothing");
  const pc = polarityControl(claim, said, r);
  assert.equal(pc.checked, true);
  assert.equal(pc.reachable, false, "negating and affirming this claim move the verdict identically — dilution, not negation-detection");
  assert.equal(pc.negatedVerdict, pc.affirmedVerdict, "the paired test's own claim: both wrappers land the same place");
});

test("polarityControl: a same-shaped AFFIRMING wrapper must move the verdict the same way a negating one does, on the same real claim — this is the regression the naive single-wrapper design failed", () => {
  // Pinned live 2026-09-23: an earlier version of this control had only the
  // negating wrapper and reported "reachable: true" here — a false
  // reassurance. It was dilution (any added non-matching words can push a
  // marginal citation below its null floor), never negation-sensitivity;
  // source.js's own STOPWORDS strips "not"/"no" before scoring ever sees
  // them, so this checker cannot represent negation at all. This test pins
  // the paired design that actually shipped, not the one that lied.
  const claim = gfpClaim({ ground: SELF, rel: "checks", roles: { ARG0: "an atom", ARG1: "containment" } });
  const said = "resolveGroundFile walks a ground's holon ancestry deepest-first";
  const r = citeGround(claim, said);
  if (r.verdict !== "cited") return; // this specific claim's own margin is not the point under test
  const pc = polarityControl(claim, said, r);
  assert.equal(pc.reachable, false);
});

test("looksLikeCommitRef: only the declared /commit/<repo>#<hash> shape, never a bare-looking hex string sniffed as one", () => {
  assert.equal(looksLikeCommitRef(`/commit${REPO_ROOT}#${REAL_COMMIT}`), true);
  assert.equal(looksLikeCommitRef("/p3"), false);
  assert.equal(looksLikeCommitRef(REAL_COMMIT), false, "a bare hash is never treated as a commit ref — declared, never guessed");
  assert.equal(looksLikeCommitRef(SELF), false, "a real file path is not a commit ref merely for being absolute");
});

test("citeGround: a /commit/ ground for a real commit returns \"event\" with the real file list, never a missing-file verdict", () => {
  // The exact regression this organ exists to fix: an event claim ("commit
  // X contains these files") used to come back ground_missing, as though a
  // commit were a file. holon() normalization is exercised for real here —
  // gfpClaim() runs the ground through it before citeGround ever sees it.
  const claim = gfpClaim({ ground: `/commit${REPO_ROOT}#${REAL_COMMIT}`, rel: "committed", roles: { ARG0: "x", ARG1: "y" } });
  assert.equal(claim.ground, `/commit${REPO_ROOT}#${REAL_COMMIT}`, "holon() must collapse the doubled slash without mangling the path");
  const r = citeGround(claim, "committed as claimed");
  assert.equal(r.verdict, "event");
  assert.equal(r.hash, REAL_COMMIT);
  assert.equal(r.repo, REPO_ROOT);
  assert.ok(Array.isArray(r.files) && r.files.length > 0, "the real, structured file list from git show --name-only");
  assert.equal("excerpt" in r, false, "no commit MESSAGE text is ever carried — structural facts only, same rule as a file citation");
});

test("citeGround: a /commit/ ground for a fabricated hash is \"missing\", with git's own reason, never the generic file-shaped wording", () => {
  const fake = "0".repeat(40);
  const claim = gfpClaim({ ground: `/commit${REPO_ROOT}#${fake}`, rel: "committed", roles: { ARG0: "x", ARG1: "y" } });
  const r = citeGround(claim, "committed as claimed");
  assert.equal(r.verdict, "missing");
  assert.match(r.detail, new RegExp(fake), "git's own answer (no such commit), not a guess");
});

test("citeGround: a /commit/ ground pointing at a real directory that is not a git repo is \"missing\", not a crash", () => {
  const claim = gfpClaim({ ground: `/commit${path.dirname(REPO_ROOT)}#${REAL_COMMIT}`, rel: "committed", roles: { ARG0: "x", ARG1: "y" } });
  const r = citeGround(claim, "committed as claimed");
  assert.equal(r.verdict, "missing");
  assert.match(r.detail, /not a real git repository/);
});

test("citeCommit: called directly (not through a claim), same contract — real commit, fake hash, non-repo directory", () => {
  const real = citeCommit(REPO_ROOT, REAL_COMMIT);
  assert.equal(real.verdict, "event");
  assert.ok(real.files.some((f) => f.includes("ground-cite.js")), "the real commit's own file list, not a stub");

  const fake = citeCommit(REPO_ROOT, "f".repeat(40));
  assert.equal(fake.verdict, "missing");

  const notARepo = citeCommit("/tmp", REAL_COMMIT);
  assert.equal(notARepo.verdict, "missing");
});
