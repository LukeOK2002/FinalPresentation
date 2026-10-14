/* "Using profile hidden Markov models (pHMMs) for TE detection" slide (presenter screen only).

   Click 1: three aligned copies (GCT, GAC, GAC); per-position base probabilities appear above
   Click 2: two more copies (G-C, GATC) make room for an insert column; probabilities update;
            deletion (pos 2) and insertion (between 2 and 3) probabilities appear
   Click 3: left, consensus GAC slides along ATCGTCACC and dies at GTC (no exact seed);
            right, the pHMM slides along the same sequence and scores GTC: green, amber, green ✅
   Click 4: an old, diverged copy in the genome; mutation ticks build up along it
   Click 5: consensus search (substitution matrix: penalty set by the base change, e.g. transitions
            amber < transversions red, the same at every position; score 190 < cutoff 225, ❌) vs
            pHMM search (position-specific: variable positions amber, conserved red, 30 bits > 22 bits, ✅)
   Click 6: three families: one flat cutoff (left) vs per-family calibrated cutoffs (right) */

import { createStepper, EASE, EASE_IN_OUT, SPRING } from "./stepper.js";

const Y = "#f9be00", GREY = "#5c6773", GREEN = "#3ecf8e", AMBER = "#f5a623", RED = "#e5484d";
const range = (n) => Array.from({ length: n }, (_, i) => i);
const T = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${s}</text>`;
const hidden = { op: 0 };

/* ---- clicks 1-2: alignment ---- */
const C1 = 680, C2 = 790, CI = 900, C3 = 900, C3B = 1000;     // column x (pos 3 moves right for the insert column)
const ROWS = [520, 575, 630, 685, 740], PL = [400, 432, 464];  // row y / probability label lines
const base = (x, y, b) => T(x, y, b, "ph-base");
const prob = (x, lines, extra = "") => lines.map(([s, cls], i) => T(x, PL[i], s, `ph-prob ${cls || ""}`)).join("");

/* ---- click 3: seeding vs profile scoring ---- */
const TARGET = "ATCGTCACC", PITCH = 44, QY = 495, TY = 575, HIT = 3; // GTC starts at index 3
const SIDES = { L: 420, R: 1180 };
const tx0 = (cx) => cx - (PITCH * (TARGET.length - 1)) / 2;

/* ---- clicks 4-6: diverged copy, two searches, cutoffs ---- */
const MUT = [0.05, 0.13, 0.21, 0.3, 0.38, 0.47, 0.55, 0.63, 0.71, 0.79, 0.87, 0.95]; // along the copy
const VARIES = [true, true, false, true, true, false, true, false, true, true, false, true];
const TRANSITION = [true, false, false, true, false, true, true, false, false, true, false, true]; // consensus side: matrix penalty by base change
const PANELS = { L: 160, R: 820 };                             // panel left edges (620 wide)
const AY = 540, BAR_B = 720, BAR_H = 200;                      // copy row; score bar bottom / full height
const FAM = [["Alu", 70, 56], ["L1", 52, 40], ["MADE1", 26, 18]]; // name, true-hit score height, own cutoff height
const FLAT = 44;                                               // one cutoff for every family

function build(svg) {
  let h = "";
  // ---- alignment ----
  const row = (y, bases, cols) => bases.map((b, i) => base(cols[i], y, b)).join("");
  h += `<g data-a="aln"><g data-a="rowsA">` +
    [["G", "C"], ["G", "A"], ["G", "A"]].map(([a, b], r) => row(ROWS[r], [a, b], [C1, C2])).join("") +
    `<g data-a="c3">${["T", "C", "C"].map((b, r) => base(C3, ROWS[r], b)).join("")}<g data-a="p3a">${prob(C3, [["C 67%", "top"], ["T 33%"]])}</g></g></g>` +
    `<g data-a="p1">${prob(C1, [["G 100%", "top"]])}</g><g data-a="p2a">${prob(C2, [["A 67%", "top"], ["C 33%"]])}</g>` +
    `<g data-a="rowsB">${row(ROWS[3], ["G", "–", "C"], [C1, C2, C3B])}${row(ROWS[4], ["G", "A", "T", "C"], [C1, C2, CI, C3B])}</g>` +
    `<rect data-a="insCol" class="ph-ins" x="${CI - 28}" y="${ROWS[0] - 34}" width="56" height="${ROWS[4] - ROWS[0] + 68}" rx="10"/>` +
    `<g data-a="p2b">${prob(C2, [["A 75%", "top"], ["C 25%"]])}</g>` +
    `<g data-a="pdel">${T(C2, PL[2], "Del 20%", "ph-prob ph-indel")}</g>` +
    `<g data-a="pins">${T(CI, PL[0] - 34, "Ins 20%", "ph-prob ph-indel")}</g>` +
    `<g data-a="p3b">${prob(C3B, [["C 80%", "top"], ["T 20%"]])}</g></g>`;

  // ---- seeding vs profile ----
  h += `<g data-a="seed">`;
  for (const [s, cx] of Object.entries(SIDES)) {
    const x0 = tx0(cx);
    h += T(cx, 420, s === "L" ? "Consensus search" : "pHMM search", "ph-ptitle") +
      [...TARGET].map((b, i) => T(x0 + i * PITCH, TY, b, "ph-tbase")).join("");
    const probe = s === "L"
      ? ["G", "A", "C"].map((b, i) => `<rect class="ph-qbox" x="${x0 + i * PITCH - 19}" y="${QY - 24}" width="38" height="48" rx="8"/>${T(x0 + i * PITCH, QY, b, "ph-qbase")}`).join("")
      : [["G", ""], ["A", "C"], ["C", "T"]].map(([a, b], i) => `<rect class="ph-qbox ph-hmm" x="${x0 + i * PITCH - 19}" y="${QY - 30}" width="38" height="60" rx="19"/>` +
          T(x0 + i * PITCH, QY - (b ? 8 : 0), a, "ph-qbase") + (b ? T(x0 + i * PITCH, QY + 15, b, "ph-qsmall") : "")).join("");
    h += `<g data-a="${s}q">${probe}`;
    if (s === "R") {
      h += [0, 2].map((i) => `<rect data-a="Rg${i}" class="ph-ok" x="${x0 + i * PITCH - 19}" y="${QY - 30}" width="38" height="60" rx="19"/>`).join("") +
        `<rect data-a="Ra1" class="ph-amber" x="${x0 + PITCH - 19}" y="${QY - 30}" width="38" height="60" rx="19"/>`;
    }
    h += `</g>`;
    const end = x0 + (HIT + 3) * PITCH + 6;
    h += s === "L"
      ? T(end, QY, "❌", "ph-mark", `data-a="Lx"`) + T(cx, 640, "No exact seed, so the search never starts", "ph-note", `data-a="Lnote"`)
      : T(end, QY, "✅", "ph-mark", `data-a="Rok"`) + T(cx, 640, "Unseen base = small penalty, not a dead end", "ph-note", `data-a="Rnote"`);
  }
  h += `</g>`;

  // ---- the diverged copy in the genome ----
  h += `<g data-a="locus"><line class="ph-seq" x1="200" y1="500" x2="1400" y2="500" style="stroke:${GREY}"/>` +
    `<line class="ph-seq" x1="600" y1="500" x2="1000" y2="500" style="stroke:${Y}"/>` +
    T(800, 455, "An old copy of a TE family", "ph-ptitle", `data-a="locusLbl"`) +
    MUT.map((f, i) => `<rect data-a="lt${i}" class="ph-tick" x="${600 + f * 400 - 2}" y="490" width="4" height="20"/>`).join("") + `</g>`;

  // ---- two searches ----
  for (const [s, x] of Object.entries(PANELS)) {
    const cx0 = x + 30, w = 400, bx = x + 540;
    const unit = s === "L" ? { max: 300, val: 190, cut: 225, valLbl: "190", cutLbl: "Cutoff (225)" } : { max: 40, val: 30, cut: 22, valLbl: "30 bits", cutLbl: "Family cutoff: 22 bits" };
    const hv = (BAR_H * unit.val) / unit.max, hc = (BAR_H * unit.cut) / unit.max;
    h += `<g data-a="${s}p">` + T(x + 310, 410, s === "L" ? "Consensus search" : "pHMM search", "ph-ptitle") +
      `<line class="ph-seq" x1="${cx0}" y1="${AY}" x2="${cx0 + w}" y2="${AY}" style="stroke:${Y}"/>` +
      MUT.map((f) => `<rect class="ph-tick" x="${cx0 + f * w - 2}" y="${AY - 10}" width="4" height="20"/>`).join("");
    // the query: a consensus line, or a chain of pHMM states
    h += `<g data-a="${s}Q">` + (s === "L"
      ? `<line class="ph-seq" x1="${cx0}" y1="${AY - 46}" x2="${cx0 + w}" y2="${AY - 46}" style="stroke:#fff"/>` + T(cx0 - 14, AY - 46, "Consensus", "ph-small ph-end")
      : range(12).map((i) => (i ? `<line class="ph-edge" x1="${cx0 + MUT[i - 1] * w}" y1="${AY - 46}" x2="${cx0 + MUT[i] * w}" y2="${AY - 46}"/>` : "")).join("") +
        MUT.map((f) => `<circle class="ph-node" cx="${cx0 + f * w}" cy="${AY - 46}" r="9"/>`).join("") + T(cx0 - 14, AY - 46, "pHMM", "ph-small ph-end")) + `</g>`;
    h += MUT.map((f, i) => {
      const c = (s === "L" ? TRANSITION[i] : VARIES[i]) ? AMBER : RED;
      return `<rect data-a="${s}m${i}" x="${cx0 + f * w - 8}" y="${AY - 15}" width="16" height="30" rx="4" style="fill:${c}"/>`;
    }).join("");
    h += `<g data-a="${s}same">` + (s === "L"
      ? T(cx0 + w / 2, AY + 40, "Substitution matrix: penalty set by", "ph-small") +
        T(cx0 + w / 2, AY + 64, "the base change (transition < transversion),", "ph-small") +
        T(cx0 + w / 2, AY + 88, "the same at every position", "ph-small")
      : T(cx0 + w / 2, AY + 40, "Position-specific scores: penalty set by", "ph-small") +
        T(cx0 + w / 2, AY + 64, "how conserved each position is in the family", "ph-small") +
        T(cx0 + w / 2, AY + 88, "(variable: small · conserved: large)", "ph-small")) + `</g>`;
    // the score bar grows upwards (a horizontal bar turned -90°, so sx grows it)
    const bar = (id, cls, hh) => `<g transform="rotate(-90 ${bx} ${BAR_B})"><rect data-a="${id}" class="ph-bar ${cls}" x="${bx}" y="${BAR_B - 22}" width="${hh}" height="44"/></g>`;
    h += `<rect class="ph-track" x="${bx - 22}" y="${BAR_B - BAR_H}" width="44" height="${BAR_H}" rx="4"/>` +
      bar(`${s}b`, "", hv) + bar(`${s}b2`, s === "L" ? "ph-bar-grey" : "ph-bar-green", hv) +
      `<line class="ph-cut" x1="${bx - 40}" y1="${BAR_B - hc}" x2="${bx + 40}" y2="${BAR_B - hc}"/>` +
      (s === "L" ? T(bx - 50, BAR_B - hc, unit.cutLbl, "ph-small ph-end") : T(bx + 50, BAR_B - hc, unit.cutLbl, "ph-small ph-start")) +
      T(bx + 34, BAR_B - hv, unit.valLbl, "ph-val ph-start", `data-a="${s}v"`) +
      T(cx0 + w / 2, 680, s === "L" ? "❌ Not detected" : "✅ Detected", `ph-res ${s === "L" ? "" : "ph-res-ok"}`, `data-a="${s}r"`) + `</g>`;
    // ---- cutoffs per family ----
    h += `<g data-a="${s}f">`;
    const fx = (i) => x + 170 + i * 140, FB = 850;
    FAM.forEach(([name, hh], i) => {
      h += `<rect class="ph-fam" x="${fx(i) - 26}" y="${FB - hh}" width="52" height="${hh}" rx="4"/>` + T(fx(i), FB + 22, name, "ph-small");
    });
    h += s === "L"
      ? `<line class="ph-cut" x1="${fx(0) - 60}" y1="${FB - FLAT}" x2="${fx(2) + 60}" y2="${FB - FLAT}"/>`
      : FAM.map(([, , c], i) => `<line class="ph-cut" x1="${fx(i) - 40}" y1="${FB - c}" x2="${fx(i) + 40}" y2="${FB - c}"/>`).join("");
    h += `</g>`;
  }
  svg.innerHTML = h;
}

/* ---- timelines ---- */
const swap = (from, to) => [[from, { op: 0, ty: -12 }, 0, 400], [to, { op: 1, ty: 0 }, 300, 500]];
const SLIDE_MS = 520;
const slide = (id, at) => range(HIT + 1).slice(1).map((k) => [id, { tx: k * PITCH }, at + (k - 1) * SLIDE_MS, SLIDE_MS - 120, EASE_IN_OUT]);

const INITIAL = {
  ...Object.fromEntries(range(4).map((k) => [`t${k + 1}`, { op: 0, ty: 12 }])),
  aln: {}, rowsA: hidden, p1: hidden, p2a: hidden, p3a: hidden, rowsB: { op: 0, ty: 14 }, insCol: hidden,
  p2b: hidden, p3b: hidden, pdel: hidden, pins: hidden,
  seed: hidden, Lx: { op: 0, sc: 0.5 }, Rok: { op: 0, sc: 0.5 }, Lnote: hidden, Rnote: hidden, Rg0: hidden, Rg2: hidden, Ra1: hidden,
  locus: hidden, locusLbl: { op: 0, ty: 8 }, ...Object.fromEntries(MUT.map((_, i) => [`lt${i}`, { op: 0, sc: 0.4 }])),
  ...Object.fromEntries(["L", "R"].flatMap((s) => [
    [`${s}p`, hidden], [`${s}Q`, { op: 0, ty: -40 }], [`${s}b`, { sx: 0 }], [`${s}b2`, hidden], [`${s}v`, hidden],
    [`${s}r`, { op: 0, sc: 0.6 }], [`${s}f`, hidden], ...MUT.map((_, i) => [`${s}m${i}`, hidden]),
  ])),
  Lsame: hidden, Rsame: hidden,
};

const search = (s, at, val) => [
  [`${s}p`, { op: 1 }, at, 500],
  [`${s}Q`, { op: 1, ty: 0 }, at + 500, 700, EASE],
  ...MUT.map((_, i) => [`${s}m${i}`, { op: 1 }, at + 1300 + i * 110, 200]),
  [`${s}same`, { op: 1 }, at + 2700, 400],
  [`${s}b`, { sx: 1 }, at + 3000, 2200, "cubic-bezier(0.3, 0.2, 0.2, 1)"],
  [`${s}v`, { op: 1 }, at + 5100, 300],
  [`${s}b2`, { op: 1 }, at + 5400, 500],
  [`${s}r`, { op: 1, sc: 1 }, at + 5700, 500, SPRING],
];

const TIMELINES = [
  null,
  [ // 1 · per-position base probabilities
    ...swap("t0", "t1"),
    ["rowsA", { op: 1 }, 500, 600],
    ["p1", { op: 1 }, 1400, 400], ["p2a", { op: 1 }, 1700, 400], ["p3a", { op: 1 }, 2000, 400],
  ],
  [ // 2 · indels
    ...swap("t1", "t2"),
    ["p3a", { op: 0 }, 300, 300], ["p2a", { op: 0 }, 300, 300],
    ["c3", { tx: C3B - C3 }, 500, 700, EASE_IN_OUT],
    ["insCol", { op: 1 }, 1100, 500],
    ["rowsB", { op: 1, ty: 0 }, 1200, 600, EASE],
    ["p2b", { op: 1 }, 2000, 400], ["p3b", { op: 1 }, 2300, 400],
    ["pdel", { op: 1 }, 2800, 400], ["pins", { op: 1 }, 3100, 400],
  ],
  [ // 3 · seeds vs profiles
    ...swap("t2", "t3"),
    ["aln", { op: 0 }, 0, 500],
    ["seed", { op: 1 }, 600, 500],
    ...slide("Lq", 1300), ...slide("Rq", 1300),
    ["Lx", { op: 1, sc: 1 }, 1300 + HIT * SLIDE_MS, 450, SPRING],
    ["Lnote", { op: 1 }, 1500 + HIT * SLIDE_MS, 400],
    ["Rg0", { op: 1 }, 1300 + HIT * SLIDE_MS, 300], ["Rg2", { op: 1 }, 1450 + HIT * SLIDE_MS, 300], ["Ra1", { op: 1 }, 1600 + HIT * SLIDE_MS, 300],
    ["Rnote", { op: 1 }, 2000 + HIT * SLIDE_MS, 400],
    ["Rok", { op: 1, sc: 1 }, 2400 + HIT * SLIDE_MS, 450, SPRING],
  ],
  [ // 4 · scene 1: an old, diverged copy
    ...swap("t3", "t4"),
    ["seed", { op: 0 }, 0, 500],
    ["locus", { op: 1 }, 600, 500],
    ["locusLbl", { op: 1, ty: 0 }, 900, 500, EASE],
    ...MUT.map((_, i) => [`lt${i}`, { op: 1, sc: 1 }, 1500 + i * 140, 300, EASE]),
  ],
  [ // 5 · scene 2: consensus vs pHMM search
    ["locus", { op: 0 }, 0, 500],
    ...search("L", 500), ...search("R", 1300),
  ],
  [ // 6 · scene 3: one cutoff vs calibrated cutoffs
    ["Lf", { op: 1 }, 200, 600], ["Rf", { op: 1 }, 900, 600],
  ],
];

export function initTePhmm() {
  const slide = document.getElementById("te-phmm");
  build(slide.querySelector(".te-scene"));
  createStepper(slide, INITIAL, TIMELINES);
}
