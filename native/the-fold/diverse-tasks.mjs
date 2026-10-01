// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// THE FALSIFICATION SET. The mechanisms built on weather and fuel-price leaves (the key-referent layer, the cards, the repair hints)
// were all measured on ONE domain, by the person who built them. A mechanism that only helps where it was made is a fit, not a finding
// (P71 generality gate). These seven tasks are from other domains, each with an oracle written independently of any model:
//
//   busTimes      unpadded clock times -> "HH:MM"            cards: padTime            key slip: stop_name
//   flightLeg     two airports -> route, km, miles            cards: haversineKm, roundTo  key slip: latitude/longitude
//   bedReport     a hospital ward -> free beds, % full, status   NO card (a whole-number round is Math.round)  key slips: ward_name, total_beds
//   orderTotal    "$1,234.50" strings x qty -> totals          cards: parseMoney, roundTo   (a control until 2026-10-01: both mouths failed on money strings, which is how the card was found)
//   topAuthors    commit list -> top three authors             NO card applies           NEGATIVE CONTROL
//   dueSoon       tasks + today -> titles due within 7 days    cards: daysBetween  (a control until 2026-10-01: both mouths failed on calendar days)
//   wordStats     text -> counts, longest, mean length         cards: splitWords, roundTo  (a control until 2026-10-01: a whitespace split keeps the punctuation)
//
// topAuthors is still a negative control; diverse-heldout.mjs holds tasks written AFTER the cards, for the cards that were found by failing here.
// The negative controls are the point of the falsification: if cards or hints made a task with NO relevant card worse (a dozen function
// names in the prompt are noise to a model that needs none of them), that is a cost the mechanism has to show it does not carry.
// Samples are small and inline; every run after the first is a row the prompt did not show, so a function that only reproduces the
// shown example fails the rest.
const clone = (v) => JSON.parse(JSON.stringify(v));
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;

/** deep compare of a function's answer against the wanted one: every failure names the path, what came back and what the data says; scalars carry the expected value for the runner to locate in the input */
function diff(got, want, path, out, tol = {}) {
  if (want !== null && typeof want === "object") {
    if (Array.isArray(want)) {
      if (!Array.isArray(got)) { out.push(`${path} must be an array, got ${got === null ? "null" : typeof got}`); return; }
      if (got.length !== want.length) { out.push(`${path}.length is ${got.length}, the recorded data says ${want.length}`); return; }
      want.forEach((w, i) => diff(got[i], w, `${path}[${i}]`, out, tol));
      return;
    }
    if (got === null || typeof got !== "object" || Array.isArray(got)) { out.push(`${path} must be an object, got ${Array.isArray(got) ? "array" : got === null ? "null" : typeof got}`); return; }
    for (const k of Object.keys(want)) diff(got[k], want[k], path ? `${path}.${k}` : k, out, tol);
    return;
  }
  const t = tol[path.replace(/\[\d+\]/g, "[]").split(".").pop()] ?? 0;
  const ok = typeof want === "number" ? typeof got === "number" && Number.isFinite(got) && Math.abs(got - want) <= t : got === want;
  if (!ok) out.push(`${path} is ${JSON.stringify(got)}, the recorded data says ${JSON.stringify(want)}${t ? ` (±${t})` : `\u0001${JSON.stringify(want)}`}`);
}
/** one run: its arguments are cloned fresh for every call (a unit may mutate what it is given), and its check closes over the same arguments */
const run = (label, argv, wantOf, tol) => ({ label, args: () => clone(argv), check: (o) => { const f = []; diff(o, wantOf(...clone(argv)), "", f, tol); return f; } });
const shownOf = (params, values) => params.map((p, i) => `${p} = ${JSON.stringify(values[i])}`).join("\n");

