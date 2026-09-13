#!/usr/bin/env python3
"""Comprehensive scraper for missing content from www.apigcl.com.

Fetches: Production Lines, Service, Cases, About (missing), Chinese products,
downloads all images to public/uploads/content/, and merges into site-seed.json.

Usage: python scripts/scrape-all-missing.py
"""
import re, json, html, os, hashlib, time, sys
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "http://www.apigcl.com"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
IMG_OUT = "public/uploads/content"
PROD_IMG_OUT = "public/uploads/products"
PDF_OUT = "public/downloads"
SEED = "src/data/site-seed.json"
os.makedirs(IMG_OUT, exist_ok=True)
os.makedirs(PROD_IMG_OUT, exist_ok=True)
os.makedirs(PDF_OUT, exist_ok=True)

def http_get(url, timeout=12):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")

def http_get_bytes(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def fetch(url, timeout=12, retries=2):
    for attempt in range(retries + 1):
        try:
            return http_get(url, timeout)
        except Exception as e:
            if attempt < retries:
                time.sleep(0.3)
            else:
                print(f"  FETCH FAIL: {url} ({e})")
                return ""

def download_image(url, timeout=10):
    if not url:
        return ""
    if url.startswith("/"):
        url = BASE + url
    elif not url.startswith("http"):
        url = BASE + "/" + url.lstrip("./")
    if "no-photo" in url or "/1.png" in url or "images/tb" in url:
        return ""
    ext = os.path.splitext(url.split("?")[0].split("#")[0])[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    if ext == ".jpeg":
        ext = ".jpg"
    name = hashlib.md5(url.encode()).hexdigest()[:16] + ext
    path = os.path.join(IMG_OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return name
    try:
        data = http_get_bytes(url, timeout)
        if len(data) < 400:
            return ""
        if data[:3] == b"<!DOCTYPE".lower() or b"<html" in data[:400].lower():
            return ""
        with open(path, "wb") as f:
            f.write(data)
        return name
    except:
        return ""

def download_product_image(url, timeout=10):
    """Download to products dir using hash-based naming matching site-seed.json."""
    if not url:
        return ""
    if url.startswith("/"):
        url = BASE + url
    elif not url.startswith("http"):
        url = BASE + "/" + url.lstrip("./")
    if "no-photo" in url or "/1.png" in url or "images/tb" in url:
        return ""
    ext = os.path.splitext(url.split("?")[0].split("#")[0])[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    if ext == ".jpeg":
        ext = ".jpg"
    name = hashlib.md5(url.encode()).hexdigest()[:16] + ext
    path = os.path.join(PROD_IMG_OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return name
    try:
        data = http_get_bytes(url, timeout)
        if len(data) < 400:
            return ""
        if b"<html" in data[:400].lower():
            return ""
        with open(path, "wb") as f:
            f.write(data)
        return name
    except:
        return ""

def clean(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"&nbsp;", " ", t or ""))).strip()

ALLOWED_TAGS = {"p","br","strong","b","em","i","u","span","img","a","div","table","thead",
    "tbody","tr","td","th","ol","ul","li","h1","h2","h3","h4","h5","h6","font",
    "center","blockquote","sub","sup","strike","hr","style"}
TAG_RE = re.compile(r'<\s*(/?)\s*([a-zA-Z0-9]+)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)(/?)\s*>')

def sanitize(fragment):
    if not fragment:
        return ""
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
        if tag not in ALLOWED_TAGS:
            continue
        keep = ""
        if tag == "a":
            hm = re.search(r'href\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            v = (hm.group(2) or hm.group(3)) if hm else ""
            if v.lower().startswith("javascript"):
                continue
            keep = f' href="{html.escape(v)}"'
        if tag == "img":
            sm = re.search(r'src\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
            v = (sm.group(2) or sm.group(3)) if sm else ""
            if v.startswith("/"):
                v = BASE + v
            if not v.startswith("http"):
                continue
            if "no-photo" in v or "/1.png" in v or "images/tb" in v:
                continue
            local = download_image(v)
            if local:
                keep = f' src="/uploads/content/{local}" alt=""'
            else:
                continue
        if tag == "style":
            keep = attrs
        parts.append(f'<{"/" if closing else ""}{tag}{keep}>')
    if pos < len(fragment):
        parts.append(html.escape(html.unescape(fragment[pos:]), quote=False))
    return re.sub(r'(<br />\s*){3,}', '<br /><br />', ''.join(parts)).strip()

def extract_detail(doc):
    """Extract title, date, and body HTML from a detail page."""
    title = ""
    m = re.search(r'<h1[^>]*>(.*?)</h1>', doc, re.S|re.I)
    if m:
        title = clean(re.sub(r'<[^>]+>', '', m.group(1)))
    date = ""
    dm = re.search(r'Time[：:]\s*(\d{4}-\d{2}-\d{2})', doc)
    if dm:
        date = dm.group(1)
    # Body: min-height div
    body = ""
    bm = re.search(r'<div style="min-height:\d+px[^"]*">(.*?)</div>\s*</div>\s*</section>', doc, re.S)
    if not bm:
        bm = re.search(r'<div style="min-height:\d+px[^"]*">(.*?)</div>\s*</article>', doc, re.S)
    if not bm:
        bm = re.search(r'<div style="min-height:\d+px[^"]*">(.*?)</div>', doc, re.S)
    if bm:
        body = bm.group(1)
    else:
        # fallback: everything in n_article after the date div
        am = re.search(r'<article class="n_article">(.*?)</article>', doc, re.S)
        if am:
            body = am.group(1)
    body_html = sanitize(body)
    # collect images
    images = []
    for src in re.findall(r'/uploads/content/([^"\']+)', body_html):
        if src not in images:
            images.append(src)
    return {"title": title, "date": date, "bodyHtml": body_html, "images": images}

def absolutize(v):
    v = (v or "").strip()
    if not v or v.startswith("javascript") or v.startswith("#") or v.startswith("data:"):
        return ""
    if v.startswith("http"):
        return v
    if v.startswith("//"):
        return "http:" + v
    if v.startswith("/"):
        return BASE + v
    return BASE + "/" + v.lstrip("./")

# ===================== Configuration =====================

LINES_CATS = [
    (45, "Packing Film Production Lines"),
    (142, "BOPP Film Production Lines"),
    (143, "BOPET Film Production Lines"),
    (144, "Tape Production Lines"),
    (149, "Thermal Lamination Film Production Lines"),
    (164, "Bruckner Production Lines (Germany)"),
    (165, "Mitsubishi Production Lines (Japan)"),
    (167, "Copy Paper Production Lines"),
    (173, "Silver Metallized Film Production Lines"),
    (174, "POF Film Production Lines"),
]

SERVICE_CATS = [
    (79, "Useful Links Service"),
    (141, "Company Announcement"),
    (148, "Useful Knowledge"),
    (199, "Vessel Shipping Lines"),
]

CASES_CATS = [
    (54, "Development Cases"),
    (145, "To Buyers"),
    (146, "To Markets"),
    (147, "To Ourselves"),
]

ABOUT_MISSING = [
    (16, "Honor"),
    (171, "Factory & Warehouse"),
    (172, "Course"),
]

HONOR_CATS = [
    (17, "Certificate"),
    (50, "To Customer"),
    (51, "Certification Report"),
]

def get_detail_links(doc, script, cid):
    pattern = f'{script}\\?c_id={cid}&i_id=(\\d+)'
    ids = sorted(set(re.findall(pattern, doc)))
    return [(cid, int(iid)) for iid in ids]

def scrape_detail_page(script, cid, iid, kind):
    url = f"{BASE}/{script}?c_id={cid}&i_id={iid}"
    doc = fetch(url)
    if not doc:
        return None
    result = extract_detail(doc)
    result["kind"] = kind
    result["columnId"] = cid
    result["sourceId"] = iid
    result["url"] = url
    return result

def scrape_service_links(cid, name):
    """Scrape service pages that contain external links (cid=79, 199)."""
    url = f"{BASE}/service.php?c_id={cid}"
    doc = fetch(url)
    if not doc:
        return []
    entries = []
    # Find link cards
    box_start = doc.find("ar_article_box")
    box = doc[box_start:] if box_start > 0 else doc
    # Pattern: <li><a href="URL" ...><img src="IMG" ...>...</a><div class="s-title">TITLE</div></li>
    cards = re.findall(
        r'<li><a href="([^"]+)"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*>.*?</div></a>\s*<div class="s-title"[^>]*>\s*<a[^>]*>(.*?)</a>',
        box, re.S
    )
    if cards:
        for href, img, title in cards:
            href = html.unescape(href).strip()
            t = clean(title)
            img_local = download_image(absolutize(img))
            entries.append({
                "kind": "service", "columnId": cid, "sourceId": 0,
                "title": t or href, "date": "", "bodyHtml": "",
                "images": [f"/uploads/content/{img_local}"] if img_local else [],
                "externalUrl": href, "isLink": True
            })
    else:
        # Try simpler pattern: just find all links in the content area
        links = re.findall(r'<a[^>]+href="(https?://[^"]+)"[^>]*>(.*?)</a>', box, re.S)
        for href, text in links:
            t = clean(re.sub(r'<[^>]+>', '', text))
            if t and len(t) > 2 and href not in ("javascript:void(0)",):
                entries.append({
                    "kind": "service", "columnId": cid, "sourceId": 0,
                    "title": t, "date": "", "bodyHtml": "",
                    "images": [], "externalUrl": href, "isLink": True
                })
    return entries

def scrape_honor_list(cid, name):
    """Scrape honor certificate grid."""
    url = f"{BASE}/honor.php?c_id={cid}"
    doc = fetch(url)
    if not doc:
        return []
    items = []
    box_start = doc.find("ar_article_box")
    box = doc[box_start:] if box_start > 0 else doc
    for li in re.findall(r'<li>(.*?)</li>', box, re.S):
        img_m = re.search(r'<img[^>]+src="([^"]+)"', li)
        t_m = re.search(r'<h2[^>]*>(.*?)</h2>', li, re.S)
        if img_m:
            img_local = download_image(absolutize(img_m.group(1)))
            if img_local:
                items.append({
                    "image": f"/uploads/content/{img_local}",
                    "title": clean(t_m.group(1)) if t_m else ""
                })
    return items

def scrape_about_page(cid, name):
    """Scrape about sub-pages."""
    url = f"{BASE}/about.php?c_id={cid}"
    doc = fetch(url)
    if not doc:
        return {"bodyHtml": "", "images": []}
    body, images = "", []
    # Try min-height div
    bm = re.search(r'<div style="min-height:\d+px[^"]*">(.*?)</div>\s*</div>\s*</section>', doc, re.S)
    if not bm:
        bm = re.search(r'<div style="min-height:\d+px[^"]*">(.*?)</div>', doc, re.S)
    if bm:
        body = sanitize(bm.group(1))
    for src in re.findall(r'/uploads/content/([^"\']+)', body):
        if src not in images:
            images.append(src)
    return {"bodyHtml": body, "images": images}

# ===================== Main scrape logic =====================

def scrape_all_sections():
    """Scrape all missing content sections from the source site."""
    all_entries = {"lines": [], "service": [], "cases": [], "about": {}, "honor": {}}
    
    # 1. Production Lines - 10 categories, each has detail pages
    print("\n=== Production Lines ===")
    for cid, name in LINES_CATS:
        list_url = f"{BASE}/product_lines.php?c_id={cid}"
        doc = fetch(list_url)
        if not doc:
            print(f"  Lines {cid} {name}: list fetch failed")
            continue
        links = get_detail_links(doc, "product_lines_show.php", cid)
        print(f"  Lines {cid} {name}: {len(links)} detail pages")
        for lcid, iid in links:
            entry = scrape_detail_page("product_lines_show.php", lcid, iid, "lines")
            if entry:
                entry["name"] = name
                all_entries["lines"].append(entry)
                print(f"    {iid}: {entry['title'][:50]} ({len(entry['images'])} imgs)")

    # 2. Service - detail pages + external link pages
    print("\n=== Service ===")
    for cid, name in SERVICE_CATS:
        list_url = f"{BASE}/service.php?c_id={cid}"
        doc = fetch(list_url)
        if not doc:
            print(f"  Service {cid} {name}: list fetch failed")
            continue
        # Check for service_show.php links
        show_links = get_detail_links(doc, "service_show.php", cid)
        # Also check for show.php links
        show_links2 = get_detail_links(doc, "show.php", cid)
        all_links = show_links + show_links2
        if all_links:
            print(f"  Service {cid} {name}: {len(all_links)} detail pages")
            for lcid, iid in all_links:
                script = "service_show.php" if (lcid, iid) in show_links else "show.php"
                entry = scrape_detail_page(script, lcid, iid, "service")
                if entry:
                    entry["name"] = name
                    all_entries["service"].append(entry)
                    print(f"    {iid}: {entry['title'][:50]}")
        else:
            # External links page
            print(f"  Service {cid} {name}: checking for external links")
            entries = scrape_service_links(cid, name)
            all_entries["service"].extend(entries)
            print(f"    {len(entries)} external links found")

    # 3. Cases - detail pages
    print("\n=== Cases ===")
    for cid, name in CASES_CATS:
        list_url = f"{BASE}/case.php?c_id={cid}"
        doc = fetch(list_url)
        if not doc:
            print(f"  Cases {cid} {name}: list fetch failed")
            continue
        links = get_detail_links(doc, "show.php", cid)
        print(f"  Cases {cid} {name}: {len(links)} detail pages")
        for lcid, iid in links:
            entry = scrape_detail_page("show.php", lcid, iid, "cases")
            if entry:
                entry["name"] = name
                all_entries["cases"].append(entry)
                print(f"    {iid}: {entry['title'][:50]}")

    # 4. About missing pages
    print("\n=== About (missing) ===")
    for cid, name in ABOUT_MISSING:
        result = scrape_about_page(cid, name)
        all_entries["about"][cid] = {"name": name, **result}
        print(f"  About {cid} {name}: body={len(result['bodyHtml'])} chars, {len(result['images'])} imgs")

    # 5. Honor certificate grids
    print("\n=== Honor ===")
    for cid, name in HONOR_CATS:
        items = scrape_honor_list(cid, name)
        all_entries["honor"][cid] = {"name": name, "items": items}
        print(f"  Honor {cid} {name}: {len(items)} items")

    return all_entries

def scrape_chinese_products():
    """Fetch Chinese titles and body for products missing titleZh/bodyHtmlZh."""
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)
    
    missing = []
    for cat in seed["products"]:
        for sub in cat["subs"]:
            for p in sub["items"]:
                if not p.get("titleZh", "").strip() or not p.get("bodyHtmlZh", "").strip():
                    # Find the sub category sourceId and product sourceId
                    missing.append({
                        "catId": cat["sourceId"],
                        "subId": sub["sourceId"],
                        "itemId": p["sourceId"],
                        "title": p.get("title", ""),
                    })
    
    print(f"\n=== Chinese Products: {len(missing)} missing ===")
    
    def fetch_one(item):
        # Try /ch/ version
        url = f"{BASE}/ch/product_show.php?c_id={item['subId']}&i_id={item['itemId']}"
        doc = fetch(url)
        if not doc:
            return item, "", ""
        title = ""
        m = re.search(r'<div class="prd_box fr">\s*<h2>(.*?)</h2>', doc, re.S)
        if m:
            title = clean(re.sub(r'<[^>]+>', '', m.group(1)))
        body = ""
        dm = re.search(r'<div class="menu_drop_nr"[^>]*>(.*?)</div>\s*</li>', doc[doc.find('menu_drop'):] if 'menu_drop' in doc else '', re.S)
        if dm:
            body = sanitize(dm.group(1))
        return item, title, body
    
    results = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_one, item): item for item in missing}
        for future in as_completed(futures):
            item, title, body = future.result()
            if title or body:
                results[str(item["itemId"])] = {"titleZh": title, "bodyHtmlZh": body}
                print(f"  {item['itemId']}: zh title={title[:40]}")
    
    return results

def scrape_chinese_sections(entries):
    """Fetch Chinese versions of all scraped sections."""
    print("\n=== Chinese Sections ===")
    zh_entries = {"lines": [], "service": [], "cases": [], "about": {}, "honor": {}}
    
    # Chinese lines
    for entry in entries["lines"]:
        cid, iid = entry["columnId"], entry["sourceId"]
        url = f"{BASE}/ch/product_lines_show.php?c_id={cid}&i_id={iid}"
        doc = fetch(url)
        if doc:
            result = extract_detail(doc)
            zh_entries["lines"].append({**entry, "bodyHtmlZh": result["bodyHtml"], "titleZh": result["title"], "imagesZh": result["images"]})
            print(f"  zh lines {cid}/{iid}: {result['title'][:40]}")
        else:
            zh_entries["lines"].append(entry)
    
    # Chinese service
    for entry in entries["service"]:
        if entry.get("isLink"):
            zh_entries["service"].append(entry)
            continue
        cid, iid = entry["columnId"], entry["sourceId"]
        url = f"{BASE}/ch/service_show.php?c_id={cid}&i_id={iid}"
        doc = fetch(url)
        if not doc:
            url = f"{BASE}/ch/show.php?c_id={cid}&i_id={iid}"
            doc = fetch(url)
        if doc:
            result = extract_detail(doc)
            zh_entries["service"].append({**entry, "bodyHtmlZh": result["bodyHtml"], "titleZh": result["title"]})
        else:
            zh_entries["service"].append(entry)
    
    # Chinese cases
    for entry in entries["cases"]:
        cid, iid = entry["columnId"], entry["sourceId"]
        url = f"{BASE}/ch/show.php?c_id={cid}&i_id={iid}"
        doc = fetch(url)
        if doc:
            result = extract_detail(doc)
            zh_entries["cases"].append({**entry, "bodyHtmlZh": result["bodyHtml"], "titleZh": result["title"]})
        else:
            zh_entries["cases"].append(entry)
    
    # Chinese about
    for cid, data in entries["about"].items():
        url = f"{BASE}/ch/about.php?c_id={cid}"
        doc = fetch(url)
        if doc:
            bm = re.search(r'<div style="min-height:\d+px[^"]*">(.*?)</div>\s*</div>\s*</section>', doc, re.S)
            if not bm:
                bm = re.search(r'<div style="min-height:\d+px[^"]*">(.*?)</div>', doc, re.S)
            body = sanitize(bm.group(1)) if bm else ""
            zh_entries["about"][cid] = {**data, "bodyHtmlZh": body}
        else:
            zh_entries["about"][cid] = data
    
    return zh_entries

# ===================== Merge into site-seed.json =====================

def merge_entries(seed, entries, zh_entries, zh_products):
    """Merge scraped content into site-seed.json contents array."""
    contents = seed.get("contents", [])
    
    # Build content entries for lines/service/cases
    for kind in ["lines", "service", "cases"]:
        en_list = entries.get(kind, [])
        zh_list = zh_entries.get(kind, [])
        
        # Group by columnId
        by_col = {}
        for e in en_list:
            cid = e["columnId"]
            if cid not in by_col:
                by_col[cid] = []
            by_col[cid].append(e)
        
        for cid, items in by_col.items():
            # Find existing content section
            existing = None
            for c in contents:
                if c["kind"] == kind and c["sourceId"] == cid:
                    existing = c
                    break
            
            if existing:
                # Update with entries
                existing["entries"] = items
                # Also set bodyHtml from first entry if current is empty
                if items and not contentBody(existing, "en"):
                    existing["items"] = {"bodyHtml": items[0].get("bodyHtml", ""), "images": items[0].get("images", [])}
            else:
                # Create new
                name = items[0].get("name", "") if items else ""
                contents.append({
                    "kind": kind,
                    "sourceId": cid,
                    "name": name,
                    "items": {"bodyHtml": items[0].get("bodyHtml", ""), "images": items[0].get("images", [])} if items else {"bodyHtml": "", "images": []},
                    "itemsZh": {"bodyHtml": "", "images": []},
                    "entries": items,
                })
    
    # Update about sections
    for cid, data in entries.get("about", {}).items():
        for c in contents:
            if c["kind"] == "about" and c["sourceId"] == cid:
                if not contentBody(c, "en"):
                    c["items"] = {"bodyHtml": data.get("bodyHtml", ""), "images": data.get("images", [])}
                break
    
    # Update honor sections
    for cid, data in entries.get("honor", {}).items():
        for c in contents:
            if c["kind"] == "honor" and c["sourceId"] == cid:
                if data.get("items"):
                    c["items"] = data["items"]
                break
    
    # Add Chinese to products
    if zh_products:
        for cat in seed["products"]:
            for sub in cat["subs"]:
                for p in sub["items"]:
                    zh = zh_products.get(str(p["sourceId"]))
                    if zh:
                        if zh["titleZh"]:
                            p["titleZh"] = zh["titleZh"]
                        if zh["bodyHtmlZh"]:
                            p["bodyHtmlZh"] = zh["bodyHtmlZh"]
    
    seed["contents"] = contents
    return seed

def contentBody(content, lang):
    if not content:
        return ""
    if lang == "zh":
        zh = (content.get("itemsZh") or {})
        if isinstance(zh, dict):
            return zh.get("bodyHtml", "")
        return ""
    items = content.get("items") or {}
    if isinstance(items, dict):
        return items.get("bodyHtml", "")
    return ""

# ===================== Main =====================

if __name__ == "__main__":
    print("=" * 60)
    print("Comprehensive content scraper for apigcl.com")
    print("=" * 60)
    
    # Load existing seed
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)
    print(f"Loaded site-seed.json: {len(seed.get('products',[]))} product categories, {len(seed.get('contents',[]))} content sections")
    
    # Phase 1: Scrape all missing English sections
    entries = scrape_all_sections()
    
    # Save intermediate results
    with open("scripts/all-scraped-entries.json", "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    print(f"\nIntermediate results saved to scripts/all-scraped-entries.json")
    
    # Phase 2: Scrape Chinese versions
    zh_entries = scrape_chinese_sections(entries)
    
    # Phase 3: Scrape Chinese products
    zh_products = scrape_chinese_products()
    
    # Phase 4: Merge into site-seed.json
    print("\n=== Merging into site-seed.json ===")
    seed = merge_entries(seed, entries, zh_entries, zh_products)
    
    with open(SEED, "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=1)
    
    # Stats
    total_products = sum(len(s["items"]) for c in seed["products"] for s in c["subs"])
    missing_zh = sum(1 for c in seed["products"] for s in c["subs"] for p in s["items"] if not p.get("titleZh","").strip())
    print(f"\nDone! Products: {total_products}, Missing zh: {missing_zh}")
    print(f"Content sections: {len(seed['contents'])}")
    print(f"Content images: {len(os.listdir(IMG_OUT))}")
    print(f"Product images: {len(os.listdir(PROD_IMG_OUT))}")
