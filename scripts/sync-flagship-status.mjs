#!/usr/bin/env node
/**
 * Reconcile FR3K flagship repository, CI, review, local-worktree and runtime state.
 *
 * Public output is deliberately sanitised: no private repo names, branches,
 * commit subjects, local paths, device IDs, credentials or raw service bodies.
 *
 * Modes:
 *   --no-push  write a local snapshot only
 *   --check    collect and fail if the published snapshot would change
 *   --publish  reconcile safely; commit/push only the generated status JSON
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "data/flagships/catalog.json");
const STATUS_PATH = join(ROOT, "data/flagships/status.json");
const LOCAL_CONFIG_PATH = process.env.FR3K_FLAGSHIP_STATUS_CONFIG ||
  join(process.env.HOME || ROOT, ".config/fr3k/flagship-status.local.json");
const args = new Set(process.argv.slice(2));
const CHECK = args.has("--check");
const PUBLISH = args.has("--publish");
const VALID_STATES = new Set([
  "verified", "implemented", "in-development", "source-reported",
  "planned", "not-tested", "not-implemented", "blocked", "not-deployed", "not-in-scope"
]);
const VALID_EVIDENCE_TYPES = new Set([
  "source", "test", "documentation", "workflow", "artifact", "acceptance", "runtime", "hardware", "roadmap"
]);

function run(command, argv, options = {}) {
  return execFileSync(command, argv, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: options.timeout || 20000,
    maxBuffer: 8 * 1024 * 1024
  }).trim();
}
function git(...argv) { return run("git", ["-C", ROOT, ...argv]); }
function slug(value = "") {
  return String(value).toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function stable(value) { return JSON.stringify(value, null, 2) + "\n"; }
function activeAccount() {
  // `gh auth status` writes its human-readable output to stderr; use the API
  // identity endpoint so this check is deterministic and machine-readable.
  const account = run("gh", ["api", "user", "--jq", ".login"], { timeout: 15000 });
  if (!account) throw new Error("Cannot identify active GitHub account; refusing to switch credentials.");
  return account;
}
function switchAccount(account) {
  if (!account) return;
  run("gh", ["auth", "switch", "--hostname", "github.com", "--user", account], { timeout: 15000 });
}
function ghJson(endpoint) {
  const raw = run("gh", ["api", endpoint], { timeout: 18000 });
  return JSON.parse(raw);
}
function tryGhJson(endpoint) {
  try { return ghJson(endpoint); } catch { return null; }
}
function localObservation(path) {
  if (!path || !existsSync(path)) return { checkoutPresent: false, changesPending: null, headAt: null };
  try {
    const top = run("git", ["-C", path, "rev-parse", "--show-toplevel"], { timeout: 4000 });
    if (!top) return { checkoutPresent: false, changesPending: null, headAt: null };
    const dirty = Boolean(run("git", ["-C", path, "status", "--porcelain"], { timeout: 4000 }));
    const headAt = run("git", ["-C", path, "show", "-s", "--format=%cI", "HEAD"], { timeout: 4000 });
    return { checkoutPresent: true, changesPending: dirty, headAt: headAt || null };
  } catch {
    return { checkoutPresent: false, changesPending: null, headAt: null };
  }
}
async function runtimeObservation(checks = []) {
  if (!checks.length) return { state: "not-tested", statusCode: null };
  const results = [];
  for (const check of checks) {
    try {
      const response = await fetch(check.url, { method: "GET", signal: AbortSignal.timeout(5000) });
      results.push({ ok: response.ok, statusCode: response.status });
      try { await response.body?.cancel(); } catch {}
    } catch {
      results.push({ ok: false, statusCode: null });
    }
  }
  const allOk = results.every(x => x.ok);
  return {
    state: allOk ? "healthy" : "unavailable",
    statusCode: results.length === 1 ? results[0].statusCode : null
  };
}
function parseManifest(file, projectId, knownCapabilityIds, treeEntries) {
  if (!file?.content || file.encoding !== "base64") return { state: "absent", capabilities: {} };
  try {
    const manifest = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
    if (manifest.schemaVersion !== 1 || manifest.projectId !== projectId ||
        !Array.isArray(manifest.capabilities) ||
        typeof manifest.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(manifest.updatedAt)) ||
        !Array.isArray(treeEntries)) {
      return { state: "invalid", capabilities: {} };
    }
    // The Git tree is fetched using the exact commit SHA that supplied the manifest.
    const paths = new Set(treeEntries.filter(entry => entry?.type === "blob").map(entry => entry.path));
    const seen = new Set();
    const capabilities = {};
    for (const item of manifest.capabilities) {
      if (!item || !knownCapabilityIds.has(item.id) || seen.has(item.id) ||
          !VALID_STATES.has(item.state) || !Array.isArray(item.evidence) || item.evidence.length === 0) {
        return { state: "invalid", capabilities: {} };
      }
      seen.add(item.id);
      for (const evidence of item.evidence) {
        const ref = evidence?.ref;
        if (!evidence || !VALID_EVIDENCE_TYPES.has(evidence.type) ||
            typeof ref !== "string" || !ref || ref.startsWith("/") || ref.includes("\\") ||
            ref.includes("?") || ref.includes("#") ||
            ref.split("/").some(part => !part || part === "." || part === "..") ||
            !paths.has(ref) ||
            typeof evidence.note !== "string" || evidence.note.trim().length < 8 || evidence.note.length > 300) {
          return { state: "invalid", capabilities: {} };
        }
      }
      let state = item.state;
      if (state === "verified") state = "source-reported";
      capabilities[item.id] = {
        state,
        evidenceCount: item.evidence.length,
        updatedAt: manifest.updatedAt
      };
    }
    if (seen.size !== knownCapabilityIds.size ||
        [...knownCapabilityIds].some(id => !seen.has(id))) {
      return { state: "invalid", capabilities: {} };
    }
    return { state: "current", capabilities };
  } catch {
    return { state: "invalid", capabilities: {} };
  }
}
async function collectProject(project, config, currentAccount) {
  const local = localObservation(config.localPath);
  let source = {
    sourceVisibility: config.visibility || project.source?.visibility || "unknown",
    sourceAccessible: null,
    lastPushAt: null,
    ciState: "unknown",
    ciConclusion: null,
    ciUpdatedAt: null,
    openPullRequests: null,
    local,
    runtime: await runtimeObservation(project.runtimeChecks || []),
    manifestState: config.manifestEnabled === true ? "unavailable" : "not-configured",
    capabilities: {}
  };
  if (!config.repo) return source;

  if (currentAccount !== config.account) switchAccount(config.account);
  const repo = config.repo;
  const meta = tryGhJson(`repos/${repo}`);
  // A failed metadata request may be a rate limit or transient API failure.
  // Keep access UNKNOWN rather than publishing a false "unreachable" claim.
  if (!meta) return source;

  source.sourceAccessible = true;
  source.sourceVisibility = meta.private ? "private" : "public";
  source.lastPushAt = meta.pushed_at || null;

  const runs = tryGhJson("repos/" + repo + "/actions/runs?per_page=1");
  const latestRun = runs?.workflow_runs?.[0];
  if (!runs) source.ciState = "unknown";
  else if (!latestRun) source.ciState = "no-runs";
  else {
    source.ciConclusion = latestRun.conclusion || latestRun.status || null;
    source.ciUpdatedAt = latestRun.updated_at || latestRun.created_at || null;
    const stale = source.ciUpdatedAt &&
      (Date.now() - new Date(source.ciUpdatedAt).getTime()) > 30 * 86400000;

    if (latestRun.status === "completed" && latestRun.conclusion === "failure") {
      // Distinguish a test failure from a job rejected before a runner ever starts.
      const jobs = tryGhJson("repos/" + repo + "/actions/runs/" + latestRun.id + "/jobs?per_page=20");
      if (!jobs || !Array.isArray(jobs.jobs) || jobs.jobs.length === 0) {
        source.ciState = "unknown";
        source.ciConclusion = "failure-unclassified";
      } else {
        const runnerNeverStarted = jobs.jobs.every(job =>
          !job.runner_id && (!Array.isArray(job.steps) || job.steps.length === 0)
        );
        if (runnerNeverStarted) {
          source.ciState = "blocked";
          source.ciConclusion = "runner-not-started";
        } else {
          source.ciState = stale ? "stale" : "failure";
          source.ciConclusion = "failure";
        }
      }
    } else {
      source.ciState = latestRun.status === "completed"
        ? (stale ? "stale" : latestRun.conclusion === "success" ? "success" :
          latestRun.conclusion === "cancelled" ? "cancelled" : "failure")
        : (latestRun.status === "queued" ? "queued" : "running");
    }
  }
  const query = encodeURIComponent(`repo:${repo} is:pr is:open`);
  const prs = tryGhJson(`search/issues?q=${query}&per_page=1`);
  source.openPullRequests = Number.isInteger(prs?.total_count) ? prs.total_count : null;

  if (config.manifestEnabled === true) {
    const branch = meta.default_branch || "main";
    const commit = tryGhJson("repos/" + repo + "/commits/" + encodeURIComponent(branch));
    if (!commit?.sha || !commit.commit?.tree?.sha) {
      source.manifestState = "unavailable";
    } else {
      const file = tryGhJson("repos/" + repo + "/contents/.fr3k/flagship-status.json?ref=" + encodeURIComponent(commit.sha));
      if (!file) {
        source.manifestState = "absent";
      } else {
        const tree = tryGhJson("repos/" + repo + "/git/trees/" + encodeURIComponent(commit.commit.tree.sha) + "?recursive=1");
        if (!tree || tree.truncated === true || !Array.isArray(tree.tree)) {
          source.manifestState = "unavailable";
        } else {
          const known = new Set((project.capabilities || []).map(c => slug(c.name)));
          const manifest = parseManifest(file, project.id, known, tree.tree);
          source.manifestState = manifest.state;
          source.capabilities = manifest.capabilities;
        }
      }
    }
  }
  return source;
}

function preparePublish(websiteAccount) {
  if (git("branch", "--show-current") !== "main") {
    return { ready: false, reason: "Website checkout is not on main; preserving the current branch." };
  }
  const dirty = git("status", "--porcelain", "--untracked-files=all")
    .split("\n").filter(Boolean);
  const onlyGeneratedStatus = dirty.length > 0 && dirty.every(line =>
    line.slice(3).replace(/^"|"$/g, "") === "data/flagships/status.json"
  );
  if (dirty.length > 0 && !onlyGeneratedStatus) {
    return { ready: false, reason: "Website edits are present; snapshot saved locally without touching or publishing those edits." };
  }
  switchAccount(websiteAccount);
  git("fetch", "origin", "main");
  const counts = git("rev-list", "--left-right", "--count", "origin/main...HEAD").split(/\s+/).map(Number);
  const [behind = 0, ahead = 0] = counts;
  if (behind > 0 && ahead > 0) {
    return { ready: false, reason: "Website branch diverged from origin; manual reconciliation is required." };
  }
  if (ahead > 0) {
    return { ready: false, reason: "Website has unpublished local commits; refusing to push commits not created by the status collector." };
  }
  if (behind > 0 && onlyGeneratedStatus) {
    return { ready: false, reason: "Remote website updates are pending and the generated status file is dirty; preserving both until a clean fast-forward is possible." };
  }
  if (behind > 0) git("pull", "--ff-only", "origin", "main");
  return { ready: true, reason: null };
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const localConfig = JSON.parse(readFileSync(LOCAL_CONFIG_PATH, "utf8"));
  const originalAccount = activeAccount();
  let currentAccount = originalAccount;
  let publishAccount = localConfig.websiteAccount || "fr3kchy";
  let changed = false;

  let publishGate = { ready: false, reason: "Publishing was not requested." };
  try {
    if (PUBLISH) {
      try {
        publishGate = preparePublish(publishAccount);
        if (publishGate.ready) currentAccount = publishAccount;
      } catch (error) {
        publishGate = { ready: false, reason: `Preflight failed: ${error.message}` };
      }
    }

    const projects = {}
    for (const project of catalog.projects) {
      const config = localConfig.projects?.[project.id] || {
        visibility: project.source?.visibility || "unknown",
        repo: null,
        account: currentAccount
      };
      try {
        projects[project.id] = await collectProject(project, config, currentAccount);
        currentAccount = config.account || currentAccount;
      } catch {
        projects[project.id] = {
          sourceVisibility: config.visibility || "unknown",
          sourceAccessible: null,
          lastPushAt: null,
          ciState: "unknown",
          ciConclusion: null,
          ciUpdatedAt: null,
          openPullRequests: null,
          local: localObservation(config.localPath),
          runtime: await runtimeObservation(project.runtimeChecks || []),
          manifestState: "unavailable",
          capabilities: {}
        };
      }
    }

    const previous = existsSync(STATUS_PATH)
      ? JSON.parse(readFileSync(STATUS_PATH, "utf8")) : null;
    const core = {
      schemaVersion: 1,
      refreshIntervalMinutes: 15,
      projects
    };
    const previousCore = previous ? { schemaVersion: previous.schemaVersion, refreshIntervalMinutes: previous.refreshIntervalMinutes, projects: previous.projects } : null;
    changed = stable(core) !== stable(previousCore);
    const next = {
      ...core,
      snapshotUpdatedAt: changed || !previous?.snapshotUpdatedAt
        ? new Date().toISOString() : previous.snapshotUpdatedAt
    };
    const output = stable(next);

    if (CHECK) {
      if (changed) throw new Error("Status drift detected; run the collector to publish the new snapshot.");
      console.log("[flagship-status] no drift");
      return;
    }

    mkdirSync(dirname(STATUS_PATH), { recursive: true });
    if (changed || !existsSync(STATUS_PATH)) writeFileSync(STATUS_PATH, output);
    console.log(`[flagship-status] ${Object.keys(projects).length} projects reconciled; snapshot ${changed ? "changed" : "unchanged"}.`);

    if (PUBLISH && publishGate.ready) {
      switchAccount(publishAccount);
      const statusFileDirty = Boolean(git("status", "--porcelain", "--", "data/flagships/status.json"));
      if (statusFileDirty) {
        git("add", "--", "data/flagships/status.json");
        git("commit", "-m", "chore(status): reconcile flagship evidence snapshot");
      }
      git("push", "origin", "main");
      console.log("[flagship-status] published status.json to GitHub; live pages read the raw feed directly (no Vercel redeploy needed for status-only changes).");
    } else if (PUBLISH) {
      console.log(`[flagship-status] BLOCKED: ${publishGate.reason} Snapshot saved locally; no website edits or commits were pushed.`);
    }
  } finally {
    if (originalAccount) {
      try { switchAccount(originalAccount); } catch {}
    }
  }
}

main().catch(error => {
  console.error(`[flagship-status] BLOCKED: ${error.message}`);
  process.exitCode = 1;
});
