/* Live sync for the presentation: one Cloudflare Worker + one Durable Object.

   The Worker serves the static site in ../public (slides at /, phone page at
   /join/, control page at /control/) and routes /ws to a single Durable Object
   "room" that every device connects to. Everything is on the free plan:
   static assets are free, and a SQLite-backed Durable Object runs on Workers Free.

   Roles (?role=):
     audience  phones on /join/. Counted against CAP (default 50).
     screen    the slide deck. Presenter powers after {t:"auth"} with PRESENTER_PW.
     control   the control page. Same password.

   client -> server
     {t:"sim", a, b}           one simulation round (two 6-bp flanks). The server
                               re-checks the TA count itself. ~1 round/s per device,
                               with a small burst allowance for bunched-up wifi.
     {t:"auth", pw}            screen/control: unlock presenter actions
     {t:"slide", id, unlock, title, sub}
                               presenter: current slide; `unlock` opens that phone section;
                               title/sub are the text phones mirror
     {t:"open", key, value}    presenter: open/close a phone section by hand
     {t:"batch", pairs}        presenter: auto-run rounds, [[a,b], ...]
     {t:"reset", scope}        presenter: "results" (pooled counts) | "all" (+ close sections)

   server -> client
     {t:"state", epoch, open, slide, view, n, k, c1, c0, devices, cap}
                               view = { title, sub } for the phones to mirror
                               n = rounds, k = 2/2 rounds, c1 = 1/2, c0 = 0/2
     {t:"hist", epoch, points} [[n, k], ...] running totals for the convergence chart
     {t:"ack", epoch, n, k, count}  to the sender after a sim/batch: the totals now
                               (including its `count` rounds, unless they were refused)
     {t:"auth", ok, reason}
     {t:"full"} | {t:"replaced"}   then the socket is closed

   State is persisted to Durable Object storage, so it survives restarts and the
   socket-hibernation API keeps the object asleep (and free) between messages. */

import { DurableObject } from "cloudflare:workers";
import { FLANK_LEN, hasTA } from "../public/js/tsd-model.js";

const ROOM_NAME = "thesis-room";
const SECTIONS = ["tsd"];        // phone sections the presenter can open
const SEQ = new RegExp(`^[ACGT]{${FLANK_LEN}}$`);
const BROADCAST_MS = 250;        // batch updates: ≤4 state messages/s per device
const PERSIST_MS = 1000;
const SIM_REFILL_MS = 900;       // rounds take 1 s on the client...
const SIM_BURST = 3;             // ...but messages can arrive bunched up on flaky wifi
const MAX_BATCH = 200;
const MAX_HISTORY = 800;         // chart points kept; halved when full
const MAX_STAFF = 6;             // screen + control sockets

