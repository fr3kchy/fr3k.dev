const origin = "https://fr3k.dev";

export function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function metadata(path, title, description) {
  const forge = path === "/forge/";
  const image = forge ? "/assets/evidence/nightmare-cube.png" : "/assets/brand/field-lab-share.jpg";
  const alt = forge ? "Red cube from the measured Nightmare run" : "FR3K field lab emblem";
  return `<link rel="canonical" href="${origin}${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FR3K Field Lab">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${origin}${path}">
<meta property="og:image" content="${origin}${image}">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${origin}${image}">`;
}

export function navigation(path, main = "main-content") {
  const links = [["/projects/", "Projects"], ["/media", "Media"], ["/invest/", "Invest"], ["/#contact", "Contact"]];
  return `<a class="lab-skip" href="#${main}">Skip to content</a>
<nav class="lab-nav" aria-label="Primary"><div class="lab-bar"><a class="lab-brand" aria-label="FR3K Field Lab home" href="/">FR3K<span>/</span><b>FIELD LAB</b></a>
<div class="lab-links">${links.map(([href, name]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ""}>${name}</a>`).join("")}</div></div></nav>`;
}
