// Web Crypto AES-256-GCM with PBKDF2-SHA256 key derivation.
// Vault items are encrypted client-side; the unlocked data lives only in memory.
window.Crypto = (function () {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function deriveKey(masterPassword, salt, iterations = 250_000) {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(masterPassword),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  function randomBytes(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }

  function toB64(buf) {
    const bytes = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function fromB64(s) {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function encrypt(plainObj, key) {
    const iv = randomBytes(12);
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(JSON.stringify(plainObj))
    );
    return { iv: toB64(iv), ct: toB64(ct) };
  }
  async function decrypt({ iv, ct }, key) {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(iv) },
      key,
      fromB64(ct)
    );
    return JSON.parse(dec.decode(plain));
  }

  function entropyBits(str) {
    if (!str) return 0;
    let pool = 0;
    if (/[a-z]/.test(str)) pool += 26;
    if (/[A-Z]/.test(str)) pool += 26;
    if (/\d/.test(str)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(str)) pool += 32;
    return Math.round(str.length * Math.log2(pool || 1));
  }

  function strength(str) {
    const bits = entropyBits(str);
    if (bits < 36)  return { label: "Weak",       class: "red",    pct: Math.min(25, bits) };
    if (bits < 60)  return { label: "Fair",       class: "yellow", pct: 25 + (bits - 36) * 1.2 };
    if (bits < 90)  return { label: "Strong",     class: "green",  pct: 60 + (bits - 60) * 1.0 };
    return                  { label: "Excellent", class: "green",  pct: 100 };
  }

  function generate(length = 20, opts = { lower: true, upper: true, digit: true, symbol: true }) {
    const sets = [];
    if (opts.lower)  sets.push("abcdefghijkmnopqrstuvwxyz");
    if (opts.upper)  sets.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
    if (opts.digit)  sets.push("23456789");
    if (opts.symbol) sets.push("!@#$%^&*()-_=+[]{};:,.?/");
    const all = sets.join("");
    if (!all) return "";
    const buf = randomBytes(length);
    // ensure at least one of each selected class
    let out = "";
    for (const s of sets) out += s[randomBytes(1)[0] % s.length];
    for (let i = out.length; i < length; i++) out += all[buf[i] % all.length];
    // shuffle
    return out.split("").sort(() => randomBytes(1)[0] - 128).join("");
  }

  return { deriveKey, encrypt, decrypt, randomBytes, strength, entropyBits, generate, toB64, fromB64 };
})();
