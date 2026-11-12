# FR3K flagship status automation

## What updates automatically

The Omarchy collector runs every 15 minutes and reconciles each flagship against the authorised source repositories and configured runtime probes. It publishes a new snapshot only when observed state changes.

Signals collected:
- latest repository push timestamp from GitHub metadata (all branches);
- latest GitHub Actions workflow state and completion time;
- open pull-request count;
- local checkout presence, last local commit time and dirty/clean state (no branch or file names);
- configured HTTP health probes (status code only);
- optional source-side capability manifest.

The generated public feed is `data/flagships/status.json`. The pages fetch it from the public GitHub raw URL every five minutes (with a cache-busting query) and fall back to the last deployed local snapshot if GitHub is unavailable. When the snapshot changes, the collector commits and pushes only that JSON file to `main`. Status-only changes therefore reach already-deployed pages without a Vercel redeployment. A Vercel deployment is still required when page HTML, the capability catalog, CSS or JavaScript changes.

## Evidence and privacy rules

The public feed deliberately omits private repository names and URLs, branch names, commit subjects and file paths, device identifiers, private hostnames/IPs, service response bodies, credentials, customer information and raw logs.

For private sources, the page reports only sanitised activity, CI, review-count and local-worktree signals. A runtime probe publishes only healthy/unavailable and the HTTP status code.

A commit is activity, not a completed feature. Green CI is a build/test signal, not a deployment. A healthy endpoint is a health observation, not proof that every capability works. A device smoke test is limited to exactly what the test exercised.

## Capability updates from source repositories

To have an individual capability state change automatically when a feature is completed, add this file to the source repository:

`/.fr3k/flagship-status.json`

The collector fetches the manifest from the exact default-branch commit SHA it has just observed. The manifest must identify the matching `projectId` and `schemaVersion`; it must not contain its own commit hash (that would be self-referential). Capability IDs are the lowercase kebab-case form of the capability name in `data/flagships/catalog.json`.

Allowed source-declared states:
- `implemented`
- `in-development`
- `source-reported`
- `planned`
- `not-tested`
- `not-implemented`
- `blocked`
- `not-deployed`
- `not-in-scope`

A source manifest cannot self-promote a feature to `verified`. If it declares `verified`, the website downgrades that declaration to `source-reported`. The catalog's `verified` state is reserved for an independent evidence review recorded in the website's curated product register. This prevents a developer's claim from becoming a verified fact merely because it was committed.

All 16 configured source repositories now contain a complete .fr3k/flagship-status.json and a .github/workflows/fr3k-capability-manifest.yml caller workflow. The caller workflows pin the public reusable validator workflow to commit e9b03af46f4688bec1de752c12f247632e63baab; that workflow checks out the validator at immutable commit ca3d4c5f4ea08bde5a35c327b389dbd724c5c49d. The validator checks project identity, exact capability-set completeness, allowed source states, safe repository-relative evidence references, and that every reference is a regular file in the checkout.

Omarchy has manifestEnabled=true for all 16 projects. During reconciliation it fetches each manifest and the Git tree from the same exact default-branch commit SHA. Every evidence path must exist in that tree. A missing, malformed, incomplete, stale-path or truncated-tree manifest fails closed as absent, invalid or unavailable; no source capability overrides are published in that case.

The website displays source-declared state separately from the curated capability state. A source repository cannot self-promote a capability to verified; independent verification remains in the curated portfolio register. The public feed exposes only the source state, evidence-reference count and manifest timestamp—not private repository paths or evidence contents. A GitHub Actions run rejected before any runner or step starts is reported as CI blocked, not as a test failure; genuine failures after a runner starts remain failures.

## Operator behaviour

- Timer cadence: 15 minutes; missed runs are caught up after the next user-session start.
- The collector switches between the two already-authorised GitHub CLI accounts for read-only API queries, then restores the account that was active before the run.
- Publishing runs only from the website's `main` branch. If unrelated website edits are present, the collector refreshes the local snapshot but does not stage, commit, pull or push anything. If the only dirty path is the generated `data/flagships/status.json`, it may commit that file alone. It uses fast-forward-only reconciliation and refuses divergent history, unpublished local commits, and a dirty status file when a remote fast-forward is also required.
- If GitHub access, a runtime endpoint, or the website push is unavailable, the collector fails closed and records no fabricated success.
- No tests are run by the periodic collector; it reads CI evidence and local state. Expensive test suites remain part of project CI/release acceptance.

## Manual operation

From the website repository:

```bash
node scripts/sync-flagship-status.mjs --no-push
node scripts/sync-flagship-status.mjs --check
node scripts/sync-flagship-status.mjs --publish
```

The user service is `fr3k-flagship-status.timer`. Inspect it with:

```bash
systemctl --user status fr3k-flagship-status.timer
journalctl --user -u fr3k-flagship-status.service -n 80 --no-pager
```
