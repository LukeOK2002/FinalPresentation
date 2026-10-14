/* "But, RepeatModeler also finds repeats which aren't TEs" slide (presenter screen only).
   Four examples fill the quadrants in reading order, one per click:

   Click 1: satellite duplications: a grey / green / grey / blue stretch copies itself onto its end
   Click 2: simple repeats: a blue monomer extends monomer by monomer
   Click 3: higher order repeats: a blue / red / green trimer extends trimer by trimer
   Click 4: already known TE families: grey flanks part and a yellow TE grows between them */

import { createStepper, EASE, EASE_IN_OUT } from "./stepper.js";

const MONO = 48, TRI = 126; // pitch of one monomer / one trimer (px)
const M = [1, 2, 3, 4, 5, 6, 7, 8, 9], T = [1, 2, 3];
const hidden = { op: 0 };
const textIn = (q) => [[`q${q}t`, { op: 1, ty: 0 }, 0, 500]];

const INITIAL = {
  ...Object.fromEntries([1, 2, 3, 4].map((q) => [`q${q}t`, { op: 0, ty: 12 }])),
  dup: hidden, dupCopy: hidden,
  m0: hidden, ...Object.fromEntries(M.map((i) => [`m${i}`, { op: 0, tx: -MONO }])),
  tri0: hidden, ...Object.fromEntries(T.map((g) => [`tri${g}`, { op: 0, tx: -TRI }])),
  flankL: hidden, flankR: hidden, te: { op: 0, sx: 0 },
};

const TIMELINES = [
  null,
  [ // 1 · satellite duplications
    ...textIn(1),
    ["dup", { op: 1 }, 300, 500],
    ["dupCopy", { op: 1, ty: -28 }, 1100, 350, EASE],
    ["dup", { tx: -120 }, 1500, 900, EASE_IN_OUT],
    ["dupCopy", { tx: 120 }, 1500, 900, EASE_IN_OUT],
    ["dupCopy", { ty: 0 }, 2450, 350, EASE],
  ],
  [ // 2 · simple repeats
    ...textIn(2),
    ["m0", { op: 1 }, 300, 500],
    ...M.map((i) => [`m${i}`, { op: 1, tx: 0 }, 900 + (i - 1) * 220, 320, EASE]),
  ],
  [ // 3 · higher order repeats
    ...textIn(3),
    ["tri0", { op: 1 }, 300, 500],
    ...T.map((g) => [`tri${g}`, { op: 1, tx: 0 }, 900 + (g - 1) * 520, 480, EASE]),
  ],
  [ // 4 · already known TE families
    ...textIn(4),
    ["flankL", { op: 1 }, 300, 500], ["flankR", { op: 1 }, 300, 500],
    ["flankL", { tx: -80 }, 1100, 700, EASE_IN_OUT],
    ["flankR", { tx: 80 }, 1100, 700, EASE_IN_OUT],
    ["te", { op: 1, sx: 1 }, 1300, 700, EASE],
  ],
];

export const initTeRepeats = () => createStepper(document.getElementById("te-repeats"), INITIAL, TIMELINES);
