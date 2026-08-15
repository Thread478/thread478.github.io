(() => {
  const shelf = document.querySelector("[data-collection-list]");
  const root = document.querySelector("[data-collection-manifest]");
  if (!shelf || !root) return;

  const manifestUrl = root.dataset.collectionManifest;
  fetch(manifestUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`collection manifest request failed: ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      const items = (manifest.items || []).filter((item) => item.status === "published" && item.href);
      if (!items.length) {
        showStatus("书架暂时是空的", "这里不会显示尚未完成的题目或文章；第一篇正文公开后会自动出现。");
        return;
      }

      const grid = document.createElement("div");
      grid.className = "collection-grid";
      items.forEach((item, index) => grid.append(createCard(item, index + 1)));
      shelf.replaceChildren(grid);
    })
    .catch((error) => {
      console.error(error);
      showStatus("书架暂时无法读取", "请检查本页的 manifest.json 是否存在且格式正确。");
    });

  function createCard(item, index) {
    const article = document.createElement("article");
    article.className = "collection-card";
    article.dataset.index = String(index).padStart(2, "0");

    const meta = document.createElement("p");
    meta.className = "collection-card__meta";
    meta.textContent = [item.topic, item.date].filter(Boolean).join(" · ");

    const title = document.createElement("h2");
    title.textContent = item.title;

    const summary = document.createElement("p");
    summary.className = "collection-card__summary";
    summary.textContent = item.summary || "";

    const footer = document.createElement("footer");
    footer.className = "collection-card__footer";
    const topics = document.createElement("div");
    topics.className = "collection-card__topics";
    (item.tags || []).forEach((value) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = value;
      topics.append(tag);
    });

    const link = document.createElement("a");
    link.className = "collection-card__link";
    link.href = item.href;
    link.textContent = "阅读全文 →";
    footer.append(topics, link);
    article.append(meta, title, summary, footer);
    return article;
  }

  function showStatus(title, text) {
    const status = document.createElement("div");
    status.className = "collection-status";
    const body = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = title;
    body.append(strong, document.createTextNode(text));
    status.append(body);
    shelf.replaceChildren(status);
  }
})();
