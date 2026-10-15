/* Turns the web deck's stepper data (INITIAL state + TIMELINES per click) into PowerPoint effects.

   A node's chain is the list of data-a names from the slide down to the node. The node is visible only while
   every name in its chain is visible (opacity > 0.5 and not scaled to nothing); moves add up along the chain.
   Effects: { k: "in" | "out" | "wipe" | "move", c: click, t: ms into the click, d: ms, dx, dy } (px, 1600x900 canvas). */

const BASE = { op: 1, tx: 0, ty: 0, sc: 1, sx: 1 };
const SMALL = 24;   // px: nudges this small (the web deck's 12px text slide-ins) are not worth a motion path

const visible = (s) => s.op > 0.5 && s.sx > 0.05;

function eventsFor(stepper, name) {
  const ev = [];
  stepper.timelines.forEach((tl, c) => {
    if (!tl) return;
    for (const [n, ch, t, d] of tl) if (n === name) ev.push({ name, c, t, d, ch });
  });
  return ev;
}

const SCALE_MIN = 0.1;  // smaller size changes (the web deck's 6% "pulse") are ignored

function derive(chain, stepper) {
  const empty = { initVisible: true, init: { x: 0, y: 0 }, effects: [] };
  if (!stepper) return empty;
  const names = chain.filter((n) => stepper.initial[n] || eventsFor(stepper, n).length);
  if (!names.length) return empty;

  const cur = {};
  for (const n of names) cur[n] = { ...BASE, ...(stepper.initial[n] || {}) };
  const events = names.flatMap((n) => eventsFor(stepper, n)).sort((a, b) => a.c - b.c || a.t - b.t);

  // initial offset along the chain (small ones dropped, matching the dropped small moves below)
  let ox = 0, oy = 0;
  for (const n of names) { ox += cur[n].tx; oy += cur[n].ty; }
  const dropInit = Math.abs(ox) <= SMALL && Math.abs(oy) <= SMALL;
  const eff = () => names.every((n) => visible(cur[n]));
  const initVisible = eff();
  let last = initVisible;
  const effects = [];
  const scl = {};            // tracked scale per name; a "pop" (scale changing together with opacity) is not tracked
  let scaleName = null;

  for (const e of events) {
    const s = cur[e.name], before = { ...s };
    Object.assign(s, e.ch);
    if ("sc" in e.ch && !("op" in e.ch)) {
      const from = scl[e.name] ?? 1, to = e.ch.sc;
      if (Math.abs(to - from) > SCALE_MIN) {
        effects.push({ k: "scale", name: e.name, s0: from, s1: to, c: e.c, t: e.t, d: Math.max(e.d, 60) });
        scl[e.name] = to; scaleName = e.name;
      }
    }
    const now = eff();
    if (now !== last) {
      const grew = before.sx <= 0.05 && s.sx > 0.5;
      effects.push({ k: now ? (grew ? "wipe" : "in") : "out", c: e.c, t: e.t, d: Math.max(e.d, 60) });
      last = now;
    }
    const dx = s.tx - before.tx, dy = s.ty - before.ty;
    if (Math.abs(dx) > SMALL || Math.abs(dy) > SMALL) effects.push({ k: "move", c: e.c, t: e.t, d: Math.max(e.d, 60), dx, dy });
  }
  // A shape that starts hidden must have its entrance effect first (PowerPoint shows a shape whose first effect
  // is a motion path). Moves made while it is still hidden are folded into its starting position instead.
  const init = dropInit ? { x: 0, y: 0 } : { x: ox, y: oy };
  let initScale = 1;
  if (!initVisible) {
    const firstShow = effects.findIndex((e) => e.k === "in" || e.k === "wipe");
    const cut = firstShow < 0 ? effects.length : firstShow;
    for (const e of effects.slice(0, cut)) {
      if (e.k === "move") { init.x += e.dx; init.y += e.dy; }
      if (e.k === "scale") initScale = e.s1;
    }
    effects.splice(0, cut, ...effects.slice(0, cut).filter((e) => e.k !== "move" && e.k !== "scale"));
  }
  return { initVisible, init, effects, scaleName, initScale };
}

// Where a node is after `k` clicks have fully played: { visible, dx, dy }.
function stateAt(fx, k) {
  let vis = fx.initVisible, dx = fx.init.x, dy = fx.init.y, sc = fx.initScale || 1;
  for (const e of [...fx.effects].sort((a, b) => a.c - b.c || a.t - b.t)) {
    if (e.c > k) break;
    if (e.k === "in" || e.k === "wipe") vis = true;
    else if (e.k === "out") vis = false;
    else if (e.k === "scale") sc = e.s1;
    else { dx += e.dx; dy += e.dy; }
  }
  return { visible: vis, dx, dy, sc };
}

module.exports = { derive, stateAt };
