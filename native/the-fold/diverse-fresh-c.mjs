// ═══ LOVELACE · TEACH IT TO FISH ═══ THE UNTOUCHED SET (set C). Written AFTER the cheap species were last edited, and NOT edited afterwards: whatever it shows is the generality of the species as they stand. Set A is what they
// were fitted to; set B was used while fixing them (so it no longer counts); this one was not. Contracts are in set B's form. Two tasks are written to sit outside what the species can do, so the result also says where they stop.
//
//   bookFine     loan dates -> title, daysLate (0 when returned on time), fine, status                       a date card, a clamp (OUTSIDE), a rate, a two-way decision
//   scaleRecipe  a recipe and a target -> name, factor, flour, sugar                                         copy, a ratio, a field built on a field
//   shipQuote    a parcel -> id, fee, tier                                                                   copy, a product, three tiers read off the words
//   gradeRow     a student's scores -> student, best, average (0 for none), passed                           OUTSIDE: the best of a list of numbers; a mean of a list of numbers
//   parkingBill  minutes parked -> plate, hours (rounded UP), charge                                         copy, ceil, a rate
//   contactCard  a contact -> display ("Last, First"), email                                                 template with a literal, copy
import { clone, run, shownOf } from "./diverse-tasks.mjs";

const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const dayNo = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
const mk = (name, params, doc, returns, notes, data, wantOf, tol) => ({
  name, kind: "leaf", params, paramDoc: params.join(", "), doc, returns, notes,
  shown: shownOf(params, data[0]), sampleJson: data[0][0],
  example: { args: "", input: () => clone(data[0]), output: () => wantOf(...data[0]) },
  runs: data.map((d, i) => run(i === 0 ? "the shown one" : `case ${i + 1}`, d, wantOf, tol)),
});

const fineWant = (l) => { const daysLate = Math.max(0, dayNo(l.returned) - dayNo(l.due)); return { title: l.title, daysLate, fine: r2(daysLate * 0.25), status: daysLate > 0 ? "overdue" : "on time" }; };
const LOANS = [[{ title: "Dune", due: "2026-09-20", returned: "2026-10-01" }], [{ title: "Emma", due: "2026-10-05", returned: "2026-10-02" }], [{ title: "Ulysses", due: "2028-02-27", returned: "2028-03-01" }], [{ title: "Persuasion", due: "2026-12-31", returned: "2027-01-03" }], [{ title: "Walden", due: "2026-10-10", returned: "2026-10-10" }]];
export const bookFineContract = mk("bookFine", ["loan"],
  "Work out the fine on one library loan.",
  "an object { title, daysLate, fine, status }\n  title = the book's title, daysLate = how many days after the due date the book came back (0 when it came back on or before the due date), fine = daysLate times 0.25, rounded to 2 decimals, status = \"overdue\" when daysLate is more than 0, else \"on time\"",
  "Dates are ISO \"YYYY-MM-DD\". Count calendar days (months and leap years included).", LOANS, fineWant, { fine: 0.0051 });

const recipeWant = (r) => { const factor = r2(r.target / r.servings); return { name: r.name, factor, flour: Math.round(r.flour_g * factor), sugar: Math.round(r.sugar_g * factor) }; };
const RECIPES = [[{ name: "Shortbread", servings: 8, target: 12, flour_g: 250, sugar_g: 100 }], [{ name: "Scones", servings: 6, target: 15, flour_g: 300, sugar_g: 45 }], [{ name: "Brownies", servings: 12, target: 9, flour_g: 180, sugar_g: 220 }], [{ name: "Waffles", servings: 4, target: 10, flour_g: 200, sugar_g: 30 }], [{ name: "Cake", servings: 10, target: 10, flour_g: 400, sugar_g: 300 }]];
export const scaleRecipeContract = mk("scaleRecipe", ["r"],
  "Scale one recipe to a number of servings.",
  "an object { name, factor, flour, sugar }\n  name = the recipe's name, factor = target divided by servings, rounded to 2 decimals, flour = flour_g times factor rounded to a whole number, sugar = sugar_g times factor rounded to a whole number",
  "", RECIPES, recipeWant);

