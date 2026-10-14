/* WebSocket client for the live room (see src/worker.js for the protocol).

   Never blocks the page: if the room can't be reached within CONNECT_TIMEOUT_MS
   the status becomes "offline" and callers fall back to local-only mode, while
   it keeps retrying in the background and switches to "live" if it gets through. */

const CONNECT_TIMEOUT_MS = 4000;
const PING_MS = 15000;
const STALE_MS = 40000; // no traffic for this long => assume a dead link and reconnect

// One id per role, so the deck, control page and phone page can share a browser.
function deviceId(role) {
  const key = `live-device-id:${role}`;
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function wsUrl() {
  const configured = window.LIVE_CONFIG && window.LIVE_CONFIG.wsUrl;
  if (configured) return configured;
  if (location.protocol === "file:") return null;
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
}

/**
 * @param {object} o
 * @param {"audience"|"screen"|"control"} o.role
 * @param {(msg:object)=>void} o.onMessage  every server message
 * @param {(status:string)=>void} o.onStatus  "connecting" | "live" | "offline" | "full" | "replaced"
 * @param {()=>void} [o.onOpen]  after each (re)connect, e.g. to re-send auth
 */
export function connectLive({ role, onMessage, onStatus, onOpen }) {
  const url = wsUrl();
  const id = deviceId(role);
  let ws = null;
  let status = null;
  let attempt = 0;
  let lastTraffic = 0;
  let stopped = false;
  let timers = [];

  const setStatus = (s) => {
    if (s === status) return;
    status = s;
    onStatus && onStatus(s);
  };

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.forEach(clearInterval);
    timers = [];
  }

  function retry(delay) {
    if (stopped) return;
    clearTimers();
    timers.push(setTimeout(open, delay));
  }

  function open() {
    if (stopped) return;
    if (!url) { setStatus("offline"); return; }
    if (status !== "live" && status !== "offline") setStatus("connecting");
    let sock;
    try {
      sock = new WebSocket(`${url}?role=${role}&id=${encodeURIComponent(id)}`);
    } catch {
      setStatus("offline");
      retry(backoff());
      return;
    }
    ws = sock;
    let ended = false; // set when the server said full/replaced

    const connectTimer = setTimeout(() => {
      if (sock.readyState !== WebSocket.OPEN) setStatus("offline");
    }, CONNECT_TIMEOUT_MS);
    timers.push(connectTimer);

    sock.onopen = () => {
      attempt = 0;
      lastTraffic = Date.now();
      setStatus("live");
      onOpen && onOpen();
      const ping = setInterval(() => {
        if (Date.now() - lastTraffic > STALE_MS) { try { sock.close(); } catch {} return; }
        try { sock.send('{"t":"ping"}'); } catch {}
      }, PING_MS);
      timers.push(ping);
    };

    sock.onmessage = (e) => {
      lastTraffic = Date.now();
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === "pong") return;
      if (m.t === "full" || m.t === "replaced") {
        ended = true;
        setStatus(m.t);
        try { sock.close(); } catch {} // don't wait for the server's close frame
      }
      onMessage && onMessage(m);
    };

    sock.onclose = () => {
      if (ws !== sock) return;
      if (ended && status === "replaced") { clearTimers(); return; } // another tab took over
      if (!ended) setStatus(attempt === 0 && status === "live" ? "connecting" : "offline");
      retry(ended ? 15000 : backoff()); // full: someone may leave
    };
    sock.onerror = () => {};
  }

  function backoff() {
    attempt++;
    return Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.random() * 400;
  }

  // Phones sleep and wake; reconnect promptly when the page comes back.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ws && ws.readyState > WebSocket.OPEN && status !== "replaced") {
      attempt = 0;
      retry(0);
    }
  });

  open();

  return {
    send(obj) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify(obj)); return true; } catch {}
      }
      return false;
    },
    get status() { return status; },
    close() { stopped = true; clearTimers(); try { ws && ws.close(); } catch {} },
  };
}
