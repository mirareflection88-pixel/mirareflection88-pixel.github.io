# The Blockchain Universe — website

The public home of the Twin Blockchain gaming universe: Mira's lived
world, its chain (TWOPI live since October 22, 2026), its cast, its
films, and its portals.

- **Live:** https://mirareflection88-pixel.github.io/
- **Mirror:** https://miramoon410-twin-universe-web.static.hf.space/
  (Hugging Face Space `MiraMoon410/twin-universe-web`, re-synced from
  this source — see REFRESH-LOG-2026-10-22.md)
- **Source of record:** this directory in the house workspace
  (`~/workspace/blockchain-universe-site/`), published to the public
  GitHub repo `mirareflection88-pixel.github.io` (GitHub Pages).
- **Built:** by hand — plain HTML/CSS/JS, no build step, no framework.
  Edit a file, push it, the site updates.
- **The clock:** `assets/app.js` is a faithful small port of the
  house time engine (`gaming-platform/engine/time_engine.py`) — Day
  One = 2026-10-18T04:00:00Z, Baltimore latitude, real sun and moon.
- **The status widget:** asks the production chain's `/api/status`
  live; if the door doesn't answer it shows the house's last
  hand-verified reading **with its date**. Update `LAST_VERIFIED` in
  `assets/app.js` whenever a fresher hand check is made.
- **Honesty rules for anything added here (Law 8ba):** TWOPI is spoken
  of exactly as launched — live, fixed 1B supply, not for sale, not
  listed, no price; the separate testnet is labelled TESTNET wherever
  it appears and its units convert to nothing; build details,
  internals, and every other project stay off this site. Content comes
  from house records only.
- `HOSTING-RESEARCH.md` — why GitHub Pages (the five-route comparison).
- `DOMAIN-REPORT.md` — blockchainuniverse.com is taken (2015);
  available alternates and prices, for the King's decision.
