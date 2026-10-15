/* Builds the offline PowerPoint fallback for the thesis talk.

   node build.cjs            -> thesis-fallback.pptx   (animated, one slide per web slide)
   node build.cjs --states   -> out/states.pptx        (every click state as its own static slide, for visual QA)

   Geometry and animation timelines come from extract/model.json (made by extract/extract.mjs from the live
   web deck), so positions, colours and click structure match the web deck. Simplifications are listed in
   README.md. */

const fs = require("node:fs");
const path = require("node:path");
const pptxgen = require("pptxgenjs");
const JSZip = require("jszip");
const { derive, stateAt } = require("./lib/effects.cjs");
const timing = require("./lib/timing.cjs");
const { overrides, extraSlides } = require("./lib/overrides.cjs");

const MODEL = require("./extract/model.json");
const STATES = process.argv.includes("--states");
const OUT = path.join(__dirname, STATES ? "out/states.pptx" : "thesis-fallback.pptx");

const BG = "0A0F15";
const PX = 1 / 120;                               // inches per canvas px (canvas is 1600 x 900 = 13.333 x 7.5 in)
const inch = (v) => +(v * PX).toFixed(4);
const pt = (px) => +(px * 0.6).toFixed(2);
const SERIF = "Cambria", SANS = "Arial";
const SANS_SCALE = 1.06;                         // Arial runs narrower than the web deck's Inter

// ---------------------------------------------------------------- helpers
const fontOf = (family) => (/Editorial/.test(family || "") ? SERIF : SANS);
const transp = (a) => Math.max(0, Math.min(100, Math.round((1 - a) * 100)));

function parseTf(list) {
  const out = [];
  for (const s of list || []) {
    for (const m of s.matchAll(/(rotate|translate|scale)\(([^)]*)\)/g)) {
      const v = m[2].trim().split(/[\s,]+/).map(Number);
      out.push({ t: m[1], v });
    }
  }
  return out;
}
function applyTf(tf, x, y) {
  for (let i = tf.length - 1; i >= 0; i--) {
    const { t, v } = tf[i];
    if (t === "rotate") {
      const a = (v[0] * Math.PI) / 180, cx = v[1] || 0, cy = v[2] || 0;
      const dx = x - cx, dy = y - cy;
      x = cx + dx * Math.cos(a) - dy * Math.sin(a);
      y = cy + dx * Math.sin(a) + dy * Math.cos(a);
    } else if (t === "translate") { x += v[0]; y += v[1] || 0; }
    else if (t === "scale") { x *= v[0]; y *= v[1] ?? v[0]; }
  }
  return [x, y];
}
const rotAngle = (tf) => tf.filter((s) => s.t === "rotate").reduce((a, s) => a + s.v[0], 0);

function flatten(d) {
  // M L H V v Z only (all the deck's paths), returns polylines [[x,y]...]
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const subs = []; let cur = null, cmd = "", x = 0, y = 0, i = 0;
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    switch (cmd) {
      case "M": x = num(); y = num(); cur = [[x, y]]; subs.push(cur); cmd = "L"; break;
      case "L": x = num(); y = num(); cur.push([x, y]); break;
      case "H": x = num(); cur.push([x, y]); break;
      case "V": y = num(); cur.push([x, y]); break;
      case "v": y += num(); cur.push([x, y]); break;
      case "h": x += num(); cur.push([x, y]); break;
      case "Z": case "z": cur.closed = true; break;
      default: throw new Error("unsupported path command " + cmd);
    }
  }
  return subs;
}

// ---------------------------------------------------------------- emitter
class Emitter {
  constructor(pres, slide, slideId, state) {
    this.pres = pres; this.slide = slide; this.slideId = slideId; this.state = state;
    this.items = []; this.n = 0; this.cust = [];
  }
  /** position/visibility for a node with effect model fx (null when the node must be skipped in a state render) */
  at(fx) {
    if (this.state == null) {
      // starts hidden and the web deck never shows it: leave it out
      if (!fx.initVisible && !fx.effects.some((e) => e.k === "in" || e.k === "wipe")) return null;
      return { dx: fx.init.x, dy: fx.init.y };
    }
    const s = stateAt(fx, this.state);
    return s.visible ? { dx: s.dx, dy: s.dy } : null;
  }
  reg(name, fx, meta) {
    if (this.state == null && fx.effects.length) this.items.push({ name, fx: fx.effects, ...meta });
  }
  name() { return `${this.slideId}_${++this.n}`; }

