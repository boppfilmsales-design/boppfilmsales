#!/usr/bin/env python3
"""Full-site mirror of www.apigcl.com / www.boppfilmsales.com.

Scrapes every product category, every product detail page (with gallery images,
specification tables and the attached PDF technical data sheets) plus all
content columns (About / Honor / Service / Cases / Download / Product Lines),
in both English and Chinese, then writes:

  src/data/site-seed.json        -> full structured content of the site
  public/uploads/products/*      -> product images
  public/downloads/*             -> every PDF / document found on the site

Run from the project root:  python3 scripts/scrape-site.py
"""
import re, json, html, os, subprocess, hashlib
from concurrent.futures import ThreadPoolExecutor

BASE = 'http://apigcl.com'
CACHE = '/tmp/apigcl-site/pages'
IMG_OUT = 'public/uploads/products'
PDF_OUT = 'public/downloads'
SEED = 'src/data/site-seed.json'
for d in (CACHE, IMG_OUT, PDF_OUT, os.path.dirname(SEED)):
    os.makedirs(d, exist_ok=True)

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) mirror-bot'

# ---------------------------------------------------------------- nav tree ---
NAV = [
    {'key': 'about', 'label': 'About Us', 'href': '/about', 'subs': [
        (13, 'About Us'), (55, 'Main Products'), (16, 'Honor'), (56, 'Culture'),
        (169, 'Branch Companies'), (171, 'Factory & Warehouse'), (172, 'Course')]},
    {'key': 'news', 'label': 'News', 'href': '/news', 'subs': []},
    {'key': 'products', 'label': 'Products', 'href': '/products', 'subs': []},
    {'key': 'download', 'label': 'Download', 'href': '/downloads', 'subs': [
        (43, "Company's Notice"), (76, 'Technology Data Download'),
        (157, 'Certificate Download'), (158, 'MSDS  Download')]},
    {'key': 'lines', 'label': 'Products Lines', 'href': '/product-lines', 'subs': [
        (45, 'Packing Film Production Lines'), (142, 'BOPP Film Production Lines'),
        (143, 'BOPET Film Production Lines'), (144, 'Tape Production Lines'),
        (149, 'Thermal Lamination Film Production Lines'),
        (164, 'Bruckner Production Lines (Germany)'), (165, 'Mitsubishi Production Lines (Japan)'),
        (167, 'Copy Paper Production Lines'), (173, 'Silver Metallized Film Production Lines'),
        (174, 'POF Film Production Lines')]},
    {'key': 'honor', 'label': 'Honor', 'href': '/honor', 'subs': [
        (17, 'Certificate'), (50, 'To Customer'), (51, 'Certification Report')]},
    {'key': 'service', 'label': 'Service Center', 'href': '/service', 'subs': [
        (79, 'Useful Links Service'), (141, 'Company Announcement'),
        (148, 'Useful Knowledge'), (199, 'Vessel Shipping Lines')]},
    {'key': 'cases', 'label': 'Classic Cases', 'href': '/cases', 'subs': [
        (54, 'Development Cases'), (145, 'To Buyers'), (146, 'To Markets'), (147, 'To Ourselves')]},
    {'key': 'contact', 'label': 'Contact', 'href': '/contact', 'subs': []},
]

PRODUCT_CATS = [
    (34, 'BOPET Film (Polyester Film)'), (48, 'BOPP Film (Polypropylene film)'),
    (57, 'BOPP Packing Tape Jumbo Rolls'), (58, 'BOPP/BOPET Thermal Laminating Film coated EVA'),
    (59, 'POF Shrink Film (Polyolefin)'), (60, 'BOPS Window Envelope Film'),
    (61, 'CPP Film'), (62, 'PE,PVC Film'), (64, 'Copy Paper,Photo paper'),
    (65, 'Aluminium Foil & Steel'), (67, 'Adhesive Labels & Barcode Ribbons'),
    (68, 'Self Adhesive Tear Tape'), (69, 'Tear Clips & Band'), (70, 'BOPS Sheets'),
    (152, 'BOPA Film'), (178, 'Film Machine Lines'),
    (184, 'Engineers for Installation & Maintenance'), (200, 'Current Transformer'),
]


def fetch(url, timeout=45):
    key = hashlib.md5(url.encode()).hexdigest()
    path = os.path.join(CACHE, key + '.html')
    if os.path.exists(path) and os.path.getsize(path) > 1500:
        return open(path, encoding='utf-8', errors='replace').read()
    for _ in range(3):
        r = subprocess.run(['curl', '-s', '-L', '--max-time', str(timeout), '-A', UA, '-o', path, url],
                           capture_output=True, timeout=timeout + 10)
        if os.path.exists(path) and os.path.getsize(path) > 1500:
            return open(path, encoding='utf-8', errors='replace').read()
    return ''


