#!/usr/bin/env python3
"""Fixed content scraper - properly extracts body HTML and images from source site.

Scrapes: Production Lines, Service detail pages, Cases
Also fetches Chinese versions and merges into site-seed.json.
"""
import re, json, html, os, hashlib, time, sys
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "http://www.apigcl.com"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
IMG_OUT = "public/uploads/content"
SEED = "src/data/site-seed.json"
os.makedirs(IMG_OUT, exist_ok=True)

def fetch(url, timeout=15, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if attempt < retries:
                time.sleep(0.5)
            else:
                print(f"  FETCH FAIL: {url} ({e})")
                return ""

def http_get_bytes(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def download_image(url, timeout=10):
    if not url: return ""
    if url.startswith("/"): url = BASE + url
    elif not url.startswith("http"): url = BASE + "/" + url.lstrip("./")
    if "no-photo" in url or "/1.png" in url or "images/tb" in url: return ""
    ext = os.path.splitext(url.split("?")[0].split("#")[0])[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"): ext = ".jpg"
    if ext == ".jpeg": ext = ".jpg"
    name = hashlib.md5(url.encode()).hexdigest()[:16] + ext
    path = os.path.join(IMG_OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 500: return name
    try:
        data = http_get_bytes(url, timeout)
        if len(data) < 400: return ""
        if b"<html" in data[:400].lower(): return ""
        with open(path, "wb") as f: f.write(data)
        return name
    except: return ""

def clean(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"&nbsp;", " ", t or ""))).strip()

ALLOWED_TAGS = {"p","br","strong","b","em","i","u","span","img","a","div","table","thead",
    "tbody","tr","td","th","ol","ul","li","h1","h2","h3","h4","h5","h6","font",
    "center","blockquote","sub","sup","strike","hr","style"}
TAG_RE = re.compile(r'<\s*(/?)\s*([a-zA-Z0-9]+)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)(/?)\s*>')

def sanitize(fragment):
    if not fragment: return ""
    fragment = re.sub(r'<!--.*?-->', '', fragment, flags=re.S)
    fragment = re.sub(r'<(script|style|iframe|object|embed)[^>]*>.*?</\1>', '', fragment, flags=re.S|re.I)
    parts, pos = [], 0
    for m in TAG_RE.finditer(fragment):
        if m.start() > pos:
            parts.append(html.escape(html.unescape(fragment[pos:m.start()]), quote=False))
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3) or ""
        pos = m.end()
        if tag in ("br","hr"):
            parts.append(f'<{tag} />')
            continue
        if tag not in ALLOWED_TAGS: continue
        keep = ""
        if tag == "a":
            hm = re.search(r'href\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            v = (hm.group(2) or hm.group(3)) if hm else ""
            if v.lower().startswith("javascript"): continue
            keep = f' href="{html.escape(v)}"'
        if tag == "img":
            sm = re.search(r'src\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            v = (sm.group(2) or sm.group(3)) if sm else ""
            if v.startswith("/"): v = BASE + v
            if not v.startswith("http"): continue
            if "no-photo" in v or "/1.png" in v or "images/tb" in v: continue
            local = download_image(v)
            if local: keep = f' src="/uploads/content/{local}" alt=""'
            else: continue
        if tag == "style": keep = attrs
        parts.append(f'<{"/" if closing else ""}{tag}{keep}>')
    if pos < len(fragment):
        parts.append(html.escape(html.unescape(fragment[pos:]), quote=False))
    return re.sub(r'(<br />\s*){3,}', '<br /><br />', ''.join(parts)).strip()

def extract_detail_fixed(doc):
    """Fixed extraction: find min-height div, extract to last </div> before </section>."""
    title = ""
    m = re.search(r'<h1[^>]*>(.*?)</h1>', doc, re.S|re.I)
    if m: title = clean(re.sub(r'<[^>]+>', '', m.group(1)))

    date = ""
    dm = re.search(r'Time[：:]\s*(\d{4}-\d{2}-\d{2})', doc)
    if dm: date = dm.group(1)

    body = ""
    mh_idx = doc.find('min-height:')
    if mh_idx > 0:
        gt = doc.find('>', mh_idx)
        if gt > 0:
            sec_end = doc.find('</section>', gt)
            if sec_end > 0:
                content = doc[gt+1:sec_end]
                last_div = content.rfind('</div>')
                if last_div >= 0:
                    body = content[:last_div]
                else:
                    body = content
            else:
                # Fallback: try </article>
                art_end = doc.find('</article>', gt)
                if art_end < 0:
                    art_end = gt + 10000
                content = doc[gt+1:art_end]
                last_div = content.rfind('</div>')
                if last_div >= 0:
                    body = content[:last_div]
                else:
                    body = content

    body_html = sanitize(body)
    images = []
    for src in re.findall(r'/uploads/content/([^"\']+)', body_html):
        if src not in images:
            images.append(src)
    return {"title": title, "date": date, "bodyHtml": body_html, "images": images}

# ===================== Page configs from site-seed.json =====================

def get_entries_to_scrape():
    """Get all entries that need body HTML scraping from site-seed.json."""
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)

    entries_to_scrape = []
    for c in seed.get("contents", []):
        kind = c.get("kind", "")
        cid = c.get("sourceId", 0)
        existing_entries = c.get("entries", [])
        
        if kind in ("lines", "service", "cases"):
            for e in existing_entries:
                if e.get("isLink"):
                    continue  # External links don't have detail pages
                entries_to_scrape.append({
                    "kind": kind,
                    "columnId": e.get("columnId", cid),
                    "sourceId": e.get("sourceId", 0),
                    "title": e.get("title", ""),
                    "name": e.get("name", c.get("name", "")),
                    "script": e.get("script", ""),  # May need to determine
                })
    
    return entries_to_scrape

def determine_script(kind, cid, iid):
    """Determine which PHP script to use for the detail page."""
    if kind == "lines":
        return "product_lines_show.php"
    elif kind == "service":
        # Service uses either service_show.php or show.php
        # Try service_show.php first, fall back to show.php
        return "service_show.php"
    elif kind == "cases":
        return "show.php"
    return "show.php"

def scrape_entry(entry, lang="en"):
    """Scrape a single entry's detail page."""
    kind = entry["kind"]
    cid = entry["columnId"]
    iid = entry["sourceId"]
    
    script = determine_script(kind, cid, iid)
    prefix = "/ch" if lang == "zh" else ""
    url = f"{BASE}{prefix}/{script}?c_id={cid}&i_id={iid}"
    
    doc = fetch(url)
    if not doc:
        # For service, try show.php as fallback
        if kind == "service" and script == "service_show.php":
            url2 = f"{BASE}{prefix}/show.php?c_id={cid}&i_id={iid}"
            doc = fetch(url2)
            if not doc:
                return None
        else:
            return None
    
    result = extract_detail_fixed(doc)
    return result

def scrape_all():
    """Scrape all entries and their Chinese versions."""
    entries = get_entries_to_scrape()
    print(f"Total entries to scrape: {len(entries)}")
    
    # Group by kind for logging
    by_kind = {}
    for e in entries:
        by_kind.setdefault(e["kind"], []).append(e)
    for k, v in by_kind.items():
        print(f"  {k}: {len(v)} entries")
    
    results = {}  # key: (kind, columnId, sourceId) -> {en: {...}, zh: {...}}
    
    for entry in entries:
        kind = entry["kind"]
        cid = entry["columnId"]
        iid = entry["sourceId"]
        key = f"{kind}_{cid}_{iid}"
        
        print(f"\n--- {kind} cid={cid} iid={iid}: {entry['title'][:50]} ---")
        
        # English
        en_result = scrape_entry(entry, "en")
        if en_result:
            print(f"  EN: title={en_result['title'][:40]}, body={len(en_result['bodyHtml'])} chars, imgs={len(en_result['images'])}")
        else:
            print(f"  EN: FAILED")
            en_result = {"title": entry["title"], "date": "", "bodyHtml": "", "images": []}
        
        # Chinese
        zh_result = scrape_entry(entry, "zh")
        if zh_result:
            print(f"  ZH: title={zh_result['title'][:40]}, body={len(zh_result['bodyHtml'])} chars, imgs={len(zh_result['images'])}")
        else:
            print(f"  ZH: no Chinese version")
            zh_result = None
        
        results[key] = {"en": en_result, "zh": zh_result}
    
    return results

def merge_results(results):
    """Merge scraped results into site-seed.json."""
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)
    
    contents = seed.get("contents", [])
    updated_count = 0
    
    for c in contents:
        kind = c.get("kind", "")
        if kind not in ("lines", "service", "cases"):
            continue
        
        entries = c.get("entries", [])
        for e in entries:
            if e.get("isLink"):
                continue
            
            cid = e.get("columnId", c.get("sourceId", 0))
            iid = e.get("sourceId", 0)
            key = f"{kind}_{cid}_{iid}"
            
            if key in results:
                r = results[key]
                en = r["en"]
                zh = r["zh"]
                
                # Update English content
                if en.get("bodyHtml"):
                    e["bodyHtml"] = en["bodyHtml"]
                    updated_count += 1
                if en.get("title") and not e.get("title"):
                    e["title"] = en["title"]
                if en.get("date"):
                    e["date"] = en["date"]
                if en.get("images"):
                    e["images"] = en["images"]
                
                # Update Chinese content
                if zh:
                    if zh.get("title"):
                        e["titleZh"] = zh["title"]
                    if zh.get("bodyHtml"):
                        e["bodyHtmlZh"] = zh["bodyHtml"]
                    if zh.get("date"):
                        e["dateZh"] = zh["date"]
    
    seed["contents"] = contents
    
    with open(SEED, "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=1)
    
    return updated_count

# ===================== Main =====================

if __name__ == "__main__":
    print("=" * 60)
    print("Fixed content scraper v2 for apigcl.com")
    print("=" * 60)
    
    # Phase 1: Scrape all entries
    results = scrape_all()
    
    # Phase 2: Merge into site-seed.json
    print(f"\n{'=' * 60}")
    print("Merging results into site-seed.json...")
    updated = merge_results(results)
    print(f"Updated {updated} entries with body HTML content")
    
    # Stats
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)
    
    total_entries = 0
    with_body = 0
    with_images = 0
    with_zh = 0
    for c in seed.get("contents", []):
        for e in c.get("entries", []):
            total_entries += 1
            if e.get("bodyHtml", "").strip():
                with_body += 1
            if e.get("images"):
                with_images += 1
            if e.get("titleZh") or e.get("bodyHtmlZh"):
                with_zh += 1
    
    print(f"\nFinal stats:")
    print(f"  Total entries: {total_entries}")
    print(f"  With body HTML: {with_body}")
    print(f"  With images: {with_images}")
    print(f"  With Chinese: {with_zh}")
    print(f"  Content images on disk: {len(os.listdir(IMG_OUT))}")
