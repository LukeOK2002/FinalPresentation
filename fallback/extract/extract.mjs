/* Reads the live web deck (served from ../../public) in headless Chromium and writes model.json:
   for every slide, its exact scene geometry (SVG attributes + computed styles + HTML text boxes) and
   the stepper INITIAL/TIMELINES the web deck animates with. build.cjs turns that into PowerPoint.
   Usage: node extract.mjs  (needs playwright + a static server on :8765 serving ../../public) */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://127.0.0.1:8765";
const EXEC = process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "model.json");

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

// Record every createStepper(slide, initial, timelines) call.
await page.route("**/js/stepper.js", async (route) => {
  const res = await route.fetch();
  let src = await res.text();
  src = src.replace("export function createStepper(", "function __orig(") +
    "\nexport function createStepper(slide, initial, timelines) {" +
    " (window.__st = window.__st || {})[slide.id] = { initial, timelines };" +
    " return __orig(slide, initial, timelines); }\n";
  await route.fulfill({ response: res, body: src, headers: { ...res.headers(), "content-type": "text/javascript" } });
});

await page.addInitScript(() => {
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (frames, opts) {
    (window.__anims = window.__anims || []).push({ k: this.dataset ? this.dataset.k : null, frames: JSON.parse(JSON.stringify(frames)), delay: opts.delay || 0, dur: opts.duration, easing: opts.easing });
    return orig.call(this, frames, opts);
  };
});
await page.goto(`${BASE}/?present#/title`);
await page.waitForTimeout(2500);

