#!/usr/bin/env python3
'''Merge the scraped catalogue + content into src/data/site-seed.json.

Run:  python scripts/build-seed.py
'''

import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import apig  # noqa: E402

SEED = os.path.join(apig.DATA_DIR, 'site-seed.json')
VALID = os.path.join(apig.DATA_DIR, 'valid-files.json')
CATALOG = os.path.join(apig.HERE, 'source-catalog.json')
CONTENT = os.path.join(apig.HERE, 'source-content.json')

CATEGORY_ZH = {
    34: 'BOPET薄膜（聚酯薄膜）', 48: 'BOPP薄膜（聚丙烯薄膜）', 57: 'BOPP封箱胶带母卷',
    58: 'BOPP/BOPET预涂膜', 59: 'POF收缩膜（聚烯烃）', 60: 'BOPS窗口信封膜',
    61: 'CPP薄膜', 62: 'PE、PVC薄膜', 64: '复印纸、相纸', 65: '铝箔及钢材',
    67: '不干胶标签及条码碳带', 68: '自粘撕裂带', 69: '撕裂扣及捆扎带', 70: 'BOPS片材',
    152: 'BOPA薄膜', 178: '薄膜设备生产线', 184: '安装与维护工程师', 200: '电流互感器',
}

CONTENT_ZH = {
    13: '关于我们', 55: '主营产品', 16: '荣誉', 56: '企业文化', 169: '分公司',
    171: '工厂与仓储', 172: '发展历程', 202: 'SEAGULL_LFI_TEST',
    17: '证书', 50: '致客户', 51: '认证报告',
    79: '实用链接服务', 141: '公司公告', 148: '实用知识', 199: '船公司航线',
    45: '包装薄膜生产线', 142: 'BOPP薄膜生产线', 143: 'BOPET薄膜生产线', 144: '胶带生产线',
    149: '预涂膜生产线', 164: '布鲁克纳生产线（德国）', 165: '三菱生产线（日本）',
    167: '复印纸生产线', 173: '镀铝膜生产线', 174: 'POF薄膜生产线',
    54: '发展案例', 145: '致买家', 146: '致市场', 147: '致自己',
    43: "公司公告", 76: '技术资料下载', 157: '证书下载', 158: 'MSDS下载',
}

EMPTY_BLOCK = re.compile(
    r'<(span|div|p|font)[^>]*>(?:\s|&nbsp;|<br\s*/?>)*</\1>', re.I)


def slim(html):
    '''Drop the empty wrapper elements the legacy editor left behind.'''
    previous = None
    while previous != html:
        previous = html
        html = EMPTY_BLOCK.sub('', html)
    html = re.sub(r'(\s*<br\s*/?>\s*){3,}', '<br />', html)
    return html.strip()


def image_paths(html):
    out = []
    for match in re.finditer(r'<img[^>]+src="(/uploads/[^"]+)"', html or ''):
        if match.group(1) not in out:
            out.append(match.group(1))
    return out


def build_valid_files():
    names = set()
    for folder in (apig.DL_DIR, apig.PROD_IMG, apig.CONTENT_IMG):
        for name in os.listdir(folder):
            names.add(name)
    payload = sorted(names)
    apig.write_json(VALID, payload)
    return len(payload)


def build_items(catalog):
    items = {}
    for key, raw in catalog['items'].items():
        cat_id, item_id = (int(part) for part in key.split(':'))
        en = raw.get('detail') or {}
        zh = raw.get('detailZh') or {}
        gallery = [path for path in (en.get('gallery') or []) if path]
        if not gallery and raw.get('image'):
            local = apig.download_image(apig.absolute(raw['image']), apig.PROD_IMG, '/uploads/products')
            if local:
                gallery = [local]
        description = slim(en.get('description') or '')
        technical = slim(en.get('technical') or '')
        offer = slim(en.get('offer') or '')
        description_zh = slim(zh.get('description') or '')
        technical_zh = slim(zh.get('technical') or '')
        offer_zh = slim(zh.get('offer') or '')
        items[key] = {
            'sourceId': item_id,
            'catId': cat_id,
            'title': en.get('title') or raw.get('title') or '',
            'titleZh': zh.get('title') or '',
            'summary': en.get('summary') or raw.get('summary') or '',
            'summaryZh': zh.get('summary') or '',
            'code': en.get('code') or raw.get('code') or '',
            'price': en.get('price') or raw.get('price') or '',
            'gallery': gallery,
            'description': description,
            'descriptionZh': description_zh,
            'technical': technical,
            'technicalZh': technical_zh,
            'offer': offer,
            'offerZh': offer_zh,
            # Kept for the card summaries and the Chinese product page.
            'bodyHtml': description,
            'bodyHtmlZh': description_zh,
            'pdfs': [pdf for pdf in (en.get('pdfs') or []) if pdf.get('file')],
        }
        if not items[key]['pdfs'] and zh.get('pdfs'):
            items[key]['pdfs'] = [pdf for pdf in zh['pdfs'] if pdf.get('file')]
    return items


