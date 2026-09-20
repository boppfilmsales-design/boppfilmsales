#!/usr/bin/env python3
"""Download missing product images from apigcl.com and update site-seed.json."""

import json
import os
import re
import time
import urllib.request
import urllib.error

BASE = "http://www.apigcl.com"
PROJECT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UPLOADS_DIR = os.path.join(PROJECT_DIR, "public", "uploads", "products")
SCRAPE_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bopet-scraped-data.json")
SEED_PATH = os.path.join(PROJECT_DIR, "src", "data", "site-seed.json")

def download_image(img_name):
    """Download a product image from the source site."""
    # The image name is like 20180923113934_84965.jpg
    # The URL pattern is: http://www.apigcl.com/upload/image/YYYYMMDD/YYYYMMDDHHMMSS_XXXXX.jpg
    # Extract date from filename (first 8 digits)
    date_match = re.match(r'(\d{8})\d{6}_\d+\.\w+', img_name)
    if date_match:
        date_dir = date_match.group(1)
        url = f"{BASE}/upload/image/{date_dir}/{img_name}"
    else:
        url = f"{BASE}/upload/image/{img_name}"

    dest = os.path.join(UPLOADS_DIR, img_name)
    if os.path.exists(dest):
        return True

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            if len(data) < 100:
                print(f"  WARNING: Very small image ({len(data)} bytes): {img_name}")
            with open(dest, "wb") as f:
                f.write(data)
        return True
    except Exception as e:
        print(f"  ERROR downloading {img_name}: {e}")
        # Try alternate URL patterns
        try:
            url2 = f"http://apigcl.com/upload/image/{img_name}"
            req = urllib.request.Request(url2, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                with open(dest, "wb") as f:
                    f.write(data)
            return True
        except:
            pass
        return False

def download_all_images():
    """Download all images referenced in the scraped data."""
    with open(SCRAPE_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    all_images = set()
    for cat_id, cat in data.items():
        for prod in cat.get("products", []):
            for img in prod.get("gallery", []):
                all_images.add(img)

    print(f"Total unique images to download: {len(all_images)}")

    success = 0
    failed = 0
    failed_images = []

    for i, img in enumerate(sorted(all_images)):
        print(f"  [{i+1}/{len(all_images)}] Downloading {img}...", end=" ", flush=True)
        if download_image(img):
            print("OK")
            success += 1
        else:
            print("FAILED")
            failed += 1
            failed_images.append(img)
        time.sleep(0.2)

    print(f"\nDownloaded: {success}, Failed: {failed}")
    if failed_images:
        print(f"Failed images: {failed_images[:20]}")

    return failed_images

def update_site_seed():
    """Update site-seed.json with the scraped BOPET Film data."""
    with open(SCRAPE_DATA_PATH, "r", encoding="utf-8") as f:
        scraped = json.load(f)

    with open(SEED_PATH, "r", encoding="utf-8") as f:
        seed = json.load(f)

    # Find the BOPET Film category (sourceId=34)
    bopet_cat = None
    for cat in seed.get("products", []):
        if cat.get("sourceId") == 34:
            bopet_cat = cat
            break

    if not bopet_cat:
        print("ERROR: BOPET Film category not found in site-seed.json")
        return

    # Build new subs array matching source site structure
    subcat_order = [
        ("66", "BOPET Thermal Transfer Film 4.5Microns Clear"),
        ("71", "BOPET Plain Film Printing & Laminating"),
        ("72", "BOPET Capacitor Film Clear & Metallized"),
        ("73", "Vacuum Aluminum Metallized BOPET Polyester Film"),
        ("74", "BOPET Insulating Thicker Film (50-500 Microns)"),
        ("75", "BOPET Milky/White Film"),
        ("177", "B Grade BOPET Film"),
    ]

    new_subs = []
    for cid, name in subcat_order:
        cat_data = scraped.get(cid, {})
        products = cat_data.get("products", [])
        items = []
        for prod in products:
            item = {
                "sourceId": prod["sourceId"],
                "title": prod["title"],
                "titleZh": prod.get("titleZh", ""),
                "code": prod.get("code", ""),
                "price": prod.get("price", ""),
                "gallery": prod.get("gallery", []),
                "bodyHtml": prod.get("bodyHtml", ""),
                "bodyHtmlZh": prod.get("bodyHtmlZh", ""),
                "pdfs": prod.get("pdfs", []),
            }
            items.append(item)

        sub = {
            "sourceId": int(cid),
            "name": name,
            "items": items,
        }
        new_subs.append(sub)

    bopet_cat["subs"] = new_subs

    # Write back
    with open(SEED_PATH, "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=2)

    # Print summary
    total_products = sum(len(s["items"]) for s in new_subs)
    print(f"\nUpdated site-seed.json: {len(new_subs)} subcategories, {total_products} products")
    for sub in new_subs:
        print(f"  {sub['sourceId']}: {sub['name']} -> {len(sub['items'])} products")

if __name__ == "__main__":
    print("=== Step 1: Downloading missing product images ===")
    download_all_images()

    print("\n=== Step 2: Updating site-seed.json ===")
    update_site_seed()

    print("\nDone!")
