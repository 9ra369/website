// Shared behaviour for tip pages with multiple images (案C: main viewer +
// clickable thumbnail switcher). One script, reused by every generated
// prototype/tips/*.html page — event delegation means it works regardless
// of how many thumbnails a given page has.

(function () {
  const thumbsBar = document.querySelector(".gallery-thumbs");
  const mainImg = document.querySelector("#gallery-main-img");
  if (!thumbsBar || !mainImg) return;

  thumbsBar.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-src]");
    if (!link) return;
    e.preventDefault();

    mainImg.src = link.dataset.src;
    mainImg.alt = link.dataset.alt || "";

    thumbsBar.querySelectorAll("a").forEach((a) => a.classList.remove("is-active"));
    link.classList.add("is-active");
  });
})();
