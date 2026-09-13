#!/usr/bin/env python3
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) mirror-bot"}

URLS = [
    ("down_43", "http://www.apigcl.com/down.php?c_id=43"),
    ("service", "http://www.apigcl.com/service.php"),
    ("honor", "http://www.apigcl.com/honor.php"),
    ("cases_home", "http://www.apigcl.com/index.php"),
]

for name, url in URLS:
    print(f"\n{'='*60}\n{name}: {url}\n{'='*60}")
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read().decode("utf-8", "replace")
        # 只保存到文件，避免刷屏
        fname = f"debug_{name}.html"
        with open(fname, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"已保存到 {fname}，长度 {len(html)} 字符")
    except Exception as e:
        print(f"失败: {e}")