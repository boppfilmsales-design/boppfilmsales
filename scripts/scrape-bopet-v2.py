#!/usr/bin/env python3
"""Comprehensive scraper for all BOPET Film subcategories from apigcl.com."""

import json
import re
import os
import time
import urllib.request

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
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = resp.read()
            try:
                return data.decode("utf-8")
            except:
                return data.decode("latin-1")
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return ""

def extract_product_ids(html, c_id):
    """Extract unique product IDs from a subcategory listing page."""
    pattern = rf'product_show\.php\?c_id={c_id}&i_id=(\d+)'
    matches = re.findall(pattern, html)
    # Deduplicate, preserve order
    seen = set()
    result = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            result.append(m)
    return result

def extract_product_titles_from_listing(html, c_id):
    """Extract product titles from listing page - they appear in <h2> tags within product cards."""
    # Pattern: product_show link followed by h2 title
    pattern = rf'product_show\.php\?c_id={c_id}&i_id=(\d+).*?<h2>(.*?)</h2>'
    matches = re.findall(pattern, html, re.DOTALL)
    titles = {}
    for iid, title in matches:
        title = re.sub(r'<[^>]+>', '', title).strip()
        if iid not in titles:
            titles[iid] = title
    return titles

def extract_gallery_images(html):
    """Extract product gallery images from the detail page."""
    images = []
    # Look for thumbnail images in the magnifier/gallery area
    # Pattern: src="http://www.apigcl.com/upload/image/..." or src="/upload/image/..."
    patterns = [
        r'src="(http://www\.apigcl\.com/upload/image/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
        r'src="(http://apigcl\.com/upload/image/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
        r'src="(/upload/image/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
        r'src="(upload/image/[^"]*\.(?:jpg|jpeg|png|gif|webp))"',
    ]
    seen = set()
    for pattern in patterns:
        for match in re.finditer(pattern, html, re.IGNORECASE):
            img_url = match.group(1)
            # Get the basename
            basename = os.path.basename(img_url)
            if basename not in seen:
                seen.add(basename)
                images.append(basename)
    return images

def extract_product_title(html):
    """Extract the product title from detail page."""
    # The title is in <h2> within prd_box
    match = re.search(r'<div class="prd_box fr">\s*<h2>(.*?)</h2>', html, re.DOTALL)
    if match:
        return re.sub(r'<[^>]+>', '', match.group(1)).strip()
    # Fallback: any h2
    match = re.search(r'<h2>(.*?)</h2>', html, re.DOTALL)
    if match:
        return re.sub(r'<[^>]+>', '', match.group(1)).strip()
    return ""

def extract_product_code(html):
    """Extract product code from detail page."""
    match = re.search(r'Product code:\s*<span>(.*?)</span>', html, re.DOTALL)
    if match:
        return re.sub(r'<[^>]+>', '', match.group(1)).strip()
    return ""

def extract_product_price(html):
    """Extract wholesale price from detail page."""
    match = re.search(r'Wholesale price:\s*<span><em>\$</em>(.*?)</span>', html, re.DOTALL)
    if match:
        return re.sub(r'<[^>]+>', '', match.group(1)).strip()
    return ""

def extract_body_content(html, tab_name="Description"):
    """Extract body content from a specific tab in the product detail page."""
    # The tabs are in <li class="item1">, <li class="item2">, <li class="item3">
    tab_map = {"Description": "item1", "TECHNICAL PARAMETERS": "item2", "OFFER DETAILS": "item3"}
    tab_class = tab_map.get(tab_name, "item1")

    # Find the tab content
    pattern = rf'<li class="{tab_class}">.*?<div class="menu_drop_nr"[^>]*>(.*?)</div>\s*</li>'
    match = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
    if match:
        content = match.group(1)
        # Remove the inquiry links at the bottom
        content = re.sub(r'<dl class="menu_drop_lk".*?</dl>', '', content, flags=re.DOTALL)
        return content.strip()
    return ""

