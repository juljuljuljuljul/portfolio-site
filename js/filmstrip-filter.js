(() => {
  const nav = document.getElementById('filmstrip-filter');
  const track = document.getElementById('filmstrip-track');
  if (!nav || !track) return;

  const tabs = [...nav.querySelectorAll('.filter-tab')];
  const cards = [...track.querySelectorAll('.project-card')];

  function applyFilter(filter) {
    cards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(' ');
      const show = filter === 'all' || tags.includes(filter);
      card.classList.toggle('filtered-out', !show);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('active')) return;
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      applyFilter(tab.dataset.filter);
    });
  });
})();
