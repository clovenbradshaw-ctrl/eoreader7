// ═══ LOVELACE · TEACH IT TO FISH ═══ THE UNTOUCHED SET (set D). Written AFTER the branch / optional / coalesce / joinPresent / null species were built on the app's own leaves, and NOT edited after its first run: whatever it
// shows is how far those species reach on shapes they were not looked at on. Set A is what the first species were fitted to, B was used while fixing them, C was untouched for the first six; this one is untouched for the
// next four. Contracts are in set B's form. One task is written to sit OUTSIDE (a substring, a pad), so the result also says where they stop.
//
//   luggageTag     a bag and a unit system -> id, who (nickname, else first name), weight (kg or lb by `units`), lane (the stops that exist, joined by " > "), note (always null)
//   thermostatRow  a reading and a scale (C, F or K) -> room, temp, setpoint        a three-way branch on a string parameter
//   addressLabel   a contact -> heading (company, else name), line1 (street and unit that exist), city, postal (or null)
//   ticketCode     OUTSIDE: a code built from slices of two strings and a padded number
import { clone, run, shownOf } from "./diverse-tasks.mjs";

const r1 = (x) => Math.round(x * 10) / 10;
const mk = (name, params, doc, returns, notes, data, wantOf, tol) => ({
  name, kind: "leaf", params, paramDoc: params.join(", "), doc, returns, notes,
  shown: shownOf(params, data[0]), sampleJson: data[0][0],
  example: { args: "", input: () => clone(data[0]), output: () => wantOf(...data[0]) },
  runs: data.map((d, i) => run(i === 0 ? "the shown one" : `case ${i + 1}`, d, wantOf, tol)),
});

const tagWant = (b, units) => ({ id: b.id, who: b.owner.nickname || b.owner.first, weight: units === "imperial" ? Math.round(b.weight_kg * 2.20462) : Math.round(b.weight_kg), lane: [b.route.from, b.route.via, b.route.to].filter(Boolean).join(" > "), note: null });
const BAGS = [
  [{ id: "B-101", owner: { first: "Marta", nickname: "Mo" }, weight_kg: 18.4, route: { from: "OSL", via: "AMS", to: "JFK" } }, "metric"],
  [{ id: "B-102", owner: { first: "Ravi" }, weight_kg: 23.1, route: { from: "BOM", to: "LHR" } }, "imperial"],
  [{ id: "B-103", owner: { first: "Ingrid", nickname: "Inga" }, weight_kg: 9.7, route: { from: "ARN", via: "CPH", to: "SFO" } }, "imperial"],
  [{ id: "B-104", owner: { first: "Tomas" }, weight_kg: 30.2, route: { from: "PRG", via: "FRA", to: "DEN" } }, "metric"],
  [{ id: "B-105", owner: { first: "Aiko", nickname: "Ai" }, weight_kg: 12.5, route: { from: "NRT", to: "SIN" } }, "metric"],
  [{ id: "B-106", owner: { first: "Lukas" }, weight_kg: 16.8, route: { from: "VIE", to: "ATH" } }, "imperial"],
  [{ id: "B-107", owner: { first: "Noor", nickname: "Nu" }, weight_kg: 21.0, route: { from: "DXB", via: "IST", to: "MAD" } }, "metric"],
];
export const luggageTagContract = mk("luggageTag", ["bag", "units"],
  "Make the tag for one checked bag.",
  "an object { id, who, weight, lane, note }\n  id = the bag's id, who = the owner's nickname if there is one, else the owner's first name, weight = the bag's weight rounded to a whole number — kilograms when units is \"metric\" (weight_kg as it is), pounds when units is \"imperial\" (weight_kg times 2.20462), lane = the stops of the route that exist, from the first to the last, joined by \" > \", note = null (this tag never carries a note)",
  "", BAGS, tagWant);