  // x,y,w,h in px
  shape(kind, o, fx, meta = {}) {
    const name = this.name();
    const p = this.at(fx); if (!p) return null;
    const opt = { objectName: name, x: inch(o.x + p.dx), y: inch(o.y + p.dy), w: inch(Math.max(o.w, 0.5)), h: inch(Math.max(o.h, 0)) };
    if (o.fill) opt.fill = { color: o.fill, transparency: o.fillT || 0 };
    else opt.fill = { type: "none" };
    if (o.line) opt.line = { color: o.line.color, width: Math.max(o.line.wpx * 0.6, 0.25), transparency: o.line.t || 0, ...(o.line.dash ? { dashType: "sysDash" } : {}) };
    else opt.line = { type: "none" };
    if (o.radius) opt.rectRadius = inch(o.radius);
    if (o.flipV) opt.flipV = true;
    if (o.flipH) opt.flipH = true;
    if (o.rotate) opt.rotate = o.rotate;
    if (o.hyperlink) opt.hyperlink = o.hyperlink;
    if (o.points) {
      const minx = Math.min(...o.points.map((q) => q[0])), miny = Math.min(...o.points.map((q) => q[1]));
      opt.points = o.points.map((q, i) => ({ x: inch(q[0] - minx), y: inch(q[1] - miny), ...(i === 0 ? { moveTo: true } : {}) }));
      if (o.closed) opt.points.push({ close: true });
    }
    this.slide.addShape(this.pres.ShapeType[kind], opt);
    if (o.dash) this.cust.push({ name, ...o.dash, wpx: o.line.wpx });
    this.reg(name, fx, { fill: !!o.fill, text: false, wipe: meta.wipe });
    return name;
  }

  table(rows, o, fx) {
    const name = this.name();
    const p = this.at(fx); if (!p) return null;
    this.slide.addTable(rows, { objectName: name, x: inch(o.x + p.dx), y: inch(o.y + p.dy), w: inch(o.w), colW: o.colW.map(inch), rowH: o.rowH });
    this.reg(name, fx, { fill: false, text: false });
    return name;
  }

  text(runs, o, fx, meta = {}) {
    const name = this.name();
    const p = this.at(fx); if (!p) return null;
    const opt = {
      objectName: name, isTextBox: true, margin: 0, wrap: o.wrap !== false,
      x: inch(o.x + p.dx), y: inch(o.y + p.dy), w: inch(o.w), h: inch(o.h),
      fontFace: o.font || SANS, fontSize: o.size, color: o.color, bold: !!o.bold, italic: !!o.italic,
      align: o.align || "left", valign: o.valign || "middle", fit: "none",
    };
    if (o.charSpacing) opt.charSpacing = o.charSpacing;
    if (o.rotate) opt.rotate = o.rotate;
    if (o.transparency) opt.transparency = o.transparency;
    if (o.lineSpacing) opt.lineSpacingMultiple = o.lineSpacing;
    if (o.hyperlink) opt.hyperlink = o.hyperlink;
    this.slide.addText(runs, opt);
    this.reg(name, fx, { fill: false, text: true });
    return name;
  }
}

const noFx = { initVisible: true, init: { x: 0, y: 0 }, effects: [] };


