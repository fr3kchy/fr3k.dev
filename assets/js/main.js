// Preloader
window.addEventListener('load', () => {
  const pre = document.getElementById('preloader');
  setTimeout(() => pre && pre.classList.add('done'), 1700);
});

// Year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// No simulated live metrics. Show unavailable until connected to a verified source.
(function(){
  const dot=document.getElementById('nodeDot');
  if(dot){dot.style.background='#888';dot.title='Live telemetry not connected';}
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
