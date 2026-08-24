(() => {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const viewport = document.getElementById('lightbox-viewport');
  const track = document.getElementById('lightbox-track');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const dotsEl = document.getElementById('lightbox-dots');
  const slides = [...track.querySelectorAll('.lightbox-slide')];
  const slideImgs = slides.map((s) => s.querySelector('img'));

  let images = [];
  let index = 0;
  let isOpen = false;

  function wrap(i) {
    return (i + images.length) % images.length;
  }

  function renderSlides() {
    slideImgs[0].src = images[wrap(index - 1)];
    slideImgs[1].src = images[index];
    slideImgs[2].src = images[wrap(index + 1)];
    slideImgs[1].alt = `Image ${index + 1} of ${images.length}`;
  }

  function updateDots() {
    if (!dotsEl) return;
    dotsEl.querySelectorAll('.lightbox-dot').forEach((dot, i) => {
      dot.classList.toggle('current', i === index);
    });
  }

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    images.forEach(() => {
      const dot = document.createElement('span');
      dot.className = 'lightbox-dot';
      dotsEl.appendChild(dot);
    });
  }

  // Gentle, slow-settling ease-out — a longer, softer deceleration than a
  // plain "ease" curve, so the completed slide (or the spring-back) doesn't
  // feel stiff/abrupt.
  const SLIDE_TRANSITION = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';

  function setTrackX(px, withTransition) {
    track.style.transition = withTransition ? SLIDE_TRANSITION : 'none';
    track.style.transform = `translateX(${px}px)`;
  }

  function centerTrack(withTransition) {
    setTrackX(-viewport.clientWidth, withTransition);
  }

  function goTo(newIndex) {
    index = wrap(newIndex);
    renderSlides();
    updateDots();
    centerTrack(false);
    // Keyboard/arrow-button nav can swap the image without the mouse ever
    // leaving it, which would otherwise carry a zoomed-in transform over
    // onto the new image. No transition here — it should just already be
    // reset by the time the new image is visible, not visibly un-zoom.
    if (zoomed) {
      zoomed = false;
      slideImgs[1].classList.remove('zoomed-in');
      slideImgs[1].style.transition = 'none';
      slideImgs[1].style.transform = '';
      slideImgs[1].style.transformOrigin = '';
    }
  }

  function open(list, startIndex) {
    images = list;
    index = startIndex;
    isOpen = true;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    buildDots();
    renderSlides();
    updateDots();
    centerTrack(false);
  }

  function close() {
    isOpen = false;
    lightbox.classList.remove('open');
    lightbox.classList.remove('video-mode');
    lightbox.setAttribute('aria-hidden', 'true');
    if (videoContainer) videoContainer.innerHTML = ''; // stop playback
  }

  // --- Video mode: mobile's stand-in for an inline 16:9 embed (see
  // js/project.js) opens the real video here instead, where it can size
  // itself to whatever the viewport actually allows rather than being
  // clipped by a fixed-height row. Built on demand — no per-page markup
  // needed, unlike the image slides which are already in each page's HTML. ---
  let videoContainer = null;

  function ensureVideoContainer() {
    if (videoContainer) return videoContainer;
    videoContainer = document.createElement('div');
    videoContainer.id = 'lightbox-video';
    lightbox.appendChild(videoContainer);
    return videoContainer;
  }

  function openVideo(videoId, title, vertical) {
    isOpen = true;
    lightbox.classList.add('open');
    lightbox.classList.add('video-mode');
    lightbox.setAttribute('aria-hidden', 'false');

    const container = ensureVideoContainer();
    container.className = vertical ? 'lightbox-video--vertical' : '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&autoplay=1`;
    iframe.title = title || 'Project video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.frameBorder = '0';
    container.innerHTML = '';
    container.appendChild(iframe);
  }

  function animateTo(targetX, onComplete) {
    setTrackX(targetX, true);
    const onEnd = () => {
      track.removeEventListener('transitionend', onEnd);
      if (onComplete) onComplete();
    };
    track.addEventListener('transitionend', onEnd);
  }

  function slideNext() {
    animateTo(-viewport.clientWidth * 2, () => goTo(index + 1));
  }

  function slidePrev() {
    animateTo(0, () => goTo(index - 1));
  }

  // --- Desktop-only: a short fade+drift crossfade instead of the full
  // track-width slide above. The full-viewport travel felt like "too much"
  // on desktop (chevron/arrow-key nav, or a completed mouse-drag) — swipe on
  // mobile stays exactly as built, this only replaces the desktop path. ---
  const isDesktop = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const FADE_MS = 350;
  const FADE_DISTANCE = 20; // % of the image's own width
  let fading = false;

  function desktopFade(direction) {
    if (fading) return;
    fading = true;
    const img = slideImgs[1];
    img.style.transformOrigin = '';
    img.style.transition = `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`;
    img.style.transform = `translateX(${-direction * FADE_DISTANCE}%)`;
    img.style.opacity = '0';

    const onOut = () => {
      img.removeEventListener('transitionend', onOut);
      goTo(index + direction);

      // Place the (now-new) image at the mirrored start offset with no
      // transition, force a reflow so the browser commits that frame, then
      // animate it in — the standard "FLIP" trick for a from/to transition.
      img.style.transition = 'none';
      img.style.transform = `translateX(${direction * FADE_DISTANCE}%)`;
      img.style.opacity = '0';
      void img.offsetWidth;

      img.style.transition = `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`;
      img.style.transform = 'translateX(0)';
      img.style.opacity = '1';

      const onIn = () => {
        img.removeEventListener('transitionend', onIn);
        img.style.transition = '';
        img.style.transform = '';
        img.style.opacity = '';
        fading = false;
      };
      img.addEventListener('transitionend', onIn);
    };
    img.addEventListener('transitionend', onOut);
  }

  function goNext() {
    if (isDesktop()) desktopFade(1);
    else slideNext();
  }

  function goPrev() {
    if (isDesktop()) desktopFade(-1);
    else slidePrev();
  }

  // --- Desktop-only: click-to-zoom on the current image, magnifying toward
  // wherever was clicked. Used to trigger on hover, but entering/leaving the
  // image on every mouse pass over it made the transform fire constantly —
  // a click is a deliberate, stable toggle instead. While zoomed, moving the
  // mouse still pans toward the cursor; clicking again (or leaving the
  // image) zooms back out. ---
  const ZOOM_SCALE = 1.8;
  let zoomed = false;

  function setZoomOrigin(e) {
    const rect = slideImgs[1].getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    slideImgs[1].style.transformOrigin = `${x}% ${y}%`;
  }

  function zoomOut() {
    if (!zoomed) return;
    zoomed = false;
    slideImgs[1].classList.remove('zoomed-in');
    slideImgs[1].style.transition = 'transform 0.35s ease';
    slideImgs[1].style.transform = '';
    slideImgs[1].style.transformOrigin = '';
  }

  slideImgs[1].addEventListener('click', (e) => {
    if (!isDesktop() || fading || dragging) return;
    if (zoomed) {
      zoomOut();
      return;
    }
    zoomed = true;
    slideImgs[1].classList.add('zoomed-in');
    setZoomOrigin(e);
    slideImgs[1].style.transition = 'transform 0.35s ease';
    slideImgs[1].style.transform = `scale(${ZOOM_SCALE})`;
  });
  slideImgs[1].addEventListener('mousemove', (e) => {
    if (!zoomed || !isDesktop() || fading || dragging) return;
    setZoomOrigin(e);
  });
  slideImgs[1].addEventListener('mouseleave', zoomOut);

  closeBtn.addEventListener('click', close);
  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  // Click the dark background (not the image itself) to close.
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') goNext();
    else if (e.key === 'ArrowLeft') goPrev();
  });

  // --- Drag (mouse + touch): the track follows the pointer in real time,
  // then either completes the slide to the neighboring image or springs
  // back to the current one, depending on how far it was dragged. ---
  const THRESHOLD = 60;
  let dragging = false;
  let startX = 0;
  let baseX = 0;

  function dragStart(x) {
    if (fading) return;
    dragging = true;
    startX = x;
    baseX = -viewport.clientWidth;
    track.style.transition = 'none';
  }

  function dragMove(x) {
    if (!dragging) return;
    setTrackX(baseX + (x - startX), false);
  }

  function dragEnd(x) {
    if (!dragging) return;
    dragging = false;
    const dx = x - startX;
    if (dx <= -THRESHOLD) {
      if (isDesktop()) { centerTrack(false); desktopFade(1); }
      else slideNext();
    } else if (dx >= THRESHOLD) {
      if (isDesktop()) { centerTrack(false); desktopFade(-1); }
      else slidePrev();
    } else {
      animateTo(baseX, null);
    }
  }

  viewport.addEventListener('mousedown', (e) => {
    dragStart(e.clientX);
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => dragMove(e.clientX));
  window.addEventListener('mouseup', (e) => dragEnd(e.clientX));

  viewport.addEventListener('touchstart', (e) => {
    dragStart(e.touches[0].clientX);
  }, { passive: true });
  viewport.addEventListener('touchmove', (e) => {
    dragMove(e.touches[0].clientX);
  }, { passive: true });
  viewport.addEventListener('touchend', (e) => {
    dragEnd(e.changedTouches[0].clientX);
  });

  window.openLightbox = open;
  window.openVideoLightbox = openVideo;
})();
