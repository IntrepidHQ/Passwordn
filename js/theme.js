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
    apply(saved || (mq.matches ? "dark" : "light"));
  }

  // Apply immediately to prevent flash
  const saved = localStorage.getItem(KEY);
  apply(saved || (mq.matches ? "dark" : "light"));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Respond to system preference changes when no saved preference
  mq.addEventListener("change", (e) => {
    if (!localStorage.getItem(KEY)) apply(e.matches ? "dark" : "light");
  });

  window.getTheme = current;
  window.setTheme = (t) => { apply(t); localStorage.setItem(KEY, t); };
})();
