// Passwordn — service worker
// Owns vault state (in memory + chrome.storage.session for the derived key),
// answers messages from popup/content, and broadcasts lock/unlock events.

const STORE_KEY = "pn.vault";
const SESSION_UNLOCKED = "pn.unlocked";

// --- crypto (same shape as the web app) ---
const enc = new TextEncoder();
const dec = new TextDecoder();
function toB64(buf) {
  const b = new Uint8Array(buf); let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function fromB64(s) {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function deriveKey(pw, salt, iters = 250000) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: iters, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
}
async function aesEncrypt(obj, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: toB64(iv), ct: toB64(ct) };
}
async function aesDecrypt({ iv, ct }, key) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, key, fromB64(ct));
  return JSON.parse(dec.decode(plain));
}

// --- vault state ---
let liveKey = null;       // CryptoKey, kept only in memory
let liveData = null;      // decrypted vault
let autolockTimer = null;

const DEFAULT_DATA = {
  logins: [
    { id: "g1", name: "GitHub", url: "github.com",  username: "hans@passwordn.app", password: "n7Q!8bcvK2p-w#mZ", updated: Date.now() },
    { id: "g2", name: "Slack",  url: "slack.com",   username: "hans@team.io",       password: "Yn7-pL3vB!qRt",    updated: Date.now() },
    { id: "g3", name: "Figma",  url: "figma.com",   username: "designer@co.io",     password: "h8bR2-Qp!mKeX",    updated: Date.now() },
  ],
  cards: [
    { id: "c1", brand: "Visa", name: "Hans Maier", number: "4242 4242 4242 4242", exp: "08/29", cvv: "123" },
  ],
  notes: [],
};

function scheduleAutolock() {
  if (autolockTimer) clearTimeout(autolockTimer);
  autolockTimer = setTimeout(lock, 10 * 60 * 1000); // 10 min
}

async function getVault() {
  const got = await chrome.storage.local.get(STORE_KEY);
  return got[STORE_KEY] || null;
}
async function setVault(v) { await chrome.storage.local.set({ [STORE_KEY]: v }); }

async function createVault(masterPassword) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(masterPassword, salt);
  const auth = await aesEncrypt({ _ok: true, ts: Date.now() }, key);
  const blob = await aesEncrypt(DEFAULT_DATA, key);
  const vault = { v: 1, salt: toB64(salt), iters: 250000, auth, blob, createdAt: Date.now() };
  await setVault(vault);
  liveKey = key; liveData = structuredClone(DEFAULT_DATA);
  await chrome.storage.session.set({ [SESSION_UNLOCKED]: true });
  scheduleAutolock();
}

async function unlock(masterPassword) {
  const vault = await getVault();
  if (!vault) throw new Error("no-vault");
  const key = await deriveKey(masterPassword, fromB64(vault.salt), vault.iters);
  await aesDecrypt(vault.auth, key); // will throw on wrong pw
  liveKey = key;
  liveData = await aesDecrypt(vault.blob, key);
  await chrome.storage.session.set({ [SESSION_UNLOCKED]: true });
  scheduleAutolock();
}

async function lock() {
  liveKey = null; liveData = null;
  await chrome.storage.session.remove(SESSION_UNLOCKED);
  if (autolockTimer) clearTimeout(autolockTimer);
  chrome.runtime.sendMessage({ type: "vault:locked" }).catch(() => {});
}

async function persist() {
  if (!liveKey || !liveData) return;
  const vault = await getVault();
  if (!vault) return;
  vault.blob = await aesEncrypt(liveData, liveKey);
  vault.updatedAt = Date.now();
  await setVault(vault);
}

function hostFromUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function matchLogins(host) {
  if (!liveData || !host) return [];
  return liveData.logins.filter(l => {
    const h = (l.url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return h && (host === h || host.endsWith("." + h) || h.endsWith("." + host));
  });
}

// --- messaging ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case "vault:status": {
          const vault = await getVault();
          sendResponse({
            exists: !!vault,
            unlocked: !!liveKey,
            counts: liveData ? { logins: liveData.logins.length, cards: liveData.cards.length, notes: liveData.notes.length } : null,
          });
          break;
        }
        case "vault:create": { await createVault(msg.masterPassword); sendResponse({ ok: true }); break; }
        case "vault:unlock": {
          try { await unlock(msg.masterPassword); sendResponse({ ok: true }); }
          catch { sendResponse({ ok: false, error: "Incorrect master password" }); }
          break;
        }
        case "vault:lock":   { await lock(); sendResponse({ ok: true }); break; }
        case "vault:list":   { sendResponse({ data: liveData || null }); break; }
        case "vault:match": {
          const host = msg.host || hostFromUrl(sender?.tab?.url || "");
          sendResponse({ host, logins: matchLogins(host).map(redact) });
          break;
        }
        case "vault:reveal": {
          const l = (liveData?.logins || []).find(x => x.id === msg.id);
          sendResponse({ login: l || null });
          break;
        }
        case "vault:addLogin": {
          if (!liveData) return sendResponse({ ok: false, error: "locked" });
          const id = "l" + Date.now();
          liveData.logins.unshift({ id, updated: Date.now(), ...msg.login });
          await persist();
          sendResponse({ ok: true, id });
          break;
        }
        case "vault:updateLogin": {
          if (!liveData) return sendResponse({ ok: false, error: "locked" });
          const i = liveData.logins.findIndex(x => x.id === msg.id);
          if (i >= 0) { liveData.logins[i] = { ...liveData.logins[i], ...msg.patch, updated: Date.now() }; await persist(); }
          sendResponse({ ok: true });
          break;
        }
        case "vault:deleteLogin": {
          if (!liveData) return sendResponse({ ok: false, error: "locked" });
          liveData.logins = liveData.logins.filter(x => x.id !== msg.id);
          await persist(); sendResponse({ ok: true }); break;
        }
        case "capture:offer": {
          if (!liveData) return sendResponse({ ok: false, error: "locked" });
          const host = hostFromUrl(sender?.tab?.url || "") || msg.host;
          const existing = liveData.logins.find(l => hostFromUrl("https://" + l.url) === host && l.username === msg.username);
          if (existing) {
            if (existing.password !== msg.password) {
              existing.password = msg.password; existing.updated = Date.now();
              await persist();
              chrome.notifications.create({ type: "basic", iconUrl: "icons/icon-128.png", title: "Passwordn", message: `Updated password for ${host}` });
            }
          } else {
            liveData.logins.unshift({ id: "l" + Date.now(), name: host, url: host, username: msg.username, password: msg.password, updated: Date.now() });
            await persist();
            chrome.notifications.create({ type: "basic", iconUrl: "icons/icon-128.png", title: "Passwordn", message: `Saved login for ${host}` });
          }
          sendResponse({ ok: true });
          break;
        }
        default: sendResponse({ ok: false, error: "unknown" });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || String(err) });
    }
  })();
  return true; // async
});

function redact(l) {
  return { id: l.id, name: l.name, url: l.url, username: l.username };
}

// Keyboard command — ask the active tab's content script to autofill
chrome.commands?.onCommand.addListener(async (command) => {
  if (command !== "autofill-login") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const host = hostFromUrl(tab.url || "");
  const matches = matchLogins(host);
  if (!matches.length) {
    chrome.notifications.create({ type: "basic", iconUrl: "icons/icon-128.png", title: "Passwordn", message: `No saved login for ${host}` });
    return;
  }
  const l = matches[0];
  chrome.tabs.sendMessage(tab.id, { type: "autofill", login: l });
});

// Re-arm autolock on activity
chrome.tabs.onActivated.addListener(() => { if (liveKey) scheduleAutolock(); });
