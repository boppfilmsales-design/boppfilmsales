import json, hashlib, os, urllib.request

PROJ = r"C:\Users\DELL\projects\boppfilmsales"
SEED = os.path.join(PROJ, "src", "data", "site-seed.json")
DEST = os.path.join(PROJ, "public", "uploads", "products")
os.makedirs(DEST, exist_ok=True)

HONOR_IMGS = [
    "http://www.apigcl.com/upload/image/20180824/20180824181005_63371.jpg",
    "http://www.apigcl.com/upload/image/20180923/20180923105116_72388.jpg",
    "http://www.apigcl.com/upload/image/20180824/20180824175526_27168.jpg",
    "http://www.apigcl.com/upload/image/20181009/20181009090312_66637.jpg",
    "http://www.apigcl.com/upload/image/20181009/20181009090311_30769.jpg",
    "http://www.apigcl.com/upload/image/20181009/20181009090311_40360.jpg",
    "http://www.apigcl.com/upload/image/20181009/20181009090312_68309.jpg",
]


def dl(url):
    name = hashlib.md5(url.encode()).hexdigest()[:16] + ".jpg"
    path = os.path.join(DEST, name)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return name
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=40).read()
        if len(data) > 1000:
            open(path, "wb").write(data)
            return name
    except Exception as e:
        print("  dl fail", url, e)
    return None


names = []
for u in HONOR_IMGS:
    n = dl(u)
    if n:
        names.append(n)
print("honor images downloaded:", len(names), names)

seed = json.load(open(SEED, encoding="utf-8"))

FACTORY_ZH = """<p><span><strong><span>\u751f\u4ea7\u8bbe\u5907\u4e0e\u6d41\u6c34\u7ebf</span></strong></span></p>
<p><span><strong><span>\u8bf7\u6253\u5f00\u4ee5\u4e0b\u94fe\u63a5\u67e5\u770b\u66f4\u591a\u7ec6\u8282\u56fe\u7247\uff1a</span></strong></span></p>
<p><a href="http://www.apigcl.com/ch/upload/file/20180920/20180920154404_78991.pdf"><strong><span>\u4e9a\u592a - BOPP \u751f\u4ea7\u8bbe\u5907\u6d41\u6c34\u7ebf\uff08\u538b\u7f29\u7248\uff09.pdf</span><br /></strong></a></p>
<p><a href="http://www.apigcl.com/ch/upload/file/20180920/20180920204217_99167.pdf"><span><strong>\u4e9a\u592a - BOPET \u751f\u4ea7\u8bbe\u5907\u6d41\u6c34\u7ebf\uff08\u538b\u7f29\u7248\uff09.pdf</strong></span></a></p>
<p><a href="http://www.apigcl.com/ch/upload/file/20180920/20180920204249_76395.pdf"><span><strong>\u4e9a\u592a - \u5de5\u5382\u4e0e\u8f66\u95f4\uff08\u538b\u7f29\u7248\uff09.pdf</strong></span></a></p>
<p><a href="http://www.apigcl.com/ch/upload/file/20180920/20180920113603_33027.pdf"><strong><span>\u4e9a\u592a - BOPP \u9c9c\u82b1\u5305\u88c5\u819c\u7ec6\u8282\u7167\u7247\uff08\u538b\u7f29\u7248\uff09.pdf</span></strong></a></p>
<p><span><strong>\u8bf7\u70b9\u51fb\u8fd9\u4e9b PDF \u67e5\u770b\u66f4\u591a\u7167\u7247\uff0c</strong></span></p>
<p><a href="http://www.apigcl.com/ch/upload/file/20180921/20180921121225_11700.pdf"><span><strong>\u4e9a\u592a - \u5ba2\u6237\u53c2\u89c2\u7167\u7247.pdf</strong></span></a></p>"""

HONOR_EN = ("<p>Asia Pacific Industry Group Co., Limited has received a series of honours and qualifications "
            "in recognition of its quality management, export performance and product certification.</p>"
            "<p>Our certificates include the ISO9001 quality management system certification, SGS / BV third-party "
            "inspection reports, and a number of national and provincial enterprise honours. Below are selected "
            "certificates and award photographs.</p>")

HONOR_ZH = ("<p>\u4e9a\u592a\u5de5\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8\u5728\u8d28\u91cf\u7ba1\u7406\u3001\u51fa\u53e3\u4e1a\u7ee9\u548c\u4ea7\u54c1\u8ba4\u8bc1\u65b9\u9762\u83b7\u5f97\u4e86\u4e00\u7cfb\u5217\u8363\u8a89\u4e0e\u8d44\u8d28\u3002</p>"
            "<p>\u6211\u4eec\u7684\u8bc1\u4e66\u5305\u62ec ISO9001 \u8d28\u91cf\u7ba1\u7406\u4f53\u7cfb\u8ba4\u8bc1\u3001SGS / BV \u7b2c\u4e09\u65b9\u68c0\u9a8c\u62a5\u544a\uff0c\u4ee5\u53ca\u591a\u9879\u56fd\u5bb6\u53ca\u7701\u7ea7\u4f01\u4e1a\u8363\u8a89\u3002\u4ee5\u4e0b\u4e3a\u90e8\u5206\u8bc1\u4e66\u4e0e\u9881\u5956\u7167\u7247\u3002</p>")

changed = []
for c in seed["contents"]:
    sid = c.get("sourceId")
    if sid == 171:
        if not isinstance(c.get("itemsZh"), dict):
            c["itemsZh"] = {"bodyHtml": "", "images": []}
        c["itemsZh"]["bodyHtml"] = FACTORY_ZH
        c["bodyHtmlZh"] = FACTORY_ZH
        changed.append("171 Factory zh")
    elif sid == 172:
        if not isinstance(c.get("itemsZh"), dict):
            c["itemsZh"] = {"bodyHtml": "", "images": []}
        c["itemsZh"]["bodyHtml"] = FACTORY_ZH
        c["bodyHtmlZh"] = FACTORY_ZH
        changed.append("172 Course zh")
    elif sid == 16:
        items = c.get("items") if isinstance(c.get("items"), dict) else {}
        items["bodyHtml"] = HONOR_EN
        items["images"] = ["/uploads/products/" + n for n in names]
        c["items"] = items
        if not isinstance(c.get("itemsZh"), dict):
            c["itemsZh"] = {"bodyHtml": "", "images": []}
        c["itemsZh"]["bodyHtml"] = HONOR_ZH
        c["itemsZh"]["images"] = ["/uploads/products/" + n for n in names]
        c["bodyHtmlZh"] = HONOR_ZH
        changed.append("16 Honor en+zh + %d images" % len(names))

json.dump(seed, open(SEED, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("UPDATED:", changed)
