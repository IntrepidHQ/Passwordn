// Passwordn — Supabase cloud sync (optional layer over the local vault)
// Architecture: all vault data remains AES-256-GCM encrypted client-side.
// Supabase stores only { user_id, ciphertext, salt, iters, updated_at }.
// The master password never leaves the device.

(function () {
  const SUPABASE_URL = "https://xeaeiowwodppqhswotsx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ZUrMVOqjW8wClZQrq8D3-w_Y3JW8CwZ";

  // ── Low-level Supabase REST helpers ───────────────────────────────────────
  async function sbFetch(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${getToken() || SUPABASE_KEY}`,
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.msg || err.message || err.error_description || err.error_code || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  // ── Token store (session only — never persists) ──────────────────────────
  let _token = null;
  function getToken() { return _token; }
  function setToken(t) {
    _token = t;
    try {
      if (t) sessionStorage.setItem("passwordn:cloud_token", t);
      else   sessionStorage.removeItem("passwordn:cloud_token");
    } catch { /* private mode */ }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function signUp(email, password) {
    const data = await sbFetch("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data?.access_token) { setToken(data.access_token); return { ...data, status: "authed" }; }
    // Email confirmation required: user exists but no session until the link is clicked
    return { ...data, status: "confirm_email" };
  }

  async function signIn(email, password) {
    const data = await sbFetch("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data?.access_token) setToken(data.access_token);
    return data;
  }

  async function signOut() {
    try { await sbFetch("/auth/v1/logout", { method: "POST" }); } catch { /* ignore */ }
    setToken(null);
  }

  async function getUser() {
    if (!_token) return null;
    return sbFetch("/auth/v1/user");
  }

  // ── Vault sync ───────────────────────────────────────────────────────────
  // Table: passwordn_vaults (user_id uuid pk, blob text, salt text, iters int, updated_at timestamptz)
  // Enable Row Level Security in Supabase: policy WHERE auth.uid() = user_id

  async function pushVault(vaultJson) {
    if (!_token) throw new Error("Not authenticated");
    const user = await getUser();
    // Store the FULL encrypted vault envelope (auth check + blob + salt) as text.
    // Everything inside is ciphertext or public KDF params - zero-knowledge holds.
    const payload = {
      user_id: user.id,
      blob:    JSON.stringify(vaultJson),
      salt:    vaultJson.salt,
      iters:   vaultJson.iters,
      updated_at: new Date().toISOString(),
    };
    // Upsert so first push creates the row, subsequent ones update
    return sbFetch("/rest/v1/passwordn_vaults?on_conflict=user_id", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(payload),
    });
  }

  async function pullVault() {
    if (!_token) throw new Error("Not authenticated");
    const rows = await sbFetch("/rest/v1/passwordn_vaults?select=*&limit=1", {
      headers: { "Prefer": "return=representation" },
    });
    return (rows && rows.length) ? rows[0] : null;
  }

  // ── Sync logic: merge local vs remote by latest timestamp ─────────────────
  // Local vault is sourced from localStorage ("passwordn:vault").
  // Cloud vault is the encrypted blob from Supabase.
  // We always take the one with the later updatedAt timestamp.

  async function syncVault() {
    if (!_token) return { status: "offline" };
    const localRaw = localStorage.getItem("passwordn:vault");
    const local = localRaw ? JSON.parse(localRaw) : null;
    const row = await pullVault();
    let remote = null;
    if (row?.blob) {
      try { remote = JSON.parse(row.blob); } catch { remote = null; }
    }

    if (!local && !remote) return { status: "empty" };
    if (!local && remote) {
      // First run on this device — adopt the cloud envelope wholesale
      localStorage.setItem("passwordn:vault", JSON.stringify(remote));
      return { status: "pulled" };
    }
    if (local && !remote) {
      await pushVault(local);
      return { status: "pushed" };
    }

    const localTs  = local.updatedAt || local.createdAt || 0;
    const remoteTs = remote.updatedAt || remote.createdAt || 0;

    if (remoteTs > localTs) {
      localStorage.setItem("passwordn:vault", JSON.stringify(remote));
      return { status: "pulled" };
    } else if (localTs > remoteTs) {
      await pushVault(local);
      return { status: "pushed" };
    }
    return { status: "in_sync" };
  }

  // ── Public surface ────────────────────────────────────────────────────────
  window.PasswordnCloud = {
    signUp,
    signIn,
    signOut,
    getUser,
    pushVault,
    pullVault,
    syncVault,
    isAuthed: () => !!_token,
  };

  // Auto-sync after page load if a session token exists in sessionStorage
  // (The auth flow stores it there after sign-in so the tab stays authenticated
  //  but the token is never persisted across sessions — zero-knowledge design.)
  const savedToken = sessionStorage.getItem("passwordn:cloud_token");
  if (savedToken) {
    setToken(savedToken);
    // Silently sync in the background — vault.js render is unaffected
    syncVault().then(r => {
      if (r.status === "pulled") {
        console.info("[Passwordn] Vault pulled from cloud — reload to apply.");
      }
    }).catch(() => { /* offline is fine */ });
  }
})();
