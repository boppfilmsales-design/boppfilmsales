import json, os

PROJ = r"C:\Users\DELL\projects\boppfilmsales"
SEED = os.path.join(PROJ, "src", "data", "site-seed.json")

seed = json.load(open(SEED, encoding="utf-8"))
changed = 0
for p in seed["products"]:
    cat_name = (p.get("name") or "").strip()
    for s in p.get("subs") or []:
        items = s.get("items") or []
        if not items:
            continue
        first = (items[0].get("title") or "").strip()
        # Use the sub-category's lead product as its display name.
        if first and first != cat_name:
            s["name"] = first[:60]
            changed += 1
        elif (s.get("name") or "").strip() == cat_name:
            s["name"] = first[:60] if first else cat_name

json.dump(seed, open(SEED, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("sub-category names updated:", changed)
for p in seed["products"][:3]:
    print(" ", p["name"])
    for s in p["subs"]:
        print("    -", s["name"], "(%d items)" % len(s["items"]))
