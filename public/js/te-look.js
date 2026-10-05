/* "What do TEs look like?" slide (presenter screen only).

   Click 1: staggered cut; the two halves pull apart and the TE (yellow block) drops in
   Click 2: overhangs filled in base by base; the duplicated bases turn blue = TSDs
   Click 3: DNA fades; a known TE and a putative TE are compared (white line sweeps),
            "95% identity" appears and the putative TE becomes confirmed */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const PULL = 212; // each half moves this far: leaves a 200-px gap for the TE between the overhangs

const hidden = { op: 0 };
const INITIAL = {
  t0: { op: 1 }, t1: { op: 0, ty: 12 }, t2: { op: 0, ty: 12 }, t3: { op: 0, ty: 12 },
  block: { op: 0, ty: -220 },
  fillL0: hidden, fillL1: hidden, fillL2: hidden, fillL3: hidden,
  fillR0: hidden, fillR1: hidden, fillR2: hidden, fillR3: hidden,
  tsdL: hidden, tsdR: hidden, tsdLabelL: { op: 0, ty: 8 }, tsdLabelR: { op: 0, ty: 8 },
  known: hidden, putative: hidden, knownLabel: hidden, putLabel: hidden, confLabel: { op: 0, sc: 0.85 },
  sweep: hidden, identity: { op: 0, ty: 8 },
};

const swap = (from, to) => [
  [from, { op: 0, ty: -12 }, 0, 400],
  [to, { op: 1, ty: 0 }, 300, 500],
];

// Overhangs fill in one base at a time.
const fill = (side, start) => [0, 1, 2, 3].map((k) => [`fill${side}${k}`, { op: 1 }, start + k * 220, 600]);

const TIMELINES = [
  null,
  [ // 1 · staggered cut, TE inserts
    ...swap("t0", "t1"),
    ["origBonds", { op: 0 }, 700, 400],
    ["L", { tx: -PULL }, 900, 1100, EASE_IN_OUT],
    ["R", { tx: PULL }, 900, 1100, EASE_IN_OUT],
    ["block", { op: 1 }, 2100, 400],
    ["block", { ty: 0 }, 2100, 900, EASE],
  ],
  [ // 2 · fill in, TSDs
    ...swap("t1", "t2"),
    ...fill("L", 700),
    ...fill("R", 700),
    ["tsdL", { op: 1 }, 2600, 700],
    ["tsdR", { op: 1 }, 2600, 700],
    ["tsdLabelL", { op: 1, ty: 0 }, 3000, 500],
    ["tsdLabelR", { op: 1, ty: 0 }, 3000, 500],
  ],
  [ // 3 · TEs look like other TEs
    ...swap("t2", "t3"),
    ["L", { op: 0 }, 0, 600],
    ["R", { op: 0 }, 0, 600],
    ["block", { op: 0 }, 0, 600],
    ["tsdLabelL", { op: 0 }, 0, 400],
    ["tsdLabelR", { op: 0 }, 0, 400],
    ["known", { op: 1 }, 800, 600],
    ["knownLabel", { op: 1 }, 800, 600],
    ["putative", { op: 1 }, 1500, 900],
    ["putLabel", { op: 1 }, 1500, 900],
    ["sweep", { op: 1 }, 2700, 250],
    ["sweep", { tx: 520 }, 2700, 1500, EASE_IN_OUT],
    ["sweep", { op: 0 }, 4100, 350],
    ["identity", { op: 1, ty: 0 }, 4500, 500],
    ["putLabel", { op: 0 }, 5100, 300],
    ["confLabel", { op: 1, sc: 1 }, 5300, 450, SPRING],
  ],
];

export const initTeLook = () => createStepper(document.getElementById("te-look"), INITIAL, TIMELINES);
