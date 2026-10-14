// npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TARGET, FLANK_LEN, P_AT, P_CG, pFlankTA, taPositions, hasTA, randomFlank, simulateRound,
} from "../public/js/tsd-model.js";

// Brute force over all 4^6 flanks: checks the recursion, not just itself.
function bruteForce(q) {
  const p = { A: q, T: q, C: 0.5 - q, G: 0.5 - q };
  const bases = "ACGT";
  let total = 0;
  for (let i = 0; i < 4 ** FLANK_LEN; i++) {
    let s = "";
    let prob = 1;
    for (let j = 0, x = i; j < FLANK_LEN; j++, x >>= 2) {
      s += bases[x & 3];
      prob *= p[bases[x & 3]];
    }
    if (s.includes("TA")) total += prob;
  }
  return total;
}

test("recursion matches brute force", () => {
  for (const q of [0.1, 0.25, P_AT, 0.4]) {
    assert.ok(Math.abs(pFlankTA(q) - bruteForce(q)) < 1e-12);
  }
});

test("uniform bases give 8.37%, calibrated bases give the target", () => {
  assert.ok(Math.abs(pFlankTA(0.25) ** 2 - 0.0837) < 1e-4);
  assert.ok(Math.abs(pFlankTA(P_AT) ** 2 - TARGET) < 1e-9);
  assert.ok(Math.abs(2 * P_AT + 2 * P_CG - 1) < 1e-12);
});

test("TA detection", () => {
  assert.deepEqual(taPositions("TATATA"), [0, 2, 4]);
  assert.deepEqual(taPositions("ATATAT"), [1, 3]);
  assert.deepEqual(taPositions("GGCCAT"), []);
  assert.deepEqual(taPositions("CCCCTA"), [4]);
  assert.equal(hasTA("ACGTAC"), true);
  assert.equal(hasTA("AATTCG"), false);
});

test("flanks are 6 bp of ACGT", () => {
  for (let i = 0; i < 1000; i++) assert.match(randomFlank(), /^[ACGT]{6}$/);
});

test("Monte Carlo converges on the target", () => {
  const N = 2_000_000;
  let twos = 0;
  for (let i = 0; i < N; i++) if (simulateRound().hits === 2) twos++;
  const p = twos / N;
  const se = Math.sqrt((TARGET * (1 - TARGET)) / N);
  assert.ok(Math.abs(p - TARGET) < 5 * se, `got ${p}, want ${TARGET} ± ${5 * se}`);
});