const scaleName = { C: "C", F: "F", K: "K" };
const degrees = (c, s) => (s === "F" ? r1(c * 9 / 5 + 32) : s === "K" ? r1(c + 273.15) : r1(c));
const thermoWant = (r, scale) => ({ room: r.room, temp: degrees(r.temp_c, scale), setpoint: degrees(r.set_c, scale) });
const READINGS = [
  [{ room: "Lab", temp_c: 21.4, set_c: 22 }, "C"], [{ room: "Hall", temp_c: 18.9, set_c: 20 }, "F"], [{ room: "Vault", temp_c: 4.2, set_c: 5 }, "K"],
  [{ room: "Office", temp_c: 23.7, set_c: 22.5 }, "F"], [{ room: "Kitchen", temp_c: 26.1, set_c: 24 }, "C"], [{ room: "Attic", temp_c: 31.0, set_c: 25 }, "K"],
  [{ room: "Cellar", temp_c: 12.3, set_c: 14 }, "C"], [{ room: "Studio", temp_c: 19.5, set_c: 21 }, "F"], [{ room: "Garage", temp_c: 8.8, set_c: 10 }, "K"],
];
export const thermostatRowContract = mk("thermostatRow", ["r", "scale"],
  "Show one thermostat reading in a temperature scale.",
  "an object { room, temp, setpoint }\n  room = the room's name, temp = temp_c in the scale, setpoint = set_c in the scale; both rounded to one decimal",
  "scale is \"C\" (Celsius, as given), \"F\" (Fahrenheit = C × 9/5 + 32) or \"K\" (Kelvin = C + 273.15).", READINGS, thermoWant, { temp: 0.051, setpoint: 0.051 });

const labelWant = (c) => ({ heading: c.company || c.name, line1: [c.street, c.unit].filter(Boolean).join(" #"), city: c.city, postal: c.postal ?? null });
const CONTACTS = [
  [{ name: "Dana Whit", company: "Whit & Sons", street: "12 Oak Lane", unit: "4B", city: "Reno", postal: "89501" }],
  [{ name: "Eli Park", street: "9 Pine Road", city: "Boise", postal: "83702" }],
  [{ name: "Fay Moore", company: "Moore Tools", street: "300 Elm Street", city: "Tulsa" }],
  [{ name: "Gus Ortiz", street: "77 Birch Way", unit: "2", city: "Tampa", postal: "33602" }],
  [{ name: "Hana Ito", company: "Ito Design", city: "Austin", postal: "73301" }],
  [{ name: "Ivo Rask", company: "Rask AS", street: "5 Fjord Gate", unit: "7", city: "Tromso" }],
];
export const addressLabelContract = mk("addressLabel", ["c"],
  "Turn one contact into a mailing label.",
  "an object { heading, line1, city, postal }\n  heading = the contact's company if it has one, else its name; line1 = the street and the unit, whichever exist, joined by \" #\" (empty when neither exists); city = the city; postal = the postal code, or null if there is none",
  "", CONTACTS, labelWant);

const codeWant = (o) => ({ code: `${o.city.slice(0, 3).toUpperCase()}-${String(o.seq).padStart(5, "0")}`, desk: o.desk });
const ORDERS = [[{ city: "Lisbon", seq: 42, desk: "A" }], [{ city: "Oslo", seq: 7, desk: "B" }], [{ city: "Madrid", seq: 1203, desk: "A" }], [{ city: "Rome", seq: 88, desk: "C" }], [{ city: "Vienna", seq: 5, desk: "B" }]];
export const ticketCodeContract = mk("ticketCode", ["o"],
  "Make the ticket code for one order.",
  "an object { code, desk }\n  code = the first three letters of the city in capitals, a hyphen, then seq as five digits with leading zeros; desk = the desk letter",
  "", ORDERS, codeWant);
void scaleName;

export const FRESH_D = [
  { contract: luggageTagContract, role: "fresh" }, { contract: thermostatRowContract, role: "fresh" }, { contract: addressLabelContract, role: "fresh" }, { contract: ticketCodeContract, role: "outside" },
];
