(() => {
  const menu = document.getElementById('project-menu');
  if (!menu || typeof PROJECT_ORDER === 'undefined') return;

  const match = location.pathname.match(/\/projects\/([^/]+)\//);
  const slug = match ? decodeURIComponent(match[1]) : null;
  const idx = PROJECT_ORDER.indexOf(slug);
  if (idx === -1) return;

  if (idx > 0) {
    const a = document.createElement('a');
    a.href = `../${PROJECT_ORDER[idx - 1]}/index.html`;
    a.textContent = 'Prev';
    menu.appendChild(a);
  }

  if (idx < PROJECT_ORDER.length - 1) {
    const a = document.createElement('a');
    a.href = `../${PROJECT_ORDER[idx + 1]}/index.html`;
    a.textContent = 'Next';
    menu.appendChild(a);
  }

  // Mobile-only native share button — hidden on desktop via CSS regardless,
  // but also skipped entirely here if the browser has no Web Share API
  // (mainly older Android browsers) so there's never a dead button.
  if (navigator.share) {
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.id = 'project-share';
    shareBtn.setAttribute('aria-label', 'Share');
    shareBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 3 L12 14" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>' +
      '<path d="M8 7 L12 3 L16 7" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M5 11 v7 a2 2 0 0 0 2 2 h10 a2 2 0 0 0 2-2 v-7" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    shareBtn.addEventListener('click', () => {
      navigator.share({ title: document.title, url: location.href }).catch(() => {});
    });
    menu.appendChild(shareBtn);
  }
})();
