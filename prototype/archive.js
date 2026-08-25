// Client-side category + tag filtering for archive.html.
// Static prototype, no backend: filters the already-rendered .entry-card
// elements in place using their data-category / data-tags attributes.

(function () {
  const grid = document.querySelector(".entry-grid");
  const cards = Array.from(document.querySelectorAll(".entry-card"));
  const categoryOptions = Array.from(document.querySelectorAll(".filter-option[data-category]"));
  const tagChips = Array.from(document.querySelectorAll(".chip[data-tag]"));
  const resultCount = document.querySelector(".result-count");
  const sortSelect = document.querySelector(".sort-select");

  let activeCategory = null; // single-select
  const activeTags = new Set(); // multi-select

  function cardTags(card) {
    const raw = card.dataset.tags || "";
    return raw ? raw.split("|") : [];
  }

  function applyFilters() {
    let visible = 0;

    for (const card of cards) {
      const categoryMatch = !activeCategory || card.dataset.category === activeCategory;
      const tags = cardTags(card);
      // OR among selected tags: a card matches if it has at least one of them.
      const tagMatch = activeTags.size === 0 || tags.some((t) => activeTags.has(t));
      const show = categoryMatch && tagMatch;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    }

    if (resultCount) {
      const parts = [];
      if (activeCategory) {
        const opt = categoryOptions.find((o) => o.dataset.category === activeCategory);
        if (opt) parts.push(opt.textContent.replace(/\s*\d+\s*$/, "").trim());
      }
      if (activeTags.size > 0) parts.push([...activeTags].join(" / "));
      const suffix = parts.length ? `（${parts.join("・")}で絞り込み中）` : "";
      resultCount.innerHTML = `<strong>${visible}</strong> 件のエントリー${suffix}`;
    }
  }

  categoryOptions.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.preventDefault();
      const slug = opt.dataset.category;
      if (activeCategory === slug) {
        activeCategory = null;
        opt.classList.remove("is-active");
      } else {
        categoryOptions.forEach((o) => o.classList.remove("is-active"));
        activeCategory = slug;
        opt.classList.add("is-active");
      }
      applyFilters();
    });
  });

  tagChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tag = chip.dataset.tag;
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        chip.classList.remove("is-active");
      } else {
        activeTags.add(tag);
        chip.classList.add("is-active");
      }
      applyFilters();
    });
  });

  // Deep-link support: archive.html?tag=Houdini pre-filters on load (used by
  // tag links on tip/entry pages). Works even for tags not in the sidebar's
  // top-24 chip list — applyFilters() matches against card data regardless.
  const params = new URLSearchParams(location.search);
  const tagParam = params.get("tag");
  if (tagParam) {
    activeTags.add(tagParam);
    const matchingChip = tagChips.find((c) => c.dataset.tag === tagParam);
    if (matchingChip) matchingChip.classList.add("is-active");
  }

  const SORTERS = {
    "date-desc": (a, b) => (b.dataset.date || "").localeCompare(a.dataset.date || ""),
    "date-asc": (a, b) => (a.dataset.date || "").localeCompare(b.dataset.date || ""),
    "title-asc": (a, b) => (a.dataset.title || "").localeCompare(b.dataset.title || "", "ja"),
    "title-desc": (a, b) => (b.dataset.title || "").localeCompare(a.dataset.title || "", "ja"),
  };

  function applySort() {
    if (!grid || !sortSelect) return;
    const sorter = SORTERS[sortSelect.value];
    if (!sorter) return;
    const sorted = [...cards].sort(sorter);
    for (const card of sorted) grid.appendChild(card);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", applySort);
    applySort();
  }

  applyFilters();
})();
