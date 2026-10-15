/* Checks the animated deck against the static "states" deck:
   - every slide's click groups = the web deck's click count
   - every animation target / build entry points at a real shape
   - replaying the animation XML click by click leaves exactly the shapes (and positions) the states deck shows
   Run: node build.cjs && node build.cjs --states && node tests/verify.cjs */
const fs = require("node:fs");
const path = require("node:path");
const JSZip = require("jszip");

const ROOT = path.join(__dirname, "..");
const EMU_W = 12192000, EMU_H = 6858000;

async function slidesOf(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  const out = [];
  for (const n of names) out.push(await zip.file(n).async("string"));
  return out;
}

function shapesOf(xml) {
  const map = new Map(); // name -> {id, x, y, tag}
  const rx = /<p:(sp|cxnSp|graphicFrame|pic)>[\s\S]*?<p:cNvPr id="(\d+)" name="([^"]*)"[\s\S]*?<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/g;
  let m;
  while ((m = rx.exec(xml))) map.set(m[3], { id: m[2], x: +m[4], y: +m[5], w: +m[6], h: +m[7], tag: m[1] });
  return map;
}

function parseTiming(xml) {
  const t = xml.indexOf("<p:timing>");
  if (t < 0) return { clicks: [], bld: [], ids: [] };
  const body = xml.slice(t);
  const ids = [...body.matchAll(/<p:cTn id="(\d+)"/g)].map((m) => m[1]);
  const clicks = body.split('<p:cond delay="indefinite"/>').slice(1).map((chunk) => {
    const effects = [];
    const rx = /<p:cTn id="\d+" presetID="(\d+)" presetClass="(\w+)" presetSubtype="\d+" fill="hold"(?: grpId="0")? nodeType="(\w+)"><p:stCondLst><p:cond delay="(\d+)"\/>([\s\S]*?)<\/p:childTnLst><\/p:cTn><\/p:par>/g;
    let m;
    while ((m = rx.exec(chunk))) {
      const spid = m[5].match(/spid="(\d+)"/)[1];
      const mv = m[5].match(/path="M 0 0 L (-?[\d.]+) (-?[\d.]+) E"/);
      const sc = m[5].match(/<p:by x="(\d+)"/);
      effects.push({ cls: m[2], node: m[3], delay: +m[4], spid, dx: mv ? +mv[1] * EMU_W : 0, dy: mv ? +mv[2] * EMU_H : 0, r: sc ? +sc[1] / 100000 : 1 });
    }
    return effects;
  });
  const bld = [...body.matchAll(/<p:bldP spid="(\d+)"/g)].map((m) => m[1]);
  return { clicks, bld, ids };
}

(async () => {
  const anim = await slidesOf(path.join(ROOT, "thesis-fallback.pptx"));
  const states = await slidesOf(path.join(ROOT, "out/states.pptx"));
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "out/manifest.json")));
  let off = 0, fails = 0, checks = 0, effectsTotal = 0;
  const fail = (m) => { fails++; console.log("FAIL", m); };

  for (let i = 0; i < anim.length; i++) {
    const { id, steps } = man[i];
    const shapes = shapesOf(anim[i]);
    const { clicks, bld, ids } = parseTiming(anim[i]);
    const byId = new Map([...shapes].map(([n, s]) => [s.id, n]));
    effectsTotal += clicks.reduce((a, c) => a + c.length, 0);

    checks++; if (clicks.length !== steps) fail(`${id}: ${clicks.length} click groups, web deck has ${steps}`);
    checks++; if (new Set(ids).size !== ids.length) fail(`${id}: duplicate cTn ids`);
    for (const c of clicks) for (const e of c) { checks++; if (!byId.has(e.spid)) fail(`${id}: animation targets missing shape ${e.spid}`); }
    for (const b of bld) { checks++; if (!byId.has(b) || shapes.get(byId.get(b)).tag !== "sp") fail(`${id}: bldP ${b} is not a p:sp`); }

    // replay
    const first = new Map();
    clicks.forEach((c, k) => [...c].sort((a, b) => a.delay - b.delay).forEach((e) => { if (!first.has(e.spid)) first.set(e.spid, e.cls); }));
    const vis = new Set([...byId.keys()].filter((s) => first.get(s) !== "entr"));
    const pos = new Map([...byId.keys()].map((s) => [s, { dx: 0, dy: 0, r: 1 }]));
    for (let k = 0; k <= steps; k++) {
      if (k > 0) for (const e of [...clicks[k - 1]].sort((a, b) => a.delay - b.delay)) {
        if (e.cls === "entr") vis.add(e.spid); else if (e.cls === "exit") vis.delete(e.spid);
        else if (e.cls === "emph") pos.get(e.spid).r *= e.r;
        else { pos.get(e.spid).dx += e.dx; pos.get(e.spid).dy += e.dy; }
      }
      const st = shapesOf(states[off + k]);
      const want = new Set([...st.keys()].filter((n) => shapes.has(n)));
      const got = new Set([...vis].map((s) => byId.get(s)));
      checks++;
      const missing = [...want].filter((n) => !got.has(n)), extra = [...got].filter((n) => !want.has(n));
      if (missing.length || extra.length) fail(`${id} after ${k} clicks: missing ${missing.slice(0, 4)} extra ${extra.slice(0, 4)} (${missing.length}/${extra.length})`);
      for (const n of want) {
        if (!got.has(n)) continue;
        const a = shapes.get(n), p = pos.get(a.id), b = st.get(n);
        checks++;
        const ax = a.x + p.dx - (p.r - 1) * a.w / 2, ay = a.y + p.dy - (p.r - 1) * a.h / 2;   // scale effects shrink about the shape's centre
        if (Math.abs(ax - b.x) > 6000 || Math.abs(ay - b.y) > 6000) { fail(`${id} after ${k}: ${n} at (${Math.round(ax)},${Math.round(ay)}) expected (${b.x},${b.y})`); break; }
      }
    }
    off += steps + 1;
  }
  console.log(`${checks} checks, ${effectsTotal} animation effects across ${anim.length} slides: ${fails ? fails + " FAILED" : "all passed"}`);
  process.exit(fails ? 1 : 0);
})();
