import test from "node:test";
import assert from "node:assert/strict";
import { projectIdentityGroupoid, identityProofPath, identityGeneratorImpact, identityGeneratorRetraction } from "../kernel/identity-groupoid.js";
import { projectIdentityQuotient } from "../kernel/identity-quotient.js";
import { lensChannel, composeLensChannels, lensBlackwellWitness, fieldCarrier, fieldSection, networkChainInvariants, prequentialParadigmAdmission, conditionalResponseLaw, terrainNativeFoldRevisionDistance } from "../kernel/terrain-completion.js";
import { eoOperation, deltaFold } from "../kernel/fold.js";
import { deriveSurprise } from "../kernel/dynamics.js";

const occ = (id) => Object.freeze({ schema: "EOReferentOccurrence@1", id });
const ref = (id, occurrenceRefs = []) => Object.freeze({ schema: "EOReferent@1", id, occurrenceRefs: Object.freeze(occurrenceRefs), supportRefs: Object.freeze([]) });

test("Entity retraction is path-dependent: redundant proof survives, bridge proof splits", () => {
  const a = occ("o:a"), b = occ("o:b"), c = occ("o:c"), r = ref("ref:r");
  const ab = Object.freeze({ schema: "EODiscourseIdentityLink@1", id: "g:ab", leftOccurrence: a.id, rightOccurrence: b.id, standing: "supported" });
  const ac = Object.freeze({ schema: "EODiscourseIdentityLink@1", id: "g:ac", leftOccurrence: a.id, rightOccurrence: c.id, standing: "supported" });
  const cb = Object.freeze({ schema: "EODiscourseIdentityLink@1", id: "g:cb", leftOccurrence: c.id, rightOccurrence: b.id, standing: "supported" });
  const br = Object.freeze({ schema: "EOPronounBinding@1", id: "g:br", occurrence: b.id, referent: r.id, standing: "provisional" });
  const groupoid = projectIdentityGroupoid([a,b,c,r,ab,ac,cb,br]);
  const redundant = identityGeneratorImpact(groupoid, "g:ab");
  assert.equal(redundant.splitsComponent, false);
  assert.ok(redundant.survivingEndpointProof);
  const bridge = identityGeneratorImpact(groupoid, "g:br");
  assert.equal(bridge.splitsComponent, true);

  const retraction = identityGeneratorRetraction({ generatorRef: "g:ab", witness: "w:attack" });
  const after = projectIdentityGroupoid([a,b,c,r,ab,ac,cb,br,retraction]);
  assert.equal(identityProofPath(after, a.id, b.id)?.steps.length, 2);
  assert.equal(after.diagnostics.retractedGeneratorCount, 1);
  const quotient = projectIdentityQuotient([a,b,c,r,ab,ac,cb,br,retraction]);
  assert.equal(quotient.classes.length, 1);
});

test("Lens is a composable stochastic channel and Blackwell order requires an explicit garbling witness", () => {
  const identity = lensChannel({ id: "L:id", domainRefs: ["s0","s1"], codomainRefs: ["x0","x1"], mapping: { s0:{x0:1,x1:0}, s1:{x0:0,x1:1} }, giver: "fixture" });
  const garble = lensChannel({ id: "L:g", domainRefs: ["x0","x1"], codomainRefs: ["y0","y1"], mapping: { x0:{y0:.75,y1:.25}, x1:{y0:.25,y1:.75} }, giver: "fixture" });
  const degraded = composeLensChannels(identity, garble, { id: "L:d" });
  assert.equal(degraded.stochastic, true);
  assert.equal(lensBlackwellWitness(identity, degraded, garble).dominates, true);
});

test("Field coherence is local-to-global compatibility, not link cardinality", () => {
  const carrier = fieldCarrier({ id: "C", regions: ["whole","part"], restrictions: [{ from:"whole", to:"part", restrict: (x) => x.slice(0,1) }] });
  assert.equal(fieldSection(carrier, { whole:[1,2], part:[1] }).coherent, true);
  assert.equal(fieldSection(carrier, { whole:[1,2], part:[2] }).coherent, false);
});

test("Network exposes chain invariants and optional boundary flux", () => {
  const inv = networkChainInvariants({ vertices:["a","b","c"], edges:[{id:"e1",vertices:["a","b"]},{id:"e2",vertices:["b","c"]},{id:"e3",vertices:["c","a"]}], boundary: (e) => e.id === "e1" ? 1 : 0 });
  assert.equal(inv.beta0, 1);
  assert.equal(inv.beta1, 1);
  assert.equal(inv.boundaryFlux, 1);
});

test("Paradigm admission is prospective predictive gain, not retrospective recurrence", () => {
  const events = [{id:"past",p:.5},{id:"f1",p:.9},{id:"f2",p:.8}];
  const result = prequentialParadigmAdmission({ id:"P", formationIndex:1, events, model:(e)=>e.p, baseline:()=>.5, minGainBits:.5 });
  assert.equal(result.prospectiveEvents, 2);
  assert.equal(result.admitted, true);
  assert.ok(result.gainBits > 0);
});

test("Kind response laws condition on context and intervention/action", () => {
  const law = conditionalResponseLaw([{context:"wet",action:"heat",outcome:"steam"},{context:"wet",action:"heat",outcome:"steam"},{context:"dry",action:"heat",outcome:"hot"}]);
  assert.equal(law.laws['"wet"|"heat"']['"steam"'], 1);
  assert.equal(Object.keys(law.laws).length, 2);
});

test("Surprise carries terrain-native consequential Fold revision distance", () => {
  const small = deltaFold([eoOperation({ op:"INS", grain:"Figure" })]);
  const consequential = deltaFold([eoOperation({ op:"REC", grain:"Pattern", consequence:{kind:"reframe"} })]);
  assert.ok(terrainNativeFoldRevisionDistance(consequential).total > terrainNativeFoldRevisionDistance(small).total);
  assert.equal(deriveSurprise(consequential).revisionDistance.schema, "EOFoldRevisionDistance@1");
});
