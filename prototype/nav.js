// Mobile nav toggle: below 680px, .main-nav and .search-trigger are hidden
// by CSS and only the hamburger (.nav-toggle) button remains. This wires
// that button up to reveal a dropdown panel with the nav links plus a
// "search" entry (opens the same modal as ⌘K — see search.js).
// Shared across every page via <script src=".../nav.js" defer>.
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("type", "button");

  function close() {
    nav.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function open() {
    nav.classList.add("is-open");
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (nav.classList.contains("is-open")) close();
    else open();
  });

  // Close on outside click, Escape, or picking a nav link.
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("is-open") && !nav.contains(e.target) && e.target !== toggle) {
      close();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a, .search-trigger")) close();
  });
})();
