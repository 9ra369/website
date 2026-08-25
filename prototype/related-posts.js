// "関連ポスト" section: shows the first 4 same-tag related posts, revealing
// the rest (up to 10 total, pre-rendered server-side in HTML) on click.
(function () {
  const btn = document.querySelector(".related-posts-more");
  if (!btn) return;
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".related-posts-grid .entry-card.is-more-hidden")
      .forEach((el) => el.classList.remove("is-more-hidden"));
    btn.remove();
  });
})();
