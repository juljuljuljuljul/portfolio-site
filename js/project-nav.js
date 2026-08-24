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
})();
