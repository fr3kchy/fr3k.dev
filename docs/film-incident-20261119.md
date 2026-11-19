# FR3K.dev film regression — 2026-11-19

## VERIFIED FACT: date and cause

The Vercel deployment created **2026-11-07T04:43:17Z** (`dpl_7jy2LjsP6SqxYNtG5wTobq77CRB1`) contained a flat source tree with 17 distinct `src/assets/films/*.mp4` masters. The earlier production snapshot delivered `/assets/films/blackwave-120.mp4` with HTTP 206 for a two-byte Range request.

The first reviewed November 12 production deployment (`dpl_48W61mye6TLioMP7Ybhth1qZs95S`, created 2026-11-12T09:33:12Z) no longer had the film directory in its source package. That deployment and the later public production domain return HTTP 404 for the same film URL.

Git commit `03dc450d` (November 7 source) and the November 12 Git source commit did **not** track `assets/films/` paths. **Cause:** the original deployment included additional locally uploaded files not tracked in the website Git repository. Subsequent Git-based deployments omitted them. This was a deployment packaging/data-retention failure, not destruction of the original masters.

## RECOVERY EVIDENCE

Six published films were recovered byte-for-byte from the November 7 immutable Vercel deployment. Their SHA-1 digests match the original Vercel file-tree UIDs: `blackwave-120`, `blackwave-pilot-120`, `fleet-120`, `hud-120`, `hud-au-120`, and `signed-ota-field-trial-120`. Eleven additional film masters came from the verified November 7 Omarchy web-encode archive.

All 17 were checked with ffprobe: H.264 / 1280×720 / approximately 120.042 seconds each. Their per-file SHA-256 digests and sizes are preserved in [the public film manifest](/data/films-120s.json). Local verification of 17 masters totalled about 228.5 MiB.

The binaries now live in GitHub Release [fr3k-films-120s-v1](https://github.com/fr3kchy/fr3k.dev/releases/tag/fr3k-films-120s-v1), with **17 MP4, 17 WebP posters, six VTT caption tracks**. File counts and byte sizes were verified against the local recovered set (40 assets; 240,210,132 bytes total). Sample Range requests returned HTTP 206. The five separately archived portrait films remain excluded from publication.

## PREVENTION

- The permanent website links to versioned GitHub Release assets, not files copied only into one Vercel deployment.
- `data/films-120s.json` is the canonical public metadata index and stores each source checksum.
- `scripts/validate-film-archive.mjs` checks all 17 slots, source URLs, posters and the previously excluded archive.
- CI must check the film manifest and sitemap every time the site changes.
- Public browser smoke tests must confirm playback access and byte-range support on representative film URLs before production promotion.
- Do not replace the earlier films with unrelated launch shorts or call a 45-second reel an equivalent substitute.

## Authority and evidence limits

The film masters are real and their bytes are verified. The narrative scenes are **generated cinematic media**, not hardware acceptance evidence. Their content must not be presented as proof that a device, OTA system or model workflow succeeded. The Matrix redesign was deployed as Vercel production deployment `dpl_WNLdfg6quCMfv874XsCBBm5CHRkb` from Git commit `15d6d13e19f707ef92812cb19ba8e659985ab590`, then passed 116 live browser route/viewport checks and a 120.042-second real video metadata load. That does not imply every historical deep link was restored.

## Compatibility repair for historical deep links

- **OBSERVATION:** After the main Matrix revamp was live, `https://fr3k.dev/assets/films/blackwave-120.mp4` still returned HTTP 404. The new `/films/` experience correctly played the original master from a versioned GitHub Release URL, but legacy embeds and bookmarks remained broken.
- **IMPROVE:** A nonpermanent Vercel redirect maps `/assets/films/:filename` to `https://github.com/fr3kchy/fr3k.dev/releases/download/fr3k-films-120s-v1/:filename`. This preserves the original filenames, covers the six caption/poster companions, and does not duplicate large binary files into Git history.
- **TEST:** The repository film validator now requires the redirect rule. An actual Vercel preview and production smoke test must demonstrate that the old video URL resolves and supports byte-range requests. Until then, this is a **configured fix**, not a verified live repair.
- **BOUNDARY:** Unrecognised filenames are not invented: they lead to the release's normal missing-asset response. Excluded portrait archives remain excluded.
