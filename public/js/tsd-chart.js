/* Pooled results: a hero %, a 2/2-vs-rest bar with the background rate marked,
   and (on the slide) a running-proportion line that should settle inside the
   chance band around the background rate. */

import { TARGET } from "./tsd-model.js";

const Y_MAX = 0.4;                  // y axis 0–40%; early wild values clamp to the top
const W = 900, H = 280;             // chart viewBox = its box on the fixed 1600×900 slide
const M = { top: 14, right: 74, bottom: 34, left: 52 };
const MAX_POINTS = 1200;
const SVG_NS = "http://www.w3.org/2000/svg";

const fmtInt = (n) => n.toLocaleString("en-IE");
const fmtPct = (p, d = 1) => (p * 100).toFixed(d);

function niceCeil(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function niceStep(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function el(name, attrs = {}, parent) {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

/**
 * @param {HTMLElement} root
 * @param {object} [o]
 * @param {boolean} [o.compact]  phone: hero + bar only, no line chart
 */
export function createPooledPanel(root, { compact = false, target = TARGET } = {}) {
  root.classList.add("pooled");
  root.classList.toggle("pooled--compact", compact);
  root.innerHTML = `
    <div class="pooled-head">
      <div class="hero"><span class="hero-val">–</span><span class="hero-unit" hidden>%</span></div>
      <div class="hero-meta">
        <div class="hero-label">of rounds were 2/2 (TSD signal)</div>
        <div class="hero-n">No rounds yet</div>
      </div>
    </div>
    <div class="pbar" role="img">
      <div class="pbar-target-label" style="left:${target * 100}%">background ${fmtPct(target, 2)}%</div>
      <div class="pbar-track">
        <div class="pbar-empty"></div>
        <div class="seg seg-sig" style="width:0"></div>
        <div class="seg seg-bg" style="left:0;opacity:0"></div>
        <div class="pbar-target" style="left:${target * 100}%"></div>
      </div>
    </div>
    <div class="legend"><span><i class="sw sw-sig"></i>2/2 · TSD signal</span><span><i class="sw sw-bg"></i>0/2 or 1/2</span></div>
    ${compact ? "" : `
    <div class="conv-wrap">
      <div class="conv-title">Running proportion of 2/2 rounds</div>
      <div class="conv-sub">Dashed: background rate ${fmtPct(target, 2)}% · Shaded: where ~95% of runs land by chance alone</div>
      <svg class="conv" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>
    </div>`}`;

  const heroVal = root.querySelector(".hero-val");
  const heroN = root.querySelector(".hero-n");
  const heroUnit = root.querySelector(".hero-unit");
  const pbar = root.querySelector(".pbar");
  const segSig = root.querySelector(".seg-sig");
  const segBg = root.querySelector(".seg-bg");
  const empty = root.querySelector(".pbar-empty");

  let n = 0, k = 0;
  let heroShown = null;
  let pts = [[0, 0]];
  let xMaxShown = 20;
  let raf = 0;

  const chart = compact ? null : buildChart(root.querySelector(".conv"), target);

  function xMaxTarget() { return niceCeil(Math.max(20, n * 1.15)); }

  function frame() {
    raf = 0;
    let moving = false;

    if (n > 0) {
      const goal = (k / n) * 100;
      heroShown = heroShown == null ? goal : heroShown + (goal - heroShown) * 0.18;
      if (Math.abs(goal - heroShown) < 0.02) heroShown = goal; else moving = true;
      heroVal.textContent = heroShown.toFixed(1);
    } else {
      heroShown = null;
      heroVal.textContent = "–";
    }

    if (chart) {
      const goal = xMaxTarget();
      xMaxShown += (goal - xMaxShown) * 0.12;
      if (Math.abs(goal - xMaxShown) < goal * 0.002) xMaxShown = goal; else moving = true;
      chart.draw(pts, xMaxShown);
    }

    if (moving) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  /** @param {{n:number,k:number}} s  @param {string} [suffix] text after "N rounds" */
  function update(s, suffix = "pooled") {
    n = s.n;
    k = s.k;
    const last = pts[pts.length - 1];
    if (n > last[0]) {
      pts.push([n, k]);
      if (pts.length > MAX_POINTS) pts = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
    }

    heroN.textContent = n === 0 ? "No rounds yet" : `${fmtInt(n)} ${n === 1 ? "round" : "rounds"} ${suffix}`;
    heroUnit.hidden = n === 0;
    heroUnit.parentElement.classList.toggle("is-empty", n === 0);
    const p = n ? k / n : 0;
    empty.style.opacity = n ? 0 : 1;
    segSig.style.width = k ? `${p * 100}%` : "0";
    segBg.style.opacity = n ? 1 : 0;
    segBg.style.left = k ? `calc(${p * 100}% + 2px)` : "0";
    pbar.setAttribute("aria-label", n
      ? `${fmtPct(p)}% of ${fmtInt(n)} rounds were 2/2; background rate ${fmtPct(target, 2)}%`
      : "No rounds yet");
    kick();
  }

  /** Replace the line's history (from the server): [[n, k], ...] */
  function setHistory(points) {
    pts = points && points.length ? points.slice() : [[0, 0]];
    if (pts[0][0] !== 0) pts.unshift([0, 0]);
    kick();
  }

  return { update, setHistory, get n() { return n; }, get k() { return k; } };
}

function buildChart(svg, target) {
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;
  const yOf = (p) => M.top + ph * (1 - Math.min(p, Y_MAX) / Y_MAX);

  const clipId = `clip-${Math.random().toString(36).slice(2)}`;
  const defs = el("defs", {}, svg);
  el("rect", { x: M.left, y: M.top - 8, width: pw + 8, height: ph + 16 }, el("clipPath", { id: clipId }, defs));

  const grid = el("g", {}, svg);
  for (const p of [0, 0.1, 0.2, 0.3, 0.4]) {
    el("line", { class: "grid", x1: M.left, x2: M.left + pw, y1: yOf(p), y2: yOf(p) }, grid);
    el("text", { class: "tick", x: M.left - 10, y: yOf(p) + 5, "text-anchor": "end" }, grid).textContent = `${p * 100}%`;
  }
  const xTicks = el("g", {}, svg);

  const plot = el("g", { "clip-path": `url(#${clipId})` }, svg);
  const band = el("path", { class: "band" }, plot);
  el("line", { class: "target", x1: M.left, x2: M.left + pw, y1: yOf(target), y2: yOf(target) }, svg);
  const run = el("path", { class: "run" }, plot);
  const dot = el("circle", { class: "end-dot", r: 6, visibility: "hidden" }, svg);
  const endLabel = el("text", { class: "end-label", visibility: "hidden" }, svg);

  let tickKey = "";

  function draw(pts, xMax) {
    const xOf = (v) => M.left + (pw * v) / xMax;

    // x ticks (rebuilt only when the step/domain changes visibly)
    const step = niceStep(xMax / 4);
    const key = `${step}:${Math.floor(xMax / step)}`;
    if (key !== tickKey) {
      tickKey = key;
      xTicks.textContent = "";
      el("line", { class: "grid", x1: M.left, x2: M.left + pw, y1: M.top + ph, y2: M.top + ph }, xTicks);
    }
    // positions change every frame while the domain glides
    const labels = [];
    for (let v = 0; v <= xMax + 1e-9; v += step) labels.push(v);
    while (xTicks.childNodes.length - 1 < labels.length) el("text", { class: "tick", "text-anchor": "middle" }, xTicks);
    while (xTicks.childNodes.length - 1 > labels.length) xTicks.lastChild.remove();
    labels.forEach((v, i) => {
      const t = xTicks.childNodes[i + 1];
      t.setAttribute("x", xOf(v));
      t.setAttribute("y", M.top + ph + 24);
      t.textContent = i === labels.length - 1 && v > 0 ? `${fmtInt(v)} rounds` : fmtInt(v);
      t.setAttribute("text-anchor", i === 0 ? "start" : "middle");
    });

    // chance band: target ± 1.96·SE(n)
    const up = [], lo = [];
    const sd = Math.sqrt(target * (1 - target));
    for (let i = 0; i <= 120; i++) {
      const v = 1 + (xMax - 1) * (i / 120) ** 2;
      const half = (1.96 * sd) / Math.sqrt(v);
      up.push(`${xOf(v).toFixed(1)},${yOf(Math.min(Y_MAX, target + half)).toFixed(1)}`);
      lo.push(`${xOf(v).toFixed(1)},${yOf(Math.max(0, target - half)).toFixed(1)}`);
    }
    band.setAttribute("d", `M${up.join("L")}L${lo.reverse().join("L")}Z`);

    // running proportion
    const live = pts.filter(([nn]) => nn > 0);
    if (!live.length) {
      run.setAttribute("d", "");
      dot.setAttribute("visibility", "hidden");
      endLabel.setAttribute("visibility", "hidden");
      return;
    }
    run.setAttribute("d", "M" + live.map(([nn, kk]) => `${xOf(nn).toFixed(1)},${yOf(kk / nn).toFixed(1)}`).join("L"));
    const [ln, lk] = live[live.length - 1];
    const ex = Math.min(xOf(ln), M.left + pw), ey = yOf(lk / ln);
    dot.setAttribute("cx", ex);
    dot.setAttribute("cy", ey);
    dot.setAttribute("visibility", "visible");
    endLabel.setAttribute("x", ex + 12);
    endLabel.setAttribute("y", ey + 6);
    endLabel.textContent = `${fmtPct(lk / ln)}%`;
    endLabel.setAttribute("visibility", "visible");
  }

  return { draw };
}
