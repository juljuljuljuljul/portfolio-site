(() => {
  // Desktop-only (same gate used elsewhere in this project) — touch devices
  // have no persistent cursor to replace.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const glow = document.createElement('div');
  glow.id = 'cursor-glow';
  document.body.appendChild(glow);
  document.documentElement.classList.add('custom-cursor');

  window.addEventListener('mousemove', (e) => {
    glow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
  });

  // Swap to a normal pointer (and hide the glow) over anything clickable —
  // the native cursor is a clearer "this is a link/button" cue than the
  // glow, which is purely decorative everywhere else.
  const CLICKABLE = 'a, button, [role="button"], input, textarea, select, label';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(CLICKABLE)) document.documentElement.classList.add('cursor-clickable');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(CLICKABLE)) document.documentElement.classList.remove('cursor-clickable');
  });
})();
