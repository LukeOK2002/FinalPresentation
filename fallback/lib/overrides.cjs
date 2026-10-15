/* Per-slide handling on top of the generic conversion in build.cjs.

   overrides[id] = { skip(node), fix(node), extra(E, ctx) }
   - skip: nodes the generic converter should leave out (rebuilt in `extra`)
   - fix: tweak a node before it is emitted
   - extra: add shapes after the generic ones (E = Emitter, ctx = helpers from build.cjs)
   extraSlides(MODEL) returns synthetic slide specs (the FAQ slides). */

const { derive } = require("./effects.cjs");

const BG = "0A0F15", YEL = "F9BE00", BLUE = "006FF9", RED = "F93500", GREY = "5C6773", T2 = "A9B5C2";
const noFx = { initVisible: true, init: { x: 0, y: 0 }, effects: [] };
const fxOf = (initVisible, effects, init = { x: 0, y: 0 }) => ({ initVisible, init, effects });
const sorted = (a) => [...a].sort((x, y) => x.c - y.c || x.t - y.t);

// ------------------------------------------------------------------ circle geometry (te-overlap)
const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
function intersections(c1, r1, c2, r2) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(r1 * r1 - a * a, 0));
  const xm = c1[0] + (a * dx) / d, ym = c1[1] + (a * dy) / d;
  return [[xm + (h * dy) / d, ym - (h * dx) / d], [xm - (h * dy) / d, ym + (h * dx) / d]];
}
function arc(c, r, p, q, test, n = 90) {
  for (const dir of [1, -1]) {
    let a0 = ang(c, p), a1 = ang(c, q);
    if (dir === 1 && a1 < a0) a1 += 2 * Math.PI;
    if (dir === -1 && a1 > a0) a1 -= 2 * Math.PI;
    const at = (t) => { const a = a0 + (a1 - a0) * t; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; };
    if (test(at(0.5))) return Array.from({ length: n + 1 }, (_, i) => at(i / n));
  }
  throw new Error("arc");
}
/** polygon of (inside|outside circle B) part of circle A joined with the (inside|outside circle A) part of circle B */
function region(A, B, aWantInB, bWantInA) {
  const [P, Q] = intersections(A.c, A.r, B.c, B.r);
  const inB = (pt) => Math.hypot(pt[0] - B.c[0], pt[1] - B.c[1]) < B.r;
  const inA = (pt) => Math.hypot(pt[0] - A.c[0], pt[1] - A.c[1]) < A.r;
  const a1 = arc(A.c, A.r, P, Q, (pt) => inB(pt) === aWantInB);
  const a2 = arc(B.c, B.r, Q, P, (pt) => inA(pt) === bWantInA);
  return [...a1, ...a2];
}

// ------------------------------------------------------------------ FAQ: WAAPI recording -> stepper-style data
const parseTransform = (s) => {
  const o = {};
  if (!s) return o;
  let m;
  if ((m = s.match(/translateX\(([-\d.]+)px\)/))) o.tx = +m[1];
  if ((m = s.match(/translateY\(([-\d.]+)px\)/))) o.ty = +m[1];
  if ((m = s.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/))) { o.tx = +m[1]; o.ty = +m[2]; }
  if ((m = s.match(/scaleX\(([-\d.]+)\)/))) o.sx = +m[1];
  if ((m = s.match(/scaleY\(([-\d.]+)\)/))) { o.sx = +m[1]; o.vert = true; }
  return o;
};

