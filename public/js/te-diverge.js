/* "Comparing results by divergence" slide (presenter screen only).

   Raw calls graph first (drawn every frame; both axes rescale to what has been revealed so far):
   Click 1: title text, axes and legend; RMBlast (red) and HMMER (blue) calls per 0.5% bin reveal
            left to right up to 25% divergence, then pause
   Click 2: the reveal continues to 50% (final x ticks every 5%)
   Then the detection graph:
   Click 3: raw graph fades; graph title (centred text), y axis (0-100, labelled) and x axis (0-50, ticks every 5, no label)
   Click 4: x axis label
   Click 5: the ten bins' points appear left to right (at each 5% bin's midpoint)
   Click 6: the fitted 4-parameter logistic draws left to right; fit values appear

   Data: raw calls from divergence_arms_pool1143.len20.tsv (0.1% bins summed into 0.5% bins, HMMER's
   1,795 calls above 50% left off); detection from EngineGap/results/sensitivity_curve_pool1143.len20both.tsv;
   fit from the write-up's "Fits" section. */

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

// ---- raw calls per 0.5% Kimura bin (bin i = [0.5i, 0.5i + 0.5), plotted at its midpoint) ----
const RMB = [
  2389, 2006, 3960, 5305, 6851, 7674, 8271, 8838, 10298, 12372,
  15923, 19379, 23427, 27864, 32336, 37674, 44437, 50483, 60259, 65824,
  76241, 80933, 87318, 88800, 88980, 91393, 87957, 89285, 86347, 87090,
  85784, 86466, 85726, 85664, 84685, 82047, 79192, 77284, 75771, 71573,
  76871, 73194, 73514, 73667, 74526, 75434, 75940, 77493, 78029, 73413,
  82907, 76640, 76673, 75269, 73132, 69454, 66589, 62001, 56774, 52004,
  47074, 42044, 35846, 30581, 25296, 21206, 17489, 13786, 10574, 7839,
  5772, 4109, 2952, 1935, 1284, 866, 522, 302, 172, 91,
  54, 44, 19, 8, 8, 6, 2, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
const HMM = [
  1629, 2269, 4813, 6484, 9228, 10667, 10918, 11871, 13046, 15105,
  18342, 22724, 26048, 31491, 33678, 40374, 45970, 52939, 60740, 68427,
  77147, 81361, 87717, 85416, 84726, 85009, 81393, 78450, 74486, 73609,
  73141, 74900, 74730, 75501, 75993, 76410, 76044, 75275, 75988, 71067,
  74174, 70045, 70369, 68764, 69278, 69837, 71048, 72333, 73634, 71324,
  84718, 80278, 83653, 86687, 90209, 91517, 96685, 99678, 102884, 106501,
  110656, 113823, 115092, 117606, 117801, 121393, 122413, 118000, 118465, 115944,
  112819, 108768, 103709, 97743, 90979, 84272, 75851, 69345, 61173, 52109,
  46214, 38175, 31902, 25495, 20626, 16102, 12640, 9520, 7427, 5321,
  3975, 2946, 2101, 1466, 1116, 757, 537, 330, 302, 189,
];
const MIDS = RMB.map((_, i) => 0.5 * i + 0.25);
const PAUSE = 25, END = 50;                                  // reveal stops at 25%, then 50%
const X_LEVELS = [0.5, 1, 5, 10], Y_LEVELS = [100, 200, 1000, 2000, 10000, 20000, 100000]; // nested tick steps
const range = (n) => Array.from({ length: n }, (_, i) => i);
const T = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${s}</text>`;

function build(svg) {
  let h = `<g data-a="raw"><g class="rw-grid"></g><g class="rw-yt"></g><g class="rw-xt"></g>` +
    `<line class="dv-axis" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1 - 10}"/><line class="dv-axis" x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}"/>` +
    T(X0 - 100, (Y0 + Y1) / 2, "Calls per 0.5% bin", "dv-label", `transform="rotate(-90 ${X0 - 100} ${(Y0 + Y1) / 2})"`) +
    T((X0 + X1) / 2, Y0 + 76, "Kimura divergence (%)", "dv-label") +
    `<path class="rw-line rw-hmm"/><path class="rw-line rw-rmb"/><circle class="rw-head rw-hmm-dot" r="7"/><circle class="rw-head rw-rmb-dot" r="7"/>` +
    `<line class="rw-key rw-rmb" x1="${X1 - 400}" y1="${Y1 - 34}" x2="${X1 - 360}" y2="${Y1 - 34}"/>` + T(X1 - 348, Y1 - 34, "RMBlast", "rw-legend") +
    `<line class="rw-key rw-hmm" x1="${X1 - 190}" y1="${Y1 - 34}" x2="${X1 - 150}" y2="${Y1 - 34}"/>` + T(X1 - 138, Y1 - 34, "HMMER", "rw-legend") +
    `</g>`;
  h += `<g data-a="yAxis">` +
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

// ---- raw graph, redrawn each frame for reveal position p (% divergence) ----
const NS = "http://www.w3.org/2000/svg";
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const fmtY = (v) => (v >= 1000 ? `${v / 1000}k` : `${v}`);

function rawGraph(svg) {
  const g = svg.querySelector('[data-a="raw"]');
  const grid = g.querySelector(".rw-grid"), yt = g.querySelector(".rw-yt"), xt = g.querySelector(".rw-xt");
  const lines = { hmm: g.querySelector("path.rw-hmm"), rmb: g.querySelector("path.rw-rmb") };
  const dots = { hmm: g.querySelector(".rw-hmm-dot"), rmb: g.querySelector(".rw-rmb-dot") };
  const pool = new Map(); // tick key -> elements, created on first use

  const el = (parent, tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent.appendChild(e);
    return e;
  };

  // values revealed up to p: every bin midpoint <= p, plus an interpolated head at p
  const series = (arr, p) => {
    const pts = [];
    for (let i = 0; i < arr.length && MIDS[i] <= p; i++) pts.push([MIDS[i], arr[i]]);
    const i = pts.length;
    if (i > 0 && i < arr.length && p > MIDS[i - 1]) {
      const f = (p - MIDS[i - 1]) / (MIDS[i] - MIDS[i - 1]);
      pts.push([p, arr[i - 1] + f * (arr[i] - arr[i - 1])]);
    }
    return pts.length ? pts : [[MIDS[0], arr[0]]];
  };

  // ticks: the coarsest nested step that is far enough apart is solid, the next finer one fades in
  function ticks(kind, max, px, levels, minPx) {
    const per = px / max;
    let s = levels.findIndex((l) => l * per >= minPx);
    if (s < 0) s = levels.length - 1;
    const step = levels[s], fine = s > 0 ? levels[s - 1] : step;
    const fade = smooth(minPx * 0.6, minPx, fine * per);
    const seen = new Set();
    for (let k = 0; k * fine <= max + 1e-9; k++) {
      const v = +(k * fine).toFixed(2), key = `${kind}${v}`;
      const solid = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      const op = solid ? 1 : fade;
      if (op < 0.01) continue;
      seen.add(key);
      let e = pool.get(key);
      if (!e) {
        e = kind === "y"
          ? { a: el(grid, "line", { class: "dv-grid", x1: X0, x2: X1 }), t: el(yt, "text", { class: "dv-tick dv-end", x: X0 - 16 }) }
          : { a: el(xt, "line", { class: "dv-axis", y1: Y0, y2: Y0 + 10 }), t: el(xt, "text", { class: "dv-tick", y: Y0 + 32 }) };
        e.t.textContent = kind === "y" ? fmtY(v) : `${v}`;
        pool.set(key, e);
      }
      const pos = kind === "y" ? Y0 - v * per : X0 + v * per;
      if (kind === "y") { e.a.setAttribute("y1", pos); e.a.setAttribute("y2", pos); e.t.setAttribute("y", pos); }
      else { e.a.setAttribute("x1", pos); e.a.setAttribute("x2", pos); e.t.setAttribute("x", pos); }
      e.a.style.opacity = e.t.style.opacity = op;
      e.a.style.display = e.t.style.display = "";
    }
    for (const [key, e] of pool) if (key[0] === kind && !seen.has(key)) e.a.style.display = e.t.style.display = "none";
  }

  function draw(p) {
    const S = { hmm: series(HMM, p), rmb: series(RMB, p) };
    const xMax = Math.max(p, 2);
    const yMax = Math.max(1000, ...S.hmm.map((q) => q[1]), ...S.rmb.map((q) => q[1])) * 1.08;
    const X = (x) => X0 + (x / xMax) * (X1 - X0), Y = (y) => Y0 - (y / yMax) * (Y0 - Y1);
    for (const k of ["hmm", "rmb"]) {
      lines[k].setAttribute("d", S[k].map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(""));
      const [hx, hy] = S[k][S[k].length - 1];
      dots[k].setAttribute("cx", X(hx).toFixed(1)); dots[k].setAttribute("cy", Y(hy).toFixed(1));
      dots[k].style.opacity = p >= END ? 0 : 1;
    }
    ticks("x", xMax, X1 - X0, X_LEVELS, 80);
    ticks("y", yMax, Y0 - Y1, Y_LEVELS, 60);
  }

  return draw;
}

// p over time for the two reveal clicks; going back or jumping in snaps to the stage's end
function revealer(slide, draw) {
  const steps = [...slide.querySelectorAll(".anim-step")];
  const AT = [MIDS[0], PAUSE, END];                          // p at the end of stage 0, 1, 2+
  const DUR = [0, 5000, 5000];
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  let current = 0, raf = 0;

  function go(stage, animate) {
    cancelAnimationFrame(raf);
    const end = AT[Math.min(stage, 2)];
    if (animate && stage === current + 1 && stage <= 2) {
      const from = AT[stage - 1], t0 = performance.now(), dur = DUR[stage];
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        draw(from + (end - from) * easeInOut(t));
        if (t < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    } else {
      draw(end);
    }
    current = stage;
  }

  const shown = () => steps.filter((s) => s.classList.contains("visible")).length;
  Reveal.on("fragmentshown", (e) => { if (steps.includes(e.fragment)) go(shown(), true); });
  Reveal.on("fragmenthidden", (e) => { if (steps.includes(e.fragment)) go(shown(), false); });
  Reveal.on("slidechanged", (e) => { if (e.currentSlide === slide) go(shown(), false); });
  go(shown(), false);
}

const hidden = { op: 0 };
const INITIAL = {
  t0: { op: 0, ty: 12 }, raw: hidden, t1: { op: 0, ty: 12 }, yAxis: hidden, xAxis: hidden, xLabel: { op: 0, ty: 10 }, fitBox: { op: 0, ty: 12 },
  ...Object.fromEntries(PTS.map((_, i) => [`p${i}`, { op: 0, sc: 0.2 }])),
  ...Object.fromEntries(range(SEGS).map((i) => [`f${i}`, hidden])),
};

const TIMELINES = [
  null,
  [["t0", { op: 1, ty: 0 }, 0, 500], ["raw", { op: 1 }, 0, 400]],
  [],                                                       // reveal continues (drawn by revealer)
  [
    ["t0", { op: 0 }, 0, 300], ["raw", { op: 0 }, 0, 500],
    ["t1", { op: 1, ty: 0 }, 400, 500], ["yAxis", { op: 1 }, 800, 600], ["xAxis", { op: 1 }, 1200, 600],
  ],
  [["xLabel", { op: 1, ty: 0 }, 0, 500, EASE]],
  [...PTS.map((_, i) => [`p${i}`, { op: 1, sc: 1 }, 200 + i * 320, 450, SPRING])],
  [
    ...range(SEGS).map((i) => [`f${i}`, { op: 1 }, 200 + i * 18, 40]),
    ["fitBox", { op: 1, ty: 0 }, 200 + SEGS * 18 + 200, 600, EASE],
  ],
];

export function initTeDiverge() {
  const slide = document.getElementById("te-diverge");
  const svg = slide.querySelector(".te-scene");
  build(svg);
  createStepper(slide, INITIAL, TIMELINES);
  revealer(slide, rawGraph(svg));
}
