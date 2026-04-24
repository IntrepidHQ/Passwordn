// Shared UI helpers: reveal-on-scroll, toasts, SVG mark
(function () {
  // IntersectionObserver for .reveal elements
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  }

  // Toasts
  function ensureToastRoot() {
    let root = document.querySelector(".toast-wrap");
    if (!root) {
      root = document.createElement("div");
      root.className = "toast-wrap";
      document.body.appendChild(root);
    }
    return root;
  }
  window.toast = function (message, kind = "ok", ms = 2200) {
    const root = ensureToastRoot();
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.innerHTML = `<span class="dot"></span><span>${message}</span>`;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .3s ease, transform .3s ease";
      el.style.opacity = "0";
      el.style.transform = "translateX(20px)";
      setTimeout(() => el.remove(), 320);
    }, ms);
  };

  // Brand mark SVG (inline so we don't need an asset file)
  window.BRAND_MARK = `
    <svg class="mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="pn-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stop-color="#2E6BF0"/>
          <stop offset="0.55" stop-color="#1848C8"/>
          <stop offset="1" stop-color="#0C1E60"/>
        </linearGradient>
        <radialGradient id="pn-h" cx="28%" cy="22%" r="65%" gradientUnits="objectBoundingBox">
          <stop stop-color="rgba(255,255,255,0.28)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill="url(#pn-g)"/>
      <rect width="32" height="32" rx="8.5" fill="url(#pn-h)"/>
      <path d="M11 20v-5.5a5 5 0 0 1 10 0V20" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.95"/>
      <rect x="9.5" y="14" width="13" height="9.5" rx="2.5" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.8"/>
      <circle cx="16" cy="18.5" r="1.9" fill="white"/>
      <rect x="15.15" y="18.5" width="1.7" height="3" rx="0.85" fill="white"/>
    </svg>`;

  function paintMarks() {
    document.querySelectorAll("[data-mark]").forEach((el) => {
      el.innerHTML = window.BRAND_MARK + el.innerHTML;
    });
  }

  function init() {
    paintMarks();
    initReveal();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
