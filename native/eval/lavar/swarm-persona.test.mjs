// swarm-persona.test.mjs — the device's character, falsified. The persona is
// DERIVED from the swarm's own history (stance-typed births + kept
// breakthroughs), never declared: a device that keeps SEG work reads as
// Dissecting; one that keeps rereads reads as Tending; different kept sets
// are different characters.
import test from "node:test";
import assert from "node:assert/strict";
import { stanceProfile, terrainEmphasis, persona } from "./swarm-persona.mjs";

const birth = (stance, i = 0) => ({ born: 1, stance, genotype: `g${i}`, fate: "alive" });
const fate = (stance, i = 0, f = "refused") => ({ born: 1, stance, genotype: `g${i}`, fate: f, __fate: true });

test("a device that keeps SEG work is Dissecting (Differentiate); one that keeps rereads is Tending (Relate)", () => {
  const analytic = stanceProfile({
    births: [birth("Dissecting", 1), birth("Dissecting", 2), birth("Binding", 3)],
    fates: [fate("Dissecting", 1, "kept"), fate("Dissecting", 2, "refused"), fate("Binding", 3, "refused")],
  });
  assert.equal(analytic.dominantStance, "Dissecting");
  assert.equal(analytic.dominantMode, "Differentiate");
  const nurturing = stanceProfile({
    births: [birth("Tending", 1), birth("Tending", 2), birth("Dissecting", 3)],
    fates: [fate("Tending", 1, "kept"), fate("Tending", 2, "kept"), fate("Dissecting", 3, "refused")],
  });
  assert.equal(nurturing.dominantStance, "Tending");
  assert.equal(nurturing.dominantMode, "Relate");
});

test("keptRate is per stance: what the device KEEPS defines its character, not what it tries", () => {
  const p = stanceProfile({
    births: [birth("Making", 1), birth("Making", 2), birth("Making", 3), birth("Making", 4)],
    fates: [fate("Making", 1, "kept"), fate("Making", 2, "refused"), fate("Making", 3, "refused"), fate("Making", 4, "refused")],
  });
  assert.equal(p.stances.Making.tried, 4);
  assert.equal(p.stances.Making.kept, 1);
  assert.equal(p.stances.Making.keptRate, 0.25);
  assert.equal(p.dominantStance, "Making");
});

test("terrainEmphasis is a distribution over the terrains the winners occupy", () => {
  const entries = [
    { terrain: ["Link"] }, { terrain: ["Link"] }, { terrain: ["Field"] },
  ];
  const t = terrainEmphasis(entries);
  assert.equal(t.Link, 2 / 3);
  assert.equal(t.Field, 1 / 3);
});

test("persona is derived end-to-end: stance character + terrain emphasis + owned things", () => {
  const p = persona({
    device: "dev:test",
    genealogy: {
      births: [birth("Dissecting", 1), birth("Making", 2)],
      fates: [fate("Dissecting", 1, "kept"), fate("Making", 2, "refused")],
    },
    entries: [
      { schema: "SwarmBreakthrough@1", at: "2026-09-17", echo: "r111", shadow: { pointer: "/a-ch1" }, variant: "nps", mhc: 7, terrain: ["Link"], shape: 0.574, mass: 0.5 },
      { schema: "SwarmBreakthrough@1", at: "2026-09-17", echo: "r111", shadow: { pointer: "/b-ch1" }, variant: "nps", mhc: 7, terrain: ["Link"], shape: 0.641, mass: 0.5 },
    ],
  });
  assert.equal(p.schema, "DevicePersona@1");
  assert.equal(p.device, "dev:test");
  assert.equal(p.character.dominantStance, "Dissecting");
  assert.equal(p.ownsThings.length, 1, "the corroborated nps is one owned thing");
  assert.equal(p.ownsThings[0].variant, "nps");
});