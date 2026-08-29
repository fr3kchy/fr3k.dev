// Preloader
window.addEventListener('load', () => {
  const pre = document.getElementById('preloader');
  setTimeout(() => pre && pre.classList.add('done'), 1700);
});

// Year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

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
