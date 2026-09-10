#!/usr/bin/env python3
"""Mirror the legacy site www.apigcl.com / www.boppfilmsales.com news section.

Scrapes the three legacy news columns (Industry News, Company News,
Employees Literary) including every detail page and the images embedded in the
articles, then writes:

  src/data/news-seed.json   -> content used to seed the PostgreSQL tables
  public/uploads/news/*     -> locally hosted copies of the article images

Listing pages are cached in /tmp/apigcl-cache/pages so re-runs are fast.
Run from the project root:  python3 scripts/scrape-news.py
"""
import re, json, html, os, urllib.request, time, hashlib, subprocess, shutil
from concurrent.futures import ThreadPoolExecutor

BASE = 'http://apigcl.com'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) mirror-bot', 'Referer': 'http://apigcl.com/'}
CATS = [('41', 'industry-news', 'Industry News'), ('49', 'company-news', 'Company News'),
        ('52', 'employees-literary', 'Employees Literary')]
OUT = 'public/uploads/news'
SEED = 'src/data/news-seed.json'
CACHE = '/tmp/apigcl-cache/pages'
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.dirname(SEED), exist_ok=True)
os.makedirs(CACHE, exist_ok=True)


def get(url, binary=False, timeout=45):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        data = response.read()
    return data if binary else data.decode('utf-8', 'replace')


def clean(text):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'&nbsp;', ' ', text))).strip()


def cached_page(key, url):
    path = os.path.join(CACHE, f'{key}.html')
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return open(path, encoding='utf-8').read()
    for _ in range(3):
        try:
            doc = get(url)
            with open(path, 'w', encoding='utf-8') as handle:
                handle.write(doc)
            return doc
        except Exception:
            time.sleep(0.5)
    return ''


# ---------- listings ----------
items, seen = [], set()
for cid, slug, name in CATS:
    page = 1
    while page <= 20:
        doc = cached_page(f'list-{cid}-{page}', f'{BASE}/news.php?p={page}&c_id={cid}')
        if not doc:
            break
        box = doc.find('ar_article_box news')
        seg = doc[box:doc.find('</ul>', box)]
        found = re.findall(r'<li>(.*?)</li>', seg, re.S)
        if not found:
            break
        for entry in found:
            link = re.search(r'href="(show\.php\?c_id=(\d+)&i_id=(\d+))"', entry)
            if not link or (link.group(2), link.group(3)) in seen:
                continue
            seen.add((link.group(2), link.group(3)))
            title = re.search(r'<h1><a[^>]*>(.*?)</a></h1>', entry, re.S)
            date = re.search(r'<span>Time:\s*([^<]*)</span>', entry)
            para = re.search(r'<p>(.*?)</p>', entry, re.S)
            img = re.search(r'<img src="([^"]+)"', entry)
            items.append(dict(
                categoryId=cid, categorySlug=slug, categoryName=name, sourceId=int(link.group(3)),
                listTitle=clean(title.group(1)) if title else '',
                listDate=clean(date.group(1)) if date else '',
                listImage=img.group(1) if img else '',
                listExcerpt=clean(para.group(1))[:400] if para else ''))
        page += 1
print('listings items', len(items), flush=True)

# ---------- detail pages ----------
for index, it in enumerate(items):
    it['raw'] = cached_page(f"show-{it['categoryId']}-{it['sourceId']}",
                            f"{BASE}/show.php?c_id={it['categoryId']}&i_id={it['sourceId']}")
    if (index + 1) % 25 == 0:
        print('detail page', index + 1, flush=True)

# ---------- images ----------
imgurls = set()
for it in items:
    raw = it.pop('raw', '')
    match = re.search(r'<article class="n_article">(.*?)(?:<div class="footer">|</section>)', raw, re.S)
    if not match:
        continue
    seg = match.group(1)
    it['seg'] = seg
    for src in re.findall(r'src="([^"]+)"', seg):
        src = BASE + src if src.startswith('/') else src
        if src.startswith('http') and not src.endswith('no-photo.png'):
            imgurls.add(src)
    if it.get('listImage', '').startswith('http'):
        imgurls.add(it['listImage'])
print('unique images', len(imgurls), flush=True)


