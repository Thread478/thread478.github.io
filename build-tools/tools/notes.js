(() => {
  const root = document.documentElement;
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem("thread478-theme");
  } catch (_error) {
    // Theme switching still works when storage is unavailable.
  }
  const preferredTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.dataset.theme = storedTheme || preferredTheme;

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const updateThemeLabel = () => {
      const next = root.dataset.theme === "dark" ? "浅色" : "深色";
      button.setAttribute("aria-label", `切换到${next}模式`);
      button.setAttribute("title", `切换到${next}模式`);
    };
    updateThemeLabel();
    button.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("thread478-theme", root.dataset.theme);
      } catch (_error) {
        // Ignore storage errors in privacy-restricted browsers.
      }
      updateThemeLabel();
    });
  });

  const progress = document.querySelector("[data-reading-progress]");
  const updateProgress = () => {
    if (!progress) return;
    const total = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${total > 0 ? Math.min(100, scrollY / total * 100) : 0}%`;
  };
  addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  const article = document.querySelector(".note-page");
  const outline = document.querySelector("[data-outline]");
  if (article && outline) {
    const headings = [...article.querySelectorAll("h3[id], h4[id]")];
    const sectionHeadings = headings.filter((heading) => heading.tagName === "H3");
    sectionHeadings.forEach((heading, index) => {
      heading.dataset.sectionNo = String(index + 1).padStart(2, "0");
    });
    headings.forEach((heading) => {
      if (!heading.querySelector(".heading-anchor")) {
        const anchor = document.createElement("a");
        anchor.className = "heading-anchor";
        anchor.href = `#${heading.id}`;
        anchor.setAttribute("aria-label", "复制此小节链接");
        anchor.textContent = "#";
        heading.prepend(anchor);
      }
    });
    if (headings.length) {
      outline.replaceChildren(...headings.map((heading) => {
        const link = document.createElement("a");
        link.href = `#${heading.id}`;
        link.dataset.level = heading.tagName.slice(1);
        link.textContent = heading.textContent.replace(/^#/, "").trim();
        return link;
      }));
      const links = [...outline.querySelectorAll("a")];
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        links.forEach((link) => link.classList.toggle("is-active", link.hash === `#${visible.target.id}`));
      }, { rootMargin: "-18% 0px -72%" });
      headings.forEach((heading) => observer.observe(heading));
    }
  }

  const catalog = document.querySelector("[data-notes-catalog]");
  if (catalog) {
    fetch("manifest.json")
      .then((response) => {
        if (!response.ok) throw new Error(`manifest request failed: ${response.status}`);
        return response.json();
      })
      .then((manifest) => {
        document.querySelectorAll("[data-published-count]").forEach((el) => el.textContent = manifest.published_count);
        const fragment = document.createDocumentFragment();
        let visibleChapterCount = 0;
        manifest.parts.forEach((part) => {
          const publishedChapters = part.chapters.filter((chapter) => chapter.status === "published" && chapter.href);
          if (!publishedChapters.length) return;
          visibleChapterCount += publishedChapters.length;
          const section = document.createElement("section");
          section.className = "catalog-part";
          const items = publishedChapters.map((chapter, index) => {
            const label = `<span class="chapter-no">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(chapter.title)}</span><span class="status-dot" aria-label="已公开"></span>`;
            return `<li><a href="${encodeURI(chapter.href)}">${label}</a></li>`;
          }).join("");
          section.innerHTML = `<div class="part-number"><span>PART ${escapeHtml(part.number)}</span></div><h3>${escapeHtml(part.zh)}</h3><p>${escapeHtml(part.title)}</p><ol>${items}</ol>`;
          fragment.append(section);
        });
        if (!visibleChapterCount && Number(manifest.published_count) > 0) {
          throw new Error("published chapters are missing href values");
        }
        catalog.replaceChildren(fragment);
        catalog.dataset.ready = "true";
      })
      .catch((error) => {
        console.error(error);
        catalog.innerHTML = '<p class="catalog-fallback">章节目录暂时没有正确生成。请重新运行札记构建任务，或从页面内的静态目录进入章节。</p>';
      });
  }

  const dialog = document.querySelector("[data-search-dialog]");
  const input = document.querySelector("[data-search-input]");
  const results = document.querySelector("[data-search-results]");
  const hint = document.querySelector("[data-search-hint]");
  let searchIndex;

  const openSearch = () => {
    if (!dialog) return;
    dialog.showModal();
    requestAnimationFrame(() => input?.focus());
    if (!searchIndex) {
      fetch("search-index.json")
        .then((response) => response.json())
        .then((data) => { searchIndex = data; runSearch(); })
        .catch(() => { if (hint) hint.textContent = "搜索索引暂时无法载入。"; });
    }
  };

  document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", openSearch));
  addEventListener("keydown", (event) => {
    const editing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (event.key === "/" && !editing) {
      event.preventDefault();
      openSearch();
    }
  });

  const runSearch = () => {
    if (!input || !results || !hint) return;
    const query = input.value.trim().toLocaleLowerCase();
    if (query.length < 2) {
      results.replaceChildren();
      hint.textContent = "输入两个以上字符开始搜索。";
      return;
    }
    if (!searchIndex) {
      hint.textContent = "正在载入索引……";
      return;
    }
    const terms = query.split(/\s+/).filter(Boolean);
    const ranked = searchIndex.map((page) => {
      const title = page.title.toLocaleLowerCase();
      const headings = page.headings.join(" ").toLocaleLowerCase();
      const text = page.text.toLocaleLowerCase();
      const score = terms.reduce((sum, term) => sum + (title.includes(term) ? 12 : 0) + (headings.includes(term) ? 5 : 0) + (text.includes(term) ? 1 : 0), 0);
      return { ...page, score };
    }).filter((page) => page.score > 0).sort((a, b) => b.score - a.score).slice(0, 20);
    hint.textContent = ranked.length ? `找到 ${ranked.length} 个最相关页面` : "没有找到。可以换一个更短的概念词。";
    results.innerHTML = ranked.map((page) => {
      const lower = page.text.toLocaleLowerCase();
      const at = Math.max(0, lower.indexOf(terms[0]));
      const excerpt = page.text.slice(Math.max(0, at - 55), at + 150);
      return `<a class="search-result" href="${encodeURI(page.href)}"><h3>${escapeHtml(page.title)}</h3><p>${at > 55 ? "…" : ""}${escapeHtml(excerpt)}…</p></a>`;
    }).join("");
  };
  input?.addEventListener("input", debounce(runSearch, 120));

  function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]);
  }
})();