def key_for(cat_id, item_id):
    return '%d:%d' % (cat_id, item_id)


def build_families(catalog, items):
    families = []
    for raw in catalog['families']:
        family = {
            'sourceId': raw['sourceId'],
            'name': raw['name'],
            'nameZh': raw.get('nameZh') or CATEGORY_ZH.get(raw['sourceId'], ''),
            'itemIds': raw.get('itemIds') or [],
            'subs': [],
        }
        for sub in raw.get('subs') or []:
            sub_items = [items[key_for(sub['sourceId'], item_id)]
                         for item_id in sub.get('itemIds') or []
                         if key_for(sub['sourceId'], item_id) in items]
            family['subs'].append({
                'sourceId': sub['sourceId'],
                'name': sub['name'],
                'nameZh': sub.get('nameZh') or '',
                'itemIds': sub.get('itemIds') or [],
                'items': sub_items,
            })
        families.append(family)
    return families


def build_contents(content):
    contents = []
    for raw in content['columns']:
        kind = raw['kind']
        column = {
            'kind': kind,
            'sourceId': raw['sourceId'],
            'name': raw['name'],
            'nameZh': raw.get('nameZh') or CONTENT_ZH.get(raw['sourceId'], ''),
            'items': [],
        }
        if kind == 'about':
            body = slim(raw.get('bodyHtml') or '')
            body_zh = slim(raw.get('bodyHtmlZh') or '')
            column['items'] = {'bodyHtml': body, 'images': image_paths(body)}
            column['itemsZh'] = {'bodyHtml': body_zh}
        elif kind == 'down':
            column['items'] = [{
                'name': row.get('title') or '',
                'serial': row.get('serial') or '',
                'format': row.get('format') or '',
                'date': row.get('date') or '',
                'bodyHtml': slim(row.get('bodyHtml') or ''),
            } for row in raw.get('rows') or []]
        else:
            entries = []
            cards = []
            for item in raw.get('items') or []:
                body = slim(item.get('bodyHtml') or '')
                body_zh = slim(item.get('bodyHtmlZh') or '')
                external = item.get('externalUrl') or ''
                entries.append({
                    'kind': kind,
                    'columnId': raw['sourceId'],
                    'sourceId': item['sourceId'],
                    'title': item.get('title') or '',
                    'titleZh': item.get('titleZh') or '',
                    'date': item.get('date') or '',
                    'bodyHtml': body,
                    'bodyHtmlZh': body_zh,
                    'images': image_paths(body),
                    'externalUrl': external,
                    'isLink': bool(external),
                })
                cards.append({
                    'sourceId': item['sourceId'],
                    'title': item.get('title') or '',
                    'titleZh': item.get('titleZh') or '',
                    'image': item.get('image') or '',
                    'externalUrl': external,
                    'hot': bool(item.get('hot')),
                })
            column['items'] = cards
            column['entries'] = entries
        contents.append(column)
    return contents


def main():
    catalog = apig.read_json(CATALOG) or {'families': [], 'items': {}}
    content = apig.read_json(CONTENT) or {'columns': []}
    items = build_items(catalog)
    payload = {
        'products': build_families(catalog, items),
        'items': items,
        'contents': build_contents(content),
    }
    apig.write_json(SEED, payload)
    count = build_valid_files()
    families = payload['products']
    print('families: %d' % len(families))
    for family in families:
        print('  %-5d %-46s subs=%-3d items=%-4d'
              % (family['sourceId'], family['name'][:46], len(family['subs']), len(family['itemIds'])))
    print('items: %d (zh titles: %d)'
          % (len(items), sum(1 for item in items.values() if item['titleZh'])))
    print('contents: %d columns, %d entries'
          % (len(payload['contents']), sum(len(c.get('entries') or []) for c in payload['contents'])))
    print('valid files: %d' % count)
    print('seed size: %.1f MB' % (os.path.getsize(SEED) / 1048576.0))


if __name__ == '__main__':
    main()

