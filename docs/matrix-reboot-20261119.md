# FR3K Matrix reboot — design and deployment specification

## User correction

The beige/orange 2026-11-19 revamp was rejected. Do **not** promote that preview or reuse it as the visual target. Keep the brand cyberpunk: near-black backgrounds, acid-green instrument accents, cyan links, angular panels, matrix grid, readable terminal-style metadata and restrained scanlines. Use FR3K brand imagery already in the repo; avoid inventing asset provenance.

## Editorial voice

Direct, technical, occasionally profane, but never dishonest. Examples: "FUCK THE HYPE. SHOW THE RECEIPTS.", "NO BULLSHIT PLACEHOLDERS", "CONNECT. MEASURE. VERIFY." Do not make test, device or customer claims stronger than the evidence.

## Media archive contract

The 17 two-minute films are an independent release artifact. Publishing the website must not be required to re-upload the 228.5 MiB binary archive. `/films/` and `/media` must remain directly navigable. Films are human-controlled (`preload=none`), with posters and native controls, caption tracks where actually available, a working filter and a direct fallback link.

## Gates

1. `node scripts/validate-film-archive.mjs` and existing Forge/static/render checks pass.
2. 29 public pages (including `/films/`) pass 320, 390, 768 and 1440px browser checks.
3. GitHub CI green on the exact feature commit.
4. Vercel preview created from the same SHA; /films video sources and representative HTTP Range confirmed.
5. Human aesthetic review before production; the rejected design must not be automatically promoted.
6. After an approved merge, verify deployed production SHA, domain routes, film playback and Vercel deployment ID. A commit or preview is not a production deployment.

## Recovery

Original video source provenance and the deployment regression are recorded in `docs/film-incident-20261119.md`.
