import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const site = new URL("../", import.meta.url);

// The operator approved this single public run and its exact image. Reject
// additional receipt fields rather than publishing unknown device metadata.
const approved = {
  date: "2026-11-19",
  device: "RedMagic 11S Pro",
  workload: "Single text-to-image generation",
  renderer: "Nightmare 1.6.307",
  model: "absolutereality",
  prompt: "A red cube on a matte black background, studio product photograph",
  seed: 42,
  steps: 8,
  width: 512,
  height: 512,
  run_response_seconds: 4.627,
  elapsed_including_fetch_seconds: 4.913,
  image: "/assets/evidence/nightmare-cube.png",
  png_sha256: "785f9caeb5d49f917be197084f16a2f542fa55248104975136ca9b8b76226c3f",
  scope: "One measured result through the installed Nightmare API. Timing includes receipt on the host. The Forge UI path is separately qualified."
};

export function validateForgeEvidence() {
  const record = JSON.parse(readFileSync(new URL("data/evidence/nightmare-redmagic.json", site), "utf8"));
  assert.deepEqual(record, approved, "Forge receipt differs from the reviewed public record");
  const png = readFileSync(new URL(record.image.slice(1), site));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "Invalid PNG signature");
  assert.equal(png.toString("ascii", 12, 16), "IHDR", "Missing PNG header");
  assert.equal(png.readUInt32BE(16), record.width, "Width disagrees with receipt");
  assert.equal(png.readUInt32BE(20), record.height, "Height disagrees with receipt");
  assert.equal(createHash("sha256").update(png).digest("hex"), record.png_sha256, "Image digest disagrees with receipt");
  return record;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const record = validateForgeEvidence();
  console.log(`Forge receipt verified against approved record and PNG (${record.width} × ${record.height}, SHA-256 ${record.png_sha256}).`);
}
