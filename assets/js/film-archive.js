"use strict";
(() => {
  const controls = [...document.querySelectorAll("[data-filter]")];
  const cards = [...document.querySelectorAll(".film-card[data-film-category]")];
  const status = document.querySelector("#filmCount");
  if (!controls.length || !cards.length || !status) return;
  const apply = value => {
    let visible = 0;
    for (const card of cards) {
      const show = value === "all" || card.dataset.filmCategory === value;
      card.hidden = !show;
      if (show) visible++;
      if (!show) {
        const video = card.querySelector("video");
        if (video && !video.paused) video.pause();
      }
    }
    for (const button of controls) {
      const selected = button.dataset.filter === value;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    status.textContent = "SHOWING " + visible + " OF " + cards.length + " FILMS";
  };
  for (const button of controls) {
    button.addEventListener("click", () => apply(button.dataset.filter));
  }
  apply("all");
})();
