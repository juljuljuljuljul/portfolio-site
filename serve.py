import base64, html, http.server, io, json, os, re, threading

from PIL import Image

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Guards the read-modify-write file operations below. The server itself
# stays multi-threaded (ThreadingHTTPServer, the http.server.test default)
# so ordinary concurrent GETs (images, pages, several open tabs) aren't
# serialized behind each other — only the actual file writes are.
write_lock = threading.Lock()

PROJECT_ORDER_PATH = 'js/project-order.js'
# Manually-assigned filter tags (checkboxes in admin/edit-tags.html). "video"
# is deliberately not here — it's auto-detected from each manifest instead
# of hand-tagged, since it's always mechanically knowable and never goes
# stale that way.
ALLOWED_TAGS = {'photorealism', 'graphic-imagery'}
INDEX_PATH = 'index.html'
ABOUT_PATH = 'about.html'
PLACEHOLDER_CARD = '      <a class="project-card" href="#"><span class="cover"></span></a>\n'
EXPLAINER_RE = re.compile(
    r'(<section id="project-explainer">\s*<p>)(.*?)(</p>\s*</section>)', re.DOTALL
)
ABOUT_INTRO_RE = re.compile(
    r'(<div id="about-intro">\s*<p>\s*)(.*?)(\s*</p>\s*</div>)', re.DOTALL
)
ABOUT_LINK_RE = re.compile(r'<a class="about-link" href="#(\w+)">(.*?)</a>', re.DOTALL)
ABOUT_LINK_HREFS = ['recent', 'bio', 'philosophy', 'technique', 'collab', 'contact']
# Sections whose <h2> was deliberately set to something other than its
# link's text — skipped by the auto-derivation in write_about_intro so a
# future intro save doesn't quietly revert it back.
HEADING_OVERRIDES = {'contact'}


def read_project_order():
    text = open(PROJECT_ORDER_PATH, encoding='utf-8').read()
    match = re.search(r"const PROJECT_ORDER = (\[[^\]]*\]);", text)
    return json.loads(match.group(1).replace("'", '"'))


def write_project_order(order):
    text = open(PROJECT_ORDER_PATH, encoding='utf-8').read()
    array_literal = '[' + ', '.join("'" + slug.replace("'", "\\'") + "'" for slug in order) + ']'
    new_text = re.sub(
        r"const PROJECT_ORDER = \[[^\]]*\];",
        f"const PROJECT_ORDER = {array_literal};",
        text,
    )
    open(PROJECT_ORDER_PATH, 'w', encoding='utf-8').write(new_text)


def project_has_video(manifest):
    if manifest.get('video'):
        return True
    return any(item.get('type') == 'video' for item in manifest.get('items', []))


def build_card(slug):
    manifest = json.load(open(f'projects/{slug}/manifest.json', encoding='utf-8'))
    title = manifest.get('title', slug)
    cover = manifest.get('cover', 'cover.webp')
    tags = list(manifest.get('tags', []))
    if project_has_video(manifest):
        tags.append('video')
    tags_attr = ' '.join(tags)
    return (
        f'      <a class="project-card" href="projects/{slug}/index.html" data-tags="{tags_attr}">'
        f'<span class="cover"><img src="projects/{slug}/{cover}" alt="{title}" loading="lazy"></span></a>\n'
    )


def write_index_cards(order):
    text = open(INDEX_PATH, encoding='utf-8').read()
    match = re.search(
        r'(<div id="filmstrip-track">\n)(.*?)(\n?    </div>)',
        text,
        re.DOTALL,
    )
    old_block = match.group(2)
    total_slots = len(re.findall(r'<a class="project-card"', old_block))
    placeholders = max(total_slots - len(order), 0)
    new_block = ''.join(build_card(slug) for slug in order) + PLACEHOLDER_CARD * placeholders
    new_text = text[:match.start(2)] + new_block.rstrip('\n') + text[match.end(2):]
    open(INDEX_PATH, 'w', encoding='utf-8').write(new_text)


def write_project_tags(tags_map):
    order = read_project_order()
    for slug, tags in tags_map.items():
        if slug not in order:
            raise ValueError(f'unknown project: {slug}')
        invalid = set(tags) - ALLOWED_TAGS
        if invalid:
            raise ValueError(f'invalid tag(s): {", ".join(sorted(invalid))}')
        path = f'projects/{slug}/manifest.json'
        manifest = json.load(open(path, encoding='utf-8'))
        manifest['tags'] = sorted(set(tags))
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
            f.write('\n')
    write_index_cards(order)


def slot_key(item):
    """Stable identifier for one image/video slot in a manifest, used by
    the drag-reorder admin tool (admin/edit-image-order.html) so it can
    send back just an order of keys rather than reconstructing the whole
    manifest shape client-side."""
    if isinstance(item, dict):
        if item.get('type') == 'video':
            return f"video:{item['id']}"
        return f"image:{item['src']}"
    return f"image:{item}"


