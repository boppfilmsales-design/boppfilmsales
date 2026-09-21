#!/usr/bin/env python3
'''Shared helpers for mirroring www.apigcl.com (English + Chinese).'''

import hashlib
import html as html_lib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://www.apigcl.com'
CH_BASE = 'http://www.apigcl.com/ch'
UA = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    )
}
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(ROOT, '.source-cache')
FAILED_LOG = os.path.join(CACHE, 'image-failures.txt')
PROD_IMG = os.path.join(ROOT, 'public', 'uploads', 'products')
CONTENT_IMG = os.path.join(ROOT, 'public', 'uploads', 'content')
DL_DIR = os.path.join(ROOT, 'public', 'downloads')
DATA_DIR = os.path.join(ROOT, 'src', 'data')
for _d in (CACHE, PROD_IMG, CONTENT_IMG, DL_DIR, DATA_DIR):
    os.makedirs(_d, exist_ok=True)


def cache_path(url):
    return os.path.join(CACHE, hashlib.md5(url.encode()).hexdigest() + '.html')


def fetch(url, timeout=45, retries=3, refresh=False):
    '''Download a page, caching the HTML on disk so re-runs are cheap.'''
    path = cache_path(url)
    if not refresh and os.path.exists(path) and os.path.getsize(path) > 2000:
        with open(path, encoding='utf-8', errors='replace') as fh:
            return fh.read()
    last = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read()
            text = raw.decode('utf-8', 'replace')
            if len(raw) > 500:
                with open(path, 'w', encoding='utf-8') as fh:
                    fh.write(text)
            return text
        except Exception as exc:
            last = exc
            time.sleep(1.5 * (attempt + 1))
    print('  FETCH FAIL', url, last)
    return ''


def get_bytes(url, timeout=90):
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def absolute(url):
    if not url:
        return ''
    if url.startswith('//'):
        return 'http:' + url
    if url.startswith('http'):
        return url
    return urllib.parse.urljoin(BASE + '/', url.lstrip('/'))


def local_name(url):
    clean = url.split('?')[0].split('#')[0]
    ext = os.path.splitext(clean)[1].lower()
    if ext in ('', '.'):
        ext = '.jpg'
    if ext == '.jpeg':
        ext = '.jpg'
    if 'apigcl.com' in url.lower():
        return os.path.basename(clean)
    return hashlib.md5(url.encode()).hexdigest()[:16] + ext


_BAD = None


def _bad_set():
    global _BAD
    if _BAD is None:
        try:
            with open(FAILED_LOG, encoding='utf-8') as fh:
                _BAD = set(fh.read().split('\n'))
        except FileNotFoundError:
            _BAD = set()
    return _BAD


def known_bad(url):
    return url in _bad_set()


def remember_bad(url):
    _bad_set().add(url)
    with open(FAILED_LOG, 'a', encoding='utf-8') as fh:
        fh.write(url + '\n')


def download_image(url, dest_dir=PROD_IMG, prefix='/uploads/products', timeout=20):
    '''Download one image and return its public path, or empty string.'''
    if not url or 'no-photo' in url or '/1.png' in url or 'images/tb' in url:
        return ''
    name = local_name(url)
    path = os.path.join(dest_dir, name)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return prefix + '/' + name
    if known_bad(url):
        return ''
    try:
        data = get_bytes(url, timeout=timeout)
    except Exception:
        remember_bad(url)
        return ''
    if len(data) < 400 or b'<html' in data[:400].lower():
        remember_bad(url)
        return ''
    with open(path, 'wb') as fh:
        fh.write(data)
    return prefix + '/' + name


def download_pdf(url):
    '''Download a PDF and return its public path, or empty string.'''
    if not url or not url.lower().split('?')[0].endswith('.pdf'):
        return ''
    name = local_name(url)
    path = os.path.join(DL_DIR, name)
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        if known_bad(url):
            return ''
        try:
            data = get_bytes(url, timeout=120)
        except Exception:
            remember_bad(url)
            return ''
        if len(data) < 1000 or data[:4] != b'%PDF':
            return ''
        with open(path, 'wb') as fh:
            fh.write(data)
    return '/downloads/' + name


