# Vendored libraries

Copied in so the deck never depends on a CDN at the venue.

| Library | Version | Licence | Files |
|---|---|---|---|
| reveal.js | 6.0.2 | MIT | `reveal/reveal.js`, `reveal/reveal.css`, `reveal/plugin/notes.js` |
| qrcode-generator | 2.0.4 | MIT | `qrcode/qrcode.mjs` |

To upgrade: `npm pack <name>@<version>` and copy the same files from `package/dist/`.