/** anims: [{k, frames, delay, dur}] from the web FAQ. Click boundaries are the caption fade-outs (c0, c1, ...). */
function faqStepper(anims) {
  const caps = anims.filter((a) => /^c\d+$/.test(a.k) && a.frames[a.frames.length - 1].opacity === 0).sort((a, b) => a.delay - b.delay);
  const B = [0, ...caps.map((a) => a.delay - 150)];
  const clickOf = (d) => B.filter((b) => b <= d).length;
  const initial = {}, vert = new Set(), timelines = [null];
  const nClicks = B.length;
  for (let i = 1; i <= nClicks; i++) timelines.push([]);
  const seen = new Set();
  for (const a of [...anims].sort((x, y) => x.delay - y.delay)) {
    const f0 = a.frames[0], f1 = a.frames[a.frames.length - 1];
    const t0 = parseTransform(f0.transform), t1 = parseTransform(f1.transform);
    if (!seen.has(a.k)) {
      seen.add(a.k);
      const init = {};
      if (f0.opacity !== undefined) init.op = f0.opacity;
      if (t0.tx !== undefined) init.tx = t0.tx;
      if (t0.ty !== undefined) init.ty = t0.ty;
      if (t0.sx !== undefined) init.sx = t0.sx;
      initial[a.k] = init;
    }
    const ch = {};
    if (f1.opacity !== undefined && (f1.opacity >= 0.9 || f1.opacity <= 0.1)) ch.op = f1.opacity;
    if (t1.tx !== undefined) ch.tx = t1.tx;
    if (t1.ty !== undefined) ch.ty = t1.ty;
    if (t1.sx !== undefined && (t0.sx !== undefined) && Math.abs(t1.sx - t0.sx) > 0.5) ch.sx = t1.sx;
    if (t1.vert || t0.vert) vert.add(a.k);
    if (!Object.keys(ch).length) continue;
    const c = clickOf(a.delay);
    timelines[c].push([a.k, ch, Math.max(0, a.delay - B[c - 1]), a.dur]);
  }
  return { stepper: { initial, timelines }, vert, clicks: nClicks, B };
}

// ------------------------------------------------------------------ FAQ-2 cutoff maths (copied from the web deck's faq.js)
const erfc = (x) => {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
};
const GR = { m: 55, s: 14, w: 1 }, GS = { m: 18, s: 6, w: 0.3 };
const CX0 = 380, CX1 = 1300, CY0 = 690, CH = 260;
const tail = (g, c) => g.w * 0.5 * erfc((c - g.m) / (g.s * Math.SQRT2));
const fdr = (c) => tail(GS, c) / (tail(GS, c) + tail(GR, c));
const CUT = (() => { let a = 10, b = 90; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (fdr(m) > 0.002) a = m; else b = m; } return b; })();
const dens = (g, x) => (g.w / g.s) * Math.exp(-0.5 * ((x - g.m) / g.s) ** 2);
const PEAK = dens(GR, GR.m);
const sxC = (v) => CX0 + (v / 100) * (CX1 - CX0), syC = (d) => CY0 - (d / PEAK) * CH;
const areaPts = (g, from) => {
  const pts = [[sxC(from), CY0]];
  for (let v = from; v <= 100; v += 0.5) pts.push([sxC(v), syC(dens(g, v))]);
  pts.push([sxC(100), CY0]);
  return pts;
};

// ------------------------------------------------------------------ overrides
const overrides = {};

// Dfam table: rebuilt as a real PowerPoint table
overrides["te-families"] = {
  skip: (n) => n.kind === "table" || (n.kind === "html" && n.chain[0] === "dfam"),
  extra(E, { spec, stepper, SANS }) {
    const t = spec.nodes.find((n) => n.kind === "table");
    const fx = derive(["dfam"], stepper);
    E.shape("roundRect", { x: 72, y: 340, w: 1456, h: 418, fill: "111821", line: { color: "263240", wpx: 1.5 }, radius: 14 }, fx);
    E.text([{ text: "Dfam", options: { bold: true, color: "FFFFFF", fontSize: 14, fontFace: SANS } },
      { text: "   Browse families", options: { color: T2, fontSize: 12, fontFace: SANS } }],
    { x: 96, y: 346, w: 600, h: 44, size: 14, color: "FFFFFF", font: SANS, wrap: false }, fx);
    E.text([{ text: "dfam.org/browse", options: { color: "6F7D8C", fontSize: 10, fontFace: "Courier New" } }],
      { x: 1200, y: 346, w: 300, h: 44, size: 10, color: "6F7D8C", font: "Courier New", align: "right", wrap: false }, fx);
    const border = [{ type: "none" }, { type: "none" }, { pt: 0.5, color: "263240" }, { type: "none" }];
    const cell = (text, o = {}) => ({ text, options: { fontFace: SANS, fontSize: 10.5, color: T2, valign: "middle", border, margin: [0, 0.07, 0, 0.07], ...o } });
    const rows = t.rows.map((r, i) => r.map((c, j) => {
      if (i === 0) return cell(c.toUpperCase(), { bold: true, fontSize: 8, color: "6F7D8C", align: j === 5 ? "right" : "left" });
      if (j === 0) return cell(c, { fontFace: "Courier New", fontSize: 8.5, color: "6F7D8C" });
      if (j === 1) return cell(c, { bold: true, color: "FFFFFF" });
      if (j === 4) return cell(c.length > 66 ? c.slice(0, 64).trimEnd() + "…" : c, { fontSize: 9.5, color: "8A97A5" });
      if (j === 5) return cell(c, { align: "right", color: "FFFFFF" });
      return cell(c);
    }));
    E.table(rows, { x: 72, y: 393, w: 1456, colW: [190, 190, 250, 190, 510, 126], rowH: 0.3 }, fx);
  },
};

