// ═══ LOVELACE · TEACH IT TO FISH ═══ WHAT THE SYSTEM CAN ACTUALLY BUILD AN APP FOR.
// STEERED, said once: a pack is a person's hand — its contracts, oracles, sources and comps (ledger rows 2-7). Wiring it behind the app door makes the build REACHABLE from a prompt; it does not make it learned.
// What the door adds on top is honesty: a need no pack grounds is a typed gap quoted from the prompt, never a page of invented content.
export const PACKS = Object.freeze([
  { id: "weather-fuel", title: "Weather & Fuel", places: ["London", "Paris"],
    needs: {
      weather: ["weather", "temperature", "temperatures", "forecast", "forecasts", "rain", "wind", "conditions", "climate"],
      fuel: ["gas", "gasoline", "fuel", "petrol", "diesel"],
    } },
]);
export const packById = (id) => PACKS.find((p) => p.id === id) ?? null;
