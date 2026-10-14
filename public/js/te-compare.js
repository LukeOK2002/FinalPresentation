/* "How does this reannotation compare to the published annotation?" slide (presenter screen only).

   Start:   the RepeatMasker reannotation: a grey genome with yellow repeat intervals
   Click 1: the published annotation fades in below, already missing two intervals
   Click 2: a white line drops through each reannotated interval to compare the two tracks
   Click 3: the intervals with no published counterpart are circled

   The comparison lines are horizontal lines inside a rotate(90) wrapper, so the stepper's
   horizontal scale (sx) grows them vertically. */

import { createStepper, EASE, SPRING } from "./stepper.js";

export const INTERVALS = [[560, 610], [660, 720], [790, 830], [900, 970], [1030, 1070], [1130, 1200], [1260, 1300], [1360, 1420]];
export const NOVEL = [2, 5];      // not in the published annotation

const swap = (from, to) => [...(from ? [[from, { op: 0, ty: -12 }, 0, 400]] : []), [to, { op: 1, ty: 0 }, 300, 500]];

const INITIAL = {
  t2: { op: 0, ty: 12 }, t3: { op: 0, ty: 12 },
  pub: { op: 0 }, pubLabel: { op: 0, tx: -10 },
  ...Object.fromEntries(INTERVALS.map((_, i) => [`v${i}`, { op: 0, sx: 0 }])),
  ...Object.fromEntries(NOVEL.map((i) => [`ring${i}`, { op: 0, sc: 0.6 }])),
};

const TIMELINES = [
  null,
  [ // 1 · the published annotation
    ["pub", { op: 1 }, 0, 700],
    ["pubLabel", { op: 1, tx: 0 }, 200, 600, EASE],
  ],
  [ // 2 · compare: a white line through each interval
    ...swap(null, "t2"),
    ...INTERVALS.map((_, i) => [`v${i}`, { op: 1, sx: 1 }, 700 + i * 140, 500, EASE]),
  ],
  [ // 3 · circle the new loci
    ...swap("t2", "t3"),
    ...NOVEL.map((i, k) => [`ring${i}`, { op: 1, sc: 1 }, 700 + k * 300, 600, SPRING]),
  ],
];

export const initTeCompare = () => createStepper(document.getElementById("te-compare"), INITIAL, TIMELINES);
