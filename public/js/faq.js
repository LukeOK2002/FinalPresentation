/* FAQ slide (after the end). Three navy cards; clicking one opens its answer and plays
   its animation once (Replay plays it again, Back returns to the cards).

   1 · soft- vs hard-masking: ATG -> atg vs ATG -> NNN; RepeatModeler scans both and only
       rediscovers the TE in the soft-masked copy
   2 · HMMER validation: Dfam hits in the real genome (grey) vs the synthetic GARLIC genome
       (green); then both bitscore distributions and a cutoff raised until 0.2% of hits are false
       (curve shapes are schematic)
   3 · reannotation: RepeatModeler family sequences go into RepeatMasker, which sweeps the
       genome and labels each copy with its family
   4 · liftOver: a human copy is projected through the chain file's aligned blocks onto the
       chimpanzee genome, where the orthologous copy is found; a copy in an alignment gap fails
       (block positions are schematic)

   Animations are plain WAAPI with fill "forwards"; each element's start state is set inline,
   so cancelling every animation resets the scene. */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const T = (x, y, s, cls, extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${s}</text>`;
const hide = 'style="opacity:0"';

/* ---------------- 1 · soft- vs hard-masking ---------------- */
const SEQ = "GCATATGGCATTCGAATCGA", TE0 = 4, TE1 = 15, CW = 27;
const COLS = [
  { cx: 430, head: "Soft-masked", sub: "ATG → atg", mask: (c) => c.toLowerCase(), cls: "te", res: "✅  TE rediscovered" },
  { cx: 1170, head: "Hard-masked", sub: "ATG → NNN", mask: () => "N", cls: "n", res: "❌  Nothing left to find" },
];
const CAPS1 = [
  "The same TE copy, masked two ways",
  "Soft-masking lowercases repeats; hard-masking replaces them with N",
  "RepeatModeler scans both",
  "Lowercase is still read as ordinary sequence, so the TE is found again",
];
const bx = (c, i) => c.cx - (SEQ.length * CW) / 2 + CW * (i + 0.5);

function scene1() {
  let h = CAPS1.map((s, i) => T(800, 790, s, "fq-cap", `data-k="c${i}" ${hide}`)).join("");
  COLS.forEach((c, j) => {
    h += `<g data-k="head${j}" ${hide}>${T(c.cx, 300, c.head, "fq-h")}${T(c.cx, 340, c.sub, "fq-sub")}</g>`;
    h += `<g data-k="row${j}" ${hide}>` + [...SEQ].map((ch, i) => {
      const te = i >= TE0 && i <= TE1;
      return T(bx(c, i), 520, ch, `fq-base${te ? " te" : ""}`, te ? `data-k="u${j}_${i}"` : "") +
        (te ? T(bx(c, i), 520, c.mask(ch), `fq-base ${c.cls}`, `data-k="l${j}_${i}" ${hide}`) : "");
    }).join("") + `</g>`;
    const x0 = bx(c, 0) - CW / 2;
    h += `<g data-k="box${j}" style="opacity:0;transform:translateX(${x0 - c.cx}px)">` +
      `<rect class="fq-beam" x="${c.cx - 110}" y="446" width="220" height="104"/>` +
      `<rect class="fq-box" x="${c.cx - 110}" y="380" width="220" height="66" rx="12"/>` +
      T(c.cx, 413, "RepeatModeler", "fq-box-label", 'style="font-size:24px"') + `</g>`;
    if (j === 0) {
      h += `<line data-k="bar0" class="fq-hit" x1="${bx(c, TE0) - CW / 2}" y1="572" x2="${bx(c, TE1) + CW / 2}" y2="572" ` +
        `style="transform-box:fill-box;transform-origin:left center;transform:scaleX(0)"/>`;
    }
    h += T(c.cx, 630, c.res, "fq-res", `data-k="res${j}" ${hide}`);
  });
  return h;
}

function play1(A) {
  A("c0", [{ opacity: 0 }, { opacity: 1 }], 0, 500);
  [0, 1].forEach((j) => {
    A(`head${j}`, [{ opacity: 0 }, { opacity: 1 }], 100, 500);
    A(`row${j}`, [{ opacity: 0 }, { opacity: 1 }], 300, 600);
  });
  // masking
  A("c0", [{ opacity: 1 }, { opacity: 0 }], 1700, 300);
  A("c1", [{ opacity: 0 }, { opacity: 1 }], 1900, 400);
  for (let i = TE0; i <= TE1; i++) {
    const at = 2100 + (i - TE0) * 90;
    [0, 1].forEach((j) => {
      A(`u${j}_${i}`, [{ opacity: 1 }, { opacity: 0 }], at, 260);
      A(`l${j}_${i}`, [{ opacity: 0 }, { opacity: 1 }], at, 260);
    });
  }
  // RepeatModeler scans both
  A("c1", [{ opacity: 1 }, { opacity: 0 }], 4300, 300);
  A("c2", [{ opacity: 0 }, { opacity: 1 }], 4500, 400);
  COLS.forEach((c, j) => {
    const x0 = bx(c, 0) - CW / 2 - c.cx;
    A(`box${j}`, [{ opacity: 0, transform: `translateX(${x0}px)` }, { opacity: 1, transform: `translateX(${x0}px)` }], 4600, 400);
    A(`box${j}`, [{ opacity: 1, transform: `translateX(${x0}px)` }, { opacity: 1, transform: `translateX(${-x0}px)` }], 5100, 2600, "linear");
    A(`box${j}`, [{ opacity: 1, transform: `translateX(${-x0}px)` }, { opacity: 0, transform: `translateX(${-x0}px)` }], 7800, 400);
  });
  // result
  A("c2", [{ opacity: 1 }, { opacity: 0 }], 8100, 300);
  A("c3", [{ opacity: 0 }, { opacity: 1 }], 8300, 400);
  A("bar0", [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], 8400, 700, EASE);
  A("res0", [{ opacity: 0 }, { opacity: 1 }], 8800, 500);
  A("res1", [{ opacity: 0 }, { opacity: 1 }], 9000, 500);
}

/* ---------------- 2 · HMMER validation ---------------- */
const TX0 = 400, TX1 = 1400, YG = 470, YS = 610;
const REAL_HITS = [430, 480, 540, 575, 640, 700, 735, 800, 860, 905, 960, 1030, 1090, 1150, 1200, 1270, 1330, 1375];
const FALSE_HITS = [690, 1180];
const SCAN0 = 1000, SCAN_MS = 3000;
const scanAt = (x) => SCAN0 + (SCAN_MS * (x - TX0)) / (TX1 - TX0);
// schematic bitscore distributions: real-genome hits N(55, 14), GARLIC hits N(18, 6) at 0.3x the count
const GR = { m: 55, s: 14, w: 1 }, GS = { m: 18, s: 6, w: 0.3 };
const CX0 = 380, CX1 = 1300, CY0 = 690, CH = 260;
const erfc = (x) => { // Numerical Recipes erfc, plenty for a drawing
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
};
const tail = (g, c) => g.w * 0.5 * erfc((c - g.m) / (g.s * Math.SQRT2));
const fdr = (c) => tail(GS, c) / (tail(GS, c) + tail(GR, c));
const CUT = (() => { let a = 10, b = 90; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (fdr(m) > 0.002) a = m; else b = m; } return b; })();
const dens = (g, x) => (g.w / g.s) * Math.exp(-0.5 * ((x - g.m) / g.s) ** 2);
const PEAK = dens(GR, GR.m);
const sxC = (v) => CX0 + (v / 100) * (CX1 - CX0), syC = (d) => CY0 - (d / PEAK) * CH;
const area = (g, from = 0) => {
  let d = `M${sxC(from).toFixed(1)},${CY0}`;
  for (let v = from; v <= 100; v += 0.5) d += `L${sxC(v).toFixed(1)},${syC(dens(g, v)).toFixed(1)}`;
  return d + `L${sxC(100)},${CY0}Z`;
};
const CAPS2 = [
  "Dfam families were searched against the real genome and a synthetic one",
  "Any hit in the synthetic genome must be a false positive",
  "Bitscores of the hits from both searches",
  "The bitscore cutoff is raised until only 0.2% of hits above it are false",
];

function scene2() {
  let h = CAPS2.map((s, i) => T(800, 800, s, "fq-cap", `data-k="c${i}" ${hide}`)).join("");
  h += `<g data-k="search" ${hide}>` +
    `<rect class="dfam-card" x="745" y="285" width="110" height="110" rx="16"/>${T(800, 316, "Dfam", "dfam-card-label")}` +
    [344, 360, 376].map((y) => `<line class="dfam-card-row" x1="765" y1="${y}" x2="835" y2="${y}"/>`).join("") +
    `<line class="fq-track fq-grey" x1="${TX0}" y1="${YG}" x2="${TX1}" y2="${YG}"/>` +
    `<line class="fq-track fq-green" x1="${TX0}" y1="${YS}" x2="${TX1}" y2="${YS}"/>` +
    T(TX0 - 30, YG, "T2T-CHM13 genome", "fq-lbl fq-end") + T(TX0 - 30, YS, "GARLIC synthetic genome", "fq-lbl fq-end", 'style="fill:#3fbf6f"') +
    REAL_HITS.map((x, i) => `<line data-k="r${i}" class="fq-hit" x1="${x - 12}" y1="${YG}" x2="${x + 12}" y2="${YG}" style="opacity:0"/>`).join("") +
    FALSE_HITS.map((x, i) => `<line data-k="f${i}" class="fq-hit" x1="${x - 12}" y1="${YS}" x2="${x + 12}" y2="${YS}" style="opacity:0;transform-box:fill-box;transform-origin:center"/>`).join("") +
    `<line data-k="scan" class="fq-scan" x1="${TX0}" y1="${YG - 40}" x2="${TX0}" y2="${YS + 40}" style="opacity:0"/>` + `</g>`;
  h += `<g data-k="axes" ${hide}><line class="fq-axis" x1="${CX0}" y1="${CY0}" x2="${CX1}" y2="${CY0}"/>` +
    T((CX0 + CX1) / 2, CY0 + 44, "Bitscore", "fq-lbl fq-mid") + `</g>`;
  h += `<g data-k="cs" style="opacity:0;transform-box:fill-box;transform-origin:center bottom;transform:scaleY(0)"><path class="fq-curve-s" d="${area(GS)}"/></g>`;
  h += `<g data-k="cg" style="opacity:0;transform-box:fill-box;transform-origin:center bottom;transform:scaleY(0)"><path class="fq-curve-g" d="${area(GR)}"/></g>`;
  h += `<g data-k="keys" ${hide}>` + T(sxC(GS.m), syC(dens(GS, GS.m)) - 30, "GARLIC hits (false)", "fq-lbl fq-mid", 'style="fill:#3fbf6f"') +
    T(sxC(GR.m + 22), syC(dens(GR, GR.m + 22)) - 34, "T2T-CHM13 hits", "fq-lbl", 'style="fill:#c3cad3"') + `</g>`;
  h += `<g data-k="cut" ${hide}><path data-k="tg" class="fq-tail-g"/><path data-k="ts" class="fq-tail-s"/>` +
    `<line data-k="cl" class="fq-cut" y1="${CY0}" y2="${CY0 - CH - 20}"/>` +
    `<text data-k="cr" class="fq-read" y="${CY0 - CH - 85}"></text>` +
    `<text data-k="cn" class="fq-lbl" y="${CY0 - CH - 48}" ${hide}>Bitscore cutoff</text></g>`;
  return h;
}

function play2(A, E, raf) {
  A("c0", [{ opacity: 0 }, { opacity: 1 }], 0, 500);
  A("search", [{ opacity: 0 }, { opacity: 1 }], 100, 600);
  A("scan", [{ opacity: 0 }, { opacity: 1 }], SCAN0 - 300, 300);
  A("scan", [{ transform: "translateX(0px)" }, { transform: `translateX(${TX1 - TX0}px)` }], SCAN0, SCAN_MS, "linear");
  A("scan", [{ opacity: 1 }, { opacity: 0 }], SCAN0 + SCAN_MS, 300);
  REAL_HITS.forEach((x, i) => A(`r${i}`, [{ opacity: 0 }, { opacity: 1 }], scanAt(x), 200));
  FALSE_HITS.forEach((x, i) => A(`f${i}`, [{ opacity: 0 }, { opacity: 1 }], scanAt(x), 200));
  // false positives
  A("c0", [{ opacity: 1 }, { opacity: 0 }], 4300, 300);
  A("c1", [{ opacity: 0 }, { opacity: 1 }], 4500, 400);
  FALSE_HITS.forEach((_, i) => A(`f${i}`, [{ transform: "scale(1)" }, { transform: "scale(1.9)" }, { transform: "scale(1)" }], 4700 + i * 150, 700, IN_OUT));
  // distributions
  A("search", [{ opacity: 1 }, { opacity: 0 }], 6600, 500);
  A("c1", [{ opacity: 1 }, { opacity: 0 }], 6600, 300);
  A("c2", [{ opacity: 0 }, { opacity: 1 }], 6800, 400);
  A("axes", [{ opacity: 0 }, { opacity: 1 }], 7100, 400);
  A("cg", [{ opacity: 0, transform: "scaleY(0)" }, { opacity: 1, transform: "scaleY(1)" }], 7300, 900, EASE);
  A("cs", [{ opacity: 0, transform: "scaleY(0)" }, { opacity: 1, transform: "scaleY(1)" }], 7700, 900, EASE);
  A("keys", [{ opacity: 0 }, { opacity: 1 }], 8300, 500);
  // cutoff: drawn per frame
  A("c2", [{ opacity: 1 }, { opacity: 0 }], 9600, 300);
  A("c3", [{ opacity: 0 }, { opacity: 1 }], 9800, 400);
  A("cut", [{ opacity: 0 }, { opacity: 1 }], 9800, 300);
  A("cn", [{ opacity: 0 }, { opacity: 1 }], 13800, 500);
  const from = 4, MS = 3800, T0 = 10000;
  const draw = (c) => {
    const x = sxC(c).toFixed(1);
    E.cl.setAttribute("x1", x); E.cl.setAttribute("x2", x);
    E.tg.setAttribute("d", area(GR, c)); E.ts.setAttribute("d", area(GS, c));
    E.cr.setAttribute("x", +x - 8); E.cn.setAttribute("x", +x - 8);
    E.cr.textContent = `False hits above cutoff: ${(100 * fdr(c)).toFixed(1)}%`;
  };
  draw(from);
  raf((now, t0) => {
    const t = Math.min(1, Math.max(0, (now - t0 - T0) / MS));
    const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    draw(from + (CUT - from) * e);
    return t < 1;
  });
}

/* ---------------- 3 · reannotation ---------------- */
const FAM = ["#f9be00", "#f93500", "#006ff9"];
const MOD = { x: 160, y: 300, w: 300, h: 100 }, LIB = { x: 640, y: 300 }, MASK = { cx: 1150, cy: 350 };
const GY = 770, G0 = 160, G1 = 1440, BOX_X = 800, BOX_Y = 560;
const HITS3 = [[250, 320, 0], [400, 450, 2], [520, 610, 1], [700, 760, 0], [860, 950, 2], [1020, 1070, 1], [1150, 1240, 0], [1300, 1360, 2]];
const SW0 = -560, SW1 = 560, SW_START = 6200, SW_MS = 3600;
const swAt = (x) => SW_START + (SW_MS * (x - (BOX_X + SW0))) / (SW1 - SW0);
const CAPS3 = [
  "RepeatModeler outputs a consensus sequence for each family it discovers",
  "These family sequences are fed into RepeatMasker",
  "RepeatMasker searches the genome for copies of each family",
  "Each copy found is labelled with its family: the reannotation",
];

function scene3() {
  let h = CAPS3.map((s, i) => T(800, 850, s, "fq-cap", `data-k="c${i}" ${hide}`)).join("");
  h += `<g data-k="mod" ${hide}><rect class="fq-box" x="${MOD.x}" y="${MOD.y}" width="${MOD.w}" height="${MOD.h}" rx="14"/>` +
    T(MOD.x + MOD.w / 2, MOD.y + MOD.h / 2, "RepeatModeler", "fq-box-label") + `</g>`;
  h += T(LIB.x + 80, LIB.y - 30, "Family sequences", "fq-lbl fq-mid", `data-k="libl" ${hide}`);
  const mcx = MOD.x + MOD.w / 2, mcy = MOD.y + MOD.h / 2;
  FAM.forEach((c, i) => {
    const y = LIB.y + 20 + i * 30;
    h += `<line data-k="fam${i}" class="fq-fam" x1="${LIB.x}" y1="${y}" x2="${LIB.x + 160}" y2="${y}" stroke="${c}" ` +
      `style="opacity:0;transform-box:fill-box;transform-origin:center;transform:translate(${mcx - LIB.x - 80}px,${mcy - y}px) scale(0.4)"/>`;
  });
  h += `<line class="te-host" x1="${G0}" y1="${GY}" x2="${G1}" y2="${GY}" data-k="genome" ${hide}/>`;
  h += HITS3.map(([a, b, f], i) => `<line data-k="h${i}" class="fq-track" x1="${a}" y1="${GY}" x2="${b}" y2="${GY}" stroke="${FAM[f]}" ` +
    `style="transform-box:fill-box;transform-origin:left center;transform:scaleX(0)"/>`).join("");
  h += T(G0 - 20, GY, "Genome", "fq-lbl fq-end", `data-k="gl" ${hide}`);
  // RepeatMasker starts top right, then moves down over the genome to sweep
  const dx = MASK.cx - BOX_X, dy = MASK.cy - BOX_Y;
  h += `<g data-k="mask" style="opacity:0;transform:translate(${dx}px,${dy}px)">` +
    `<rect data-k="beam" class="fq-beam" x="${BOX_X - 140}" y="${BOX_Y + 50}" width="280" height="${GY - BOX_Y - 42}" ${hide}/>` +
    `<rect class="fq-box" x="${BOX_X - 140}" y="${BOX_Y - 50}" width="280" height="100" rx="14"/>` +
    T(BOX_X, BOX_Y, "RepeatMasker", "fq-box-label") + `</g>`;
  return h;
}

function play3(A) {
  const dx = MASK.cx - BOX_X, dy = MASK.cy - BOX_Y;
  const at = (x, y) => `translate(${x}px,${y}px)`;
  const mcx = MOD.x + MOD.w / 2, mcy = MOD.y + MOD.h / 2;
  A("c0", [{ opacity: 0 }, { opacity: 1 }], 0, 500);
  A("mod", [{ opacity: 0 }, { opacity: 1 }], 100, 500);
  A("genome", [{ opacity: 0 }, { opacity: 1 }], 200, 500);
  A("gl", [{ opacity: 0 }, { opacity: 1 }], 200, 500);
  A("libl", [{ opacity: 0 }, { opacity: 1 }], 900, 400);
  FAM.forEach((_, i) => {
    const y = LIB.y + 20 + i * 30, from = `translate(${mcx - LIB.x - 80}px,${mcy - y}px) scale(0.4)`;
    A(`fam${i}`, [{ opacity: 0, transform: from }, { opacity: 1, transform: "translate(0px,0px) scale(1)" }], 800 + i * 350, 800, EASE);
  });
  // into RepeatMasker
  A("c0", [{ opacity: 1 }, { opacity: 0 }], 2900, 300);
  A("c1", [{ opacity: 0 }, { opacity: 1 }], 3100, 400);
  A("mask", [{ opacity: 0, transform: at(dx, dy) }, { opacity: 1, transform: at(dx, dy) }], 3100, 500);
  A("libl", [{ opacity: 1 }, { opacity: 0 }], 3700, 300);
  FAM.forEach((_, i) => {
    const y = LIB.y + 20 + i * 30, to = `translate(${MASK.cx - LIB.x - 80}px,${MASK.cy - y}px) scale(0.3)`;
    A(`fam${i}`, [{ opacity: 1, transform: "translate(0px,0px) scale(1)" }, { opacity: 0, transform: to }], 3800 + i * 250, 800, IN_OUT);
  });
  // down over the genome, then sweep
  A("c1", [{ opacity: 1 }, { opacity: 0 }], 5100, 300);
  A("c2", [{ opacity: 0 }, { opacity: 1 }], 5300, 400);
  A("mask", [{ transform: at(dx, dy) }, { transform: at(SW0, 0) }], 5000, SW_START - 5100, IN_OUT);
  A("beam", [{ opacity: 0 }, { opacity: 1 }], SW_START - 300, 300);
  A("mask", [{ transform: at(SW0, 0) }, { transform: at(SW1, 0) }], SW_START, SW_MS, "linear");
  HITS3.forEach(([a, b], i) => A(`h${i}`, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], swAt(a), swAt(b) - swAt(a), "linear"));
  A("beam", [{ opacity: 1 }, { opacity: 0 }], SW_START + SW_MS, 300);
  A("mask", [{ transform: at(SW1, 0) }, { transform: at(0, 0) }], SW_START + SW_MS + 200, 900, IN_OUT);
  A("c2", [{ opacity: 1 }, { opacity: 0 }], SW_START + SW_MS + 300, 300);
  A("c3", [{ opacity: 0 }, { opacity: 1 }], SW_START + SW_MS + 500, 400);
}

/* ---------------- 4 · liftOver ---------------- */
const HY = 430, CY = 650;
const LEN = [230, 290, 270, 260], HS = [200, 470, 820, 1140], CS = [180, 520, 840, 1140]; // aligned blocks
const CA = [580, 620], CB = [775, 805];                      // copy A (in block 1), copy B (in a gap)
const toChimp = (x) => CS[1] + (x - HS[1]);
const CAPS4 = [
  "Each TE copy has coordinates in the human genome",
  "liftOver uses a chain file: blocks of whole-genome alignment between two species",
  "The copy's coordinates are projected through its aligned block",
  "The chimpanzee carries a copy at the orthologous position",
  "Copies that fall in an alignment gap can't be lifted over",
];

function scene4() {
  let h = CAPS4.map((s, i) => T(800, 820, s, "fq-cap", `data-k="c${i}" ${hide}`)).join("");
  h += `<g data-k="tracks" ${hide}>` +
    `<line class="te-host" x1="200" y1="${HY}" x2="1400" y2="${HY}"/><line class="te-host" x1="180" y1="${CY}" x2="1400" y2="${CY}"/>` +
    T(200, HY - 34, "Human (T2T-CHM13)", "fq-lbl") + T(180, CY + 40, "Chimpanzee", "fq-lbl") + `</g>`;
  LEN.forEach((L, i) => {
    h += `<g data-k="blk${i}" ${hide}>` +
      `<polygon class="fq-ribbon" points="${HS[i]},${HY + 8} ${HS[i] + L},${HY + 8} ${CS[i] + L},${CY - 8} ${CS[i]},${CY - 8}"/>` +
      `<line class="fq-block" x1="${HS[i]}" y1="${HY}" x2="${HS[i] + L}" y2="${HY}"/>` +
      `<line class="fq-block" x1="${CS[i]}" y1="${CY}" x2="${CS[i] + L}" y2="${CY}"/></g>`;
  });
  h += T(800, HY - 60, "Chain file: aligned blocks", "fq-lbl fq-mid", `data-k="chainL" ${hide}`);
  // copy A, its projection, and the chimp copy
  const a0 = toChimp(CA[0]), a1 = toChimp(CA[1]);
  h += `<polygon data-k="projA" class="fq-proj" points="${CA[0]},${HY + 8} ${CA[1]},${HY + 8} ${a1},${CY - 8} ${a0},${CY - 8}" ` +
    `style="transform-box:fill-box;transform-origin:center top;transform:scaleY(0)"/>`;
  h += `<line data-k="copyA" class="fq-hit" x1="${CA[0]}" y1="${HY}" x2="${CA[1]}" y2="${HY}" ${hide}/>` +
    T((CA[0] + CA[1]) / 2, HY - 30, "Human copy", "fq-lbl fq-mid", `data-k="copyAL" ${hide}`);
  h += `<rect data-k="tgtA" class="fq-target" x="${a0 - 8}" y="${CY - 18}" width="${a1 - a0 + 16}" height="36" rx="6" ${hide}/>`;
  h += `<line data-k="chimpA" class="fq-hit" x1="${a0}" y1="${CY}" x2="${a1}" y2="${CY}" style="opacity:0;transform-box:fill-box;transform-origin:center"/>`;
  h += T((a0 + a1) / 2, CY + 48, "✅  Orthologous copy", "fq-res", `data-k="okA" ${hide}`);
  // copy B falls between blocks 1 and 2
  h += `<polygon data-k="projB" class="fq-proj" points="${CB[0]},${HY + 8} ${CB[1]},${HY + 8} ${CB[1]},${(HY + CY) / 2} ${CB[0]},${(HY + CY) / 2}" ` +
    `style="transform-box:fill-box;transform-origin:center top;transform:scaleY(0)"/>`;
  h += `<line data-k="copyB" class="fq-hit" x1="${CB[0]}" y1="${HY}" x2="${CB[1]}" y2="${HY}" ${hide}/>`;
  h += T((CB[0] + CB[1]) / 2 + 30, (HY + CY) / 2 + 34, "❌  No aligned block", "fq-res", `data-k="noB" style="opacity:0;text-anchor:start"`);
  return h;
}

function play4(A) {
  const at = (k, t, d = 500) => A(k, [{ opacity: 0 }, { opacity: 1 }], t, d);
  const out = (k, t, d = 300, to = 0) => A(k, [{ opacity: 1 }, { opacity: to }], t, d);
  at("c0", 0); at("tracks", 100, 600);
  at("copyA", 800, 400); at("copyAL", 900, 400);
  // chain blocks
  out("c0", 2400); at("c1", 2600, 400);
  LEN.forEach((_, i) => at(`blk${i}`, 2800 + i * 300, 500));
  at("chainL", 3000, 400);
  // projection
  out("c1", 5000); at("c2", 5200, 400);
  out("chainL", 5000, 400); out("copyAL", 5000, 400);
  [0, 2, 3].forEach((i) => out(`blk${i}`, 5200, 500, 0.3));
  A("projA", [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], 5500, 1000, IN_OUT);
  at("tgtA", 6400, 300);
  // the chimp copy
  out("c2", 7400); at("c3", 7600, 400);
  A("chimpA", [{ opacity: 0, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.5)" }, { opacity: 1, transform: "scale(1)" }], 7700, 700, IN_OUT);
  at("okA", 8200, 500);
  // a copy in a gap
  out("c3", 10200); at("c4", 10400, 400);
  [0, 2, 3].forEach((i) => A(`blk${i}`, [{ opacity: 0.3 }, { opacity: 1 }], 10200, 500));
  at("copyB", 10600, 400);
  A("projB", [{ transform: "scaleY(0)", opacity: 1 }, { transform: "scaleY(1)", opacity: 1 }], 11100, 800, IN_OUT);
  A("projB", [{ transform: "scaleY(1)", opacity: 1 }, { transform: "scaleY(1)", opacity: 0 }], 12000, 600);
  at("noB", 12100, 500);
}

/* ---------------- panels ---------------- */
const SCENES = { 1: [scene1, play1], 2: [scene2, play2], 3: [scene3, play3], 4: [scene4, play4] };

export function initFaq() {
  const slide = document.getElementById("faq");
  const cards = slide.querySelector(".faq-cards");
  const panels = [...slide.querySelectorAll(".faq-panel")];
  let rafId = 0;

  for (const p of panels) {
    const [scene] = SCENES[p.dataset.faq];
    p.innerHTML = `<p class="faq-q">${p.dataset.phoneSub}</p>` +
      `<div class="faq-btns"><button type="button" class="faq-btn" data-replay>Replay</button>` +
      `<button type="button" class="faq-btn" data-back>Back to FAQs</button></div>` +
      `<svg class="te-scene" viewBox="0 0 1600 900" aria-hidden="true">${scene()}</svg>`;
    p.querySelector("[data-replay]").addEventListener("click", () => play(p));
    p.querySelector("[data-back]").addEventListener("click", close);
  }

  function reset(p) {
    cancelAnimationFrame(rafId);
    p.querySelector("svg").getAnimations({ subtree: true }).forEach((a) => a.cancel());
  }

  function play(p) {
    reset(p);
    const E = {};
    p.querySelectorAll("[data-k]").forEach((el) => { E[el.dataset.k] = el; });
    const A = (k, frames, at, dur, easing = EASE) => E[k].animate(frames, { delay: at, duration: dur, easing, fill: "forwards" });
    const raf = (step) => {
      const t0 = performance.now();
      const frame = (now) => { if (step(now, t0)) rafId = requestAnimationFrame(frame); };
      rafId = requestAnimationFrame(frame);
    };
    SCENES[p.dataset.faq][1](A, E, raf);
  }

  function open(n) {
    const p = panels.find((x) => x.dataset.faq === String(n));
    cards.hidden = true;
    panels.forEach((x) => { x.hidden = x !== p; x.classList.toggle("is-open", x === p); });
    play(p);
    document.dispatchEvent(new Event("phone-refresh"));
  }

  function close() {
    panels.forEach((p) => { reset(p); p.hidden = true; p.classList.remove("is-open"); });
    cards.hidden = false;
    document.dispatchEvent(new Event("phone-refresh"));
  }

  cards.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => open(b.dataset.open)));
  Reveal.on("slidechanged", (e) => { if (e.previousSlide === slide) close(); });
}