// ---- 1. busTimes ----
const padHHMM = (t) => { const s = String(t).padStart(4, "0"); return s.slice(0, 2) + ":" + s.slice(2); };
export const busWant = (stop) => ({ stop: stop.stop_name, route: stop.route, times: stop.times.map(padHHMM) });
const BUS = [
  { stop_name: "Elm & 5th", route: "14", times: [0, 330, 930, 1215, 2350] },
  { stop_name: "Harbor Terminal", route: "X2", times: ["615", "1800", "0", "45"] },
  { stop_name: "Old Mill Road", route: "7", times: [] },
  { stop_name: "Airport Gate B", route: "AIR", times: [5, "2359", 1000, "905"] },
];
export const busTimesContract = {
  name: "busTimes", kind: "leaf", params: ["stop"], paramDoc: "bus stop",
  doc: "Turn one bus stop's timetable into the stop, its route, and its departure times as HH:MM.",
  returns: "an object { stop, route, times }\n  stop = the stop's name, route = the route, times = every departure time as \"HH:MM\"",
  notes: "The source writes each time as a number or a string WITHOUT padding: 0 means 00:00, 330 means 03:30, \"45\" means 00:45, 1215 means 12:15. Keep the order.",
  shown: shownOf(["stop"], [BUS[0]]), sampleJson: BUS[0],
  example: { args: "", input: () => [clone(BUS[0])], output: () => busWant(BUS[0]) },
  runs: BUS.map((s, i) => run(i === 0 ? "the shown stop" : `stop ${i + 1}`, [s], busWant)),
};

