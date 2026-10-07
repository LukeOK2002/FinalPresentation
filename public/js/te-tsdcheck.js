/* "TSD check" slide (presenter screen only). Scene built here, then stepped.

   Start:   target site GCCGTAGCGC / CGGCATCGCG
   Click 1: staggered cut (upper GCCGTA | GCGC, lower CGGC | ATCGCG); halves pull apart; MADE drops in
   Click 2: overhangs filled in; the 2 bp 'TA' TSDs turn blue
   Click 3: DNA fades; MADE? between GATGCTA / TATCGAT; the flanking TAs light up; MADE? → MADE
   Click 4: MADE? between CGTCGTATC / GTAGATTAC with the boundary C and G hidden under it;
            it shifts 1 bp left and right, revealing them; a white ? appears
   Click 5: 6 bp windows bracketed either side; the TAs light up; MADE? → MADE
   Click 6: results bars (exact 2 bp vs 6 bp window), as on the simulation slide
   Click 7: the blue "not detected" parts pulse once
   Click 8: text only */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const P = 56, CX = 800, UY = 560, LY = 630, PULL = 212;           // DNA pitch / rows
const UP = "GCCGTAGCGC", LO = "CGGCATCGCG";
const ux = (i) => CX + (i - 4.5) * P;
const S = 50, SY = 595;                                             // single-strand pitch / row
const W = 880, BX = 360, BH = 44, BARS = [[470, 0.0582], [620, 0.3228]];

const base = (x, y, b, cls = "") => `<text class="dna-base ${cls}" x="${x}" y="${y}">${b}</text>`;
const bond = (x) => `<line class="dna-bond" x1="${x}" y1="${UY + 22}" x2="${x}" y2="${LY - 22}"/>`;
const comp = { A: "T", T: "A", G: "C", C: "G" };

