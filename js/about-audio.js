(() => {
  const sections = document.querySelectorAll('.about-section-text');
  if (!sections.length) return;

  // A filled circle with the glyph cut into it in the page's own black —
  // reads like a classic circular play button without borrowing YouTube's
  // actual color. currentColor drives the circle so it inherits whatever
  // muted/playing/hover color the button itself is in.
  const PLAY_PATH = 'M9.3 8.7 Q9.3 7.5 10.35 8.09 L17.3 12 L10.35 15.91 Q9.3 16.5 9.3 15.3 Z';
  const PAUSE_PATH = 'M9 7.5 h2 v9 h-2 Z M13 7.5 h2 v9 h-2 Z';

  let currentAudio = null;
  let currentButton = null;

  function setPlaying(button, playing) {
    button.classList.toggle('is-playing', playing);
    button.querySelector('.listen-icon-glyph').setAttribute('d', playing ? PAUSE_PATH : PLAY_PATH);
  }

  function stopCurrent() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    if (currentButton) setPlaying(currentButton, false);
    currentAudio = null;
    currentButton = null;
  }

  sections.forEach((textEl) => {
    const section = textEl.closest('.about-section');
    if (!section) return;
    const paragraphs = textEl.querySelectorAll('p:not(.privacy-note)');
    const lastP = paragraphs[paragraphs.length - 1];
    if (!lastP) return; // e.g. #contact has no paragraph, just the contact buttons

    const sectionId = section.id;
    const src = `audio/${sectionId}.mp3`;

    const audio = new Audio(src);
    audio.preload = 'none';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'listen-button';
    btn.innerHTML =
      '<svg class="listen-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="11" fill="currentColor"/>' +
      '<path class="listen-icon-glyph" d="' +
      PLAY_PATH +
      '" fill="#000"/></svg><span>Listen</span>';

    btn.addEventListener('click', () => {
      if (currentAudio === audio) {
        if (audio.paused) {
          audio.play();
          setPlaying(btn, true);
        } else {
          audio.pause();
          setPlaying(btn, false);
        }
        return;
      }
      stopCurrent();
      currentAudio = audio;
      currentButton = btn;
      audio.play();
      setPlaying(btn, true);
    });

    audio.addEventListener('ended', () => {
      setPlaying(btn, false);
      if (currentAudio === audio) {
        currentAudio = null;
        currentButton = null;
      }
    });

    lastP.insertAdjacentElement('afterend', btn);
  });
})();
