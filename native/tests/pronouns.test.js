import test from "node:test";
import assert from "node:assert/strict";
import { resolvePronouns, normalizePronounClass, registerSummary } from "../adapters/text/pronouns.js";

const mk = (lines) => lines.map((text, i) => ({ text, order: i, offset: i * 1000 }));
const filler = (n) => `frame ${n} the ordinary business of the afternoon continued much as before with letters and accounts and quiet errands`;
const OPTS = { minActivation: 0.05, minMargin: 0.2 };

const buildTwoCharacterCorpus = () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(3);
  lines.push("Elena knelt in the garden and pressed her palms into the warm garden soil.");
  pushFiller(3);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  pushFiller(3);
  lines.push("Elena trimmed the garden roses growing along the garden wall in the soil.");
  pushFiller(3);
  lines.push("Marcus sanded the workshop timber until the grain shone in the workshop light.");
  pushFiller(3);
  lines.push("Elena watered the garden roses again, kneeling in the soft garden soil.");
  pushFiller(3);
  lines.push("Marcus planed another length of workshop timber, the grain pale in the light.");
  pushFiller(6);
  lines.push("The garden soil there was rich, and she loved working the garden roses after rain.");
  pushFiller(3);
  lines.push("Even in the evening chill he kept sanding the workshop timber, patient with the grain.");
  return lines;
};

const SURFACES = new Map([["Elena", "ref:elena"], ["Marcus", "ref:marcus"]]);

test("pronoun operating point is declared, never defaulted", () => {
  assert.throws(() => resolvePronouns([], new Map()), /minActivation/);
  assert.throws(() => resolvePronouns([], new Map(), { minActivation: 0 }), /minMargin/);
});

test("pronoun-only scenes bind by causal thematic recall", () => {
  const { bindings, gaps } = resolvePronouns(mk(buildTwoCharacterCorpus()), SURFACES, OPTS);
  const she = bindings.find((x) => x.pronoun === "she");
  const he = bindings.find((x) => x.pronoun === "he");
  assert.equal(she?.referentId, "ref:elena");
  assert.equal(he?.referentId, "ref:marcus");
  assert.equal(gaps.length, 0);
});

test("activation beats recency", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(3);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  pushFiller(3);
  lines.push("Marcus sanded the workshop timber until the grain shone in the workshop light.");
  pushFiller(3);
  lines.push("Marcus planed another length of workshop timber, the grain pale in the light.");
  pushFiller(6);
  lines.push("Thomas coiled the harbor rope and watched the tide slide past the pier.");
  pushFiller(2);
  lines.push("Even in the evening chill he kept sanding the workshop timber, patient with the grain.");
  const { bindings } = resolvePronouns(mk(lines), new Map([["Marcus", "ref:marcus"], ["Thomas", "ref:thomas"]]), OPTS);
  assert.equal(bindings.find((x) => x.pronoun === "he")?.referentId, "ref:marcus");
});

test("unrelated pronoun material is refused rather than guessed", () => {
  const lines = buildTwoCharacterCorpus();
  lines[lines.length - 1] = "The distant bell rang twice and he wondered about the price of bread in the market square.";
  const { bindings, gaps } = resolvePronouns(mk(lines), SURFACES, OPTS);
  assert.ok(!bindings.some((x) => x.pronoun === "he"));
  assert.ok(gaps.some((x) => x.pronoun === "he" && x.reason === "pronoun_no_candidate"));
});

test("gender is a hard filter", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(3);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  pushFiller(3);
  lines.push("Marcus sanded the workshop timber until the grain shone in the workshop light.");
  pushFiller(3);
  lines.push("Marcus planed another length of workshop timber, the grain pale in the light.");
  pushFiller(6);
  lines.push("Even in the evening chill she kept sanding the workshop timber, patient with the grain.");
  const { bindings, gaps } = resolvePronouns(mk(lines), new Map([["Marcus", "ref:marcus"]]), OPTS);
  assert.equal(bindings.length, 0);
  assert.ok(gaps.some((x) => x.reason === "pronoun_no_candidate"));
});

