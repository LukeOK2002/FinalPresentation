/* Click-driven slide animations (presenter screen only; phones just mirror the text).

   A slide marks its animated parts with data-a="<name>" and adds one hidden
   `<span class="fragment anim-step"></span>` per click. Each click plays that
   stage's timeline; going back, or arriving from a later slide, snaps straight
   to the end state of the stage you land on.

   Timeline entries: [name, change, start ms, duration ms, easing]
   where change sets any of { op, tx, ty, sc } (opacity, translate px, scale). */

const BASE = { op: 1, tx: 0, ty: 0, sc: 1 };
export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
export const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
export const LINEAR = "linear";

const tf = (s) => `translate(${s.tx}px, ${s.ty}px) scale(${s.sc})`;

/**
 * @param {HTMLElement} slide
 * @param {object} initial   stage-0 state: { name: { op, tx, ty, sc } }, unspecified = BASE
 * @param {Array} timelines  timelines[i] plays stage i-1 → i (index 0 unused)
 */
export function createStepper(slide, initial, timelines) {
  const E = {};
  slide.querySelectorAll("[data-a]").forEach((el) => { E[el.dataset.a] = el; });
  const steps = [...slide.querySelectorAll(".anim-step")];

  // End state of every stage, derived from the timelines so they can never disagree.
  const states = [Object.fromEntries(Object.keys(E).map((k) => [k, { ...BASE, ...(initial[k] || {}) }]))];
  for (let i = 1; i < timelines.length; i++) {
    const next = structuredClone(states[i - 1]);
    for (const [id, change] of timelines[i]) {
      if (!next[id]) throw new Error(`stepper: no [data-a="${id}"] on #${slide.id}`);
      Object.assign(next[id], change);
    }
    states.push(next);
  }

  let current = 0;

  const cancelAll = () => Object.values(E).forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

  function apply(state) {
    for (const [id, el] of Object.entries(E)) {
      el.style.opacity = state[id].op;
      el.style.transform = tf(state[id]);
    }
  }

  // One animation per element and property spanning the whole timeline,
  // so an element that changes the same property twice never fights itself.
  function play(step) {
    const segs = timelines[step].slice().sort((a, b) => a[2] - b[2]);
    const T = Math.max(...segs.map(([, , at, dur]) => at + dur));
    const cur = structuredClone(states[step - 1]);
    const tracks = {};
    for (const [id, change, at, dur, ease = EASE] of segs) {
      const before = { ...cur[id] };
      Object.assign(cur[id], change);
      const t = (tracks[id] ||= { opacity: [], transform: [] });
      if ("op" in change) t.opacity.push({ at, dur, ease, from: before.op, to: cur[id].op });
      if ("tx" in change || "ty" in change || "sc" in change) {
        t.transform.push({ at, dur, ease, from: tf(before), to: tf(cur[id]) });
      }
    }
    apply(states[step]); // final values underneath; the animations play over them
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
    step = Math.max(0, Math.min(step, timelines.length - 1));
    cancelAll();
    if (animate && step === current + 1) {
      apply(states[current]);
      play(step);
    } else {
      apply(states[step]);
    }
    current = step;
  }

  const shown = () => steps.filter((s) => s.classList.contains("visible")).length;

  Reveal.on("fragmentshown", (e) => { if (steps.includes(e.fragment)) go(shown(), true); });
  Reveal.on("fragmenthidden", (e) => { if (steps.includes(e.fragment)) go(shown(), false); });
  Reveal.on("slidechanged", (e) => { if (e.currentSlide === slide) go(shown(), false); });
  go(shown(), false);
}
