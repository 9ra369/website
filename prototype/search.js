// Header search ("記事・リンクを検索" trigger + ⌘K / Ctrl+K shortcut):
// opens a modal that live-filters prototype/search-index.json (built by
// scripts/20-build-search-index.js from every curated + generated entry).
// Requires the page to be served over http(s) — fetch() of a local JSON
// file is blocked under file://, so a message is shown instead of failing
// silently in that case.
(function () {
  const triggers = document.querySelectorAll(".search-trigger");
  if (triggers.length === 0) return;

  const root = document.body.dataset.root || "";
  let overlay, input, resultsEl, statusEl;
  let entries = null; // null = not yet loaded, [] = load failed
  let activeIndex = -1;
  let lastFocused = null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.innerHTML =
      '<div class="search-modal" role="dialog" aria-modal="true" aria-label="サイト内検索">' +
      '<div class="search-modal-bar">' +
      '<svg viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M17 17L13.5 13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '<input type="text" placeholder="記事・リンクを検索（タイトル、タグ、カテゴリ）" autocomplete="off" spellcheck="false">' +
      '<kbd>Esc</kbd>' +
      "</div>" +
      '<div class="search-modal-results"></div>' +
      '<div class="search-modal-status"></div>' +
      "</div>";
    document.body.appendChild(overlay);

    input = overlay.querySelector("input");
    resultsEl = overlay.querySelector(".search-modal-results");
    statusEl = overlay.querySelector(".search-modal-status");

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    input.addEventListener("input", () => {
      activeIndex = -1;
      render(input.value);
    });
    input.addEventListener("keydown", onInputKeydown);
    resultsEl.addEventListener("click", (e) => {
      const item = e.target.closest("a.search-result");
      if (item) close();
    });
  }

  function loadIndex() {
    if (entries !== null) return Promise.resolve(entries);
    return fetch(`${root}search-index.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        entries = data;
        return entries;
      })
      .catch(() => {
        entries = [];
        return entries;
      });
  }

  function matches(entry, terms) {
    const haystack = [entry.title, entry.categoryLabel, ...(entry.tags || [])]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  }

  function render(query) {
    const q = query.trim().toLowerCase();

    if (entries === null) {
      resultsEl.innerHTML = "";
      statusEl.textContent = "読み込み中…";
      return;
    }
    if (entries.length === 0) {
      resultsEl.innerHTML = "";
      statusEl.textContent =
        "検索インデックスを読み込めませんでした（ローカルファイルを直接開いている場合、検索はサーバー経由でのみ動作します）。";
      return;
    }

    if (!q) {
      resultsEl.innerHTML = "";
      statusEl.textContent = `${entries.length} 件のエントリーからキーワードで検索できます。`;
      return;
    }

    const terms = q.split(/\s+/).filter(Boolean);
    const matched = entries.filter((e) => matches(e, terms)).slice(0, 30);

    if (matched.length === 0) {
      resultsEl.innerHTML = "";
      statusEl.textContent = "一致するエントリーが見つかりませんでした。";
      return;
    }

    statusEl.textContent = `${matched.length} 件${matched.length === 30 ? "（上位30件を表示）" : ""}`;
    resultsEl.innerHTML = matched
      .map(
        (e, i) => `<a class="search-result${i === activeIndex ? " is-active" : ""}" href="${root}${escapeHtml(e.url)}">
          <span class="search-result-cat">${escapeHtml(e.categoryLabel)}</span>
          <span class="search-result-title">${escapeHtml(e.title)}</span>
        </a>`
      )
      .join("");
  }

  function onInputKeydown(e) {
    const items = resultsEl.querySelectorAll("a.search-result");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = (activeIndex + 1) % items.length;
      updateActive(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActive(items);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    } else if (e.key === "Escape") {
      close();
    }
  }

  function updateActive(items) {
    items.forEach((el, i) => el.classList.toggle("is-active", i === activeIndex));
    if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function open() {
    ensureOverlay();
    lastFocused = document.activeElement;
    overlay.classList.add("is-open");
    document.body.classList.add("search-locked");
    input.value = "";
    activeIndex = -1;
    render("");
    loadIndex().then(() => render(input.value));
    setTimeout(() => input.focus(), 0);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("search-locked");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function isOpen() {
    return !!overlay && overlay.classList.contains("is-open");
  }

  triggers.forEach((trigger) => {
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    trigger.addEventListener("click", open);
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
    if (isCmdK) {
      e.preventDefault();
      if (isOpen()) close();
      else open();
    } else if (e.key === "Escape" && isOpen()) {
      close();
    }
  });
})();
