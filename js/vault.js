// Passwordn Vault — Agency credential management
(function () {
  const STORAGE_KEY = "passwordn:vault";
  const SESSION_KEY = "passwordn:session";
  const BRUTE_KEY   = "passwordn:bf";
  const MAX_ATTEMPTS  = 5;
  const LOCKOUT_MS    = 30_000;          // 30 s after 5 bad attempts
  const INACTIVITY_MS = 10 * 60 * 1000; // auto-lock after 10 min idle

  // ── Brute-force helpers ────────────────────────────────────────────────────
  function getBrute()    { try { return JSON.parse(localStorage.getItem(BRUTE_KEY) || '{"a":0,"u":0}'); } catch { return { a: 0, u: 0 }; } }
  function saveBrute(bf) { localStorage.setItem(BRUTE_KEY, JSON.stringify(bf)); }
  function clearBrute()  { localStorage.removeItem(BRUTE_KEY); }

  // ── Inactivity auto-lock ──────────────────────────────────────────────────
  let idleTimer = null;
  function armIdleTimer() {
    clearTimeout(idleTimer);
    if (!state.unlocked) return;
    idleTimer = setTimeout(() => { if (state.unlocked) { lock(); toast && toast("Vault locked — 10 min idle", "warn"); } }, INACTIVITY_MS);
  }
  function resetIdle() { if (state.unlocked) armIdleTimer(); }
  ["pointerdown","keydown","touchstart","scroll"].forEach(ev =>
    document.addEventListener(ev, resetIdle, { passive: true, capture: true }));


  const state = {
    unlocked: false,
    key: null,
    data: { clients: [], logins: [], cards: [], notes: [], subscriptions: [] },
    view: "clients",
    selectedClientId: null,
    query: "",
  };

  const SAMPLE = {
    clients: [
      { id: "cl1", name: "Acme Corp",      url: "acmecorp.com",          color: "#1E3A8A", initials: "AC", status: "active",   plan: "Business" },
      { id: "cl2", name: "Bolt Creative",  url: "boltcreative.co",       color: "#8B5CF6", initials: "BC", status: "active",   plan: "Starter"  },
      { id: "cl3", name: "Peak Wellness",  url: "peakwellness.com",      color: "#16A34A", initials: "PW", status: "prospect", plan: null       },
      { id: "cl4", name: "Harbor Digital", url: "harbordigital.agency",  color: "#F59E0B", initials: "HD", status: "active",   plan: "Pro"      },
    ],
    logins: [
      { id: "l1", clientId: "cl1", name: "GitHub",      url: "github.com",      username: "acme@company.com",     password: "n7Q!8bcvK2p-w#mZ", fav: "G", color: "#16a34a", updated: Date.now() - 86400000 * 3  },
      { id: "l2", clientId: "cl1", name: "Squarespace", url: "squarespace.com", username: "admin@acmecorp.com",   password: "Sq!X9p-vR2nK",     fav: "S", color: "#111111", updated: Date.now() - 86400000 * 7  },
      { id: "l3", clientId: "cl1", name: "Stripe",      url: "stripe.com",      username: "billing@acmecorp.com", password: "Zx!8pQ2n-KvB4m",   fav: "S", color: "#635bff", updated: Date.now() - 86400000 * 4  },
      { id: "l4", clientId: "cl2", name: "Webflow",     url: "webflow.com",     username: "design@bolt.co",       password: "Wf-2xK!9qRmB",     fav: "W", color: "#146EF5", updated: Date.now() - 86400000 * 2  },
      { id: "l5", clientId: "cl2", name: "Figma",       url: "figma.com",       username: "design@bolt.co",       password: "h8bR2-Qp!mKeX",    fav: "F", color: "#8b5cf6", updated: Date.now() - 86400000 * 14 },
      { id: "l6", clientId: "cl4", name: "WordPress",   url: "wordpress.com",   username: "admin@harbor.agency",  password: "pwd123",            fav: "W", color: "#21759B", updated: Date.now() - 86400000 * 60, weak: true },
      { id: "l7", clientId: "cl4", name: "GoDaddy",     url: "godaddy.com",     username: "domains@harbor.agency",password: "7Jp-vC2x!hK9qRmN",  fav: "G", color: "#1BDBDB", updated: Date.now() - 86400000 * 5  },
      { id: "l8", clientId: null,  name: "Slack",       url: "slack.com",       username: "hans@passwordn.app",   password: "Yn7-pL3vB!qRt",    fav: "S", color: "#4A154B", updated: Date.now() - 86400000 * 1  },
      { id: "l9", clientId: null,  name: "AWS",         url: "aws.amazon.com",  username: "ops@passwordn.app",    password: "7Jp-vC2x!hK9qRmN",  fav: "A", color: "#f59e0b", updated: Date.now() - 86400000 * 22 },
    ],
    cards: [
      { id: "c1", brand: "Visa",       name: "Hans Maier", number: "4242 4242 4242 4242", exp: "08/29", cvv: "737",  theme: "visa"    },
      { id: "c2", brand: "Mastercard", name: "Hans Maier", number: "5555 5555 5555 4444", exp: "11/27", cvv: "392",  theme: "mc"      },
      { id: "c3", brand: "Amex",       name: "Hans Maier", number: "3782 822463 10005",   exp: "03/28", cvv: "1045", theme: "amex"    },
    ],
    subscriptions: [
      { id: "s1", name: "Claude / Anthropic", amount: 20,     cycle: "monthly", nextDate: Date.now() + 86400000 * 3,  color: "#CC785C", icon: "AN", category: "AI"        },
      { id: "s2", name: "Cursor",             amount: 20,     cycle: "monthly", nextDate: Date.now() + 86400000 * 15, color: "#4F46E5", icon: "CU", category: "AI Dev"     },
      { id: "s3", name: "Semrush",            amount: 117.33, cycle: "monthly", nextDate: Date.now() + 86400000 * 5,  color: "#FF642D", icon: "SM", category: "Analytics"  },
      { id: "s4", name: "Adobe CC",           amount: 54.99,  cycle: "monthly", nextDate: Date.now() + 86400000 * 11, color: "#FF0000", icon: "AD", category: "Design"     },
      { id: "s5", name: "Webflow",            amount: 14,     cycle: "monthly", nextDate: Date.now() + 86400000 * 22, color: "#146EF5", icon: "WF", category: "Website"    },
      { id: "s6", name: "n8n",                amount: 20,     cycle: "monthly", nextDate: Date.now() + 86400000 * 8,  color: "#FF6D5A", icon: "N8", category: "Automation" },
    ],
    notes: [
      { id: "n1", title: "Home Wi-Fi", content: "SSID: hansnet-5g\nKey: supersecretkey2026", updated: Date.now() - 86400000 * 30 },
    ],
  };

  // ── Storage & Crypto ────────────────────────────────────────────────────
  function loadVault() {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
  }
  function saveVault(v) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }

  async function createVault(masterPassword) {
    const salt = Crypto.randomBytes(16);
    const key  = await Crypto.deriveKey(masterPassword, salt);
    const auth = await Crypto.encrypt({ _ok: true, ts: Date.now() }, key);
    const blob = await Crypto.encrypt(SAMPLE, key);
    saveVault({ v: 1, salt: Crypto.toB64(salt), iters: 250000, auth, blob, createdAt: Date.now() });
    state.key = key; state.data = structuredClone(SAMPLE); state.unlocked = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    armIdleTimer();
  }

  async function unlockVault(masterPassword) {
    // ── Brute-force gate ────────────────────────────────────────────────────
    const bf = getBrute();
    if (bf.u > Date.now()) {
      const secs = Math.ceil((bf.u - Date.now()) / 1000);
      throw new Error(`Too many failed attempts — try again in ${secs}s`);
    }

    const vault = loadVault();
    if (!vault) throw new Error("No vault yet");
    const key = await Crypto.deriveKey(masterPassword, Crypto.fromB64(vault.salt), vault.iters);
    try {
      await Crypto.decrypt(vault.auth, key);
    } catch {
      const attempts = (bf.a || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        saveBrute({ a: 0, u: Date.now() + LOCKOUT_MS });
        throw new Error(`Too many failed attempts — vault locked for ${LOCKOUT_MS / 1000}s`);
      }
      saveBrute({ a: attempts, u: 0 });
      const left = MAX_ATTEMPTS - attempts;
      throw new Error(`Incorrect password — ${left} attempt${left !== 1 ? "s" : ""} remaining`);
    }
    clearBrute();
    state.key = key; state.data = await Crypto.decrypt(vault.blob, key);
    // migrate: ensure all arrays exist
    state.data.clients       = state.data.clients       || [];
    state.data.subscriptions = state.data.subscriptions || [];
    state.unlocked = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    armIdleTimer();
  }

  async function persist() {
    const vault = loadVault();
    if (!vault || !state.key) return;
    vault.blob = await Crypto.encrypt(state.data, state.key);
    vault.updatedAt = Date.now();
    saveVault(vault);
  }

  function lock() {
    clearTimeout(idleTimer);
    state.unlocked = false; state.key = null;
    state.data = { clients: [], logins: [], cards: [], notes: [], subscriptions: [] };
    state.selectedClientId = null;
    // Clear clipboard on lock
    navigator.clipboard?.writeText("").catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);
    render();
  }

  // ── SVG icons ───────────────────────────────────────────────────────────
  const ICONS = {
    search:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>`,
    plus:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
    copy:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
    eye:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
    trash:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
    lock:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    card:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>`,
    note:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h8"/></svg>`,
    wand:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5-12 12H3v-5L15 4z"/><path d="M14 7l3 3"/></svg>`,
    alert:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 22h20L12 2z"/><path d="M12 10v5M12 18h.01"/></svg>`,
    users:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M17 11a4 4 0 0 1 0-8M23 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
    refresh:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    grid:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    shield:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/></svg>`,
    briefcase: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>`,
    fill:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M12 3l6 6-9 9H3v-6l9-9z"/></svg>`,
    external:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  };
  function svg(name) { return ICONS[name] || ""; }

  // ── Root ────────────────────────────────────────────────────────────────
  const root = document.getElementById("app-root");

  // ── Lock screen ─────────────────────────────────────────────────────────
  function renderLock(isNew) {
    root.innerHTML = `
      <div class="lock-screen">
        <div class="lock-card">
          <div class="card card-pad-lg">
            <div style="display:grid;justify-items:center;gap:10px;margin-bottom:20px;">
              <span data-mark></span>
              <h2 class="h2" style="margin:0;text-align:center;">${isNew ? "Create your vault" : "Unlock your vault"}</h2>
              <p class="muted" style="text-align:center;font-size:15px;margin:0;max-width:32ch;color:var(--text-2);">
                ${isNew ? "Choose a master password. We can't recover it — nobody can." : "Enter your master password to decrypt."}
              </p>
            </div>
            <form id="lock-form" style="display:grid;gap:12px;">
              <div>
                <label class="label">Master password</label>
                <input class="input" type="password" id="mpw" autocomplete="${isNew ? "new-password" : "current-password"}" autofocus required minlength="${isNew ? 8 : 1}" />
                ${isNew ? `<div style="margin-top:8px;"><div class="meter"><span id="mstrength" style="width:0%;background:var(--red);transition:width .2s,background .2s;"></span></div><div style="margin-top:6px;font-size:12px;color:var(--text-3);"><span id="mlabel">Enter at least 8 characters.</span></div></div>` : ""}
              </div>
              ${isNew ? `<div><label class="label">Confirm password</label><input class="input" type="password" id="mpw2" required minlength="8" /></div>` : ""}
              <button class="btn btn-primary" type="submit" style="width:100%;">${isNew ? "Create vault" : "Unlock"}</button>
              ${!isNew ? `<button type="button" class="btn btn-ghost btn-sm" id="reset-vault" style="justify-self:center;color:var(--text-3);">Forgot password — reset vault</button>` : ""}
            </form>
          </div>
          <p style="text-align:center;font-size:12px;color:var(--text-3);margin-top:14px;">AES-256-GCM · Zero-knowledge · Local encryption</p>
        </div>
      </div>`;

    if (isNew) {
      const mpw = document.getElementById("mpw");
      const bar = document.getElementById("mstrength");
      const lab = document.getElementById("mlabel");
      mpw.addEventListener("input", () => {
        const s = Crypto.strength(mpw.value);
        bar.style.width = Math.min(100, s.pct) + "%";
        bar.style.background = s.class === "red" ? "var(--red)" : s.class === "yellow" ? "var(--yel)" : "var(--grn)";
        lab.textContent = mpw.value.length < 8 ? "Enter at least 8 characters." : s.label + " — " + Crypto.entropyBits(mpw.value) + " bits";
      });
    }

    document.getElementById("lock-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = document.getElementById("mpw").value;
      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = isNew ? "Creating…" : "Unlocking…";
      try {
        if (isNew) {
          const pw2 = document.getElementById("mpw2").value;
          if (pw !== pw2) { toast("Passwords don't match", "err"); return; }
          if (pw.length < 8)  { toast("Use at least 8 characters", "err"); return; }
          await createVault(pw);
          toast("Vault created · encrypted locally", "ok");
        } else {
          await unlockVault(pw);
          toast("Vault unlocked", "ok");
        }
        render();
      } catch (err) {
        toast(err.message || "Failed", "err");
        btn.disabled = false; btn.textContent = isNew ? "Create vault" : "Unlock";
      }
    });

    const reset = document.getElementById("reset-vault");
    if (reset) reset.addEventListener("click", () => {
      if (!confirm("This erases all encrypted local data. Continue?")) return;
      localStorage.removeItem(STORAGE_KEY);
      render();
    });
  }

  // ── App shell ───────────────────────────────────────────────────────────
  function renderApp() {
    const d = state.data;
    const weak = d.logins.filter(l => Crypto.entropyBits(l.password) < 50);
    const old  = d.logins.filter(l => (Date.now() - l.updated) > 1000 * 60 * 60 * 24 * 60);
    const issues = weak.length + old.length;

    root.innerHTML = `
      <div class="app-shell">

        <!-- SIDEBAR (desktop) -->
        <aside class="sidebar">
          <div class="sb-brand">
            <a class="brand" href="index.html" data-mark style="text-decoration:none;color:var(--text);">Passwordn</a>
          </div>
          <nav class="sb-nav">
            <div class="sb-section">Workspace</div>
            ${sbItem("clients",       "users",     "Clients",         d.clients.length)}
            <div class="sb-section">Vault</div>
            ${sbItem("logins",        "lock",      "Logins",          d.logins.length)}
            ${sbItem("cards",         "card",      "Payments",        d.cards.length)}
            ${sbItem("subscriptions", "refresh",   "Subscriptions",   d.subscriptions.length)}
            <div class="sb-section">Tools</div>
            ${sbItem("catalog",       "grid",      "Service Catalog", null,  "")}
            ${sbItem("generator",     "wand",      "Generator",       null,  "")}
            ${sbItem("security",      "alert",     "Security",        issues || null, issues ? "alert" : "")}
            ${sbItem("notes",         "note",      "Notes",           d.notes.length)}
          </nav>
          <div class="sb-foot">
            <button class="btn btn-ghost btn-sm" id="nav-lock" style="width:100%;justify-content:flex-start;gap:8px;">${svg("lock")} Lock vault</button>
          </div>
        </aside>

        <!-- MAIN CONTENT -->
        <div class="main-content">
          <div class="topbar">
            <h1 class="topbar-title">${viewTitle()}</h1>
            <div class="search-wrap" style="margin-left:12px;">
              <span class="ico">${svg("search")}</span>
              <input id="q" class="input" placeholder="Search vault…" value="${escapeHtml(state.query)}" />
            </div>
            <div class="row" style="margin-left:auto;gap:8px;">
              <button class="theme-toggle" data-theme-toggle aria-label="Toggle theme">
                <svg class="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                <svg class="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
              </button>
              <button class="btn btn-primary btn-sm" id="add-item">${svg("plus")} ${addLabel()}</button>
            </div>
          </div>

          <!-- KPI row -->
          <div class="kpis">
            ${kpiCard("briefcase", d.clients.length, "Clients", "var(--primary)")}
            ${kpiCard("lock",      d.logins.length,  "Credentials", "var(--primary-l)")}
            ${kpiCard("alert",     issues,            "Issues", issues ? "var(--red)" : "var(--grn-dk)")}
            ${kpiCard("shield",    Math.max(0, 100 - weak.length * 8 - old.length * 3), "Vault score", Math.max(0, 100 - weak.length * 8 - old.length * 3) >= 85 ? "var(--grn-dk)" : "var(--yel-dk)")}
          </div>

          <div id="view-root"></div>
        </div>

        <!-- BOTTOM NAV (mobile) -->
        <nav class="bottom-nav">
          <div class="bottom-nav-inner">
            ${tabBtn("clients",       "users",   "Clients")}
            ${tabBtn("logins",        "lock",    "Logins")}
            ${tabBtn("cards",         "card",    "Payments")}
            ${tabBtn("subscriptions", "refresh", "Subs")}
            ${tabBtn("security",      "alert",   "Security")}
          </div>
        </nav>
      </div>`;

    // Events
    document.querySelectorAll("[data-view]").forEach(el => {
      el.addEventListener("click", () => { state.view = el.dataset.view; render(); });
    });
    document.getElementById("q").addEventListener("input", e => { state.query = e.target.value; renderView(); });
    document.getElementById("nav-lock").addEventListener("click", lock);
    document.getElementById("add-item").addEventListener("click", () => {
      const map = { cards: openCardModal, notes: openNoteModal, clients: openClientModal, subscriptions: openSubscriptionModal };
      (map[state.view] || openItemModal)();
    });

    renderView();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function sbItem(view, icon, label, count, extra = "") {
    const active = state.view === view ? "active" : "";
    const badge  = count != null ? `<span class="badge">${count}</span>` : "";
    return `<div class="sb-item ${active} ${extra}" data-view="${view}"><span class="sb-icon">${svg(icon)}</span>${escapeHtml(label)}${badge}</div>`;
  }

  function tabBtn(view, icon, label) {
    const active = state.view === view ? "active" : "";
    return `<button class="tab-btn ${active}" data-view="${view}"><div class="tab-icon">${svg(icon)}</div>${escapeHtml(label)}</button>`;
  }

  function kpiCard(icon, value, label, color) {
    return `<div class="kpi">
      <div class="k-ico" style="background:color-mix(in oklab,${color} 14%,transparent);color:${color};">${svg(icon)}</div>
      <div class="k-num" style="color:${color};">${value}</div>
      <div class="k-lbl">${label}</div>
    </div>`;
  }

  function viewTitle() {
    const map = { clients:"Clients", logins:"Logins", cards:"Payments", subscriptions:"Subscriptions", catalog:"Service Catalog", generator:"Generator", security:"Security", notes:"Notes" };
    return map[state.view] || "Vault";
  }

  function addLabel() {
    const map = { clients:"New client", logins:"New login", cards:"New card", notes:"New note", subscriptions:"Add sub" };
    return map[state.view] || "New";
  }

  // ── View router ─────────────────────────────────────────────────────────
  function renderView() {
    const c = document.getElementById("view-root");
    if (!c) return;
    const v = state.view;
    if      (v === "clients")       c.innerHTML = viewClients();
    else if (v === "logins")        c.innerHTML = viewLogins();
    else if (v === "cards")         c.innerHTML = viewCards();
    else if (v === "subscriptions") c.innerHTML = viewSubscriptions();
    else if (v === "catalog")       c.innerHTML = viewCatalog();
    else if (v === "generator")     c.innerHTML = viewGenerator();
    else if (v === "security")      c.innerHTML = viewSecurity();
    else if (v === "notes")         c.innerHTML = viewNotes();
    bindViewEvents();
  }

  // ── Clients view ────────────────────────────────────────────────────────
  function viewClients() {
    const { clients, logins } = state.data;
    return `
      <div class="clients-grid">
        ${clients.map(c => {
          const cLogins = logins.filter(l => l.clientId === c.id);
          const weak    = cLogins.filter(l => Crypto.entropyBits(l.password) < 50);
          return `
          <div class="client-card card-hover" data-client-id="${c.id}">
            <div class="cc-header">
              ${logoSpan(c.url, c.initials, c.color, "cc-avatar", `background:linear-gradient(135deg,${c.color},${darken(c.color)});`)}
              <div style="flex:1;min-width:0;">
                <div class="cc-name truncate">${escapeHtml(c.name)}</div>
                <div class="cc-url truncate">${escapeHtml(c.url)}</div>
              </div>
            </div>
            <div class="cc-stats">
              <div class="cc-stat">${cLogins.length} credentials</div>
              ${weak.length ? `<div class="cc-stat" style="color:var(--red-dk);background:var(--red-bg);">${weak.length} weak</div>` : ""}
              ${c.plan ? `<div class="cc-stat">${escapeHtml(c.plan)}</div>` : ""}
            </div>
            <div class="cc-foot">
              <span class="pill ${c.status === "active" ? "green" : "yellow"}"><span class="dot"></span>${c.status === "active" ? "Active" : "Prospect"}</span>
              <div class="row gap-6">
                <button class="btn btn-soft btn-xs" data-view-client="${c.id}">View logins</button>
                <button class="icon-btn" data-edit-client="${c.id}">${svg("edit")}</button>
              </div>
            </div>
          </div>`;
        }).join("")}
        <div class="client-card add" id="add-client-card">${svg("plus")}<span style="font-size:13px;font-weight:600;">New client</span></div>
      </div>`;
  }

  // ── Logins view ─────────────────────────────────────────────────────────
  function viewLogins() {
    const q = state.query.trim().toLowerCase();
    let items = state.data.logins.filter(l =>
      !q || l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q) || (l.username || "").toLowerCase().includes(q)
    );
    if (state.selectedClientId) items = items.filter(l => l.clientId === state.selectedClientId);
    if (!items.length) return emptyState("lock", "No logins found", "Add one with the New button above.");

    const groups = {};
    items.forEach(l => { const k = l.clientId || "__personal__"; (groups[k] = groups[k] || []).push(l); });

    return Object.entries(groups).map(([cid, rows]) => {
      const client = state.data.clients.find(c => c.id === cid);
      const label  = client ? client.name : "Personal";
      const color  = client ? client.color : "var(--primary)";
      return `
      <div class="panel" style="margin-bottom:12px;">
        <div class="ph">
          <div class="row gap-8">
            ${client
              ? logoSpan(client.url, client.initials, client.color, "", `width:22px;height:22px;border-radius:6px;display:grid;place-items:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;background:linear-gradient(135deg,${escapeHtml(client.color)},${escapeHtml(darken(client.color))});`)
              : `<span style="color:var(--text-3);">${svg("lock")}</span>`}
            <h3>${escapeHtml(label)}</h3>
          </div>
          <span class="muted" style="font-size:13px;">${rows.length} item${rows.length === 1 ? "" : "s"}</span>
        </div>
        <div class="body">
          <div class="vault-list">
            ${rows.map(l => {
              const s = Crypto.strength(l.password);
              const svc = window.matchService ? window.matchService(l.url) : null;
              return `
              <div class="vault-row" data-login-id="${l.id}">
                ${logoSpan(l.url, l.fav, svc ? svc.color : l.color, "favi")}
                <div class="flex-1">
                  <div class="vr-t">${escapeHtml(l.name)}</div>
                  <div class="vr-u">${escapeHtml(l.url)}</div>
                </div>
                <div class="flex-1">
                  <div class="vr-u">${escapeHtml(l.username || "")}</div>
                  <div class="vr-pw">••••••••••</div>
                </div>
                <div><span class="pill ${s.class}"><span class="dot"></span>${s.label}</span></div>
                <div class="vr-actions">
                  <button class="icon-btn" data-copy-user="${l.id}" title="Copy username">${svg("copy")}</button>
                  <button class="icon-btn" data-copy-pw="${l.id}" title="Copy password">${svg("copy")}</button>
                  <button class="icon-btn" data-edit-login="${l.id}" title="Edit">${svg("edit")}</button>
                  <button class="icon-btn" data-del-login="${l.id}" title="Delete">${svg("trash")}</button>
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>`;
    }).join("");
  }

  // ── Payments view ────────────────────────────────────────────────────────
  function viewCards() {
    const items = state.data.cards;
    if (!items.length) return emptyState("card", "No payment methods", "Add a card for frictionless checkouts.");
    return `
      <div class="cards-grid">
        ${items.map(c => renderPayCard(c)).join("")}
      </div>
      <div class="panel" style="margin-top:14px;">
        <div class="ph" style="flex-wrap:wrap;gap:10px;">
          <div class="row gap-8" style="color:var(--text-3);font-size:13px;">
            ${svg("lock")} Card numbers are encrypted at rest with your vault key.
          </div>
          <div class="row gap-6" style="margin-left:auto;">
            <button class="btn btn-soft btn-sm" id="reveal-cards">Reveal numbers</button>
            <button class="btn btn-primary btn-sm" id="add-card">${svg("plus")} New card</button>
          </div>
        </div>
      </div>`;
  }

  function renderPayCard(c) {
    return `
      <div class="paycard ${c.theme}" data-card-id="${c.id}" tabindex="0">
        <div class="pc-brand">${escapeHtml(c.brand)}</div>
        <div class="pc-chip"></div>
        <div class="pc-contactless"><span></span><span></span><span></span></div>
        <div class="pc-number" data-card-num="${c.id}">${escapeHtml(mask(c.number))}</div>
        <div class="pc-meta">
          <div class="pc-holder">
            <div class="l">Cardholder</div>
            <div class="v">${escapeHtml(c.name)}</div>
          </div>
          <div class="pc-exp">
            <div class="l">Valid Thru</div>
            <div class="v">${escapeHtml(c.exp)}</div>
          </div>
          <div class="pc-exp" style="text-align:right;">
            <div class="l">CVV</div>
            <div class="v">•••</div>
          </div>
        </div>
        ${c.theme === "mc"
          ? `<div class="pc-logo"><span class="mc-l"></span><span class="mc-r"></span></div>`
          : `<div class="pc-logo">${c.theme === "visa" ? "VISA" : c.theme === "amex" ? "AMEX" : escapeHtml(c.brand).toUpperCase()}</div>`}
      </div>`;
  }

  // ── Subscriptions view ───────────────────────────────────────────────────
  function viewSubscriptions() {
    const subs  = state.data.subscriptions;
    const total = subs.reduce((s, x) => s + x.amount, 0);
    const soon  = subs.filter(s => (s.nextDate - Date.now()) < 86400000 * 7).length;

    const cats = {};
    subs.forEach(s => { (cats[s.category] = cats[s.category] || []).push(s); });
    const catList = Object.entries(cats)
      .map(([name, v]) => ({ name, total: v.reduce((a, x) => a + x.amount, 0) }))
      .sort((a, b) => b.total - a.total);

    return `
      <div class="sub-summary">
        <div class="sub-total-card" style="background:linear-gradient(135deg,var(--navy-700),var(--navy-500));color:#fff;border:none;">
          <div class="t" style="color:rgba(255,255,255,.7);">Monthly spend</div>
          <div class="a">$${total.toFixed(2)}</div>
          <div class="s" style="color:rgba(255,255,255,.65);">${subs.length} active subscriptions</div>
        </div>
        <div class="sub-total-card" style="background:color-mix(in oklab,var(--yel) 10%,var(--surface));border-color:color-mix(in oklab,var(--yel) 25%,transparent);">
          <div class="t">Renewing soon</div>
          <div class="a" style="color:var(--yel-dk);">${soon}</div>
          <div class="s">within 7 days</div>
        </div>
        <div class="sub-total-card" style="background:var(--surface);">
          <div class="t">Annual projection</div>
          <div class="a">$${(total * 12).toFixed(0)}</div>
          <div class="s">estimated per year</div>
        </div>
      </div>

      <div class="panel" style="margin-top:14px;">
        <div class="ph">
          <h3>Active subscriptions</h3>
          <div class="row gap-6">
            <button class="btn btn-ghost btn-sm" id="upload-stmt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import statement
            </button>
            <button class="btn btn-soft btn-sm" id="add-sub-btn">${svg("plus")} Add</button>
          </div>
        </div>
        <div class="body">
          ${[...subs].sort((a, b) => b.amount - a.amount).map(s => {
            const days = Math.ceil((s.nextDate - Date.now()) / 86400000);
            return `
            <div class="sub-row">
              ${logoSpan(subDomain(s), s.icon, s.color, "sr-ico")}
              <div class="flex-1">
                <div class="sr-name">${escapeHtml(s.name)}</div>
                <div class="sr-next">${escapeHtml(s.category)} · ${days > 0 ? `due in ${days}d` : "due today"}</div>
              </div>
              <div class="sr-amt${days <= 3 ? " exp" : ""}">$${s.amount.toFixed(2)}<span style="font-size:10px;color:var(--text-3);font-weight:400;">/mo</span></div>
              <div class="sr-actions">
                <button class="btn btn-soft btn-xs" data-manage-sub="${s.id}">Manage</button>
                <button class="btn btn-danger btn-xs" data-cancel-sub="${s.id}">Cancel</button>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>

      <div class="panel" style="margin-top:14px;">
        <div class="ph"><h3>Spend by category</h3></div>
        <div style="padding:16px;display:grid;gap:12px;">
          ${catList.map(c => {
            const pct = Math.round((c.total / total) * 100);
            return `<div>
              <div class="row" style="justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:13px;font-weight:600;">${escapeHtml(c.name)}</span>
                <span style="font-size:13px;color:var(--text-2);">$${c.total.toFixed(2)}/mo <span style="color:var(--text-3);">· ${pct}%</span></span>
              </div>
              <div class="cat-bar"><span style="flex:${pct};background:linear-gradient(90deg,var(--primary),var(--pur));"></span><span style="flex:${100 - pct};"></span></div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  // ── Service Catalog view ─────────────────────────────────────────────────
  function viewCatalog() {
    const services = window.SERVICES || [];
    if (!services.length) return emptyState("grid", "Service catalog loading…", "Make sure services.js is loaded.");
    const q = state.query.trim().toLowerCase();
    const cats = window.SERVICE_CATEGORIES || [...new Set(services.map(s => s.category))].sort();

    return `
      <div class="panel">
        <div class="ph">
          <h3>Service Catalog</h3>
          <span class="muted" style="font-size:13px;">${services.length} pre-configured services · click to quick-add</span>
        </div>
        ${cats.map(cat => {
          const items = services.filter(s => s.category === cat && (!q || s.name.toLowerCase().includes(q)));
          if (!items.length) return "";
          return `<div style="padding:12px 12px 0;">
            <div class="sb-section" style="padding:0 0 8px;">${escapeHtml(cat)}</div>
            <div class="catalog-grid">
              ${items.map(s => `
                <div class="catalog-item" data-add-service="${s.id}" title="Quick-add ${s.name} login">
                  ${logoSpan(s.url, s.initials, s.color, "ci-ico", `box-shadow:0 2px 8px -2px ${escapeHtml(s.color)}60;`)}
                  <div class="ci-name">${escapeHtml(s.name)}</div>
                  <div class="ci-cat">${escapeHtml(s.category)}</div>
                </div>`).join("")}
            </div>
          </div>`;
        }).join("")}
        <div style="height:16px;"></div>
      </div>`;
  }

  // ── Generator view ──────────────────────────────────────────────────────
  function viewGenerator() {
    return `
      <div class="panel">
        <div class="ph"><h3>Password generator</h3><span class="muted" style="font-size:13px;">Cryptographically random</span></div>
        <div style="padding:20px;display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start;">
          <div style="display:grid;gap:14px;">
            <div class="gen-out" id="gen-out"></div>
            <div class="row" style="justify-content:center;">
              <button class="btn btn-primary" id="gen-copy">${svg("copy")} Copy</button>
              <button class="btn btn-ghost" id="gen-again">↻ Regenerate</button>
            </div>
            <div class="meter"><span id="gen-bar"></span></div>
            <div class="row" style="justify-content:center;">
              <span id="gen-lbl" class="pill green"><span class="dot"></span>Strong</span>
              <span id="gen-bits" class="muted" style="font-size:13px;"></span>
            </div>
          </div>
          <div class="card card-pad" style="display:grid;gap:12px;align-content:start;">
            <label class="label">Length: <span id="gen-len-val">20</span></label>
            <input type="range" id="gen-len" min="8" max="64" value="20" style="width:100%;">
            <label class="row" style="gap:8px;font-size:13.5px;"><input type="checkbox" id="gen-lower" checked> Lowercase (a-z)</label>
            <label class="row" style="gap:8px;font-size:13.5px;"><input type="checkbox" id="gen-upper" checked> Uppercase (A-Z)</label>
            <label class="row" style="gap:8px;font-size:13.5px;"><input type="checkbox" id="gen-digit" checked> Digits (0-9)</label>
            <label class="row" style="gap:8px;font-size:13.5px;"><input type="checkbox" id="gen-symbol" checked> Symbols (!@#)</label>
          </div>
        </div>
      </div>`;
  }

  // ── Security view ────────────────────────────────────────────────────────
  function viewSecurity() {
    const weak   = state.data.logins.filter(l => Crypto.entropyBits(l.password) < 50);
    const old    = state.data.logins.filter(l => (Date.now() - l.updated) > 1000 * 60 * 60 * 24 * 60);
    const reused = findReused(state.data.logins);
    return `
      <div class="panel">
        <div class="ph"><h3>Security dashboard</h3><span class="muted" style="font-size:13px;">Live analysis</span></div>
        <div style="padding:16px;display:grid;gap:14px;">
          ${secBlock("danger", "Weak passwords",   weak,   "Low-entropy passwords are easy to crack. Rotate these first.")}
          ${secBlock("warn",   "Stale passwords",  old,    "Unchanged 60+ days. Rotate high-value accounts regularly.")}
          ${secBlock("danger", "Reused passwords", reused, "One breach compromises all accounts sharing this password.")}
        </div>
      </div>`;
  }

  function secBlock(kind, title, items, hint) {
    if (!items.length) return `<div class="sec-alert ok"><div class="row gap-8"><span class="pill green"><span class="dot"></span>Clear</span><strong>${title}</strong></div><span class="muted" style="font-size:13px;">${hint.split(".")[0]} — all good.</span></div>`;
    return `<div class="sec-alert ${kind}">
      <div class="row" style="justify-content:space-between;">
        <div class="row gap-8"><span class="pill ${kind === "danger" ? "red" : "yellow"}"><span class="dot"></span>${items.length}</span><strong>${title}</strong></div>
        <span class="muted" style="font-size:12px;max-width:40ch;text-align:right;">${hint}</span>
      </div>
      <div style="display:grid;gap:4px;">
        ${items.map(l => `
          <div class="vault-row">
            ${logoSpan(l.url, l.fav, l.color, "favi")}
            <div class="flex-1"><div class="vr-t">${escapeHtml(l.name)}</div><div class="vr-u">${escapeHtml(l.url)}</div></div>
            <div class="vr-pw">${Crypto.entropyBits(l.password)} bits · ${fmtDate(l.updated)}</div>
            <div></div>
            <button class="btn btn-soft btn-sm" data-edit-login="${l.id}">Fix →</button>
          </div>`).join("")}
      </div>
    </div>`;
  }

  // ── Notes view ───────────────────────────────────────────────────────────
  function viewNotes() {
    const items = state.data.notes;
    if (!items.length) return emptyState("note", "No secure notes", "Store Wi-Fi keys, recovery codes, and anything else you want encrypted.");
    return `
      <div class="panel">
        <div class="ph"><h3>Secure notes</h3></div>
        <div style="padding:8px;display:grid;gap:8px;">
          ${items.map(n => `
            <div class="card card-pad" style="display:grid;gap:6px;">
              <div class="row" style="justify-content:space-between;">
                <strong style="font-size:14px;">${escapeHtml(n.title)}</strong>
                <div class="row gap-4">
                  <span class="muted" style="font-size:12px;">${fmtDate(n.updated)}</span>
                  <button class="icon-btn" data-edit-note="${n.id}">${svg("edit")}</button>
                  <button class="icon-btn" data-del-note="${n.id}">${svg("trash")}</button>
                </div>
              </div>
              <div class="mono" style="font-size:13px;color:var(--text-2);white-space:pre-wrap;">${escapeHtml(n.content)}</div>
            </div>`).join("")}
        </div>
      </div>`;
  }

  // ── Bind view events ─────────────────────────────────────────────────────
  function bindViewEvents() {
    // client view
    document.getElementById("add-client-card")?.addEventListener("click", openClientModal);
    document.querySelectorAll("[data-view-client]").forEach(b => {
      b.addEventListener("click", e => {
        e.stopPropagation();
        state.selectedClientId = b.dataset.viewClient;
        state.view = "logins";
        render();
      });
    });
    document.querySelectorAll("[data-edit-client]").forEach(b => {
      b.addEventListener("click", e => {
        e.stopPropagation();
        openClientModal(state.data.clients.find(c => c.id === b.dataset.editClient));
      });
    });
    document.querySelectorAll("[data-client-id]").forEach(c => {
      c.addEventListener("click", () => {
        state.selectedClientId = c.dataset.clientId;
        state.view = "logins";
        render();
      });
    });

    // logins
    document.querySelectorAll("[data-edit-login]").forEach(b => {
      b.addEventListener("click", e => { e.stopPropagation(); openItemModal(findLogin(b.dataset.editLogin)); });
    });
    document.querySelectorAll("[data-del-login]").forEach(b => {
      b.addEventListener("click", async e => {
        e.stopPropagation();
        const l = findLogin(b.dataset.delLogin);
        if (!l || !confirm(`Delete ${l.name}?`)) return;
        state.data.logins = state.data.logins.filter(x => x.id !== l.id);
        await persist(); toast("Deleted", "ok"); renderView();
      });
    });
    document.querySelectorAll("[data-copy-user]").forEach(b => {
      b.addEventListener("click", async e => { e.stopPropagation(); const l = findLogin(b.dataset.copyUser); await copyText(l.username); toast("Username copied", "ok"); });
    });
    document.querySelectorAll("[data-copy-pw]").forEach(b => {
      b.addEventListener("click", async e => {
        e.stopPropagation();
        const l = findLogin(b.dataset.copyPw);
        await copyText(l.password);
        toast("Password copied · clears in 20s", "ok");
        setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), 20000);
      });
    });
    document.querySelectorAll("[data-login-id]").forEach(row => {
      row.addEventListener("click", () => openItemModal(findLogin(row.dataset.loginId)));
    });

    // cards
    document.getElementById("reveal-cards")?.addEventListener("click", () => {
      document.querySelectorAll(".paycard").forEach(pc => {
        const c = state.data.cards.find(x => x.id === pc.dataset.cardId);
        const el = pc.querySelector("[data-card-num]");
        if (c && el) { el.textContent = c.number; setTimeout(() => { el.textContent = mask(c.number); }, 8000); }
      });
      toast("Numbers revealed for 8 seconds", "ok");
    });
    document.getElementById("add-card")?.addEventListener("click", openCardModal);

    // subscriptions
    document.getElementById("add-sub-btn")?.addEventListener("click", openSubscriptionModal);
    document.getElementById("upload-stmt")?.addEventListener("click", () => toast("Statement import coming soon", "warn"));
    document.querySelectorAll("[data-manage-sub]").forEach(b => {
      b.addEventListener("click", e => {
        e.stopPropagation();
        const s = state.data.subscriptions.find(x => x.id === b.dataset.manageSub);
        const svc = window.SERVICES ? window.SERVICES.find(x => x.name === s.name) : null;
        if (svc && svc.manageUrl) { window.open(svc.manageUrl, "_blank"); }
        else toast("Open the service's billing page to manage", "warn");
      });
    });
    document.querySelectorAll("[data-cancel-sub]").forEach(b => {
      b.addEventListener("click", async e => {
        e.stopPropagation();
        const s = state.data.subscriptions.find(x => x.id === b.dataset.cancelSub);
        if (!s || !confirm(`Remove ${s.name} from tracking?`)) return;
        state.data.subscriptions = state.data.subscriptions.filter(x => x.id !== s.id);
        await persist(); toast("Removed from tracking", "ok"); renderView();
      });
    });

    // catalog
    document.querySelectorAll("[data-add-service]").forEach(b => {
      b.addEventListener("click", () => {
        const svc = window.getService ? window.getService(b.dataset.addService) : null;
        if (!svc) return;
        openItemModal(null, { name: svc.name, url: svc.url, fav: svc.initials.slice(0, 1), color: svc.color });
      });
    });

    // notes
    document.querySelectorAll("[data-edit-note]").forEach(b => {
      b.addEventListener("click", e => { e.stopPropagation(); openNoteModal(state.data.notes.find(n => n.id === b.dataset.editNote)); });
    });
    document.querySelectorAll("[data-del-note]").forEach(b => {
      b.addEventListener("click", async e => {
        e.stopPropagation();
        if (!confirm("Delete this note?")) return;
        state.data.notes = state.data.notes.filter(n => n.id !== b.dataset.delNote);
        await persist(); toast("Deleted", "ok"); renderView();
      });
    });

    // generator
    if (state.view === "generator") bindGenerator();
  }

  // ── Generator ────────────────────────────────────────────────────────────
  function bindGenerator() {
    const len  = document.getElementById("gen-len");
    const lenV = document.getElementById("gen-len-val");
    const out  = document.getElementById("gen-out");
    const bar  = document.getElementById("gen-bar");
    const lbl  = document.getElementById("gen-lbl");
    const bits = document.getElementById("gen-bits");

    function regen() {
      const pw = Crypto.generate(Number(len.value), {
        lower:  document.getElementById("gen-lower").checked,
        upper:  document.getElementById("gen-upper").checked,
        digit:  document.getElementById("gen-digit").checked,
        symbol: document.getElementById("gen-symbol").checked,
      });
      out.textContent = pw || "— pick at least one character set —";
      const s = Crypto.strength(pw);
      bar.style.width = Math.min(100, s.pct) + "%";
      bar.style.background = s.class === "red" ? "var(--red)" : s.class === "yellow" ? "var(--yel)" : "var(--grn)";
      lbl.className = `pill ${s.class}`;
      lbl.innerHTML = `<span class="dot"></span>${s.label}`;
      bits.textContent = Crypto.entropyBits(pw) + " bits";
    }

    ["gen-lower","gen-upper","gen-digit","gen-symbol"].forEach(id => document.getElementById(id)?.addEventListener("change", regen));
    len.addEventListener("input", () => { lenV.textContent = len.value; regen(); });
    document.getElementById("gen-again")?.addEventListener("click", regen);
    document.getElementById("gen-copy")?.addEventListener("click", async () => {
      await copyText(out.textContent);
      toast("Copied · clears in 20s", "ok");
      setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), 20000);
    });
    regen();
  }

  // ── Modals ───────────────────────────────────────────────────────────────
  function openItemModal(login, defaults) {
    const editing = !!login;
    const l = login || {
      id: "l" + Date.now(),
      clientId: state.selectedClientId || null,
      name: defaults?.name || "", url: defaults?.url || "",
      username: "", password: "",
      fav: defaults?.fav || "?", color: defaults?.color || "#1e3a8a",
      updated: Date.now(),
    };

    const clientOpts = [
      `<option value="">— Personal —</option>`,
      ...state.data.clients.map(c => `<option value="${c.id}" ${l.clientId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`),
    ].join("");

    openModal({
      title: editing ? "Edit login" : "New login",
      body: `
        <div class="row gap-8">
          <div style="flex:1"><label class="label">Name</label><input class="input" id="f-name" value="${escapeHtml(l.name)}" /></div>
          <div style="flex:1"><label class="label">URL</label><input class="input" id="f-url" value="${escapeHtml(l.url)}" /></div>
        </div>
        <div><label class="label">Assign to client</label><select class="input select" id="f-client">${clientOpts}</select></div>
        <div><label class="label">Username / email</label><input class="input" id="f-user" value="${escapeHtml(l.username)}" /></div>
        <label class="label">Password</label>
        <div class="row gap-8">
          <input class="input" id="f-pw" type="text" value="${escapeHtml(l.password)}" style="font-family:var(--mono);flex:1;" />
          <button class="btn btn-soft" id="f-gen" title="Generate">${svg("wand")}</button>
        </div>
        <div class="meter"><span id="f-bar"></span></div>
        <div id="f-lbl" style="font-size:13px;"></div>`,
      footer: `
        ${editing ? `<button class="btn btn-danger btn-sm" id="f-del">Delete</button>` : ""}
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-modal-close>Cancel</button>
        <button class="btn btn-primary" id="f-save">${editing ? "Save" : "Create"}</button>`,
      onMount: () => {
        const bar = document.getElementById("f-bar");
        const lbl = document.getElementById("f-lbl");
        const pw  = document.getElementById("f-pw");
        function refresh() {
          const s = Crypto.strength(pw.value);
          bar.style.width = s.pct + "%";
          bar.style.background = s.class === "red" ? "var(--red)" : s.class === "yellow" ? "var(--yel)" : "var(--grn)";
          lbl.innerHTML = `<span class="pill ${s.class}"><span class="dot"></span>${s.label}</span> · ${Crypto.entropyBits(pw.value)} bits`;
        }
        pw.addEventListener("input", refresh); refresh();
        document.getElementById("f-gen").addEventListener("click", () => { pw.value = Crypto.generate(20); refresh(); });
        document.getElementById("f-save").addEventListener("click", async () => {
          const name = document.getElementById("f-name").value.trim();
          if (!name) return toast("Name is required", "err");
          const next = { ...l, name, url: document.getElementById("f-url").value.trim(),
            username: document.getElementById("f-user").value.trim(),
            clientId: document.getElementById("f-client").value || null,
            password: pw.value, updated: Date.now(),
            fav: (name[0] || "?").toUpperCase(),
          };
          if (editing) state.data.logins[state.data.logins.findIndex(x => x.id === l.id)] = next;
          else         state.data.logins.unshift(next);
          await persist(); closeModal(); toast(editing ? "Updated" : "Saved", "ok"); render();
        });
        document.getElementById("f-del")?.addEventListener("click", async () => {
          if (!confirm(`Delete ${l.name}?`)) return;
          state.data.logins = state.data.logins.filter(x => x.id !== l.id);
          await persist(); closeModal(); toast("Deleted", "ok"); render();
        });
      },
    });
  }

  function openCardModal(card) {
    const editing = !!card;
    const c = card || { id: "c" + Date.now(), brand: "Visa", name: "", number: "", exp: "", cvv: "", theme: "visa" };
    openModal({
      title: editing ? "Edit card" : "New payment method",
      body: `
        <div class="row gap-8">
          <div style="flex:1"><label class="label">Brand</label>
            <select class="input select" id="cf-brand">
              <option value="visa" ${c.theme === "visa" ? "selected" : ""}>Visa</option>
              <option value="mc" ${c.theme === "mc" ? "selected" : ""}>Mastercard</option>
              <option value="amex" ${c.theme === "amex" ? "selected" : ""}>Amex</option>
              <option value="discover" ${c.theme === "discover" ? "selected" : ""}>Discover</option>
            </select>
          </div>
          <div style="flex:2"><label class="label">Cardholder name</label><input class="input" id="cf-name" value="${escapeHtml(c.name)}" /></div>
        </div>
        <div><label class="label">Card number</label><input class="input" id="cf-num" value="${escapeHtml(c.number)}" placeholder="1234 5678 9012 3456" style="font-family:var(--mono);" /></div>
        <div class="row gap-8">
          <div style="flex:1"><label class="label">Expiry (MM/YY)</label><input class="input" id="cf-exp" value="${escapeHtml(c.exp)}" placeholder="08/29" /></div>
          <div style="flex:1"><label class="label">CVV</label><input class="input" id="cf-cvv" value="${escapeHtml(c.cvv)}" placeholder="•••" /></div>
        </div>`,
      footer: `${editing ? `<button class="btn btn-danger btn-sm" id="cf-del">Delete</button>` : ""}<div style="flex:1"></div><button class="btn btn-ghost" data-modal-close>Cancel</button><button class="btn btn-primary" id="cf-save">${editing ? "Save" : "Save card"}</button>`,
      onMount: () => {
        document.getElementById("cf-save").addEventListener("click", async () => {
          const brand = document.getElementById("cf-brand").value;
          const next = { ...c, theme: brand,
            brand: { visa: "Visa", mc: "Mastercard", amex: "Amex", discover: "Discover" }[brand] || brand,
            name:   document.getElementById("cf-name").value.trim(),
            number: document.getElementById("cf-num").value.trim(),
            exp:    document.getElementById("cf-exp").value.trim(),
            cvv:    document.getElementById("cf-cvv").value.trim(),
          };
          if (!next.name || !next.number) return toast("Fill cardholder + number", "err");
          if (editing) state.data.cards[state.data.cards.findIndex(x => x.id === c.id)] = next;
          else         state.data.cards.unshift(next);
          await persist(); closeModal(); toast(editing ? "Updated" : "Card saved", "ok"); render();
        });
        document.getElementById("cf-del")?.addEventListener("click", async () => {
          if (!confirm("Delete this card?")) return;
          state.data.cards = state.data.cards.filter(x => x.id !== c.id);
          await persist(); closeModal(); toast("Deleted", "ok"); render();
        });
      },
    });
  }

  function openClientModal(client) {
    const editing = !!client;
    const c = client || { id: "cl" + Date.now(), name: "", url: "", color: "#1e3a8a", initials: "", status: "active", plan: "" };
    openModal({
      title: editing ? "Edit client" : "New client",
      body: `
        <div class="row gap-8">
          <div style="flex:2"><label class="label">Client name</label><input class="input" id="cc-name" value="${escapeHtml(c.name)}" placeholder="Acme Corp" /></div>
          <div style="flex:1"><label class="label">Initials</label><input class="input" id="cc-initials" value="${escapeHtml(c.initials)}" maxlength="3" placeholder="AC" /></div>
        </div>
        <div><label class="label">Website URL</label><input class="input" id="cc-url" value="${escapeHtml(c.url)}" placeholder="acmecorp.com" /></div>
        <div class="row gap-8">
          <div style="flex:1"><label class="label">Status</label>
            <select class="input select" id="cc-status">
              <option value="active" ${c.status === "active" ? "selected" : ""}>Active</option>
              <option value="prospect" ${c.status === "prospect" ? "selected" : ""}>Prospect</option>
              <option value="inactive" ${c.status === "inactive" ? "selected" : ""}>Inactive</option>
            </select>
          </div>
          <div style="flex:1"><label class="label">Plan / tier</label><input class="input" id="cc-plan" value="${escapeHtml(c.plan || "")}" placeholder="Pro, Business…" /></div>
        </div>
        <div><label class="label">Brand color</label><input type="color" class="input" id="cc-color" value="${escapeHtml(c.color)}" style="height:44px;padding:4px;" /></div>`,
      footer: `${editing ? `<button class="btn btn-danger btn-sm" id="cc-del">Delete</button>` : ""}<div style="flex:1"></div><button class="btn btn-ghost" data-modal-close>Cancel</button><button class="btn btn-primary" id="cc-save">${editing ? "Save" : "Add client"}</button>`,
      onMount: () => {
        document.getElementById("cc-save").addEventListener("click", async () => {
          const name = document.getElementById("cc-name").value.trim();
          if (!name) return toast("Name is required", "err");
          const next = { ...c, name,
            url:      document.getElementById("cc-url").value.trim(),
            initials: (document.getElementById("cc-initials").value.trim() || name.slice(0, 2)).toUpperCase(),
            color:    document.getElementById("cc-color").value,
            status:   document.getElementById("cc-status").value,
            plan:     document.getElementById("cc-plan").value.trim() || null,
          };
          if (editing) state.data.clients[state.data.clients.findIndex(x => x.id === c.id)] = next;
          else         state.data.clients.unshift(next);
          await persist(); closeModal(); toast(editing ? "Updated" : "Client added", "ok"); render();
        });
        document.getElementById("cc-del")?.addEventListener("click", async () => {
          if (!confirm(`Delete ${c.name} and all their credentials?`)) return;
          state.data.clients = state.data.clients.filter(x => x.id !== c.id);
          state.data.logins  = state.data.logins.filter(l => l.clientId !== c.id);
          await persist(); closeModal(); toast("Client deleted", "ok"); render();
        });
      },
    });
  }

  function openSubscriptionModal() {
    openModal({
      title: "Add subscription",
      body: `
        <div class="row gap-8">
          <div style="flex:2"><label class="label">Service name</label><input class="input" id="sf-name" placeholder="Netflix, Figma…" /></div>
          <div style="flex:1"><label class="label">Monthly cost ($)</label><input class="input" id="sf-amt" type="number" step="0.01" min="0" placeholder="14.99" /></div>
        </div>
        <div class="row gap-8">
          <div style="flex:1"><label class="label">Category</label><input class="input" id="sf-cat" placeholder="Design, Hosting…" /></div>
          <div style="flex:1"><label class="label">Next renewal</label><input class="input" id="sf-date" type="date" /></div>
        </div>`,
      footer: `<div style="flex:1"></div><button class="btn btn-ghost" data-modal-close>Cancel</button><button class="btn btn-primary" id="sf-save">Add</button>`,
      onMount: () => {
        document.getElementById("sf-date").value = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
        document.getElementById("sf-save").addEventListener("click", async () => {
          const name = document.getElementById("sf-name").value.trim();
          const amt  = parseFloat(document.getElementById("sf-amt").value);
          if (!name || isNaN(amt)) return toast("Fill name and amount", "err");
          const svc = window.SERVICES ? window.SERVICES.find(s => s.name.toLowerCase().includes(name.toLowerCase())) : null;
          state.data.subscriptions.unshift({
            id: "s" + Date.now(), name,
            amount: amt, cycle: "monthly",
            nextDate: new Date(document.getElementById("sf-date").value).getTime(),
            color: svc?.color || "#1e3a8a",
            icon:  svc?.initials?.slice(0, 2) || name.slice(0, 2).toUpperCase(),
            category: document.getElementById("sf-cat").value.trim() || svc?.category || "Other",
          });
          await persist(); closeModal(); toast("Subscription added", "ok"); render();
        });
      },
    });
  }

  function openNoteModal(note) {
    const editing = !!note;
    const n = note || { id: "n" + Date.now(), title: "", content: "", updated: Date.now() };
    openModal({
      title: editing ? "Edit note" : "New secure note",
      body: `
        <div><label class="label">Title</label><input class="input" id="nf-title" value="${escapeHtml(n.title)}" placeholder="Wi-Fi password, API key…" /></div>
        <div><label class="label">Content</label><textarea class="input" id="nf-content" style="height:120px;padding:11px 13px;resize:vertical;">${escapeHtml(n.content)}</textarea></div>`,
      footer: `${editing ? `<button class="btn btn-danger btn-sm" id="nf-del">Delete</button>` : ""}<div style="flex:1"></div><button class="btn btn-ghost" data-modal-close>Cancel</button><button class="btn btn-primary" id="nf-save">${editing ? "Save" : "Create"}</button>`,
      onMount: () => {
        document.getElementById("nf-save").addEventListener("click", async () => {
          const title = document.getElementById("nf-title").value.trim();
          if (!title) return toast("Title is required", "err");
          const next = { ...n, title, content: document.getElementById("nf-content").value, updated: Date.now() };
          if (editing) state.data.notes[state.data.notes.findIndex(x => x.id === n.id)] = next;
          else         state.data.notes.unshift(next);
          await persist(); closeModal(); toast(editing ? "Updated" : "Saved", "ok"); render();
        });
        document.getElementById("nf-del")?.addEventListener("click", async () => {
          if (!confirm("Delete this note?")) return;
          state.data.notes = state.data.notes.filter(x => x.id !== n.id);
          await persist(); closeModal(); toast("Deleted", "ok"); render();
        });
      },
    });
  }

  // ── Modal engine ─────────────────────────────────────────────────────────
  function openModal({ title, body, footer, onMount }) {
    let bd = document.getElementById("modal-backdrop");
    if (!bd) {
      bd = document.createElement("div");
      bd.id = "modal-backdrop";
      bd.className = "modal-backdrop";
      document.body.appendChild(bd);
    }
    bd.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="mh">
          <strong>${title}</strong>
          <button class="icon-btn" data-modal-close aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>
        <div class="mb">${body}</div>
        <div class="mf">${footer || ""}</div>
      </div>`;
    bd.classList.add("open");
    bd.querySelectorAll("[data-modal-close]").forEach(b => b.addEventListener("click", closeModal));
    bd.addEventListener("click", e => { if (e.target === bd) closeModal(); });
    if (onMount) onMount();
  }
  function closeModal() { document.getElementById("modal-backdrop")?.classList.remove("open"); }
  window.closeModal = closeModal;

  // ── Util ─────────────────────────────────────────────────────────────────
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
  }

  function findLogin(id) { return state.data.logins.find(l => l.id === id); }

  function mask(num) {
    const c = (num || "").replace(/\s+/g, "");
    return "•••• •••• •••• " + c.slice(-4);
  }

  function darken(hex) {
    try {
      const n = parseInt(hex.replace("#", ""), 16);
      const r = Math.max(0, (n >> 16 & 0xff) - 40);
      const g = Math.max(0, (n >> 8  & 0xff) - 40);
      const b = Math.max(0, (n       & 0xff) - 40);
      return `#${[r,g,b].map(x => x.toString(16).padStart(2,"0")).join("")}`;
    } catch { return hex; }
  }

  function escapeHtml(s) {
    return (s ?? "").toString().replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  }

  function cleanDomain(url) {
    if (!url) return "";
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }

  // Returns an element that shows a real logo with colored-initial fallback.
  // Primary: Google high-res favicon API. Backup: Clearbit. Final: colored initial.
  // extraStyle is applied only in the no-domain (initials only) case.
  function logoSpan(domain, initial, color, cls, extraStyle) {
    const host = cleanDomain(domain);
    if (!host) {
      return `<span class="${cls}" style="background:${escapeHtml(color)};${extraStyle || ""}">${escapeHtml(initial)}</span>`;
    }
    const primary = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${escapeHtml(host)}&size=128`;
    const backup = `https://logo.clearbit.com/${escapeHtml(host)}`;
    return `<span class="${cls}" style="background:var(--surface-2);border:1px solid var(--border);" data-fallback="${escapeHtml(initial)}" data-fbcolor="${escapeHtml(color)}" data-backup="${backup}"><img class="logo-img" src="${primary}" alt="${escapeHtml(initial)}" loading="lazy" /></span>`;
  }

  // Match a subscription name to a known service domain
  function subDomain(s) {
    const svc = window.SERVICES ? window.SERVICES.find(x => x.name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(x.name.toLowerCase().split(" ")[0])) : null;
    return svc ? svc.url : "";
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function emptyState(icon, title, sub) {
    return `<div class="empty-state"><div class="e-ico">${svg(icon)}</div><h3>${title}</h3><p>${sub}</p></div>`;
  }

  function findReused(logins) {
    const byPw = {};
    logins.forEach(l => { (byPw[l.password] = byPw[l.password] || []).push(l); });
    return Object.values(byPw).filter(a => a.length > 1).flat();
  }

  // ── Render entry ─────────────────────────────────────────────────────────
  async function render() {
    if (!state.unlocked) {
      renderLock(!loadVault());
    } else {
      renderApp();
    }
    if (window.BRAND_MARK) {
      document.querySelectorAll("[data-mark]").forEach(el => {
        if (!el.querySelector("svg")) el.innerHTML = window.BRAND_MARK + el.innerHTML;
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();

  // Logo fallback: primary fails → try Clearbit backup → then colored initial
  document.addEventListener("error", e => {
    if (!e.target.classList.contains("logo-img")) return;
    const img = e.target;
    const p = img.parentElement;
    if (!p) return;
    const backup = p.dataset.backup;
    if (backup && !img.dataset.triedBackup) {
      img.dataset.triedBackup = "1";
      img.src = backup;
      return;
    }
    p.textContent = p.dataset.fallback || "?";
    p.style.background = p.dataset.fbcolor || "var(--primary)";
    p.style.color = "#fff";
    p.style.border = "none";
    p.style.fontSize = "";
  }, true);
})();
