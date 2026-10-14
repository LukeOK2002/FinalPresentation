/* "Discovering new TE families with REPrise and RepeatModeler" slide (presenter screen only).

   Start:   four 5-mers ("both tools search commonly reoccurring k-mers")
   Click 1: exact counts (RepeatModeler): bars grow
   Click 2: inexact counts (REPrise): two 1-mismatch neighbours join each k-mer and the bars grow
   Click 3: the chart fades; a white line scans a grey genome and three related copies light up
   Click 4: the line scans again; each copy is lifted out and the three line up
   Click 5: a new consensus (f9be00) appears on top of them
   Click 6: the copies and consensus fade; the copies in the genome are masked (black) */

import { createStepper, EASE, EASE_IN_OUT } from "./stepper.js";

const SCAN_FROM = 160, SCAN_TO = 1440, SCAN_RUN = 3000;
// copy: left x in the genome, and where it ends up in the aligned stack (all at x=740)
const COPIES = { A: { x: 330, y: 520 }, B: { x: 740, y: 480 }, C: { x: 1110, y: 440 } };
const GENOME_Y = 640, LEN = 120;

const passes = (start, x) => start + (SCAN_RUN * (x + LEN / 2 - SCAN_FROM)) / (SCAN_TO - SCAN_FROM);
const hidden = { op: 0 };
const K = [0, 1, 2, 3]; // k-mer rows

const INITIAL = {
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((k) => [`t${k}`, { op: 0, ty: 12 }])),
  ...Object.fromEntries(K.flatMap((i) => [
    [`n${i}a`, { op: 0, tx: 10 }], [`n${i}b`, { op: 0, tx: 10 }],
    [`e${i}`, { sx: 0 }], [`x${i}`, { sx: 0 }], [`ce${i}`, hidden], [`ci${i}`, hidden],
  ])),
  genome: hidden, segA: hidden, segB: hidden, segC: hidden,
  cA: hidden, cB: hidden, cC: hidden, mA: hidden, mB: hidden, mC: hidden,
  cons: { op: 0, ty: 390 - GENOME_Y - 14 }, consLabel: { op: 0, tx: -8 },
  scan: hidden,
};

const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];

// one pass of the white scan line, starting at `at`
const scan = (at) => [
  ["scan", { tx: 0 }, at - 260, 1],
  ["scan", { op: 1 }, at - 200, 200],
  ["scan", { tx: SCAN_TO - SCAN_FROM }, at, SCAN_RUN, "linear"],
  ["scan", { op: 0 }, at + SCAN_RUN, 250],
];

const TIMELINES = [
  null,
  [ // 1 · exact counts
    ...swap("t0", "t1"),
    ...K.flatMap((i) => [
      [`e${i}`, { sx: 1 }, 700 + i * 200, 1000, EASE],
      [`ce${i}`, { op: 1 }, 1500 + i * 200, 400],
    ]),
  ],
  [ // 2 · inexact counts
    ...swap("t1", "t2"),
    ...K.flatMap((i) => [
      [`n${i}a`, { op: 1, tx: 0 }, 700 + i * 180, 450],
      [`n${i}b`, { op: 1, tx: 0 }, 900 + i * 180, 450],
      [`ce${i}`, { op: 0 }, 1700 + i * 180, 250],
      [`x${i}`, { sx: 1 }, 1700 + i * 180, 1000, EASE],
      [`ci${i}`, { op: 1 }, 2500 + i * 180, 400],
    ]),
  ],
  [ // 3 · scan the genome; the three copies light up
    ...swap("t2", "t3"),
    ...K.flatMap((i) => [`lbl${i}`, `n${i}a`, `n${i}b`, `e${i}`, `x${i}`, `ci${i}`]).map((id) => [id, { op: 0 }, 0, 600]),
    ["genome", { op: 1 }, 700, 600],
    ...scan(1500),
    ...Object.entries(COPIES).map(([n, c]) => [`seg${n}`, { op: 1 }, passes(1500, c.x), 400]),
  ],
  [ // 4 · scan again; lift the copies out and line them up
    ...swap("t3", "t4"),
    ...scan(600),
    ...Object.entries(COPIES).flatMap(([n, c]) => [
      [`c${n}`, { op: 1 }, passes(600, c.x), 300],
      [`c${n}`, { ty: -80 }, passes(600, c.x), 500, EASE],
      [`c${n}`, { tx: 740 - c.x, ty: c.y - GENOME_Y }, 600 + SCAN_RUN + 400, 900, EASE_IN_OUT],
    ]),
  ],
  [ // 5 · consensus on top
    ...swap("t4", "t5"),
    ["cons", { op: 1, ty: 390 - GENOME_Y }, 600, 700, EASE],
    ["consLabel", { op: 1, tx: 0 }, 900, 500],
  ],
  [ // 6 · mask what was found
    ...swap("t5", "t6"),
    ...["cA", "cB", "cC", "cons", "consLabel"].map((id) => [id, { op: 0 }, 0, 600]),
    ["mA", { op: 1 }, 900, 400], ["mB", { op: 1 }, 1150, 400], ["mC", { op: 1 }, 1400, 400],
  ],
];

export const initTeDiscover = () => createStepper(document.getElementById("te-discover"), INITIAL, TIMELINES);
