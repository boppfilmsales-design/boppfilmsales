import json, os

PROJ = r"C:\Users\DELL\projects\boppfilmsales"
SEED = os.path.join(PROJ, "src", "data", "site-seed.json")

# index (1-based, flattened) -> correct Chinese title
FIX = {
    1: "\u0042\u7ea7BOPET\u8584\u819c\uff08\u539a\u5ea66.0-9.0\u5fae\u7c73\uff09",
    2: "4.5\u5fae\u7c73BOPET\u8584\u819c\u5e93\u5b58",
    3: "4.5\u5fae\u7c73BOPET\u900f\u660e\u5149\u819c\uff08\u672a\u5370\u5237\uff09",
    8: "4.0-4.5\u5fae\u7c73\u771f\u7a7a\u9540\u94dd\u805a\u916f\u8584\u819c",
    13: "BOPP\u5f69\u8272\u5370\u5237\u819c",
    14: "BOPP\u5f69\u8272\u5370\u5237\u819c",
    15: "BOPP\u9540\u94dd\u819c\uff08\u94f6\u8272\uff09",
    16: "BOPP\u80f6\u5e26\u819c",
    18: "BOPP\u9540\u94dd\u819c\uff08\u94f6\u8272\uff09",
    26: "\u6c34\u6027\u4e19\u70ef\u9178\u80f6\u6c34",
    35: "\u805a\u916f\u57fa\u9884\u6d82\u819c",
    42: "BOPP\u89e6\u611f\u7ed2\u9762\u819c",
    43: "\u89e6\u611f\u819c\uff08EVA\u6d82\u5c42+\u89e6\u611f\u6cb9\uff09",
    44: "BOPP\u9884\u6d82\u819c\uff08EVA\u80f6\uff09",
    51: "\u9ad8\u6536\u7f29BOPS\u805a\u82ef\u4e59\u70ef\u8584\u819c",
    54: "\u767d\u8272CPP\u8584\u819c",
    55: "VMCPP\u9540\u94ddCPP\u8584\u819c",
    56: "VMCPP\u8584\u819c",
    58: "\u84b8\u716eCPP\u6d41\u5ef6\u8584\u819c",
    60: "PE\u8d2d\u7269\u888b",
    61: "PE\u4fdd\u9c9c\u819c\uff08\u98df\u54c1\u5305\u88c5\uff09",
    62: "PE\u7f20\u7ed5\u819c\uff08\u624b\u7528/\u673a\u7528\uff09",
    63: "PVC\u6536\u7f29\u819c",
    65: "\u94dc\u7248\u7eb8",
    66: "75\u514b\u590d\u5370\u7eb8",
    73: "\u590d\u5370\u7eb8\u5927\u6bcd\u5377",
    77: "\u94dd\u7b94",
    78: "\u98df\u54c1\u5bb9\u5668\u7528\u94dd\u7b94",
    79: "\u4e0d\u9508\u94a2",
    80: "\u70ed\u8f6c\u5370\u78b3\u5e26\u4e0e\u6807\u7b7e",
    91: "BOPP\u767d\u8272\u4eae\u5149\u6807\u7b7e",
    92: "\u81ea\u7c98PET\u956d\u5c04\u82b1\u8fb9\u62c6\u5c01\u62c9\u7ebf",
    93: "\u81ea\u7c98\u62c6\u5c01\u62c9\u7ebf\uff08BOPP/BOPET\u9999\u70df\u62c9\u7ebf\uff09",
    94: "\u81ea\u7c98\u62c6\u5c01\u62c9\u7ebf\uff08\u94f6\u8272\uff09",
    95: "\u91d1\u8272\u62c6\u5c01\u62c9\u7ebf",
    96: "BOPP/BOPET\u9999\u70df\u62c6\u5c01\u62c9\u7ebf",
    97: "BOPP/BOPET\u9999\u70df\u76d2\u900f\u660e\u62c6\u5c01\u62c9\u7ebf",
    98: "\u4fe1\u5c01\u62c6\u5c01\u62c9\u7ebf",
    99: "\u6ee1\u7ea2\u62c6\u5c01\u62c9\u7ebf",
    100: "\u62c6\u5c01\u62c9\u7ebf/\u6495\u5e26\uff08\u7528\u4e8e\u5c01\u53e3\uff09",
    101: "\u62c6\u5c01\u62c9\u7ebf/\u6495\u5e26",
    102: "PP/PET\u6253\u5305\u5e26",
    104: "\u5c3c\u9f99\u8584\u819c\uff08BOPA\u8584\u819c\uff09",
    105: "T\u578b\u6536\u7f29\u5c3c\u9f99BOPA\u8584\u819c",
    106: "1300\u578bOPP\u80f6\u5e26\u5206\u5207\u673a",
    107: "API-210-1600 BOPP\u80f6\u5e26\u6bcd\u5377\u5206\u5207\u590d\u5377\u673a",
    108: "BOPP/BOPET\u8bbe\u5907\u751f\u4ea7\u7ebf\uff08\u8fdb\u53e3\u66ff\u4ee3\uff09",
    109: "\u9ad8\u7aef\u4ea7\u7ebf\u6280\u672f\u5de5\u7a0b\u5e08\uff08\u5b89\u88c5\u3001\u8c03\u8bd5\u3001\u7ef4\u4fee\u6307\u5bfc\uff09",
    110: "500A/5A T36 2m \u5bfc\u7ebf\u5f00\u5408\u5f0f\u7535\u6d41\u4e92\u611f\u5668",
}

seed = json.load(open(SEED, encoding="utf-8"))
i = 0
fixed = 0
for p in seed["products"]:
    for s in p.get("subs") or []:
        for it in s.get("items") or []:
            i += 1
            if i in FIX:
                it["titleZh"] = FIX[i]
                fixed += 1

json.dump(seed, open(SEED, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("total items:", i, "fixed:", fixed)
