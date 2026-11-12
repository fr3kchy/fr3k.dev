(() => {
  const CATALOG_URL = "/data/flagships/catalog.json";
  const STATUS_URL = "/data/flagships/status.json";
  const REFRESH_MS = 5 * 60 * 1000;
  const labels = {
    verified: "Verified",
    implemented: "Implemented",
    "in-development": "In development",
    "source-reported": "Source-reported",
    planned: "Planned",
    "not-tested": "Not tested",
    stale: "Stale",
    cancelled: "Cancelled",
    "not-implemented": "Not implemented",
    blocked: "Blocked",
    "not-deployed": "Not deployed",
    "not-in-scope": "Not in scope",
    "active-development": "Active development",
    "review-deployment": "Review deployment",
    "development-pilot": "Development pilot",
    "experimental-validation": "Experimental validation",
    "android-alpha": "Android alpha",
    "live-service-healthy": "Live service healthy",
    "local-runtime-healthy": "Local runtime healthy",
    "prototype": "Prototype",
    "integration-draft": "Integration draft",
    "local-release-acceptance": "Local release acceptance",
    "local-gateway-running": "Local gateway running",
    "staged-integration": "Staged integration",
    "research-scaffold": "Research scaffold",
    "implemented-not-tested": "Implemented · not tested",
    "phase-0-foundation": "Phase 0 foundation"
  };

  const slug = (value) => String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const label = (state) => labels[state] || String(state || "Unknown").replace(/-/g, " ");
  const date = (value) => {
    if (!value) return "No source timestamp";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Timestamp unavailable";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
  };
  const metric = (name, value, detail, state) => {
    const card = el("article", "status-metric");
    card.append(el("span", "status-metric__label", name));
    const v = el("strong", "status-metric__value", value);
    if (state) v.dataset.state = state;
    card.append(v);
    if (detail) card.append(el("span", "status-metric__detail", detail));
    return card;
  };

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  function renderStatus(target, project, snapshot) {
    target.replaceChildren();
    const readiness = project.readiness || {};
    const summary = el("div", "status-summary");
    const chip = el("span", "state-chip", readiness.label || label(readiness.state));
    chip.dataset.state = readiness.state || "unknown";
    summary.append(chip, el("p", "", readiness.detail || "No readiness note recorded."));
    target.append(summary);

    if (!snapshot) {
      target.append(el("p", "status-loading", "Automated snapshot unavailable. The audited static baseline remains visible."));
      return;
    }

    const grid = el("div", "status-grid");
    const sourceState = snapshot.sourceAccessible === true ? "accessible" :
      snapshot.sourceAccessible === false ? "unavailable" : "unknown";
    grid.append(
      metric("Source access", sourceState === "accessible" ? `${snapshot.sourceVisibility || "Source"} reachable` :
        sourceState === "unavailable" ? "Not reachable" : "Unknown",
        snapshot.sourceVisibility === "private" ? "Private repository · repository name withheld" : "Repository metadata check",
        sourceState),
      metric("Last repository push", date(snapshot.lastPushAt), "GitHub repository metadata · all branches", "neutral"),
      metric("Continuous integration", snapshot.ciState === "stale"
        ? `Stale · last ${label(snapshot.ciConclusion || "unknown")}` : label(snapshot.ciState || "unknown"),
        snapshot.ciUpdatedAt ? date(snapshot.ciUpdatedAt) : "No workflow run timestamp available",
        snapshot.ciState || "unknown"),
      metric("Open pull requests", snapshot.openPullRequests === null || snapshot.openPullRequests === undefined ?
        "Unavailable" : String(snapshot.openPullRequests),
        "Count only · no private review details exposed", "neutral"),
      metric("Local worktree", snapshot.local?.checkoutPresent ?
        (snapshot.local.changesPending ? "Changes pending" : "Clean") : "Not observed",
        snapshot.local?.checkoutPresent
          ? `Omarchy checkout · last local commit ${date(snapshot.local.headAt)}`
          : "No local checkout mapped",
        snapshot.local?.changesPending ? "in-development" : "neutral"),
      metric("Runtime probe", label(snapshot.runtime?.state || "not-tested"),
        snapshot.runtime?.statusCode ? `HTTP ${snapshot.runtime.statusCode}` : "No endpoint probe configured",
        snapshot.runtime?.state || "not-tested")
    );
    target.append(grid);

    const foot = el("div", "status-snapshot");
    foot.append(el("span", "", `Snapshot published: ${date(snapshot.snapshotUpdatedAt)}`));
    foot.append(el("span", "", `Source checks: every ${snapshot.refreshIntervalMinutes || 15} minutes`));
    if (snapshot.manifestState === "current") {
      foot.append(el("span", "manifest-note", "Source capability manifest: current"));
    } else if (snapshot.manifestState === "absent" || snapshot.manifestState === "not-configured") {
      foot.append(el("span", "manifest-note", "Capability states: audited baseline · source manifest adoption pending"));
    } else {
      foot.append(el("span", "manifest-note", `Capability manifest: ${label(snapshot.manifestState)}`));
    }
    target.append(foot);
  }

  function renderCapabilityOverrides(project, snapshot) {
    const overrides = snapshot?.capabilities || {};
    document.querySelectorAll("[data-capability-id]").forEach((card) => {
      const id = card.dataset.capabilityId;
      const override = overrides[id];
      const chip = card.querySelector("[data-capability-state]");
      if (!chip || !override?.state) return;
      chip.textContent = label(override.state);
      chip.dataset.state = override.state;
      if (override.evidenceCount) chip.title = `${override.evidenceCount} evidence reference(s) in source manifest`;
    });
  }

  function renderIndex(catalog, status) {
    for (const project of catalog.projects || []) {
      const snapshot = status?.projects?.[project.id];
      document.querySelectorAll(`[data-flagship-card="${CSS.escape(project.id)}"]`).forEach((card) => {
        const chip = card.querySelector("[data-flagship-card-state]");
        if (!chip) return;
        let text = project.readiness?.label || label(project.readiness?.state);
        if (snapshot?.runtime?.state === "healthy") text = "Runtime healthy";
        else if (snapshot?.ciState === "failure") text = "CI failing";
        else if (snapshot?.ciState === "stale") text = "CI stale";
        chip.textContent = text;
        chip.dataset.state = snapshot?.runtime?.state === "healthy" ? "verified" :
          snapshot?.ciState === "failure" ? "blocked" : project.readiness?.state || "unknown";
      });
    }
    const note = document.querySelector("[data-portfolio-status]");
    if (note) note.textContent = status?.snapshotUpdatedAt
      ? `Latest evidence snapshot: ${date(status.snapshotUpdatedAt)} · checks every ${status.refreshIntervalMinutes || 15} minutes`
      : "Automated source snapshot is awaiting its first successful sync.";
  }

  async function refresh() {
    let catalog, status;
    try {
      [catalog, status] = await Promise.all([fetchJson(CATALOG_URL), fetchJson(STATUS_URL)]);
    } catch (error) {
      console.warn("Flagship status feed unavailable", error);
      const target = document.querySelector("[data-flagship-status]");
      if (target && !target.querySelector(".status-grid")) {
        target.append(el("p", "status-loading", "Live source snapshot unavailable. Static capability and evidence notes remain visible."));
      }
      return;
    }

    const id = document.body.dataset.flagshipId;
    if (id) {
      const project = (catalog.projects || []).find((p) => p.id === id);
      if (project) {
        renderStatus(document.querySelector("[data-flagship-status]"), project, status.projects?.[id]);
        renderCapabilityOverrides(project, status.projects?.[id]);
      }
    }
    renderIndex(catalog, status);
  }

  refresh();
  window.setInterval(refresh, REFRESH_MS);
})();