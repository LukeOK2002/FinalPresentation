/* Slide deck: reveal.js setup + the live link.

   Open the deck as  /?present  on the presenting laptop. After the password,
   this deck drives the phones (landing on a slide with data-unlock="tsd" opens
   the simulator on every phone) and its rounds count towards the pool.
   Without ?present it is a plain viewer. If the room can't be reached at all,
   the simulator still works and the chart shows this screen's own rounds.

   Keys on the simulation slide:  R = run one round   A = auto-run on/off
   Click the QR code on the simulation slide (presenter) to run 1,000 rounds at once. */

import { createTsdSim } from "./tsd-widget.js";
import { createPooledPanel } from "./tsd-chart.js";
import { connectLive } from "./live.js";
import { hasTA, simulateRound } from "./tsd-model.js";
import { renderJoinCodes } from "./qr.js";
import { initTeIntro } from "./te-intro.js";
import { initTeLook } from "./te-look.js";
import { initTeFamilies } from "./te-families.js";
import { initTeDiscover } from "./te-discover.js";
import { initTeRepeats } from "./te-repeats.js";
import { initTeResults } from "./te-results.js";
import { initTeMasker } from "./te-masker.js";
import { initTeCompare } from "./te-compare.js";
import { initTeMade } from "./te-made.js";
import { initTeTsdCheck } from "./te-tsdcheck.js";
import { initTeControls } from "./te-controls.js";
import { initTeMissed } from "./te-missed.js";

const params = new URLSearchParams(location.search);
const PRESENT = params.has("present");
const RECEIVER = params.has("receiver"); // reveal's speaker-view previews: stay passive
const PW_KEY = "presenter-pw";
const AUTO_PER_SEC = 12;
const FLUSH_MS = 250;
const MAX_BATCH = 200;

await Reveal.initialize({
  hash: true,
  width: 1600,
  height: 900,
  margin: 0.04,
  controls: false,
  progress: true,
  center: false,
  transition: "slide",
  backgroundTransition: "fade",
  plugins: [RevealNotes],
});

renderJoinCodes();
initTeIntro();
initTeLook();
initTeFamilies();
initTeDiscover();
initTeRepeats();
initTeResults();
initTeMasker();
initTeCompare();
initTeMade();
initTeTsdCheck();
initTeControls();
initTeMissed();

/* ---------------- tallies ----------------
   local:   every round this screen has run (shown when the room is unreachable)
   server:  last pooled state from the room
   inflight: rounds sent, waiting for the server's ack (shown optimistically)
   outbox:   rounds made while the link was down (presenter re-sends them) */
const local = { n: 0, k: 0 };
let server = null;
let epoch = null;
let inflight = [];
let outbox = [];
let authed = false;
let status = "offline";
let devices = 0;
let live = null;

const pooled = createPooledPanel(document.getElementById("deck-pooled"));
const sim = createTsdSim(document.getElementById("deck-sim"), { onReveal: recordRound });

const pairsK = (pairs) => pairs.reduce((s, [a, b]) => s + (hasTA(a) && hasTA(b) ? 1 : 0), 0);

function render() {
  if (server) {
    const extra = inflight.concat(outbox);
    pooled.update({ n: server.n + extra.length, k: server.k + pairsK(extra) }, "pooled");
  } else {
    pooled.update(local, "on this screen");
  }
}

function recordRound(round) {
  local.n++;
  if (round.hits === 2) local.k++;
  const pair = [round.a, round.b];
  if (status === "live" && live.send({ t: "sim", a: round.a, b: round.b })) inflight.push(pair);
  else if (server) outbox.push(pair); // link dropped mid-talk: send when we're back (presenter only)
  render();
}

/* ---------------- presenter password overlay ---------------- */
const resetBtn = document.getElementById("reset-all"); // big red reset, end slide
const overlay = document.getElementById("pw-overlay");
const overlayForm = overlay.querySelector("form");
const overlayError = overlay.querySelector(".pw-error");

