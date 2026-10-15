/* "What is the T2T-CHM13v2.0 assembly" slide (presenter screen only).

   Click 1: the hg38 line (grey, 5 gaps) appears and is labelled, a copy drops below,
            then lime green fills each gap in turn and the copy is labelled "T2T"
   Click 2: the text swaps to "Prior assemblies were missing the short arms…" */

import { createStepper, EASE, EASE_IN_OUT } from "./stepper.js";

const DROP = 200; // hg38 row (y=500) down to the T2T row (y=700)
const FILL_AT = 2500, FILL_STAGGER = 350, FILL_MS = 500;

const STATE0 = {
  t0: { op: 1 }, t1: { op: 0, ty: 12 },
  hg: { op: 0 }, hgLabel: { op: 0 },
  t2t: { op: 0, ty: -DROP }, t2tLabel: { op: 0 },
  f1: { sx: 0 }, f2: { sx: 0 }, f3: { sx: 0 }, f4: { sx: 0 }, f5: { sx: 0 },
};

// Timelines: [element, change, start ms, duration ms, easing]
const TIMELINES = [
  null,
  [ // 1 · gaps in hg38, filled in T2T
    ["hg", { op: 1 }, 0, 700, EASE],
    ["hgLabel", { op: 1 }, 400, 500, EASE],
    ["t2t", { op: 1 }, 1300, 10, EASE],            // the duplicate appears exactly over hg38
    ["t2t", { ty: 0 }, 1350, 900, EASE_IN_OUT],    // and drops to its own row
    ["t2tLabel", { op: 1 }, 2300, 500, EASE],
    ...[1, 2, 3, 4, 5].map((i) => [`f${i}`, { sx: 1 }, FILL_AT + 300 + (i - 1) * FILL_STAGGER, FILL_MS, EASE]),
  ],
  [ // 2 · text swap
    ["t0", { op: 0, ty: -12 }, 0, 400, EASE],
    ["t1", { op: 1, ty: 0 }, 300, 500, EASE],
  ],
];

export const initTeT2t = () => createStepper(document.getElementById("te-t2t"), STATE0, TIMELINES);
