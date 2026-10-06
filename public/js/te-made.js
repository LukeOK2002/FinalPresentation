/* "MADE1/2 investigation" slide (presenter screen only). Scene built here, then stepped.

   Start:   MADE1/MADE2: two palindromic repeats (yellow) around a short core (orange)
   Click 1: part labels and the 80 bp span
   Click 2: the element expands into 71 copies (RepeatMasker hits)
   Click 3: ...and on to all 378 copies (BLAST)
   Click 4: the copies fade away
   Click 5: shuffle test: the shuffled locus is diced and reordered; a scan line passes
            over both; bitscores 16 vs 1; ✅ beside the original
   Click 6: orthology: human locus vs chimpanzee locus; scan line; ✅ beside human
   Click 7: profile HMM (blank layers above and below): the middle states light up in series; ✅
   Click 8: the 378 copies return and one turns grey */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const Y = "#f9be00", CORE = "#ff8c1a", GREY = "#5c6773";
const N = 378, FIRST = 71, COLS = 27, GX = 230, GY = 380, PX = 42, PY = 32, LEN = 30;
const DEAD = 200;                                // the one copy not confirmed
const PIECE = 50, PIECES = 8, SX = 560;          // shuffled locus: 8 pieces of 50 px
const PERM = [5, 2, 7, 0, 3, 6, 1, 4];           // piece p ends up in slot PERM[p]
const ROW1 = 480, ROW2 = 620, SWEEP = 460;
const NODES = 6;

const line = (x1, x2, y, c, extra = "") => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" style="stroke:${c}" ${extra}/>`;
const label = (x, y, t, cls = "") => `<text class="mi-label ${cls}" x="${x}" y="${y}">${t}</text>`;
// MADE coloured as TIR / core / TIR (37 / 6 / 37 of 80 bp) between x0 and x0 + w
const parts = (w) => { const t = (w * 37) / 80; return [[0, t, Y], [t, w - t, CORE], [w - t, w, Y]]; };
const made = (x0, w, y, cls) => parts(w).map(([a, b, c]) => line(x0 + a, x0 + b, y, c, `class="${cls}"`)).join("");

