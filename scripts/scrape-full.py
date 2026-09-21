import os, sys, urllib.request, urllib.error

sys.stdout.reconfigure(encoding="utf-8")

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "source-html")
# edited
os.makedirs(OUT, exist_ok=True)
BASE = "http://apigcl.com"

PAGES = {
    "index": "/index.php",
    "product-index": "/product.php",
    "cat34": "/product.php?top_id=34&c_id=34",
    "cat34-p2": "/product.php?p=2&top_id=34&c_id=34",
    "cat66": "/product.php?top_id=34&c_id=66",
    "show130": "/product_show.php?c_id=66&i_id=130",
    "detail130": "/product_detail.php?i_id=130",
    "honor17": "/honor.php?c_id=17",
    "honor51": "/honor.php?c_id=51",
    "lines45": "/product_lines.php?top_id=45&c_id=45",
    "service141": "/service.php?c_id=141",
    "case145": "/case.php?top_id=145&c_id=145",
    "down": "/down.php",
    "about13": "/about.php?c_id=13",
    "news41": "/news.php?c_id=41",
    "contact": "/contact.php",
}

for name, path in PAGES.items():
    dst = os.path.join(OUT, name + ".html")
    try:
        req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=45) as r:
            data = r.read()
        with open(dst, "wb") as f:
            f.write(data)
        print(f"{name:16} {len(data):8} bytes  {path}")
    except Exception as e:
        print(f"{name:16} ERROR {e}  {path}")
