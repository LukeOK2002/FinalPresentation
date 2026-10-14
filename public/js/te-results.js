/* "De novo discovery results" slide (presenter screen only).

   Start:     the headline count; an empty area
   Click 1-7: one rectangle per category fills the area (area ∝ share of all families),
              largest first. The newest rectangle is dark navy with white border and text;
              when the next one arrives it inverts to white with navy border and text.
              Rectangles too small for their label get a leader line to a label on the right.

   The layout is worked out once on load; each rectangle is drawn
   twice (dark and light) and the light copy fades in over the dark one to invert it. */

import { createStepper, EASE } from "./stepper.js";

const CATS = [
  { name: "Segmental duplication", n: 21431 },
  { name: "Known TE", n: 4960 },
  { name: "Gene-derived", n: 1123 },
  { name: "Tandem / local cluster", n: 593 },
  { name: "Satellite", n: 454 },
  { name: "Too short", n: 339 },
  { name: "Too few copies", n: 222 },
];
const AREA = { x: 72, y: 236, w: 1170, h: 624 };
const CALLOUT_X = 1290, GAP = 4;
const fmt = (n) => n.toLocaleString("en-IE");

/* ---- layout: the largest category on the left; the rest stacked in a column on the
   right, so every small one touches the right edge and its leader line never crosses
   another rectangle ---- */
function layout(values, box) {
  const total = values.reduce((s, v) => s + v, 0);
  const leftW = (box.w * values[0]) / total;
  const out = [{ x: box.x, y: box.y, w: leftW, h: box.h }];
  const rest = total - values[0], colW = box.w - leftW;
  let y = box.y;
  for (const v of values.slice(1)) { const h = (box.h * v) / rest; out.push({ x: box.x + leftW, y, w: colW, h }); y += h; }
  return out;
}

const NS = "http://www.w3.org/2000/svg";
function build(slide) {
  const rects = layout(CATS.map((c) => c.n), AREA);
  const svg = slide.querySelector(".tm-scene");
  let html = "", callouts = [];
  CATS.forEach((c, i) => {
    const r = rects[i];
    const rx = r.x + GAP / 2, ry = r.y + GAP / 2, rw = r.w - GAP, rh = r.h - GAP;
    const fs = Math.max(22, Math.min(52, Math.sqrt(rw * rh) / 11));
    const fits = rw >= c.name.length * fs * 0.44 + 24 && rh >= fs * 2.8;
    const label = fits
      ? `<text class="tm-num" x="${rx + rw / 2}" y="${ry + rh / 2 - fs * 0.15}" style="font-size:${fs * 1.25}px">${fmt(c.n)}</text>` +
        `<text class="tm-name" x="${rx + rw / 2}" y="${ry + rh / 2 + fs * 1.05}" style="font-size:${fs * 0.8}px">${c.name}</text>`
      : "";
    if (!fits) callouts.push({ i, c, r: { x: rx, y: ry, w: rw, h: rh } });
    const box = `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="6"/>${label}`;
    html += `<g data-a="d${i}" class="tm-dark">${box}</g><g data-a="l${i}" class="tm-light">${box}</g>`;
  });
  // callout labels in a column on the right, in the order of their rectangles, never overlapping
  callouts.sort((a, b) => a.r.y + a.r.h / 2 - (b.r.y + b.r.h / 2));
  let prev = -Infinity;
  for (const o of callouts) { o.ly = Math.max(o.r.y + o.r.h / 2, prev + 44); prev = o.ly; }
  const over = prev - (AREA.y + AREA.h - 12);
  if (over > 0) callouts.forEach((o) => { o.ly -= over; });
  for (const { i, c, r, ly } of callouts) {
    const cx = r.x + r.w, cy = r.y + r.h / 2; // from the rectangle's right edge
    html += `<g data-a="k${i}" class="tm-callout"><circle cx="${cx}" cy="${cy}" r="4"/>` +
      `<polyline points="${cx},${cy} ${CALLOUT_X - 20},${ly} ${CALLOUT_X - 6},${ly}"/>` +
      `<text x="${CALLOUT_X}" y="${ly}"><tspan class="tm-num">${fmt(c.n)}</tspan><tspan class="tm-name" dx="12">${c.name}</tspan></text></g>`;
  }
  svg.innerHTML = html;
  return new Set(callouts.map((o) => o.i));
}

export function initTeResults() {
  const slide = document.getElementById("te-results");
  const withCallout = build(slide);
  const K = CATS.map((_, i) => i);

  const INITIAL = Object.fromEntries(K.flatMap((i) => [
    [`d${i}`, { op: 0, sc: 0.94 }], [`l${i}`, { op: 0 }], ...(withCallout.has(i) ? [[`k${i}`, { op: 0, tx: -10 }]] : []),
  ]));
  const TIMELINES = [null, ...K.map((i) => [
    ...(i > 0 ? [[`l${i - 1}`, { op: 1 }, 0, 450]] : []),           // previous one inverts
    [`d${i}`, { op: 1, sc: 1 }, i > 0 ? 250 : 0, 650, EASE],          // new one arrives, dark
    ...(withCallout.has(i) ? [[`k${i}`, { op: 1, tx: 0 }, 550, 450, EASE]] : []),
  ])];
  createStepper(slide, INITIAL, TIMELINES);
}