const blank = (epoch = 1) => ({
  epoch,
  open: Object.fromEntries(SECTIONS.map((s) => [s, false])),
  slide: null,
  view: null,
  n: 0, k: 0, c1: 0, c0: 0,
  hist: [[0, 0]],
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected a WebSocket upgrade", { status: 426 });
      }
      return env.ROOM.get(env.ROOM.idFromName(ROOM_NAME)).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.buckets = new Map(); // device id -> { tokens, t } rate limit
    this.broadcastTimer = null;
    this.persistTimer = null;
    // Keepalive answered by the runtime without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
    ctx.blockConcurrencyWhile(async () => {
      this.s = (await ctx.storage.get("state")) ?? blank();
    });
  }

  cap() {
    const n = parseInt(this.env.CAP ?? "50", 10);
    return Number.isFinite(n) && n > 0 ? n : 50;
  }

  live(tag) {
    return this.ctx.getWebSockets(tag).filter((ws) => ws.readyState === WebSocket.OPEN);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const roleParam = url.searchParams.get("role");
    const role = roleParam === "screen" || roleParam === "control" ? roleParam : "audience";
    const id = (url.searchParams.get("id") || crypto.randomUUID()).slice(0, 64);

    const [client, server] = Object.values(new WebSocketPair());

    // A device that reconnects (flaky wifi, reloaded page) replaces its old socket
    // instead of taking a second seat.
    for (const old of this.ctx.getWebSockets(`id:${id}`)) {
      this.closeWith(old, { t: "replaced" }, 4000);
    }

    const staff = role !== "audience";
    const full = staff
      ? this.live("staff").length >= MAX_STAFF
      : this.live("audience").length >= this.cap();

    this.ctx.acceptWebSocket(server, [staff ? "staff" : "audience", `id:${id}`]);
    server.serializeAttachment({ role, id, authed: false });

    if (full) {
      this.closeWith(server, { t: "full" }, 4001);
    } else {
      this.send(server, this.stateMsg());
      if (staff) this.send(server, this.histMsg());
      this.scheduleBroadcast(); // device count changed
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== "object") return;
    const att = ws.deserializeAttachment() || {};
    const presenter = att.role !== "audience" && att.authed === true;

    switch (m.t) {
      case "sim": {
        if ((att.role !== "audience" || this.s.open.tsd) && this.take(att.id)) this.record(m.a, m.b);
        this.ack(ws, 1);
        break;
      }
      case "batch": {
        if (!Array.isArray(m.pairs)) return;
        const pairs = m.pairs.slice(0, MAX_BATCH);
        if (presenter) for (const p of pairs) if (Array.isArray(p)) this.record(p[0], p[1]);
        this.ack(ws, pairs.length);
        break;
      }
      case "auth": {
        if (att.role === "audience") return;
        const pw = this.env.PRESENTER_PW;
        if (!pw) { this.send(ws, { t: "auth", ok: false, reason: "not-configured" }); return; }
        const ok = typeof m.pw === "string" && m.pw === pw;
        att.authed = ok;
        ws.serializeAttachment(att);
        this.send(ws, { t: "auth", ok, reason: ok ? null : "wrong-password" });
        break;
      }
      case "slide": {
        if (!presenter) return;
        this.s.slide = typeof m.id === "string" ? m.id.slice(0, 64) : null;
        const text = (v) => (typeof v === "string" ? v.slice(0, 300) : "");
        this.s.view = { title: text(m.title), sub: text(m.sub) };
        if (SECTIONS.includes(m.unlock)) this.s.open[m.unlock] = true;
        this.changed();
        break;
      }
      case "open": {
        if (!presenter || !SECTIONS.includes(m.key)) return;
        this.s.open[m.key] = m.value === true;
        this.changed();
        break;
      }
      case "reset": {
        if (!presenter) return;
        const next = blank(this.s.epoch + 1);
        if (m.scope !== "all") { next.open = this.s.open; next.slide = this.s.slide; next.view = this.s.view; }
        this.s = next;
        this.buckets.clear();
        this.changed();
        this.flush(); // new epoch + empty history to everyone now, not in 250 ms
        for (const sock of this.live("staff")) this.send(sock, this.histMsg());
        break;
      }
    }
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye"); } catch {}
    this.scheduleBroadcast();
  }

  async webSocketError() {
    this.scheduleBroadcast();
  }

  /** Token bucket: true if this device may submit a round now. */
  take(id) {
    const now = Date.now();
    const b = this.buckets.get(id) ?? { tokens: SIM_BURST, t: now };
    b.tokens = Math.min(SIM_BURST, b.tokens + (now - b.t) / SIM_REFILL_MS);
    b.t = now;
    this.buckets.set(id, b);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }

  /** Tell the sender its rounds were processed, with the totals that include them. */
  ack(ws, count) {
    this.send(ws, { t: "ack", epoch: this.s.epoch, n: this.s.n, k: this.s.k, count });
  }

  /** Validate and count one round. Returns false if the flanks are malformed. */
  record(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || !SEQ.test(a) || !SEQ.test(b)) return false;
    const hits = (hasTA(a) ? 1 : 0) + (hasTA(b) ? 1 : 0);
    this.s.n++;
    if (hits === 2) this.s.k++;
    else if (hits === 1) this.s.c1++;
    else this.s.c0++;
    this.changed();
    return true;
  }

  changed() {
    this.scheduleBroadcast();
    if (!this.persistTimer) {
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null;
        this.ctx.storage.put("state", this.s);
      }, PERSIST_MS);
    }
  }

  scheduleBroadcast() {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setTimeout(() => this.flush(), BROADCAST_MS);
  }

  flush() {
    if (this.broadcastTimer) { clearTimeout(this.broadcastTimer); this.broadcastTimer = null; }
    const h = this.s.hist;
    if (h[h.length - 1][0] !== this.s.n) {
      h.push([this.s.n, this.s.k]);
      if (h.length > MAX_HISTORY) this.s.hist = h.filter((_, i) => i % 2 === 0 || i === h.length - 1);
    }
    const msg = JSON.stringify(this.stateMsg());
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState === WebSocket.OPEN) { try { ws.send(msg); } catch {} }
    }
  }

  stateMsg() {
    const { epoch, open, slide, view, n, k, c1, c0 } = this.s;
    return { t: "state", epoch, open, slide, view: view ?? null, n, k, c1, c0, devices: this.live("audience").length, cap: this.cap() };
  }

  histMsg() {
    return { t: "hist", epoch: this.s.epoch, points: this.s.hist };
  }

  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch {}
  }

  closeWith(ws, obj, code) {
    this.send(ws, obj);
    try { ws.close(code, obj.t); } catch {}
  }
}
