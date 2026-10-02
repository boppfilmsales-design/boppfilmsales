import { NextResponse, type NextRequest } from "next/server";

/**
 * http → https 跳转。
 *
 * ── 为什么需要这个 proxy ────────────────────────────────────────────
 *
 * Cloudflare 的「始终使用 HTTPS / Always Use HTTPS」开关在这个 zone 里
 * **必须关掉**，原因：
 *
 *   · `old.boppfilmsales.com` 是**纯代理**主机（没有 Worker 路由），
 *     源站是台只有 80 端口的老 IIS。开着那个开关时，Cloudflare 对该主机的
 *     明文请求既不回源也不跳转，而是直接抛
 *        400 Bad Request — The plain HTTP request was sent to HTTPS port
 *     导致 `http://old.boppfilmsales.com` 完全打不开。
 *   · 关掉之后 `http://old.boppfilmsales.com` 恢复正常（200）。
 *
 * 但关掉后，主域名（走 Worker 路由）的 `http://` 也就不再自动跳 https 了，
 * 于是这里在**应用层**补上跳转 —— 只有带 Worker 路由的主机才会执行到这段代码，
 * `old` 子域根本不会经过 Worker，因此不受影响。
 *
 * ── 实现说明 ───────────────────────────────────────────────────────────
 *
 * Cloudflare 会在请求头里带上 `x-forwarded-proto`，据此判断原始协议。
 * 用 308 而不是 301：保留请求方法（POST 表单提交不会退化成 GET）。
 */

export function proxy(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto && proto !== "https") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  /**
   * 跳过静态资源，避免给每个 CSS/JS/图片都跑一遍判断。
   * 其它路径（含后台 /admin）都参与跳转。
   */
  matcher: ["/((?!_next/static|_next/image|api/media|favicon.ico|images/).*)"],
};
