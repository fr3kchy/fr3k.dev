/* FR3K motion rail: load only in-view clips, pause when hidden, honour user pause and reduced-motion settings. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = [...document.querySelectorAll('.fr3k-motion-card')];
  if (reduced) return;
  const play = (video) => {
    if (document.hidden || video.dataset.userPaused === 'true') return;
    if (!video.dataset.loaded) {
      const src = video.dataset.fr3kSrc;
      if (!src) return;
      const el = document.createElement('source');
      el.src = src; el.type = 'video/mp4'; video.append(el);
      video.dataset.loaded = 'true';
      video.load();
    }
    video.play().catch(() => {});
  };
  const watch = ('IntersectionObserver' in window) ?
    new IntersectionObserver((entries) => {
      entries.forEach(({target, isIntersecting}) => {
        target.dataset.visible = String(isIntersecting);
        if (isIntersecting) play(target);
        else target.pause();
      });
    }, {threshold: .15, rootMargin: '90px'}) : null;
  cards.forEach((card) => {
    const video = card.querySelector('video');
    const button = card.querySelector('.fr3k-motion-toggle');
    if (!video) return;
    if (watch) watch.observe(video); else {video.dataset.visible = 'true'; play(video);}
    if (button) button.addEventListener('click', () => {
      const paused = video.dataset.userPaused !== 'true';
      video.dataset.userPaused = String(paused);
      if (paused) video.pause();
      else if (video.dataset.visible === 'true') play(video);
      button.textContent = paused ? 'PLAY' : 'PAUSE';
      button.setAttribute('aria-label', (paused ? 'Play ' : 'Pause ') + card.dataset.identity + ' animation');
      button.setAttribute('aria-pressed', String(paused));
    });
  });
  document.addEventListener('visibilitychange', () => {
    cards.forEach((card) => {
      const video = card.querySelector('video');
      if (!video) return;
      if (document.hidden) video.pause();
      else if (video.dataset.visible === 'true') play(video);
    });
  });
})();