// ---- 2. flightLeg ----
const AIRPORTS = {
  LHR: { iata: "LHR", city: "London", latitude: 51.47, longitude: -0.4543 }, JFK: { iata: "JFK", city: "New York", latitude: 40.6413, longitude: -73.7781 },
  CDG: { iata: "CDG", city: "Paris", latitude: 49.0097, longitude: 2.5479 }, NRT: { iata: "NRT", city: "Tokyo", latitude: 35.772, longitude: 140.3929 },
  SYD: { iata: "SYD", city: "Sydney", latitude: -33.9399, longitude: 151.1753 }, LAX: { iata: "LAX", city: "Los Angeles", latitude: 33.9416, longitude: -118.4085 },
  MEX: { iata: "MEX", city: "Mexico City", latitude: 19.4361, longitude: -99.0719 }, GRU: { iata: "GRU", city: "Sao Paulo", latitude: -23.4356, longitude: -46.4731 },
};
const hav = (a, b) => { const R = 6371, rad = (d) => (d * Math.PI) / 180, dl = rad(b.latitude - a.latitude), dn = rad(b.longitude - a.longitude); const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
export const flightWant = (a, b) => { const km = hav(a, b); return { route: `${a.iata} → ${b.iata}`, km: r1(km), miles: r1(km / 1.609344) }; };
const LEGS = [["LHR", "JFK"], ["CDG", "NRT"], ["SYD", "LAX"], ["MEX", "GRU"]];
export const flightLegContract = {
  name: "flightLeg", kind: "leaf", params: ["from", "to"], paramDoc: "two airports",
  doc: "Turn two airports into one flight leg: its route label and its length in kilometres and miles.",
  returns: "an object { route, km, miles }\n  route = the two IATA codes joined as \"AAA → BBB\" (with the arrow character →), km = the great-circle distance in kilometres rounded to one decimal, miles = that same distance in statute miles rounded to one decimal",
  notes: "Earth radius 6371 km. One mile is 1.609344 km. Round only at the end, from the unrounded distance.",
  shown: shownOf(["from", "to"], [AIRPORTS.LHR, AIRPORTS.JFK]), sampleJson: AIRPORTS.LHR,
  example: { args: "", input: () => [clone(AIRPORTS.LHR), clone(AIRPORTS.JFK)], output: () => flightWant(AIRPORTS.LHR, AIRPORTS.JFK) },
  runs: LEGS.map(([a, b], i) => run(i === 0 ? "the shown leg" : `${a} to ${b}`, [AIRPORTS[a], AIRPORTS[b]], flightWant, { km: 0.11, miles: 0.11 })),
};

// ---- 3. bedReport ----
export const bedWant = (w) => { const free = w.total_beds - w.occupied_beds, pct = Math.round((w.occupied_beds / w.total_beds) * 100); return { name: w.ward_name, free, percentFull: pct, status: free === 0 ? "full" : pct >= 85 ? "busy" : "ok" }; };
const WARDS = [
  { ward_name: "Cardiology", total_beds: 24, occupied_beds: 21, patients_waiting: 3 }, { ward_name: "ICU", total_beds: 12, occupied_beds: 12, patients_waiting: 5 },
  { ward_name: "Maternity", total_beds: 30, occupied_beds: 12, patients_waiting: 0 }, { ward_name: "Oncology", total_beds: 40, occupied_beds: 34, patients_waiting: 2 },
  { ward_name: "Emergency", total_beds: 18, occupied_beds: 9, patients_waiting: 11 },
];
export const bedReportContract = {
  name: "bedReport", kind: "leaf", params: ["ward"], paramDoc: "hospital ward",
  doc: "Turn one hospital ward's bed counts into a status line.",
  returns: "an object { name, free, percentFull, status }\n  name = the ward's name, free = beds not occupied, percentFull = occupied beds as a whole-number percentage of all beds, status = \"full\" when no bed is free, else \"busy\" when percentFull is 85 or more, else \"ok\"",
  notes: "percentFull is a NUMBER, rounded to the nearest whole percent (87.5 rounds to 88).",
  shown: shownOf(["ward"], [WARDS[0]]), sampleJson: WARDS[0],
  example: { args: "", input: () => [clone(WARDS[0])], output: () => bedWant(WARDS[0]) },
  runs: WARDS.map((w, i) => run(i === 0 ? "the shown ward" : `ward ${i + 1}`, [w], bedWant)),
};

// ---- 4. orderTotal (was a negative control until the record asked for parseMoney: both mouths failed on money strings) ----
const money = (v) => (typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, "")));
export const orderWant = (o) => { const sub = o.items.reduce((s, it) => s + money(it.price) * Number(it.qty), 0); const subtotal = r2(sub), tax = r2(sub * o.tax_rate); return { subtotal, tax, total: r2(subtotal + tax) }; };
const ORDERS = [
  { items: [{ sku: "A1", price: "$1,234.50", qty: "2" }, { sku: "B7", price: "12.5", qty: "3" }], tax_rate: 0.0825 },
  { items: [{ sku: "C3", price: "$0.99", qty: "10" }], tax_rate: 0.07 }, { items: [{ sku: "D9", price: 5, qty: 1 }, { sku: "E2", price: "$1,000", qty: "1" }], tax_rate: 0 },
  { items: [], tax_rate: 0.2 }, { items: [{ sku: "F4", price: "$19.99", qty: "3" }], tax_rate: 0.0625 },
];
export const orderTotalContract = {
  name: "orderTotal", kind: "leaf", params: ["order"], paramDoc: "shop order",
  doc: "Turn one shop order into its subtotal, tax and total.",
  returns: "an object { subtotal, tax, total }, each a number rounded to 2 decimals\n  subtotal = the sum of price × qty over the items, tax = subtotal × tax_rate, total = subtotal + tax",
  notes: "A price is a string like \"$1,234.50\" or \"12.5\", or a plain number; a qty may be a string. Round the subtotal and the tax to 2 decimals separately; total = the rounded subtotal plus the rounded tax.",
  shown: shownOf(["order"], [ORDERS[0]]), sampleJson: ORDERS[0],
  example: { args: "", input: () => [clone(ORDERS[0])], output: () => orderWant(ORDERS[0]) },
  runs: ORDERS.map((o, i) => run(i === 0 ? "the shown order" : `order ${i + 1}`, [o], orderWant, { subtotal: 0.0051, tax: 0.0051, total: 0.0051 })),
};