function build(svg) {
  let h = "";
  // ---- double strand, cut after upper base 6 and lower base 4 ----
  h += `<g data-a="cutBonds">${bond(ux(4))}${bond(ux(5))}</g>`;
  h += `<g data-a="L">` + [0, 1, 2, 3].map((i) => bond(ux(i))).join("") +
    [...UP.slice(0, 6)].map((b, i) => base(ux(i), UY, b)).join("") + [...LO.slice(0, 4)].map((b, i) => base(ux(i), LY, b)).join("") +
    // fill-in: lower strand under the TA overhang, then the TSD colouring
    `<g data-a="fillL">${[4, 5].map((i) => bond(ux(i)) + base(ux(i), LY, comp[UP[i]])).join("")}</g>` +
    `<g data-a="tsdL">${[4, 5].map((i) => base(ux(i), UY, UP[i], "tsd") + base(ux(i), LY, comp[UP[i]], "tsd")).join("")}</g></g>`;
  h += `<g data-a="R">` + [6, 7, 8, 9].map((i) => bond(ux(i))).join("") +
    [...UP.slice(6)].map((b, i) => base(ux(i + 6), UY, b)).join("") + [...LO.slice(4)].map((b, i) => base(ux(i + 4), LY, b)).join("") +
    `<g data-a="fillR">${[4, 5].map((i) => bond(ux(i)) + base(ux(i), UY, comp[LO[i]])).join("")}</g>` +
    `<g data-a="tsdR">${[4, 5].map((i) => base(ux(i), UY, comp[LO[i]], "tsd") + base(ux(i), LY, LO[i], "tsd")).join("")}</g></g>`;
  h += `<g data-a="made"><rect class="tc-block" x="664" y="${UY - 28}" width="272" height="${LY - UY + 56}" rx="14"/>` +
    `<text class="tc-block-label" x="${CX}" y="${(UY + LY) / 2}">MADE</text></g>`;

  // ---- single-strand examples: MADE? between two flanks ----
  const block = (id, x, label, cls) => `<g data-a="${id}"><rect class="${cls}" x="${x}" y="${SY - 40}" width="200" height="80" rx="14"/>` +
    `<text class="tc-block-label" x="${x + 100}" y="${SY}">${label}</text></g>`;
  const flankL = (seq, lastX) => [...seq].map((b, k) => [lastX - (seq.length - 1 - k) * S, b]);
  const flankR = (seq, firstX) => [...seq].map((b, k) => [firstX + k * S, b]);
  const txt = (pts, cls = "") => pts.map(([x, b]) => base(x, SY, b, cls)).join("");

  // example 1: GATGCTA [MADE?] TATCGAT
  const e1L = flankL("GATGCTA", 670), e1R = flankR("TATCGAT", 930);
  h += `<g data-a="ex1">${txt(e1L)}${txt(e1R)}${block("e1q", 700, "MADE?", "tc-pale")}${block("e1y", 700, "MADE", "tc-block")}` +
    `<g data-a="e1ta">${txt(e1L.slice(5), "tc-ta")}${txt(e1R.slice(0, 2), "tc-ta")}</g></g>`;

  // example 2: CGTCGTAT(C) [MADE?] (G)TAGATTAC: the bracketed bases sit under the block
  const e2L = flankL("CGTCGTATC", 720), e2R = flankR("GTAGATTAC", 880);
  h += `<g data-a="ex2">${txt(e2L)}${txt(e2R)}` +
    `<g data-a="e2blk">${block("e2q", 700, "MADE?", "tc-pale")}${block("e2y", 700, "MADE", "tc-block")}</g>` +
    `<text data-a="e2what" class="tc-what" x="${CX}" y="${SY - 72}">?</text>` +
    `<g data-a="e2win"><path class="tc-bracket" d="M${e2L[2][0] - 22} ${SY - 46} v-12 H${e2L[7][0] + 22} v12"/>` +
    `<text class="tc-win" x="${(e2L[2][0] + e2L[7][0]) / 2}" y="${SY - 78}">6 bp</text>` +
    `<path class="tc-bracket" d="M${e2R[1][0] - 22} ${SY - 46} v-12 H${e2R[6][0] + 22} v12"/>` +
    `<text class="tc-win" x="${(e2R[1][0] + e2R[6][0]) / 2}" y="${SY - 78}">6 bp</text></g>` +
    `<g data-a="e2ta">${txt(e2L.slice(5, 7), "tc-ta")}${txt(e2R.slice(1, 3), "tc-ta")}</g></g>`;

  // ---- results bars ----
  h += `<g data-a="res">`;
  const names = ["Exact 2 bp next to insertion", "6 bp window next to insertion"];
  BARS.forEach(([y, p], i) => {
    const yw = W * p;
    h += `<text class="tc-bar-name" x="${BX}" y="${y - 34}">${names[i]}</text>` +
      `<rect class="tc-empty" x="${BX}" y="${y - BH / 2}" width="${W}" height="${BH}" rx="4"/>` +
      `<rect data-a="bs${i}" class="tc-sig" x="${BX}" y="${y - BH / 2}" width="${yw}" height="${BH}" rx="4"/>` +
      `<rect data-a="bb${i}" class="tc-bg" x="${BX + yw + 3}" y="${y - BH / 2}" width="${W - yw - 3}" height="${BH}" rx="4"/>` +
      `<rect data-a="bp${i}" class="tc-pulse" x="${BX + yw + 3}" y="${y - BH / 2}" width="${W - yw - 3}" height="${BH}" rx="4"/>` +
      `<text data-a="bv${i}" class="tc-bar-val" x="${BX + W + 24}" y="${y}">${(p * 100).toFixed(2)}%</text>`;
  });
  h += `<g data-a="legend"><rect class="tc-sig" x="${BX}" y="712" width="18" height="18" rx="3"/><text class="tc-legend" x="${BX + 28}" y="721">TA detected on both sides</text>` +
    `<rect class="tc-bg" x="${BX + 360}" y="712" width="18" height="18" rx="3"/><text class="tc-legend" x="${BX + 388}" y="721">Not detected on both sides</text></g></g>`;
  svg.innerHTML = h;
}

