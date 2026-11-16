// FR3K loading sequence: visible user-supplied video with an explicit skip and bounded timeout.
(() => {
  const pre = document.getElementById('preloader');
  if (!pre) return;
  const video = pre.querySelector('video.fr3k-intro-art');
  const skip = pre.querySelector('.fr3k-skip');
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    pre.classList.add('done');
    video?.pause();
  };
  skip?.addEventListener('click', finish);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
    return;
  }
  video?.addEventListener('ended', () => setTimeout(finish, 150), {once: true});
  video?.addEventListener('error', () => setTimeout(finish, 900), {once: true});
  // Never strand a visitor behind a loading animation.
  setTimeout(finish, 6600);
  window.addEventListener('load', () => {
    video?.play().catch(() => setTimeout(finish, 1000));
  }, {once: true});
})();

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
