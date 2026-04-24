// Passwordn — page-side content script
// - Detects login forms
// - Shows a small inline "Autofill" badge next to password fields
// - Captures submissions to offer save/update

(function () {
  const HOST = location.hostname.replace(/^www\./, "");
  const seen = new WeakSet();
  let overlay = null;

  function findForms() {
    const pwInputs = Array.from(document.querySelectorAll('input[type="password"]'));
    return pwInputs
      .map(pw => {
        const form = pw.closest("form") || pw.parentElement?.closest("div, section, main") || pw.parentElement;
        const user = findUserField(form, pw);
        return { form, pw, user };
      })
      .filter(f => f.form && !seen.has(f.pw));
  }

  function findUserField(scope, pw) {
    if (!scope) return null;
    const candidates = scope.querySelectorAll('input[type="email"], input[type="text"], input[autocomplete="username"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]');
    for (const c of candidates) if (c !== pw) return c;
    return null;
  }

  async function getMatches() {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: "vault:match", host: HOST }, (res) => {
          if (chrome.runtime.lastError) { resolve({ host: HOST, logins: [] }); return; }
          resolve(res || { host: HOST, logins: [] });
        });
      } catch { resolve({ host: HOST, logins: [] }); }
    });
  }

  async function attachBadge({ pw, user, form }) {
    seen.add(pw);
    const badge = document.createElement("div");
    badge.className = "pn-badge";
    badge.innerHTML = `
      <span class="pn-mark">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      </span>
      <span class="pn-label">Autofill</span>
    `;
    document.body.appendChild(badge);
    positionBadge(badge, pw);

    const reposition = () => positionBadge(badge, pw);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    badge.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      const res = await getMatches();
      openPicker(res.logins, badge, async (login) => {
        const full = await new Promise(r => chrome.runtime.sendMessage({ type: "vault:reveal", id: login.id }, r));
        if (!full?.login) return;
        if (user) setNative(user, full.login.username);
        setNative(pw, full.login.password);
      });
    });

    // Capture on submit
    if (form && !form.__pnWatch) {
      form.__pnWatch = true;
      form.addEventListener("submit", () => {
        const username = (user?.value || "").trim();
        const password = pw.value;
        if (username && password && password.length >= 4) {
          chrome.runtime.sendMessage({ type: "capture:offer", username, password, host: HOST });
        }
      }, true);
    }
  }

  function positionBadge(badge, input) {
    const r = input.getBoundingClientRect();
    badge.style.top = (window.scrollY + r.top + r.height / 2 - 14) + "px";
    badge.style.left = (window.scrollX + r.right - 78) + "px";
    badge.style.display = r.width > 120 ? "flex" : "none";
  }

  function setNative(el, val) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openPicker(logins, anchor, onPick) {
    closeOverlay();
    overlay = document.createElement("div");
    overlay.className = "pn-picker";
    if (!logins.length) {
      overlay.innerHTML = `<div class="pn-empty">No saved logins for <b>${HOST}</b></div>`;
    } else {
      overlay.innerHTML = logins.map(l => `
        <button data-id="${l.id}" class="pn-item">
          <span class="pn-fav">${(l.name || HOST)[0].toUpperCase()}</span>
          <span class="pn-col">
            <span class="pn-t">${escapeHtml(l.name || l.url || HOST)}</span>
            <span class="pn-u">${escapeHtml(l.username || "")}</span>
          </span>
          <span class="pn-go">Fill</span>
        </button>`).join("");
    }
    document.body.appendChild(overlay);
    const r = anchor.getBoundingClientRect();
    overlay.style.top = (window.scrollY + r.bottom + 8) + "px";
    overlay.style.left = (window.scrollX + r.left + r.width - 280) + "px";

    overlay.querySelectorAll(".pn-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const l = logins.find(x => x.id === btn.dataset.id);
        if (l) onPick(l);
        closeOverlay();
      });
    });

    setTimeout(() => document.addEventListener("click", outside, { once: true }), 0);
  }
  function outside(e) { if (overlay && !overlay.contains(e.target)) closeOverlay(); }
  function closeOverlay() { if (overlay) { overlay.remove(); overlay = null; } }

  function escapeHtml(s) { return (s ?? "").toString().replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }

  // message handler (autofill command)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "autofill" && msg.login) {
      const forms = findForms();
      const f = forms[0];
      if (f) {
        chrome.runtime.sendMessage({ type: "vault:reveal", id: msg.login.id }, (res) => {
          if (!res?.login) return;
          if (f.user) setNative(f.user, res.login.username);
          setNative(f.pw, res.login.password);
        });
      }
    }
  });

  function scan() { findForms().forEach(attachBadge); }

  const mo = new MutationObserver(() => { scan(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
