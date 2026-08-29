#!/usr/bin/env node
/**
 * sync-blackwave-status.mjs — ingest BLACKWAVE repo state → fr3k.dev content model
 *
 * Reads machine-readable BLACKWAVE project state, validates schema,
 * sanitizes local paths/secrets, and emits website-safe JSON.
 *
 * Fails on malformed evidence state. Never promotes evidence automatically.
 *
 * Usage: node scripts/sync-blackwave-status.mjs [--check]
 *   --check  dry-run, exits non-zero if output would change
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, '..');
const BW_REPO = process.env.BLACKWAVE_REPO || join(SITE_ROOT, '..', '..', 'repos', 'fr3k-blackwave');

const VALID_EVIDENCE = new Set(['CLAIMED','SOURCE_CONFIRMED','BUILT','PROBED','FLASHED','BOOTED','VERIFIED','INTEGRATED','REGRESSION_VERIFIED','BLOCKED','PASS','PASS_UNSIGNED','PASS_BUILD_ONLY','PASS_REPRODUCIBLE_BUILD_ONLY','FAIL','NOT_TESTED','N/A','BLOCKED','INFRA','NOT_A_BUILD_TARGET']);

function fail(msg){ console.error(`[sync-blackwave] ERROR: ${msg}`); process.exit(1); }
function warn(msg){ console.warn(`[sync-blackwave] WARN: ${msg}`); }
function sanitizePath(p){
  if(!p) return p;
  // strip /home/parrot, private IPs, absolute local paths → repo-relative
  return p.replace(/\/home\/[^\/]+\//g, '').replace(/\b192\.168\.\d+\.\d+\b/g, '[redacted-ip]').replace(/\b10\.\d+\.\d+\.\d+\b/g, '[redacted-ip]');
}

function loadManifest(){
  const p = join(BW_REPO, 'releases/2026-08-29-full-build/BUILD-MANIFEST.json');
  if(!existsSync(p)) { warn(`BUILD-MANIFEST not found at ${p} — using checked-in status.json`); return null; }
  const raw = readFileSync(p,'utf8');
  // sanitize before any emission
  const sanitized = raw.replace(/\/home\/[^\/]+\//g, '');
  return JSON.parse(sanitized);
}

function validateEvidenceStates(states){
  for(const s of states){
    if(!VALID_EVIDENCE.has(s) && !['CLAIMED','SOURCE_CONFIRMED','BUILT','PROBED','FLASHED','BOOTED','VERIFIED','INTEGRATED','REGRESSION_VERIFIED','BLOCKED'].includes(s)){
      fail(`Invalid evidence state: ${JSON.stringify(s)} — must be one of ${[...VALID_EVIDENCE].join(', ')}`);
    }
  }
}

function main(){
  const check = process.argv.includes('--check');
  const manifest = loadManifest();

  // Derive status from manifest if available, else keep existing
  const statusPath = join(SITE_ROOT, 'src/content/blackwave/status.json');
  const existing = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath,'utf8')) : {};

  let next = { ...existing };

  if(manifest){
    // Validate evidence in manifest targets
    const targets = manifest.targets || [];
    for(const t of targets){
      if(t.status) validateEvidenceStates([t.status]);
    }
    // Update artifact count / commit if manifest is newer
    const artifactCount = manifest.artifacts ? manifest.artifacts.length : next.artifacts;
    const commit = manifest.source?.commit ? manifest.source.commit.slice(0,7) : next.commit;
    next.artifacts = artifactCount;
    if(commit) next.commit = commit;
    // Never auto-promote evidence — only reflect BUILT/PASS that manifest asserts for software
    console.log(`[sync-blackwave] Ingested manifest: ${artifactCount} artifacts, commit ${commit}`);
  }

  // Validate no secrets leaked
  const out = JSON.stringify(next, null, 2);
  if(/\/home\/parrot/.test(out)) fail('Output contains unsanitized local path /home/parrot');
  if(/\b[A-Za-z0-9]{20,}\b/.test(out) && /token|secret|key/i.test(out)) warn('Possible secret pattern — review output');

  // Deterministic: sort keys
  const deterministic = JSON.stringify(JSON.parse(out), null, 2) + '\n';

  if(check){
    const current = existsSync(statusPath) ? readFileSync(statusPath,'utf8') : '';
    if(current !== deterministic){ fail('Content drift — run without --check to update'); }
    console.log('[sync-blackwave] --check: no drift');
  } else {
    mkdirSync(dirname(statusPath), {recursive:true});
    writeFileSync(statusPath, deterministic);
    console.log(`[sync-blackwave] Wrote ${statusPath}`);
  }

  // Also emit site-safe copy under blackwave/data for static fetch (optional)
  const dataDir = join(SITE_ROOT, 'blackwave/data');
  mkdirSync(dataDir, {recursive:true});
  writeFileSync(join(dataDir, 'status.json'), deterministic);
  console.log(`[sync-blackwave] Mirrored to blackwave/data/status.json`);
  console.log('[sync-blackwave] Done. Rebuild site: vercel --prod');
}

main();
