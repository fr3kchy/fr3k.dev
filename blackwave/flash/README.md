# BLACKWAVE // Deployment Terminal

A browser-based firmware flasher for the BLACKWAVE distributed physical-computing
fleet. Local-first, evidence-bound. No silent uploads, no fabricated success.

## Phase status

- **A (this build):** app shell, cyberpunk design system, device selector for
  11 contract targets + Pi 500 infrastructure, evidence chips from
  `the private evidence dossier`, manifest viewer, recovery/safety copy,
  PWA shell, advanced serial terminal stub, evidence-record export template.
- **B (not in this build):** real WebSerial/WebUSB/WebHID detection probes,
  `device_match_score` confidence model, AMBIGUOUS gate.
- **C (not in this build):** per-device flash flows (ESP32-S3 reference path
  via esptool-js, nRF52840 UF2/DFU, K230 SD image), backup centers.
- **D (not in this build):** post-flash validation wizard, OTA flow, real
  partition map rendering, signature verification.

All flash actions in this build are simulated buttons (`disabled`). Real
flashing arrives only after a unit has been physically validated against the
artifact hash and recorded in `docs/research/`.

## Source model

Single source = the private BLACKWAVE source repository's flash data module
(device definitions, evidence states, recovery scenarios and never-modify
list) plus its manifest generator. Private repository paths and unit identities
are intentionally not published.

The HTML rendered here is generated from the reviewed public manifest projection.
To regenerate after a research update, use the authorised private build
workspace and the controlled website publishing workflow.