def clean(t):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'&nbsp;', ' ', t))).strip()


def local_name(url):
    key = url.split('?')[0]
    ext = os.path.splitext(key)[1].lower() or '.jpg'
    return hashlib.md5(key.encode()).hexdigest()[:16] + ext, key


img_jobs, pdf_jobs = [], []


def queue_asset(url, kind):
    if not url or url.endswith('no-photo.png') or url.endswith('/1.png'):
        return None
    name, key = local_name(url)
    if kind == 'img':
        if not ext_ok(name):
            return None
        img_jobs.append((key, os.path.join(IMG_OUT, name)))
    else:
        pdf_jobs.append((key, os.path.join(PDF_OUT, name)))
    return name


def ext_ok(name):
    return os.path.splitext(name)[1].lower() in ('.jpg', '.jpeg', '.png', '.gif', '.webp')


def download_assets():
    jobs = [(k, p) for k, p in img_jobs if not (os.path.exists(p) and os.path.getsize(p) > 500)]
    jobs += [(k, p) for k, p in pdf_jobs if not (os.path.exists(p) and os.path.getsize(p) > 500)]
    jobs = list(dict.fromkeys(jobs))
    print('assets to download:', len(jobs), flush=True)

    def work(job):
        key, path = job
        try:
            subprocess.run(['curl', '-s', '-L', '--max-time', '60', '-A', UA, '-o', path, key],
                           capture_output=True, timeout=90)
            if os.path.exists(path) and os.path.getsize(path) < 400:
                os.remove(path)
                return 0
            return 1
        except Exception:
            return 0

    done = 0
    with ThreadPoolExecutor(max_workers=14) as pool:
        for r in pool.map(work, jobs):
            done += r
    print('assets stored:', done, flush=True)


# ------------------------------------------------------------- extraction ---
ALLOWED = {'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'img', 'a', 'div', 'table', 'thead',
           'tbody', 'tr', 'td', 'th', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'font',
           'center', 'blockquote', 'sub', 'sup', 'strike', 'hr'}
TAG_RE = re.compile(r'<\s*(/?)\s*([a-zA-Z0-9]+)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)(/?)\s*>')