def write_image_order(slug, order):
    if slug not in read_project_order():
        raise ValueError(f'unknown project: {slug}')
    path = f'projects/{slug}/manifest.json'
    manifest = json.load(open(path, encoding='utf-8'))

    if 'items' in manifest:
        field = 'items'
    elif 'images' in manifest:
        field = 'images'
    else:
        raise ValueError(f'project has no reorderable images: {slug}')

    current = manifest[field]
    lookup = {slot_key(item): item for item in current}
    # A subset (not necessarily the full set) so the same endpoint also
    # covers deleting a slot from admin/edit-image-order.html — whatever
    # keys are omitted are simply dropped from the manifest, not just
    # reordered. Still rejects unknown keys or duplicates, and an empty
    # result (would leave the project with no images at all).
    if len(order) != len(set(order)) or not set(order) <= set(lookup.keys()):
        raise ValueError('submitted order must be a subset of the current images, with no duplicates')
    if not order:
        raise ValueError('a project must keep at least one image')
    manifest[field] = [lookup[k] for k in order]

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')


def project_html_path(slug):
    return f'projects/{slug}/index.html'


def read_project_text(slug):
    text = open(project_html_path(slug), encoding='utf-8').read()
    match = EXPLAINER_RE.search(text)
    return html.unescape(match.group(2).strip())


def write_project_text(slug, new_paragraph):
    path = project_html_path(slug)
    text = open(path, encoding='utf-8').read()
    escaped = html.escape(new_paragraph.strip(), quote=False)
    new_text = EXPLAINER_RE.sub(lambda m: m.group(1) + escaped + m.group(3), text, count=1)
    open(path, 'w', encoding='utf-8').write(new_text)


def about_heading_re(section_id):
    return re.compile(
        r'(<section class="about-section" id="' + re.escape(section_id) + r'">\s*'
        r'<div class="about-section-text">\s*<h2>)'
        r'(.*?)'
        r'(</h2>)',
        re.DOTALL,
    )


def write_about_heading(section_id, heading_text):
    path = ABOUT_PATH
    text = open(path, encoding='utf-8').read()
    pattern = about_heading_re(section_id)
    if not pattern.search(text):
        raise ValueError(f'section not found in about.html: {section_id}')
    escaped = html.escape(heading_text.strip(), quote=False)
    new_text = pattern.sub(lambda m: m.group(1) + escaped + m.group(3), text, count=1)
    open(path, 'w', encoding='utf-8').write(new_text)


def write_about_intro(raw_text):
    """raw_text uses <bracket> notation for links, e.g. 'I will open with
    <what I've been up to lately>, then...' — matching the same notation the
    site owner already uses when dictating this copy. Brackets are matched
    positionally to ABOUT_LINK_HREFS in order; there must be exactly one
    per href, no more, no less. Each section's <h2> is derived from its
    link's text right here — there's no separate heading field to edit,
    the intro paragraph is the single source of truth for headings (CSS
    uppercases them for display, so case doesn't matter) — except
    HEADING_OVERRIDES below, sections whose heading was deliberately set to
    not match its link text and should stay put across future intro saves."""
    parts = re.split(r'(<[^<>]+>)', raw_text)
    hrefs = iter(ABOUT_LINK_HREFS)
    rebuilt = []
    headings = []
    link_count = 0
    for part in parts:
        if part.startswith('<') and part.endswith('>'):
            link_count += 1
            try:
                href = next(hrefs)
            except StopIteration:
                raise ValueError(
                    f'found more than {len(ABOUT_LINK_HREFS)} <bracketed> links — '
                    f'expected exactly {len(ABOUT_LINK_HREFS)}'
                )
            raw_link_text = part[1:-1].strip()
            text = html.escape(raw_link_text, quote=False)
            rebuilt.append(f'<a class="about-link" href="#{href}">{text}</a>')
            headings.append((href, raw_link_text))
        elif part:
            rebuilt.append(html.escape(part, quote=False))
    if link_count != len(ABOUT_LINK_HREFS):
        raise ValueError(
            f'found {link_count} <bracketed> links, expected exactly {len(ABOUT_LINK_HREFS)} '
            f'(one each for: {", ".join(ABOUT_LINK_HREFS)})'
        )

    path = ABOUT_PATH
    text = open(path, encoding='utf-8').read()
    new_inner = ''.join(rebuilt).strip()
    new_text = ABOUT_INTRO_RE.sub(lambda m: m.group(1) + new_inner + m.group(3), text, count=1)
    open(path, 'w', encoding='utf-8').write(new_text)

    for href, raw_link_text in headings:
        if href in HEADING_OVERRIDES:
            continue
        write_about_heading(href, raw_link_text)


def about_section_re(section_id):
    # Stops at </div> (closing .about-section-text), not </section> — a
    # section can have markup after the text (e.g. an image button) that
    # must survive a text-only save untouched.
    return re.compile(
        r'(<section class="about-section" id="' + re.escape(section_id) + r'">\s*'
        r'<div class="about-section-text">\s*<h2>.*?</h2>\s*)'
        r'(.*?)'
        r'(\s*</div>)',
        re.DOTALL,
    )


