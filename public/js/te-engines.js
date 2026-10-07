/* "Comparing the two search methods" slide (presenter screen only).

   Click 1: reference vs copy; a scan line walks along them and a Kimura matrix lights up the
            cell for each position (match / transition / transversion); divergence = 10.5%
   Click 2: that fades; a RepeatMasker box with an engine slot: RMBlast slides out right, HMMER slides in from the left
   Click 3: the box duplicates (RMBlast left, HMMER right); a Dfam card (1,143 families) feeds both
   Click 4: a genome appears; both versions shrink onto it and scan left to right

   The positions and mutations on click 1 are illustrative; 10.5% is Luke's figure. */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const Y = "#f9be00", GREY = "#5c6773";
const range = (n) => Array.from({ length: n }, (_, i) => i);
const T = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${s}</text>`;
const hidden = { op: 0 };

/* ---- click 1: Kimura divergence ---- */
const B = ["A", "C", "G", "T"];
const TS = { A: "G", G: "A", C: "T", T: "C" };
const kind = (r, c) => (r === c ? "match" : TS[B[r]] === B[c] ? "ts" : "tv");
const N = 40, LX0 = 420, LX1 = 1180, RY = 470, CY = 530;
const px = (i) => LX0 + ((i + 0.5) * (LX1 - LX0)) / N;
const REF = "GATCCTAGGCATTACGGATCAGTTCAGGCTAACGTTAGCA";
const MUTS = { 7: "ts", 16: "tv", 24: "ts", 33: "ts" };      // 3 transitions + 1 transversion
const TV = { A: "C", C: "A", G: "T", T: "G" };
const COPY = [...REF].map((b, i) => (MUTS[i] === "ts" ? TS[b] : MUTS[i] === "tv" ? TV[b] : b));
const MX = 650, MT = 680, CELL = 44, STEP = 110, SCAN_AT = 900;

/* ---- clicks 2-4: engines ---- */
const BOX = { x: 540, y: 430, w: 520, h: 260 }, BCX = 800, BCY = 560;
const SLOT = { x: 650, y: 520, w: 300, h: 128 };

function cog(cx, cy) {
  const pts = range(32).map((k) => {
    const a = (k / 32) * 2 * Math.PI, r = k % 4 < 2 ? 27 : 20;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return `<polygon class="en-cog" points="${pts}"/><circle class="en-cog-hole" cx="${cx}" cy="${cy}" r="8"/>`;
}
const engine = (id, label) => `<g data-a="${id}"><rect class="en-engine" x="${SLOT.x + 10}" y="${SLOT.y + 9}" width="${SLOT.w - 20}" height="${SLOT.h - 18}" rx="12"/>` +
  cog(SLOT.x + 62, SLOT.y + SLOT.h / 2) + T(SLOT.x + 190, SLOT.y + SLOT.h / 2, label, "en-engine-lbl") + `</g>`;
const rmBox = (id, inner) => `<g data-a="${id}"><rect class="en-box" x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="20"/>` +
  T(BCX, BOX.y + 46, "RepeatMasker", "en-box-lbl") +
  `<rect class="en-slot" x="${SLOT.x}" y="${SLOT.y}" width="${SLOT.w}" height="${SLOT.h}" rx="14"/>${inner}</g>`;

function build(svg) {
  let h = "";
  // ---- Kimura ----
  h += `<g data-a="kim">` + T(LX0 - 20, RY, "Reference sequence", "en-lbl en-end") + T(LX0 - 20, CY, "Copy in genome", "en-lbl en-end") +
    `<line class="en-seq" x1="${LX0}" y1="${RY}" x2="${LX1}" y2="${RY}" style="stroke:${Y}"/>` +
    `<line class="en-seq" x1="${LX0}" y1="${CY}" x2="${LX1}" y2="${CY}" style="stroke:${Y};opacity:0.5"/>` +
    Object.entries(MUTS).map(([i, k]) => `<rect data-a="mk${i}" class="en-mut en-${k}" x="${px(+i) - 4}" y="${CY - 12}" width="8" height="24" rx="2"/>`).join("") +
    `<line data-a="kSweep" class="en-sweep" x1="${LX0}" y1="${RY - 34}" x2="${LX0}" y2="${CY + 34}"/>` +
    T(MX, MT - CELL - 34, "Kimura divergence matrix", "en-mtitle");
  B.forEach((b, i) => { h += T(MX - 2 * CELL + CELL * (i + 0.5), MT - 16, b, "en-mhead") + T(MX - 2 * CELL - 18, MT + CELL * (i + 0.5), b, "en-mhead"); });
  B.forEach((_, r) => B.forEach((__, c) => {
    const k = kind(r, c), x = MX - 2 * CELL + c * CELL, y = MT + r * CELL;
    h += `<rect class="en-cell en-c-${k}" x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="6"/>` +
      T(x + CELL / 2, y + CELL / 2, k === "match" ? "·" : k === "ts" ? "Ts" : "Tv", "en-cell-lbl") +
      `<rect data-a="kh${r * 4 + c}" class="en-hl" x="${x + 1}" y="${y + 1}" width="${CELL - 2}" height="${CELL - 2}" rx="7"/>`;
  }));
  h += range(4).map((n) => T(980, 700, `Transitions: ${n}`, "en-count", `data-a="ts${n}"`)).join("") +
    range(2).map((n) => T(980, 750, `Transversions: ${n}`, "en-count", `data-a="tv${n}"`)).join("") +
    T(980, 825, "Divergence: 10.5%", "en-result", `data-a="kRes"`) + `</g>`;

  // ---- engines ----
  h += `<g data-a="dfam"><rect class="dfam-card" x="745" y="335" width="110" height="110" rx="16"/>` +
    T(800, 362, "Dfam", "dfam-card-label") + T(800, 410, "1,143", "en-dfam-n") + `</g>`;
  for (const s of ["A", "B"]) {
    h += `<g data-a="feed${s}"><rect class="dfam-card" x="745" y="335" width="110" height="110" rx="16"/>${T(800, 362, "Dfam", "dfam-card-label")}${T(800, 410, "1,143", "en-dfam-n")}</g>`;
  }
  h += `<g data-a="genome"><line class="en-seq" x1="200" y1="640" x2="1400" y2="640" style="stroke:${GREY}"/>${T(180, 640, "Genome", "en-lbl en-end")}</g>`;
  h += rmBox("boxA", engine("engA", "RMBlast"));                  // the duplicate, RMBlast
  h += rmBox("boxB", engine("eng1", "RMBlast") + engine("eng2", "HMMER"));
  svg.innerHTML = h;
}

/* ---- timelines ---- */
const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];
const at = (i) => SCAN_AT + i * STEP;
const kimura = () => {
  const out = [["kSweep", { op: 1 }, SCAN_AT - 200, 200], ["kSweep", { tx: LX1 - LX0 }, SCAN_AT, N * STEP, "linear"], ["kSweep", { op: 0 }, at(N), 250]];
  let ts = 0, tv = 0;
  REF.split("").forEach((b, i) => {
    const cell = B.indexOf(b) * 4 + B.indexOf(COPY[i]);
    out.push([`kh${cell}`, { op: 1 }, at(i), 40], [`kh${cell}`, { op: 0 }, at(i) + 70, 30]);
    if (MUTS[i]) {
      out.push([`mk${i}`, { op: 1, sc: 1 }, at(i), 250, SPRING]);
      if (MUTS[i] === "ts") { out.push([`ts${ts}`, { op: 0 }, at(i), 60]); ts++; out.push([`ts${ts}`, { op: 1 }, at(i), 60]); }
      else { out.push([`tv${tv}`, { op: 0 }, at(i), 60]); tv++; out.push([`tv${tv}`, { op: 1 }, at(i), 60]); }
    }
  });
  out.push(["kRes", { op: 1, sc: 1 }, at(N) + 300, 600, SPRING]);
  return out;
};

const S1 = 0.8, S2 = 0.45, SPREAD = 330;
const INITIAL = {
  ...Object.fromEntries(range(3).map((k) => [`t${k + 1}`, { op: 0, ty: 12 }])),
  kim: hidden, kSweep: hidden, kRes: { op: 0, sc: 0.8 },
  ...Object.fromEntries(Object.keys(MUTS).map((i) => [`mk${i}`, { op: 0, sc: 0.3 }])),
  ...Object.fromEntries(range(16).map((k) => [`kh${k}`, hidden])),
  ...Object.fromEntries(range(4).map((n) => [`ts${n}`, n ? hidden : {}])), ...Object.fromEntries(range(2).map((n) => [`tv${n}`, n ? hidden : {}])),
  boxA: hidden, boxB: { op: 0, sc: 0.9 }, eng2: { op: 0, tx: -420 },
  dfam: { op: 0, sc: 0.7 }, feedA: hidden, feedB: hidden, genome: hidden,
};

const TIMELINES = [
  null,
  [...swap("t0", "t1"), ["kim", { op: 1 }, 500, 500], ...kimura()],
  [ // 2 · swappable engines
    ...swap("t1", "t2"),
    ["kim", { op: 0 }, 0, 500],
    ["boxB", { op: 1, sc: 1 }, 600, 600, EASE],
    ["eng1", { tx: 420 }, 1700, 900, EASE_IN_OUT], ["eng1", { op: 0 }, 2000, 500],      // RMBlast out to the right
    ["eng2", { op: 1 }, 2300, 400], ["eng2", { tx: 0 }, 2300, 900, EASE_IN_OUT],       // HMMER in from the left
  ],
  [ // 3 · two copies, one library
    ...swap("t2", "t3"),
    ["boxA", { op: 1 }, 500, 1],
    ["boxA", { tx: -SPREAD, sc: S1 }, 500, 900, EASE_IN_OUT],
    ["boxB", { tx: SPREAD, sc: S1 }, 500, 900, EASE_IN_OUT],
    ["dfam", { op: 1, sc: 1 }, 1500, 500, SPRING],
    ["feedA", { op: 1 }, 2200, 1], ["feedB", { op: 1 }, 2200, 1],
    ["feedA", { tx: -SPREAD, ty: BCY - 390, sc: 0.35 }, 2200, 900, EASE_IN_OUT], ["feedA", { op: 0 }, 3000, 200],
    ["feedB", { tx: SPREAD, ty: BCY - 390, sc: 0.35 }, 2200, 900, EASE_IN_OUT], ["feedB", { op: 0 }, 3000, 200],
  ],
  [ // 4 · both scan the genome
    ["dfam", { op: 0 }, 0, 400],
    ["genome", { op: 1 }, 300, 500],
    ["boxA", { tx: 200 - BCX, ty: 545 - BCY, sc: S2 }, 400, 900, EASE_IN_OUT],
    ["boxB", { tx: 200 - BCX, ty: 735 - BCY, sc: S2 }, 400, 900, EASE_IN_OUT],
    ["boxA", { tx: 1400 - BCX }, 1600, 4200, "linear"],
    ["boxB", { tx: 1400 - BCX }, 1600, 4200, "linear"],
  ],
];

export function initTeEngines() {
  const slide = document.getElementById("te-engines");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
