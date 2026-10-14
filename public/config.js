/* Site-wide settings. The defaults work when everything is served by the one
   Worker (wrangler deploy); only change these if you host pages elsewhere. */
window.LIVE_CONFIG = {
  talkTitle: "Thesis presentation", // shown in the phone page header
  wsUrl: null,   // null = same site, /ws
  joinUrl: null, // null = same site, /join/ (what the QR codes point at)
};
