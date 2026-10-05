/* "What are transposable elements" slide: a small click-driven animation.

   Each presenter click (a hidden reveal.js fragment) plays one stage:
     0  intro text; yellow TE flanked by grey host genome
     1  retrotransposition: a circle reads the TE, an RNA copy (line + dot) appears,
        the old locus is replaced by a fresh grey site, which splits, and the copy slots in
     2  transposition: circles grab the TE's ends, it lifts out, the old site fades,
        a new site appears, splits, and the TE slots in
   Going backwards (or arriving from a later slide) jumps straight to that stage's end state. */

const slide = document.getElementById("te-intro");
const E = {};
slide.querySelectorAll("[data-te]").forEach((el) => { E[el.dataset.te] = el; });

const SPLIT = 160; // half the TE length: how far each half of a target site moves apart
const DROP = 120;  // RNA/TE row (y=530) down to the genome row (y=650)
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const LINEAR = "linear";

// Logical state per element: opacity, translate x/y (px), scale.
const base = { op: 1, tx: 0, ty: 0, sc: 1 };
const STATE0 = {
  t0: { op: 1 }, t1: { op: 0, ty: 12 }, t2: { op: 0, ty: 12 },
  genome: { op: 1 }, labels: { op: 1 },
  poly: { op: 0, tx: -180 },
  rna: { op: 0 }, rnaDot: { op: 1 }, cL: { op: 0, sc: 0.3 }, cR: { op: 0, sc: 0.3 },
  s1L: { op: 0 }, s1R: { op: 0 }, s2L: { op: 0 }, s2R: { op: 0 },
};

// Timelines: [element, change, start ms, duration ms, easing]
const TIMELINES = [
  null,
  [ // 1 · retrotransposition
    ["t0", { op: 0, ty: -12 }, 0, 400, EASE],
    ["labels", { op: 0 }, 0, 400, EASE],
    ["t1", { op: 1, ty: 0 }, 300, 500, EASE],
    ["poly", { op: 1 }, 500, 250, EASE],
    ["poly", { tx: 180 }, 500, 1500, EASE_IN_OUT],
    ["poly", { op: 0 }, 1800, 300, EASE],
    ["rna", { op: 1 }, 2100, 700, EASE],
    ["genome", { op: 0 }, 3100, 700, EASE],
    ["s1L", { op: 1 }, 3100, 700, EASE],
    ["s1R", { op: 1 }, 3100, 700, EASE],
    ["s1L", { tx: -SPLIT }, 4100, 800, EASE_IN_OUT],
    ["s1R", { tx: SPLIT }, 4100, 800, EASE_IN_OUT],
    ["rnaDot", { op: 0 }, 4700, 350, EASE],
    ["rna", { ty: DROP }, 4800, 900, EASE],
  ],
  [ // 2 · transposition
    ["t1", { op: 0, ty: -12 }, 0, 400, EASE],
    ["t2", { op: 1, ty: 0 }, 300, 500, EASE],
    ["cL", { op: 1, sc: 1 }, 600, 450, "cubic-bezier(0.34, 1.56, 0.64, 1)"],
    ["cR", { op: 1, sc: 1 }, 600, 450, "cubic-bezier(0.34, 1.56, 0.64, 1)"],
    ["rna", { ty: DROP - 160 }, 1300, 1000, EASE_IN_OUT],
    ["s1L", { op: 0 }, 2300, 700, EASE],
    ["s1R", { op: 0 }, 2300, 700, EASE],
    ["s2L", { op: 1 }, 3100, 700, EASE],
    ["s2R", { op: 1 }, 3100, 700, EASE],
    ["s2L", { tx: -SPLIT }, 4000, 800, EASE_IN_OUT],
    ["s2R", { tx: SPLIT }, 4000, 800, EASE_IN_OUT],
    ["rna", { ty: DROP }, 4600, 900, EASE],
  ],
];

const full = (st) => Object.fromEntries(Object.keys(E).map((k) => [k, { ...base, ...(st[k] || {}) }]));
const tf = (s) => `translate(${s.tx}px, ${s.ty}px) scale(${s.sc})`;

// End state of every stage, derived from the timelines so they can never disagree.
const STATES = [full(STATE0)];
for (let i = 1; i < TIMELINES.length; i++) {
  const next = structuredClone(STATES[i - 1]);
  for (const [id, change] of TIMELINES[i]) Object.assign(next[id], change);
  STATES.push(next);
}

let current = 0;

function cancelAll() {
  for (const el of Object.values(E)) el.getAnimations().forEach((a) => a.cancel());
}

function applyState(state) {
  for (const [id, el] of Object.entries(E)) {
    el.style.opacity = state[id].op;
    el.style.transform = tf(state[id]);
  }
}

/** Play timeline `step` starting from stage step-1. One animation per element and
    property spanning the whole timeline, so repeated changes never fight each other. */
function play(step) {
  const start = STATES[step - 1];
  const segs = TIMELINES[step].slice().sort((a, b) => a[2] - b[2]);
  const T = Math.max(...segs.map(([, , at, dur]) => at + dur));
  const cur = structuredClone(start);
  const tracks = {}; // id -> { opacity: [...], transform: [...] }

  for (const [id, change, at, dur, ease] of segs) {
    const before = { ...cur[id] };
    Object.assign(cur[id], change);
    const t = (tracks[id] ||= { opacity: [], transform: [] });
    if ("op" in change) t.opacity.push({ at, dur, ease, from: before.op, to: cur[id].op });
    if ("tx" in change || "ty" in change || "sc" in change) {
      t.transform.push({ at, dur, ease, from: tf(before), to: tf(cur[id]) });
    }
  }

  applyState(STATES[step]); // final values; the animations below play over them
  for (const [id, t] of Object.entries(tracks)) {
    for (const prop of ["opacity", "transform"]) {
      const list = t[prop];
      if (!list.length) continue;
      const frames = [{ offset: 0, [prop]: list[0].from }];
      for (const s of list) {
        frames.push({ offset: s.at / T, [prop]: s.from, easing: s.ease });
        frames.push({ offset: (s.at + s.dur) / T, [prop]: s.to });
      }
      frames.push({ offset: 1, [prop]: list[list.length - 1].to });
      E[id].animate(frames, { duration: T });
    }
  }
}

function go(step, animate) {
  step = Math.max(0, Math.min(step, TIMELINES.length - 1));
  cancelAll();
  if (animate && step === current + 1) {
    applyState(STATES[current]);
    play(step);
  } else {
    applyState(STATES[step]);
  }
  current = step;
}

const shownSteps = () => slide.querySelectorAll(".te-step.visible").length;

/** Call once, after Reveal.initialize() has resolved. */
export function initTeIntro() {
  Reveal.on("fragmentshown", (e) => {
    if (e.fragment.classList.contains("te-step")) go(+e.fragment.dataset.teStep, true);
  });
  Reveal.on("fragmenthidden", (e) => {
    if (e.fragment.classList.contains("te-step")) go(+e.fragment.dataset.teStep - 1, false);
  });
  Reveal.on("slidechanged", (e) => {
    if (e.currentSlide === slide) go(shownSteps(), false);
  });
  go(shownSteps(), false);
}