def attr(attrs, name):
    match = re.search(name + r"\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))", attrs or '', re.I)
    if not match:
        return ''
    return match.group(1) or match.group(2) or match.group(3) or ''


def text_of(fragment):
    value = re.sub(r'<(script|style)[^>]*>.*?</\1\s*>', '', fragment or '', flags=re.S | re.I)
    value = re.sub(r'<[^>]+>', ' ', value)
    value = html_lib.unescape(value).replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', value).strip()


ALLOWED_TAGS = {
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'div', 'a', 'img',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'font', 'center', 'blockquote', 'sub', 'sup',
    'hr', 'small', 'big', 'dl', 'dt', 'dd',
}
TAG_RE = re.compile(r'<\s*(/?)\s*([a-zA-Z0-9]+)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)(/?)\s*>')
STYLE_KEEP = re.compile(r'(?:^|;)\s*(color|background|background-color|font-size|font-weight|text-align|font-style)\s*:[^;]*', re.I)


def keep_style(value):
    parts = [match.group(0).strip(' ;') for match in STYLE_KEEP.finditer(value or '')]
    return ';'.join(part for part in parts if ':' in part)


def sanitize_html(fragment, img_dir=PROD_IMG, img_prefix='/uploads/products'):
    '''Clean source HTML: keep the legacy look, host images/PDFs locally.'''
    if not fragment:
        return ''
    fragment = re.sub(r'<!--.*?-->', '', fragment, flags=re.S)
    fragment = re.sub(
        r'<(script|style|iframe|object|embed|form)[^>]*>.*?</\1\s*>', '', fragment, flags=re.S | re.I
    )
    out = []
    pos = 0
    for match in TAG_RE.finditer(fragment):
        if match.start() > pos:
            out.append(html_lib.escape(html_lib.unescape(fragment[pos:match.start()]), quote=False))
        pos = match.end()
        closing = bool(match.group(1))
        tag = match.group(2).lower()
        attrs = match.group(3) or ''
        if tag not in ALLOWED_TAGS:
            continue
        if tag in ('br', 'hr'):
            out.append('<br />' if tag == 'br' else '<hr />')
            continue
        if closing:
            out.append('</' + tag + '>')
            continue
        keep = ''
        if tag == 'a':
            href = attr(attrs, 'href')
            if not href or href.lower().startswith('javascript'):
                continue
            if href.lower().split('?')[0].endswith('.pdf'):
                local = download_pdf(absolute(href))
                if not local:
                    continue
                keep = ' href="' + local + '" target="_blank" rel="noopener"'
            else:
                keep = ' href="' + html_lib.escape(absolute(href), quote=True) + '" target="_blank" rel="noopener"'
        elif tag == 'img':
            src = attr(attrs, 'src')
            local = download_image(absolute(src), img_dir, img_prefix) if src else ''
            if not local:
                continue
            keep = ' src="' + local + '" alt="' + html_lib.escape(attr(attrs, 'alt'), quote=True) + '"'
        elif tag == 'font':
            for key in ('color', 'size', 'face'):
                value = attr(attrs, key)
                if value:
                    keep += ' ' + key + '="' + html_lib.escape(value, quote=True) + '"'
        if tag not in ('font',):
            style = keep_style(attr(attrs, 'style'))
            if style:
                keep += ' style="' + html_lib.escape(style, quote=True) + '"'
        out.append('<' + tag + keep + '>')
    if pos < len(fragment):
        out.append(html_lib.escape(html_lib.unescape(fragment[pos:]), quote=False))
    result = ''.join(out)
    result = re.sub(r'(?:<br />\s*){4,}', '<br /><br />', result)
    result = re.sub(r'(?:&nbsp;\s*){6,}', '&nbsp;', result)
    return result.strip()


def read_json(path, fallback=None):
    if not os.path.exists(path):
        return fallback
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)

