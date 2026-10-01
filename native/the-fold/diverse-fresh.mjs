// ═══ LOVELACE · TEACH IT TO FISH ═══ THE FRESH SET (set B). Written AFTER the cheap species existed and WITHOUT editing them: new domains, new key names, the same kind of contract (doc, returns, notes, three
// shown runs, two held out, an independent reference for the oracle). The species were fitted to set A; this is the generality gate (P71) for them. Two tasks are written to sit OUTSIDE what the species
// can do (a conditional whose answer is an input value, and a substring), so the result also says where they stop.
//
//   playerCard   shots and hits -> accuracy (percent, 1 decimal, 0 for no shots), tier                       decide over a solved field, a guard
//   tripCost     two coordinates and a rate -> label, km, cost                                              template, great-circle distance, arithmetic
//   tempReport   a Celsius reading -> city, Fahrenheit, feel                                                a card, two thresholds
//   slotLabels   a day's raw times -> date, labels, count                                                   copy, map through a helper, a count
//   longestPost  a blog -> blog, posts, longest title by word count                                         copy, a count, argmax over objects
//   invoice      lines and a percent discount -> number, subtotal, discount, total                         copy, sums, a percentage
//   scoreboard   a game -> winner (a team's NAME, or "tie"), margin                                          OUTSIDE: a conditional that answers with an input value
//   initials     a person -> initials, full name                                                            OUTSIDE (initials: a substring); template (full)
import { clone, run, shownOf } from "./diverse-tasks.mjs";

