#!/usr/bin/env python3
"""Scrape all BOPET Film subcategories from apigcl.com to get complete product lists."""

import json
import re
import os
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser

BASE = "http://apigcl.com"

SUBCATS = [
    (66, "BOPET Thermal Transfer Film 4.5Microns Clear"),
    (71, "BOPET Plain Film Printing & Laminating"),
    (72, "BOPET Capacitor Film Clear & Metallized"),
    (73, "Vacuum Aluminum Metallized BOPET Polyester Film"),
    (74, "BOPET Insulating Thicker Film (50-500 Microns)"),
    (75, "BOPET Milky/White Film"),
    (177, "B Grade BOPET Film"),
]

def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            # Try utf-8 first, fall back to latin-1
            try:
                return data.decode("utf-8")
            except:
                return data.decode("latin-1")
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return ""

def extract_products_from_listing(html, c_id):
    """Extract product items from a subcategory listing page."""
    products = []
    # Pattern: product_show.php?c_id=XX&i_id=YY
    pattern = r'product_show\.php\?c_id=(\d+)&i_id=(\d+)[^>]*title="([^"]*)"'
    matches = re.findall(pattern, html)
    seen = set()
    for cid, iid, title in matches:
        iid = iid.strip()
        title = title.strip()
        if iid in seen:
            continue
        seen.add(iid)
        products.append({"i_id": iid, "c_id": c_id, "title": title})
    return products

def extract_product_detail(html, i_id, c_id):
    """Extract product detail from a product_show.php page."""
    result = {
        "i_id": str(i_id),
        "c_id": str(c_id),
        "title": "",
        "titleZh": "",
        "gallery": [],
        "bodyHtml": "",
        "pdfs": [],
    }

    # Title - look for the main heading
    title_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    if title_match:
        result["title"] = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()

    # Gallery images - look for product images
    # Pattern: /upload/file/... or images in product gallery
    img_patterns = [
        r'src="(upload/products/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
        r'src="(upload/file/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
        r'src="(/upload/products/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
        r'src="(/upload/file/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
    ]
    seen_imgs = set()
    for pattern in img_patterns:
        for match in re.finditer(pattern, html, re.IGNORECASE):
            img = match.group(1)
            if not img.startswith("/"):
                img = "/" + img
            if img not in seen_imgs:
                seen_imgs.add(img)
                result["gallery"].append(os.path.basename(img))

    # Body content - extract the main product content area
    # Look for the product description/content div
    body_match = re.search(r'<div[^>]*class="[^"]*pro_content[^"]*"[^>]*>(.*?)</div>\s*(?:<div|<\!--|</section)', html, re.DOTALL | re.IGNORECASE)
    if not body_match:
        body_match = re.search(r'<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL | re.IGNORECASE)
    if not body_match:
        # Try to find the article content
        body_match = re.search(r'<article[^>]*>(.*?)</article>', html, re.DOTALL | re.IGNORECASE)

    if body_match:
        result["bodyHtml"] = body_match.group(1).strip()
    else:
        # Fallback: grab everything between specific markers
        result["bodyHtml"] = ""

    # PDFs
    pdf_pattern = r'href="([^"]*\.pdf)"[^>]*>(.*?)</a>'
    for match in re.finditer(pdf_pattern, html, re.DOTALL | re.IGNORECASE):
        pdf_url = match.group(1).strip()
        label = re.sub(r'<[^>]+>', '', match.group(2)).strip()
        if not pdf_url.startswith("http") and not pdf_url.startswith("/"):
            pdf_url = "/" + pdf_url
        result["pdfs"].append({"file": pdf_url, "label": label})

    return result

def main():
    all_data = {}

    for c_id, cat_name in SUBCATS:
        print(f"\n=== Fetching subcategory c_id={c_id}: {cat_name} ===")
        url = f"{BASE}/product.php?top_id=34&c_id={c_id}"
        html = fetch(url)
        if not html:
            print(f"  Failed to fetch listing page")
            continue

        products = extract_products_from_listing(html, c_id)
        print(f"  Found {len(products)} products")

        # Fetch each product detail
        detailed_products = []
        for prod in products:
            print(f"  Fetching product i_id={prod['i_id']}: {prod['title'][:60]}...")
            detail_url = f"{BASE}/product_show.php?c_id={c_id}&i_id={prod['i_id']}"
            detail_html = fetch(detail_url)
            if detail_html:
                detail = extract_product_detail(detail_html, prod["i_id"], c_id)
                if not detail["title"]:
                    detail["title"] = prod["title"]
                # Also try to get the Chinese version
                zh_url = f"{BASE}/ch/product_show.php?c_id={c_id}&i_id={prod['i_id']}"
                zh_html = fetch(zh_url)
                if zh_html:
                    zh_title = re.search(r'<h1[^>]*>(.*?)</h1>', zh_html, re.DOTALL)
                    if zh_title:
                        zh_text = re.sub(r'<[^>]+>', '', zh_title.group(1)).strip()
                        if zh_text and zh_text != detail["title"]:
                            detail["titleZh"] = zh_text
                    # Extract Chinese body
                    body_match = re.search(r'<div[^>]*class="[^"]*pro_content[^"]*"[^>]*>(.*?)</div>', zh_html, re.DOTALL | re.IGNORECASE)
                    if not body_match:
                        body_match = re.search(r'<article[^>]*>(.*?)</article>', zh_html, re.DOTALL | re.IGNORECASE)
                    if body_match:
                        detail["bodyHtmlZh"] = body_match.group(1).strip()
                detailed_products.append(detail)
            else:
                detailed_products.append(prod)
            time.sleep(0.5)  # Be polite

        all_data[str(c_id)] = {
            "c_id": c_id,
            "name": cat_name,
            "products": detailed_products
        }

    # Save results
    output_path = os.path.join(os.path.dirname(__file__), "bopet-scraped-data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"\n\n=== Summary ===")
    for c_id, cat_name in SUBCATS:
        data = all_data.get(str(c_id), {})
        products = data.get("products", [])
        print(f"  c_id={c_id}: {cat_name} -> {len(products)} products")

    print(f"\nData saved to {output_path}")

if __name__ == "__main__":
    main()
