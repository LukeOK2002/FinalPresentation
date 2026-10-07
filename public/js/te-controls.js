/* "Positive/negative controls" slide (presenter screen only). Scene built here, then stepped.

   Start:   observed vs background TSD rates (2 bp exact, 6 bp window), bars as on the TSD slides
   Click 1: each pair is compared with Fisher's exact test; the p-values appear
   Click 2: bars fade; the p-values drop onto a null distribution, far out in the tail
   Click 3: observed vs length/chromosome-matched known MADE copies
   Click 4: Fisher's exact test again: p = 0.344 and 0.374
   Click 5: text only

   The curve is a standard normal; each p-value sits at its two-sided z-score
   (p = 3.36e-15 → z ≈ 7.9, p = 1.09e-29 → z ≈ 11.3). Illustrative. */

import { createStepper, EASE, SPRING } from "./stepper.js";

const BX = 500, BW = 600, BH = 36, LX = 470, VX = 1115, KX = 1250, PX = 1390;
const GROUPS = [{ name: "2 bp exact", y: 440 }, { name: "6 bp window", y: 640 }];
const SET1 = [
  [["Observed", 378, 0.0582], ["Background", 3780, 0.0034]],
  [["Observed", 378, 0.3228], ["Background", 3780, 0.0966]],
];
const SET2 = [
  [["Observed", 378, 0.0582], ["Known copies", 1298, 0.0462]],
  [["Observed", 378, 0.3228], ["Known copies", 1298, 0.2982]],
];
// exponents as a raised, smaller tspan: Unicode superscript digits sit at uneven heights (¹²³ vs ⁴–⁹)
const sci = (m, e) => `${m} × 10<tspan class="pc-exp" dy="-0.55em">−${e}</tspan>`;
const P1 = [sci("3.36", 15), sci("1.09", 29)], Z1 = [7.88, 11.33];
const P2 = ["0.344", "0.374"];
// distribution curve
const AX = 300, AW = 1000, ZMIN = -4, ZMAX = 12, AY = 770, PEAK = 290;
const zx = (z) => AX + ((z - ZMIN) / (ZMAX - ZMIN)) * AW;
const TARGET = [{ y: 600 }, { y: 540 }]; // where each p-value label lands above its marker

const fmt = (n) => n.toLocaleString("en-IE");
const pct = (p) => `${(p * 100).toFixed(2)}%`;

function bars(set, prefix) {
  let h = "";
  set.forEach((rows, g) => {
    const y0 = GROUPS[g].y;
    h += `<text class="pc-head" x="${BX}" y="${y0 - 42}">${GROUPS[g].name}</text>`;
    rows.forEach(([name, n, p], r) => {
      const y = y0 + r * 60, yw = Math.max(3, BW * p);
      h += `<text class="pc-name" x="${LX}" y="${y}">${name} <tspan>(n = ${fmt(n)})</tspan></text>` +
        `<rect class="tc-empty" x="${BX}" y="${y - BH / 2}" width="${BW}" height="${BH}" rx="4"/>` +
        `<rect data-a="${prefix}s${g}${r}" class="tc-sig" x="${BX}" y="${y - BH / 2}" width="${yw}" height="${BH}" rx="4"/>` +
        `<rect data-a="${prefix}b${g}${r}" class="tc-bg" x="${BX + yw + 3}" y="${y - BH / 2}" width="${BW - yw - 3}" height="${BH}" rx="4"/>` +
        `<text class="pc-val" x="${VX}" y="${y}">${pct(p)}</text>`;
    });
  });
  return h;
}

function fisher(prefix, pvals) {
  return GROUPS.map((g, i) => {
    const y1 = g.y, y2 = g.y + 60, ym = (y1 + y2) / 2;
    return `<g data-a="${prefix}k${i}"><path class="pc-bracket" d="M${KX - 14} ${y1} H${KX} V${y2} H${KX - 14}"/>` +
      `<text class="pc-test" x="${PX}" y="${ym - 34}">Fisher’s exact test</text></g>` +
      `<text data-a="${prefix}p${i}" class="pc-p" x="${PX}" y="${ym}">p = ${pvals[i]}</text>`;
  }).join("");
}

