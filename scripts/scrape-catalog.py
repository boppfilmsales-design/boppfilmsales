#!/usr/bin/env python3
'''Scrape the full apigcl.com product catalogue (English + Chinese).

Run:  python scripts/scrape-catalog.py
Out:  scripts/source-catalog.json
'''

import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import apig  # noqa: E402

OUT = os.path.join(apig.HERE, 'source-catalog.json')
LINK_RE = r'href="[^"]*product\.php\?top_id=(\d+)&(?:amp;)?c_id=(\d+)"[^>]*title="([^"]*)"'
CARD_RE = re.compile(r'product_show\.php\?c_id=(\d+)&(?:amp;)?i_id=(\d+)')


def parse_families(html):
    out, seen = [], set()
    for match in re.finditer(LINK_RE, html):
        top, cid, label = match.group(1), match.group(2), apig.text_of(match.group(3))
        if top == cid and top not in seen:
            seen.add(top)
            out.append({'sourceId': int(top), 'name': label})
    return out


def parse_subs(html):
    start = html.find('ar_article_name_sed')
    if start < 0:
        return []
    chunk = html[start:html.find('</dl>', start) + 5]
    out, seen = [], set()
    for match in re.finditer(r'<a[^>]*href="[^"]*c_id=(\d+)"[^>]*>(.*?)</a>', chunk, re.S):
        cid = int(match.group(1))
        if cid in seen:
            continue
        seen.add(cid)
        out.append({'sourceId': cid, 'name': apig.text_of(match.group(2))})
    return out


def parse_cards(html):
    out, seen = [], set()
    for match in CARD_RE.finditer(html):
        cid, iid = int(match.group(1)), int(match.group(2))
        if (cid, iid) in seen:
            continue
        seen.add((cid, iid))
        stop = html.find('</li>', match.start())
        chunk = html[match.start():stop if stop > 0 else match.start() + 2500]
        title, summary = '', ''
        for h2 in re.finditer(r'<h2[^>]*>(.*?)</h2>', chunk, re.S):
            value = apig.text_of(h2.group(1))
            if value:
                title = value
                break
        pm = re.search(r'<p[^>]*>(.*?)</p>', chunk, re.S)
        if pm:
            summary = apig.text_of(pm.group(1))
        imagem = re.search(r'<img[^>]+src="([^"]+)"', chunk)
        codem = re.search(r'(?:Product code|产品编码)\s*:\s*<span>(.*?)</span>', chunk, re.S)
        pricem = re.search(r'<em>\$</em>\s*([^<]*)', chunk)
        out.append({
            'sourceId': iid,
            'catId': cid,
            'title': title,
            'summary': summary,
            'code': apig.text_of(codem.group(1)) if codem else '',
            'price': (pricem.group(1) or '').strip() if pricem else '',
            'image': imagem.group(1) if imagem else '',
        })
    return out


def parse_pager(html):
    total = 0
    match = re.search(r'>(\d+)\s*row<', html)
    if match:
        total = int(match.group(1))
    pages = {int(m.group(1)) for m in re.finditer(r'href="\?p=(\d+)&(?:amp;)?c_id=', html)}
    return total, (max(pages) if pages else 1)


def _tabs(html):
    marks = [html.find('<li class="item1"'), html.find('<li class="item2"'), html.find('<li class="item3"')]
    marks = [m for m in marks if m > 0]
    if not marks:
        return []
    end = html.find('</ul>', marks[-1])
    if end < 0:
        end = len(html)
    out = []
    for index, start in enumerate(marks):
        stop = marks[index + 1] if index + 1 < len(marks) else end
        chunk = html[start:stop]
        anchor = chunk.find('menu_drop_nr')
        if anchor > 0:
            chunk = chunk[chunk.find('>', anchor) + 1:]
        chunk = re.sub(r'<dl class="menu_drop_lk".*?</dl>', '', chunk, flags=re.S)
        chunk = re.sub(r'<div class="clear"></div>\s*</div>', '', chunk)
        chunk = re.sub(r'</div>\s*</li>\s*$', '', chunk)
        # The legacy page repeats a "quick inquiry" <li> list after the last tab;
        # cut it off so it does not bleed into the tab content.
        junk = re.search(
            r'<li>[^<]*<a[^>]*>[^<]*<img[^>]*product_arrow|立即询价|Make an inquiry', chunk, re.I
        )
        if junk:
            chunk = chunk[:junk.start()]
            chunk = re.sub(r'(?:<(?:ul|li)[^>]*>\s*)+$', '', chunk, flags=re.I)
        out.append(chunk)
    return out


