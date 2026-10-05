/* Phone page. Waits on a card until the presenter reaches the simulation slide,
   then opens the simulator. Rounds are sent to the room and pooled.

   Fail-open: if the room can't be reached (or is full), the simulator opens
   anyway and the numbers shown are this phone's own rounds. */

import { createTsdSim } from "../js/tsd-widget.js";
import { createPooledPanel } from "../js/tsd-chart.js";
import { connectLive } from "../js/live.js";
import { ACRONYMS, markAcronyms } from "../js/acronyms.js";

const $ = (id) => document.getElementById(id);
document.getElementById("talk-title").textContent = (window.LIVE_CONFIG && window.LIVE_CONFIG.talkTitle) || "";

const mine = { n: 0, k: 0 };
let server = null; // last pooled state
let status = "connecting";
let pending = []; // hits of our rounds sent but not yet acked

const pooled = createPooledPanel($("pooled"), { compact: true });
const sim = createTsdSim($("sim"), { stacked: true, onReveal: recordRound });

function recordRound(round) {
  mine.n++;
  if (round.hits === 2) mine.k++;
  renderMine();
  if (status === "live" && server && server.open.tsd && live.send({ t: "sim", a: round.a, b: round.b })) {
    pending.push(round.hits);
  }
  if (round.hits === 2 && navigator.vibrate) navigator.vibrate(25);
  render();
}

const plural = (n, one, many) => `<b>${n.toLocaleString("en-IE")}</b> ${n === 1 ? one : many}`;
function renderMine() {
  $("mine").innerHTML = `You: ${plural(mine.n, "round", "rounds")} · ${plural(mine.k, "TSD signal", "TSD signals")}`;
}

function render() {
  if (status === "live" && server) {
    const k = pending.filter((h) => h === 2).length;
    pooled.update({ n: server.n + pending.length, k: server.k + k }, "pooled from the room");
  } else {
    pooled.update(mine, "on this phone");
  }
}

/* ---- which view ---- */
let current = "wait";
function show(view) {
  if (view === current) return;
  current = view;
  for (const v of ["wait", "mirror", "tsd"]) {
    const el = $(`view-${v}`);
    el.hidden = v !== view;
    el.classList.toggle("is-entering", v === view);
  }
  // vibrate only once the user has touched the page (browsers block it before that)
  if (view === "tsd" && navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(40);
}

/* What the phone shows:
     simulator  while the presenter is on the TSD simulation slide (or the room is unreachable)
     mirror     otherwise: the presenter's slide title + current centred text
     wait       before the presenter has started */
function decide() {
  const failOpen = status === "offline" || status === "full" || status === "replaced";
  const onSim = server && server.open.tsd && server.slide === "tsd";
  const view = server && server.view;
  if (failOpen || onSim) show("tsd");
  else if (view && view.title) { renderMirror(view); show("mirror"); }
  else show("wait");
  render();
}

let shownView = "";
function renderMirror(view) {
  const key = view.title + "\n" + view.sub;
  if (key === shownView) return;
  shownView = key;
  $("m-title").textContent = view.title;
  $("m-sub").textContent = view.sub;
  markAcronyms($("view-mirror"));
}

/* ---- acronyms: tap to expand ---- */
const sheet = $("acr-sheet");
document.addEventListener("click", (e) => {
  const abbr = e.target.closest("abbr.acr");
  if (abbr && ACRONYMS[abbr.dataset.acr]) {
    const a = ACRONYMS[abbr.dataset.acr];
    sheet.querySelector(".acr-name").textContent = `${abbr.dataset.acr}: ${a.name}`;
    sheet.querySelector(".acr-def").textContent = a.def;
    sheet.hidden = false;
  } else {
    sheet.hidden = true;
  }
});
markAcronyms($("view-tsd"));

/* ---- connection ---- */
const conn = $("conn");
const banner = $("banner");

function setConn(s) {
  conn.dataset.status = s;
  const devices = server ? server.devices : 0;
  conn.querySelector("span").textContent = {
    live: `${devices} in the room`,
    connecting: "Connecting…",
    offline: "Offline",
    full: "Room full",
    replaced: "Open in another tab",
  }[s] || s;
  const msg = {
    offline: "Can't reach the room right now, so your rounds stay on this phone. It will reconnect by itself.",
    full: `The room is full (${server ? server.cap : 50} phones), so your rounds stay on this phone.`,
    replaced: "This page is open in another tab. Use that one.",
  }[s];
  banner.hidden = !msg;
  if (msg) banner.textContent = msg;
}

const live = connectLive({
  role: "audience",
  onStatus(s) {
    status = s;
    if (s !== "live") pending = [];
    setConn(s);
    decide();
  },
  onMessage(m) {
    if (m.t === "ack") {
      pending.splice(0, m.count);
      if (server && m.epoch === server.epoch && m.n >= server.n) Object.assign(server, { n: m.n, k: m.k });
      render();
      return;
    }
    if (m.t !== "state") return;
    if (server && m.epoch !== server.epoch) { // reset from the control page
      mine.n = 0; mine.k = 0; pending = [];
      renderMine();
    }
    // a late message with smaller totals is stale: keep the newer totals
    const keep = server && m.epoch === server.epoch && m.n < server.n ? { n: server.n, k: server.k } : {};
    server = Object.assign(m, keep);
    setConn(status);
    decide();
  },
});
