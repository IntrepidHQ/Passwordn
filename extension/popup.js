// Passwordn — popup UI
// Speaks to background.js over chrome.runtime.sendMessage.

const root = document.getElementById("app");
let state = { unlocked: false, exists: false, tabHost: "", view: "matches" };

const MARK = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="currentColor" opacity=".15"/>
  <path d="M11 20v-6a5 5 0 1 1 10 0v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="9" y="14" width="14" height="10" rx="2.5" stroke="currentColor" stroke-width="2.2"/>
  <circle cx="16" cy="19" r="1.6" fill="currentColor"/>
</svg>`;

function send(msg) {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime?.lastError) { resolve({ ok: false, error: chrome.runtime.lastError.message }); return; }
        resolve(res || {});
      });
    } catch { resolve({ ok: false, error: "no-runtime" }); }
  });
}

async function activeHost() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return "";
    return new URL(tab.url).hostname.replace(/^www\./, "");
  } catch { return ""; }
}

async function refresh() {
  const st = await send({ type: "vault:status" });
  state.exists = !!st.exists;
  state.unlocked = !!st.unlocked;
  state.tabHost = await activeHost();
  render();
}

function render() {
  if (!state.exists) return renderCreate();
  if (!state.unlocked) return renderUnlock();
  return renderMain();
}

function renderCreate() {
  root.innerHTML = `
    ${header()}
    <div class="main">
      <div class="card">
        <h3 class="h">Create your vault</h3>
        <p class="muted" style="font-size:13px; margin:0 0 10px;">Pick a master password. We can't recover it — and nobody else can decrypt your data without it.</p>
        <label class="label">Master password</label>
        <input id="pw" class="input" type="password" autofocus minlength="8" />
        <div class="meter" style="margin: 8px 0;"><span id="bar"></span></div>
        <div id="lbl" class="muted" style="font-size: 12px; margin-bottom: 10px;">At least 8 characters.</div>
        <label class="label">Confirm</label>
        <input id="pw2" class="input" type="password" minlength="8" />
        <button id="go" class="btn btn-primary btn-block" style="margin-top: 10px;">Create vault</button>
        <div id="err" class="muted" style="color: var(--red); font-size: 12px; margin-top: 6px; min-height: 14px;"></div>
      </div>
    </div>
    ${footer()}
  `;
  const pw = byId("pw"), bar = byId("bar"), lbl = byId("lbl");
  pw.addEventListener("input", () => {
    const s = strength(pw.value);
    bar.style.width = s.pct + "%";
    bar.style.background = s.color;
    lbl.textContent = pw.value.length < 8 ? "At least 8 characters." : s.label + " · " + entropy(pw.value) + " bits";
  });
  byId("go").addEventListener("click", async () => {
    const a = pw.value, b = byId("pw2").value;
    const err = byId("err");
    if (a.length < 8) return err.textContent = "Use at least 8 characters.";
    if (a !== b) return err.textContent = "Passwords don't match.";
    err.textContent = "";
    const res = await send({ type: "vault:create", masterPassword: a });
    if (res?.ok) refresh();
  });
}

function renderUnlock() {
  root.innerHTML = `
    ${header()}
    <div class="main">
      <div class="card">
        <h3 class="h">Unlock vault</h3>
        <label class="label">Master password</label>
        <input id="pw" class="input" type="password" autofocus />
        <button id="go" class="btn btn-primary btn-block" style="margin-top: 10px;">Unlock</button>
        <div id="err" class="muted" style="color: var(--red); font-size: 12px; margin-top: 6px; min-height: 14px;"></div>
      </div>
    </div>
    ${footer()}
  `;
  const pw = byId("pw");
  const submit = async () => {
    const res = await send({ type: "vault:unlock", masterPassword: pw.value });
    if (res?.ok) refresh(); else byId("err").textContent = res?.error || "Unlock failed.";
  };
  byId("go").addEventListener("click", submit);
  pw.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
}

async function renderMain() {
  const data = (await send({ type: "vault:list" })).data || { logins: [], cards: [] };
  const host = state.tabHost;
  const matches = data.logins.filter(l => {
    const h = (l.url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return h && (host === h || host?.endsWith("." + h) || h.endsWith("." + (host || "")));
  });

  root.innerHTML = `
    ${header()}
    <div class="tabs">
      <div class="tab ${state.view === "matches" ? "active" : ""}" data-view="matches">This site</div>
      <div class="tab ${state.view === "all" ? "active" : ""}" data-view="all">All (${data.logins.length})</div>
      <div class="tab ${state.view === "cards" ? "active" : ""}" data-view="cards">Cards (${(data.cards || []).length})</div>
      <div class="tab ${state.view === "gen" ? "active" : ""}" data-view="gen">Generate</div>
    </div>
    <div class="toolbar">
      ${host ? `<span class="host-pill">● ${host}</span>` : ""}
      <div class="spacer"></div>
      <button class="btn btn-ghost" id="btn-new" style="height:30px; font-size:12px;">+ New</button>
    </div>
    <div class="main" id="view"></div>
    ${footer(true)}
  `;

  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => { state.view = t.dataset.view; renderMain(); }));
  byId("btn-new").addEventListener("click", () => newLoginFlow(host));
  byId("lock-btn").addEventListener("click", async () => { await send({ type: "vault:lock" }); refresh(); });

  const view = byId("view");
  if (state.view === "matches") view.innerHTML = renderList(matches, host);
  else if (state.view === "all") view.innerHTML = renderList(data.logins, host);
  else if (state.view === "cards") view.innerHTML = renderCards(data.cards || []);
  else if (state.view === "gen") renderGen(view);

  // list row interactions
  view.querySelectorAll(".row").forEach(r => {
    r.addEventListener("click", async () => {
      const id = r.dataset.id;
      const full = await send({ type: "vault:reveal", id });
      if (!full?.login) return;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "autofill", login: { id } });
      window.close();
    });
  });
}

function renderList(items, host) {
  if (!items.length) {
    return `<div class="empty">
      <div style="font-size: 28px; margin-bottom: 6px;">🔐</div>
      <div>No saved logins${host ? ` for <b>${host}</b>` : ""}.</div>
      <button class="btn btn-primary" style="margin-top: 10px;" onclick="document.getElementById('btn-new').click()">Save this site</button>
    </div>`;
  }
  return `<div class="card"><div class="list">${items.map(l => `
    <div class="row" data-id="${l.id}">
      <span class="fav">${(l.name || "?")[0].toUpperCase()}</span>
      <div style="min-width:0">
        <div class="t">${esc(l.name || l.url)}</div>
        <div class="u">${esc(l.username || "")}</div>
      </div>
      <span class="fill">Fill</span>
    </div>`).join("")}</div></div>`;
}

function renderCards(cards) {
  if (!cards.length) return `<div class="empty">No cards saved yet.</div>`;
  return `<div class="card"><div class="list">${cards.map(c => `
    <div class="row">
      <span class="fav" style="background: ${c.brand === "Amex" ? "#15803d" : c.brand === "Mastercard" ? "#b91c1c" : "#4338ca"}">${c.brand[0]}</span>
      <div style="min-width:0">
        <div class="t">${esc(c.brand)} •••• ${esc(c.number.replace(/\s+/g,"").slice(-4))}</div>
        <div class="u">${esc(c.name)} · ${esc(c.exp)}</div>
      </div>
      <span class="fill">Use</span>
    </div>`).join("")}</div></div>`;
}

function renderGen(view) {
  view.innerHTML = `
    <div class="card">
      <div class="mono" id="gen-out" style="padding: 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; font-size: 15px; word-break: break-all; text-align: center;"></div>
      <div class="meter" style="margin: 10px 0;"><span id="gen-bar"></span></div>
      <div class="grid-2">
        <button class="btn btn-ghost" id="gen-copy">Copy</button>
        <button class="btn btn-primary" id="gen-new">Regenerate</button>
      </div>
      <label class="label" style="margin-top: 10px;">Length: <span id="len-v">20</span></label>
      <input id="len" type="range" min="8" max="48" value="20" style="width:100%;">
    </div>
  `;
  const out = byId("gen-out"), bar = byId("gen-bar"), len = byId("len"), lenV = byId("len-v");
  const regen = () => {
    const pw = generatePassword(Number(len.value));
    out.textContent = pw;
    const s = strength(pw);
    bar.style.width = s.pct + "%"; bar.style.background = s.color;
  };
  byId("gen-new").addEventListener("click", regen);
  byId("gen-copy").addEventListener("click", () => { navigator.clipboard.writeText(out.textContent); });
  len.addEventListener("input", () => { lenV.textContent = len.value; regen(); });
  regen();
}

async function newLoginFlow(host) {
  const name = host || "New login";
  const username = prompt(`Email/username for ${name}`);
  if (!username) return;
  const password = prompt("Password (leave empty to generate a strong one)") || generatePassword(20);
  await send({ type: "vault:addLogin", login: { name, url: host, username, password } });
  renderMain();
}

// --- helpers ---
function header() {
  return `
    <header class="hdr">
      <span class="brand" style="color: #fff;">${MARK} Passwordn</span>
      <span class="status ${state.unlocked ? "unlocked" : "locked"}">
        ${state.unlocked ? "Unlocked" : "Locked"}
      </span>
    </header>
  `;
}
function footer(showLock) {
  return `
    <div class="foot">
      <span>v1.0 · Encrypted locally</span>
      ${showLock ? `<button id="lock-btn" class="btn btn-ghost" style="height:28px; font-size:12px;">Lock</button>` : `<a href="https://passwordn.app" target="_blank" rel="noreferrer">passwordn.app</a>`}
    </div>
  `;
}
function byId(id) { return document.getElementById(id); }
function esc(s) { return (s ?? "").toString().replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }
function entropy(str) {
  if (!str) return 0;
  let pool = 0;
  if (/[a-z]/.test(str)) pool += 26;
  if (/[A-Z]/.test(str)) pool += 26;
  if (/\d/.test(str)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(str)) pool += 32;
  return Math.round(str.length * Math.log2(pool || 1));
}
function strength(str) {
  const b = entropy(str);
  if (b < 36) return { label: "Weak", pct: Math.min(25, b), color: "var(--red)" };
  if (b < 60) return { label: "Fair", pct: 25 + (b - 36) * 1.2, color: "var(--yellow)" };
  if (b < 90) return { label: "Strong", pct: 60 + (b - 60), color: "var(--green)" };
  return { label: "Excellent", pct: 100, color: "var(--green)" };
}
function generatePassword(len = 20) {
  const sets = ["abcdefghijkmnopqrstuvwxyz","ABCDEFGHJKLMNPQRSTUVWXYZ","23456789","!@#$%^&*()-_=+[]{};:,.?/"];
  const all = sets.join("");
  const buf = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (const s of sets) out += s[buf[out.length] % s.length];
  for (let i = out.length; i < len; i++) out += all[buf[i] % all.length];
  return out.split("").sort(() => crypto.getRandomValues(new Uint8Array(1))[0] - 128).join("");
}

refresh();
