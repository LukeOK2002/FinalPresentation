/* "De novo discovery results" slide (presenter screen only).

   Start:   the peg board and empty buckets
   Click 1: one ball per 100 families drops through the pegs into its bucket

   Cheap on purpose: no physics engine and no collisions between balls. Every ball's
   path is worked out up front as a left/right bounce at each peg row (steered so it
   ends over its bucket), then a single canvas is redrawn each frame only while balls
   are moving. Bucket widths follow the number of balls, so the stacks end up level. */

const CATS = [
  { name: "Segmental duplication", n: 21431 },
  { name: "Known TE", n: 4960, color: "#f9be00" },
  { name: "Gene-derived", n: 1123 },
  { name: "Tandem / local cluster", n: 593 },
  { name: "Satellite", n: 454 },
  { name: "Too short", n: 339 },
  { name: "Too few copies", n: 222 },
];
const PER_BALL = 100;
const R = 5.5, D = 12;                         // ball radius, packing pitch
const S = 30, ROWS = 12, ROW_Y0 = 290, ROW_DY = 32, PEG_R = 4;
const MID = 800, BOARD_L = 70, BOARD_R = 1530;
const BUCKET_TOP = 700, FLOOR = 780, GAP = 12, MIN_W = 110, STACK = 4;
const SPAWN_Y = 240, SPAWN_EVERY = 20, DROP_MS = 250, STEP_MS = 80, FALL_MS = 420;
const FALLING = "#ffffff", LANDED = "#c3cad3";

const fmt = (n) => n.toLocaleString("en-IE");
const rowY = (j) => ROW_Y0 + j * ROW_DY - PEG_R - R; // ball resting on row j

