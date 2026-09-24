#!/usr/bin/env bash
# Smoke-tests every admin endpoint (content + advanced) against a local server.
# Usage: bash scripts/smoke-test.sh [base-url]
set -u
BASE="${1:-http://127.0.0.1:3100}"
JAR=$(mktemp)

pass=0; fail=0
ok()   { printf "  OK  %-48s %s\n" "$1" "$2"; pass=$((pass+1)); }
bad()  { printf "  NG  %-48s %s\n" "$1" "$2"; fail=$((fail+1)); }
check() { if [ "$2" = "$3" ]; then ok "$1" "$3"; else bad "$1" "got $3 want $2"; fi; }

echo "=== 1. Unauthenticated requests must be rejected (401) ==="
for ep in advanced/roles advanced/users advanced/settings advanced/messages advanced/transfer advanced/audit sections; do
  code=$(curl -s --noproxy '*' -o /dev/null -w "%{http_code}" --max-time 15 "$BASE/api/admin/$ep")
  check "GET /api/admin/$ep" 401 "$code"
done

echo
echo "=== 2. Login ==="
PW=$(grep '^ADMIN_PASSWORD=' .env.local | cut -d= -f2- | tr -d '\r\n"'"'"'')
UN=$(grep '^ADMIN_USERNAME=' .env.local | cut -d= -f2- | tr -d '\r\n"'"'"'')
login=$(curl -s --noproxy '*' -c "$JAR" -X POST "$BASE/api/admin/login" \
  -H 'Content-Type: application/json' -d "{\"username\":\"$UN\",\"password\":\"$PW\"}")
echo "  login -> ${login:0:120}"
echo "$login" | grep -q '"ok":true' && ok "login $UN" "ok" || bad "login $UN" "$login"

echo
echo "=== 3. Authenticated GET (200) ==="
for ep in advanced/roles advanced/users advanced/settings advanced/messages advanced/transfer advanced/audit sections; do
  code=$(curl -s --noproxy '*' -b "$JAR" -o /dev/null -w "%{http_code}" --max-time 25 "$BASE/api/admin/$ep")
  check "GET /api/admin/$ep" 200 "$code"
done

echo
echo "=== 4. Advanced-management payloads ==="
roles=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/roles")
echo "  roles    -> ${roles:0:150}"
echo "$roles" | grep -q '"memberCount"' && ok "roles has memberCount" "" || bad "roles has memberCount" "missing"

users=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/users")
echo "  users    -> ${users:0:150}"
echo "$users" | grep -q '"roleNameZh"' && ok "users has roleNameZh" "" || bad "users has roleNameZh" "missing"

settings=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/settings")
echo "  settings -> ${settings:0:150}"
echo "$settings" | grep -q 'site_name' && ok "settings has site_name" "" || bad "settings has site_name" "missing"

msgs=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/messages")
echo "  messages -> ${msgs:0:200}"
echo "$msgs" | grep -q '"counts"' && ok "messages has counts" "" || bad "messages has counts" "missing"

transfer=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/transfer")
echo "  transfer -> ${transfer:0:150}"
echo "$transfer" | grep -q '"columns"' && ok "transfer has columns" "" || bad "transfer has columns" "missing"

echo
echo "=== 5. News columns (#2): legacy sourceId must resolve ==="
for sid in 41 49 52; do
  r=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/posts?categoryId=$sid&page=1&pageSize=5")
  total=$(echo "$r" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2)
  resolved=$(echo "$r" | grep -o '"resolvedCategoryId":[0-9]*' | head -1 | cut -d: -f2)
  if [ "${total:-0}" -gt 0 ]; then ok "news column $sid" "total=$total resolved=$resolved"
  else bad "news column $sid" "total=${total:-0}"; fi
done

echo
echo "=== 6. Content columns (#3): every sourceId must expose rows ==="
empty_list=""
for sid in 13 55 56 169 171 172 16 21 31 47 32 155 156 162 43 76 157 158 45 142 143 144 149 164 165 167 173 174 54 145 146 147 79 141 148 199; do
  r=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/content/$sid")
  n=$(echo "$r" | grep -o '"title":' | wc -l | tr -d ' ')
  if [ "${n:-0}" -gt 0 ]; then printf "  OK  %-6s rows=%-4s\n" "$sid" "$n"; pass=$((pass+1));
  else printf "  NG  %-6s rows=0  <-- EMPTY\n" "$sid"; fail=$((fail+1)); empty_list="$empty_list $sid"; fi
done
[ -z "$empty_list" ] && echo "  (all content columns populated)"

echo
echo "=== 7. Front-end pages (200) ==="
for p in "/" "/products" "/news" "/downloads" "/cases" "/service" "/product-lines" "/contact" "/zh" "/zh/products" "/admin"; do
  code=$(curl -s --noproxy '*' -o /dev/null -w "%{http_code}" --max-time 40 "$BASE$p")
  check "GET $p" 200 "$code"
done