// ---- 5. topAuthors (negative control) ----
export const authorsWant = (commits) => { const n = new Map(); for (const c of commits) n.set(c.author.name, (n.get(c.author.name) ?? 0) + 1); return [...n].map(([name, commits]) => ({ name, commits })).sort((a, b) => b.commits - a.commits || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).slice(0, 3); };
const cm = (name, i) => ({ sha: `s${i}`, author: { name, email: `${name.toLowerCase().replace(/\W/g, "")}@example.org` }, message: `change ${i}` });
const LOGS = [
  ["Ada", "Grace", "Ada", "Linus", "Ada", "Grace", "Margaret", "Linus", "Ada"].map(cm), ["Zed", "Amy", "Zed", "Amy", "Bo"].map(cm),
  ["Solo", "Duo", "Solo"].map(cm), [], ["Kim", "Lee", "Kim", "Lee", "Kim", "Lee", "Max", "Max", "Max"].map(cm),
];
export const topAuthorsContract = {
  name: "topAuthors", kind: "leaf", params: ["commits"], paramDoc: "commit log",
  doc: "Turn a commit log into its most active authors.",
  returns: "an array of at most three objects { name, commits }\n  one per author, commits = how many commits that author made, ordered by commits descending and, for equal counts, by name in alphabetical order; only the first three",
  notes: "An author is identified by author.name. An empty log gives [].",
  shown: shownOf(["commits"], [LOGS[0]]), sampleJson: LOGS[0],
  example: { args: "", input: () => [clone(LOGS[0])], output: () => authorsWant(LOGS[0]) },
  runs: LOGS.map((l, i) => run(i === 0 ? "the shown log" : `log ${i + 1}`, [l], authorsWant)),
};

// ---- 6. dueSoon (was a negative control until the record asked for daysBetween: both mouths failed on calendar days) ----
const dayNo = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
export const dueWant = (tasks, today) => tasks.map((t, i) => ({ t, i })).filter(({ t }) => !t.done && dayNo(t.due) - dayNo(today) >= 0 && dayNo(t.due) - dayNo(today) <= 7).sort((a, b) => dayNo(a.t.due) - dayNo(b.t.due) || a.i - b.i).map(({ t }) => t.title);
const T = (title, due, done = false) => ({ title, due, done });
const DUE = [
  [[T("Pay rent", "2026-10-03"), T("Dentist", "2026-10-20"), T("Send report", "2026-10-01"), T("Old thing", "2026-09-25"), T("Book flights", "2026-10-08", true), T("Call Sam", "2026-10-08")], "2026-10-01"],
  [[T("Month edge in", "2026-11-04"), T("Month edge out", "2026-11-05"), T("Today", "2026-10-28"), T("Yesterday", "2026-10-27")], "2026-10-28"],
  [[T("Leap in", "2028-03-04"), T("Leap out", "2028-03-05"), T("Feb 29", "2028-02-29")], "2028-02-26"],
  [[T("Year end", "2027-01-02"), T("Same day b", "2026-12-30"), T("Same day a", "2026-12-30")], "2026-12-28"], [[], "2026-06-01"],
];
export const dueSoonContract = {
  name: "dueSoon", kind: "leaf", params: ["tasks", "today"], paramDoc: "to-do list and today's date",
  doc: "Pick the to-do items that are due soon.",
  returns: "an array of titles (strings)\n  the title of every task that is not done and is due today or within the next 7 days (day 7 counts), ordered by due date, earliest first; tasks with the same due date keep their order in the list",
  notes: "Dates are ISO \"YYYY-MM-DD\". A task due before today is not due soon. Count calendar days (months and leap years included).",
  shown: shownOf(["tasks", "today"], DUE[0]), sampleJson: DUE[0][0],
  example: { args: "", input: () => clone(DUE[0]), output: () => dueWant(...DUE[0]) },
  runs: DUE.map((d, i) => run(i === 0 ? "the shown list" : `list ${i + 1}`, d, dueWant)),
};

