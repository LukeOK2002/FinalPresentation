/* "TEs are split into different families" slide (presenter screen only).

   Click 1: family lines fade; five TE copies appear and the consensus is built one
            column at a time: the column's most common base lights up in every copy,
            then drops into the consensus row
   Click 2: Dfam "Browse" table (real entries)
   Click 3: everything fades; the open question, large and centred */

import { createStepper, EASE, EASE_IN_OUT } from "./stepper.js";

const COPIES = ["ATAGCGCGA", "ATAGCGCGC", "TTAGTCGGA", "ATAGTCGGA", "ATAGCCGGA"];
const COLS = COPIES[0].length;
const W = 60;          // column width (matches the markup)
const ROWS = 9;        // Dfam table rows
const COL_START = 1500;
const COL_EVERY = 620; // ms per column

const consensus = [...Array(COLS)].map((_, j) => {
  const col = COPIES.map((s) => s[j]);
  return [..."ACGT"].reduce((best, b) => (col.filter((x) => x === b).length > col.filter((x) => x === best).length ? b : best));
});
const hits = (j) => COPIES.map((s, r) => (s[j] === consensus[j] ? `h${r}_${j}` : null)).filter(Boolean);
const allHits = [...Array(COLS)].flatMap((_, j) => hits(j));
const cons = [...Array(COLS)].map((_, j) => `c${j}`);
const rows = [...Array(ROWS)].map((_, i) => `row${i}`);

const INITIAL = {
  t1: { op: 0, ty: 12 }, t2: { op: 0, ty: 12 },
  copies: { op: 0, ty: 10 }, copiesLabel: { op: 0 }, consLabel: { op: 0 }, consRule: { op: 0 },
  colMark: { op: 0 },
  ...Object.fromEntries(allHits.map((h) => [h, { op: 0 }])),
  ...Object.fromEntries(cons.map((c) => [c, { op: 0, ty: -14 }])),
  dfam: { op: 0, ty: 20 },
  ...Object.fromEntries(rows.map((r) => [r, { op: 0, ty: 6 }])),
  q1: { op: 0, ty: 16 }, q2: { op: 0, ty: 16 },
};

const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];

function buildConsensus() {
  const segs = [["colMark", { op: 1 }, COL_START - 250, 250]];
  for (let j = 0; j < COLS; j++) {
    const t = COL_START + j * COL_EVERY;
    if (j > 0) segs.push(["colMark", { tx: j * W }, t - 200, 220, EASE_IN_OUT]);
    for (const h of hits(j)) {
      segs.push([h, { op: 1 }, t + 40, 180]);
      segs.push([h, { op: 0 }, t + 480, 260]);
    }
    segs.push([`c${j}`, { op: 1, ty: 0 }, t + 260, 260]);
  }
  segs.push(["colMark", { op: 0 }, COL_START + COLS * COL_EVERY - 100, 300]);
  return segs;
}

const TIMELINES = [
  null,
  [ // 1 · consensus, column by column
    ...swap("t0", "t1"),
    ["fams", { op: 0 }, 0, 600],
    ["famLabels", { op: 0 }, 0, 600],
    ["copies", { op: 1, ty: 0 }, 700, 600],
    ["copiesLabel", { op: 1 }, 700, 600],
    ["consRule", { op: 1 }, 1000, 500],
    ["consLabel", { op: 1 }, 1000, 500],
    ...buildConsensus(),
  ],
  [ // 2 · Dfam
    ...swap("t1", "t2"),
    ...["copies", "copiesLabel", "consLabel", "consRule", ...cons].map((id) => [id, { op: 0 }, 0, 500]),
    ["dfam", { op: 1, ty: 0 }, 600, 600],
    ...rows.map((r, i) => [r, { op: 1, ty: 0 }, 900 + i * 90, 350]),
  ],
  [ // 3 · the question
    ...["title", "t2", "dfam"].map((id) => [id, { op: 0 }, 0, 600]),
    ["q1", { op: 1, ty: 0 }, 700, 800, EASE],
    ["q2", { op: 1, ty: 0 }, 1300, 800, EASE],
  ],
];

export const initTeFamilies = () => createStepper(document.getElementById("te-families"), INITIAL, TIMELINES);