function showOverlay(err = "") {
  overlay.hidden = false;
  overlayError.textContent = err;
  const input = overlayForm.elements.pw;
  input.value = "";
  setTimeout(() => input.focus(), 50);
}
function hideOverlay() { overlay.hidden = true; }

overlayForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = overlayForm.elements.pw.value;
  try { sessionStorage.setItem(PW_KEY, pw); } catch {}
  overlayError.textContent = status === "live" ? "Checking…" : "Will connect when the server is reachable…";
  if (status === "live") live.send({ t: "auth", pw });
});
overlay.querySelector("[data-skip]").addEventListener("click", hideOverlay);
// Keys typed into the password box must not drive the slides.
overlay.addEventListener("keydown", (e) => e.stopPropagation());

/* ---------------- live link ---------------- */
const pill = document.getElementById("live-pill");
let auto = null;

function updatePill() {
  if (!PRESENT) return;
  pill.hidden = false;
  pill.dataset.status = status;
  const text = {
    live: authed ? `Live · ${devices} ${devices === 1 ? "phone" : "phones"}` : "Live · not presenter",
    connecting: "Connecting…",
    offline: "Offline · local only",
    full: "Room full",
    replaced: "Deck open in another tab",
  }[status] || status;
  pill.querySelector("span").textContent = auto ? `${text} · AUTO` : text;
}

/* What phones mirror: the slide title and the current centred text. A slide's
   centred lines carry data-sub-step="N"; the one shown is the last N <= clicks so far. */
function phoneView(s) {
  const step = s.querySelectorAll(".anim-step.visible").length;
  // a slide can swap its phone title from a given click on: data-title-step="N"
  let title = (s.querySelector("h1, h2")?.textContent || "").trim();
  for (const el of s.querySelectorAll("[data-title-step]")) {
    if (+el.dataset.titleStep <= step) title = el.textContent.trim();
  }
  let sub = "";
  for (const el of s.querySelectorAll("[data-sub-step]")) {
    if (+el.dataset.subStep <= step) sub = el.textContent.trim();
  }
  return { title, sub };
}

function sendSlide() {
  if (!authed) return;
  const s = Reveal.getCurrentSlide();
  live.send({ t: "slide", id: s.id || null, unlock: s.dataset.unlock || null, ...phoneView(s) });
}

function flush() {
  if (status !== "live" || !authed || !outbox.length) return;
  while (outbox.length) {
    const chunk = outbox.splice(0, MAX_BATCH);
    if (!live.send({ t: "batch", pairs: chunk })) { outbox.unshift(...chunk); return; }
    inflight.push(...chunk);
  }
}

// Totals only ever grow within an epoch; a message that arrives late with
// smaller totals is stale and must not pull the numbers (or the line) back.
function applyTotals(m) {
  if (m.epoch !== epoch) {
    if (epoch !== null) { inflight = []; outbox = []; } // reset from the control page
    epoch = m.epoch;
    server = null;
  }
  if (!server) pooled.setHistory([[0, 0]]); // leaving local mode, or a fresh epoch
  if (!server || m.n >= server.n) server = { n: m.n, k: m.k };
}

function onMessage(m) {
  if (m.t === "state") {
    applyTotals(m);
    devices = m.devices;
    render();
    updatePill();
  } else if (m.t === "ack") {
    inflight.splice(0, m.count);
    applyTotals(m);
    render();
  } else if (m.t === "hist") {
    pooled.setHistory(m.points);
  } else if (m.t === "auth") {
    authed = m.ok;
    resetBtn.hidden = !m.ok;
    if (m.ok) {
      hideOverlay();
      sendSlide();
      flush();
    } else {
      try { sessionStorage.removeItem(PW_KEY); } catch {}
      showOverlay(m.reason === "not-configured"
        ? "No presenter password is set on the server yet (see README: wrangler secret put PRESENTER_PW)."
        : "Wrong password.");
    }
    updatePill();
  }
}

function storedPw() {
  try { return sessionStorage.getItem(PW_KEY); } catch { return null; }
}

