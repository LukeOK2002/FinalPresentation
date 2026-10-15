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
  Acronyms (TE, TSD, pHMM), software names (RepeatModeler, REPrise, RepeatMasker, BLAST, RMBlast, HMMER)
  and glossary terms (retrotransposition, transposition, Dfam, k-mer, masked, satellite duplication, simple
  repeat, tandem repeat, homology, orthologous, hidden Markov model, GC %, family library) are
  yellow-underlined + tappable on phones only (`js/acronyms.js`: add a term there; `ci: true` = case-insensitive,
  `match: [...]` = extra spellings), not on the deck. A section with `data-sub-keep` (te-repeats) shows all its
  `data-sub-step` lines so far on phones instead of only the latest.
- Animated slides use `js/stepper.js`: elements tagged `data-a="name"`, one hidden
  `<span class="fragment anim-step">` per click, a per-slide module with INITIAL state and
  TIMELINES `[name, {op,tx,ty,sc,sx}, startMs, durMs, ease]`. Going back snaps to end states.
  Centred text lines: `<p data-a="tN" data-sub-step="N">` inside `.te-text` (phones mirror them);
  `data-title-step="N"` swaps the phone title. Register new modules in `js/deck.js`.

## Slides (in order)
title · te-intro (what are TEs: retro/transposition) · te-t2t (what is T2T: grey hg38 line with 5 gaps, copy drops below, gaps fill lime #7dff0a; click 2 swaps text) · te-look (staggered cut flows straight into TSD formation, one click; passive mutation over
50 My; similarity "95% identity") · te-families (5 family lines, consensus built column by
column at 1.5x speed, real Dfam table, "is this database complete?") · te-discover (k-mers; exact
RepeatModeler counts vs inexact REPrise counts with 1-mismatch neighbours; "frequent k-mers serve as seeds": half-length yellow seeds on the genome;
next click they extend in unison, lift out and align, then the consensus appears by itself; masking) · te-repeats (non-TE repeats RepeatModeler also
finds, one quadrant per click: satellite duplications, simple repeats, higher order repeats,
known TE families; all timelines 1.5x speed) · te-results (treemap, one category per click, area ∝ share;
newest dark navy, previous ones invert to white; small ones get leader lines) · te-novel (big yellow "0" + "Novel TE families
discovered", static, no asterisk; hidden h2 gives phones the title) · te-masker (RepeatMasker box over genome; Dfam card
arcs in fast via nested x/y groups with sine easings, then vanishes; the box sweeps and colours TE hits straight away, same click, sweep 1.5x speed) · te-compare (reannotation vs published track;
white comparison lines; published track fades in already missing them; novel intervals circled, "491 loci") · te-made (MADE1/2: TIR/core diagram → 71 → 378
copies grid → shuffle test, orthology, profile HMM, each with ✅ → all but one confirmed, the unconfirmed one red; scene built in JS) · te-tsdcheck (TA target-site cut/insert/fill →
TA either side → unclear boundary shift, then the 6 bp window follows by itself → results bars 5.82% / 32.28%, then 1.3 s after the bars fill "majority have no TSDs" + blue pulses) · tsd (live pooled TA-flank simulation; presenter clicks the QR to run 1,000
rounds at once) · te-controls (observed vs background bars → Fisher p-values, which go straight onto the z-curve in the same click; then vs known
copies, p = 0.344 / 0.374, also straight onto the curve) · te-missed (RMBlast fixed SW threshold 225 ("each matching base contributes to a copy's total score, with a total of 225 needed for annotation"): score
trace while scanning (both scans 1.3x speed); short copy fails; GC % picks matrix; 1→60 kb GC window; 48% vs 45% matrix → 214 vs 231, last stage 1.2x speed; then with no click the scene clears: "this effect was demonstrated on two separate MADE1 copies", two grey lines with faded yellow stretches) · te-phmm (alignment → base/indel probabilities; exact seed vs
profile on ATCGTCACC; diverged copy: consensus 190 < 225 vs pHMM 30 > 22 bits; flat vs per-family cutoffs) · te-engines (Kimura divergence matrix → 10.5%; RepeatMasker engine slot RMBlast → HMMER;
duplicated, Dfam 1,143 fed to both; both scan one genome, scan 1.4x speed (3 s)) · te-overlap (area-proportional circles, HMMER 5,935,649 vs
RMBlast 3,837,511; HMMER circle blue #006ff9, RMBlast red #f93500; overlap drawn in background navy (clipped bg circle); zoom on 0.44% sliver; 19.47% HMMER-only) · te-diverge (first a raw-calls graph per 0.5% bin, RMBlast red #f93500 / HMMER blue #006ff9, drawn
per frame by a rAF revealer with axes rescaling to the revealed extent, pauses at 25%, click finishes to 50%; then detection graph built per click: axes, x label, 10 bin points, 4PL fit
drawn L→R with fit box; data from EngineGap pool1143 len20both) · te-conclude (3 bullets, one per click) · end (Thank you / Questions?) · faq (after the end: 5 cards (3 + 2 centred) in the background navy, white on hover; click opens an answer panel
that auto-plays a WAAPI animation (js/faq.js): soft vs hard masking; HMMER validation vs GARLIC + 0.2% cutoff
(schematic curves); RepeatModeler families → RepeatMasker → reannotated genome; liftOver human → chimp via chain blocks; non-TE repeats: putative TE track vs segdup track, `bedtools intersect`, reciprocal overlap 92% / 85%, disqualified (schematic numbers). Phones show the open question). · reset (last slide, after the FAQs: red presenter-only button, click twice; wipes results, closes the phone simulator, jumps to the title).

## Style rules Luke has set
- Dark theme. Titles: PP Editorial New (licensed .otf in public/fonts/, git-ignored).
  Centred explanatory text: white Helvetica. Labels Helvetica.
- Colours: #f9be00 yellow = TEs / TA / 2-of-2; #187fc3 blue = TSDs / 0-1 of 2; host genome
  dark grey #5c6773. Follow colours Luke specifies exactly.
- Each click = one text change + its animation plays automatically. Some stages deliberately chain into the next one without a click (text included): build them as one timeline with `chain(a, b, gap)`, `shift`, `speed` from `stepper.js` and remove the extra `.anim-step` span (phones mirror the last text of a chained click, so give chained lines the same `data-sub-step`).
- Stepper gotcha: segments on the same element+property (op, or any of tx/ty/sc/sx) must not
  overlap in time, or WAAPI throws "Offsets must be monotonically non-decreasing".
- Flag (don't silently change) wording/science issues; fix obvious typos and say so.

## Testing
`npm test` (simulation model), `npm run dev` + `npm run test:room` (sync server).
Check animations by driving Chromium with playwright-core
(executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome) and screenshotting stages.
