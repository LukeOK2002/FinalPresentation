/* "Discovering new TE families with REPrise and RepeatModeler" slide (presenter screen only).

   Click 1: a white line scans the genome; each related copy is lifted out and the three line up
   Click 2: a new consensus (f9be00) appears on top of them
   Click 3: the copies and consensus fade; the copies in the genome are masked (black)
   Click 4: text only: REPrise
   Click 5: the genome fades; four 5-mers appear
   Click 6: exact counts (RepeatModeler): bars grow
   Click 7: inexact counts (REPrise): two 1-mismatch neighbours join each k-mer and the bars grow */

import { createStepper, EASE, EASE_IN_OUT } from "./stepper.js";

const SCAN_FROM = 160, SCAN_TO = 1440;
const SCAN_AT = 600, SCAN_RUN = 3000;
// copy: left x in the genome, and where it ends up in the aligned stack (all at x=740)
const COPIES = { A: { x: 330, y: 520 }, B: { x: 740, y: 480 }, C: { x: 1110, y: 440 } };
const GENOME_Y = 640, LEN = 120;

const passes = (x) => SCAN_AT + (SCAN_RUN * (x + LEN / 2 - SCAN_FROM)) / (SCAN_TO - SCAN_FROM);
const hidden = { op: 0 };
const K = [0, 1, 2, 3]; // k-mer rows

const INITIAL = {
  t1: { op: 0, ty: 12 }, t2: { op: 0, ty: 12 }, t3: { op: 0, ty: 12 }, t4: { op: 0, ty: 12 },
  t5: { op: 0, ty: 12 }, t6: { op: 0, ty: 12 }, t7: { op: 0, ty: 12 },
  ...Object.fromEntries(K.flatMap((i) => [
    [`lbl${i}`, { op: 0, tx: -10 }], [`n${i}a`, { op: 0, tx: 10 }], [`n${i}b`, { op: 0, tx: 10 }],
    [`e${i}`, { sx: 0 }], [`x${i}`, { sx: 0 }], [`ce${i}`, hidden], [`ci${i}`, hidden],
  ])),
  cA: hidden, cB: hidden, cC: hidden, mA: hidden, mB: hidden, mC: hidden,
  cons: { op: 0, ty: 390 - GENOME_Y - 14 }, consLabel: { op: 0, tx: -8 },
  scan: hidden,
};

const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];

const TIMELINES = [
  null,
  [ // 1 · scan, lift and line up the copies
    ...swap("t0", "t1"),
    ["scan", { op: 1 }, SCAN_AT - 200, 200],
    ["scan", { tx: SCAN_TO - SCAN_FROM }, SCAN_AT, SCAN_RUN, "linear"],
    ["scan", { op: 0 }, SCAN_AT + SCAN_RUN, 250],
    ...Object.entries(COPIES).flatMap(([n, c]) => [
      [`c${n}`, { op: 1 }, passes(c.x), 300],
      [`c${n}`, { ty: -80 }, passes(c.x), 500, EASE],
      [`c${n}`, { tx: 740 - c.x, ty: c.y - GENOME_Y }, SCAN_AT + SCAN_RUN + 400, 900, EASE_IN_OUT],
    ]),
  ],
  [ // 2 · consensus on top
    ...swap("t1", "t2"),
    ["cons", { op: 1, ty: 390 - GENOME_Y }, 600, 700, EASE],
    ["consLabel", { op: 1, tx: 0 }, 900, 500],
  ],
  [ // 3 · mask what was found
    ...swap("t2", "t3"),
    ...["cA", "cB", "cC", "cons", "consLabel"].map((id) => [id, { op: 0 }, 0, 600]),
    ["mA", { op: 1 }, 900, 400], ["mB", { op: 1 }, 1150, 400], ["mC", { op: 1 }, 1400, 400],
  ],
  [ // 4 · REPrise
    ...swap("t3", "t4"),
  ],
  [ // 5 · k-mers
    ...swap("t4", "t5"),
    ...["genome", "mA", "mB", "mC"].map((id) => [id, { op: 0 }, 0, 600]),
    ...K.map((i) => [`lbl${i}`, { op: 1, tx: 0 }, 700 + i * 150, 500]),
  ],
  [ // 6 · exact counts
    ...swap("t5", "t6"),
    ...K.flatMap((i) => [
      [`e${i}`, { sx: 1 }, 700 + i * 200, 1000, EASE],
      [`ce${i}`, { op: 1 }, 1500 + i * 200, 400],
    ]),
  ],
  [ // 7 · inexact counts
    ...swap("t6", "t7"),
    ...K.flatMap((i) => [
      [`n${i}a`, { op: 1, tx: 0 }, 700 + i * 180, 450],
      [`n${i}b`, { op: 1, tx: 0 }, 900 + i * 180, 450],
      [`ce${i}`, { op: 0 }, 1700 + i * 180, 250],
      [`x${i}`, { sx: 1 }, 1700 + i * 180, 1000, EASE],
      [`ci${i}`, { op: 1 }, 2500 + i * 180, 400],
    ]),
  ],
];

export const initTeDiscover = () => createStepper(document.getElementById("te-discover"), INITIAL, TIMELINES);
