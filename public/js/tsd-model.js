/* TSD background simulation: the null model shared by the slide, the phone page
   and the sync Worker (which re-checks every submitted round).

   One round = two independent 6-bp flanks. A flank "has TA" if the dinucleotide
   TA occurs anywhere in it. 2/2 flanks with TA = a chance "TSD signal".

   Calibration: with uniform bases (25% each) P(2/2) = 8.37%, not the 9.66%
   background rate we want. So bases are drawn with a slight AT bias,
   P(A) = P(T) = q, P(C) = P(G) = 0.5 - q, with q solved exactly below so that
   P(TA in flank)^2 = TARGET. For 9.66% this gives q ≈ 0.2600 (52% AT). */

export const FLANK_LEN = 6;
export const TARGET = 0.0966; // background rate: TA within 6 bp on BOTH flanks

/* Exact P(at least one TA in an n-bp flank) for A/T probability q.
   Two-state recursion over "sequences so far with no TA", split by whether
   they end in T (the only base that can start a TA). */
export function pFlankTA(q, n = FLANK_LEN) {
  let endT = q;
  let endOther = 1 - q;
  for (let i = 1; i < n; i++) {
    const total = endT + endOther;
    const nextT = total * q;                          // append T to anything
    const nextOther = endOther * (1 - q) + endT * (1 - 2 * q); // after T, A would make TA
    endT = nextT;
    endOther = nextOther;
  }
  return 1 - (endT + endOther);
}

function solveQ(perFlank) {
  let lo = 0.001;
  let hi = 0.499;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (pFlankTA(mid) < perFlank) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export const P_AT = solveQ(Math.sqrt(TARGET)); // P(A) = P(T)
export const P_CG = 0.5 - P_AT;                 // P(C) = P(G)

const CUMULATIVE = [
  ["A", P_AT],
  ["T", 2 * P_AT],
  ["C", 2 * P_AT + P_CG],
  ["G", 1],
];

export function randomBase(rand = Math.random) {
  const r = rand();
  for (const [base, edge] of CUMULATIVE) if (r < edge) return base;
  return "G";
}

export function randomFlank(rand = Math.random) {
  let s = "";
  for (let i = 0; i < FLANK_LEN; i++) s += randomBase(rand);
  return s;
}

/** Start indices of every TA in seq (TA can't overlap itself, so no ambiguity). */
export function taPositions(seq) {
  const out = [];
  for (let i = 0; i < seq.length - 1; i++) {
    if (seq[i] === "T" && seq[i + 1] === "A") out.push(i);
  }
  return out;
}

export function hasTA(seq) {
  return seq.includes("TA");
}

/** One round: { a, b, hits } where hits = number of flanks (0–2) containing TA. */
export function simulateRound(rand = Math.random) {
  const a = randomFlank(rand);
  const b = randomFlank(rand);
  return { a, b, hits: (hasTA(a) ? 1 : 0) + (hasTA(b) ? 1 : 0) };
}