const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const hav = (a, b, c, d) => { const R = (x) => (x * Math.PI) / 180, p = R(c - a), q = R(d - b), h = Math.sin(p / 2) ** 2 + Math.cos(R(a)) * Math.cos(R(c)) * Math.sin(q / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
const mk = (name, params, doc, returns, notes, data, wantOf, tol) => ({
  name, kind: "leaf", params, paramDoc: params.join(", "), doc, returns, notes,
  shown: shownOf(params, data[0]), sampleJson: data[0][0],
  example: { args: "", input: () => clone(data[0]), output: () => wantOf(...data[0]) },
  runs: data.map((d, i) => run(i === 0 ? "the shown one" : `case ${i + 1}`, d, wantOf, tol)),
});

// ---- playerCard ----
const playerWant = (p) => { const accuracy = p.shots ? r1((p.hits / p.shots) * 100) : 0; return { nick: p.nick, accuracy, tier: accuracy >= 90 ? "gold" : accuracy >= 75 ? "silver" : "bronze" }; };
const PLAYERS = [[{ nick: "Mira", shots: 40, hits: 37 }], [{ nick: "Tok", shots: 60, hits: 47 }], [{ nick: "Wen", shots: 0, hits: 0 }], [{ nick: "Ozzy", shots: 25, hits: 12 }], [{ nick: "Pia", shots: 18, hits: 17 }]];
export const playerCardContract = mk("playerCard", ["p"],
  "Turn one player's shot record into a card.",
  "an object { nick, accuracy, tier }\n  nick = the player's nickname, accuracy = hits as a percentage of shots, rounded to one decimal (0 when there were no shots), tier = \"gold\" when accuracy is 90 or more, else \"silver\" when accuracy is 75 or more, else \"bronze\"",
  "accuracy is a number such as 92.5, not text.", PLAYERS, playerWant);

// ---- tripCost ----
const tripWant = (t) => { const km = Math.round(hav(t.origin.lat, t.origin.lon, t.dest.lat, t.dest.lon)); return { label: `${t.origin.code}-${t.dest.code}`, km, cost: r2((km * t.rate_per_100km) / 100) }; };
const TRIPS = [
  [{ origin: { code: "LHR", lat: 51.4706, lon: -0.4619 }, dest: { code: "JFK", lat: 40.6413, lon: -73.7781 }, rate_per_100km: 6.5 }],
  [{ origin: { code: "SYD", lat: -33.9461, lon: 151.1772 }, dest: { code: "AKL", lat: -37.0082, lon: 174.785 }, rate_per_100km: 8.25 }],
  [{ origin: { code: "NRT", lat: 35.772, lon: 140.3929 }, dest: { code: "ICN", lat: 37.4602, lon: 126.4407 }, rate_per_100km: 5 }],
  [{ origin: { code: "GRU", lat: -23.4356, lon: -46.4731 }, dest: { code: "EZE", lat: -34.8222, lon: -58.5358 }, rate_per_100km: 7.1 }],
  [{ origin: { code: "CDG", lat: 49.0097, lon: 2.5479 }, dest: { code: "FCO", lat: 41.8003, lon: 12.2389 }, rate_per_100km: 9 }],
];
export const tripCostContract = mk("tripCost", ["trip"],
  "Price one trip between two airports.",
  "an object { label, km, cost }\n  label = the two codes joined with a hyphen, like \"AAA-BBB\", km = the great-circle distance between them in kilometres rounded to a whole number, cost = km times rate_per_100km divided by 100, rounded to 2 decimals",
  "Earth radius 6371 km.", TRIPS, tripWant, { cost: 0.0051 });

// ---- tempReport ----
const tempWant = (r) => { const fahrenheit = r1(r.celsius * 1.8 + 32); return { city: r.city, fahrenheit, feel: fahrenheit >= 86 ? "hot" : fahrenheit <= 50 ? "cold" : "mild" }; };
const TEMPS = [[{ city: "Lagos", celsius: 33.5 }], [{ city: "Oslo", celsius: -2 }], [{ city: "Lyon", celsius: 18.5 }], [{ city: "Cairo", celsius: 30 }], [{ city: "Reykjavik", celsius: 10 }]];
export const tempReportContract = mk("tempReport", ["r"],
  "Turn one temperature reading into a report.",
  "an object { city, fahrenheit, feel }\n  city = the city, fahrenheit = the temperature in degrees Fahrenheit rounded to one decimal, feel = \"hot\" when fahrenheit is 86 or more, else \"cold\" when fahrenheit is 50 or less, else \"mild\"",
  "", TEMPS, tempWant, { fahrenheit: 0.051 });

// ---- slotLabels ----
const pad4 = (t) => { const s = String(t).replace(/\D/g, "").padStart(4, "0"); return `${s.slice(0, 2)}:${s.slice(2)}`; };
const slotsWant = (d) => ({ date: d.date, labels: d.slots.map(pad4), count: d.slots.length });
const DAYS = [[{ date: "2026-10-03", slots: [900, 1330, "1700"] }], [{ date: "2026-10-04", slots: ["730", 0] }], [{ date: "2026-10-05", slots: [] }], [{ date: "2026-10-06", slots: [2359, "5", 1215, 1015] }], [{ date: "2026-10-07", slots: ["1200"] }]];
export const slotLabelsContract = mk("slotLabels", ["day"],
  "Turn one day's booking slots into labels.",
  "an object { date, labels, count }\n  date = the day's date, labels = every slot as \"HH:MM\" in the order given, count = how many slots there are",
  "A slot is written as a number or a string of digits WITHOUT padding: 900 means 09:00, 5 means 00:05, 0 means 00:00.", DAYS, slotsWant);

// ---- longestPost ----
const postWant = (b) => { let best = null; for (const p of b.posts) if (best === null || p.words > best.words) best = p; return { blog: b.name, posts: b.posts.length, longest: best ? best.title : "" }; };
const BLOGS = [
  [{ name: "Field Notes", posts: [{ title: "Soil", words: 420 }, { title: "Bees and weather", words: 1310 }, { title: "Seeds", words: 800 }] }],
  [{ name: "Quiet", posts: [{ title: "One", words: 50 }, { title: "Two", words: 50 }] }],
  [{ name: "Empty", posts: [] }],
  [{ name: "Daily", posts: [{ title: "Mon", words: 90 }, { title: "Tue", words: 91 }, { title: "Wed", words: 12 }, { title: "Thu", words: 91 }] }],
  [{ name: "Solo", posts: [{ title: "Only", words: 5 }] }],
];
export const longestPostContract = mk("longestPost", ["blog"],
  "Summarise one blog.",
  "an object { blog, posts, longest }\n  blog = the blog's name, posts = how many posts it has, longest = the title of the post with the most words (the first one if two are tied; \"\" when there are no posts)",
  "", BLOGS, postWant);

// ---- invoice ----
const invWant = (v) => { const subtotal = r2(v.lines.reduce((s, l) => s + l.qty * l.unit, 0)), discount = r2((subtotal * v.discount_pct) / 100); return { number: v.number, subtotal, discount, total: r2(subtotal - discount) }; };
const INVS = [
  [{ number: "INV-1001", lines: [{ desc: "Chair", qty: 4, unit: 49.5 }, { desc: "Desk", qty: 1, unit: 310 }], discount_pct: 10 }],
  [{ number: "INV-1002", lines: [{ desc: "Pen", qty: 100, unit: 0.35 }], discount_pct: 0 }],
  [{ number: "INV-1003", lines: [{ desc: "Lamp", qty: 3, unit: 24.99 }, { desc: "Bulb", qty: 12, unit: 1.2 }], discount_pct: 15 }],
  [{ number: "INV-1004", lines: [], discount_pct: 5 }],
  [{ number: "INV-1005", lines: [{ desc: "Rug", qty: 2, unit: 180.4 }], discount_pct: 25 }],
];
export const invoiceContract = mk("invoice", ["inv"],
  "Total one invoice.",
  "an object { number, subtotal, discount, total }, the three amounts each rounded to 2 decimals\n  number = the invoice number, subtotal = the sum of qty × unit over the lines, discount = subtotal times discount_pct percent, total = subtotal minus discount",
  "discount_pct is a percentage, so 10 means ten percent.", INVS, invWant, { subtotal: 0.0051, discount: 0.0051, total: 0.0051 });

// ---- scoreboard (OUTSIDE) ----
const gameWant = (g) => ({ winner: g.home_pts > g.away_pts ? g.home : g.away_pts > g.home_pts ? g.away : "tie", margin: Math.abs(g.home_pts - g.away_pts) });
const GAMES = [[{ home: "Owls", away: "Hawks", home_pts: 71, away_pts: 64 }], [{ home: "Reds", away: "Blues", home_pts: 88, away_pts: 93 }], [{ home: "Pines", away: "Oaks", home_pts: 50, away_pts: 50 }], [{ home: "Wolves", away: "Lynx", home_pts: 102, away_pts: 99 }], [{ home: "Rams", away: "Elks", home_pts: 61, away_pts: 70 }]];
export const scoreboardContract = mk("scoreboard", ["g"],
  "Report who won one game.",
  "an object { winner, margin }\n  winner = the name of the team with more points, or \"tie\" when the points are equal, margin = how many points separate the two teams (never negative)",
  "", GAMES, gameWant);

// ---- initials (OUTSIDE) ----
const initWant = (p) => ({ initials: `${p.first[0]}${p.last[0]}`.toUpperCase(), full: `${p.first} ${p.last}` });
const PEOPLE = [[{ first: "Ada", last: "Byron" }], [{ first: "grace", last: "hopper" }], [{ first: "Linus", last: "Torvalds" }], [{ first: "Mae", last: "Jemison" }], [{ first: "Alan", last: "Turing" }]];
export const initialsContract = mk("initials", ["p"],
  "Turn one person's name into initials and a full name.",
  "an object { initials, full }\n  initials = the first letter of the first name followed by the first letter of the last name, in capitals, full = the first name, a space, then the last name, exactly as given",
  "", PEOPLE, initWant);

export const FRESH = [
  { contract: playerCardContract, role: "fresh" }, { contract: tripCostContract, role: "fresh" }, { contract: tempReportContract, role: "fresh" }, { contract: slotLabelsContract, role: "fresh" },
  { contract: longestPostContract, role: "fresh" }, { contract: invoiceContract, role: "fresh" }, { contract: scoreboardContract, role: "outside" }, { contract: initialsContract, role: "outside" },
];