// ── the activation arm: binding on the reader's own decaying present ────
import { resolvePronounsByActivation } from "../adapters/text/pronouns.js";
import { createActivation } from "../kernel/activation.js";

const ACT_OPTS = { window: 8, minActivation: 0.2, minMargin: 0.2, createActivation };

test("activation arm: the gradient is injected from the kernel, and its numbers are declared", () => {
  assert.throws(() => resolvePronounsByActivation([], new Map(), { window: 8, minActivation: 0.2, minMargin: 0.2 }), /injected/);
  assert.throws(() => resolvePronounsByActivation([], new Map(), { window: 8, createActivation, minMargin: 0.2 }), /minActivation/);
});

test("activation arm: the most recently present compatible being binds — recency, not thematic echo", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  // Marcus is named, then fades through many frames; Thomas is named just
  // before the pronoun. The THEMATIC arm binds this to Marcus (its own
  // "activation beats recency" test above, on workshop vocabulary); the
  // ACTIVATION arm must bind Thomas — that difference in one dimension is
  // exactly what having two arms measures.
  pushFiller(2);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  pushFiller(6);
  lines.push("Thomas coiled the harbor rope and watched his tide gauge by the pier.");
  lines.push("Even in the evening chill he kept working, patient as ever.");
  const { bindings } = resolvePronounsByActivation(mk(lines), new Map([["Marcus", "ref:marcus"], ["Thomas", "ref:thomas"]]), ACT_OPTS);
  assert.equal(bindings.find((x) => x.pronoun === "he")?.referentId, "ref:thomas",
    "the being hot in the present wins on this arm — by design, not by accident");
});

test("activation arm: everyone faded refuses below the floor; two beings comparably hot refuse on margin", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(2);
  lines.push("Marcus stood at his workbench with the plane and his workshop timber.");
  pushFiller(30); // window 8: 0.875^30 ≈ 0.018 — well below the declared 0.2 floor
  lines.push("Then he returned at last.");
  const faded = resolvePronounsByActivation(mk(lines), new Map([["Marcus", "ref:marcus"]]), ACT_OPTS);
  assert.ok(faded.gaps.some((g) => g.reason === "pronoun_below_floor"), "a being thirty sentences gone is not 'present'");

  const lines2 = [];
  f = 0;
  lines2.push("Marcus carried his own toolbag across the yard toward the gate.");
  lines2.push("Daniel carried his own ladder across the same yard behind him.");
  lines2.push("Then he stopped at the gate.");
  const contested = resolvePronounsByActivation(mk(lines2), new Map([["Marcus", "ref:marcus"], ["Daniel", "ref:daniel"]]), ACT_OPTS);
  assert.ok(contested.gaps.some((g) => g.reason === "pronoun_no_margin"),
    "two beings named a sentence apart are comparably present — refused as ambiguous, the way a human reader would hesitate");
});

test("activation arm: gender stays a hard filter — a hot but wrong-gendered being never binds", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(2);
  lines.push("Elena knelt in the garden and pressed her palms into the garden soil.");
  pushFiller(4);
  lines.push("Marcus stood at his workbench with the plane and the workshop timber.");
  lines.push("She looked out across the garden wall toward the evening light.");
  const { bindings } = resolvePronounsByActivation(mk(lines), new Map([["Elena", "ref:elena"], ["Marcus", "ref:marcus"]]), ACT_OPTS);
  const she = bindings.find((x) => x.pronoun === "she");
  assert.equal(she?.referentId, "ref:elena", "Marcus is hotter but 'she' cannot bind him — gender evidence is a wall, not a weight");
});

// ── the co-present arbiter (choice b: activation arbitrates co-present) ──
// Generic prose defeats the thematic one-hop scorer — a quiet history frame
// like "His heart was heavy that year, yet he masked the weight of it"
// recalls nothing distinctive. In the adjudicated regime that used to file a
// bare `pronoun_no_candidate`. When the presence tracker is engaged, the
// reader's own decaying present picks the most recently present compatible
// co-present being instead.
const ARB_OPTS = {
  minActivation: 0.05,
  minMargin: 0.2,
  contestedMargin: 0.5,
  window: 8,
  activationFloor: 0.5,
  activationMargin: 0.2,
};

