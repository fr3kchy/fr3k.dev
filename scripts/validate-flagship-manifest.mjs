#!/usr/bin/env node
/**
 * Validate a source repository's FR3K capability evidence manifest.
 * This validator checks provenance pointers and status vocabulary only.
 * It does not execute tests or promote source claims to VERIFIED FACT.
 */
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

const manifestPath = ".fr3k/flagship-status.json";
const projectId = process.env.FR3K_PROJECT_ID || "";
const expectedRaw = process.env.FR3K_CAPABILITY_IDS || "[]";
const states = new Set([
  "implemented", "in-development", "source-reported", "planned",
  "not-tested", "not-implemented", "blocked", "not-deployed", "not-in-scope"
]);
const evidenceTypes = new Set([
  "source", "test", "documentation", "workflow", "artifact",
  "acceptance", "runtime", "hardware", "roadmap"
]);

function fail(message) {
  console.error(`[fr3k-capability-contract] FAIL: ${message}`);
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectId)) {
  fail("FR3K_PROJECT_ID must be a lowercase project slug.");
}

let expectedIds;
try {
  expectedIds = JSON.parse(expectedRaw);
} catch {
  fail("FR3K_CAPABILITY_IDS must be a JSON array.");
}
if (!Array.isArray(expectedIds) || expectedIds.length === 0 ||
    expectedIds.some(id => typeof id !== "string") ||
    new Set(expectedIds).size !== expectedIds.length) {
  fail("FR3K_CAPABILITY_IDS must be a non-empty array of unique strings.");
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`Cannot read ${manifestPath}: ${error.message}`);
}
if (manifest.schemaVersion !== 1) fail("schemaVersion must equal 1.");
if (manifest.projectId !== projectId) fail(`projectId must equal ${projectId}.`);
if (typeof manifest.updatedAt !== "string" || !Number.isFinite(Date.parse(manifest.updatedAt))) {
  fail("updatedAt must be a valid ISO-8601 timestamp.");
}
if (!Array.isArray(manifest.capabilities)) fail("capabilities must be an array.");

const seen = new Set();
const root = resolve(".");
for (const item of manifest.capabilities) {
  if (!item || typeof item !== "object") fail("Each capability must be an object.");
  const id = item.id;
  if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    fail("Every capability id must be a lowercase kebab-case slug.");
  }
  if (seen.has(id)) fail(`Duplicate capability id: ${id}`);
  seen.add(id);
  if (!states.has(item.state)) fail(`${id}: unsupported source state ${String(item.state)}.`);
  if (item.state === "verified") fail(`${id}: source manifests cannot declare verified.`);
  if (!Array.isArray(item.evidence) || item.evidence.length === 0) {
    fail(`${id}: at least one evidence reference is required.`);
  }
  for (const evidence of item.evidence) {
    if (!evidence || typeof evidence !== "object") fail(`${id}: evidence entries must be objects.`);
    if (!evidenceTypes.has(evidence.type)) fail(`${id}: unsupported evidence type ${String(evidence.type)}.`);
    const ref = evidence.ref;
    if (typeof ref !== "string" || !ref || ref.includes("\\") || isAbsolute(ref) ||
        ref.split("/").some(part => !part || part === "." || part === "..") ||
        ref.includes("?") || ref.includes("#")) {
      fail(`${id}: evidence ref must be a safe repository-relative file path.`);
    }
    const absolute = resolve(root, ref);
    const rel = relative(root, absolute);
    if (!rel || rel.startsWith(`..${sep}`) || rel === "..") {
      fail(`${id}: evidence ref escapes the repository: ${ref}`);
    }
    let stat;
    try { stat = lstatSync(absolute); } catch { fail(`${id}: evidence file does not exist: ${ref}`); }
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${id}: evidence ref must point to a regular, non-symlink file: ${ref}`);
    if (typeof evidence.note !== "string" || evidence.note.trim().length < 8 || evidence.note.length > 300) {
      fail(`${id}: every evidence reference needs a concise note (8–300 characters).`);
    }
  }
}

const missing = expectedIds.filter(id => !seen.has(id));
const unexpected = [...seen].filter(id => !expectedIds.includes(id));
if (missing.length || unexpected.length) {
  fail(`Capability set mismatch. Missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}.`);
}

console.log(`[fr3k-capability-contract] PASS: ${projectId} · ${seen.size} capabilities · ${manifest.capabilities.reduce((n, c) => n + c.evidence.length, 0)} evidence pointers`);