def extract_pdfs(html):
    """Extract PDF links from the product detail page."""
    pdfs = []
    pattern = r'href="(https?://[^"]*\.pdf|/[^"]*\.pdf)"[^>]*>(.*?)</a>'
    for match in re.finditer(pattern, html, re.DOTALL | re.IGNORECASE):
        pdf_url = match.group(1).strip()
        label = re.sub(r'<[^>]+>', '', match.group(2)).strip()
        if not label:
            label = os.path.basename(pdf_url)

        # Normalize URL to path
        if "apigcl.com" in pdf_url:
            pdf_url = re.sub(r'https?://www\.apigcl\.com', '', pdf_url)
            pdf_url = re.sub(r'https?://apigcl\.com', '', pdf_url)

        if not pdf_url.startswith("/"):
            pdf_url = "/" + pdf_url

        # Skip duplicates
        if not any(p["file"] == pdf_url for p in pdfs):
            pdfs.append({"file": pdf_url, "label": label})
    return pdfs

def extract_all_body_html(html):
    """Combine all three tab contents into one body HTML."""
    desc = extract_body_content(html, "Description")
    tech = extract_body_content(html, "TECHNICAL PARAMETERS")
    offer = extract_body_content(html, "OFFER DETAILS")

    parts = []
    if desc:
        parts.append(f'<div class="tab-description">{desc}</div>')
    if tech:
        parts.append(f'<div class="tab-technical">{tech}</div>')
    if offer:
        parts.append(f'<div class="tab-offer">{offer}</div>')

    return "\n".join(parts)

def extract_zh_content(html):
    """Extract Chinese body content if available."""
    # Look for Chinese text patterns
    # The Chinese version is at /ch/product_show.php?...
    # We'll handle this separately
    return ""

def main():
    all_data = {}

    for c_id, cat_name in SUBCATS:
        print(f"\n=== Fetching subcategory c_id={c_id}: {cat_name} ===")
        url = f"{BASE}/product.php?top_id=34&c_id={c_id}"
        html = fetch(url)
        if not html:
            print(f"  Failed to fetch listing page")
            continue

        # Get product IDs
        product_ids = extract_product_ids(html, c_id)
        # Get titles from listing page
        listing_titles = extract_product_titles_from_listing(html, c_id)
        print(f"  Found {len(product_ids)} products: {product_ids}")

        detailed_products = []
        for iid in product_ids:
            title = listing_titles.get(iid, "")
            print(f"  Fetching product i_id={iid}: {title[:60]}...")

            detail_url = f"{BASE}/product_show.php?c_id={c_id}&i_id={iid}"
            detail_html = fetch(detail_url)

            product = {
                "sourceId": iid,
                "c_id": str(c_id),
                "title": "",
                "titleZh": "",
                "code": "",
                "price": "",
                "gallery": [],
                "bodyHtml": "",
                "bodyHtmlZh": "",
                "pdfs": [],
            }

            if detail_html:
                product["title"] = extract_product_title(detail_html) or title
                product["code"] = extract_product_code(detail_html)
                product["price"] = extract_product_price(detail_html)
                product["gallery"] = extract_gallery_images(detail_html)
                product["bodyHtml"] = extract_all_body_html(detail_html)
                product["pdfs"] = extract_pdfs(detail_html)

                # Try Chinese version
                zh_url = f"{BASE}/ch/product_show.php?c_id={c_id}&i_id={iid}"
                zh_html = fetch(zh_url)
                if zh_html:
                    zh_title = extract_product_title(zh_html)
                    if zh_title:
                        product["titleZh"] = zh_title
                    product["bodyHtmlZh"] = extract_all_body_html(zh_html)
            else:
                product["title"] = title

            detailed_products.append(product)
            time.sleep(0.3)

        all_data[str(c_id)] = {
            "c_id": c_id,
            "name": cat_name,
            "products": detailed_products
        }

    # Save results
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bopet-scraped-data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"\n\n=== Summary ===")
    for c_id, cat_name in SUBCATS:
        data = all_data.get(str(c_id), {})
        products = data.get("products", [])
        print(f"  c_id={c_id}: {cat_name} -> {len(products)} products")
        for p in products:
            print(f"    i_id={p['sourceId']}: {p['title'][:70]} | imgs={len(p['gallery'])} | pdfs={len(p['pdfs'])}")

    print(f"\nData saved to {output_path}")

if __name__ == "__main__":
    main()
