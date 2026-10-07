/* "But why were these copies missed in the first place?" slide (presenter screen only).

   Click 1: text only (RepeatMasker documentation)
   Click 2: RepeatMasker scans a genome; the alignment score climbs base by base (dipping at
            mismatches) and crosses the fixed Smith-Waterman threshold of 225; the copy turns yellow
   Click 3: a short copy is scanned; its score tops out below 225 and it stays grey
   Click 4: text only; the scan fades
   Click 5: a white line passes over the locus; GC = 45%; the 45% GC scoring matrix appears
   Click 6: zoom out: the window grows from 1 kb to 60 kb while GC wanders 45.3% → 48%
   Click 7: 60 kb / 48% GC (left) vs 1 kb / 45% GC (right): the same alignment is scored
            position by position with each matrix: 214 (missed) vs 231 (detected)

   Scores, matrices and the GC trace are illustrative; 225, 45%/48%, 214 and 231 are Luke's. */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const GREY = "#5c6773", Y = "#f9be00", PALE = "#f5dd93";
const fmt = (n) => n.toLocaleString("en-IE");
const range = (n) => Array.from({ length: n }, (_, i) => i);

/* ---- clicks 2-3: scan + score plot ---- */
const G0 = 200, G1 = 1400, GY = 490, SCAN_MS = 4200, SCAN_AT = 700;
const PY0 = 810, PSC = 0.8, THRESH = 225;            // plot baseline, px per score point
const py = (s) => PY0 - s * PSC;
const BASE = 10;                                     // px per base
// per-base score changes: matches +10, mismatches -15 (local alignment never drops below 0)
const LONG = { x: 640, steps: range(36).map((i) => ([5, 13, 20, 29].includes(i) ? -15 : 10)) };
const SHORT = { x: 740, steps: range(14).map((i) => (i === 6 ? -15 : 10)) };
const cum = (steps) => steps.reduce((a, d) => [...a, Math.max(0, a[a.length - 1] + d)], [0]);
const boxAt = (x) => SCAN_AT + (SCAN_MS * (x - G0)) / (G1 - G0); // when the box centre reaches x

/* ---- clicks 5-7: GC and scoring matrices ---- */
const B = ["A", "C", "G", "T"];
const M45 = [[9, -15, -6, -17], [-15, 10, -15, -6], [-6, -15, 10, -15], [-17, -6, -15, 9]];
const M48 = [[10, -15, -6, -17], [-15, 9, -15, -6], [-6, -15, 9, -15], [-17, -6, -15, 10]];
// one alignment, scored with each matrix: [query base, reference base]
const ALN = ["GG", "CC", "GG", "AA", "CC", "GT", "CC", "GG", "TT", "GG", "CC", "GA"].map(([q, r]) => [B.indexOf(q), B.indexOf(r)]);
const scored = (M, target) => {
  const raw = cum(ALN.map(([q, r]) => M[q][r])).slice(1);
  return raw.map((v) => Math.round((v * target) / raw[raw.length - 1])); // scaled so the total is Luke's score
};
const SC48 = scored(M48, 214), SC45 = scored(M45, 231);
const ZOOM = [["1 kb", "45.3"], ["5 kb", "46.1"], ["10 kb", "44.8"], ["20 kb", "47.2"], ["30 kb", "46.5"], ["40 kb", "48.4"], ["50 kb", "47.7"], ["60 kb", "48.0"]];
const STEP_MS = 380;