// ---- 7. wordStats (was a negative control until the record asked for splitWords: a split on whitespace keeps the punctuation) ----
export const statsWant = (text) => { const w = String(text).match(/[A-Za-z0-9']+/g) ?? []; const longest = w.reduce((a, b) => (b.length > a.length ? b : a), ""); return { words: w.length, unique: new Set(w.map((x) => x.toLowerCase())).size, longest, avgLen: w.length ? r1(w.reduce((s, x) => s + x.length, 0) / w.length) : 0 }; };
const TEXTS = ["The quick brown fox jumps over the lazy dog, and the dog sleeps.", "It's a dog-eat-dog world; isn't it?", "", "Repeat repeat REPEAT, again and AGAIN.", "One"];
export const wordStatsContract = {
  name: "wordStats", kind: "leaf", params: ["text"], paramDoc: "a passage of text",
  doc: "Count the words of a passage.",
  returns: "an object { words, unique, longest, avgLen }\n  words = how many words, unique = how many different words ignoring letter case, longest = the first longest word as written, avgLen = the mean word length rounded to one decimal",
  notes: "A word is a run of letters, digits and apostrophes (punctuation and hyphens separate words). An empty passage gives { words: 0, unique: 0, longest: \"\", avgLen: 0 }.",
  shown: shownOf(["text"], [TEXTS[0]]), sampleJson: TEXTS[0],
  example: { args: "", input: () => [TEXTS[0]], output: () => statsWant(TEXTS[0]) },
  runs: TEXTS.map((t, i) => run(i === 0 ? "the shown text" : `text ${i + 1}`, [t], statsWant, { avgLen: 0.051 })),
};

/** name -> contract, with what each one is FOR in the falsification (which mechanism it should reward, or that it is a control) */
export const DIVERSE = [
  { contract: busTimesContract, role: "cards", note: "padTime" }, { contract: flightLegContract, role: "cards+keys", note: "haversineKm, roundTo; latitude/longitude" },
  { contract: bedReportContract, role: "keys", note: "ward_name, total_beds, occupied_beds" }, { contract: orderTotalContract, role: "cards", note: "parseMoney, roundTo (was a control)" },
  { contract: topAuthorsContract, role: "control", note: "no card" }, { contract: dueSoonContract, role: "cards", note: "daysBetween (was a control)" },
  { contract: wordStatsContract, role: "cards", note: "splitWords, roundTo (was a control)" },
].map((d) => ({ ...d, contract: { ...d.contract, salt: "diverse-1" } }));

/** reference solutions (code) — for the tests only; never shown to a model */
export const DIVERSE_REFERENCE = {
  busTimes: `function busTimes(stop) { return { stop: stop.stop_name, route: stop.route, times: stop.times.map((t) => { const s = String(t).padStart(4, "0"); return s.slice(0, 2) + ":" + s.slice(2); }) }; }`,
  flightLeg: `function flightLeg(from, to) { const km = haversineKm(from.latitude, from.longitude, to.latitude, to.longitude); return { route: from.iata + " → " + to.iata, km: roundTo(km, 1), miles: roundTo(km / 1.609344, 1) }; }`,
  bedReport: `function bedReport(ward) { const free = ward.total_beds - ward.occupied_beds, pct = Math.round((ward.occupied_beds / ward.total_beds) * 100); return { name: ward.ward_name, free, percentFull: pct, status: free === 0 ? "full" : pct >= 85 ? "busy" : "ok" }; }`,
  orderTotal: `function orderTotal(order) { const n = (v) => (typeof v === "number" ? v : Number(String(v).replace(/[$,\\s]/g, ""))); const sub = order.items.reduce((s, it) => s + n(it.price) * Number(it.qty), 0); const subtotal = roundTo(sub, 2), tax = roundTo(sub * order.tax_rate, 2); return { subtotal, tax, total: roundTo(subtotal + tax, 2) }; }`,
  topAuthors: `function topAuthors(commits) { const n = new Map(); for (const c of commits) n.set(c.author.name, (n.get(c.author.name) || 0) + 1); return [...n].map(([name, commits]) => ({ name, commits })).sort((a, b) => b.commits - a.commits || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).slice(0, 3); }`,
  dueSoon: `function dueSoon(tasks, today) { const day = (s) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000); return tasks.map((t, i) => ({ t, i })).filter(({ t }) => !t.done && day(t.due) - day(today) >= 0 && day(t.due) - day(today) <= 7).sort((a, b) => day(a.t.due) - day(b.t.due) || a.i - b.i).map(({ t }) => t.title); }`,
  wordStats: `function wordStats(text) { const w = String(text).match(/[A-Za-z0-9']+/g) || []; const longest = w.reduce((a, b) => (b.length > a.length ? b : a), ""); return { words: w.length, unique: new Set(w.map((x) => x.toLowerCase())).size, longest, avgLen: w.length ? roundTo(w.reduce((s, x) => s + x.length, 0) / w.length, 1) : 0 }; }`,
};
