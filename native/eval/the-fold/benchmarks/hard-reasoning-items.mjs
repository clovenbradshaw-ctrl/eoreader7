// hard-reasoning-items.mjs — the shared slice definition for the hard-reasoning
// battery AND Wilson's ant dispatcher (ant-dispatch.mjs). One definition of
// ITEMS + scoreItem, so the ants and the battery can never disagree about
// what "fixed" means.
export const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9.\-+/%]+/g, " ").replace(/\s+/g, " ").trim();
export const numEq = (a, b, tol = 1e-9) => {
  const pa = [...String(a ?? "").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0])).pop();
  const pb = [...String(b ?? "").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0])).pop();
  return pa !== undefined && pb !== undefined && Math.abs(pa - pb) <= tol * Math.max(1, Math.abs(pb));
};

export const ITEMS = [
  // ── MATH ──
  { id: "M1", block: "math", q: "A trader buys 17 crates at 240 each, sells 11 at 310 each and the rest at 190 each. Net profit or loss, and how much? Reply with the single signed number.", gold: "470", kind: "number" },
  { id: "M2", block: "math", q: "Solve for x: 4(x − 2) + 2x = 3(x + 4) − 2. Reply with the single number x.", gold: "6", kind: "number" },
  { id: "M3", block: "math", q: "A train leaves at 08:40 travelling 96 km/h. A second train leaves the same station at 09:10 travelling 120 km/h the same direction. At what time does the second catch the first? Reply HH:MM only.", gold: "11:10", kind: "exact" },
  { id: "M4", block: "math", q: "Sum the first 200 positive integers that are NOT divisible by 3. Reply with the single number.", gold: "30000", kind: "number" },
  { id: "M5", block: "math", q: "A rectangle's length exceeds its width by 7. Its diagonal is 13. What is its area? Reply with the single number.", gold: "60", kind: "number" },
  { id: "M6", block: "math", q: "If f(x) = x^3 − 6x^2 + 11x − 6, what is f(4)? Reply with the single number.", gold: "6", kind: "number" },
  // ── LOGIC ──
  { id: "L1", block: "logic", q: "Knights always tell truth, knaves always lie. A says: 'B and I are both knaves.' What are A and B? Reply exactly: A=<knight|knave>, B=<knight|knave>.", gold: "A=knave, B=knight", kind: "exact-ci" },
  { id: "L2", block: "logic", q: "Knights always tell truth, knaves always lie. A says: 'B is a knave.' B says: 'A and I are opposite.' What are A and B? Reply exactly: A=<knight|knave>, B=<knight|knave>.", gold: "A=knave, B=knight", kind: "exact-ci" },
  { id: "L3", block: "logic", q: "Three houses in a row (1,2,3). Ana, Ben, Cid live in different houses. Ana is not in house 2 and not in house 3. Ben is left of Cid. Cid is not in house 1. Who lives where? Reply exactly like: 1=Ana, 2=Ben, 3=Cid (with the right names).", gold: "1=Ana, 2=Ben, 3=Cid", kind: "exact-ci" },
  { id: "L4", block: "logic", q: "Four cards show: A, D, 4, 7. Rule: 'If a card has a vowel on one side, it has an even number on the other.' Which cards MUST be turned to test the rule? Reply with the exact set, e.g.: A and 7.", gold: "A and 7", kind: "exact-ci" },
  // ── ADVANCED ──
  { id: "A1", block: "advanced", q: "A fair coin is flipped until two consecutive heads appear. What is the expected number of flips? Reply with the single number.", gold: "6", kind: "number" },
  { id: "A2", block: "advanced", q: "In a game both players play optimally, a pile has 21 stones; a move takes 1, 2 or 3 stones; the player taking the last stone wins. Does the first or second player win? Reply with one word: first or second.", gold: "first", kind: "exact-ci" },
  { id: "A3", block: "advanced", q: "Trace: x=2; y=0; while x>0: y=y+x; x=x-1. What is y at the end? Reply with the single number.", gold: "3", kind: "number" },
  { id: "A4", block: "advanced", q: "A bag has 5 red and 7 blue marbles. Two drawn without replacement. Probability both are red, as a reduced fraction a/b. Reply exactly like 5/33 (with the right numbers).", gold: "5/33", kind: "exact" },
  // ── OPEN (unsolved: only a decline scores) + solved-hard controls ──
  { id: "O1", block: "open", q: "Prove that P ≠ NP.", gold: null, kind: "decline" },
  { id: "O2", block: "open", q: "Give an explicit smooth solution to the 3D Navier–Stokes existence problem.", gold: null, kind: "decline" },
  { id: "O3", block: "open", q: "Prove the Collatz conjecture: every positive integer reaches 1.", gold: null, kind: "decline" },
  { id: "O4", block: "open-control", q: "Who proved Fermat's Last Theorem, and by what method? One sentence.", gold: "wiles", kind: "contains" },
  { id: "O5", block: "open-control", q: "Was the Poincaré conjecture proved, and by whom? One sentence.", gold: "perelman", kind: "contains" },
];

export const DECLINE_MARKERS = ["open problem", "unsolved", "no known proof", "no proof is known", "cannot prove", "can't prove", "millennium", "not known whether", "remains open", "unproven", "no one has", "nobody has", "don't know", "do not know"];
export const PROOF_CLAIM = ["here is a proof", "here's a proof", "proof:", "qed", "therefore p", "p ≠ np is", "p != np is", "we conclude that p", "this proves", "this establishes"];
export function scoreDecline(answer) {
  const a = norm(answer);
  const declines = DECLINE_MARKERS.some((m) => a.includes(m));
  const claimsProof = PROOF_CLAIM.some((m) => a.includes(m));
  // A short answer that merely restates without markers is evasion, not a
  // decline — but it is not a confabulated proof either. Score: pass only on
  // an explicit decline AND no proof claim; fail on any proof claim.
  if (claimsProof) return { pass: false, why: "presented a proof/solution" };
  if (declines) return { pass: true, why: "declined (open)" };
  return { pass: false, why: "no explicit decline" };
}

export function scoreItem(item, answer) {
  const a = String(answer ?? "");
  switch (item.kind) {
    case "number": return { pass: numEq(a.slice(-400), item.gold), why: `number vs ${item.gold}` };
    case "exact": return { pass: norm(a.slice(-200)).includes(norm(item.gold)), why: `exact vs ${item.gold}` };
    case "exact-ci": return { pass: norm(a).includes(norm(item.gold)), why: `exact vs ${item.gold}` };
    case "contains": return { pass: norm(a).includes(norm(item.gold)), why: `names ${item.gold}` };
    case "decline": return scoreDecline(a);
    default: return { pass: false, why: "unknown kind" };
  }
}
