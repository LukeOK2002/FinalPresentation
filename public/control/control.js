/* Presenter control page: room stats, open/close the phone simulator, reset. */

import { connectLive } from "../js/live.js";

const PW_KEY = "presenter-pw";
const $ = (id) => document.getElementById(id);
const login = $("login");
let authed = false;
let state = null;

const storedPw = () => { try { return sessionStorage.getItem(PW_KEY); } catch { return null; } };

const live = connectLive({
  role: "control",
  onStatus(s) {
    $("conn").textContent = { live: "Live", connecting: "Connecting…", offline: "Can't reach the server", full: "Too many control/deck tabs open" }[s] || s;
    if (s !== "live") authed = false;
    if (s === "offline" && !authed) $("login-err").textContent = "Can't reach the server.";
  },
  onOpen() {
    const pw = storedPw();
    if (pw) live.send({ t: "auth", pw });
  },
  onMessage(m) {
    if (m.t === "auth") {
      authed = m.ok;
      login.hidden = m.ok;
      $("panel").hidden = !m.ok;
      if (!m.ok) {
        try { sessionStorage.removeItem(PW_KEY); } catch {}
        $("login-err").textContent = m.reason === "not-configured"
          ? "No presenter password set on the server (npx wrangler secret put PRESENTER_PW)."
          : "Wrong password.";
      }
    } else if (m.t === "state") {
      state = m;
      $("s-dev").textContent = m.devices;
      $("s-cap").textContent = m.cap;
      $("s-n").textContent = m.n.toLocaleString("en-IE");
      $("s-p").textContent = m.n ? `${((m.k / m.n) * 100).toFixed(1)}%` : "–";
      $("s-split").textContent = m.n ? `2/2: ${m.k} · 1/2: ${m.c1} · 0/2: ${m.c0}` : "";
      $("open-tsd").setAttribute("aria-checked", String(!!m.open.tsd));
    }
  },
});

login.addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = login.elements.pw.value;
  try { sessionStorage.setItem(PW_KEY, pw); } catch {}
  $("login-err").textContent = "Checking…";
  live.send({ t: "auth", pw });
});

$("open-tsd").addEventListener("click", () => {
  if (state) live.send({ t: "open", key: "tsd", value: !state.open.tsd });
});

$("reset-results").addEventListener("click", () => {
  if (confirm("Reset all pooled simulation results to zero?")) live.send({ t: "reset", scope: "results" });
});

$("reset-all").addEventListener("click", () => {
  if (confirm("Reset results AND close the simulator on every phone?")) live.send({ t: "reset", scope: "all" });
});