def sanitize(fragment):
    fragment = re.sub(r'<!--.*?-->', '', fragment, flags=re.S)
    fragment = re.sub(r'<(script|style|iframe|object|embed)[^>]*>.*?</\1>', '', fragment, flags=re.S | re.I)
    parts, pos = [], 0
    for m in TAG_RE.finditer(fragment):
        if m.start() > pos:
            parts.append(html.escape(html.unescape(fragment[pos:m.start()]), quote=False))
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3) or ''
        pos = m.end()
        if tag in ('br', 'hr'):
            parts.append(f'<{tag} />')
            continue
        if tag not in ALLOWED:
            continue
        keep = ''
        if tag == 'a':
            href = re.search(r'href\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            v = (href.group(2) or href.group(3)) if href else ''
            if v.lower().startswith('javascript'):
                continue
            keep = f' href="{html.escape(v)}"'
        if tag == 'img':
            src = re.search(r'src\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            v = (src.group(2) or src.group(3)) if src else ''
            if v.startswith('/'):
                v = BASE + v
            if not v.startswith('http'):
                continue
            name = queue_asset(v, 'img')
            if not name:
                continue
            keep = f' src="/uploads/products/{name}" alt=""'
        parts.append(f'<{"/" if closing else ""}{tag}{keep}>')
    if pos < len(fragment):
        parts.append(html.escape(html.unescape(fragment[pos:]), quote=False))
    return re.sub(r'(<br />\s*){3,}', '<br /><br />', ''.join(parts)).strip()


def absolutize(v):
    if v.startswith('/'):
        return BASE + v
    if v.startswith('http'):
        return v
    return BASE + '/' + v.lstrip('./')


def find_product_links(doc):
    """product_show.php?c_id=X&i_id=Y pairs found on a listing page."""
    out = []
    for m in re.finditer(r'product_show\.php\?c_id=(\d+)&i_id=(\d+)', doc):
        pair = (int(m.group(1)), int(m.group(2)))
        if pair not in out:
            out.append(pair)
    return out


def parse_gallery(doc):
    imgs = []
    for m in re.finditer(r'<img[^>]+src="([^"]+)"', doc[doc.find('magnifier-container'):doc.find('prd_box fr')]):
        imgs.append(absolutize(m.group(1)))
    return list(dict.fromkeys(imgs))


def parse_product(doc, lang):
    title = ''
    m = re.search(r'<div class="prd_box fr">\s*<h2>(.*?)</h2>', doc, re.S)
    if m:
        title = clean(re.sub(r'<[^>]+>', '', m.group(1)))
    code = price = ''
    box = doc[doc.find('prd_box_inf'):doc.find('prd_box_sc')] if 'prd_box_inf' in doc else ''
    c = re.search(r'Product code:\s*<span>(.*?)</span>', box, re.S)
    if c:
        code = clean(c.group(1))
    p = re.search(r'price:\s*<span>.*?<em>\$</em>(.*?)</span>', box, re.S)
    if p:
        price = clean(p.group(1))
    dm = re.search(r'<div class="menu_drop_nr"[^>]*>(.*?)</div>\s*</li>', doc[doc.find('menu_drop'):], re.S)
    body = sanitize(dm.group(1)) if dm else ''
    pdfs = []
    for m in re.finditer(r'href="([^"]+upload/file/[^"]+)"[^>]*>(.*?)</a>', doc, re.S):
        url = m.group(1)
        if not url.startswith('http'):
            url = BASE + url
        url = url.replace('/ch/upload/', '/upload/')
        name = queue_asset(url, 'pdf')
        if name:
            pdfs.append({'file': f'/downloads/{name}', 'label': clean(m.group(2)) or name})
    return {'title': title, 'code': code, 'price': price, 'bodyHtml': body, 'pdfs': pdfs,
            'gallery': [queue_asset(u, 'img') for u in parse_gallery(doc)]}


def parse_content(doc):
    """Generic rich-text column (about / honor / service / cases / lines)."""
    m = re.search(r'<div style="min-height:\d+px;[^"]*">(.*?)</div>\s*</div>\s*</section>', doc, re.S)
    if not m:
        m = re.search(r'<article class="n_article">.*?</article>\s*<div[^>]*>(.*?)</div>\s*</section>', doc, re.S)
    body = sanitize(m.group(1)) if m else ''
    images = []
    for im in re.finditer(r'<img[^>]+src="([^"]+)"', m.group(1) if m else ''):
        name = queue_asset(absolutize(im.group(1)), 'img')
        if name:
            images.append(f'/uploads/products/{name}')
    return body, images


def parse_honor_grid(doc):
    items = []
    box = doc[doc.find('ar_article_box'):]
    for li in re.findall(r'<li>(.*?)</li>', box, re.S):
        img = re.search(r'<img[^>]+src="([^"]+)"', li)
        t = re.search(r'<h2[^>]*>(.*?)</h2>', li, re.S)
        if img:
            name = queue_asset(absolutize(img.group(1)), 'img')
            if name:
                items.append({'image': f'/uploads/products/{name}', 'title': clean(t.group(1)) if t else ''})
    return items


def parse_downloads(doc):
    rows = []
    box = doc[doc.find('ar_article_box'):]
    for li in re.findall(r'<li>(.*?)</li>', box, re.S):
        if 'class="name"' in li:
            continue
        name = re.search(r'class="name"[^>]*>(.*?)</div>', li, re.S)
        num = re.search(r'class="number"[^>]*>(.*?)</div>', li, re.S)
        fmt = re.search(r'class="format"[^>]*>(.*?)</div>', li, re.S)
        date = re.search(r'class="date"[^>]*>(.*?)</div>', li, re.S)
        href = re.search(r'href="([^"]+)"', li)
        entry = {
            'name': clean(name.group(1)) if name else '',
            'serial': clean(num.group(1)) if num else '',
            'format': clean(fmt.group(1)) if fmt else '',
            'date': clean(date.group(1)) if date else '',
        }
        if href:
            url = absolutize(href.group(1))
            fn = queue_asset(url, 'pdf')
            entry['file'] = f'/downloads/{fn}' if fn else ''
        rows.append(entry)
    return rows


# ------------------------------------------------------------------- main ---
def scrape_lang(prefix):
    """prefix = '' for English, '/ch' for Chinese."""
    data = {'products': {}, 'contents': {}}

    # product categories + their items
    for top_id, cat_name in PRODUCT_CATS:
        doc = fetch(f'{BASE}{prefix}/product.php?top_id={top_id}&c_id={top_id}')
        links = find_product_links(doc)
        data['products'][str(top_id)] = {'name': cat_name, 'items': {}}

        def grab(pair):
            cid, iid = pair
            d = fetch(f'{BASE}{prefix}/product_show.php?c_id={cid}&i_id={iid}')
            info = parse_product(d, prefix)
            info['subCategoryId'] = cid
            info['i_id'] = iid
            return iid, info

        with ThreadPoolExecutor(max_workers=8) as pool:
            for iid, info in pool.map(grab, links):
                data['products'][str(top_id)]['items'][str(iid)] = info
        print(f'[{prefix or "en"}] cat {top_id} {cat_name}: {len(links)} products', flush=True)

    # content columns
    columns = ([('about', c[0], c[1]) for c in NAV[0]['subs']] +
               [('down', c[0], c[1]) for c in NAV[3]['subs']] +
               [('lines', c[0], c[1]) for c in NAV[4]['subs']] +
               [('honor', c[0], c[1]) for c in NAV[5]['subs']] +
               [('service', c[0], c[1]) for c in NAV[6]['subs']] +
               [('cases', c[0], c[1]) for c in NAV[7]['subs']])
    def grab_col(col):
        kind, cid, name = col
        script = {'about': 'about.php', 'down': 'down.php', 'lines': 'product_lines.php',
                  'honor': 'honor.php', 'service': 'service.php', 'cases': 'case.php'}[kind]
        d = fetch(f'{BASE}{prefix}/{script}?c_id={cid}')
        if kind == 'down':
            payload = parse_downloads(d)
        elif kind == 'honor':
            payload = parse_honor_grid(d)
        else:
            body, images = parse_content(d)
            payload = {'bodyHtml': body, 'images': images}
        return (f'{kind}-{cid}', {'name': name, 'kind': kind, 'items': payload}, kind, cid, name)

    with ThreadPoolExecutor(max_workers=8) as pool:
        for key, payload, kind, cid, name in pool.map(grab_col, columns):
            data['contents'][key] = payload
            print(f'[{prefix or "en"}] {kind} {cid} {name}', flush=True)
    return data


def main():
    print('--- scraping English site ---', flush=True)
    en = scrape_lang('')
    print('--- scraping Chinese site ---', flush=True)
    zh = scrape_lang('/ch')
    download_assets()

    merged_products = []
    for top_id, cat_name in PRODUCT_CATS:
        en_cat = en['products'][str(top_id)]
        zh_cat = zh['products'][str(top_id)]
        subs = []
        for iid, item in en_cat['items'].items():
            z = zh_cat['items'].get(iid, {})
            cid = item['subCategoryId']
            sub = next((s for s in subs if s['sourceId'] == cid), None)
            if sub is None:
                sub = {'sourceId': cid, 'items': []}
                subs.append(sub)
            sub['items'].append({
                'sourceId': iid,
                'title': item['title'],
                'titleZh': z.get('title', ''),
                'code': item['code'],
                'price': item['price'],
                'gallery': [g for g in item['gallery'] if g],
                'bodyHtml': item['bodyHtml'],
                'bodyHtmlZh': z.get('bodyHtml', ''),
                'pdfs': item['pdfs'],
            })
        # sub category names from the EN nav of the category page
        doc = fetch(f'{BASE}/product.php?top_id={top_id}&c_id={top_id}')
        names = dict(re.findall(r'product\.php\?top_id=\d+&c_id=(\d+)"\s+title="([^"]+)"', doc))
        for sub in subs:
            sub['name'] = names.get(str(sub['sourceId']), cat_name)
        merged_products.append({'sourceId': top_id, 'name': cat_name, 'subs': subs})

    merged_contents = []
    for key, val in en['contents'].items():
        kind, cid = key.split('-')
        z = zh['contents'].get(key, {})
        merged_contents.append({
            'kind': kind, 'sourceId': int(cid), 'name': val['name'],
            'items': val['items'], 'itemsZh': z.get('items', []) if kind != 'down' else [],
            'bodyHtmlZh': (z.get('items') or {}).get('bodyHtml', '') if isinstance(z.get('items'), dict) else '',
        })

    seed = {'products': merged_products, 'contents': merged_contents}
    with open(SEED, 'w', encoding='utf-8') as fh:
        json.dump(seed, fh, ensure_ascii=False, indent=1)
    print('seed written:', SEED, flush=True)
    print('products:', sum(len(s['items']) for c in merged_products for s in c['subs']), flush=True)
    print('pdfs on disk:', len([f for f in os.listdir(PDF_OUT) if f.endswith('.pdf')]), flush=True)
    print('images on disk:', len(os.listdir(IMG_OUT)), flush=True)


if __name__ == '__main__':
    main()
