// Passwordn — Supabase cloud sync (optional layer over the local vault)
// Architecture: all vault data remains AES-256-GCM encrypted client-side.
// Supabase stores only { user_id, ciphertext, salt, iters, updated_at }.
// The master password never leaves the device.

(function () {
  const SUPABASE_URL = "https://cgpejrbibkyaaxmunfgs.supabase.co";
  const SUPABASE_KEY = "sb_publishable_oeNzyg9RV-6_ufTdx8ip8Q_7RFTUYUf";

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
      throw new Error(err.message || err.error_description || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  // ── Token store (session only — never persists) ──────────────────────────
  let _token = null;
  function getToken() { return _token; }
  function setToken(t) { _token = t; }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function signUp(email, password) {
    const data = await sbFetch("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data?.access_token) setToken(data.access_token);
    return data;
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
    const payload = {
      user_id: user.id,
      blob:    vaultJson.blob,
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
    const remote = await pullVault();

    if (!local && !remote)  return { status: "empty" };
    if (!local && remote)  {
      // First run on this device — pull from cloud
      localStorage.setItem("passwordn:vault", JSON.stringify(remote));
      return { status: "pulled" };
    }
    if (local && !remote) {
      // First cloud push
      await pushVault(local);
      return { status: "pushed" };
    }

    const localTs  = local.updatedAt  || local.createdAt  || 0;
    const remoteTs = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;

    if (remoteTs > localTs) {
      // Remote is newer — overwrite local (still encrypted, safe)
      const merged = { ...local, blob: remote.blob, salt: remote.salt, iters: remote.iters, updatedAt: remoteTs };
      localStorage.setItem("passwordn:vault", JSON.stringify(merged));
      return { status: "pulled" };
    } else {
      // Local is newer — push to cloud
      await pushVault(local);
      return { status: "pushed" };
    }
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
