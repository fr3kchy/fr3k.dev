# FR3K.dev full-site revamp — 2026-11-19 execution and handoff

## Status and authority

- **OBSERVATION:** The feature worktree is on `feat/full-site-revamp-20261119`, originally checkpointed as `223f068` to preserve the Codex draft.
- **VERIFIED FACT:** The draft contains a field-lab homepage, shared navigation/styling, `forge/`, updated flagship register, BLACKWAV3 repair, SEO metadata, sitemap, and offline verification scripts.
- **VERIFIED FACT:** The original interactive Codex `gpt-6.2-astra` session stopped at its usage limit; no successful automated continuation is assumed.
- **OBSERVATION:** OMH 4.0.5 doctor reported 63/63 checks passing with five non-blocking warnings. The selected OMH Hermes-child run `fr3k-revamp-hermes-20261119-1848` with model `gpt-6.2-astra` returned `dispatch_failed`, without observed modifications. A separate Hermes `gpt-6.2-astra` smoke request returned `READY`, demonstrating model routing, not successful agent implementation.
- **VERIFIED FACT:** Recovery edits and validation described below were performed through authorized FR3K Fleet commands against the existing worktree. They must not be misrepresented as completed by the failed OMH child.
- **UNKNOWN:** Live production deployment of this revision remains unverified until a distinct deployment receipt and public smoke test exist. A Git push by itself is not deployment.

## Changes made during recovery

1. Scoped `.hero` layout overrides for `blackwave/campaign/` and `blackwave/social/`, because the shared `style.css` flex-row hero was forcing the action buttons outside small viewports.
2. Kept the two pages' navigation visible below 900px even though the legacy markup contains no hamburger controller; wrapped links remain keyboard reachable.
3. Changed BLACKWAV3 device-card grid to allow a narrower-than-300px column inside 320px viewports.
4. Allowed narrow evidence cards to wrap the verification chip and copy, including long URLs.
5. Expanded `scripts/check-browser.cjs` from two to four viewports and asserted navigation visibility on the two affected pages.
6. Added an optional GitHub Actions browser smoke gate with a pinned Playwright dependency; CI execution must still be observed separately.

## Reproducible local tests

Working directory: repository root. Preview started by `python3 scripts/preview-site.py` on loopback port 8765. An already-running preview was checked against this repository during the repair.

```sh
node scripts/validate-forge-evidence.mjs
node scripts/render-flagship-pages.mjs --check
python3 scripts/check-site.py
CHROMIUM_PATH=/usr/bin/chromium node scripts/check-browser.cjs  # after installing Playwright
```

Results observed on Omarchy on 2026-11-19:

| Gate | Observed result |
| --- | --- |
| Forge evidence | PASS — approved 512 × 512 PNG matched recorded SHA-256 |
| Flagship rendering | PASS — 16 product detail pages, project register, 28 sitemap entries |
| Static site checks | PASS — 28 HTML pages, 595 local references, metadata and sitemap |
| Playwright 320 × 720 | PASS — 28 local routes |
| Playwright 390 × 844 | PASS — 28 local routes |
| Playwright 768 × 1024 | PASS — 28 local routes |
| Playwright 1440 × 900 | PASS — 28 local routes |
| Git whitespace validation | PASS — `git diff --check` |

**Earlier defects (now repaired):** 390px overflow on `/blackwave/campaign/` (96px) and `/blackwave/social/` (82px); 320px overflow on `/blackwave/` and `/fleet/`; 768px action/nav overflow on both campaign and social pages.

## Security and evidence boundaries

- Do not publish real device addresses, internal infrastructure, credentials, API keys, user home directories or private context; any local path in test commands is a documented tool-specific prerequisite, not a public endpoint.
- The Forge image receipt proves the supplied asset and recorded test fixture match; **it does not independently demonstrate phone-wide inference performance**.
- The live fleet health numbers and other page claims are historical or linked source information. Do not convert them to present-tense hardware verification without new receipts.
- Public website `HTTP 200` is availability only, not proof that this revision deployed.
- Branch `feat/full-site-revamp-20261119` should be merged only after GitHub checks, content review and preview acceptance. Production should be smoked after deployment.

## Continuation and release gates

1. Verify the feature branch is pushed to `fr3kchy/fr3k.dev` using the repository owner's authorized account; a different authenticated account (`fr3k-d3v`) only had read access and returned HTTP 403. Do not change global GitHub identity to work around this.
2. Open a PR against `main` and inspect the CI workflow result, particularly the Playwright browser gate.
3. Review the Vercel preview and verify page rendering, links, asset loading, accessibility and evidence disclosure.
4. Merge after acceptance, observe production deployment, then smoke `https://fr3k.dev/` and `/forge/`, `/blackwave/`, `/projects/`, `/invest/` on the actual production hostname.
5. Record PR, commit, deployment ID and test URLs; only then mark the revamp VERIFIED LIVE.

## CI runner correction (2026-11-19)

- **OBSERVATION:** The first two GitHub Actions jobs for `8d8b8b6` failed at Chromium installation, before browser QA: the `ubuntu-latest` image resolved to Ubuntu 26.04, which Playwright 1.56.1 did not support. Job logs: `44495508694` and `44495508805`.
- **RECONCILIATION:** The runner is now explicitly pinned to `ubuntu-24.04`, a supported OS for Playwright 1.56.1, and redundant push CI for the feature branch is removed (the PR event still checks it).
- **UNKNOWN until observed:** This correction is not a CI PASS; collect the subsequent GitHub Actions job result before approving merge.

## CI tablet viewport follow-up — 2026-11-19

- **OBSERVATION:** CI run `44495996317` passed the Forge and static checks, Chromium installation, and all 320px and 390px browser routes, then reported `/hud/ overflows 16px at 768 ()`. Omarchy's local browser did not reproduce the failure.
- **HYPOTHESIS:** Font metrics or header wrapping differ between Ubuntu CI Chromium and the locally installed browser.
- **IMPROVE:** Add a scoped tablet navigation wrap at 52rem and expand browser diagnostics to record document/body/client and navigation widths. This is a testable correction, not proof of resolution.
- **UNKNOWN:** Require an observed green CI result before approving any merge or production deployment.
