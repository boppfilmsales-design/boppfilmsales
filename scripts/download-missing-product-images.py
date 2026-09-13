#!/usr/bin/env python3
"""Download missing product images from the source site.

For each product with missing images, fetch the product detail page,
extract all image URLs, compute hash-based filenames, and download
any that are missing locally.
"""
import re, json, html, os, hashlib, time
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "http://www.apigcl.com"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
PROD_IMG_DIR = "public/uploads/products"
SEED = "src/data/site-seed.json"

os.makedirs(PROD_IMG_DIR, exist_ok=True)

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
                return ""

def http_get_bytes(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def img_hash(url):
    """Compute the hash-based filename for an image URL."""
    ext = os.path.splitext(url.split("?")[0].split("#")[0])[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    if ext == ".jpeg":
        ext = ".jpg"
    return hashlib.md5(url.encode()).hexdigest()[:16] + ext

def download_image(url, timeout=10):
    if not url: return ""
    if url.startswith("/"): url = BASE + url
    elif not url.startswith("http"): url = BASE + "/" + url.lstrip("./")
    if "no-photo" in url or "/1.png" in url or "images/tb" in url: return ""
    
    name = img_hash(url)
    path = os.path.join(PROD_IMG_DIR, name)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return name
    try:
        data = http_get_bytes(url, timeout)
        if len(data) < 400: return ""
        if b"<html" in data[:400].lower(): return ""
        with open(path, "wb") as f:
            f.write(data)
        return name
    except:
        return ""

def get_products_with_missing_images():
    """Find all products that have gallery image references not on disk."""
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)
    
    import glob
    existing = set(os.path.basename(f) for f in glob.glob(os.path.join(PROD_IMG_DIR, "*.*")))
    
    missing_set = set()
    products_to_scrape = []
    
    for cat in seed.get("products", []):
        for sub in cat.get("subs", []):
            for item in sub.get("items", []):
                gallery = item.get("gallery", [])
                if not isinstance(gallery, list):
                    continue
                missing_for_item = []
                for img in gallery:
                    if isinstance(img, str):
                        name = os.path.basename(img)
                        if name and name not in existing:
                            missing_set.add(name)
                            missing_for_item.append(name)
                if missing_for_item:
                    products_to_scrape.append({
                        "subId": sub.get("sourceId", 0),
                        "itemId": item.get("sourceId", 0),
                        "title": item.get("title", "")[:40],
                        "missing": missing_for_item,
                    })
    
    return missing_set, products_to_scrape

def scrape_product_images(sub_id, item_id, missing_names):
    """Fetch product page and download all images."""
    url = f"{BASE}/product_show.php?c_id={sub_id}&i_id={item_id}"
    doc = fetch(url)
    if not doc:
        return []
    
    # Find all image URLs
    img_urls = re.findall(r'<img[^>]+src="([^"]+)"', doc)
    
    # Also check for images in the product detail section
    # Filter to relevant images
    downloaded = []
    for img_url in img_urls:
        if "no-photo" in img_url or "/1.png" in img_url or "images/tb" in img_url:
            continue
        # Make absolute
        if img_url.startswith("/"):
            img_url = BASE + img_url
        elif not img_url.startswith("http"):
            img_url = BASE + "/" + img_url.lstrip("./")
        
        # Compute hash
        name = img_hash(img_url)
        
        # Download if it's in the missing set or if file doesn't exist
        if name in missing_names:
            result = download_image(img_url)
            if result:
                downloaded.append(result)
    
    return downloaded

def main():
    print("=" * 60)
    print("Missing product image downloader")
    print("=" * 60)
    
    missing_set, products = get_products_with_missing_images()
    print(f"Missing images: {len(missing_set)}")
    print(f"Products to scrape: {len(products)}")
    
    total_downloaded = 0
    for i, p in enumerate(products):
        print(f"\n[{i+1}/{len(products)}] sub={p['subId']} item={p['itemId']} ({len(p['missing'])} missing)")
        print(f"  {p['title']}")
        
        downloaded = scrape_product_images(p['subId'], p['itemId'], missing_set)
        if downloaded:
            total_downloaded += len(downloaded)
            print(f"  Downloaded: {len(downloaded)} images")
            # Remove from missing set
            for name in downloaded:
                missing_set.discard(name)
        else:
            print(f"  No matching images found on page")
    
    print(f"\n{'=' * 60}")
    print(f"Total downloaded: {total_downloaded}")
    print(f"Still missing: {len(missing_set)}")
    if missing_set:
        print("Still missing sample:", list(missing_set)[:10])

if __name__ == "__main__":
    main()