// MADE: 378 dashes become one dashed line per row (per click), animated left to right
overrides["te-made"] = {
  skip: (n) => n.cls && n.cls.includes("mi-copy"),
  extra(E, { spec, stepper }) {
    const copies = spec.nodes.filter((n) => n.cls && n.cls.includes("mi-copy") && n.chain[1] !== "dead");
    const grid = derive(["grid"], stepper);
    const rows = new Map();
    for (const n of copies) {
      const f = derive([n.chain[1]], stepper);
      const e = f.effects.find((x) => x.k === "in" || x.k === "wipe");
      const y = +n.attrs.y1, key = `${y}:${e.c}`;
      if (!rows.has(key)) rows.set(key, { y, c: e.c, x1: Infinity, x2: -Infinity, t0: Infinity, t1: 0, d: e.d });
      const r = rows.get(key);
      r.x1 = Math.min(r.x1, +n.attrs.x1); r.x2 = Math.max(r.x2, +n.attrs.x2);
      r.t0 = Math.min(r.t0, e.t); r.t1 = Math.max(r.t1, e.t + e.d);
    }
    for (const r of [...rows.values()].sort((a, b) => a.y - b.y || a.c - b.c)) {
      const fx = fxOf(false, [{ k: "wipe", c: r.c, t: r.t0, d: Math.max(r.t1 - r.t0, 300) }, ...grid.effects]);
      E.shape("line", { x: r.x1, y: r.y, w: r.x2 - r.x1, h: 0, line: { color: YEL, wpx: 10, dash: true }, dash: { d: 30, sp: 12 } }, fx);
    }
    // the one dash that failed the tests is drawn last so it sits on top of its row
    for (const n of spec.nodes.filter((q) => q.cls && q.cls.includes("mi-copy") && q.chain[1] === "dead")) E.pendingNodes.push({ n, opts: {} });
  },
};