echo
echo "=== 8. Products pagination (#1): controls present on /products ==="
html=$(curl -s --noproxy '*' --max-time 40 "$BASE/products")
# The index renders in English by default; /zh/products renders the Chinese labels.
for needle in "first" "previous" "next" "end" "page 1 / 2" "product-families"; do
  if echo "$html" | grep -q "$needle"; then ok "en page contains '$needle'" ""; else bad "en page contains '$needle'" "missing"; fi
done
zh=$(curl -s --noproxy '*' --max-time 40 "$BASE/zh/products")
for needle in "首页" "上一页" "下一页" "末页"; do
  if echo "$zh" | grep -q "$needle"; then ok "zh page contains '$needle'" ""; else bad "zh page contains '$needle'" "missing"; fi
done

echo
echo "=== 9. Write test: role create -> update -> delete ==="
newkey="smoke-$$"
create=$(curl -s --noproxy '*' -b "$JAR" -X POST "$BASE/api/admin/advanced/roles" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"nameZh\":\"冒烟测试\",\"key\":\"$newkey\",\"permissions\":[\"news\",\"inquiry\"]}")
echo "  create -> ${create:0:160}"
rid=$(echo "$create" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "${rid:-}" ]; then ok "role created" "id=$rid"; else bad "role created" "${create:0:160}"; fi

if [ -n "${rid:-}" ]; then
  upd=$(curl -s --noproxy '*' -b "$JAR" -X PUT "$BASE/api/admin/advanced/roles" \
    -H 'Content-Type: application/json' -d "{\"id\":$rid,\"nameZh\":\"冒烟测试-改\"}")
  echo "$upd" | grep -q '冒烟测试-改' && ok "role updated" "" || bad "role updated" "${upd:0:120}"

  del=$(curl -s --noproxy '*' -b "$JAR" -X DELETE "$BASE/api/admin/advanced/roles" \
    -H 'Content-Type: application/json' -d "{\"id\":$rid}")
  echo "$del" | grep -q '"ok":true' && ok "role deleted" "" || bad "role deleted" "${del:0:120}"
fi

echo
echo "=== 10. Built-in role must be protected ==="
ownerid=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/roles" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).rows.find(x=>x.key==='owner');console.log(r?r.id:'')})")
del=$(curl -s --noproxy '*' -b "$JAR" -X DELETE "$BASE/api/admin/advanced/roles" \
  -H 'Content-Type: application/json' -d "{\"id\":$ownerid}")
echo "  delete owner -> ${del:0:120}"
echo "$del" | grep -q '内置角色不可删除' && ok "built-in role protected" "" || bad "built-in role protected" "${del:0:120}"

echo
echo "=== 11. Message board write -> reply -> delete ==="
m=$(curl -s --noproxy '*' -b "$JAR" -X POST "$BASE/api/admin/advanced/messages" \
  -H 'Content-Type: application/json' -d '{"title":"冒烟测试留言","body":"由自动化脚本创建"}')
mid=$(echo "$m" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "${mid:-}" ]; then ok "message created" "id=$mid"; else bad "message created" "${m:0:160}"; fi
if [ -n "${mid:-}" ]; then
  rp=$(curl -s --noproxy '*' -b "$JAR" -X PUT "$BASE/api/admin/advanced/messages" \
    -H 'Content-Type: application/json' -d "{\"id\":$mid,\"reply\":\"已收到\"}")
  echo "$rp" | grep -q '"status":"replied"' && ok "reply flips status to replied" "" || bad "reply flips status" "${rp:0:120}"
  curl -s --noproxy '*' -b "$JAR" -X DELETE "$BASE/api/admin/advanced/messages" \
    -H 'Content-Type: application/json' -d "{\"id\":$mid}" > /dev/null
fi

echo
echo "=== 12. Site settings write ==="
sv=$(curl -s --noproxy '*' -b "$JAR" -X PUT "$BASE/api/admin/advanced/settings" \
  -H 'Content-Type: application/json' -d '{"values":{"products_per_page":"9","site_status":"online"}}')
echo "  save -> ${sv:0:120}"
echo "$sv" | grep -q '"ok":true' && ok "settings saved" "" || bad "settings saved" "${sv:0:120}"

echo
echo "=== 13. Audit log recorded ==="
aud=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/audit?limit=10")
n=$(echo "$aud" | grep -o '"action"' | wc -l | tr -d ' ')
if [ "${n:-0}" -gt 0 ]; then ok "audit log has entries" "n=$n"; else bad "audit log has entries" "n=0"; fi

echo
echo "=== 14. Admin user list must not leak password hashes ==="
raw=$(curl -s --noproxy '*' -b "$JAR" "$BASE/api/admin/advanced/users")
if echo "$raw" | grep -q 'passwordHash\|scrypt\$'; then bad "no password hash leaked" "LEAKED"; else ok "no password hash leaked" ""; fi

echo
echo "============================================"
printf "  PASS %d   FAIL %d\n" "$pass" "$fail"
echo "============================================"
rm -f "$JAR"
[ "$fail" -eq 0 ]
