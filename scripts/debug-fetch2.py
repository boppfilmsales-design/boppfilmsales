#!/usr/bin/env python3
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) mirror-bot"}

URLS = [
    ("honor_list", "http://www.apigcl.com/about_list_img.php?c_id=16"),
    ("service_141", "http://www.apigcl.com/service.php?c_id=141"),
    ("service_148", "http://www.apigcl.com/service.php?c_id=148"),
    ("service_199", "http://www.apigcl.com/service.php?c_id=199"),
]

for name, url in URLS:
    print(f"\n{'='*60}\n{name}: {url}\n{'='*60}")
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read().decode("utf-8", "replace")
        fname = f"debug_{name}.html"
        with open(fname, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"已保存到 {fname}，长度 {len(html)} 字符")
    except Exception as e:
        print(f"失败: {e}")