// ---------------------------------------------------------------- scaled groups (te-engines cards shrink)
function bounds(n) {
  const a = n.attrs || {}, f = (k) => parseFloat(a[k]);
  switch (n.kind) {
    case "rect": return [f("x"), f("y"), f("x") + f("width"), f("y") + f("height")];
    case "line": return [Math.min(f("x1"), f("x2")), Math.min(f("y1"), f("y2")), Math.max(f("x1"), f("x2")), Math.max(f("y1"), f("y2"))];
    case "circle": return [f("cx") - f("r"), f("cy") - f("r"), f("cx") + f("r"), f("cy") + f("r")];
    case "ellipse": return [f("cx") - f("rx"), f("cy") - f("ry"), f("cx") + f("rx"), f("cy") + f("ry")];
    case "polygon": case "polyline": {
      const p = a.points.trim().split(/\s+/).map((s) => s.split(",").map(Number));
      return [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
    }
    case "text": return [n.bbox.x, n.bbox.y, n.bbox.x + n.bbox.w, n.bbox.y + n.bbox.h];
    default: return null;
  }
}
function groupCenter(spec, name) {
  const bs = spec.nodes.filter((n) => (n.chain || []).includes(name)).map(bounds).filter(Boolean);
  if (!bs.length) return null;
  return { x: (Math.min(...bs.map((b) => b[0])) + Math.max(...bs.map((b) => b[2]))) / 2, y: (Math.min(...bs.map((b) => b[1])) + Math.max(...bs.map((b) => b[3]))) / 2 };
}
function scaleNode(n, s, G) {
  const m = structuredClone(n), a = m.attrs || {}, S = (v, g) => G[g] + s * (v - G[g]);
  const set = (k, v) => { a[k] = String(v); };
  switch (n.kind) {
    case "rect": set("x", S(+a.x, "x")); set("y", S(+a.y, "y")); set("width", s * a.width); set("height", s * a.height); if (a.rx) set("rx", s * a.rx); break;
    case "line": set("x1", S(+a.x1, "x")); set("x2", S(+a.x2, "x")); set("y1", S(+a.y1, "y")); set("y2", S(+a.y2, "y")); break;
    case "circle": set("cx", S(+a.cx, "x")); set("cy", S(+a.cy, "y")); set("r", s * a.r); break;
    case "ellipse": set("cx", S(+a.cx, "x")); set("cy", S(+a.cy, "y")); set("rx", s * a.rx); set("ry", s * a.ry); break;
    case "polygon": case "polyline": a.points = a.points.trim().split(/\s+/).map((q) => { const [x, y] = q.split(",").map(Number); return `${S(x, "x")},${S(y, "y")}`; }).join(" "); break;
    case "text": m.bbox = { x: S(n.bbox.x, "x"), y: S(n.bbox.y, "y"), w: s * n.bbox.w, h: s * n.bbox.h }; m.fontSize = s * n.fontSize; m.spacing = s * (n.spacing || 0); break;
  }
  m.strokeWidth = s * (n.strokeWidth || 0);
  return m;
}

// ---------------------------------------------------------------- generic node conversion
function emitNode(E, n, stepper, opts = {}) {
  opts = { groups: E.groups, ...opts };
  const fx = opts.fx || derive(n.chain || [], stepper);
  if (n.extraFx) fx.effects.push(...n.extraFx);
  if (n.hidden) return null;
  if (fx.scaleName && opts.groups && opts.groups[fx.scaleName]) {
    const G = opts.groups[fx.scaleName];
    if (E.state == null) {
      // animated: shrink/grow each shape about its own centre and move it to where the scaled group puts it
      if (fx.initScale !== 1 && fx.initScale) n = scaleNode(n, fx.initScale, G);
      const b = bounds(n);
      if (b) {
        const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, extra = [];
        for (const e of fx.effects) if (e.k === "scale") { e.r = e.s1 / e.s0; extra.push({ k: "move", c: e.c, t: e.t, d: e.d, dx: (e.s1 - e.s0) * (cx - G.x), dy: (e.s1 - e.s0) * (cy - G.y) }); }
        fx.effects.push(...extra);
      }
    } else {
      const sc = stateAt(fx, E.state).sc;
      if (Math.abs(sc - 1) > 1e-3) n = scaleNode(n, sc, G);
    }
  }
  const tf = parseTf(n.tf);
  const fillHex = n.fill && n.fill.hex, strokeHex = n.stroke && n.stroke.hex;
  const fillA = (n.fill ? n.fill.a : 1) * (isNaN(n.fillOpacity) ? 1 : n.fillOpacity) * (n.opacityAttr ? +n.opacityAttr : 1);
  const strokeA = (n.stroke ? n.stroke.a : 1) * (isNaN(n.strokeOpacity) ? 1 : n.strokeOpacity) * (n.opacityAttr ? +n.opacityAttr : 1);
  const a = n.attrs || {};
  const num = (k, d = 0) => (a[k] === undefined ? d : parseFloat(a[k]));
  const line = strokeHex && n.strokeWidth > 0 ? { color: strokeHex, wpx: n.strokeWidth, t: transp(strokeA) } : null;
  let wipe = rotAngle(tf) === -90 ? "down" : rotAngle(tf) === 90 ? "up" : "left";
  if (opts.wipe) wipe = opts.wipe;
  if (opts.vert) { const k = (n.chain || []).find((c) => opts.vert.has(c)); if (k) wipe = k.startsWith("proj") ? "up" : "down"; }
  const R = Math.round(rotAngle(tf)) % 360;

  switch (n.kind) {
    case "rect": {
      let x = num("x"), y = num("y"), w = num("width"), h = num("height");
      if (tf.length) {
        const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => applyTf(tf, px, py));
        x = Math.min(...pts.map((q) => q[0])); y = Math.min(...pts.map((q) => q[1]));
        w = Math.max(...pts.map((q) => q[0])) - x; h = Math.max(...pts.map((q) => q[1])) - y;
      }
      const dash = n.dash && n.dash !== "none" ? n.dash.split(/[ ,]+/).map(parseFloat) : null;
      return E.shape(num("rx") > 0 ? "roundRect" : "rect",
        { x, y, w, h, fill: fillHex, fillT: transp(fillA), line: line && dash ? { ...line, dash: true } : line,
          dash: line && dash ? { d: dash[0], sp: dash[1] ?? dash[0] } : null, radius: Math.min(num("rx"), Math.min(w, h) / 2) }, fx, { wipe });
    }
    case "circle": case "ellipse": {
      const rx = n.kind === "circle" ? num("r") : num("rx"), ry = n.kind === "circle" ? num("r") : num("ry");
      const [cx, cy] = applyTf(tf, num("cx"), num("cy"));
      return E.shape("ellipse", { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry, fill: fillHex, fillT: transp(fillA), line }, fx);
    }
    case "line": {
      const [x1, y1] = applyTf(tf, num("x1"), num("y1")), [x2, y2] = applyTf(tf, num("x2"), num("y2"));
      const w = n.strokeWidth || 1, col = strokeHex || "ffffff";
      const dash = n.dash && n.dash !== "none" ? n.dash.split(/[ ,]+/).map(parseFloat) : null;
      const horiz = Math.abs(y1 - y2) < 0.01, vert = Math.abs(x1 - x2) < 0.01;
      if ((horiz || vert) && !dash) {
        const round = n.cap === "round";
        return E.shape(round ? "roundRect" : "rect", horiz
          ? { x: Math.min(x1, x2), y: y1 - w / 2, w: Math.abs(x2 - x1), h: w, fill: col, fillT: transp(strokeA), radius: round ? w / 2 : 0 }
          : { x: x1 - w / 2, y: Math.min(y1, y2), w, h: Math.abs(y2 - y1), fill: col, fillT: transp(strokeA), radius: round ? w / 2 : 0 },
        fx, { wipe: vert ? "up" : "left" });
      }
      return E.shape("line", {
        x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
        line: { color: col, wpx: w, t: transp(strokeA), dash: !!dash },
        dash: dash ? { d: dash[0], sp: dash[1] ?? dash[0] } : null,
        flipV: (y2 < y1) !== (x2 < x1) ? true : false,
      }, fx);
    }
    case "polygon": case "polyline": {
      const pts = a.points.trim().split(/\s+/).map((s) => applyTf(tf, ...s.split(",").map(Number)));
      return polyOut(E, pts, n.kind === "polygon", fillHex, fillA, line, fx);
    }
    case "path": {
      let last = null;
      for (const sub of flatten(a.d)) {
        const pts = sub.map(([x, y]) => applyTf(tf, x, y));
        last = polyOut(E, pts, !!sub.closed, fillHex, fillA, line, fx);
      }
      return last;
    }
    case "text": return emitSvgText(E, n, fx, tf);
    case "html": return emitHtml(E, n, fx);
    default: return null;
  }
}