def parse_show(html):
    box = html.find('class="prd_box')
    if box < 0:
        return None
    chunk = html[box:box + 4000]
    titlem = re.search(r'<h2[^>]*>(.*?)</h2>', chunk, re.S)
    summ = re.search(r'<p[^>]*>(.*?)</p>', chunk, re.S)
    codem = re.search(r'(?:Product code|产品编码)\s*:\s*<span>(.*?)</span>', chunk, re.S)
    pricem = re.search(r'<em>\$</em>\s*([^<]*)', chunk)
    gallery, seen = [], set()
    cover = re.search(r'images-cover"[^>]*>\s*<img[^>]+src="([^"]+)"', html, re.S)
    if cover:
        gallery.append(cover.group(1))
        seen.add(cover.group(1))
    line = html.find('magnifier-line')
    if line > 0:
        stop = html.find('magnifier-view', line)
        line_chunk = html[line:stop if stop > line else line + 4000]
        for imagem in re.finditer(r'<img[^>]+src="([^"]+)"', line_chunk):
            if imagem.group(1) not in seen:
                seen.add(imagem.group(1))
                gallery.append(imagem.group(1))
    tabs = [apig.sanitize_html(part, apig.PROD_IMG, '/uploads/products') for part in _tabs(html)]
    while len(tabs) < 3:
        tabs.append('')
    pdfs, seen_pdf = [], set()
    for part in tabs:
        for anchor in re.finditer(r'<a href="(/downloads/[^"]+\.pdf)"[^>]*>(.*?)</a>', part, re.S):
            file = anchor.group(1)
            if file in seen_pdf:
                continue
            seen_pdf.add(file)
            pdfs.append({'file': file, 'label': apig.text_of(anchor.group(2))})
    return {
        'title': apig.text_of(titlem.group(1)) if titlem else '',
        'summary': apig.text_of(summ.group(1)) if summ else '',
        'code': apig.text_of(codem.group(1)) if codem else '',
        'price': (pricem.group(1) or '').strip() if pricem else '',
        'gallery': [apig.download_image(apig.absolute(src), apig.PROD_IMG, '/uploads/products') for src in gallery],
        'description': tabs[0],
        'technical': tabs[1],
        'offer': tabs[2],
        'pdfs': pdfs,
    }


def cards_for(url, per_page=10):
    '''Walk a listing page (with its pagination) and return the cards.'''
    cards, page, seen = [], 1, set()
    while page <= 40:
        html = apig.fetch(url if page == 1 else url + '&p=' + str(page))
        if not html:
            break
        found = [card for card in parse_cards(html) if (card['catId'], card['sourceId']) not in seen]
        for card in found:
            seen.add((card['catId'], card['sourceId']))
        cards.extend(found)
        total, last = parse_pager(html)
        if len(found) < per_page or page >= last:
            break
        page += 1
    return cards


def main():
    families = parse_families(apig.fetch(apig.BASE + '/product.php'))
    print('families:', len(families))
    catalog = {'families': [], 'items': {}}
    for family in families:
        top = family['sourceId']
        url = apig.BASE + '/product.php?top_id=%d&c_id=%d' % (top, top)
        html = apig.fetch(url)
        subs = parse_subs(html)
        zh_html = apig.fetch(apig.CH_BASE + '/product.php?top_id=%d&c_id=%d' % (top, top))
        zh_families = {f['sourceId']: f['name'] for f in parse_families(zh_html)}
        zh_subs = {s['sourceId']: s['name'] for s in parse_subs(zh_html)}
        family['nameZh'] = zh_families.get(top, '')
        cards = cards_for(url)
        entry = {
            'sourceId': top,
            'name': family['name'],
            'nameZh': family['nameZh'],
            'itemIds': [card['sourceId'] for card in cards],
            'subs': [],
        }
        sub_cards = {}
        for sub in subs:
            sub['nameZh'] = zh_subs.get(sub['sourceId'], '')
            sub_url = apig.BASE + '/product.php?top_id=%d&c_id=%d' % (top, sub['sourceId'])
            scards = cards_for(sub_url)
            sub_cards[sub['sourceId']] = scards
            entry['subs'].append({
                'sourceId': sub['sourceId'],
                'name': sub['name'],
                'nameZh': sub['nameZh'],
                'itemIds': [card['sourceId'] for card in scards],
            })
        orphans = [card for card in cards if card['catId'] not in sub_cards]
        if orphans:
            entry['subs'].append({
                'sourceId': top,
                'name': family['name'],
                'nameZh': family['nameZh'],
                'itemIds': [card['sourceId'] for card in orphans],
            })
            sub_cards[top] = orphans
        catalog['families'].append(entry)
        for card in cards:
            key = '%d:%d' % (card['catId'], card['sourceId'])
            catalog['items'].setdefault(key, card)
        for cid, scards in sub_cards.items():
            for card in scards:
                key = '%d:%d' % (card['catId'], card['sourceId'])
                catalog['items'].setdefault(key, card)
        apig.write_json(OUT, catalog)
        print('family %5d %-45s subs=%-3d items=%-4d total items=%d'
              % (top, family['name'][:45], len(entry['subs']), len(cards), len(catalog['items'])))

    print('\nfetching %d product detail pages (EN + ZH)...' % len(catalog['items']))

    def work(key):
        cid, iid = (int(part) for part in key.split(':'))
        en = parse_show(apig.fetch('%s/product_show.php?c_id=%d&i_id=%d' % (apig.BASE, cid, iid)))
        zh = parse_show(apig.fetch('%s/product_show.php?c_id=%d&i_id=%d' % (apig.CH_BASE, cid, iid)))
        return key, en, zh

    pending = [
        key for key, item in catalog['items'].items()
        if not item.get('detail') or not item.get('detailZh')
    ]
    done = len(catalog['items']) - len(pending)
    print('%d items already complete, %d pending' % (done, len(pending)))
    with ThreadPoolExecutor(max_workers=8) as pool:
        for key, en, zh in pool.map(work, pending):
            item = catalog['items'][key]
            if en:
                item['detail'] = en
            if zh:
                item['detailZh'] = zh
            done += 1
            if done % 10 == 0:
                apig.write_json(OUT, catalog)
                print('  %d/%d' % (done, len(catalog['items'])))
    apig.write_json(OUT, catalog)
    with_pdf = sum(1 for item in catalog['items'].values() if (item.get('detail') or {}).get('pdfs'))
    with_zh = sum(1 for item in catalog['items'].values() if item.get('detailZh'))
    print('zh pages: %d' % with_zh)
    print('done: %d items, %d with PDFs' % (len(catalog['items']), with_pdf))


if __name__ == '__main__':
    main()

