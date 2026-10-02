# Thesis presentation: live web deck

A web-based slide deck with a phone companion that is synced to the slides. The
audience scans a QR code and their phones follow along. On the live-simulation
slide, everyone's simulations are pooled into a single chart on the projector in
real time.

Everything is hosted for free on one Cloudflare Worker. No domain purchase is needed.

```
public/                 static site (served by the Worker)
  index.html            the slides (reveal.js)
  join/                 phone page   → what the QR code opens
  control/              presenter control page (password)
  js/tsd-model.js       the simulation model (also used by the server)
  js/tsd-widget.js      the "Simulate" animation
  js/tsd-chart.js       pooled results: hero %, bar, convergence chart
  js/live.js            WebSocket client (auto-reconnect, fail-open)
  js/deck.js            reveal.js setup + presenter sync
  css/tokens.css        colours / fonts (yellow #f9be00 = TA / 2/2, blue #187fc3 = 0/2 or 1/2)
  lib/                  vendored reveal.js + QR library (no CDN at the venue)
src/worker.js           Worker + Durable Object "room" (the live sync)
wrangler.toml           Cloudflare config (CAP = 50 phones)
test/                   model tests (npm test) + room protocol test (npm run test:room)
```

## How the live part works

```
 laptop: /?present ──┐                        ┌── phone: /join/  (×50)
 control: /control/ ─┼── wss://…/ws ── Room ──┤
                     │   (one Durable Object) └── phone: /join/
```

- **The deck drives the phones.** When the presenter deck (opened with `?present`)
  lands on a slide with `data-unlock="tsd"`, the simulator opens on every phone.
  Until then, phones show a "you're in, eyes on the screen" card.
- **Each phone tap is one round, taking 1 second.** Two random 6-bp flanks are
  drawn, any `TA` turns yellow, and the result line fades in. The phone sends the
  two sequences, and the server checks the TA count itself (it doesn't trust the
  phone's own result).
- **Pooling.** The server adds every round to one tally and broadcasts it about
  4 times a second. The slide shows the pooled % of 2/2 rounds, a 2/2-vs-rest bar,
  and a running-proportion line that should settle near 9.66%, inside the shaded
  chance band.
- **Fail-open.** If a phone can't reach the room (eduroam trouble, or the room is
  full), the simulator opens anyway and shows that phone's own rounds. If the deck
  can't reach the room, it shows its own rounds. Press **A** to auto-run, which
  demonstrates convergence even with zero phones.
- **Cap.** 50 phones (`CAP` in `wrangler.toml`). A phone that reconnects (flaky
  wifi, page reload) takes back its own seat instead of using a new one.
- **Cost.** Free. Static files are free on Workers, and a SQLite-backed Durable
  Object runs on the Workers Free plan. One talk uses a tiny fraction of the
  free limits.

## The simulation model (please check this)

One round = two independent 6-bp flanks. A flank is a hit if `TA` occurs anywhere
in it. A 2/2 round is a chance "TSD signal".

With **uniform** bases (25% each), P(2/2) works out to **8.37%**, not 9.66%. To make
the room converge on your **9.66%** background rate, bases are drawn with a slight
AT bias that is solved exactly at load time:

| | A | T | C | G |
|---|---|---|---|---|
| P(base) | 26.0% | 26.0% | 24.0% | 24.0% |

That gives P(TA in a flank) = 31.08% and 31.08%² = 9.66%. The calibration is
unit-tested, and a 2-million-round Monte Carlo lands on 9.66%. To use a different
background rate, change `TARGET` in `public/js/tsd-model.js` and everything
(generator, server check, chart, labels) follows. If your 9.66% comes from a
different model (for example real flanking sequence, or a specific genome
composition), swap out `randomFlank()` in the same file.

## Run it locally

Needs Node 20+.

```bash
npm install
cp .dev.vars.example .dev.vars        # local presenter password: change-me
npm run dev                           # http://localhost:8787
```

- Slides: <http://localhost:8787/?present> (password `change-me`)
- Phone page: <http://localhost:8787/join/> (open it in a few tabs or devices)
- Control: <http://localhost:8787/control/>
- Tests: `npm test` (model) and, with `npm run dev` running, `npm run test:room` (the sync server)

Phones on the same wifi can test against your laptop's LAN IP:
`npx wrangler dev --ip 0.0.0.0`, then open `http://<laptop-ip>:8787/join/`.

## Deploy (free)

1. Create a free Cloudflare account at <https://dash.cloudflare.com/sign-up>.
2. From this folder:
   ```bash
   npm install
   npx wrangler login
   npx wrangler secret put PRESENTER_PW     # choose your presenter password
   npx wrangler deploy
   ```
3. Wrangler prints your URL, e.g. `https://thesis-live.<your-subdomain>.workers.dev`.
   The QR codes point at `<that URL>/join/` automatically.
   To change the `thesis-live` part, edit `name` in `wrangler.toml` before deploying.

Re-run `npx wrangler deploy` after any change. Optionally, connect this GitHub repo
in the Cloudflare dashboard (Workers & Pages → your Worker → Settings → Builds)
to deploy on every push.

## On the day

| Where | What |
|---|---|
| Laptop | Open `https://…workers.dev/?present`, enter the password, press **F** for fullscreen. **S** opens speaker notes. |
| Title slide | Audience scans the QR. Phones wait on a card. |
| Simulation slide | Phones unlock automatically. Click **Simulate** or press **R** to run a round on the projector. **A** toggles auto-run. |
| Your phone (optional) | `https://…/control/`: phone count, open/close the simulator, reset results. |

The small pill bottom-left of the deck (present mode only) shows `Live · N phones`.

### Rehearsal checklist

- [ ] **Test on eduroam, from the room, a few days before.** Some university
      networks block `*.workers.dev`. Open `/join/` on a phone on eduroam *and* on
      mobile data. If eduroam blocks it, ask the audience to switch to mobile data
      for that slide; the auto-run (**A**) is your fallback either way.
- [ ] Rehearse with a few friends' phones, then click the big red **Reset
      presentation** button on the final slide (twice: once to arm, once to
      confirm). It clears every result, sends phones back to the waiting card
      and jumps to the title slide. It only appears in `?present` mode after the
      password. `/control/` has the same reset.
- [ ] Keep a PDF fallback: open `https://…/?print-pdf` in Chrome → Print → Save as PDF.
- [ ] If you change a phone-page file on the morning of the talk, phones that
      already loaded the old page just need a refresh.

## Adding slides later

Add `<section>` elements to `public/index.html`. Put speaker notes in
`<aside class="notes">`. A new phone-side interactive section needs three things:

1. a key in `SECTIONS` in `src/worker.js`
2. a view in `public/join/`
3. `data-unlock="<key>"` on the slide that should open it

Credit: the deck + phone + Durable Object architecture follows the UTSIP talk in
[uandiqueue/resurrecting-genomic-fossils](https://github.com/uandiqueue/resurrecting-genomic-fossils)
(MIT). This code is a fresh implementation of the same approach.