// Venn diagram: rebuilt from the same constants as the web deck (it uses SVG masks)
overrides["te-overlap"] = {
  skip: (n) => n.kind === "circle",
  extra(E, { stepper }) {
    const H = 5935649, R = 3837511, SHARED = 0.9956;
    const RH = 230, RR = RH * Math.sqrt(R / H), CY = 620;
    const lens = (d) => {
      if (d >= RH + RR) return 0;
      if (d <= RH - RR) return Math.PI * RR * RR;
      const a = RH * RH * Math.acos((d * d + RH * RH - RR * RR) / (2 * d * RH));
      const b = RR * RR * Math.acos((d * d + RR * RR - RH * RH) / (2 * d * RR));
      return a + b - 0.5 * Math.sqrt((-d + RH + RR) * (d + RH - RR) * (d - RH + RR) * (d + RH + RR));
    };
    let lo = RH - RR, hi = RH + RR;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lens(m) > SHARED * Math.PI * RR * RR) lo = m; else hi = m; }
    const D = lo, HX = 740, RX = HX + D, H0 = 530, R0 = 1090, ZOOM = 5, PX = RX + RR, TARGET = [1000, 640];
    const blue = { c: [HX, CY], r: RH }, red = { c: [RX, CY], r: RR };
    const circ = (c, r) => ({ x: c[0] - r, y: c[1] - r, w: 2 * r, h: 2 * r });
    // click 1 in, click 2 slide together, click 3 hidden (zoom view), click 4 back
    E.shape("ellipse", { ...circ(blue.c, RH), fill: BLUE }, fxOf(false, [
      { k: "in", c: 1, t: 500, d: 800 }, { k: "move", c: 2, t: 600, d: 1600, dx: HX - H0, dy: 0 },
      { k: "out", c: 3, t: 0, d: 500 }, { k: "in", c: 4, t: 200, d: 600 }], { x: H0 - HX, y: 0 }));
    E.shape("ellipse", { ...circ(red.c, RR), fill: RED }, fxOf(false, [
      { k: "in", c: 1, t: 800, d: 800 }, { k: "move", c: 2, t: 600, d: 1600, dx: RX - R0, dy: 0 },
      { k: "out", c: 3, t: 0, d: 500 }, { k: "in", c: 4, t: 200, d: 600 }], { x: R0 - RX, y: 0 }));
    const poly = (pts) => {
      const x = Math.min(...pts.map((p) => p[0])), y = Math.min(...pts.map((p) => p[1]));
      return { x, y, w: Math.max(...pts.map((p) => p[0])) - x, h: Math.max(...pts.map((p) => p[1])) - y, points: pts, closed: true };
    };
    const lensPts = region(red, blue, true, true);          // overlap, drawn in the background colour
    E.shape("custGeom", { ...poly(lensPts), fill: BG }, fxOf(false, [
      { k: "in", c: 2, t: 2000, d: 400 }, { k: "out", c: 3, t: 0, d: 500 }, { k: "in", c: 4, t: 200, d: 600 }]));
    const hOnly = region(blue, red, false, true);           // HMMER-only crescent, highlighted yellow
    E.shape("custGeom", { ...poly(hOnly), fill: YEL }, fxOf(false, [{ k: "in", c: 4, t: 1900, d: 700 }]));
    // click 3: the RMBlast-only sliver, magnified (the web deck zooms the whole diagram)
    const sliver = region(red, blue, false, true).map(([x, y]) => [
      TARGET[0] + (x - PX) * ZOOM, Math.min(Math.max(TARGET[1] + (y - CY) * ZOOM, 340), 900)]);
    E.shape("custGeom", { ...poly(sliver), fill: RED }, fxOf(false, [
      { k: "in", c: 3, t: 400, d: 900 }, { k: "out", c: 4, t: 0, d: 300 }]));
  },
};

// Divergence slide: the raw-calls graph is drawn by JS in the web deck, so use its two snapshots
overrides["te-diverge"] = {
  skip: (n) => (n.chain[0] === "raw") || n.chain.some((c) => /^f\d+$/.test(c)),
  extra(E, { spec, stepper, emitNode }) {
    const WIPE_MS = 5000;
    spec.snaps.forEach((nodes, i) => {
      const click = i + 1;          // view 1 (to 25%) on click 1, view 2 (to 50%) on click 2; each leaves with the next click
      for (const n of nodes) {
        if (n.chain[0] !== "raw" || n.hidden || n.kind === "circle") continue;
        const line = n.kind === "path";
        const fx = fxOf(false, [{ k: line ? "wipe" : "in", c: click, t: line ? 600 : 0, d: line ? WIPE_MS : 500 }, { k: "out", c: click + 1, t: 0, d: 500 }]);
        emitNode(E, { ...n, chain: [] }, null, { fx, wipe: "left" });
      }
    });
    // fitted curve: one polyline wiped left to right instead of 100 segments
    const segs = spec.nodes.filter((n) => n.kind === "line" && n.chain.some((c) => /^f\d+$/.test(c)))
      .sort((a, b) => +a.chain.find((c) => /^f\d+$/.test(c)).slice(1) - +b.chain.find((c) => /^f\d+$/.test(c)).slice(1));
    if (segs.length) {
      const pts = [[+segs[0].attrs.x1, +segs[0].attrs.y1], ...segs.map((s) => [+s.attrs.x2, +s.attrs.y2])];
      const s0 = segs[0];
      const f = derive(s0.chain.filter((c) => !/^f\d+$/.test(c)), stepper);
      const x = Math.min(...pts.map((p) => p[0])), y = Math.min(...pts.map((p) => p[1]));
      E.shape("custGeom", { x, y, w: Math.max(...pts.map((p) => p[0])) - x, h: Math.max(...pts.map((p) => p[1])) - y, points: pts, closed: false,
        line: { color: s0.stroke.hex, wpx: s0.strokeWidth } }, fxOf(false, [{ k: "wipe", c: 6, t: 200, d: 1800 }, ...f.effects]));
    }
  },
};