const shipWant = (p) => ({ id: p.id, fee: r2(p.weight_kg * p.rate_per_kg), tier: p.weight_kg >= 20 ? "heavy" : p.weight_kg < 2 ? "light" : "standard" });
const PARCELS = [[{ id: "P-17", weight_kg: 1.2, rate_per_kg: 4.5 }], [{ id: "P-18", weight_kg: 25, rate_per_kg: 2.1 }], [{ id: "P-19", weight_kg: 7.5, rate_per_kg: 3.2 }], [{ id: "P-20", weight_kg: 20, rate_per_kg: 1.95 }], [{ id: "P-21", weight_kg: 1.99, rate_per_kg: 6 }]];
export const shipQuoteContract = mk("shipQuote", ["p"],
  "Quote one parcel.",
  "an object { id, fee, tier }\n  id = the parcel's id, fee = weight_kg times rate_per_kg rounded to 2 decimals, tier = \"heavy\" when weight_kg is 20 or more, else \"light\" when weight_kg is less than 2, else \"standard\"",
  "", PARCELS, shipWant, { fee: 0.0051 });

const gradeWant = (s) => { const n = s.scores.length, avg = n ? r1(s.scores.reduce((a, b) => a + b, 0) / n) : 0; return { student: s.student, best: n ? Math.max(...s.scores) : 0, average: avg, passed: avg >= 60 ? "yes" : "no" }; };
const STUDENTS = [[{ student: "Ines", scores: [72, 88, 95] }], [{ student: "Jo", scores: [40, 55] }], [{ student: "Kai", scores: [] }], [{ student: "Lou", scores: [60, 60, 61, 59] }], [{ student: "Max", scores: [100] }]];
export const gradeRowContract = mk("gradeRow", ["s"],
  "Summarise one student's scores.",
  "an object { student, best, average, passed }\n  student = the student's name, best = the highest score (0 when there are none), average = the mean score rounded to one decimal (0 when there are none), passed = \"yes\" when average is 60 or more, else \"no\"",
  "", STUDENTS, gradeWant, { average: 0.051 });

const parkWant = (v) => { const hours = Math.ceil(v.minutes / 60); return { plate: v.plate, hours, charge: r2(hours * v.rate_per_hour) }; };
const CARS = [[{ plate: "KX-204", minutes: 95, rate_per_hour: 2.5 }], [{ plate: "BT-771", minutes: 60, rate_per_hour: 3 }], [{ plate: "ZZ-009", minutes: 245, rate_per_hour: 1.75 }], [{ plate: "AM-310", minutes: 1, rate_per_hour: 4 }], [{ plate: "QQ-555", minutes: 180, rate_per_hour: 2.2 }]];
export const parkingBillContract = mk("parkingBill", ["v"],
  "Bill one parked vehicle.",
  "an object { plate, hours, charge }\n  plate = the number plate, hours = the minutes parked divided by 60, rounded UP to a whole number of hours, charge = hours times rate_per_hour, rounded to 2 decimals",
  "", CARS, parkWant, { charge: 0.0051 });

const contactWant = (c) => ({ display: `${c.last}, ${c.first}`, email: c.email });
const CONTACTS = [[{ first: "Ada", last: "Lovelace", email: "ada@analytical.org" }], [{ first: "Ken", last: "Thompson", email: "ken@bell-labs.com" }], [{ first: "Barbara", last: "Liskov", email: "b.liskov@mit.edu" }], [{ first: "Tim", last: "Berners-Lee", email: "tim@w3.org" }], [{ first: "Anita", last: "Borg", email: "anita@systers.org" }]];
export const contactCardContract = mk("contactCard", ["c"],
  "Turn one contact into a card.",
  "an object { display, email }\n  display = the last name, a comma and a space, then the first name, like \"Lovelace, Ada\", email = the email address as given",
  "", CONTACTS, contactWant);

export const FRESH_C = [
  { contract: bookFineContract, role: "fresh" }, { contract: scaleRecipeContract, role: "fresh" }, { contract: shipQuoteContract, role: "fresh" },
  { contract: gradeRowContract, role: "outside" }, { contract: parkingBillContract, role: "fresh" }, { contract: contactCardContract, role: "fresh" },
];
