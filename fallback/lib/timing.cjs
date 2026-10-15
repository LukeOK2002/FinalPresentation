/* Builds the <p:timing> element (PowerPoint's animation tree) for one slide.
   items: [{ spid, kind: "sp" | "frame", fx: [effects], text: bool, fill: bool }]
   Effects of the same click form one "On click" group; the first is the click effect, the rest start
   "with previous" at their own delay (ms), which reproduces the web deck's per-click timelines. */

const W = 1600, H = 900;
const WIPE_SUB = { left: 8, right: 2, up: 1, down: 4 };

function build(items) {
  let nid = 3;
  const next = () => nid++;
  const byClick = new Map();
  for (const it of items) for (const e of it.fx) {
    if (!byClick.has(e.c)) byClick.set(e.c, []);
    byClick.get(e.c).push({ it, e });
  }
  if (!byClick.size) return "";

  const set = (spid, val, delay, grp) =>
    `<p:set><p:cBhvr><p:cTn id="${next()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst></p:cTn>` +
    `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>` +
    `<p:to><p:strVal val="${val}"/></p:to></p:set>`;
  const tgt = (spid) => `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`;

  const effect = ({ it, e }, first) => {
    const node = first ? "clickEffect" : "withEffect";
    const delay = Math.round(e.t), dur = Math.round(e.d);
    const grp = it.kind === "sp" ? ` grpId="0"` : "";
    const id = next();
    let preset, cls, sub = 0, inner;
    if (e.k === "in") {
      preset = 10; cls = "entr";
      inner = set(it.spid, "visible", 0) +
        `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${next()}" dur="${dur}"/>${tgt(it.spid)}</p:cBhvr></p:animEffect>`;
    } else if (e.k === "wipe") {
      const dir = it.wipe || "left";
      preset = 22; cls = "entr"; sub = WIPE_SUB[dir];
      inner = set(it.spid, "visible", 0) +
        `<p:animEffect transition="in" filter="wipe(${dir})"><p:cBhvr><p:cTn id="${next()}" dur="${dur}"/>${tgt(it.spid)}</p:cBhvr></p:animEffect>`;
    } else if (e.k === "out") {
      preset = 10; cls = "exit";
      inner = `<p:animEffect transition="out" filter="fade"><p:cBhvr><p:cTn id="${next()}" dur="${dur}"/>${tgt(it.spid)}</p:cBhvr></p:animEffect>` +
        set(it.spid, "hidden", Math.max(dur - 1, 0));
    } else if (e.k === "scale") {
      preset = 6; cls = "emph";
      const r = Math.round(e.r * 100000);
      inner = `<p:animScale><p:cBhvr><p:cTn id="${next()}" dur="${dur}" fill="hold"/>${tgt(it.spid)}</p:cBhvr><p:by x="${r}" y="${r}"/></p:animScale>`;
    } else {
      preset = 0; cls = "path";
      const f = (v, n) => (v / n).toFixed(5);
      inner = `<p:animMotion origin="layout" path="M 0 0 L ${f(e.dx, W)} ${f(e.dy, H)} E" pathEditMode="relative" rAng="0" ptsTypes="AA">` +
        `<p:cBhvr><p:cTn id="${next()}" dur="${dur}" fill="hold"/>${tgt(it.spid)}` +
        `<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>`;
    }
    return `<p:par><p:cTn id="${id}" presetID="${preset}" presetClass="${cls}" presetSubtype="${sub}" fill="hold"${grp} nodeType="${node}">` +
      `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${inner}</p:childTnLst></p:cTn></p:par>`;
  };

  let clicks = "";
  for (const c of [...byClick.keys()].sort((a, b) => a - b)) {
    const list = byClick.get(c).sort((a, b) => a.e.t - b.e.t);
    const outer = next(), inner = next();
    clicks += `<p:par><p:cTn id="${outer}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>` +
      `<p:par><p:cTn id="${inner}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
      list.map((x, i) => effect(x, i === 0)).join("") + `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
  }

  const bld = [...new Set(items.filter((i) => i.kind === "sp" && i.fx.length).map((i) => i.spid))].map((id) => {
    const it = items.find((i) => i.spid === id);
    return `<p:bldP spid="${id}" grpId="0"${it.fill || !it.text ? ` animBg="1"` : ""}/>`;
  }).join("");

  return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
    `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${clicks}</p:childTnLst></p:cTn>` +
    `<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
    `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
    `</p:childTnLst></p:cTn></p:par></p:tnLst>${bld ? `<p:bldLst>${bld}</p:bldLst>` : ""}</p:timing>`;
}

module.exports = { build };