function build(svg) {
  let h = `<g data-a="set1">${bars(SET1, "a")}</g>` + fisher("a", P1);
  // null distribution
  let d = "", tail = "";
  for (let z = ZMIN; z <= ZMAX + 1e-9; z += 0.05) {
    const x = zx(z), y = AY - PEAK * Math.exp(-z * z / 2);
    d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    if (z >= 1.96) tail += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  h += `<g data-a="curve"><path class="pc-tail" d="M${zx(1.96)} ${AY}${tail}L${zx(ZMAX)} ${AY}Z"/><path class="pc-curve" d="${d}"/>` +
    `<line class="pc-axis" x1="${AX}" y1="${AY}" x2="${AX + AW}" y2="${AY}"/>` +
    [0, 4, 8, 12].map((z) => `<line class="pc-axis" x1="${zx(z)}" y1="${AY}" x2="${zx(z)}" y2="${AY + 10}"/><text class="pc-tick" x="${zx(z)}" y="${AY + 34}">${z}</text>`).join("") +
    `<text class="pc-tick" x="${AX + AW / 2}" y="${AY + 70}">Null distribution (z-score)</text></g>`;
  Z1.forEach((z, i) => {
    h += `<g data-a="mk${i}"><line class="pc-marker" x1="${zx(z)}" y1="${AY}" x2="${zx(z)}" y2="${TARGET[i].y + 22}"/>` +
      `<circle class="pc-dot" cx="${zx(z)}" cy="${AY}" r="7"/>` +
      `<text class="pc-tag" x="${zx(z)}" y="${TARGET[i].y - 32}">${GROUPS[i].name}</text></g>`;
  });
  h += `<g data-a="set2">${bars(SET2, "b")}</g>` + fisher("b", P2);
  svg.innerHTML = h;
}

const hidden = { op: 0 };
const swap = (from, to) => [...(from ? [[from, { op: 0, ty: -12 }, 0, 400]] : []), [to, { op: 1, ty: 0 }, 300, 500]];
const pFrom = (i) => GROUPS[i].y + 30; // label's y before it moves

const INITIAL = {
  ...Object.fromEntries([1, 2, 3].map((k) => [`t${k}`, { op: 0, ty: 12 }])),
  ak0: { op: 0, tx: -12 }, ak1: { op: 0, tx: -12 }, ap0: { op: 0, sc: 0.7 }, ap1: { op: 0, sc: 0.7 },
  curve: hidden, mk0: hidden, mk1: hidden,
  set2: hidden, bk0: { op: 0, tx: -12 }, bk1: { op: 0, tx: -12 }, bp0: { op: 0, sc: 0.7 }, bp1: { op: 0, sc: 0.7 },
  ...Object.fromEntries([0, 1].flatMap((g) => [0, 1].map((r) => [`bs${g}${r}`, { sx: 0 }]))),
  ...Object.fromEntries([0, 1].flatMap((g) => [0, 1].map((r) => [`bb${g}${r}`, hidden]))),
};

const TIMELINES = [
  null,
  [ // 1 · Fisher's exact test
    ...[0, 1].flatMap((i) => [
      ["ak" + i, { op: 1, tx: 0 }, 200 + i * 500, 500, EASE],
      ["ap" + i, { op: 1, sc: 1 }, 700 + i * 500, 500, SPRING],
    ]),
  ],
  [ // 2 · onto the null distribution
    ...swap(null, "t1"),
    ["set1", { op: 0 }, 0, 600], ["ak0", { op: 0 }, 0, 500], ["ak1", { op: 0 }, 0, 500],
    ["curve", { op: 1 }, 700, 700],
    ...[0, 1].flatMap((i) => [
      ["ap" + i, { tx: zx(Z1[i]) - PX, ty: TARGET[i].y - pFrom(i) }, 1300 + i * 300, 1100, EASE],
      ["mk" + i, { op: 1 }, 2200 + i * 300, 500],
    ]),
  ],
  [ // 3 · against known copies
    ...swap("t1", "t2"),
    ...["curve", "mk0", "mk1", "ap0", "ap1"].map((id) => [id, { op: 0 }, 0, 600]),
    ["set2", { op: 1 }, 700, 400],
    ...[0, 1].flatMap((g) => [0, 1].flatMap((r) => [
      [`bs${g}${r}`, { sx: 1 }, 900 + (g * 2 + r) * 150, 800, EASE],
      [`bb${g}${r}`, { op: 1 }, 1300 + (g * 2 + r) * 150, 500],
    ])),
  ],
  [ // 4 · Fisher's exact test again
    ...[0, 1].flatMap((i) => [
      ["bk" + i, { op: 1, tx: 0 }, 200 + i * 500, 500, EASE],
      ["bp" + i, { op: 1, sc: 1 }, 700 + i * 500, 500, SPRING],
    ]),
  ],
  [...swap("t2", "t3")],
];

export function initTeControls() {
  const slide = document.getElementById("te-controls");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