function polyOut(E, pts, closed, fillHex, fillA, line, fx) {
  const minx = Math.min(...pts.map((q) => q[0])), miny = Math.min(...pts.map((q) => q[1]));
  const maxx = Math.max(...pts.map((q) => q[0])), maxy = Math.max(...pts.map((q) => q[1]));
  const filled = closed && fillHex;
  return E.shape("custGeom", {
    x: minx, y: miny, w: Math.max(maxx - minx, 1), h: Math.max(maxy - miny, 1), points: pts, closed,
    fill: filled ? fillHex : null, fillT: transp(fillA), line,
  }, fx);
}

function emitSvgText(E, n, fx, tf) {
  const bb = n.bbox, px = n.fontSize;
  const cx0 = bb.x + bb.w / 2, cy0 = bb.y + bb.h / 2;
  const [cx, cy] = applyTf(tf, cx0, cy0);
  const ww = bb.w * 1.14 + px * 0.6, hh = Math.max(bb.h, px * 1.25);
  let x = cx - ww / 2;
  if (!tf.length) {
    if (n.anchor === "start") x = bb.x - 2; else if (n.anchor === "end") x = bb.x + bb.w - ww + 2;
  }
  const font = (n.cls || []).includes("fq-base") ? "Courier New" : fontOf(n.family), color = (n.fill && n.fill.hex) || "ffffff";
  const k = font === SANS ? SANS_SCALE : 1;
  const base = { color, fontSize: +(pt(px) * k).toFixed(2), bold: parseInt(n.fontWeight) >= 600, italic: n.fontStyle === "italic", fontFace: font };
  let runs;
  if (n.tspans && n.tspans.length) {
    runs = []; let rest = n.text;
    for (const t of n.tspans) {
      const at = rest.indexOf(t.text);
      if (at < 0) continue;
      if (at > 0) runs.push({ text: rest.slice(0, at), options: { ...base } });
      const sup = t.dy && t.dy.startsWith("-");
      runs.push({ text: (t.cls || []).includes("tm-name") ? "  " + t.text : t.text, options: { ...base, color: t.fill || color, bold: parseInt(t.weight) >= 600, fontSize: +((sup ? pt(px) : pt(t.size || px)) * k).toFixed(2), superscript: !!sup } });
      rest = rest.slice(at + t.text.length);
    }
    if (rest) runs.push({ text: rest, options: { ...base } });
  } else runs = [{ text: n.text, options: { ...base } }];
  return E.text(runs, {
    x, y: cy - hh / 2, w: ww, h: hh, size: base.fontSize, color, bold: base.bold, italic: base.italic, font,
    align: n.anchor === "middle" ? "center" : n.anchor === "end" ? "right" : "left", wrap: false,
    rotate: rotAngle(tf) ? (rotAngle(tf) + 360) % 360 : 0, charSpacing: n.spacing ? pt(n.spacing) : 0,
    transparency: n.fillOpacity < 1 ? transp(n.fillOpacity) : 0,
  }, fx);
}