def format_about_body(body_text):
    """Blank line = new paragraph; a single line break within a paragraph
    becomes <br> — otherwise HTML would silently collapse it, which is
    exactly the bug this fixes (line breaks typed in the textarea weren't
    showing up on the site)."""
    paragraphs = re.split(r'\n\s*\n', body_text.strip().replace('\r\n', '\n'))
    formatted = []
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        escaped = html.escape(para, quote=False).replace('\n', '<br>')
        formatted.append(f'<p>{escaped}</p>')
    if not formatted:
        raise ValueError('text cannot be empty')
    return '\n  '.join(formatted)


def write_about_section(section_id, body_text):
    if section_id not in ABOUT_LINK_HREFS:
        raise ValueError(f'unknown section: {section_id}')
    path = ABOUT_PATH
    text = open(path, encoding='utf-8').read()
    pattern = about_section_re(section_id)
    if not pattern.search(text):
        raise ValueError(f'section not found in about.html: {section_id}')
    new_body_block = format_about_body(body_text)
    new_text = pattern.sub(
        lambda m: m.group(1) + new_body_block + m.group(3),
        text,
        count=1,
    )
    open(path, 'w', encoding='utf-8').write(new_text)


def about_section_block_re(section_id):
    return re.compile(
        r'(<section class="about-section" id="' + re.escape(section_id) + r'">)'
        r'(.*?)'
        r'(\n</section>)',
        re.DOTALL,
    )


def write_about_image(section_id, data_url):
    if section_id not in ABOUT_LINK_HREFS:
        raise ValueError(f'unknown section: {section_id}')
    if not data_url.startswith('data:image/'):
        raise ValueError('not an image data URL')

    _, b64data = data_url.split(',', 1)
    raw = base64.b64decode(b64data)
    img = Image.open(io.BytesIO(raw))

    os.makedirs('about-images', exist_ok=True)
    filename = f'{section_id}-1.webp'
    img.save(f'about-images/{filename}', 'WEBP', quality=82, method=6)

    path = ABOUT_PATH
    text = open(path, encoding='utf-8').read()
    pattern = about_section_block_re(section_id)
    match = pattern.search(text)
    if not match:
        raise ValueError(f'section not found in about.html: {section_id}')
    block = match.group(2)

    if 'about-section-image' in block:
        new_block = re.sub(
            r'(class="about-section-image">\s*<img src=")[^"]*(")',
            r'\g<1>about-images/' + filename + r'\2',
            block,
        )
    else:
        new_block = (
            block.rstrip('\n')
            + f'\n  <button type="button" class="about-section-image">'
            f'<img src="about-images/{filename}" alt=""></button>\n'
        )

    new_text = text[: match.start(2)] + new_block + text[match.end(2) :]
    open(path, 'w', encoding='utf-8').write(new_text)


class Handler(http.server.SimpleHTTPRequestHandler):
    def _json(self, status, payload):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))

            with write_lock:
                if self.path == '/api/save-order':
                    new_order = body['order']
                    current_order = read_project_order()
                    if set(new_order) != set(current_order) or len(new_order) != len(current_order):
                        raise ValueError('submitted order must contain exactly the current set of projects')
                    write_project_order(new_order)
                    write_index_cards(new_order)
                    self._json(200, {'ok': True})

                elif self.path == '/api/save-text':
                    slug = body['slug']
                    text = body['text']
                    if slug not in read_project_order():
                        raise ValueError(f'unknown project: {slug}')
                    if not text.strip():
                        raise ValueError('text cannot be empty')
                    write_project_text(slug, text)
                    self._json(200, {'ok': True})

                elif self.path == '/api/save-about-intro':
                    text = body['text']
                    if not text.strip():
                        raise ValueError('text cannot be empty')
                    write_about_intro(text)
                    self._json(200, {'ok': True})

                elif self.path == '/api/save-about-section':
                    section_id = body['id']
                    text = body['text']
                    if not text.strip():
                        raise ValueError('text cannot be empty')
                    write_about_section(section_id, text)
                    self._json(200, {'ok': True})

                elif self.path == '/api/save-about-image':
                    section_id = body['id']
                    data_url = body['dataUrl']
                    write_about_image(section_id, data_url)
                    self._json(200, {'ok': True})

                elif self.path == '/api/save-tags':
                    write_project_tags(body['tags'])
                    self._json(200, {'ok': True})

                elif self.path == '/api/save-image-order':
                    write_image_order(body['slug'], body['order'])
                    self._json(200, {'ok': True})

                else:
                    self.send_error(404)

        except Exception as e:
            self._json(400, {'ok': False, 'error': str(e)})


if __name__ == '__main__':
    http.server.test(HandlerClass=Handler, port=3458, bind='0.0.0.0')
