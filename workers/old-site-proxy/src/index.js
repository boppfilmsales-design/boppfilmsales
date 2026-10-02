/**
 * old.boppfilmsales.com 的代理 Worker
 * ============================================================
 *
 * ── 解决的问题 ─────────────────────────────────────────────
 *
 * 旧站（老 IIS + PHP）的 HTML 里，图片用的是【别的域名的明文绝对地址】：
 *
 *     <img src="http://www.apigcl.com/upload/image/20180921/20180921123831_44497.jpg">
 *
 * 我们把 old.boppfilmsales.com 挂到 Cloudflare 并启用 HTTPS 后，浏览器会
 * 把这些 http:// 图片当成**混合内容**直接拦掉 —— 页面能开，图片全成破图。
 *
 * 而这些图片在新站（R2 里）**一张不缺**，文件名字完全相同。
 *
 * ── 这个 Worker 做两件事 ───────────────────────────────────
 *
 * ① 页面请求（HTML）
 *    回源到旧服务器 → 把 HTML 里所有 apigcl.com 的图片地址
 *    改写成同域的 /_media/<文件名>，再返回给浏览器。
 *    → 页面 https、图片也 https，混合内容问题消失。
 *
 * ② 图片请求（/_media/<文件名>）
 *    直接从绑定的 R2 桶读取，完全不碰旧服务器。
 *    → 服务器到期后，旧站的图片依然能看 ✅
 *
 * ── R2 键名的正确形式（踩过的坑）────────────────────────
 *
 * 新站的路由是 /api/media/uploads/products/<文件名>，
 * 对应 R2 键 `uploads/products/<文件名>` —— **有 uploads/ 这一层**。
 * 一开始漏了它，所以读不到任何对象。
 *
 * ── 为什么回源用主机名而不是裸 IP（踩过的坑）──────────────
 *
 * 直接 fetch("http://122.10.99.144/...") 会被 Cloudflare 以
 * 1003（Direct IP access not allowed）拦下。
 * 改用 www.apigcl.com —— 它的 DNS 就指向那台服务器，且不在 Cloudflare 上。
 */

const ORIGIN_HOST = "www.apigcl.com";
const ORIGIN_PROTO = "http:";
const MEDIA_PREFIXES = ["uploads/products", "uploads/content"];

/** 旧站图片地址的各种写法 → 提取出文件名 */
const IMG_PATTERNS = [
  // 绝对地址：http(s)://www.apigcl.com/upload/image/<日期>/<文件名>
  /https?:\/\/(?:www\.)?apigcl\.com\/(?:qsl\/dongjian\/)?upload\/image\/(?:\d+\/)?([^"'\s)>]+)/gi,
  // 相对路径：/upload/image/<日期>/<文件名> 或 ../../upload/image/...
  /(?:\.\.\/)*\/?upload\/image\/(?:\d+\/)?([^"'\s)>]+)/gi,
];

/**
 * 指向 apigcl.com 的**页面链接**（导航、页脚等）。
 *
 * 改写成本站的相对路径，这样访客留在 old.boppfilmsales.com 上，
 * 不会因为跳到 apigcl.com 而绕开我们刚做的 HTTPS 与图片改写。
 * 放在图片规则之后执行 —— 图片已被换成 /_media/，不会再被这条命中。
 */
const LINK_PATTERN = /https?:\/\/(?:www\.)?apigcl\.com(\/[^"'\s)>]*)?/gi;

/**
 * 同一张图还要处理 HTML 里可能出现的
 * srcset / data-src / CSS url() 等写法 —— 上面两个正则已经覆盖，
 * 因为它们匹配的是"路径"本身，与承载它的属性无关。
 */
function rewriteHtml(html) {
  let out = html;
  let n = 0;
  for (const re of IMG_PATTERNS) {
    out = out.replace(re, (_m, file) => {
      n++;
      return `/_media/${file}`;
    });
  }
  // 剩下的 apigcl.com 链接 → 变成同站相对路径（根路径直接给 "/"）
  out = out.replace(LINK_PATTERN, (_m, path) => {
    n++;
    return path && path.length > 0 ? path : "/";
  });
  return { html: out, count: n };
}

/** 从 R2 找文件：先 uploads/products/ 再 uploads/content/ */
async function serveMedia(env, request, file) {
  const name = decodeURIComponent(file);
  if (!name || name.includes("..") || name.includes("\\")) {
    return new Response("Bad Request", { status: 400 });
  }

  // 边缘缓存：同一张图不必每次都读 R2
  const cache = typeof caches !== "undefined" ? caches.default : undefined;
  if (cache) {
    try {
      const hit = await cache.match(request);
      if (hit) return hit;
    } catch {
      /* 缓存查询失败不影响主流程 */
    }
  }

  for (const prefix of MEDIA_PREFIXES) {
    let obj = null;
    try {
      obj = await env.MEDIA.get(`${prefix}/${name}`);
    } catch {
      obj = null;
    }
    if (!obj) continue;

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=604800, immutable");
    headers.set("access-control-allow-origin", "*");
    headers.set("x-media-key", `${prefix}/${name}`);

    const res = new Response(obj.body, { headers });
    if (cache && obj.size > 0 && obj.size <= 5 * 1024 * 1024) {
      try {
        await cache.put(request, res.clone());
      } catch {
        /* 缓存写入失败不影响返回 */
      }
    }
    return res;
  }

  return new Response("Image not found in R2", {
    status: 404,
    headers: { "content-type": "text/plain;charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ② 图片：直接读 R2
    if (url.pathname.startsWith("/_media/")) {
      return serveMedia(env, request, url.pathname.slice("/_media/".length));
    }

    // ① 页面：回源 + 改写
    const originUrl = new URL(request.url);
    originUrl.protocol = ORIGIN_PROTO;
    originUrl.hostname = ORIGIN_HOST;
    originUrl.port = "";

    let upstream;
    try {
      upstream = await fetch(originUrl.toString(), {
        method: request.method,
        headers: (() => {
          const h = new Headers(request.headers);
          h.set("Host", ORIGIN_HOST);
          h.delete("cf-connecting-ip");
          h.delete("cf-ray");
          h.delete("cf-ipcountry");
          h.delete("x-forwarded-proto");
          h.delete("x-real-ip");
          h.delete("accept-encoding"); // 让上游返回未压缩内容，便于改写
          return h;
        })(),
        redirect: "manual",
      });
    } catch (e) {
      return new Response(`旧服务器暂时无法访问：${e.message}`, {
        status: 502,
        headers: { "content-type": "text/plain;charset=utf-8" },
      });
    }

    const ct = upstream.headers.get("content-type") ?? "";

    // 非 HTML（CSS/JS/字体等）原样透传
    if (!ct.includes("text/html")) return upstream;

    const html = await upstream.text();
    const { html: fixed, count } = rewriteHtml(html);

    const headers = new Headers(upstream.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("content-type", ct);
    headers.set("x-asset-rewrites", String(count));

    return new Response(fixed, { status: upstream.status, headers });
  },
};