const grab = (arg) => {
  const onlyId = typeof arg === "string" ? arg : arg.id, panelN = typeof arg === "string" ? 0 : arg.n;
  const LEAF = new Set(["rect", "line", "circle", "ellipse", "polygon", "polyline", "path", "text"]);
  const rgb = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const [r, g, b, a] = m[1].split(",").map((v) => parseFloat(v));
    return { hex: [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""), a: a === undefined ? 1 : a };
  };
  const chainOf = (el, root) => {
    const names = [];
    for (let e = el; e && e !== root; e = e.parentElement) if (e.dataset && (e.dataset.a || e.dataset.k)) names.unshift(e.dataset.a || e.dataset.k);
    return names;
  };
  const offsetIn = (el, root) => {
    let x = 0, y = 0, e = el;
    while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x, y, ok: e === root };
  };
  const runsOf = (el) => {
    const runs = [];
    const walk = (n, st) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { const t = c.textContent; if (t) runs.push({ text: t, ...st }); }
        else if (c.nodeType === 1) {
          const tag = c.tagName.toLowerCase(), cs = getComputedStyle(c);
          const nst = { ...st };
          if (tag === "em" || cs.fontStyle === "italic") nst.italic = true;
          if (tag === "u" || cs.textDecorationLine.includes("underline")) { nst.underline = true; nst.ulColor = rgb(cs.textDecorationColor)?.hex; }
          if (tag === "b" || tag === "strong" || parseInt(cs.fontWeight) >= 600) nst.bold = true;
          if (tag === "br") { runs.push({ text: "\n", ...st }); continue; }
          const col = rgb(cs.color); if (col && tag !== "u" && tag !== "em") nst.color = col.hex;
          if (tag === "sup") nst.sup = true;
          walk(c, nst);
        }
      }
    };
    walk(el, {});
    return runs;
  };
  const out = [];
  for (const s of document.querySelectorAll(".reveal .slides section[id]")) {
    if (s.id !== onlyId) continue;
    const nodes = [];
    const walk = (el, tfChain) => {
      for (const c of el.children) {
        const tag = c.tagName.toLowerCase();
        if (tag === "aside" || c.classList.contains("anim-step") || tag === "defs" || (!panelN && c.classList.contains("faq-panel")) || c.classList.contains("faq-btns") || c.classList.contains("faq-q")) continue;
        const inSvg = !!c.closest("svg");
        if (tag === "svg") { walk(c, []); continue; }
        if (inSvg) {
          const own = c.getAttribute("transform");
          const chain = own ? [...tfChain, own] : tfChain;
          if (LEAF.has(tag)) {
            const cs = getComputedStyle(c);
            const attrs = {}; for (const a of c.attributes) attrs[a.name] = a.value;
            const n = { kind: tag, attrs, chain: chainOf(c, s), tf: chain, cls: [...c.classList],
              fill: rgb(cs.fill), stroke: rgb(cs.stroke), strokeWidth: parseFloat(cs.strokeWidth) || 0,
              dash: cs.strokeDasharray, cap: cs.strokeLinecap, fillOpacity: parseFloat(cs.fillOpacity),
              strokeOpacity: parseFloat(cs.strokeOpacity), opacityAttr: c.getAttribute("opacity"), hidden: cs.display === "none" };
            if (tag === "text") {
              const bb = c.getBBox();
              Object.assign(n, { text: c.textContent, bbox: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
                fontSize: parseFloat(cs.fontSize), fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
                anchor: cs.textAnchor, baseline: cs.dominantBaseline, family: cs.fontFamily,
                spacing: parseFloat(cs.letterSpacing) || 0,
                tspans: [...c.querySelectorAll("tspan")].map((t) => ({ text: t.textContent, dy: t.getAttribute("dy"),
                  shift: getComputedStyle(t).baselineShift, size: parseFloat(getComputedStyle(t).fontSize), cls: [...t.classList],
                  fill: rgb(getComputedStyle(t).fill)?.hex, weight: getComputedStyle(t).fontWeight })) });
            }
            nodes.push(n);
          } else if (tag === "g") walk(c, chain);
        } else {
          // HTML: text blocks only
          const hasBlockKids = [...c.children].some((k) => ["p", "div", "ul", "li", "h2", "table", "svg", "button"].includes(k.tagName.toLowerCase()));
          const textual = c.textContent.trim().length > 0;
          const isLeaf = textual && !hasBlockKids && !["table", "ul"].includes(tag);
          if (isLeaf) {
            const cs = getComputedStyle(c), off = offsetIn(c, s);
            nodes.push({ kind: "html", tag, cls: [...c.classList], chain: chainOf(c, s), x: off.x, y: off.y, ok: off.ok,
              w: c.offsetWidth, h: c.offsetHeight, runs: runsOf(c), fontSize: parseFloat(cs.fontSize),
              weight: cs.fontWeight, color: rgb(cs.color)?.hex, align: cs.textAlign, family: cs.fontFamily,
              style: c.getAttribute("style") || "", lineHeight: parseFloat(cs.lineHeight) || null,
              transform: cs.transform });
          } else if (tag === "table") {
            const off = offsetIn(c, s);
            const rows = [...c.querySelectorAll("tr")].map((tr) => [...tr.children].map((td) => td.textContent.trim()));
            const head = [...c.querySelectorAll("th")].length > 0;
            nodes.push({ kind: "table", chain: chainOf(c, s), x: off.x, y: off.y, w: c.offsetWidth, h: c.offsetHeight, rows, head });
            continue;
          } else if (tag === "ul") {
            for (const li of c.querySelectorAll("li")) {
              const cs = getComputedStyle(li), off = offsetIn(li, s);
              nodes.push({ kind: "html", tag: "li", cls: [], chain: chainOf(li, s), x: off.x, y: off.y, ok: off.ok, w: li.offsetWidth,
                h: li.offsetHeight, runs: runsOf(li), fontSize: parseFloat(cs.fontSize), weight: cs.fontWeight, color: rgb(cs.color)?.hex,
                align: cs.textAlign, family: cs.fontFamily, style: "", lineHeight: parseFloat(cs.lineHeight) || null, transform: cs.transform });
            }
            continue;
          }
          if (!isLeaf) walk(c, tfChain);
        }
      }
    };
    walk(panelN ? s.querySelector(`.faq-panel[data-faq="${panelN}"]`) : s, []);
    out.push({ id: s.id, notes: (s.querySelector("aside.notes")?.textContent || "").replace(/\s+/g, " ").trim(), steps: s.querySelectorAll(".anim-step").length, nodes, stepper: (window.__st || {})[s.id] || null });
  }
  return out;
};
const ids = await page.evaluate(() => [...document.querySelectorAll(".reveal .slides section[id]")].map((s) => s.id));
const model = [];
for (const id of ids) {
  if (id === "tsd" || id === "faq" || id === "reset") continue;
  await page.evaluate((i) => Reveal.slide(document.querySelector(`.reveal .slides section[id="${i}"]`).dataset.indexH ? 0 : 0), id).catch(() => {});
  await page.evaluate((i) => { const secs = [...document.querySelectorAll(".reveal .slides > section")]; Reveal.slide(secs.findIndex((x) => x.id === i), 0); }, id);
  await page.waitForTimeout(500);
  const part = await page.evaluate(grab, id);
  if (id === "te-diverge") {
    // the raw-calls graph is drawn every frame by JS: snapshot it after click 1 (25%) and click 2 (50%)
    part[0].snaps = [];
    for (let k = 0; k < 2; k++) {
      await page.evaluate(() => Reveal.next());
      await page.waitForTimeout(11500);
      part[0].snaps.push((await page.evaluate(grab, id))[0].nodes);
    }
  }
  model.push(...part);
}

// FAQ: the menu, then each of the four panels (geometry + the recorded WAAPI timeline)
await page.evaluate(() => { const secs = [...document.querySelectorAll(".reveal .slides > section")]; Reveal.slide(secs.findIndex((x) => x.id === "faq"), 0); });
await page.waitForTimeout(500);
await page.evaluate(() => { document.getElementById("pw-overlay").hidden = true; });
const faq = (await page.evaluate(grab, "faq"))[0];
faq.panels = [];
for (let n = 1; n <= 4; n++) {
  await page.evaluate(() => { window.__anims = []; });
  await page.evaluate((i) => document.querySelector(`.faq-card[data-open="${i}"]`).click(), n);
  await page.waitForTimeout(400);
  const anims = await page.evaluate(() => window.__anims);
  const panel = (await page.evaluate(grab, { id: "faq", n }))[0];
  faq.panels.push({ n, anims, nodes: panel.nodes, question: await page.evaluate((i) => document.querySelector(`.faq-panel[data-faq="${i}"]`).dataset.phoneSub, n) });
  await page.evaluate(() => document.querySelector("[data-back]:not([hidden])")?.click());
  await page.waitForTimeout(200);
}
model.push(faq);

fs.writeFileSync(OUT, JSON.stringify(model, null, 1));
for (const m of model) console.log(m.id.padEnd(14), "steps", m.steps, "nodes", m.nodes.length, "stepper", !!m.stepper);
await browser.close();
