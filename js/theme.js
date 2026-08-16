// Theme — event delegation so it survives re-renders
(function () {
  const KEY = "passwordn:theme";
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-theme-toggle]").forEach(el => {
      el.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  // Event delegation — survives any re-render
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    const next = current() === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(KEY, next);
  });

  function init() {
    const saved = localStorage.getItem(KEY);
    apply(saved || "light"); // light is the default brand experience
  }

  // Apply immediately to prevent flash
  const saved = localStorage.getItem(KEY);
  apply(saved || "light");

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // System preference no longer overrides the light default;
  // users can still switch via the toggle (persisted).

  window.getTheme = current;
  window.setTheme = (t) => { apply(t); localStorage.setItem(KEY, t); };
})();
