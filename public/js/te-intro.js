/* "What are transposable elements" slide (presenter screen only).

   Click 1: retrotransposition: a circle reads the TE, an RNA copy (line + dot) appears,
            the old locus is replaced by a fresh grey site, which splits, and the copy slots in
   Click 2: transposition: circles grab the TE's ends, it lifts out, the old site fades,
            a new site appears, splits, and the TE slots in */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const SPLIT = 160; // half the TE length: how far each half of a target site moves apart
const DROP = 120;  // RNA/TE row (y=530) down to the genome row (y=650)

const STATE0 = {
  t0: { op: 1 }, t1: { op: 0, ty: 12 }, t2: { op: 0, ty: 12 },
  genome: { op: 1 }, labels: { op: 1 },
  poly: { op: 0, tx: -180 },
  rna: { op: 0 }, rnaDot: { op: 1 }, cL: { op: 0, sc: 0.3 }, cR: { op: 0, sc: 0.3 },
  s1L: { op: 0 }, s1R: { op: 0 }, s2L: { op: 0 }, s2R: { op: 0 },
};

// Timelines: [element, change, start ms, duration ms, easing]
const TIMELINES = [
  null,
  [ // 1 · retrotransposition
    ["t0", { op: 0, ty: -12 }, 0, 400, EASE],
    ["labels", { op: 0 }, 0, 400, EASE],
    ["t1", { op: 1, ty: 0 }, 300, 500, EASE],
    ["poly", { op: 1 }, 500, 250, EASE],
    ["poly", { tx: 180 }, 500, 1500, EASE_IN_OUT],
    ["poly", { op: 0 }, 1800, 300, EASE],
    ["rna", { op: 1 }, 2100, 700, EASE],
    ["genome", { op: 0 }, 3100, 700, EASE],
    ["s1L", { op: 1 }, 3100, 700, EASE],
    ["s1R", { op: 1 }, 3100, 700, EASE],
    ["s1L", { tx: -SPLIT }, 4100, 800, EASE_IN_OUT],
    ["s1R", { tx: SPLIT }, 4100, 800, EASE_IN_OUT],
    ["rnaDot", { op: 0 }, 4700, 350, EASE],
    ["rna", { ty: DROP }, 4800, 900, EASE],
  ],
  [ // 2 · transposition
    ["t1", { op: 0, ty: -12 }, 0, 400, EASE],
    ["t2", { op: 1, ty: 0 }, 300, 500, EASE],
    ["cL", { op: 1, sc: 1 }, 600, 450, SPRING],
    ["cR", { op: 1, sc: 1 }, 600, 450, SPRING],
    ["rna", { ty: DROP - 160 }, 1300, 1000, EASE_IN_OUT],
    ["s1L", { op: 0 }, 2300, 700, EASE],
    ["s1R", { op: 0 }, 2300, 700, EASE],
    ["s2L", { op: 1 }, 3100, 700, EASE],
    ["s2R", { op: 1 }, 3100, 700, EASE],
    ["s2L", { tx: -SPLIT }, 4000, 800, EASE_IN_OUT],
    ["s2R", { tx: SPLIT }, 4000, 800, EASE_IN_OUT],
    ["rna", { ty: DROP }, 4600, 900, EASE],
  ],
];

export const initTeIntro = () => createStepper(document.getElementById("te-intro"), STATE0, TIMELINES);