function emitHtml(E, n, fx) {
  if (!n.ok || !n.w) return null;
  const serif = /Editorial/.test(n.family), px = n.fontSize;
  const base = { color: n.color || "ffffff", fontFace: serif ? SERIF : SANS, fontSize: +(pt(px) * (serif ? 1 : SANS_SCALE)).toFixed(2), bold: parseInt(n.weight) >= 600 };
  const runs = [];
  for (const r of n.runs) {
    if (r.text === "\n") { if (runs.length) runs[runs.length - 1].options.breakLine = true; continue; }
    runs.push({
      text: r.text.replace(/\s*\n\s*/g, " "),
      options: { ...base, color: r.color || base.color, italic: !!r.italic, bold: base.bold || !!r.bold,
        ...(r.underline ? { underline: { style: "sng", color: r.ulColor || "FFFFFF" } } : {}) },
    });
  }
  const isTitle = n.tag === "h2" && (n.chain.length === 0 || n.chain[0] === "title") && !n.cls.includes("sr-title");
  let size = base.fontSize;
  if (isTitle) {
    const len = n.runs.map((r) => r.text).join("").length;
    size = Math.min(size, +(1560 / len).toFixed(1));
    runs.forEach((r) => (r.options.fontSize = size));
  }
  const align = n.align === "center" ? "center" : n.align === "right" || n.align === "end" ? "right" : "left";
  const lines = Math.max(1, Math.round(n.h / (n.lineHeight || px * 1.2)));
  return E.text(runs, {
    x: n.x, y: n.y, w: n.w + (n.tag === "p" ? 0 : 6), h: n.h + 8, size, color: base.color, font: base.fontFace, bold: base.bold,
    align, valign: n.tag === "p" || n.tag === "li" ? "top" : "middle", wrap: lines > 1 || n.tag === "p" || n.tag === "li",
    lineSpacing: lines > 1 ? 1.0 : 0,
  }, fx);
}

