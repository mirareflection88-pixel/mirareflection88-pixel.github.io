/* The Blockchain Universe — live widgets.
   1) The Universe Clock: a faithful small port of the house time engine
      (~/workspace/gaming-platform/engine/time_engine.py). Day One began
      2026-10-18T04:00:00Z — local midnight, America/New_York, the night of
      the Sensei's first stay. One universe hour = one real hour; the split
      of day and night is the real sun's, at Baltimore's latitude 39.2904 N.
   2) The chain status widget: asks the live production chain's /api/status.
      If the door doesn't answer (host waking, CORS, offline), it shows
      the house's last verified reading WITH its date. It never invents one. */
(function () {
  "use strict";

  /* ---------------- Universe Clock ---------------- */
  var EPOCH_MS = Date.UTC(2026, 9, 18, 4, 0, 0); // 2026-10-18T04:00:00Z
  var DAY_S = 86400, SYNODIC = 29.530588853;
  var NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
  var LAT = 39.2904, TILT = 23.44;
  var MOON_NAMES = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
                    "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }

  function universeState(nowMs) {
    var elapsed = (nowMs - EPOCH_MS) / 1000;
    var day = Math.floor(elapsed / DAY_S) + 1;
    var cycleHour = (elapsed % DAY_S) / 3600;
    var instant = new Date(EPOCH_MS + elapsed * 1000);
    var jan1 = Date.UTC(instant.getUTCFullYear(), 0, 1);
    var doy = (instant.getTime() - jan1) / 86400000 + 1;

    var decl = -TILT * Math.cos(2 * Math.PI * (doy + 10) / 365.25);
    var phi = rad(LAT), delta = rad(decl);
    var H = rad(15 * (cycleHour - 12));
    var sinE = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
    var elev = deg(Math.asin(clamp(sinE, -1, 1)));
    var cosH0 = clamp(-Math.tan(phi) * Math.tan(delta), -1, 1);
    var dayLen = 2 * deg(Math.acos(cosH0)) / 15;

    var phase, band = "";
    if (elev > 0) { phase = "Day"; }
    else if (elev <= -18) { phase = "Night"; }
    else {
      phase = cycleHour < 12 ? "Dawn" : "Dusk";
      band = elev > -6 ? "civil twilight" : (elev > -12 ? "nautical twilight" : "astronomical twilight");
    }
    var season = (doy >= 79 && doy < 172) ? "spring" : (doy >= 172 && doy < 266) ? "summer"
               : (doy >= 266 && doy < 355) ? "autumn" : "winter";

    var age = (((nowMs - NEW_MOON_MS) / 86400000) % SYNODIC + SYNODIC) % SYNODIC;
    var frac = age / SYNODIC;
    var illum = (1 - Math.cos(2 * Math.PI * frac)) / 2;
    var moonName = MOON_NAMES[Math.floor(((frac + 1 / 16) % 1) * 8)];

    return { day: day, cycleHour: cycleHour, phase: phase, band: band,
             dayLen: dayLen, nightLen: 24 - dayLen, season: season,
             moonName: moonName, illum: illum, elev: elev };
  }

  function fmtHMS(hours) {
    var s = Math.floor(hours * 3600);
    var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(hh) + ":" + p(mm) + ":" + p(ss);
  }

  function tickClock() {
    var el = document.getElementById("uclock");
    if (!el) return;
    var st = universeState(Date.now());
    document.getElementById("u-day").textContent = "Day " + st.day;
    document.getElementById("u-time").textContent = fmtHMS(st.cycleHour);
    document.getElementById("u-phase").textContent =
      st.phase + (st.band ? " · " + st.band : "") + " · " + st.season;
    document.getElementById("u-sun").textContent =
      st.dayLen.toFixed(2) + " h of sun · " + st.nightLen.toFixed(2) + " h of night";
    document.getElementById("u-moon").textContent =
      st.moonName + " · " + Math.round(st.illum * 100) + "% lit";
  }
  if (document.getElementById("uclock")) {
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---------------- Chain status (production) ---------------- */
  var CHAIN = "https://p01--twin-chain-twopi--hhc8y2zrz9yn.code.run";
  // The house's own last verified reading of /api/status, taken by hand.
  var LAST_VERIFIED = {
    when: "Oct 22, 2026 — 6:48 PM EDT",
    chain: "twin-chain-twopi", height: 9866, validators: 1
  };

  function renderStatus(box, data, live) {
    box.innerHTML =
      '<div class="big"><span class="status-dot' + (live ? "" : " stale") + '"></span>' +
      (live ? "The chain is answering live" : "Last verified reading") + "</div>" +
      '<div class="row">' +
      "<span>Chain <b>" + data.chain + "</b></span>" +
      "<span>Height <b>" + data.height + "</b></span>" +
      "<span>Validators <b>" + data.validators + "</b></span>" +
      "</div>" +
      '<p class="small">' + (live
        ? "Read live from the production chain just now — it produces a block about every five seconds. TWOPI is not for sale, not listed on any exchange, and has no price."
        : "The live door did not answer this visit. This is the house's last hand-verified reading — " + LAST_VERIFIED.when + '. Read the <a href="' + CHAIN + '/api/status">live status</a> directly.') +
      "</p>";
  }

  function loadStatus() {
    var box = document.getElementById("chain-status");
    if (!box) return;
    box.innerHTML = '<div class="big">Asking the chain…</div>' +
      '<p class="small">The live status door may take a moment to answer.</p>';
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 60000);
    fetch(CHAIN + "/api/status", ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        renderStatus(box, { chain: j.chain, height: j.height, validators: j.validators }, true);
      })
      .catch(function () {
        clearTimeout(timer);
        renderStatus(box, LAST_VERIFIED, false);
      });
  }
  if (document.getElementById("chain-status")) loadStatus();
})();
