#!/usr/bin/env python3
"""Download PDFs from source site and normalize paths in site-seed.json."""

import json
import os
import time
import urllib.request

BASE = "http://www.apigcl.com"
PROJECT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DOWNLOADS_DIR = os.path.join(PROJECT_DIR, "public", "downloads")
SEED_PATH = os.path.join(PROJECT_DIR, "src", "data", "site-seed.json")
VALID_FILES_PATH = os.path.join(PROJECT_DIR, "src", "data", "valid-files.json")

def download_pdf(source_path):
    """Download a PDF from the source site and save with its original filename."""
    filename = os.path.basename(source_path)
    dest = os.path.join(DOWNLOADS_DIR, filename)
    
    if os.path.exists(dest):
        return f"/downloads/{filename}"
    
    url = f"{BASE}{source_path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
            if len(data) < 100:
                print(f"  WARNING: Very small PDF ({len(data)} bytes): {filename}")
            with open(dest, "wb") as f:
                f.write(data)
        print(f"  Downloaded: {filename} ({len(data)} bytes)")
        return f"/downloads/{filename}"
    except Exception as e:
        print(f"  ERROR downloading {filename}: {e}")
        # Try alternate URL without /ch/
        try:
            alt_path = source_path.replace("/ch/", "/")
            url2 = f"{BASE}{alt_path}"
            req = urllib.request.Request(url2, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
                with open(dest, "wb") as f:
                    f.write(data)
            print(f"  Downloaded (alt): {filename} ({len(data)} bytes)")
            return f"/downloads/{filename}"
        except Exception as e2:
            print(f"  ERROR (alt) downloading {filename}: {e2}")
            return None

def main():
    # Load site-seed.json
    with open(SEED_PATH, "r", encoding="utf-8") as f:
        seed = json.load(f)

    # Collect all unique PDF source paths
    pdf_mapping = {}  # source_path -> local_path
    for cat in seed.get("products", []):
        for sub in cat.get("subs", []):
            for prod in sub.get("items", []):
                for pdf in prod.get("pdfs", []):
                    source_path = pdf["file"]
                    if source_path not in pdf_mapping:
                        pdf_mapping[source_path] = None

    print(f"Found {len(pdf_mapping)} unique PDF source paths to download")

    # Download all PDFs
    for source_path in pdf_mapping:
        if source_path.startswith("/ch/upload/") or source_path.startswith("/upload/"):
            local_path = download_pdf(source_path)
            pdf_mapping[source_path] = local_path
        elif source_path.startswith("/downloads/"):
            # Already local
            pdf_mapping[source_path] = source_path
        time.sleep(0.3)

    # Update site-seed.json with normalized PDF paths
    for cat in seed.get("products", []):
        for sub in cat.get("subs", []):
            for prod in sub.get("items", []):
                for pdf in prod.get("pdfs", []):
                    source_path = pdf["file"]
                    local_path = pdf_mapping.get(source_path)
                    if local_path:
                        pdf["file"] = local_path
                    # Also clean up the label
                    label = pdf.get("label", "")
                    if label:
                        # Remove HTML tags from label
                        import re
                        clean_label = re.sub(r'<[^>]+>', '', label).strip()
                        if clean_label:
                            pdf["label"] = clean_label

    # Save updated site-seed.json
    with open(SEED_PATH, "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=2)
    print(f"\nUpdated site-seed.json with normalized PDF paths")

    # Update valid-files.json
    with open(VALID_FILES_PATH, "r", encoding="utf-8") as f:
        valid_files = json.load(f)

    valid_set = set(valid_files) if isinstance(valid_files, list) else set()
    
    # Add all downloaded PDF filenames
    for source_path, local_path in pdf_mapping.items():
        if local_path:
            filename = os.path.basename(local_path)
            valid_set.add(filename)
    
    # Add all product image filenames
    for cat in seed.get("products", []):
        for sub in cat.get("subs", []):
            for prod in sub.get("items", []):
                for img in prod.get("gallery", []):
                    valid_set.add(img)

    valid_list = sorted(valid_set)
    with open(VALID_FILES_PATH, "w", encoding="utf-8") as f:
        json.dump(valid_list, f, ensure_ascii=False, indent=2)
    
    print(f"Updated valid-files.json: {len(valid_list)} files")
    print(f"\nDone!")

if __name__ == "__main__":
    main()
