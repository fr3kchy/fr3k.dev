(() => {
  "use strict";
  const CATALOG_URL = "/data/flagships/catalog.json";
  const REMOTE_STATUS = "https://raw.githubusercontent.com/fr3kchy/fr3k.dev/main/data/flagships/status.json";
  const LOCAL_STATUS = "/data/flagships/status.json";
  const byId = (id) => document.getElementById(id);
  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const formatDate = (value) => {
    if (!value) return "Timestamp unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Timestamp unavailable";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  async function getJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status + " for " + url);
    return response.json();
  }
  async function getStatus() {
    try {
      return await getJson(REMOTE_STATUS + "?v=" + Date.now());
    } catch (error) {
      return getJson(LOCAL_STATUS);
    }
  }
  function readinessLabel(project, snapshot) {
    if (snapshot && snapshot.runtime && snapshot.runtime.state === "healthy") return "Runtime healthy";
    if (snapshot && snapshot.ciState === "failure") return "CI failing";
    if (snapshot && snapshot.ciState === "blocked") return "CI blocked";
    return (project.readiness && project.readiness.label) || "Readiness unknown";
  }
  function render(catalog, status) {
    const projects = catalog.projects || [];
    const snapshots = status.projects || {};
    const values = Object.values(snapshots);
    const healthy = values.filter((item) => item.runtime && item.runtime.state === "healthy").length;
    const ciSuccess = values.filter((item) => item.ciState === "success").length;
    const ciBlocked = values.filter((item) => item.ciState === "blocked").length;
    byId("investSnapshotTitle").textContent = projects.length + " flagship systems in the engineering register";
    byId("investSnapshotTime").textContent = "Snapshot: " + formatDate(status.snapshotUpdatedAt);
    const metrics = byId("investStatusMetrics");
    metrics.replaceChildren();
    [
      [projects.length, "Registered systems"],
      [healthy, "Runtime healthy"],
      [ciSuccess, "CI successful"],
      [ciBlocked, "CI blocked"]
    ].forEach((item) => {
      const card = make("div");
      card.append(make("strong", "", item[0]));
      card.append(make("span", "", item[1]));
      metrics.append(card);
    });
    const grid = byId("investStatusGrid");
    grid.replaceChildren();
    projects.forEach((project) => {
      const snapshot = snapshots[project.id] || {};
      const card = make("article", "invest-status-card");
      const top = make("div", "invest-status-card__top");
      top.append(make("h4", "", project.name || project.id));
      top.append(make("span", "invest-status-chip", readinessLabel(project, snapshot)));
      card.append(top);
      const meta = [
        snapshot.ciState ? "CI: " + snapshot.ciState : "CI: unknown",
        snapshot.runtime && snapshot.runtime.state ? "Runtime: " + snapshot.runtime.state : "Runtime: not tested"
      ].join(" · ");
      card.append(make("div", "invest-status-meta", meta));
      card.append(make("p", "", (project.readiness && project.readiness.detail) || "No readiness detail is recorded."));
      grid.append(card);
    });
  }
  async function refresh() {
    try {
      const results = await Promise.all([getJson(CATALOG_URL), getStatus()]);
      render(results[0], results[1]);
    } catch (error) {
      byId("investSnapshotTitle").textContent = "Automated evidence snapshot unavailable";
      byId("investSnapshotTime").textContent = "Showing no live status claims";
      byId("investStatusGrid").replaceChildren(
        make("p", "invest-status-loading", "The automated source could not be read. Open the full flagship register for the latest available project notes.")
      );
    }
  }
  refresh();
  window.setInterval(refresh, 5 * 60 * 1000);
})();