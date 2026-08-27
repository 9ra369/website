// Client-side category + tag + keyword filtering, sorting, and pagination
// for archive.html ("ポスト" listing). Static prototype, no backend: all of
// this operates on the already-rendered .entry-card elements in the DOM,
// using their data-category / data-tags / data-date / data-title attributes.

(function () {
  const PAGE_SIZE = 24;

  const grid = document.querySelector(".entry-grid");
  const cards = Array.from(document.querySelectorAll(".entry-card"));
  const categoryOptions = Array.from(document.querySelectorAll(".filter-option[data-category]"));
  const tagChips = Array.from(document.querySelectorAll(".chip[data-tag]"));
  const resultCount = document.querySelector(".result-count");
  const sortSelect = document.querySelector(".sort-select");
  const keywordInput = document.querySelector(".search-bar-lg input");
  const paginationWrap = document.querySelector(".pagination-wrap");
  const paginationRangeEl = paginationWrap ? paginationWrap.querySelector(".pagination-range") : null;
  const paginationNav = paginationWrap ? paginationWrap.querySelector(".pagination") : null;

  let activeCategory = null; // single-select
  const activeTags = new Set(); // multi-select
  let keyword = "";
  let currentPage = 1;

  function cardTags(card) {
    const raw = card.dataset.tags || "";
    return raw ? raw.split("|") : [];
  }

  function cardMatchesKeyword(card) {
    if (!keyword) return true;
    const haystack = [
      card.dataset.title || "",
      card.dataset.tags || "",
      card.querySelector(".entry-category")?.textContent || "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  }

  /** Cards matching the active category/tag/keyword filters, in current DOM
   *  order (which reflects the active sort — see applySort()). Does not
   *  touch element display; render() below does that per the active page. */
  function computeMatches() {
    return cards.filter((card) => {
      const categoryMatch = !activeCategory || card.dataset.category === activeCategory;
      const tags = cardTags(card);
      // OR among selected tags: a card matches if it has at least one of them.
      const tagMatch = activeTags.size === 0 || tags.some((t) => activeTags.has(t));
      return categoryMatch && tagMatch && cardMatchesKeyword(card);
    });
  }

  /** ["…", 1, "…", 4, 5, 6, "…", 12] style page list: always first/last,
   *  plus a window around the current page. */
  function buildPageList(current, total) {
    const pages = [];
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - current) <= 1) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    return pages;
  }

  function renderPagination(total, totalPages) {
    if (!paginationWrap) return;

    if (total === 0 || totalPages <= 1) {
      // Still show the range line for zero/one-page results, just no controls.
      if (paginationRangeEl) {
        paginationRangeEl.textContent = total === 0 ? "" : `${total} 件（${total}件/ページ内に収まっています）`;
      }
      if (paginationNav) paginationNav.innerHTML = "";
      return;
    }

    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, total);
    if (paginationRangeEl) {
      paginationRangeEl.textContent = `${start}–${end} / ${total}件（${PAGE_SIZE}件/ページ）`;
    }

    if (paginationNav) {
      const pages = buildPageList(currentPage, totalPages);
      let html = pages
        .map((p) =>
          p === "…"
            ? `<span class="ellipsis">…</span>`
            : `<a href="#" data-page="${p}" class="${p === currentPage ? "is-active" : ""}">${p}</a>`
        )
        .join("");
      if (currentPage < totalPages) {
        html += `<a href="#" class="next" data-page="${currentPage + 1}">次へ
          <svg viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>`;
      }
      paginationNav.innerHTML = html;
    }
  }

  /** Re-evaluates filters, clamps/paginates to the current page, and updates
   *  the result count + pagination controls. Call after any filter, sort, or
   *  page change. */
  function render() {
    const matched = computeMatches();
    const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const matchedSet = new Set(matched);
    let indexWithinMatches = -1;
    for (const card of cards) {
      if (!matchedSet.has(card)) {
        card.style.display = "none";
        continue;
      }
      indexWithinMatches++;
      card.style.display = indexWithinMatches >= start && indexWithinMatches < end ? "" : "none";
    }

    if (resultCount) {
      const parts = [];
      if (activeCategory) {
        const opt = categoryOptions.find((o) => o.dataset.category === activeCategory);
        if (opt) parts.push(opt.textContent.replace(/\s*\d+\s*$/, "").trim());
      }
      if (activeTags.size > 0) parts.push([...activeTags].join(" / "));
      if (keyword) parts.push(`「${keyword}」`);
      const suffix = parts.length ? `（${parts.join("・")}で絞り込み中）` : "";
      resultCount.innerHTML = `<strong>${matched.length}</strong> 件のポスト${suffix}`;
    }

    renderPagination(matched.length, totalPages);
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
      currentPage = 1;
      render();
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
      currentPage = 1;
      render();
    });
  });

  if (keywordInput) {
    keywordInput.addEventListener("input", () => {
      keyword = keywordInput.value.trim().toLowerCase();
      currentPage = 1;
      render();
    });
  }

  if (paginationNav) {
    paginationNav.addEventListener("click", (e) => {
      const link = e.target.closest("a[data-page]");
      if (!link) return;
      e.preventDefault();
      currentPage = parseInt(link.dataset.page, 10) || 1;
      render();
      paginationWrap.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  // Deep-link support: archive.html?tag=Houdini pre-filters on load (used by
  // tag links on tip/entry pages). Works even for tags not in the sidebar's
  // top-24 chip list — computeMatches() matches against card data regardless.
  // archive.html?sort=date-desc (used by the homepage footer's "新着順"
  // link), ?q=keyword, and ?page=N pre-fill the sort/search/page the same way.
  const params = new URLSearchParams(location.search);
  const tagParam = params.get("tag");
  if (tagParam) {
    activeTags.add(tagParam);
    const matchingChip = tagChips.find((c) => c.dataset.tag === tagParam);
    if (matchingChip) matchingChip.classList.add("is-active");
  }
  const queryParam = params.get("q");
  if (queryParam && keywordInput) {
    keywordInput.value = queryParam;
    keyword = queryParam.trim().toLowerCase();
  }
  const pageParam = parseInt(params.get("page"), 10);
  if (pageParam > 1) currentPage = pageParam;

  const SORTERS = {
    "date-desc": (a, b) => (b.dataset.date || "").localeCompare(a.dataset.date || ""),
    "date-asc": (a, b) => (a.dataset.date || "").localeCompare(b.dataset.date || ""),
    "title-asc": (a, b) => (a.dataset.title || "").localeCompare(b.dataset.title || "", "ja"),
    "title-desc": (a, b) => (b.dataset.title || "").localeCompare(a.dataset.title || "", "ja"),
  };

  const sortParam = params.get("sort");
  if (sortParam && SORTERS[sortParam] && sortSelect) {
    sortSelect.value = sortParam;
  }

  function applySort() {
    if (!grid || !sortSelect) return;
    const sorter = SORTERS[sortSelect.value];
    if (!sorter) return;
    const sorted = [...cards].sort(sorter);
    for (const card of sorted) grid.appendChild(card);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      applySort();
      currentPage = 1;
      render();
    });
    applySort();
  }

  render();
})();
