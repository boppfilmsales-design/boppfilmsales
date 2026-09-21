#!/usr/bin/env python3
'''Scrape every non-product content column of apigcl.com (EN + Chinese).

Run:  python scripts/scrape-content.py
Out:  scripts/source-content.json
'''

import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import apig  # noqa: E402

OUT = os.path.join(apig.HERE, 'source-content.json')
DIV_RE = re.compile(r'</?div\b[^>]*>')
LINK_RE = r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>'

# kind -> (script, query key, [(sourceId, english name), ...])
SECTIONS = [
    ('about', 'about.php', 'c_id', [
        (13, 'About Us'), (55, 'Main Products'), (56, 'Culture'),
        (169, 'Branch Companies'), (171, 'Factory & Warehouse'), (172, 'Course'),
        (202, 'SEAGULL_LFI_TEST'),
    ]),
    ('honor', 'honor.php', 'c_id', [
        (16, 'Honor'), (17, 'Certificate'), (50, 'To Customer'), (51, 'Certification Report'),
    ]),
    ('lines', 'product_lines.php', 'c_id', [
        (45, 'Packing Film Production Lines'), (142, 'BOPP Film Production Lines'),
        (143, 'BOPET Film Production Lines'), (144, 'Tape Production Lines'),
        (149, 'Thermal Lamination Film Production Lines'),
        (164, 'Bruckner Production Lines (Germany)'),
        (165, 'Mitsubishi Production Lines (Japan)'),
        (167, 'Copy Paper Production Lines'),
        (173, 'Silver Metallized Film Production Lines'),
        (174, 'POF Film Production Lines'),
    ]),
    ('service', 'service.php', 'c_id', [
        (79, 'Useful Links Service'), (141, 'Company Announcement'),
        (148, 'Useful Knowledge'), (199, 'Vessel Shipping Lines'),
    ]),
    ('cases', 'case.php', 'c_id', [
        (54, 'Development Cases'), (145, 'To Buyers'),
        (146, 'To Markets'), (147, 'To Ourselves'),
    ]),
    ('down', 'down.php', 'c_id', [
        (43, "Company's Notice"), (76, 'Technology Data Download'),
        (157, 'Certificate Download'), (158, 'MSDS Download'),
    ]),
]


def extract_div(html, start):
    depth = 0
    for match in DIV_RE.finditer(html, start):
        if match.group(0).startswith('</'):
            depth -= 1
            if depth <= 0:
                return html[start:match.end()]
        else:
            depth += 1
    return html[start:]


def body_block(html):
    marker = html.find('min-height:')
    if marker < 0:
        return ''
    start = html.rfind('<div', 0, marker)
    if start < 0:
        return ''
    return extract_div(html, start)


def page_title(html):
    match = re.search(r'<article class="n_article">\s*<h1[^>]*>(.*?)</h1>', html, re.S)
    if match:
        return apig.text_of(match.group(1))
    match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    return apig.text_of(match.group(1)) if match else ''


def sidebar_columns(html):
    out, seen = [], set()
    for match in re.finditer(LINK_RE, html, re.S):
        href, label = match.group(1), apig.text_of(match.group(2))
        kind = re.match(r'([a-z_]+)\.php', href)
        if not kind or not label:
            continue
        if kind.group(1) not in ('about', 'honor', 'product_lines', 'service', 'case', 'down',
                                 'about_list_img', 'about_list_txt'):
            continue
        query = re.search(r'[?&](?:c_id|i_id)=(\d+)', href)
        if not query:
            continue
        key = int(query.group(1))
        if key in seen:
            continue
        seen.add(key)
        out.append({'script': kind.group(1), 'id': key, 'name': label})
    return out


def first_image(block):
    for match in re.finditer(r'<img[^>]+src="([^"]+)"', block):
        src = match.group(1)
        if 'no-photo' in src or 'hor_1.png' in src or 'images/line.png' in src:
            continue
        return src
    return ''


def list_blocks(html, marker):
    start = html.find(marker)
    if start < 0:
        return []
    end = html.find('</ul>', start)
    chunk = html[start:end if end > 0 else len(html)]
    return re.split(r'<li[ >]', chunk)[1:]


def parse_cards(html):
    out, seen = [], set()
    for block in list_blocks(html, 'class="ar_article_box honor"'):
        ids = re.search(r'[?&]c_id=(\d+)&(?:amp;)?i_id=(\d+)', block)
        if not ids:
            continue
        key = (int(ids.group(1)), int(ids.group(2)))
        if key in seen:
            continue
        seen.add(key)
        title_match = re.search(r'<h1[^>]*>(.*?)</h1>', block, re.S)
        out.append({
            'sourceId': key[1],
            'columnId': key[0],
            'title': apig.text_of(title_match.group(1)) if title_match else '',
            'image': first_image(block),
        })
    return out


def parse_lines(html):
    out, seen = [], set()
    for block in list_blocks(html, 'class="ar_article_box pr_lines"'):
        ids = re.search(r'[?&]c_id=(\d+)&(?:amp;)?i_id=(\d+)', block)
        if not ids:
            continue
        key = (int(ids.group(1)), int(ids.group(2)))
        if key in seen:
            continue
        seen.add(key)
        title_match = re.search(r'<dt[^>]*>(.*?)</dt>', block, re.S)
        out.append({
            'sourceId': key[1],
            'columnId': key[0],
            'title': apig.text_of(title_match.group(1)) if title_match else '',
            'image': first_image(block),
            'hot': '<em>' in block,
        })
    return out


