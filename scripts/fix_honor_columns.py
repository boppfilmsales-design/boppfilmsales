import json, hashlib, os, urllib.request

PROJ = r"C:\Users\DELL\projects\boppfilmsales"
SEED = os.path.join(PROJ, "src", "data", "site-seed.json")
DEST = os.path.join(PROJ, "public", "uploads", "products")
os.makedirs(DEST, exist_ok=True)

HONOR_COLUMNS = {
    17: [
        "http://www.apigcl.com/upload/image/20180824/20180824175526_27168.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090312_66637.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090311_30769.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090311_40360.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090312_68309.jpg",
    ],
    50: [
        "http://www.apigcl.com/upload/image/20180923/20180923105116_72388.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090312_66637.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090311_30769.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090311_40360.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090312_68309.jpg",
    ],
    51: [
        "http://www.apigcl.com/upload/image/20180824/20180824181005_63371.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090312_66637.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090311_30769.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090311_40360.jpg",
        "http://www.apigcl.com/upload/image/20181009/20181009090312_68309.jpg",
    ],
}

EN_TITLES = {
    17: "Certificate",
    50: "To Customer",
    51: "Certification Report",
}
ZH_TITLES = {
    17: "\u8bc1\u4e66",
    50: "\u9762\u5411\u5ba2\u6237",
    51: "\u8ba4\u8bc1\u62a5\u544a",
}


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


seed = json.load(open(SEED, encoding="utf-8"))
changed = []
for c in seed["contents"]:
    sid = c.get("sourceId")
    if c.get("kind") == "honor" and sid in HONOR_COLUMNS:
        items = []
        for idx, url in enumerate(HONOR_COLUMNS[sid], start=1):
            n = dl(url)
            if not n:
                continue
            items.append({
                "image": "/uploads/products/" + n,
                "title": "%s %d" % (EN_TITLES[sid], idx),
                "titleZh": "%s %d" % (ZH_TITLES[sid], idx),
            })
        c["items"] = items
        c["itemsZh"] = items
        changed.append("honor %s -> %d images" % (sid, len(items)))

json.dump(seed, open(SEED, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("UPDATED:", changed)
