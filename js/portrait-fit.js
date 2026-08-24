(() => {
  const wrap = document.getElementById('portrait-wrap');
  if (!wrap) return;
  const textEl = document.getElementById('intro') || document.getElementById('about-intro');
  const mobileAboutLink = document.getElementById('mobile-about-link');

  const MIN_GUTTER = 50; // px, the requested minimum breathing room
  const PORTRAIT_WIDTH = 160; // px, matches the fixed size in CSS
  // #portrait-arc is deliberately 160% of the portrait, centered, so its own
  // text/paths can curve just outside the circle — that 30%-per-side
  // overflow is real *visible* content (the "ABOUT & CONTACT"/"HEY THERE!"
  // arcs), so the gutter has to be measured from there, not from the
  // plain photo's box, or the arc text visually eats into the "gutter".
  const ARC_OVERFLOW = PORTRAIT_WIDTH * 0.3;

  function update() {
    const isMobile = window.innerWidth < 768; // matches the site's existing breakpoint
    let noRoom = false;

    if (!isMobile && textEl) {
      const textRect = textEl.getBoundingClientRect();
      // Same 6vw right inset the layout already uses everywhere else.
      const rightBoundary = window.innerWidth - window.innerWidth * 0.06;
      const arcLeftEdge = rightBoundary - PORTRAIT_WIDTH - ARC_OVERFLOW;
      const gap = arcLeftEdge - textRect.right;
      noRoom = gap < MIN_GUTTER;
    }

    wrap.classList.toggle('no-room', !isMobile && noRoom);
    if (mobileAboutLink) mobileAboutLink.classList.toggle('show', isMobile || noRoom);
  }

  update();
  window.addEventListener('resize', update);
})();
