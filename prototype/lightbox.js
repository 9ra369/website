// Click-to-zoom lightbox: clicking the hero image or an inline body image
// opens it full-size in a modal overlay. Shared across tips detail pages and
// the hand-curated entry-*.html pages.
//
// Scoped to "main .entry-hero-thumb > img" (the hero/thumbnail image) and
// "main .prose img" (inline content images) — deliberately excludes
// .gallery-thumbs img (those already switch the hero image on click, see
// tip-gallery.js) and header/footer logo images.
(function () {
  const SELECTOR = "main .entry-hero-thumb > img, main .prose img";
  let overlay, imgEl, captionEl;

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.innerHTML =
      '<button class="lightbox-close" aria-label="閉じる" type="button">&times;</button>' +
      '<img class="lightbox-img" alt="">' +
      '<div class="lightbox-caption"></div>';
    document.body.appendChild(overlay);
    imgEl = overlay.querySelector(".lightbox-img");
    captionEl = overlay.querySelector(".lightbox-caption");

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.classList.contains("lightbox-close")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function open(src, alt) {
    ensureOverlay();
    imgEl.src = src;
    imgEl.alt = alt || "";
    captionEl.textContent = alt || "";
    overlay.classList.add("is-open");
    document.body.classList.add("lightbox-locked");
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("lightbox-locked");
  }

  document.addEventListener("click", (e) => {
    const img = e.target.closest(SELECTOR);
    if (!img) return;
    e.preventDefault();
    open(img.currentSrc || img.src, img.alt);
  });
})();