def local_name(url):
    key = url.split('?')[0].replace('http://apigcl.com', 'http://www.apigcl.com')
    ext = os.path.splitext(key)[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
        ext = '.jpg'
    return hashlib.md5(key.encode()).hexdigest()[:14] + ext, key


mapping = {}


def curl_image(url):
    name, key = local_name(url)
    path = os.path.join(OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        mapping[url] = name
        return
    try:
        subprocess.run(
            ['curl', '-s', '-L', '--max-time', '40', '--retry', '2', '-A', UA['User-Agent'],
             '-o', path, key],
            check=False, timeout=120)
        if os.path.exists(path) and 500 < os.path.getsize(path) < 2000000:
            mapping[url] = name
        else:
            if os.path.exists(path):
                os.remove(path)
    except Exception:
        mapping[url] = None


with ThreadPoolExecutor(max_workers=12) as pool:
    list(pool.map(curl_image, sorted(imgurls)))
print('images stored', sum(1 for v in mapping.values() if v), '/', len(imgurls), flush=True)

# ---------- sanitise article bodies ----------
ALLOWED = {'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'img', 'a', 'div', 'table', 'thead', 'tbody',
           'tr', 'td', 'th', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'font', 'center',
           'blockquote', 'sub', 'sup', 'strike', 'hr'}
TAG_RE = re.compile(r'<\s*(/?)\s*([a-zA-Z0-9]+)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)(/?)\s*>')


def sanitize(fragment):
    fragment = re.sub(r'<!--.*?-->', '', fragment, flags=re.S)
    fragment = re.sub(r'<(script|style|iframe|object|embed)[^>]*>.*?</\1>', '', fragment, flags=re.S | re.I)
    parts, pos = [], 0
    for match in TAG_RE.finditer(fragment):
        if match.start() > pos:
            parts.append(html.escape(html.unescape(fragment[pos:match.start()]), quote=False))
        closing, tag, attrs = match.group(1), match.group(2).lower(), match.group(3) or ''
        pos = match.end()
        if tag in ('br', 'hr'):
            parts.append(f'<{tag} />')
            continue
        if tag not in ALLOWED:
            continue
        keep = ''
        if tag == 'a':
            href = re.search(r'href\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            value = (href.group(2) or href.group(3)) if href else ''
            if value and not value.lower().startswith('javascript'):
                keep = ' href="%s"' % html.escape(value)
        if tag == 'img':
            src = re.search(r'src\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            value = (src.group(2) or src.group(3)) if src else ''
            if value.startswith('/'):
                value = BASE + value
            name = mapping.get(value) or mapping.get(value.replace('http://apigcl.com', 'http://www.apigcl.com'))
            if not name:
                continue
            keep = ' src="/uploads/news/%s" alt=""' % name
        parts.append('<%s%s%s>' % ('/' if closing else '', tag, keep))
    if pos < len(fragment):
        parts.append(html.escape(html.unescape(fragment[pos:]), quote=False))
    return re.sub(r'(<br />\s*){3,}', '<br /><br />', ''.join(parts)).strip()


def to_text(fragment):
    text = re.sub(r'<br\s*/?>', '\n', fragment)
    text = re.sub(r'</p>|</div>', '\n\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'[ \t\xa0]+', ' ', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


posts = []
for it in items:
    if 'seg' not in it:
        continue
    seg = it.pop('seg')
    heading = re.search(r'<h1[^>]*>(.*?)</h1>', seg, re.S)
    it['title'] = clean(re.sub(r'<[^>]+>', '', heading.group(1))) if heading else it.get('listTitle', '')
    if not it['title']:
        it['title'] = it.get('listTitle', '') or 'Untitled'
    date = re.search(r'Time[:：]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})', seg)
    it['newsDate'] = date.group(1) if date else ''
    body_match = re.search(r'min-height:500px;\s*line-height:150%;">(.*)$', seg, re.S)
    body = re.sub(r'</div>\s*</div>\s*$', '', (body_match.group(1) if body_match else seg).strip())
    it['bodyHtml'] = sanitize(body)
    it['bodyText'] = to_text(it['bodyHtml'])
    it['image'] = mapping.get(it.get('listImage', ''), '') or ''
    if not it.get('listExcerpt'):
        it['listExcerpt'] = it['bodyText'][:300]
    posts.append(it)

posts.sort(key=lambda row: (int(row['categoryId']), -row['sourceId']))
tmp = SEED + '.tmp'
with open(tmp, 'w', encoding='utf-8') as handle:
    json.dump(posts, handle, ensure_ascii=False, indent=1)
shutil.move(tmp, SEED)
print('seed written', SEED, len(posts), flush=True)
