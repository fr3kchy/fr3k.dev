#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { esc, metadata, navigation } from "./site-layout.mjs";
import { fieldExample } from "./field-examples.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(ROOT, "data/flagships/catalog.json"), "utf8"));

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
${metadata("/" + p.route + "/", p.name + " | FR3K Field Lab", p.summary)}
<link rel="stylesheet" href="/assets/css/flagships.css">
<link rel="stylesheet" href="/assets/css/lab.css">
<style>:root{--accent:${esc(p.accent || "#54f3c6")}}</style>
<script defer src="/assets/js/flagship-status.js"></script>
</head>
<body data-flagship-id="${esc(p.id)}">
${navigation("/" + p.route + "/")}
<main id="main-content">
<header class="hero shell"><div>
<a class="eyebrow" href="/projects/">Flagship register</a>
<h1>${esc(p.name)}</h1>
<p class="product-subtitle">${esc(p.headline)}</p>
<p class="lead">${esc(p.summary)}</p>
<div class="actions">${["forge","operations","fleet"].includes(p.id) ? `<a class="btn primary" href="#field-example">${{forge:"Inspect the render",operations:"Walk through a shift",fleet:"Read a sample receipt"}[p.id]}</a>` : ""}<a class="btn" href="#status">Status</a><a class="btn" href="#capabilities">Capabilities</a>${publicRepo}${links}</div>
</div></header>
${fieldExample(p)}
<section id="status" class="section status-section"><div class="shell">
<div class="eyebrow">Evidence feed // auto-reconciled</div><h2>System status</h2>
<div class="status-dashboard" data-flagship-status>
  <div class="status-summary"><span class="state-chip">${esc(p.readiness.label)}</span><p>${esc(p.readiness.detail)}</p></div>
  <p class="status-loading">Source and runtime observations appear here when available.</p>
</div>
<p class="status-footnote">Repository, CI, review and runtime signals are checked every 15 minutes. This feed does not promote a commit into a verified capability or a running process into a successful outcome.</p>
</div></section>
<section id="capabilities" class="section"><div class="shell">
<div class="eyebrow">Capability register</div><h2>Capabilities</h2>
<div class="features">${p.capabilities.map(capabilityCard).join("")}</div>
</div></section>
<section class="section"><div class="shell">
<div class="eyebrow">Proof ledger</div><h2>Evidence on record</h2>
<div class="evidence-list">${(p.evidence || []).map(evidenceCard).join("")}</div>
</div></section>
<section class="section"><div class="shell">
<div class="eyebrow">Boundaries and open gates</div><h2>Open questions</h2>
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
  const description = "Browse workforce software, device operations, local AI and field hardware, with evidence and acceptance criteria for each project.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Project register | FR3K Field Lab</title><meta name="description" content="${description}">
${metadata("/projects/", "Project register | FR3K Field Lab", description)}
<link rel="stylesheet" href="/assets/css/flagships.css"><link rel="stylesheet" href="/assets/css/lab.css">
<script defer src="/assets/js/flagship-status.js"></script></head><body>
${navigation("/projects/")}
<main id="main-content" class="shell"><header class="indexhero"><div class="eyebrow">Engineering portfolio</div>
<h1>Project register</h1><p class="lead">${catalog.projects.length} systems. Explore the implementation, inspect the evidence and see what each project needs to demonstrate next.</p>
<p class="index-status-note" data-portfolio-status>Curated capability register</p></header>
<section class="section" aria-label="Flagship projects"><div class="cards">${cards}</div></section></main>
<footer class="foot"><div class="shell">Percentages count independently verified capability gates. <a href="/#contact">Contact the lab</a></div></footer></body></html>
`;
}

const checking = process.argv.includes("--check");
function output(path, content) {
  const file = join(ROOT, path);
  if (checking) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== content) {
      throw new Error("Generated file differs: " + path);
    }
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}

for (const project of catalog.projects) {
  if (project.id !== "blackwave") output(project.route + "/index.html", projectPage(project));
}
output("projects/index.html", projectsIndex());
const routes = new Set(["/", "/media", "/projects/", "/invest/", ...catalog.projects.map(p => "/" + p.route + "/")]);
for (const entry of readdirSync(join(ROOT, "blackwave"), {withFileTypes:true})) {
  if (entry.isDirectory() && existsSync(join(ROOT, "blackwave", entry.name, "index.html"))) {
    routes.add("/blackwave/" + entry.name + "/");
  }
}
output("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...routes].sort().map(path => `  <url><loc>https://fr3k.dev${path}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`${checking ? "Checked" : "Rendered"} ${catalog.projects.length - 1} product pages, project register and ${routes.size} sitemap entries.`);
