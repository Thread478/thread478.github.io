(function () {
  const root = document.documentElement;

  function readTheme() {
    try {
      return localStorage.getItem("thread478-theme");
    } catch (_error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem("thread478-theme", theme);
    } catch (_error) {
      // The visual theme still works when storage is unavailable.
    }
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    storeTheme(theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const next = theme === "dark" ? "浅色" : "深色";
      button.setAttribute("aria-label", `切换到${next}模式`);
      button.setAttribute("title", `切换到${next}模式`);
      button.textContent = theme === "dark" ? "日间" : "夜间";
    });
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(readTheme() || (prefersDark ? "dark" : "light"));

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  });

  const path = window.location.pathname.toLowerCase();
  const file = path.split("/").filter(Boolean).pop() || "index.html";
  let pageKey = "home";

  if (file === "math-resources.html") pageKey = "math";
  else if (file === "errata.html") pageKey = "errata";
  else if (path.includes("inter_th")) pageKey = "intersection";
  else if (file === "photography.html") pageKey = "photography";
  else if (file === "painting.html") pageKey = "painting";
  else if (file === "literature.html") pageKey = "writing";
  else if (file === "design.html") pageKey = "design";
  else if (file === "music.html") pageKey = "music";
  else if (file === "useless.html") pageKey = "along";
  else if (file === "404.html") pageKey = "lost";

  const pageSignals = {
    home: { code: "00", word: "BETWEEN DREAM AND WAKING / 梦与清醒之间" },
    math: { code: "M01", word: "PROOF, THEN A PAUSE / 证明之后" },
    errata: { code: "E04", word: "THE TRACE REMAINS / 痕迹仍在" },
    intersection: { code: "I01", word: "WHERE LINES QUIETLY MEET" },
    along: { code: "B05", word: "ROOMS WE ALMOST REMEMBER" },
    photography: { code: "P06", word: "LIGHT LEFT A QUIET TRACE" },
    painting: { code: "C07", word: "I MAY HAVE DREAMED THIS" },
    writing: { code: "W02", word: "A DREAM IN MY OWN WORDS" },
    design: { code: "D03", word: "FORM FOLLOWS A SOFT MEMORY" },
    music: { code: "S02", word: "TIME SOUNDS DIFFERENT HERE" },
    lost: { code: "404", word: "THE CORRIDOR RESTS HERE" }
  };

  const signal = pageSignals[pageKey];
  document.body.dataset.page = pageKey;

  document.querySelectorAll(".hero h1, .page-intro h1, .article-header h1").forEach((heading) => {
    heading.dataset.ghost = heading.textContent.trim();
  });

  const intro = document.querySelector(".page-intro, .article-header");
  if (intro) intro.dataset.signal = signal.code;

  const dreamLayer = document.createElement("div");
  dreamLayer.className = "dream-layer";
  dreamLayer.setAttribute("aria-hidden", "true");
  dreamLayer.innerHTML = `
    <span class="dream-orb dream-orb--a"></span>
    <span class="dream-orb dream-orb--b"></span>
    <span class="dream-word">${signal.word}</span>
    <span class="dream-coordinate">ROOM 0478 · ${signal.code}</span>`;
  document.body.appendChild(dreamLayer);

  const meter = document.createElement("div");
  meter.className = "scroll-meter";
  meter.setAttribute("aria-hidden", "true");
  document.body.appendChild(meter);

  let frameRequested = false;

  function updateScrollMeter() {
    const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
    root.style.setProperty("--scroll-progress", String(progress));
    frameRequested = false;
  }

  updateScrollMeter();
  window.addEventListener("scroll", () => {
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(updateScrollMeter);
    }
  }, { passive: true });

  const menuButton = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-site-nav]");
  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "收起" : "菜单";
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.textContent = "菜单";
      });
    });
  }

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const lightboxTriggers = document.querySelectorAll("[data-lightbox]");
  if (lightboxTriggers.length > 0 && "HTMLDialogElement" in window) {
    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.innerHTML = `
      <button class="lightbox__close" type="button" aria-label="关闭大图">×</button>
      <figure class="lightbox__figure">
        <img alt="">
        <figcaption class="lightbox__caption"></figcaption>
      </figure>`;
    document.body.appendChild(dialog);

    const image = dialog.querySelector("img");
    const caption = dialog.querySelector("figcaption");
    const closeButton = dialog.querySelector("button");

    lightboxTriggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const source = trigger.querySelector("img");
        if (!source) return;
        image.src = source.currentSrc || source.src;
        image.alt = source.alt || "作品大图";
        caption.textContent = trigger.dataset.caption || source.alt || "";
        dialog.showModal();
      });
    });

    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
})();