function build(svg) {
  let h = "";
  // representation: arrows for the two inverted (palindromic) repeats around the core
  const RX = 500, RW = 600, RY = 560, T = (RW * 37) / 80, H = 24;
  h += `<g data-a="rep">` +
    `<polygon fill="${Y}" points="${RX},${RY - H} ${RX + T - 26},${RY - H} ${RX + T},${RY} ${RX + T - 26},${RY + H} ${RX},${RY + H}"/>` +
    `<rect fill="${CORE}" x="${RX + T}" y="${RY - H}" width="${RW - 2 * T}" height="${2 * H}"/>` +
    `<polygon fill="${Y}" points="${RX + RW},${RY - H} ${RX + RW - T + 26},${RY - H} ${RX + RW - T},${RY} ${RX + RW - T + 26},${RY + H} ${RX + RW},${RY + H}"/></g>`;
  h += `<g data-a="repLabels">` +
    `<path class="mi-bracket" d="M${RX} ${RY - 50} v-14 H${RX + RW} v14"/>` + label(800, RY - 86, "80 bp", "mi-mid") +
    label(RX + T / 2, RY + 62, "Palindromic repeat", "mi-mid") + label(800, RY + 62, "Core", "mi-mid mi-core") +
    label(RX + RW - T / 2, RY + 62, "Palindromic repeat", "mi-mid") + `</g>`;
  // the copies
  h += `<g data-a="grid">`;
  for (let i = 0; i < N; i++) {
    const x = GX + (i % COLS) * PX, y = GY + Math.floor(i / COLS) * PY;
    h += line(x, x + LEN, y, Y, `class="mi-copy" data-a="m${i}"`);
    if (i === DEAD) h += line(x, x + LEN, y, GREY, `class="mi-copy" data-a="dead"`);
  }
  h += `</g>`;
  // shuffle test
  h += `<g data-a="sh">` + label(520, ROW1, "Original locus", "mi-end") + label(520, ROW2, "Shuffled locus", "mi-end") +
    made(SX, PIECE * PIECES, ROW1, "mi-seq");
  const segs = parts(PIECE * PIECES);
  for (let p = 0; p < PIECES; p++) {
    const a = p * PIECE, b = a + PIECE;
    h += `<g data-a="sp${p}">` + segs.filter(([s, e]) => e > a && s < b)
      .map(([s, e, c]) => line(SX + Math.max(s, a), SX + Math.min(e, b), ROW2, c, `class="mi-seq"`)).join("") + `</g>`;
  }
  h += `<line data-a="sw1" class="mi-sweep" x1="${SX - 20}" y1="${ROW1 - 50}" x2="${SX - 20}" y2="${ROW2 + 50}"/>` +
    `<text data-a="bs1" class="mi-score" x="1010" y="${ROW1}">Bitscore <tspan>16</tspan></text>` +
    `<text data-a="bs2" class="mi-score" x="1010" y="${ROW2}">Bitscore <tspan>1</tspan></text>` +
    `<text data-a="ck1" class="mi-check" x="1220" y="${ROW1}">✅</text></g>`;
  // orthology
  const locus = (y, faded) => line(560, 700, y, GREY, `class="mi-seq"`) + line(700, 860, y, Y, `class="mi-seq"${faded ? ' opacity="0.55"' : ""}`) + line(860, 1000, y, GREY, `class="mi-seq"`);
  h += `<g data-a="or">` + label(520, ROW1, "Human locus", "mi-end") + label(520, ROW2, "Chimpanzee locus", "mi-end") +
    locus(ROW1, false) + locus(ROW2, true) +
    `<line data-a="sw2" class="mi-sweep" x1="${SX - 20}" y1="${ROW1 - 50}" x2="${SX - 20}" y2="${ROW2 + 50}"/>` +
    `<text data-a="ck2" class="mi-check" x="1040" y="${ROW1}">✅</text></g>`;
  // profile HMM above a locus
  const HY = 450, LY = 650, nx = (i) => 640 + i * 64;
  h += `<g data-a="hm">` + label(600, HY, "Profile HMM", "mi-end") + label(470, LY, "Locus", "mi-end");
  const UY = HY - 62, DY = HY + 62; // blank layers above and below the highlighted row
  const edge = (x1, y1, x2, y2) => `<line class="mi-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  for (let i = 0; i < NODES; i++) {
    if (i < NODES - 1) h += edge(nx(i), HY, nx(i + 1), HY);
    for (const ly of [UY, DY]) {
      h += edge(nx(i), ly, nx(i), HY);                            // to its own column
      if (i < NODES - 1) h += edge(nx(i), ly, nx(i + 1), HY);     // and on to the next
    }
  }
  for (let i = 0; i < NODES; i++) {
    h += `<circle class="mi-node" cx="${nx(i)}" cy="${UY}" r="14"/><circle class="mi-node" cx="${nx(i)}" cy="${DY}" r="14"/>`;
    h += `<circle class="mi-node" cx="${nx(i)}" cy="${HY}" r="16"/><circle data-a="hn${i}" class="mi-node-on" cx="${nx(i)}" cy="${HY}" r="16"/>`;
  }
  h += line(500, 640, LY, GREY, `class="mi-seq"`) + line(640, 960, LY, Y, `class="mi-seq"`) + line(960, 1100, LY, GREY, `class="mi-seq"`) +
    `<text data-a="ck3" class="mi-check" x="1140" y="${LY}">✅</text></g>`;
  svg.innerHTML = h;
}

const hidden = { op: 0 };
const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
const SW_AT = 3200, SW_MS = 1500;

const INITIAL = {
  ...Object.fromEntries(range(1, 9).map((k) => [`t${k}`, { op: 0, ty: 12 }])),
  repLabels: hidden,
  ...Object.fromEntries(range(0, N).map((i) => [`m${i}`, { op: 0, sc: 0.3 }])),
  dead: hidden,
  sh: hidden, or: hidden, hm: hidden,
  sw1: hidden, sw2: hidden, bs1: { op: 0, tx: -10 }, bs2: { op: 0, tx: -10 },
  ck1: { op: 0, sc: 0.4 }, ck2: { op: 0, sc: 0.4 }, ck3: { op: 0, sc: 0.4 },
  ...Object.fromEntries(range(0, NODES).map((i) => [`hn${i}`, hidden])),
};

const sweep = (id, at) => [
  [id, { op: 1 }, at - 200, 200], [id, { tx: SWEEP }, at, SW_MS, "linear"], [id, { op: 0 }, at + SW_MS, 250],
];

const TIMELINES = [
  null,
  [...swap("t0", "t1"), ["repLabels", { op: 1 }, 500, 600]],
  [ // 71 copies
    ...swap("t1", "t2"),
    ["repLabels", { op: 0 }, 0, 400],
    ["rep", { op: 0, sc: 0.2 }, 200, 600, EASE_IN_OUT],
    ...range(0, FIRST).map((i) => [`m${i}`, { op: 1, sc: 1 }, 600 + i * 14, 320, EASE]),
  ],
  [ // all 378
    ...swap("t2", "t3"),
    ...range(FIRST, N).map((i) => [`m${i}`, { op: 1, sc: 1 }, 400 + (i - FIRST) * 6, 320, EASE]),
  ],
  [...swap("t3", "t4"), ["grid", { op: 0 }, 300, 900]],
  [ // shuffle test
    ...swap("t4", "t5"),
    ["sh", { op: 1 }, 300, 600],
    ...range(0, PIECES).flatMap((p) => [
      [`sp${p}`, { ty: p % 2 ? 22 : -22 }, 1000 + p * 30, 350, EASE],
      [`sp${p}`, { tx: (PERM[p] - p) * PIECE }, 1700, 800, EASE_IN_OUT],
      [`sp${p}`, { ty: 0 }, 2600, 400, EASE],
    ]),
    ...sweep("sw1", SW_AT),
    ["bs1", { op: 1, tx: 0 }, SW_AT + SW_MS - 200, 400, EASE],
    ["bs2", { op: 1, tx: 0 }, SW_AT + SW_MS, 400, EASE],
    ["ck1", { op: 1, sc: 1 }, SW_AT + SW_MS + 500, 500, SPRING],
  ],
  [ // orthology
    ...swap("t5", "t6"),
    ["sh", { op: 0 }, 0, 400],
    ["or", { op: 1 }, 400, 600],
    ...sweep("sw2", 1400),
    ["ck2", { op: 1, sc: 1 }, 1400 + SW_MS + 300, 500, SPRING],
  ],
  [ // profile HMM
    ...swap("t6", "t7"),
    ["or", { op: 0 }, 0, 400],
    ["hm", { op: 1 }, 400, 600],
    ...range(0, NODES).map((i) => [`hn${i}`, { op: 1 }, 1300 + i * 280, 250]),
    ["ck3", { op: 1, sc: 1 }, 1300 + NODES * 280 + 300, 500, SPRING],
  ],
  [ // all confirmed but one
    ...swap("t7", "t8"),
    ["hm", { op: 0 }, 0, 400],
    ["grid", { op: 1 }, 500, 800],
    ["dead", { op: 1 }, 1900, 700],
  ],
];

export function initTeMade() {
  const slide = document.getElementById("te-made");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
