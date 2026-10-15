# Offline PowerPoint fallback

`thesis-fallback.pptx` is the same talk as the web deck as a plain PowerPoint file, for when the venue wifi, the
Cloudflare Worker or a browser lets you down. Open it in PowerPoint (or Keynote / LibreOffice), press F5 and click
through: **every click plays the same step as the web deck** (same click counts, same order, same timings).

## What is different from the web deck

| Web deck | Fallback |
|---|---|
| QR code, "join on your phone", live/offline pill | removed |
| Live TSD simulation slide (`tsd`) | removed |
| Red presenter reset button on the last slide | removed |
| FAQ cards open an answer that plays by itself | the FAQ slide is a menu; each card **links** to its own slide, and each answer is a normal click-through slide with a "Back to FAQs" link. FAQ 1-4 each get one click per caption of the web animation |
| PP Editorial New titles, Helvetica text | Cambria titles, Arial text (both ship with Office). Set the theme fonts if you want PP Editorial New |
| Smooth easing curves, springs | Fade / wipe / motion-path / grow-shrink effects with the web deck's durations |

Simplifications (everything else is a shape-for-shape copy of the web slides):

- **MADE grid**: 378 dashes become one dashed line per row, wiped in left to right.
- **Divergence graph**: the raw-calls curves are drawn with the web deck's data, wiped in per click (25 % view, then 50 %); the
  fitted curve is one polyline instead of 100 segments.
- **Venn diagram**: rebuilt from the same maths; the "zoom" onto the 0.44 % sliver cross-fades to a magnified copy instead of zooming.
- **Engine slide**: the 70 ms scan flashes are left out; the cards shrink and sweep as in the web deck.
- **FAQ 2**: the cutoff line and read-out (redrawn every frame in the web deck) move/cross-fade to the end state.
- Text slide-ins of a few pixels (the web deck's 12 px nudge) are plain fades.

## Rebuild

The slide geometry and click timelines are read from the live web deck, so the fallback follows the web deck.

```bash
cd fallback
npm install
(cd ../public && python3 -m http.server 8765 &)     # any static server on :8765 serving ../public
npm run extract        # web deck -> extract/model.json   (needs Chromium; set CHROMIUM=/path/to/chrome)
npm run build          # -> thesis-fallback.pptx
npm test               # builds the static "states" deck and replays the animations against it
```

`npm test` checks that every slide has the web deck's number of clicks, that every animation targets a real shape, and that
replaying the animation XML click by click leaves exactly the shapes and positions of each static state. The visual states
deck is written to `out/states.pptx` (one slide per click state).
