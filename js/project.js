(() => {
  const viewport = document.getElementById('project-scroll');
  const track = document.getElementById('project-track');
  if (!viewport || !track) return;

  function buildImageButton(src, alt, images, index) {
    const btn = document.createElement('button');
    btn.className = 'project-image';
    btn.type = 'button';

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = index < 4 ? 'eager' : 'lazy';

    btn.appendChild(img);
    btn.addEventListener('click', () => {
      if (window.openLightbox) window.openLightbox(images, index);
    });
    return btn;
  }

  function buildVideoEmbed(videoId, title, vertical, coverSrc) {
    // A 16:9 iframe forced into a narrow mobile viewport gets its top/bottom
    // clipped by the row's fixed height — looks broken, not just small. So
    // on mobile this shows the project's own cover photo + a play button
    // instead (CSS below swaps which one is visible); tapping it opens the
    // real embed in the lightbox, where it can size itself to whatever the
    // viewport actually allows, landscape rotation included. Vertical
    // Shorts skip this entirely — already the right shape for a mobile
    // screen, no clipping problem to solve.
    const wrap = document.createElement('div');
    wrap.className = vertical ? 'project-video-wrap project-video-wrap--vertical' : 'project-video-wrap';

    const embed = document.createElement('div');
    embed.className = 'project-video';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;
    iframe.title = title || 'Project video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.frameBorder = '0';
    embed.appendChild(iframe);
    wrap.appendChild(embed);

    if (!vertical && coverSrc) {
      const coverBtn = document.createElement('button');
      coverBtn.type = 'button';
      coverBtn.className = 'project-video-cover';
      const thumb = document.createElement('img');
      thumb.src = coverSrc;
      thumb.alt = title || 'Project video';
      thumb.loading = 'lazy';
      const play = document.createElement('span');
      play.className = 'project-video-play';
      // Same filled-circle-with-cutout-triangle badge as the about page's
      // Listen icon (js/about-audio.js) — one shared "play button" look
      // across the site instead of a plain bare triangle here.
      play.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="11" fill="currentColor"/>' +
        '<path d="M8.3 8.7 Q8.3 7.5 9.35 8.09 L16.3 12 L9.35 15.91 Q8.3 16.5 8.3 15.3 Z" fill="#fff"/></svg>';
      coverBtn.appendChild(thumb);
      coverBtn.appendChild(play);
      coverBtn.addEventListener('click', () => {
        if (window.openVideoLightbox) window.openVideoLightbox(videoId, title, vertical);
      });
      wrap.appendChild(coverBtn);
    }

    return wrap;
  }

  fetch('manifest.json')
    .then((r) => r.json())
    .then((data) => {
      // Mixed sequence: images and a video interleaved in a specific order,
      // e.g. cover photo, then the video, then the rest of the photos.
      if (data.items) {
        const images = data.items
          .filter((item) => item.type === 'image')
          .map((item) => item.src);
        let imageIndex = 0;

        // A non-vertical video's mobile stand-in already shows the
        // project's cover photo as its poster (see buildVideoEmbed) — if
        // that same photo also appears later as its own sequence item,
        // mobile would show it twice in a row. Desktop is unaffected (the
        // cover-swap button doesn't exist there at all), so this is a
        // mobile-only CSS hide, not a removal from the sequence/lightbox.
        const hasMobileCoverSwap = data.items.some(
          (item) => item.type === 'video' && item.orientation !== 'vertical'
        );

        data.items.forEach((item) => {
          if (item.type === 'video') {
            track.appendChild(buildVideoEmbed(item.id, data.title, item.orientation === 'vertical', data.cover));
          } else {
            const alt = `${data.title || 'Project'} ${imageIndex + 1}`;
            const btn = buildImageButton(item.src, alt, images, imageIndex);
            if (hasMobileCoverSwap && item.src === data.cover) {
              btn.classList.add('project-image--video-cover-dup');
            }
            track.appendChild(btn);
            imageIndex += 1;
          }
        });

        viewport.addEventListener('wheel', (e) => {
          if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
          e.preventDefault();
          viewport.scrollLeft += e.deltaY;
        }, { passive: false });

        attachDragScroll(viewport, track);
        return;
      }

      // Video-only project.
      if (data.video) {
        track.appendChild(buildVideoEmbed(data.video, data.title, false, data.cover));
        return;
      }

      // Images-only project (default/original behavior).
      const images = data.images || [];
      images.forEach((src, i) => {
        const alt = `${data.title || 'Project'} ${i + 1}`;
        track.appendChild(buildImageButton(src, alt, images, i));
      });

      viewport.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        viewport.scrollLeft += e.deltaY;
      }, { passive: false });

      attachDragScroll(viewport, track);
    });
})();