overrides["te-conclude"] = {
  fix(n) { if (n.tag === "li") { n.x += 50; n.w -= 50; } },
  extra(E, { spec, stepper }) {
    for (const n of spec.nodes.filter((q) => q.tag === "li")) {
      const fx = derive(n.chain, stepper);
      E.shape("ellipse", { x: 168, y: n.y + 18 - 8, w: 16, h: 16, fill: YEL }, fx);
    }
  },
};

overrides["te-engines"] = { skip: (n) => (n.chain || []).some((c) => /^kh\d+$/.test(c)) };   // 70 ms flashes while the scan runs
overrides.title = { notes: "Offline PowerPoint fallback: no QR code, phone page or live simulation. Click through each slide; every click plays the same step as the web deck." };
overrides["te-novel"] = { skip: (n) => n.cls && n.cls.includes("sr-title") };
overrides.end = { skip: (n) => n.tag === "button" };

// ------------------------------------------------------------------ FAQ
overrides.faq = {
  skip: () => true,
  extra(E, { spec, SANS, SERIF }) {
    const h2 = spec.nodes.find((n) => n.tag === "h2");
    E.text([{ text: h2.runs[0].text, options: { fontFace: SERIF, fontSize: 28.8, color: "EEF2F6" } }],
      { x: h2.x, y: h2.y, w: h2.w, h: h2.h + 8, size: 28.8, color: "EEF2F6", font: SERIF, wrap: false }, noFx);
    spec.nodes.filter((n) => n.tag === "button").forEach((n, i) => {
      E.shape("roundRect", { x: n.x, y: n.y, w: n.w, h: n.h, fill: BG, line: { color: "263240", wpx: 2 }, radius: 36 }, noFx);
      E.text([{ text: n.runs.map((r) => r.text).join("").trim(), options: { fontFace: SANS, fontSize: 19, bold: true, color: "FFFFFF" } }],
        { x: n.x + 56, y: n.y + 20, w: n.w - 112, h: n.h - 40, size: 19, color: "FFFFFF", font: SANS, bold: true, wrap: true, valign: "middle" }, noFx);
      // whole card is a link to its FAQ slide (a transparent shape on top)
      E.shape("roundRect", { x: n.x, y: n.y, w: n.w, h: n.h, fill: BG, fillT: 100, radius: 36, hyperlink: { slide: 23 + i, tooltip: "Open this FAQ" } }, noFx);
    });
  },
};

function faqSlide(panel, index, faqNode) {
  const conv = faqStepper(panel.anims);
  return {
    id: `faq${panel.n}`, steps: conv.clicks, nodes: panel.nodes, stepper: conv.stepper, vert: conv.vert, B: conv.B, panel, faqNode,
    notes: `FAQ ${panel.n}: ${panel.question} Each click plays the next part of the animation (the web deck plays it automatically).`,
  };
}

