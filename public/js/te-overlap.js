/* "Comparing search results" slide (presenter screen only).

   Click 1: two white circles, area ∝ loci found (HMMER 5,935,649; RMBlast 3,837,511)
   Click 2: they slide together until 99.56% of the RMBlast circle lies inside HMMER's;
            the overlap inverts colour (mix-blend-mode: difference)
   Click 3: zoom in on the thin RMBlast-only crescent (0.44%)
   Click 4: zoom back out; the HMMER-only part is highlighted */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const H = 5935649, R = 3837511, SHARED = 0.9956;
const RH = 230, RR = RH * Math.sqrt(R / H), CY = 620;
// centre distance that gives the right overlap area (bisection on the lens area)
const lens = (d) => {
  if (d >= RH + RR) return 0;
  if (d <= RH - RR) return Math.PI * RR * RR;
  const a = RH * RH * Math.acos((d * d + RH * RH - RR * RR) / (2 * d * RH));
  const b = RR * RR * Math.acos((d * d + RR * RR - RH * RH) / (2 * d * RR));
  return a + b - 0.5 * Math.sqrt((-d + RH + RR) * (d + RH - RR) * (d - RH + RR) * (d + RH + RR));
};
let lo = RH - RR, hi = RH + RR;
for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lens(m) > SHARED * Math.PI * RR * RR) lo = m; else hi = m; }
const D = lo;
const HX = 740, RX = HX + D;                 // final centres
const H0 = 530, R0 = 1090;                    // where they first appear
const ZOOM = 5, PX = RX + RR, TARGET = [1000, 640];   // zoom onto the right-most point of the RMBlast circle

const T = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${s}</text>`;
const fmt = (n) => n.toLocaleString("en-IE");

function build(svg) {
  svg.innerHTML =
    `<defs><mask id="ov-hmmer-only"><rect x="0" y="0" width="1600" height="900" fill="#fff"/><circle cx="${RX}" cy="${CY}" r="${RR}" fill="#000"/></mask>` +
    `<linearGradient id="ov-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.27" stop-color="#000"/><stop offset="0.32" stop-color="#fff"/></linearGradient>` +
    `<mask id="ov-stage" maskUnits="userSpaceOnUse" x="-300" y="0" width="2200" height="1200"><rect x="-300" y="0" width="2200" height="1200" fill="url(#ov-fade)"/></mask></defs>` +
    // isolated stage: a background-coloured backdrop makes the inverted overlap match the page,
    // and the mask keeps the zoomed circles below the centred text
    `<g mask="url(#ov-stage)"><rect class="ov-bg" x="-300" y="0" width="2200" height="1200"/><g data-a="venn"><circle data-a="cH" class="ov-c" cx="${HX}" cy="${CY}" r="${RH}"/><circle data-a="cR" class="ov-c" cx="${RX}" cy="${CY}" r="${RR}"/></g></g>` +
    `<circle data-a="hOnly" class="ov-hi" cx="${HX}" cy="${CY}" r="${RH}" mask="url(#ov-hmmer-only)"/>` +
    `<g data-a="lH">${T(HX - RH - 24, CY - 18, "HMMER (pHMM)", "ov-name ov-end")}${T(HX - RH - 24, CY + 20, fmt(H), "ov-n ov-end")}</g>` +
    `<g data-a="lR">${T(RX + RR + 24, CY - 18, "RMBlast (consensus)", "ov-name")}${T(RX + RR + 24, CY + 20, fmt(R), "ov-n")}</g>` +
    `<g data-a="zLbl">${T(TARGET[0] - 40, TARGET[1] - 20, "RMBlast only", "ov-name ov-end ov-zoom")}${T(TARGET[0] - 40, TARGET[1] + 22, "0.44%", "ov-n ov-end ov-zoom")}</g>` +
    `<g data-a="hLbl">${T(HX - RH - 24, CY - 18, "HMMER only", "ov-name ov-end ov-yel")}${T(HX - RH - 24, CY + 20, "19.47%", "ov-n ov-end ov-yel")}</g>`;
}

const swap = (from, to) => [...(from ? [[from, { op: 0, ty: -12 }, 0, 400]] : []), [to, { op: 1, ty: 0 }, 300, 500]];
const hidden = { op: 0 };

const INITIAL = {
  ...Object.fromEntries([0, 1, 2, 3].map((k) => [`t${k}`, { op: 0, ty: 12 }])),
  cH: { op: 0, sc: 0.3, tx: H0 - HX }, cR: { op: 0, sc: 0.3, tx: R0 - RX },
  lH: { op: 0, tx: H0 - HX }, lR: { op: 0, tx: R0 - RX },
  hOnly: hidden, zLbl: hidden, hLbl: hidden,
};

const TIMELINES = [
  null,
  [ // 1 · two circles, area ∝ loci
    ...swap(null, "t0"),
    ["cH", { op: 1, sc: 1 }, 500, 800, SPRING], ["cR", { op: 1, sc: 1 }, 800, 800, SPRING],
    ["lH", { op: 1 }, 1200, 500], ["lR", { op: 1 }, 1500, 500],
  ],
  [ // 2 · overlap
    ...swap("t0", "t1"),
    ["cH", { tx: 0 }, 600, 1600, EASE_IN_OUT], ["lH", { tx: 0 }, 600, 1600, EASE_IN_OUT],
    ["cR", { tx: 0 }, 600, 1600, EASE_IN_OUT], ["lR", { tx: 0 }, 600, 1600, EASE_IN_OUT],
  ],
  [ // 3 · zoom onto the RMBlast-only sliver
    ...swap("t1", "t2"),
    ["lH", { op: 0 }, 0, 400], ["lR", { op: 0 }, 0, 400],
    ["venn", { sc: ZOOM, tx: TARGET[0] - PX * ZOOM, ty: TARGET[1] - CY * ZOOM }, 400, 1800, EASE_IN_OUT],
    ["zLbl", { op: 1 }, 2300, 500],
  ],
  [ // 4 · back out; HMMER-only highlighted
    ...swap("t2", "t3"),
    ["zLbl", { op: 0 }, 0, 300],
    ["venn", { sc: 1, tx: 0, ty: 0 }, 200, 1500, EASE_IN_OUT],
    ["lR", { op: 1 }, 1700, 400],
    ["hOnly", { op: 1 }, 1900, 700],
    ["hLbl", { op: 1 }, 2300, 500],
  ],
];

export function initTeOverlap() {
  const slide = document.getElementById("te-overlap");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