test("co-present arbiter: generic co-present frame binds to the most present compatible being", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(2);
  lines.push("William sat at the head of the long oak table, studying the ministers swiftly.");
  pushFiller(2);
  lines.push("William wrote to his chancellor almost every evening concerning the war.");
  pushFiller(2);
  lines.push("William studied the maps each morning before the council convened.");
  pushFiller(3);
  lines.push("His heart was heavy that year, yet he masked the weight of it.");
  const surfaces = new Map([["William", "ref:william"], ["His", "ref:william"]]);
  const { bindings, gaps } = resolvePronouns(mk(lines), surfaces, ARB_OPTS);
  const he = bindings.find((x) => x.pronoun === "he");
  assert.equal(he?.referentId, "ref:william", "the most present compatible co-present being binds when thematic recall is silent");
  assert.ok(!gaps.some((g) => g.pronoun === "he"), "no bare no-candidate gap where presence knew the answer");
});

test("co-present arbiter: gates are declared together, never half-declared", () => {
  assert.throws(() => resolvePronouns([], new Map(), { ...ARB_OPTS, window: undefined, activationFloor: 0.5 }), /declared together/);
  assert.throws(() => resolvePronouns([], new Map(), { ...ARB_OPTS, window: undefined, activationMargin: 0.2 }), /declared together/);
  assert.throws(() => resolvePronouns([], new Map(), { ...ARB_OPTS, activationFloor: undefined, activationMargin: 0.2 }), /activationFloor/);
  assert.throws(() => resolvePronouns([], new Map(), { ...ARB_OPTS, activationFloor: 0.5, activationMargin: undefined }), /activationMargin/);
  assert.throws(() => resolvePronouns([], new Map(), { ...ARB_OPTS, activationFloor: -1 }), /activationFloor/);
  assert.throws(() => resolvePronouns([], new Map(), { ...ARB_OPTS, activationMargin: 1.2 }), /activationMargin/);
});

test("co-present arbiter: a faded being refuses below the floor, never a guess", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(2);
  lines.push("William wrote to his chancellor concerning the war.");
  pushFiller(25); // window 8: 0.875^25 ≈ 0.036 — far below activationFloor 0.5
  lines.push("His heart was heavy that year, yet he masked the weight of it.");
  const { bindings, gaps } = resolvePronouns(mk(lines), new Map([["William", "ref:william"], ["His", "ref:william"]]), ARB_OPTS);
  assert.ok(!bindings.some((x) => x.pronoun === "he"), "a being long vanished is not bound by presence");
  assert.ok(gaps.some((g) => g.pronoun === "he" && g.reason === "pronoun_below_floor"), "refuses rather than guesses a faded antecedent");
});

// ── the derived register + the clean/soft gender contract (recover-from-misgendering) ──
// A register is the shape build-pronoun-prior.mjs writes: { forms: { token:
// { gender: {...}, number: {...} } }, provenance }. normalizePronounClass
// turns that into clean/soft per token: CLEAN (single well-attested gender
// + singular) keeps the hard gender veto; SOFT (genuine ambiguity, an
// all-"_" plural, or a below-floor attestation) vetoes nothing and lets the
// kernel's margin decide — the recover-from-misgendering contract. These
// cases pin both halves against synthetic distributions whose clean/soft
// outcome is derived, not hand-declared.
const REG = {
  forms: {
    her:  { gender: { Fem: 54 }, number: { Sing: 54 } },
    she:  { gender: { Fem: 55 }, number: { Sing: 55 } },
    neifar: { gender: { Masc: 3, Fem: 40 }, number: { Sing: 43 } }, // split -> soft, gender unknown
    ny:     { gender: { _: 58 }, number: { Plur: 58 } },           // plural, no gender -> soft "x"
    typo:   { gender: { Fem: 1 }, number: { Sing: 1 } },           // below MIN_OBSERVATIONS=2 -> soft
  },
  provenance: { source: "UD_Test-XYZ", tokens_read: 99 },
};