// ---------------------------------------------------------------- slides
function addSlides(pres, mode) {
  const registry = [];
  const make = (spec, state) => {
    const slide = pres.addSlide();
    slide.background = { color: BG };
    const E = new Emitter(pres, slide, spec.id, state);
    const ov = overrides[spec.id] || {};
    const nodes = spec.nodes.filter((n) => !(ov.skip && ov.skip(n))).map((n) => structuredClone(n));
    const stepper = spec.stepper;
    E.pendingNodes = [];
    E.groups = {};
    for (const nm of new Set(spec.nodes.flatMap((q) => q.chain || []))) { const c = groupCenter(spec, nm); if (c) E.groups[nm] = c; }
    for (const n of nodes) { if (ov.fix) ov.fix(n, spec); emitNode(E, n, stepper, { vert: spec.vert }); }
    if (ov.extra) ov.extra(E, { spec, stepper, derive, noFx, inch, pt, SERIF, SANS, emitNode });
    for (const q of E.pendingNodes) emitNode(E, q.n, stepper, q.opts);
    const notes = ov.notes || spec.notes;
    if (notes && state == null) slide.addNotes(notes);
    if (state != null) {
      slide.addText(`${spec.id} · after ${state} click${state === 1 ? "" : "s"}`, { x: 0.1, y: 7.25, w: 6, h: 0.2, fontSize: 8, color: "FF3B30", fontFace: "Arial", margin: 0 });
    }
    registry.push({ spec, E });
  };
  const specs = [...MODEL.filter((s) => s.id !== "faq"), ...extraSlides(MODEL)];
  // keep the web deck's order
  const order = ["title", "te-intro", "te-t2t", "te-look", "te-families", "te-discover", "te-repeats", "te-results", "te-novel", "te-masker",
    "te-compare", "te-made", "te-tsdcheck", "te-controls", "te-missed", "te-phmm", "te-engines", "te-overlap", "te-diverge", "te-conclude", "end",
    "faq", "faq1", "faq2", "faq3", "faq4"];
  specs.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  for (const spec of specs) {
    if (mode === "states") for (let k = 0; k <= spec.steps; k++) make(spec, k);
    else make(spec, null);
  }
  return registry;
}

// ---------------------------------------------------------------- post-processing (timing XML, custom dashes)
async function post(file, registry) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (let i = 0; i < registry.length; i++) {
    const { E } = registry[i];
    const f = `ppt/slides/slide${i + 1}.xml`;
    let xml = await zip.file(f).async("string");
    // custom dash patterns
    for (const c of E.cust) {
      const re = new RegExp(`(name="${c.name}"[\\s\\S]*?)<a:prstDash val="sysDash"/>`);
      const d = Math.round((c.d / c.wpx) * 100000), sp = Math.round((c.sp / c.wpx) * 100000);
      xml = xml.replace(re, `$1<a:custDash><a:ds d="${d}" sp="${sp}"/></a:custDash>`);
    }
    // pptxgenjs numbers a table's frame independently of the other shapes; give it an id of its own
    let gf = 0;
    xml = xml.replace(/(<p:graphicFrame>\s*<p:nvGraphicFramePr><p:cNvPr id=")\d+(")/g, (_, a, b) => `${a}${9000 + ++gf}${b}`);
    if (E.items.length) {
      const ids = new Map(); let m;
      const rx = /<p:(sp|cxnSp|graphicFrame|pic)>[\s\S]*?<p:cNvPr id="(\d+)" name="([^"]*)"/g;
      while ((m = rx.exec(xml))) ids.set(m[3], { id: m[2], tag: m[1] });
      const items = E.items.map((it) => {
        const info = ids.get(it.name);
        if (!info) throw new Error(`no shape ${it.name} on ${registry[i].spec.id}`);
        return { spid: info.id, kind: info.tag === "sp" ? "sp" : "frame", fx: it.fx, fill: it.fill, text: it.text, wipe: it.wipe };
      });
      const t = timing.build(items);
      xml = xml.replace("</p:sld>", `${t}</p:sld>`);
    }
    zip.file(f, xml);
  }
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(file, buf);
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "Discovery and annotation of transposable elements in the T2T-CHM13v2.0 genome assembly";
  pres.author = "Luke O'Keeffe";
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const registry = addSlides(pres, STATES ? "states" : "anim");
  await pres.writeFile({ fileName: OUT });
  await post(OUT, registry);
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  const seen = new Set();
  fs.writeFileSync(path.join(__dirname, "out", STATES ? "manifest-states.json" : "manifest.json"), JSON.stringify(registry.map((r) => ({ id: r.spec.id, steps: r.spec.steps, state: r.E.state })).filter((m) => (STATES ? true : true))));
  if (STATES) fs.writeFileSync(path.join(path.dirname(OUT), "extra.json"), JSON.stringify(Object.fromEntries(registry.filter((r) => /^faq/.test(r.spec.id)).map((r) => [r.spec.id, r.spec.steps]).filter((v, i, a) => a.findIndex((x) => x[0] === v[0]) === i))));
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${registry.length} slides)`);
})();
