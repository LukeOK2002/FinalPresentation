/* "Investigating results with RepeatMasker" slide (presenter screen only).

   Start:   a grey genome with a navy RepeatMasker box centred above it
   Click 1: a small Dfam card swings into the box along a 90° arc, then disappears
   Click 2: the box sweeps along the genome, colouring TE-homologous intervals as it passes
   Click 3: text only

   The arc: the card sits in two nested groups, one moving x with a sine ease-out and the
   other moving y with a sine ease-in, which together trace a quarter circle. */

import { createStepper, EASE, EASE_IN_OUT } from "./stepper.js";

const ARC = 230, ARC_MS = 750;
const SWEEP_FROM = -560, SWEEP_TO = 560, SWEEP_MS = 3200, BOX_X = 800;
const SINE_OUT = "cubic-bezier(0.39, 0.575, 0.565, 1)";
const SINE_IN = "cubic-bezier(0.47, 0, 0.745, 0.715)";
// highlighted intervals [x1, x2] on the genome (must match index.html)
const HITS = [[260, 340], [430, 480], [560, 660], [830, 890], [990, 1090], [1200, 1260]];

const sweepStart = 900; // ms into click 2 when the box starts moving right
const boxAt = (x) => sweepStart + (SWEEP_MS * (x - (BOX_X + SWEEP_FROM))) / (SWEEP_TO - SWEEP_FROM);

const INITIAL = {
  ...Object.fromEntries([1, 2, 3].map((k) => [`t${k}`, { op: 0, ty: 12 }])),
  dfamX: { op: 0, tx: -ARC }, dfamY: { ty: -ARC },
  beam: { op: 0 },
  ...Object.fromEntries(HITS.map((_, i) => [`h${i}`, { sx: 0 }])),
};

const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];

const TIMELINES = [
  null,
  [ // 1 · Dfam card swings into the box
    ...swap("t0", "t1"),
    ["dfamX", { op: 1 }, 500, 400],
    ["dfamX", { tx: 0 }, 1000, ARC_MS, SINE_OUT],
    ["dfamY", { ty: 0 }, 1000, ARC_MS, SINE_IN],
    ["dfamX", { op: 0 }, 1000 + ARC_MS, 150],             // gone once it is inside
    ["box", { sc: 1.06 }, 1000 + ARC_MS, 180, EASE],
    ["box", { sc: 1 }, 1000 + ARC_MS + 180, 300, EASE],
  ],
  [ // 2 · sweep the genome
    ...swap("t1", "t2"),
    ["box", { tx: SWEEP_FROM }, 0, sweepStart - 100, EASE_IN_OUT],
    ["beam", { op: 1 }, sweepStart - 300, 300],
    ["box", { tx: SWEEP_TO }, sweepStart, SWEEP_MS, "linear"],
    ...HITS.map(([a, b], i) => [`h${i}`, { sx: 1 }, boxAt(a), boxAt(b) - boxAt(a), "linear"]),
    ["beam", { op: 0 }, sweepStart + SWEEP_MS, 300],
    ["box", { tx: 0 }, sweepStart + SWEEP_MS + 200, 900, EASE_IN_OUT],
  ],
  [ // 3 · text only
    ...swap("t2", "t3"),
  ],
];

export const initTeMasker = () => createStepper(document.getElementById("te-masker"), INITIAL, TIMELINES);