test("normalizePronounClass derives clean/soft from the register's own attestation", () => {
  const cls = normalizePronounClass(REG);
  assert.equal(cls.get("she").gender, "f", "clean feminine");
  assert.equal(cls.get("she").clean, true);
  assert.equal(cls.get("neifar").gender, "unknown", "genuinely split gender is unknown, not guessed");
  assert.equal(cls.get("neifar").clean, false, "split gender is soft — may not veto on its own unsureness");
  assert.equal(cls.get("ny").gender, "x", "plural with no marked gender reads as undetermined");
  assert.equal(cls.get("ny").clean, false);
  assert.equal(cls.get("typo").gender, "f", "its one attested gender is still reported");
  assert.equal(cls.get("typo").clean, false, "a single below-floor attestation is soft, never a veto");
  const { clean, soft } = registerSummary(cls);
  assert.ok(clean >= 2 && soft >= 3, `clean=${clean} soft=${soft} — both regimes present`);
});

const buildMisgenderCorpus = () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  // Elena named three times in the garden with "her" co-clause → her own
  // gender evidence reads f (the same shape the "gender is a hard filter"
  // test uses to make Marcus read m). The closing pronoun line names nobody;
  // thematic recall of the garden's recurring vocabulary does the binding.
  pushFiller(3);
  lines.push("Elena knelt in the garden and pressed her palms into the warm garden soil.");
  pushFiller(3);
  lines.push("Elena trimmed the garden roses growing along the garden wall in the soil.");
  pushFiller(3);
  lines.push("Elena watered the garden roses again, kneeling in the soft garden soil.");
  pushFiller(6);
  lines.push("neifar loved working the garden roses after rain, patient with the soil.");
  return lines;
};

test("a SOFT pronoun recovers from misgendering — the register's unsureness vetoes nothing", () => {
  // neifar carries a split Masc/Fem distribution: the treebank itself cannot
  // decide, so the resolver may not refuse a referent on neifar's gender.
  // Elena's own genderEvidence reads f; a hard-m neifar would veto her. Soft,
  // she binds — recovery of a genuinely-ambiguous form, not a guess.
  const { bindings, gaps } = resolvePronouns(mk(buildMisgenderCorpus()), new Map([["Elena", "ref:elena"]]), { ...OPTS, pronounClass: REG });
  assert.equal(bindings.find((x) => x.pronoun === "neifar")?.referentId, "ref:elena",
    "soft ambiguous pronoun binds the recalled referent instead of losing to nothing");
  assert.ok(!gaps.some((g) => g.pronoun === "neifar"), "no refusal where recovery was possible");
});

test("a CLEAN pronoun keeps the hard veto through the derived-path register", () => {
  // The identical scene, but neifar declared all-clean and hard-m via a
  // plain-object class (the shape a caller's own clean class has), with her
  // kept so Elena's own gender evidence still reads feminine. The clean-m
  // neifar vetoes that feminine-typed Elena outright — standing refusal.
  const { bindings, gaps } = resolvePronouns(mk(buildMisgenderCorpus()), new Map([["Elena", "ref:elena"]]), { ...OPTS, pronounClass: { neifar: "m", her: "f" } });
  assert.equal(bindings.length, 0, "a clean hard-m pronoun never binds a feminine evidence referent");
  assert.ok(gaps.some((g) => g.pronoun === "neifar" && g.reason === "pronoun_no_candidate"),
    "the clean form refuses where the soft form recovered — clean is a veto, soft is a preference");
});

test("activation arm: soft pronouns veto nothing; a present wrong-gender being binds", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(2);
  lines.push("Elena pressed her palms into the warm garden soil by the roses."); // Elena hot in present, ev.f
  lines.push("neifar tended the garden roses along the wall after the rain.");     // soft pronoun, nothing named here
  const { bindings } = resolvePronounsByActivation(mk(lines), new Map([["Elena", "ref:elena"]]), { ...ACT_OPTS, pronounClass: REG });
  assert.equal(bindings.find((x) => x.pronoun === "neifar")?.referentId, "ref:elena",
    "a soft, gender-unsure pronoun does not let its own unsureness stop a present binding");
});