if (!RECEIVER) {
  live = connectLive({
    role: PRESENT ? "screen" : "audience",
    onMessage,
    onStatus(s) {
      status = s;
      if (s !== "live") { authed = false; inflight = []; resetBtn.hidden = true; } // unknown if those arrived: drop
      if (!server) render();
      if (s === "offline" && !overlay.hidden) {
        overlayError.textContent = "Can't reach the live server. You can still run the deck offline.";
      }
      updatePill();
    },
    onOpen() {
      const pw = PRESENT && storedPw();
      if (pw) live.send({ t: "auth", pw }); // auth ok => flush() sends the outbox
      else outbox = [];                     // only the presenter can send a backlog
    },
  });
  setInterval(flush, FLUSH_MS);
}

Reveal.on("slidechanged", sendSlide);
Reveal.on("fragmentshown", sendSlide);
Reveal.on("fragmenthidden", sendSlide);

if (PRESENT && !RECEIVER && !storedPw()) showOverlay();
updatePill();

/* ---------------- big red reset (end slide) ----------------
   Click once to arm, again within 4 s to confirm (no browser dialog on the projector).
   Resets every result, closes the simulator on all phones, and jumps back to the title. */
let armTimer = null;

resetBtn.addEventListener("click", () => {
  if (!authed) return;
  if (!resetBtn.classList.contains("is-armed")) {
    resetBtn.classList.add("is-armed");
    resetBtn.textContent = "Click again to reset everything";
    armTimer = setTimeout(disarm, 4000);
    return;
  }
  clearTimeout(armTimer);
  stopAuto();
  live.send({ t: "reset", scope: "all" });
  local.n = 0; local.k = 0; inflight = []; outbox = [];
  pooled.setHistory([[0, 0]]);
  render();
  resetBtn.classList.remove("is-armed");
  resetBtn.classList.add("is-done");
  resetBtn.textContent = "Reset ✓";
  setTimeout(() => {
    disarm();
    Reveal.slide(0);
  }, 1200);
});

function disarm() {
  resetBtn.classList.remove("is-armed", "is-done");
  resetBtn.textContent = "Reset presentation";
}

/* ---------------- keys ---------------- */
const onSimSlide = () => Reveal.getCurrentSlide().id === "tsd";

Reveal.addKeyBinding({ keyCode: 82, key: "R", description: "Run one simulation round" }, () => {
  if (onSimSlide() && !auto) sim.run();
});

function startAuto() {
  sim.setEnabled(false);
  auto = setInterval(() => {
    const round = simulateRound();
    sim.showInstant(round);
    local.n++;
    if (round.hits === 2) local.k++;
    // pooled only if we can actually deliver it: as presenter, or queued while offline
    if (server && (authed || status !== "live")) outbox.push([round.a, round.b]);
    render();
  }, 1000 / AUTO_PER_SEC);
  updatePill();
}

function stopAuto() {
  if (!auto) return;
  clearInterval(auto);
  auto = null;
  sim.setEnabled(true);
  updatePill();
}

Reveal.addKeyBinding({ keyCode: 65, key: "A", description: "Auto-run simulations on/off" }, () => {
  if (auto) stopAuto();
  else if (PRESENT && onSimSlide()) startAuto();
});

Reveal.on("slidechanged", () => { if (!onSimSlide()) stopAuto(); });

/* Presenter: click the QR code on the simulation slide to run 1,000 rounds at once. */
const BURST = 1000;
const simQr = document.querySelector("#tsd [data-qr]");
if (PRESENT && simQr) {
  simQr.classList.add("qr--run");
  simQr.title = `Run ${BURST.toLocaleString("en-IE")} simulations`;
  simQr.addEventListener("click", () => {
    let round;
    for (let i = 0; i < BURST; i++) {
      round = simulateRound();
      local.n++;
      if (round.hits === 2) local.k++;
      if (server && (authed || status !== "live")) outbox.push([round.a, round.b]);
    }
    if (!auto) sim.showInstant(round);
    render();
    flush();
    const tag = document.createElement("span");
    tag.className = "qr-burst";
    tag.textContent = `+${BURST.toLocaleString("en-IE")} rounds`;
    simQr.append(tag);
    setTimeout(() => tag.remove(), 1200);
  });
}
