/* "Comparing results by divergence" slide (presenter screen only).

   Click 1: graph title (centred text), y axis (0-100, labelled) and x axis (0-50, ticks every 5, no label)
   Click 2: x axis label
   Click 3: the ten bins' points appear left to right (at each 5% bin's midpoint)
   Click 4: the fitted 4-parameter logistic draws left to right; fit values appear

   Data: EngineGap/results/sensitivity_curve_pool1143.len20both.tsv; fit from the write-up's "Fits" section. */

import { createStepper, EASE, SPRING } from "./stepper.js";

const PTS = [ // [bin midpoint %, detected %, HMMER loci]
  [2.5, 99.8, 86030], [7.5, 99.8, 400733], [12.5, 99.5, 809314], [17.5, 98.6, 749049], [22.5, 94.9, 710806],
  [27.5, 85.6, 922810], [32.5, 68.9, 1171193], [37.5, 47.6, 856768], [42.5, 30.5, 213422], [47.5, 31.8, 13719],
];
const FIT = { L: 100.3, c: 18.6, x0: 34.68, k: 4.66, r2: 0.9995 };
const D = (x) => FIT.c + (FIT.L - FIT.c) / (1 + Math.exp((x - FIT.x0) / FIT.k));

const X0 = 330, X1 = 1390, Y0 = 790, Y1 = 350;              // plot box (0% at Y0, 100% at Y1)
const sx = (x) => X0 + (x / 50) * (X1 - X0), sy = (y) => Y0 - (y / 100) * (Y0 - Y1);
const SEGS = 100;
const range = (n) => Array.from({ length: n }, (_, i) => i);
const T = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${s}</text>`;

function build(svg) {
  let h = `<g data-a="yAxis">` +
    range(6).map((i) => { const v = i * 20, y = sy(v); return `<line class="dv-grid" x1="${X0}" y1="${y}" x2="${X1}" y2="${y}"/>` + T(X0 - 16, y, v, "dv-tick dv-end"); }).join("") +
    `<line class="dv-axis" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1 - 10}"/>` +
    T(X0 - 82, (Y0 + Y1) / 2, "% of HMMER loci detected by RMBlast", "dv-label", `transform="rotate(-90 ${X0 - 82} ${(Y0 + Y1) / 2})"`) + `</g>`;
  h += `<g data-a="xAxis"><line class="dv-axis" x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}"/>` +
    range(11).map((i) => { const x = sx(i * 5); return `<line class="dv-axis" x1="${x}" y1="${Y0}" x2="${x}" y2="${Y0 + 10}"/>` + T(x, Y0 + 32, i * 5, "dv-tick"); }).join("") + `</g>`;
  h += T((X0 + X1) / 2, Y0 + 76, "Kimura divergence (%)", "dv-label", `data-a="xLabel"`);
  // fitted curve, as short segments that appear left to right
  h += range(SEGS).map((i) => {
    const a = (50 * i) / SEGS, b = (50 * (i + 1)) / SEGS;
    return `<line data-a="f${i}" class="dv-fit" x1="${sx(a).toFixed(1)}" y1="${sy(D(a)).toFixed(1)}" x2="${sx(b).toFixed(1)}" y2="${sy(D(b)).toFixed(1)}"/>`;
  }).join("");
  h += PTS.map(([x, y], i) => `<circle data-a="p${i}" class="dv-pt" cx="${sx(x)}" cy="${sy(y)}" r="10"/>`).join("");
  // fit summary, in the empty lower-left of the plot
  h += `<g data-a="fitBox"><rect class="dv-box" x="${X0 + 24}" y="${sy(54)}" width="540" height="${sy(4) - sy(54)}" rx="14"/>` +
    T(X0 + 48, sy(54) + 40, `D(x) = c + (L − c) / (1 + e<tspan class="dv-exp" dy="-0.6em">(x − x₀)/k</tspan><tspan dy="0.6em">)</tspan>`, "dv-eq") +
    T(X0 + 48, sy(54) + 92, "L = 100.3% (ceiling)", "dv-fv") + T(X0 + 300, sy(54) + 92, "c = 18.6% (floor)", "dv-fv") +
    T(X0 + 48, sy(54) + 132, "x₀ = 34.68% (midpoint)", "dv-fv") + T(X0 + 300, sy(54) + 132, "k = 4.66 (steepness)", "dv-fv") +
    T(X0 + 48, sy(54) + 180, "R² = 0.9995", "dv-r2") + `</g>`;
  svg.innerHTML = h;
}

const hidden = { op: 0 };
const INITIAL = {
  t1: { op: 0, ty: 12 }, yAxis: hidden, xAxis: hidden, xLabel: { op: 0, ty: 10 }, fitBox: { op: 0, ty: 12 },
  ...Object.fromEntries(PTS.map((_, i) => [`p${i}`, { op: 0, sc: 0.2 }])),
  ...Object.fromEntries(range(SEGS).map((i) => [`f${i}`, hidden])),
};

const TIMELINES = [
  null,
  [["t1", { op: 1, ty: 0 }, 0, 500], ["yAxis", { op: 1 }, 400, 600], ["xAxis", { op: 1 }, 800, 600]],
  [["xLabel", { op: 1, ty: 0 }, 0, 500, EASE]],
  [...PTS.map((_, i) => [`p${i}`, { op: 1, sc: 1 }, 200 + i * 320, 450, SPRING])],
  [
    ...range(SEGS).map((i) => [`f${i}`, { op: 1 }, 200 + i * 18, 40]),
    ["fitBox", { op: 1, ty: 0 }, 200 + SEGS * 18 + 200, 600, EASE],
  ],
];

export function initTeDiverge() {
  const slide = document.getElementById("te-diverge");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
