#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(ROOT, "data/flagships/catalog.json"), "utf8"));

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
function slug(value = "") {
  return String(value).toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function capabilityCard(c) {
  return `<article class="tile capability-card" data-capability-id="${esc(slug(c.name))}">
    <div class="capability-card__top"><b>${esc(c.name)}</b><span class="state-chip" data-capability-state>${esc(c.state)}</span></div>
    <p>${esc(c.description)}</p>
    <p class="capability-evidence"><strong>Evidence:</strong> ${esc(c.evidence)}</p>
  </article>`;
}
function evidenceCard(e) {
  return `<article class="evidence-item"><span class="state-chip state-chip--${esc(e.state)}">${esc(e.state)}</span><div><strong>${esc(e.label)}</strong><p>${esc(e.value)}</p></div></article>`;
}
function projectPage(p) {
  const links = (p.links || []).filter(x => x.url !== p.source?.repoUrl).map(x => `<a class="btn" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} ↗</a>`).join("");
  const publicRepo = p.source?.visibility === "public" && p.source?.repoUrl
    ? `<a class="btn" href="${esc(p.source.repoUrl)}" target="_blank" rel="noopener noreferrer">Source repository ↗</a>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#080b13">
<title>${esc(p.name)} | fR3k.dev</title>
<meta name="description" content="${esc(p.summary)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/flagships.css">
<style>:root{--accent:${esc(p.accent || "#54f3c6")}}</style>
<script defer src="/assets/js/flagship-status.js"></script>
</head>
<body data-flagship-id="${esc(p.id)}">
<nav class="nav shell"><a class="brand" href="/">fR3k<span>.</span>DEV</a><div class="navlinks"><a href="/projects/">All projects</a><a href="/#contact">Contact</a></div></nav>
<main>
<section class="hero shell"><div>
<div class="eyebrow">fR3k flagship / ${esc(p.category)}</div>
<h1>${esc(p.headline)}</h1>
<p class="lead">${esc(p.summary)}</p>
<div class="actions"><a class="btn primary" href="#status">Inspect live status ↓</a><a class="btn" href="#capabilities">Capabilities ↓</a>${publicRepo}${links}</div>
</div></section>
<section id="status" class="section status-section"><div class="shell">
<div class="eyebrow">Evidence feed // auto-reconciled</div><h2>What exists. What is running. What remains open.</h2>
<div class="status-dashboard" data-flagship-status>
  <div class="status-summary"><span class="state-chip">${esc(p.readiness.label)}</span><p>${esc(p.readiness.detail)}</p></div>
  <p class="status-loading">Loading the latest source and runtime snapshot…</p>
</div>
<p class="status-footnote">Repository, CI, review and runtime signals are checked every 15 minutes. This feed does not promote a commit into a verified capability or a running process into a successful outcome.</p>
</div></section>
<section id="capabilities" class="section"><div class="shell">
<div class="eyebrow">Capability register</div><h2>What the system can actually do.</h2>
<div class="features">${p.capabilities.map(capabilityCard).join("")}</div>
</div></section>
<section class="section"><div class="shell">
<div class="eyebrow">Proof ledger</div><h2>Current evidence and acceptance state.</h2>
<div class="evidence-list">${(p.evidence || []).map(evidenceCard).join("")}</div>
</div></section>
<section class="section"><div class="shell">
<div class="eyebrow">Boundaries and open gates</div><h2>What we will not pretend is finished.</h2>
<ul class="boundary-list">${(p.boundaries || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
<div class="next-gate"><span class="eyebrow">NEXT ACCEPTANCE GATE</span><p>${esc(p.nextGate || "No next gate recorded.")}</p></div>
<div class="actions"><a class="btn primary" href="mailto:fr3k@fr3k.dev?subject=${encodeURIComponent(p.name + " technical discussion")}">Discuss this system</a><a class="btn" href="/projects/">Back to all flagships</a></div>
</div></section>
</main>
<footer class="foot"><div class="shell">© fR3k · Evidence before claims · <a href="mailto:fr3k@fr3k.dev">fr3k@fr3k.dev</a></div></footer>
</body></html>
`;
}
function projectsIndex() {
  const cards = catalog.projects.map(p => `<a class="tile product-card" href="/${esc(p.route)}/" data-flagship-card="${esc(p.id)}">
    <small>${esc(p.category)}</small><h2>${esc(p.name)}</h2><p>${esc(p.summary)}</p>
    <span class="state-chip" data-flagship-card-state>${esc(p.readiness.label)}</span>
    <strong>Inspect product ↗</strong></a>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flagship systems | fR3k.dev</title><meta name="description" content="FR3K flagship systems with live evidence-backed progress, capabilities and acceptance gates."><link rel="stylesheet" href="/assets/css/flagships.css"><style>:root{--accent:#22d3ee}</style><script defer src="/assets/js/flagship-status.js"></script></head><body><nav class="nav shell"><a class="brand" href="/">fR3k.DEV</a><div class="navlinks"><a href="/">Home</a><a href="/#contact">Contact</a></div></nav><main class="shell"><section class="indexhero"><div class="eyebrow">The fR3k portfolio / live product register</div><h1>Ideas with teeth.<br>Engineering with proof.</h1><p class="lead">Sixteen systems across AI, hardware, workforce, communications and creative technology. Every page distinguishes implemented capabilities from verified behaviour, active work and open gates.</p><div class="index-status-note" data-portfolio-status>Loading latest status snapshot…</div></section><section class="section"><div class="cards">${cards}</div></section></main><footer class="foot"><div class="shell">Status checks run every 15 minutes on the authorised Omarchy collector. No percentage-complete estimates are published.</div></footer></body></html>`;
}

for (const p of catalog.projects) {
  if (p.id === "blackwave") continue; // Preserve the bespoke BLACKWAV3 field-lab page.
  const dir = join(ROOT, p.route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), projectPage(p));
}
writeFileSync(join(ROOT, "projects/index.html"), projectsIndex());
console.log(`Rendered ${catalog.projects.length - 1} product pages and portfolio index.`);
