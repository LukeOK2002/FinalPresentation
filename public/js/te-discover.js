/* "Discovering new TE families with REPrise and RepeatModeler" slide (presenter screen only).

   Start:   four 5-mers ("both tools search commonly reoccurring k-mers")
   Click 1: exact counts (RepeatModeler): bars grow
   Click 2: inexact counts (REPrise): two 1-mismatch neighbours join each k-mer and the bars grow
   Click 3: the chart fades; three short yellow seeds appear on a grey genome
   Click 4: the seeds extend in unison, lift out of the genome and line up together; when that
            has finished the new consensus (f9be00) appears on top of them (no click)
   Click 5: the copies and consensus fade; the copies in the genome are masked (black) */

import { createStepper, chain, EASE, EASE_IN_OUT } from "./stepper.js";

// copy: left x in the genome, and where it ends up in the aligned stack (all at x=740)
const COPIES = { A: { x: 330, y: 520 }, B: { x: 740, y: 480 }, C: { x: 1110, y: 440 } };
const GENOME_Y = 640;

const hidden = { op: 0 };
const K = [0, 1, 2, 3]; // k-mer rows

const INITIAL = {
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((k) => [`t${k}`, { op: 0, ty: 12 }])),
  ...Object.fromEntries(K.flatMap((i) => [
    [`n${i}a`, { op: 0, tx: 10 }], [`n${i}b`, { op: 0, tx: 10 }],
    [`e${i}`, { sx: 0 }], [`x${i}`, { sx: 0 }], [`ce${i}`, hidden], [`ci${i}`, hidden],
  ])),
  genome: hidden, segA: { op: 0, sx: 0.5 }, segB: { op: 0, sx: 0.5 }, segC: { op: 0, sx: 0.5 }, // seeds start half length
  cA: hidden, cB: hidden, cC: hidden, mA: hidden, mB: hidden, mC: hidden,
  cons: { op: 0, ty: 390 - GENOME_Y - 14 }, consLabel: { op: 0, tx: -8 },
};

const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];

const NAMES = Object.keys(COPIES);

const SEEDS = [ // 3 · the frequent k-mers are seeds: short yellow stretches on the genome
  ...swap("t2", "t3"),
  ...K.flatMap((i) => [`lbl${i}`, `n${i}a`, `n${i}b`, `e${i}`, `x${i}`, `ci${i}`]).map((id) => [id, { op: 0 }, 0, 600]),
  ["genome", { op: 1 }, 700, 600],
  ...NAMES.map((n, i) => [`seg${n}`, { op: 1 }, 1400 + i * 250, 500]),
];

const EXTEND = [ // 4 · the seeds extend in unison, then all three lift out of the genome and line up together
  ...swap("t3", "t4"),
  ...NAMES.map((n) => [`seg${n}`, { sx: 1 }, 800, 1100, EASE]),
  ...Object.entries(COPIES).flatMap(([n, c]) => [
    [`c${n}`, { op: 1 }, 2300, 300],
    [`c${n}`, { ty: -80 }, 2300, 500, EASE],
    [`c${n}`, { tx: 740 - c.x, ty: c.y - GENOME_Y }, 3000, 900, EASE_IN_OUT],
  ]),
];

const CONSENSUS = [ // the new consensus is built once the alignment has finished
  ...swap("t4", "t5"),
  ["cons", { op: 1, ty: 390 - GENOME_Y }, 600, 700, EASE],
  ["consLabel", { op: 1, tx: 0 }, 900, 500],
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
  SEEDS,
  chain(EXTEND, CONSENSUS, 400), // 4 · extend, align, then (no click) the consensus appears
  [ // 5 · mask what was found
    ...swap("t5", "t6"),
    ...["cA", "cB", "cC", "cons", "consLabel"].map((id) => [id, { op: 0 }, 0, 600]),
    ["mA", { op: 1 }, 900, 400], ["mB", { op: 1 }, 1150, 400], ["mC", { op: 1 }, 1400, 400],
  ],
];

export const initTeDiscover = () => createStepper(document.getElementById("te-discover"), INITIAL, TIMELINES);
