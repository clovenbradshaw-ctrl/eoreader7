// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 7 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-compose.mjs — the COMPUTED structure around the drawn leaves.
//
// A leaf is one small pure function of ONE row (a place, an hourly item, a station, a table
// cell); what it is drawn from is a real recorded row and what it is tested against is an
// independent reading of the same bytes. Everything that walks, filters, sorts, slices or
// orders rows is here — written once, by hand, tested — so a model is asked only for the part
// that is irreducibly "read this row", never for a traversal it can get subtly wrong.
//
// Each entry turns a set of leaf functions into the full unit the server calls. The full unit
// is then held to the WHOLE-response oracle (app-weather-fuel.mjs's contracts): a composition
// bug or a leaf that only works on the rows it was shown fails there, not in production.
// This module is pure and dependency-free: the assembler copies it into the app bundle as-is.

export const COMPOSE = {
  parseGeocode: ({ parsePlace }) => (json) => (Array.isArray(json?.results) ? json.results.map((r) => parsePlace(r)) : []),

  parseWttr: ({ wttrNow, wttrHour }) => (json, units) => {
    const days = Array.isArray(json?.weather) ? json.weather : [];
    const current = json?.current_condition?.[0];
    if (!current) throw new Error("the response has no current_condition");
    const astro = days[0]?.astronomy?.[0] ?? {};
    return { now: wttrNow(current, astro, units), hours: days.flatMap((d) => (Array.isArray(d.hourly) ? d.hourly : []).map((h) => wttrHour(d.date, h, units))), clock: "local" };
  },

  parseMetNo: ({ metnoNow, metnoHour }) => (json, units) => {
    const series = json?.properties?.timeseries;
    if (!Array.isArray(series) || !series.length) throw new Error("the response has no timeseries");
    return { now: metnoNow(series[0], units), hours: series.slice(0, 24).map((e) => metnoHour(e, units)), clock: "utc" };
  },

  parseStations: ({ parseStation }) => (json, lat, lon) => (Array.isArray(json?.elements) ? json.elements : []).map((e) => parseStation(e, lat, lon)).filter(Boolean).sort((a, b) => a.km - b.km),

  parseNominatim: ({ nominatimStation }) => (json, lat, lon) => (Array.isArray(json) ? json : []).map((e) => nominatimStation(e, lat, lon)).filter(Boolean).sort((a, b) => a.km - b.km),

  parseEia: ({ newestWeek, priceAfter }) => (html) => ({
    week: newestWeek(html),
    prices: [["Regular", "Regular"], ["Midgrade", "Midgrade"], ["Premium", "Premium"], ["Diesel", "Ultra Low Sulfur (15 ppm and Under)"]].map(([grade, label]) => ({ grade, price: priceAfter(html, label) })),
  }),
};

/** which leaves each full unit is built from */
export const LEAVES_OF = {
  parseGeocode: ["parsePlace"],
  parseWttr: ["wttrNow", "wttrHour"],
  parseMetNo: ["metnoNow", "metnoHour"],
  parseStations: ["parseStation"],
  parseNominatim: ["nominatimStation"],
  parseEia: ["newestWeek", "priceAfter"],
};
export const FULL_UNITS = Object.keys(COMPOSE);
export const LEAF_NAMES = [...new Set(Object.values(LEAVES_OF).flat())];
