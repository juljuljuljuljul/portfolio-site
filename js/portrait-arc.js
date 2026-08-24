(() => {
  const wrap = document.getElementById('portrait-wrap');
  if (!wrap) return;
  const labels = Array.from(wrap.querySelectorAll('.about-label--animated'));
  if (!labels.length) return;

  const DURATION = 600; // ms, matches the CSS opacity transition

  const controllers = labels.map((label) => {
    const textPath = label.querySelector('textPath');
    const restOffset = parseFloat(label.dataset.rest);
    const hoverOffset = parseFloat(label.dataset.hover);
    let rafId = null;
    let startTime = null;
    let fromOffset = restOffset;
    let toOffset = restOffset;

    function currentOffset() {
      const attr = textPath.getAttribute('startOffset');
      const value = attr === null ? NaN : parseFloat(attr);
      // "|| restOffset" would be wrong here since 0 is a legitimate,
      // reachable offset (HEY THERE!'s hoverOffset) and falsy in JS —
      // only fall back when the attribute is genuinely missing/unparseable.
      return Number.isNaN(value) ? restOffset : value;
    }

    function animateTo(target) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      fromOffset = currentOffset();
      toOffset = target;
      startTime = null;

      function step(ts) {
        if (startTime === null) startTime = ts;
        const t = Math.min((ts - startTime) / DURATION, 1);
        const eased = 1 - Math.pow(1 - t, 3); // gentle ease-out
        const value = fromOffset + (toOffset - fromOffset) * eased;
        textPath.setAttribute('startOffset', `${value}%`);
        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          rafId = null;
        }
      }
      rafId = requestAnimationFrame(step);
    }

    return { restOffset, hoverOffset, animateTo };
  });

  wrap.addEventListener('mouseenter', () => controllers.forEach((c) => c.animateTo(c.hoverOffset)));
  wrap.addEventListener('mouseleave', () => controllers.forEach((c) => c.animateTo(c.restOffset)));
})();
