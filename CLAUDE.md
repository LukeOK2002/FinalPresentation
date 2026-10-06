# Thesis presentation: context for Claude

Luke's MSc/thesis talk (UCC): "Discovery and annotation of transposable elements in the
T2T-CHM13v2.0 genome assembly". Web deck + phone companion, synced live. Audience 20–40
(examiners + peers), presenter's own laptop on HDMI, venue wifi is eduroam.

Live: https://thesis-live.lukeok.workers.dev/?present (slides) · /join/ (phones, QR) · /control/
Luke deploys from his Windows laptop (`git pull` then `npx wrangler deploy`); Claude can't deploy.
Work on branch `claude/brave-dirac-ntwekn`; commit + push after each change; don't open PRs.

## Architecture (see README.md for details)
- One Cloudflare Worker (`src/worker.js`, free plan) serves `public/` and a Durable Object
  "room" at `/ws`. Roles: audience (phones, cap 50), screen (deck; presenter after
  PRESENTER_PW secret), control. State broadcast ~4 Hz; `presenter` flag = authed deck online.
- `public/index.html`: reveal.js 6 deck, fixed 1600×900 canvas, slides as `<section id>`.
- Phones (`public/join/`) show ONLY the presenter's slide title + current centred text
  (no animations, for performance). The TSD simulator shows only while the deck is on `#tsd`.
  Acronyms (TE, TSD) are yellow-underlined + tappable on phones only (`js/acronyms.js`), not on the deck.
- Animated slides use `js/stepper.js`: elements tagged `data-a="name"`, one hidden
  `<span class="fragment anim-step">` per click, a per-slide module with INITIAL state and
  TIMELINES `[name, {op,tx,ty,sc,sx}, startMs, durMs, ease]`. Going back snaps to end states.
  Centred text lines: `<p data-a="tN" data-sub-step="N">` inside `.te-text` (phones mirror them);
  `data-title-step="N"` swaps the phone title. Register new modules in `js/deck.js`.

## Slides (in order)
title · te-intro (what are TEs: retro/transposition) · te-look (TSDs, passive mutation over
50 My, similarity "95% identity") · te-families (5 family lines, consensus built column by
column, real Dfam table, "is this database complete?") · te-discover (k-mers; exact
RepeatModeler counts vs inexact REPrise counts with 1-mismatch neighbours; genome scan;
copies aligned; consensus; masking) · te-repeats (non-TE repeats RepeatModeler also
finds, one quadrant per click: satellite duplications, simple repeats, higher order repeats,
known TE families) · te-results (treemap, one category per click, area ∝ share;
newest dark navy, previous ones invert to white; small ones get leader lines) · te-novel (big yellow "0" + "Novel TE families
discovered*", static; no expansion of the * on purpose; hidden h2 gives phones the title) · tsd (live pooled TA-flank simulation) · end (red
presenter-only reset button).

## Style rules Luke has set
- Dark theme. Titles: PP Editorial New (licensed .otf in public/fonts/, git-ignored).
  Centred explanatory text: white Helvetica. Labels Helvetica.
- Colours: #f9be00 yellow = TEs / TA / 2-of-2; #187fc3 blue = TSDs / 0-1 of 2; host genome
  dark grey #5c6773. Follow colours Luke specifies exactly.
- Each click = one text change + its animation plays automatically.
- Flag (don't silently change) wording/science issues; fix obvious typos and say so.

## Testing
`npm test` (simulation model), `npm run dev` + `npm run test:room` (sync server).
Check animations by driving Chromium with playwright-core
(executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome) and screenshotting stages.