const line = (x1, x2, y, c, extra = "") => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" style="stroke:${c}" ${extra}/>`;
const T = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${s}</text>`;

function matrix(id, M, cx, top, cell, title) {
  const x0 = cx - 2 * cell;
  let h = `<g data-a="${id}">` + T(cx, top - cell * 0.9 - 26, title, "ms-mtitle");
  B.forEach((b, i) => {
    h += T(x0 + cell * (i + 0.5), top - cell * 0.35, b, "ms-mhead") + T(x0 - cell * 0.4, top + cell * (i + 0.5), b, "ms-mhead");
  });
  M.forEach((row, r) => row.forEach((v, c) => {
    const x = x0 + c * cell, y = top + r * cell, cls = v > 0 ? "ms-pos" : v > -10 ? "ms-mid" : "ms-neg";
    h += `<rect class="ms-cell ${cls}" x="${x + 2}" y="${y + 2}" width="${cell - 4}" height="${cell - 4}" rx="6"/>` +
      T(x + cell / 2, y + cell / 2, v > 0 ? `+${v}` : `−${-v}`, `ms-val ${v > 0 ? "ms-val-pos" : ""}`, `style="font-size:${cell * 0.36}px"`);
  }));
  return h + `</g>`;
}
const highlights = (id, cx, top, cell) => {
  const x0 = cx - 2 * cell;
  return range(16).map((k) => `<rect data-a="${id}${k}" class="ms-hl" x="${x0 + (k % 4) * cell + 1}" y="${top + Math.floor(k / 4) * cell + 1}" width="${cell - 2}" height="${cell - 2}" rx="7"/>`).join("");
};

function build(svg) {
  let h = "";
  // genome, the two copies, the scanning box
  h += `<g data-a="scan">` + line(G0, G1, GY, GREY, `class="ms-seq"`) +
    `<line data-a="longHit" class="ms-seq" x1="${LONG.x}" y1="${GY}" x2="${LONG.x + LONG.steps.length * BASE}" y2="${GY}" style="stroke:${Y}"/>` +
    // plot axes and the threshold
    `<line class="ms-axis" x1="${G0}" y1="${PY0}" x2="${G1}" y2="${PY0}"/><line class="ms-axis" x1="${G0}" y1="${PY0}" x2="${G0}" y2="${py(290)}"/>` +
    T(G0 - 14, PY0, "0", "ms-tick ms-end") + T(G0 - 14, py(THRESH), "225", "ms-tick ms-end") +
    `<line class="ms-thresh" x1="${G0}" y1="${py(THRESH)}" x2="${G1}" y2="${py(THRESH)}"/>` +
    T(G1, py(THRESH) - 18, "Smith–Waterman score threshold (225)", "ms-tick ms-end") +
    T(G0 - 60, (PY0 + py(290)) / 2, "Score", "ms-tick", `transform="rotate(-90 ${G0 - 60} ${(PY0 + py(290)) / 2})"`);
  const trace = (id, el) => {
    const c = cum(el.steps);
    return `<g data-a="${id}">` + el.steps.map((_, i) =>
      `<line data-a="${id}${i}" class="ms-trace" x1="${el.x + i * BASE}" y1="${py(c[i])}" x2="${el.x + (i + 1) * BASE}" y2="${py(c[i + 1])}"/>`).join("") + `</g>`;
  };
  h += trace("lt", LONG) + trace("st", SHORT);
  h += `<g data-a="box"><rect class="rm-beam" x="700" y="${GY - 48}" width="200" height="56"/>` +
    `<rect class="rm-box" x="700" y="${GY - 118}" width="200" height="70" rx="12"/>` + T(800, GY - 83, "RepeatMasker", "ms-box") + `</g>` +
    T(LONG.x + 180, GY + 44, "Detected ✅", "ms-out ms-yes", `data-a="longOk"`) +
    T(SHORT.x + 70, GY + 44, "Below threshold: not annotated", "ms-out", `data-a="shortNo"`) + `</g>`;

  // click 5: GC of the locus, then its scoring matrix
  h += `<g data-a="gc">` + line(300, 700, 450, GREY, `class="ms-seq"`) + line(700, 900, 450, Y, `class="ms-seq"`) + line(900, 1300, 450, GREY, `class="ms-seq"`) +
    `<line data-a="gcSweep" class="ms-sweep" x1="300" y1="415" x2="300" y2="485"/>` + T(800, 510, "GC content: 45%", "ms-gc", `data-a="gcVal"`) + `</g>`;
  h += matrix("m45", M45, 800, 650, 50, "45% GC scoring matrix");

  // click 6: zoom out
  h += `<g data-a="zoom">` + line(300, 1300, 470, GREY, `class="ms-seq"`) +
    `<line data-a="zEl" class="ms-seq" x1="650" y1="470" x2="950" y2="470" style="stroke:${Y}"/>` +
    `<path class="ms-bracket" d="M300 420 v-12 H1300 v12"/>` +
    ZOOM.map(([w, gc], i) => `<g data-a="z${i}">${T(800, 386, `GC window: ${w}`, "ms-win")}${T(800, 530, `GC: ${gc}%`, "ms-gc")}</g>`).join("") + `</g>`;

  // click 7: the same alignment scored under each matrix
  const side = (id, cx, label, elW, M, scores, ok) => {
    let s = `<g data-a="${id}">` + T(cx, 360, label, "ms-side") + line(cx - 260, cx + 260, 410, GREY, `class="ms-seq"`) +
      `<line class="ms-seq" x1="${cx - elW / 2}" y1="410" x2="${cx + elW / 2}" y2="410" style="stroke:${PALE}"/>` +
      `<line data-a="${id}El" class="ms-seq" x1="${cx - elW / 2}" y1="410" x2="${cx + elW / 2}" y2="410" style="stroke:${ok ? Y : GREY}"/>` +
      matrix(`${id}M`, M, cx, 520, 44, "") + highlights(`${id}H`, cx, 520, 44) +
      scores.map((v, k) => T(cx, 740, `Score: ${v}`, "ms-score", `data-a="${id}S${k}"`)).join("") +
      T(cx, 790, ok ? "231 ≥ 225 · detected ✅" : "214 < 225 · not detected", `ms-out ${ok ? "ms-yes" : ""}`, `data-a="${id}Out"`) + `</g>`;
    return s;
  };
  h += side("L", 440, "60 kb batch · 48% GC", 8, M48, SC48, false) + side("R", 1160, "1 kb batch · 45% GC", 200, M45, SC45, true);
  svg.innerHTML = h;
}

/* ---- timelines ---- */
const hidden = { op: 0 };
const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];
const traceIn = (id, el, scanAt) => el.steps.map((_, i) => [`${id}${i}`, { op: 1 }, scanAt + (SCAN_MS * (el.x + (i + 1) * BASE - G0)) / (G1 - G0) - SCAN_AT, 60]);
const crossAt = (() => { const c = cum(LONG.steps); return c.findIndex((v) => v >= THRESH); })();

const INITIAL = {
  ...Object.fromEntries(range(7).map((k) => [`t${k + 1}`, { op: 0, ty: 12 }])),
  scan: hidden, longHit: hidden, longOk: { op: 0, sc: 0.8 }, shortNo: { op: 0, ty: 8 }, box: { tx: G0 - 800 },
  ...Object.fromEntries(LONG.steps.map((_, i) => [`lt${i}`, hidden])), ...Object.fromEntries(SHORT.steps.map((_, i) => [`st${i}`, hidden])),
  gc: hidden, gcSweep: hidden, gcVal: { op: 0, ty: 8 }, m45: { op: 0, sc: 0.92 },
  zoom: hidden, ...Object.fromEntries(ZOOM.map((_, i) => [`z${i}`, i ? hidden : {}])),
  L: hidden, R: hidden, LOut: { op: 0, ty: 8 }, ROut: { op: 0, ty: 8 }, REl: hidden, LEl: hidden,
  ...Object.fromEntries(["L", "R"].flatMap((s) => [...range(16).map((k) => [`${s}H${k}`, hidden]), ...ALN.map((_, k) => [`${s}S${k}`, hidden])])),
};

const scanBox = (at) => [
  ["box", { tx: G0 - 800 }, at - 300, 1],
  ["box", { tx: G1 - 800 }, at, SCAN_MS, "linear"],
];

const COUNT_AT = 1500;
const countUp = (s) => ALN.flatMap(([q, r], k) => {
  const t = COUNT_AT + k * STEP_MS, cell = `${s}H${q * 4 + r}`;
  return [
    [cell, { op: 1 }, t, 90], [cell, { op: 0 }, t + 220, 140],
    ...(k ? [[`${s}S${k - 1}`, { op: 0 }, t, 60]] : []), [`${s}S${k}`, { op: 1 }, t, 60],
  ];
});
const END = COUNT_AT + ALN.length * STEP_MS;

const TIMELINES = [
  null,
  [...swap("t0", "t1")],
  [ // 2 · fixed threshold
    ...swap("t1", "t2"),
    ["scan", { op: 1 }, 400, 400],
    ...scanBox(SCAN_AT),
    ...traceIn("lt", LONG, SCAN_AT),
    ["longHit", { op: 1 }, boxAt(LONG.x + crossAt * BASE), 300],
    ["longOk", { op: 1, sc: 1 }, boxAt(LONG.x + crossAt * BASE) + 200, 500, SPRING],
  ],
  [ // 3 · a short copy never gets there
    ...swap("t2", "t3"),
    ["lt", { op: 0 }, 0, 400], ["longHit", { op: 0 }, 0, 400], ["longOk", { op: 0 }, 0, 400],
    ["box", { op: 0 }, 0, 300], ["box", { op: 1 }, 450, 250],   // hidden while it jumps back to the start
    ...scanBox(SCAN_AT),
    ...traceIn("st", SHORT, SCAN_AT),
    ["shortNo", { op: 1, ty: 0 }, boxAt(SHORT.x + SHORT.steps.length * BASE) + 300, 500, EASE],
  ],
  [...swap("t3", "t4"), ["scan", { op: 0 }, 0, 600], ["st", { op: 0 }, 0, 600]],
  [ // 5 · GC% picks the matrix
    ...swap("t4", "t5"),
    ["gc", { op: 1 }, 400, 500],
    ["gcSweep", { op: 1 }, 1000, 150], ["gcSweep", { tx: 1000 }, 1100, 1800, "linear"], ["gcSweep", { op: 0 }, 2900, 200],
    ["gcVal", { op: 1, ty: 0 }, 2900, 500, EASE],
    ["m45", { op: 1, sc: 1 }, 3300, 700, EASE],
  ],
  [ // 6 · GC is measured over 56-60 kb batches
    ...swap("t5", "t6"),
    ["gc", { op: 0 }, 0, 500], ["m45", { op: 0 }, 0, 500],
    ["zoom", { op: 1 }, 600, 500],
    ["zEl", { sx: 0.02 }, 1300, ZOOM.length * 450, EASE_IN_OUT],
    ...ZOOM.slice(1).flatMap((_, j) => {
      const i = j + 1, t = 1300 + i * 450;
      return [[`z${i - 1}`, { op: 0 }, t, 120], [`z${i}`, { op: 1 }, t, 120]];
    }),
  ],
  [ // 7 · same alignment, two matrices
    ...swap("t6", "t7"),
    ["zoom", { op: 0 }, 0, 500],
    ["L", { op: 1 }, 600, 500], ["R", { op: 1 }, 600, 500],
    ...countUp("L"), ...countUp("R"),
    ["REl", { op: 1 }, END + 200, 500], ["LEl", { op: 1 }, END + 200, 500],
    ["LOut", { op: 1, ty: 0 }, END + 400, 500, EASE], ["ROut", { op: 1, ty: 0 }, END + 400, 500, EASE],
  ],
];

export function initTeMissed() {
  const slide = document.getElementById("te-missed");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
