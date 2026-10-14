/* Protocol test for the live room. Run against a local `npm run dev`:
     npm run test:room
   It RESETS the room, so never point it at the deployed URL during a talk.
   Uses the password from .dev.vars (default "change-me"). */
const BASE = process.env.ROOM_URL || "ws://127.0.0.1:8787/ws";
const PW = process.env.PRESENTER_PW || "change-me";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function client(role, id) {
  const ws = new WebSocket(`${BASE}?role=${role}&id=${id}`); // Node 22+ global WebSocket
  const c = { ws, msgs: [], last: {}, closed: null };
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); c.msgs.push(m); c.last[m.t] = m; });
  ws.addEventListener("close", (e) => { c.closed = e.code; });
  c.send = (o) => ws.send(JSON.stringify(o));
  c.ready = new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  return c;
}
const ok = (cond, msg) => { console.log(cond ? "PASS" : "FAIL", msg); if (!cond) process.exitCode = 1; };

const ctl = client("control", "ctl1"); await ctl.ready; await sleep(100);
ctl.send({ t: "auth", pw: "nope" }); await sleep(100);
ok(ctl.last.auth && ctl.last.auth.ok === false, "wrong password rejected");
ctl.send({ t: "auth", pw: PW }); await sleep(100);
ok(ctl.last.auth.ok === true, "right password accepted");
ctl.send({ t: "reset", scope: "all" }); await sleep(400);
ok(ctl.last.state.n === 0 && ctl.last.state.open.tsd === false, "reset all -> blank, closed");

// 50 phones fit, 51st gets "full"
const phones = [];
for (let i = 0; i < 50; i++) { const p = client("audience", "p" + i); phones.push(p); }
await Promise.all(phones.map(p => p.ready)); await sleep(500);
ok(ctl.last.state.devices === 50, `50 devices counted (got ${ctl.last.state.devices})`);
const extra = client("audience", "p50"); await extra.ready; await sleep(300);
ok(extra.msgs.some(m => m.t === "full"), "51st phone told the room is full");
// same id reconnect replaces, does not take a 2nd seat
const dup = client("audience", "p0"); await dup.ready; await sleep(400);
ok(phones[0].msgs.some(m => m.t === "replaced"), "old socket told it was replaced");
ok(ctl.last.state.devices === 50, `still 50 after reconnect (got ${ctl.last.state.devices})`);

// gating: sims ignored while closed
phones[1].send({ t: "sim", a: "TAAAAA", b: "TACCCC" }); await sleep(400);
ok(ctl.last.state.n === 0, "sim ignored while section closed");
ctl.send({ t: "open", key: "tsd", value: true }); await sleep(400);
ok(phones[2].last.state.open.tsd === true, "phones see section open");

// validation + server-side TA counting
phones[1].send({ t: "sim", a: "TAAAAA", b: "TACCCC" });
phones[2].send({ t: "sim", a: "GGGGGG", b: "TACCCC" });
phones[3].send({ t: "sim", a: "GGGGGG", b: "CCCCCC" });
phones[4].send({ t: "sim", a: "BAD", b: "CCCCCC" });
phones[5].send({ t: "sim", a: "taaaaa", b: "TACCCC" });
await sleep(400);
let s = ctl.last.state;
ok(s.n === 3 && s.k === 1 && s.c1 === 1 && s.c0 === 1, `counts n3 k1 c1 c0 (got n=${s.n} k=${s.k} c1=${s.c1} c0=${s.c0})`);
// rate limit: a burst from one phone counts once
for (let i = 0; i < 10; i++) phones[6].send({ t: "sim", a: "TATATA", b: "TATATA" });
await sleep(400);
ok(ctl.last.state.n === 6, `burst of 10 rate-limited to 3 (n=${ctl.last.state.n})`);
ok(phones[6].last.ack && phones[6].last.ack.count === 1 && phones[6].last.ack.n >= 4, "sender gets ack with totals");
await sleep(900);
phones[6].send({ t: "sim", a: "TATATA", b: "TATATA" }); await sleep(400);
ok(ctl.last.state.n === 7, "next round after ~1 s accepted");
// audience can't batch, reset, or open
phones[7].send({ t: "batch", pairs: [["TATATA","TATATA"]] });
phones[7].send({ t: "reset", scope: "all" });
phones[7].send({ t: "auth", pw: PW });
await sleep(400);
ok(ctl.last.state.n === 7, "audience batch/reset ignored");
// presenter batch
const deck = client("screen", "deck1"); await deck.ready; await sleep(100);
ok(deck.last.hist && Array.isArray(deck.last.hist.points), "screen gets history on join");
deck.send({ t: "auth", pw: PW }); await sleep(100);
deck.send({ t: "batch", pairs: Array.from({ length: 300 }, () => ["TAGGGG", "GGGGGG"]) }); await sleep(400);
ok(ctl.last.state.n === 207 && ctl.last.state.c1 === 201, `batch capped at 200 (n=${ctl.last.state.n})`);
ok(deck.last.ack.count === 200 && deck.last.ack.n === 207, "batch ack");
deck.send({ t: "slide", id: "end" }); await sleep(400);
ok(ctl.last.state.slide === "end", "slide tracked");
// reset results keeps open
ctl.send({ t: "reset", scope: "results" }); await sleep(400);
ok(ctl.last.state.n === 0 && ctl.last.state.open.tsd === true && deck.last.hist.points.length === 1, "reset results keeps section open, history cleared");
// phones count drops when they leave
phones.slice(10).forEach(p => p.ws.close()); await sleep(700);
ok(ctl.last.state.devices === 10, `devices drop to 10 after leaving (got ${ctl.last.state.devices})`);
// cleanup
ctl.send({ t: "reset", scope: "all" }); await sleep(300);
for (const c of [ctl, deck, dup, ...phones]) try { c.ws.close(); } catch {}
await sleep(200); process.exit();
