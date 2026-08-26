(() => {
  const wrap = document.getElementById('project-explainer');
  const p = wrap && wrap.querySelector('p');
  if (!p) return;

  function update() {
    // +1 guards against sub-pixel rounding making an exact fit look like
    // overflow.
    wrap.classList.toggle('has-overflow', p.scrollHeight > p.clientHeight + 1);
  }

  update();
  window.addEventListener('resize', update);
})();
