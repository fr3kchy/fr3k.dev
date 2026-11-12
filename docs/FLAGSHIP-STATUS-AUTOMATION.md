# FR3K flagship status automation

## What updates automatically

The Omarchy collector runs every 15 minutes and reconciles each flagship against the authorised source repositories and configured runtime probes. It publishes a new snapshot only when observed state changes.

Signals collected:
- default-branch commit timestamp;
- latest GitHub Actions workflow state and completion time;
- open pull-request count;
- local checkout presence, last local commit time and dirty/clean state (no branch or file names);
- configured HTTP health probes (status code only);
- optional source-side capability manifest.

The generated public feed is `data/flagships/status.json`. The pages refresh the feed in an open browser every five minutes. When the snapshot changes, the collector commits and pushes only that JSON file to `main`; the existing Vercel Git integration deploys the site.

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

A source manifest cannot self-promote a feature to `verified`. If it declares `verified`, the website downgrades that declaration to `source-reported`. The catalog's `verified` state is reserved for an independent evidence review recorded in the website's curated product register. This prevents a developer's claim from becoming a verified fact merely because it was committed.

The manifest is optional. Until a source repository adopts it, the page uses the audited capability baseline in the catalog while repository, CI, review, local and runtime signals still update automatically.

## Operator behaviour

- Timer cadence: 15 minutes; missed runs are caught up after the next user-session start.
- The collector switches between the two already-authorised GitHub CLI accounts for read-only API queries, then restores the account that was active before the run.
- Publishing runs only from the website's `main` branch. If the worktree contains user edits, the collector still refreshes the local snapshot but does not stage, commit, pull or push anything. When the tree is clean, it uses fast-forward-only reconciliation, refuses divergent history and unpublished local commits, and commits only `data/flagships/status.json`.
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