def parse_service(html, column_id):
    out, seen = [], set()
    generated = 0
    for block in list_blocks(html, 'class="service-all"'):
        ids = re.search(r'[?&]c_id=(\d+)&(?:amp;)?i_id=(\d+)', block)
        href_match = re.search(r'href="([^"]+)"', block)
        if not href_match:
            continue
        if ids:
            key = (int(ids.group(1)), int(ids.group(2)))
        else:
            generated -= 1
            key = (column_id, generated)
        if key in seen:
            continue
        seen.add(key)
        href = href_match.group(1)
        title_match = re.search(r's-title"[^>]*>\s*<a[^>]*>(.*?)</a>', block, re.S)
        out.append({
            'sourceId': key[1],
            'columnId': key[0],
            'title': apig.text_of(title_match.group(1)) if title_match else '',
            'image': first_image(block),
            'externalUrl': href if href.startswith('http') else '',
        })
    return out


def parse_downloads(html):
    out, seen = [], set()
    for match in re.finditer(r'<div class="down-all" id="down-id-(\d+)"', html):
        rid = int(match.group(1))
        if rid in seen:
            continue
        seen.add(rid)
        row_start = html.rfind('<li>', 0, match.start())
        row = html[row_start:match.start()] if row_start > 0 else ''

        def cell(cls):
            found = re.search(r'class="' + cls + r'"[^>]*>(.*?)</div>', row, re.S)
            return apig.text_of(found.group(1)) if found else ''

        out.append({
            'sourceId': rid,
            'title': cell('name'),
            'serial': cell('number'),
            'format': cell('format'),
            'date': cell('date'),
            'bodyHtml': '',
            '_raw': extract_div(html, match.start()),
        })
    return out


def fetch_detail(kind, column_id, item_id, lang):
    if kind == 'lines':
        script = 'product_lines_show.php'
    elif kind == 'service':
        script = 'service_show.php'
    else:
        script = 'show.php'
    base = apig.CH_BASE if lang == 'zh' else apig.BASE
    html = apig.fetch('%s/%s?c_id=%d&i_id=%d' % (base, script, column_id, item_id))
    if not html:
        html = apig.fetch('%s/show.php?c_id=%d&i_id=%d' % (base, column_id, item_id))
    if not html:
        return None
    date_match = re.search(r'Time[：:]\s*(\d{4}-\d{2}-\d{2})', html)
    return {
        'title': page_title(html),
        'date': date_match.group(1) if date_match else '',
        'bodyHtml': apig.sanitize_html(body_block(html), apig.CONTENT_IMG, '/uploads/content'),
    }


def main():
    columns = []
    for kind, script, key, entries in SECTIONS:
        for source_id, name in entries:
            url = '%s/%s?%s=%d' % (apig.BASE, script, key, source_id)
            html = apig.fetch(url)
            if not html:
                print('  skip %s %d' % (kind, source_id))
                continue
            zh_html = apig.fetch('%s/%s?%s=%d' % (apig.CH_BASE, script, key, source_id))
            zh_names = {}
            if zh_html:
                for col in sidebar_columns(zh_html):
                    zh_names[col['id']] = col['name']
            column = {
                'kind': kind,
                'sourceId': source_id,
                'name': name,
                'sectionTitle': page_title(html),
                'nameZh': (zh_names.get(source_id, '') or '').strip(),
                'url': url,
                'bodyHtml': '',
                'bodyHtmlZh': '',
                'items': [],
                'rows': [],
            }
            if kind == 'down':
                column['rows'] = parse_downloads(html)
            elif kind == 'about':
                column['bodyHtml'] = apig.sanitize_html(body_block(html), apig.CONTENT_IMG, '/uploads/content')
                if zh_html:
                    column['bodyHtmlZh'] = apig.sanitize_html(body_block(zh_html), apig.CONTENT_IMG, '/uploads/content')
            elif kind in ('honor', 'cases'):
                column['items'] = parse_cards(html)
            elif kind == 'lines':
                column['items'] = parse_lines(html)
            elif kind == 'service':
                column['items'] = parse_service(html, source_id)
            columns.append(column)
            print('%-8s %-5d %-42s items=%-3d rows=%d body=%d'
                  % (kind, source_id, column['name'][:42], len(column['items']),
                     len(column['rows']), len(column['bodyHtml'])))
            apig.write_json(OUT, {'columns': columns})

    jobs = [(column['kind'], column['sourceId'], item)
            for column in columns for item in column['items']]
    print('\nlocalising %d entry cards (detail pages for the internal ones)...' % len(jobs))

    def work(job):
        kind, column_id, item = job
        if item.get('externalUrl'):
            # External link cards (useful links, shipping lines) have no detail page.
            return item, None, None
        return item, fetch_detail(kind, column_id, item['sourceId'], 'en'), fetch_detail(kind, column_id, item['sourceId'], 'zh')

    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        for item, en, zh in pool.map(work, jobs):
            if en:
                item['bodyHtml'] = en['bodyHtml']
                item['date'] = en['date']
                if en['title'] and not item.get('title'):
                    item['title'] = en['title']
            if zh:
                item['bodyHtmlZh'] = zh['bodyHtml']
                item['titleZh'] = zh['title']
                item['dateZh'] = zh['date']
            item['image'] = apig.download_image(apig.absolute(item.get('image', '')), apig.CONTENT_IMG, '/uploads/content')
            done += 1
            if done % 10 == 0:
                apig.write_json(OUT, {'columns': columns})
                print('  %d/%d' % (done, len(jobs)))
    for column in columns:
        for row in column['rows']:
            row['bodyHtml'] = apig.sanitize_html(row.pop('_raw', ''), apig.CONTENT_IMG, '/uploads/content')
    apig.write_json(OUT, {'columns': columns})
    print('done: %d columns, %d items, %d download rows'
          % (len(columns), sum(len(c['items']) for c in columns), sum(len(c['rows']) for c in columns)))


if __name__ == '__main__':
    main()

