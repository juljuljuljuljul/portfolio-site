// Click-and-drag horizontal scroll with momentum + edge cushion, shared by
// the homepage filmstrip and project detail pages. Desktop mouse/trackpad
// only — touch already gets native drag + momentum from the OS.
function attachDragScroll(viewport, track) {
  const canDrag = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canDrag) return;

  const FRICTION = 0.95; // per-frame velocity multiplier — "Natural"
  const CUSHION_MAX = 18; // px, cap on the end-of-glide give
  const CUSHION_STIFFNESS = 0.6;
  const CUSHION_TAU = 90; // ms, fast settle back to flush, no bounce

  let dragging = false;
  let dragMoved = false;
  let startX = 0;
  let startScrollLeft = 0;
  let lastT = 0;
  let velocity = 0; // px/ms, scrollLeft's own velocity
  let rafId = null;
  let cushion = 0; // signed px, visual-only give applied to the track transform

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  function rubberBand(x, maxPull, stiffness) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    return sign * (ax * maxPull * stiffness) / (maxPull + stiffness * ax);
  }

  function renderCushion() {
    track.style.transform = cushion === 0 ? '' : `translateX(${(-cushion).toFixed(2)}px)`;
  }

  function cancelMomentum() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  viewport.addEventListener('mousedown', (e) => {
    cancelMomentum();
    if (cushion !== 0) {
      cushion = 0;
      renderCushion();
    }
    dragging = true;
    dragMoved = false;
    startX = e.pageX;
    startScrollLeft = viewport.scrollLeft;
    lastT = performance.now();
    velocity = 0;
    viewport.classList.add('dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 3) dragMoved = true;
    const prevScrollLeft = viewport.scrollLeft;
    viewport.scrollLeft = startScrollLeft - dx;
    const dt = now - lastT;
    if (dt > 0) {
      const instV = (viewport.scrollLeft - prevScrollLeft) / dt;
      velocity = velocity * 0.7 + instV * 0.3;
    }
    lastT = now;
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('dragging');
    if (Math.abs(velocity) > 0.02) startMomentum();
  });

  viewport.addEventListener('click', (e) => {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  function startMomentum() {
    const max = viewport.scrollWidth - viewport.clientWidth;
    let v = velocity * 1000; // px/sec
    let last = performance.now();

    function step(now) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;

      if (cushion !== 0) {
        cushion *= Math.exp(-(dt * 1000) / CUSHION_TAU);
        if (Math.abs(cushion) < 0.4) {
          cushion = 0;
          renderCushion();
          rafId = null;
          return;
        }
        renderCushion();
        rafId = requestAnimationFrame(step);
        return;
      }

      const next = viewport.scrollLeft + v * dt;
      if (next <= 0 || next >= max) {
        viewport.scrollLeft = clamp(next, 0, max);
        const edgeSign = next <= 0 ? -1 : 1;
        const remainingSpeed = Math.abs(v); // px/sec, however fast it still was
        cushion = edgeSign * rubberBand(remainingSpeed * 0.05, CUSHION_MAX, CUSHION_STIFFNESS);
        renderCushion();
        rafId = requestAnimationFrame(step);
        return;
      }

      viewport.scrollLeft = next;
      v *= Math.pow(FRICTION, dt * 60);
      if (Math.abs(v) < 4) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }
}
