/* The "Simulate" widget: two 6-bp flanks roll like a slot machine, settle,
   then any TA lights up yellow and the result line fades in. One round = 1 s. */

import { FLANK_LEN, simulateRound, taPositions } from "./tsd-model.js";

export const ROUND_MS = 1000;
const TICK_MS = 45;                       // letter flicker while rolling
const LOCK_START_MS = 320;                // first tile settles here...
const LOCK_STEP_MS = 72;                  // ...then one tile every 72 ms (both flanks together)
const REVEAL_MS = LOCK_START_MS + (FLANK_LEN - 1) * LOCK_STEP_MS + 140; // ≈ 820 ms

export const MESSAGES = {
  0: "0/2 ‘TA’ dinucleotides detected",
  1: "1/2 ‘TA’ dinucleotides detected",
  2: "2/2 ‘TA’s detected, TSD signal",
};

const BASES = "ACGT";
const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * @param {HTMLElement} root
 * @param {object} [o]
 * @param {boolean} [o.stacked]  phone layout (flanks on two rows)
 * @param {string[]} [o.labels]  flank labels
 * @param {string} [o.insertLabel]
 * @param {(round:{a:string,b:string,hits:number}) => void} [o.onReveal]  fires when the result shows
 */
export function createTsdSim(root, { stacked = false, labels = ["5′ flank", "3′ flank"], insertLabel = "insertion", onReveal } = {}) {
  root.classList.add("tsd");
  root.classList.toggle("tsd--stacked", stacked);
  root.style.setProperty("--round-ms", `${ROUND_MS}ms`);
  root.innerHTML = `
    <div class="tsd-flanks">
      ${flankHtml(labels[0])}
      <div class="insert" aria-hidden="true"><div class="insert-bar"></div><div class="insert-label">${insertLabel}</div></div>
      ${flankHtml(labels[1])}
    </div>
    <button type="button" class="sim-btn">Simulate</button>
    <p class="tsd-result" aria-live="polite"></p>`;

  const seqs = [...root.querySelectorAll(".seq")];
  const tiles = seqs.map((s) => [...s.querySelectorAll(".base")]);
  const button = root.querySelector(".sim-btn");
  const result = root.querySelector(".tsd-result");
  let busy = false;
  let enabled = true;
  let timers = [];

  button.addEventListener("click", () => run());

  function clearHighlights() {
    for (const s of seqs) s.querySelectorAll(".ta-bar").forEach((el) => el.remove());
    for (const row of tiles) for (const t of row) t.classList.remove("is-ta", "is-locked", "is-empty");
  }

  function highlight(round, animate = true) {
    [round.a, round.b].forEach((seq, f) => {
      for (const i of taPositions(seq)) {
        tiles[f][i].classList.add("is-ta");
        tiles[f][i + 1].classList.add("is-ta");
        const bar = document.createElement("div");
        bar.className = "ta-bar";
        bar.style.setProperty("--i", i);
        if (!animate) bar.style.animation = "none";
        seqs[f].appendChild(bar);
      }
    });
  }

  function showResult(hits, animate = true) {
    result.textContent = MESSAGES[hits];
    result.classList.toggle("is-signal", hits === 2);
    result.classList.toggle("is-instant", !animate);
    result.classList.remove("is-shown");
    if (animate) void result.offsetWidth; // restart the fade
    result.classList.add("is-shown");
  }

  /** Run one animated round. Resolves with the round when the 1 s is up. */
  function run() {
    if (busy || !enabled) return null;
    busy = true;
    const round = simulateRound();
    const finals = [round.a, round.b];

    button.disabled = true;
    button.textContent = "Simulating…";
    button.classList.remove("is-running");
    void button.offsetWidth;
    button.classList.add("is-running");
    result.classList.remove("is-shown", "is-instant");
    clearHighlights();

    const quick = reducedMotion();
    const locked = tiles.map(() => new Array(FLANK_LEN).fill(false));
    for (const row of tiles) for (const t of row) t.classList.add("is-rolling");

    const flicker = setInterval(() => {
      tiles.forEach((row, f) => row.forEach((t, i) => {
        if (!locked[f][i]) t.textContent = quick ? "·" : BASES[(Math.random() * 4) | 0];
      }));
    }, TICK_MS);
    timers.push(flicker);

    for (let i = 0; i < FLANK_LEN; i++) {
      timers.push(setTimeout(() => {
        tiles.forEach((row, f) => {
          locked[f][i] = true;
          const t = row[i];
          t.textContent = finals[f][i];
          t.classList.remove("is-rolling");
          t.classList.add("is-locked");
        });
      }, LOCK_START_MS + i * LOCK_STEP_MS));
    }

    return new Promise((resolve) => {
      timers.push(setTimeout(() => {
        clearInterval(flicker);
        highlight(round);
        showResult(round.hits);
        onReveal && onReveal(round);
      }, REVEAL_MS));

      timers.push(setTimeout(() => {
        timers = [];
        busy = false;
        button.classList.remove("is-running");
        button.textContent = "Simulate";
        button.disabled = !enabled;
        resolve(round);
      }, ROUND_MS));
    });
  }

  /** Show a round instantly (presenter auto-run). Does not call onReveal. */
  function showInstant(round) {
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timers = [];
    busy = false;
    button.classList.remove("is-running");
    button.textContent = "Simulate";
    button.disabled = !enabled;
    clearHighlights();
    [round.a, round.b].forEach((seq, f) => tiles[f].forEach((t, i) => {
      t.textContent = seq[i];
      t.classList.remove("is-rolling");
    }));
    highlight(round, false);
    showResult(round.hits, false);
  }

  function setEnabled(on) {
    enabled = on;
    if (!busy) button.disabled = !on;
  }

  return { run, showInstant, setEnabled, get busy() { return busy; }, button };
}

function flankHtml(label) {
  const tiles = Array.from({ length: FLANK_LEN }, () => `<div class="base is-empty">·</div>`).join("");
  return `<div class="flank"><div class="flank-label">${label}</div><div class="seq">${tiles}</div></div>`;
}
