/* Twin Blockchain — public site data layer.
   Reads the published snapshot (refreshed about every 5 minutes by the
   house publisher) and renders it. If the snapshot is old, the page
   SAYS so — stale data is never dressed as live. */
"use strict";
const DATA_BASE = "https://raw.githubusercontent.com/mirareflection88-pixel/mirareflection88-pixel.github.io/twin-chain-data/twin-blockchain/";
const STALE_AFTER = 15 * 60; // seconds

function bucket() { return Math.floor(Date.now() / 300000); }
async function fetchJSON(name) {
  const r = await fetch(DATA_BASE + name + "?t=" + bucket(), { cache: "no-store" });
  if (!r.ok) throw new Error(name + " HTTP " + r.status);
  return r.json();
}
function fmtInt(n) {
  if (n === null || n === undefined) return "—";
  return Math.round(n).toLocaleString("en-US");
}
function fmtTime(epoch) {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toLocaleString("en-US",
    { year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}
function ago(epoch) {
  if (!epoch) return "";
  const s = Math.max(0, Math.floor(Date.now() / 1000) - epoch);
  if (s < 90) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  return Math.floor(s / 86400) + " d ago";
}
function shortHash(h) {
  if (!h) return "—";
  return h.length > 18 ? h.slice(0, 10) + "…" + h.slice(-8) : h;
}
function healthOf(chain, now) {
  /* Honest health: based on the chain's OWN publication time. */
  if (!chain || chain.state !== "published") return ["bad", "not publishing"];
  const age = now - (chain.published_at || 0);
  if (chain.status_feed === "error") return ["warn", "last published " + ago(chain.published_at) + " — its status feed reported an error"];
  if (age <= 900) return ["good", "producing — updated " + ago(chain.published_at)];
  return ["warn", "last published " + ago(chain.published_at)];
}
function freshnessBanner(snap) {
  const el = document.getElementById("freshness");
  if (!el) return;
  const age = Math.floor(Date.now() / 1000) - snap.generated_at;
  if (age > STALE_AFTER) {
    el.className = "banner stale";
    el.textContent = "This page's data is older than usual — the last update was "
      + fmtTime(snap.generated_at) + " (" + ago(snap.generated_at) + "). "
      + "The numbers below are the last ones published, shown with their times. "
      + "They are not being presented as live.";
  } else {
    el.className = "notice";
    el.textContent = "Data updated " + ago(snap.generated_at)
      + " (" + fmtTime(snap.generated_at) + "). The publisher refreshes "
      + "this page's data about every five minutes.";
  }
}
function failBanner(msg) {
  const el = document.getElementById("freshness");
  if (!el) return;
  el.className = "banner down";
  el.textContent = "The published data could not be loaded just now (" + msg + "). "
    + "Please try again shortly — nothing on this page is guessed or filled in.";
}
async function loadSnapshot() {
  try {
    const snap = await fetchJSON("data.json");
    freshnessBanner(snap);
    return snap;
  } catch (e) {
    failBanner(e.message);
    return null;
  }
}
function chainCard(chain, href) {
  const now = Math.floor(Date.now() / 1000);
  const [cls, label] = healthOf(chain, now);
  const sym = chain.coin ? chain.coin.toLowerCase() : "";
  return `<a class="card coin-card" href="${href}">
    <h3><span class="sym ${sym}">${chain.coin || "HUB"}</span> · ${chain.name}</h3>
    <p class="height">${fmtInt(chain.height)}</p>
    <p class="small">current block height</p>
    <p><span class="dot ${cls}"></span>${label}</p>
    <p class="small faint">Latest block: ${fmtTime(chain.tip_timestamp)}</p>
  </a>`;
}
async function renderHome() {
  const snap = await loadSnapshot();
  if (!snap) return;
  const order = [["twopi", "twopi.html"], ["keel", "keel.html"],
                 ["agora", "agora.html"], ["tessera", "tessera.html"],
                 ["hub", "explorer.html"]];
  document.getElementById("family-grid").innerHTML =
    order.map(([k, href]) => chainCard(snap.chains[k], href)).join("");
  const a = document.getElementById("anchor-list");
  if (a) {
    a.innerHTML = snap.anchors.map(x =>
      `<li><strong>${x.spoke.replace("twin-chain-", "").toUpperCase()}</strong>
       block ${fmtInt(x.spoke_height)} is anchored on the hub at block
       ${fmtInt(x.hub_height)} — anchor transaction
       <span class="mono">${shortHash(x.txid)}</span></li>`).join("");
  }
}
async function renderCoin(key) {
  const snap = await loadSnapshot();
  if (!snap) return;
  const c = snap.chains[key];
  const now = Math.floor(Date.now() / 1000);
  const [cls, label] = healthOf(c, now);
  document.getElementById("live-panel").innerHTML = `
    <div class="kv">
      <dt>Status</dt><dd><span class="dot ${cls}"></span>${label}</dd>
      <dt>Current height</dt><dd>${fmtInt(c.height)}</dd>
      <dt>Latest block</dt><dd>${fmtTime(c.tip_timestamp)}</dd>
      <dt>Tip hash</dt><dd class="mono">${c.tip_hash || "—"}</dd>
      <dt>Total across all accounts</dt><dd>${fmtInt(c.supply_units)} ${c.coin}
        (fixed cap ${fmtInt(c.cap_units)})</dd>
    </div>`;
  const rows = c.accounts.map(a =>
    `<tr><td>${a.role}</td><td class="mono">${a.address}</td>
     <td>${fmtInt(a.balance_units)}</td></tr>`).join("");
  document.getElementById("accounts-body").innerHTML = rows;
  const rb = document.getElementById("recent-blocks");
  if (rb) {
    rb.innerHTML = c.recent_blocks.map(b =>
      `<tr><td>${fmtInt(b.height)}</td><td>${fmtTime(b.timestamp)}</td>
       <td class="mono">${shortHash(b.hash)}</td><td>${b.txs}</td></tr>`).join("");
  }
}
/* ---------------- explorer ---------------- */
let explorerChain = "twopi";
let blocksIndex = null;
function renderExplorerBlocks(snap) {
  const c = snap.chains[explorerChain];
  document.getElementById("explorer-blocks").innerHTML =
    c.recent_blocks.map(b =>
      `<tr><td>${fmtInt(b.height)}</td><td>${fmtTime(b.timestamp)}</td>
       <td class="mono">${b.hash}</td><td>${b.txs}</td></tr>`).join("");
  document.getElementById("explorer-note").textContent =
    "Showing the newest " + c.recent_blocks.length + " blocks of " + c.name +
    " (chain " + c.chain + "). Use search to find any block by its number or hash.";
}
async function renderExplorer() {
  const snap = await loadSnapshot();
  if (!snap) return;
  renderExplorerBlocks(snap);
  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button")
        .forEach(b => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      explorerChain = btn.dataset.chain;
      renderExplorerBlocks(snap);
      document.getElementById("search-result").innerHTML = "";
    });
  });
  document.getElementById("search-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    const q = document.getElementById("search-input").value.trim();
    const out = document.getElementById("search-result");
    if (!q) return;
    out.textContent = "Searching…";
    try {
      if (!blocksIndex) blocksIndex = await fetchJSON("blocks-index.json");
    } catch (e) {
      out.textContent = "The block index could not be loaded (" + e.message + ").";
      return;
    }
    const hits = [];
    const asNum = /^\d+$/.test(q) ? parseInt(q, 10) : null;
    for (const [key, arr] of Object.entries(blocksIndex)) {
      for (const [h, hash, ts] of arr) {
        if ((asNum !== null && h === asNum) ||
            (asNum === null && hash && hash.toLowerCase().startsWith(q.toLowerCase()))) {
          hits.push({ key, h, hash, ts });
          if (hits.length >= 20) break;
        }
      }
      if (hits.length >= 20) break;
    }
    if (!hits.length) {
      out.innerHTML = `<div class="notice">No block found for “${q.replace(/</g, "&lt;")}”
        on any family chain. Check the number or hash and try again.</div>`;
      return;
    }
    out.innerHTML = `<table><thead><tr><th>Chain</th><th>Block</th><th>Time</th><th>Hash</th></tr></thead>
      <tbody>${hits.map(x => `<tr><td>${x.key.toUpperCase()}</td><td>${fmtInt(x.h)}</td>
        <td>${fmtTime(x.ts)}</td><td class="mono">${x.hash}</td></tr>`).join("")}</tbody></table>`;
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "coin") renderCoin(document.body.dataset.chain);
  if (page === "explorer") renderExplorer();
});
