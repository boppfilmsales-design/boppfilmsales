#!/usr/bin/env python3
"""Normalize image URLs in bodyHtml and download inline images."""

import json
import os
import re
import time
import urllib.request

PROJECT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UPLOADS_DIR = os.path.join(PROJECT_DIR, "public", "uploads", "products")
SEED_PATH = os.path.join(PROJECT_DIR, "src", "data", "site-seed.json")

def download_image(url, filename):
    """Download an image to the uploads directory."""
    dest = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(dest):
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            if len(data) < 100:
                return False
            with open(dest, "wb") as f:
                f.write(data)
        return True
    except:
        return False

def normalize_body_html(html):
    """Replace source site image URLs with local paths."""
    if not html:
        return html
    
    # Replace apigcl.com image URLs with local paths
    # Pattern: src="http://www.apigcl.com/upload/image/DATE/FILENAME"
    def replace_apigcl_img(match):
        url = match.group(1)
        basename = os.path.basename(url)
        return f'src="/uploads/products/{basename}"'
    
    html = re.sub(r'src="https?://www\.apigcl\.com/upload/image/[^"]*"', replace_apigcl_img, html)
    html = re.sub(r'src="https?://apigcl\.com/upload/image/[^"]*"', replace_apigcl_img, html)
    html = re.sub(r'src="/upload/image/[^"]*"', lambda m: f'src="/uploads/products/{os.path.basename(m.group(0))}"', html)
    
    # For aliimg.com URLs, try to download and replace
    aliimg_urls = re.findall(r'src="(https?://kfdown\.s\.aliimg\.com/[^"]+)"', html)
    for url in aliimg_urls:
        basename = os.path.basename(url)
        if download_image(url, basename):
            html = html.replace(url, f"/uploads/products/{basename}")
    
    # Replace any remaining absolute apigcl.com URLs in href attributes
    html = re.sub(r'href="https?://www\.apigcl\.com([^"]*)"', r'href="\1"', html)
    html = re.sub(r'href="https?://apigcl\.com([^"]*)"', r'href="\1"', html)
    
    # Clean up broken tags
    html = re.sub(r'</a href="[^"]*">', '</a>', html)
    html = re.sub(r'<a href=""', '<a ', html)
    
    return html

def main():
    with open(SEED_PATH, "r", encoding="utf-8") as f:
        seed = json.load(f)
    
    # Collect all aliimg.com URLs to download
    all_urls = set()
    for cat in seed.get("products", []):
        for sub in cat.get("subs", []):
            for prod in sub.get("items", []):
                body = prod.get("bodyHtml", "")
                urls = re.findall(r'src="(https?://kfdown\.s\.aliimg\.com/[^"]+)"', body)
                all_urls.update(urls)
                body_zh = prod.get("bodyHtmlZh", "")
                urls_zh = re.findall(r'src="(https?://kfdown\.s\.aliimg\.com/[^"]+)"', body_zh)
                all_urls.update(urls_zh)
    
    print(f"Found {len(all_urls)} unique aliimg.com URLs to download")
    
    # Download all aliimg.com images
    success = 0
    for i, url in enumerate(sorted(all_urls)):
        basename = os.path.basename(url)
        print(f"  [{i+1}/{len(all_urls)}] {basename[:50]}...", end=" ", flush=True)
        if download_image(url, basename):
            print("OK")
            success += 1
        else:
            print("FAILED")
        time.sleep(0.2)
    
    print(f"\nDownloaded: {success}/{len(all_urls)}")
    
    # Normalize all body HTML
    for cat in seed.get("products", []):
        for sub in cat.get("subs", []):
            for prod in sub.get("items", []):
                if prod.get("bodyHtml"):
                    prod["bodyHtml"] = normalize_body_html(prod["bodyHtml"])
                if prod.get("bodyHtmlZh"):
                    prod["bodyHtmlZh"] = normalize_body_html(prod["bodyHtmlZh"])
    
    # Save updated seed
    with open(SEED_PATH, "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=2)
    
    print("Updated site-seed.json with normalized image URLs")

if __name__ == "__main__":
    main()
