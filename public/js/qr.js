/* QR codes pointing at the phone page, drawn as crisp SVG (no network needed). */
import qrcode from "../lib/qrcode/qrcode.mjs";

export function joinUrl() {
  const configured = window.LIVE_CONFIG && window.LIVE_CONFIG.joinUrl;
  return configured || new URL("join/", location.href).href;
}

export function qrSvg(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code: ${text}"><path d="${d}" fill="#0a0f15"/></svg>`;
}

/** Fill every [data-qr] and [data-join-url] element on the page. */
export function renderJoinCodes(root = document) {
  const url = joinUrl();
  const svg = qrSvg(url);
  root.querySelectorAll("[data-qr]").forEach((el) => { el.innerHTML = svg; });
  root.querySelectorAll("[data-join-url]").forEach((el) => {
    el.textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  });
}
