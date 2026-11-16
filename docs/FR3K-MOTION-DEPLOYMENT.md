# FR3K motion identity — five uploaded animations

Source provenance: Five user-supplied MP4 files in the 2026-11-16 conversation: `1742.mp4`, `1743.mp4`, `1744.mp4`, `1746.mp4`, `1747.mp4`.

| Source | Brand treatment | Placement |
| --- | --- | --- |
| 1742.mp4 | Inferno (orange fiery field) | Loading sequence + first homepage card |
| 1743.mp4 | Cosmic (purple galaxies) | Homepage motion rail |
| 1744.mp4 | Plasma (violet electric) | Homepage motion rail |
| 1746.mp4 | Magma (molten lava field) | Homepage motion rail |
| 1747.mp4 | Storm (electric blue lightning) | Homepage motion rail |

Each source is 6 seconds, 540x720 portrait, 24fps. Original files were not directly suitable for universal browser playback because four used MPEG-4 Part 2 video, so we delivered H.264/yuv420p/faststart MP4s. Reproducible conversion:

```bash
ffmpeg -i 1742.mp4 -an -vf 'scale=540:720:flags=lanczos,format=yuv420p' -c:v libx264 -preset veryfast -crf 25 -movflags +faststart -r 24 assets/brand/fr3k-1742.mp4
ffmpeg -ss 2 -i assets/brand/fr3k-1742.mp4 -vf 'scale=400:533:flags=lanczos' -frames:v 1 -c:v libwebp -quality 75 assets/brand/fr3k-1742.webp
```

Repeat for 1743, 1744, 1746, 1747. Public files in `assets/brand/` are transcoded sources and corresponding still posters.

The ten previous experimental motion-effect previews and their bundled media have been removed from the active site. The prior three-card visual strip is also replaced, so the homepage uses exactly the five new clips.

Implementation: bounded/skip-enabled loading animation; lazy in-view playback for five homepage cards; offscreen/document-hidden pausing; manual pause/play; stills and immediate intro skip for reduced-motion preferences. The original conversation uploads remain the preservation source; this commit holds only web-ready media.
