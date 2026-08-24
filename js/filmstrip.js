(() => {
  const viewport = document.getElementById('filmstrip');
  const track = document.getElementById('filmstrip-track');
  if (!viewport || !track) return;

  // Plain vertical mouse wheel moves this horizontal row (most mice have no
  // horizontal wheel). Trackpad horizontal input passes through untouched.
  viewport.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    viewport.scrollLeft += e.deltaY;
  }, { passive: false });

  attachDragScroll(viewport, track);
})();
