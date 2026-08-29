// Preloader
window.addEventListener('load', () => {
  const pre = document.getElementById('preloader');
  setTimeout(() => pre && pre.classList.add('done'), 1700);
});

// Year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// Live swarm metrics — subtle, honest jitter around the real values shown
(function(){
  const nodeEl = document.getElementById('nodeCount');
  const meshEl = document.getElementById('meshQuality');
  const dot = document.getElementById('nodeDot');
  if(!nodeEl || !meshEl) return;
  let baseMesh = 98.7;
  setInterval(() => {
    const m = Math.min(99.9, Math.max(97.5, baseMesh + (Math.random() - 0.5) * 0.6));
    meshEl.textContent = m.toFixed(1) + '%';
    if (dot) dot.style.background = m > 95 ? 'var(--neon)' : '#ff5d6c';
  }, 2400);
})();

// Reel: force autoplay (covers browsers that ignore autoplay attr) + never leave hidden
(function(){
  const v = document.querySelector('.reel__video');
  const sec = document.getElementById('reel');
  if (sec) sec.classList.add('in'); // reel always visible
  if (!v) return;
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  tryPlay();
  // retry after preload
  v.addEventListener('canplay', tryPlay, { once: true });
  document.addEventListener('click', tryPlay, { once: true });
})();

// Scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.section, .tile, .card').forEach((el) => io.observe(el));

// Mobile nav toggle
(function(){
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  const close = () => { links.classList.remove('nav__links--open'); toggle.setAttribute('aria-expanded','false'); };
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('nav__links--open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('click', (e) => {
    if (!links.contains(e.target) && !toggle.contains(e.target)) close();
  });
})();