function rng(seed) { // mulberry32: same drop every time
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (a, rand) => { for (let i = a.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---- layout: buckets sized so each holds its balls in about STACK rows ---- */
CATS.forEach((c) => { c.balls = Math.round(c.n / PER_BALL); c.w = Math.max(MIN_W, Math.ceil(c.balls / STACK) * D + 16); });
const total = CATS.reduce((s, c) => s + c.w, 0) + GAP * (CATS.length - 1);
let x = MID - total / 2;
CATS.forEach((c) => { c.x = x; x += c.w + GAP; c.perRow = Math.floor((c.w - 16) / D); });

/* ---- every ball's path, computed once ---- */
const rand = rng(29124);
const balls = shuffle(CATS.flatMap((c, ci) => Array.from({ length: c.balls }, () => ci)), rand).map((ci, i) => ({ ci, t0: i * SPAWN_EVERY }));
const filled = CATS.map(() => 0);
const snap = (v, odd) => MID + S * (2 * Math.round((v - MID - (odd ? S : 0)) / (2 * S)) + (odd ? 1 : 0));
const STEPS = ROWS - 1;
for (const b of balls) {
  const c = CATS[b.ci];
  const k = filled[b.ci]++;                   // k-th arrival fills the k-th slot, bottom row first
  const row = Math.floor(k / c.perRow), col = k % c.perRow;
  const rowW = c.perRow * D;
  b.sx = c.x + (c.w - rowW) / 2 + D / 2 + col * D + (row % 2 ? D / 4 : -D / 4);
  b.sy = FLOOR - R - 1 - row * (D - 1.5);
  const land = Math.min(BOARD_R, Math.max(BOARD_L, snap(b.sx, STEPS % 2)));
  let start = snap(MID + 0.6 * (b.sx - MID) + (rand() - 0.5) * 120, false);
  start = Math.min(land + STEPS * S - S, Math.max(land - STEPS * S + S, start)); // reachable in STEPS bounces
  start = snap(start, false);
  const rights = ((land - start) / S + STEPS) / 2;
  b.path = [start];
  for (const dir of shuffle(Array.from({ length: STEPS }, (_, i) => (i < rights ? 1 : -1)), rand)) b.path.push(b.path.at(-1) + dir * S);
  b.end = b.t0 + DROP_MS + STEPS * STEP_MS + FALL_MS;
}
const DONE = Math.max(...balls.map((b) => b.end));

function position(b, t) { // t = ms since the drop began; null before the ball appears
  let u = t - b.t0;
  if (u < 0) return null;
  if (u < DROP_MS) { const f = u / DROP_MS; return [b.path[0], SPAWN_Y + (rowY(0) - SPAWN_Y) * f * f]; }
  u -= DROP_MS;
  if (u < STEPS * STEP_MS) {
    const j = Math.floor(u / STEP_MS), f = (u - j * STEP_MS) / STEP_MS;
    const y = rowY(j) + (rowY(j + 1) - rowY(j)) * f * f - 9 * Math.sin(Math.PI * f); // hop off the peg, then fall
    return [b.path[j] + (b.path[j + 1] - b.path[j]) * f, y];
  }
  u -= STEPS * STEP_MS;
  const f = Math.min(1, u / FALL_MS), e = 1 - (1 - f) * (1 - f);
  return [b.path[STEPS] + (b.sx - b.path[STEPS]) * e, rowY(STEPS) + (b.sy - rowY(STEPS)) * f * f];
}

/* ---- static board (SVG + labels) ---- */
function buildBoard(slide) {
  const svg = slide.querySelector(".pk-board");
  let out = "";
  for (let j = 0; j < ROWS; j++) {
    for (let px = MID + (j % 2) * S; px <= BOARD_R; px += 2 * S) out += `<circle class="pk-peg" cx="${px}" cy="${ROW_Y0 + j * ROW_DY}" r="${PEG_R}"/>`;
    for (let px = MID + (j % 2) * S - 2 * S; px >= BOARD_L; px -= 2 * S) out += `<circle class="pk-peg" cx="${px}" cy="${ROW_Y0 + j * ROW_DY}" r="${PEG_R}"/>`;
  }
  for (const c of CATS) out += `<path class="pk-bucket" d="M${c.x} ${BUCKET_TOP} V${FLOOR} H${c.x + c.w} V${BUCKET_TOP}"/>`;
  svg.innerHTML = out;
  const labels = slide.querySelector(".pk-labels");
  labels.innerHTML = CATS.map((c) => `<div class="pk-label" style="left:${c.x + c.w / 2}px;width:${c.w + GAP}px"><b></b><span${c.color ? ` style="color:${c.color}"` : ""}>${c.name}</span></div>`).join("");
  return [...labels.querySelectorAll("b")];
}

export function initTeResults() {
  const slide = document.getElementById("te-results");
  const canvas = slide.querySelector(".pk-balls");
  const ctx = canvas.getContext("2d");
  const counts = buildBoard(slide);
  const step = slide.querySelector(".anim-step");
  let raf = 0, t0 = 0, scale = 0;

  function fit() {
    const s = Math.min(2, (window.devicePixelRatio || 1) * Reveal.getScale());
    if (s !== scale) { scale = s; canvas.width = 1600 * s; canvas.height = 900 * s; }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, 1600, 900);
  }

  function setCounts(landed) {
    counts.forEach((el, i) => {
      const c = CATS[i];
      const v = landed[i] >= c.balls ? fmt(c.n) : landed[i] ? fmt(landed[i] * PER_BALL) : "";
      if (el.textContent !== v) el.textContent = v;
    });
  }

  // one path per colour per frame keeps the canvas work tiny
  function draw(t) {
    fit();
    const landed = CATS.map(() => 0);
    const groups = new Map();
    for (const b of balls) {
      const p = position(b, t);
      if (!p) continue;
      const done = t >= b.end;
      if (done) landed[b.ci]++;
      const col = done ? CATS[b.ci].color || LANDED : FALLING;
      if (!groups.has(col)) groups.set(col, new Path2D());
      const path = groups.get(col);
      path.moveTo(p[0] + R, p[1]);
      path.arc(p[0], p[1], R, 0, 2 * Math.PI);
    }
    for (const [col, path] of groups) { ctx.fillStyle = col; ctx.fill(path); }
    setCounts(landed);
  }

  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function frame(now) {
    const t = now - t0;
    draw(t);
    raf = t < DONE ? requestAnimationFrame(frame) : 0;
  }
  function play() { stop(); t0 = performance.now(); raf = requestAnimationFrame(frame); }
  const snapTo = () => { stop(); draw(step.classList.contains("visible") ? DONE : -1); };

  Reveal.on("fragmentshown", (e) => { if (e.fragment === step) play(); });
  Reveal.on("fragmenthidden", (e) => { if (e.fragment === step) snapTo(); });
  Reveal.on("slidechanged", (e) => { if (e.currentSlide === slide) snapTo(); else if (e.previousSlide === slide) stop(); });
  Reveal.on("resize", () => { scale = 0; if (!raf) snapTo(); });
  snapTo();
}
