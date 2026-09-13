#!/usr/bin/env python3
"""
补齐缺失板块：Download Center / Honor / Service / Cases
从源站 apigcl.com 抓取，输出成 JSON，供合并进 src/data/site-seed.json 的 "contents" 数组。
运行：python scripts/scrape-content.py
"""
import re, json, html, os, urllib.request, time, hashlib

BASE = "http://www.apigcl.com"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) mirror-bot"}
OUT_DIR = "public/uploads/content"
OUT_JSON = "scripts/content-scraped.json"
os.makedirs(OUT_DIR, exist_ok=True)

def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")

def get_binary(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def clean(text):
    return re.sub(r"\s+", " ", html.unescape(text)).strip()

def download_file(url):
    """下载 PDF/图片到本地，返回本地文件名"""
    if not url:
        return ""
    if url.startswith("/"):
        url = BASE + url
    elif not url.startswith("http"):
        url = BASE + "/" + url
    ext = os.path.splitext(url.split("?")[0])[1].lower() or ".pdf"
    name = hashlib.md5(url.encode()).hexdigest()[:16] + ext
    path = os.path.join(OUT_DIR, name)
    if os.path.exists(path) and os.path.getsize(path) > 200:
        return name
    try:
        data = get_binary(url)
        with open(path, "wb") as f:
            f.write(data)
        print(f"  downloaded: {name}  <-  {url}")
        return name
    except Exception as e:
        print(f"  FAILED: {url}  ({e})")
        return ""

# ---------- 1. Download Center: 4 个栏目 ----------
DOWN_CATS = [
    ("43", "Company's Notice"),
    ("76", "Technology Data Download"),
    ("157", "Certificate Download"),
    ("158", "MSDS Download"),
]

def scrape_downloads():
    result = []
    for cid, name in DOWN_CATS:
        print(f"\n[Download] {name} (c_id={cid})")
        rows = []
        page = 1
        while True:
            url = f"{BASE}/down.php?c_id={cid}&p={page}"
            try:
                doc = get(url)
            except Exception as e:
                print(f"  page {page} failed: {e}")
                break
            # 匹配每一行：名称 + 日期 + 下载链接（href 指向真实文件）
            rows_found = re.findall(
                r'<li>\s*<p>(.*?)</p>.*?<p>([\d/]{8,10})</p>.*?(?:<a[^>]+href="([^"]+)")?.*?</li>',
                doc, re.S)
            if not rows_found:
                break
            new_count = 0
            for title, date, href in rows_found:
                title = clean(re.sub(r"<[^>]+>", "", title))
                if not title:
                    continue
                file_name = download_file(href) if href else ""
                rows.append({
                    "name": title,
                    "serial": "",
                    "format": "PDF" if file_name.endswith(".pdf") else "",
                    "date": date,
                    "file": f"/uploads/content/{file_name}" if file_name else "",
                })
                new_count += 1
            print(f"  page {page}: {new_count} rows")
            if new_count == 0 or page > 20:
                break
            page += 1
            time.sleep(0.3)
        result.append({
            "kind": "down",
            "sourceId": int(cid),
            "name": name,
            "items": rows,
            "itemsZh": rows,
        })
    return result

# ---------- 2. Honor / Service / Cases：图文栏目 ----------
CONTENT_PAGES = [
    ("honor", "honor.php", "Honor & Certificates"),
    ("service", "service.php", "Service"),
    ("cases", "cases.php", "Development Cases"),
]

def scrape_content_page(kind, php_file, name):
    print(f"\n[{kind}] {name}")
    url = f"{BASE}/{php_file}"
    try:
        doc = get(url)
    except Exception as e:
        print(f"  failed: {e}")
        return []
    # 抓取正文区域（去掉 header/footer/表单），取最大的一段 <div>...</div>
    body_match = re.search(r'<div[^>]*id="n_un_box"[^>]*>(.*?)</div>\s*</div>\s*</div>', doc, re.S)
    body_html = body_match.group(1) if body_match else ""
    # 抓取所有图片
    images = []
    for src in re.findall(r'<img[^>]+src="([^"]+)"', body_html):
        if src.startswith("/"):
            src = BASE + src
        elif not src.startswith("http"):
            src = BASE + "/" + src
        if "no-photo" in src or "line.png" in src:
            continue
        local = download_file(src)
        if local:
            images.append(f"/uploads/content/{local}")
    text = clean(re.sub(r"<[^>]+>", " ", body_html))
    return [{
        "kind": kind,
        "sourceId": 1,
        "name": name,
        "items": {"bodyHtml": body_html, "images": images, "text": text},
        "itemsZh": {"bodyHtml": body_html, "images": images, "text": text},
    }]

# ---------- 主流程 ----------
if __name__ == "__main__":
    all_content = []
    all_content += scrape_downloads()
    for kind, php, name in CONTENT_PAGES:
        all_content += scrape_content_page(kind, php, name)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_content, f, ensure_ascii=False, indent=2)

    print(f"\n完成！结果写入 {OUT_JSON}")
    print(f"共 {len(all_content)} 个栏目条目")
    print(f"文件已下载到 {OUT_DIR}/")