const hidden = { op: 0 };
const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];
const fadeIn = (id, at, dur = 600) => [id, { op: 1 }, at, dur];
const fadeOut = (id, at, dur = 500) => [id, { op: 0 }, at, dur];

const INITIAL = {
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((k) => [`t${k}`, { op: 0, ty: 12 }])),
  made: { op: 0, ty: -220 }, fillL: hidden, fillR: hidden, tsdL: hidden, tsdR: hidden,
  ex1: hidden, e1y: hidden, e1ta: hidden,
  ex2: hidden, e2y: hidden, e2ta: hidden, e2what: { op: 0, sc: 0.6 }, e2win: { op: 0, ty: 8 },
  res: hidden, legend: hidden,
  bs0: { sx: 0 }, bs1: { sx: 0 }, bb0: hidden, bb1: hidden, bp0: hidden, bp1: hidden,
  bv0: { op: 0, tx: -10 }, bv1: { op: 0, tx: -10 },
};

const SHIFT = [[-S, 900], [0, 1500], [S, 2100], [0, 2700]]; // 1 bp left, back, 1 bp right, back

const TIMELINES = [
  null,
  [ // 1 · cut, pull apart, MADE inserts
    fadeOut("cutBonds", 0, 400),
    ["L", { tx: -PULL }, 300, 1100, EASE_IN_OUT],
    ["R", { tx: PULL }, 300, 1100, EASE_IN_OUT],
    fadeIn("made", 1500, 400),
    ["made", { ty: 0 }, 1500, 900, EASE],
  ],
  [ // 2 · fill in; TSDs
    ...swap("t0", "t1"),
    fadeIn("fillL", 700), fadeIn("fillR", 700),
    fadeIn("tsdL", 1600, 700), fadeIn("tsdR", 1600, 700),
  ],
  [ // 3 · search for TA either side
    ...swap("t1", "t2"),
    ...["L", "R", "made"].map((id) => fadeOut(id, 0, 600)),
    fadeIn("ex1", 800),
    fadeIn("e1ta", 1900, 400),
    fadeIn("e1y", 2600, 600),
  ],
  [ // 4 · unclear boundaries
    ...swap("t2", "t3"),
    fadeOut("ex1", 0, 600),
    fadeIn("ex2", 700, 500),
    ...SHIFT.map(([tx, at]) => ["e2blk", { tx }, at + 600, 450, EASE_IN_OUT]),
    ["e2what", { op: 1, sc: 1 }, 1500, 500, SPRING],
  ],
  [ // 5 · 6 bp windows
    ...swap("t3", "t4"),
    ["e2win", { op: 1, ty: 0 }, 600, 500, EASE],
    fadeIn("e2ta", 1400, 400),
    fadeOut("e2what", 2000, 300),
    fadeIn("e2y", 2100, 600),
  ],
  [ // 6 · results
    ...swap("t4", "t5"),
    fadeOut("ex2", 0, 600),
    fadeIn("res", 600, 300),
    ...[0, 1].flatMap((i) => [
      [`bs${i}`, { sx: 1 }, 900 + i * 300, 900, EASE],
      fadeIn(`bb${i}`, 1500 + i * 300, 500),
      [`bv${i}`, { op: 1, tx: 0 }, 1700 + i * 300, 400, EASE],
    ]),
    fadeIn("legend", 2300, 500),
  ],
  [ // 7 · the blue parts pulse once
    ...swap("t5", "t6"),
    ...[0, 1].flatMap((i) => [[`bp${i}`, { op: 0.5 }, 700, 250], [`bp${i}`, { op: 0 }, 950, 600]]),
  ],
  [...swap("t6", "t7")],
];

export function initTeTsdCheck() {
  const slide = document.getElementById("te-tsdcheck");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
