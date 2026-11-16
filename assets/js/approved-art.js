(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const videos = Array.from(document.querySelectorAll('[data-fr3k-src]'));
  const activate = (video) => {
    if (!video.dataset.loaded) {
      const source = document.createElement('source');
      source.src = video.dataset.fr3kSrc;
      source.type = 'video/mp4';
      video.append(source);
      video.dataset.loaded = '1';
      video.load();
    }
    video.play().catch(() => {});
  };

  if (!('IntersectionObserver' in window)) {
    videos.forEach(activate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) activate(entry.target);
      else entry.target.pause();
    }
  }, { rootMargin: '150px' });

  videos.forEach((video) => observer.observe(video));
})();