for (const n of [1, 2, 3, 4]) {
  overrides[`faq${n}`] = {
    skip: () => false,
    fix(node, spec) {
      if (n !== 2) return;
      // FAQ 2: the cutoff line, read-out and tails are redrawn per frame in the web deck. The extracted nodes are
      // its start state; move/crossfade them to the end state here.
      const click = spec.steps, base = spec.B[click - 1], t0 = 10000 - base, MS = 3800, dx = sxC(CUT) - sxC(4);
      const has = (k) => node.chain.includes(k);
      node.extraFx = node.extraFx || [];
      if (has("cl")) node.extraFx.push({ k: "move", c: click, t: t0, d: MS, dx, dy: 0 });
      if (has("cr") || has("tg") || has("ts")) node.extraFx.push({ k: "out", c: click, t: t0 + MS - 250, d: 250 });
      if (has("cn")) { node.bbox = { ...node.bbox, x: node.bbox.x + dx }; node.attrs = { ...node.attrs, x: String(+node.attrs.x + dx) }; }
    },
    extra(E, { spec, SANS, SERIF }) {
      E.text([{ text: "FAQs", options: { fontFace: SERIF, fontSize: 28.8, color: "EEF2F6" } }],
        { x: 72, y: 52, w: 600, h: 61, size: 28.8, color: "EEF2F6", font: SERIF, wrap: false }, noFx);
      E.text([{ text: spec.panel.question, options: { fontFace: SANS, fontSize: 22, bold: true, color: "FFFFFF" } }],
        { x: 160, y: 150, w: 1280, h: 60, size: 22, color: "FFFFFF", font: SANS, bold: true, align: "center", wrap: true, valign: "middle" }, noFx);
      E.shape("roundRect", { x: 1290, y: 60, w: 238, h: 48, fill: "1D3461", radius: 24 }, noFx);
      E.text([{ text: "Back to FAQs", options: { fontFace: SANS, fontSize: 13, bold: true, color: "FFFFFF" } }],
        { x: 1290, y: 60, w: 238, h: 48, size: 13, color: "FFFFFF", font: SANS, bold: true, align: "center", wrap: false }, noFx);
      E.shape("roundRect", { x: 1290, y: 60, w: 238, h: 48, fill: BG, fillT: 100, radius: 24, hyperlink: { slide: 22, tooltip: "Back to the FAQ list" } }, noFx);
      if (n === 2) {
        // end state of the redrawn parts
        const click = spec.steps, base = spec.B[click - 1], tEnd = 10000 - base + 3800 - 250;
        const find = (k) => spec.nodes.find((q) => q.chain.includes(k));
        const cr = find("cr"), tg = find("tg"), ts = find("ts"), dx = sxC(CUT) - sxC(4);
        const inFx = fxOf(false, [{ k: "in", c: click, t: tEnd, d: 400 }]);
        for (const [node, g] of [[tg, GR], [ts, GS]]) {
          if (!node) continue;
          const pts = areaPts(g, CUT), x = Math.min(...pts.map((p) => p[0])), y = Math.min(...pts.map((p) => p[1]));
          E.shape("custGeom", { x, y, w: Math.max(...pts.map((p) => p[0])) - x, h: Math.max(...pts.map((p) => p[1])) - y, points: pts, closed: true,
            fill: node.fill && node.fill.hex, fillT: Math.round((1 - (node.fillOpacity ?? 1) * (node.fill ? node.fill.a : 1)) * 100) }, inFx);
        }
        if (cr) {
          const final = { ...cr, text: `False hits above cutoff: ${(100 * fdr(CUT)).toFixed(1)}%`, chain: [],
            bbox: { ...cr.bbox, x: cr.bbox.x + dx }, attrs: { ...cr.attrs, x: String(+cr.attrs.x + dx) } };
          E.pendingNodes.push({ n: final, opts: { fx: inFx } });
        }
      }
    },
  };
}

function extraSlides(MODEL) {
  const faq = MODEL.find((m) => m.id === "faq");
  if (!faq) return [];
  return [
    { id: "faq", steps: 0, nodes: faq.nodes, stepper: null, notes: "Links to the four FAQ slides." },
    ...faq.panels.map((p, i) => faqSlide(p, i, faq)),
  ];
}

module.exports = { overrides, extraSlides, fxOf, region, CUT, fdr, areaPts, sxC, syC, dens, GR, GS, CY0, CH };
